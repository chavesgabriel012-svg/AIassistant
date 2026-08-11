import { z } from 'zod';
import { forwardToTriage } from '@/lib/channels/forwardToTriage';

/**
 * Adaptador de ingesta: Gmail Push (Pub/Sub) -> mensaje canónico -> Triage.
 *
 * Traduce el formato específico de Gmail al `IncomingMessage` canónico y lo
 * reenvía firmado. Cada canal nuevo es un adaptador análogo, sin tocar el motor.
 *
 * Nota: resolver el historyId de Gmail a un mensaje concreto (users.messages.get)
 * y mapear emailAddress -> userId se omiten aquí por brevedad (ver TODO).
 */
export const runtime = 'edge';

const gmailPushSchema = z.object({
  message: z.object({ data: z.string() }),
});

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null);
  const parsed = gmailPushSchema.safeParse(body);
  if (!parsed.success) return new Response('Bad Request', { status: 400 });

  // Gmail Pub/Sub: { emailAddress, historyId } en base64.
  const decoded = JSON.parse(atob(parsed.data.message.data)) as {
    emailAddress: string;
    historyId: string;
  };

  // TODO: mapear emailAddress -> userId y resolver el mensaje real vía Gmail API
  //       con el token OAuth cifrado del usuario (ver docs/SECURITY.md).
  const res = await forwardToTriage(
    {
      userId: '00000000-0000-0000-0000-000000000000',
      channel: 'email',
      externalId: decoded.historyId,
      sender: decoded.emailAddress,
      subject: '(resolver vía Gmail API)',
      body: '(resolver vía Gmail API)',
    },
    req.url,
  );

  // Gmail espera 2xx rápido para no reintentar.
  return new Response(null, { status: res.ok ? 204 : 502 });
}
