# 🛡️ Escudo Digital — Asistente Personal de IA (MVP)

Filtro omnicanal que se interpone entre un profesional saturado y el mundo
exterior (correos, mensajes). Lee, evalúa contexto y **decide**: archiva,
responde lo rutinario, o deriva lo importante — manteniendo la bandeja limpia.

Mercado inicial: ejecutivos de alto volumen (San José, Santa Ana) y corredores
de bienes raíces (Turrialba), que necesitan separar prospectos reales del ruido.

## Stack

Next.js 14 (App Router) · Vercel Edge Functions · Supabase (PostgreSQL + RLS +
pgvector) · LLM Routing agnóstico (Anthropic / OpenAI).

## Estructura del proyecto

- `supabase/migrations/0001_initial_schema.sql` — tablas (`users`,
  `user_preferences`, `messages`, `token_usage_logs`), RLS, triggers y vista de
  gasto mensual.
- `src/app/api/webhooks/triage/route.ts` — **Triage Engine** (Edge Function).
- `src/lib/ai/` — routing de modelos, prompts, triaje y pricing.
- `src/lib/audit.ts` — persistencia, auditoría de tokens y rate limiting.
- `src/lib/security/verifyWebhook.ts` — verificación HMAC de webhooks.
- `docs/ARCHITECTURE.md` — diseño y árbol de directorios completo.
- `docs/SECURITY.md` — manejo seguro de tokens OAuth y datos sensibles.

## Puesta en marcha

```bash
cp .env.example .env.local     # rellenar claves de Supabase e IA
npm install
supabase db push              # aplica la migración
npm run dev
```

## El motor en una frase

Modelo económico para el triaje de alto volumen; modelo avanzado solo para lo
complejo; cada token consumido se audita en Supabase para proteger los unit
economics. Ver `docs/ARCHITECTURE.md`.
