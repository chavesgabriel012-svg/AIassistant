# Plan de acción del MVP — bootstrap **mobile-first** ($300 → Founders → Producción)

> Estrategia: el producto es un **asistente personal**, y esas personas viven en
> el **celular**, no en la compu. Por eso salimos con **app nativa móvil desde el
> día uno** (mayor prioridad que el escritorio, que ya está hecho y queda como
> bonus). Todo con **~$300**, se lanza un **Plan Founders** para validar y
> financiar, y con eso se paga lo caro (verificación de Google) o se busca inversión.

Cifras en USD, **estimadas** (cambian con el tiempo).

---

## 1. Prioridades (reordenadas: móvil primero)

1. **App móvil nativa (iOS + Android)** — la cara principal del producto.
2. **Web** (ya existe) — la usan desde la compu y es la base que la app envuelve.
3. **Escritorio (Electron)** — ✅ ya hecho; no requiere más inversión.

**Clave técnica:** la app móvil se hace con **Capacitor**, que **envuelve la
web que ya construimos**. No se reescribe la UI: el mismo código corre en web,
escritorio y móvil. Por eso "priorizar móvil" **no cambia casi el trabajo de
desarrollo**: construimos bien la web (ya está) y la empaquetamos para las tiendas.

---

## 2. ¿Alcanzan $300 para app nativa + 3 canales? Sí

Lo caro de este producto es **tiempo y trámites, no plata.** Lo único que hay que
pagar para ir nativo es la cuenta de desarrollador de Apple.

| Componente | ¿Cuesta dinero? | Detalle |
|---|---|---|
| **App nativa (Capacitor)** | **$99/año Apple + $25 Play** | Único gasto real para ir nativo. Reúsa la web. |
| Gmail / Outlook (APIs) | **$0** | Free tier. Gmail ya codificado; Outlook gratis en Azure. |
| WhatsApp (Cloud API) | **≈$0 en beta** | Por uso bajo; requiere *trámite* de verificación de Meta + número. |
| APIs de IA | **Por uso, barato** | El resto del presupuesto (Haiku es muy barato). |
| Supabase / Vercel | **$0** | Planes free alcanzan para 30 founders. |
| Verificación Google + CASA | **$0 para 30 founders** | No se necesita hasta pasar de 100 usuarios (ver §5). |

---

## 3. Presupuesto de los $300 (según tu reparto, ajustado a la realidad)

| Rubro | Monto | Nota |
|---|---|---|
| **Cuenta Apple Developer** | $99/año | Habilita iOS nativo + TestFlight para founders. |
| **Google Play Developer** | $25 (una vez) | Habilita Android + pruebas internas. |
| Dominio (TLD barato) | ~$5–12 | Conseguir uno económico. |
| APIs de IA (prueba/error + runway) | ~$40–60 | Ajustar prompts, cubrir uso de la beta. |
| **Buffer / runway founders** | ~$100–130 | Colchón para el uso de IA de los 30 hasta que el ingreso lo cubra. |
| **Total** | **~$300** | |

> Tu bucket de "$150 desarrollo" = las cuentas de tienda ($124). El desarrollo en
> sí es nuestro tiempo, no efectivo. Supabase/Vercel/Gmail/Outlook van en **$0**.

---

## 4. Fases

### Fase A — Producto 100% funcional (móvil nativo + web)

**A1. Fundaciones (barato, en paralelo)**
- [ ] Nombre + **dominio** + logo/ícono/favicon (DIY, $0) + correo de soporte.
- [ ] **Legales** (obligatorios para Gmail y tiendas): Política de Privacidad +
      Términos + *Limited Use* de Google. Plantillas: ~$0.
- [ ] Abrir **Apple Developer** ($99) y **Google Play** ($25).

**A2. Auth + datos reales (mock → Supabase)** — base de todo, $0
- [ ] Migraciones en Supabase; **Auth** (correo + "Con Google").
- [ ] Implementar `src/lib/data/supabase.ts` → toda la UI a datos reales.
- [ ] Cablear los 4 TODO (CommandBar, Aprobaciones, Reglas, Conectar).

**A3. Los 3 canales en vivo**
- [ ] **Gmail** (ya codificado): cron de `watch`, verificación del push, envío real.
- [ ] **WhatsApp** (Cloud API): alto valor en CR/LatAm. Requiere verificación Meta.
- [ ] **Outlook** (Graph): registro Azure AD.

**A4. Motor de IA real**
- [ ] Triaje → redacción → aprobaciones → **envío real**. Reglas, límites, agendado.

**A5. Empaquetado móvil nativo (Capacitor)** — la prioridad del founder
- [ ] Integrar Capacitor; la app carga la web publicada (como el escritorio).
- [ ] **Push notifications nativas** (cuando algo sube al humano) — es el valor
      nativo clave y lo que diferencia de un simple "sitio web envuelto".
- [ ] Splash screen, ícono, permisos, deep links para el retorno de OAuth.
- [ ] Generar **iOS (.ipa)** y **Android (.aab/.apk)**.

