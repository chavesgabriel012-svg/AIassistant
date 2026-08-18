'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Star, Ban, Plus, X, Wand2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Editor de reglas de filtrado. Mapea a la tabla user_preferences.
 * Estado local (mock); conectar = GET/PATCH de preferencias vía Supabase.
 */
export default function RulesPage() {
  const [autopilot, setAutopilot] = useState(false);
  const [tone, setTone] = useState('profesional y cordial');
  const [instructions, setInstructions] = useState(
    'Los correos de mi socio Andrés siempre son importantes. Archiva newsletters y promociones automáticamente.',
  );
  const [vip, setVip] = useState<string[]>(['mamá (+506 8888-1111)', 'andres@socio.com', 'laura@inmobiliariacr.com']);
  const [blocked, setBlocked] = useState<string[]>(['no-reply@promos.com', 'newsletter@']);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Reglas de filtrado" subtitle="Enséñale a tu asistente a quién priorizar y qué ignorar. Tú tienes el control." />

      {/* Autopilot */}
      <section className="card mb-4 flex items-center gap-3 p-4">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15"><Zap className="h-5 w-5 text-accent" /></span>
        <div className="flex-1">
          <p className="text-sm font-medium">Piloto automático</p>
          <p className="text-xs text-muted">Si está activo, responde los mensajes rutinarios sin pedirte aprobación. Los importantes y VIP siempre pasan por ti.</p>
        </div>
        <Toggle on={autopilot} onChange={setAutopilot} />
      </section>

      {/* VIP */}
      <ListEditor
        title="Siempre a mí (VIP)"
        hint="Estos contactos nunca se archivan ni se responden solos; te los elevo siempre."
        icon={Star}
        iconClass="text-accent"
        items={vip}
        setItems={setVip}
        placeholder="ej. mamá (+506 8888-1111)"
      />

      {/* Bloqueados */}
      <ListEditor
        title="Archivar siempre"
        hint="Remitentes o dominios que se archivan en silencio sin gastar un solo token."
        icon={Ban}
        iconClass="text-danger"
        items={blocked}
        setItems={setBlocked}
        placeholder="ej. newsletter@ o promociones.com"
      />

      {/* Instrucciones en lenguaje natural */}
      <section className="card mb-4 p-4">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Wand2 className="h-4 w-4 text-accent" /> Instrucciones personalizadas</h3>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-xl border border-border bg-surface-2 p-3 text-sm outline-none focus:border-accent/40"
        />
        <p className="mt-2 text-xs text-muted">Escribe en lenguaje natural. El asistente las respeta al clasificar cada mensaje.</p>
      </section>

      {/* Tono */}
      <section className="card mb-4 p-4">
        <h3 className="mb-2 text-sm font-semibold">Tono de las respuestas</h3>
        <div className="flex flex-wrap gap-2">
          {['profesional y cordial', 'cercano y amistoso', 'directo y breve', 'formal'].map((t) => (
            <button key={t} onClick={() => setTone(t)} className={cn('rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors', tone === t ? 'border-accent/40 bg-accent/10 text-accent' : 'border-border text-muted hover:text-fg')}>
              {t}
            </button>
          ))}
        </div>
      </section>

      <button className="btn-primary w-full">Guardar reglas</button>
      <p className="mt-2 text-center text-xs text-muted">Demo: se guardará en Supabase (user_preferences) al integrar.</p>
    </div>
  );
}

function ListEditor({ title, hint, icon: Icon, iconClass, items, setItems, placeholder }: {
  title: string; hint: string; icon: React.ElementType; iconClass: string;
  items: string[]; setItems: (v: string[]) => void; placeholder: string;
}) {
  const [draft, setDraft] = useState('');
  return (
    <section className="card mb-4 p-4">
      <h3 className={cn('mb-1 flex items-center gap-2 text-sm font-semibold')}><Icon className={cn('h-4 w-4', iconClass)} /> {title}</h3>
      <p className="mb-3 text-xs text-muted">{hint}</p>
      <div className="mb-2 flex flex-wrap gap-2">
        {items.map((it) => (
          <span key={it} className="chip">
            {it}
            <button onClick={() => setItems(items.filter((x) => x !== it))} className="text-muted hover:text-danger"><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && draft.trim()) { setItems([...items, draft.trim()]); setDraft(''); } }}
          placeholder={placeholder}
          className="flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent/40"
        />
        <button onClick={() => { if (draft.trim()) { setItems([...items, draft.trim()]); setDraft(''); } }} className="btn-ghost border border-border"><Plus className="h-4 w-4" /></button>
      </div>
    </section>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', on ? 'bg-accent' : 'bg-surface-2')}>
      <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform', on ? 'translate-x-5' : 'translate-x-0.5')} />
    </button>
  );
}
