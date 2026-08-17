-- ==========================================================================
-- Escudo Digital — Migración 0003
-- Campos para cerrar Gmail de punta a punta:
--   · Sincronización incremental (historyId) por conexión.
--   · Datos de hilo en los mensajes para poder RESPONDER en el mismo hilo.
-- ==========================================================================

-- Estado de sincronización incremental de Gmail (users.history.list).
alter table public.channel_connections
  add column if not exists last_history_id text;

-- Datos necesarios para enviar la respuesta en el hilo correcto.
alter table public.messages
  -- Conexión (cuenta) por la que entró el mensaje: define con qué token responder.
  add column if not exists connection_id uuid
    references public.channel_connections (id) on delete set null,
  -- Id del hilo en el proveedor (Gmail threadId).
  add column if not exists thread_id text,
  -- Header RFC822 Message-ID del correo original (para In-Reply-To / References).
  add column if not exists rfc822_message_id text;

create index if not exists idx_messages_connection
  on public.messages (connection_id);
