'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import GHCLogo from '../../components/GHCLogo'
import styles from './SecurityConsole.module.css'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

type AnyRecord = Record<string, any>
type GuardState = 'checking' | 'allowed' | 'denied'

type SecurityOverview = {
  active_sessions_30m?: number
  users_with_3plus_sessions_30m?: number
  security_events_24h?: number
  high_or_critical_events_24h?: number
}

function formatWhen(value: unknown) {
  const date = new Date(String(value || ''))
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short',
    timeStyle: 'medium'
  }).format(date)
}

function shortId(value: unknown) {
  const text = String(value || '')
  return text ? `${text.slice(0, 8)}…${text.slice(-6)}` : '—'
}

function severityLabel(value: unknown) {
  const severity = String(value || 'info').toLowerCase()
  if (severity === 'critical') return 'CRÍTICO'
  if (severity === 'high') return 'ALTO'
  if (severity === 'medium') return 'MEDIO'
  if (severity === 'low') return 'BAJO'
  return 'INFO'
}

function eventLabel(value: unknown) {
  const event = String(value || '')
  if (event === 'academy.concurrent_sessions_detected') return 'Sesiones concurrentes detectadas'
  if (event.startsWith('academy.audit.')) {
    return event
      .replace('academy.audit.', '')
      .replaceAll('.', ' · ')
      .replaceAll('_', ' ')
  }
  return event || 'Evento de seguridad'
}

