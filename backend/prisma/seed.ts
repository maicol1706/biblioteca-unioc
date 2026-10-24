import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();

const TEST_PASSWORD = "Prueba123!";

const PERMISSIONS: Array<{ code: string; name: string; description: string }> = [
  { code: "users.read", name: "Leer usuarios", description: "Consultar fichas de usuario" },
  { code: "users.manage", name: "Administrar usuarios", description: "Crear, editar y desactivar cuentas" },
  { code: "settings.manage", name: "Configuración", description: "Políticas de préstamo y recordatorios" },
  { code: "books.write", name: "Escribir libros", description: "Alta y edición de obras" },
  { code: "copies.write", name: "Escribir ejemplares", description: "Alta y cambio de estado de copias" },
  { code: "catalog.read", name: "Leer catálogo", description: "Buscar obras y disponibilidad" },
  { code: "loans.approve", name: "Aprobar préstamos", description: "Aprobar o rechazar solicitudes" },
  { code: "loans.return", name: "Registrar devoluciones", description: "Cerrar un préstamo activo" },
  { code: "loans.request", name: "Solicitar préstamo", description: "Crear una solicitud propia" },
  { code: "loans.read_own", name: "Ver préstamos propios", description: "Consultar circulación del usuario autenticado" },
  { code: "reservations.create", name: "Reservar", description: "Encolar una reserva" },
  { code: "reports.read", name: "Ver reportes", description: "Estadísticas y reportes" },
  { code: "audit.read", name: "Ver auditoría", description: "Leer bitácora del sistema" },
  { code: "ai.use", name: "Usar JARVIS", description: "Enviar mensajes al asistente" },
  { code: "ai.configure", name: "Configurar JARVIS", description: "Proveedor y políticas del asistente" },
  { code: "q10.configure", name: "Configurar Q10", description: "Activar el proveedor de identidad Q10" },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPERADMIN: PERMISSIONS.map((p) => p.code),
  LIBRARIAN: [
    "users.read",
    "books.write",
    "copies.write",
    "catalog.read",
    "loans.approve",
    "loans.return",
    "reservations.create",
    "reports.read",
    "ai.use",
  ],
  TEACHER: [
    "catalog.read",
    "loans.request",
    "loans.read_own",
    "reservations.create",
    "ai.use",
  ],
  STUDENT: [
    "catalog.read",
    "loans.request",
    "loans.read_own",
    "reservations.create",
    "ai.use",
  ],
};

