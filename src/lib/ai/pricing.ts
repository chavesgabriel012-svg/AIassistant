import type { TokenUsage } from '@/lib/types';

/**
 * Tabla de precios por millón de tokens (USD). Centralizada para poder
 * ajustar unit economics sin tocar la lógica del pipeline.
 *
 * Los precios cambian: revisar contra la documentación de cada proveedor.
 * Valores aproximados a modo de referencia inicial del MVP.
 */
const PRICE_PER_MTOK_USD: Record<string, { input: number; output: number }> = {
  // Anthropic
  'claude-haiku-4-5': { input: 1.0, output: 5.0 },
  'claude-sonnet-5': { input: 3.0, output: 15.0 },
  // OpenAI
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4o': { input: 2.5, output: 10.0 },
};

/**
 * Estima el costo de una llamada en microdólares (1e-6 USD) para almacenarlo
 * como entero (bigint) y evitar errores de coma flotante en la facturación.
 */
export function estimateCostMicros(model: string, usage: TokenUsage): number {
  const price = PRICE_PER_MTOK_USD[model];
  if (!price) return 0; // modelo desconocido: registrar sin costo, no romper.

  const inputUsd = (usage.inputTokens / 1_000_000) * price.input;
  const outputUsd = (usage.outputTokens / 1_000_000) * price.output;
  return Math.round((inputUsd + outputUsd) * 1_000_000);
}
