/**
 * Tipos compartidos del dominio "Escudo Digital".
 * Mantener alineados con supabase/migrations/0001_initial_schema.sql.
 */

export type TriageCategory = 'spam_info' | 'routine_faq' | 'complex_vip';

export type MessageAction =
  | 'archived'
  | 'auto_replied'
  | 'escalated'
  | 'human_review'
  | 'pending';

export type MessageChannel = 'email' | 'whatsapp' | 'sms' | 'other';

export type PipelineStage = 'triage' | 'draft' | 'escalation';

/** Mensaje entrante normalizado, agnóstico del proveedor (Gmail, WhatsApp...). */
export interface IncomingMessage {
  userId: string;
  channel: MessageChannel;
  externalId?: string;
  sender?: string;
  subject?: string;
  body: string;
}

/** Salida estructurada que exigimos al modelo de triaje. */
export interface TriageResult {
  category: TriageCategory;
  /** Confianza declarada por el modelo, en [0, 1]. */
  confidence: number;
  /** Razonamiento corto y auditable de por qué eligió la categoría. */
  reasoning: string;
  /** Acción sugerida derivada de la categoría + preferencias del usuario. */
  suggestedAction: MessageAction;
}

/** Preferencias de filtrado relevantes para el prompt de triaje. */
export interface UserPreferences {
  triageInstructions?: string | null;
  vipContacts: string[];
  blockedSenders: string[];
  autoReplySignature?: string | null;
  autopilotEnabled: boolean;
  replyTone: string;
}

/** Uso de tokens devuelto por un proveedor tras una llamada. */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}
