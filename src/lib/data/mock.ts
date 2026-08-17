/**
 * Proveedor de datos MOCK. Alimenta toda la UI sin APIs reales.
 *
 * Costura de reemplazo: cuando integremos Supabase, se crea `supabase.ts` con
 * las mismas firmas y se cambia el export en `index.ts`. La UI no cambia.
 */
import type {
  UiApproval,
  UiAppointment,
  UiChannel,
  UiMessage,
  UiOutboxItem,
  UiReminder,
  UiStat,
  UiUsage,
  UiUser,
} from './types';

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
const inHours = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();

export const mockUser: UiUser = {
  handle: '@gabriel',
  fullName: 'Gabriel Chaves',
  email: 'gabriel@escudodigital.cr',
  plan: 'pro',
  avatarInitials: 'GC',
};

export const mockChannels: UiChannel[] = [
  { provider: 'gmail', account: 'gabriel@gmail.com', status: 'active', lastSyncedLabel: 'hace 2 min', unread: 7 },
  { provider: 'outlook', account: 'g.chaves@empresa.cr', status: 'disconnected', unread: 0 },
  { provider: 'whatsapp', account: '+506 8888-2222', status: 'active', lastSyncedLabel: 'hace 5 min', unread: 3 },
];

export const mockMessages: UiMessage[] = [
  {
    id: 'm1', channel: 'whatsapp', sender: 'Número desconocido', senderHandle: '+506 7100-4521',
    preview: 'Buenas, vi la propiedad en San Juan Norte, Turrialba. ¿Sigue disponible? Me interesa agendar una visita.',
    category: 'complex_vip', receivedAtISO: hoursAgo(0.4), unread: true, leadScore: 88,
  },
  {
    id: 'm2', channel: 'email', sender: 'Laura Jiménez', senderHandle: 'laura@inmobiliariacr.com',
    subject: 'Reunión jueves 3pm', preview: 'Hola, ¿podemos vernos el jueves a las 3pm en tu oficina de Santa Ana para revisar el contrato?',
    category: 'complex_vip', receivedAtISO: hoursAgo(1.2), unread: true, leadScore: 72,
  },
  {
    id: 'm3', channel: 'email', sender: 'Banco Nacional', senderHandle: 'notificaciones@bncr.fi.cr',
    subject: 'Tu estado de cuenta está listo', preview: 'Estimado cliente, su estado de cuenta del mes ya está disponible en la banca en línea.',
    category: 'routine_faq', receivedAtISO: hoursAgo(2), unread: false,
  },
  {
    id: 'm4', channel: 'email', sender: 'Newsletter Marketing', senderHandle: 'no-reply@promos.com',
    subject: '🔥 50% de descuento solo hoy', preview: 'No te pierdas nuestras ofertas exclusivas de temporada. Haz clic aquí para aprovechar.',
    category: 'spam_info', receivedAtISO: hoursAgo(3), unread: false,
  },
  {
    id: 'm5', channel: 'whatsapp', sender: 'Mamá', senderHandle: '+506 8888-1111',
    preview: '¿Venís a almorzar el domingo mijo?', category: 'complex_vip',
    receivedAtISO: hoursAgo(4), unread: false,
  },
  {
    id: 'm6', channel: 'email', sender: 'Carlos Mora (RECOPE)', senderHandle: 'cmora@recope.go.cr',
    subject: 'Consulta sobre lote', preview: '¿Cuál es el precio por m² del lote cerca de RECOPE? Estoy comparando opciones para invertir.',
    category: 'routine_faq', receivedAtISO: hoursAgo(6), unread: false, leadScore: 54,
  },
];

export const mockOutbox: UiOutboxItem[] = [
  {
    id: 'o1', channel: 'email', to: 'cmora@recope.go.cr', subject: 'Re: Consulta sobre lote',
    preview: 'Gracias por tu interés. El lote cercano a RECOPE está en ₡45.000/m². Con gusto te comparto la ficha...',
    sentAtISO: hoursAgo(5.5), mode: 'approved',
  },
  {
    id: 'o2', channel: 'email', to: 'notificaciones@bncr.fi.cr', subject: 'Re: Estado de cuenta',
    preview: 'Mensaje archivado automáticamente (informativo, no requiere respuesta).',
    sentAtISO: hoursAgo(2), mode: 'auto',
  },
  {
    id: 'o3', channel: 'whatsapp', to: '+506 6012-9987',
    preview: 'Hola, gracias por escribir. Nuestro horario de visitas es de lunes a sábado de 9am a 5pm. ¿Te agendo una?',
    sentAtISO: hoursAgo(8), mode: 'auto',
  },
];

