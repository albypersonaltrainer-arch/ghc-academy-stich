import 'server-only'

export type ResendDeliveryConfig = {
  deliveryEnabled: boolean
  provider: 'resend' | 'disabled'
  apiKey: string
  from: string
  replyTo: string
  testRecipient: string
  isProduction: boolean
  idempotencyPrefix: string
  requireReplyToInProduction?: boolean
}

export type ResendDeliveryStatus = {
  deliveryEnabled: boolean
  provider: 'resend' | 'disabled'
  apiConfigured: boolean
  senderConfigured: boolean
  replyToConfigured: boolean
  testRecipientConfigured: boolean
  previewSafe: boolean
  productionSafe: boolean
  ready: boolean
}

export type SendResendEmailInput = {
  messageKey: string
  templateCode: string
  reference: string
  recipientEmail: string
  subject: string
  html: string
  text: string
  tags?: Array<{ name: string; value: string }>
}

export type SendResendEmailResult = {
  provider: 'resend'
  messageId: string
  deliveredTo: string
  testRedirected: boolean
}

function extractEmail(value: string) {
  const angleMatch = value.match(/<([^<>\s]+@[^<>\s]+)>/)
  if (angleMatch?.[1]) return angleMatch[1].toLowerCase()
  const plainMatch = value.match(/[^\s<>]+@[^\s<>]+/)
  return (plainMatch?.[0] || '').toLowerCase()
}

export function isResendDevelopmentSender(value: string) {
  return extractEmail(value).endsWith('@resend.dev')
}

export function getResendDeliveryStatus(config: ResendDeliveryConfig): ResendDeliveryStatus {
  const previewSafe = config.isProduction || Boolean(config.testRecipient)
  const replyToSafe = !config.requireReplyToInProduction || Boolean(config.replyTo)
  const productionSafe =
    !config.isProduction ||
    (Boolean(config.from) && !isResendDevelopmentSender(config.from) && replyToSafe)

  return {
    deliveryEnabled: config.deliveryEnabled,
    provider: config.provider,
    apiConfigured: Boolean(config.apiKey),
    senderConfigured: Boolean(config.from),
    replyToConfigured: Boolean(config.replyTo),
    testRecipientConfigured: Boolean(config.testRecipient),
    previewSafe,
    productionSafe,
    ready:
      config.deliveryEnabled &&
      config.provider === 'resend' &&
      Boolean(config.apiKey) &&
      Boolean(config.from) &&
      previewSafe &&
      productionSafe,
  }
}

export async function sendResendEmail(
  config: ResendDeliveryConfig,
  input: SendResendEmailInput
): Promise<SendResendEmailResult> {
  const status = getResendDeliveryStatus(config)
  if (!status.ready || config.provider !== 'resend') throw new Error('RESEND_PROVIDER_NOT_READY')
  if (config.isProduction && isResendDevelopmentSender(config.from)) {
    throw new Error('RESEND_PRODUCTION_SENDER_MUST_USE_VERIFIED_DOMAIN')
  }

  const deliveredTo = config.isProduction ? input.recipientEmail.trim() : config.testRecipient.trim()
  if (!deliveredTo) throw new Error('RESEND_TEST_RECIPIENT_REQUIRED_OUTSIDE_PRODUCTION')

  const safePrefix = config.idempotencyPrefix.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 40) || 'ghc'
  const tagMap = new Map<string, string>()
  tagMap.set('template', input.templateCode)
  tagMap.set('reference', input.reference)
  for (const tag of input.tags || []) {
    if (tag?.name && tag?.value) tagMap.set(tag.name, tag.value)
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `${safePrefix}-${input.messageKey}`,
    },
    body: JSON.stringify({
      from: config.from,
      to: [deliveredTo],
      reply_to: config.replyTo || undefined,
      subject: input.subject,
      html: input.html,
      text: input.text,
      tags: Array.from(tagMap.entries()).map(([name, value]) => ({
        name: name.slice(0, 256),
        value: value.slice(0, 256),
      })),
    }),
    cache: 'no-store',
  })

  const raw = await response.text()
  let payload: { id?: string } = {}
  try { payload = raw ? JSON.parse(raw) : {} } catch { payload = {} }

  if (!response.ok || !payload.id) {
    // Never propagate provider response bodies/messages. The HTTP status is enough
    // for retry classification and prevents provider/account details entering logs
    // or persisted delivery errors.
    throw new Error(`RESEND_SEND_FAILED:${response.status}`)
  }

  return {
    provider: 'resend',
    messageId: payload.id,
    deliveredTo,
    testRedirected: !config.isProduction,
  }
}