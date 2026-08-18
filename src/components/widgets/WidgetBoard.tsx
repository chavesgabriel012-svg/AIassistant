'use client';

import { useEffect, useState } from 'react';
import { Plus, Check } from 'lucide-react';
import { UpcomingWidget, RemindersWidget, UsageWidget, StatsWidget, ProspectsWidget } from './widgets';
import { cn } from '@/lib/utils';
import type { UiAppointment, UiReminder, UiUsage, UiMessage, WidgetKind } from '@/lib/data/types';

interface Props {
  appointments: UiAppointment[];
  reminders: UiReminder[];
  usage: UiUsage;
  messages: UiMessage[];
}

const ALL: { kind: WidgetKind; label: string }[] = [
  { kind: 'calendar', label: 'Próximas citas' },
  { kind: 'reminders', label: 'Recordatorios' },
  { kind: 'usage', label: 'Uso del mes' },
  { kind: 'stats', label: 'Actividad semanal' },
  { kind: 'prospects', label: 'Prospectos' },
];

const DEFAULT: WidgetKind[] = ['calendar', 'usage', 'prospects', 'reminders'];
const STORAGE_KEY = 'escudo.widgets';

export function WidgetBoard({ appointments, reminders, usage, messages }: Props) {
  const [active, setActive] = useState<WidgetKind[]>(DEFAULT);
  const [customizing, setCustomizing] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setActive(JSON.parse(saved));
    } catch {}
  }, []);

  function toggle(kind: WidgetKind) {
    setActive((cur) => {
      const next = cur.includes(kind) ? cur.filter((k) => k !== kind) : [...cur, kind];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  const render = (kind: WidgetKind) => {
    switch (kind) {
      case 'calendar': return <UpcomingWidget key={kind} items={appointments} />;
      case 'reminders': return <RemindersWidget key={kind} items={reminders} />;
      case 'usage': return <UsageWidget key={kind} usage={usage} />;
      case 'stats': return <StatsWidget key={kind} usage={usage} />;
      case 'prospects': return <ProspectsWidget key={kind} messages={messages} />;
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted">Tu tablero</h2>
        <button onClick={() => setCustomizing((v) => !v)} className="btn-ghost px-3 py-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" /> Personalizar
        </button>
      </div>

      {customizing && (
        <div className="card mb-3 flex flex-wrap gap-2 p-3 animate-fade-in">
          {ALL.map(({ kind, label }) => {
            const on = active.includes(kind);
            return (
              <button key={kind} onClick={() => toggle(kind)} className={cn('chip transition-colors', on ? 'border-accent/40 text-fg' : 'opacity-60')}>
                {on && <Check className="h-3 w-3 text-accent" />} {label}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {active.map((k) => render(k))}
      </div>
    </div>
  );
}
