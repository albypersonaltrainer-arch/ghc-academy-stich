import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getAcademyEmailProviderStatus } from '../../../../lib/academy/email-provider'
import { getAcademyEmailWorkerStatus, runAcademyEmailWorker } from '../../../../lib/academy/email-worker'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0' }

function clean(value: string | null | undefined) {
  return (value || '').trim()
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left, 'utf8')
  const b = Buffer.from(right, 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}

function getWorkerSecret() {
  const academy = clean(process.env.ACADEMY_EMAIL_WORKER_SECRET)
  if (academy) return { secret: academy, fallback: false }
  if (process.env.VERCEL_ENV !== 'production') {
    const preventa = clean(process.env.PREVENTA_EMAIL_WORKER_SECRET)
    if (preventa) return { secret: preventa, fallback: true }
  }
  return { secret: '', fallback: false }
}

function isAuthorized(request: NextRequest) {
  const { secret } = getWorkerSecret()
  if (secret.length < 32) return false

  const headerSecret = clean(request.headers.get('x-academy-worker-secret'))
  const authorization = clean(request.headers.get('authorization'))
  const bearerSecret = authorization.toLowerCase().startsWith('bearer ')
    ? authorization.slice(7).trim()
    : ''

  return (
    (headerSecret.length > 0 && safeEqual(headerSecret, secret)) ||
    (bearerSecret.length > 0 && safeEqual(bearerSecret, secret))
  )
}

function parseBatchSize(input: unknown) {
  if (input === undefined || input === null || input === '') return 10
  const value = Number(input)
  if (!Number.isInteger(value) || value < 1 || value > 50) return null
  return value
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, code: 'NOT_FOUND' }, { status: 404, headers: NO_STORE_HEADERS })
  }

  const worker = getAcademyEmailWorkerStatus()
  const provider = getAcademyEmailProviderStatus()
  const secret = getWorkerSecret()

  return NextResponse.json({
    ok: true,
    route: 'academy-email-worker',
    workerSecretConfigured: secret.secret.length >= 32,
    usingPreventaWorkerSecretFallback: secret.fallback,
    worker,
    provider,
  }, { headers: NO_STORE_HEADERS })
}

export async function POST(request: NextRequest) {
  const secret = getWorkerSecret()
  if (secret.secret.length < 32) {
    return NextResponse.json({ ok: false, code: 'ACADEMY_EMAIL_WORKER_UNAVAILABLE' }, { status: 503, headers: NO_STORE_HEADERS })
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, code: 'ACADEMY_EMAIL_WORKER_UNAUTHORIZED' }, { status: 401, headers: NO_STORE_HEADERS })
  }

  const workerStatus = getAcademyEmailWorkerStatus()
  if (!workerStatus.ready) {
    return NextResponse.json({ ok: false, code: 'ACADEMY_EMAIL_WORKER_GATE_CLOSED' }, { status: 503, headers: NO_STORE_HEADERS })
  }

  const contentType = request.headers.get('content-type') || ''
  const body = contentType.includes('application/json') ? await request.json().catch(() => null) : {}
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ ok: false, code: 'ACADEMY_EMAIL_WORKER_INVALID_BODY' }, { status: 400, headers: NO_STORE_HEADERS })
  }

  const batchSize = parseBatchSize((body as { batchSize?: unknown }).batchSize)
  if (batchSize === null) {
    return NextResponse.json({ ok: false, code: 'ACADEMY_EMAIL_WORKER_INVALID_BATCH_SIZE' }, { status: 400, headers: NO_STORE_HEADERS })
  }

  try {
    const result = await runAcademyEmailWorker(batchSize)
    return NextResponse.json({ ok: true, ...result }, { headers: NO_STORE_HEADERS })
  } catch {
    console.error('[academy-email-worker] EXECUTION_FAILED')
    return NextResponse.json({ ok: false, code: 'ACADEMY_EMAIL_WORKER_EXECUTION_FAILED' }, { status: 500, headers: NO_STORE_HEADERS })
  }
}