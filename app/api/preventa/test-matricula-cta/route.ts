import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { issueMatriculaAccessToken } from '../../../../lib/preventa/matricula-access-token';
import { renderPreventaEmail } from '../../../../lib/preventa/email-renderer';
import { sendPreventaEmail } from '../../../../lib/preventa/email-provider';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const TEST_ORDER_REFERENCE = 'GHC-C0A2CD93';

function clean(value: string | undefined) {
  return (value || '').trim();
}

export async function GET() {
  if (process.env.VERCEL_ENV !== 'preview') {
    return new NextResponse(null, { status: 404 });
  }

  const supabaseUrl = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const publicBaseUrl = clean(process.env.PREVENTA_PUBLIC_BASE_URL).replace(/\/$/, '');
  const supportEmail = clean(process.env.PREVENTA_EMAIL_SUPPORT || process.env.PREVENTA_SUPPORT_EMAIL);

  if (!supabaseUrl || !serviceRoleKey || !publicBaseUrl || !supportEmail) {
    return NextResponse.json({ ok: false, code: 'TEST_MATRICULA_CTA_GATE_CLOSED' }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data: order, error } = await supabase
    .from('preventa_orders')
    .select('id, order_reference, email, first_name, founder_place_number, terms_version, privacy_version')
    .eq('order_reference', TEST_ORDER_REFERENCE)
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json({ ok: false, code: 'TEST_ORDER_NOT_FOUND' }, { status: 404 });
  }

  const token = issueMatriculaAccessToken({
    orderReference: order.order_reference,
    ttlSeconds: 7 * 24 * 60 * 60,
  });
  const url = new URL('/preventa/matricula', publicBaseUrl);
  url.searchParams.set('order', order.order_reference);
  url.searchParams.set('token', token);

  const rendered = renderPreventaEmail('E01', {
    variables: {
      nombre: order.first_name,
      founder_place_number: order.founder_place_number,
      order_reference: order.order_reference,
      terms_version: order.terms_version,
      privacy_version: order.privacy_version,
      support_email: supportEmail,
    },
    ctaUrl: url.toString(),
  });

  const delivery = await sendPreventaEmail({
    queueId: `matricula-cta-test-${Date.now()}`,
    templateCode: 'E01',
    orderReference: order.order_reference,
    recipientEmail: order.email,
    subject: `[TEST CTA] ${rendered.subject}`,
    html: rendered.html,
    text: rendered.text,
  });

  return NextResponse.json({
    ok: true,
    templateCode: 'E01',
    orderReference: order.order_reference,
    deliveredTo: delivery.deliveredTo,
    providerMessageId: delivery.messageId,
  });
}
