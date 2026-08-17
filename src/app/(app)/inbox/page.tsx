import { PageHeader } from '@/components/PageHeader';
import { InboxView } from '@/components/inbox/InboxView';
import { getInbox } from '@/lib/data';

export default async function InboxPage() {
  const messages = await getInbox();
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Bandeja unificada" subtitle="Todos tus canales en un solo lugar, ya clasificados." />
      <InboxView messages={messages} />
    </div>
  );
}
