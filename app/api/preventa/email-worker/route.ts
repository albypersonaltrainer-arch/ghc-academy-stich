import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  getPreventaEmailWorkerStatus,
  runPreventaEmailWorker,
} from '../../../../lib/preventa/email-worker';
import { getPreventaEmailProviderStatus } from '../../../../lib/preventa/email-provider';

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

function getWorkerSecret() {
  return clean(process.env.PREVENTA_EMAIL_WORKER_SECRET);
}

function isAuthorized(request: NextRequest) {
  const secret = getWorkerSecret();
  if (secret.length < 32) return false;

  const headerSecret = clean(request.headers.get('x-preventa-worker-secret'));
  const authorization = clean(request.headers.get('authorization'));
  const bearerSecret = authorization.toLowerCase().startsWith('bearer ')
    ? authorization.slice(7).trim()
    : '';

  return (
    (headerSecret.length > 0 && safeEqual(headerSecret, secret)) ||
    (bearerSecret.length > 0 && safeEqual(bearerSecret, secret))
  );
}

export async function GET(request: NextRequest) {
  // Keep infrastructure fingerprints off the public Production surface.
  // The authenticated diagnostic remains available to operators if needed.
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { ok: false, code: 'NOT_FOUND' },
      { status: 404, headers: NO_STORE_HEADERS }
    );
  }

  const worker = getPreventaEmailWorkerStatus();
  const provider = getPreventaEmailProviderStatus();

  return NextResponse.json({
    ok: true,
    route: 'preventa-email-worker',
    workerSecretConfigured: true,
    worker,
    provider,
  }, { headers: NO_STORE_HEADERS });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { ok: false, code: 'EMAIL_WORKER_UNAUTHORIZED' },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  const workerStatus = getPreventaEmailWorkerStatus();
  if (!workerStatus.ready) {
    return NextResponse.json(
      { ok: false, code: 'EMAIL_WORKER_GATE_CLOSED' },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  const contentType = request.headers.get('content-type') || '';
  const body = contentType.includes('application/json')
    ? await request.json().catch(() => ({}))
    : {};
  const batchSize = Number((body as { batchSize?: unknown }).batchSize || 10);

  try {
    const result = await runPreventaEmailWorker(batchSize);
    return NextResponse.json({ ok: true, ...result }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_EMAIL_WORKER_ERROR';
    console.error('[preventa-email-worker]', message);
    return NextResponse.json(
      { ok: false, code: 'EMAIL_WORKER_EXECUTION_FAILED' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
