-- ==========================================================================
-- Escudo Digital — Migración 0002
-- Multicanal + agendado de citas + cola de aprobaciones + asistente conversacional.
--
-- Extiende el esquema 0001 para soportar:
--   · Conexiones a Gmail / Outlook / WhatsApp (con tokens OAuth cifrados aparte).
--   · Detección y agendado de citas con aprobación humana.
--   · Cola genérica de aprobaciones (human-in-the-loop).
--   · Conversaciones usuario<->asistente (comandos por voz/texto).
-- ==========================================================================

-- Tipos enumerados ----------------------------------------------------------
do $$ begin
  create type channel_provider as enum ('gmail', 'outlook', 'whatsapp');
exception when duplicate_object then null; end $$;

do $$ begin
  create type connection_status as enum ('active', 'revoked', 'error');
exception when duplicate_object then null; end $$;

do $$ begin
  create type appointment_status as enum
    ('proposed', 'awaiting_user', 'confirmed', 'declined', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type approval_kind as enum ('schedule_appointment', 'send_reply');
exception when duplicate_object then null; end $$;

do $$ begin
  create type approval_status as enum ('pending', 'approved', 'rejected', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type assistant_role as enum ('user', 'assistant', 'tool');
exception when duplicate_object then null; end $$;


-- ==========================================================================
-- channel_connections
-- Metadatos de cada canal conectado por el usuario. NO guarda secretos: los
-- tokens viven en `oauth_tokens` (tabla sin acceso de cliente). Así el usuario
-- puede ver "tengo Gmail conectado" sin exponer jamás el token.
-- ==========================================================================
create table if not exists public.channel_connections (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users (id) on delete cascade,
  provider         channel_provider not null,
  -- Correo o número de teléfono de la cuenta conectada.
  external_account text not null,
  status           connection_status not null default 'active',
  scopes           text[] not null default '{}',
  connected_at     timestamptz not null default now(),
  last_synced_at   timestamptz,
  updated_at       timestamptz not null default now(),
  -- Un usuario no conecta la misma cuenta del mismo proveedor dos veces.
  unique (user_id, provider, external_account)
);

comment on table public.channel_connections is
  'Canales conectados por el usuario (metadatos, sin secretos).';

create index if not exists idx_connections_user
  on public.channel_connections (user_id, provider);


-- ==========================================================================
-- oauth_tokens
-- Tokens OAuth CIFRADOS (AES-256-GCM). Tabla backend-only: RLS activo SIN
-- políticas => ningún cliente puede leerla; solo la service_role del pipeline.
-- Ver docs/SECURITY.md y src/lib/security/tokenCrypto.ts.
-- ==========================================================================
create table if not exists public.oauth_tokens (
  connection_id            uuid primary key
                             references public.channel_connections (id) on delete cascade,
  user_id                  uuid not null references public.users (id) on delete cascade,
  -- Ciphertext en base64 (incluye IV y authTag; ver tokenCrypto.ts).
  access_token_ciphertext  text not null,
  refresh_token_ciphertext text,
  -- Identificador de la clave usada, para permitir rotación de llaves.
  key_id                   text not null default 'v1',
  expires_at               timestamptz,
  updated_at               timestamptz not null default now()
);

comment on table public.oauth_tokens is
  'Tokens OAuth cifrados; backend-only (RLS sin políticas de cliente).';


-- ==========================================================================
-- appointments
-- Citas detectadas/solicitadas a partir de mensajes. Se confirman solo tras
-- aprobación del humano y se replican al calendario del usuario.
-- ==========================================================================
create table if not exists public.appointments (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references public.users (id) on delete cascade,
  message_id                uuid references public.messages (id) on delete set null,
  source_channel            message_channel not null default 'email',
  -- Quién pidió la cita (correo o teléfono).
  requester                 text,
  title                     text,
  description               text,
  starts_at                 timestamptz,
  ends_at                   timestamptz,
  location                  text,
  status                    appointment_status not null default 'proposed',
  -- Id del evento en el calendario externo (Google/Microsoft) tras confirmar.
  external_calendar_event_id text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

comment on table public.appointments is
  'Citas propuestas/confirmadas a partir de mensajes entrantes.';

create index if not exists idx_appointments_user_status
  on public.appointments (user_id, status, starts_at);


-- ==========================================================================
-- action_approvals
-- Cola de decisiones que el asistente eleva al humano. Un solo lugar para
-- "¿agendo esta cita?" y "¿envío esta respuesta?". Es el inbox de aprobaciones.
-- ==========================================================================
create table if not exists public.action_approvals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users (id) on delete cascade,
  kind           approval_kind not null,
  status         approval_status not null default 'pending',
  message_id     uuid references public.messages (id) on delete set null,
  appointment_id uuid references public.appointments (id) on delete set null,
  -- Datos concretos de la acción propuesta (borrador de respuesta, detalles
  -- de la cita, etc.). jsonb para no acoplar el esquema a cada tipo.
  payload        jsonb not null default '{}'::jsonb,
  -- Resumen legible para mostrar en la notificación al usuario.
  summary        text,
  decided_at     timestamptz,
  expires_at     timestamptz,
  created_at     timestamptz not null default now()
);

comment on table public.action_approvals is
  'Cola human-in-the-loop: acciones que esperan aprobación del usuario.';

create index if not exists idx_approvals_user_pending
  on public.action_approvals (user_id, status, created_at desc);


-- ==========================================================================
-- assistant_conversations / assistant_messages
-- Chat entre el usuario y su asistente (comandos por texto o voz).
-- ==========================================================================
create table if not exists public.assistant_conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  title      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assistant_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.assistant_conversations (id) on delete cascade,
  user_id         uuid not null references public.users (id) on delete cascade,
  role            assistant_role not null,
  content         text not null,
  -- 'text' | 'voice' — cómo entró el mensaje del usuario.
  input_modality  text not null default 'text',
  -- Intención resuelta y parámetros, cuando el rol es 'assistant'.
  intent          text,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

comment on table public.assistant_conversations is 'Hilos de conversación usuario<->asistente.';
comment on table public.assistant_messages is 'Turnos de la conversación con el asistente.';

create index if not exists idx_assistant_msgs_conv
  on public.assistant_messages (conversation_id, created_at);


-- ==========================================================================
-- Triggers updated_at
-- ==========================================================================
drop trigger if exists trg_connections_updated on public.channel_connections;
create trigger trg_connections_updated before update on public.channel_connections
  for each row execute function public.set_updated_at();

drop trigger if exists trg_appointments_updated on public.appointments;
create trigger trg_appointments_updated before update on public.appointments
  for each row execute function public.set_updated_at();

drop trigger if exists trg_conversations_updated on public.assistant_conversations;
create trigger trg_conversations_updated before update on public.assistant_conversations
  for each row execute function public.set_updated_at();


-- ==========================================================================
-- ROW LEVEL SECURITY
-- ==========================================================================
alter table public.channel_connections     enable row level security;
alter table public.oauth_tokens             enable row level security;
alter table public.appointments             enable row level security;
alter table public.action_approvals         enable row level security;
alter table public.assistant_conversations  enable row level security;
alter table public.assistant_messages       enable row level security;

-- channel_connections: el usuario ve/gestiona sus conexiones.
drop policy if exists "conn_select_own" on public.channel_connections;
create policy "conn_select_own" on public.channel_connections
  for select using (auth.uid() = user_id);
drop policy if exists "conn_delete_own" on public.channel_connections;
create policy "conn_delete_own" on public.channel_connections
  for delete using (auth.uid() = user_id);

-- oauth_tokens: SIN políticas -> inaccesible desde el cliente (solo backend).

-- appointments: el usuario lee y decide (update de status) sus citas.
drop policy if exists "appt_select_own" on public.appointments;
create policy "appt_select_own" on public.appointments
  for select using (auth.uid() = user_id);
drop policy if exists "appt_update_own" on public.appointments;
create policy "appt_update_own" on public.appointments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- action_approvals: el usuario ve su cola y aprueba/rechaza (update).
drop policy if exists "appr_select_own" on public.action_approvals;
create policy "appr_select_own" on public.action_approvals
  for select using (auth.uid() = user_id);
drop policy if exists "appr_update_own" on public.action_approvals;
create policy "appr_update_own" on public.action_approvals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- assistant_conversations: CRUD del dueño.
drop policy if exists "conv_all_own" on public.assistant_conversations;
create policy "conv_all_own" on public.assistant_conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- assistant_messages: el usuario lee su historial; puede insertar sus turnos.
drop policy if exists "amsg_select_own" on public.assistant_messages;
create policy "amsg_select_own" on public.assistant_messages
  for select using (auth.uid() = user_id);
drop policy if exists "amsg_insert_own" on public.assistant_messages;
create policy "amsg_insert_own" on public.assistant_messages
  for insert with check (auth.uid() = user_id);


-- ==========================================================================
-- Vista: cola de aprobaciones pendientes (para la bandeja de decisiones).
-- ==========================================================================
create or replace view public.pending_approvals
with (security_invoker = true) as
select id, user_id, kind, summary, message_id, appointment_id, payload, created_at
from public.action_approvals
where status = 'pending'
order by created_at desc;

comment on view public.pending_approvals is 'Aprobaciones pendientes por usuario.';
