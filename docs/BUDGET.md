# Presupuesto MVP — Escudo Digital

> Nota de alcance: los entregables técnicos pedidos (esquema SQL, arquitectura
> de directorios, Triage Engine en TypeScript y recomendaciones de seguridad)
> **ya existen en este repositorio** desde el PR #1
> (`supabase/migrations/0001_initial_schema.sql`, `docs/ARCHITECTURE.md`,
> `src/app/api/webhooks/triage/route.ts`, `docs/SECURITY.md`). Este documento
> cubre lo que faltaba: el **presupuesto** para llevar ese código a un MVP
> validado con usuarios reales, sin nada "fancy" — solo lo necesario para
> prueba y error.

## 1. Resumen ejecutivo

| Escenario | Duración | Costo total |
|---|---|---|
| **A. Founder solo + IA de apoyo** (sin contratar) | 3 meses (build + piloto) | **≈ $350 – $550** |
| **B. Founder + 1 contratista part-time** | 3 meses (build + piloto) | **≈ $4,500 – $7,500** |

El costo de infraestructura y de IA es marginal frente al costo de mano de
obra — el diseño de "modelo barato para triaje / modelo caro solo para lo
complejo" mantiene el gasto en IA por debajo de **$1/usuario/mes** incluso en
el piloto. El driver real del presupuesto es si se contrata ayuda o se
construye en solitario con asistencia de IA (Claude Code).

Supuestos base: **15 usuarios piloto** (mezcla de ejecutivos San José/Santa
Ana y corredores de Turrialba), **~30 mensajes/día/usuario**, 3 meses de
runway (build + beta cerrada). Ajustar el multiplicador de usuarios escala
linealmente casi todos los números de este documento.

## 2. Infraestructura (costo fijo mensual)

| Servicio | Plan | Costo/mes | Por qué |
|---|---|---|---|
| Vercel | Pro | **$20** | El plan Hobby prohíbe uso comercial y limita Edge Functions; Pro da holgura de invocaciones + $20 de crédito de uso incluido. |
| Supabase | Pro | **$25** | El plan Free pausa el proyecto tras 7 días de inactividad — inaceptable para un piloto con usuarios reales. Incluye 100 GB storage, 2M invocaciones de Edge Functions, $10 de crédito de cómputo. |
| Dominio | .com o .app | **$1.25** (≈$15/año) | Landing + callback OAuth. |
| Resend (envío de correo) | Free | **$0** | 3,000 emails/mes incluidos; a 15 usuarios el volumen de notificaciones/borradores no lo satura. Subir a Pro ($20/mes, 50k emails) solo si se dispara el volumen. |
| Monitoreo de errores (Sentry) | Free | **$0** | Suficiente para el volumen de un piloto. |
| **Subtotal infraestructura** | | **≈ $46/mes** | |

## 3. Unit economics de IA (el corazón del "Escudo Digital")

Precios vigentes de la API de Anthropic (agosto 2026): Haiku 4.5 = $1 / $5
por millón de tokens (input/output); Sonnet 5 = $2 / $10 (tarifa promocional
vigente hasta el 31-ago-2026; el cálculo de abajo usa **$3 / $15**, la
tarifa estándar, para no subestimar el presupuesto una vez expire la promo).

Con 15 usuarios × ~30 mensajes/día ≈ **13,500 mensajes/mes**, y la
distribución de categorías esperada para este perfil de usuario (mucho ruido,
poco VIP):

| Etapa | % de mensajes | Modelo | Tokens aprox. (in/out) | Costo/mensaje | Mensajes/mes | Costo/mes |
|---|---|---|---|---|---|---|
| **1. Triaje** (todos) | 100% | Haiku 4.5 | 350 / 120 | $0.00095 | 13,500 | **≈ $13** |
| **2. Redacción rutinaria** (Cat. 2, FAQ) | 25% | Haiku 4.5 | 800 / 300 | $0.0023 | 3,375 | **≈ $8** |
| **3. Escalamiento complejo/VIP** (Cat. 3) | 10% | Sonnet 5 | 1,200 / 500 | $0.0111 | 1,350 | **≈ $15** |
| **Total estimado** | | | | | | **≈ $36/mes** |

Con margen de seguridad (picos de volumen, prompts más largos, reintentos):
**presupuestar $60–90/mes** en la fase piloto. A esa escala, el costo de IA
por usuario es **$4–6/mes** — muy por debajo de lo que un ejecutivo pagaría
por recuperar tiempo de bandeja de entrada.

Esto es exactamente lo que ya mide `token_usage_logs` + la vista
`current_month_spend` (`supabase/migrations/0001_initial_schema.sql`): con
esas tablas el gasto real se puede auditar semana a semana en vez de
depender de esta estimación.

**Atajos deterministas** (`shortCircuit()` en `src/lib/ai/triage.ts`, listas
de bloqueo/VIP) reducen aún más este número en producción real, porque una
fracción del ruido (spam evidente, remitentes bloqueados) nunca llega a
gastar tokens.

## 4. Canales de mensajería

| Canal | Estado en el repo | Costo MVP |
|---|---|---|
| **Gmail** (correo) | Implementado (`src/app/api/webhooks/gmail/route.ts`) | $0 — Gmail API es gratuita dentro de cuotas generosas. |
| **WhatsApp Business** | *No implementado aún* — el enum `message_channel` ya lo contempla, falta el adaptador | Fuera del presupuesto de fase 1; ver Fase 2 abajo. |

