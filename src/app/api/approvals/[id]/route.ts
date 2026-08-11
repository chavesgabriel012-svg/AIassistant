import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Decisión sobre una acción encolada (human-in-the-loop).
 *
 *   PATCH /api/approvals/:id   body: { decision: 'approved' | 'rejected' }
 *
 * - approved + schedule_appointment -> confirma la cita y la escribe al
 *   calendario del usuario (Google/Microsoft). *Ejecución real: TODO.*
 * - approved + send_reply -> envía la respuesta por el canal de origen. TODO.
 * - rejected -> marca la acción/ cita como rechazada (y, si aplica, prepara un
 *   mensaje cortés de "no puedo").
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

  if (decision === 'approved') {
    await executeApproved(db, user.id, approval);
  } else {
    await executeRejected(db, approval);
  }

  await db
    .from('action_approvals')
    .update({ status: decision, decided_at: new Date().toISOString() })
    .eq('id', approval.id);

  return json({ id: approval.id, status: decision });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeApproved(db: any, userId: string, approval: any) {
  if (approval.kind === 'schedule_appointment' && approval.appointment_id) {
    // TODO: crear el evento en el calendario del usuario usando el token OAuth
    //       cifrado (decryptToken) del proveedor conectado, y guardar el
    //       external_calendar_event_id devuelto.
    await db
      .from('appointments')
      .update({ status: 'confirmed' })
      .eq('id', approval.appointment_id);
  }

  if (approval.kind === 'send_reply') {
    // TODO: enviar `approval.payload.draft` por el canal de origen del mensaje
    //       (Gmail/Outlook/WhatsApp) con las credenciales del usuario.
    if (approval.message_id) {
      await db
        .from('messages')
        .update({ action: 'auto_replied' })
        .eq('id', approval.message_id);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeRejected(db: any, approval: any) {
  if (approval.kind === 'schedule_appointment' && approval.appointment_id) {
    await db
      .from('appointments')
      .update({ status: 'declined' })
      .eq('id', approval.appointment_id);
    // TODO (opcional): encolar un send_reply cortés declinando la cita.
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
