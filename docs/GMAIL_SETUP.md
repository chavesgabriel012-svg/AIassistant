# Gmail de punta a punta — configuración

Este documento describe cómo dejar operativo el canal Gmail: conectar la cuenta,
recibir correos por push y responder desde el asistente.

## Flujo implementado

```
  Usuario pulsa "Conectar Gmail"
        │
        ▼
  GET /api/oauth/gmail/start   ── redirige a Google (consentimiento)
        │
        ▼
  GET /api/oauth/gmail/callback
   · intercambia code -> tokens
   · obtiene el email de la cuenta
   · users.watch() -> Pub/Sub (historyId inicial)
   · guarda channel_connection + oauth_tokens (CIFRADOS)
        │
        ▼   (correo nuevo)
  Gmail -> Pub/Sub -> POST /api/webhooks/gmail
   · ubica la conexión por emailAddress
   · access token (refresh automático)
   · history.list desde last_history_id -> mensajes nuevos
   · messages.get -> IncomingMessage (con threadId + Message-ID)
   · forwardToTriage()
        │
        ▼
  Triage Engine -> clasifica -> redacta -> encola aprobación
        │
        ▼
  PATCH /api/approvals/:id { decision: "approved" }
   · getValidAccessToken() -> messages.send en el hilo original
```

## 1. Google Cloud Console

1. Crear proyecto y habilitar **Gmail API**.
2. **Pantalla de consentimiento OAuth**: tipo Externo; agregar el scope
   `https://www.googleapis.com/auth/gmail.modify` (lectura + envío) y
   `openid`, `email`. En pruebas, añadir los correos como *test users*.
3. **Credenciales → ID de cliente OAuth (aplicación web)**:
   - URI de redirección autorizado:
     `${NEXT_PUBLIC_APP_URL}/api/oauth/gmail/callback`
   - Copiar client id/secret a `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`.

## 2. Pub/Sub (notificaciones push)

1. Crear un **topic**, p. ej. `gmail-push`, y ponerlo en `GOOGLE_PUBSUB_TOPIC`
   (`projects/TU-PROYECTO/topics/gmail-push`).
2. Dar permiso de publicación a la cuenta de servicio de Gmail:
   `gmail-api-push@system.gserviceaccount.com` con rol *Pub/Sub Publisher*.
3. Crear una **suscripción push** apuntando a
   `${NEXT_PUBLIC_APP_URL}/api/webhooks/gmail`.
4. `users.watch()` se llama solo en el callback; **caduca a los 7 días**: hay que
   renovarlo con un cron (ver más abajo).

## 3. Variables de entorno

Ver `.env.example`: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`,
`GOOGLE_PUBSUB_TOPIC`, `TOKEN_ENCRYPTION_KEY`, `WEBHOOK_SIGNING_SECRET`.

## Pendientes conocidos

- **Renovación del watch (7 días):** agregar un cron (Vercel Cron) que llame a
  `users.watch()` por cada conexión activa y actualice el historyId.
- **Verificación del push:** validar el JWT de la suscripción push de Pub/Sub
  (cabecera `Authorization`) además del ack rápido.
- **Historial caducado:** si `history.list` responde 404 (historyId muy viejo),
  re-sincronizar con un `messages.list` acotado por fecha.
- **Google Calendar:** el agendado confirma en la plataforma; escribir el evento
  en el calendario requiere el scope `calendar.events` (fuera de este alcance).
