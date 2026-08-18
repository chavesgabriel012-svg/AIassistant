# Plan de acción del MVP — modelo bootstrap ($300 → Founders → Producción)

> Estrategia: construir el producto **100% funcional** (3 canales + móvil) con un
> presupuesto inicial de **~$300** —que se va casi todo en APIs, que son
> baratas—, lanzar un **Plan Founders** (≈30 personas pagando) para **validar y
> financiar**, y con ese dinero pagar lo caro (verificación de Google, apps
> nativas de tienda) o salir a buscar inversión.

Cifras en USD, **estimadas** (cambian con el tiempo). Sirven para presupuestar.

---

## 1. ¿Alcanzan $300 para los 3 canales + app móvil? Sí, con matices

La clave: **lo caro de este producto es tiempo y trámites, no plata.** Casi todos
los servicios tienen plan gratuito o cobran por uso (y el uso en beta es bajo).

| Componente | ¿Cuesta dinero? | Detalle |
|---|---|---|
| Gmail (API + Pub/Sub) | **$0** | Gratis dentro del free tier. Ya está codificado. |
| Outlook (Microsoft Graph) | **$0** | Registro de app en Azure AD gratis. |
| WhatsApp (Cloud API) | **≈$0 en beta** | Por uso; volumen bajo cae casi gratis. Requiere *trámite* de verificación de negocio (no dinero) + un número dedicado. |
| APIs de IA (Anthropic/OpenAI) | **Por uso, barato** | El grueso del presupuesto. Ver §4. |
| Supabase / Vercel | **$0** | Planes free alcanzan para 30 usuarios. |
| **Móvil (PWA)** | **$0** | Ya se instala en Android/iOS desde el navegador. |
| Apps nativas de tienda | **$99/año Apple + $25 Play** | ⚠️ **NO sale de los $300** — se financia con el dinero de Founders. |
| Verificación Google + CASA | **$1.000–4.500/año** | ⚠️ **NO se necesita para 30 founders** (ver §5). Se financia después. |

**Conclusión:** con $300 se llega a un producto **100% funcional con los 3 canales
y móvil vía PWA**. Las apps nativas de tienda y la verificación de Google llegan
*después*, pagadas por los Founders. El costo real de esta fase es **tu tiempo de
desarrollo**.

---

## 2. Presupuesto de los $300

| Rubro | Monto | Nota |
|---|---|---|
| Dominio `.com` (año 1) | ~$12 | A veces hay promo a $1–10. |
| Crédito de APIs de IA (runway) | ~$150 | Cubre varios meses de beta (Haiku es muy barato). |
| Número/WhatsApp + misceláneos | ~$30 | Número dedicado, pruebas. |
| Correo de dominio (opcional) | ~$0–36 | Reenvío gratis, o Google Workspace ~$6/mes. |
| **Buffer / imprevistos** | ~$70–100 | Colchón. |
| **Total** | **~$300** | Casi todo es *runway* de APIs. |

> Supabase, Vercel, Gmail, Outlook y la PWA móvil van en **$0** durante la beta.

---

## 3. Fases

### Fase A — Construir el producto 100% funcional (con los $300)
El objetivo: que **funcione de verdad** para poder cobrar el Plan Founders.

**A1. Fundaciones (barato, en paralelo)**
- [ ] Nombre definitivo + **dominio** + logo/favicon (DIY, $0) + correo de soporte.
- [ ] **Legales**: Política de Privacidad + Términos + cumplimiento *Limited Use*
      de Google (obligatorio para Gmail, incluso en beta). Plantillas: ~$0.

**A2. Autenticación + datos reales (mock → Supabase)**
- [ ] Aplicar migraciones en Supabase; **Supabase Auth** (correo + "Con Google").
- [ ] Implementar `src/lib/data/supabase.ts` → toda la UI pasa a datos reales
      sin tocar componentes.
- [ ] Cablear los 4 TODO: CommandBar, Aprobaciones, Reglas, botón Conectar.

**A3. Los 3 canales en vivo**
- [ ] **Gmail** (ya codificado): OAuth, cron de renovación del `watch`,
      verificación del push, envío real. → *Prioridad 1.*
- [ ] **WhatsApp** (Cloud API): OAuth/registro, adaptador real, envío. Alto valor
      en CR/LatAm. → *Prioridad 2.* Requiere verificación de negocio de Meta.
- [ ] **Outlook** (Graph): registro Azure AD, adaptador, envío. → *Prioridad 3.*

**A4. Motor de IA real**
- [ ] Triaje (Haiku) → redacción → cola de aprobaciones → **envío real** al aprobar.
- [ ] Reglas del usuario aplicándose (VIP, bloqueados, tono).
- [ ] Agendado: crear cita en la app + (si da el tiempo) Google Calendar.
- [ ] **Límites por presupuesto** activados (protege tus unit economics).

**A5. Pulido mínimo para cobrar**
- [ ] Onboarding "conectá tu primer canal"; estados vacíos/carga/error.
- [ ] Editar el borrador antes de aprobar; notificaciones cuando algo sube al humano.
- [ ] Borrar cuenta / cerrar sesión; branding final aplicado.
- [ ] **Cobro**: Stripe **Payment Link** (sin costo fijo; ver §6).

### Fase B — Plan Founders (beta paga, validación + fondeo)
- [ ] Publicar la app de Google en **"Producción" (sin verificar)** → hasta 100
      usuarios, tokens de larga duración, **$0**. (Ver §5, es un punto crítico.)
- [ ] Conseguir **~30 Founders** (ejecutivos de San José/Santa Ana, corredores de
      Turrialba) pagando, p.ej., **$50/año** (precio de fundador).
