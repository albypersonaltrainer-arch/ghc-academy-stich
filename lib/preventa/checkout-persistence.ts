import 'server-only';
import { createClient } from '@supabase/supabase-js';

export type PreventaCheckoutContext = {
  orderId: string;
  orderReference: string;
  paymentPlan: 'single' | 'split';
  orderStatus: string;
  installmentNo: 1 | 2;
  expectedAmountCents: number;
  currency: 'EUR';
};

function getServerClient() {
  const enabled = process.env.PREVENTA_PERSISTENCE_ENABLED === 'true';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!enabled) throw new Error('PREVENTA_PERSISTENCE_DISABLED');
  if (!supabaseUrl || !serviceRoleKey) throw new Error('PREVENTA_PERSISTENCE_NOT_CONFIGURED');

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function cleanReference(value: string) {
  const reference = value.trim();
  if (!/^GHC-[A-Z0-9]{8}$/.test(reference)) throw new Error('INVALID_ORDER_REFERENCE');
  return reference;
}

function mapContext(data: unknown): PreventaCheckoutContext {
  if (!data || typeof data !== 'object') throw new Error('PREVENTA_INVALID_CHECKOUT_CONTEXT');
  const value = data as Record<string, unknown>;

  const installmentNo = Number(value.installment_no);
  const amount = Number(value.expected_amount_cents);
  const paymentPlan = value.payment_plan;

  if (installmentNo !== 1 && installmentNo !== 2) throw new Error('PREVENTA_INVALID_INSTALLMENT');
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('PREVENTA_INVALID_EXPECTED_AMOUNT');
  if (paymentPlan !== 'single' && paymentPlan !== 'split') throw new Error('PREVENTA_INVALID_PAYMENT_PLAN');
  if (value.currency !== 'EUR') throw new Error('PREVENTA_INVALID_CURRENCY');

  return {
    orderId: String(value.order_id || ''),
    orderReference: String(value.order_reference || ''),
    paymentPlan,
    orderStatus: String(value.order_status || ''),
    installmentNo,
    expectedAmountCents: amount,
    currency: 'EUR',
  };
}

export async function getPreventaCheckoutContext(input: {
  orderReference: string;
  installmentNo: 1 | 2;
}) {
  const supabase = getServerClient();
  const { data, error } = await supabase.rpc('preventa_checkout_context_v1', {
    p_order_reference: cleanReference(input.orderReference),
    p_installment_no: input.installmentNo,
  });

  if (error) throw new Error('PREVENTA_CHECKOUT_CONTEXT_FAILED');
  return mapContext(data);
}

export async function isPreventaProviderCheckoutRegistered(providerCheckoutId: string) {
  const checkoutId = providerCheckoutId.trim();
  if (!checkoutId || checkoutId.length > 128) return false;

  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('preventa_checkout_attempts')
    .select('id')
    .eq('provider_checkout_id', checkoutId)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error('PREVENTA_CHECKOUT_REGISTRATION_LOOKUP_FAILED');
  return Boolean(data?.id);
}

export async function reservePreventaCapacity(input: {
  orderReference: string;
  checkoutReference: string;
  heldUntil: string;
  idempotencyKey: string;
  occurredAt: string;
}) {
  const supabase = getServerClient();
  const { data, error } = await supabase.rpc('preventa_reserve_capacity_v1', {
    p_order_reference: cleanReference(input.orderReference),
    p_checkout_reference: input.checkoutReference,
    p_held_until: input.heldUntil,
    p_idempotency_key: input.idempotencyKey,
    p_occurred_at: input.occurredAt,
  });

  if (error) throw new Error('PREVENTA_RESERVE_CAPACITY_FAILED');
  return data;
}

export async function attachPreventaCapacityCheckout(input: {
  orderReference: string;
  checkoutReference: string;
  providerCheckoutId: string;
  occurredAt: string;
}) {
  const supabase = getServerClient();
  const { data, error } = await supabase.rpc('preventa_attach_capacity_checkout_v1', {
    p_order_reference: cleanReference(input.orderReference),
    p_checkout_reference: input.checkoutReference,
    p_provider_checkout_id: input.providerCheckoutId,
    p_occurred_at: input.occurredAt,
  });

  if (error) throw new Error('PREVENTA_ATTACH_CAPACITY_FAILED');
  return data;
}

export async function releasePreventaCapacity(input: {
  orderReference: string;
  checkoutReference: string;
  reason: string;
  occurredAt: string;
}) {
  const supabase = getServerClient();
  const { data, error } = await supabase.rpc('preventa_release_capacity_v1', {
    p_order_reference: cleanReference(input.orderReference),
    p_checkout_reference: input.checkoutReference,
    p_reason: input.reason,
    p_occurred_at: input.occurredAt,
  });

  if (error) throw new Error('PREVENTA_RELEASE_CAPACITY_FAILED');
  return data;
}

export async function registerPreventaCheckoutAttempt(input: {
  orderReference: string;
  installmentNo: 1 | 2;
  checkoutReference: string;
  providerCheckoutId: string;
  hostedCheckoutUrl: string;
  expectedAmountCents: number;
  idempotencyKey: string;
  occurredAt: string;
}) {
  const supabase = getServerClient();
  const { data, error } = await supabase.rpc('preventa_register_checkout_attempt_v1', {
    p_order_reference: cleanReference(input.orderReference),
    p_installment_no: input.installmentNo,
    p_checkout_reference: input.checkoutReference,
    p_provider_checkout_id: input.providerCheckoutId,
    p_hosted_checkout_url: input.hostedCheckoutUrl,
    p_expected_amount_cents: input.expectedAmountCents,
    p_idempotency_key: input.idempotencyKey,
    p_occurred_at: input.occurredAt,
  });

  if (error) throw new Error('PREVENTA_REGISTER_CHECKOUT_FAILED');
  return data;
}