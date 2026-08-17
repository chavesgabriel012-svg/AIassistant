import { PageHeader } from '@/components/PageHeader';
import { ChannelIcon } from '@/components/ui';
import { relativeTime, cn } from '@/lib/utils';
import { getOutbox } from '@/lib/data';
import { Zap, UserCheck } from 'lucide-react';

export default async function OutboxPage() {
  const items = await getOutbox();
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Enviados" subtitle="Todo lo que tu asistente respondió o archivó en tu nombre." />
      <div className="card divide-y divide-border overflow-hidden">
        {items.map((o) => (
          <article key={o.id} className="flex items-start gap-3 p-3.5">
            <ChannelIcon channel={o.channel} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium">Para: {o.to}</p>
                <span
                  className={cn(
                    'ml-auto inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px]',
                    o.mode === 'auto' ? 'bg-surface-2 text-muted' : 'bg-success/10 text-success',
                  )}
                >
                  {o.mode === 'auto' ? <Zap className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                  {o.mode === 'auto' ? 'Automático' : 'Aprobado por ti'}
                </span>
              </div>
              {o.subject && <p className="truncate text-sm text-fg/90">{o.subject}</p>}
              <p className="truncate text-xs text-muted">{o.preview}</p>
              <p className="mt-1 text-[11px] text-muted">{relativeTime(o.sentAtISO)}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
