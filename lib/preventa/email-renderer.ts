import 'server-only';
import {
  preventaEmailTemplates,
  type PreventaEmailTemplate,
} from '../../app/preventa/emailTemplates';
import { PREVENTA_OFFER } from './offer';

export type PreventaEmailTemplateCode =
  | 'E01' | 'E02' | 'E03' | 'E04' | 'E05' | 'E06' | 'E07'
  | 'E08' | 'E09' | 'E10' | 'E11' | 'E12' | 'E13' | 'E14';

export type PreventaEmailRenderContext = {
  variables: Record<string, string | number | null | undefined>;
  ctaUrl?: string | null;
};

export type RenderedPreventaEmail = {
  templateCode: PreventaEmailTemplateCode;
  subject: string;
  preheader: string;
  html: string;
  text: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function resolveVariables(
  input: string,
  variables: Record<string, string | number | null | undefined>
) {
  return input.replace(/{{\s*([A-Za-z0-9_]+)\s*}}/g, (_match, key: string) => {
    const value = variables[key];
    if (value === null || value === undefined || String(value).trim() === '') {
      throw new Error(`PREVENTA_EMAIL_VARIABLE_MISSING:${key}`);
    }
    return String(value);
  });
}

function normalizeFounderSchedule(input: string) {
  const openingDateLabel = PREVENTA_OFFER.openingDateLabel;

  return input
    .replace(
      'La apertura de la plataforma está prevista durante octubre de 2026.',
      `La apertura de GHC Academy está fijada para el ${openingDateLabel}.`
    )
    .replace(
      'Antes de la apertura recibirás un nuevo correo con la fecha concreta y, cuando la plataforma esté operativa, las instrucciones para activar tu acceso.',
      'Antes de la apertura recibirás un nuevo correo recordatorio y, cuando GHC Academy esté operativa, las instrucciones para activar tu acceso.'
    )
    .replaceAll(
      'La plataforma abrirá durante octubre de 2026',
      `GHC Academy abrirá el ${openingDateLabel}`
    )
    .replaceAll('Durante octubre de 2026', openingDateLabel)
    .replace(
      'y recibirás un correo específico con la fecha concreta y las instrucciones de acceso',
      'y recibirás un correo específico con las instrucciones de acceso'
    );
}

function getTemplate(code: PreventaEmailTemplateCode): PreventaEmailTemplate {
  const template = preventaEmailTemplates.find((item) => item.code === code);
  if (!template) throw new Error(`PREVENTA_EMAIL_TEMPLATE_NOT_FOUND:${code}`);
  return template;
}

function validateCtaUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function renderPreventaEmail(
  code: PreventaEmailTemplateCode,
  context: PreventaEmailRenderContext
): RenderedPreventaEmail {
  const template = getTemplate(code);
  const subject = normalizeFounderSchedule(resolveVariables(template.subject, context.variables));
  const preheader = normalizeFounderSchedule(resolveVariables(template.preheader, context.variables));
  const body = template.body.map((paragraph) =>
    normalizeFounderSchedule(resolveVariables(paragraph, context.variables))
  );
  const facts = (template.facts || []).map((fact) => ({
    label: normalizeFounderSchedule(resolveVariables(fact.label, context.variables)),
    value: normalizeFounderSchedule(resolveVariables(fact.value, context.variables)),
  }));
  const ctaUrl = template.cta ? validateCtaUrl(context.ctaUrl) : null;

  const bodyHtml = body
    .map((paragraph) => `<p style="margin:0 0 18px;font-size:16px;line-height:1.65;color:#202522;">${escapeHtml(paragraph)}</p>`)
    .join('');

  const factsHtml = facts.length
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:26px 0;border-collapse:separate;border-spacing:0 8px;">${facts
        .map(
          (fact) => `<tr><td style="padding:12px 14px;background:#f4f7f4;border-radius:8px 0 0 8px;font-size:13px;color:#68706a;vertical-align:top;width:42%;">${escapeHtml(fact.label)}</td><td style="padding:12px 14px;background:#f4f7f4;border-radius:0 8px 8px 0;font-size:14px;font-weight:700;color:#151a17;vertical-align:top;">${escapeHtml(fact.value)}</td></tr>`
        )
        .join('')}</table>`
    : '';

  const ctaHtml = template.cta && ctaUrl
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:30px 0 8px;"><tr><td style="border-radius:8px;background:#111613;"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:14px 22px;font-size:15px;font-weight:800;color:#ffffff;text-decoration:none;border:1px solid #22D65B;border-radius:8px;">${escapeHtml(template.cta)}</a></td></tr></table>`
    : '';

  const supportEmail = String(context.variables.support_email || '');
  if (!supportEmail) throw new Error('PREVENTA_EMAIL_VARIABLE_MISSING:support_email');

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#eef2ef;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2ef;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #dfe6e1;">
          <tr>
            <td style="padding:24px 30px;background:#080b09;color:#ffffff;">
              <div style="font-size:18px;font-weight:900;letter-spacing:.16em;">GHC <span style="font-weight:500;letter-spacing:.24em;color:#c7cec9;">ACADEMY</span></div>
              <div style="margin-top:7px;font-size:10px;font-weight:800;letter-spacing:.22em;color:#22D65B;text-transform:uppercase;">Sport Through Science</div>
              <div style="margin-top:14px;font-size:12px;color:#aeb7b0;">Edición Fundadora 2026 · ${escapeHtml(code)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 30px 28px;">
              <h1 style="margin:0 0 8px;font-size:25px;line-height:1.25;color:#101411;">${escapeHtml(subject)}</h1>
              <p style="margin:0 0 28px;font-size:14px;line-height:1.5;color:#6a726c;">${escapeHtml(preheader)}</p>
              ${bodyHtml}
              ${factsHtml}
              ${ctaHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:22px 30px;background:#f7f9f7;border-top:1px solid #e5ebe6;font-size:12px;line-height:1.6;color:#737b75;">
              GHC Academy · GHC Training — Health Through Strength · Formación privada online.<br>
              Para incidencias de matrícula o pago: <a href="mailto:${escapeHtml(supportEmail)}" style="color:#236b3a;">${escapeHtml(supportEmail)}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textLines = [
    subject,
    preheader,
    '',
    ...body,
    ...(facts.length ? ['', ...facts.map((fact) => `${fact.label}: ${fact.value}`)] : []),
    ...(template.cta && ctaUrl ? ['', `${template.cta}: ${ctaUrl}`] : []),
    '',
    `GHC Academy · GHC Training — Health Through Strength`,
    `Soporte: ${supportEmail}`,
  ];

  return {
    templateCode: code,
    subject,
    preheader,
    html,
    text: textLines.join('\n'),
  };
}
