'use client'

/**
 * Vista pública de seguimiento del diseño de aula.
 * Datos de ejemplo, sin sesión, sin llamadas a Supabase, sin acceso a contenido
 * académico privado, sin matrícula y sin registros persistentes.
 * La política real de seguridad administrativa permanece intacta.
 */
import { useMemo, useState } from 'react'
import GHCLogoBase from '../components/GHCLogoBase'
import { DEMO_QUIZ } from '../../lib/academy/aula-model-types'
import { GHC_PASS_PERCENT, scoreSingleChoice } from '../../lib/academy/assessment-policy'
import styles from '../ghc-control-center/aula-modelo/aula.module.css'

type Tab = 'learn' | 'case' | 'quiz'

const EXAMPLE_UNITS = [
  {
    title: 'Cómo estudiar en el aula',
    kind: 'Contexto',
    paragraphs: [
      'Esta vista utiliza textos de ejemplo para mostrar la experiencia prevista. No contiene los documentos originales ni el contenido comercial de los cursos.',
      'En la versión del alumno, cada unidad tendrá lectura íntegra, navegación por apartados, actividades y un control de avance asociado a su matrícula.'
    ]
  },
  {
    title: 'Ejemplo de lectura guiada',
    kind: 'Lección',
    paragraphs: [
      'La estructura de las lecciones facilita localizar conceptos, volver a un apartado y consultar tablas sin descargar un PDF.',
      'El contenido de esta maqueta es ilustrativo; se sustituirá por los módulos académicos revisados cuando se autorice la importación privada.'
    ]
  },
  {
    title: 'Evaluación y progreso',
    kind: 'Actividad',
    paragraphs: [
      'El criterio académico definido para GHC Academy es un mínimo del 80 % de respuestas correctas. El resultado se comprueba por el número exacto de aciertos, no por un porcentaje redondeado.',
      'La evaluación definitiva registrará intentos, calificaciones y desbloqueos en el servidor. Esta vista de seguimiento no ejecuta esas operaciones.'
    ]
  }
] as const

const EXAMPLE_CASE = [
  'Ignorar la señal y mantener la carga sin volver a evaluar.',
  'Detener la tarea, registrar la información relevante y adaptar la decisión al contexto profesional.',
  'Asegurar que el ejercicio es seguro sin realizar ninguna comprobación.'
] as const

