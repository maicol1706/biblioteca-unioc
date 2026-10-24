import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await this.prisma.loan.updateMany({
      where: { status: "ACTIVE", dueOn: { lt: today } },
      data: { status: "OVERDUE" },
    });

    const [
      users,
      books,
      copies,
      available,
      activeLoans,
      overdue,
      pendingRequests,
      queuedReservations,
      notificationsUnread,
    ] = await Promise.all([
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.book.count({ where: { isActive: true } }),
      this.prisma.copy.count(),
      this.prisma.copy.count({ where: { status: "AVAILABLE" } }),
      this.prisma.loan.count({ where: { status: "ACTIVE" } }),
      this.prisma.loan.count({ where: { status: "OVERDUE" } }),
      this.prisma.loanRequest.count({ where: { status: "PENDING" } }),
      this.prisma.reservation.count({ where: { status: "QUEUED" } }),
      this.prisma.notification.count({ where: { readAt: null } }),
    ]);

    const byCategory = await this.prisma.category.findMany({
      include: { _count: { select: { books: true } } },
      orderBy: { name: "asc" },
    });

    return {
      users,
      books,
      copies,
      available,
      activeLoans,
      overdue,
      pendingRequests,
      queuedReservations,
      notificationsUnread,
      byCategory: byCategory.map((item) => ({ name: item.name, books: item._count.books })),
    };
  }
}
