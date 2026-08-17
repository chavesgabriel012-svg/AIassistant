'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

/**
 * Botón "Instalar app". Aparece solo si el navegador ofrece la instalación
 * (evento beforeinstallprompt) y la app aún no está instalada.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferred) return null;

  return (
    <button
      onClick={async () => {
        await deferred.prompt();
        await deferred.userChoice;
        setDeferred(null);
      }}
      className="btn-ghost hidden sm:inline-flex"
    >
      <Download className="h-4 w-4" />
      Instalar app
    </button>
  );
}
