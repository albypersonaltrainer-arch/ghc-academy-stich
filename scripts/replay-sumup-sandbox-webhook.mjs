if (process.env.VERCEL_ENV !== 'preview') {
  console.log('[manual-sandbox-replay] omitido fuera de Preview');
  process.exit(0);
}

const publicBaseUrl = (process.env.PREVENTA_PUBLIC_BASE_URL ?? '').replace(/\/$/, '');
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? '';
const checkoutId = '5ea3d82c-c26e-4dea-8d02-ab9bcd291c8f';

if (!publicBaseUrl || bypassSecret.length !== 32) {
  console.error('[manual-sandbox-replay] configuración incompleta');
  process.exit(1);
}

const url = new URL('/api/preventa/sumup-webhook', publicBaseUrl);
url.searchParams.set('x-vercel-protection-bypass', bypassSecret);

const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({ event_type: 'CHECKOUT_STATUS_CHANGED', id: checkoutId }),
});

const body = await response.json().catch(() => null);
console.log(`[manual-sandbox-replay] httpStatus=${response.status}`);
console.log(`[manual-sandbox-replay] ok=${body?.ok === true}`);
console.log(`[manual-sandbox-replay] verifiedAgainstSumUpApi=${body?.verifiedAgainstSumUpApi === true}`);
if (!response.ok || body?.ok !== true || body?.verifiedAgainstSumUpApi !== true) {
  console.error(`[manual-sandbox-replay] code=${body?.code ?? 'unknown'}`);
  process.exit(1);
}
console.log('[manual-sandbox-replay] webhook Sandbox reconciliado por la ruta real');
