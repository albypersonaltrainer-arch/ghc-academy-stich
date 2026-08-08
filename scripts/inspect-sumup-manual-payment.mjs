if (process.env.VERCEL_ENV !== 'preview') {
  console.log('[manual-sandbox-inspect] omitido fuera de Preview');
  process.exit(0);
}

const apiKey = process.env.SUMUP_API_KEY ?? '';
const merchantCode = process.env.SUMUP_MERCHANT_CODE ?? '';
const checkoutId = '5ea3d82c-c26e-4dea-8d02-ab9bcd291c8f';

if (!apiKey || !merchantCode) {
  console.error('[manual-sandbox-inspect] configuración incompleta');
  process.exit(1);
}

const response = await fetch(`https://api.sumup.com/v0.1/checkouts/${encodeURIComponent(checkoutId)}`, {
  headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
});

if (!response.ok) {
  console.error(`[manual-sandbox-inspect] SumUp HTTP ${response.status}`);
  process.exit(1);
}

const checkout = await response.json();
if (checkout?.merchant_code !== merchantCode) {
  console.error('[manual-sandbox-inspect] merchant mismatch');
  process.exit(1);
}

const tx = Array.isArray(checkout?.transactions)
  ? checkout.transactions.find((item) => item?.status === 'SUCCESSFUL')
  : null;

console.log(`[manual-sandbox-inspect] checkoutStatus=${checkout?.status ?? 'unknown'}`);
console.log(`[manual-sandbox-inspect] checkoutReference=${checkout?.checkout_reference ?? 'unknown'}`);
console.log(`[manual-sandbox-inspect] checkoutAmount=${checkout?.amount ?? 'unknown'} ${checkout?.currency ?? ''}`);
console.log(`[manual-sandbox-inspect] transactionSuccessful=${Boolean(tx)}`);
console.log(`[manual-sandbox-inspect] transactionTimestamp=${tx?.timestamp ?? 'missing'}`);
console.log(`[manual-sandbox-inspect] transactionAmount=${tx?.amount ?? 'missing'} ${tx?.currency ?? ''}`);
console.log(`[manual-sandbox-inspect] transactionIdPresent=${Boolean(tx?.id)}`);
