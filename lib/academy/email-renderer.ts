import 'server-only'

export type AcademyNotificationEmail = {
  id: string
  order_id: string | null
  template_key: string
  subject: string
  body: string
  metadata: Record<string, unknown> | null
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function resolveCta(notification: AcademyNotificationEmail, publicBaseUrl: string) {
  const key = clean(notification.template_key).toLowerCase()
  const metadata = notification.metadata || {}

  if (key === 'certificate_issued') {
    const slug = clean(metadata.verification_slug)
    if (slug) return { label: 'Ver certificado', url: `${publicBaseUrl}/certificados/${encodeURIComponent(slug)}` }
  }
  if (key.startsWith('support_')) {
    return { label: 'Abrir soporte', url: `${publicBaseUrl}/alumno/soporte` }
  }
  if (key.startsWith('installment_') || key.includes('payment') || key.includes('refund')) {
    return { label: 'Ver pagos', url: `${publicBaseUrl}/alumno/pagos` }
  }
  if (key.includes('access') || key.includes('course') || key.includes('certificate')) {
    return { label: 'Abrir GHC Academy', url: `${publicBaseUrl}/alumno` }
  }
  return { label: 'Abrir GHC Academy', url: `${publicBaseUrl}/alumno` }
}

function bodyToHtml(body: string) {
  const paragraphs = body.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean)
  return paragraphs.map((paragraph) => `<p style="margin:0 0 16px;color:#cbd3d6;font-size:16px;line-height:1.7;">${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`).join('')
}

export function renderAcademyEmail(input: {
  notification: AcademyNotificationEmail
  publicBaseUrl: string
  supportEmail: string
}) {
  const { notification, publicBaseUrl, supportEmail } = input
  const cta = resolveCta(notification, publicBaseUrl)
  const subject = clean(notification.subject) || 'Actualización de GHC Academy'
  const body = clean(notification.body) || 'Tienes una nueva actualización en GHC Academy.'
  const reference = notification.order_id ? `Pedido ${notification.order_id}` : 'GHC Academy'

  const html = `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#080b0d;color:#f4f7f8;font-family:Inter,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(body).slice(0, 140)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#080b0d;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;border:1px solid #252d31;border-radius:20px;background:#11161a;overflow:hidden;">
        <tr><td style="padding:28px 30px 20px;border-bottom:1px solid #252d31;">
          <div style="font-size:12px;font-weight:900;letter-spacing:.16em;color:#75e354;text-transform:uppercase;">GHC Academy</div>
          <div style="margin-top:7px;font-size:13px;color:#7f8b90;">Formación profesional · Actualización de tu cuenta</div>
        </td></tr>
        <tr><td style="padding:30px;">
          <h1 style="margin:0 0 20px;color:#f4f7f8;font-size:28px;line-height:1.15;letter-spacing:-.02em;">${escapeHtml(subject)}</h1>
          ${bodyToHtml(body)}
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin:26px 0 22px;"><tr><td style="border-radius:12px;background:#75e354;">
            <a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:14px 20px;color:#0b1608;text-decoration:none;font-size:14px;font-weight:900;">${escapeHtml(cta.label)}</a>
          </td></tr></table>
          <div style="padding-top:18px;border-top:1px solid #252d31;color:#7f8b90;font-size:12px;line-height:1.6;">
            ${escapeHtml(reference)}${supportEmail ? ` · Soporte: <a href="mailto:${escapeHtml(supportEmail)}" style="color:#9be988;">${escapeHtml(supportEmail)}</a>` : ''}
          </div>
        </td></tr>
      </table>
      <div style="max-width:640px;padding:18px 8px;color:#657177;font-size:11px;line-height:1.55;text-align:center;">Este mensaje es transaccional y se genera por una acción o cambio relevante en tu relación con GHC Academy.</div>
    </td></tr>
  </table>
</body></html>`

  const text = [
    'GHC Academy',
    '',
    subject,
    '',
    body,
    '',
    `${cta.label}: ${cta.url}`,
    supportEmail ? `Soporte: ${supportEmail}` : '',
  ].filter((line) => line !== '').join('\n')

  return { subject, html, text, ctaUrl: cta.url, ctaLabel: cta.label }
}
