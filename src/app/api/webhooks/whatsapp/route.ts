import { forwardToTriage } from '@/lib/channels/forwardToTriage';

/**
 * Adaptador de ingesta: WhatsApp Cloud API (Meta) -> Triage.
 *
 * GET  -> verificación del webhook (hub.challenge) al configurarlo en Meta.
 * POST -> mensajes entrantes; se traducen al `IncomingMessage` canónico.
 */
export const runtime = 'edge';

/** Verificación inicial del webhook exigida por Meta. */
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge ?? '', { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null);

  // Estructura Meta: entry[].changes[].value.messages[]
  const changes = body?.entry?.flatMap((e: any) => e.changes ?? []) ?? [];

  for (const change of changes) {
    const value = change?.value ?? {};
    const messages: any[] = value.messages ?? [];

    for (const m of messages) {
      const from = m.from as string | undefined; // número del remitente
      const text = m.text?.body as string | undefined;
      if (!from || !text) continue;

      // TODO: mapear el phone_number_id de destino -> userId (dueño de la línea).
      await forwardToTriage(
        {
          userId: '00000000-0000-0000-0000-000000000000',
          channel: 'whatsapp',
          externalId: m.id,
          sender: from,
          subject: undefined,
          body: text,
        },
        req.url,
      );
    }
  }

  // Meta requiere 200 rápido para no reintentar.
  return new Response(null, { status: 200 });
}
