import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { interpretCommand } from '@/lib/ai/assistant';
import { transcribeAudio } from '@/lib/ai/transcribe';
import { recordTokenUsage } from '@/lib/audit';

/**
 * Endpoint del asistente conversacional (comandos por texto o voz).
 *
 * Acepta:
 *   - application/json:      { text: string, conversationId?: string }
 *   - multipart/form-data:   audio=<File>, conversationId?=<string>
 *
 * Flujo: (1) obtiene texto (transcribe si es voz) -> (2) interpreta la
 * intención -> (3) persiste el turno -> (4) para acciones (enviar/agendar)
 * responde con la intención para que el cliente confirme antes de ejecutar.
 *
 * Node runtime: maneja audio y usa la sesión del usuario (RLS).
 */
export const runtime = 'nodejs';

export async function POST(req: Request): Promise<Response> {
  // Identidad segura desde la sesión, nunca desde el body.
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: 'No autenticado.' }, 401);

  // 1) Obtener el texto del comando (voz o texto) -------------------------
  let text = '';
  let modality: 'text' | 'voice' = 'text';
  let conversationId: string | undefined;

  const contentType = req.headers.get('content-type') ?? '';
  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    const audio = form.get('audio');
    conversationId = (form.get('conversationId') as string) || undefined;
    if (!(audio instanceof File)) {
      return json({ error: 'Falta el archivo de audio.' }, 400);
    }
    text = await transcribeAudio(audio);
    modality = 'voice';
  } else {
    const body = await req.json().catch(() => ({}));
    text = (body.text ?? '').toString().trim();
    conversationId = body.conversationId;
  }

  if (!text) return json({ error: 'Comando vacío.' }, 400);

  const db = createAdminClient();

  // 2) Asegurar conversación ----------------------------------------------
  if (!conversationId) {
    const { data: conv } = await db
      .from('assistant_conversations')
      .insert({ user_id: user.id, title: text.slice(0, 60) })
      .select('id')
      .maybeSingle();
    conversationId = conv?.id;
  }

  // Historial reciente para dar contexto al modelo.
  const { data: history } = await db
    .from('assistant_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(6);

  // Turno del usuario.
  await db.from('assistant_messages').insert({
    conversation_id: conversationId,
    user_id: user.id,
    role: 'user',
    content: text,
    input_modality: modality,
  });

  // 3) Interpretar ---------------------------------------------------------
  const { plan, completion } = await interpretCommand(
    text,
    (history ?? []).reverse(),
  );

  await recordTokenUsage(db, {
    userId: user.id,
    messageId: null,
    stage: 'escalation',
    completion,
    latencyMs: 0,
  });

  // 4) Turno del asistente + acciones pendientes --------------------------
  await db.from('assistant_messages').insert({
    conversation_id: conversationId,
    user_id: user.id,
    role: 'assistant',
    content: plan.reply,
    intent: plan.intent,
    metadata: plan.params,
  });

  // Acciones que envían/agendan quedan como aprobación pendiente.
  let approvalId: string | null = null;
  if (plan.intent === 'compose_message' || plan.intent === 'schedule') {
    const { data: appr } = await db
      .from('action_approvals')
      .insert({
        user_id: user.id,
        kind: plan.intent === 'schedule' ? 'schedule_appointment' : 'send_reply',
        summary: plan.reply,
        payload: plan.params,
      })
      .select('id')
      .maybeSingle();
    approvalId = appr?.id ?? null;
  }

  return json({
    conversationId,
    transcript: modality === 'voice' ? text : undefined,
    intent: plan.intent,
    reply: plan.reply,
    approvalId,
  });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
