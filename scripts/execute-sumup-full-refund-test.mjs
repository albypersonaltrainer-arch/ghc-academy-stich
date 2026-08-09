import { createClient } from '@supabase/supabase-js';

if (process.env.VERCEL_ENV !== 'preview') {
  console.log('[refund-exec] omitido fuera de Preview');
  process.exit(0);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const apiKey = process.env.SUMUP_API_KEY ?? '';
const merchantCode = process.env.SUMUP_MERCHANT_CODE ?? '';
const orderReference = 'GHC-TOVHYZSY';

if (!supabaseUrl || !serviceKey || !apiKey || !merchantCode) {
  throw new Error('REFUND_SANDBOX_CONFIG_INCOMPLETE');
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const { data: order, error: orderError } = await supabase
  .from('preventa_orders')
  .select('id,status,founder_status,founder_place_number')
  .eq('order_reference', orderReference)
  .single();
if (orderError) throw orderError;

if (order.status === 'refunded') {
  console.log('[refund-exec] matrícula ya reembolsada; no se repite la llamada externa');
  process.exit(0);
}
if (order.status !== 'paid' || order.founder_status !== 'confirmed' || !order.founder_place_number) {
  throw new Error(`REFUND_ORDER_NOT_PAID:${JSON.stringify(order)}`);
}

const { data: payment, error: paymentError } = await supabase
  .from('preventa_payments')
  .select('status,paid_amount_cents,refunded_amount_cents,provider_payment_id,provider_checkout_id')
  .eq('order_id', order.id)
  .eq('installment_no', 1)
  .single();
if (paymentError) throw paymentError;
if (payment.status !== 'paid' || payment.paid_amount_cents !== 169000 || !payment.provider_payment_id || !payment.provider_checkout_id) {
  throw new Error(`REFUND_PAYMENT_NOT_READY:${JSON.stringify(payment)}`);
}

const transactionId = payment.provider_payment_id;
const refundResponse = await fetch(`https://api.sumup.com/v0.1/me/refund/${encodeURIComponent(transactionId)}`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
  },
});

const refundText = await refundResponse.text();
let refundBody = null;
try { refundBody = refundText ? JSON.parse(refundText) : null; } catch { refundBody = refundText || null; }

if (!refundResponse.ok) {
  throw new Error(`SUMUP_REFUND_FAILED:${refundResponse.status}:${typeof refundBody === 'string' ? refundBody : JSON.stringify(refundBody)}`);
}

console.log(`[refund-exec] refundHttpStatus=${refundResponse.status}`);
console.log('[refund-exec] llamada de reembolso aceptada por SumUp');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let verified = null;
let refundEvent = null;

for (let attempt = 0; attempt < 10; attempt += 1) {
  const txResponse = await fetch(
    `https://api.sumup.com/v2.1/merchants/${encodeURIComponent(merchantCode)}/transactions?id=${encodeURIComponent(transactionId)}`,
    { headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' } }
  );

  if (txResponse.ok) {
    const tx = await txResponse.json();
    const events = [
      ...(Array.isArray(tx?.events) ? tx.events : []),
      ...(Array.isArray(tx?.transaction_events) ? tx.transaction_events : []),
    ];
    refundEvent = events.find((event) =>
      event?.type === 'REFUND' && ['REFUNDED', 'SUCCESSFUL'].includes(String(event?.status ?? '').toUpperCase())
    ) ?? null;

    const txRefunded = ['REFUNDED'].includes(String(tx?.status ?? '').toUpperCase()) ||
      ['REFUNDED'].includes(String(tx?.simple_status ?? '').toUpperCase()) ||
      Boolean(refundEvent);

    if (txRefunded) {
      verified = { source: 'transaction', tx };
      break;
    }
  }

  const checkoutResponse = await fetch(`https://api.sumup.com/v0.1/checkouts/${encodeURIComponent(payment.provider_checkout_id)}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  });
  if (checkoutResponse.ok) {
    const checkout = await checkoutResponse.json();
    const txs = Array.isArray(checkout?.transactions) ? checkout.transactions : [];
    const refundedTx = txs.find((tx) => tx?.id === transactionId && String(tx?.status ?? '').toUpperCase() === 'REFUNDED');
    if (refundedTx) {
      verified = { source: 'checkout', checkout, refundedTx };
      break;
    }
  }

  await sleep(1000);
}

if (!verified) {
  throw new Error('SUMUP_REFUND_NOT_VERIFIED_AFTER_ACCEPTANCE');
}

const providerRefundId = String(refundEvent?.id || `sumup-full-refund:${transactionId}`);
const occurredAt = new Date().toISOString();

const { data: transition, error: transitionError } = await supabase.rpc('preventa_full_refund_v1', {
  p_order_reference: orderReference,
  p_provider_refund_id: providerRefundId,
  p_idempotency_key: `sumup:${transactionId}:full-refund`,
  p_occurred_at: occurredAt,
});
if (transitionError) throw transitionError;

const { data: finalOrder, error: finalOrderError } = await supabase
  .from('preventa_orders')
  .select('id,status,founder_status,founder_place_number')
  .eq('order_reference', orderReference)
  .single();
if (finalOrderError) throw finalOrderError;

const [finalPaymentResult, attributionResult, eventResult] = await Promise.all([
  supabase.from('preventa_payments').select('status,paid_amount_cents,refunded_amount_cents').eq('order_id', finalOrder.id).eq('installment_no', 1).single(),
  supabase.from('preventa_attribution').select('commission_base_cents,commission_status').eq('order_id', finalOrder.id).single(),
  supabase.from('preventa_events').select('id').eq('order_id', finalOrder.id).eq('event_type', 'payment.full_refunded'),
]);
if (finalPaymentResult.error) throw finalPaymentResult.error;
if (attributionResult.error) throw attributionResult.error;
if (eventResult.error) throw eventResult.error;

const finalPayment = finalPaymentResult.data;
const attribution = attributionResult.data;
if (
  finalOrder.status !== 'refunded' ||
  finalOrder.founder_status !== 'released' ||
  finalOrder.founder_place_number !== null ||
  finalPayment.status !== 'refunded' ||
  finalPayment.refunded_amount_cents !== 169000 ||
  attribution.commission_base_cents !== 0 ||
  attribution.commission_status !== 'reversed' ||
  eventResult.data.length !== 1
) {
  throw new Error(`REFUND_FINAL_STATE_INVALID:${JSON.stringify({ finalOrder, finalPayment, attribution, refundEvents: eventResult.data.length })}`);
}

console.log(`[refund-exec] verifiedVia=${verified.source}`);
console.log(`[refund-exec] providerRefundId=${providerRefundId}`);
console.log(`[refund-exec] transitionApplied=${transition?.idempotent_replay === false}`);
console.log(`[refund-exec] orderStatus=${finalOrder.status}`);
console.log(`[refund-exec] founderStatus=${finalOrder.founder_status}`);
console.log(`[refund-exec] founderPlace=${finalOrder.founder_place_number ?? 'none'}`);
console.log(`[refund-exec] paymentStatus=${finalPayment.status}`);
console.log(`[refund-exec] refundedAmountCents=${finalPayment.refunded_amount_cents}`);
console.log(`[refund-exec] commissionBaseCents=${attribution.commission_base_cents}`);
console.log(`[refund-exec] commissionStatus=${attribution.commission_status}`);
console.log('[refund-exec] OK: reembolso completo verificado y aplicado end-to-end');
