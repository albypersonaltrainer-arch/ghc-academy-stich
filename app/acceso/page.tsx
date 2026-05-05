'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const neon = '#00FF41';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function AccesoPage() {
  const router = useRouter();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [checking, setChecking] = useState(true);
  const [sessionEmail, setSessionEmail] = useState('');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const isRegister = mode === 'register';

  useEffect(() => {
    async function checkSession() {
      try {
        const { data } = await supabase.auth.getUser();

        if (data.user) {
          setSessionEmail(data.user.email || '');
        }

        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          if (params.get('confirmed') === '1') {
            setMessage('Email confirmado correctamente. Ya puedes iniciar sesión.');
            setMode('login');
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setChecking(false);
      }
    }

    checkSession();
  }, []);

  const getRedirectUrl = () => {
    if (typeof window === 'undefined') {
      return 'https://ghc-academy-stich.vercel.app/acceso?confirmed=1';
    }

    return `${window.location.origin}/acceso?confirmed=1`;
  };

  const resetMessages = () => {
    setMessage('');
    setErrorMessage('');
  };

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setSessionEmail('');
    setMessage('Sesión cerrada correctamente.');
    setLoading(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);
    setMessage('');
    setErrorMessage('');

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();
    const cleanFullName = fullName.trim();

    if (!cleanEmail || !cleanPassword) {
      setErrorMessage('Introduce email y contraseña.');
      setLoading(false);
      return;
    }

    if (isRegister && !cleanFullName) {
      setErrorMessage('Introduce tu nombre completo.');
      setLoading(false);
      return;
    }

    if (isRegister) {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          emailRedirectTo: getRedirectUrl(),
          data: {
            full_name: cleanFullName,
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      if (data.user && !data.session) {
        setMessage('Cuenta creada. Revisa tu email para confirmar el acceso.');
        setLoading(false);
        return;
      }

      setSessionEmail(data.user?.email || cleanEmail);
      setMessage('Cuenta creada correctamente. Entrando al portal...');
      setLoading(false);

      setTimeout(() => {
        router.push('/alumno');
      }, 700);

      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPassword,
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setSessionEmail(data.user?.email || cleanEmail);
    setMessage('Acceso correcto. Entrando al portal...');
    setLoading(false);

    setTimeout(() => {
      router.push('/alumno');
    }, 700);
  };

  if (checking) {
    return (
      <main style={pageStyle}>
        <section style={centerCardStyle}>
          <p style={kickerStyle}>GHC Academy</p>
          <h1 style={titleStyle}>Comprobando acceso</h1>
          <p style={textStyle}>Estamos verificando tu sesión.</p>
        </section>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <Link href="/cursos" style={backButton}>
          ← Volver al catálogo
        </Link>

        <section style={layoutStyle}>
          <div style={infoCardStyle}>
            <p style={kickerStyle}>GHC Academy · Sport Through Science</p>

            <h1 style={titleStyle}>Acceso alumno</h1>

            <p style={subtitleStyle}>
              Accede a tu área privada para guardar progreso real, aprobar módulos, desbloquear
              certificados y continuar tu formación desde cualquier sesión autorizada.
            </p>

            <div style={featuresStyle}>
              <div style={featureStyle}>
                <strong>Progreso real</strong>
                <span>Lecciones, módulos y exámenes asociados a tu cuenta.</span>
              </div>

              <div style={featureStyle}>
                <strong>Certificación</strong>
                <span>Credenciales digitales verificables tras completar el curso.</span>
              </div>

              <div style={featureStyle}>
                <strong>Acceso protegido</strong>
                <span>Base preparada para pagos, permisos y seguridad premium.</span>
              </div>
            </div>
          </div>

          <div style={formCardStyle}>
            {sessionEmail ? (
              <section style={sessionPanelStyle}>
                <p style={kickerStyle}>Sesión activa</p>

                <h2 style={panelTitleStyle}>Ya estás dentro</h2>

                <p style={textStyle}>
                  Sesión iniciada con:
                  <br />
                  <strong style={{ color: neon }}>{sessionEmail}</strong>
                </p>

                <button
                  type="button"
                  onClick={() => router.push('/alumno')}
                  disabled={loading}
                  style={primaryButtonStyle}
                >
                  Ir al portal del alumno
                </button>

                <button
                  type="button"
                  onClick={() => router.push('/cursos')}
                  disabled={loading}
                  style={secondaryButtonStyle}
                >
                  Ir al catálogo
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loading}
                  style={dangerButtonStyle}
                >
                  Cerrar sesión
                </button>

                {message && <div style={successBoxStyle}>{message}</div>}
              </section>
            ) : (
              <>
                <div style={tabsStyle}>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      resetMessages();
                    }}
                    style={mode === 'login' ? activeTabStyle : tabStyle}
                  >
                    Iniciar sesión
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      resetMessages();
                    }}
                    style={mode === 'register' ? activeTabStyle : tabStyle}
                  >
                    Crear cuenta
                  </button>
                </div>

                <form onSubmit={handleSubmit} style={formStyle}>
                  {isRegister && (
                    <label style={labelStyle}>
                      Nombre completo
                      <input
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        placeholder="Ej: Alby"
                        style={inputStyle}
                      />
                    </label>
                  )}

                  <label style={labelStyle}>
                    Email
                    <input
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="tu@email.com"
                      type="email"
                      autoComplete="email"
                      style={inputStyle}
                    />
                  </label>

                  <label style={labelStyle}>
                    Contraseña
                    <input
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      type="password"
                      autoComplete={isRegister ? 'new-password' : 'current-password'}
                      style={inputStyle}
                    />
                  </label>

                  {errorMessage && <div style={errorBoxStyle}>{errorMessage}</div>}
                  {message && <div style={successBoxStyle}>{message}</div>}

                  <button type="submit" disabled={loading} style={primaryButtonStyle}>
                    {loading
                      ? 'Procesando...'
                      : isRegister
                        ? 'Crear cuenta'
                        : 'Entrar en la academia'}
                  </button>
                </form>

                <p style={helperStyle}>
                  Esta pantalla usa Supabase Auth. Si acabas de crear cuenta, confirma el email y
                  vuelve a iniciar sesión.
                </p>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background:
    'radial-gradient(circle at top left, rgba(0,255,65,0.18), transparent 34%), radial-gradient(circle at bottom right, rgba(0,255,65,0.10), transparent 30%), #030504',
  color: 'white',
  padding: '32px',
  fontFamily: 'Arial, Helvetica, sans-serif',
};

