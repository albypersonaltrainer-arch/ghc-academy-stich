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

const STATUS: Record<string, string> = {
  awaiting_payment: 'Esperando pago',
  waiting_withdrawal: 'Acceso diferido 14 días',
  active: 'Activo',
  past_due: 'Pago pendiente',
  completed: 'Pagado completo',
  cancelled: 'Plan cerrado',
  refunded: 'Reembolsado',
  chargeback: 'Contracargo',
  suspended: 'Suspendido'
}

export default function AcademyFinancingAdminPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<AnyRecord[]>([])
  const [refunds, setRefunds] = useState<AnyRecord[]>([])
  const [policy, setPolicy] = useState<AnyRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [moduleLimits, setModuleLimits] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      router.replace('/acceso')
      return
    }
    const [ordersResult, policyResult, refundsResult] = await Promise.all([
      supabase.rpc('ghc_admin_list_academy_orders'),
      supabase.rpc('ghc_admin_get_academy_commercial_policy'),
      supabase.rpc('ghc_admin_list_academy_refund_requests')
    ])
    if (ordersResult.error) throw new Error(ordersResult.error.message)
    if (policyResult.error) throw new Error(policyResult.error.message)
    if (refundsResult.error) throw new Error(refundsResult.error.message)
    setOrders(Array.isArray(ordersResult.data) ? ordersResult.data : [])
    setPolicy(policyResult.data || null)
    setRefunds(Array.isArray(refundsResult.data) ? refundsResult.data : [])
  }, [router])

  useEffect(() => {
    load().catch((e) => setError(e?.message || 'No se pudo cargar la operativa comercial.')).finally(() => setLoading(false))
  }, [load])

  const run = async (action: () => PromiseLike<{ error: any }>, success: string) => {
    setBusy(true); setError(''); setMessage('')
    try {
      const result = await action()
      if (result.error) throw new Error(result.error.message)
      setMessage(success)
      await load()
    } catch (e: any) {
      setError(e?.message || 'La operación no pudo completarse.')
    } finally {
      setBusy(false)
    }
  }

  const stats = useMemo(() => ({
    active: orders.filter((o) => ['active','waiting_withdrawal'].includes(String(o.status))).length,
    overdue: orders.filter((o) => o.status === 'past_due').length,
    completed: orders.filter((o) => o.status === 'completed').length,
    refunds: refunds.filter((r) => ['submitted','approved_pending_provider'].includes(String(r.status))).length
  }), [orders, refunds])

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link href="/ghc-control-center" className={styles.brand}><GHCLogo size="md" showText tagline={false} /></Link>
        <div className={styles.actions}>
          <Link href="/ghc-control-center/accesos">Pagos y accesos</Link>
          <Link href="/ghc-control-center">← Control Center</Link>
        </div>
      </header>

      <section className={styles.hero}>
        <p>Post-lanzamiento · automatización comercial</p>
        <h1>Planes de pago Academy</h1>
        <span>Automático por defecto. Todo visible y con intervención manual trazada cuando haga falta.</span>
      </section>

      {loading ? <div className={styles.notice}>Cargando operativa real…</div> : null}
      {message ? <div className={styles.success}>{message}</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}

      <section className={styles.stats}>
        <article><small>Planes activos</small><strong>{stats.active}</strong><span>Incluye accesos diferidos.</span></article>
        <article><small>Pago pendiente</small><strong>{stats.overdue}</strong><span>Requieren seguimiento normal.</span></article>
        <article><small>Pagados</small><strong>{stats.completed}</strong><span>100 % satisfechos.</span></article>
        <article><small>Reembolsos</small><strong>{stats.refunds}</strong><span>Pendientes de decisión/ejecución.</span></article>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div><small>Regla activa</small><h2>Política comercial</h2></div>
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => supabase.rpc('ghc_admin_run_academy_commercial_automation'), 'Automatización comercial ejecutada.')}
          >Ejecutar revisión ahora</button>
        </div>
        <div className={styles.entitlement}>
          <div className={styles.entitlementMain}>
            <div className={styles.entitlementTop}><strong>{policy?.policy_code || 'Sin política activa'}</strong><span data-status="active">Automática</span></div>
            <p>Cuotas internas sin coste financiero · máximo {Number(policy?.max_installments || 4)} pagos · cada {Number(policy?.installment_interval_days || 30)} días.</p>
            <div className={styles.meta}>
              <span>Fracciona desde {money(policy?.installment_min_cents || 15000)}</span>
              <span>Recordatorios: -5 / +3 / +7 / +15 días</span>
              <span>Cierre: +{Number(policy?.cancel_after_days || 30)} días</span>
              <span>Desistimiento base: {Number(policy?.withdrawal_days || 14)} días</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}><div><small>Operación ordinaria</small><h2>Pedidos y cuotas</h2></div><span>SumUp / Stripe todavía sin conectar</span></div>
        <div className={styles.entitlements}>
          {orders.map((order) => {
            const installments = Array.isArray(order.installments) ? order.installments : []
            const access = order.course_access || {}
            const firstUnpaid = installments.find((i: AnyRecord) => !['paid','refunded'].includes(String(i.status)))
            return (
              <article className={styles.entitlement} key={order.id}>
                <div className={styles.entitlementMain}>
                  <div className={styles.entitlementTop}>
                    <strong>{order.email}</strong>
                    <span data-status={order.status}>{STATUS[order.status] || order.status}</span>
                  </div>
                  <p>{order.course_title} · {order.order_reference}</p>
                  <div className={styles.meta}>
                    <span>{money(order.payable_total_cents, order.currency)}</span>
                    <span>{order.installment_count} pago{Number(order.installment_count) === 1 ? '' : 's'}</span>
                    <span>{order.financing_fee_cents ? `Coste aplazamiento ${money(order.financing_fee_cents, order.currency)}` : 'Sin coste de fraccionamiento'}</span>
                    <span>{access?.fully_paid ? 'Pago completo' : `Acceso hasta módulo ${Number(access?.max_module_order || 0)}`}</span>
                    {access?.manual_override ? <span>Override manual activo</span> : null}
                  </div>

                  <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
                    {installments.map((item: AnyRecord) => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: 10, border: '1px solid rgba(255,255,255,.08)', borderRadius: 10 }}>
                        <span>Pago {item.installment_no} · {money(item.amount_cents, order.currency)} · {dateTime(item.due_at)}</span>
                        <strong>{item.status}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.entitlementActions}>
                  {firstUnpaid ? <button disabled={busy} type="button" onClick={() => run(
                    () => supabase.rpc('ghc_admin_mark_academy_installment_paid', { p_installment_id: firstUnpaid.id, p_paid_at: new Date().toISOString(), p_reason: 'Confirmación manual desde Control Center' }),
                    `Cuota ${firstUnpaid.installment_no} marcada como pagada.`
                  )}>Marcar siguiente pagada</button> : null}

                  {!['completed','cancelled','refunded','chargeback'].includes(String(order.status)) ? <>
                    <button disabled={busy} type="button" onClick={() => run(() => supabase.rpc('ghc_admin_extend_academy_order', { p_order_id: order.id, p_days: 7, p_reason: 'Ampliación manual de 7 días desde Control Center' }), 'Vencimientos ampliados 7 días.')}>+7 días</button>
                    <button disabled={busy} type="button" onClick={() => run(() => supabase.rpc('ghc_admin_extend_academy_order', { p_order_id: order.id, p_days: 15, p_reason: 'Ampliación manual de 15 días desde Control Center' }), 'Vencimientos ampliados 15 días.')}>+15 días</button>
                  </> : null}

                  <button disabled={busy} type="button" onClick={() => run(
                    () => supabase.rpc('ghc_admin_pause_academy_collection', { p_order_id: order.id, p_paused: !Boolean(order.collection_paused), p_reason: order.collection_paused ? 'Reanudado desde Control Center' : 'Pausado desde Control Center' }),
                    order.collection_paused ? 'Cobros reanudados.' : 'Cobros pausados.'
                  )}>{order.collection_paused ? 'Reanudar avisos/cobros' : 'Pausar avisos/cobros'}</button>

                  {order.status === 'cancelled' ? <button disabled={busy} type="button" onClick={() => run(
                    () => supabase.rpc('ghc_admin_reactivate_academy_order', { p_order_id: order.id, p_first_due_in_days: 7, p_reason: 'Reactivado manualmente desde Control Center' }),
                    'Plan reactivado con 7 días para el próximo pago.'
                  )}>Reactivar plan · 7 días</button> : null}

                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      value={moduleLimits[String(order.id)] || ''}
                      onChange={(e) => setModuleLimits((s) => ({ ...s, [String(order.id)]: e.target.value }))}
                      inputMode="numeric"
                      placeholder="Módulos"
                      style={{ width: 92 }}
                    />
                    <button disabled={busy || !moduleLimits[String(order.id)]} type="button" onClick={() => run(
                      () => supabase.rpc('ghc_admin_override_academy_access', { p_order_id: order.id, p_module_limit: Number(moduleLimits[String(order.id)]), p_full_access: false, p_reason: 'Override manual de tramo desde Control Center' }),
                      'Límite comercial sobrescrito manualmente.'
                    )}>Forzar tramo</button>
                  </div>

                  <button disabled={busy} type="button" onClick={() => run(
                    () => supabase.rpc('ghc_admin_override_academy_access', { p_order_id: order.id, p_module_limit: 0, p_full_access: true, p_reason: 'Acceso completo manual desde Control Center' }),
                    'Acceso completo forzado manualmente.'
                  )}>Forzar acceso completo</button>

                  {access?.manual_override ? <button disabled={busy} type="button" onClick={() => run(
                    () => supabase.rpc('ghc_admin_release_academy_access_override', { p_order_id: order.id, p_reason: 'Vuelta al cálculo automático desde Control Center' }),
                    'Override retirado. El pedido vuelve al automático.'
                  )}>Volver al automático</button> : null}
                </div>
              </article>
            )
          })}
          {!orders.length && !loading ? <div className={styles.empty}>Todavía no hay pedidos ordinarios Academy. La preventa sigue separada.</div> : null}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}><div><small>Revisión humana</small><h2>Solicitudes de reembolso</h2></div><span>Ninguna devolución se ejecuta en el proveedor sin decisión</span></div>
        <div className={styles.entitlements}>
          {refunds.map((refund) => (
            <article className={styles.entitlement} key={refund.id}>
              <div className={styles.entitlementMain}>
                <div className={styles.entitlementTop}><strong>{refund.email}</strong><span data-status={refund.status}>{refund.status}</span></div>
                <p>{refund.course_title} · {refund.order_reference}</p>
                <div className={styles.meta}><span>{refund.reason_type}</span><span>Clasificación: {refund.eligibility}</span><span>{dateTime(refund.created_at)}</span></div>
                {refund.reason_text ? <p>{refund.reason_text}</p> : null}
              </div>
              {refund.status === 'submitted' ? <div className={styles.entitlementActions}>
                <button disabled={busy} type="button" onClick={() => run(
                  () => supabase.rpc('ghc_admin_decide_academy_refund', { p_refund_request_id: refund.id, p_approve: true, p_reason: 'Aprobado por administración. Pendiente del proveedor de pago.' }),
                  'Reembolso aprobado y cobros pausados. Queda pendiente de proveedor.'
                )}>Aprobar</button>
                <button className={styles.danger} disabled={busy} type="button" onClick={() => run(
                  () => supabase.rpc('ghc_admin_decide_academy_refund', { p_refund_request_id: refund.id, p_approve: false, p_reason: 'No procede tras revisión administrativa.' }),
                  'Solicitud resuelta como no aprobada.'
                )}>No aprobar</button>
              </div> : null}
            </article>
          ))}
          {!refunds.length ? <div className={styles.empty}>No hay solicitudes de reembolso.</div> : null}
        </div>
      </section>
    </main>
  )
}
