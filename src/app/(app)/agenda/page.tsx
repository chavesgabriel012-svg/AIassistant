import { PageHeader } from '@/components/PageHeader';
import { shortDateTime, cn } from '@/lib/utils';
import { getAppointments } from '@/lib/data';
import { MapPin, User, Clock } from 'lucide-react';

const STATUS_META = {
  awaiting_user: { label: 'Por confirmar', className: 'bg-warning/10 text-warning' },
  confirmed: { label: 'Confirmada', className: 'bg-success/10 text-success' },
  declined: { label: 'Rechazada', className: 'bg-danger/10 text-danger' },
} as const;

export default async function AgendaPage() {
  const items = (await getAppointments()).sort((a, b) => a.startISO.localeCompare(b.startISO));
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Agenda" subtitle="Citas detectadas en tus mensajes y sincronizadas con tu calendario." />
      <div className="space-y-3">
        {items.map((a) => {
          const s = STATUS_META[a.status];
          return (
            <div key={a.id} className="card flex items-center gap-4 p-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-surface-2 text-center">
                <span className="text-[10px] uppercase text-muted">{new Date(a.startISO).toLocaleDateString('es-CR', { month: 'short' })}</span>
                <span className="text-lg font-semibold leading-none">{new Date(a.startISO).toLocaleDateString('es-CR', { day: '2-digit' })}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{a.title}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{shortDateTime(a.startISO)}</span>
                  <span className="flex items-center gap-1"><User className="h-3 w-3" />{a.withWhom}</span>
                  {a.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{a.location}</span>}
                </p>
              </div>
              <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium', s.className)}>{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
