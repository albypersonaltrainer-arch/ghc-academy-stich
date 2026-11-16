export type AulaBlock = {
  kind: 'paragraph' | 'heading' | 'list_item' | 'table' | 'image'
  text: string
  level?: number
  listType?: 'numbered' | 'bulleted'
  cells?: string[][]
  mediaId?: string
}

export type AulaSection = {
  id: string
  heading: string
  title: string
  kind: 'lesson_candidate' | 'orientation' | 'practice' | 'glossary' | 'references'
  sequence: number
  blocks: AulaBlock[]
}

export type AulaModel = {
  id: string
  source_name: string
  source_sha256: string
  level: number | null
  module: number | null
  title: string | null
  status: string
  source_format: string
  created_at: string
  sections: AulaSection[]
  video_placeholder: boolean
  assessment_placeholder: boolean
  staff_only_content_included: false
  publication_allowed: false
  academic_approval: false
}

// Illustrative interactions, not extracts of the official examination.
// Never import evaluation/answer-key content into the demo student's bundle.
export const DEMO_QUIZ = [
  {
    question: '¿Qué convierte una sesión en un servicio de entrenamiento verdaderamente personal?',
    choices: [
      'Que solo participe una persona',
      'Que las decisiones se adapten a sus necesidades y evolución',
      'Que siempre se realice en un gimnasio'
    ],
    answer: 1,
    feedback: 'En el material de referencia, la personalización se define por las decisiones adaptadas a la persona, no por la ratio entrenador-cliente.'
  },
  {
    question: '¿Cuál de estas opciones NO forma parte de las cuatro dimensiones de la calidad profesional descritas en el módulo?',
    choices: [
      'Ciencia, práctica y relación',
      'Sistema y documentación',
      'Garantizar transformaciones estéticas en un plazo fijo'
    ],
    answer: 2,
    feedback: 'La fuente propone ciencia, práctica, relación y sistema; las promesas estéticas garantizadas no son un estándar de calidad.'
  },
  {
    question: 'Durante un press aparece dolor agudo nuevo y pérdida de función. ¿Qué conducta es coherente con el caso del documento?',
    choices: [
      'Detener la tarea, registrar hechos y gestionar la valoración según el protocolo, sin diagnosticar',
      'Repetir el movimiento para identificar una lesión',
      'Asegurar al cliente que no existe riesgo'
    ],
    answer: 0,
    feedback: 'El caso profesional del Word reconstruido propone detener, valorar urgencia según protocolo, no diagnosticar, registrar y solicitar valoración antes de reintroducir tareas relevantes.'
  }
] as const
