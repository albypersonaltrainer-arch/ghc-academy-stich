import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { SumUpCheckout, SumUpTransaction } from '../preventa/sumup-adapter'
import { getSumUpIntegrationStatus } from '../preventa/sumup-client'

export class AcademySumUpError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message)
    this.name = 'AcademySumUpError'
  }
}

export type AcademyCheckoutContext = {
  attempt_id?: string
  attempt_status?: string
  order_id: string
  order_reference: string
  order_status?: string
  installment_id: string
  installment_no: number
  installment_status?: string
  amount_cents?: number
  expected_amount_cents?: number
  currency: string
  checkout_reference?: string
  provider_checkout_id?: string
  provider_payment_id?: string | null
  course_title?: string
  course_slug?: string
  email?: string
}

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function majorToCents(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new AcademySumUpError('INVALID_SUMUP_AMOUNT', 'SumUp no devolvió un importe válido.')
  }
  return Math.round(value * 100)
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !serviceRoleKey) throw new AcademySumUpError('ACADEMY_PERSISTENCE_NOT_CONFIGURED', 'Persistencia Academy incompleta.')
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  })
}

export function getAcademySumUpStatus() {
  const shared = getSumUpIntegrationStatus()
  const serviceRoleConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  const academyGateEnabled = process.env.VERCEL_ENV !== 'production' || process.env.ACADEMY_SUMUP_ENABLED === 'true'
  return {
    academyGateEnabled,
    serviceRoleConfigured,
    checkoutReady: academyGateEnabled && serviceRoleConfigured && shared.checkoutEnabled && shared.apiConfigured && shared.merchantConfigured,
    webhookReady: academyGateEnabled && serviceRoleConfigured && shared.webhookEnabled && shared.apiConfigured && shared.merchantConfigured,
    shared
  }
}

export function createAcademySumUpCheckoutReference(orderReference: string, installmentNo: number, attemptToken: string) {
  const order = clean(orderReference).toUpperCase()
  const token = clean(attemptToken).toUpperCase()
  if (!/^GHC-A-[A-Z0-9]{8,24}$/.test(order)) throw new AcademySumUpError('INVALID_ORDER_REFERENCE', 'Referencia Academy no válida.')
  if (!Number.isInteger(installmentNo) || installmentNo < 1 || installmentNo > 4) throw new AcademySumUpError('INVALID_INSTALLMENT_NO', 'Cuota Academy no válida.')
  if (!/^[A-Z0-9]{6,16}$/.test(token)) throw new AcademySumUpError('INVALID_ATTEMPT_TOKEN', 'Intento Academy no válido.')
  return `${order}-I${installmentNo}-A${token}`
}

export async function registerAcademySumUpCheckout(input: {
  orderId: string
  installmentId: string
  checkoutReference: string
  providerCheckoutId: string
  hostedCheckoutUrl: string
  expectedAmountCents: number
  currency: string
  idempotencyKey: string
  providerMetadata?: Record<string, unknown>
}) {
  const supabase = getServiceClient()
  const { data, error } = await supabase.rpc('ghc_provider_register_academy_sumup_checkout', {
    p_order_id: input.orderId,
    p_installment_id: input.installmentId,
    p_checkout_reference: input.checkoutReference,
    p_provider_checkout_id: input.providerCheckoutId,
    p_hosted_checkout_url: input.hostedCheckoutUrl,
    p_expected_amount_cents: input.expectedAmountCents,
    p_currency: input.currency,
    p_idempotency_key: input.idempotencyKey,
    p_provider_metadata: input.providerMetadata || {}
  })
  if (error) throw new AcademySumUpError('ACADEMY_CHECKOUT_REGISTER_FAILED', error.message)
  return data
}

export async function getAcademySumUpCheckoutContext(providerCheckoutId: string): Promise<AcademyCheckoutContext> {
  const supabase = getServiceClient()
  const { data, error } = await supabase.rpc('ghc_provider_get_academy_sumup_checkout_context', {
    p_provider_checkout_id: providerCheckoutId
  })
  if (error || !data) throw new AcademySumUpError('ACADEMY_CHECKOUT_CONTEXT_FAILED', error?.message || 'Checkout Academy no registrado.')
  return data as AcademyCheckoutContext
}

export async function markAcademySumUpCheckoutTerminal(input: {
  providerCheckoutId: string
  status: 'failed' | 'expired' | 'cancelled'
  occurredAt: string
  providerMetadata: Record<string, unknown>
}) {
  const supabase = getServiceClient()
  const { data, error } = await supabase.rpc('ghc_provider_mark_academy_sumup_checkout_terminal', {
    p_provider_checkout_id: input.providerCheckoutId,
    p_terminal_status: input.status,
    p_occurred_at: input.occurredAt,
    p_provider_metadata: input.providerMetadata
  })
  if (error) throw new AcademySumUpError('ACADEMY_TERMINAL_STATE_FAILED', error.message)
  return data
}

