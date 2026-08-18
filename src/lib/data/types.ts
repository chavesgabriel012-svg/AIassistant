/**
 * View-models de la UI. Son lo que consumen los componentes, desacoplados del
 * esquema de la base. La capa de datos (mock hoy, Supabase mañana) mapea a esto.
 */
import type {
  ApprovalKind,
  ChannelProvider,
  MessageChannel,
  TriageCategory,
} from '@/lib/types';

export interface UiUser {
  handle: string; // @usuario
  fullName: string;
  email: string;
  plan: 'free' | 'pro' | 'enterprise';
  avatarInitials: string;
}

export interface UiChannel {
  provider: ChannelProvider;
  account: string;
  status: 'active' | 'revoked' | 'error' | 'disconnected';
  lastSyncedLabel?: string;
  unread: number;
}

export interface UiMessage {
  id: string;
  channel: MessageChannel;
  sender: string;
  senderHandle?: string;
  subject?: string;
  preview: string;
  category: TriageCategory;
  receivedAtISO: string;
  unread: boolean;
  /** Puntaje de prospecto 0-100 (para bienes raíces / ventas). */
  leadScore?: number;
}

export interface UiOutboxItem {
  id: string;
  channel: MessageChannel;
  to: string;
  subject?: string;
  preview: string;
  sentAtISO: string;
  mode: 'auto' | 'approved'; // respondido en autopilot o tras aprobación
}

export interface UiApproval {
  id: string;
  kind: ApprovalKind;
  summary: string;
  detail: string; // borrador de respuesta o detalle de la cita
  from: string;
  channel: MessageChannel;
  createdAtISO: string;
  category: TriageCategory;
}

export interface UiAppointment {
  id: string;
  title: string;
  withWhom: string;
  startISO: string;
  location?: string;
  status: 'awaiting_user' | 'confirmed' | 'declined';
}

export interface UiReminder {
  id: string;
  text: string;
  dueISO?: string;
  done: boolean;
}

export interface UiUsage {
  planLabel: string;
  monthlyBudgetUsd: number;
  spentUsd: number;
  messagesProcessed: number;
  autoHandledPct: number; // % resuelto sin molestar al humano
  hoursSaved: number;
  byModel: { model: string; calls: number; costUsd: number }[];
  daily: { day: string; processed: number; escalated: number }[];
}

export interface UiStat {
  label: string;
  value: string;
  deltaLabel?: string;
  trend?: 'up' | 'down' | 'flat';
}

export type WidgetKind =
  | 'calendar'
  | 'reminders'
  | 'usage'
  | 'stats'
  | 'prospects';