export const mockApprovals: UiApproval[] = [
  {
    id: 'a1', kind: 'schedule_appointment', category: 'complex_vip', channel: 'email',
    from: 'Laura Jiménez', createdAtISO: hoursAgo(1.2),
    summary: 'Laura Jiménez solicita reunión — jueves 3:00pm, oficina Santa Ana',
    detail: 'Cita detectada: "Revisión de contrato" el jueves a las 15:00 en tu oficina de Santa Ana. ¿La agendo en tu calendario?',
  },
  {
    id: 'a2', kind: 'send_reply', category: 'complex_vip', channel: 'whatsapp',
    from: '+506 7100-4521', createdAtISO: hoursAgo(0.4),
    summary: 'Respuesta sugerida a prospecto de Turrialba (score 88)',
    detail: '¡Hola! Gracias por tu interés en la propiedad de San Juan Norte. Sí, sigue disponible. ¿Te parece coordinar una visita este fin de semana? Tengo espacio el sábado por la mañana.',
  },
  {
    id: 'a3', kind: 'send_reply', category: 'routine_faq', channel: 'email',
    from: 'Carlos Mora (RECOPE)', createdAtISO: hoursAgo(6),
    summary: 'Respuesta sugerida sobre precio de lote',
    detail: 'Hola Carlos, gracias por tu consulta. El precio actual es de ₡45.000/m². Con gusto te envío la ficha técnica y coordinamos una visita si te interesa.',
  },
];

export const mockAppointments: UiAppointment[] = [
  { id: 'ap1', title: 'Revisión de contrato', withWhom: 'Laura Jiménez', startISO: inHours(30), location: 'Oficina Santa Ana', status: 'awaiting_user' },
  { id: 'ap2', title: 'Visita propiedad', withWhom: 'Prospecto Turrialba', startISO: inHours(54), location: 'San Juan Norte', status: 'confirmed' },
  { id: 'ap3', title: 'Llamada de seguimiento', withWhom: 'Carlos Mora', startISO: inHours(78), status: 'confirmed' },
];

export const mockReminders: UiReminder[] = [
  { id: 'r1', text: 'Enviar ficha técnica del lote a Carlos', dueISO: inHours(3), done: false },
  { id: 'r2', text: 'Confirmar disponibilidad sábado con prospecto', dueISO: inHours(20), done: false },
  { id: 'r3', text: 'Llamar a la notaría', done: true },
];

export const mockUsage: UiUsage = {
  planLabel: 'Pro',
  monthlyBudgetUsd: 25,
  spentUsd: 8.4,
  messagesProcessed: 1284,
  autoHandledPct: 76,
  hoursSaved: 14,
  byModel: [
    { model: 'claude-haiku-4-5 (triaje)', calls: 1284, costUsd: 3.1 },
    { model: 'claude-haiku-4-5 (redacción)', calls: 210, costUsd: 2.2 },
    { model: 'claude-sonnet-5 (VIP)', calls: 63, costUsd: 3.1 },
  ],
  daily: [
    { day: 'Lun', processed: 180, escalated: 22 },
    { day: 'Mar', processed: 220, escalated: 31 },
    { day: 'Mié', processed: 195, escalated: 18 },
    { day: 'Jue', processed: 240, escalated: 40 },
    { day: 'Vie', processed: 210, escalated: 27 },
    { day: 'Sáb', processed: 140, escalated: 12 },
    { day: 'Dom', processed: 99, escalated: 8 },
  ],
};

export const mockStats: UiStat[] = [
  { label: 'Resueltos sin molestarte', value: '76%', deltaLabel: '+8% vs. semana pasada', trend: 'up' },
  { label: 'Tiempo ahorrado', value: '14 h', deltaLabel: 'este mes', trend: 'up' },
  { label: 'Prospectos detectados', value: '9', deltaLabel: '3 de alto valor', trend: 'up' },
  { label: 'Spam filtrado', value: '312', deltaLabel: 'esta semana', trend: 'flat' },
];
