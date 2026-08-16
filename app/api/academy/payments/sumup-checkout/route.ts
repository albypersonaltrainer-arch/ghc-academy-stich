import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHostedSumUpCheckout } from '../../../../../lib/preventa/sumup-client'
import {
  AcademySumUpError,
  createAcademySumUpCheckoutReference,
  getAcademySumUpStatus,
  registerAcademySumUpCheckout
} from '../../../../../lib/academy/sumup'

export const dynamic = 'force-dynamic'

type CheckoutContext = {
  order_id: string
  order_reference: string
  installment_id: string
  installment_no: number
  amount_cents: number
  currency: string
  course_title?: string
  course_slug?: string
}

type CheckoutRateLimit = {
  allowed?: boolean
  current_count?: number
  limit?: number
  window_seconds?: number
  retry_after_seconds?: number
}

function getBearerToken(request: NextRequest) {
  const header = request.headers.get('authorization') || ''
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : ''
}

function parseBody(input: unknown) {
  if (!input || typeof input !== 'object') return null
  const value = input as Record<string, unknown>
  const orderId = typeof value.orderId === 'string' ? value.orderId.trim() : ''
  const installmentNo = Number(value.installmentNo)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)) return null
  if (!Number.isInteger(installmentNo) || installmentNo < 1 || installmentNo > 4) return null
  return { orderId, installmentNo }
}

function getCallbackBaseUrl(request: NextRequest) {
  const configured = (process.env.ACADEMY_PUBLIC_BASE_URL || '').trim().replace(/\/$/, '')
  if (configured && /^https:\/\/[A-Za-z0-9.-]+(?::\d+)?$/.test(configured)) return configured

  const origin = request.nextUrl.origin.replace(/\/$/, '')
  if (/^https:\/\/[A-Za-z0-9.-]+(?::\d+)?$/.test(origin)) return origin
  return null
}

function buildWebhookUrl(baseUrl: string) {
  const url = new URL('/api/academy/payments/sumup-webhook', baseUrl)
  if (process.env.VERCEL_ENV === 'preview') {
    const bypassSecret = (process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '').trim()
    if (bypassSecret) url.searchParams.set('x-vercel-protection-bypass', bypassSecret)
  }
  return url.toString()
}

function safeDiagnosticCode(error: unknown) {
  if (error instanceof AcademySumUpError) return error.code
  if (error instanceof Error) {
    const match = error.message.match(/^([A-Z0-9_]{3,80})(?::\d{3})?$/)
    if (match) return match[1]
  }
  return 'ACADEMY_SUMUP_CHECKOUT_FAILED'
}

