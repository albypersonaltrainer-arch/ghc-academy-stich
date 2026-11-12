'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const panel: React.CSSProperties = {
  maxWidth: 520, margin: '8vh auto 40px', padding: 30,
  border: '1px solid #285b3d', borderRadius: 18, background: '#101914',
};
const field: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', marginTop: 8, padding: '13px 14px',
  border: '1px solid #557260', borderRadius: 8, background: '#0b130e', color: '#ffffff',
  fontSize: 16,
};
const button: React.CSSProperties = {
  border: 0, borderRadius: 8, padding: '13px 16px', marginTop: 20,
  background: '#22c55e', color: '#041009', fontWeight: 800, cursor: 'pointer', width: '100%',
};
const notice: React.CSSProperties = {color: '#b8dac1', fontSize: 14, lineHeight: 1.5};

export default function RecuperarAccesoPage() {
  const [mode, setMode] = useState<'request' | 'change'>('request');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [recoveryReady, setRecoveryReady] = useState(false);

  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' && session) {
        setMode('change');
        setRecoveryReady(true);
      }
    });
    void supabase.auth.getSession().then(({data, error: sessionError}) => {
      if (!active) return;
      const resetReturn = new URLSearchParams(window.location.search).get('mode') === 'reset';
      if (!sessionError && data.session && resetReturn) {
        setMode('change');
        setRecoveryReady(true);
      } else if (resetReturn) {
        setMode('change');
        setRecoveryReady(false);
      }
    });
    return () => {active = false; subscription.unsubscribe();};
  }, []);

  async function requestRecovery(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    setBusy(true); setError(''); setSent(false);
    const redirectTo = `${window.location.origin}/recuperar-acceso?mode=reset`;
    const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {redirectTo}
    );
    if (recoveryError) setError('No ha sido posible solicitar el correo: ' + recoveryError.message);
    else setSent(true);
    setBusy(false);
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    if (!recoveryReady) return;
    if (password.length < 12 || !/[a-z]/i.test(password) || !/[0-9]/.test(password) || !/[^a-z0-9]/i.test(password)) {
      setError('Usa al menos 12 caracteres, incluyendo letras, números y un símbolo.');
      return;
    }
    if (password !== confirmPassword) {setError('Las contraseñas no coinciden.'); return;}
    setBusy(true); setError('');
    const {error: updateError} = await supabase.auth.updateUser({password});
    if (updateError) setError('No se ha podido cambiar la contraseña: ' + updateError.message);
    else {
      setSaved(true); setPassword(''); setConfirmPassword('');
      await supabase.auth.signOut({scope: 'local'});
    }
    setBusy(false);
  }

  return (
    <main style={{minHeight:'100vh',background:'#050a07',color:'#f2faf3',padding:'1px 16px',fontFamily:'Arial, sans-serif'}}>
      <section style={panel}>
        <p style={{color:'#22c55e',textTransform:'uppercase',letterSpacing:'.12em',fontSize:12,fontWeight:800}}>
          GHC Academy · Acceso seguro
        </p>
        <h1 style={{fontSize:27,marginBottom:10}}>{mode === 'request' ? 'Recuperar contraseña' : 'Establecer contraseña nueva'}</h1>
        {mode === 'request' ? (
          <>
            <p style={notice}>Introduce el correo asociado a tu cuenta de GHC Academy. Te enviaremos un enlace de recuperación. No necesitas recordar la clave anterior.</p>
            {sent ? <p role="status" style={notice}>Solicitud realizada. Si el correo pertenece a una cuenta registrada y el envío está disponible, recibirás un enlace. Revisa también la carpeta de spam.</p> :
              <form onSubmit={requestRecovery}>
                <label>Correo de acceso
                  <input style={field} type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} />
                </label>
                <button style={button} disabled={busy}>{busy ? 'Enviando…' : 'Enviar enlace de recuperación'}</button>
              </form>}
          </>
        ) : saved ? (
          <><p role="status" style={notice}>Contraseña actualizada correctamente. Ahora puedes entrar con tu correo y la nueva contraseña.</p><Link href="/acceso" style={{color:'#22c55e'}}>Ir a iniciar sesión</Link></>
        ) : recoveryReady ? (
          <form onSubmit={changePassword}>
            <p style={notice}>El enlace se ha verificado. Elige una contraseña nueva; no la compartas por chat.</p>
            <label>Contraseña nueva
              <input type="password" autoComplete="new-password" style={field} required minLength={12} value={password} onChange={e=>setPassword(e.target.value)} />
            </label>
            <label style={{display:'block',marginTop:16}}>Repetir contraseña
              <input type="password" autoComplete="new-password" style={field} required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} />
            </label>
            <button style={button} disabled={busy}>{busy ? 'Guardando…' : 'Cambiar contraseña'}</button>
          </form>
        ) : <p style={notice}>No hay un enlace de recuperación válido en esta sesión. Vuelve a solicitarlo desde esta página.</p>}
        {error && <p role="alert" style={{color:'#ff9e9e',fontSize:14}}>{error}</p>}
        <p style={{marginTop:28,fontSize:13}}><Link href="/acceso" style={{color:'#22c55e'}}>Volver a iniciar sesión</Link></p>
      </section>
    </main>
  );
}
