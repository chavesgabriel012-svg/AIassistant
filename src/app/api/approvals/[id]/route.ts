import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getValidAccessToken, sendReply } from '@/lib/channels/gmail/api';

/**
 * Decisión sobre una acción encolada (human-in-the-loop).
 *
 *   PATCH /api/approvals/:id   body: { decision: 'approved' | 'rejected' }
 *
 * - approved + send_reply -> ENVÍA la respuesta por Gmail, en el mismo hilo.
 * - approved + schedule_appointment -> confirma la cita (escritura al
 *   calendario del usuario: TODO, requiere scope de Google Calendar).
 * - rejected -> marca la acción/cita como rechazada.
 *
 * La identidad se toma de la sesión; RLS impide tocar aprobaciones ajenas.
 */
export const runtime = 'nodejs';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: 'No autenticado.' }, 401);

  const { decision } = await req.json().catch(() => ({}));
  if (decision !== 'approved' && decision !== 'rejected') {
    return json({ error: "decision debe ser 'approved' o 'rejected'." }, 400);
  }

  // Lectura con la sesión del usuario => RLS garantiza que es suya.
  const { data: approval, error } = await supabase
    .from('action_approvals')
    .select('id, kind, status, appointment_id, message_id, payload')
    .eq('id', params.id)
    .maybeSingle();

  if (error || !approval) return json({ error: 'Aprobación no encontrada.' }, 404);
  if (approval.status !== 'pending') {
    return json({ error: 'La acción ya fue decidida.' }, 409);
  }

  const db = createAdminClient(); // ejecutar la acción requiere service_role.

  try {
    if (decision === 'approved') {
      await executeApproved(db, approval);
    } else {
      await executeRejected(db, approval);
    }
  } catch (e) {
    console.error('Fallo al ejecutar la acción aprobada:', e);
    return json({ error: 'No se pudo ejecutar la acción.', detail: String(e) }, 502);
  }

  await db
    .from('action_approvals')
    .update({ status: decision, decided_at: new Date().toISOString() })
    .eq('id', approval.id);

  return json({ id: approval.id, status: decision });
}

interface ApprovalRow {
  id: string;
  kind: string;
  appointment_id: string | null;
  message_id: string | null;
  payload: { draft?: string } & Record<string, unknown>;
}

async function executeApproved(db: SupabaseClient, approval: ApprovalRow) {
  if (approval.kind === 'send_reply') {
    await sendGmailReply(db, approval);
    return;
  }

  if (approval.kind === 'schedule_appointment' && approval.appointment_id) {
    // TODO: crear el evento en Google Calendar con el token del usuario
    //       (requiere scope calendar.events) y guardar external_calendar_event_id.
    await db
      .from('appointments')
      .update({ status: 'confirmed' })
      .eq('id', approval.appointment_id);
  }
}

/** Envía por Gmail el borrador aprobado, respondiendo en el hilo original. */
async function sendGmailReply(db: SupabaseClient, approval: ApprovalRow) {
  const draft = approval.payload?.draft;
  if (!draft || !approval.message_id) {
    throw new Error('Falta el borrador o el mensaje original.');
  }

  // Datos del mensaje original para responder en el hilo correcto.
  const { data: message } = await db
    .from('messages')
    .select('sender, subject, thread_id, rfc822_message_id, connection_id, channel')
    .eq('id', approval.message_id)
    .maybeSingle();

  if (!message || message.channel !== 'email' || !message.connection_id) {
    throw new Error('El mensaje no es un correo con conexión asociada.');
  }

  // Cuenta desde la que se responde.
  const { data: conn } = await db
    .from('channel_connections')
    .select('external_account')
    .eq('id', message.connection_id)
    .maybeSingle();
  if (!conn) throw new Error('Conexión de correo no encontrada.');

  const accessToken = await getValidAccessToken(db, message.connection_id);
  await sendReply(accessToken, {
    from: conn.external_account,
    to: message.sender ?? '',
    subject: message.subject ?? '(sin asunto)',
    body: draft,
    threadId: message.thread_id ?? '',
    inReplyTo: message.rfc822_message_id ?? undefined,
  });

  await db
    .from('messages')
    .update({ action: 'auto_replied' })
    .eq('id', approval.message_id);
}

async function executeRejected(db: SupabaseClient, approval: ApprovalRow) {
  if (approval.kind === 'schedule_appointment' && approval.appointment_id) {
    await db
      .from('appointments')
      .update({ status: 'declined' })
      .eq('id', approval.appointment_id);
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
