import { NextRequest, NextResponse } from 'next/server';
import {
  renderPreventaEmail,
  type PreventaEmailTemplateCode,
} from '../../../../lib/preventa/email-renderer';

export const dynamic = 'force-dynamic';

const CODES = new Set([
  'E01','E02','E03','E04','E05','E06','E07','E08','E09','E10','E11','E12','E13','E14',
]);

export async function GET(request: NextRequest) {
  if (process.env.VERCEL_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 });
  }

  const codeRaw = (request.nextUrl.searchParams.get('code') || 'E01').toUpperCase();
  if (!CODES.has(codeRaw)) {
    return NextResponse.json({ ok: false, code: 'INVALID_TEMPLATE_CODE' }, { status: 400 });
  }

  const base = (process.env.PREVENTA_PUBLIC_BASE_URL || 'https://example.test').replace(/\/$/, '');
  const rendered = renderPreventaEmail(codeRaw as PreventaEmailTemplateCode, {
    variables: {
      nombre: 'Alby',
      founder_place_number: 7,
      order_reference: 'GHC-DEMO2026',
      terms_version: 'PREVENTA_2026_TERMS_APPROVED_BASE',
      privacy_version: 'PREVENTA_2026_PRIVACY_APPROVED_BASE',
      second_payment_due_date: '24 de agosto de 2026',
      support_email: 'soporte@example.test',
      attempted_amount: '895 €',
      installment_description: 'Segunda cuota',
      refunded_amount: '1.690 €',
      refund_reference: 'REF-DEMO-2026',
    },
    ctaUrl: `${base}/preventa`,
  });

  return new NextResponse(rendered.html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
