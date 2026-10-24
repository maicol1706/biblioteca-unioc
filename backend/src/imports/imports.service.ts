import { BadRequestException, Injectable } from "@nestjs/common";
import { AcademicKind, IdentitySource, Prisma } from "@prisma/client";
import argon2 from "argon2";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { parseCsv, pick } from "./csv";

const DEFAULT_PASSWORD = process.env.IMPORT_DEFAULT_PASSWORD || "Prueba123!";
const MAX_ROWS = 500;

const USER_TEMPLATE =
  "email,firstName,lastName,documentNumber,role,kind,studentCode,program,academicStatus,externalId\n" +
  "juan.perez@universidad.edu,Juan,Perez,1001001001,STUDENT,STUDENT,20241001,Ingenieria de Sistemas,ACTIVO,Q10-1001001001\n" +
  "laura.docente@universidad.edu,Laura,Gomez,2002002002,TEACHER,TEACHER,,Ingenieria de Sistemas,ACTIVO,Q10-2002002002\n";

const CATALOG_TEMPLATE =
  "isbn,title,authors,copies,category,publisher,year,location\n" +
  "9789580000001,Calculo I,Stewart James,3,Matematicas,Cengage,2020,Estante A-12\n";

type ImportSource = "FILE" | "Q10_FILE";

@Injectable()
export class ImportsService {
  constructor(private readonly prisma: PrismaService) {}

  userTemplate() {
    return USER_TEMPLATE;
  }

  catalogTemplate() {
    return CATALOG_TEMPLATE;
  }

  async importUsers(buffer: Buffer, filename: string, actorId: string, source: ImportSource) {
    const { rows } = parseCsv(buffer.toString("utf8"));
    if (rows.length === 0) throw new BadRequestException("El archivo no tiene filas de datos");
    if (rows.length > MAX_ROWS) {
      throw new BadRequestException(`El archivo supera el máximo de ${MAX_ROWS} filas`);
    }

    const passwordHash = await argon2.hash(DEFAULT_PASSWORD, { type: argon2.argon2id });
    const roles = await this.prisma.role.findMany();
    const roleByCode = Object.fromEntries(roles.map((r) => [r.code, r]));
    const identitySource: IdentitySource = source === "Q10_FILE" ? "Q10" : "LOCAL";

    const log = await this.prisma.q10SyncLog.create({
      data: { triggeredById: actorId, status: "STARTED" },
    });

    let ok = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const line = i + 2;
      try {
        const email = pick(row, "email", "correo", "correo_institucional", "mail").toLowerCase();
        const firstName = pick(row, "firstName", "firstname", "nombres", "nombre", "primer_nombre");
        const lastName = pick(row, "lastName", "lastname", "apellidos", "apellido");
        const documentNumber = pick(row, "documentNumber", "documento", "cedula", "identificacion") || null;
        const roleCode = mapRole(pick(row, "role", "rol", "perfil"));
        const kind = mapKind(pick(row, "kind", "tipo", "tipo_academico"), roleCode);
        const studentCode = pick(row, "studentCode", "codigo", "codigo_estudiante", "codigo_academico") || null;
        const program = pick(row, "program", "programa", "programa_academico") || null;
        const academicStatus = pick(row, "academicStatus", "estado", "estado_academico") || "ACTIVO";
        const externalId =
          pick(row, "externalId", "id_externo", "id_q10", "codigo_q10") ||
          (source === "Q10_FILE" && documentNumber ? `Q10-${documentNumber}` : null);

        if (!email || !email.includes("@")) throw new Error("correo inválido");
        if (!firstName || !lastName) throw new Error("faltan nombre o apellido");
        if (!roleByCode[roleCode]) throw new Error(`rol no reconocido: ${roleCode}`);

        await this.prisma.$transaction(async (tx) => {
          const existing = await findExistingUser(tx, email, documentNumber, externalId);
          const user = existing
            ? await tx.user.update({
                where: { id: existing.id },
                data: {
                  email,
                  firstName,
                  lastName,
                  documentNumber,
                  externalId: externalId || existing.externalId,
                  identitySource,
                  isActive: academicStatus.toUpperCase() !== "INACTIVO",
                },
              })
            : await tx.user.create({
                data: {
                  id: randomUUID(),
                  email,
                  passwordHash,
                  firstName,
                  lastName,
                  documentNumber,
                  externalId,
                  identitySource,
                  isActive: academicStatus.toUpperCase() !== "INACTIVO",
                },
              });

          await tx.userProfile.upsert({
            where: { userId: user.id },
            update: {
              kind,
              studentCode,
              program,
              academicStatus,
              institutionalEmail: email,
            },
            create: {
              userId: user.id,
              kind,
              studentCode,
              program,
              academicStatus,
              institutionalEmail: email,
            },
          });

          await tx.userRole.deleteMany({ where: { userId: user.id } });
          await tx.userRole.create({
            data: { userId: user.id, roleId: roleByCode[roleCode].id },
          });
        });

        ok += 1;
      } catch (error) {
        failed += 1;
        errors.push(`Fila ${line}: ${error instanceof Error ? error.message : "error"}`);
      }
    }

