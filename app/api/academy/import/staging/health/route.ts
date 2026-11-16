import { NextRequest, NextResponse } from 'next/server'
import {
  SECURITY_HEADERS, getPrivateStagingHealth, stageAuthorization, stageError
} from '../../../../../../lib/academy/staging-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 20

export async function GET(request: NextRequest) {
  const gate = await stageAuthorization(request, false)
  if (!gate.ok) return gate.response
  try {
    const { data, error } = await getPrivateStagingHealth(gate.identity.service)
    if (error || !data) return stageError('STAGING_HEALTH_UNAVAILABLE', 503)
    return NextResponse.json({
      ok: true,
      health: data,
      automaticCleanup: false,
      publicationAllowed: false
    }, { headers: SECURITY_HEADERS })
  } catch {
    return stageError('STAGING_HEALTH_UNAVAILABLE', 503)
  }
}
