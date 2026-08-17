import type { SupabaseClient } from '@supabase/supabase-js';
import type { ChannelProvider } from '@/lib/types';
import { encryptToken } from '@/lib/security/tokenCrypto';

/**
 * Persiste (o actualiza) una conexión de canal y sus tokens OAuth cifrados.
 * Los tokens van a `oauth_tokens` (tabla backend-only); los metadatos a
 * `channel_connections` (visibles para el usuario vía RLS).
 */
export async function upsertConnection(
  db: SupabaseClient,
  params: {
    userId: string;
    provider: ChannelProvider;
    externalAccount: string;
    scopes: string[];
    accessToken: string;
    refreshToken?: string;
    expiresAt: number; // epoch ms
    lastHistoryId?: string | null;
  },
): Promise<string> {
  const { data: conn, error } = await db
    .from('channel_connections')
    .upsert(
      {
        user_id: params.userId,
        provider: params.provider,
        external_account: params.externalAccount,
        status: 'active',
        scopes: params.scopes,
        last_history_id: params.lastHistoryId ?? null,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider,external_account' },
    )
    .select('id')
    .single();

  if (error || !conn) {
    throw new Error(`No se pudo guardar la conexión: ${error?.message}`);
  }

  const tokenRow: Record<string, unknown> = {
    connection_id: conn.id,
    user_id: params.userId,
    access_token_ciphertext: await encryptToken(params.accessToken),
    expires_at: new Date(params.expiresAt).toISOString(),
    updated_at: new Date().toISOString(),
  };
  // Solo sobreescribir el refresh token si vino uno nuevo (Google no lo reemite).
  if (params.refreshToken) {
    tokenRow.refresh_token_ciphertext = await encryptToken(params.refreshToken);
  }

  const { error: tokErr } = await db
    .from('oauth_tokens')
    .upsert(tokenRow, { onConflict: 'connection_id' });

  if (tokErr) throw new Error(`No se pudieron guardar los tokens: ${tokErr.message}`);

  return conn.id;
}

/** Busca una conexión por cuenta externa (ej. resolver un push de Gmail). */
export async function findConnectionByAccount(
  db: SupabaseClient,
  provider: ChannelProvider,
  externalAccount: string,
): Promise<{ id: string; user_id: string; last_history_id: string | null } | null> {
  const { data } = await db
    .from('channel_connections')
    .select('id, user_id, last_history_id')
    .eq('provider', provider)
    .eq('external_account', externalAccount)
    .maybeSingle();
  return data ?? null;
}
