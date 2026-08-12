import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getAcademyEmailProviderStatus } from '../../../lib/academy/email-provider'
import { getAcademyEmailWorkerStatus, runAcademyEmailWorker } from '../../../lib/academy/email-worker'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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

export async function GET() {
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
  })
}

export async function POST(request: NextRequest) {
  const secret = getWorkerSecret()
  if (secret.secret.length < 32) {
    return NextResponse.json({ ok: false, code: 'ACADEMY_EMAIL_WORKER_SECRET_NOT_CONFIGURED' }, { status: 503 })
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, code: 'ACADEMY_EMAIL_WORKER_UNAUTHORIZED' }, { status: 401 })
  }

  const workerStatus = getAcademyEmailWorkerStatus()
  if (!workerStatus.ready) {
    return NextResponse.json({ ok: false, code: 'ACADEMY_EMAIL_WORKER_GATE_CLOSED', worker: workerStatus }, { status: 503 })
  }

  const contentType = request.headers.get('content-type') || ''
  const body = contentType.includes('application/json') ? await request.json().catch(() => ({})) : {}
  const batchSize = Number((body as { batchSize?: unknown }).batchSize || 10)

  try {
    const result = await runAcademyEmailWorker(batchSize)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ACADEMY_EMAIL_WORKER_ERROR'
    console.error('[academy-email-worker]', message)
    return NextResponse.json({ ok: false, code: 'ACADEMY_EMAIL_WORKER_EXECUTION_FAILED' }, { status: 500 })
  }
}
