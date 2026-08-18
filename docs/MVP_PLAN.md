# Plan de acción para el MVP — Escudo Digital

> Objetivo: llevar lo que ya existe (arquitectura + frontend con datos mock +
> canal Gmail codificado + app de escritorio) a un **MVP usable por clientes
> reales**, con lo mínimo indispensable. Nada de lujos.

Todas las cifras de costo son **estimadas en USD y cambian con el tiempo**;
sirven para presupuestar, no como precio exacto.

---

## 1. Estado actual (lo que YA está hecho)

- ✅ Arquitectura backend: esquema Supabase (RLS), triage engine, LLM routing,
  auditoría de tokens, cifrado de tokens OAuth.
- ✅ Canal Gmail **codificado** de punta a punta (OAuth, push, refresh, envío).
- ✅ Adaptadores Outlook/WhatsApp como *stubs*.
- ✅ Frontend completo (PWA) con **datos mock** detrás de una capa de datos
  reemplazable: Inicio, Bandeja, Enviados, Prospectos, Agenda, Reglas, Config.
- ✅ App de escritorio nativa (Electron) para Windows/macOS/Linux.

**Lo que falta es, sobre todo: conectar todo con datos reales, pulir y lanzar.**

---

## 2. Alcance del MVP (lean)

Para no dispersarnos, el MVP se enfoca en **UN canal bien hecho** y crece después.

**Dentro del MVP:**
- **Gmail** como canal principal (leer, clasificar, responder, agendar).
- Web (Vercel) + **App de escritorio** + **PWA instalable en móvil**.
- Autenticación real, datos reales, aprobaciones que ejecutan de verdad.
- Beta cerrada (modo "testing" de Google → hasta 100 usuarios, sin verificación).

**Fuera del MVP (fase siguiente, ya planificado abajo):**
- WhatsApp y Outlook en vivo.
- App móvil nativa en tiendas (Capacitor).
- Verificación de Google + CASA (para pasar de 100 usuarios).
- Cobros con Stripe (el MVP arranca gratis / por invitación).

---

## 3. Plan por fases

### Fase 0 — Marca, cuentas y legales (decisiones + trámites)
Lo que hay que **decidir y crear** antes de codear el resto.

- [ ] **Nombre definitivo.** Hoy usamos "Escudo Digital" como provisional.
      Verificar que el nombre esté libre (dominio + redes + marca).
- [ ] **Dominio.** Comprar `.com` (o `.cr`). Ideal para correos y para la URL
      de producción (reemplaza `a-iassistant-phi.vercel.app`).
- [ ] **Logo + identidad básica.** Ya hay un ícono (escudo + check) y paleta.
      Para el MVP basta con: logotipo (wordmark), ícono de app, favicon,
      1 color primario. Se puede hacer DIY o con un freelancer económico.
- [ ] **Correo de soporte** (ej. `hola@tudominio.com`).
- [ ] **Legales mínimos (obligatorios para Gmail y tiendas):**
      Política de Privacidad + Términos + cumplimiento de la **Limited Use
      Policy de Google** (declarar que los datos de Gmail no se usan para
      entrenar modelos ni se venden). Se puede partir de plantillas.
- [ ] **Cuentas de desarrollador:** Google Cloud (ya), y más adelante Apple
      Developer y Google Play (para móvil).

### Fase 1 — Autenticación + datos reales (mock → Supabase)
El corazón de "dejar de ser una demo".

- [ ] **Aplicar las 3 migraciones** en el proyecto Supabase real.
- [ ] **Supabase Auth**: login con correo y con **"Iniciar sesión con Google"**.
      Reemplazar el usuario mock (`@gabriel`) por el usuario real.
- [ ] **Proteger rutas**: middleware que exige sesión; pantallas de login/registro.
- [ ] **Implementar `src/lib/data/supabase.ts`** con las mismas firmas que el
      mock y cambiar el import en `src/lib/data/index.ts`. Con eso, **toda la UI
      pasa a datos reales sin tocar componentes**.
- [ ] Wire de los 4 puntos marcados con TODO:
  - CommandBar → `POST /api/assistant/command`.
  - ApprovalsFeed → `PATCH /api/approvals/:id`.
  - Reglas → leer/guardar `user_preferences`.
  - Botón "Conectar" → `/api/oauth/gmail/start`.

### Fase 2 — Gmail en vivo + motor de IA real
Que el asistente haga su trabajo de verdad, sobre una bandeja real.

