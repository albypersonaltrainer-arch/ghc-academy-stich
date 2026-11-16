import { NextRequest, NextResponse } from 'next/server'
import {
  SECURITY_HEADERS, stageAuthorization, stageError, listPrivateBatches
} from '../../../../../../lib/academy/staging-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const gate = await stageAuthorization(request, false)
  if (!gate.ok) return gate.response
  try {
    const { data, error } = await listPrivateBatches(gate.identity.service)
    if (error || !Array.isArray(data)) return stageError('STAGING_LIST_FAILED', 503)
    return NextResponse.json({
      ok: true,
      batches: data,
      publicationAllowed: false
    }, { headers: SECURITY_HEADERS })
  } catch {
    return stageError('STAGING_LIST_FAILED', 503)
  }
}
