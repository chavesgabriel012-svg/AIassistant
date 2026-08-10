# Seguridad — Manejo de tokens y datos sensibles

El asistente accede a las bandejas de entrada de los usuarios: los tokens OAuth
de correo/mensajería son el activo más crítico. Comprometer uno equivale a
comprometer toda la comunicación de un ejecutivo. Estas son las consideraciones
mínimas para este stack (Next.js + Vercel + Supabase).

## 1. Nunca almacenar tokens OAuth en texto plano

- Cifrar **en reposo** con AES-256-GCM antes de guardar en Postgres. La clave
  (`TOKEN_ENCRYPTION_KEY`) vive solo en las Environment Variables de Vercel,
  nunca en la base de datos ni en el repo. Rotar la clave debe ser posible
  (versionar el `key_id` junto al ciphertext).
- Guardar los tokens cifrados en una tabla dedicada (p. ej. `oauth_accounts`)
  con RLS **denegando toda lectura desde el cliente**: solo el backend con
  `service_role` los descifra en memoria, justo antes de llamar a la API del
  proveedor. El `refresh_token` jamás debe salir del servidor.

## 2. Separación estricta de claves de Supabase

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: pública, protegida por RLS. Es la única que
  puede tocar el navegador.
- `SUPABASE_SERVICE_ROLE_KEY`: ignora RLS. **Solo** en Edge/Server (ver
  `src/lib/supabase/admin.ts`). Si se filtra, expone toda la base multitenant.
  Nunca importar `admin.ts` desde componentes cliente.

## 3. Autenticidad de los webhooks

- Todo webhook entrante se verifica con **HMAC-SHA256** y comparación en tiempo
  constante (`src/lib/security/verifyWebhook.ts`) antes de procesarse. Sin firma
  válida → 401, sin gastar un solo token de IA.
- Añadir protección anti-replay: incluir un timestamp en el payload firmado y
  rechazar mensajes con más de N minutos de antigüedad.

## 4. Aislamiento multitenant (RLS)

- RLS activo en **todas** las tablas de negocio; cada política ancla a
  `auth.uid() = user_id`. Un usuario nunca puede leer datos de otro aunque
  adivine un UUID.
- Las escrituras del pipeline usan `service_role`, pero siempre fijan el
  `user_id` correcto derivado del token/identidad del canal, no del payload sin
  validar.

## 5. Superficie de datos y PII

- Guardar solo lo necesario: `body_preview` recortado, no el correo íntegro.
  Menos PII almacenada = menor impacto ante una brecha.
- Los prompts enviados a los LLM deben minimizar PII. Considerar redacción/
  enmascarado de datos sensibles (números de tarjeta, cédulas) antes del triaje.
- Definir retención: purgar `messages`/`body_preview` tras X días.

## 6. Principios operativos

- **Alcance OAuth mínimo:** pedir solo los scopes indispensables (leer/modificar
  labels), no acceso total a la cuenta.
- **Secrets solo en Vercel Env Vars**, nunca en el bundle cliente ni en git
  (`.env*.local` está en `.gitignore`).
- **Rate limiting** por presupuesto (`monthly_token_budget_cents`) que además
  actúa como cortafuegos económico ante abuso o bucles.
- **Auditoría:** `token_usage_logs` y las decisiones en `messages` dan trazas
  para detectar comportamiento anómalo.
