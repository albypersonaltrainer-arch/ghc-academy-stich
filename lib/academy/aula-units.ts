import type { AulaBlock, AulaSection } from './aula-model-types'

export type AulaUnit = AulaSection & {
  parentId: string
  parentTitle: string
  unitIndex: number
}

function splitAtLevelTwo(section: AulaSection): AulaUnit[] {
  const blocks = section.blocks
  const h2Indexes = blocks.flatMap((block, index) =>
    block.kind === 'heading' && block.level === 2 ? [index] : []
  )
  if (!h2Indexes.length) {
    return [{ ...section, parentId: section.id, parentTitle: section.title, unitIndex: 0 }]
  }

  const parts: AulaUnit[] = []
  const intro = blocks.slice(0, h2Indexes[0])
  // Do not invent an empty "introduction" page when the parent H1 is
  // immediately followed by its first H2; the H1 remains in the breadcrumb.
  const hasActualIntro = intro.some(block =>
    block.kind !== 'heading' && (block.text.trim() !== '' || block.kind === 'table' || block.kind === 'image')
  )
  if (hasActualIntro) {
    parts.push({
      ...section,
      id: section.id + ':intro',
      title: section.title + ' · Introducción',
      parentId: section.id,
      parentTitle: section.title,
      unitIndex: 0,
      blocks: intro
    })
  }

  for (let i = 0; i < h2Indexes.length; i++) {
    const start = h2Indexes[i]
    const end = i + 1 < h2Indexes.length ? h2Indexes[i + 1] : blocks.length
    parts.push({
      ...section,
      id: section.id + ':h2:' + (i + 1),
      title: blocks[start].text.trim() || section.title,
      parentId: section.id,
      parentTitle: section.title,
      unitIndex: i + 1,
      blocks: i === 0 && !hasActualIntro
        ? [...intro, ...blocks.slice(start, end)]
        : blocks.slice(start, end)
    })
  }
  return parts
}

// Every non-reserved content block appears once, in original Word order.
// This is a reading-navigation transformation, never a content rewrite or
// publication decision.
export function buildAulaUnits(sections: AulaSection[]): AulaUnit[] {
  return sections.flatMap(splitAtLevelTwo)
}

// Navigation groups are purely presentational; they keep the same stable unit IDs
// so progress already saved in the private demo continues to match.
export type AulaChapter = {
  id: string
  title: string
  units: Array<{ unit: AulaUnit; index: number }>
}
export function groupAulaChapters(units: AulaUnit[]): AulaChapter[] {
  const result: AulaChapter[] = []
  units.forEach((unit, index) => {
    const last = result[result.length - 1]
    if (!last || last.id !== unit.parentId) {
      result.push({
        id: unit.parentId,
        title: unit.parentTitle,
        units: [{unit, index}]
      })
    } else {
      last.units.push({unit, index})
    }
  })
  return result
}
