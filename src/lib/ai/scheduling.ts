import { z } from 'zod';
import type { AppointmentExtraction, IncomingMessage } from '@/lib/types';
import { routeFor, runCompletion, type CompletionResult } from './router';
import { extractJson } from './json';

/**
 * Extracción de intención de cita a partir de un mensaje entrante.
 *
 * Determina si el mensaje pide agendar algo y, de ser así, normaliza fecha,
 * hora, título y lugar a datos estructurados. La cita resultante NO se agenda
 * automáticamente: se propone al usuario vía la cola de aprobaciones.
 */

const schema = z.object({
  isRequest: z.boolean(),
  title: z.string().optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1).max(400),
});

export interface SchedulingOutput {
  extraction: AppointmentExtraction;
  completion: CompletionResult;
}

/**
 * @param nowIso  Referencia temporal (ISO) para resolver expresiones
 *                relativas ("el viernes", "mañana"). Normalmente new Date().
 * @param timezone  Zona del usuario para interpretar horas (ej. America/Costa_Rica).
 */
export async function extractAppointment(
  msg: IncomingMessage,
  nowIso: string,
  timezone = 'America/Costa_Rica',
): Promise<SchedulingOutput> {
  const route = routeFor('draft'); // extracción: modelo económico basta.

  const system = `Extraes solicitudes de cita de mensajes. La fecha/hora actual
de referencia es ${nowIso} (zona ${timezone}). Resuelve expresiones relativas
("el viernes", "mañana a las 3") a un ISO 8601 CON zona. Si no hay una
solicitud clara de reunirse/agendar, isRequest=false.

Devuelve EXCLUSIVAMENTE un JSON válido, sin markdown, con estas claves:
{
  "isRequest": boolean,
  "title": string,            // breve, ej. "Reunión con Juan Pérez"
  "startsAt": string | null,  // ISO 8601 con zona, o null si no se pudo resolver
  "endsAt": string | null,    // ISO 8601 o null (asume 30-60 min si falta)
  "location": string | null,
  "confidence": number,       // 0 a 1
  "reasoning": string         // una frase en español
}`;

  const user = `Mensaje:

De: ${msg.sender ?? '(desconocido)'}
Asunto: ${msg.subject ?? '(sin asunto)'}
Cuerpo:
"""
${msg.body.slice(0, 4000)}
"""`;

  const completion = await runCompletion(route, {
    system,
    user,
    maxTokens: 300,
    json: true,
  });

  const parsed = schema.parse(extractJson(completion.text));
  const extraction: AppointmentExtraction = {
    isRequest: parsed.isRequest,
    title: parsed.title,
    startsAt: parsed.startsAt ?? null,
    endsAt: parsed.endsAt ?? null,
    location: parsed.location ?? null,
    confidence: parsed.confidence,
    reasoning: parsed.reasoning,
  };

  return { extraction, completion };
}
