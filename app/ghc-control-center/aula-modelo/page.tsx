'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import GHCLogo from '../../components/GHCLogo'
import { DEMO_QUIZ } from '../../../lib/academy/aula-model-types'
import type { AulaBlock, AulaModel, AulaSection } from '../../../lib/academy/aula-model-types'
import styles from './aula.module.css'

const DEMO_BATCH = '5be17000-d662-472f-a115-e90dca626ac6'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

type Screen = 'loading' | 'ready' | 'denied' | 'error'
type Tab = 'learn' | 'case' | 'quiz'

function sectionLabel(section: AulaSection) {
  if (section.kind === 'orientation') return 'Contexto'
  if (section.kind === 'practice') return 'Actividad'
  if (section.kind === 'references') return 'Fuentes'
  if (section.kind === 'glossary') return 'Glosario'
  return 'Lección'
}

function StudyBlock({ block, index }: { block: AulaBlock, index: number }) {
  if (block.kind === 'heading') {
    if (block.level === 1) return <h2 className={styles.contentTitle}>{block.text}</h2>
    if (block.level === 2) return <h3 className={styles.contentSubtitle}>{block.text}</h3>
    return <h4 className={styles.contentSmallTitle}>{block.text}</h4>
  }
  if (block.kind === 'list_item') return (
    <div className={styles.listLine}>
      <span aria-hidden="true" className={styles.listMarker}>{block.listType === 'numbered' ? (index + 1) + '.' : '•'}</span>
      <span>{block.text}</span>
    </div>
  )
  if (block.kind === 'table' && block.cells) return (
    <div className={styles.tableScroller}>
      <table className={styles.table}><tbody>
        {block.cells.map((row, i) => (
          <tr key={i}>{row.map((cell, c) => <td key={c}>{cell}</td>)}</tr>
        ))}
      </tbody></table>
    </div>
  )
  if (block.kind === 'image') return (
    <div className={styles.unavailableAsset} role="note">Figura original pendiente de comprobación editorial. No se genera ni sustituye ninguna imagen.</div>
  )
  return <p className={styles.prose}>{block.text}</p>
}

