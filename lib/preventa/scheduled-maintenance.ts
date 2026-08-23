import 'server-only';
import { createClient } from '@supabase/supabase-js';
import {
  getPreventaEmailWorkerStatus,
  runPreventaEmailWorker,
} from './email-worker';
import {
  SumUpAdapterError,
  verifySumUpCheckoutForPreventa,
  verifySumUpCheckoutStateForPreventa,
} from './sumup-adapter';
import {
  getConfiguredSumUpMerchantCode,
  getSumUpIntegrationStatus,
  retrieveSumUpCheckout,
} from './sumup-client';
import {
  confirmPreventaPayment,
  markPreventaCheckoutTerminal,
} from './payment-persistence';

const MAX_ORDERS = 100;
const MAX_RECONCILIATION_ATTEMPTS = 25;
const EMAIL_BATCH_SIZE = 50;
const MAX_EMAIL_BATCHES = 3;

function clean(value: string | null | undefined) {
  return (value || '').trim();
}

function getPersistenceConfig() {
  const enabled = process.env.PREVENTA_PERSISTENCE_ENABLED === 'true';
  const supabaseUrl = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  return {
    ready: enabled && Boolean(supabaseUrl) && Boolean(serviceRoleKey),
    supabaseUrl,
    serviceRoleKey,
  };
}

