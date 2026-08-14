import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const isProduction = process.env.VERCEL_ENV === 'production';

if (!isProduction) {
  console.log('[preventa-live] preparación LIVE omitida fuera de Production');
  process.exit(0);
}

const clean = (value) => String(value ?? '').trim();
const apiKey = clean(process.env.SUMUP_API_KEY);
const supabaseUrl = clean(process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/$/, '');
const serviceRoleKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
const checkoutTokenSecret = clean(process.env.PREVENTA_CHECKOUT_TOKEN_SECRET);
const persistenceEnabled = clean(process.env.PREVENTA_PERSISTENCE_ENABLED) === 'true';

// Merchant LIVE confirmado en el dashboard real de Global Health Coach.
// El merchant_code no es una credencial secreta; se usa aquí como ancla explícita
// para impedir que una API key de Sandbox pueda abrir cobros en Production.
const EXPECTED_LIVE_MERCHANT_CODE = 'MEAYY6J3';

const infrastructureReady = checkoutTokenSecret.length >= 32 && persistenceEnabled;
const sumupConfigured = apiKey.length > 0;
const legalBackendConfigured = /^https:\/\/[a-z0-9.-]+$/i.test(supabaseUrl) && serviceRoleKey.length > 20;

console.log(`[preventa-live] sumupConfigured: ${sumupConfigured ? 'OK' : 'FAIL'}`);
console.log(`[preventa-live] infrastructureReady: ${infrastructureReady ? 'OK' : 'FAIL'}`);
console.log(`[preventa-live] legalBackendConfigured: ${legalBackendConfigured ? 'OK' : 'FAIL'}`);

let merchantLiveVerified = false;
let verifiedMerchantCode = '';

if (sumupConfigured) {
  try {
    // La API key identifica la cuenta que la creó. Detectamos el merchant desde
    // /v0.1/me para no depender de un merchant_code Sandbox guardado previamente.
    const meResponse = await fetch('https://api.sumup.com/v0.1/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });

    if (meResponse.ok) {
      const me = await meResponse.json().catch(() => null);
      const detectedMerchantCode = clean(
        me?.merchant_profile?.merchant_code ??
        me?.merchantProfile?.merchant_code ??
        me?.merchant_code
      );

      console.log(`[preventa-live] merchant.detected: ${detectedMerchantCode ? 'OK' : 'FAIL'}`);

      if (detectedMerchantCode) {
        const merchantResponse = await fetch(
          `https://api.sumup.com/v1/merchants/${encodeURIComponent(detectedMerchantCode)}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              Accept: 'application/json',
            },
          }
        );

        if (merchantResponse.ok) {
          const merchant = await merchantResponse.json().catch(() => null);

          // SumUp puede omitir `sandbox` en la respuesta del merchant regular.
          // Por eso Production exige además coincidencia exacta con el merchant LIVE
          // conocido y rechaza de forma explícita cualquier `sandbox === true`.
          const merchantChecks = {
            merchantCode: merchant?.merchant_code === detectedMerchantCode,
            expectedLiveMerchant: detectedMerchantCode === EXPECTED_LIVE_MERCHANT_CODE,
            notSandbox: merchant?.sandbox !== true,
            country: merchant?.country === 'ES',
            currency: merchant?.default_currency === 'EUR',
          };

          for (const [name, ok] of Object.entries(merchantChecks)) {
            console.log(`[preventa-live] merchant.${name}: ${ok ? 'OK' : 'FAIL'}`);
          }

          merchantLiveVerified = Object.values(merchantChecks).every(Boolean);
          if (merchantLiveVerified) verifiedMerchantCode = detectedMerchantCode;
        } else {
          console.error(`[preventa-live] merchant.http: FAIL (${merchantResponse.status})`);
        }
      }
    } else {
      console.error(`[preventa-live] me.http: FAIL (${meResponse.status})`);
    }
  } catch (error) {
    console.error('[preventa-live] merchant.network: FAIL');
  }
}

let legalReady = false;
let legal = null;

if (legalBackendConfigured) {
  try {
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

    if (legalResponse.ok) {
      const legalRows = await legalResponse.json().catch(() => null);
      const candidate = Array.isArray(legalRows) ? legalRows[0] : null;
      const legalChecks = {
        owner: clean(candidate?.owner).length >= 3,
        taxId: clean(candidate?.tax_id).length >= 5,
        address: clean(candidate?.address).length >= 8,
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(candidate?.email)),
        active: candidate?.is_active === true,
      };

      for (const [name, ok] of Object.entries(legalChecks)) {
        console.log(`[preventa-live] legal.${name}: ${ok ? 'OK' : 'FAIL'}`);
      }

      legalReady = Object.values(legalChecks).every(Boolean);
      if (legalReady) {
        legal = {
          owner: clean(candidate.owner),
          taxId: clean(candidate.tax_id),
          address: clean(candidate.address),
          email: clean(candidate.email),
        };
      }
    } else {
      console.error(`[preventa-live] legal.http: FAIL (${legalResponse.status})`);
    }
  } catch (error) {
    console.error('[preventa-live] legal.network: FAIL');
  }
}

const sumupLiveVerified = merchantLiveVerified && infrastructureReady && legalReady;

const publicConfig = {
  publicBaseUrl: 'https://ghcacademy.net',
  sumupLiveVerified,
  merchantLiveVerified,
  merchantCode: verifiedMerchantCode || null,
  infrastructureReady,
  legalReady,
  legal,
};

writeFileSync(
  join(process.cwd(), '.preventa-live-public.json'),
  `${JSON.stringify(publicConfig, null, 2)}\n`,
  { encoding: 'utf8', mode: 0o600 }
);

console.log(`[preventa-live] GATE_LIVE_READY=${sumupLiveVerified ? 'YES' : 'NO'} · no se creó ningún checkout`);
