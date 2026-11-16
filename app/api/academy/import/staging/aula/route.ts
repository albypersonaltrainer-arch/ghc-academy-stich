import { NextRequest, NextResponse } from 'next/server'
import {
  SECURITY_HEADERS, stageAuthorization, stageError
} from '../../../../../../lib/academy/staging-server'
import type { AulaModel, AulaSection } from '../../../../../../lib/academy/aula-model-types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

type RpcOutput = {
  data: AulaModel | null
  error: { message: string } | null
}

export async function GET(request: NextRequest) {
  const gate = await stageAuthorization(request, false)
  if (!gate.ok) return gate.response

  const id = request.nextUrl.searchParams.get('id') || ''
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id)) {
    return stageError('INVALID_BATCH_ID', 422)
  }
  try {
    const service = gate.identity.service as unknown as {
      rpc(name: 'ghc_academic_stage_learning_model', args: { p_id: string }): Promise<RpcOutput>
    }
    const { data, error } = await service.rpc('ghc_academic_stage_learning_model', { p_id: id })
    if (error || !data) return stageError('AULA_MODEL_NOT_AVAILABLE', 404)
    const SAFE_KINDS: AulaSection['kind'][] = [
      'lesson_candidate', 'orientation', 'practice', 'glossary', 'references'
    ]
    if (data.staff_only_content_included !== false ||
        data.publication_allowed !== false ||
        data.academic_approval !== false ||
        !Array.isArray(data.sections) ||
        data.sections.length < 1 ||
        data.sections.length > 80 ||
        data.sections.some(section =>
          !SAFE_KINDS.includes(section.kind) ||
          !Array.isArray(section.blocks) ||
          section.blocks.length < 1 ||
          section.blocks.length > 1800 ||
          /autoevaluaci[oó]n|evaluaci[oó]n|examen|respuestas|solucionario|clave de respuestas|answer key|r[uú]brica|guion|gui[oó]n|script|v[ií]deo|video/i.test(section.title) ||
          section.blocks.some(block =>
            typeof block.text !== 'string' ||
            /(?:^|\s)(?:RESPUESTAS\s*:|SOLUCIONARIO\s*:|CLAVE DE RESPUESTAS)/i.test(block.text)
          )
        )
    ) {
      return stageError('AULA_PRIVACY_CHECK_FAILED', 422)
    }
    return NextResponse.json({
      ok: true,
      model: data,
      storage: 'private',
      progressPersisted: false,
      officialAssessmentIncluded: false
    }, { headers: SECURITY_HEADERS })
  } catch {
    return stageError('AULA_MODEL_NOT_AVAILABLE', 503)
  }
}