export async function GET() {
  if (process.env.VERCEL_ENV === 'production') {
    return NextResponse.json({ ok: false, code: 'NOT_FOUND' }, { status: 404 })
  }

  const status = getAcademySumUpStatus()
  return NextResponse.json({
    ok: true,
    route: 'academy-sumup-checkout',
    academyGateEnabled: status.academyGateEnabled,
    serviceRoleConfigured: status.serviceRoleConfigured,
    sumupCheckoutEnabled: status.shared.checkoutEnabled,
    sumupApiConfigured: status.shared.apiConfigured,
    sumupMerchantConfigured: status.shared.merchantConfigured,
    previewAutomationBypassConfigured:
      process.env.VERCEL_ENV !== 'preview' || Boolean(process.env.VERCEL_AUTOMATION_BYPASS_SECRET),
    checkoutReady: status.checkoutReady
  }, { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function POST(request: NextRequest) {
  const status = getAcademySumUpStatus()
  if (!status.checkoutReady) {
    return NextResponse.json(
      { ok: false, code: 'ACADEMY_SUMUP_GATE_CLOSED', error: 'SumUp para Academy todavía no está disponible en este entorno.' },
      { status: 503 }
    )
  }

  if (process.env.VERCEL_ENV === 'preview' && !process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    return NextResponse.json(
      { ok: false, code: 'VERCEL_AUTOMATION_BYPASS_NOT_CONFIGURED', error: 'Falta el bypass del callback de SumUp en Preview.' },
      { status: 503 }
    )
  }

  if (!(request.headers.get('content-type') || '').includes('application/json')) {
    return NextResponse.json({ ok: false, error: 'Content-Type debe ser application/json.' }, { status: 415 })
  }

  const body = parseBody(await request.json().catch(() => null))
  if (!body) {
    return NextResponse.json({ ok: false, code: 'INVALID_CHECKOUT_REQUEST', error: 'Solicitud de pago no válida.' }, { status: 400 })
  }

  const token = getBearerToken(request)
  if (!token) return NextResponse.json({ ok: false, error: 'Sesión requerida.' }, { status: 401 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ ok: false, error: 'Configuración de autenticación incompleta.' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData?.user) {
    return NextResponse.json({ ok: false, error: 'Sesión no válida.' }, { status: 401 })
  }

  const { data: rateLimitData, error: rateLimitError } = await supabase.rpc(
    'ghc_student_check_academy_checkout_rate_limit'
  )
  if (rateLimitError) {
    console.error('[academy-sumup-checkout] RATE_LIMIT_CHECK_FAILED')
    return NextResponse.json(
      { ok: false, code: 'ACADEMY_RATE_LIMIT_CHECK_FAILED', error: 'No se pudo validar el límite de seguridad del checkout.' },
      { status: 503 }
    )
  }

  const rateLimit = (rateLimitData || {}) as CheckoutRateLimit
  if (rateLimit.allowed === false) {
    const retryAfter = Math.max(1, Number(rateLimit.retry_after_seconds || 60))
    return NextResponse.json(
      {
        ok: false,
        code: 'ACADEMY_CHECKOUT_RATE_LIMITED',
        error: 'Has realizado demasiados intentos de pago. Espera unos minutos antes de volver a intentarlo.',
        retryAfterSeconds: retryAfter
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'Cache-Control': 'private, no-store'
        }
      }
    )
  }

  const callbackBaseUrl = getCallbackBaseUrl(request)
  if (!callbackBaseUrl) {
    return NextResponse.json({ ok: false, code: 'CALLBACK_BASE_URL_INVALID', error: 'No se pudo resolver la URL segura de retorno.' }, { status: 503 })
  }

  try {
    const { data, error } = await supabase.rpc('ghc_student_get_academy_installment_checkout_context', {
      p_order_id: body.orderId,
      p_installment_no: body.installmentNo
    })
    if (error || !data) {
      throw new AcademySumUpError(
        'ACADEMY_CHECKOUT_CONTEXT_FAILED',
        'No se pudo validar la cuota solicitada.'
      )
    }

    const context = data as CheckoutContext
    if (String(context.currency).toUpperCase() !== 'EUR') {
      throw new AcademySumUpError('ACADEMY_SUMUP_CURRENCY_UNSUPPORTED', 'SumUp Academy está configurado actualmente para EUR.')
    }

    const attemptToken = randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()
    const checkoutReference = createAcademySumUpCheckoutReference(
      context.order_reference,
      Number(context.installment_no),
      attemptToken
    )

    const redirectUrl = new URL('/alumno/pagos', callbackBaseUrl)
    redirectUrl.searchParams.set('sumup', 'return')
    redirectUrl.searchParams.set('order', context.order_reference)

    const checkout = await createHostedSumUpCheckout({
      checkoutReference,
      amountCents: Number(context.amount_cents),
      currency: 'EUR',
      description: `GHC Academy · ${String(context.course_title || 'Formación').slice(0, 90)} · Pago ${context.installment_no}`,
      redirectUrl: redirectUrl.toString(),
      returnUrl: buildWebhookUrl(callbackBaseUrl)
    })

    const persistence = await registerAcademySumUpCheckout({
      orderId: context.order_id,
      installmentId: context.installment_id,
      checkoutReference,
      providerCheckoutId: checkout.id!,
      hostedCheckoutUrl: checkout.hosted_checkout_url!,
      expectedAmountCents: Number(context.amount_cents),
      currency: 'EUR',
      idempotencyKey: `academy-sumup:${checkout.id}`,
      providerMetadata: {
        source: 'academy_hosted_checkout',
        attempt_token: attemptToken,
        course_slug: context.course_slug || null,
        installment_no: context.installment_no
      }
    })

    return NextResponse.json({
      ok: true,
      provider: 'sumup',
      orderId: context.order_id,
      orderReference: context.order_reference,
      installmentId: context.installment_id,
      installmentNo: context.installment_no,
      amountCents: context.amount_cents,
      currency: 'EUR',
      checkoutReference,
      checkoutId: checkout.id,
      hostedCheckoutUrl: checkout.hosted_checkout_url,
      persistence
    })
  } catch (error) {
    const code = safeDiagnosticCode(error)
    const publicMessage = error instanceof AcademySumUpError
      ? error.message
      : 'No se pudo preparar el pago. No se ha confirmado ningún cobro.'
    console.error('[academy-sumup-checkout]', code)
    return NextResponse.json({ ok: false, code, error: publicMessage }, { status: 400 })
  }
}