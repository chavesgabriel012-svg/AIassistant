import { z } from 'zod';
import type { AssistantPlan } from '@/lib/types';
import { routeFor, runCompletion, type CompletionResult } from './router';
import { extractJson } from './json';

/**
 * Intérprete de comandos del asistente personal.
 *
 * Traduce una petición en lenguaje natural del usuario ("escríbele a X si nos
 * reunimos el sábado", "¿me llegó el reporte esta semana?") a un plan
 * estructurado: intención + parámetros + respuesta hablada.
 *
 * Este módulo SOLO decide qué hacer (planning). La ejecución real de la acción
 * (buscar en la bandeja, redactar, agendar) la realiza el dispatcher del
 * endpoint, que tiene acceso a las conexiones y APIs del usuario.
 */

const planSchema = z.object({
  intent: z.enum(['compose_message', 'search_messages', 'schedule', 'answer']),
  reply: z.string().min(1),
  params: z.record(z.unknown()).default({}),
  confidence: z.number().min(0).max(1),
});

const SYSTEM = `Eres el cerebro de un asistente personal por voz y texto. El
usuario te da órdenes o preguntas. Clasifica su intención y extrae parámetros.

Intenciones:
- "compose_message": pedir que escribas/envíes un mensaje a alguien.
  params: { recipient, channel?, goal, proposedText? }
- "search_messages": buscar información en los mensajes/correos del usuario.
  params: { query, sender?, sinceDays? }
- "schedule": crear o mover una cita.
  params: { title, with?, startsAt?, location? }
- "answer": conversación general o pregunta que respondes directamente.
  params: {}

Reglas:
- "reply" es lo que le dirás al usuario en voz alta: natural, breve, en español.
- Para acciones que envían mensajes o agendan, NO afirmes que ya lo hiciste;
  di que lo preparaste y queda pendiente de su confirmación.
- Si falta un dato esencial (ej. a quién escribir), pídelo en "reply".

Devuelve EXCLUSIVAMENTE un JSON válido:
{ "intent": ..., "reply": ..., "params": { ... }, "confidence": number }`;

export interface AssistantOutput {
  plan: AssistantPlan;
  completion: CompletionResult;
}

/**
 * @param command   Texto del comando (ya transcrito si vino por voz).
 * @param history   Turnos previos para dar contexto (opcional).
 */
export async function interpretCommand(
  command: string,
  history: { role: string; content: string }[] = [],
): Promise<AssistantOutput> {
  const route = routeFor('escalation'); // comprensión de comandos: modelo capaz.

  const context = history.length
    ? `Contexto reciente:\n${history
        .map((h) => `${h.role}: ${h.content}`)
        .join('\n')}\n\n`
    : '';

  const completion = await runCompletion(route, {
    system: SYSTEM,
    user: `${context}Comando del usuario: "${command}"`,
    maxTokens: 500,
    json: true,
  });

  const parsed = planSchema.parse(extractJson(completion.text));
  return { plan: parsed as AssistantPlan, completion };
}
