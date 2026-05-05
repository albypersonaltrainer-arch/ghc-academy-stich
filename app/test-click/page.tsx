'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function TestClickPage() {
  const [count, setCount] = useState(0);
  const [text, setText] = useState('');

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#050706',
        color: 'white',
        padding: '40px',
        fontFamily: 'Arial, Helvetica, sans-serif',
        position: 'relative',
        zIndex: 999999,
      }}
    >
      <Link
        href="/cursos"
        style={{
          display: 'inline-block',
          marginBottom: '30px',
          color: '#00FF41',
          border: '1px solid rgba(0,255,65,0.5)',
          padding: '12px 16px',
          borderRadius: '999px',
          textDecoration: 'none',
          fontWeight: 900,
        }}
      >
        ← Volver a cursos
      </Link>

      <section
        style={{
          maxWidth: '700px',
          border: '1px solid rgba(0,255,65,0.35)',
          borderRadius: '28px',
          padding: '28px',
          background: 'rgba(255,255,255,0.05)',
          position: 'relative',
          zIndex: 999999,
          pointerEvents: 'auto',
        }}
      >
        <p
          style={{
            color: '#00FF41',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            fontWeight: 900,
          }}
        >
          Test de interacción
        </p>

        <h1 style={{ fontSize: '44px', margin: '0 0 20px' }}>
          Prueba de clic
        </h1>

        <p style={{ color: 'rgba(255,255,255,0.7)' }}>
          Esta página no usa Supabase, ni login, ni iframe. Solo comprueba si el navegador permite clicar.
        </p>

        <button
          type="button"
          onClick={() => setCount((prev) => prev + 1)}
          style={{
            width: '100%',
            marginTop: '20px',
            border: 'none',
            borderRadius: '18px',
            background: '#00FF41',
            color: '#000',
            padding: '18px',
            fontWeight: 950,
            cursor: 'pointer',
            pointerEvents: 'auto',
            position: 'relative',
            zIndex: 999999,
          }}
        >
          Pulsar prueba: {count}
        </button>

        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Escribe aquí para probar input"
          style={{
            width: '100%',
            marginTop: '20px',
            borderRadius: '18px',
            border: '1px solid rgba(0,255,65,0.35)',
            background: '#000',
            color: 'white',
            padding: '16px',
            fontSize: '16px',
            pointerEvents: 'auto',
            position: 'relative',
            zIndex: 999999,
          }}
        />

        <p style={{ marginTop: '20px', color: '#00FF41' }}>
          Texto escrito: {text || '—'}
        </p>
      </section>
    </main>
  );
}
