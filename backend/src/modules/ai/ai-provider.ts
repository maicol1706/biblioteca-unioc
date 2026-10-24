/**
 * Puerto de inteligencia artificial para JARVIS.
 * Fase 1: contrato.
 * Fase 9: implementación real + ToolManager + PermissionValidator.
 *
 * JARVIS nunca consulta la base de datos de forma directa.
 */

export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  toolCallId?: string;
  toolName?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  requiredPermission: string;
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface CompletionRequest {
  messages: ChatMessage[];
  tools: ToolDefinition[];
}

export interface CompletionResponse {
  text?: string;
  toolCalls: ToolCall[];
}

export interface AIProvider {
  complete(request?: CompletionRequest): Promise<CompletionResponse>;
}

export class DegradedAIProvider implements AIProvider {
  async complete(_request?: CompletionRequest): Promise<CompletionResponse> {
    return {
      text: "JARVIS está en modo degradado: no hay proveedor de IA configurado. El resto del sistema de biblioteca sigue operativo.",
      toolCalls: [],
    };
  }
}

export class CloudAIProvider implements AIProvider {
  async complete(_request?: CompletionRequest): Promise<CompletionResponse> {
    if (!process.env.AI_API_KEY) {
      return new DegradedAIProvider().complete();
    }
    return new DegradedAIProvider().complete();
  }
}

export class LocalAIProvider implements AIProvider {
  async complete(_request?: CompletionRequest): Promise<CompletionResponse> {
    return {
      text: "LocalAIProvider es un marcador de fase futura. No hay modelo local enlazado todavía.",
      toolCalls: [],
    };
  }
}

export const INITIAL_LIBRARY_TOOLS: ToolDefinition[] = [
  { name: "search_books", description: "Busca en el catálogo", requiredPermission: "catalog.read", parameters: {} },
  { name: "get_book_availability", description: "Disponibilidad de una obra", requiredPermission: "catalog.read", parameters: {} },
  { name: "get_my_loans", description: "Préstamos del usuario autenticado", requiredPermission: "loans.read_own", parameters: {} },
  { name: "get_my_due_dates", description: "Fechas de devolución propias", requiredPermission: "loans.read_own", parameters: {} },
  { name: "create_loan_request", description: "Solicita un préstamo", requiredPermission: "loans.request", parameters: {} },
  { name: "create_reservation", description: "Reserva una obra sin ejemplares", requiredPermission: "reservations.create", parameters: {} },
  { name: "get_pending_requests", description: "Solicitudes pendientes", requiredPermission: "loans.approve", parameters: {} },
  { name: "get_overdue_loans", description: "Préstamos vencidos", requiredPermission: "loans.approve", parameters: {} },
  { name: "get_library_statistics", description: "Estadísticas", requiredPermission: "reports.read", parameters: {} },
  { name: "list_all_users", description: "Listado de usuarios", requiredPermission: "users.manage", parameters: {} },
];
