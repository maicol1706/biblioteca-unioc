import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "../common/types";
import { CloudAIProvider, DegradedAIProvider, INITIAL_LIBRARY_TOOLS } from "../modules/ai/ai-provider";
import { HeuristicAIProvider } from "./heuristic-provider";
import { ToolRunner } from "./tool-runner";

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tools: ToolRunner
  ) {}

  async chat(user: AuthUser, message: string, conversationId?: string) {
    let conversation = conversationId
      ? await this.prisma.aiConversation.findFirst({
          where: { id: conversationId, userId: user.id },
        })
      : null;
    if (!conversation) {
      conversation = await this.prisma.aiConversation.create({
        data: { userId: user.id, title: message.slice(0, 60) },
      });
    }

    const userMsg = await this.prisma.aiMessage.create({
      data: { conversationId: conversation.id, role: "USER", content: message },
    });

    const history = await this.prisma.aiMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
    });

    const heuristic = new HeuristicAIProvider();
    const completion = await heuristic.complete({
      messages: history.map((item) => ({
        role: item.role.toLowerCase() as any,
        content: item.content,
      })),
      tools: INITIAL_LIBRARY_TOOLS,
    });

    const traces: Array<{ tool: string; allowed: boolean; preview: string }> = [];
    let answer = completion.text || "";

    for (const call of completion.toolCalls) {
      try {
        const executed = await this.tools.run(user, call);
        traces.push({
          tool: call.name,
          allowed: executed.allowed,
          preview: JSON.stringify(executed.result).slice(0, 280),
        });
        answer += (answer ? "\n" : "") + (executed.allowed ? this.summarize(call.name, executed.result) : String(executed.result));
      } catch (error: any) {
        answer += (answer ? "\n" : "") + (error?.message || "No pude ejecutar esa acción.");
      }
    }

    if (!answer) {
      const fallback = process.env.AI_API_KEY
        ? await new CloudAIProvider().complete({
            messages: [{ role: "user", content: message }],
            tools: INITIAL_LIBRARY_TOOLS,
          })
        : await new DegradedAIProvider().complete({
            messages: [{ role: "user", content: message }],
            tools: INITIAL_LIBRARY_TOOLS,
          });
      answer = fallback.text || "No pude resolver esa consulta.";
    }

    await this.prisma.aiMessage.create({
      data: { conversationId: conversation.id, role: "ASSISTANT", content: answer },
    });

    return {
      conversationId: conversation.id,
      reply: answer,
      tools: traces,
      userMessageId: userMsg.id,
    };
  }

  async history(user: AuthUser) {
    return this.prisma.aiConversation.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  }

  private summarize(tool: string, result: unknown): string {
    if (typeof result === "string") return result;
    if (Array.isArray(result)) {
      if (result.length === 0) return `Sin resultados para ${tool}.`;
      if (tool === "search_books" || tool === "get_book_availability") {
        return result
          .slice(0, 6)
          .map((book: any) => {
            const avail = book.availability
              ? `${book.availability.available}/${book.availability.total}`
              : `${book.available ?? "?"}/${book.total ?? "?"}`;
            return `• ${book.title} (${avail} disponibles) — id ${book.id}`;
          })
          .join("\n");
      }
      if (tool === "get_my_loans") {
        return result
          .map((loan: any) => `• ${loan.copy?.book?.title || "Libro"} — ${loan.status} vence ${String(loan.dueOn).slice(0, 10)}`)
          .join("\n");
      }
      if (tool === "list_all_users") {
        return result
          .slice(0, 10)
          .map((u: any) => `• ${u.firstName} ${u.lastName} <${u.email}>`)
          .join("\n");
      }
      return `Encontré ${result.length} resultado(s) para ${tool}.`;
    }
    if (tool === "get_library_statistics" && result && typeof result === "object") {
      const s = result as any;
      return `Usuarios ${s.users}, obras ${s.books}, ejemplares ${s.copies} (${s.available} disponibles), préstamos activos ${s.activeLoans}, vencidos ${s.overdue}, solicitudes ${s.pendingRequests}.`;
    }
    if (tool === "create_loan_request") return "Solicitud de préstamo creada y enviada a revisión.";
    if (tool === "create_reservation") return "Reserva encolada.";
    return "Listo.";
  }
}
