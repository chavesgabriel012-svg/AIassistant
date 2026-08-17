'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Mic, Sparkles, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Barra de comandos del asistente (voz + texto). Es la costura del front con
 * el endpoint /api/assistant/command: hoy simula la respuesta; conectarla es
 * cambiar `simulateAnswer` por un fetch a ese endpoint.
 */
const EXAMPLES = [
  'Búscame todos los correos de Jorge',
  '¿Recibí una factura ayer?',
  'Escríbele a Laura para confirmar la reunión del jueves',
  '¿Qué prospectos nuevos entraron hoy?',
  'Agéndame una visita el sábado en la mañana',
  'Resume lo que pasó en mi bandeja esta semana',
];

interface Turn {
  role: 'user' | 'assistant';
  text: string;
}

export function CommandBar() {
  const [value, setValue] = useState('');
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Rota el placeholder con ejemplos.
  useEffect(() => {
    if (value) return;
    const t = setInterval(() => setPlaceholderIdx((i) => (i + 1) % EXAMPLES.length), 3200);
    return () => clearInterval(t);
  }, [value]);

  async function submit(text: string) {
    const q = text.trim();
    if (!q || thinking) return;
    setValue('');
    setTurns((t) => [...t, { role: 'user', text: q }]);
    setThinking(true);
    // TODO(integración): reemplazar por fetch('/api/assistant/command', {...}).
    const answer = await simulateAnswer(q);
    setTurns((t) => [...t, { role: 'assistant', text: answer }]);
    setThinking(false);
  }

  function toggleVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert('Tu navegador no soporta dictado por voz. Escribe tu comando.');
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = new SR();
    rec.lang = 'es-CR';
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join('');
      setValue(transcript);
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Conversación (aparece al enviar) */}
      {turns.length > 0 && (
        <div className="mb-4 space-y-3">
          {turns.map((t, i) => (
            <div key={i} className={cn('flex', t.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm animate-fade-in',
                  t.role === 'user' ? 'bg-accent text-accent-fg' : 'card',
                )}
              >
                {t.role === 'assistant' && (
                  <span className="mb-1 flex items-center gap-1.5 text-xs text-muted">
                    <Sparkles className="h-3.5 w-3.5 text-accent" /> Asistente
                  </span>
                )}
                <p className="whitespace-pre-wrap leading-relaxed">{t.text}</p>
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex justify-start">
              <div className="card px-4 py-2.5 text-sm text-muted animate-fade-in">Pensando…</div>
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div className="card flex items-end gap-2 p-2 shadow-lg">
        <textarea
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit(value);
            }
          }}
          placeholder={EXAMPLES[placeholderIdx]}
          className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted"
        />
        <button
          onClick={toggleVoice}
          className={cn('grid h-9 w-9 place-items-center rounded-xl transition-colors', listening ? 'bg-danger/20 text-danger' : 'text-muted hover:bg-surface-2 hover:text-fg')}
          aria-label="Dictar por voz"
        >
          {listening ? <Square className="h-4 w-4" /> : <Mic className="h-[18px] w-[18px]" />}
        </button>
        <button
          onClick={() => submit(value)}
          disabled={!value.trim() || thinking}
          className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-40"
          aria-label="Enviar"
        >
          <ArrowUp className="h-[18px] w-[18px]" />
        </button>
      </div>

      {/* Chips de ejemplo */}
      {turns.length === 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {EXAMPLES.slice(0, 4).map((ex) => (
            <button key={ex} onClick={() => submit(ex)} className="chip transition-colors hover:border-accent/40 hover:text-fg">
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Respuesta simulada (demo). Se reemplaza por el endpoint real. */
async function simulateAnswer(q: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 700));
  const lower = q.toLowerCase();
  if (lower.includes('factura'))
    return 'Encontré 1 factura recibida ayer: "Factura #A-2214" de Ferretería EPA por ₡84.300. ¿Quieres que te la reenvíe o la archive?';
  if (lower.includes('jorge'))
    return 'Tengo 3 correos de Jorge Vargas en los últimos 30 días. El más reciente es de hace 2 días sobre el avalúo de la propiedad. ¿Te los muestro?';
  if (lower.includes('prospecto'))
    return 'Hoy entraron 2 prospectos: uno de Turrialba (score 88, interesado en San Juan Norte) y otro de Santa Ana (score 72). El de Turrialba parece caliente.';
  if (lower.includes('reun') || lower.includes('laura'))
    return 'Preparé un mensaje para Laura confirmando el jueves 3:00pm en Santa Ana. Queda pendiente tu aprobación antes de enviarlo.';
  if (lower.includes('agend') || lower.includes('visita') || lower.includes('sábado'))
    return 'Propuse una visita para el sábado a las 9:00am. La dejé en tu cola de aprobaciones para que la confirmes.';
  if (lower.includes('resum') || lower.includes('semana'))
    return 'Esta semana procesé 1.284 mensajes: resolví el 76% sin molestarte, filtré 312 spam y detecté 9 prospectos. Te ahorré ~14 horas.';
  return 'Entendido. (Demo) Cuando conectemos el endpoint /api/assistant/command, ejecutaré esta acción de verdad sobre tus canales.';
}
