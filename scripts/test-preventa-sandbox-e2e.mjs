import { createClient } from '@supabase/supabase-js';

if (process.env.VERCEL_ENV !== 'preview') {
  console.log('[preventa-e2e] omitido fuera de Preview');
  process.exit(0);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const apiKey = process.env.SUMUP_API_KEY ?? '';
const merchantCode = process.env.SUMUP_MERCHANT_CODE ?? '';
const publicBaseUrl = (process.env.PREVENTA_PUBLIC_BASE_URL ?? '').replace(/\/$/, '');

if (!supabaseUrl || !serviceKey || !apiKey || !merchantCode || !publicBaseUrl) {
  console.error('[preventa-e2e] configuración incompleta');
  process.exit(1);
}

const merchantResponse = await fetch(`https://api.sumup.com/v1/merchants/${encodeURIComponent(merchantCode)}`, {
  headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
});
if (!merchantResponse.ok) process.exit(1);
const merchant = await merchantResponse.json();
if (merchant?.sandbox !== true || merchant?.merchant_code !== merchantCode) {
  console.error('[preventa-e2e] BLOQUEADO: merchant no Sandbox');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const suffix = Math.random().toString(36).slice(2, 10).toUpperCase().padEnd(8, '0').slice(0, 8);
const orderReference = `GHC-${suffix}`;
const requestKey = `sandbox-e2e-${Date.now()}-${suffix}`;
const checkoutReference = `GHC-E2E-${Date.now().toString(36).toUpperCase()}-${suffix}`;
const now = new Date();
const occurredAt = now.toISOString();
const heldUntil = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
let orderId = null;

async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(`${name}:${error.message}`);
  return data;
}

try {
  const draft = await rpc('preventa_create_draft_v1', {
    p_order_reference: orderReference,
    p_request_key: requestKey,
    p_first_name: 'Sandbox',
    p_last_name: 'GHC Academy',
    p_email: `sandbox-${suffix.toLowerCase()}@example.invalid`,
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
    p_source_channel: 'sandbox_e2e',
    p_source_detail: 'vercel_preview_build',
    p_campaign_code: '',
    p_closer_code: '',
  });
  orderId = draft?.order_id;
  if (!orderId || draft?.order_reference !== orderReference) throw new Error('draft inválido');
  console.log('[preventa-e2e] draft: OK');

  const hold = await rpc('preventa_reserve_capacity_v1', {
    p_order_reference: orderReference,
    p_checkout_reference: checkoutReference,
    p_held_until: heldUntil,
    p_idempotency_key: `capacity:${checkoutReference}`,
    p_occurred_at: occurredAt,
  });
  if (!hold?.hold_id || !hold?.founder_place_number) throw new Error('hold inválido');
  console.log('[preventa-e2e] capacityHold: OK');

  const createResponse = await fetch('https://api.sumup.com/v0.1/checkouts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: 1690,
      checkout_reference: checkoutReference,
      currency: 'EUR',
      description: 'GHC Academy · Edición Fundadora · prueba E2E Sandbox',
      merchant_code: merchantCode,
      hosted_checkout: { enabled: true },
      redirect_url: `${publicBaseUrl}/preventa/confirmacion?ref=${encodeURIComponent(orderReference)}`,
    }),
  });
  if (!createResponse.ok) throw new Error(`SumUp create:${createResponse.status}`);
  const checkout = await createResponse.json();
  if (!checkout?.id || !checkout?.hosted_checkout_url || checkout?.merchant_code !== merchantCode) {
    throw new Error('checkout inválido');
  }
  console.log('[preventa-e2e] hostedCheckout: OK');

  await rpc('preventa_attach_capacity_checkout_v1', {
    p_order_reference: orderReference,
    p_checkout_reference: checkoutReference,
    p_provider_checkout_id: checkout.id,
    p_occurred_at: new Date().toISOString(),
  });
  console.log('[preventa-e2e] attachHold: OK');

  await rpc('preventa_register_checkout_attempt_v1', {
    p_order_reference: orderReference,
    p_installment_no: 1,
    p_checkout_reference: checkoutReference,
    p_provider_checkout_id: checkout.id,
    p_hosted_checkout_url: checkout.hosted_checkout_url,
    p_expected_amount_cents: 169000,
    p_idempotency_key: `checkout:${checkout.id}`,
    p_occurred_at: new Date().toISOString(),
  });
  console.log('[preventa-e2e] checkoutAttempt: OK');

  const { data: order, error: orderError } = await supabase
    .from('preventa_orders')
    .select('status,founder_status,founder_place_number')
    .eq('id', orderId)
    .single();
  if (orderError) throw orderError;

  const { data: holdRow, error: holdError } = await supabase
    .from('preventa_capacity_holds')
    .select('status,provider_checkout_id')
    .eq('order_id', orderId)
    .single();
  if (holdError) throw holdError;

  const { data: attempt, error: attemptError } = await supabase
    .from('preventa_checkout_attempts')
    .select('status,expected_amount_cents,provider_checkout_id')
    .eq('order_id', orderId)
    .single();
  if (attemptError) throw attemptError;

  const stateOk = order?.status === 'awaiting_payment' &&
    order?.founder_status === 'pending' &&
    order?.founder_place_number == null &&
    holdRow?.status === 'attached' &&
    holdRow?.provider_checkout_id === checkout.id &&
    attempt?.status === 'created' &&
    attempt?.expected_amount_cents === 169000 &&
    attempt?.provider_checkout_id === checkout.id;

  if (!stateOk) throw new Error('estado E2E inesperado');
  console.log('[preventa-e2e] persistedState: OK');
} finally {
  if (orderId) {
    const { error: deleteError } = await supabase.from('preventa_orders').delete().eq('id', orderId);
    if (deleteError) {
      console.error(`[preventa-e2e] cleanup FAIL: ${deleteError.message}`);
      process.exit(1);
    }
    const { count, error: countError } = await supabase
      .from('preventa_orders')
      .select('id', { count: 'exact', head: true })
      .eq('id', orderId);
    if (countError || count !== 0) {
      console.error('[preventa-e2e] cleanup verification FAIL');
      process.exit(1);
    }
    console.log('[preventa-e2e] cleanup: OK');
  }
}

console.log('[preventa-e2e] E2E Sandbox OK: matrícula ficticia limpia; checkout externo queda solo en Sandbox y sin pago');
