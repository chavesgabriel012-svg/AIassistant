import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { PipelineStage, TokenUsage } from '@/lib/types';

/**
 * LLM Router — capa agnóstica de proveedor.
 *
 * Un solo punto decide QUÉ modelo atiende cada etapa del pipeline, protegiendo
 * los unit economics: modelo ultra-económico para el triaje de alto volumen,
 * modelo avanzado solo para la redacción compleja / escalamiento.
 *
 * Cambiar de proveedor = cambiar el mapa `ROUTES`, no el código de negocio.
 */

export interface LlmRoute {
  provider: 'anthropic' | 'openai';
  model: string;
}

const ROUTES: Record<PipelineStage, LlmRoute> = {
  // Triaje: alto volumen, barato y rápido. Ideal para Edge.
  triage: {
    provider: 'anthropic',
    model: process.env.TRIAGE_MODEL || 'claude-haiku-4-5',
  },
  // Redacción de respuestas rutinarias: económico pero con buena prosa.
  draft: {
    provider: 'anthropic',
    model: process.env.DRAFT_MODEL || 'claude-haiku-4-5',
  },
  // Escalamiento / redacción compleja: modelo avanzado.
  escalation: {
    provider: 'anthropic',
    model: process.env.ESCALATION_MODEL || 'claude-sonnet-5',
  },
};

export function routeFor(stage: PipelineStage): LlmRoute {
  return ROUTES[stage];
}

export interface CompletionRequest {
  system: string;
  user: string;
  /** Máximo de tokens de salida. El triaje necesita muy pocos. */
  maxTokens?: number;
  /** Fuerza salida JSON cuando el proveedor lo soporta. */
  json?: boolean;
}

export interface CompletionResult {
  text: string;
  usage: TokenUsage;
  model: string;
  provider: 'anthropic' | 'openai';
}

/**
 * Ejecuta una completion contra el proveedor de la ruta indicada.
 * Normaliza la respuesta y el uso de tokens a una forma común.
 */
export async function runCompletion(
  route: LlmRoute,
  req: CompletionRequest,
): Promise<CompletionResult> {
  if (route.provider === 'anthropic') {
    return runAnthropic(route.model, req);
  }
  return runOpenAI(route.model, req);
}

async function runAnthropic(
  model: string,
  req: CompletionRequest,
): Promise<CompletionResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model,
    max_tokens: req.maxTokens ?? 400,
    system: req.system,
    messages: [{ role: 'user', content: req.user }],
  });

  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  return {
    text,
    usage: {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    },
    model,
    provider: 'anthropic',
  };
}

async function runOpenAI(
  model: string,
  req: CompletionRequest,
): Promise<CompletionResult> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const completion = await client.chat.completions.create({
    model,
    max_tokens: req.maxTokens ?? 400,
    response_format: req.json ? { type: 'json_object' } : undefined,
    messages: [
      { role: 'system', content: req.system },
      { role: 'user', content: req.user },
    ],
  });

  return {
    text: completion.choices[0]?.message?.content ?? '',
    usage: {
      inputTokens: completion.usage?.prompt_tokens ?? 0,
      outputTokens: completion.usage?.completion_tokens ?? 0,
    },
    model,
    provider: 'openai',
  };
}
