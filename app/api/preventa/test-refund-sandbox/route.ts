import { NextResponse } from 'next/server';
import { refundPreventaOrderViaSumUp } from '../../../../lib/preventa/refund-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const TEST_ORDER_REFERENCE = 'GHC-0FD27434';

export async function GET() {
  if (process.env.VERCEL_ENV !== 'preview') {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const result = await refundPreventaOrderViaSumUp(TEST_ORDER_REFERENCE);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_TEST_REFUND_ERROR';
    console.error('[preventa-test-refund-sandbox]', message);
    return NextResponse.json(
      { ok: false, code: 'TEST_REFUND_FAILED', detail: message.slice(0, 240) },
      { status: 500 }
    );
  }
}
