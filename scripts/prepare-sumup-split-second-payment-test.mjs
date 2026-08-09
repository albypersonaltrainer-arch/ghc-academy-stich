import { createClient } from '@supabase/supabase-js';

if (process.env.VERCEL_ENV !== 'preview') {
  console.log('[split-sandbox-2] omitido fuera de Preview');
  process.exit(0);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const apiKey = process.env.SUMUP_API_KEY ?? '';
const merchantCode = process.env.SUMUP_MERCHANT_CODE ?? '';
const publicBaseUrl = (process.env.PREVENTA_PUBLIC_BASE_URL ?? '').replace(/\/$/, '');
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? '';
const orderReference = 'GHC-NMB3S6L7';

if (!supabaseUrl || !serviceKey || !apiKey || !merchantCode || !publicBaseUrl || bypassSecret.length !== 32) {
  console.error('[split-sandbox-2] configuración incompleta');
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

const { data: order, error: orderError } = await supabase
  .from('preventa_orders')
  .select('id,order_reference,status,payment_plan,founder_status,founder_place_number,second_due_at')
  .eq('order_reference', orderReference)
  .single();
if (orderError) throw orderError;
if (order.payment_plan !== 'split' || order.status !== 'partial' || order.founder_status !== 'reserved' || !order.founder_place_number) {
  throw new Error('estado de matrícula no válido para segunda cuota');
}

const { data: payment, error: paymentError } = await supabase
  .from('preventa_payments')
  .select('id,status,expected_amount_cents,provider_checkout_id')
  .eq('order_id', order.id)
  .eq('installment_no', 2)
  .single();
if (paymentError) throw paymentError;
if (payment.status !== 'pending' || payment.expected_amount_cents !== 89500) {
  throw new Error('segunda cuota no está pending por 895 EUR');
}

const { data: existingAttempt, error: attemptError } = await supabase
  .from('preventa_checkout_attempts')
  .select('provider_checkout_id,hosted_checkout_url,status')
  .eq('order_id', order.id)
  .eq('installment_no', 2)
  .eq('status', 'created')
  .limit(1)
  .maybeSingle();
if (attemptError) throw attemptError;
if (existingAttempt) {
  console.log(`[split-sandbox-2] checkoutId=${existingAttempt.provider_checkout_id}`);
  console.log(`[split-sandbox-2] hostedCheckoutUrl=${existingAttempt.hosted_checkout_url}`);
  console.log(`[split-sandbox-2] founderPlace=${order.founder_place_number}`);
  console.log('[split-sandbox-2] segunda cuota ya preparada');
  process.exit(0);
}

const attemptToken = Math.random().toString(36).slice(2, 12).toUpperCase().padEnd(10, '0').slice(0, 10);
const checkoutReference = `${orderReference}-I2-A${attemptToken}`;
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
    amount: 895,
    checkout_reference: checkoutReference,
    currency: 'EUR',
    description: 'GHC Academy · Edición Fundadora · SEGUNDA CUOTA · PRUEBA SANDBOX',
    merchant_code: merchantCode,
    hosted_checkout: { enabled: true },
    redirect_url: `${publicBaseUrl}/preventa/confirmacion?ref=${encodeURIComponent(orderReference)}`,
    return_url: callback.toString(),
  }),
});

if (!createResponse.ok) throw new Error(`SumUp create:${createResponse.status}:${await createResponse.text()}`);
const checkout = await createResponse.json();
if (!checkout?.id || !checkout?.hosted_checkout_url) throw new Error('checkout inválido');

const { data: registered, error: registerError } = await supabase.rpc('preventa_register_checkout_attempt_v1', {
  p_order_reference: orderReference,
  p_installment_no: 2,
  p_checkout_reference: checkoutReference,
  p_provider_checkout_id: checkout.id,
  p_hosted_checkout_url: checkout.hosted_checkout_url,
  p_expected_amount_cents: 89500,
  p_idempotency_key: `checkout:${checkout.id}`,
  p_occurred_at: new Date().toISOString(),
});
if (registerError) throw registerError;

console.log(`[split-sandbox-2] orderReference=${orderReference}`);
console.log(`[split-sandbox-2] checkoutReference=${checkoutReference}`);
console.log(`[split-sandbox-2] checkoutId=${checkout.id}`);
console.log(`[split-sandbox-2] hostedCheckoutUrl=${checkout.hosted_checkout_url}`);
console.log(`[split-sandbox-2] founderPlace=${order.founder_place_number}`);
console.log(`[split-sandbox-2] dueAt=${order.second_due_at}`);
console.log(`[split-sandbox-2] registered=${Boolean(registered)}`);
console.log('[split-sandbox-2] listo: segunda cuota 895 EUR ficticios sobre la misma matrícula y plaza');
