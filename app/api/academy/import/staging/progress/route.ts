import { NextRequest, NextResponse } from 'next/server'
import {
  SECURITY_HEADERS, stageAuthorization, stageError
} from '../../../../../../lib/academy/staging-server'
import { buildAulaUnits } from '../../../../../../lib/academy/aula-units'
import type { AulaModel } from '../../../../../../lib/academy/aula-model-types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 20

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i

type RpcResult<T> = { data: T | null; error: { message: string } | null }
type ProgressData = {
  completed_keys: string[]
  last_completed_at: string | null
  persisted: boolean
  scope: string
}

type DemoService = {
  rpc(name: 'ghc_academic_stage_learning_model', args: { p_id: string }): Promise<RpcResult<AulaModel>>
  rpc(name: 'ghc_academic_aula_demo_progress',
    args: { p_batch: string; p_user: string }): Promise<RpcResult<ProgressData>>
  rpc(name: 'ghc_academic_aula_demo_complete',
    args: { p_batch: string; p_user: string; p_key: string }): Promise<RpcResult<{ unit_key: string; persisted: true }>>
}

function modelIsPrivate(model: AulaModel | null): model is AulaModel {
  return Boolean(model && model.staff_only_content_included === false &&
    model.publication_allowed === false && model.academic_approval === false &&
    Array.isArray(model.sections) && model.sections.length > 0 &&
    model.sections.length <= 80 && model.sections.every(s =>
      ['lesson_candidate','orientation','practice','glossary','references'].includes(s.kind) &&
      Array.isArray(s.blocks) &&
      !/evaluaci[oó]n|autoevaluaci[oó]n|examen|respuestas|solucionario|answer key|script|gui[oó]n|guion|v[ií]deo|video/i.test(s.title) &&
      !s.blocks.some(b => /(?:^|\s)(?:RESPUESTAS\s*:|SOLUCIONARIO\s*:|CLAVE DE RESPUESTAS)/i.test(b.text))
    )
  )
}

export async function GET(request: NextRequest) {
  const gate = await stageAuthorization(request, false)
  if (!gate.ok) return gate.response
  const batch = request.nextUrl.searchParams.get('id') || ''
  if (!UUID.test(batch)) return stageError('INVALID_BATCH_ID', 422)

  try {
    const service = gate.identity.service as unknown as DemoService
    const { data: model, error: modelError } =
      await service.rpc('ghc_academic_stage_learning_model', { p_id: batch })
    if (modelError || !modelIsPrivate(model)) return stageError('AULA_MODEL_NOT_AVAILABLE', 404)

    const { data, error } = await service.rpc('ghc_academic_aula_demo_progress', {
      p_batch: batch,
      p_user: gate.identity.userId
    })
    if (error || !data || !Array.isArray(data.completed_keys)) {
      return stageError('DEMO_PROGRESS_UNAVAILABLE', 503)
    }
    const allowed = new Set(buildAulaUnits(model.sections).map(x => x.id))
    const completed = data.completed_keys.filter(key => allowed.has(key))
    return NextResponse.json({
      ok: true, completed, persisted: true,
      scope: 'admin_preview_only', officialGrades: false
    }, { headers: SECURITY_HEADERS })
  } catch {
    return stageError('DEMO_PROGRESS_UNAVAILABLE', 503)
  }
}

export async function POST(request: NextRequest) {
  const gate = await stageAuthorization(request, true)
  if (!gate.ok) return gate.response

  try {
    const text = await request.text()
    if (text.length > 2048) return stageError('JSON_TOO_LARGE', 413)
    const body = JSON.parse(text) as { id?: unknown; unit_key?: unknown }
    const batch = typeof body?.id === 'string' ? body.id : ''
    const key = typeof body?.unit_key === 'string' ? body.unit_key : ''
    if (!UUID.test(batch) || key.length > 100 || !key) {
      return stageError('INVALID_UNIT_PROGRESS', 422)
    }
    const service = gate.identity.service as unknown as DemoService
    const { data: model, error: modelError } =
      await service.rpc('ghc_academic_stage_learning_model', { p_id: batch })
    if (modelError || !modelIsPrivate(model)) return stageError('AULA_MODEL_NOT_AVAILABLE', 404)
    const allowed = new Set(buildAulaUnits(model.sections).map(unit => unit.id))
    if (!allowed.has(key)) return stageError('INVALID_UNIT_PROGRESS', 422)

    const { data, error } = await service.rpc('ghc_academic_aula_demo_complete', {
      p_batch: batch,
      p_user: gate.identity.userId,
      p_key: key
    })
    if (error || !data?.persisted) return stageError('DEMO_PROGRESS_SAVE_FAILED', 503)

    return NextResponse.json({
      ok: true, unit_key: key, persisted: true,
      scope: 'admin_preview_only', officialGrades: false
    }, { headers: SECURITY_HEADERS })
  } catch {
    return stageError('DEMO_PROGRESS_SAVE_FAILED', 422)
  }
}
