'use client';

import { useEffect, useState } from 'react';

type Variant = 'neutral' | 'warm' | 'documentary';
type Result = { ok: boolean; audioUrl?: string };

const items: Array<{ id: Variant; title: string; subtitle: string }> = [
  { id: 'neutral', title: 'A · Neutra premium', subtitle: 'Clara, sobria y equilibrada.' },
  { id: 'warm', title: 'B · Cálida', subtitle: 'Más cercana y expresiva.' },
  { id: 'documentary', title: 'C · Documental', subtitle: 'Más contenida, firme y pausada.' },
];

export default function VoiceLabClient() {
  const [results, setResults] = useState<Partial<Record<Variant, Result>>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      for (const item of items) {
        try {
          const response = await fetch(`/api/voice-lab?variant=${item.id}`, { cache: 'no-store' });
          const data = await response.json();
          if (!cancelled) setResults((current) => ({ ...current, [item.id]: { ok: Boolean(data.ok && data.audioUrl), audioUrl: data.audioUrl } }));
        } catch {
          if (!cancelled) setResults((current) => ({ ...current, [item.id]: { ok: false } }));
        }
      }
      if (!cancelled) setReady(true);
    }
    run();
    return () => { cancelled = true; };
  }, []);

  return (
    <main style={{ minHeight: '100vh', background: '#050706', color: '#f2f4f1', padding: '56px 20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ width: 'min(920px, 100%)', margin: '0 auto' }}>
        <p style={{ color: '#22d65b', fontWeight: 900, letterSpacing: '.14em', textTransform: 'uppercase', fontSize: 12 }}>GHC Academy · prueba interna de voz</p>
        <h1 style={{ margin: '12px 0 14px', fontSize: 'clamp(34px, 6vw, 64px)', lineHeight: 1 }}>Tres versiones. El mismo texto.</h1>
        <p style={{ maxWidth: 760, color: 'rgba(242,244,241,.7)', fontSize: 18, lineHeight: 1.6 }}>Compara tres tratamientos de una voz española de referencia y elige el que mejor encaje con la Academy.</p>
        <p style={{ marginTop: 18, color: '#22d65b', fontWeight: 800 }}>{ready ? 'Listo. Escucha A, B y C.' : 'Preparando las tres muestras…'}</p>
        <div style={{ display: 'grid', gap: 16, marginTop: 34 }}>
          {items.map((item) => {
            const result = results[item.id];
            return (
              <section key={item.id} style={{ padding: 24, border: '1px solid rgba(255,255,255,.12)', borderRadius: 18, background: 'rgba(255,255,255,.035)' }}>
                <h2 style={{ margin: 0, fontSize: 24 }}>{item.title}</h2>
                <p style={{ margin: '6px 0 18px', color: 'rgba(242,244,241,.6)' }}>{item.subtitle}</p>
                {!result && <span style={{ color: 'rgba(242,244,241,.45)' }}>Generando…</span>}
                {result?.ok && result.audioUrl && <audio controls preload="metadata" src={result.audioUrl} style={{ width: '100%' }} />}
                {result && !result.ok && <p style={{ margin: 0, color: '#ff8d8d' }}>No se pudo generar esta muestra. Recarga la página para reintentar.</p>}
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
