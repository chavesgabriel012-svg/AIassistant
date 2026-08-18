'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Inbox, Users, CalendarDays, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/inbox', label: 'Bandeja', icon: Inbox },
  { href: '/prospects', label: 'Prospectos', icon: Users },
  { href: '/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/settings', label: 'Ajustes', icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface/95 backdrop-blur md:hidden">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link key={href} href={href} className={cn('flex flex-1 flex-col items-center gap-1 py-2 text-[10px]', active ? 'text-accent' : 'text-muted')}>
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
