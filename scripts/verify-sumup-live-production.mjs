const isProduction = process.env.VERCEL_ENV === 'production';

if (!isProduction) {
  console.log('[sumup-live] verificación LIVE omitida fuera de Production');
  process.exit(0);
}

const apiKey = (process.env.SUMUP_API_KEY ?? '').trim();
const merchantCode = (process.env.SUMUP_MERCHANT_CODE ?? '').trim();
const publicBaseUrl = (process.env.PREVENTA_PUBLIC_BASE_URL ?? '').trim().replace(/\/$/, '');
const checkoutTokenSecret = (process.env.PREVENTA_CHECKOUT_TOKEN_SECRET ?? '').trim();

const legal = {
  owner: (process.env.NEXT_PUBLIC_GHC_LEGAL_NAME ?? '').trim(),
  taxId: (process.env.NEXT_PUBLIC_GHC_LEGAL_TAX_ID ?? '').trim(),
  address: (process.env.NEXT_PUBLIC_GHC_LEGAL_ADDRESS ?? '').trim(),
  email: (process.env.NEXT_PUBLIC_GHC_LEGAL_EMAIL ?? '').trim(),
};

function isComplete(value) {
  return Boolean(value) && value !== 'PENDIENTE' && !value.startsWith('PENDIENTE DE');
}

const localChecks = {
  apiKeyPresent: Boolean(apiKey),
  merchantCodePresent: Boolean(merchantCode),
  publicBaseUrl: publicBaseUrl === 'https://ghcacademy.net',
  checkoutTokenSecret: checkoutTokenSecret.length >= 32,
  legalOwner: isComplete(legal.owner),
  legalTaxId: isComplete(legal.taxId),
  legalAddress: isComplete(legal.address),
  legalEmail: isComplete(legal.email),
};

for (const [name, ok] of Object.entries(localChecks)) {
  console.log(`[sumup-live] ${name}: ${ok ? 'OK' : 'FAIL'}`);
}

if (Object.values(localChecks).some((ok) => !ok)) {
  console.error('[sumup-live] Gate LIVE bloqueado por configuración local incompleta');
  process.exit(1);
}

const response = await fetch(`https://api.sumup.com/v1/merchants/${encodeURIComponent(merchantCode)}`, {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
  },
});

if (!response.ok) {
  console.error(`[sumup-live] verificación HTTP fallida: ${response.status}`);
  process.exit(1);
}

const merchant = await response.json();
const merchantChecks = {
  merchantCode: merchant?.merchant_code === merchantCode,
  liveMerchant: merchant?.sandbox === false,
  country: merchant?.country === 'ES',
  currency: merchant?.default_currency === 'EUR',
};

for (const [name, ok] of Object.entries(merchantChecks)) {
  console.log(`[sumup-live] ${name}: ${ok ? 'OK' : 'FAIL'}`);
}

if (Object.values(merchantChecks).some((ok) => !ok)) {
  console.error('[sumup-live] Gate LIVE bloqueado: las credenciales no corresponden al merchant LIVE esperado');
  process.exit(1);
}

console.log('[sumup-live] GATE_LIVE_READY=YES · merchant LIVE verificado; no se creó ningún checkout');
