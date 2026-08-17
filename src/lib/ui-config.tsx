import {
  Home,
  Inbox,
  Send,
  Sparkles,
  CalendarDays,
  Users,
  SlidersHorizontal,
  Settings,
  Mail,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react';
import type { ChannelProvider, MessageChannel, TriageCategory } from '@/lib/types';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badgeKey?: 'inbox' | 'approvals';
}

/** Navegación principal (barra lateral). */
export const NAV_MAIN: NavItem[] = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/inbox', label: 'Bandeja', icon: Inbox, badgeKey: 'inbox' },
  { href: '/outbox', label: 'Enviados', icon: Send },
  { href: '/prospects', label: 'Prospectos', icon: Users },
  { href: '/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/rules', label: 'Reglas', icon: SlidersHorizontal },
];

export const NAV_FOOTER: NavItem[] = [
  { href: '/settings', label: 'Configuración', icon: Settings },
];

/** Metadatos visuales por categoría de triaje. */
export const CATEGORY_META: Record<
  TriageCategory,
  { label: string; className: string }
> = {
  spam_info: { label: 'Filtrado', className: 'text-muted border-border bg-surface-2' },
  routine_faq: { label: 'Rutinario', className: 'text-warning border-warning/30 bg-warning/10' },
  complex_vip: { label: 'Importante', className: 'text-accent border-accent/30 bg-accent/10' },
};

export const CHANNEL_META: Record<
  MessageChannel,
  { label: string; icon: LucideIcon; className: string }
> = {
  email: { label: 'Correo', icon: Mail, className: 'text-accent' },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle, className: 'text-success' },
  sms: { label: 'SMS', icon: MessageCircle, className: 'text-muted' },
  other: { label: 'Otro', icon: Sparkles, className: 'text-muted' },
};

export const PROVIDER_META: Record<
  ChannelProvider,
  { label: string; icon: LucideIcon }
> = {
  gmail: { label: 'Gmail', icon: Mail },
  outlook: { label: 'Outlook', icon: Mail },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle },
};