export async function confirmAcademySumUpPayment(input: {
  providerCheckoutId: string
  providerPaymentId: string
  amountCents: number
  occurredAt: string
  providerMetadata: Record<string, unknown>
}) {
  const supabase = getServiceClient()
  const { data, error } = await supabase.rpc('ghc_provider_confirm_academy_sumup_payment', {
    p_provider_checkout_id: input.providerCheckoutId,
    p_provider_payment_id: input.providerPaymentId,
    p_amount_cents: input.amountCents,
    p_occurred_at: input.occurredAt,
    p_provider_metadata: input.providerMetadata
  })
  if (error) throw new AcademySumUpError('ACADEMY_PAYMENT_CONFIRM_FAILED', error.message)
  return data
}

function findSuccessfulTransaction(checkout: SumUpCheckout, expectedAmountCents: number, currency: string) {
  const transactions = Array.isArray(checkout.transactions) ? checkout.transactions : []
  return transactions.find((transaction: SumUpTransaction) => {
    if (transaction.status !== 'SUCCESSFUL') return false
    if (clean(transaction.currency).toUpperCase() !== currency.toUpperCase()) return false
    if (!clean(transaction.id)) return false
    try { return majorToCents(transaction.amount) === expectedAmountCents } catch { return false }
  })
}

export function verifyAcademySumUpCheckout(input: {
  checkout: SumUpCheckout
  webhookCheckoutId: string
  expectedMerchantCode: string
  context: AcademyCheckoutContext
}) {
  const { checkout, webhookCheckoutId, expectedMerchantCode, context } = input
  const expectedAmountCents = Number(context.expected_amount_cents || context.amount_cents || 0)
  const currency = clean(context.currency).toUpperCase()

  if (clean(checkout.id) !== clean(webhookCheckoutId)) throw new AcademySumUpError('CHECKOUT_ID_MISMATCH', 'El checkout recuperado no coincide con el webhook.')
  if (clean(checkout.merchant_code) !== clean(expectedMerchantCode)) throw new AcademySumUpError('MERCHANT_CODE_MISMATCH', 'El checkout no pertenece al merchant configurado.')
  if (clean(checkout.checkout_reference) !== clean(context.checkout_reference)) throw new AcademySumUpError('CHECKOUT_REFERENCE_MISMATCH', 'La referencia SumUp no coincide con el intento Academy.')
  if (clean(checkout.currency).toUpperCase() !== currency) throw new AcademySumUpError('CURRENCY_MISMATCH', 'La moneda SumUp no coincide con la cuota Academy.')
  if (majorToCents(checkout.amount) !== expectedAmountCents) throw new AcademySumUpError('CHECKOUT_AMOUNT_MISMATCH', 'El importe SumUp no coincide con la cuota Academy.')

  const status = clean(checkout.status).toUpperCase()
  if (!['PENDING','FAILED','PAID','EXPIRED'].includes(status)) throw new AcademySumUpError('UNSUPPORTED_CHECKOUT_STATUS', `Estado SumUp no soportado: ${status || 'desconocido'}.`)

  const baseMetadata: Record<string, unknown> = {
    provider: 'sumup',
    verified_via_sumup_api: true,
    checkout_id: clean(checkout.id),
    checkout_reference: clean(checkout.checkout_reference),
    checkout_status: status,
    checkout_date: clean(checkout.date) || null,
    checkout_valid_until: clean(checkout.valid_until) || null
  }

  if (status !== 'PAID') {
    return {
      status: status as 'PENDING' | 'FAILED' | 'EXPIRED',
      amountCents: expectedAmountCents,
      occurredAt: status === 'EXPIRED' && clean(checkout.valid_until) ? clean(checkout.valid_until) : new Date().toISOString(),
      providerMetadata: baseMetadata
    }
  }

  const transaction = findSuccessfulTransaction(checkout, expectedAmountCents, currency)
  if (!transaction) throw new AcademySumUpError('SUCCESSFUL_TRANSACTION_NOT_FOUND', 'El checkout PAID no contiene una transacción SUCCESSFUL verificable.')

  return {
    status: 'PAID' as const,
    amountCents: expectedAmountCents,
    providerPaymentId: clean(transaction.id),
    occurredAt: clean(transaction.timestamp) || new Date().toISOString(),
    providerMetadata: {
      ...baseMetadata,
      transaction_id: clean(transaction.id),
      transaction_code: transaction.transaction_code || checkout.transaction_code || null,
      transaction_status: transaction.status
    }
  }
}