Los corredores de bienes raíces de Turrialba dependen fuertemente de
WhatsApp, así que es una prioridad de producto — pero **no bloquea validar
el motor de triaje con el segmento de ejecutivos vía correo primero**.
Recomendación: Fase 1 del MVP = solo Gmail (ya construido); Fase 2 = agregar
WhatsApp una vez validado el core.

**Costo estimado de Fase 2 (WhatsApp vía Twilio/360dialog):** Meta cobra por
plantilla enviada (no ya por conversación desde jul-2025); las respuestas
dentro de la ventana de servicio de 24h son gratis. Con triaje + respuestas
mayormente dentro de esa ventana, el costo dominante es la cuota del BSP
(Twilio/360dialog ≈ $0 – $5/mes por número + tarifa de mensajes salientes
iniciados por el negocio, que en un flujo de "responder al usuario que ya
escribió" es casi nulo). Presupuestar **$15–30/mes** adicionales para la
Fase 2 con margen.

## 5. Costos únicos (setup)

| Ítem | Costo |
|---|---|
| Registro de dominio (primer año) | ≈ $15 |
| Verificación de Google OAuth (Gmail API, uso limitado/testing) | $0 |
| Generación de secretos (HMAC, AES-256-GCM) | $0 (script local) |
| **Total únicos** | **≈ $15** |

## 6. Mano de obra — dos escenarios

El código base (schema, router, Edge Function, docs de seguridad) ya está
construido, así que el trabajo restante es: pulir el flujo de triaje contra
casos reales, construir el dashboard mínimo de preferencias/auditoría, y
correr el piloto.

**A. Founder solo + Claude Code / asistente de IA (recomendado para validar
el MVP sin gastar en nómina):**
- Costo directo: $0 (tiempo del fundador).
- Herramienta opcional: suscripción Claude Pro o Max ($20–100/mes) para
  desarrollo asistido — ya se está usando en este mismo repo.
- Riesgo: velocidad limitada por disponibilidad del fundador.

**B. Founder + 1 contratista part-time (8 semanas, 15–20 h/semana) para
acelerar el dashboard + integración WhatsApp:**
- Tarifa remota LatAm/CR para desarrollador Next.js/Supabase mid-level:
  ≈ $25–40/hora.
- 8 semanas × 18 h/semana × $30/h ≈ **$4,320**.
- Rango total con contingencia: **$3,600 – $6,000**.

No se incluye salario del fundador ni gastos legales/incorporación —
quedan fuera del alcance de "presupuesto técnico para llegar al MVP".

## 7. Presupuesto total — 3 meses (build + piloto cerrado)

| Partida | Escenario A (solo) | Escenario B (+contratista) |
|---|---|---|
| Infraestructura (3 × $46) | $138 | $138 |
| IA / LLM (3 × $75 promedio) | $225 | $225 |
| Setup único | $15 | $15 |
| Herramientas IA de desarrollo | $0–$300 (opcional) | $0–$300 (opcional) |
| Mano de obra | $0 | $3,600 – $6,000 |
| **Total** | **≈ $380 – $680** | **≈ $3,980 – $6,680** |

Contingencia recomendada: **+20%** sobre el total elegido, para absorber
picos de uso durante el piloto o ajustes de prompt que consuman más tokens
de lo estimado.

## 8. Gatillos para subir de nivel (no gastar antes de necesitarlo)

- **Supabase Pro → Team ($599/mes):** solo si se necesita SSO, más de 1
  organización, o soporte prioritario — no antes de tener clientes de pago
  reales más allá del piloto.
- **Vercel spend por encima del crédito incluido:** monitorear en el
  dashboard; a 15 usuarios no debería activarse.
- **Modelo de triaje más caro que Haiku:** solo si la tasa de error de
  clasificación en producción lo justifica — medirlo con la columna
  `confidence` y `reasoning` de la tabla `messages` antes de cambiar de
  modelo, no por intuición.
- **Agregar WhatsApp:** cuando el segmento de corredores de bienes raíces
  sea el foco de crecimiento, no antes.
- **pgvector / memoria semántica:** la extensión ya está habilitada en la
  migración pero sin uso — no activar hasta que el MVP de triaje básico esté
  validado; agregar memoria antes de tiempo es la complejidad "fancy" que
  este presupuesto evita a propósito.

## 9. Riesgos que afectan el presupuesto

- **Picos de volumen real vs. estimado:** si el piloto usa más de ~30
  mensajes/día/usuario (plausible en semanas de alta actividad inmobiliaria),
  el costo de IA escala linealmente — sigue siendo bajo (~$0.001–0.011 por
  mensaje) pero vale la pena vigilar `current_month_spend` semanalmente.
  El `monthly_token_budget_cents` por usuario (`users` table) ya actúa como
  cortafuegos automático ante un bucle o abuso.
- **Cambio de precios de proveedores de IA:** la tarifa promocional de
  Sonnet 5 vence el 31-ago-2026; este presupuesto ya usa la tarifa estándar
  post-promoción para no subestimar.
- **Retrasos si se depende 100% del fundador (Escenario A):** el riesgo no es
  monetario sino de tiempo-a-mercado; el Escenario B lo compra con dinero.

---

Fuentes de precios (consultadas agosto 2026): Vercel, Supabase, Anthropic
(API pricing), Meta/WhatsApp Business Platform, Resend.
