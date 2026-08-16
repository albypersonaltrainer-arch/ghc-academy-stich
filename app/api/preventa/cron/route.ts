import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { verifyGithubActionsCronOidcToken } from '../../../../lib/preventa/github-oidc';
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

function getBearerToken(request: NextRequest) {
  const authorization = clean(request.headers.get('authorization'));
  return authorization.toLowerCase().startsWith('bearer ')
    ? authorization.slice(7).trim()
    : '';
}

async function isAuthorized(request: NextRequest) {
  const bearerToken = getBearerToken(request);
  if (!bearerToken) return false;

  // Preserve CRON_SECRET compatibility for manual/emergency invocation when the
  // environment has one, but do not require a long-lived shared secret for the
  // normal hourly scheduler.
  const secret = clean(process.env.CRON_SECRET);
  if (secret.length >= 32 && safeEqual(bearerToken, secret)) return true;

  // Scheduled GitHub Actions authenticate with a short-lived OIDC JWT. The verifier
  // checks GitHub's RS256 signature plus immutable repo/workflow/ref/audience claims.
  return verifyGithubActionsCronOidcToken(bearerToken);
}

async function handleCron(request: NextRequest) {
  if (!(await isAuthorized(request))) {
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

// GET is used by the hourly GitHub scheduler. POST remains available for an
// authenticated manual/emergency invocation. Middleware rejects every other method.
export const GET = handleCron;
export const POST = handleCron;
