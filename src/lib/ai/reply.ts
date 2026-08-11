import type {
  IncomingMessage,
  TriageCategory,
  UserPreferences,
} from '@/lib/types';
import { routeFor, runCompletion, type CompletionResult } from './router';

/**
 * Generación de la respuesta (categorías 2 y 3 del triaje).
 *
 * - routine_faq -> modelo económico ('draft'): respuestas simples y directas.
 * - complex_vip -> modelo avanzado ('escalation'): redacción cuidada, pero el
 *   envío SIEMPRE pasa por aprobación humana (nunca auto-enviar a un VIP).
 *
 * El borrador nunca se envía desde aquí: se encola en action_approvals.
 */

export interface DraftResult {
  draft: string;
  completion: CompletionResult;
}

export async function draftReply(
  msg: IncomingMessage,
  prefs: UserPreferences,
  category: Exclude<TriageCategory, 'spam_info'>,
): Promise<DraftResult> {
  const stage = category === 'complex_vip' ? 'escalation' : 'draft';
  const route = routeFor(stage);

  const system = `Eres el asistente de redacción de "Escudo Digital". Redactas
respuestas en nombre del usuario, en español, con tono ${prefs.replyTone}.

Reglas:
- Sé breve, claro y humano. No inventes datos que no estén en el mensaje.
- Si falta información para responder con certeza, ofrece continuar la
  conversación o proponer una llamada, sin comprometer al usuario a nada.
- No reveles que eres una IA a menos que sea necesario.
- Cierra con la firma exacta que se te da, si existe.

Firma a usar (si no está vacía):
${prefs.autoReplySignature?.trim() || '(sin firma)'}

Devuelve SOLO el cuerpo de la respuesta, sin asunto ni comentarios.`;

  const user = `Mensaje entrante a responder:

De: ${msg.sender ?? '(desconocido)'}
Asunto: ${msg.subject ?? '(sin asunto)'}
Cuerpo:
"""
${msg.body.slice(0, 4000)}
"""

Redacta una respuesta apropiada.`;

  const completion = await runCompletion(route, {
    system,
    user,
    maxTokens: 600,
  });

  return { draft: completion.text.trim(), completion };
}