- [ ] Onboarding 1-a-1, recoger feedback, testimonios y casos reales.
- [ ] Revisión de seguridad antes de operar correos de terceros.

### Fase C — Producción / inversión (con el dinero de Founders)
Financiado por los ~$1.500 de la beta:
- [ ] **Verificación de Google + CASA** (para pasar de 100 usuarios sin el aviso
      de "app no verificada"). Mayor costo del proyecto.
- [ ] **Apps móviles nativas** con Capacitor → App Store / Play (Apple $99/año).
- [ ] **Firma de código** del escritorio + auto-update con `electron-updater`.
- [ ] Planes de pago recurrentes (Stripe Billing) y precios definitivos.
- [ ] Con métricas de la beta: **subir precio** y/o **buscar inversión**.

---

## 4. Economía del Plan Founders

**Ingreso:** 30 × $50/año = **$1.500/año** (o más si el precio sube).

**Costos anuales estimados con 30 usuarios activos:**

| Rubro | Costo/año |
|---|---|
| APIs de IA (triaje Haiku + redacción) | ~$150–500 |
| Supabase / Vercel (free → Pro si hace falta) | ~$0–540 |
| Dominio + WhatsApp (bajo volumen) | ~$30–120 |
| **Total** | **~$180–1.160** |

**Margen:** aun en el peor caso, la beta **cubre sus costos y deja excedente**
para financiar la Fase C. Por usuario: $50/año ≈ $4,17/mes, contra un costo de IA
de ~$0,50–2/usuario/mes → **margen bruto sano**.

**Poder de precio:** un asistente humano cuesta cientos de dólares al mes. A
$50/año esto es casi regalado; es un **precio de fundador** a cambio de feedback y
testimonios. Con la validación, subir a **$100–200/año** sigue siendo barato y
multiplica el margen. Ese es el argumento para inversión: producto que ahorra
horas, con unit economics positivos desde el día uno.

---

## 5. ⚠️ El detalle crítico de Google (leer bien)

Para un asistente de correo hay que entender los estados de la app de Google:

- **"Testing":** hasta 100 usuarios, **pero los tokens caducan cada 7 días** →
  el usuario tendría que reconectar Gmail cada semana. Inviable para producción.
- **"Producción" (sin verificar):** tokens de **larga duración**, hasta ~**100
  usuarios**. Muestran una pantalla de "Google no verificó esta app" que el
  usuario acepta (*Configuración avanzada → Continuar*). **Costo: $0.**
- **"Producción" + verificada (CASA):** sin aviso y **sin límite de usuarios**.
  Requiere auditoría de seguridad anual (~$1.000–4.500/año).

**Para los 30 Founders: publicamos en "Producción sin verificar".** Es gratis,
los tokens duran, y 30 < 100. La verificación + CASA se pagan en la Fase C, ya
con ingresos. **Este es el truco que hace viable el arranque con $300.**

(WhatsApp: requiere verificación de negocio de Meta —trámite, no dinero—. Outlook:
verificación de Microsoft, más liviana.)

---

## 6. Cómo cobrar a los Founders (barato)

- **Stripe Payment Link** o **Lemon Squeezy**: sin costo mensual, solo comisión
  por transacción (~2,9% + $0,30). Cobrar $50 × 30 cuesta ~$52 en comisiones
  totales. **No hace falta construir facturación todavía.**
- Se comparte un link de pago; al pagar, se activa la cuenta manualmente o con un
  webhook simple. Stripe Billing (suscripciones) se deja para la Fase C.

---

## 7. Costos: resumen

**Fase A + B (arranque, con los $300):**
- Una vez: dominio ~$12, legales ~$0–100.
- Por uso: APIs ~$15–50/mes (baja en beta).
- Infra: $0 (planes free).
- **≈ $300 cubre varios meses**, y a partir del mes ~1–2 la beta se autofinancia.

**Fase C (escalar, con dinero de Founders / inversión):**
- Verificación Google + CASA: ~$1.000–4.500/año.
- Apple $99/año + Play $25 (una vez) + firma Windows ~$100–400/año.
- Vercel Pro $20/mes + Supabase Pro $25/mes al crecer.

---

## 8. Cronograma estimado (1 desarrollador enfocado)

| Fase | Duración |
|---|---|
| A1 Fundaciones (paralelo) | 2–4 días |
| A2 Auth + datos reales | 1–2 semanas |
| A3 Tres canales en vivo | 2–4 semanas (Gmail listo antes; WhatsApp/Outlook suman) |
| A4 Motor IA real | 1 semana (código ya existe, afinar) |
| A5 Pulido + cobro | 1–2 semanas |
| **Hasta Founders paga** | **~5–9 semanas** |
| B Beta Founders | continuo |
| C Producción | según ingresos + tiempos de verificación (semanas) |

---

## 9. Recomendación de arranque

1. **Fase A2 (Auth + Supabase)** — le da vida a toda la UI ya construida. $0.
2. **Gmail en vivo** (A3-P1) — el producto ya ahorra tiempo real. $0.
3. En paralelo, vos: **nombre + dominio + conseguir número de WhatsApp**.
4. Sumar **WhatsApp** y **Outlook**, pulir, y montar el **link de pago**.
5. Publicar en "Producción sin verificar" y salir a buscar los **30 Founders**.
6. Con ese dinero: verificación Google, apps nativas y/o inversión.

El presupuesto no es el cuello de botella; **el tiempo de desarrollo lo es**. Los
$300 alcanzan de sobra para llegar a cobrar.
