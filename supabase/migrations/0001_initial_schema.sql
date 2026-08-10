-- ==========================================================================
-- Escudo Digital — Esquema inicial (MVP)
-- Motor: PostgreSQL (Supabase)
--
-- Principios de diseño:
--   1. Multitenant por fila, aislado con Row Level Security (RLS).
--   2. `users` referencia a `auth.users` de Supabase (fuente de verdad de auth).
--   3. Todo dato de negocio cuelga de `user_id` para que RLS sea trivial y segura.
--   4. Índices pensados para las consultas calientes del triaje y la facturación.
-- ==========================================================================

-- Extensiones ---------------------------------------------------------------
create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "vector";         -- pgvector, para memoria semántica futura

-- Tipos enumerados ----------------------------------------------------------
-- Categorías del Triage Engine (ver docs/ARCHITECTURE.md).
do $$ begin
  create type triage_category as enum ('spam_info', 'routine_faq', 'complex_vip');
exception when duplicate_object then null; end $$;

-- Acción tomada por el asistente sobre el mensaje.
do $$ begin
  create type message_action as enum (
    'archived',        -- Categoría 1: archivar en silencio
    'auto_replied',    -- Categoría 2: respuesta redactada con modelo económico
    'escalated',       -- Categoría 3: derivado a modelo avanzado
    'human_review',    -- Categoría 3: notificado al humano
    'pending'          -- aún en cola / error de procesamiento
  );
exception when duplicate_object then null; end $$;

-- Canal de origen del mensaje (omnicanal).
do $$ begin
  create type message_channel as enum ('email', 'whatsapp', 'sms', 'other');
exception when duplicate_object then null; end $$;


-- ==========================================================================
-- Tabla: users
-- Perfil de aplicación. 1:1 con auth.users. No duplicamos credenciales aquí.
-- ==========================================================================
create table if not exists public.users (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text not null,
  full_name     text,
  -- Segmento de mercado del MVP (ejecutivo, corredor de bienes raíces, etc.).
  persona       text,
  -- Zona/ubicación para contexto (San José, Santa Ana, Turrialba...).
  region        text,
  plan          text not null default 'free',   -- free | pro | enterprise
  -- Techo mensual de gasto en IA (centavos de USD) para rate limiting.
  monthly_token_budget_cents integer not null default 500,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.users is 'Perfil de aplicación; 1:1 con auth.users.';


-- ==========================================================================
-- Tabla: user_preferences
-- Reglas de filtrado personalizadas que modulan el comportamiento del triaje.
-- ==========================================================================
create table if not exists public.user_preferences (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users (id) on delete cascade,
  -- Instrucciones en lenguaje natural inyectadas en el prompt de triaje
  -- ("Los correos de mi jefe siempre son VIP", "Archiva newsletters").
  triage_instructions text,
  -- Contactos que siempre escalan a humano (VIP allowlist).
  vip_contacts        text[] not null default '{}',
  -- Remitentes/dominios que se archivan siempre (blocklist).
  blocked_senders     text[] not null default '{}',
  -- Firma para las respuestas automáticas.
  auto_reply_signature text,
  -- Interruptor maestro: si es false, el asistente solo clasifica, no actúa.
  autopilot_enabled   boolean not null default false,
  -- Tono deseado para las redacciones automáticas.
  reply_tone          text not null default 'profesional y cordial',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- Una fila de preferencias por usuario.
  unique (user_id)
);

comment on table public.user_preferences is 'Reglas de filtrado y tono por usuario que alimentan el Triage Engine.';


-- ==========================================================================
-- Tabla: messages
-- Log de cada mensaje procesado y la decisión tomada. Núcleo operativo.
-- ==========================================================================
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users (id) on delete cascade,
  channel         message_channel not null default 'email',
  -- Id del proveedor externo (Gmail messageId, WhatsApp wamid...) para dedupe.
  external_id     text,
  sender          text,
  subject         text,
  -- Cuerpo recortado del mensaje entrante (evitar PII innecesaria a futuro).
  body_preview    text,
  -- Resultado del triaje.
  category        triage_category,
  action          message_action not null default 'pending',
  -- Confianza [0,1] devuelta por el modelo de triaje.
  confidence      numeric(4, 3),
  -- Razonamiento corto del modelo (auditable, explica la decisión).
  reasoning       text,
  -- Borrador generado (si aplica) antes del envío.
  draft_reply     text,
  -- Vector semántico opcional para memoria/deduplicación futura (pgvector).
  embedding       vector(1536),
  created_at      timestamptz not null default now(),
  processed_at    timestamptz,
  -- Evita procesar el mismo mensaje del mismo proveedor dos veces.
  unique (user_id, channel, external_id)
);

