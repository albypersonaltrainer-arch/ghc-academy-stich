import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  getPreventaScheduledMaintenanceStatus,
  runPreventaScheduledMaintenance,
} from '../../../../lib/preventa/scheduled-maintenance';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
};

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

export async function POST(request: NextRequest) {
  if (getCronSecret().length < 32) {
    return NextResponse.json(
      { ok: false, code: 'PREVENTA_CRON_UNAVAILABLE' },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json(
      { ok: false, code: 'PREVENTA_CRON_UNAUTHORIZED' },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  const status = getPreventaScheduledMaintenanceStatus();
  if (!status.ready) {
    return NextResponse.json(
      { ok: false, code: 'PREVENTA_CRON_UNAVAILABLE' },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const result = await runPreventaScheduledMaintenance();
    return NextResponse.json(
      { ok: true, ...result },
      { headers: NO_STORE_HEADERS }
    );
  } catch {
    console.error('[preventa-cron] EXECUTION_FAILED');
    return NextResponse.json(
      { ok: false, code: 'PREVENTA_CRON_EXECUTION_FAILED' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}