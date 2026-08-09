import { createClient } from '@supabase/supabase-js';

if (process.env.VERCEL_ENV !== 'preview') {
  console.log('[failed-sandbox] omitido fuera de Preview');
  process.exit(0);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const apiKey = process.env.SUMUP_API_KEY ?? '';
const merchantCode = process.env.SUMUP_MERCHANT_CODE ?? '';
const publicBaseUrl = (process.env.PREVENTA_PUBLIC_BASE_URL ?? '').replace(/\/$/, '');
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? '';

if (!supabaseUrl || !serviceKey || !apiKey || !merchantCode || !publicBaseUrl || bypassSecret.length !== 32) {
  throw new Error('FAILED_SANDBOX_CONFIG_INCOMPLETE');
}

const merchantResponse = await fetch(`https://api.sumup.com/v1/merchants/${encodeURIComponent(merchantCode)}`, {
  headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
});
if (!merchantResponse.ok) throw new Error(`merchant:${merchantResponse.status}`);
const merchant = await merchantResponse.json();
if (merchant?.sandbox !== true || merchant?.merchant_code !== merchantCode) {
  throw new Error('BLOQUEADO: merchant no Sandbox');
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const { data: existing, error: existingError } = await supabase
  .from('preventa_orders')
  .select('id,order_reference')
  .eq('first_name', 'Sandbox')
  .eq('last_name', 'Fallo 3DS')
  .like('email_normalized', 'sandbox-failed-%@example.invalid')
  .limit(1)
  .maybeSingle();
if (existingError) throw existingError;
if (existing) {
  const { data: attempt, error: attemptError } = await supabase
    .from('preventa_checkout_attempts')
    .select('provider_checkout_id,hosted_checkout_url,status')
    .eq('order_id', existing.id)
    .eq('installment_no', 1)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (attemptError) throw attemptError;
  console.log(`[failed-sandbox] orderReference=${existing.order_reference}`);
  console.log(`[failed-sandbox] checkoutId=${attempt?.provider_checkout_id ?? 'missing'}`);
  console.log(`[failed-sandbox] hostedCheckoutUrl=${attempt?.hosted_checkout_url ?? 'missing'}`);
  console.log(`[failed-sandbox] existingAttemptStatus=${attempt?.status ?? 'missing'}`);
  process.exit(0);
}

const suffix = Math.random().toString(36).slice(2, 10).toUpperCase().padEnd(8, '0').slice(0, 8);
const orderReference = `GHC-${suffix}`;
const requestKey = `sandbox-failed-${Date.now()}-${suffix}`;
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
  p_last_name: 'Fallo 3DS',
  p_email: `sandbox-failed-${suffix.toLowerCase()}@example.invalid`,
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
  p_source_channel: 'sandbox_failed_payment_test',
  p_source_detail: 'hosted_checkout_3ds_failure',
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
    description: 'GHC Academy · FALLO 3DS · PRUEBA SANDBOX',
    merchant_code: merchantCode,
    hosted_checkout: { enabled: true },
    redirect_url: `${publicBaseUrl}/preventa/confirmacion?ref=${encodeURIComponent(orderReference)}`,
    return_url: callback.toString(),
  }),
});
if (!createResponse.ok) throw new Error(`SumUp create:${createResponse.status}:${await createResponse.text()}`);
const checkout = await createResponse.json();
if (!checkout?.id || !checkout?.hosted_checkout_url) throw new Error('CHECKOUT_INVALID');

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

console.log(`[failed-sandbox] orderReference=${orderReference}`);
console.log(`[failed-sandbox] checkoutReference=${checkoutReference}`);
console.log(`[failed-sandbox] checkoutId=${checkout.id}`);
console.log(`[failed-sandbox] hostedCheckoutUrl=${checkout.hosted_checkout_url}`);
console.log(`[failed-sandbox] heldUntil=${heldUntil}`);
console.log('[failed-sandbox] listo: 1690 EUR ficticios con estado inicial pendiente; usar tarjeta oficial de fallo 3DS');
