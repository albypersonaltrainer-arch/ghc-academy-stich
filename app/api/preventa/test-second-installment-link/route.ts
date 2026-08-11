import { NextResponse } from 'next/server';
import { issueCheckoutAccessToken } from '../../../../lib/preventa/checkout-access-token';

export const dynamic = 'force-dynamic';

const ORDER_REFERENCE = 'GHC-0FD27434';

export async function GET(request: Request) {
  if (process.env.VERCEL_ENV !== 'preview') {
    return new NextResponse(null, { status: 404 });
  }

  const base = (process.env.PREVENTA_PUBLIC_BASE_URL || '').trim().replace(/\/$/, '');
  if (!/^https:\/\/[A-Za-z0-9.-]+(?::\d+)?$/.test(base)) {
    return NextResponse.json({ ok: false, code: 'PUBLIC_BASE_URL_NOT_CONFIGURED' }, { status: 503 });
  }

  const token = issueCheckoutAccessToken({
    orderReference: ORDER_REFERENCE,
    installmentNo: 2,
    ttlSeconds: 60 * 60,
  });

  const target = new URL('/preventa/pago', base);
  target.searchParams.set('order', ORDER_REFERENCE);
  target.searchParams.set('installment', '2');
  target.searchParams.set('token', token);

  const current = new URL(request.url);
  const share = current.searchParams.get('_vercel_share');
  if (share) target.searchParams.set('_vercel_share', share);

  return NextResponse.redirect(target, 302);
}
