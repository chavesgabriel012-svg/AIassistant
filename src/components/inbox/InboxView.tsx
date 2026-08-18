'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { CategoryBadge, ChannelIcon, LeadScore } from '@/components/ui';
import { CHANNEL_META, CATEGORY_META } from '@/lib/ui-config';
import { relativeTime, cn } from '@/lib/utils';
import type { UiMessage } from '@/lib/data/types';
import type { MessageChannel, TriageCategory } from '@/lib/types';

type ChannelFilter = 'all' | MessageChannel;
type CatFilter = 'all' | TriageCategory;

export function InboxView({ messages }: { messages: UiMessage[] }) {
  const [channel, setChannel] = useState<ChannelFilter>('all');
  const [cat, setCat] = useState<CatFilter>('all');
  const [q, setQ] = useState('');

  const filtered = messages.filter((m) => {
    if (channel !== 'all' && m.channel !== channel) return false;
    if (cat !== 'all' && m.category !== cat) return false;
    if (q && !`${m.sender} ${m.subject ?? ''} ${m.preview}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex flex-col gap-3">
        <div className="card flex items-center gap-2 px-3">
          <Search className="h-4 w-4 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar en todos los canales…"
            className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-muted"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterChip active={channel === 'all'} onClick={() => setChannel('all')}>Todos</FilterChip>
          {(Object.keys(CHANNEL_META) as MessageChannel[]).filter((c) => c !== 'other' && c !== 'sms').map((c) => (
            <FilterChip key={c} active={channel === c} onClick={() => setChannel(c)}>{CHANNEL_META[c].label}</FilterChip>
          ))}
          <span className="mx-1 w-px bg-border" />
          <FilterChip active={cat === 'all'} onClick={() => setCat('all')}>Toda categoría</FilterChip>
          {(Object.keys(CATEGORY_META) as TriageCategory[]).map((c) => (
            <FilterChip key={c} active={cat === c} onClick={() => setCat(c)}>{CATEGORY_META[c].label}</FilterChip>
          ))}
        </div>
      </div>

      <div className="card divide-y divide-border overflow-hidden">
        {filtered.length === 0 && <p className="p-8 text-center text-sm text-muted">Sin mensajes con estos filtros.</p>}
        {filtered.map((m) => (
          <article key={m.id} className={cn('flex items-start gap-3 p-3.5 transition-colors hover:bg-surface-2/50', m.unread && 'bg-surface-2/30')}>
            <ChannelIcon channel={m.channel} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className={cn('truncate text-sm', m.unread ? 'font-semibold' : 'font-medium')}>{m.sender}</p>
                {m.leadScore ? <LeadScore score={m.leadScore} /> : null}
                <span className="ml-auto shrink-0 text-xs text-muted">{relativeTime(m.receivedAtISO)}</span>
              </div>
              {m.subject && <p className="truncate text-sm text-fg/90">{m.subject}</p>}
              <p className="truncate text-xs text-muted">{m.preview}</p>
              <div className="mt-1.5"><CategoryBadge category={m.category} /></div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn('rounded-full border px-3 py-1 text-xs font-medium transition-colors', active ? 'border-accent/40 bg-accent/10 text-accent' : 'border-border text-muted hover:text-fg')}>
      {children}
    </button>
  );
}
