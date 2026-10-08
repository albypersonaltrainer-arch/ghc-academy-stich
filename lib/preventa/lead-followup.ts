import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getResendDeliveryStatus, sendResendEmail, type ResendDeliveryConfig } from '../email/resend-provider';

type TemplateCode = 'L01' | 'L02' | 'L03';
type Lead = {
  first_name: string;
  email_normalized: string;
  marketing_consent: boolean;
  unsubscribe_token: string;
  status: string;
};
type QueueItem = {
  id: string;
  lead_id: string;
  template_code: TemplateCode;
  attempts: number;
  preventa_interest_leads: Lead | null;
};

const messages: Record<TemplateCode, { subject: string; title: string; paragraphs: string[]; resource: string }> = {
  L01: {
    subject: 'Tres decisiones que importan al empezar como entrenador personal',
    title: 'Empezar con criterio profesional',
    paragraphs: [
      'Un buen entrenador no comienza eligiendo ejercicios. Comienza preguntando qué necesita la persona, qué puede realizar y cómo sabremos si está progresando.',
      'Los tres puntos de partida son: recoger información relevante, elegir una carga asumible y prever cuándo revisar la respuesta.',
      'En esta guía te mostramos una ruta práctica para ordenar tus primeros pasos sin depender de rutinas copiadas.',
    ],
    resource: '/recursos/como-ser-entrenador-personal',
  },
  L02: {
    subject: 'Biomecánica, fisiología y programación: por qué hay que conectarlas',
    title: 'La diferencia está en conectar conocimientos',
    paragraphs: [
      'Saber los nombres de los músculos o conocer una tabla de series no garantiza que puedas resolver una situación real.',
      'La clave es observar el movimiento, entender la respuesta al esfuerzo y ajustar el programa al contexto del cliente.',
      'Hemos preparado una guía de biomecánica aplicada para mostrar cómo una decisión técnica cambia según el objetivo y la persona.',
    ],
    resource: '/recursos/biomecanica-entrenadores-personales',
  },
  L03: {
    subject: 'Antes de elegir formación de entrenador personal, comprueba esto',
    title: 'Cómo evaluar una formación antes de matricularte',
    paragraphs: [
      'Antes de invertir en una formación, revisa el recorrido académico completo: fundamentos, aplicación, evaluaciones y acompañamiento.',
      'La formación privada puede ampliar tus competencias, pero no sustituye los títulos oficiales que exija la normativa para determinadas profesiones.',
      'Puedes consultar nuestra guía para comparar programas con calma. Si te interesa la Edición Fundadora de GHC Academy, encontrarás sus condiciones sin obligación de compra.',
    ],
    resource: '/recursos/curso-entrenador-personal-online',
  },
};

function clean(v: string | undefined) { return (v || '').trim(); }
function escaped(v: string) {
  return v.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
}

function providerConfig(): ResendDeliveryConfig {
  return {
    deliveryEnabled: process.env.PREVENTA_EMAIL_DELIVERY_ENABLED === 'true',
    provider: clean(process.env.PREVENTA_EMAIL_PROVIDER) === 'resend' ? 'resend' : 'disabled',
    apiKey: clean(process.env.RESEND_API_KEY),
    from: clean(process.env.PREVENTA_EMAIL_FROM),
    replyTo: clean(process.env.PREVENTA_SUPPORT_EMAIL),
    testRecipient: clean(process.env.PREVENTA_EMAIL_TEST_RECIPIENT),
    isProduction: process.env.VERCEL_ENV === 'production',
    idempotencyPrefix: 'ghc-academy-interesados',
    requireReplyToInProduction: true,
  };
}

