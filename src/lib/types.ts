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

// ---------------------------------------------------------------------------
// Canales y conexiones (multicanal)
// ---------------------------------------------------------------------------

export type ChannelProvider = 'gmail' | 'outlook' | 'whatsapp';

export type ConnectionStatus = 'active' | 'revoked' | 'error';

// ---------------------------------------------------------------------------
// Agendado de citas
// ---------------------------------------------------------------------------

export type AppointmentStatus =
  | 'proposed' // el asistente detectó una solicitud de cita
  | 'awaiting_user' // esperando decisión del humano
  | 'confirmed' // agendada en plataforma + calendario del usuario
  | 'declined' // el usuario la rechazó
  | 'cancelled';

/** Intención de cita extraída de un mensaje por el modelo. */
export interface AppointmentExtraction {
  isRequest: boolean;
  title?: string;
  /** ISO 8601 con zona; null si el modelo no logró resolver la fecha. */
  startsAt?: string | null;
  endsAt?: string | null;
  location?: string | null;
  confidence: number;
  reasoning: string;
}

// ---------------------------------------------------------------------------
// Cola de aprobaciones (human-in-the-loop)
// ---------------------------------------------------------------------------

export type ApprovalKind = 'schedule_appointment' | 'send_reply';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

// ---------------------------------------------------------------------------
// Asistente conversacional (comandos por voz/texto)
// ---------------------------------------------------------------------------

export type InputModality = 'text' | 'voice';

export type AssistantRole = 'user' | 'assistant' | 'tool';

/** Intención resuelta a partir de un comando del usuario. */
export type AssistantIntent =
  | 'compose_message' // "escríbele a X para reunirnos el sábado"
  | 'search_messages' // "¿me enviaron el reporte esta semana?"
  | 'schedule' // "agéndame con Y el viernes a las 3"
  | 'answer'; // pregunta general / conversación

export interface AssistantPlan {
  intent: AssistantIntent;
  /** Respuesta en lenguaje natural para el usuario. */
  reply: string;
  /** Parámetros estructurados de la acción, según el intent. */
  params: Record<string, unknown>;
  confidence: number;
}