const containerStyle: React.CSSProperties = {
  maxWidth: '1180px',
  margin: '0 auto',
};

const centerCardStyle: React.CSSProperties = {
  maxWidth: '620px',
  margin: '22vh auto 0',
  borderRadius: '34px',
  border: '1px solid rgba(0,255,65,0.30)',
  background: 'linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.025))',
  padding: '34px',
};

const backButton: React.CSSProperties = {
  display: 'inline-block',
  marginBottom: '28px',
  color: neon,
  border: '1px solid rgba(0,255,65,0.45)',
  padding: '12px 16px',
  borderRadius: '999px',
  textDecoration: 'none',
  fontSize: '12px',
  fontWeight: 900,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
};

const layoutStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.1fr) minmax(360px, 0.9fr)',
  gap: '26px',
  alignItems: 'stretch',
};

const infoCardStyle: React.CSSProperties = {
  borderRadius: '36px',
  border: '1px solid rgba(0,255,65,0.28)',
  background: 'linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.025))',
  padding: '34px',
  boxShadow: '0 0 80px rgba(0,255,65,0.10)',
};

const formCardStyle: React.CSSProperties = {
  borderRadius: '36px',
  border: '1px solid rgba(0,255,65,0.28)',
  background: 'linear-gradient(145deg, rgba(0,255,65,0.10), rgba(255,255,255,0.035))',
  padding: '26px',
  boxShadow: '0 0 80px rgba(0,255,65,0.10)',
};

