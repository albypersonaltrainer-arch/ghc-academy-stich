import 'server-only';
import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { retrieveSumUpCheckout } from './sumup-client';
import { refundPreventaOrder } from './payment-persistence';
import { getPreventaEmailWorkerStatus, runPreventaEmailWorker } from './email-worker';

type RefundablePayment = {
  installment_no: number;
  status: string;
  paid_amount_cents: number;
  refunded_amount_cents: number;
  provider_payment_id: string | null;
  provider_checkout_id: string | null;
};

function clean(value: string | undefined) {
  return (value || '').trim();
}

function getConfig() {
  const persistenceEnabled = process.env.PREVENTA_PERSISTENCE_ENABLED === 'true';
  const supabaseUrl = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const sumupApiKey = clean(process.env.SUMUP_API_KEY);

  return {
    persistenceReady: persistenceEnabled && Boolean(supabaseUrl) && Boolean(serviceRoleKey),
    supabaseUrl,
    serviceRoleKey,
    sumupApiKey,
  };
}

function getAdminClient() {
  const config = getConfig();
  if (!config.persistenceReady) throw new Error('PREVENTA_REFUND_PERSISTENCE_NOT_READY');

  return createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function requestFullSumUpRefund(transactionId: string) {
  const apiKey = getConfig().sumupApiKey;
  if (!apiKey) throw new Error('SUMUP_API_KEY_NOT_CONFIGURED');

  const response = await fetch(
    `https://api.sumup.com/v0.1/me/refund/${encodeURIComponent(transactionId)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    }
  );

  if (response.status === 204) return;

  const body = await response.text().catch(() => '');
  throw new Error(`SUMUP_FULL_REFUND_FAILED:${response.status}:${body.slice(0, 240)}`);
}

async function transactionAlreadyRefunded(payment: RefundablePayment) {
  const checkoutId = clean(payment.provider_checkout_id || undefined);
  const transactionId = clean(payment.provider_payment_id || undefined);
  if (!checkoutId || !transactionId) return false;

  const checkout = await retrieveSumUpCheckout(checkoutId);
  const transactions = Array.isArray(checkout.transactions) ? checkout.transactions : [];
  return transactions.some(
    (transaction) => transaction.id === transactionId && transaction.status === 'REFUNDED'
  );
}

export async function refundPreventaOrderViaSumUp(orderReference: string) {
  const reference = orderReference.trim();
  if (!/^GHC-[A-Z0-9]{8}$/.test(reference)) {
    throw new Error('INVALID_ORDER_REFERENCE');
  }

  const supabase = getAdminClient();
  const { data: order, error: orderError } = await supabase
    .from('preventa_orders')
    .select('id, order_reference, status')
    .eq('order_reference', reference)
    .maybeSingle();

  if (orderError) throw new Error(`PREVENTA_REFUND_ORDER_LOOKUP_FAILED:${orderError.message}`);
  if (!order) throw new Error('ORDER_NOT_FOUND');
  if (!['partial', 'paid', 'overdue'].includes(order.status)) {
    throw new Error(`ORDER_NOT_REFUNDABLE:${order.status}`);
  }

  const { data: paymentData, error: paymentsError } = await supabase
    .from('preventa_payments')
    .select(
      'installment_no, status, paid_amount_cents, refunded_amount_cents, provider_payment_id, provider_checkout_id'
    )
    .eq('order_id', order.id)
    .order('installment_no', { ascending: true });

  if (paymentsError) {
    throw new Error(`PREVENTA_REFUND_PAYMENT_LOOKUP_FAILED:${paymentsError.message}`);
  }

  const payments = (paymentData || []) as RefundablePayment[];
  const refundable = payments.filter(
    (payment) =>
      Number(payment.paid_amount_cents || 0) > Number(payment.refunded_amount_cents || 0)
  );

  if (!refundable.length) throw new Error('NOTHING_TO_REFUND');

  const transactionIds = refundable.map((payment) => {
    const transactionId = clean(payment.provider_payment_id || undefined);
    const checkoutId = clean(payment.provider_checkout_id || undefined);
    if (!transactionId || !checkoutId) throw new Error('REFUND_PROVIDER_REFERENCE_MISSING');
    return transactionId;
  });

  const providerResults: Array<{
    installmentNo: number;
    transactionId: string;
    action: 'already_refunded' | 'refund_accepted';
  }> = [];

  for (const payment of refundable) {
    const transactionId = clean(payment.provider_payment_id || undefined);
    const alreadyRefunded = await transactionAlreadyRefunded(payment);

    if (alreadyRefunded) {
      providerResults.push({
        installmentNo: payment.installment_no,
        transactionId,
        action: 'already_refunded',
      });
      continue;
    }

    await requestFullSumUpRefund(transactionId);
    providerResults.push({
      installmentNo: payment.installment_no,
      transactionId,
      action: 'refund_accepted',
    });
  }

  const digest = createHash('sha256')
    .update([...transactionIds].sort().join('|'))
    .digest('hex')
    .slice(0, 24)
    .toUpperCase();
  const providerRefundReference = `SUMUP-FULL-${digest}`;
  const occurredAt = new Date().toISOString();

  const transition = await refundPreventaOrder({
    orderReference: reference,
    providerRefundId: providerRefundReference,
    idempotencyKey: `sumup:full-refund:${digest}`,
    occurredAt,
  });

  let emailResult: unknown = null;
  const worker = getPreventaEmailWorkerStatus();
  if (worker.ready) {
    try {
      emailResult = await runPreventaEmailWorker(10);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'UNKNOWN_EMAIL_WORKER_ERROR';
      console.error('[preventa-email-after-refund]', message);
    }
  }

  return {
    orderReference: reference,
    providerRefundReference,
    providerResults,
    transition,
    emailResult,
  };
}
