import { NextResponse } from 'next/server';
import { runPreventaEmailWorker } from '../../../../lib/preventa/email-worker';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  if (process.env.VERCEL_ENV !== 'preview') {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const result = await runPreventaEmailWorker(1);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_TEST_WORKER_ERROR';
    console.error('[preventa-test-run-email-worker]', message);
    return NextResponse.json({ ok: false, code: 'TEST_WORKER_FAILED' }, { status: 500 });
  }
}
