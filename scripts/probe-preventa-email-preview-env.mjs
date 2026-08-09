const isPreview = process.env.VERCEL_ENV === 'preview';
if (!isPreview) {
  console.log('[email-probe] omitido fuera de Preview');
  process.exit(0);
}

const checks = {
  deliveryEnabled: process.env.PREVENTA_EMAIL_DELIVERY_ENABLED === 'true',
  providerResend: (process.env.PREVENTA_EMAIL_PROVIDER || '').trim().toLowerCase() === 'resend',
  apiKeyPresent: (process.env.RESEND_API_KEY || '').trim().length >= 20,
  senderConfigured: (process.env.PREVENTA_EMAIL_FROM || '').trim().length >= 5,
  testRecipientIsAlby: (process.env.PREVENTA_EMAIL_TEST_RECIPIENT || '').trim().toLowerCase() === 'albycanarion@gmail.com',
  workerSecretPresent: (process.env.PREVENTA_EMAIL_WORKER_SECRET || '').trim().length >= 32,
};

for (const [name, ok] of Object.entries(checks)) {
  console.log(`[email-probe] ${name}: ${ok ? 'OK' : 'MISSING'}`);
}

const ready = Object.values(checks).every(Boolean);
console.log(`[email-probe] EMAIL_PREVIEW_READY=${ready ? 'YES' : 'NO'}`);
