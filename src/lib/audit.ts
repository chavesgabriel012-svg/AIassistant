import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  IncomingMessage,
  PipelineStage,
  TriageResult,
  UserPreferences,
} from '@/lib/types';
import { estimateCostMicros } from '@/lib/ai/pricing';
import type { CompletionResult } from '@/lib/ai/router';

/**
 * Capa de datos del pipeline. Usa el cliente admin (service_role) porque el
 * webhook no tiene sesión de usuario. Todas las escrituras se anclan a user_id.
 */

/** Carga las preferencias de filtrado del usuario (o defaults sensatos). */
export async function loadPreferences(
  db: SupabaseClient,
  userId: string,
): Promise<UserPreferences> {
  const { data } = await db
    .from('user_preferences')
    .select(
      'triage_instructions, vip_contacts, blocked_senders, auto_reply_signature, autopilot_enabled, reply_tone',
    )
    .eq('user_id', userId)
    .maybeSingle();

  return {
    triageInstructions: data?.triage_instructions ?? null,
    vipContacts: data?.vip_contacts ?? [],
    blockedSenders: data?.blocked_senders ?? [],
    autoReplySignature: data?.auto_reply_signature ?? null,
    autopilotEnabled: data?.autopilot_enabled ?? false,
    replyTone: data?.reply_tone ?? 'profesional y cordial',
  };
}

/**
 * Rate limiting por unit economics: compara el gasto del mes contra el techo
 * del usuario. Devuelve true si TODAVÍA tiene presupuesto.
 */
export async function withinBudget(
  db: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const [{ data: user }, { data: spend }] = await Promise.all([
    db.from('users').select('monthly_token_budget_cents').eq('id', userId).maybeSingle(),
    db.from('current_month_spend').select('spend_cents').eq('user_id', userId).maybeSingle(),
  ]);

  const budget = user?.monthly_token_budget_cents ?? 0;
  const spent = spend?.spend_cents ?? 0;
  return spent < budget;
}

/** Registra el mensaje entrante + la decisión del triaje. Devuelve el id. */
export async function recordMessage(
  db: SupabaseClient,
  msg: IncomingMessage,
  result: TriageResult,
): Promise<string | null> {
  const { data, error } = await db
    .from('messages')
    .upsert(
      {
        user_id: msg.userId,
        channel: msg.channel,
        external_id: msg.externalId ?? null,
        sender: msg.sender ?? null,
        subject: msg.subject ?? null,
        body_preview: msg.body.slice(0, 500),
        connection_id: msg.connectionId ?? null,
        thread_id: msg.providerThreadId ?? null,
        rfc822_message_id: msg.providerMessageId ?? null,
        category: result.category,
        action: result.suggestedAction,
        confidence: result.confidence,
        reasoning: result.reasoning,
        processed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,channel,external_id' },
    )
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('recordMessage error:', error.message);
    return null;
  }
  return data?.id ?? null;
}

/** Registra el consumo de una llamada a LLM para facturación. */
export async function recordTokenUsage(
  db: SupabaseClient,
  params: {
    userId: string;
    messageId: string | null;
    stage: PipelineStage;
    completion: CompletionResult;
    latencyMs: number;
  },
): Promise<void> {
  const { completion } = params;
  const { error } = await db.from('token_usage_logs').insert({
    user_id: params.userId,
    message_id: params.messageId,
    stage: params.stage,
    provider: completion.provider,
    model: completion.model,
    input_tokens: completion.usage.inputTokens,
    output_tokens: completion.usage.outputTokens,
    estimated_cost_micros: estimateCostMicros(completion.model, completion.usage),
    latency_ms: params.latencyMs,
  });

  if (error) console.error('recordTokenUsage error:', error.message);
}
