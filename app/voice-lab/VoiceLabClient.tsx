'use client';

import { useEffect, useState } from 'react';

type VoiceId = 'male_warm' | 'male_documentary' | 'female_warm' | 'female_documentary';
type Result = { ok: boolean; audioUrl?: string; error?: string };

const items: Array<{ id: VoiceId; title: string; subtitle: string; group: 'Hombre' | 'Mujer' }> = [
  { id: 'male_warm', title: 'H1 · Hombre cálido', subtitle: 'Adulto, seguro, cercano y natural.', group: 'Hombre' },
  { id: 'male_documentary', title: 'H2 · Hombre documental', subtitle: 'Más grave, pausado y sobrio.', group: 'Hombre' },
  { id: 'female_warm', title: 'M1 · Mujer cálida', subtitle: 'Clara, cercana y con autoridad tranquila.', group: 'Mujer' },
  { id: 'female_documentary', title: 'M2 · Mujer documental', subtitle: 'Serena, elegante y más contenida.', group: 'Mujer' },
];

export default function VoiceLabClient() {
  const [results, setResults] = useState<Partial<Record<VoiceId, Result>>>({});
  const [loading, setLoading] = useState<Partial<Record<VoiceId, boolean>>>({});

  async function loadVoice(id: VoiceId) {
    setLoading((current) => ({ ...current, [id]: true }));
    setResults((current) => ({ ...current, [id]: undefined }));
    try {
      const response = await fetch(`/api/voice-lab-qwen?voice=${id}`, { cache: 'no-store' });
      const data = await response.json();
      setResults((current) => ({
        ...current,
        [id]: {
          ok: Boolean(data.ok && data.audioUrl),
          audioUrl: data.audioUrl,
          error: data.ok ? undefined : 'No se pudo generar esta muestra.',
        },
      }));
    } catch {
      setResults((current) => ({ ...current, [id]: { ok: false, error: 'No se pudo generar esta muestra.' } }));
    } finally {
      setLoading((current) => ({ ...current, [id]: false }));
    }
  }

  useEffect(() => {
    loadVoice('male_warm');
  }, []);

  return (
    <main style={{ minHeight: '100vh', background: '#050706', color: '#f2f4f1', padding: '56px 20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ width: 'min(980px, 100%)', margin: '0 auto' }}>
        <p style={{ color: '#22d65b', fontWeight: 900, letterSpacing: '.14em', textTransform: 'uppercase', fontSize: 12 }}>GHC Academy · prueba interna de voz · ronda 2</p>
        <h1 style={{ margin: '12px 0 14px', fontSize: 'clamp(34px, 6vw, 62px)', lineHeight: 1 }}>H1 ya es nuestro punto de referencia.</h1>
        <p style={{ maxWidth: 800, color: 'rgba(242,244,241,.72)', fontSize: 18, lineHeight: 1.6 }}>
          El hombre cálido queda marcado como favorito actual. He cambiado la carga para que cada voz se genere de forma independiente: así las voces de mujer no se quedan bloqueadas detrás de las anteriores.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 18, marginTop: 34 }}>
          {items.map((item) => {
            const result = results[item.id];
            const isLoading = Boolean(loading[item.id]);
            const favorite = item.id === 'male_warm';
            return (
              <section key={item.id} style={{ padding: 24, border: favorite ? '1px solid rgba(34,214,91,.75)' : '1px solid rgba(255,255,255,.12)', borderRadius: 18, background: favorite ? 'rgba(34,214,91,.06)' : 'rgba(255,255,255,.035)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ color: '#22d65b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 900 }}>{item.group}</div>
                  {favorite && <div style={{ color: '#22d65b', fontSize: 11, fontWeight: 900 }}>FAVORITO ACTUAL</div>}
                </div>
                <h2 style={{ margin: '8px 0 0', fontSize: 24 }}>{item.title}</h2>
                <p style={{ margin: '7px 0 20px', minHeight: 42, color: 'rgba(242,244,241,.62)', lineHeight: 1.45 }}>{item.subtitle}</p>

                {result?.ok && result.audioUrl && <audio controls preload="metadata" src={result.audioUrl} style={{ width: '100%', marginBottom: 14 }} />}
                {result && !result.ok && <p style={{ margin: '0 0 14px', color: '#ff8d8d' }}>{result.error}</p>}

                <button
                  type="button"
                  onClick={() => loadVoice(item.id)}
                  disabled={isLoading}
                  style={{ width: '100%', border: '1px solid rgba(255,255,255,.18)', borderRadius: 12, padding: '12px 14px', background: isLoading ? 'rgba(255,255,255,.05)' : '#151a17', color: '#f2f4f1', fontWeight: 800, cursor: isLoading ? 'wait' : 'pointer' }}
                >
                  {isLoading ? 'Generando…' : result?.ok ? 'Generar otra toma' : 'Generar esta voz'}
                </button>
              </section>
            );
          })}
        </div>

        <p style={{ marginTop: 28, color: 'rgba(242,244,241,.5)', lineHeight: 1.6, fontSize: 14 }}>
          Para probar M1 o M2, pulsa “Generar esta voz”. Cada muestra se procesa por separado y puede tardar unos segundos.
        </p>
      </div>
    </main>
  );
}