    const status = failed === 0 ? "SUCCESS" : ok === 0 ? "FAILED" : "PARTIAL";
    await this.prisma.q10SyncLog.update({
      where: { id: log.id },
      data: {
        finishedAt: new Date(),
        status,
        recordsOk: ok,
        recordsFailed: failed,
        error: [`${source}:${filename}`, ...errors.slice(0, 20)].join(" | "),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: "IMPORT_USERS_FILE",
        entity: "users",
        payload: { filename, source, ok, failed },
      },
    });

    return {
      ok: failed === 0,
      status,
      source,
      filename,
      imported: ok,
      failed,
      defaultPassword: DEFAULT_PASSWORD,
      errors: errors.slice(0, 20),
      note:
        source === "Q10_FILE"
          ? "Carga por archivo exportado (no hay API Q10 inventada). Columnas mapeadas a la plantilla del sistema."
          : "Carga local por archivo.",
    };
  }

  async importCatalog(buffer: Buffer, filename: string, actorId: string) {
    const { rows } = parseCsv(buffer.toString("utf8"));
    if (rows.length === 0) throw new BadRequestException("El archivo no tiene filas de datos");
    if (rows.length > MAX_ROWS) {
      throw new BadRequestException(`El archivo supera el máximo de ${MAX_ROWS} filas`);
    }

    let ok = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const line = i + 2;
      try {
        const title = pick(row, "title", "titulo", "nombre");
        const isbn = pick(row, "isbn") || null;
        const authorsRaw = pick(row, "authors", "autores", "autor");
        const copies = Math.max(1, Number(pick(row, "copies", "ejemplares", "cantidad") || "1") || 1);
        const categoryName = pick(row, "category", "categoria") || "General";
        const publisherName = pick(row, "publisher", "editorial") || null;
        const yearRaw = pick(row, "year", "anio", "ano", "publicationYear");
        const location = pick(row, "location", "ubicacion", "estante") || null;
        if (!title) throw new Error("falta título");

        await this.prisma.$transaction(async (tx) => {
          const category = await tx.category.upsert({
            where: { name: categoryName },
            update: {},
            create: {
              id: randomUUID(),
              name: categoryName,
              slug: slugify(categoryName),
            },
          });

          const publisher = publisherName
            ? await tx.publisher.upsert({
                where: { name: publisherName },
                update: {},
                create: { id: randomUUID(), name: publisherName },
              })
            : null;

          const existing = isbn ? await tx.book.findUnique({ where: { isbn } }) : null;
          const book = existing
            ? await tx.book.update({
                where: { id: existing.id },
                data: {
                  title,
                  publicationYear: yearRaw ? Number(yearRaw) : existing.publicationYear,
                  physicalLocation: location || existing.physicalLocation,
                  categoryId: category.id,
                  publisherId: publisher?.id ?? existing.publisherId,
                },
              })
            : await tx.book.create({
                data: {
                  id: randomUUID(),
                  isbn,
                  title,
                  publicationYear: yearRaw ? Number(yearRaw) : null,
                  physicalLocation: location,
                  categoryId: category.id,
                  publisherId: publisher?.id,
                },
              });

          if (authorsRaw) {
            const names = authorsRaw.split(/[|,]/).map((n) => n.trim()).filter(Boolean);
            for (const [index, fullName] of names.entries()) {
              let author = await tx.author.findFirst({ where: { fullName } });
              if (!author) {
                author = await tx.author.create({ data: { id: randomUUID(), fullName } });
              }
              await tx.bookAuthor.upsert({
                where: { bookId_authorId: { bookId: book.id, authorId: author.id } },
                update: { position: index + 1 },
                create: { bookId: book.id, authorId: author.id, position: index + 1 },
              });
            }
          }

          const currentCopies = await tx.copy.count({ where: { bookId: book.id } });
          const missing = copies - currentCopies;
          for (let n = 0; n < missing; n += 1) {
            const seq = currentCopies + n + 1;
            await tx.copy.create({
              data: {
                id: randomUUID(),
                bookId: book.id,
                copyCode: String(seq).padStart(2, "0"),
                barcode: `IMP-${book.id.slice(0, 8)}-${seq}`,
                status: "AVAILABLE",
              },
            });
          }
        });
        ok += 1;
      } catch (error) {
        failed += 1;
        errors.push(`Fila ${line}: ${error instanceof Error ? error.message : "error"}`);
      }
    }

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: "IMPORT_CATALOG_FILE",
        entity: "books",
        payload: { filename, ok, failed },
      },
    });

    return {
      ok: failed === 0,
      status: failed === 0 ? "SUCCESS" : ok === 0 ? "FAILED" : "PARTIAL",
      filename,
      imported: ok,
      failed,
      errors: errors.slice(0, 20),
      note: "El catálogo no sale de Q10; Q10 exporta comunidad académica. Esta plantilla carga libros y ejemplares.",
    };
  }

  history() {
    return this.prisma.q10SyncLog.findMany({
      orderBy: { startedAt: "desc" },
      take: 20,
      include: { triggeredBy: { select: { email: true, firstName: true, lastName: true } } },
    });
  }
}

