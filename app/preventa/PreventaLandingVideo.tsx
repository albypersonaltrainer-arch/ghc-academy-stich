'use client';

import { useEffect, useState } from 'react';

type VideoState = 'loading' | 'ready' | 'unavailable';

export default function PreventaLandingVideo() {
  const [src, setSrc] = useState('');
  const [state, setState] = useState<VideoState>('loading');

  useEffect(() => {
    let active = true;

    fetch('/api/preventa/landing-video', { method: 'GET', cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('video_unavailable');
        return response.json();
      })
      .then((data) => {
        if (!active) return;

        if (data?.ok && typeof data.url === 'string' && data.url.trim()) {
          setSrc(data.url);
          setState('ready');
          return;
        }

        setState('unavailable');
      })
      .catch(() => {
        if (active) setState('unavailable');
      });

    return () => {
      active = false;
    };
  }, []);

  if (state === 'loading') {
    return (
      <div
        role="status"
        aria-label="Cargando vídeo de presentación de GHC Academy"
        style={{
          width: '100%',
          aspectRatio: '16 / 9',
          display: 'grid',
          placeItems: 'center',
          background: '#050706',
          color: '#a9afaa',
          borderRadius: 18,
          fontSize: 14,
        }}
      >
        Cargando vídeo…
      </div>
    );
  }

  if (state === 'unavailable' || !src) {
    return (
      <div
        role="status"
        style={{
          width: '100%',
          minHeight: 220,
          display: 'grid',
          placeItems: 'center',
          padding: 28,
          boxSizing: 'border-box',
          background: '#050706',
          color: '#a9afaa',
          borderRadius: 18,
          textAlign: 'center',
          lineHeight: 1.6,
        }}
      >
        El vídeo no está disponible en este momento. Puedes continuar revisando toda la información de la Edición Fundadora más abajo.
      </div>
    );
  }

  return (
    <video
      src={src}
      controls
      playsInline
      preload="metadata"
      aria-label="Vídeo de presentación de GHC Academy"
      onError={() => setState('unavailable')}
      style={{
        display: 'block',
        width: '100%',
        aspectRatio: '16 / 9',
        objectFit: 'contain',
        background: '#050706',
        borderRadius: 18,
      }}
    />
  );
}
