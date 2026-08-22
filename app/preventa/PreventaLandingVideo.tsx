'use client';

import { useEffect, useState } from 'react';

export default function PreventaLandingVideo() {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let active = true;

    fetch('/api/preventa/landing-video', { method: 'GET', cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('video_unavailable');
        return response.json();
      })
      .then((data) => {
        if (active && data?.ok && typeof data.url === 'string') setSrc(data.url);
      })
      .catch(() => {
        if (active) setSrc('');
      });

    return () => {
      active = false;
    };
  }, []);

  if (!src) {
    return (
      <div
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

  return (
    <video
      src={src}
      controls
      playsInline
      preload="metadata"
      aria-label="Vídeo de presentación de GHC Academy"
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
