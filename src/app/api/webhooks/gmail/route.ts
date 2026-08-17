import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { forwardToTriage } from '@/lib/channels/forwardToTriage';
import { findConnectionByAccount } from '@/lib/channels/connections';
import {
  getMessage,
  getValidAccessToken,
  listNewMessageIds,
} from '@/lib/channels/gmail/api';

/**
 * Webhook de Gmail (Pub/Sub push). Resuelve el correo real y lo reenvía al
 * Triage Engine ya normalizado.
 *
 * Flujo:
 *   1. Decodifica el push { emailAddress, historyId }.
 *   2. Ubica la conexión del usuario dueño de esa cuenta.
 *   3. Con su token (refresh automático) lista los mensajes nuevos desde el
 *      último historyId sincronizado y los baja.
 *   4. Reenvía cada uno como IncomingMessage (con datos de hilo para responder).
 *   5. Avanza el historyId de la conexión.
 *
 * Responde 2xx rápido siempre: Pub/Sub reintentará si devolvemos error.
 */
export const runtime = 'edge';

const pushSchema = z.object({ message: z.object({ data: z.string() }) });

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null);
  const parsed = pushSchema.safeParse(body);
  if (!parsed.success) return new Response('Bad Request', { status: 400 });

  const notification = JSON.parse(atob(parsed.data.message.data)) as {
    emailAddress: string;
    historyId: string;
  };

  const db = createAdminClient();
  const connection = await findConnectionByAccount(db, 'gmail', notification.emailAddress);
  if (!connection) {
    // No conocemos esa cuenta: ack para que Pub/Sub no reintente en bucle.
    return new Response(null, { status: 204 });
  }

  try {
    const accessToken = await getValidAccessToken(db, connection.id);

    // Sin historyId previo (primera notificación): solo fijamos el cursor.
    if (!connection.last_history_id) {
      await db
        .from('channel_connections')
        .update({ last_history_id: notification.historyId, last_synced_at: new Date().toISOString() })
        .eq('id', connection.id);
      return new Response(null, { status: 204 });
    }

    const ids = await listNewMessageIds(accessToken, connection.last_history_id);

    for (const id of ids) {
      const mail = await getMessage(accessToken, id);
      await forwardToTriage(
        {
          userId: connection.user_id,
          channel: 'email',
          externalId: mail.id,
          sender: mail.from,
          subject: mail.subject,
          body: mail.body,
          connectionId: connection.id,
          providerThreadId: mail.threadId,
          providerMessageId: mail.rfc822MessageId,
        },
        req.url,
      );
    }

    // Avanzar el cursor de sincronización.
    await db
      .from('channel_connections')
      .update({ last_history_id: notification.historyId, last_synced_at: new Date().toISOString() })
      .eq('id', connection.id);

    return new Response(null, { status: 204 });
  } catch (e) {
    console.error('Gmail webhook error:', e);
    // 500 => Pub/Sub reintenta más tarde (p. ej. historyId caducado).
    return new Response('Retry', { status: 500 });
  }
}
