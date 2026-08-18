# Despliegue y actualizaciones (PWA)

## Cómo "se sube" la app

No se sube un archivo instalable: se publica el sitio y **la PWA se instala desde
el navegador**. El flujo recomendado (y el que da actualizaciones en vivo):

```
  git push  ─▶  GitHub  ─▶  Vercel (build automático)  ─▶  URL de producción fija
                                                              │
                     el usuario abre la URL y pulsa "Instalar"
                                                              │
                                          la app queda instalada en PC / celular
```

### Conectar el repo a Vercel (una sola vez, ~2 min)

1. Entra a vercel.com e inicia sesión con GitHub.
2. **Add New → Project → Import** el repo `chavesgabriel012-svg/AIassistant`.
3. Framework: Next.js (autodetectado). No cambies nada.
4. Deploy. Vercel entrega una URL de producción **fija** (ej.
   `escudo-digital.vercel.app`).
5. Al integrar Supabase/APIs, se agregan las variables de entorno en
   **Project → Settings → Environment Variables** (ver `.env.example`).

Desde ese momento: **cada `git push` a la rama de producción → Vercel
reconstruye y actualiza la URL automáticamente.** Todas las instancias
instaladas apuntan a esa misma URL, así que "se actualizan solas".

## Cómo funcionan las actualizaciones en vivo

- La app **requiere internet** (no es offline-first): el service worker
  (`public/sw.js`) no cachea contenido, así que al recargar siempre baja el
  código nuevo de la red. No hay que reinstalar nada.
- Además, cuando cambia el service worker, el componente
  `ServiceWorker.tsx` muestra el aviso **"Hay una nueva versión — Actualizar"**
  (como los programas grandes).

> Nota técnica: para que ese aviso salte en **cada** despliegue, `sw.js` debe
> cambiar entre builds. Hoy tiene una versión fija (`VERSION = 'v1'`). Al
> conectar el build, se inyecta el commit/deploy id en esa constante (o se
> genera el SW en build) para que el aviso sea confiable. Aun sin eso, el
> usuario ya recibe el código nuevo al recargar, porque no hay caché.

## ¿App móvil con Expo?

Para este MVP **no hace falta Expo**. La PWA ya se instala en Android e iOS
desde el navegador y comparte el 100% del código. Caminos según necesidad:

| Opción | Cuándo | Costo |
| --- | --- | --- |
| **PWA** (actual) | MVP, iterar rápido, sin tiendas | Cero extra; ya está |
| **Capacitor** (envoltura nativa de la PWA) | Presencia en App Store / Play Store, push nativo en iOS, reusar 100% del código web | Bajo: envuelve esta misma app |
| **React Native / Expo** | App totalmente nativa con UI nativa | Alto: UI aparte, otro código; se reusa solo el backend |

**Recomendación:** PWA ahora. Si más adelante quieres estar en las tiendas o
mejor push en iOS, **Capacitor** reutiliza esta misma app sin reescribir la UI.
Expo/React Native solo si se busca una experiencia 100% nativa (otra base de UI).
La lógica de negocio (API routes, Supabase, triaje) se reutiliza en todos los casos.
