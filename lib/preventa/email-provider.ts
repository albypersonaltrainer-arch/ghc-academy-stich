import 'server-only';

export type PreventaEmailProviderStatus = {
  deliveryEnabled: boolean;
  provider: 'resend' | 'disabled';
  apiConfigured: boolean;
  senderConfigured: boolean;
  supportConfigured: boolean;
  testRecipientConfigured: boolean;
  ready: boolean;
  previewSafe: boolean;
  productionSafe: boolean;
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

function extractEmail(value: string) {
  const angleMatch = value.match(/<([^<>\s]+@[^<>\s]+)>/);
  if (angleMatch?.[1]) return angleMatch[1].toLowerCase();

  const plainMatch = value.match(/[^\s<>]+@[^\s<>]+/);
  return (plainMatch?.[0] || '').toLowerCase();
}

function isResendDevelopmentSender(value: string) {
  const email = extractEmail(value);
  return email.endsWith('@resend.dev');
}

function getProviderConfig() {
  const deliveryEnabled = process.env.PREVENTA_EMAIL_DELIVERY_ENABLED === 'true';
  const providerRaw = clean(process.env.PREVENTA_EMAIL_PROVIDER).toLowerCase();
  const provider = providerRaw === 'resend' ? 'resend' : 'disabled';
  const apiKey = clean(process.env.RESEND_API_KEY);
  const from = clean(process.env.PREVENTA_EMAIL_FROM);
  const supportEmail = clean(process.env.PREVENTA_SUPPORT_EMAIL);
  const testRecipient = clean(process.env.PREVENTA_EMAIL_TEST_RECIPIENT);
  const isProduction = process.env.VERCEL_ENV === 'production';
  const previewSafe = isProduction || Boolean(testRecipient);
  const productionSafe =
    !isProduction ||
    (Boolean(from) && !isResendDevelopmentSender(from) && Boolean(supportEmail));

  return {
    deliveryEnabled,
    provider,
    apiKey,
    from,
    supportEmail,
    testRecipient,
    isProduction,
    previewSafe,
    productionSafe,
  } as const;
}

export function getPreventaEmailProviderStatus(): PreventaEmailProviderStatus {
  const config = getProviderConfig();
  return {
    deliveryEnabled: config.deliveryEnabled,
    provider: config.provider,
    apiConfigured: Boolean(config.apiKey),
    senderConfigured: Boolean(config.from),
    supportConfigured: Boolean(config.supportEmail),
    testRecipientConfigured: Boolean(config.testRecipient),
    previewSafe: config.previewSafe,
    productionSafe: config.productionSafe,
    ready:
      config.deliveryEnabled &&
      config.provider === 'resend' &&
      Boolean(config.apiKey) &&
      Boolean(config.from) &&
      config.previewSafe &&
      config.productionSafe,
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

  if (config.isProduction && isResendDevelopmentSender(config.from)) {
    throw new Error('PREVENTA_EMAIL_PRODUCTION_SENDER_MUST_USE_VERIFIED_DOMAIN');
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
      reply_to: config.supportEmail || undefined,
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
