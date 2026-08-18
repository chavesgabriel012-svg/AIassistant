'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield } from 'lucide-react';
import { NAV_MAIN, NAV_FOOTER } from '@/lib/ui-config';
import { cn } from '@/lib/utils';

interface Props {
  badges?: { inbox?: number; approvals?: number };
}

export function Sidebar({ badges }: Props) {
  const pathname = usePathname();

  const renderItem = (href: string, label: string, Icon: React.ElementType, badgeKey?: string) => {
    const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
    const count = badgeKey === 'inbox' ? badges?.inbox : undefined;
    return (
      <Link
        key={href}
        href={href}
        className={cn(
          'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
          active ? 'bg-surface-2 text-fg' : 'text-muted hover:bg-surface-2/60 hover:text-fg',
        )}
      >
        <Icon className={cn('h-[18px] w-[18px]', active && 'text-accent')} />
        <span className="flex-1">{label}</span>
        {count ? (
          <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[11px] font-semibold text-accent">{count}</span>
        ) : null}
      </Link>
    );
  };

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="flex items-center gap-2 px-5 py-4">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent/15">
          <Shield className="h-5 w-5 text-accent" />
        </span>
        <span className="text-[15px] font-semibold">Escudo Digital</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV_MAIN.map((i) => renderItem(i.href, i.label, i.icon, i.badgeKey))}
      </nav>

      <div className="space-y-1 border-t border-border px-3 py-3">
        {NAV_FOOTER.map((i) => renderItem(i.href, i.label, i.icon))}
      </div>
    </aside>
  );
}
