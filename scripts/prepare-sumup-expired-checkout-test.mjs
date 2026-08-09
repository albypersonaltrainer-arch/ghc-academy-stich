import { createClient } from '@supabase/supabase-js';

if (process.env.VERCEL_ENV !== 'preview') {
  console.log('[expired-sandbox] omitido fuera de Preview');
  process.exit(0);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const apiKey = process.env.SUMUP_API_KEY ?? '';
const merchantCode = process.env.SUMUP_MERCHANT_CODE ?? '';
const publicBaseUrl = (process.env.PREVENTA_PUBLIC_BASE_URL ?? '').replace(/\/$/, '');
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? '';

if (!supabaseUrl || !serviceKey || !apiKey || !merchantCode || !publicBaseUrl || bypassSecret.length !== 32) {
  throw new Error('EXPIRED_SANDBOX_CONFIG_INCOMPLETE');
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const { data: existing, error: existingError } = await supabase
  .from('preventa_orders')
  .select('id,order_reference')
  .eq('first_name', 'Sandbox')
  .eq('last_name', 'Expiracion API')
  .like('email_normalized', 'sandbox-expired-%@example.invalid')
  .limit(1)
  .maybeSingle();
if (existingError) throw existingError;
if (existing) {
  console.log(`[expired-sandbox] test ya existe: ${existing.order_reference}`);
  process.exit(0);
}

const merchantResponse = await fetch(`https://api.sumup.com/v1/merchants/${encodeURIComponent(merchantCode)}`, {
  headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
});
if (!merchantResponse.ok) throw new Error(`merchant:${merchantResponse.status}`);
const merchant = await merchantResponse.json();
if (merchant?.sandbox !== true || merchant?.merchant_code !== merchantCode) {
  throw new Error('BLOQUEADO: merchant no Sandbox');
}

const suffix = Math.random().toString(36).slice(2, 10).toUpperCase().padEnd(8, '0').slice(0, 8);
const orderReference = `GHC-${suffix}`;
const requestKey = `sandbox-expired-${Date.now()}-${suffix}`;
const attemptToken = Math.random().toString(36).slice(2, 12).toUpperCase().padEnd(10, '0').slice(0, 10);
const checkoutReference = `${orderReference}-I1-A${attemptToken}`;
const now = new Date();
const occurredAt = now.toISOString();
const heldUntil = new Date(now.getTime() + 45 * 60 * 1000).toISOString();

async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(`${name}:${error.message}`);
  return data;
}

const draft = await rpc('preventa_create_draft_v1', {
  p_order_reference: orderReference,
  p_request_key: requestKey,
  p_first_name: 'Sandbox',
  p_last_name: 'Expiracion API',
  p_email: `sandbox-expired-${suffix.toLowerCase()}@example.invalid`,
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
  p_source_channel: 'sandbox_expired_checkout_test',
  p_source_detail: 'sumup_delete_checkout',
  p_campaign_code: '',
  p_closer_code: '',
});
if (!draft?.order_id) throw new Error('DRAFT_INVALID');

await rpc('preventa_reserve_capacity_v1', {
  p_order_reference: orderReference,
  p_checkout_reference: checkoutReference,
  p_held_until: heldUntil,
  p_idempotency_key: `capacity:${checkoutReference}`,
  p_occurred_at: occurredAt,
});

const callback = new URL('/api/preventa/sumup-webhook', publicBaseUrl);
callback.searchParams.set('x-vercel-protection-bypass', bypassSecret);

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
    description: 'GHC Academy · EXPIRACION API · PRUEBA SANDBOX',
    merchant_code: merchantCode,
    hosted_checkout: { enabled: true },
    redirect_url: `${publicBaseUrl}/preventa/confirmacion?ref=${encodeURIComponent(orderReference)}`,
    return_url: callback.toString(),
  }),
});
if (!createResponse.ok) throw new Error(`SumUp create:${createResponse.status}:${await createResponse.text()}`);
const checkout = await createResponse.json();
if (!checkout?.id || !checkout?.hosted_checkout_url || checkout?.status !== 'PENDING') throw new Error('CHECKOUT_INVALID');

