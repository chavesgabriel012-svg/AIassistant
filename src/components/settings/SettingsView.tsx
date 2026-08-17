'use client';

import { useEffect, useState } from 'react';
import { Mail, MessageCircle, Plug, Check, Sun, Moon, CreditCard, Zap, LogOut } from 'lucide-react';
import { Progress } from '@/components/ui';
import { PROVIDER_META } from '@/lib/ui-config';
import { currency, cn } from '@/lib/utils';
import type { UiChannel, UiUsage, UiUser } from '@/lib/data/types';

type Tab = 'channels' | 'usage' | 'appearance' | 'account';

export function SettingsView({ user, channels, usage }: { user: UiUser; channels: UiChannel[]; usage: UiUsage }) {
  const [tab, setTab] = useState<Tab>('channels');
  const tabs: { key: Tab; label: string }[] = [
    { key: 'channels', label: 'Canales' },
    { key: 'usage', label: 'Uso y facturación' },
    { key: 'appearance', label: 'Apariencia' },
    { key: 'account', label: 'Cuenta' },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-[180px_1fr]">
      <nav className="flex gap-1 overflow-x-auto md:flex-col">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={cn('whitespace-nowrap rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors', tab === t.key ? 'bg-surface-2 text-fg' : 'text-muted hover:text-fg')}>
            {t.label}
          </button>
        ))}
      </nav>

      <div className="min-w-0">
        {tab === 'channels' && <ChannelsTab channels={channels} />}
        {tab === 'usage' && <UsageTab usage={usage} />}
        {tab === 'appearance' && <AppearanceTab />}
        {tab === 'account' && <AccountTab user={user} />}
      </div>
    </div>
  );
}

function ChannelsTab({ channels }: { channels: UiChannel[] }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Conecta tus canales para que el asistente los filtre. Los tokens se guardan cifrados (AES-256-GCM).</p>
      {channels.map((c) => {
        const meta = PROVIDER_META[c.provider];
        const Icon = meta.icon;
        const connected = c.status === 'active';
        return (
          <div key={c.provider} className="card flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface-2"><Icon className="h-5 w-5 text-accent" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{meta.label}</p>
              <p className="truncate text-xs text-muted">{connected ? `${c.account} · ${c.lastSyncedLabel}` : 'No conectado'}</p>
            </div>
            {connected ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs text-success"><Check className="h-3 w-3" />Conectado</span>
            ) : (
              // Gmail: al integrar, este botón redirige a /api/oauth/gmail/start
              <a href={c.provider === 'gmail' ? '/api/oauth/gmail/start' : '#'} className="btn-primary px-3 py-1.5 text-xs"><Plug className="h-3.5 w-3.5" />Conectar</a>
            )}
          </div>
        );
      })}
    </div>
  );
}

function UsageTab({ usage }: { usage: UiUsage }) {
  const pct = Math.round((usage.spentUsd / usage.monthlyBudgetUsd) * 100);
  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><Zap className="h-4 w-4 text-accent" />Consumo de IA este mes</h3>
          <span className="chip">Plan {usage.planLabel}</span>
        </div>
        <div className="mb-1 flex items-baseline justify-between">
          <span className="text-2xl font-semibold">{currency(usage.spentUsd)}</span>
          <span className="text-sm text-muted">de {currency(usage.monthlyBudgetUsd)} ({pct}%)</span>
        </div>
        <Progress value={pct} />
        <p className="mt-2 text-xs text-muted">{usage.messagesProcessed.toLocaleString('es-CR')} mensajes procesados · {usage.autoHandledPct}% resueltos automáticamente</p>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold">Desglose por modelo</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="px-4 py-2 font-medium">Modelo</th>
              <th className="px-4 py-2 text-right font-medium">Llamadas</th>
              <th className="px-4 py-2 text-right font-medium">Costo</th>
            </tr>
          </thead>
          <tbody>
            {usage.byModel.map((m) => (
              <tr key={m.model} className="border-t border-border">
                <td className="px-4 py-2.5">{m.model}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted">{m.calls.toLocaleString('es-CR')}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{currency(m.costUsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className="btn-ghost border border-border"><CreditCard className="h-4 w-4" />Gestionar plan y facturación</button>
    </div>
  );
}

function AppearanceTab() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  useEffect(() => {
    const saved = (localStorage.getItem('escudo.theme') as 'dark' | 'light') || 'dark';
    setTheme(saved);
    applyTheme(saved);
  }, []);
  function set(t: 'dark' | 'light') {
    setTheme(t);
    localStorage.setItem('escudo.theme', t);
    applyTheme(t);
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Elige el tema de la app.</p>
      <div className="grid grid-cols-2 gap-3">
        {(['dark', 'light'] as const).map((t) => (
          <button key={t} onClick={() => set(t)} className={cn('card flex items-center gap-3 p-4 transition-colors', theme === t ? 'ring-2 ring-accent' : '')}>
            {t === 'dark' ? <Moon className="h-5 w-5 text-accent" /> : <Sun className="h-5 w-5 text-warning" />}
            <span className="text-sm font-medium capitalize">{t === 'dark' ? 'Oscuro' : 'Claro'}</span>
            {theme === t && <Check className="ml-auto h-4 w-4 text-accent" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function applyTheme(t: 'dark' | 'light') {
  document.documentElement.setAttribute('data-theme', t);
}

function AccountTab({ user }: { user: UiUser }) {
  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-accent/20 text-lg font-semibold text-accent">{user.avatarInitials}</span>
          <div>
            <p className="font-medium">{user.fullName}</p>
            <p className="text-sm text-muted">{user.email}</p>
          </div>
          <span className="ml-auto chip capitalize">{user.plan}</span>
        </div>
      </div>
      <button className="btn-ghost border border-border text-danger"><LogOut className="h-4 w-4" />Cerrar sesión</button>
    </div>
  );
}
