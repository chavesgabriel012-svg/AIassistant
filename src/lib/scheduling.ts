import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppointmentExtraction, IncomingMessage } from '@/lib/types';

/**
 * Capa de datos del flujo de agendado (human-in-the-loop).
 *
 * Al detectar una cita se crea un appointment en estado 'awaiting_user' y una
 * entrada en la cola de aprobaciones. El usuario decide; recién ahí se
 * confirma y se escribe al calendario externo.
 */

/** Crea una cita propuesta + su aprobación pendiente. Devuelve ambos ids. */
export async function proposeAppointment(
  db: SupabaseClient,
  params: {
    msg: IncomingMessage;
    messageId: string | null;
    extraction: AppointmentExtraction;
  },
): Promise<{ appointmentId: string | null; approvalId: string | null }> {
  const { msg, messageId, extraction } = params;

  const { data: appt, error: apptErr } = await db
    .from('appointments')
    .insert({
      user_id: msg.userId,
      message_id: messageId,
      source_channel: msg.channel,
      requester: msg.sender ?? null,
      title: extraction.title ?? 'Cita solicitada',
      starts_at: extraction.startsAt,
      ends_at: extraction.endsAt,
      location: extraction.location,
      status: 'awaiting_user',
    })
    .select('id')
    .maybeSingle();

  if (apptErr) {
    console.error('proposeAppointment/appointment error:', apptErr.message);
    return { appointmentId: null, approvalId: null };
  }

  const appointmentId = appt?.id ?? null;

  const summary = `${msg.sender ?? 'Alguien'} solicita: ${
    extraction.title ?? 'una cita'
  }${extraction.startsAt ? ` — ${extraction.startsAt}` : ''}`;

  const { data: approval, error: apprErr } = await db
    .from('action_approvals')
    .insert({
      user_id: msg.userId,
      kind: 'schedule_appointment',
      message_id: messageId,
      appointment_id: appointmentId,
      summary,
      payload: {
        title: extraction.title,
        startsAt: extraction.startsAt,
        endsAt: extraction.endsAt,
        location: extraction.location,
        requester: msg.sender,
        confidence: extraction.confidence,
      },
    })
    .select('id')
    .maybeSingle();

  if (apprErr) {
    console.error('proposeAppointment/approval error:', apprErr.message);
  }

  return { appointmentId, approvalId: approval?.id ?? null };
}

/** Encola un borrador de respuesta para aprobación del usuario. */
export async function proposeReply(
  db: SupabaseClient,
  params: {
    userId: string;
    messageId: string | null;
    draft: string;
    sender?: string;
  },
): Promise<string | null> {
  const { data, error } = await db
    .from('action_approvals')
    .insert({
      user_id: params.userId,
      kind: 'send_reply',
      message_id: params.messageId,
      summary: `Respuesta sugerida para ${params.sender ?? 'un contacto'}`,
      payload: { draft: params.draft, sender: params.sender },
    })
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('proposeReply error:', error.message);
    return null;
  }
  return data?.id ?? null;
}
