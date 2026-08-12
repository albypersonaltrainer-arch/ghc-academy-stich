import 'server-only'
import {
  getResendDeliveryStatus,
  isResendDevelopmentSender,
  sendResendEmail,
  type ResendDeliveryConfig,
} from '../email/resend-provider'

export type PreventaEmailProviderStatus = {
  deliveryEnabled: boolean
  provider: 'resend' | 'disabled'
  apiConfigured: boolean
  senderConfigured: boolean
  supportConfigured: boolean
  testRecipientConfigured: boolean
  ready: boolean
  previewSafe: boolean
  productionSafe: boolean
}

export type SendPreventaEmailInput = {
  queueId: string
  templateCode: string
  orderReference: string
  recipientEmail: string
  subject: string
  html: string
  text: string
}

export type SendPreventaEmailResult = {
  provider: 'resend'
  messageId: string
  deliveredTo: string
  testRedirected: boolean
}

function clean(value: string | undefined) {
  return (value || '').trim()
}

function getProviderConfig(): ResendDeliveryConfig {
  const providerRaw = clean(process.env.PREVENTA_EMAIL_PROVIDER).toLowerCase()
  return {
    deliveryEnabled: process.env.PREVENTA_EMAIL_DELIVERY_ENABLED === 'true',
    provider: providerRaw === 'resend' ? 'resend' : 'disabled',
    apiKey: clean(process.env.RESEND_API_KEY),
    from: clean(process.env.PREVENTA_EMAIL_FROM),
    replyTo: clean(process.env.PREVENTA_SUPPORT_EMAIL),
    testRecipient: clean(process.env.PREVENTA_EMAIL_TEST_RECIPIENT),
    isProduction: process.env.VERCEL_ENV === 'production',
    idempotencyPrefix: 'ghc-preventa',
    requireReplyToInProduction: true,
  }
}

export function getPreventaEmailProviderStatus(): PreventaEmailProviderStatus {
  const status = getResendDeliveryStatus(getProviderConfig())
  return {
    deliveryEnabled: status.deliveryEnabled,
    provider: status.provider,
    apiConfigured: status.apiConfigured,
    senderConfigured: status.senderConfigured,
    supportConfigured: status.replyToConfigured,
    testRecipientConfigured: status.testRecipientConfigured,
    previewSafe: status.previewSafe,
    productionSafe: status.productionSafe,
    ready: status.ready,
  }
}

export async function sendPreventaEmail(
  input: SendPreventaEmailInput
): Promise<SendPreventaEmailResult> {
  const config = getProviderConfig()
  const status = getPreventaEmailProviderStatus()

  if (!status.ready || config.provider !== 'resend') {
    throw new Error('PREVENTA_EMAIL_PROVIDER_NOT_READY')
  }
  if (config.isProduction && isResendDevelopmentSender(config.from)) {
    throw new Error('PREVENTA_EMAIL_PRODUCTION_SENDER_MUST_USE_VERIFIED_DOMAIN')
  }

  return sendResendEmail(config, {
    messageKey: input.queueId,
    templateCode: input.templateCode,
    reference: input.orderReference,
    recipientEmail: input.recipientEmail,
    subject: input.subject,
    html: input.html,
    text: input.text,
    tags: [{ name: 'order', value: input.orderReference }],
  })
}
