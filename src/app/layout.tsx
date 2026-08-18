import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorker } from '@/components/pwa/ServiceWorker';

export const metadata: Metadata = {
  title: 'Escudo Digital — Asistente de IA',
  description: 'Filtra, responde y agenda tus mensajes con IA. Tu escudo digital omnicanal.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Escudo' },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#090b12',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Aplica el tema guardado antes de pintar (evita parpadeo). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('escudo.theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}`,
          }}
        />
      </head>
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
