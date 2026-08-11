import { NextResponse } from 'next/server';
import { runPaymentStateSelfTest } from '../../../../lib/preventa/payment-state-selftest';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (process.env.VERCEL_ENV === 'production') {
    return NextResponse.json({ ok: false, error: 'Not found.' }, { status: 404 });
  }

  const report = runPaymentStateSelfTest();
  return NextResponse.json(report, { status: report.ok ? 200 : 500 });
}
