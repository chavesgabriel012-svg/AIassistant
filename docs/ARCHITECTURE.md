# Arquitectura — Escudo Digital (MVP)

> Filtro omnicanal que se interpone entre el profesional y el mundo exterior:
> lee, evalúa contexto, decide (archivar / responder / agendar / derivar) y
> mantiene la bandeja limpia.

## 1. Stack

| Capa               | Tecnología                                           |
| ------------------ | ---------------------------------------------------- |
| Framework          | Next.js 14 (App Router)                              |
| Hosting            | Vercel (Edge Functions para webhooks)               |
| Datos + Auth       | Supabase (PostgreSQL, RLS, pgvector a futuro)       |
| Motor de IA        | LLM Routing agnóstico (Anthropic / OpenAI)          |

## 2. Flujo del Triage Engine

```
  Proveedor (Gmail / WhatsApp)
        │  webhook
        ▼
  Adaptador de ingesta            src/app/api/webhooks/<canal>/route.ts
  (normaliza a IncomingMessage)   firma HMAC + reenvía
        │
        ▼
  TRIAGE ENGINE  (Edge)           src/app/api/webhooks/triage/route.ts
   1. Verifica firma HMAC
   2. Rate limiting (presupuesto)  src/lib/audit.ts  withinBudget()
   3. Atajos deterministas         src/lib/ai/triage.ts  shortCircuit()
   4. Triaje modelo económico ─────► src/lib/ai/router.ts (routeFor('triage'))
        │  JSON estricto (Zod)
        ▼
   5. Auditoría                    messages + token_usage_logs
        │
        ▼
   Acción: archived | auto_replied | escalated | human_review
```

### Decisión por costo (Unit Economics)

- **Triaje** (alto volumen) → modelo ultra-económico (`claude-haiku-4-5` / `gpt-4o-mini`).
- **Redacción compleja / escalamiento** → modelo avanzado (`claude-sonnet-5`).
- **Atajos deterministas** (blocklist/allowlist) resuelven sin gastar tokens.
- Cambiar de proveedor = editar el mapa `ROUTES` en `src/lib/ai/router.ts`.

## 3. Árbol de directorios

```
.
├── next.config.mjs
├── package.json
├── tsconfig.json
├── .env.example
├── docs/
│   ├── ARCHITECTURE.md
│   └── SECURITY.md
├── supabase/
│   └── migrations/
│       └── 0001_initial_schema.sql      # tablas + RLS + triggers + vista
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx                      # landing
    │   ├── globals.css
    │   └── api/
    │       └── webhooks/
    │           ├── triage/route.ts       # ★ Triage Engine (Edge)
    │           └── gmail/route.ts        # adaptador de ingesta (ejemplo)
    └── lib/
        ├── types.ts                      # tipos del dominio
        ├── audit.ts                      # persistencia + rate limiting
        ├── security/
        │   └── verifyWebhook.ts          # HMAC (Web Crypto, Edge-safe)
        ├── supabase/
        │   ├── admin.ts                  # service_role (server/edge)
        │   └── client.ts                 # anon (browser, RLS)
        └── ai/
            ├── router.ts                 # LLM Routing agnóstico
            ├── prompts.ts                # prompts de triaje
            ├── triage.ts                 # núcleo del triaje + parsing
            └── pricing.ts                # estimación de costo por token
```

### Convenciones de escalabilidad

- **Un adaptador por canal** bajo `api/webhooks/<canal>/`; todos normalizan al
  mismo `IncomingMessage` y delegan en el motor. Añadir WhatsApp no toca el core.
- **Lógica de IA aislada** en `src/lib/ai/`: prompts, routing y pricing separados
  para iterar unit economics sin tocar la capa HTTP.
- **Datos siempre por `user_id`**: RLS trivial y multitenant seguro.
- **Edge para webhooks** (baja latencia, sin cold starts); Node para tareas
  pesadas o SDKs no compatibles con Edge, si hicieran falta.

## 4. Puesta en marcha

```bash
cp .env.example .env.local        # rellenar claves
npm install
supabase db push                  # aplica supabase/migrations
npm run dev
```

Probar el motor localmente (firma HMAC incluida) — ver ejemplo de `curl` con
`openssl dgst -sha256 -hmac "$WEBHOOK_SIGNING_SECRET"` sobre el body JSON.
