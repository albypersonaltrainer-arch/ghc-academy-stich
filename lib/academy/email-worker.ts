import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { getAcademyEmailProviderStatus, sendAcademyEmail } from './email-provider'
import { renderAcademyEmail, type AcademyNotificationEmail } from './email-renderer'

type ClaimedNotification = AcademyNotificationEmail & {
  recipient_email: string
  audience: string
  channel: string
  email_attempt_count: number
  available_at: string
}

function clean(value: string | undefined) {
  return (value || '').trim()
}

function getPersistenceConfig() {
  const supabaseUrl = clean(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const serviceRoleKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  return { ready: Boolean(supabaseUrl && serviceRoleKey), supabaseUrl, serviceRoleKey }
}

function createAdminClient() {
  const config = getPersistenceConfig()
  if (!config.ready) throw new Error('ACADEMY_EMAIL_PERSISTENCE_NOT_READY')
  return createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

export function getAcademyEmailPublicBaseUrl() {
  const configured = clean(process.env.ACADEMY_PUBLIC_BASE_URL).replace(/\/$/, '')
  if (/^https:\/\/[A-Za-z0-9.-]+(?::\d+)?$/.test(configured)) return configured

  if (process.env.VERCEL_ENV !== 'production') {
    const vercelUrl = clean(process.env.VERCEL_URL).replace(/\/$/, '')
    if (/^[A-Za-z0-9.-]+(?::\d+)?$/.test(vercelUrl)) return `https://${vercelUrl}`
  }
  return null
}

export function getAcademySupportEmail() {
  const own = clean(process.env.ACADEMY_SUPPORT_EMAIL)
  if (own) return own
  if (process.env.VERCEL_ENV !== 'production') return clean(process.env.PREVENTA_SUPPORT_EMAIL)
  return ''
}

export function getAcademyEmailWorkerStatus() {
  const persistence = getPersistenceConfig()
  const provider = getAcademyEmailProviderStatus()
  const publicBaseUrl = getAcademyEmailPublicBaseUrl()
  const supportEmail = getAcademySupportEmail()
  return {
    persistenceReady: persistence.ready,
    providerReady: provider.ready,
    publicBaseUrlConfigured: Boolean(publicBaseUrl),
    supportEmailConfigured: Boolean(supportEmail),
    usingPreventaProviderFallback: provider.usingPreventaFallback,
    ready: persistence.ready && provider.ready && Boolean(publicBaseUrl) && Boolean(supportEmail),
  }
}

async function markSent(notificationId: string, provider: string, providerMessageId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('ghc_email_worker_mark_academy_sent', {
    p_notification_id: notificationId,
    p_provider: provider,
    p_provider_message_id: providerMessageId,
  })
  if (error || data !== true) throw new Error(`ACADEMY_EMAIL_MARK_SENT_FAILED:${error?.message || 'state_not_processing'}`)
}

async function markFailed(notificationId: string, errorMessage: string) {
  const supabase = createAdminClient()
  const { error } = await supabase.rpc('ghc_email_worker_mark_academy_failed', {
    p_notification_id: notificationId,
    p_error: errorMessage,
    p_retry_after_seconds: null,
  })
  if (error) throw new Error(`ACADEMY_EMAIL_MARK_FAILED_FAILED:${error.message}`)
}

export async function runAcademyEmailWorker(batchSize = 10) {
  const status = getAcademyEmailWorkerStatus()
  const publicBaseUrl = getAcademyEmailPublicBaseUrl()
  const supportEmail = getAcademySupportEmail()
  if (!status.ready || !publicBaseUrl) throw new Error('ACADEMY_EMAIL_WORKER_NOT_READY')

  const supabase = createAdminClient()
  const limit = Math.max(1, Math.min(Math.trunc(batchSize || 10), 50))
  const { data, error } = await supabase.rpc('ghc_email_worker_claim_academy_notifications', {
    p_limit: limit,
    p_stale_lock_minutes: 10,
  })
  if (error) throw new Error(`ACADEMY_EMAIL_CLAIM_FAILED:${error.message}`)

  const claimed = (data || []) as ClaimedNotification[]
  const results: Array<{
    notificationId: string
    templateKey: string
    status: 'sent' | 'retry_or_failed'
    providerMessageId?: string
    error?: string
  }> = []

  for (const notification of claimed) {
    try {
      if (!notification.recipient_email?.trim()) throw new Error('ACADEMY_EMAIL_RECIPIENT_MISSING')
      const rendered = renderAcademyEmail({ notification, publicBaseUrl, supportEmail })
      const delivery = await sendAcademyEmail({
        notificationId: notification.id,
        templateKey: notification.template_key,
        reference: notification.order_id || notification.id,
        recipientEmail: notification.recipient_email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      })
      await markSent(notification.id, delivery.provider, delivery.messageId)
      results.push({
        notificationId: notification.id,
        templateKey: notification.template_key,
        status: 'sent',
        providerMessageId: delivery.messageId,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'UNKNOWN_ACADEMY_EMAIL_ERROR'
      try { await markFailed(notification.id, message) } catch (finishError) {
        console.error('[academy-email-worker-mark-failed]', finishError)
      }
      results.push({
        notificationId: notification.id,
        templateKey: notification.template_key,
        status: 'retry_or_failed',
        error: message.slice(0, 500),
      })
    }
  }

  return {
    claimed: claimed.length,
    sent: results.filter((item) => item.status === 'sent').length,
    retryOrFailed: results.filter((item) => item.status === 'retry_or_failed').length,
    results,
  }
}
