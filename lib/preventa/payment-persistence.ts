import 'server-only';
import { createClient } from '@supabase/supabase-js';

export type PaymentPersistenceStatus = {
  enabled: boolean;
  configured: boolean;
  ready: boolean;
};

function getConfig() {
  const enabled = process.env.PREVENTA_PERSISTENCE_ENABLED === 'true';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  return {
    enabled,
    configured: Boolean(supabaseUrl) && Boolean(serviceRoleKey),
    ready: enabled && Boolean(supabaseUrl) && Boolean(serviceRoleKey),
    supabaseUrl,
    serviceRoleKey,
  };
}

export function getPaymentPersistenceStatus(): PaymentPersistenceStatus {
  const config = getConfig();
  return {
    enabled: config.enabled,
    configured: config.configured,
    ready: config.ready,
  };
}

function getServerClient() {
  const config = getConfig();

  if (!config.enabled) throw new Error('PREVENTA_PERSISTENCE_DISABLED');
  if (!config.ready) throw new Error('PREVENTA_PERSISTENCE_NOT_CONFIGURED');

  return createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function cleanRequired(value: string, code: string) {
  const result = value.trim();
  if (!result) throw new Error(code);
  return result;
}

export async function preparePreventaCheckout(input: {
  orderReference: string;
  providerCheckoutId: string;
  idempotencyKey: string;
  occurredAt: string;
}) {
  const supabase = getServerClient();
  const { data, error } = await supabase.rpc('preventa_prepare_checkout_v1', {
    p_order_reference: cleanRequired(input.orderReference, 'ORDER_REFERENCE_REQUIRED'),
    p_provider_checkout_id: cleanRequired(input.providerCheckoutId, 'PROVIDER_CHECKOUT_ID_REQUIRED'),
    p_idempotency_key: cleanRequired(input.idempotencyKey, 'IDEMPOTENCY_KEY_REQUIRED'),
    p_occurred_at: input.occurredAt,
  });

  if (error) throw new Error(`PREVENTA_PREPARE_CHECKOUT_FAILED:${error.message}`);
  return data;
}

export async function confirmPreventaPayment(input: {
  orderReference: string;
  installmentNo: 1 | 2;
  amountCents: number;
  providerPaymentId: string;
  idempotencyKey: string;
  occurredAt: string;
  providerMetadata?: Record<string, unknown>;
}) {
  const supabase = getServerClient();
  const { data, error } = await supabase.rpc('preventa_confirm_payment_v1', {
    p_order_reference: cleanRequired(input.orderReference, 'ORDER_REFERENCE_REQUIRED'),
    p_installment_no: input.installmentNo,
    p_amount_cents: input.amountCents,
    p_provider_payment_id: cleanRequired(input.providerPaymentId, 'PROVIDER_PAYMENT_ID_REQUIRED'),
    p_idempotency_key: cleanRequired(input.idempotencyKey, 'IDEMPOTENCY_KEY_REQUIRED'),
    p_occurred_at: input.occurredAt,
    p_provider_metadata: input.providerMetadata || {},
  });

  if (error) throw new Error(`PREVENTA_CONFIRM_PAYMENT_FAILED:${error.message}`);
  return data;
}

export async function markPreventaCheckoutTerminal(input: {
  orderReference: string;
  installmentNo: 1 | 2;
  providerCheckoutId: string;
  terminalStatus: 'failed' | 'expired';
  idempotencyKey: string;
  occurredAt: string;
  providerMetadata?: Record<string, unknown>;
}) {
  const supabase = getServerClient();
  const { data, error } = await supabase.rpc('preventa_mark_checkout_terminal_v1', {
    p_order_reference: cleanRequired(input.orderReference, 'ORDER_REFERENCE_REQUIRED'),
    p_installment_no: input.installmentNo,
    p_provider_checkout_id: cleanRequired(input.providerCheckoutId, 'PROVIDER_CHECKOUT_ID_REQUIRED'),
    p_terminal_status: input.terminalStatus,
    p_idempotency_key: cleanRequired(input.idempotencyKey, 'IDEMPOTENCY_KEY_REQUIRED'),
    p_occurred_at: input.occurredAt,
    p_provider_metadata: input.providerMetadata || {},
  });

  if (error) throw new Error(`PREVENTA_MARK_CHECKOUT_TERMINAL_FAILED:${error.message}`);
  return data;
}

export async function markPreventaOverdue(input: {
  orderReference: string;
  idempotencyKey: string;
  occurredAt: string;
}) {
  const supabase = getServerClient();
  const { data, error } = await supabase.rpc('preventa_mark_overdue_v1', {
    p_order_reference: cleanRequired(input.orderReference, 'ORDER_REFERENCE_REQUIRED'),
    p_idempotency_key: cleanRequired(input.idempotencyKey, 'IDEMPOTENCY_KEY_REQUIRED'),
    p_occurred_at: input.occurredAt,
  });

  if (error) throw new Error(`PREVENTA_MARK_OVERDUE_FAILED:${error.message}`);
  return data;
}

export async function refundPreventaOrder(input: {
  orderReference: string;
  providerRefundId: string;
  idempotencyKey: string;
  occurredAt: string;
}) {
  const supabase = getServerClient();
  const { data, error } = await supabase.rpc('preventa_full_refund_v1', {
    p_order_reference: cleanRequired(input.orderReference, 'ORDER_REFERENCE_REQUIRED'),
    p_provider_refund_id: cleanRequired(input.providerRefundId, 'PROVIDER_REFUND_ID_REQUIRED'),
    p_idempotency_key: cleanRequired(input.idempotencyKey, 'IDEMPOTENCY_KEY_REQUIRED'),
    p_occurred_at: input.occurredAt,
  });

  if (error) throw new Error(`PREVENTA_FULL_REFUND_FAILED:${error.message}`);
  return data;
}

export async function closePreventaNonpayment(input: {
  orderReference: string;
  idempotencyKey: string;
  occurredAt: string;
}) {
  const supabase = getServerClient();
  const { data, error } = await supabase.rpc('preventa_close_nonpayment_v1', {
    p_order_reference: cleanRequired(input.orderReference, 'ORDER_REFERENCE_REQUIRED'),
    p_idempotency_key: cleanRequired(input.idempotencyKey, 'IDEMPOTENCY_KEY_REQUIRED'),
    p_occurred_at: input.occurredAt,
  });

  if (error) throw new Error(`PREVENTA_CLOSE_NONPAYMENT_FAILED:${error.message}`);
  return data;
}
