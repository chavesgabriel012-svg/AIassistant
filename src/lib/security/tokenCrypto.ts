/**
 * Cifrado de tokens OAuth de usuarios (Gmail/Outlook/WhatsApp).
 *
 * AES-256-GCM con Web Crypto (compatible con Edge Runtime y Node 18+).
 * La clave maestra vive SOLO en `TOKEN_ENCRYPTION_KEY` (Env Var de Vercel),
 * nunca en la base de datos ni en git. Ver docs/SECURITY.md.
 *
 * Formato del ciphertext almacenado (base64 de la concatenación):
 *   [ IV (12 bytes) | ciphertext+authTag (var) ]
 * El authTag va incluido por la API de Web Crypto al final del ciphertext.
 */

const IV_BYTES = 12; // 96 bits, recomendado para GCM.

async function importKey(): Promise<CryptoKey> {
  const b64 = process.env.TOKEN_ENCRYPTION_KEY;
  if (!b64) throw new Error('Falta TOKEN_ENCRYPTION_KEY en el entorno.');

  const raw = base64ToBytes(b64);
  if (raw.byteLength !== 32) {
    throw new Error('TOKEN_ENCRYPTION_KEY debe ser 32 bytes (AES-256) en base64.');
  }

  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

/** Cifra un token en claro y devuelve el ciphertext en base64 para guardar. */
export async function encryptToken(plaintext: string): Promise<string> {
  const key = await importKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  );

  // Prepend IV para poder descifrar después.
  const packed = new Uint8Array(iv.byteLength + encrypted.byteLength);
  packed.set(iv, 0);
  packed.set(new Uint8Array(encrypted), iv.byteLength);
  return bytesToBase64(packed);
}

/** Descifra un ciphertext base64 producido por `encryptToken`. */
export async function decryptToken(ciphertextB64: string): Promise<string> {
  const key = await importKey();
  const packed = base64ToBytes(ciphertextB64);

  const iv = packed.slice(0, IV_BYTES);
  const data = packed.slice(IV_BYTES);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data,
  );
  return new TextDecoder().decode(decrypted);
}

// --- Helpers base64 <-> bytes (sin depender de Buffer, Edge-safe) ----------

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
