'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/acceso');
  }, [router]);

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#050706',
        color: '#00FF41',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontWeight: 900,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
      }}
    >
      Redirigiendo al acceso alumno...
    </main>
  );
}
