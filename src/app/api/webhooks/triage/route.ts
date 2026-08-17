import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyHmacSignature } from '@/lib/security/verifyWebhook';
import { triageMessage } from '@/lib/ai/triage';
import { draftReply } from '@/lib/ai/reply';
import { extractAppointment } from '@/lib/ai/scheduling';
import { proposeAppointment, proposeReply } from '@/lib/scheduling';
import {
  loadPreferences,
  recordMessage,
  recordTokenUsage,
  withinBudget,
} from '@/lib/audit';
import type { IncomingMessage } from '@/lib/types';

/**
 * TRIAGE ENGINE — Edge Function.
 *
 * Punto de entrada omnicanal. Cada mensaje entrante (Gmail, WhatsApp, etc.)
 * llega normalizado aquí. Flujo:
 *   1. Verifica la firma HMAC del webhook (autenticidad).
 *   2. Rate limiting por presupuesto mensual (unit economics).
 *   3. Triaje con modelo económico -> JSON estructurado.
 *   4. Auditoría: persiste el mensaje, la decisión y el consumo de tokens.
 *
 * Corre en el Edge para minimizar latencia y cold starts.
 */
export const runtime = 'edge';

// Payload que esperamos del "ingestor" (adaptador Gmail/WhatsApp -> canónico).
const payloadSchema = z.object({
  userId: z.string().uuid(),
  channel: z.enum(['email', 'whatsapp', 'sms', 'other']).default('email'),
  externalId: z.string().optional(),
  sender: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().min(1),
  connectionId: z.string().uuid().optional(),
  providerThreadId: z.string().optional(),
  providerMessageId: z.string().optional(),
});

export async function POST(req: Request): Promise<Response> {
  // 1) Autenticidad del webhook -------------------------------------------
  const rawBody = await req.text();
  const secret = process.env.WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    return json({ error: 'Servidor mal configurado.' }, 500);
  }

  const valid = await verifyHmacSignature(
    rawBody,
    req.headers.get('x-signature'),
    secret,
  );
  if (!valid) {
    return json({ error: 'Firma inválida.' }, 401);
  }

  // 2) Validación del payload ---------------------------------------------
  let msg: IncomingMessage;
  try {
    msg = payloadSchema.parse(JSON.parse(rawBody));
  } catch (err) {
    return json({ error: 'Payload inválido.', detail: String(err) }, 400);
  }

  const db = createAdminClient();

  // 3) Rate limiting por unit economics -----------------------------------
  if (!(await withinBudget(db, msg.userId))) {
    // Se registra el mensaje como pendiente para no perderlo, sin gastar IA.
    await recordMessage(db, msg, {
      category: 'complex_vip',
      confidence: 0,
      reasoning: 'Presupuesto mensual agotado; escalado a humano sin procesar.',
      suggestedAction: 'human_review',
    });
    return json({ status: 'budget_exceeded', action: 'human_review' }, 402);
  }

  // 4) Triaje --------------------------------------------------------------
  try {
    const prefs = await loadPreferences(db, msg.userId);
    const { result, completion, latencyMs } = await triageMessage(msg, prefs);

    // 5) Auditoría (mensaje + tokens) --------------------------------------
    const messageId = await recordMessage(db, msg, result);
    if (completion) {
      await recordTokenUsage(db, {
        userId: msg.userId,
        messageId,
        stage: 'triage',
        completion,
        latencyMs,
      });
    }

    // 6) Acciones derivadas de la categoría --------------------------------
    // spam_info -> nada más (ya quedó como 'archived').
    // routine_faq / complex_vip -> detectar cita y/o preparar respuesta.
    let scheduledApprovalId: string | null = null;
    let replyApprovalId: string | null = null;

    if (result.category !== 'spam_info') {
      // 6a) ¿Es una solicitud de cita? Se propone al usuario, no se agenda solo.
      const sched = await extractAppointment(msg, new Date().toISOString());
      await recordTokenUsage(db, {
        userId: msg.userId,
        messageId,
        stage: 'draft',
        completion: sched.completion,
        latencyMs: 0,
      });

      if (sched.extraction.isRequest && sched.extraction.confidence >= 0.5) {
        const proposed = await proposeAppointment(db, {
          msg,
          messageId,
          extraction: sched.extraction,
        });
        scheduledApprovalId = proposed.approvalId;
      } else {
        // 6b) No es cita: redactar respuesta. Siempre encolada para aprobar.
        const stage = result.category === 'complex_vip' ? 'escalation' : 'draft';
        const { draft, completion: replyCompletion } = await draftReply(
          msg,
          prefs,
          result.category,
        );
        await recordTokenUsage(db, {
          userId: msg.userId,
          messageId,
          stage,
          completion: replyCompletion,
          latencyMs: 0,
        });
        replyApprovalId = await proposeReply(db, {
          userId: msg.userId,
          messageId,
          draft,
          sender: msg.sender,
        });
      }
    }

    return json({
      status: 'ok',
      messageId,
      category: result.category,
      action: result.suggestedAction,
      confidence: result.confidence,
      reasoning: result.reasoning,
      scheduledApprovalId,
      replyApprovalId,
    });
  } catch (err) {
    console.error('Triage pipeline error:', err);
    return json({ error: 'Fallo en el triaje.', detail: String(err) }, 500);
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
