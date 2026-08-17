import { PageHeader } from '@/components/PageHeader';
import { SettingsView } from '@/components/settings/SettingsView';
import { getChannels, getCurrentUser, getUsage } from '@/lib/data';

export default async function SettingsPage() {
  const [user, channels, usage] = await Promise.all([getCurrentUser(), getChannels(), getUsage()]);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Configuración" subtitle="Canales, uso, apariencia y cuenta." />
      <SettingsView user={user} channels={channels} usage={usage} />
    </div>
  );
}