async function main() {
  const passwordHash = await argon2.hash(TEST_PASSWORD, { type: argon2.argon2id });

  const permissionRecords = [];
  for (const permission of PERMISSIONS) {
    permissionRecords.push(
      await prisma.permission.upsert({
        where: { code: permission.code },
        update: { name: permission.name, description: permission.description },
        create: { id: randomUUID(), ...permission },
      })
    );
  }
  const permissionByCode = Object.fromEntries(permissionRecords.map((p) => [p.code, p]));

  const rolesSpec = [
    { code: "SUPERADMIN", name: "Superadministrador", description: "Gobierno total de la plataforma" },
    { code: "LIBRARIAN", name: "Bibliotecaria", description: "Operación de colección y circulación" },
    { code: "TEACHER", name: "Docente", description: "Usuario académico con política de docente" },
    { code: "STUDENT", name: "Estudiante", description: "Usuario académico con política de estudiante" },
  ];

  const roleByCode: Record<string, { id: string }> = {};
  for (const role of rolesSpec) {
    const saved = await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name, description: role.description },
      create: { id: randomUUID(), ...role },
    });
    roleByCode[role.code] = saved;
    await prisma.rolePermission.deleteMany({ where: { roleId: saved.id } });
    await prisma.rolePermission.createMany({
      data: ROLE_PERMISSIONS[role.code].map((code) => ({
        roleId: saved.id,
        permissionId: permissionByCode[code].id,
      })),
    });
  }

  async function upsertUser(input: {
    email: string;
    firstName: string;
    lastName: string;
    documentNumber: string;
    role: string;
    kind: "NONE" | "STAFF" | "TEACHER" | "STUDENT";
    studentCode?: string;
    program?: string;
    academicStatus?: string;
  }) {
    const user = await prisma.user.upsert({
      where: { email: input.email },
      update: {
        firstName: input.firstName,
        lastName: input.lastName,
        documentNumber: input.documentNumber,
        passwordHash,
        isActive: true,
        identitySource: "LOCAL",
      },
      create: {
        id: randomUUID(),
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        documentNumber: input.documentNumber,
        isActive: true,
        identitySource: "LOCAL",
      },
    });

    await prisma.userProfile.upsert({
      where: { userId: user.id },
      update: {
        kind: input.kind,
        studentCode: input.studentCode,
        program: input.program,
        academicStatus: input.academicStatus,
        institutionalEmail: input.email,
      },
      create: {
        userId: user.id,
        kind: input.kind,
        studentCode: input.studentCode,
        program: input.program,
        academicStatus: input.academicStatus,
        institutionalEmail: input.email,
      },
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: roleByCode[input.role].id } },
      update: {},
      create: { userId: user.id, roleId: roleByCode[input.role].id },
    });

    return user;
  }

  const superadmin = await upsertUser({
    email: "superadmin@universidad.edu",
    firstName: "Camila",
    lastName: "Ríos",
    documentNumber: "100000001",
    role: "SUPERADMIN",
    kind: "STAFF",
  });

  await upsertUser({
    email: "bibliotecaria@universidad.edu",
    firstName: "Laura",
    lastName: "Mendoza",
    documentNumber: "100000002",
    role: "LIBRARIAN",
    kind: "STAFF",
  });

  await upsertUser({
    email: "docente.redes@universidad.edu",
    firstName: "Andrés",
    lastName: "Pardo",
    documentNumber: "100000003",
    role: "TEACHER",
    kind: "TEACHER",
    program: "Ingeniería de Sistemas",
    academicStatus: "ACTIVO",
  });

  await upsertUser({
    email: "docente.prog@universidad.edu",
    firstName: "Elena",
    lastName: "Suárez",
    documentNumber: "100000004",
    role: "TEACHER",
    kind: "TEACHER",
    program: "Ingeniería de Sistemas",
    academicStatus: "ACTIVO",
  });

  await upsertUser({
    email: "ana.estudiante@universidad.edu",
    firstName: "Ana",
    lastName: "Gómez",
    documentNumber: "100000005",
    role: "STUDENT",
    kind: "STUDENT",
    studentCode: "20241001",
    program: "Ingeniería de Sistemas",
    academicStatus: "ACTIVO",
  });

  await upsertUser({
    email: "luis.estudiante@universidad.edu",
    firstName: "Luis",
    lastName: "Herrera",
    documentNumber: "100000006",
    role: "STUDENT",
    kind: "STUDENT",
    studentCode: "20241002",
    program: "Ingeniería de Sistemas",
    academicStatus: "ACTIVO",
  });

  await upsertUser({
    email: "maria.estudiante@universidad.edu",
    firstName: "María",
    lastName: "Castaño",
    documentNumber: "100000007",
    role: "STUDENT",
    kind: "STUDENT",
    studentCode: "20241003",
    program: "Ingeniería Industrial",
    academicStatus: "ACTIVO",
  });

  const publishers = await Promise.all([
    prisma.publisher.upsert({ where: { name: "McGraw-Hill" }, update: {}, create: { id: randomUUID(), name: "McGraw-Hill", country: "Estados Unidos" } }),
    prisma.publisher.upsert({ where: { name: "Pearson" }, update: {}, create: { id: randomUUID(), name: "Pearson", country: "Reino Unido" } }),
    prisma.publisher.upsert({ where: { name: "Alfaomega" }, update: {}, create: { id: randomUUID(), name: "Alfaomega", country: "México" } }),
    prisma.publisher.upsert({ where: { name: "Editorial Universidad" }, update: {}, create: { id: randomUUID(), name: "Editorial Universidad", country: "Colombia" } }),
  ]);

  const categories = await Promise.all(
    [
      ["Redes", "redes"],
      ["Programación", "programacion"],
      ["Bases de datos", "bases-de-datos"],
      ["Matemáticas", "matematicas"],
      ["Humanidades", "humanidades"],
    ].map(([name, slug]) =>
      prisma.category.upsert({
        where: { slug },
        update: { name },
        create: { id: randomUUID(), name, slug },
      })
    )
  );

  const categoryBySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));
  const publisherByName = Object.fromEntries(publishers.map((p) => [p.name, p]));

  async function upsertAuthor(fullName: string) {
    const existing = await prisma.author.findFirst({ where: { fullName } });
    if (existing) return existing;
    return prisma.author.create({ data: { id: randomUUID(), fullName } });
  }

  const tanenbaum = await upsertAuthor("Andrew S. Tanenbaum");
  const wetherall = await upsertAuthor("David J. Wetherall");
  const sebesta = await upsertAuthor("Robert W. Sebesta");
  const cormen = await upsertAuthor("Thomas H. Cormen");
  const elmasri = await upsertAuthor("Ramez Elmasri");
  const navathe = await upsertAuthor("Shamkant B. Navathe");
  const stewart = await upsertAuthor("James Stewart");
  const savater = await upsertAuthor("Fernando Savater");

  type BookSeed = {
    isbn: string;
    title: string;
    subtitle?: string;
    description: string;
    year: number;
    edition: string;
    classification: string;
    location: string;
    publisher: string;
    category: string;
    authors: { id: string }[];
    copies: number;
  };

  const books: BookSeed[] = [
    {
      isbn: "9780133594140",
      title: "Fundamentos de Redes",
      subtitle: "Computer Networks",
      description: "Texto base de interconexión, modelos de capas y protocolos.",
      year: 2021,
      edition: "6",
      classification: "004.6 TAN",
      location: "Estante A-01",
      publisher: "Pearson",
      category: "redes",
      authors: [tanenbaum, wetherall],
      copies: 3,
    },
    {
      isbn: "9780133943023",
      title: "Conceptos de lenguajes de programación",
      description: "Comparación de paradigmas y diseño de lenguajes.",
      year: 2016,
      edition: "11",
      classification: "005.13 SEB",
      location: "Estante B-02",
      publisher: "Pearson",
      category: "programacion",
      authors: [sebesta],
      copies: 2,
    },
    {
      isbn: "9780262046305",
      title: "Introduction to Algorithms",
      subtitle: "CLRS",
      description: "Algoritmos, complejidad y estructuras de datos.",
      year: 2022,
      edition: "4",
      classification: "005.1 COR",
      location: "Estante B-04",
      publisher: "Editorial Universidad",
      category: "programacion",
      authors: [cormen],
      copies: 4,
    },
    {
      isbn: "9780133970777",
      title: "Fundamentos de sistemas de bases de datos",
      description: "Modelo relacional, SQL, normalización e integridad.",
      year: 2017,
      edition: "7",
      classification: "005.74 ELM",
      location: "Estante C-01",
      publisher: "Pearson",
      category: "bases-de-datos",
      authors: [elmasri, navathe],
      copies: 3,
    },
    {
      isbn: "9781285741550",
      title: "Cálculo I",
      description: "Límites, derivadas e integrales para ingeniería.",
      year: 2015,
      edition: "8",
      classification: "515 STE",
      location: "Estante D-03",
      publisher: "McGraw-Hill",
      category: "matematicas",
      authors: [stewart],
      copies: 2,
    },
    {
      isbn: "9788434412644",
      title: "Ética para Amador",
      description: "Introducción a la ética para lectores universitarios.",
      year: 2008,
      edition: "1",
      classification: "170 SAV",
      location: "Estante H-02",
      publisher: "Alfaomega",
      category: "humanidades",
      authors: [savater],
      copies: 2,
    },
  ];

  for (const item of books) {
    const book = await prisma.book.upsert({
      where: { isbn: item.isbn },
      update: {
        title: item.title,
        subtitle: item.subtitle,
        description: item.description,
        publicationYear: item.year,
        edition: item.edition,
        classificationCode: item.classification,
        physicalLocation: item.location,
        publisherId: publisherByName[item.publisher].id,
        categoryId: categoryBySlug[item.category].id,
        isActive: true,
      },
      create: {
        id: randomUUID(),
        isbn: item.isbn,
        title: item.title,
        subtitle: item.subtitle,
        description: item.description,
        publicationYear: item.year,
        edition: item.edition,
        classificationCode: item.classification,
        physicalLocation: item.location,
        publisherId: publisherByName[item.publisher].id,
        categoryId: categoryBySlug[item.category].id,
      },
    });

    await prisma.bookAuthor.deleteMany({ where: { bookId: book.id } });
    await prisma.bookAuthor.createMany({
      data: item.authors.map((author, index) => ({
        bookId: book.id,
        authorId: author.id,
        position: index + 1,
      })),
    });

    for (let i = 1; i <= item.copies; i += 1) {
      const copyCode = String(i).padStart(3, "0");
      const barcode = `${item.isbn}-${copyCode}`;
      await prisma.copy.upsert({
        where: { barcode },
        update: { copyCode, status: "AVAILABLE", bookId: book.id },
        create: {
          id: randomUUID(),
          bookId: book.id,
          copyCode,
          barcode,
          status: "AVAILABLE",
          acquiredAt: new Date("2024-01-15"),
        },
      });
    }
  }

  const settings: Array<{ key: string; value: unknown }> = [
    { key: "loan.student.days", value: 7 },
    { key: "loan.teacher.days", value: 14 },
    { key: "loan.student.max_active", value: 3 },
    { key: "loan.teacher.max_active", value: 5 },
    { key: "reservation.hold_hours", value: 48 },
    { key: "reminders.days_before", value: [7, 3, 1, 0] },
    { key: "identity.provider", value: "local" },
    { key: "ai.provider", value: "cloud" },
    { key: "ai.max_tool_hops", value: 4 },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value as object, updatedById: superadmin.id },
      create: { key: setting.key, value: setting.value as object, updatedById: superadmin.id },
    });
  }

  await prisma.auditLog.create({
    data: {
      id: randomUUID(),
      actorId: superadmin.id,
      action: "SEED_COMPLETED",
      entity: "system",
      payload: { phase: 2, identityProvider: "local" },
    },
  });

  const [users, booksCount, copies, available] = await Promise.all([
    prisma.user.count(),
    prisma.book.count(),
    prisma.copy.count(),
    prisma.copy.count({ where: { status: "AVAILABLE" } }),
  ]);

  console.log("Fase 2 — semilla aplicada");
  console.log(`  usuarios=${users} libros=${booksCount} ejemplares=${copies} disponibles=${available}`);
  console.log(`  contraseña de prueba (todos): ${TEST_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
