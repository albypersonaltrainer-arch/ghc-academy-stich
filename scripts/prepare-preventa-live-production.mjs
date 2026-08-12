import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const isProduction = process.env.VERCEL_ENV === 'production';

if (!isProduction) {
  console.log('[preventa-live] preparación LIVE omitida fuera de Production');
  process.exit(0);
}

const clean = (value) => String(value ?? '').trim();
const apiKey = clean(process.env.SUMUP_API_KEY);
const merchantCode = clean(process.env.SUMUP_MERCHANT_CODE);
const supabaseUrl = clean(process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/$/, '');
const serviceRoleKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
const checkoutTokenSecret = clean(process.env.PREVENTA_CHECKOUT_TOKEN_SECRET);
const persistenceEnabled = clean(process.env.PREVENTA_PERSISTENCE_ENABLED) === 'true';

const localChecks = {
  apiKeyPresent: apiKey.length > 0,
  merchantCodePresent: merchantCode.length > 0,
  supabaseUrlPresent: /^https:\/\/[a-z0-9.-]+$/i.test(supabaseUrl),
  serviceRoleKeyPresent: serviceRoleKey.length > 20,
  checkoutTokenSecret: checkoutTokenSecret.length >= 32,
  persistenceEnabled,
};

for (const [name, ok] of Object.entries(localChecks)) {
  console.log(`[preventa-live] ${name}: ${ok ? 'OK' : 'FAIL'}`);
}

if (Object.values(localChecks).some((ok) => !ok)) {
  console.error('[preventa-live] Gate bloqueado por configuración privada incompleta');
  process.exit(1);
}

const merchantResponse = await fetch(
  `https://api.sumup.com/v1/merchants/${encodeURIComponent(merchantCode)}`,
  {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  }
);

if (!merchantResponse.ok) {
  console.error(`[preventa-live] verificación de merchant fallida: HTTP ${merchantResponse.status}`);
  process.exit(1);
}

const merchant = await merchantResponse.json().catch(() => null);
const merchantChecks = {
  merchantCode: merchant?.merchant_code === merchantCode,
  liveMerchant: merchant?.sandbox === false,
  country: merchant?.country === 'ES',
  currency: merchant?.default_currency === 'EUR',
};

for (const [name, ok] of Object.entries(merchantChecks)) {
  console.log(`[preventa-live] ${name}: ${ok ? 'OK' : 'FAIL'}`);
}

if (Object.values(merchantChecks).some((ok) => !ok)) {
  console.error('[preventa-live] Gate bloqueado: el merchant no corresponde al entorno LIVE ES/EUR esperado');
  process.exit(1);
}

const legalResponse = await fetch(
  `${supabaseUrl}/rest/v1/preventa_public_legal_identity?select=owner,tax_id,address,email,is_active&id=eq.1&is_active=eq.true&limit=1`,
  {
    method: 'GET',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: 'application/json',
    },
  }
);

if (!legalResponse.ok) {
  console.error(`[preventa-live] lectura de identidad contractual fallida: HTTP ${legalResponse.status}`);
  process.exit(1);
}

const legalRows = await legalResponse.json().catch(() => null);
const legal = Array.isArray(legalRows) ? legalRows[0] : null;
const legalChecks = {
  owner: clean(legal?.owner).length >= 3,
  taxId: clean(legal?.tax_id).length >= 5,
  address: clean(legal?.address).length >= 8,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(legal?.email)),
  active: legal?.is_active === true,
};

for (const [name, ok] of Object.entries(legalChecks)) {
  console.log(`[preventa-live] legal.${name}: ${ok ? 'OK' : 'FAIL'}`);
}

if (Object.values(legalChecks).some((ok) => !ok)) {
  console.error('[preventa-live] Gate bloqueado: identidad contractual incompleta');
  process.exit(1);
}

const publicConfig = {
  publicBaseUrl: 'https://ghcacademy.net',
  legal: {
    owner: clean(legal.owner),
    taxId: clean(legal.tax_id),
    address: clean(legal.address),
    email: clean(legal.email),
  },
};

writeFileSync(
  join(process.cwd(), '.preventa-live-public.json'),
  `${JSON.stringify(publicConfig, null, 2)}\n`,
  { encoding: 'utf8', mode: 0o600 }
);

console.log('[preventa-live] GATE_LIVE_READY=YES · merchant LIVE e identidad contractual verificados; no se creó ningún checkout');
