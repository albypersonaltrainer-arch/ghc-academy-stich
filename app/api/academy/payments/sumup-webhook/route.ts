import { NextRequest, NextResponse } from 'next/server'
import { parseSumUpWebhookPayload, SumUpAdapterError } from '../../../../../lib/preventa/sumup-adapter'
import {
  getConfiguredSumUpMerchantCode,
  retrieveSumUpCheckout
} from '../../../../../lib/preventa/sumup-client'
import {
  AcademySumUpError,
  confirmAcademySumUpPayment,
  getAcademySumUpCheckoutContext,
  getAcademySumUpStatus,
  markAcademySumUpCheckoutTerminal,
  verifyAcademySumUpCheckout
} from '../../../../../lib/academy/sumup'

export const dynamic = 'force-dynamic'

const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0' }

export async function GET() {
  if (process.env.VERCEL_ENV === 'production') {
    return NextResponse.json({ ok: false, code: 'NOT_FOUND' }, { status: 404, headers: NO_STORE_HEADERS })
  }

  const status = getAcademySumUpStatus()
  return NextResponse.json({
    ok: true,
    route: 'academy-sumup-webhook',
    academyGateEnabled: status.academyGateEnabled,
    serviceRoleConfigured: status.serviceRoleConfigured,
    sumupWebhookEnabled: status.shared.webhookEnabled,
    sumupApiConfigured: status.shared.apiConfigured,
    sumupMerchantConfigured: status.shared.merchantConfigured,
    webhookReady: status.webhookReady
  }, { headers: NO_STORE_HEADERS })
}

export async function POST(request: NextRequest) {
  const status = getAcademySumUpStatus()
  if (!status.webhookReady) {
    return NextResponse.json(
      { ok: false, code: 'ACADEMY_SUMUP_WEBHOOK_GATE_CLOSED', error: 'Webhook SumUp Academy no disponible en este entorno.' },
      { status: 503, headers: NO_STORE_HEADERS }
    )
  }

  if (!(request.headers.get('content-type') || '').includes('application/json')) {
    return NextResponse.json(
      { ok: false, error: 'Content-Type debe ser application/json.' },
      { status: 415, headers: NO_STORE_HEADERS }
    )
  }

  const body = await request.json().catch(() => null)

  try {
    const webhook = parseSumUpWebhookPayload(body)

    // Rechaza IDs de checkout que no existan en Academy antes de consultar la API
    // del proveedor. Así un tercero no puede usar el webhook para provocar llamadas
    // arbitrarias o agotar el rate limit de SumUp con identificadores inventados.
    const context = await getAcademySumUpCheckoutContext(webhook.id)

    // La notificación solo identifica un checkout ya registrado. El estado económico
    // se obtiene siempre de SumUp mediante una consulta autenticada al API real.
    const checkout = await retrieveSumUpCheckout(webhook.id)
    const verified = verifyAcademySumUpCheckout({
      checkout,
      webhookCheckoutId: webhook.id,
      expectedMerchantCode: getConfiguredSumUpMerchantCode(),
      context
    })

    if (verified.status === 'PENDING') {
      return NextResponse.json({
        ok: true,
        applied: false,
        verifiedAgainstSumUpApi: true,
        checkoutStatus: 'PENDING'
      }, { headers: NO_STORE_HEADERS })
    }

    if (verified.status === 'FAILED' || verified.status === 'EXPIRED') {
      const transition = await markAcademySumUpCheckoutTerminal({
        providerCheckoutId: webhook.id,
        status: verified.status.toLowerCase() as 'failed' | 'expired',
        occurredAt: verified.occurredAt,
        providerMetadata: verified.providerMetadata
      })
      return NextResponse.json({
        ok: true,
        applied: true,
        verifiedAgainstSumUpApi: true,
        checkoutStatus: verified.status,
        transition
      }, { headers: NO_STORE_HEADERS })
    }

    const providerPaymentId = 'providerPaymentId' in verified ? verified.providerPaymentId : ''
    if (verified.status !== 'PAID' || !providerPaymentId) {
      throw new AcademySumUpError('VERIFIED_PAYMENT_ID_MISSING', 'SumUp no devolvió un identificador de pago verificable.')
    }

    const transition = await confirmAcademySumUpPayment({
      providerCheckoutId: webhook.id,
      providerPaymentId,
      amountCents: verified.amountCents,
      occurredAt: verified.occurredAt,
      providerMetadata: verified.providerMetadata
    })

    return NextResponse.json({
      ok: true,
      applied: true,
      verifiedAgainstSumUpApi: true,
      checkoutStatus: 'PAID',
      transition
    }, { headers: NO_STORE_HEADERS })
  } catch (error) {
    if (error instanceof SumUpAdapterError || error instanceof AcademySumUpError) {
      return NextResponse.json(
        { ok: false, applied: false, code: error.code, error: error.message },
        { status: 400, headers: NO_STORE_HEADERS }
      )
    }

    const message = error instanceof Error ? error.message : 'No se pudo verificar el evento SumUp.'
    console.error('[academy-sumup-webhook]', message)
    return NextResponse.json(
      { ok: false, applied: false, code: 'ACADEMY_SUMUP_WEBHOOK_FAILED', error: 'No se pudo verificar o aplicar el evento SumUp.' },
      { status: 500, headers: NO_STORE_HEADERS }
    )
  }
}
