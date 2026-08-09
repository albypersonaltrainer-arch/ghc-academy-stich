import 'server-only';

export type PreventaEmailProviderStatus = {
  deliveryEnabled: boolean;
  provider: 'resend' | 'disabled';
  apiConfigured: boolean;
  senderConfigured: boolean;
  testRecipientConfigured: boolean;
  ready: boolean;
  previewSafe: boolean;
};

export type SendPreventaEmailInput = {
  queueId: string;
  templateCode: string;
  orderReference: string;
  recipientEmail: string;
  subject: string;
  html: string;
  text: string;
};

export type SendPreventaEmailResult = {
  provider: 'resend';
  messageId: string;
  deliveredTo: string;
  testRedirected: boolean;
};

function clean(value: string | undefined) {
  return (value || '').trim();
}

function getProviderConfig() {
  const deliveryEnabled = process.env.PREVENTA_EMAIL_DELIVERY_ENABLED === 'true';
  const providerRaw = clean(process.env.PREVENTA_EMAIL_PROVIDER).toLowerCase();
  const provider = providerRaw === 'resend' ? 'resend' : 'disabled';
  const apiKey = clean(process.env.RESEND_API_KEY);
  const from = clean(process.env.PREVENTA_EMAIL_FROM);
  const testRecipient = clean(process.env.PREVENTA_EMAIL_TEST_RECIPIENT);
  const isProduction = process.env.VERCEL_ENV === 'production';
  const previewSafe = isProduction || Boolean(testRecipient);

  return {
    deliveryEnabled,
    provider,
    apiKey,
    from,
    testRecipient,
    isProduction,
    previewSafe,
  } as const;
}

export function getPreventaEmailProviderStatus(): PreventaEmailProviderStatus {
  const config = getProviderConfig();
  return {
    deliveryEnabled: config.deliveryEnabled,
    provider: config.provider,
    apiConfigured: Boolean(config.apiKey),
    senderConfigured: Boolean(config.from),
    testRecipientConfigured: Boolean(config.testRecipient),
    previewSafe: config.previewSafe,
    ready:
      config.deliveryEnabled &&
      config.provider === 'resend' &&
      Boolean(config.apiKey) &&
      Boolean(config.from) &&
      config.previewSafe,
  };
}

export async function sendPreventaEmail(
  input: SendPreventaEmailInput
): Promise<SendPreventaEmailResult> {
  const config = getProviderConfig();
  const status = getPreventaEmailProviderStatus();

  if (!status.ready || config.provider !== 'resend') {
    throw new Error('PREVENTA_EMAIL_PROVIDER_NOT_READY');
  }

  const deliveredTo = config.isProduction ? input.recipientEmail : config.testRecipient;
  if (!deliveredTo) {
    throw new Error('PREVENTA_EMAIL_TEST_RECIPIENT_REQUIRED_OUTSIDE_PRODUCTION');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `ghc-preventa-${input.queueId}`,
    },
    body: JSON.stringify({
      from: config.from,
      to: [deliveredTo],
      subject: input.subject,
      html: input.html,
      text: input.text,
      tags: [
        { name: 'template', value: input.templateCode },
        { name: 'order', value: input.orderReference },
      ],
    }),
    cache: 'no-store',
  });

  const raw = await response.text();
  let payload: { id?: string; message?: string; name?: string } = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = {};
  }

  if (!response.ok || !payload.id) {
    const providerMessage = payload.message || payload.name || raw || `HTTP_${response.status}`;
    throw new Error(`RESEND_SEND_FAILED:${response.status}:${providerMessage.slice(0, 500)}`);
  }

  return {
    provider: 'resend',
    messageId: payload.id,
    deliveredTo,
    testRedirected: !config.isProduction,
  };
}
