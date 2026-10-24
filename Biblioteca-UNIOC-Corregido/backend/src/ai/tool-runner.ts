import { Injectable } from "@nestjs/common";
import { CatalogService } from "../catalog/catalog.service";
import { CirculationService } from "../circulation/circulation.service";
import { ReportsService } from "../reports/reports.service";
import { UsersService } from "../users/users.service";
import { AuthUser } from "../common/types";
import { INITIAL_LIBRARY_TOOLS, ToolCall } from "../modules/ai/ai-provider";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ToolRunner {
  constructor(
    private readonly catalog: CatalogService,
    private readonly circulation: CirculationService,
    private readonly reports: ReportsService,
    private readonly users: UsersService,
    private readonly prisma: PrismaService
  ) {}

  tools() {
    return INITIAL_LIBRARY_TOOLS;
  }

  async run(user: AuthUser, call: ToolCall) {
    const def = INITIAL_LIBRARY_TOOLS.find((tool) => tool.name === call.name);
    if (!def) {
      return { allowed: false, result: `Herramienta desconocida: ${call.name}` };
    }
    const allowed = user.permissions.includes(def.requiredPermission);
    if (!allowed) {
      return {
        allowed: false,
        result: `Permiso denegado para ${call.name} (${def.requiredPermission}).`,
      };
    }

    const args = call.arguments || {};
    let result: unknown;
    switch (call.name) {
      case "search_books":
        result = await this.catalog.listBooks(String(args.query || args.q || ""));
        break;
      case "get_book_availability": {
        const q = String(args.query || args.title || "");
        const books = await this.catalog.listBooks(q);
        result = books.map((book: any) => ({
          id: book.id,
          title: book.title,
          available: book.availability.available,
          total: book.availability.total,
        }));
        break;
      }
      case "get_my_loans":
        result = await this.circulation.listLoans(user, true);
        break;
      case "get_my_due_dates": {
        const loans = await this.circulation.listLoans(user, true);
        result = loans
          .filter((loan) => ["ACTIVE", "OVERDUE"].includes(loan.status))
          .map((loan) => ({
            title: loan.copy.book.title,
            dueOn: loan.dueOn,
            status: loan.status,
          }));
        break;
      }
      case "create_loan_request":
        result = await this.circulation.createRequest(user, await this.resolveBookId(args));
        break;
      case "create_reservation":
        result = await this.circulation.createReservation(user, await this.resolveBookId(args));
        break;
      case "get_pending_requests":
        result = (await this.circulation.listRequests(user)).filter((item) => item.status === "PENDING");
        break;
      case "get_overdue_loans":
        result = (await this.circulation.listLoans(user)).filter((item) => item.status === "OVERDUE");
        break;
      case "get_library_statistics":
        result = await this.reports.overview();
        break;
      case "list_all_users":
        result = await this.users.list();
        break;
      default:
        result = "Sin implementación";
    }

    return { allowed: true, result };
  }

  private async resolveBookId(args: Record<string, unknown>) {
    if (args.bookId) return String(args.bookId);
    const query = String(args.query || args.title || "");
    const books = await this.catalog.listBooks(query);
    if (!books.length) throw new Error("No encontré esa obra en el catálogo");
    return books[0].id;
  }
}
