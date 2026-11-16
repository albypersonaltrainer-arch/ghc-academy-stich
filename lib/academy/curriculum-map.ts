// Academic master programme of GHC Academy (approved 3 levels, 30 modules).
// Source: GHC Academy master continuity document, August 2026.
// This catalogue maps destinations; it never assigns an enrolment or publishes.
export const MODULE_TITLES: readonly string[] = [
  'La profesión del entrenador personal',
  'Anatomía y kinesiología I',
  'Anatomía y kinesiología II',
  'Fisiología I',
  'Fisiología II',
  'Principios del entrenamiento',
  'Nutrición aplicada al entrenamiento',
  'Evaluación profesional del cliente',
  'Movimiento, patrones y técnica',
  'Seguridad, ética y responsabilidad profesional',
  'Hipertrofia muscular avanzada',
  'Fuerza máxima avanzada',
  'Resistencia y capacidad cardiorrespiratoria avanzada',
  'Periodización avanzada y planificación a largo plazo',
  'Nutrición avanzada, composición corporal y salud metabólica',
  'Entrenamiento en poblaciones especiales y enfermedades crónicas',
  'Preparación física deportiva: análisis de demandas, velocidad, agilidad y potencia aplicada',
  'Puesta a punto, competición y recuperación avanzada',
  'Prevención de lesiones, gestión de carga y retorno al entrenamiento',
  'Integración avanzada del entrenamiento y Sistema GHC',
  'Cambio de conducta, adherencia y coaching profesional',
  'Diseño del servicio, experiencia del cliente y comunicación profesional',
  'Posicionamiento, marketing ético y venta consultiva',
  'Dirección económica, precios y sostenibilidad del servicio',
  'Dirección operativa, procesos, calidad y escalabilidad del servicio',
  'Dirección de personas, liderazgo, cultura y supervisión profesional',
  'Gobernanza, cumplimiento, riesgo y responsabilidad profesional',
  'Investigación aplicada, lectura crítica y decisiones basadas en evidencia',
  'Tecnología, datos, inteligencia artificial e innovación aplicada al entrenamiento',
  'Dirección estratégica, integración maestra y Proyecto Final GHC'
] as const

export const LEVELS = {
  1: { slug: 'entrenador-personal-nivel-1', label: 'Fundamentos profesionales' },
  2: { slug: 'entrenador-personal-nivel-2', label: 'Metodología de entrenamiento especializado' },
  3: { slug: 'entrenador-personal-nivel-3', label: 'Maestría profesional y dirección del servicio' }
} as const

export function resolveCurriculumModule(moduleNumber: number | null) {
  if (moduleNumber === null || !Number.isInteger(moduleNumber)
      || moduleNumber < 1 || moduleNumber > 30) return null
  const level = Math.floor((moduleNumber - 1) / 10) + 1 as 1 | 2 | 3
  return {
    moduleNumber,
    title: MODULE_TITLES[moduleNumber - 1],
    level,
    levelTitle: LEVELS[level].label,
    courseSlug: LEVELS[level].slug,
    position: ((moduleNumber - 1) % 10) + 1
  }
}
