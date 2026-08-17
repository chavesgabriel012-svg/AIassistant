'use client';

import { Bell, Shield } from 'lucide-react';
import { Avatar } from '@/components/ui';
import { InstallButton } from '@/components/pwa/InstallButton';
import type { UiUser } from '@/lib/data/types';

export function Topbar({ user, approvals }: { user: UiUser; approvals: number }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-bg/80 px-4 py-3 backdrop-blur md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <Shield className="h-5 w-5 text-accent" />
        <span className="font-semibold">Escudo</span>
      </div>

      <div className="hidden md:block">
        <p className="text-sm text-muted">{greeting},</p>
        <h1 className="text-base font-semibold leading-tight">
          Bienvenido <span className="text-accent">{user.handle}</span>
        </h1>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <InstallButton />
        <button className="relative grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-fg" aria-label="Notificaciones">
          <Bell className="h-[18px] w-[18px]" />
          {approvals > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-fg">
              {approvals}
            </span>
          )}
        </button>
        <Avatar initials={user.avatarInitials} />
      </div>
    </header>
  );
}
