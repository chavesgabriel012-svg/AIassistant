/**
 * Extrae el primer objeto JSON del texto de un modelo. Robusto ante modelos
 * que envuelven la respuesta en ```json ... ``` pese a las instrucciones.
 */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error(`El modelo no devolvió JSON válido: ${trimmed.slice(0, 200)}`);
  }
}
