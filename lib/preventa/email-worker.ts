import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getCheckoutAccessTokenStatus, issueCheckoutAccessToken } from './checkout-access-token';
import { issueMatriculaAccessToken } from './matricula-access-token';
import { getPreventaEmailProviderStatus, sendPreventaEmail } from './email-provider';
import {
  renderPreventaEmail,
  type PreventaEmailTemplateCode,
} from './email-renderer';

const PAYMENT_CTA_CODES = new Set<PreventaEmailTemplateCode>([
  'E03', 'E04', 'E05', 'E06', 'E07', 'E08', 'E12', 'E13',
]);

export type PreventaEmailWorkerStatus = {
  persistenceReady: boolean;
  providerReady: boolean;
  checkoutTokenConfigured: boolean;
  publicBaseUrlConfigured: boolean;
  supportEmailConfigured: boolean;
  ready: boolean;
};

type ClaimedEmail = {
  queue_id: string;
  order_id: string;
  template_code: PreventaEmailTemplateCode;
  scheduled_for: string;
  attempt_count: number;
  recipient_email: string;
  first_name: string;
  last_name: string;
  order_reference: string;
  payment_plan: 'single' | 'split';
  total_amount_cents: number;
  first_installment_cents: number;
  second_installment_cents: number;
  second_due_at: string | null;
  founder_place_number: number | null;
  founder_status: string;
  terms_version: string;
  privacy_version: string;
  legal_package_version: string;
};

type IncidentContext = {
  installmentNo?: 1 | 2;
  attemptedAmountCents?: number;
  refundedAmountCents?: number;
  refundReference?: string;
};

type CurrentOrderState = {
  status: string;
  payment_plan: 'single' | 'split';
  founder_status: string;
};

function clean(value: string | undefined) {
  return (value || '').trim();
}

function getSupportEmail() {
  return clean(process.env.PREVENTA_EMAIL_SUPPORT || process.env.PREVENTA_SUPPORT_EMAIL);
}

function getPublicBaseUrl() {
  const value = clean(process.env.PREVENTA_PUBLIC_BASE_URL).replace(/\/$/, '');
  if (!/^https:\/\/[A-Za-z0-9.-]+(?::\d+)?$/.test(value)) return null;
  return value;
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
  if (!config.ready) throw new Error('PREVENTA_EMAIL_PERSISTENCE_NOT_READY');
  return createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function formatEuro(cents: number | null | undefined) {
  const safe = Number.isFinite(cents) ? Number(cents) : 0;
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(safe / 100);
}

function formatMadridDate(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Madrid',
  }).format(date);
}

