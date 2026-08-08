const isPreview = process.env.VERCEL_ENV === 'preview';

if (!isPreview) {
  console.log('[preventa-env] comprobación estricta omitida fuera de Preview');
  process.exit(0);
}

const expectedSupabaseUrl = 'https://oqlxvesnjdkxlxwxkikq.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const tokenSecret = process.env.PREVENTA_CHECKOUT_TOKEN_SECRET ?? '';

const checks = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL === expectedSupabaseUrl,
  persistenceEnabled: process.env.PREVENTA_PERSISTENCE_ENABLED === 'true',
  serviceKeyPresent: serviceKey.length >= 20,
  serviceKeyLooksServerSide: serviceKey.startsWith('sb_secret_') || serviceKey.startsWith('eyJ'),
  checkoutTokenSecretPresent: tokenSecret.length >= 32,
  sumupCheckoutClosed: process.env.SUMUP_CHECKOUT_ENABLED !== 'true',
  sumupWebhookClosed: process.env.SUMUP_WEBHOOK_ENABLED !== 'true',
};

for (const [name, ok] of Object.entries(checks)) {
  console.log(`[preventa-env] ${name}: ${ok ? 'OK' : 'FAIL'}`);
}

const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length > 0) {
  console.error(`[preventa-env] Gate Preview bloqueado: ${failed.join(', ')}`);
  process.exit(1);
}

console.log('[preventa-env] Gate Preview de persistencia: OK; Gates SumUp: CERRADOS');
