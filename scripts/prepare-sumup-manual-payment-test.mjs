import { createClient } from '@supabase/supabase-js';

if (process.env.VERCEL_ENV !== 'preview') {
  console.log('[manual-sandbox] omitido fuera de Preview');
  process.exit(0);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const apiKey = process.env.SUMUP_API_KEY ?? '';
const merchantCode = process.env.SUMUP_MERCHANT_CODE ?? '';
const publicBaseUrl = (process.env.PREVENTA_PUBLIC_BASE_URL ?? '').replace(/\/$/, '');
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? '';

if (!supabaseUrl || !serviceKey || !apiKey || !merchantCode || !publicBaseUrl || bypassSecret.length !== 32) {
  console.error('[manual-sandbox] configuración incompleta');
  process.exit(1);
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

const existing = await supabase
  .from('preventa_orders')
  .select('id,order_reference')
  .eq('source_channel', 'sandbox_manual_payment_test')
  .limit(1)
  .maybeSingle();

if (existing.error) throw existing.error;
if (existing.data) {
  console.log(`[manual-sandbox] test ya preparado: ${existing.data.order_reference}`);
  process.exit(0);
}

const suffix = Math.random().toString(36).slice(2, 10).toUpperCase().padEnd(8, '0').slice(0, 8);
const orderReference = `GHC-${suffix}`;
const requestKey = `sandbox-manual-${Date.now()}-${suffix}`;
const checkoutReference = `GHC-MANUAL-${Date.now().toString(36).toUpperCase()}-${suffix}`;
const now = new Date();
const occurredAt = now.toISOString();
const heldUntil = new Date(now.getTime() + 30 * 60 * 1000).toISOString();

async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(`${name}:${error.message}`);
  return data;
}

const draft = await rpc('preventa_create_draft_v1', {
  p_order_reference: orderReference,
  p_request_key: requestKey,
  p_first_name: 'Sandbox',
  p_last_name: 'Pago Manual',
  p_email: `sandbox-manual-${suffix.toLowerCase()}@example.invalid`,
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
  p_source_channel: 'sandbox_manual_payment_test',
  p_source_detail: 'manual_hosted_checkout_payment_test',
  p_campaign_code: '',
  p_closer_code: '',
});

if (!draft?.order_id) throw new Error('draft inválido');

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
    description: 'GHC Academy · Edición Fundadora · PRUEBA SANDBOX',
    merchant_code: merchantCode,
    hosted_checkout: { enabled: true },
    redirect_url: `${publicBaseUrl}/preventa/confirmacion?ref=${encodeURIComponent(orderReference)}`,
    return_url: callback.toString(),
  }),
});

if (!createResponse.ok) throw new Error(`SumUp create:${createResponse.status}:${await createResponse.text()}`);
const checkout = await createResponse.json();
if (!checkout?.id || !checkout?.hosted_checkout_url) throw new Error('checkout inválido');

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

console.log(`[manual-sandbox] orderReference=${orderReference}`);
console.log(`[manual-sandbox] checkoutId=${checkout.id}`);
console.log(`[manual-sandbox] hostedCheckoutUrl=${checkout.hosted_checkout_url}`);
console.log('[manual-sandbox] listo: Sandbox, 1690 EUR ficticios, matrícula retenida hasta completar la prueba');
