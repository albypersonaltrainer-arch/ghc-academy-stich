const isPreview = process.env.VERCEL_ENV === 'preview';
const visualOnlyBranch = process.env.VERCEL_GIT_COMMIT_REF === 'preventa-copy-confianza-2026-08-13';

if (!isPreview) {
  console.log('[sumup-sandbox] verificación omitida fuera de Preview');
  process.exit(0);
}

if (visualOnlyBranch) {
  console.log('[sumup-sandbox] Preview visual-only: verificación Sandbox omitida y no se crea ningún checkout.');
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