**A6. Pulido mínimo para cobrar**
- [ ] Onboarding "conectá tu canal"; estados vacíos/carga/error; editar borrador
      antes de enviar; borrar cuenta; branding final.
- [ ] **Cobro**: Stripe Payment Link (sin costo fijo; ver §7).

### Fase B — Plan Founders (beta paga, native)
- [ ] Publicar app de Google en **"Producción sin verificar"** → 100 usuarios,
      tokens de larga duración, **$0** (ver §6).
- [ ] Distribuir la app nativa a los founders **sin esperar revisión de tienda**:
      **TestFlight** (iOS, hasta 10.000 testers) y **prueba interna de Play**
      (Android). Instalan la app real de una.
- [ ] Conseguir **~30 Founders** pagando (p.ej. $50/año, precio de fundador).
- [ ] Feedback, testimonios, casos reales; revisión de seguridad.

### Fase C — Producción / inversión (con dinero de Founders)
- [ ] **Verificación Google + CASA** (para >100 usuarios sin el aviso).
- [ ] **Publicación pública** en App Store / Play (pasa revisión completa).
- [ ] Firma de código del escritorio + auto-update (`electron-updater`).
- [ ] Stripe Billing (suscripciones), precios definitivos, y/o **inversión**.

---

## 5. Economía del Plan Founders

**Ingreso:** 30 × $50/año = **$1.500/año** (o más si sube el precio).

**Costos/año con 30 usuarios:** APIs IA ~$150–500 · Supabase/Vercel ~$0–540 ·
dominio + WhatsApp ~$30–120 · Apple $99 + Play $25. **Total ~$300–1.280.**

**Resultado:** la beta **cubre sus costos y deja excedente** para la Fase C.
Margen por usuario: $50/año ≈ $4,17/mes vs ~$0,50–2 de costo de IA → **sano**.
Un asistente humano cuesta cientos/mes; a $50/año esto es un **precio de fundador**.
Con validación, subir a **$100–200/año** sigue siendo barato → argumento para
inversión: producto que ahorra horas con unit economics positivos desde el día uno.

---

## 6. ⚠️ Detalle crítico de Google (no cambia con móvil)

- **"Testing":** ≤100 usuarios pero **tokens caducan cada 7 días** → inviable.
- **"Producción sin verificar":** tokens de larga duración, **≤100 usuarios**,
  con aviso de "app no verificada" que se acepta. **Costo $0.** ← **usamos esto
  para los 30 founders.**
- **"Producción + CASA":** sin aviso, sin límite. ~$1.000–4.500/año → Fase C.

El OAuth de Gmail desde la app móvil usa el mismo flujo web (Custom Tab/navegador
→ nuestro callback). No cambia nada por ser nativa.

---

## 7. Cómo cobrar a los Founders (barato)

**Stripe Payment Link** o **Lemon Squeezy**: sin costo mensual, ~2,9% + $0,30 por
pago (cobrar $50 × 30 ≈ $52 en comisiones totales). Suscripciones (Stripe Billing)
para la Fase C.

> Nota tiendas: cobrar el acceso **por fuera** (link web) evita la comisión del
> 15–30% de App Store/Play. Válido para SaaS B2B/beta; revisar políticas al escalar.

---

## 8. Riesgo específico de la app nativa

- **Guía 4.2 de App Store** ("mínima funcionalidad" / "solo un sitio envuelto"):
  se mitiga con **push nativo**, integración real y valor propio de app. Con las
  notificaciones nativas cuando algo se eleva al humano, cumple.
- **TestFlight** evita la revisión completa para la beta → los founders no esperan.
- La revisión pública completa recién en Fase C.

---

## 9. Cronograma estimado (1 desarrollador enfocado)

| Fase | Duración |
|---|---|
| A1 Fundaciones + cuentas | 2–4 días |
| A2 Auth + datos reales | 1–2 semanas |
| A3 Tres canales en vivo | 2–4 semanas |
| A4 Motor IA | 1 semana (código ya existe) |
| A5 Empaquetado móvil (Capacitor + push) | 3–5 días |
| A6 Pulido + cobro | 1–2 semanas |
| **Hasta Founders paga (app nativa)** | **~6–9 semanas** |

---

## 10. Recomendación de arranque

Como la app móvil **envuelve la web**, el camino no cambia: se construye bien la
web y al final se empaqueta. Orden sugerido:
1. **A2 (Auth + Supabase)** — da vida a toda la UI. $0.
2. **Gmail en vivo** (A3) — ahorro de tiempo real. $0.
3. En paralelo: **dominio**, **abrir cuenta Apple/Play**, **número de WhatsApp**.
4. **WhatsApp + Outlook**, pulido, y **Capacitor + push** (A5).
5. **TestFlight/Play interno** + link de pago → salir por los **30 Founders**.
6. Con ese dinero: verificación Google, publicación pública, inversión.

El cuello de botella no es el dinero, es **el tiempo de desarrollo**. Los $300
alcanzan de sobra para llegar a cobrar con app nativa en mano.
