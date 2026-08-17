import type { IncomingMessage } from '@/lib/types';

/**
 * Helper común de los adaptadores de canal: firma un mensaje canónico con
 * HMAC y lo reenvía al Triage Engine. Cada adaptador (Gmail/Outlook/WhatsApp)
 * solo se encarga de traducir su formato a `IncomingMessage`; el resto es esto.
 */
export async function forwardToTriage(
  canonical: IncomingMessage,
  baseUrl: string,
): Promise<Response> {
  const rawBody = JSON.stringify(canonical);
  const signature = await signHmac(rawBody, process.env.WEBHOOK_SIGNING_SECRET!);

  return fetch(new URL('/api/webhooks/triage', baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-signature': signature },
    body: rawBody,
  });
}

/** Firma HMAC-SHA256 con Web Crypto (Edge-safe). */
export async function signHmac(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(message),
  );
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `sha256=${hex}`;
}
