'use client';

import { useEffect, useState } from 'react';

type Result = { ok: boolean; audioUrl?: string; error?: string };

const VOICE_ID = 'ghc_male_warm_v1';

export default function VoiceLabClient() {
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadVoice() {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch(`/api/voice-lab-qwen?voice=${VOICE_ID}`, { cache: 'no-store' });
      const data = await response.json();
      setResult({
        ok: Boolean(data.ok && data.audioUrl),
        audioUrl: data.audioUrl,
        error: data.ok ? undefined : 'No se pudo generar esta muestra.',
      });
    } catch {
      setResult({ ok: false, error: 'No se pudo generar esta muestra.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVoice();
  }, []);

  return (
    <main style={{ minHeight: '100vh', background: '#050706', color: '#f2f4f1', padding: '56px 20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ width: 'min(820px, 100%)', margin: '0 auto' }}>
        <p style={{ color: '#22d65b', fontWeight: 900, letterSpacing: '.14em', textTransform: 'uppercase', fontSize: 12 }}>GHC Academy · laboratorio interno de voz</p>
        <h1 style={{ margin: '12px 0 14px', fontSize: 'clamp(34px, 6vw, 62px)', lineHeight: 1 }}>Voz base aprobada.</h1>
        <p style={{ maxWidth: 760, color: 'rgba(242,244,241,.72)', fontSize: 18, lineHeight: 1.6 }}>
          Nos quedamos con H1 · Hombre cálido como voz principal. El sistema queda preparado para añadir voces distintas más adelante sin rehacer el flujo de generación.
        </p>

        <section style={{ marginTop: 34, padding: 28, border: '1px solid rgba(34,214,91,.72)', borderRadius: 20, background: 'rgba(34,214,91,.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ color: '#22d65b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 900 }}>Voz principal</div>
            <div style={{ color: '#22d65b', fontSize: 11, fontWeight: 900 }}>APROBADA</div>
          </div>
          <h2 style={{ margin: '8px 0 0', fontSize: 28 }}>H1 · Hombre cálido</h2>
          <p style={{ margin: '7px 0 22px', color: 'rgba(242,244,241,.65)', lineHeight: 1.5 }}>Adulto, seguro, cercano y natural. Tono de formación premium, sin voz publicitaria ni de locutor.</p>

          {result?.ok && result.audioUrl && <audio controls preload="metadata" src={result.audioUrl} style={{ width: '100%', marginBottom: 16 }} />}
          {result && !result.ok && <p style={{ margin: '0 0 16px', color: '#ff8d8d' }}>{result.error}</p>}

          <button
            type="button"
            onClick={loadVoice}
            disabled={loading}
            style={{ width: '100%', border: '1px solid rgba(255,255,255,.18)', borderRadius: 12, padding: '13px 14px', background: loading ? 'rgba(255,255,255,.05)' : '#151a17', color: '#f2f4f1', fontWeight: 800, cursor: loading ? 'wait' : 'pointer' }}
          >
            {loading ? 'Generando…' : result?.ok ? 'Generar otra toma' : 'Generar muestra'}
          </button>
        </section>

        <div style={{ marginTop: 24, padding: '18px 20px', border: '1px solid rgba(255,255,255,.1)', borderRadius: 16, color: 'rgba(242,244,241,.58)', lineHeight: 1.6, fontSize: 14 }}>
          Arquitectura preparada para varias voces: cuando queramos añadir una voz de mujer, otra voz masculina, una voz para documentales o cualquier otro perfil, se incorpora al catálogo y usa el mismo generador.
        </div>
      </div>
    </main>
  );
}
