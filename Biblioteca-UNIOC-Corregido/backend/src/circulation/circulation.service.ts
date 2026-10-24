import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "../common/types";

@Injectable()
export class CirculationService {
  constructor(private readonly prisma: PrismaService) {}

  async syncOverdue() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await this.prisma.loan.updateMany({
      where: { status: "ACTIVE", dueOn: { lt: today } },
      data: { status: "OVERDUE" },
    });
  }

  async createRequest(user: AuthUser, bookId: string, notes?: string) {
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      include: { copies: true },
    });
    if (!book || !book.isActive) throw new NotFoundException("Libro no encontrado");

    const pending = await this.prisma.loanRequest.findFirst({
      where: { userId: user.id, bookId, status: "PENDING" },
    });
    if (pending) throw new ConflictException("Ya tienes una solicitud pendiente de este libro");

    const activeLoan = await this.prisma.loan.findFirst({
      where: {
        userId: user.id,
        status: { in: ["ACTIVE", "OVERDUE"] },
        copy: { bookId },
      },
    });
    if (activeLoan) throw new ConflictException("Ya tienes un ejemplar prestado de esta obra");

    await this.assertQuota(user);

    const request = await this.prisma.loanRequest.create({
      data: { userId: user.id, bookId, notes, status: "PENDING" },
      include: { book: true },
    });

    await this.notify(
      user.id,
      "REQUEST_SUBMITTED",
      "Solicitud enviada",
      `Tu solicitud de «${book.title}» quedó en revisión.`
    );
    await this.audit(user.id, "LOAN_REQUEST_CREATED", "loan_request", request.id);
    return request;
  }

  async listRequests(user: AuthUser) {
    const canSeeAll = user.permissions.includes("loans.approve");
    return this.prisma.loanRequest.findMany({
      where: canSeeAll ? {} : { userId: user.id },
      orderBy: { requestedAt: "desc" },
      include: {
        book: { include: { copies: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignedCopy: true,
      },
    });
  }

  async approve(user: AuthUser, requestId: string, copyId?: string) {
    const request = await this.prisma.loanRequest.findUnique({
      where: { id: requestId },
      include: { book: { include: { copies: true } }, user: { include: { roles: { include: { role: true } } } } },
    });
    if (!request) throw new NotFoundException("Solicitud no encontrada");
    if (request.status !== "PENDING") throw new BadRequestException("La solicitud ya fue resuelta");

    const copy = copyId
      ? request.book.copies.find((item) => item.id === copyId)
      : request.book.copies.find((item) => item.status === "AVAILABLE");
    if (!copy || copy.status !== "AVAILABLE") {
      throw new BadRequestException("No hay ejemplar disponible para aprobar");
    }

    const borrowerRoles = request.user.roles.map((item) => item.role.code);
    const days = await this.loanDays(borrowerRoles);
    const due = new Date();
    due.setDate(due.getDate() + days);
    due.setHours(0, 0, 0, 0);

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.loanRequest.update({
        where: { id: request.id },
        data: {
          status: "APPROVED",
          reviewedAt: new Date(),
          reviewedById: user.id,
          assignedCopyId: copy.id,
        },
      });
      await tx.copy.update({ where: { id: copy.id }, data: { status: "LOANED" } });
      const loan = await tx.loan.create({
        data: {
          userId: request.userId,
          copyId: copy.id,
          requestId: request.id,
          librarianId: user.id,
          dueOn: due,
          status: "ACTIVE",
        },
      });
      await tx.reminderJob.createMany({
        data: [
          { loanId: loan.id, kind: "DAYS_BEFORE_3", scheduledFor: this.offsetDate(due, -3) },
          { loanId: loan.id, kind: "DAYS_BEFORE_1", scheduledFor: this.offsetDate(due, -1) },
          { loanId: loan.id, kind: "DUE_DAY", scheduledFor: due },
        ],
        skipDuplicates: true,
      });
      return { request: updatedRequest, loan };
    });

    await this.notify(
      request.userId,
      "REQUEST_APPROVED",
      "Solicitud aprobada",
      `Puedes recoger «${request.book.title}». Vence el ${due.toISOString().slice(0, 10)}.`
    );
    await this.notify(
      request.userId,
      "LOAN_CREATED",
      "Préstamo activo",
      `Se registró el préstamo de «${request.book.title}».`
    );
    await this.audit(user.id, "LOAN_APPROVED", "loan", result.loan.id);
    return result;
  }

  async reject(user: AuthUser, requestId: string, notes?: string) {
    const request = await this.prisma.loanRequest.findUnique({
      where: { id: requestId },
      include: { book: true },
    });
    if (!request) throw new NotFoundException("Solicitud no encontrada");
    if (request.status !== "PENDING") throw new BadRequestException("La solicitud ya fue resuelta");
    const updated = await this.prisma.loanRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED", reviewedAt: new Date(), reviewedById: user.id, notes },
    });
    await this.notify(
      request.userId,
      "REQUEST_REJECTED",
      "Solicitud rechazada",
      `Tu solicitud de «${request.book.title}» fue rechazada.`
    );
    return updated;
  }

  async cancel(user: AuthUser, requestId: string) {
    const request = await this.prisma.loanRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException("Solicitud no encontrada");
    if (request.userId !== user.id && !user.permissions.includes("loans.approve")) {
      throw new ForbiddenException();
    }
    if (request.status !== "PENDING") throw new BadRequestException("Solo se cancelan solicitudes pendientes");
    return this.prisma.loanRequest.update({
      where: { id: requestId },
      data: { status: "CANCELLED" },
    });
  }

  async listLoans(user: AuthUser, mine = false) {
    await this.syncOverdue();
    const canSeeAll = user.permissions.includes("loans.approve") && !mine;
    return this.prisma.loan.findMany({
      where: canSeeAll ? {} : { userId: user.id },
      orderBy: { loanedAt: "desc" },
      include: {
        copy: { include: { book: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async returnLoan(user: AuthUser, loanId: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: { copy: { include: { book: true } } },
    });
    if (!loan) throw new NotFoundException("Préstamo no encontrado");
    if (!["ACTIVE", "OVERDUE"].includes(loan.status)) {
      throw new BadRequestException("El préstamo ya está cerrado");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const closed = await tx.loan.update({
        where: { id: loan.id },
        data: { status: "RETURNED", returnedAt: new Date() },
      });
      await tx.copy.update({ where: { id: loan.copyId }, data: { status: "AVAILABLE" } });
      await tx.reminderJob.updateMany({
        where: { loanId: loan.id, status: "SCHEDULED" },
        data: { status: "CANCELLED" },
      });
      return closed;
    });

    await this.notify(
      loan.userId,
      "RETURN_REGISTERED",
      "Devolución registrada",
      `Se recibió «${loan.copy.book.title}».`
    );
    await this.fulfillNextReservation(user, loan.copy.bookId);
    await this.audit(user.id, "LOAN_RETURNED", "loan", loan.id);
    return updated;
  }

  async createReservation(user: AuthUser, bookId: string) {
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      include: { copies: true },
    });
    if (!book) throw new NotFoundException("Libro no encontrado");
    const available = book.copies.some((copy) => copy.status === "AVAILABLE");
    if (available) {
      throw new BadRequestException("Hay ejemplares disponibles: solicita un préstamo en vez de reservar");
    }
    const existing = await this.prisma.reservation.findFirst({
      where: { userId: user.id, bookId, status: { in: ["QUEUED", "NOTIFIED"] } },
    });
    if (existing) throw new ConflictException("Ya tienes una reserva activa de esta obra");

    const last = await this.prisma.reservation.findFirst({
      where: { bookId, status: "QUEUED" },
      orderBy: { queuePosition: "desc" },
    });
    const queuePosition = (last?.queuePosition || 0) + 1;
    const reservation = await this.prisma.reservation.create({
      data: { userId: user.id, bookId, queuePosition, status: "QUEUED" },
      include: { book: true },
    });
    await this.audit(user.id, "RESERVATION_CREATED", "reservation", reservation.id);
    return reservation;
  }

  async listReservations(user: AuthUser) {
    const canSeeAll = user.permissions.includes("loans.approve");
    return this.prisma.reservation.findMany({
      where: canSeeAll ? {} : { userId: user.id },
      orderBy: [{ bookId: "asc" }, { queuePosition: "asc" }],
      include: {
        book: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async cancelReservation(user: AuthUser, id: string) {
    const reservation = await this.prisma.reservation.findUnique({ where: { id } });
    if (!reservation) throw new NotFoundException("Reserva no encontrada");
    if (reservation.userId !== user.id && !user.permissions.includes("loans.approve")) {
      throw new ForbiddenException();
    }
    if (!["QUEUED", "NOTIFIED"].includes(reservation.status)) {
      throw new BadRequestException("La reserva ya no está activa");
    }
    return this.prisma.reservation.update({
      where: { id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
  }

  async processReminders() {
    await this.syncOverdue();
    const now = new Date();
    const due = await this.prisma.reminderJob.findMany({
      where: { status: "SCHEDULED", scheduledFor: { lte: now } },
      include: { loan: { include: { copy: { include: { book: true } }, user: true } } },
    });
    for (const job of due) {
      const type = job.kind === "OVERDUE" || job.loan.status === "OVERDUE" ? "LOAN_OVERDUE" : "DUE_SOON";
      await this.notify(
        job.loan.userId,
        type,
        type === "LOAN_OVERDUE" ? "Préstamo vencido" : "Recordatorio de devolución",
        `«${job.loan.copy.book.title}» vence o venció el ${job.loan.dueOn.toISOString().slice(0, 10)}.`
      );
      await this.prisma.reminderJob.update({
        where: { id: job.id },
        data: { status: "SENT", sentAt: new Date() },
      });
    }
    return { processed: due.length };
  }

  private async fulfillNextReservation(actor: AuthUser, bookId: string) {
    const next = await this.prisma.reservation.findFirst({
      where: { bookId, status: "QUEUED" },
      orderBy: { queuePosition: "asc" },
      include: { book: true },
    });
    if (!next) return;
    const holdHours = await this.settingNumber("reservation.hold_hours", 48);
    const expires = new Date();
    expires.setHours(expires.getHours() + holdHours);
    await this.prisma.reservation.update({
      where: { id: next.id },
      data: { status: "NOTIFIED", notifiedAt: new Date(), expiresAt: expires },
    });
    await this.notify(
      next.userId,
      "RESERVATION_AVAILABLE",
      "Tu reserva está lista",
      `«${next.book.title}» ya tiene ejemplar. Tienes ${holdHours} horas para solicitarlo.`
    );
  }

  private async assertQuota(user: AuthUser) {
    const active = await this.prisma.loan.count({
      where: { userId: user.id, status: { in: ["ACTIVE", "OVERDUE"] } },
    });
    const max = user.roles.includes("TEACHER")
      ? await this.settingNumber("loan.teacher.max_active", 5)
      : await this.settingNumber("loan.student.max_active", 3);
    if (active >= max) {
      throw new BadRequestException(`Alcanzaste el cupo máximo de ${max} préstamos activos`);
    }
  }

  private async loanDays(roles: string[]) {
    if (roles.includes("TEACHER")) return this.settingNumber("loan.teacher.days", 14);
    return this.settingNumber("loan.student.days", 7);
  }

  private async settingNumber(key: string, fallback: number) {
    const row = await this.prisma.systemSetting.findUnique({ where: { key } });
    const value = row?.value as number | { value?: number } | null;
    if (typeof value === "number") return value;
    if (value && typeof value === "object" && typeof (value as any).value === "number") {
      return (value as any).value;
    }
    return fallback;
  }

  private offsetDate(base: Date, days: number) {
    const copy = new Date(base);
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  private notify(userId: string, type: any, title: string, body: string) {
    return this.prisma.notification.create({ data: { userId, type, title, body } });
  }

  private audit(actorId: string, action: string, entity: string, entityId: string) {
    return this.prisma.auditLog.create({ data: { actorId, action, entity, entityId } });
  }
}
