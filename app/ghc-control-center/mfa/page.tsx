'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import GHCLogo from '../../components/GHCLogo'
import styles from './MfaAdmin.module.css'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

type GuardState = 'checking' | 'allowed' | 'denied'
type Factor = { id: string; status?: string; friendly_name?: string; factor_type?: string }

export default function AdminMfaPage() {
  const router = useRouter()
  const [guard, setGuard] = useState<GuardState>('checking')
  const [email, setEmail] = useState('')
  const [factors, setFactors] = useState<Factor[]>([])
  const [currentLevel, setCurrentLevel] = useState<string | null>(null)
  const [nextLevel, setNextLevel] = useState<string | null>(null)
  const [factorId, setFactorId] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const verifiedTotp = useMemo(
    () => factors.find((factor) => factor.status === 'verified'),
    [factors]
  )

  async function refreshSecurityState() {
    const [factorResult, aalResult] = await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    ])

    if (factorResult.error) throw factorResult.error
    if (aalResult.error) throw aalResult.error

    setFactors((factorResult.data?.totp || []) as Factor[])
    setCurrentLevel(aalResult.data?.currentLevel || null)
    setNextLevel(aalResult.data?.nextLevel || null)
  }

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser()
        const user = userData?.user
        if (userError || !user) {
          router.replace('/acceso')
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        const role = String(profile?.role || '').toLowerCase()
        if (profileError || !['admin', 'superadmin', 'owner'].includes(role)) {
          if (active) setGuard('denied')
          router.replace('/alumno')
          return
        }

        if (!active) return
        setEmail(String(user.email || ''))
        setGuard('allowed')
        await refreshSecurityState()
      } catch (loadError: any) {
        if (active) {
          setError(loadError?.message || 'No se pudo comprobar el estado MFA.')
          setGuard('denied')
        }
      }
    }

    void load()
    return () => { active = false }
  }, [router])

  async function beginEnrollment() {
    try {
      setBusy(true)
      setError('')
      setMessage('')

      const existingUnverified = factors.find((factor) => factor.status !== 'verified')
      if (existingUnverified?.id) {
        await supabase.auth.mfa.unenroll({ factorId: existingUnverified.id })
      }

      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'GHC Academy Admin'
      })
      if (enrollError) throw enrollError

      setFactorId(data.id)
      setQrCode(data.totp.qr_code)
      setSecret(data.totp.secret)
      setCode('')
      setMessage('Escanea el QR con tu app de autenticación y confirma un código de 6 dígitos.')
    } catch (enrollError: any) {
      setError(enrollError?.message || 'No se pudo iniciar la configuración MFA.')
    } finally {
      setBusy(false)
    }
  }

  async function verifyEnrollment() {
    if (!factorId || code.trim().length < 6) return

    try {
      setBusy(true)
      setError('')
      const challenge = await supabase.auth.mfa.challenge({ factorId })
      if (challenge.error) throw challenge.error

      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: code.trim()
      })
      if (verify.error) throw verify.error

      setQrCode('')
      setSecret('')
      setFactorId('')
      setCode('')
      setMessage('MFA activado. Esta sesión administrativa ya está protegida con AAL2.')
      await refreshSecurityState()
    } catch (verifyError: any) {
      setError(verifyError?.message || 'El código no pudo verificarse.')
    } finally {
      setBusy(false)
    }
  }

  async function verifyExistingFactor() {
    if (!verifiedTotp?.id || code.trim().length < 6) return

    try {
      setBusy(true)
      setError('')
      const challenge = await supabase.auth.mfa.challenge({ factorId: verifiedTotp.id })
      if (challenge.error) throw challenge.error

      const verify = await supabase.auth.mfa.verify({
        factorId: verifiedTotp.id,
        challengeId: challenge.data.id,
        code: code.trim()
      })
      if (verify.error) throw verify.error

      setCode('')
      setMessage('Segundo factor verificado. Ya puedes volver al Control Center.')
      await refreshSecurityState()
    } catch (verifyError: any) {
      setError(verifyError?.message || 'No se pudo elevar la sesión a AAL2.')
    } finally {
      setBusy(false)
    }
  }

  if (guard === 'checking') {
    return <main className={styles.page}><section className={styles.card}><p>Comprobando seguridad administrativa…</p></section></main>
  }

  if (guard !== 'allowed') return null

  const needsChallenge = verifiedTotp && currentLevel !== 'aal2' && nextLevel === 'aal2'

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.head}>
          <GHCLogo size="md" showText tagline={false} />
          <div>
            <span>GHC Control Center · Seguridad</span>
            <h1>Autenticación de dos factores</h1>
            <p>Cuenta administrativa: {email}</p>
          </div>
        </div>

        <div className={styles.statusGrid}>
          <div><span>Factor TOTP</span><strong>{verifiedTotp ? 'ACTIVO' : 'NO CONFIGURADO'}</strong></div>
          <div><span>Sesión actual</span><strong>{currentLevel === 'aal2' ? 'AAL2 · PROTEGIDA' : 'AAL1'}</strong></div>
          <div><span>Siguiente nivel</span><strong>{nextLevel || 'aal1'}</strong></div>
        </div>

        <div className={styles.notice}>
          En GHC Academy el MFA es progresivo: mientras no exista un factor verificado no te bloquea. En cuanto lo actives, las operaciones administrativas protegidas exigirán AAL2 automáticamente.
        </div>

        {error && <div className={styles.error}>{error}</div>}
        {message && <div className={styles.success}>{message}</div>}

        {!verifiedTotp && !qrCode && (
          <div className={styles.actionBlock}>
            <h2>Activar TOTP</h2>
            <p>Compatible con Google Authenticator, Microsoft Authenticator, Authy, 1Password y cualquier app TOTP estándar.</p>
            <button type="button" onClick={beginEnrollment} disabled={busy}>{busy ? 'Preparando…' : 'Configurar segundo factor'}</button>
          </div>
        )}

        {qrCode && (
          <div className={styles.enrollGrid}>
            <div className={styles.qrWrap}><img src={qrCode} alt="QR para configurar TOTP" /></div>
            <div>
              <h2>Escanea y verifica</h2>
              <p>Si no puedes escanear el QR, introduce manualmente este secreto en tu app:</p>
              <code>{secret}</code>
              <label>
                <span>Código de 6 dígitos</span>
                <input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 8))} />
              </label>
              <button type="button" onClick={verifyEnrollment} disabled={busy || code.length < 6}>{busy ? 'Verificando…' : 'Activar y verificar'}</button>
            </div>
          </div>
        )}

        {needsChallenge && (
          <div className={styles.actionBlock}>
            <h2>Verificar esta sesión</h2>
            <p>Tu cuenta ya tiene MFA, pero esta sesión todavía está en AAL1. Introduce el código actual de tu autenticador.</p>
            <label>
              <span>Código de 6 dígitos</span>
              <input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 8))} />
            </label>
            <button type="button" onClick={verifyExistingFactor} disabled={busy || code.length < 6}>{busy ? 'Verificando…' : 'Elevar sesión a AAL2'}</button>
          </div>
        )}

        {verifiedTotp && currentLevel === 'aal2' && (
          <div className={styles.protected}>
            <strong>✓ Administración protegida con MFA</strong>
            <p>Esta sesión ha verificado contraseña + segundo factor.</p>
          </div>
        )}

        <div className={styles.footerActions}>
          <button type="button" className={styles.secondary} onClick={() => router.push('/ghc-control-center?tab=seguridad')}>Volver a Seguridad</button>
        </div>
      </section>
    </main>
  )
}