function mapRole(raw: string): string {
  const value = raw.trim().toUpperCase();
  if (["STUDENT", "ESTUDIANTE", "ALUMNO"].includes(value)) return "STUDENT";
  if (["TEACHER", "DOCENTE", "PROFESOR", "PROFESORA"].includes(value)) return "TEACHER";
  if (["LIBRARIAN", "BIBLIOTECARIA", "BIBLIOTECARIO"].includes(value)) return "LIBRARIAN";
  if (["SUPERADMIN", "ADMIN", "ADMINISTRADOR"].includes(value)) return "SUPERADMIN";
  return "STUDENT";
}

function mapKind(raw: string, role: string): AcademicKind {
  const value = raw.trim().toUpperCase();
  if (["STUDENT", "ESTUDIANTE"].includes(value)) return "STUDENT";
  if (["TEACHER", "DOCENTE"].includes(value)) return "TEACHER";
  if (["STAFF", "PERSONAL"].includes(value)) return "STAFF";
  if (role === "TEACHER") return "TEACHER";
  if (role === "STUDENT") return "STUDENT";
  return "NONE";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function findExistingUser(
  tx: Prisma.TransactionClient,
  email: string,
  documentNumber: string | null,
  externalId: string | null,
) {
  const byEmail = await tx.user.findUnique({ where: { email } });
  if (byEmail) return byEmail;
  if (documentNumber) {
    const byDoc = await tx.user.findUnique({ where: { documentNumber } });
    if (byDoc) return byDoc;
  }
  if (externalId) {
    const byExt = await tx.user.findUnique({ where: { externalId } });
    if (byExt) return byExt;
  }
  return null;
}
