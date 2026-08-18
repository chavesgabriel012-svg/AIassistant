'use client';

import { useState } from 'react';
import { CalendarDays, MapPin, CheckCircle2, Circle, Zap, Clock, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui';
import { shortDateTime, currency, cn } from '@/lib/utils';
import type { UiAppointment, UiReminder, UiUsage, UiMessage } from '@/lib/data/types';

function WidgetShell({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <section className="card flex flex-col p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted">
        <Icon className="h-4 w-4 text-accent" /> {title}
      </h3>
      {children}
    </section>
  );
}

export function UpcomingWidget({ items }: { items: UiAppointment[] }) {
  return (
    <WidgetShell title="Próximas citas" icon={CalendarDays}>
      <ul className="space-y-2.5">
        {items.slice(0, 3).map((a) => (
          <li key={a.id} className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-[11px] font-semibold">
              {new Date(a.startISO).toLocaleDateString('es-CR', { day: '2-digit' })}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{a.title}</p>
              <p className="truncate text-xs text-muted">{shortDateTime(a.startISO)} · {a.withWhom}</p>
              {a.location && (
                <p className="flex items-center gap-1 truncate text-xs text-muted"><MapPin className="h-3 w-3" />{a.location}</p>
              )}
            </div>
            <span className={cn('mt-1 h-2 w-2 rounded-full', a.status === 'confirmed' ? 'bg-success' : a.status === 'awaiting_user' ? 'bg-warning' : 'bg-muted')} />
          </li>
        ))}
      </ul>
    </WidgetShell>
  );
}

export function RemindersWidget({ items }: { items: UiReminder[] }) {
  const [list, setList] = useState(items);
  return (
    <WidgetShell title="Recordatorios" icon={CheckCircle2}>
      <ul className="space-y-2">
        {list.map((r) => (
          <li key={r.id}>
            <button
              onClick={() => setList((l) => l.map((x) => (x.id === r.id ? { ...x, done: !x.done } : x)))}
              className="flex w-full items-center gap-2.5 text-left"
            >
              {r.done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" /> : <Circle className="h-4 w-4 shrink-0 text-muted" />}
              <span className={cn('text-sm', r.done && 'text-muted line-through')}>{r.text}</span>
            </button>
          </li>
        ))}
      </ul>
    </WidgetShell>
  );
}

export function UsageWidget({ usage }: { usage: UiUsage }) {
  const pct = Math.round((usage.spentUsd / usage.monthlyBudgetUsd) * 100);
  return (
    <WidgetShell title="Uso del mes" icon={Zap}>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-lg font-semibold">{currency(usage.spentUsd)}</span>
        <span className="text-xs text-muted">de {currency(usage.monthlyBudgetUsd)}</span>
      </div>
      <Progress value={pct} />
      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl bg-surface-2 p-2">
          <p className="flex items-center justify-center gap-1 text-sm font-semibold"><Clock className="h-3.5 w-3.5 text-accent" />{usage.hoursSaved} h</p>
          <p className="text-[11px] text-muted">ahorradas</p>
        </div>
        <div className="rounded-xl bg-surface-2 p-2">
          <p className="text-sm font-semibold text-success">{usage.autoHandledPct}%</p>
          <p className="text-[11px] text-muted">automático</p>
        </div>
      </div>
    </WidgetShell>
  );
}

export function StatsWidget({ usage }: { usage: UiUsage }) {
  const max = Math.max(...usage.daily.map((d) => d.processed));
  return (
    <WidgetShell title="Actividad de la semana" icon={TrendingUp}>
      <div className="flex h-28 items-end justify-between gap-1.5">
        {usage.daily.map((d) => (
          <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full flex-1 flex-col justify-end">
              <div className="w-full rounded-t bg-accent/80" style={{ height: `${(d.processed / max) * 100}%` }} title={`${d.processed} procesados`} />
              <div className="w-full bg-warning" style={{ height: `${(d.escalated / max) * 100}%` }} title={`${d.escalated} elevados`} />
            </div>
            <span className="text-[10px] text-muted">{d.day}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-3 text-[11px] text-muted">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-accent/80" /> Procesados</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-warning" /> Elevados</span>
      </div>
    </WidgetShell>
  );
}

export function ProspectsWidget({ messages }: { messages: UiMessage[] }) {
  const leads = messages.filter((m) => m.leadScore).sort((a, b) => (b.leadScore ?? 0) - (a.leadScore ?? 0)).slice(0, 3);
  return (
    <WidgetShell title="Prospectos calientes" icon={TrendingUp}>
      <ul className="space-y-2.5">
        {leads.map((m) => (
          <li key={m.id} className="flex items-center gap-3">
            <div className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-bold', (m.leadScore ?? 0) >= 75 ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning')}>
              {m.leadScore}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{m.sender}</p>
              <p className="truncate text-xs text-muted">{m.preview}</p>
            </div>
          </li>
        ))}
      </ul>
    </WidgetShell>
  );
}
