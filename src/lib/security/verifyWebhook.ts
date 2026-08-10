/**
 * Verificación de firma HMAC-SHA256 para webhooks entrantes.
 *
 * Corre en Edge Runtime, por eso usamos Web Crypto (globalThis.crypto.subtle)
 * en vez del módulo `crypto` de Node. Comparación en tiempo constante para
 * evitar timing attacks.
 */
export async function verifyHmacSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signed = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(rawBody),
  );

  const expected = toHex(new Uint8Array(signed));
  // Normaliza formatos tipo "sha256=<hex>".
  const provided = signatureHeader.replace(/^sha256=/i, '').trim();
  return timingSafeEqual(expected, provided);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Comparación en tiempo constante entre dos strings hex del mismo largo. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
