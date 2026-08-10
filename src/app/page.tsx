export default function HomePage() {
  return (
    <main>
      <h1>🛡️ Escudo Digital</h1>
      <p style={{ color: 'var(--muted)' }}>
        El filtro omnicanal que se interpone entre tú y el ruido. Lee, evalúa y
        decide: archiva, responde lo básico, agenda o te deriva lo importante.
      </p>

      <h2>Cómo funciona el Triage Engine</h2>
      <ol>
        <li>
          <strong>Ingesta:</strong> el mensaje entra por webhook (Gmail, WhatsApp).
        </li>
        <li>
          <strong>Triaje (modelo económico):</strong> clasifica en{' '}
          <code>spam_info</code>, <code>routine_faq</code> o{' '}
          <code>complex_vip</code>.
        </li>
        <li>
          <strong>Acción:</strong> archivar en silencio, redactar respuesta simple,
          o escalar a modelo avanzado / humano.
        </li>
        <li>
          <strong>Auditoría:</strong> cada decisión y token consumido se registra
          en Supabase para facturación y control de límites.
        </li>
      </ol>

      <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
        MVP · Next.js + Supabase + LLM Routing. Ver <code>docs/ARCHITECTURE.md</code>.
      </p>
    </main>
  );
}
