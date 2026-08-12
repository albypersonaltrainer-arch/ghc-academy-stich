import 'server-only'
import {
  getResendDeliveryStatus,
  sendResendEmail,
  type ResendDeliveryConfig,
} from '../email/resend-provider'

export type AcademyEmailProviderStatus = {
  deliveryEnabled: boolean
  provider: 'resend' | 'disabled'
  apiConfigured: boolean
  senderConfigured: boolean
  supportConfigured: boolean
  testRecipientConfigured: boolean
  previewSafe: boolean
  productionSafe: boolean
  usingPreventaFallback: boolean
  ready: boolean
}

export type SendAcademyEmailInput = {
  notificationId: string
  templateKey: string
  reference: string
  recipientEmail: string
  subject: string
  html: string
  text: string
}

function clean(value: string | undefined) {
  return (value || '').trim()
}

function getConfig() {
  const isProduction = process.env.VERCEL_ENV === 'production'
  const allowPreventaFallback = !isProduction

  const deliveryRaw = clean(process.env.ACADEMY_EMAIL_DELIVERY_ENABLED)
  const providerRaw = clean(process.env.ACADEMY_EMAIL_PROVIDER)
  const fromRaw = clean(process.env.ACADEMY_EMAIL_FROM)
  const supportRaw = clean(process.env.ACADEMY_SUPPORT_EMAIL)
  const testRecipientRaw = clean(process.env.ACADEMY_EMAIL_TEST_RECIPIENT)

  const usingPreventaFallback = allowPreventaFallback && (
    !deliveryRaw || !providerRaw || !fromRaw || !supportRaw || !testRecipientRaw
  )

  const deliveryEnabled = deliveryRaw
    ? deliveryRaw === 'true'
    : allowPreventaFallback && process.env.PREVENTA_EMAIL_DELIVERY_ENABLED === 'true'
  const resolvedProvider = (providerRaw || (allowPreventaFallback ? clean(process.env.PREVENTA_EMAIL_PROVIDER) : '')).toLowerCase()

  const config: ResendDeliveryConfig = {
    deliveryEnabled,
    provider: resolvedProvider === 'resend' ? 'resend' : 'disabled',
    apiKey: clean(process.env.RESEND_API_KEY),
    from: fromRaw || (allowPreventaFallback ? clean(process.env.PREVENTA_EMAIL_FROM) : ''),
    replyTo: supportRaw || (allowPreventaFallback ? clean(process.env.PREVENTA_SUPPORT_EMAIL) : ''),
    testRecipient: testRecipientRaw || (allowPreventaFallback ? clean(process.env.PREVENTA_EMAIL_TEST_RECIPIENT) : ''),
    isProduction,
    idempotencyPrefix: 'ghc-academy',
    requireReplyToInProduction: true,
  }

  return { config, usingPreventaFallback }
}

export function getAcademyEmailProviderStatus(): AcademyEmailProviderStatus {
  const { config, usingPreventaFallback } = getConfig()
  const status = getResendDeliveryStatus(config)
  return {
    deliveryEnabled: status.deliveryEnabled,
    provider: status.provider,
    apiConfigured: status.apiConfigured,
    senderConfigured: status.senderConfigured,
    supportConfigured: status.replyToConfigured,
    testRecipientConfigured: status.testRecipientConfigured,
    previewSafe: status.previewSafe,
    productionSafe: status.productionSafe,
    usingPreventaFallback,
    ready: status.ready,
  }
}

export async function sendAcademyEmail(input: SendAcademyEmailInput) {
  const { config } = getConfig()
  const status = getAcademyEmailProviderStatus()
  if (!status.ready || config.provider !== 'resend') throw new Error('ACADEMY_EMAIL_PROVIDER_NOT_READY')

  return sendResendEmail(config, {
    messageKey: input.notificationId,
    templateCode: input.templateKey,
    reference: input.reference,
    recipientEmail: input.recipientEmail,
    subject: input.subject,
    html: input.html,
    text: input.text,
    tags: [{ name: 'surface', value: 'academy' }],
  })
}