comment on table public.messages is 'Log de interacciones: mensaje entrante + decisión del triaje.';

create index if not exists idx_messages_user_created
  on public.messages (user_id, created_at desc);
create index if not exists idx_messages_action
  on public.messages (user_id, action);


-- ==========================================================================
-- Tabla: token_usage_logs
-- Registro granular de consumo de IA para facturación y unit economics.
-- Una fila por llamada a un LLM (triaje, redacción, escalamiento).
-- ==========================================================================
create table if not exists public.token_usage_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users (id) on delete cascade,
  message_id      uuid references public.messages (id) on delete set null,
  -- Etapa del pipeline: 'triage' | 'draft' | 'escalation'.
  stage           text not null,
  provider        text not null,             -- 'anthropic' | 'openai'
  model           text not null,             -- 'claude-haiku-4-5', etc.
  input_tokens    integer not null default 0,
  output_tokens   integer not null default 0,
  -- Costo estimado en microdólares (1e-6 USD) para precisión sin floats.
  estimated_cost_micros bigint not null default 0,
  latency_ms      integer,
  created_at      timestamptz not null default now()
);

comment on table public.token_usage_logs is 'Consumo por llamada a LLM; base de facturación y rate limiting.';

create index if not exists idx_token_usage_user_created
  on public.token_usage_logs (user_id, created_at desc);


-- ==========================================================================
-- Triggers: mantener updated_at al día
-- ==========================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_users_updated on public.users;
create trigger trg_users_updated before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists trg_prefs_updated on public.user_preferences;
create trigger trg_prefs_updated before update on public.user_preferences
  for each row execute function public.set_updated_at();


-- ==========================================================================
-- Automatización: crear perfil + preferencias al registrarse un usuario
-- ==========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ==========================================================================
-- ROW LEVEL SECURITY
-- Regla de oro: cada usuario solo ve/edita sus propias filas (auth.uid()).
-- El backend (Edge Functions) usa la service_role key, que ignora RLS,
-- por eso el pipeline de escritura del webhook funciona sin sesión de usuario.
-- ==========================================================================
alter table public.users             enable row level security;
alter table public.user_preferences  enable row level security;
alter table public.messages          enable row level security;
alter table public.token_usage_logs  enable row level security;

-- users: dueño lee y actualiza su perfil.
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- user_preferences: CRUD completo sobre las propias preferencias.
drop policy if exists "prefs_select_own" on public.user_preferences;
create policy "prefs_select_own" on public.user_preferences
  for select using (auth.uid() = user_id);

drop policy if exists "prefs_insert_own" on public.user_preferences;
create policy "prefs_insert_own" on public.user_preferences
  for insert with check (auth.uid() = user_id);

drop policy if exists "prefs_update_own" on public.user_preferences;
create policy "prefs_update_own" on public.user_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- messages: solo lectura desde el cliente (las escrituras las hace el backend).
drop policy if exists "messages_select_own" on public.messages;
create policy "messages_select_own" on public.messages
  for select using (auth.uid() = user_id);

-- token_usage_logs: solo lectura desde el cliente (dashboard de consumo).
drop policy if exists "usage_select_own" on public.token_usage_logs;
create policy "usage_select_own" on public.token_usage_logs
  for select using (auth.uid() = user_id);


-- ==========================================================================
-- Vista de conveniencia: gasto del mes en curso por usuario.
-- Útil para el rate limiting contra monthly_token_budget_cents.
-- ==========================================================================
create or replace view public.current_month_spend
with (security_invoker = true) as
select
  user_id,
  sum(estimated_cost_micros) / 10000.0 as spend_cents,   -- micros -> centavos
  count(*)                             as llm_calls
from public.token_usage_logs
where created_at >= date_trunc('month', now())
group by user_id;

comment on view public.current_month_spend is 'Gasto de IA del mes en curso por usuario (para rate limiting).';
