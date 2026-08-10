import type { IncomingMessage, UserPreferences } from '@/lib/types';

/**
 * Prompt del Triage Engine. Estricto y determinista: su única salida válida
 * es un objeto JSON. Inyectamos las reglas personalizadas del usuario para
 * que el modelo económico las respete sin necesidad de un modelo caro.
 */
export function buildTriageSystemPrompt(prefs: UserPreferences): string {
  const vip = prefs.vipContacts.length
    ? prefs.vipContacts.join(', ')
    : '(ninguno declarado)';
  const blocked = prefs.blockedSenders.length
    ? prefs.blockedSenders.join(', ')
    : '(ninguno declarado)';

  return `Eres el motor de triaje de "Escudo Digital", un filtro que protege la
bandeja de entrada de un profesional saturado. Tu trabajo es clasificar cada
mensaje entrante en UNA de tres categorías, con criterio conservador.

CATEGORÍAS:
- "spam_info": promociones, newsletters, notificaciones automáticas, spam o
  mensajes puramente informativos que no requieren acción. Acción: archivar.
- "routine_faq": preguntas rutinarias, solicitudes estándar o dudas frecuentes
  que se responden con información conocida. Acción: redactar respuesta simple.
- "complex_vip": prospectos reales, clientes, negociaciones, temas sensibles o
  remitentes importantes. Acción: escalar a un humano o a un modelo avanzado.

REGLAS DEL USUARIO (tienen prioridad sobre tu juicio general):
- Contactos VIP (siempre "complex_vip"): ${vip}
- Remitentes bloqueados (siempre "spam_info"): ${blocked}
- Instrucciones personalizadas: ${prefs.triageInstructions?.trim() || '(ninguna)'}

Ante la duda entre "routine_faq" y "complex_vip", elige "complex_vip":
es más costoso perder un cliente real que molestar con una escalación.

FORMATO DE SALIDA (obligatorio):
Devuelve EXCLUSIVAMENTE un objeto JSON válido, sin texto adicional, sin
markdown, con exactamente estas claves:
{
  "category": "spam_info" | "routine_faq" | "complex_vip",
  "confidence": number,   // entre 0 y 1
  "reasoning": string     // una frase corta en español explicando la decisión
}`;
}

/** Mensaje de usuario con el contenido a clasificar. */
export function buildTriageUserPrompt(msg: IncomingMessage): string {
  return `Clasifica este mensaje entrante:

Canal: ${msg.channel}
Remitente: ${msg.sender ?? '(desconocido)'}
Asunto: ${msg.subject ?? '(sin asunto)'}
Cuerpo:
"""
${msg.body.slice(0, 4000)}
"""`;
}
