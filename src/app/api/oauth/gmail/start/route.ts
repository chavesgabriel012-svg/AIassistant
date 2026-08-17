import { cookies } from 'next/headers';
import { createServerSupabase } from '@/lib/supabase/server';
import { buildAuthUrl } from '@/lib/channels/gmail/oauth';

/**
 * Inicia el connect flow de Gmail. Requiere sesión: liga el consentimiento al
 * usuario. Genera un `state` anti-CSRF que guardamos en cookie httpOnly y
 * verificamos en el callback.
 */
export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response('No autenticado.', { status: 401 });

  const state = crypto.randomUUID();
  cookies().set('gmail_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600, // 10 min
    path: '/',
  });

  return Response.redirect(buildAuthUrl(state), 302);
}
