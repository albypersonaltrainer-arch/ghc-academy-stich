'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import GHCLogo from '../../components/GHCLogo'
import styles from '../StudentDashboardV2.module.css'
import paymentStyles from './payments.module.css'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

type AnyRecord = Record<string, any>

function money(cents: unknown, currency = 'EUR') {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(Number(cents || 0) / 100)
}

function dateTime(value: unknown) {
  if (!value) return '—'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(date)
}

const STATUS: Record<string,string> = {
  awaiting_payment: 'Esperando pago', waiting_withdrawal: 'Acceso programado', active: 'Activo',
  past_due: 'Pago pendiente', completed: 'Pagado completo', cancelled: 'Plan cerrado',
  refunded: 'Reembolsado', chargeback: 'Contracargo', suspended: 'Suspendido'
}

export default function StudentPaymentsPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<AnyRecord[]>([])
  const [notifications, setNotifications] = useState<AnyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) { router.replace('/acceso'); return }
    const [ordersResult, notificationResult] = await Promise.all([
      supabase.rpc('ghc_student_get_my_academy_orders'),
      supabase.rpc('ghc_student_list_academy_notifications')
    ])
    if (ordersResult.error) throw new Error(ordersResult.error.message)
    if (notificationResult.error) throw new Error(notificationResult.error.message)
    setOrders(Array.isArray(ordersResult.data) ? ordersResult.data : [])
    setNotifications(Array.isArray(notificationResult.data) ? notificationResult.data : [])
  }, [router])

  useEffect(() => {
    load().catch((e) => setError(e?.message || 'No se pudo cargar tu información de pagos.')).finally(() => setLoading(false))
  }, [load])

  const unread = useMemo(() => notifications.filter((n) => !n.read_at).length, [notifications])

  const markRead = async (id: string) => {
    await supabase.rpc('ghc_student_mark_academy_notification_read', { p_notification_id: id })
    await load()
  }

  const requestWithdrawal = async (order: AnyRecord) => {
    if (!window.confirm('¿Quieres registrar una solicitud de desistimiento/reembolso para que GHC Academy la tramite según el régimen aplicable a tu compra?')) return
    setBusy(true); setError(''); setMessage('')
    try {
      const { data, error: rpcError } = await supabase.rpc('ghc_student_request_academy_refund', {
        p_order_id: order.id,
        p_reason_type: 'withdrawal',
        p_reason_text: 'Solicitud registrada por el alumno desde su área de pagos.'
      })
      if (rpcError) throw new Error(rpcError.message)
      const eligibility = String(data?.eligibility || '')
      setMessage(
        eligibility === 'eligible'
          ? 'Solicitud registrada dentro del plazo ordinario. Administración la tramitará antes de ejecutar cualquier devolución.'
          : eligibility === 'manual_review'
            ? 'Solicitud registrada. Por el tipo de producto requiere revisión antes de determinar el importe o procedencia.'
            : 'Solicitud registrada. El sistema indica que el desistimiento ordinario no está disponible; se conserva la revisión por cualquier otra causa legal aplicable.'
      )
      await load()
    } catch (e: any) {
      setError(e?.message || 'No se pudo registrar la solicitud.')
    } finally { setBusy(false) }
  }

  return (
    <main className={styles.page}>
      <section className={`${styles.shell} ${paymentStyles.shell}`}>
        <header className={styles.topbar}>
          <GHCLogo size="md" showText tagline={false} />
          <div className={styles.topbarActions}>
            <Link href="/alumno" className={styles.secondaryButton}>← Mi área</Link>
          </div>
        </header>

        <div className={styles.content}>
          <header className={styles.pageHeader}>
            <p className={styles.eyebrow}>Pagos y acceso</p>
            <h1>Mi plan de formación</h1>
            <p>Consulta lo pagado, próximos vencimientos, contenido habilitado y avisos. Los desbloqueos se producen automáticamente cuando se confirma cada pago.</p>
          </header>

          {loading ? <section className={styles.emptyCard}><div><strong>Cargando…</strong><p>Consultando tu expediente comercial.</p></div></section> : null}
          {error ? <div className={styles.errorBanner}>{error}</div> : null}
          {message ? <section className={styles.emptyCard}><div><strong>Solicitud registrada</strong><p>{message}</p></div></section> : null}

          <section className={styles.section}>
            <div className={styles.sectionHead}><div><h2>Mis compras</h2><p>El contenido pagado no desaparece por un retraso ordinario de una cuota.</p></div></div>
            <div className={styles.progressList}>
              {orders.map((order) => {
                const installments = Array.isArray(order.installments) ? order.installments : []
                const access = order.access || {}
                const withdrawal = order.withdrawal || {}
                return (
                  <article className={styles.progressCard} key={order.id}>
                    <div className={`${styles.progressHead} ${paymentStyles.orderHeader}`}>
                      <div>
                        <h3>{order.course_title}</h3>
                        <p className={paymentStyles.orderReference}>{order.order_reference} · {STATUS[order.status] || order.status}</p>
                      </div>
                      <span className={`${styles.progressPercent} ${paymentStyles.orderAmount}`}>{money(order.payable_total_cents, order.currency)}</span>
                    </div>

                    <div className={styles.progressDetails}>
                      <div className={styles.progressDetail}><small>Modalidad</small><strong>{Number(order.installment_count) === 1 ? 'Pago único' : `${order.installment_count} pagos`}</strong></div>
                      <div className={styles.progressDetail}><small>Acceso económico</small><strong>{access?.fully_paid ? 'Curso completo' : `Hasta módulo ${Number(access?.max_module_order || 0)}`}</strong></div>
                      <div className={styles.progressDetail}><small>Coste fraccionamiento</small><strong>{Number(order.financing_fee_cents || 0) > 0 ? money(order.financing_fee_cents, order.currency) : '0 €'}</strong></div>
                    </div>

                    <div className={paymentStyles.installmentList}>
                      {installments.map((item: AnyRecord) => (
                        <div key={item.id} className={paymentStyles.installmentRow}>
                          <span className={paymentStyles.installmentCopy}>Pago {item.installment_no} · {money(item.amount_cents, order.currency)} · vence {dateTime(item.due_at)}</span>
                          <strong className={paymentStyles.installmentStatus}>{item.status === 'paid' ? 'Pagado' : item.status === 'overdue' ? 'Pendiente' : item.status}</strong>
                        </div>
                      ))}
                    </div>

                    <div className={paymentStyles.withdrawalBox}>
                      <strong>Desistimiento y reembolsos</strong>
                      <p className={paymentStyles.withdrawalCopy}>
                        {withdrawal.reason || 'La disponibilidad se calcula según la fecha, el tipo de producto y los consentimientos registrados.'}
                      </p>
                      <p className={paymentStyles.withdrawalCopy}>
                        Los derechos legales por falta de conformidad, cobros indebidos u otras causas obligatorias no quedan limitados por esta indicación.
                      </p>
                      <button className={`${styles.secondaryButton} ${paymentStyles.withdrawalAction}`} disabled={busy} type="button" onClick={() => requestWithdrawal(order)}>
                        Solicitar revisión / reembolso
                      </button>
                    </div>
                  </article>
                )
              })}
              {!orders.length && !loading ? <section className={styles.emptyCard}><div><strong>No hay planes ordinarios todavía</strong><p>Las compras de preventa y los futuros pedidos Academy se gestionan en circuitos separados.</p></div></section> : null}
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHead}><div><h2>Avisos</h2><p>{unread} sin leer · desbloqueos, vencimientos y cambios relevantes.</p></div></div>
            <div className={styles.certificateList}>
              {notifications.map((item) => (
                <article className={`${styles.certificateCard} ${item.read_at ? paymentStyles.notificationRead : ''}`} key={item.id}>
                  <div className={`${styles.certificateHead} ${paymentStyles.notificationHeader}`}>
                    <div><h3>{item.subject}</h3><p>{dateTime(item.created_at)}</p></div>
                    {!item.read_at ? <button className={styles.secondaryButton} type="button" onClick={() => markRead(item.id)}>Marcar leído</button> : null}
                  </div>
                  <p className={paymentStyles.notificationBody}>{item.body}</p>
                </article>
              ))}
              {!notifications.length ? <section className={styles.emptyCard}><div><strong>Sin avisos</strong><p>No hay novedades comerciales en tu cuenta.</p></div></section> : null}
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}