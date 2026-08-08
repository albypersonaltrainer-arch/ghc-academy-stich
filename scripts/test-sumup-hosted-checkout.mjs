const isPreview = process.env.VERCEL_ENV === 'preview';

if (!isPreview) {
  console.log('[sumup-checkout-test] prueba omitida fuera de Preview');
  process.exit(0);
}

if (process.env.SUMUP_CHECKOUT_ENABLED !== 'true') {
  console.log('[sumup-checkout-test] Gate Hosted Checkout cerrado; prueba omitida');
  process.exit(0);
}

const apiKey = (process.env.SUMUP_API_KEY ?? '').trim();
const merchantCode = (process.env.SUMUP_MERCHANT_CODE ?? '').trim();
const publicBaseUrl = (process.env.PREVENTA_PUBLIC_BASE_URL ?? '').trim().replace(/\/$/, '');

if (!apiKey || !merchantCode || !publicBaseUrl) {
  console.error('[sumup-checkout-test] configuración incompleta');
  process.exit(1);
}

// Revalidar que jamás se ejecute esta prueba contra un merchant real.
const merchantResponse = await fetch(`https://api.sumup.com/v1/merchants/${encodeURIComponent(merchantCode)}`, {
  headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
});
if (!merchantResponse.ok) {
  console.error(`[sumup-checkout-test] merchant HTTP ${merchantResponse.status}`);
  process.exit(1);
}
const merchant = await merchantResponse.json();
if (merchant?.sandbox !== true || merchant?.merchant_code !== merchantCode) {
  console.error('[sumup-checkout-test] BLOQUEADO: merchant no confirmado como Sandbox');
  process.exit(1);
}

const nonce = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`.toUpperCase();
const checkoutReference = `GHC-SANDBOX-${nonce}`.slice(0, 50);
const amount = 1.00;

const createResponse = await fetch('https://api.sumup.com/v0.1/checkouts', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    amount,
    checkout_reference: checkoutReference,
    currency: 'EUR',
    description: 'GHC Academy · prueba técnica Sandbox',
    merchant_code: merchantCode,
    hosted_checkout: { enabled: true },
    redirect_url: `${publicBaseUrl}/preventa/confirmacion?test=sandbox`,
  }),
});

if (!createResponse.ok) {
  console.error(`[sumup-checkout-test] create HTTP ${createResponse.status}`);
  process.exit(1);
}

const checkout = await createResponse.json();
const createChecks = {
  id: typeof checkout?.id === 'string' && checkout.id.length > 0,
  hostedUrl: typeof checkout?.hosted_checkout_url === 'string' && checkout.hosted_checkout_url.startsWith('https://'),
  merchant: checkout?.merchant_code === merchantCode,
  currency: checkout?.currency === 'EUR',
  reference: checkout?.checkout_reference === checkoutReference,
  amount: Number(checkout?.amount) === amount,
};
for (const [name, ok] of Object.entries(createChecks)) {
  console.log(`[sumup-checkout-test] create.${name}: ${ok ? 'OK' : 'FAIL'}`);
}
if (Object.values(createChecks).some((ok) => !ok)) process.exit(1);

const retrieveResponse = await fetch(`https://api.sumup.com/v0.1/checkouts/${encodeURIComponent(checkout.id)}`, {
  headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
});
if (!retrieveResponse.ok) {
  console.error(`[sumup-checkout-test] retrieve HTTP ${retrieveResponse.status}`);
  process.exit(1);
}

const retrieved = await retrieveResponse.json();
const retrieveChecks = {
  id: retrieved?.id === checkout.id,
  merchant: retrieved?.merchant_code === merchantCode,
  currency: retrieved?.currency === 'EUR',
  reference: retrieved?.checkout_reference === checkoutReference,
  amount: Number(retrieved?.amount) === amount,
  unpaid: retrieved?.status !== 'PAID',
};
for (const [name, ok] of Object.entries(retrieveChecks)) {
  console.log(`[sumup-checkout-test] retrieve.${name}: ${ok ? 'OK' : 'FAIL'}`);
}
if (Object.values(retrieveChecks).some((ok) => !ok)) process.exit(1);

console.log('[sumup-checkout-test] Hosted Checkout Sandbox creado y revalidado; importe 1,00 EUR ficticio; ningún pago acreditado');
