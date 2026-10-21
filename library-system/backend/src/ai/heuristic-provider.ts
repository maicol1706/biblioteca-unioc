import { CompletionRequest, CompletionResponse, ToolCall } from "../modules/ai/ai-provider";

export class HeuristicAIProvider {
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const last = [...request.messages].reverse().find((item) => item.role === "user");
    const text = (last?.content || "").toLowerCase();

    const bookQuery = this.extractQuery(last?.content || "");

    if (/(usuario|listar usuarios|quién está registrado)/.test(text)) {
      return this.tools("list_all_users");
    }
    if (/(estadíst|reporte|resumen|dashboard)/.test(text)) {
      return this.tools("get_library_statistics");
    }
    if (/(solicitud.*pendiente|pendientes de aprobar)/.test(text)) {
      return this.tools("get_pending_requests");
    }
    if (/(vencid)/.test(text) && /(préstamo|prestamo|libro)/.test(text)) {
      return this.tools("get_overdue_loans");
    }
    if (/(reserv)/.test(text)) {
      return this.tools("create_reservation", { bookId: bookQuery.bookId, query: bookQuery.query });
    }
    if (/(solicita|pedir préstamo|pedir prestamo|préstame|prestame)/.test(text)) {
      return this.tools("create_loan_request", { bookId: bookQuery.bookId, query: bookQuery.query });
    }
    if (/(mis préstamos|mis prestamos|qué tengo prestado|que tengo prestado)/.test(text)) {
      return this.tools("get_my_loans");
    }
    if (/(cuándo devolv|cuando devolv|fecha de venc|vence)/.test(text)) {
      return this.tools("get_my_due_dates");
    }
    if (/(disponib)/.test(text)) {
      return this.tools("get_book_availability", { query: bookQuery.query });
    }
    if (/(busca|catálogo|catalogo|libro|isbn)/.test(text)) {
      return this.tools("search_books", { query: bookQuery.query });
    }
    if (/(hola|buenas|quién eres|quien eres|ayuda)/.test(text)) {
      return {
        text: "Soy JARVIS, el asistente de la biblioteca. Puedo buscar libros, ver tus préstamos, solicitar o reservar, y —si tienes permiso— mostrar solicitudes, vencidos, reportes o usuarios.",
        toolCalls: [],
      };
    }
    return {
      text: "Puedo ayudarte con el catálogo, tus préstamos, solicitudes y reservas. Prueba: «busca cálculo», «mis préstamos» o «estadísticas».",
      toolCalls: [],
    };
  }

  private tools(name: string, args: Record<string, unknown> = {}): CompletionResponse {
    const call: ToolCall = { id: `tool_${name}`, name, arguments: args };
    return { toolCalls: [call] };
  }

  private extractQuery(raw: string) {
    const idMatch = raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    const quoted = raw.match(/[«"]([^»"]+)[»"]/);
    const after = raw.match(/(?:busca|buscar|libro|de|disponibilidad de)\s+(.+)$/i);
    return {
      bookId: idMatch?.[0],
      query: (quoted?.[1] || after?.[1] || raw).trim(),
    };
  }
}
