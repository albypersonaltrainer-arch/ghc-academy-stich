import { createClient } from '@supabase/supabase-js';

if (process.env.VERCEL_ENV !== 'preview') {
  console.log('[paid-idempotency] omitido fuera de Preview');
  process.exit(0);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const apiKey = process.env.SUMUP_API_KEY ?? '';
const merchantCode = process.env.SUMUP_MERCHANT_CODE ?? '';
const publicBaseUrl = (process.env.PREVENTA_PUBLIC_BASE_URL ?? '').replace(/\/$/, '');
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? '';

if (!supabaseUrl || !serviceKey || !apiKey || !merchantCode || !publicBaseUrl || bypassSecret.length !== 32) {
  throw new Error('PAID_IDEMPOTENCY_CONFIG_INCOMPLETE');
}

const orderReference = 'GHC-AX7CH415';
const checkoutReference = 'GHC-AX7CH415-I1-AKCXWRGM6GP';
const checkoutId = '5ea3d82c-c26e-4dea-8d02-ab9bcd291c8f';
const expectedAmountCents = 169000;
const historicalStart = '2026-08-08T17:50:18.000Z';
const historicalAttach = '2026-08-08T17:50:19.000Z';
const historicalRegister = '2026-08-08T17:50:20.000Z';
const historicalHeldUntil = '2026-08-08T18:35:18.679Z';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(`${name}:${error.message}`);
  return data;
}

const providerResponse = await fetch(`https://api.sumup.com/v0.1/checkouts/${encodeURIComponent(checkoutId)}`, {
  headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
});
if (!providerResponse.ok) {
  throw new Error(`SUMUP_RETRIEVE_FAILED:${providerResponse.status}:${await providerResponse.text()}`);
}
const providerCheckout = await providerResponse.json();
const successfulTransaction = Array.isArray(providerCheckout?.transactions)
  ? providerCheckout.transactions.find((tx) => String(tx?.status ?? '').toUpperCase() === 'SUCCESSFUL')
  : null;

if (
  providerCheckout?.id !== checkoutId ||
  providerCheckout?.checkout_reference !== checkoutReference ||
  providerCheckout?.merchant_code !== merchantCode ||
  providerCheckout?.currency !== 'EUR' ||
  providerCheckout?.status !== 'PAID' ||
  Math.round(Number(providerCheckout?.amount) * 100) !== expectedAmountCents ||
  !successfulTransaction?.id
) {
  throw new Error(`HISTORICAL_SANDBOX_CHECKOUT_NOT_REUSABLE:${JSON.stringify({
    id: providerCheckout?.id,
    checkout_reference: providerCheckout?.checkout_reference,
    merchant_code: providerCheckout?.merchant_code,
    currency: providerCheckout?.currency,
    status: providerCheckout?.status,
    amount: providerCheckout?.amount,
    transactionStatus: successfulTransaction?.status ?? null,
  })}`);
}

// Elimina únicamente un residuo del mismo escenario Sandbox si existiera.
await supabase.from('preventa_orders').delete().eq('order_reference', orderReference);