export default function SecurityConsolePage() {
  const router = useRouter()
  const [guard, setGuard] = useState<GuardState>('checking')
  const [profile, setProfile] = useState<AnyRecord | null>(null)
  const [overview, setOverview] = useState<SecurityOverview>({})
  const [events, setEvents] = useState<AnyRecord[]>([])
  const [sessions, setSessions] = useState<AnyRecord[]>([])
  const [currentLevel, setCurrentLevel] = useState<string | null>(null)
  const [verifiedFactors, setVerifiedFactors] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const loadSecurity = useCallback(async () => {
    setBusy(true)
    setError('')

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      const user = userData?.user
      if (userError || !user) {
        router.replace('/acceso')
        return
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('id', user.id)
        .maybeSingle()

      const role = String(profileData?.role || '').toLowerCase()
      if (profileError || !['admin', 'superadmin', 'owner'].includes(role)) {
        setGuard('denied')
        router.replace('/alumno')
        return
      }

      setProfile(profileData || null)
      setGuard('allowed')

      const [aalResult, factorResult] = await Promise.all([
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.auth.mfa.listFactors()
      ])

      if (!aalResult.error) setCurrentLevel(aalResult.data?.currentLevel || null)
      if (!factorResult.error) {
        const verified = (factorResult.data?.totp || []).filter((factor) => factor.status === 'verified').length
        setVerifiedFactors(verified)
      }

      const [overviewResult, eventsResult, sessionsResult] = await Promise.all([
        supabase.rpc('ghc_admin_get_security_overview'),
        supabase.rpc('ghc_admin_list_security_events', { p_limit: 100 }),
        supabase.rpc('ghc_admin_list_security_sessions', { p_limit: 100 })
      ])

      const firstError = overviewResult.error || eventsResult.error || sessionsResult.error
      if (firstError) {
        const needsMfa = verifiedFactors > 0 || factorResult.data?.totp?.some((factor) => factor.status === 'verified')
        if (needsMfa && aalResult.data?.currentLevel !== 'aal2') {
          setError('Tu cuenta tiene MFA activado y esta sesión todavía no está elevada a AAL2. Verifica el segundo factor para abrir la consola de seguridad.')
          return
        }
        throw firstError
      }

      setOverview((overviewResult.data || {}) as SecurityOverview)
      setEvents(Array.isArray(eventsResult.data) ? eventsResult.data : [])
      setSessions(Array.isArray(sessionsResult.data) ? sessionsResult.data : [])
    } catch (loadError: any) {
      setError(loadError?.message || 'No se pudo cargar la consola de seguridad.')
    } finally {
      setBusy(false)
    }
  }, [router, verifiedFactors])

  useEffect(() => {
    void loadSecurity()
  }, [loadSecurity])

  const suspiciousUsers = useMemo(() => {
    const grouped = new Map<string, AnyRecord[]>()
    for (const session of sessions) {
      const userId = String(session.user_id || '')
      if (!userId) continue
      const current = grouped.get(userId) || []
      current.push(session)
      grouped.set(userId, current)
    }
    return Array.from(grouped.entries())
      .filter(([, userSessions]) => userSessions.length >= 3)
      .map(([userId, userSessions]) => ({ userId, count: userSessions.length }))
  }, [sessions])

  if (guard === 'checking') {
    return <main className={styles.page}><section className={styles.shell}><p>Verificando permisos de seguridad…</p></section></main>
  }

  if (guard !== 'allowed') return null

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <GHCLogo size="md" showText tagline={false} />
            <div>
              <span>GHC Control Center</span>
              <h1>Seguridad y auditoría</h1>
              <p>Sesiones, accesos, MFA y trazabilidad de cambios críticos.</p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <button type="button" className={styles.secondary} onClick={() => router.push('/ghc-control-center')}>Control Center</button>
            <button type="button" onClick={() => router.push('/ghc-control-center/mfa')}>Configurar MFA</button>
            <button type="button" onClick={() => void loadSecurity()} disabled={busy}>{busy ? 'Actualizando…' : 'Actualizar'}</button>
          </div>
        </header>

        {error && (
          <div className={styles.errorBox}>
            <strong>Acción requerida</strong>
            <p>{error}</p>
            {verifiedFactors > 0 && currentLevel !== 'aal2' && (
              <button type="button" onClick={() => router.push('/ghc-control-center/mfa')}>Verificar MFA</button>
            )}
          </div>
        )}

        <section className={styles.stats}>
          <article><span>Sesiones activas · 30 min</span><strong>{Number(overview.active_sessions_30m || 0)}</strong><small>Academy registrada</small></article>
          <article><span>Usuarios con ≥3 sesiones</span><strong>{Number(overview.users_with_3plus_sessions_30m || 0)}</strong><small>Revisión recomendada</small></article>
          <article><span>Eventos · 24 h</span><strong>{Number(overview.security_events_24h || 0)}</strong><small>Audit log</small></article>
          <article><span>Alta criticidad · 24 h</span><strong>{Number(overview.high_or_critical_events_24h || 0)}</strong><small>High + critical</small></article>
        </section>

        <section className={styles.securityStrip}>
          <div>
            <span>Administrador actual</span>
            <strong>{profile?.full_name || profile?.email || 'Admin GHC'}</strong>
          </div>
          <div>
            <span>MFA TOTP</span>
            <strong className={verifiedFactors > 0 ? styles.good : styles.warn}>{verifiedFactors > 0 ? 'CONFIGURADO' : 'PENDIENTE'}</strong>
          </div>
          <div>
            <span>Assurance Level</span>
            <strong className={currentLevel === 'aal2' ? styles.good : styles.warn}>{currentLevel?.toUpperCase() || 'AAL1'}</strong>
          </div>
          <div>
            <span>Detección cuentas compartidas</span>
            <strong className={suspiciousUsers.length ? styles.warn : styles.good}>{suspiciousUsers.length ? `${suspiciousUsers.length} REVISAR` : 'SIN ALERTAS'}</strong>
          </div>
        </section>

        <section className={styles.grid}>
          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <div><span>Actividad reciente</span><h2>Eventos de seguridad</h2></div>
              <small>{events.length} mostrados</small>
            </div>
            <div className={styles.tableWrap}>
              <table>
                <thead><tr><th>Fecha</th><th>Severidad</th><th>Evento</th><th>Actor</th><th>Objeto</th></tr></thead>
                <tbody>
                  {events.length ? events.map((event) => (
                    <tr key={String(event.id)}>
                      <td>{formatWhen(event.occurred_at)}</td>
                      <td><span className={`${styles.severity} ${styles[`severity_${String(event.severity || 'info').toLowerCase()}`] || ''}`}>{severityLabel(event.severity)}</span></td>
                      <td>{eventLabel(event.event_type)}</td>
                      <td title={String(event.actor_user_id || '')}>{shortId(event.actor_user_id)}</td>
                      <td>{String(event.object_type || '—')} · {shortId(event.object_id)}</td>
                    </tr>
                  )) : <tr><td colSpan={5} className={styles.empty}>Todavía no hay eventos registrados.</td></tr>}
                </tbody>
              </table>
            </div>
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <div><span>Consumo Academy</span><h2>Sesiones registradas</h2></div>
              <small>{sessions.length} mostradas</small>
            </div>
            <div className={styles.tableWrap}>
              <table>
                <thead><tr><th>Última actividad</th><th>Usuario</th><th>IP</th><th>AAL</th><th>Sesión</th></tr></thead>
                <tbody>
                  {sessions.length ? sessions.map((session) => (
                    <tr key={String(session.session_id)}>
                      <td>{formatWhen(session.last_seen_at)}</td>
                      <td title={String(session.user_id || '')}>{shortId(session.user_id)}</td>
                      <td>{String(session.ip || '—')}</td>
                      <td>{String(session.aal || 'aal1').toUpperCase()}</td>
                      <td title={String(session.session_id || '')}>{shortId(session.session_id)}</td>
                    </tr>
                  )) : <tr><td colSpan={5} className={styles.empty}>Las sesiones aparecerán al entrar alumnos en Academy.</td></tr>}
                </tbody>
              </table>
            </div>
          </article>
        </section>

        <footer className={styles.note}>
          <strong>Política actual:</strong> tres o más sesiones activas en 30 minutos generan una alerta para revisión, pero no bloquean automáticamente al alumno. El bloqueo puede activarse más adelante con una política comercial explícita.
        </footer>
      </section>
    </main>
  )
}
