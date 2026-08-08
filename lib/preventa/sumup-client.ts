import 'server-only';
import type { SumUpCheckout } from './sumup-adapter';

export type SumUpIntegrationStatus = {
  webhookEnabled: boolean;
  apiConfigured: boolean;
  merchantConfigured: boolean;
  ready: boolean;
};

function getConfig() {
  const webhookEnabled = process.env.SUMUP_WEBHOOK_ENABLED === 'true';
  const apiKey = (process.env.SUMUP_API_KEY || '').trim();
  const merchantCode = (process.env.SUMUP_MERCHANT_CODE || '').trim();

  return {
    webhookEnabled,
    apiKey,
    merchantCode,
    apiConfigured: Boolean(apiKey),
    merchantConfigured: Boolean(merchantCode),
    ready: webhookEnabled && Boolean(apiKey) && Boolean(merchantCode),
  };
}

export function getSumUpIntegrationStatus(): SumUpIntegrationStatus {
  const config = getConfig();
  return {
    webhookEnabled: config.webhookEnabled,
    apiConfigured: config.apiConfigured,
    merchantConfigured: config.merchantConfigured,
    ready: config.ready,
  };
}

export function getConfiguredSumUpMerchantCode() {
  const config = getConfig();
  if (!config.merchantCode) throw new Error('SUMUP_MERCHANT_CODE_NOT_CONFIGURED');
  return config.merchantCode;
}

export async function retrieveSumUpCheckout(checkoutId: string): Promise<SumUpCheckout> {
  const config = getConfig();

  if (!config.webhookEnabled) throw new Error('SUMUP_WEBHOOK_DISABLED');
  if (!config.apiKey) throw new Error('SUMUP_API_KEY_NOT_CONFIGURED');
  if (!config.merchantCode) throw new Error('SUMUP_MERCHANT_CODE_NOT_CONFIGURED');

  const cleanId = checkoutId.trim();
  if (!cleanId || cleanId.length > 128) throw new Error('INVALID_SUMUP_CHECKOUT_ID');

  const response = await fetch(`https://api.sumup.com/v0.1/checkouts/${encodeURIComponent(cleanId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`SUMUP_RETRIEVE_CHECKOUT_FAILED:${response.status}:${body.slice(0, 240)}`);
  }

  const data = await response.json().catch(() => null) as SumUpCheckout | null;
  if (!data || typeof data !== 'object') throw new Error('SUMUP_INVALID_CHECKOUT_RESPONSE');

  return data;
}