const registeredAt = new Date().toISOString();
await rpc('preventa_attach_capacity_checkout_v1', {
  p_order_reference: orderReference,
  p_checkout_reference: checkoutReference,
  p_provider_checkout_id: checkout.id,
  p_occurred_at: registeredAt,
});
await rpc('preventa_register_checkout_attempt_v1', {
  p_order_reference: orderReference,
  p_installment_no: 1,
  p_checkout_reference: checkoutReference,
  p_provider_checkout_id: checkout.id,
  p_hosted_checkout_url: checkout.hosted_checkout_url,
  p_expected_amount_cents: 169000,
  p_idempotency_key: `checkout:${checkout.id}`,
  p_occurred_at: registeredAt,
});

const deactivateResponse = await fetch(`https://api.sumup.com/v0.1/checkouts/${encodeURIComponent(checkout.id)}`, {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
});
if (!deactivateResponse.ok) throw new Error(`SumUp deactivate:${deactivateResponse.status}:${await deactivateResponse.text()}`);
const deactivated = await deactivateResponse.json();
if (deactivated?.status !== 'EXPIRED' || deactivated?.id !== checkout.id) {
  throw new Error(`CHECKOUT_NOT_EXPIRED:${deactivated?.status ?? 'unknown'}`);
}

const webhookResponse = await fetch(callback, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({ event_type: 'CHECKOUT_STATUS_CHANGED', id: checkout.id }),
});
const webhookBody = await webhookResponse.json().catch(() => null);
if (!webhookResponse.ok || webhookBody?.terminalStatus !== 'expired' || webhookBody?.applied !== true) {
  throw new Error(`WEBHOOK_EXPIRED_FAILED:${webhookResponse.status}:${JSON.stringify(webhookBody)}`);
}

const { data: state, error: stateError } = await supabase
  .from('preventa_orders')
  .select('id,status,founder_status,founder_place_number')
  .eq('order_reference', orderReference)
  .single();
if (stateError) throw stateError;

const [{ data: payment, error: paymentError }, { data: attempt, error: attemptError }, { data: hold, error: holdError }] = await Promise.all([
  supabase.from('preventa_payments').select('status,paid_amount_cents').eq('order_id', state.id).eq('installment_no', 1).single(),
  supabase.from('preventa_checkout_attempts').select('status').eq('order_id', state.id).eq('provider_checkout_id', checkout.id).single(),
  supabase.from('preventa_capacity_holds').select('status,founder_place_number,released_at').eq('order_id', state.id).eq('provider_checkout_id', checkout.id).single(),
]);
if (paymentError || attemptError || holdError) throw paymentError || attemptError || holdError;

if (
  state.status !== 'awaiting_payment' ||
  state.founder_status !== 'pending' ||
  state.founder_place_number !== null ||
  payment.status !== 'pending' ||
  payment.paid_amount_cents !== 0 ||
  attempt.status !== 'expired' ||
  hold.status !== 'expired'
) {
  throw new Error(`EXPIRED_STATE_INVALID:${JSON.stringify({ state, payment, attempt, hold })}`);
}

console.log(`[expired-sandbox] orderReference=${orderReference}`);
console.log(`[expired-sandbox] checkoutId=${checkout.id}`);
console.log('[expired-sandbox] sumupStatus=EXPIRED');
console.log('[expired-sandbox] webhookStatus=200');
console.log(`[expired-sandbox] orderStatus=${state.status}`);
console.log(`[expired-sandbox] paymentStatus=${payment.status}`);
console.log(`[expired-sandbox] attemptStatus=${attempt.status}`);
console.log(`[expired-sandbox] holdStatus=${hold.status}`);
console.log(`[expired-sandbox] founderPlace=${state.founder_place_number ?? 'none'}`);
console.log('[expired-sandbox] OK: checkout expirado, sin cobro ni plaza, matrícula reintentable');
