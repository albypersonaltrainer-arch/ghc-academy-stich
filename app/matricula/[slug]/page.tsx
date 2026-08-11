'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import GHCLogo from '../../components/GHCLogo'
import styles from './checkout.module.css'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

type AnyRecord = Record<string, any>

function routeParam(value: unknown) {
  if (Array.isArray(value)) return String(value[0] || '')
  return String(value || '')
}

function money(cents: unknown, currency = 'EUR') {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(Number(cents || 0) / 100)
}

export default function AcademyCheckoutPage() {
  const params = useParams()
  const slug = routeParam(params?.slug)
  const [options, setOptions] = useState<AnyRecord | null>(null)
  const [user, setUser] = useState<any>(null)
  const [selectedCount, setSelectedCount] = useState(1)
  const [terms, setTerms] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [startNow, setStartNow] = useState(true)
  const [lossAck, setLossAck] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [prepared, setPrepared] = useState<AnyRecord | null>(null)

  const load = useCallback(async () => {
    if (!slug) return
    const [{ data, error: optionsError }, { data: userData }] = await Promise.all([
      supabase.rpc('ghc_public_get_course_payment_options', { p_course_slug: slug }),
      supabase.auth.getUser()
    ])
    if (optionsError) throw new Error(optionsError.message)
    setOptions(data || null)
    setUser(userData?.user || null)
  }, [slug])

  useEffect(() => {
    load().catch((e) => setError(e?.message || 'No se pudo preparar la matrícula.'))
  }, [load])

  const plans = useMemo(() => Array.isArray(options?.plans) ? options.plans : [], [options])
  const selectedPlan = plans.find((plan: AnyRecord) => Number(plan.installment_count) === selectedCount) || plans[0]
  const deliveryType = String(options?.delivery_type || 'digital_content')
  const digitalImmediate = startNow && ['digital_content','hybrid'].includes(deliveryType)

  useEffect(() => {
    if (plans.length && !plans.some((plan: AnyRecord) => Number(plan.installment_count) === selectedCount)) {
      setSelectedCount(Number(plans[0]?.installment_count || 1))
    }
  }, [plans, selectedCount])

  const prepareOrder = async () => {
    if (!options?.course_id || !selectedPlan) return
    if (!user) {
      setError('Inicia sesión antes de preparar tu matrícula.')
      return
    }
    if (!terms || !privacy) {
      setError('Debes aceptar las condiciones de contratación y la política de privacidad.')
      return
    }
    if (digitalImmediate && !lossAck) {
      setError('Para comenzar ahora debes confirmar también el reconocimiento relativo al desistimiento del contenido digital.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const { data, error: rpcError } = await supabase.rpc('ghc_student_prepare_academy_order', {
        p_course_id: options.course_id,
        p_installment_count: selectedCount,
        p_start_now: startNow,
        p_withdrawal_loss_ack: digitalImmediate ? lossAck : false,
        p_customer_type: 'consumer',
        p_terms_accepted: terms,
        p_privacy_accepted: privacy,
        p_terms_version: options.legal_version,
        p_privacy_version: options.legal_version
      })
      if (rpcError) throw new Error(rpcError.message)
      setPrepared(data || {})
    } catch (e: any) {
      setError(e?.message || 'No se pudo preparar la matrícula.')
    } finally {
      setBusy(false)
    }
  }

  if (options && options.available === false) {
    return (
      <main className={styles.page}>
        <section className={styles.stateCard}>
          <GHCLogo size="md" showText tagline={false} />
          <h1>Esta matrícula no está disponible</h1>
          <p>El curso no está publicado para nuevas matrículas.</p>
          <Link href="/">Volver</Link>
        </section>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <GHCLogo size="md" showText tagline={false} />
        <Link href={slug ? `/cursos/${slug}` : '/'}>Volver al curso</Link>
      </header>

      <div className={styles.shell}>
        <section className={styles.hero}>
          <p>GHC Academy · matrícula</p>
          <h1>{options?.course_title || 'Preparando tu matrícula'}</h1>
          <span>Elige la modalidad por su importe final. El fraccionamiento interno disponible actualmente no añade coste financiero.</span>
        </section>

        {error ? <div className={styles.error}>{error}</div> : null}

        {prepared ? (
          <section className={styles.successCard}>
            <span className={styles.successPill}>Pedido preparado</span>
            <h2>{prepared.order_reference}</h2>
            <p>Tu elección, importes, cuotas y consentimientos han quedado registrados. El proveedor de pago todavía no está conectado en esta fase, por lo que <strong>no se ha realizado ningún cobro</strong>.</p>
            <div className={styles.summaryGrid}>
              <div><small>Total</small><strong>{money(prepared.total_cents, options?.currency)}</strong></div>
              <div><small>Modalidad</small><strong>{prepared.installment_count} pago{Number(prepared.installment_count) === 1 ? '' : 's'}</strong></div>
              <div><small>Inicio</small><strong>{prepared.start_now ? 'Al confirmar el primer pago' : '14 días después del primer pago'}</strong></div>
            </div>
            <p className={styles.legalNote}>La confirmación contractual ha quedado guardada en tu expediente. Cuando conectemos SumUp/Stripe, este mismo pedido podrá continuar hacia el cobro sin cambiar la lógica de acceso.</p>
            <Link className={styles.primaryLink} href="/alumno/pagos">Ver mis pagos y avisos</Link>
          </section>
        ) : (
          <div className={styles.grid}>
            <section className={styles.card}>
              <div className={styles.cardHead}>
                <div><small>1. Modalidad</small><h2>¿Cómo quieres pagar?</h2></div>
                <strong>{money(options?.base_price_cents, options?.currency)}</strong>
              </div>

              <div className={styles.plans}>
                {plans.map((plan: AnyRecord) => {
                  const count = Number(plan.installment_count || 1)
                  const amounts = Array.isArray(plan.installment_amounts_cents) ? plan.installment_amounts_cents : []
                  const selected = count === selectedCount
                  return (
                    <button key={count} type="button" onClick={() => setSelectedCount(count)} className={selected ? styles.planSelected : styles.plan}>
                      <div>
                        <strong>{count === 1 ? 'Pago único' : `${count} pagos`}</strong>
                        <span>{count === 1 ? money(plan.total_cents, options?.currency) : amounts.map((amount: number) => money(amount, options?.currency)).join(' + ')}</span>
                      </div>
                      <em>Total {money(plan.total_cents, options?.currency)}</em>
                    </button>
                  )
                })}
              </div>

              {selectedPlan ? (
                <div className={styles.installmentInfo}>
                  <strong>Importe final: {money(selectedPlan.total_cents, options?.currency)}</strong>
                  {Number(selectedPlan.installment_count) > 1 ? <span>Cuotas cada {Number(selectedPlan.interval_days || 30)} días.</span> : <span>Un único pago.</span>}
                  <span>Coste financiero del fraccionamiento interno: 0 €.</span>
                </div>
              ) : null}
            </section>

            <section className={styles.card}>
              <div className={styles.cardHead}>
                <div><small>2. Acceso</small><h2>¿Cuándo quieres empezar?</h2></div>
              </div>

              <label className={styles.checkRow}>
                <input type="checkbox" checked={startNow} onChange={(e) => { setStartNow(e.target.checked); if (!e.target.checked) setLossAck(false) }} />
                <span><strong>Quiero comenzar ahora.</strong> Solicito que el contenido o servicio correspondiente empiece cuando se confirme mi primer pago, sin esperar a que finalice el plazo ordinario de desistimiento.</span>
              </label>

              {!startNow ? (
                <div className={styles.infoBox}>El pago podrá formalizarse normalmente, pero el acceso al contenido se programará para 14 días después de la confirmación del primer pago.</div>
              ) : null}

              {digitalImmediate ? (
                <label className={styles.checkRow}>
                  <input type="checkbox" checked={lossAck} onChange={(e) => setLossAck(e.target.checked)} />
                  <span>Entiendo que, al comenzar el suministro del <strong>contenido digital</strong> tras mi solicitud expresa, perderé el derecho de desistimiento ordinario respecto de ese contenido en los términos legalmente aplicables.</span>
                </label>
              ) : null}

              <p className={styles.legalNote}>Esto no limita derechos imperativos por falta de conformidad, cobros indebidos, duplicados u otras causas legalmente protegidas. Los productos con servicios o componentes híbridos se revisan conforme a su régimen específico.</p>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHead}>
                <div><small>3. Confirmación</small><h2>Condiciones</h2></div>
              </div>

              <label className={styles.checkRow}>
                <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
                <span>Acepto las condiciones de contratación aplicables a esta matrícula y la modalidad de pago elegida.</span>
              </label>
              <label className={styles.checkRow}>
                <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} />
                <span>Acepto la política de privacidad aplicable al tratamiento necesario para gestionar mi matrícula.</span>
              </label>

              {!user ? (
                <div className={styles.loginBox}>
                  <strong>Necesitas iniciar sesión para continuar.</strong>
                  <p>Las opciones de precio son públicas, pero el pedido y los consentimientos deben quedar ligados a tu cuenta.</p>
                  <Link className={styles.primaryLink} href="/acceso">Iniciar sesión</Link>
                </div>
              ) : (
                <button className={styles.primaryButton} type="button" disabled={busy || !selectedPlan} onClick={prepareOrder}>
                  {busy ? 'Registrando…' : 'Preparar matrícula'}
                </button>
              )}

              <p className={styles.providerNote}>Fase actual: preparación y reglas listas. SumUp y Stripe se conectarán y probarán más adelante. Este botón no cobra.</p>
            </section>
          </div>
        )}
      </div>
    </main>
  )
}
