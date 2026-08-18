import { cookies } from 'next/headers';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { GMAIL_SCOPES, exchangeCode } from '@/lib/channels/gmail/oauth';
import { getProfileEmail, startWatch } from '@/lib/channels/gmail/api';
import { upsertConnection } from '@/lib/channels/connections';

/**
 * Callback OAuth de Gmail. Verifica el state anti-CSRF, intercambia el code por
 * tokens, obtiene la dirección de la cuenta, arranca el watch de Pub/Sub y
 * persiste la conexión con los tokens cifrados. Redirige al dashboard.
 */
export const runtime = 'nodejs';

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const dash = new URL('/dashboard', process.env.NEXT_PUBLIC_APP_URL ?? url.origin);

  // Error o cancelación del usuario en la pantalla de Google.
  if (url.searchParams.get('error')) {
    dash.searchParams.set('gmail', 'error');
    return Response.redirect(dash, 302);
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expectedState = cookies().get('gmail_oauth_state')?.value;
  cookies().delete('gmail_oauth_state');

  if (!code || !state || state !== expectedState) {
    dash.searchParams.set('gmail', 'invalid_state');
    return Response.redirect(dash, 302);
  }

  // Identidad del usuario desde la sesión.
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response('No autenticado.', { status: 401 });

  try {
    const tokens = await exchangeCode(code);
    const email = await getProfileEmail(tokens.accessToken);

    // Arrancar push notifications (si hay topic configurado).
    let historyId: string | null = null;
    try {
      historyId = await startWatch(tokens.accessToken);
    } catch (e) {
      console.error('Gmail watch no se pudo iniciar:', e);
    }

    const db = createAdminClient();
    await upsertConnection(db, {
      userId: user.id,
      provider: 'gmail',
      externalAccount: email,
      scopes: GMAIL_SCOPES,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      lastHistoryId: historyId,
    });

    dash.searchParams.set('gmail', 'connected');
    return Response.redirect(dash, 302);
  } catch (e) {
    console.error('Gmail callback error:', e);
    dash.searchParams.set('gmail', 'error');
    return Response.redirect(dash, 302);
  }
}
