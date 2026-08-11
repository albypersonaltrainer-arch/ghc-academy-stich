'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import GHCLogo from '../../components/GHCLogo'
import styles from '../accesos/access.module.css'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

type AnyRecord = Record<string, any>

function dateTime(value: unknown) {
  if (!value) return '—'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(date)
}

export default function AcademyCommercialAlertsPage() {
  const router = useRouter()
  const [items, setItems] = useState<AnyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      router.replace('/acceso')
      return
    }
    const { data, error: rpcError } = await supabase.rpc('ghc_admin_list_academy_notifications', { p_limit: 200 })
    if (rpcError) throw new Error(rpcError.message)
    setItems(Array.isArray(data) ? data : [])
  }, [router])

  useEffect(() => {
    load().catch((e) => setError(e?.message || 'No se pudieron cargar los avisos.')).finally(() => setLoading(false))
  }, [load])

  const unread = useMemo(() => items.filter((item) => !item.read_at).length, [items])

  const markRead = async (id: string) => {
    const { error: rpcError } = await supabase.rpc('ghc_admin_mark_academy_notification_read', { p_notification_id: id })
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    await load()
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link href="/ghc-control-center" className={styles.brand}><GHCLogo size="md" showText tagline={false} /></Link>
        <div className={styles.actions}>
          <Link href="/ghc-control-center/financiacion">Planes Academy</Link>
          <Link href="/ghc-control-center/accesos">Pagos y accesos</Link>
          <Link href="/ghc-control-center">← Control Center</Link>
        </div>
      </header>

      <section className={styles.hero}>
        <p>Automatización · GHC Academy</p>
        <h1>Avisos comerciales</h1>
        <span>{unread} sin leer. Aquí quedan visibles los desbloqueos, impagos, cierres, reactivaciones y solicitudes generadas automáticamente.</span>
      </section>

      {loading ? <div className={styles.notice}>Cargando avisos…</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}

      <section className={styles.section}>
        <div className={styles.sectionHead}><div><small>Bandeja operativa</small><h2>Eventos que requieren visibilidad</h2></div><span>Historial trazado</span></div>
        <div className={styles.entitlements}>
          {items.map((item) => (
            <article className={styles.entitlement} key={item.id} style={{ opacity: item.read_at ? 0.68 : 1 }}>
              <div className={styles.entitlementMain}>
                <div className={styles.entitlementTop}>
                  <strong>{item.subject}</strong>
                  <span data-status={item.read_at ? 'completed' : 'active'}>{item.read_at ? 'Leído' : 'Nuevo'}</span>
                </div>
                <p>{item.body}</p>
                <div className={styles.meta}>
                  <span>{dateTime(item.created_at)}</span>
                  <span>{item.template_key}</span>
                  {item.order_id ? <span>Pedido {String(item.order_id).slice(0, 8)}</span> : null}
                </div>
              </div>
              {!item.read_at ? <div className={styles.entitlementActions}><button type="button" onClick={() => markRead(String(item.id))}>Marcar leído</button></div> : null}
            </article>
          ))}
          {!items.length && !loading ? <div className={styles.empty}>No hay avisos comerciales.</div> : null}
        </div>
      </section>
    </main>
  )
}
