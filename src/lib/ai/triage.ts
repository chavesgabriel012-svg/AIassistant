import { z } from 'zod';
import type {
  IncomingMessage,
  MessageAction,
  TriageCategory,
  TriageResult,
  UserPreferences,
} from '@/lib/types';
import { buildTriageSystemPrompt, buildTriageUserPrompt } from './prompts';
import { routeFor, runCompletion, type CompletionResult } from './router';
import { extractJson } from './json';

/** Esquema estricto de la salida del modelo de triaje. */
const triageSchema = z.object({
  category: z.enum(['spam_info', 'routine_faq', 'complex_vip']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1).max(500),
});

/** Mapea categoría -> acción por defecto (antes de aplicar preferencias). */
function defaultActionFor(
  category: TriageCategory,
  prefs: UserPreferences,
): MessageAction {
  switch (category) {
    case 'spam_info':
      return 'archived';
    case 'routine_faq':
      // Con autopilot apagado, todo pasa por revisión humana.
      return prefs.autopilotEnabled ? 'auto_replied' : 'human_review';
    case 'complex_vip':
      return 'human_review';
  }
}

/**
 * Atajos deterministas ANTES de gastar un token: si el remitente está en la
 * blocklist o allowlist del usuario, resolvemos sin llamar al modelo.
 * Esto es puro ahorro de unit economics.
 */
function shortCircuit(
  msg: IncomingMessage,
  prefs: UserPreferences,
): TriageResult | null {
  const sender = (msg.sender ?? '').toLowerCase();
  if (!sender) return null;

  const matches = (list: string[]) =>
    list.some((entry) => sender.includes(entry.toLowerCase()));

  if (matches(prefs.blockedSenders)) {
    return {
      category: 'spam_info',
      confidence: 1,
      reasoning: 'Remitente en la lista de bloqueados del usuario.',
      suggestedAction: 'archived',
    };
  }
  if (matches(prefs.vipContacts)) {
    return {
      category: 'complex_vip',
      confidence: 1,
      reasoning: 'Remitente en la lista VIP del usuario.',
      suggestedAction: 'human_review',
    };
  }
  return null;
}

export interface TriageOutput {
  result: TriageResult;
  /** null cuando se resolvió por atajo (sin llamada al LLM). */
  completion: CompletionResult | null;
  latencyMs: number;
}

/**
 * Ejecuta el triaje de un mensaje: atajos deterministas primero, luego el
 * modelo económico con salida JSON estricta. Devuelve la decisión y el
 * detalle de la llamada al LLM para la auditoría de tokens.
 */
export async function triageMessage(
  msg: IncomingMessage,
  prefs: UserPreferences,
): Promise<TriageOutput> {
  const startedAt = Date.now();

  const quick = shortCircuit(msg, prefs);
  if (quick) {
    return { result: quick, completion: null, latencyMs: Date.now() - startedAt };
  }

  const route = routeFor('triage');
  const completion = await runCompletion(route, {
    system: buildTriageSystemPrompt(prefs),
    user: buildTriageUserPrompt(msg),
    maxTokens: 300,
    json: true,
  });

  const parsed = triageSchema.parse(extractJson(completion.text));
  const result: TriageResult = {
    ...parsed,
    suggestedAction: defaultActionFor(parsed.category, prefs),
  };

  return { result, completion, latencyMs: Date.now() - startedAt };
}
