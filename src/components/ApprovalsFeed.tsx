'use client';

import { useState } from 'react';
import { Check, X, CalendarPlus, Reply, ChevronDown } from 'lucide-react';
import { CategoryBadge, ChannelIcon } from '@/components/ui';
import { relativeTime, cn } from '@/lib/utils';
import type { UiApproval } from '@/lib/data/types';

/**
 * Bandeja de decisiones: acciones que el asistente elevó al humano.
 * Aprobar/rechazar es optimista sobre el mock; conectar = PATCH /api/approvals/:id.
 */
export function ApprovalsFeed({ initial }: { initial: UiApproval[] }) {
  const [items, setItems] = useState(initial);
  const [expanded, setExpanded] = useState<string | null>(items[0]?.id ?? null);

  async function decide(id: string, decision: 'approved' | 'rejected') {
    // TODO(integración): await fetch(`/api/approvals/${id}`, { method:'PATCH', body: JSON.stringify({decision}) })
    setItems((list) => list.filter((i) => i.id !== id));
  }

  if (items.length === 0) {
    return (
      <div className="card grid place-items-center gap-2 p-8 text-center text-sm text-muted">
        <Check className="h-6 w-6 text-success" />
        Todo al día. No hay nada esperando tu decisión.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((a) => {
        const open = expanded === a.id;
        const Icon = a.kind === 'schedule_appointment' ? CalendarPlus : Reply;
        return (
          <div key={a.id} className="card overflow-hidden animate-fade-in">
            <button onClick={() => setExpanded(open ? null : a.id)} className="flex w-full items-center gap-3 p-3 text-left">
              <ChannelIcon channel={a.channel} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-accent" />
                  <p className="truncate text-sm font-medium">{a.summary}</p>
                </div>
                <p className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                  <span>{a.from}</span>·<span>{relativeTime(a.createdAtISO)}</span>
                  <CategoryBadge category={a.category} />
                </p>
              </div>
              <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted transition-transform', open && 'rotate-180')} />
            </button>

            {open && (
              <div className="border-t border-border p-3">
                <p className="rounded-xl bg-surface-2 p-3 text-sm leading-relaxed text-fg/90">{a.detail}</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => decide(a.id, 'approved')} className="btn-primary flex-1">
                    <Check className="h-4 w-4" />
                    {a.kind === 'schedule_appointment' ? 'Agendar' : 'Enviar'}
                  </button>
                  <button onClick={() => decide(a.id, 'rejected')} className="btn-ghost flex-1 border border-border">
                    <X className="h-4 w-4" /> Descartar
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
