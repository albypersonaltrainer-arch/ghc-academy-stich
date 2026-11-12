const isPreview = process.env.VERCEL_ENV === 'preview';

if (!isPreview) {
  console.log('[sumup-sandbox] verificación omitida fuera de Preview');
  process.exit(0);
}

 
// The isolated MFA Preview must never invoke the SumUp API.
if (process.env.GHC_SECURITY_PREVIEW_ONLY === 'true') {
  const safe = process.env.VERCEL_GIT_COMMIT_REF === 'test/ghc-v1-security-mfa-20261112'
    && process.env.SUMUP_CHECKOUT_ENABLED === 'false'
    && process.env.SUMUP_WEBHOOK_ENABLED === 'false'
    && process.env.PREVENTA_EMAIL_DELIVERY_ENABLED === 'false'
    && !(process.env.SUMUP_API_KEY ?? '').trim();
  if (!safe) {
    console.error('[sumup-sandbox] security-only Preview no cumple condiciones de aislamiento');
    process.exit(1);
  }
  console.log('[sumup-sandbox] omitido: Preview MFA aislada sin cobros');
  process.exit(0);
}

const apiKey = (process.env.SUMUP_API_KEY ?? '').trim();
const merchantCode = (process.env.SUMUP_MERCHANT_CODE ?? '').trim();

if (!apiKey || !merchantCode) {
  console.error('[sumup-sandbox] faltan credenciales de Sandbox');
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
  console.error(`[sumup-sandbox] verificación HTTP fallida: ${response.status}`);
  process.exit(1);
}

const merchant = await response.json();
const checks = {
  merchantCode: merchant?.merchant_code === merchantCode,
  sandbox: merchant?.sandbox === true,
  country: merchant?.country === 'ES',
  currency: merchant?.default_currency === 'EUR',
};

for (const [name, ok] of Object.entries(checks)) {
  console.log(`[sumup-sandbox] ${name}: ${ok ? 'OK' : 'FAIL'}`);
}

if (Object.values(checks).some((ok) => !ok)) {
  console.error('[sumup-sandbox] Gate Sandbox bloqueado');
  process.exit(1);
}

console.log('[sumup-sandbox] credenciales autenticadas contra merchant Sandbox correcto; no se creó ningún checkout');