async function getIncidentContext(
  supabase: SupabaseClient,
  claimed: ClaimedEmail
): Promise<IncidentContext> {
  if (claimed.template_code === 'E12' || claimed.template_code === 'E13') {
    const terminalStatus = claimed.template_code === 'E12' ? 'failed' : 'expired';
    const { data, error } = await supabase
      .from('preventa_checkout_attempts')
      .select('installment_no, expected_amount_cents, status, updated_at')
      .eq('order_id', claimed.order_id)
      .eq('status', terminalStatus)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`PREVENTA_EMAIL_INCIDENT_LOOKUP_FAILED:${error.message}`);
    if (!data || (data.installment_no !== 1 && data.installment_no !== 2)) {
      throw new Error(`PREVENTA_EMAIL_INCIDENT_ATTEMPT_NOT_FOUND:${claimed.template_code}`);
    }

    return {
      installmentNo: data.installment_no as 1 | 2,
      attemptedAmountCents: Number(data.expected_amount_cents),
    };
  }

  if (claimed.template_code === 'E14') {
    const [{ data: payments, error: paymentsError }, { data: refundEvent, error: eventError }] =
      await Promise.all([
        supabase
          .from('preventa_payments')
          .select('refunded_amount_cents')
          .eq('order_id', claimed.order_id),
        supabase
          .from('preventa_events')
          .select('payload, occurred_at')
          .eq('order_id', claimed.order_id)
          .eq('event_type', 'payment.full_refunded')
          .order('occurred_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    if (paymentsError) throw new Error(`PREVENTA_EMAIL_REFUND_LOOKUP_FAILED:${paymentsError.message}`);
    if (eventError) throw new Error(`PREVENTA_EMAIL_REFUND_EVENT_FAILED:${eventError.message}`);

    const refundedAmountCents = (payments || []).reduce(
      (sum, payment) => sum + Number(payment.refunded_amount_cents || 0),
      0
    );
    const payload = (refundEvent?.payload || {}) as Record<string, unknown>;
    const refundReference = typeof payload.provider_refund_id === 'string'
      ? payload.provider_refund_id.trim()
      : '';

    if (refundedAmountCents <= 0 || !refundReference) {
      throw new Error('PREVENTA_EMAIL_REFUND_CONTEXT_INCOMPLETE');
    }

    return { refundedAmountCents, refundReference };
  }

  return {};
}

function getPaymentInstallmentForTemplate(
  code: PreventaEmailTemplateCode,
  incident: IncidentContext
): 1 | 2 | null {
  if (code >= 'E03' && code <= 'E08') return 2;
  if (code === 'E12' || code === 'E13') return incident.installmentNo || null;
  return null;
}

function buildCtaUrl(
  claimed: ClaimedEmail,
  incident: IncidentContext,
  publicBaseUrl: string
) {
  const code = claimed.template_code;
  if (!PAYMENT_CTA_CODES.has(code)) {
    if (code === 'E11') return `${publicBaseUrl}/acceso`;
    if (code === 'E01' || code === 'E02' || code === 'E10') {
      const matriculaToken = issueMatriculaAccessToken({
        orderReference: claimed.order_reference,
      });
      const url = new URL('/preventa/matricula', publicBaseUrl);
      url.searchParams.set('order', claimed.order_reference);
      url.searchParams.set('token', matriculaToken);
      return url.toString();
    }
    return null;
  }

  const installmentNo = getPaymentInstallmentForTemplate(code, incident);
  if (!installmentNo) throw new Error(`PREVENTA_EMAIL_PAYMENT_INSTALLMENT_UNKNOWN:${code}`);

  const checkoutToken = issueCheckoutAccessToken({
    orderReference: claimed.order_reference,
    installmentNo,
    ttlSeconds: 30 * 24 * 60 * 60,
  });

  const url = new URL('/preventa/pago', publicBaseUrl);
  url.searchParams.set('order', claimed.order_reference);
  url.searchParams.set('installment', String(installmentNo));
  url.searchParams.set('token', checkoutToken);
  return url.toString();
}

function buildVariables(claimed: ClaimedEmail, incident: IncidentContext) {
  const supportEmail = getSupportEmail();
  const installmentNo = getPaymentInstallmentForTemplate(claimed.template_code, incident);

  return {
    nombre: claimed.first_name,
    founder_place_number: claimed.founder_place_number,
    order_reference: claimed.order_reference,
    terms_version: claimed.terms_version,
    privacy_version: claimed.privacy_version,
    second_payment_due_date: formatMadridDate(claimed.second_due_at),
    support_email: supportEmail,
    attempted_amount: incident.attemptedAmountCents
      ? formatEuro(incident.attemptedAmountCents)
      : undefined,
    installment_description: installmentNo === 1
      ? 'Primera cuota'
      : installmentNo === 2
        ? 'Segunda cuota'
        : undefined,
    refunded_amount: incident.refundedAmountCents
      ? formatEuro(incident.refundedAmountCents)
      : undefined,
    refund_reference: incident.refundReference,
  };
}

function isEmailApplicable(
  code: PreventaEmailTemplateCode,
  order: CurrentOrderState,
  incident: IncidentContext
) {
  const splitOpen =
    order.payment_plan === 'split' &&
    (order.status === 'partial' || order.status === 'overdue') &&
    order.founder_status === 'reserved';

  switch (code) {
    case 'E01':
      return order.payment_plan === 'single' && order.status === 'paid' && order.founder_status === 'confirmed';
    case 'E02':
    case 'E03':
    case 'E04':
    case 'E05':
    case 'E06':
    case 'E07':
    case 'E08':
      return splitOpen;
    case 'E09':
      return order.status === 'cancelled' && order.founder_status === 'released';
    case 'E10':
      return order.payment_plan === 'split' && order.status === 'paid' && order.founder_status === 'confirmed';
    case 'E11':
      return order.status === 'paid' && order.founder_status === 'confirmed';
    case 'E12':
    case 'E13':
      if (incident.installmentNo === 1) {
        return (
          (order.status === 'draft' || order.status === 'awaiting_payment') &&
          order.founder_status === 'pending'
        );
      }
      if (incident.installmentNo === 2) return splitOpen;
      return false;
    case 'E14':
      return order.status === 'refunded' && order.founder_status === 'released';
    default:
      return false;
  }
}

async function suppressIfStale(
  supabase: SupabaseClient,
  claimed: ClaimedEmail,
  incident: IncidentContext
) {
  const { data: order, error: orderError } = await supabase
    .from('preventa_orders')
    .select('status, payment_plan, founder_status')
    .eq('id', claimed.order_id)
    .maybeSingle();

  if (orderError) throw new Error(`PREVENTA_EMAIL_STATE_LOOKUP_FAILED:${orderError.message}`);
  if (!order) throw new Error('PREVENTA_EMAIL_ORDER_NOT_FOUND');

  if (isEmailApplicable(claimed.template_code, order as CurrentOrderState, incident)) {
    return false;
  }

  const occurredAt = new Date().toISOString();
  const { error: cancelError } = await supabase
    .from('preventa_email_queue')
    .update({
      status: 'cancelled',
      last_error: 'STALE_EMAIL_SUPPRESSED',
      updated_at: occurredAt,
    })
    .eq('id', claimed.queue_id)
    .eq('status', 'processing');

  if (cancelError) throw new Error(`PREVENTA_EMAIL_STALE_CANCEL_FAILED:${cancelError.message}`);
  return true;
}

async function finishEmail(
  supabase: SupabaseClient,
  input: {
    queueId: string;
    success: boolean;
    providerMessageId?: string | null;
    error?: string | null;
  }
) {
  const { data, error } = await supabase.rpc('preventa_finish_email_delivery_v1', {
    p_queue_id: input.queueId,
    p_success: input.success,
    p_provider_message_id: input.providerMessageId || '',
    p_error: input.error || '',
    p_occurred_at: new Date().toISOString(),
  });

  if (error) throw new Error(`PREVENTA_EMAIL_FINISH_FAILED:${error.message}`);
  return data;
}

export function getPreventaEmailWorkerStatus(): PreventaEmailWorkerStatus {
  const persistence = getPersistenceConfig();
  const provider = getPreventaEmailProviderStatus();
  const token = getCheckoutAccessTokenStatus();
  const publicBaseUrl = getPublicBaseUrl();
  const supportEmail = getSupportEmail();

  return {
    persistenceReady: persistence.ready,
    providerReady: provider.ready,
    checkoutTokenConfigured: token.configured,
    publicBaseUrlConfigured: Boolean(publicBaseUrl),
    supportEmailConfigured: Boolean(supportEmail),
    ready:
      persistence.ready &&
      provider.ready &&
      token.configured &&
      Boolean(publicBaseUrl) &&
      Boolean(supportEmail),
  };
}

export async function runPreventaEmailWorker(batchSize = 10) {
  const status = getPreventaEmailWorkerStatus();
  const publicBaseUrl = getPublicBaseUrl();

  if (!status.ready || !publicBaseUrl) {
    throw new Error('PREVENTA_EMAIL_WORKER_NOT_READY');
  }

  const supabase = createPreventaAdminClient();
  const now = new Date().toISOString();
  const limit = Math.max(1, Math.min(Math.trunc(batchSize || 10), 50));

  const { data: claimedData, error: claimError } = await supabase.rpc(
    'preventa_claim_email_batch_v1',
    { p_limit: limit, p_now: now }
  );

  if (claimError) throw new Error(`PREVENTA_EMAIL_CLAIM_FAILED:${claimError.message}`);
  const claimed = (claimedData || []) as ClaimedEmail[];

  const results: Array<{
    queueId: string;
    templateCode: PreventaEmailTemplateCode;
    orderReference: string;
    status: 'sent' | 'cancelled' | 'retry_or_failed';
    providerMessageId?: string;
    error?: string;
  }> = [];

  for (const item of claimed) {
    try {
      const incident = await getIncidentContext(supabase, item);
      const ctaUrl = buildCtaUrl(item, incident, publicBaseUrl);
      const rendered = renderPreventaEmail(item.template_code, {
        variables: buildVariables(item, incident),
        ctaUrl,
      });

      if (await suppressIfStale(supabase, item, incident)) {
        results.push({
          queueId: item.queue_id,
          templateCode: item.template_code,
          orderReference: item.order_reference,
          status: 'cancelled',
        });
        continue;
      }

      const delivery = await sendPreventaEmail({
        queueId: item.queue_id,
        templateCode: item.template_code,
        orderReference: item.order_reference,
        recipientEmail: item.recipient_email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });

      await finishEmail(supabase, {
        queueId: item.queue_id,
        success: true,
        providerMessageId: delivery.messageId,
      });

      results.push({
        queueId: item.queue_id,
        templateCode: item.template_code,
        orderReference: item.order_reference,
        status: 'sent',
        providerMessageId: delivery.messageId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'UNKNOWN_EMAIL_WORKER_ERROR';
      try {
        await finishEmail(supabase, {
          queueId: item.queue_id,
          success: false,
          error: message,
        });
      } catch (finishError) {
        const finishMessage = finishError instanceof Error
          ? finishError.message
          : 'UNKNOWN_EMAIL_FINISH_ERROR';
        results.push({
          queueId: item.queue_id,
          templateCode: item.template_code,
          orderReference: item.order_reference,
          status: 'retry_or_failed',
          error: `${message};${finishMessage}`.slice(0, 1000),
        });
        continue;
      }

      results.push({
        queueId: item.queue_id,
        templateCode: item.template_code,
        orderReference: item.order_reference,
        status: 'retry_or_failed',
        error: message.slice(0, 1000),
      });
    }
  }

  return {
    claimed: claimed.length,
    sent: results.filter((item) => item.status === 'sent').length,
    cancelled: results.filter((item) => item.status === 'cancelled').length,
    retryOrFailed: results.filter((item) => item.status === 'retry_or_failed').length,
    results,
  };
}
