import clsx, { type ClassValue } from 'clsx';

/** Une clases condicionalmente (wrapper de clsx). */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** "hace 5 min", "hace 2 h", "ayer"... a partir de un ISO. */
export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const future = diffMs < 0;
  const abs = Math.abs(diffMs);
  const min = Math.round(abs / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `${future ? 'en ' : 'hace '}${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${future ? 'en ' : 'hace '}${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return future ? 'mañana' : 'ayer';
  return `${future ? 'en ' : 'hace '}${d} días`;
}

/** Fecha/hora corta local, ej. "jue 3:00 p.m." */
export function shortDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-CR', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function currency(usd: number): string {
  return usd.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
