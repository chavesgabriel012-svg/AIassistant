import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase con service_role. **Solo para server / Edge Functions.**
 *
 * Ignora RLS por diseño: el pipeline del webhook no tiene sesión de usuario,
 * así que necesita permisos elevados para escribir en `messages` y
 * `token_usage_logs` a nombre del usuario dueño.
 *
 * NUNCA importar este módulo desde código que corra en el navegador.
 */
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.',
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
