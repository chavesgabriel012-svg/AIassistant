'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Registra el service worker y muestra un aviso cuando hay una nueva versión
 * lista ("como los programas grandes que avisan de una actualización").
 * Al aceptar, el nuevo SW toma control y se recarga la app.
 */
export function ServiceWorker() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    let reg: ServiceWorkerRegistration;
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        reg = registration;
        // Ya hay uno esperando (nueva versión descargada en una visita previa).
        if (registration.waiting) setWaiting(registration.waiting);

        registration.addEventListener('updatefound', () => {
          const nw = registration.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              setWaiting(nw);
            }
          });
        });
      })
      .catch(() => {});

    // Cuando el nuevo SW toma control, recargar una sola vez.
    let refreshed = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshed) return;
      refreshed = true;
      window.location.reload();
    });

    return () => void reg;
  }, []);

  if (!waiting) return null;

  return (
    <div className="fixed inset-x-0 bottom-20 z-50 mx-auto flex w-[min(92%,420px)] items-center gap-3 rounded-2xl border border-border bg-surface-2 p-3 shadow-xl animate-fade-in md:bottom-6">
      <RefreshCw className="h-5 w-5 shrink-0 text-accent" />
      <p className="flex-1 text-sm">Hay una nueva versión disponible.</p>
      <button
        className="btn-primary px-3 py-1.5"
        onClick={() => {
          waiting.postMessage({ type: 'SKIP_WAITING' });
        }}
      >
        Actualizar
      </button>
    </div>
  );
}
