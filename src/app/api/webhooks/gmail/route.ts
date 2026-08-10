import { z } from 'zod';

/**
 * Adaptador de ingesta: Gmail Push (Pub/Sub) -> mensaje canónico -> Triage.
 *
 * Este endpoint es el "traductor" de UN canal. La lógica de negocio vive en
 * /api/webhooks/triage; aquí solo normalizamos el formato específico de Gmail
 * al `IncomingMessage` canónico y reenviamos firmado. Cada canal nuevo
 * (WhatsApp, SMS) es un adaptador análogo, sin tocar el motor.
 *
 * Nota: la resolución del historyId de Gmail a un mensaje concreto (via
 * users.messages.get) y el mapeo emailAddress -> userId se omiten aquí por
 * brevedad; van marcados como TODO.
 */
export const runtime = 'edge';

const gmailPushSchema = z.object({
  message: z.object({
    // Gmail envía el payload real en base64 dentro de `data`.
    data: z.string(),
  }),
});

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null);
  const parsed = gmailPushSchema.safeParse(body);
  if (!parsed.success) {
    return new Response('Bad Request', { status: 400 });
  }

  // Gmail Pub/Sub: { emailAddress, historyId }
  const decoded = JSON.parse(atob(parsed.data.message.data)) as {
    emailAddress: string;
    historyId: string;
  };

  // TODO: mapear emailAddress -> userId y resolver el mensaje real vía Gmail API
  //       usando el token OAuth cifrado del usuario (ver docs/SECURITY.md).
  //       Aquí construimos un IncomingMessage canónico de ejemplo.
  const canonical = {
    userId: '00000000-0000-0000-0000-000000000000',
    channel: 'email' as const,
    externalId: decoded.historyId,
    sender: decoded.emailAddress,
    subject: '(resolver vía Gmail API)',
    body: '(resolver vía Gmail API)',
  };

  const rawBody = JSON.stringify(canonical);
  const signature = await signHmac(rawBody, process.env.WEBHOOK_SIGNING_SECRET!);

  const res = await fetch(new URL('/api/webhooks/triage', req.url), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-signature': signature },
    body: rawBody,
  });

  // Gmail espera 2xx rápido para no reintentar.
  return new Response(null, { status: res.ok ? 204 : 502 });
}

/** Firma HMAC-SHA256 con Web Crypto (compatible con Edge). */
async function signHmac(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `sha256=${hex}`;
}
