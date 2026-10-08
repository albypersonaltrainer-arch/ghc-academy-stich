'use client';
import { useState } from 'react';
import Link from 'next/link';
export default function BajaClient({ token }: { token: string }) {
  const [status, setStatus] = useState<'ready'|'saving'|'done'|'error'>('ready');
  const [message, setMessage] = useState('');
  async function confirm() {
    if (!token || status === 'saving') return;
    setStatus('saving');
    try {
      const res = await fetch('/api/preventa/baja', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) throw new Error(body.error || 'Inténtalo de nuevo.');
      setStatus('done');
      setMessage(body.message || 'Tu baja se ha registrado.');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Error en la solicitud.');
    }
  }
  return <main style={{ minHeight: '80vh', background: '#060a07', color: '#f1f7f1',
    padding: 'min(11vw,90px) 22px', textAlign: 'center' }}>
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      <h1 style={{ fontSize: 38, lineHeight: 1.15 }}>Dar de baja las comunicaciones de GHC Academy</h1>
      <p style={{ color: '#b8c8b9', lineHeight: 1.7 }}>
        Puedes dejar de recibir comunicaciones promocionales cuando quieras. Esta opción no afecta a correos relacionados con contratos o pagos realizados.
      </p>
      {status === 'done' ? <p role="status" style={{ color: '#55e07b' }}>{message}</p> : <>
        {status === 'error' && <p role="alert" style={{ color: '#ffabab' }}>{message}</p>}
        <button type="button" disabled={!token || status === 'saving'} onClick={confirm}
          style={{ background: '#30d75b', color: '#071007', padding: '15px 20px',
            border: 0, borderRadius: 12, cursor: 'pointer', fontWeight: 800 }}>
          {status === 'saving' ? 'Procesando…' : 'Confirmar baja'}
        </button>
      </>}
      <p style={{ marginTop: 28 }}><Link href="/legal#privacidad" style={{ color: '#7fe79b' }}>
        Política de privacidad
      </Link></p>
    </div>
  </main>;
}
