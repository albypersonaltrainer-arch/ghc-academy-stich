'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import GHCLogo from '../../components/GHCLogo'
import styles from './access.module.css'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

type AnyRecord = Record<string, any>

const ENTITLEMENT_LABEL: Record<string, string> = {
  payment_pending: 'Pago pendiente',
  pending_activation: 'Pagado · pendiente de activar',
  active: 'Activo',
  revoked: 'Revocado'
}

function money(cents: unknown, currency = 'EUR') {
  const value = Number(cents || 0) / 100
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(value)
}

export default function AdminAccessPage() {
  const router = useRouter()
  const [entitlements, setEntitlements] = useState<AnyRecord[]>([])
  const [accessRows, setAccessRows] = useState<AnyRecord[]>([])
  const [courses, setCourses] = useState<AnyRecord[]>([])
  const [profiles, setProfiles] = useState<AnyRecord[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Record<string, string>>({})
  const [manualUser, setManualUser] = useState('')
  const [manualCourse, setManualCourse] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      router.replace('/acceso')
      return
    }

    const [entitlementResult, accessResult, courseResult, profileResult] = await Promise.all([
      supabase.rpc('ghc_admin_list_entitlements'),
      supabase.from('course_access').select('*').order('updated_at', { ascending: false }),
      supabase.from('courses').select('id,title,slug,status').order('title'),
      supabase.from('profiles').select('id,full_name,email,role').order('email')
    ])

    if (entitlementResult.error) throw new Error(entitlementResult.error.message)
    if (accessResult.error) throw new Error(accessResult.error.message)
    if (courseResult.error) throw new Error(courseResult.error.message)
    if (profileResult.error) throw new Error(profileResult.error.message)

    const nextProfiles = (profileResult.data || []).filter((profile: AnyRecord) => !['admin','owner','superadmin'].includes(String(profile.role || '').toLowerCase()))
    setEntitlements(Array.isArray(entitlementResult.data) ? entitlementResult.data : [])
    setAccessRows(accessResult.data || [])
    setCourses(courseResult.data || [])
    setProfiles(nextProfiles)
    setManualUser((current) => current || String(nextProfiles[0]?.id || ''))
    setManualCourse((current) => current || String(courseResult.data?.[0]?.id || ''))
  }

  useEffect(() => {
    load()
      .catch((loadError) => setError(loadError?.message || 'No se pudo cargar Pagos y accesos.'))
      .finally(() => setLoading(false))
  }, [])

  const stats = useMemo(() => ({
    pendingPayment: entitlements.filter((item) => item.status === 'payment_pending').length,
    pendingActivation: entitlements.filter((item) => item.status === 'pending_activation').length,
    activeEntitlements: entitlements.filter((item) => item.status === 'active').length,
    activeAccess: accessRows.filter((item) => item.status === 'active').length
  }), [entitlements, accessRows])

  const activate = async (entitlement: AnyRecord) => {
    const courseId = selectedCourse[String(entitlement.id)] || ''
    if (!courseId) {
      setError('Selecciona el curso que quieres activar para este derecho comercial.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const { error: rpcError } = await supabase.rpc('ghc_admin_activate_entitlement', {
        p_entitlement_id: entitlement.id,
        p_course_ids: [courseId]
      })
      if (rpcError) throw new Error(rpcError.message)
      setMessage(`Acceso activado para ${entitlement.email}.`)
      await load()
    } catch (activateError: any) {
      setError(activateError?.message || 'No se pudo activar el derecho.')
    } finally {
      setBusy(false)
    }
  }

  const revokeEntitlement = async (entitlement: AnyRecord) => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const { error: rpcError } = await supabase.rpc('ghc_admin_revoke_entitlement', {
        p_entitlement_id: entitlement.id,
        p_reason: 'Revocado desde GHC Control Center'
      })
      if (rpcError) throw new Error(rpcError.message)
      setMessage(`Derecho revocado: ${entitlement.source_reference}.`)
      await load()
    } catch (revokeError: any) {
      setError(revokeError?.message || 'No se pudo revocar el derecho.')
    } finally {
      setBusy(false)
    }
  }

  const grantManual = async (event: FormEvent) => {
    event.preventDefault()
    if (!manualUser || !manualCourse) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const { error: rpcError } = await supabase.rpc('ghc_admin_grant_course_access', {
        p_user_id: manualUser,
        p_course_id: manualCourse,
        p_access_source: 'admin',
        p_provider_reference: null,
        p_expires_at: null,
        p_reason: 'Acceso manual desde GHC Control Center',
        p_metadata: { source_ui: 'ghc-control-center/accesos' }
      })
      if (rpcError) throw new Error(rpcError.message)
      setMessage('Acceso manual concedido.')
      await load()
    } catch (grantError: any) {
      setError(grantError?.message || 'No se pudo conceder el acceso.')
    } finally {
      setBusy(false)
    }
  }

  const revokeAccess = async (row: AnyRecord) => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const { error: rpcError } = await supabase.rpc('ghc_admin_revoke_course_access', {
        p_user_id: row.user_id,
        p_course_id: row.course_id,
        p_reason: 'Revocado desde GHC Control Center'
      })
      if (rpcError) throw new Error(rpcError.message)
      setMessage('Matrícula revocada.')
      await load()
    } catch (revokeError: any) {
      setError(revokeError?.message || 'No se pudo revocar la matrícula.')
    } finally {
      setBusy(false)
    }
  }

  const courseName = (courseId: string) => courses.find((course) => String(course.id) === String(courseId))?.title || courseId
  const userName = (userId: string) => {
    const profile = profiles.find((item) => String(item.id) === String(userId))
    return profile?.full_name || profile?.email || userId
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link href="/ghc-control-center" className={styles.brand}><GHCLogo size="md" showText tagline={false} /></Link>
        <div className={styles.actions}>
          <Link href="/ghc-control-center/preventa">Preventa</Link>
          <Link href="/ghc-control-center/financiacion">Planes Academy</Link>
          <Link href="/ghc-control-center/soporte">Soporte</Link>
          <Link href="/ghc-control-center">← Control Center</Link>
        </div>
      </header>

      <section className={styles.hero}>
        <p>Operaciones reales · GHC Academy</p>
        <h1>Pagos y accesos</h1>
        <span>Preventa, derechos comerciales y matrículas. Los planes ordinarios post-lanzamiento se gestionan desde “Planes Academy”.</span>
      </section>

      {loading ? <div className={styles.notice}>Cargando estados reales…</div> : null}
      {message ? <div className={styles.success}>{message}</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}

      <section className={styles.stats}>
        <article><small>Pago pendiente</small><strong>{stats.pendingPayment}</strong><span>No abre Academy.</span></article>
        <article><small>Pagados sin activar</small><strong>{stats.pendingActivation}</strong><span>Derecho confirmado.</span></article>
        <article><small>Derechos activos</small><strong>{stats.activeEntitlements}</strong><span>Activados por GHC.</span></article>
        <article><small>Matrículas activas</small><strong>{stats.activeAccess}</strong><span>Acceso académico real.</span></article>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}><div><small>Comercial</small><h2>Derechos adquiridos</h2></div><span>SumUp / preventa / Stripe preparados para el mismo modelo</span></div>
        <div className={styles.entitlements}>
          {entitlements.map((item) => (
            <article className={styles.entitlement} key={item.id}>
              <div className={styles.entitlementMain}>
                <div className={styles.entitlementTop}><strong>{item.email}</strong><span data-status={item.status}>{ENTITLEMENT_LABEL[item.status] || item.status}</span></div>
                <p>{item.offer_code || 'Derecho comercial'} · {item.source} · {item.source_reference}</p>
                <div className={styles.meta}>
                  <span>{money(item.metadata?.total_amount_cents, item.metadata?.currency || 'EUR')}</span>
                  <span>{item.metadata?.payment_plan === 'split' ? '2 pagos' : 'Pago único'}</span>
                  <span>{item.metadata?.founder_place_number ? `Fundador #${item.metadata.founder_place_number}` : 'Sin número fundador'}</span>
                </div>
              </div>

              <div className={styles.entitlementActions}>
                {(item.status === 'pending_activation' || item.status === 'active') ? (
                  <>
                    <select value={selectedCourse[String(item.id)] || ''} onChange={(event) => setSelectedCourse((current) => ({ ...current, [String(item.id)]: event.target.value }))}>
                      <option value="">Seleccionar curso…</option>
                      {courses.map((course) => <option key={course.id} value={course.id}>{course.title} · {course.status}</option>)}
                    </select>
                    <button type="button" onClick={() => activate(item)} disabled={busy}>Activar curso</button>
                  </>
                ) : null}
                {item.status !== 'revoked' ? <button className={styles.danger} type="button" onClick={() => revokeEntitlement(item)} disabled={busy}>Revocar derecho</button> : null}
              </div>
            </article>
          ))}
          {!entitlements.length && !loading ? <div className={styles.empty}>No hay derechos comerciales registrados.</div> : null}
        </div>
      </section>

      <div className={styles.twoColumns}>
        <section className={styles.section}>
          <div className={styles.sectionHead}><div><small>Academy</small><h2>Matrículas reales</h2></div></div>
          <div className={styles.accessList}>
            {accessRows.map((row) => (
              <article key={row.id}>
                <div><strong>{userName(row.user_id)}</strong><span>{courseName(row.course_id)}</span><small>{row.access_source} · {row.status}</small></div>
                {row.status === 'active' ? <button type="button" onClick={() => revokeAccess(row)} disabled={busy}>Revocar</button> : null}
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}><div><small>Administración</small><h2>Acceso manual</h2></div></div>
          <form className={styles.manualForm} onSubmit={grantManual}>
            <label>Alumno<select value={manualUser} onChange={(event) => setManualUser(event.target.value)}>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.full_name || profile.email}</option>)}</select></label>
            <label>Curso<select value={manualCourse} onChange={(event) => setManualCourse(event.target.value)}>{courses.map((course) => <option key={course.id} value={course.id}>{course.title} · {course.status}</option>)}</select></label>
            <button type="submit" disabled={busy || !manualUser || !manualCourse}>Conceder acceso</button>
            <p>Uso para testing, becas o incidencias. Un pago real debe entrar por el derecho comercial y quedar trazado.</p>
          </form>
        </section>
      </div>
    </main>
  )
}