function createPreventaAdminClient() {
  const config = getPersistenceConfig();
  if (!config.ready) throw new Error('PREVENTA_SCHEDULER_PERSISTENCE_NOT_READY');

  return createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function getPreventaScheduledMaintenanceStatus() {
  const persistence = getPersistenceConfig();
  const emailWorker = getPreventaEmailWorkerStatus();
  const sumup = getSumUpIntegrationStatus();
  const cronSecretConfigured = clean(process.env.CRON_SECRET).length >= 32;

  return {
    persistenceReady: persistence.ready,
    emailWorkerReady: emailWorker.ready,
    sumupReconciliationReady:
      persistence.ready &&
      sumup.webhookEnabled &&
      sumup.apiConfigured &&
      sumup.merchantConfigured,
    // CRON_SECRET remains an optional manual/emergency credential. Normal scheduled
    // execution authenticates with a short-lived GitHub Actions OIDC token, so the
    // absence of the legacy shared secret must not close the operational readiness gate.
    cronSecretConfigured,
    // Economic state transitions are authoritative and must not be blocked by an
    // optional outbound-email provider. Email delivery is drained only when its own
    // worker is ready; otherwise queued events remain untouched for a later run.
    ready: persistence.ready,
  };
}

async function reconcileOutstandingSumUpCheckouts() {
  const sumupStatus = getSumUpIntegrationStatus();
  if (
    !sumupStatus.webhookEnabled ||
    !sumupStatus.apiConfigured ||
    !sumupStatus.merchantConfigured
  ) {
    return {
      deferred: true as const,
      candidates: 0,
      checked: 0,
      paid: 0,
      terminal: 0,
      pending: 0,
      skipped: 0,
    };
  }

  const supabase = createPreventaAdminClient();
  const { data: attempts, error: attemptsError } = await supabase
    .from('preventa_checkout_attempts')
    .select('order_id, installment_no, provider_checkout_id, created_at')
    .eq('status', 'created')
    .order('created_at', { ascending: true })
    .limit(MAX_RECONCILIATION_ATTEMPTS);

  if (attemptsError) {
    throw new Error(`PREVENTA_RECONCILIATION_LOOKUP_FAILED:${attemptsError.message}`);
  }

  const rows = attempts || [];
  if (rows.length === 0) {
    return {
      deferred: false as const,
      candidates: 0,
      checked: 0,
      paid: 0,
      terminal: 0,
      pending: 0,
      skipped: 0,
    };
  }

  const orderIds = Array.from(new Set(rows.map((item) => String(item.order_id || '')).filter(Boolean)));
  const { data: orders, error: ordersError } = await supabase
    .from('preventa_orders')
    .select('id, order_reference')
    .in('id', orderIds);

  if (ordersError) {
    throw new Error(`PREVENTA_RECONCILIATION_ORDER_LOOKUP_FAILED:${ordersError.message}`);
  }

  const orderReferenceById = new Map<string, string>();
  for (const order of orders || []) {
    const id = String(order.id || '');
    const orderReference = String(order.order_reference || '').trim();
    if (id && orderReference) orderReferenceById.set(id, orderReference);
  }

  const expectedMerchantCode = getConfiguredSumUpMerchantCode();
  let checked = 0;
  let paid = 0;
  let terminal = 0;
  let pending = 0;
  let skipped = 0;

  for (const attempt of rows) {
    const orderId = String(attempt.order_id || '');
    const orderReference = orderReferenceById.get(orderId) || '';
    const providerCheckoutId = String(attempt.provider_checkout_id || '').trim();
    const installmentNo = Number(attempt.installment_no);

    if (
      !/^GHC-[A-Z0-9]{8}$/.test(orderReference) ||
      !providerCheckoutId ||
      (installmentNo !== 1 && installmentNo !== 2)
    ) {
      skipped += 1;
      continue;
    }

    try {
      const checkout = await retrieveSumUpCheckout(providerCheckoutId);
      const state = verifySumUpCheckoutStateForPreventa({
        webhookCheckoutId: providerCheckoutId,
        checkout,
        expectedMerchantCode,
      });

      if (state.orderReference !== orderReference || state.installmentNo !== installmentNo) {
        skipped += 1;
        continue;
      }

      checked += 1;

      if (state.status === 'PENDING') {
        pending += 1;
        continue;
      }

      if (state.status === 'FAILED' || state.status === 'EXPIRED') {
        const terminalStatus = state.status.toLowerCase() as 'failed' | 'expired';
        await markPreventaCheckoutTerminal({
          orderReference,
          installmentNo: installmentNo as 1 | 2,
          providerCheckoutId,
          terminalStatus,
          idempotencyKey: `sumup:${providerCheckoutId}:${terminalStatus}`,
          occurredAt: state.occurredAt,
          providerMetadata: state.providerMetadata,
        });
        terminal += 1;
        continue;
      }

      const verified = verifySumUpCheckoutForPreventa({
        webhookCheckoutId: providerCheckoutId,
        checkout,
        expectedMerchantCode,
      });

      await confirmPreventaPayment({
        orderReference,
        installmentNo: installmentNo as 1 | 2,
        amountCents: verified.amountCents,
        providerPaymentId: verified.providerPaymentId,
        idempotencyKey: `sumup:${verified.checkoutId}:${verified.providerPaymentId}:paid`,
        occurredAt: verified.occurredAt,
        providerMetadata: verified.providerMetadata,
      });
      paid += 1;
    } catch (error) {
      if (error instanceof SumUpAdapterError) {
        console.error('[preventa-sumup-reconciliation] ADAPTER_REJECTED', error.code);
      } else {
        console.error('[preventa-sumup-reconciliation] CHECK_FAILED');
      }
      skipped += 1;
    }
  }

  return {
    deferred: false as const,
    candidates: rows.length,
    checked,
    paid,
    terminal,
    pending,
    skipped,
  };
}

async function markDueOrdersOverdue(now: Date) {
  const supabase = createPreventaAdminClient();
  const boundary = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const occurredAt = now.toISOString();

  const { data, error } = await supabase
    .from('preventa_orders')
    .select('order_reference, second_due_at')
    .eq('payment_plan', 'split')
    .eq('status', 'partial')
    .not('second_due_at', 'is', null)
    .lte('second_due_at', boundary)
    .order('second_due_at', { ascending: true })
    .limit(MAX_ORDERS);

  if (error) throw new Error(`PREVENTA_SCHEDULER_OVERDUE_LOOKUP_FAILED:${error.message}`);

  const results: Array<{ orderReference: string; status: 'updated' | 'skipped'; error?: string }> = [];

  for (const order of data || []) {
    const orderReference = String(order.order_reference || '').trim();
    if (!orderReference) continue;

    const { error: rpcError } = await supabase.rpc('preventa_mark_overdue_v1', {
      p_order_reference: orderReference,
      p_idempotency_key: `scheduler:overdue:${orderReference}`,
      p_occurred_at: occurredAt,
    });

    if (rpcError) {
      results.push({
        orderReference,
        status: 'skipped',
        error: rpcError.message.slice(0, 300),
      });
      continue;
    }

    results.push({ orderReference, status: 'updated' });
  }

  return results;
}

async function closeDay60NonpaymentOrders(now: Date) {
  const supabase = createPreventaAdminClient();
  const boundary = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const occurredAt = now.toISOString();

  const { data, error } = await supabase
    .from('preventa_orders')
    .select('order_reference, second_due_at')
    .eq('payment_plan', 'split')
    .eq('status', 'overdue')
    .not('second_due_at', 'is', null)
    .lte('second_due_at', boundary)
    .order('second_due_at', { ascending: true })
    .limit(MAX_ORDERS);

  if (error) throw new Error(`PREVENTA_SCHEDULER_DAY60_LOOKUP_FAILED:${error.message}`);

  const results: Array<{ orderReference: string; status: 'closed' | 'skipped'; error?: string }> = [];

  for (const order of data || []) {
    const orderReference = String(order.order_reference || '').trim();
    if (!orderReference) continue;

    const { error: rpcError } = await supabase.rpc('preventa_close_nonpayment_v1', {
      p_order_reference: orderReference,
      p_idempotency_key: `scheduler:day60:${orderReference}`,
      p_occurred_at: occurredAt,
    });

    if (rpcError) {
      results.push({
        orderReference,
        status: 'skipped',
        error: rpcError.message.slice(0, 300),
      });
      continue;
    }

    results.push({ orderReference, status: 'closed' });
  }

  return results;
}

async function drainDueEmailQueue() {
  let claimed = 0;
  let sent = 0;
  let cancelled = 0;
  let retryOrFailed = 0;
  const batches: Awaited<ReturnType<typeof runPreventaEmailWorker>>[] = [];

  for (let i = 0; i < MAX_EMAIL_BATCHES; i += 1) {
    const batch = await runPreventaEmailWorker(EMAIL_BATCH_SIZE);
    batches.push(batch);
    claimed += batch.claimed;
    sent += batch.sent;
    cancelled += batch.cancelled;
    retryOrFailed += batch.retryOrFailed;

    if (batch.claimed < EMAIL_BATCH_SIZE) break;
  }

  return {
    deferred: false as const,
    claimed,
    sent,
    cancelled,
    retryOrFailed,
    batches: batches.length,
  };
}

export async function runPreventaScheduledMaintenance(now = new Date()) {
  const status = getPreventaScheduledMaintenanceStatus();
  if (!status.persistenceReady) {
    throw new Error('PREVENTA_SCHEDULER_GATE_CLOSED');
  }

  // Orden deliberado:
  // 1) reconcilia SumUp antes de cualquier cierre local para recuperar webhooks perdidos;
  // 2) actualiza estados económicos vencidos;
  // 3) cierra expedientes al día +60;
  // 4) procesa la cola resultante solo cuando el worker de email está operativo.
  // Si el proveedor de correo todavía no está configurado, la cola no se reclama ni
  // se marca como fallida: queda pendiente para un run posterior.
  const reconciliation = status.sumupReconciliationReady
    ? await reconcileOutstandingSumUpCheckouts()
    : {
        deferred: true as const,
        candidates: 0,
        checked: 0,
        paid: 0,
        terminal: 0,
        pending: 0,
        skipped: 0,
      };
  const overdue = await markDueOrdersOverdue(now);
  const day60 = await closeDay60NonpaymentOrders(now);
  const email = status.emailWorkerReady
    ? await drainDueEmailQueue()
    : {
        deferred: true as const,
        claimed: 0,
        sent: 0,
        cancelled: 0,
        retryOrFailed: 0,
        batches: 0,
      };

  return {
    ranAt: now.toISOString(),
    reconciliation,
    overdue: {
      candidates: overdue.length,
      updated: overdue.filter((item) => item.status === 'updated').length,
      skipped: overdue.filter((item) => item.status === 'skipped').length,
    },
    day60: {
      candidates: day60.length,
      closed: day60.filter((item) => item.status === 'closed').length,
      skipped: day60.filter((item) => item.status === 'skipped').length,
    },
    email,
  };
}
