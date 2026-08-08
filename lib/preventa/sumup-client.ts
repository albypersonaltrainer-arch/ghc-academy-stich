import 'server-only';
import type { SumUpCheckout } from './sumup-adapter';

export type SumUpIntegrationStatus = {
  webhookEnabled: boolean;
  apiConfigured: boolean;
  merchantConfigured: boolean;
  checkoutEnabled: boolean;
  ready: boolean;
};

function getConfig() {
  const webhookEnabled = process.env.SUMUP_WEBHOOK_ENABLED === 'true';
  const checkoutEnabled = process.env.SUMUP_CHECKOUT_ENABLED === 'true';
  const apiKey = (process.env.SUMUP_API_KEY || '').trim();
  const merchantCode = (process.env.SUMUP_MERCHANT_CODE || '').trim();

  return {
    webhookEnabled,
    checkoutEnabled,
    apiKey,
    merchantCode,
    apiConfigured: Boolean(apiKey),
    merchantConfigured: Boolean(merchantCode),
    webhookReady: webhookEnabled && Boolean(apiKey) && Boolean(merchantCode),
    checkoutReady: checkoutEnabled && Boolean(apiKey) && Boolean(merchantCode),
  };
}

export function getSumUpIntegrationStatus(): SumUpIntegrationStatus {
  const config = getConfig();
  return {
    webhookEnabled: config.webhookEnabled,
    apiConfigured: config.apiConfigured,
    merchantConfigured: config.merchantConfigured,
    checkoutEnabled: config.checkoutEnabled,
    ready: config.webhookReady || config.checkoutReady,
  };
}

export function getConfiguredSumUpMerchantCode() {
  const config = getConfig();
  if (!config.merchantCode) throw new Error('SUMUP_MERCHANT_CODE_NOT_CONFIGURED');
  return config.merchantCode;
}

function assertApiConfig(mode: 'webhook' | 'checkout') {
  const config = getConfig();
  if (mode === 'webhook' && !config.webhookEnabled) throw new Error('SUMUP_WEBHOOK_DISABLED');
  if (mode === 'checkout' && !config.checkoutEnabled) throw new Error('SUMUP_CHECKOUT_DISABLED');
  if (!config.apiKey) throw new Error('SUMUP_API_KEY_NOT_CONFIGURED');
  if (!config.merchantCode) throw new Error('SUMUP_MERCHANT_CODE_NOT_CONFIGURED');
  return config;
}

export async function retrieveSumUpCheckout(checkoutId: string): Promise<SumUpCheckout> {
  const config = assertApiConfig('webhook');

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

export async function createHostedSumUpCheckout(input: {
  checkoutReference: string;
  amountCents: number;
  currency: 'EUR';
  description: string;
  redirectUrl?: string;
}): Promise<SumUpCheckout> {
  const config = assertApiConfig('checkout');

  if (!input.checkoutReference.trim()) throw new Error('SUMUP_CHECKOUT_REFERENCE_REQUIRED');
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) throw new Error('SUMUP_INVALID_AMOUNT');
  if (input.currency !== 'EUR') throw new Error('SUMUP_INVALID_CURRENCY');

  const payload: Record<string, unknown> = {
    amount: input.amountCents / 100,
    checkout_reference: input.checkoutReference.trim(),
    currency: input.currency,
    description: input.description.trim().slice(0, 140),
    merchant_code: config.merchantCode,
    hosted_checkout: { enabled: true },
  };

  if (input.redirectUrl?.trim()) payload.redirect_url = input.redirectUrl.trim();

  const response = await fetch('https://api.sumup.com/v0.1/checkouts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`SUMUP_CREATE_CHECKOUT_FAILED:${response.status}:${body.slice(0, 240)}`);
  }

  const data = await response.json().catch(() => null) as SumUpCheckout | null;
  if (!data || typeof data !== 'object') throw new Error('SUMUP_INVALID_CREATE_CHECKOUT_RESPONSE');
  if (!data.id?.trim()) throw new Error('SUMUP_CREATE_CHECKOUT_MISSING_ID');
  if (!data.hosted_checkout_url?.trim()) throw new Error('SUMUP_CREATE_CHECKOUT_MISSING_HOSTED_URL');
  if (data.merchant_code !== config.merchantCode) throw new Error('SUMUP_CREATE_CHECKOUT_MERCHANT_MISMATCH');
  if (data.currency !== input.currency) throw new Error('SUMUP_CREATE_CHECKOUT_CURRENCY_MISMATCH');
  if (data.checkout_reference !== input.checkoutReference.trim()) throw new Error('SUMUP_CREATE_CHECKOUT_REFERENCE_MISMATCH');

  return data;
}