const kickerStyle: React.CSSProperties = {
  color: neon,
  fontSize: '12px',
  letterSpacing: '0.34em',
  fontWeight: 900,
  textTransform: 'uppercase',
  margin: '0 0 16px',
};

const titleStyle: React.CSSProperties = {
  fontSize: 'clamp(48px, 7vw, 86px)',
  lineHeight: '0.9',
  fontWeight: 950,
  letterSpacing: '-0.05em',
  textTransform: 'uppercase',
  margin: 0,
};

const panelTitleStyle: React.CSSProperties = {
  margin: '0 0 14px',
  fontSize: '34px',
  lineHeight: '1',
  fontWeight: 950,
  textTransform: 'uppercase',
};

const subtitleStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.70)',
  fontSize: '17px',
  lineHeight: 1.7,
  margin: '24px 0 0',
};

const textStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.66)',
  fontSize: '15px',
  lineHeight: 1.75,
};

const featuresStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: '14px',
  marginTop: '34px',
};

const featureStyle: React.CSSProperties = {
  borderRadius: '22px',
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(0,0,0,0.28)',
  padding: '18px',
  display: 'grid',
  gap: '8px',
  color: 'rgba(255,255,255,0.62)',
  fontSize: '13px',
  lineHeight: 1.6,
};

const tabsStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '10px',
  marginBottom: '20px',
};

const tabStyle: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(0,0,0,0.32)',
  color: 'rgba(255,255,255,0.68)',
  borderRadius: '16px',
  padding: '13px',
  fontSize: '12px',
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  cursor: 'pointer',
};

const activeTabStyle: React.CSSProperties = {
  ...tabStyle,
  border: '1px solid rgba(0,255,65,0.60)',
  background: 'rgba(0,255,65,0.16)',
  color: neon,
};

const formStyle: React.CSSProperties = {
  display: 'grid',
  gap: '16px',
};

const labelStyle: React.CSSProperties = {
  display: 'grid',
  gap: '8px',
  color: neon,
  fontSize: '12px',
  fontWeight: 950,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: '18px',
  border: '1px solid rgba(0,255,65,0.24)',
  background: 'rgba(0,0,0,0.38)',
  color: 'white',
  padding: '16px 18px',
  outline: 'none',
  fontSize: '15px',
  fontWeight: 700,
};

const primaryButtonStyle: React.CSSProperties = {
  width: '100%',
  border: 'none',
  borderRadius: '18px',
  background: neon,
  color: '#000',
  padding: '17px',
  fontSize: '13px',
  fontWeight: 950,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  boxShadow: '0 0 30px rgba(0,255,65,0.32)',
};

const secondaryButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  background: 'rgba(0,255,65,0.10)',
  color: neon,
  border: '1px solid rgba(0,255,65,0.40)',
};

const dangerButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  background: 'rgba(255,80,80,0.16)',
  color: '#ffaaaa',
  border: '1px solid rgba(255,80,80,0.45)',
};

const sessionPanelStyle: React.CSSProperties = {
  display: 'grid',
  gap: '14px',
};

const errorBoxStyle: React.CSSProperties = {
  borderRadius: '18px',
  border: '1px solid rgba(255,80,80,0.40)',
  background: 'rgba(255,80,80,0.10)',
  color: '#ffaaaa',
  padding: '14px',
  lineHeight: 1.5,
};

const successBoxStyle: React.CSSProperties = {
  borderRadius: '18px',
  border: '1px solid rgba(0,255,65,0.40)',
  background: 'rgba(0,255,65,0.10)',
  color: neon,
  padding: '14px',
  lineHeight: 1.5,
};

const helperStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.58)',
  fontSize: '13px',
  lineHeight: 1.6,
  marginTop: '20px',
};
