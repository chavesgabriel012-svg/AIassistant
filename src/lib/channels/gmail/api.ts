import type { SupabaseClient } from '@supabase/supabase-js';
import { decryptToken, encryptToken } from '@/lib/security/tokenCrypto';
import { refreshAccessToken } from './oauth';

/**
 * Cliente de la API REST de Gmail (vía fetch, sin googleapis => Edge-safe).
 * Incluye la obtención de un access token válido (refresh automático) leyendo
 * los tokens cifrados de `oauth_tokens`.
 */

const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

/** Correo entrante normalizado que produce el parser de Gmail. */
export interface ParsedGmailMessage {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  body: string;
  rfc822MessageId: string;
}

// --- Access token con refresh transparente ---------------------------------

/**
 * Devuelve un access token válido para la conexión. Si está por expirar,
 * lo renueva con el refresh token y re-cifra el nuevo en la base.
 */
export async function getValidAccessToken(
  db: SupabaseClient,
  connectionId: string,
): Promise<string> {
  const { data: row, error } = await db
    .from('oauth_tokens')
    .select('access_token_ciphertext, refresh_token_ciphertext, expires_at')
    .eq('connection_id', connectionId)
    .maybeSingle();

  if (error || !row) throw new Error('No hay tokens para la conexión.');

  const notExpiring =
    row.expires_at && new Date(row.expires_at).getTime() - Date.now() > 60_000;
  if (notExpiring) {
    return decryptToken(row.access_token_ciphertext);
  }

  // Renovar.
  if (!row.refresh_token_ciphertext) {
    // Sin refresh token no podemos renovar: usar el actual y esperar reconexión.
    return decryptToken(row.access_token_ciphertext);
  }
  const refreshToken = await decryptToken(row.refresh_token_ciphertext);
  const refreshed = await refreshAccessToken(refreshToken);

  await db
    .from('oauth_tokens')
    .update({
      access_token_ciphertext: await encryptToken(refreshed.accessToken),
      expires_at: new Date(refreshed.expiresAt).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('connection_id', connectionId);

  return refreshed.accessToken;
}

// --- Endpoints -------------------------------------------------------------

async function gmailFetch(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${GMAIL_BASE}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
}

/** Dirección de correo de la cuenta conectada. */
export async function getProfileEmail(accessToken: string): Promise<string> {
  const res = await gmailFetch(accessToken, '/profile');
  if (!res.ok) throw new Error(`Gmail profile falló: ${res.status}`);
  const data = (await res.json()) as { emailAddress: string };
  return data.emailAddress;
}

/**
 * Inicia las notificaciones push a Pub/Sub. Requiere un topic configurado con
 * permiso de publicación para gmail-api-push@system.gserviceaccount.com.
 * Devuelve el historyId inicial desde el cual sincronizar.
 */
export async function startWatch(accessToken: string): Promise<string | null> {
  const topic = process.env.GOOGLE_PUBSUB_TOPIC;
  if (!topic) return null; // sin topic configurado, se omite (ver README).

  const res = await gmailFetch(accessToken, '/watch', {
    method: 'POST',
    body: JSON.stringify({ topicName: topic, labelIds: ['INBOX'] }),
  });
  if (!res.ok) throw new Error(`Gmail watch falló: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { historyId: string };
  return data.historyId;
}

/**
 * Lista los ids de mensajes AÑADIDOS desde `startHistoryId`. Es incremental:
 * evita reprocesar toda la bandeja en cada notificación.
 */
export async function listNewMessageIds(
  accessToken: string,
  startHistoryId: string,
): Promise<string[]> {
  const params = new URLSearchParams({
    startHistoryId,
    historyTypes: 'messageAdded',
    labelId: 'INBOX',
  });
  const res = await gmailFetch(accessToken, `/history?${params.toString()}`);
  if (!res.ok) {
    // 404 => historyId demasiado viejo; el llamador debe re-sincronizar.
    throw new Error(`Gmail history falló: ${res.status}`);
  }

  const data = (await res.json()) as {
    history?: Array<{ messagesAdded?: Array<{ message: { id: string } }> }>;
  };

  const ids = new Set<string>();
  for (const h of data.history ?? []) {
    for (const added of h.messagesAdded ?? []) {
      ids.add(added.message.id);
    }
  }
  return [...ids];
}

/** Obtiene y parsea un mensaje a la forma canónica. */
export async function getMessage(
  accessToken: string,
  id: string,
): Promise<ParsedGmailMessage> {
  const res = await gmailFetch(accessToken, `/messages/${id}?format=full`);
  if (!res.ok) throw new Error(`Gmail messages.get falló: ${res.status}`);

  const msg = (await res.json()) as GmailApiMessage;
  const headers = msg.payload?.headers ?? [];
  const header = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';

  return {
    id: msg.id,
    threadId: msg.threadId,
    from: header('From'),
    subject: header('Subject'),
    rfc822MessageId: header('Message-ID'),
    body: extractPlainText(msg.payload) || msg.snippet || '',
  };
}

/** Envía una respuesta en el mismo hilo del mensaje original. */
export async function sendReply(
  accessToken: string,
  params: {
    from: string;
    to: string;
    subject: string;
    body: string;
    threadId: string;
    inReplyTo?: string;
  },
): Promise<void> {
  const subject = params.subject.startsWith('Re:')
    ? params.subject
    : `Re: ${params.subject}`;

  const mime = [
    `From: ${params.from}`,
    `To: ${params.to}`,
    `Subject: ${subject}`,
    ...(params.inReplyTo
      ? [`In-Reply-To: ${params.inReplyTo}`, `References: ${params.inReplyTo}`]
      : []),
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
    '',
    params.body,
  ].join('\r\n');

  const res = await gmailFetch(accessToken, '/messages/send', {
    method: 'POST',
    body: JSON.stringify({
      raw: base64UrlEncode(mime),
      threadId: params.threadId,
    }),
  });
  if (!res.ok) throw new Error(`Gmail send falló: ${res.status} ${await res.text()}`);
}

// --- Parsing de MIME -------------------------------------------------------

interface GmailApiPart {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailApiPart[];
  headers?: Array<{ name: string; value: string }>;
}
interface GmailApiMessage {
  id: string;
  threadId: string;
  snippet?: string;
  payload?: GmailApiPart;
}

/** Recorre el árbol MIME y devuelve el primer text/plain decodificado. */
function extractPlainText(part?: GmailApiPart): string {
  if (!part) return '';
  if (part.mimeType === 'text/plain' && part.body?.data) {
    return base64UrlDecode(part.body.data);
  }
  for (const child of part.parts ?? []) {
    const text = extractPlainText(child);
    if (text) return text;
  }
  return '';
}

// --- base64url (Edge-safe, sin Buffer) -------------------------------------

function base64UrlEncode(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(input: string): string {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
