import { CommandBar } from '@/components/CommandBar';
import { ApprovalsFeed } from '@/components/ApprovalsFeed';
import { WidgetBoard } from '@/components/widgets/WidgetBoard';
import { StatCard } from '@/components/ui';
import { BellRing } from 'lucide-react';
import {
  getApprovals,
  getAppointments,
  getCurrentUser,
  getInbox,
  getReminders,
  getStats,
  getUsage,
} from '@/lib/data';

export default async function HomePage() {
  const [user, approvals, appointments, reminders, usage, stats, messages] =
    await Promise.all([
      getCurrentUser(),
      getApprovals(),
      getAppointments(),
      getReminders(),
      getUsage(),
      getStats(),
      getInbox(),
    ]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Hero + command bar */}
      <section className="pt-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Hola, <span className="text-accent">{user.fullName.split(' ')[0]}</span>. ¿En qué te ayudo?
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Pídele a tu asistente por voz o texto: buscar mensajes, redactar, agendar o resumir.
        </p>
        <div className="mt-6">
          <CommandBar />
        </div>
      </section>

      {/* Stats rápidas */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} stat={s} />
        ))}
      </section>

      {/* Elevado al humano */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <BellRing className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-muted">Esperando tu decisión</h2>
          {approvals.length > 0 && (
            <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[11px] font-semibold text-accent">
              {approvals.length}
            </span>
          )}
        </div>
        <ApprovalsFeed initial={approvals} />
      </section>

      {/* Tablero personalizable */}
      <WidgetBoard appointments={appointments} reminders={reminders} usage={usage} messages={messages} />
    </div>
  );
}