- [ ] **Onboarding de canal**: conectar Gmail, guardar tokens cifrados, iniciar
      `watch`.
- [ ] **Cron de renovación del `watch`** (Vercel Cron, cada ~6 días) — sin esto
      el push de Gmail deja de llegar a la semana.
- [ ] **Verificar el JWT** del push de Pub/Sub (seguridad).
- [ ] **Pipeline real**: triaje (Haiku) → redacción → cola de aprobaciones →
      **envío real** al aprobar. (El código ya existe; hay que probarlo con
      correos reales y afinar prompts.)
- [ ] **Agendado**: al aprobar, crear el evento en **Google Calendar** (añade el
      scope `calendar.events`). Alternativa MVP: crear la cita en la app y
      notificar, y dejar el calendario para después.
- [ ] **Reglas del usuario** aplicándose de verdad (VIP, bloqueados, tono).
- [ ] **Límites/rate limiting** por presupuesto mensual (ya codificado, activarlo).

### Fase 3 — Pulido de UI/UX y confiabilidad
Lo que hace que se sienta un producto, no un prototipo.

- [ ] **Onboarding** de primer uso: "Conectá tu Gmail" → tour de 3 pasos.
- [ ] **Estados vacíos, de carga y de error** en cada pantalla (hoy asumen datos).
- [ ] **Notificaciones** cuando algo se eleva al humano: push web/escritorio
      (el service worker ya tiene el handler; falta VAPID + servidor de push).
- [ ] **Detalle de mensaje**: abrir un correo, ver hilo, editar el borrador
      antes de aprobar (hoy solo se aprueba/descarta).
- [ ] **Responsivo y accesibilidad** básicos; revisar en móvil real.
- [ ] **Logo/ícono/favicon finales** aplicados; textos revisados.
- [ ] **Manejo de errores** de la API de Gmail (token revocado, cuota, etc.).
- [ ] **Analítica mínima** (ej. Vercel Analytics) para ver uso.

### Fase 4 — Beta cerrada (lanzamiento del MVP)
- [ ] App de Google en **modo "testing"**: hasta **100 usuarios** sin verificación
      (ven un aviso de "app no verificada", aceptable en beta). **Costo: $0.**
- [ ] Invitar a 5–15 usuarios reales (ejecutivos / corredores) y recoger feedback.
- [ ] **Revisión de seguridad** antes de tocar correos reales de terceros.
- [ ] Iterar sobre el triaje con casos reales.

### Fase 5 — Post-MVP inmediato (escalar)
Cuando la beta valide la propuesta.

- [ ] **Verificación de Google + CASA** (obligatorio para >100 usuarios con el
      scope `gmail.modify`). **Es el mayor costo recurrente** — ver §5.
- [ ] **WhatsApp Cloud API** en vivo (verificación de negocio de Meta + número).
- [ ] **Outlook** en vivo (registro de app en Azure AD).
- [ ] **App móvil nativa** con **Capacitor** (reusa esta misma web) → tiendas.
- [ ] **Firma de código** del escritorio (Windows + macOS) y **auto-update**
      del binario con `electron-updater`.
- [ ] **Cobros con Stripe** (planes free / pro).

---

## 4. UI: lista detallada de lo que falta

- **Auth**: login, registro, recuperar contraseña, "Continuar con Google".
- **Onboarding**: conectar primer canal, permisos, tour.
- **Inicio**: conectar respuestas reales del asistente (no simuladas).
- **Bandeja**: paginación, marcar leído, abrir hilo, buscar de verdad (server).
- **Detalle de mensaje / borrador**: ver y **editar** antes de enviar.
- **Aprobaciones**: ejecutar de verdad + feedback de éxito/error.
- **Prospectos**: que el lead score venga del modelo, no mock.
- **Agenda**: sincronización real con calendario; crear/editar cita.
- **Reglas**: guardar en `user_preferences`; validar entradas.
- **Config**: conectar/desconectar canales reales; uso y facturación reales;
  cerrar sesión; borrar cuenta (requerido por tiendas/legales).
- **Transversal**: estados vacíos/carga/error, toasts, responsivo, accesibilidad,
  modo claro pulido, íconos/branding finales, i18n si se quiere inglés después.

---

## 5. Costos

### 5.1 Para la **beta del MVP** (Gmail, web + escritorio, <100 usuarios)
Deliberadamente casi gratis.

