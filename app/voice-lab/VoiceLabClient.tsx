'use client';

import { useEffect, useState } from 'react';

type VoiceId = 'male_warm' | 'male_documentary' | 'female_warm' | 'female_documentary';
type Result = { ok: boolean; audioUrl?: string };

const items: Array<{ id: VoiceId; title: string; subtitle: string; group: 'Hombre' | 'Mujer' }> = [
  { id: 'male_warm', title: 'H1 · Hombre cálido', subtitle: 'Adulto, seguro, cercano y natural.', group: 'Hombre' },
  { id: 'male_documentary', title: 'H2 · Hombre documental', subtitle: 'Más grave, pausado y sobrio.', group: 'Hombre' },
  { id: 'female_warm', title: 'M1 · Mujer cálida', subtitle: 'Clara, cercana y con autoridad tranquila.', group: 'Mujer' },
  { id: 'female_documentary', title: 'M2 · Mujer documental', subtitle: 'Serena, elegante y más contenida.', group: 'Mujer' },
];

export default function VoiceLabClient() {
  const [results, setResults] = useState<Partial<Record<VoiceId, Result>>>({});
  const [active, setActive] = useState<VoiceId | null>(items[0].id);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      for (const item of items) {
        if (!cancelled) setActive(item.id);
        try {
          const response = await fetch(`/api/voice-lab-qwen?voice=${item.id}`, { cache: 'no-store' });
          const data = await response.json();
          if (!cancelled) setResults((current) => ({ ...current, [item.id]: { ok: Boolean(data.ok && data.audioUrl), audioUrl: data.audioUrl } }));
        } catch {
          if (!cancelled) setResults((current) => ({ ...current, [item.id]: { ok: false } }));
        }
      }
      if (!cancelled) {
        setActive(null);
        setReady(true);
      }
    }
    run();
    return () => { cancelled = true; };
  }, []);

  return (
    <main style={{ minHeight: '100vh', background: '#050706', color: '#f2f4f1', padding: '56px 20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ width: 'min(980px, 100%)', margin: '0 auto' }}>
        <p style={{ color: '#22d65b', fontWeight: 900, letterSpacing: '.14em', textTransform: 'uppercase', fontSize: 12 }}>GHC Academy · prueba interna de voz · ronda 2</p>
        <h1 style={{ margin: '12px 0 14px', fontSize: 'clamp(34px, 6vw, 62px)', lineHeight: 1 }}>Ahora sí: hombre y mujer.</h1>
        <p style={{ maxWidth: 800, color: 'rgba(242,244,241,.72)', fontSize: 18, lineHeight: 1.6 }}>
          Esta vez no son variaciones de la voz anterior. Son cuatro voces diseñadas desde cero con otro motor, buscando español de España, tono adulto, natural y de formación premium.
        </p>
        <p style={{ marginTop: 18, color: '#22d65b', fontWeight: 800 }}>
          {ready ? 'Listo. Escucha H1, H2, M1 y M2.' : active ? `Generando ${items.find((item) => item.id === active)?.title}…` : 'Preparando muestras…'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 18, marginTop: 34 }}>
          {items.map((item) => {
            const result = results[item.id];
            return (
              <section key={item.id} style={{ padding: 24, border: '1px solid rgba(255,255,255,.12)', borderRadius: 18, background: 'rgba(255,255,255,.035)' }}>
                <div style={{ color: '#22d65b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 900 }}>{item.group}</div>
                <h2 style={{ margin: '8px 0 0', fontSize: 24 }}>{item.title}</h2>
                <p style={{ margin: '7px 0 20px', minHeight: 42, color: 'rgba(242,244,241,.62)', lineHeight: 1.45 }}>{item.subtitle}</p>
                {!result && <span style={{ color: 'rgba(242,244,241,.45)' }}>{active === item.id ? 'Generando… puede tardar unos segundos.' : 'En cola…'}</span>}
                {result?.ok && result.audioUrl && <audio controls preload="metadata" src={result.audioUrl} style={{ width: '100%' }} />}
                {result && !result.ok && <p style={{ margin: 0, color: '#ff8d8d' }}>No se pudo generar esta muestra. Recarga la página para reintentar.</p>}
              </section>
            );
          })}
        </div>

        <p style={{ marginTop: 28, color: 'rgba(242,244,241,.5)', lineHeight: 1.6, fontSize: 14 }}>
          Escúchalas sin fijarte primero en si es hombre o mujer: piensa cuál aguantarías veinte minutos seguidos en un módulo sin cansarte.
        </p>
      </div>
    </main>
  );
}
