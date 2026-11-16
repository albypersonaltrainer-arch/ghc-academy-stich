import { NextRequest, NextResponse } from 'next/server'
import {
  SECURITY_HEADERS, stageAuthorization, stageError
} from '../../../../../../lib/academy/staging-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const gate = await stageAuthorization(request, false)
  if (!gate.ok) return gate.response
  try {
    const { data, error } = await gate.identity.service.rpc(
      'ghc_academic_stage_list', { p_limit: 30 }
    )
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
