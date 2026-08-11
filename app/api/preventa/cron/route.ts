import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  getPreventaScheduledMaintenanceStatus,
  runPreventaScheduledMaintenance,
} from '../../../../lib/preventa/scheduled-maintenance';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function clean(value: string | null | undefined) {
  return (value || '').trim();
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

function getCronSecret() {
  return clean(process.env.CRON_SECRET);
}

function isAuthorized(request: NextRequest) {
  const secret = getCronSecret();
  if (secret.length < 32) return false;

  const authorization = clean(request.headers.get('authorization'));
  const bearerSecret = authorization.toLowerCase().startsWith('bearer ')
    ? authorization.slice(7).trim()
    : '';

  return bearerSecret.length > 0 && safeEqual(bearerSecret, secret);
}

export async function GET(request: NextRequest) {
  if (getCronSecret().length < 32) {
    return NextResponse.json(
      { ok: false, code: 'PREVENTA_CRON_SECRET_NOT_CONFIGURED' },
      { status: 503 }
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json(
      { ok: false, code: 'PREVENTA_CRON_UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const status = getPreventaScheduledMaintenanceStatus();
  if (!status.ready) {
    return NextResponse.json(
      { ok: false, code: 'PREVENTA_CRON_GATE_CLOSED', scheduler: status },
      { status: 503 }
    );
  }

  try {
    const result = await runPreventaScheduledMaintenance();
    return NextResponse.json({ ok: true, scheduler: status, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_PREVENTA_CRON_ERROR';
    console.error('[preventa-cron]', message);
    return NextResponse.json(
      { ok: false, code: 'PREVENTA_CRON_EXECUTION_FAILED' },
      { status: 500 }
    );
  }
}
