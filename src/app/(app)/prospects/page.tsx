import { PageHeader } from '@/components/PageHeader';
import { ChannelIcon } from '@/components/ui';
import { relativeTime, cn } from '@/lib/utils';
import { getInbox } from '@/lib/data';
import type { UiMessage } from '@/lib/data/types';
import { Flame, Thermometer, Snowflake } from 'lucide-react';

/** Pipeline de prospectos: agrupa mensajes con lead score por "temperatura". */
export default async function ProspectsPage() {
  const messages = await getInbox();
  const leads = messages.filter((m) => m.leadScore != null);

  const cols = [
    { key: 'hot', label: 'Calientes', icon: Flame, color: 'text-success', test: (s: number) => s >= 75 },
    { key: 'warm', label: 'Tibios', icon: Thermometer, color: 'text-warning', test: (s: number) => s >= 50 && s < 75 },
    { key: 'cold', label: 'Fríos', icon: Snowflake, color: 'text-muted', test: (s: number) => s < 50 },
  ] as const;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Prospectos"
        subtitle="El asistente detecta y prioriza clientes reales sobre los curiosos, con un puntaje automático."
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {cols.map((col) => {
          const list = leads.filter((l) => col.test(l.leadScore!));
          const Icon = col.icon;
          return (
            <div key={col.key} className="card p-3">
              <h3 className={cn('mb-3 flex items-center gap-2 text-sm font-semibold', col.color)}>
                <Icon className="h-4 w-4" /> {col.label}
                <span className="ml-auto rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted">{list.length}</span>
              </h3>
              <div className="space-y-2">
                {list.map((m) => <LeadCard key={m.id} m={m} />)}
                {list.length === 0 && <p className="py-6 text-center text-xs text-muted">Vacío</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LeadCard({ m }: { m: UiMessage }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2/40 p-3">
      <div className="flex items-center gap-2">
        <ChannelIcon channel={m.channel} className="h-7 w-7" />
        <p className="truncate text-sm font-medium">{m.sender}</p>
        <span className="ml-auto text-xs font-bold text-accent">{m.leadScore}</span>
      </div>
      <p className="mt-2 line-clamp-2 text-xs text-muted">{m.preview}</p>
      <p className="mt-2 text-[11px] text-muted">{relativeTime(m.receivedAtISO)}</p>
    </div>
  );
}
