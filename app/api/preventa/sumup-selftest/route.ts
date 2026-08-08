import { NextResponse } from 'next/server';
import { runSumUpAdapterSelfTest } from '../../../../lib/preventa/sumup-selftest';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (process.env.VERCEL_ENV === 'production') {
    return NextResponse.json({ ok: false, error: 'Not found.' }, { status: 404 });
  }

  const result = runSumUpAdapterSelfTest();

  return NextResponse.json(result, {
    status: result.ok ? 200 : 500,
    headers: { 'x-robots-tag': 'noindex' },
  });
}
