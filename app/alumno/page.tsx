'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const neon = '#00FF41';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function AlumnoPage() {
  const router = useRouter();

  const [checkingSession, setCheckingSession] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    async function checkSession() {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        router.replace('/login');
        return;
      }

      setUserEmail(data.user.email || '');
      setFullName(
        data.user.user_metadata?.full_name ||
          data.user.email ||
          'Alumno GHC Academy'
      );

      setCheckingSession(false);
    }

    checkSession();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (checkingSession) {
    return (
      <main style={pageStyle}>
        <section style={loadingCardStyle}>
          <p style={kickerStyle}>GHC Academy</p>
          <h1 style={titleStyle}>Verificando acceso</h1>
          <p style={textStyle}>
            Estamos comprobando tu sesión antes de entrar al portal del alumno.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <header style={topBarStyle}>
        <div>
          <p style={kickerStyle}>Portal del alumno</p>
          <h1 style={headerTitleStyle}>GHC Academy</h1>
          <p style={userTextStyle}>
            Sesión activa: <strong>{fullName}</strong>
            {userEmail && <> · {userEmail}</>}
          </p>
        </div>

        <div style={actionsStyle}>
          <button onClick={() => router.push('/cursos')} style={secondaryButtonStyle}>
            Catálogo
          </button>

          <button onClick={handleLogout} style={logoutButtonStyle}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <section style={iframeShellStyle}>
        <iframe
          className="ghc-frame"
          src="/stitch-pages/alumno.html"
          title="Portal Alumno"
          style={iframeStyle}
        />
      </section>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  background:
    'radial-gradient(circle at top left, rgba(0,255,65,0.14), transparent 34%), #050706',
  minHeight: '100vh',
  color: 'white',
  fontFamily: 'Arial, Helvetica, sans-serif',
};

const topBarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '24px',
  padding: '24px 28px',
  borderBottom: '1px solid rgba(0,255,65,0.22)',
  background: 'rgba(0,0,0,0.62)',
  backdropFilter: 'blur(18px)',
};

const kickerStyle: React.CSSProperties = {
  margin: '0 0 6px',
  color: neon,
  fontSize: '11px',
  fontWeight: 950,
  letterSpacing: '0.28em',
  textTransform: 'uppercase',
};

const headerTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '28px',
  lineHeight: 1,
  fontWeight: 950,
  textTransform: 'uppercase',
  letterSpacing: '-0.03em',
};

const userTextStyle: React.CSSProperties = {
  margin: '8px 0 0',
  color: 'rgba(255,255,255,0.64)',
  fontSize: '13px',
  lineHeight: 1.5,
};

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
};

const secondaryButtonStyle: React.CSSProperties = {
  border: '1px solid rgba(0,255,65,0.38)',
  background: 'rgba(0,255,65,0.08)',
  color: neon,
  borderRadius: '999px',
  padding: '12px 16px',
  fontSize: '12px',
  fontWeight: 950,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};

const logoutButtonStyle: React.CSSProperties = {
  border: 'none',
  background: neon,
  color: '#000',
  borderRadius: '999px',
  padding: '12px 16px',
  fontSize: '12px',
  fontWeight: 950,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  boxShadow: '0 0 28px rgba(0,255,65,0.28)',
};

const iframeShellStyle: React.CSSProperties = {
  height: 'calc(100vh - 106px)',
  overflow: 'hidden',
};

const iframeStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  border: 0,
  display: 'block',
  background: '#050706',
};

const loadingCardStyle: React.CSSProperties = {
  width: 'min(620px, calc(100% - 48px))',
  margin: '0 auto',
  transform: 'translateY(32vh)',
  borderRadius: '32px',
  border: '1px solid rgba(0,255,65,0.32)',
  background: 'linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.025))',
  padding: '34px',
  boxShadow: '0 0 80px rgba(0,255,65,0.10)',
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 'clamp(36px, 6vw, 68px)',
  lineHeight: '0.95',
  fontWeight: 950,
  textTransform: 'uppercase',
  letterSpacing: '-0.04em',
};

const textStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.66)',
  fontSize: '15px',
  lineHeight: 1.75,
  marginTop: '18px',
};