| Concepto | Tipo | Costo estimado |
|---|---|---|
| Dominio `.com` | Anual | ~$12–15/año |
| Vercel | Mensual | $0 (Hobby) — presupuestar $20/mes si se exige plan comercial |
| Supabase | Mensual | $0 (Free) — $25/mes (Pro) al crecer |
| API de IA (Anthropic/OpenAI) | Por uso | ~$5–30/mes en beta (Haiku es barato) |
| Google Cloud / Pub/Sub | Por uso | $0 (dentro de free tier) |
| Logo/branding | Una vez | $0 (DIY) — $50–300 (freelancer) |
| Legales (privacidad/términos) | Una vez | $0–100 (plantillas) — $300–800 (abogado) |
| **Total beta** | | **≈ $15–115 una vez + $5–65/mes** |

### 5.2 Para **producción / escalar** (adicionales)

| Concepto | Tipo | Costo estimado |
|---|---|---|
| **Verificación Google + CASA** (scope restringido Gmail) | Anual | **~$1,000–$4,500/año** ⚠️ el mayor costo |
| Apple Developer Program (iOS + firmar Mac) | Anual | $99/año |
| Google Play Developer | Una vez | $25 |
| Firma de código Windows (o Azure Trusted Signing) | Anual | ~$100–400/año (Azure ~$10/mes) |
| WhatsApp Cloud API | Por uso | ~$0.005–0.08 por conversación (según país/categoría) + número |
| Stripe (si se cobra) | Por transacción | 2.9% + $0.30, sin fijo |
| Vercel Pro + Supabase Pro (al crecer) | Mensual | ~$45/mes combinado |

### 5.3 App móvil (Capacitor — ruta recomendada)
Reusa el 100% de la web. Costo directo: **Apple $99/año + Google $25 una vez**
(ya contados arriba) + tiempo de desarrollo. No añade infraestructura nueva.

> Nota: React Native/Expo sería **más caro en tiempo** (UI nativa aparte). Para
> el MVP, Capacitor es lo básico y suficiente.

---

## 6. Riesgos y "gotchas" (leer antes de presupuestar)

1. **Verificación de Google (CASA) es el mayor obstáculo.** El scope
   `gmail.modify` es "restringido": para >100 usuarios exige una auditoría de
   seguridad anual independiente. **Mitigación MVP:** lanzar en modo *testing*
   (gratis, hasta 100 usuarios). Presupuestar CASA solo cuando la beta valide.
2. **WhatsApp requiere verificación de negocio de Meta** (trámite, no dinero) y
   su costo es por uso. No es trivial; por eso queda fuera del MVP inicial.
3. **Firma de código:** sin firmar, Windows/macOS muestran advertencia al
   instalar el escritorio. Funciona igual, pero para distribuir "en serio" se
   necesita. La PWA/web no tiene este problema.
4. **Legales no son opcionales:** Google exige Política de Privacidad publicada
   y cumplimiento de Limited Use para aprobar el acceso a Gmail, incluso en beta.
5. **Datos sensibles:** tocar correos de terceros obliga a una revisión de
   seguridad y a minimizar datos (ya está en `docs/SECURITY.md`).

---

## 7. Cronograma estimado (1 desarrollador enfocado)

| Fase | Duración aprox. |
|---|---|
| Fase 0 — Marca y cuentas | 2–4 días (en paralelo) |
| Fase 1 — Auth + datos reales | 1–2 semanas |
| Fase 2 — Gmail en vivo + IA | 2–3 semanas |
| Fase 3 — Pulido UI/UX | 1–2 semanas |
| Fase 4 — Beta cerrada | continuo |
| **Hasta beta usable** | **~5–8 semanas** |
| Fase 5 — WhatsApp/Outlook/móvil/verificación | +3–6 semanas + tiempos de verificación de Google/Meta (semanas de espera) |

---

## 8. Recomendación de arranque

Orden sugerido para el mayor valor con el menor gasto:
1. **Fase 1 (Auth + datos reales)** — convierte la demo en app usable.
2. **Fase 2 (Gmail en vivo)** — el producto empieza a ahorrar tiempo de verdad.
3. **Fase 0 en paralelo** (dominio, logo, legales) — barato y necesario para beta.
4. **Fase 3 + Fase 4** — pulir y poner en manos de 5–15 usuarios reales.
5. Recién ahí evaluar Fase 5 (móvil, WhatsApp, verificación Google) con datos.
