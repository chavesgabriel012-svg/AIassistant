import { createBrowserClient } from '@supabase/ssr';

/**
 * Cliente Supabase para el navegador. Usa la anon key: toda lectura queda
 * restringida por las políticas RLS del usuario autenticado.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