let orderCreated = false;
try {
  const draft = await rpc('preventa_create_draft_v1', {
    p_order_reference: orderReference,
    p_request_key: 'sandbox-paid-idempotency-ax7ch415',
    p_first_name: 'Sandbox',
    p_last_name: 'Idempotencia PAID',
    p_email: 'sandbox-paid-idempotency@example.invalid',
    p_country: 'España',
    p_phone: '',
    p_payment_plan: 'single',
    p_total_amount_cents: 169000,
    p_first_installment_cents: 169000,
    p_second_installment_cents: 0,
    p_offer_code: 'GHC_FOUNDERS_2026',
    p_offer_version: '2026-08-08',
    p_terms_version: 'PREVENTA_2026_TERMS_APPROVED_BASE',
    p_privacy_version: 'PREVENTA_2026_PRIVACY_APPROVED_BASE',
    p_legal_package_version: 'GHC_ACADEMY_JURIDICO_PREVENTA_2026_APROBADO',
    p_marketing_consent: false,
    p_source_channel: 'sandbox_paid_webhook_idempotency',
    p_source_detail: 'historical_paid_checkout_replay',
    p_campaign_code: '',
    p_closer_code: '',
  });
  if (!draft?.order_id) throw new Error('DRAFT_INVALID');
  orderCreated = true;

  await rpc('preventa_reserve_capacity_v1', {
    p_order_reference: orderReference,
    p_checkout_reference: checkoutReference,
    p_held_until: historicalHeldUntil,
    p_idempotency_key: `capacity:${checkoutReference}:idempotency-test`,
    p_occurred_at: historicalStart,
  });

  await rpc('preventa_attach_capacity_checkout_v1', {
    p_order_reference: orderReference,
    p_checkout_reference: checkoutReference,
    p_provider_checkout_id: checkoutId,
    p_occurred_at: historicalAttach,
  });

  await rpc('preventa_register_checkout_attempt_v1', {
    p_order_reference: orderReference,
    p_installment_no: 1,
    p_checkout_reference: checkoutReference,
    p_provider_checkout_id: checkoutId,
    p_hosted_checkout_url: providerCheckout.hosted_checkout_url || `https://checkout.sumup.com/pay/c-${checkoutId}`,
    p_expected_amount_cents: expectedAmountCents,
    p_idempotency_key: `checkout:${checkoutId}:idempotency-test`,
    p_occurred_at: historicalRegister,
  });

  const webhookUrl = new URL('/api/preventa/sumup-webhook', publicBaseUrl);
  webhookUrl.searchParams.set('x-vercel-protection-bypass', bypassSecret);

  async function sendWebhook(label) {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ event_type: 'CHECKOUT_STATUS_CHANGED', id: checkoutId }),
    });
    const body = await response.json().catch(() => null);
    console.log(`[paid-idempotency] ${label}HttpStatus=${response.status}`);
    console.log(`[paid-idempotency] ${label}Applied=${body?.applied ?? 'missing'}`);
    console.log(`[paid-idempotency] ${label}Replay=${body?.transition?.idempotent_replay ?? 'missing'}`);
    if (!response.ok || body?.ok !== true || body?.checkoutStatus !== 'PAID' || body?.applied !== true) {
      throw new Error(`${label.toUpperCase()}_WEBHOOK_FAILED:${response.status}:${JSON.stringify(body)}`);
    }
    return body;
  }

  const first = await sendWebhook('first');
  const second = await sendWebhook('second');

  if (first?.transition?.idempotent_replay !== false) {
    throw new Error(`FIRST_WEBHOOK_NOT_APPLIED_FRESH:${JSON.stringify(first?.transition)}`);
  }
  if (second?.transition?.idempotent_replay !== true) {
    throw new Error(`SECOND_WEBHOOK_NOT_IDEMPOTENT:${JSON.stringify(second?.transition)}`);
  }

  const { data: order, error: orderError } = await supabase
    .from('preventa_orders')
    .select('id,status,founder_status,founder_place_number')
    .eq('order_reference', orderReference)
    .single();
  if (orderError) throw orderError;

  const [paymentResult, attemptResult, holdResult, eventResult, emailResult, attributionResult] = await Promise.all([
    supabase.from('preventa_payments').select('status,paid_amount_cents,provider_payment_id').eq('order_id', order.id).eq('installment_no', 1).single(),
    supabase.from('preventa_checkout_attempts').select('status').eq('order_id', order.id).eq('provider_checkout_id', checkoutId).single(),
    supabase.from('preventa_capacity_holds').select('status,consumed_at').eq('order_id', order.id).eq('provider_checkout_id', checkoutId).single(),
    supabase.from('preventa_events').select('id').eq('order_id', order.id).eq('event_type', 'payment.installment.paid'),
    supabase.from('preventa_email_queue').select('id').eq('order_id', order.id).eq('template_code', 'E01'),
    supabase.from('preventa_attribution').select('commission_base_cents').eq('order_id', order.id).single(),
  ]);

  for (const result of [paymentResult, attemptResult, holdResult, eventResult, emailResult, attributionResult]) {
    if (result.error) throw result.error;
  }

  if (
    order.status !== 'paid' ||
    order.founder_status !== 'confirmed' ||
    !order.founder_place_number ||
    paymentResult.data.status !== 'paid' ||
    paymentResult.data.paid_amount_cents !== expectedAmountCents ||
    paymentResult.data.provider_payment_id !== successfulTransaction.id ||
    attemptResult.data.status !== 'paid' ||
    holdResult.data.status !== 'consumed' ||
    !holdResult.data.consumed_at ||
    eventResult.data.length !== 1 ||
    emailResult.data.length !== 1 ||
    attributionResult.data.commission_base_cents !== expectedAmountCents
  ) {
    throw new Error(`PAID_IDEMPOTENCY_FINAL_STATE_INVALID:${JSON.stringify({
      order,
      payment: paymentResult.data,
      attempt: attemptResult.data,
      hold: holdResult.data,
      paymentEvents: eventResult.data.length,
      e01: emailResult.data.length,
      attribution: attributionResult.data,
    })}`);
  }

  console.log(`[paid-idempotency] providerPaymentId=${successfulTransaction.id}`);
  console.log(`[paid-idempotency] founderPlace=${order.founder_place_number}`);
  console.log('[paid-idempotency] paymentEvents=1');
  console.log('[paid-idempotency] E01=1');
  console.log('[paid-idempotency] OK: webhook PAID duplicado devuelve 200 y no duplica efectos');
} finally {
  if (orderCreated) {
    const { error } = await supabase.from('preventa_orders').delete().eq('order_reference', orderReference);
    if (error) throw error;
    console.log('[paid-idempotency] cleanup=OK');
  }
}
