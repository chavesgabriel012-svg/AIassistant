import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Escudo Digital — Asistente Personal de IA',
  description:
    'Filtro omnicanal que lee, evalúa y decide sobre tus mensajes para mantener tu bandeja limpia.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