export default function AcademicAulaModel() {
  const router = useRouter()
  const [screen, setScreen] = useState<Screen>('loading')
  const [error, setError] = useState('')
  const [model, setModel] = useState<AulaModel | null>(null)
  const [selected, setSelected] = useState(0)
  const [tab, setTab] = useState<Tab>('learn')
  const [focus, setFocus] = useState(false)
  const [completed, setCompleted] = useState<string[]>([])
  const [caseChoice, setCaseChoice] = useState<number | null>(null)
  const [caseShown, setCaseShown] = useState(false)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [graded, setGraded] = useState(false)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const { data: identity, error: userError } = await supabase.auth.getUser()
        if (userError || !identity?.user) {
          router.replace('/acceso?next=%2Fghc-control-center%2Faula-modelo')
          return
        }
        const { data: isAdmin, error: adminError } = await supabase.rpc('ghc_is_admin')
        if (!active) return
        if (adminError || isAdmin !== true) {
          const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
          if (!aal.error && aal.data?.currentLevel !== 'aal2') {
            router.replace('/ghc-control-center/mfa')
            return
          }
          setScreen('denied')
          return
        }

        const { data: session } = await supabase.auth.getSession()
        const token = session?.session?.access_token
        if (!token) {
          router.replace('/acceso?next=%2Fghc-control-center%2Faula-modelo')
          return
        }
        const params = new URLSearchParams(window.location.search)
        const id = params.get('id') || DEMO_BATCH
        const response = await fetch('/api/academy/import/staging/aula?id=' + encodeURIComponent(id), {
          headers: { Authorization: 'Bearer ' + token },
          method: 'GET',
          cache: 'no-store'
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok || !data.ok || !data.model?.sections?.length) {
          throw new Error('No se pudo cargar el aula privada. Comprueba que el documento se ha importado como borrador.')
        }
        if (!active) return
        setModel(data.model as AulaModel)
        setScreen('ready')
      } catch (cause) {
        if (!active) return
        setError(cause instanceof Error ? cause.message : 'Error al cargar el aula de demostración.')
        setScreen('error')
      }
    }
    void load()
    return () => { active = false }
  }, [router])

  const sections = model?.sections || []
  const section = sections[selected]
  const progress = sections.length ? Math.round(completed.length / sections.length * 100) : 0
  const score = useMemo(() => DEMO_QUIZ.reduce((sum, q, i) =>
    sum + (answers[i] === q.answer ? 1 : 0), 0), [answers])
  const answered = Object.keys(answers).length === DEMO_QUIZ.length

  function markCompleted() {
    if (!section) return
    setCompleted(prev => prev.includes(section.id) ? prev : [...prev, section.id])
    if (selected < sections.length - 1) setSelected(v => v + 1)
  }

  function chooseSection(index: number) {
    setSelected(index)
    setTab('learn')
  }

  if (screen === 'loading') return (
    <main className={styles.loading}><p>Verificando acceso administrativo y cargando el material privado…</p></main>
  )
  if (screen === 'denied' || screen === 'error') return (
    <main className={styles.loading}>
      <h1>{screen === 'denied' ? 'Aula privada · acceso restringido' : 'Aula no disponible'}</h1>
      <p>{screen === 'denied' ? 'Solo el administrador con MFA AAL2 puede abrir este prototipo.' : error}</p>
      <a href="/ghc-control-center/importador">Volver al importador</a>
    </main>
  )
  if (!model || !section) return null

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.brand}><GHCLogo size="sm" showText tagline={false} /></div>
        <div className={styles.topRight}>
          <span className={styles.topMeta}>SPORT THROUGH SCIENCE</span>
          <span className={styles.privateTag}>MODELO PRIVADO · NO PUBLICADO</span>
          <a className={styles.back} href="/ghc-control-center/importador">Volver al importador</a>
        </div>
      </header>

      <div className={styles.breadcrumb}>
        GHC Academy <span>›</span> Nivel {model.level ?? '—'} <span>›</span> Módulo {model.module ?? '—'} <span>›</span> Aula interactiva
      </div>

      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>PROGRAMA PROFESIONAL DE ENTRENADOR PERSONAL</span>
          <h1>Módulo {model.module ?? '—'} <span>La profesión del entrenador personal</span></h1>
          <p>Una demostración de cómo se estudiará dentro de GHC Academy: lectura guiada, actividades prácticas, comprobación de conocimientos y progreso.</p>
        </div>
        <div className={styles.heroMetric}>
          <span>Avance en esta visita</span>
          <strong>{progress}%</strong>
          <div className={styles.progressTrack}><span style={{ width: progress + '%' }} /></div>
          <small>Este progreso no se guarda en tu cuenta.</small>
        </div>
      </section>

      <div className={[styles.layout, focus ? styles.focusMode : ''].join(' ')}>
        <aside className={styles.sidebar} aria-label="Unidades de aprendizaje">
          <div className={styles.sidebarTitle}>
            <strong>Itinerario del módulo</strong>
            <small>{completed.length} de {sections.length} unidades vistas</small>
          </div>
          <nav className={styles.navigation} aria-label="Apartados">
            {sections.map((item, i) => (
              <button type="button" key={item.id}
                className={[styles.navButton, selected === i && tab === 'learn' ? styles.activeNav : ''].filter(Boolean).join(' ')}
                onClick={() => chooseSection(i)}
                aria-current={selected === i && tab === 'learn' ? 'step' : undefined}>
                <span className={styles.navNumber}>{completed.includes(item.id) ? '✓' : String(i + 1).padStart(2, '0')}</span>
                <span className={styles.navLabel}>
                  <small>{sectionLabel(item)}</small>
                  <strong>{item.title}</strong>
                </span>
              </button>
            ))}
          </nav>
          <div className={styles.sideNote}>Fuente académica en revisión. Solo se muestran secciones que no están clasificadas como reservadas.</div>
        </aside>

        <section className={styles.main}>
          <div className={styles.toolbar}>
            <div className={styles.tabs} role="group" aria-label="Tipo de actividad">
              <button type="button" className={tab === 'learn' ? styles.selectedTab : ''}
                onClick={() => setTab('learn')} aria-pressed={tab === 'learn}>Estudiar</button>
              <button type="button" className={tab === 'case' ? styles.selectedTab : ''}
                onClick={() => setTab('case')} aria-pressed={tab === 'case'}>Caso práctico</button>
              <button type="button" className={tab === 'quiz' ? styles.selectedTab : ''}
                onClick={() => setTab('quiz')} aria-pressed={tab === 'quiz'}>Comprobar conocimientos</button>
            </div>
            <button type="button" className={styles.focusButton}
              onClick={() => setFocus(v => !v)} aria-pressed={focus}>
              {focus ? 'Salir de concentración' : 'Modo concentración'}
            </button>
          </div>

          {tab === 'learn' && (
            <article className={styles.lesson}>
              <div className={styles.lessonHeader}>
                <div className={styles.chapterMark}>{sectionLabel(section)} {selected + 1} / {sections.length}</div>
                <h2>{section.title}</h2>
                <p>Contenido del Word de prueba, organizado en bloques de lectura dentro del campus. Sin archivos PDF descargables.</p>
              </div>
              <div className={styles.reading}>
                {section.blocks.map((block, index) => <StudyBlock key={index} block={block} index={index} />)}
              </div>
              {model.video_placeholder && selected === 0 && (
                <div className={styles.videoPanel}>
                  <div className={styles.videoIcon}>▶</div>
                  <div><strong>Vídeo explicativo del módulo</strong>
                    <p>El Word contiene un guion audiovisual. El vídeo todavía no se ha producido ni incorporado.</p></div>
                  <span>PENDIENTE</span>
                </div>
              )}
              <div className={styles.lessonBottom}>
                <button type="button" className={styles.secondaryButton} disabled={selected === 0}
                  onClick={() => setSelected(v => Math.max(0, v - 1))}>Anterior</button>
                <button type="button" className={styles.primaryButton}
                  onClick={markCompleted}>
                  {completed.includes(section.id) ? 'Continuar' : 'Marcar leído y continuar'}
                </button>
              </div>
            </article>
          )}

          {tab === 'case' && (
            <article className={styles.lesson}>
              <div className={styles.lessonHeader}>
                <div className={styles.chapterMark}>APLICACIÓN PROFESIONAL · CASO DE EJEMPLO</div>
                <h2>Tomar decisiones antes de prescribir</h2>
                <p>Basado en el caso profesional resuelto sobre dolor agudo incluido en el Word académico reconstruido. Esta actividad es una demostración.</p>
              </div>
              <div className={styles.caseStatement}>
                Durante un ejercicio de press, un cliente refiere dolor agudo nuevo y pierde capacidad para elevar el brazo. ¿Qué harías primero?
              </div>
              <div className={styles.caseOptions} role="group" aria-label="Selecciona una actuación">
                {[
                  'Repetir el movimiento para determinar qué estructura está lesionada.',
                  'Detener el ejercicio, aplicar el protocolo de seguridad, registrar hechos y gestionar la valoración correspondiente sin diagnosticar.',
                  'Cambiar de ejercicio y continuar si el cliente lo solicita.'
                ].map((choice, i) => (
                  <button type="button" key={choice} className={caseChoice === i ? styles.caseSelected : ''}
                    onClick={() => { setCaseChoice(i); setCaseShown(false) }} aria-pressed={caseChoice === i}>
                    <span>{String.fromCharCode(65 + i)}</span>{choice}
                  </button>
                ))}
              </div>
              <button type="button" disabled={caseChoice === null} className={styles.primaryButton}
                onClick={() => setCaseShown(true)}>Comprobar decisión</button>
              {caseShown && (
                <div className={styles.feedback} role="status">
                  <strong>{caseChoice === 1 ? 'Decisión alineada con el protocolo.' : 'Revisa la decisión antes de continuar.'}</strong>
                  <p>El caso original propone detener el ejercicio, valorar la urgencia según protocolo, no diagnosticar, registrar los hechos y solicitar valoración antes de reintroducir las tareas relevantes.</p>
                </div>
              )}
            </article>
          )}

          {tab === 'quiz' && (
            <article className={styles.lesson}>
              <div className={styles.lessonHeader}>
                <div className={styles.chapterMark}>PRUEBA DEMOSTRATIVA · NO ES EL EXAMEN OFICIAL</div>
                <h2>Comprueba lo que has comprendido</h2>
                <p>Tres preguntas ilustrativas basadas en conceptos del temario. Las evaluaciones oficiales y sus solucionarios permanecen reservados y no se utilizan aquí.</p>
              </div>
              <div className={styles.quizQuestions}>
                {DEMO_QUIZ.map((item, questionIndex) => (
                  <fieldset className={styles.question} key={item.question}>
                    <legend><span>0{questionIndex + 1}</span>{item.question}</legend>
                    {item.choices.map((choice, optionIndex) => (
                      <label className={[styles.quizOption, answers[questionIndex] === optionIndex ? styles.quizChosen : ''].filter(Boolean).join(' ')} key={choice}>
                        <input type="radio" name={'demo-' + questionIndex} checked={answers[questionIndex] === optionIndex}
                          disabled={graded}
                          onChange={() => setAnswers(prev => ({ ...prev, [questionIndex]: optionIndex }))} />
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
                {!graded ? (
                  <button type="button" className={styles.primaryButton} disabled={!answered}
                    onClick={() => setGraded(true)}>Corregir actividad demostrativa</button>
                ) : (
                  <>
                    <p role="status"><strong>{score} / {DEMO_QUIZ.length}</strong> respuestas correctas. Resultado solo de esta sesión, sin nota oficial.</p>
                    <button type="button" className={styles.secondaryButton}
                      onClick={() => { setAnswers({}); setGraded(false) }}>Repetir actividad</button>
                  </>
                )}
              </div>
            </article>
          )}
        </section>
      </div>

      <footer className={styles.footer}>
        <span>GHC ACADEMY · SPORT THROUGH SCIENCE</span>
        <p>Prototipo de aula privada. Sin matrículas, pagos, notas oficiales, archivos publicados ni seguimiento persistente del alumno.</p>
        <span>Origen en revisión: {model.source_name}</span>
      </footer>
    </main>
  )
}
