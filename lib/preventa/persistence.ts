import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { PreviewOrderInput } from './validation';
import { validatePreviewOrderInput } from './validation';

export type PersistedDraftResult = {
  orderId: string;
  orderReference: string;
  idempotentReplay: boolean;
};

function getPersistenceConfig() {
  const enabled = process.env.PREVENTA_PERSISTENCE_ENABLED === 'true';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  return {
    enabled,
    ready: enabled && Boolean(supabaseUrl) && Boolean(serviceRoleKey),
    supabaseUrl,
    serviceRoleKey,
  };
}

export function getPreventaPersistenceStatus() {
  const config = getPersistenceConfig();
  return {
    enabled: config.enabled,
    configured: Boolean(config.supabaseUrl) && Boolean(config.serviceRoleKey),
    ready: config.ready,
  };
}

export async function persistPreventaDraft(
  input: PreviewOrderInput,
  requestKey: string,
  orderReference: string
): Promise<PersistedDraftResult> {
  const config = getPersistenceConfig();

  if (!config.enabled) {
    throw new Error('PREVENTA_PERSISTENCE_DISABLED');
  }

  if (!config.ready) {
    throw new Error('PREVENTA_PERSISTENCE_NOT_CONFIGURED');
  }

  const validated = validatePreviewOrderInput(input);
  if (!validated.ok) {
    throw new Error('PREVENTA_VALIDATION_FAILED');
  }

  const data = validated.data;
  const supabase = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data: rpcData, error } = await supabase.rpc('preventa_create_draft_v1', {
    p_order_reference: orderReference,
    p_request_key: requestKey,
    p_first_name: data.firstName,
    p_last_name: data.lastName,
    p_email: data.email,
    p_country: data.country,
    p_phone: data.phone || '',
    p_payment_plan: data.paymentPlan,
    p_total_amount_cents: data.totalAmountCents,
    p_first_installment_cents: data.firstInstallmentCents,
    p_second_installment_cents: data.secondInstallmentCents,
    p_offer_code: data.offerCode,
    p_offer_version: data.offerVersion,
    p_terms_version: data.termsVersion,
    p_privacy_version: data.privacyVersion,
    p_legal_package_version: data.legalPackageVersion,
    p_marketing_consent: data.marketingConsent,
    p_source_channel: data.attribution.sourceChannel || '',
    p_source_detail: data.attribution.sourceDetail || '',
    p_campaign_code: data.attribution.campaignCode || '',
    p_closer_code: data.attribution.closerCode || '',
  });

  if (error) {
    throw new Error('PREVENTA_PERSISTENCE_RPC_FAILED');
  }

  const result = rpcData as {
    order_id?: string;
    order_reference?: string;
    idempotent_replay?: boolean;
  } | null;

  if (!result?.order_id || !result?.order_reference) {
    throw new Error('PREVENTA_PERSISTENCE_INVALID_RESPONSE');
  }

  return {
    orderId: result.order_id,
    orderReference: result.order_reference,
    idempotentReplay: result.idempotent_replay === true,
  };
}