import { Sidebar } from '@/components/shell/Sidebar';
import { Topbar } from '@/components/shell/Topbar';
import { MobileNav } from '@/components/shell/MobileNav';
import { getApprovals, getCurrentUser, getInbox } from '@/lib/data';

/**
 * Shell de la aplicación: barra lateral (desktop), barra superior y navegación
 * inferior (móvil). Los datos de badges se leen de la capa de datos (mock hoy).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, inbox, approvals] = await Promise.all([
    getCurrentUser(),
    getInbox(),
    getApprovals(),
  ]);

  const unread = inbox.filter((m) => m.unread).length;

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <Sidebar badges={{ inbox: unread, approvals: approvals.length }} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} approvals={approvals.length} />
        <main className="flex-1 overflow-y-auto px-4 pb-24 pt-4 md:px-6 md:pb-8">
          {children}
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
