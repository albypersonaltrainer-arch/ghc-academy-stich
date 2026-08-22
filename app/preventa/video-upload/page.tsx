'use client';

import { ChangeEvent, useState } from 'react';

const CHUNK_SIZE = 6 * 1024 * 1024;

type UploadConfig = {
  ok: true;
  projectRef: string;
  bucket: string;
  objectPath: string;
  token: string;
};

function encodeMetadata(value: string) {
  return btoa(unescape(encodeURIComponent(value)));
}

async function uploadWithTus(file: File, config: UploadConfig, onProgress: (percent: number) => void) {
  const endpoint = `https://${config.projectRef}.storage.supabase.co/storage/v1/upload/resumable`;
  const metadata = [
    `bucketName ${encodeMetadata(config.bucket)}`,
    `objectName ${encodeMetadata(config.objectPath)}`,
    `contentType ${encodeMetadata(file.type || 'video/mp4')}`,
    `cacheControl ${encodeMetadata('3600')}`,
  ].join(',');

  const createResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Tus-Resumable': '1.0.0',
      'Upload-Length': String(file.size),
      'Upload-Metadata': metadata,
      'x-signature': config.token,
      'x-upsert': 'true',
    },
  });

  if (!createResponse.ok) {
    throw new Error(`No se pudo iniciar la subida (${createResponse.status}).`);
  }

  const location = createResponse.headers.get('Location');
  if (!location) throw new Error('Supabase no devolvió la URL resumible de subida.');
  const uploadUrl = new URL(location, endpoint).toString();

  let offset = 0;
  while (offset < file.size) {
    const chunk = file.slice(offset, Math.min(offset + CHUNK_SIZE, file.size));
    const response = await fetch(uploadUrl, {
      method: 'PATCH',
      headers: {
        'Tus-Resumable': '1.0.0',
        'Upload-Offset': String(offset),
        'Content-Type': 'application/offset+octet-stream',
        'x-signature': config.token,
      },
      body: chunk,
    });

    if (!response.ok) {
      throw new Error(`La subida se interrumpió (${response.status}).`);
    }

    const nextOffset = Number(response.headers.get('Upload-Offset'));
    offset = Number.isFinite(nextOffset) && nextOffset > offset ? nextOffset : offset + chunk.size;
    onProgress(Math.min(100, Math.round((offset / file.size) * 100)));
  }
}

export default function PreventaVideoUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Selecciona el vídeo MP4 que me acabas de pasar.');
  const [busy, setBusy] = useState(false);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] || null;
    setFile(selected);
    setProgress(0);
    setStatus(selected ? `${selected.name} · ${(selected.size / 1024 / 1024).toFixed(1)} MB` : 'Selecciona un vídeo MP4.');
  }

  async function handleUpload() {
    if (!file || busy) return;
    if (file.type && file.type !== 'video/mp4') {
      setStatus('El archivo debe ser MP4.');
      return;
    }

    setBusy(true);
    setProgress(0);
    setStatus('Preparando almacenamiento seguro…');

    try {
      const response = await fetch('/api/preventa/video-upload-url', { method: 'POST' });
      const config = (await response.json()) as UploadConfig | { ok: false; error: string };
      if (!response.ok || !config.ok) throw new Error('No se pudo preparar la subida.');

      setStatus('Subiendo vídeo original… no cierres esta pestaña.');
      await uploadWithTus(file, config, setProgress);
      setProgress(100);
      setStatus('✓ Vídeo subido correctamente. Ya puedes cerrar esta pestaña.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      setStatus(`Error: ${message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#050706', color: '#f2f4f1', display: 'grid', placeItems: 'center', padding: 24, fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <section style={{ width: 'min(100%, 720px)', border: '1px solid rgba(34,214,91,.28)', borderRadius: 24, padding: 'clamp(24px,5vw,48px)', background: '#0a0d0b', boxShadow: '0 28px 80px rgba(0,0,0,.35)' }}>
        <p style={{ margin: 0, color: '#22d65b', fontWeight: 800, fontSize: 12, letterSpacing: '.18em', textTransform: 'uppercase' }}>GHC Academy · carga puntual</p>
        <h1 style={{ margin: '14px 0 12px', fontSize: 'clamp(32px,6vw,54px)', lineHeight: 1 }}>Vídeo de la landing</h1>
        <p style={{ margin: '0 0 28px', color: '#a9afaa', lineHeight: 1.65 }}>Esta pantalla solo sirve para colocar el archivo original en el almacenamiento de GHC Academy. No modifica ni reedita el vídeo.</p>

        <label style={{ display: 'block', padding: 22, border: '1px dashed rgba(255,255,255,.22)', borderRadius: 16, cursor: busy ? 'default' : 'pointer', background: '#070907' }}>
          <strong style={{ display: 'block', marginBottom: 8 }}>Seleccionar MP4</strong>
          <input type="file" accept="video/mp4,.mp4" onChange={handleFile} disabled={busy} style={{ width: '100%' }} />
        </label>

        <div style={{ marginTop: 22, height: 10, background: '#161b17', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: '#22d65b', transition: 'width .2s ease' }} />
        </div>
        <p style={{ margin: '10px 0 0', color: '#c7ccc8', fontSize: 14 }}>{progress}% · {status}</p>

        <button type="button" onClick={handleUpload} disabled={!file || busy} style={{ width: '100%', marginTop: 26, border: 0, borderRadius: 14, padding: '16px 20px', background: file && !busy ? '#22d65b' : '#263027', color: file && !busy ? '#041006' : '#89928b', fontWeight: 900, fontSize: 16, cursor: file && !busy ? 'pointer' : 'default' }}>
          {busy ? 'Subiendo…' : 'Subir vídeo original'}
        </button>
      </section>
    </main>
  );
}
