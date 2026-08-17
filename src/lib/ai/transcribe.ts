import OpenAI from 'openai';

/**
 * Transcripción de voz -> texto para los comandos hablados.
 *
 * Usa Whisper (OpenAI) por defecto. Corre en Node runtime (no Edge) porque
 * procesa binarios de audio. El resultado alimenta a interpretCommand().
 */
export async function transcribeAudio(
  audio: File,
  language = 'es',
): Promise<string> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const result = await client.audio.transcriptions.create({
    file: audio,
    model: 'whisper-1',
    language,
  });

  return result.text.trim();
}