export default function SeguimientoV2() {
  const [tab, setTab] = useState<Tab>('learn')
  const [selected, setSelected] = useState(0)
  const [completed, setCompleted] = useState<number[]>([])
  const [focus, setFocus] = useState(false)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [graded, setGraded] = useState(false)
  const [caseChoice, setCaseChoice] = useState<number | null>(null)
  const [caseShown, setCaseShown] = useState(false)

  const assessment = useMemo(() => scoreSingleChoice(DEMO_QUIZ, answers), [answers])
  const progress = Math.round(completed.length * 100 / EXAMPLE_UNITS.length)
  const unit = EXAMPLE_UNITS[selected]

  function complete() {
    setCompleted(prev => prev.includes(selected) ? prev : [...prev, selected])
    if (selected < EXAMPLE_UNITS.length - 1) setSelected(prev => prev + 1)
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.brand}><GHCLogoBase size="sm" showText tagline={false} /></div>
        <div className={styles.topRight}>
          <span className={styles.topMeta}>SPORT THROUGH SCIENCE</span>
          <span className={styles.privateTag}>VISTA DE SEGUIMIENTO · DEMO</span>
        </div>
      </header>

      <div className={styles.breadcrumb}>
        GHC Academy <span>›</span> Desarrollo V2 <span>›</span> Aula de ejemplo
      </div>

      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>EXPERIENCIA DE APRENDIZAJE · VERSIÓN DE PRUEBA</span>
          <h1>Aula interactiva <span>Así evolucionará la experiencia del alumno</span></h1>
          <p>Explora el diseño, las unidades de lectura y el cuestionario con la regla del 80 %.
            Todos los textos son de demostración. No hay acceso a cursos de pago, datos de alumnos ni funciones administrativas.</p>
        </div>
        <div className={styles.heroMetric}>
          <span>Avance de esta visita</span>
          <strong>{progress}%</strong>
          <div className={styles.progressTrack} aria-label={'Progreso de demostración ' + progress + '%'}>
            <span style={{ width: progress + '%' }} />
          </div>
          <small>Solo se mantiene mientras la página está abierta. No es progreso académico real.</small>
        </div>
      </section>

      <div className={[styles.layout, focus ? styles.focusMode : ''].join(' ')}>
        <aside className={styles.sidebar} aria-label="Unidades de demostración">
          <div className={styles.sidebarTitle}>
            <strong>Itinerario de ejemplo</strong>
            <small>{completed.length} de {EXAMPLE_UNITS.length} unidades visitadas</small>
          </div>
          <nav className={styles.navigation} aria-label="Navegación por unidades">
            {EXAMPLE_UNITS.map((item, index) => (
              <button
                key={item.title} type="button"
                className={[styles.navButton, selected === index && tab === 'learn' ? styles.activeNav : ''].filter(Boolean).join(' ')}
                aria-current={selected === index && tab === 'learn' ? 'step' : undefined}
                onClick={() => { setSelected(index); setTab('learn') }}
              >
                <span className={styles.navNumber}>{completed.includes(index) ? '✓' : String(index + 1).padStart(2, '0')}</span>
                <span className={styles.navLabel}><small>{item.kind}</small><strong>{item.title}</strong></span>
              </button>
            ))}
          </nav>
          <div className={styles.sideNote}>Maqueta pública temporal con datos ficticios. Los módulos originales permanecen en el área privada.</div>
        </aside>

        <section className={styles.main}>
          <div className={styles.toolbar}>
            <div className={styles.tabs} role="group" aria-label="Tipo de actividad">
              <button type="button" className={tab === 'learn' ? styles.selectedTab : ''} aria-pressed={tab === 'learn'} onClick={() => setTab('learn')}>Estudiar</button>
              <button type="button" className={tab === 'case' ? styles.selectedTab : ''} aria-pressed={tab === 'case'} onClick={() => setTab('case')}>Caso práctico</button>
              <button type="button" className={tab === 'quiz' ? styles.selectedTab : ''} aria-pressed={tab === 'quiz'} onClick={() => setTab('quiz')}>Comprobar conocimientos</button>
            </div>
            <button type="button" className={styles.focusButton} aria-pressed={focus} onClick={() => setFocus(prev => !prev)}>
              {focus ? 'Salir de concentración' : 'Modo concentración'}
            </button>
          </div>

          {tab === 'learn' && (
            <article className={styles.lesson}>
              <div className={styles.lessonHeader}>
                <div className={styles.chapterMark}>{unit.kind.toUpperCase()} · {selected + 1} / {EXAMPLE_UNITS.length}</div>
                <h2>{unit.title}</h2>
                <p>Contenido ilustrativo. El aula definitiva respetará el texto y la estructura de cada Word académico aprobado.</p>
              </div>
              <div className={styles.reading}>
                {unit.paragraphs.map((p, index) => <p className={styles.prose} key={index}>{p}</p>)}
                {selected === 1 && (
                  <>
                    <h3 className={styles.contentSubtitle}>Ejemplo de tabla dentro de una lección</h3>
                    <div className={styles.tableScroller}>
                      <table className={styles.table}>
                        <tbody>
                          <tr><td>Elemento</td><td>Presentación prevista</td></tr>
                          <tr><td>Contenido académico</td><td>Texto estructurado y revisado</td></tr>
                          <tr><td>Práctica</td><td>Actividad guiada de la unidad</td></tr>
                          <tr><td>Evaluación</td><td>Examen con calificación del servidor</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
              {selected === 1 && (
                <div className={styles.videoPanel}>
                  <div className={styles.videoIcon}>▶</div>
                  <div>
                    <strong>Vídeo educativo del módulo</strong>
                    <p>Espacio reservado para la producción audiovisual futura. No se ha generado ningún vídeo.</p>
                  </div>
                  <span>PENDIENTE</span>
                </div>
              )}
              <div className={styles.lessonBottom}>
                <button type="button" className={styles.secondaryButton} disabled={selected === 0} onClick={() => setSelected(s => Math.max(0, s - 1))}>Anterior</button>
                <button type="button" className={styles.primaryButton} onClick={complete}>
                  {completed.includes(selected) ? 'Continuar' : 'Marcar como visitada y continuar'}
                </button>
              </div>
            </article>
          )}

          {tab === 'case' && (
            <article className={styles.lesson}>
              <div className={styles.lessonHeader}>
                <div className={styles.chapterMark}>CASO PRÁCTICO · SIMULACIÓN</div>
                <h2>Aplicar criterio profesional</h2>
                <p>Una actividad de demostración; no se guarda ninguna respuesta.</p>
              </div>
              <div className={styles.caseStatement}>
                Durante una sesión, aparece una molestia nueva que impide completar un movimiento. ¿Qué conducta inicial es más prudente?
              </div>
              <div className={styles.caseOptions} role="group" aria-label="Decisión en caso práctico">
                {EXAMPLE_CASE.map((choice, i) => (
                  <button type="button" key={choice} aria-pressed={caseChoice === i}
                    className={caseChoice === i ? styles.caseSelected : ''}
                    onClick={() => { setCaseChoice(i); setCaseShown(false) }}>
                    <span>{String.fromCharCode(65 + i)}</span>{choice}
                  </button>
                ))}
              </div>
              <button type="button" className={styles.primaryButton} disabled={caseChoice === null} onClick={() => setCaseShown(true)}>Comprobar decisión</button>
              {caseShown && (
                <div className={styles.feedback} role="status">
                  <strong>{caseChoice === 1 ? 'Opción adecuada en esta simulación.' : 'Revisa la elección.'}</strong>
                  <p>El ejemplo ilustra la conveniencia de ajustar la actividad ante una señal nueva, sin pretender diagnosticar.</p>
                </div>
              )}
            </article>
          )}

          {tab === 'quiz' && (
            <article className={styles.lesson}>
              <div className={styles.lessonHeader}>
                <div className={styles.chapterMark}>CUESTIONARIO DEMO · NO OFICIAL</div>
                <h2>Comprueba tus conocimientos</h2>
                <p>Estas tres preguntas son ilustrativas. La regla del {GHC_PASS_PERCENT} % ya está implementada;
                  aquí no se registran notas ni se desbloquean módulos.</p>
              </div>
              <div className={styles.quizQuestions}>
                {DEMO_QUIZ.map((item, questionIndex) => (
                  <fieldset className={styles.question} key={item.question}>
                    <legend><span>{String(questionIndex + 1).padStart(2, '0')}</span>{item.question}</legend>
                    {item.choices.map((choice, index) => (
                      <label key={choice} className={[styles.quizOption, answers[questionIndex] === index ? styles.quizChosen : ''].filter(Boolean).join(' ')}>
                        <input type="radio" name={'preview-question-' + questionIndex}
                          checked={answers[questionIndex] === index} disabled={graded}
                          onChange={() => setAnswers(prev => ({ ...prev, [questionIndex]: index }))} />
                        <span>{choice}</span>
                      </label>
                    ))}
                    {graded && (
                      <div className={styles.answerNote} role="status">
                        <strong>{answers[questionIndex] === item.answer ? 'Correcto' : 'A revisar'}</strong>
                        <p>{item.feedback}</p>
                      </div>
                    )}
                  </fieldset>
                ))}
              </div>
              <div className={styles.quizFooter}>
                {graded ? (
                  <>
                    <p role="status">
                      <strong>{assessment.correct} / {assessment.total} · {assessment.percentage}%</strong>
                      {assessment.passed ? ' Simulación superada.' : ' Simulación no superada.'}
                      {' '}Sin nota oficial ni desbloqueos.
                    </p>
                    <button type="button" className={styles.secondaryButton} onClick={() => { setAnswers({}); setGraded(false) }}>Repetir</button>
                  </>
                ) : (
                  <button type="button" className={styles.primaryButton} disabled={!assessment.completed} onClick={() => setGraded(true)}>
                    Corregir actividad de prueba
                  </button>
                )}
              </div>
            </article>
          )}
        </section>
      </div>
      <footer className={styles.footer}>
        <span>GHC ACADEMY · SPORT THROUGH SCIENCE</span>
        <p>Vista de seguimiento temporal, solo demostración. Sin acceso a Supabase, pagos, matrículas ni documentos privados.</p>
        <span>Desarrollo V2 · Revisión visual</span>
      </footer>
    </main>
  )
}