function renderMessage(code: TemplateCode, lead: Lead) {
  const msg = messages[code];
  const base = 'https://ghcacademy.net';
  const unsubscribe = `${base}/preventa/baja?token=${encodeURIComponent(lead.unsubscribe_token)}`;
  const resource = base + msg.resource;
  const fullText = [
    `Hola ${lead.first_name},`, '', msg.title, '', ...msg.paragraphs, '',
    `Leer la guía: ${resource}`, '',
    'Este mensaje se envía porque aceptaste recibir comunicaciones comerciales de GHC Academy.',
    `Darte de baja: ${unsubscribe}`,
  ].join('\n\n');
  const html = `<!doctype html><html lang="es"><body style="font-family:Arial,sans-serif;line-height:1.65;color:#15201a;background:#fff;padding:22px;max-width:680px;margin:auto">
    <p>Hola ${escaped(lead.first_name)},</p><h2>${escaped(msg.title)}</h2>
    ${msg.paragraphs.map(p => `<p>${escaped(p)}</p>`).join('')}
    <p><a style="background:#139e48;color:#fff;padding:12px 16px;border-radius:8px;display:inline-block" href="${resource}">Leer la guía de GHC Academy</a></p>
    <hr><p style="color:#52645a;font-size:12px">Recibes este correo por haber aceptado voluntariamente las comunicaciones comerciales de GHC Academy.
    <a href="${unsubscribe}">Darte de baja</a>.</p></body></html>`;
  return { subject: msg.subject, html, text: fullText };
}

export async function runPreventaLeadFollowup() {
  const config = providerConfig();
  const provider = getResendDeliveryStatus(config);
  const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!provider.ready || !url || !key) {
    return { status: 'disabled_or_not_configured', considered: 0, sent: 0, cancelled: 0 };
  }

  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.from('preventa_interest_email_queue')
    .select('id,lead_id,template_code,attempts,preventa_interest_leads(first_name,email_normalized,marketing_consent,unsubscribe_token,status)')
    .eq('status', 'pending').lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true }).limit(10);
  if (error) throw new Error('GHC_LEAD_QUEUE_FETCH_FAILED');

  let sent = 0; let cancelled = 0; let failed = 0;
  for (const item of (data || []) as unknown as QueueItem[]) {
    const lead = item.preventa_interest_leads;
    if (!lead || !lead.marketing_consent || lead.status === 'matriculado') {
      await db.from('preventa_interest_email_queue').update({ status: 'cancelled' }).eq('id', item.id);
      cancelled++;
      continue;
    }
    // Suppress presale marketing to people already contracting or paid.
    const { data: orders, error: orderError } = await db.from('preventa_orders')
      .select('id').eq('email_normalized', lead.email_normalized)
      .in('status', ['partial', 'paid']).limit(1);
    if (orderError) { failed++; continue; }
    if (orders?.length) {
      await db.from('preventa_interest_email_queue').update({ status: 'cancelled' }).eq('id', item.id);
      cancelled++;
      continue;
    }
    try {
      const content = renderMessage(item.template_code, lead);
      const delivered = await sendResendEmail(config, {
        messageKey: item.id,
        templateCode: item.template_code,
        reference: item.lead_id,
        recipientEmail: lead.email_normalized,
        subject: content.subject,
        html: content.html,
        text: content.text,
      });
      const { error: updateError } = await db.from('preventa_interest_email_queue').update({
        status: 'sent', sent_at: new Date().toISOString(),
        provider_message_id: delivered.messageId, attempts: item.attempts + 1,
      }).eq('id', item.id);
      if (updateError) throw new Error('GHC_LEAD_QUEUE_ACK_FAILED');
      sent++;
    } catch (e) {
      failed++;
      const attempts = item.attempts + 1;
      await db.from('preventa_interest_email_queue').update({
        status: attempts >= 3 ? 'failed' : 'pending',
        attempts,
        scheduled_at: new Date(Date.now() + 3_600_000).toISOString(),
        last_error_code: e instanceof Error ? e.message.slice(0, 100) : 'UNKNOWN',
      }).eq('id', item.id);
    }
  }
  return { status: 'processed', considered: data?.length || 0, sent, cancelled, failed };
}
