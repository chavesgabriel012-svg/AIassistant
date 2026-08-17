import { forwardToTriage } from '@/lib/channels/forwardToTriage';

/**
 * Adaptador de ingesta: Microsoft Graph change notifications -> Triage.
 *
 * Microsoft Graph exige responder el "validationToken" en texto plano al
 * crear/renovar la suscripción. Luego envía notificaciones de cambios en el
 * buzón; aquí las traducimos al `IncomingMessage` canónico y reenviamos.
 */
export const runtime = 'edge';

export async function POST(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // 1) Handshake de validación de la suscripción de Graph.
  const validationToken = url.searchParams.get('validationToken');
  if (validationToken) {
    return new Response(validationToken, {
      status: 200,
      headers: { 'content-type': 'text/plain' },
    });
  }

  // 2) Notificaciones de cambios.
  const body = await req.json().catch(() => null);
  const notifications: Array<{
    resource?: string;
    clientState?: string;
    resourceData?: { id?: string };
  }> = body?.value ?? [];

  // TODO: validar clientState (secreto de la suscripción), mapear la cuenta ->
  //       userId y resolver el correo real vía Graph (GET /messages/{id}) con
  //       el token OAuth cifrado del usuario.
  await Promise.all(
    notifications.map((n) =>
      forwardToTriage(
        {
          userId: '00000000-0000-0000-0000-000000000000',
          channel: 'email',
          externalId: n.resourceData?.id,
          sender: '(resolver vía Graph API)',
          subject: '(resolver vía Graph API)',
          body: '(resolver vía Graph API)',
        },
        req.url,
      ),
    ),
  );

  return new Response(null, { status: 202 });
}
