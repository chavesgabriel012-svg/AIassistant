import { cn } from '@/lib/utils';
import { CATEGORY_META, CHANNEL_META } from '@/lib/ui-config';
import type { MessageChannel, TriageCategory } from '@/lib/types';
import type { UiStat } from '@/lib/data/types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/** Etiqueta de categoría de triaje. */
export function CategoryBadge({ category }: { category: TriageCategory }) {
  const meta = CATEGORY_META[category];
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium', meta.className)}>
      {meta.label}
    </span>
  );
}

/** Ícono redondo del canal. */
export function ChannelIcon({ channel, className }: { channel: MessageChannel; className?: string }) {
  const meta = CHANNEL_META[channel];
  const Icon = meta.icon;
  return (
    <span className={cn('grid h-8 w-8 place-items-center rounded-full bg-surface-2', className)} title={meta.label}>
      <Icon className={cn('h-4 w-4', meta.className)} />
    </span>
  );
}

export function Avatar({ initials, className }: { initials: string; className?: string }) {
  return (
    <span className={cn('grid h-9 w-9 place-items-center rounded-full bg-accent/20 text-sm font-semibold text-accent', className)}>
      {initials}
    </span>
  );
}

/** Tarjeta de métrica. */
export function StatCard({ stat }: { stat: UiStat }) {
  const Trend = stat.trend === 'up' ? TrendingUp : stat.trend === 'down' ? TrendingDown : Minus;
  const trendColor = stat.trend === 'up' ? 'text-success' : stat.trend === 'down' ? 'text-danger' : 'text-muted';
  return (
    <div className="card p-4">
      <p className="text-xs text-muted">{stat.label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{stat.value}</p>
      {stat.deltaLabel && (
        <p className={cn('mt-1 flex items-center gap-1 text-xs', trendColor)}>
          <Trend className="h-3.5 w-3.5" />
          {stat.deltaLabel}
        </p>
      )}
    </div>
  );
}

/** Barra de progreso simple. */
export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-2', className)}>
      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function LeadScore({ score }: { score: number }) {
  const color = score >= 75 ? 'text-success' : score >= 50 ? 'text-warning' : 'text-muted';
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-semibold', color)} title="Puntaje de prospecto">
      ● {score}
    </span>
  );
}
