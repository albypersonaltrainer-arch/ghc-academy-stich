'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import GHCLogo from '../../components/GHCLogo'
import { DEMO_QUIZ } from '../../../lib/academy/aula-model-types'
import type { AulaBlock, AulaModel, AulaSection } from '../../../lib/academy/aula-model-types'
import { buildAulaUnits } from '../../../lib/academy/aula-units'
import { GHC_PASS_PERCENT, scoreSingleChoice } from '../../../lib/academy/assessment-policy'
import styles from './aula.module.css'

const DEMO_BATCH = '7de72c9d-27f1-46a0-b739-1a51950c9c28'
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

function OriginalWordFigure({ batchId, block }: { batchId: string; block: AulaBlock }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  useEffect(() => {
    let cancelled = false
    let blobUrl: string | null = null
    const load = async () => {
      if (!block.mediaId) { setStatus('unavailable'); return }
      try {
        const { data } = await supabase.auth.getSession()
        const token = data.session?.access_token
        if (!token) throw new Error('SESSION_REQUIRED')
        const query = new URLSearchParams({ id: batchId, media: block.mediaId })
        const response = await fetch('/api/academy/import/staging/media?' + query.toString(), {
          headers: { Authorization: 'Bearer ' + token },
          method: 'GET',
          cache: 'no-store'
        })
        const type = response.headers.get('content-type') || ''
        if (!response.ok || !/^image\/(png|jpeg|webp|gif)$/.test(type)) throw new Error('MEDIA_UNAVAILABLE')
        const original = await response.blob()
        if (original.size > 8 * 1024 * 1024) throw new Error('MEDIA_TOO_LARGE')
        if (cancelled) return
        blobUrl = URL.createObjectURL(original)
        setImageUrl(blobUrl)
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus('unavailable')
      }
    }
    void load()
    return () => {
      cancelled = true
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [batchId, block.mediaId])

  if (status !== 'ready' || !imageUrl) return (
    <div className={styles.unavailableAsset} role="status">
      {status === 'loading' ? 'Recuperando figura original de la biblioteca privada…'
        : 'No se pudo mostrar esta figura. El documento original permanece guardado para revisión editorial.'}
    </div>
  )
  const alt = /^(Picture\s*\d+|image\d+\.\w+|Imagen)$/i.test(block.text.trim())
    ? 'Figura original del documento; descripción accesible pendiente de revisión'
    : block.text
  return (
    <figure className={styles.originalFigure}>
      <img src={imageUrl} alt={alt}/>
      <figcaption>Figura del Word original · vista privada pendiente de aprobación editorial.</figcaption>
    </figure>
  )
}

function StudyBlock({ block, index, batchId }: { block: AulaBlock, index: number, batchId: string }) {
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
  if (block.kind === 'image') return <OriginalWordFigure block={block} batchId={batchId} />
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
  const [progressState, setProgressState] = useState<'loading' | 'saved' | 'unavailable'>('loading')
  const [progressError, setProgressError] = useState('')
  const [savingProgress, setSavingProgress] = useState(false)
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
        // The private demo progress is tied to the authenticated admin and
        // to this imported batch, never to a student or official grade.
        try {
          const progressResponse = await fetch('/api/academy/import/staging/progress?id=' + encodeURIComponent(id), {
            method: 'GET',
            headers: { Authorization: 'Bearer ' + token },
            cache: 'no-store'
          })
          const progressData = await progressResponse.json().catch(() => ({}))
          if (!progressResponse.ok || !progressData.ok ||
              !Array.isArray(progressData.completed) || progressData.persisted !== true) {
            throw new Error('No se pudo recuperar el avance de prueba.')
          }
          if (!active) return
          setCompleted(progressData.completed)
          setProgressState('saved')
          setProgressError('')
        } catch {
          if (!active) return
          setProgressState('unavailable')
          setProgressError('El contenido puede leerse, pero el guardado del avance no está disponible.')
        }
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

  const sections = useMemo(() => model ? buildAulaUnits(model.sections) : [], [model])
  const section = sections[selected]
  const completedCount = sections.filter(unit => completed.includes(unit.id)).length
  const progress = sections.length ? Math.round(completedCount / sections.length * 100) : 0
  const assessment = useMemo(() => scoreSingleChoice(DEMO_QUIZ, answers), [answers])
  const answered = assessment.completed

  async function markCompleted() {
    if (!section || !model || savingProgress || progressState !== 'saved') return
    if (completed.includes(section.id)) {
      if (selected < sections.length - 1) setSelected(v => v + 1)
      return
    }
    setSavingProgress(true)
    setProgressError('')
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session?.session?.access_token
      if (!token) throw new Error('La sesión del administrador ha caducado.')
      const response = await fetch('/api/academy/import/staging/progress', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: model.id, unit_key: section.id }),
        cache: 'no-store'
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.ok || result.persisted !== true) {
        throw new Error('No se ha guardado la unidad. Vuelve a intentarlo.')
      }
      setCompleted(prev => prev.includes(section.id) ? prev : [...prev, section.id])
      if (selected < sections.length - 1) setSelected(v => v + 1)
    } catch (cause) {
      setProgressError(cause instanceof Error ? cause.message : 'No se ha guardado el avance.')
    } finally {
      setSavingProgress(false)
    }
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
          <h1>Módulo {model.module ?? '—'} <span>{model.title?.trim() || 'Contenido académico en revisión'}</span></h1>
          <p>Lectura interactiva del Word definitivo en el depósito privado, con las actividades de ejemplo separadas de las evaluaciones oficiales.</p>
        </div>
        <div className={styles.heroMetric}>
          <span>Avance de prueba guardado</span>
          <strong>{progress}%</strong>
          <div className={styles.progressTrack}><span style={{ width: progress + '%' }} /></div>
          <small>Solo en el laboratorio privado. No es una calificación académica.</small>
        </div>
      </section>

      <div className={[styles.layout, focus ? styles.focusMode : ''].join(' ')}>
        <aside className={styles.sidebar} aria-label="Unidades de aprendizaje">
          <div className={styles.sidebarTitle}>
            <strong>Itinerario del módulo</strong>
            <small>{completedCount} de {sections.length} unidades completadas</small>
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
                onClick={() => setTab('learn')} aria-pressed={tab === 'learn'}>Estudiar</button>
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
                <p>Unidad de lectura del Word original, dividida por sus encabezados. No se muestra ningún PDF al alumno.</p>
              </div>
              <div className={styles.reading}>
                {section.blocks.map((block, index) => <StudyBlock key={index} block={block} index={index} batchId={model.id} />)}
              </div>
              {model.video_placeholder && selected === 0 && (
                <div className={styles.videoPanel}>
                  <div className={styles.videoIcon}>▶</div>
                  <div><strong>Vídeo explicativo del módulo</strong>
                    <p>El Word contiene un guion audiovisual. El vídeo todavía no se ha producido ni incorporado.</p></div>
                  <span>PENDIENTE</span>
                </div>
              )}
              {progressError && <p role="alert" className={styles.progressError}>{progressError}</p>}
              {progressState === 'loading' && <p className={styles.progressHint}>Recuperando avance de prueba…</p>}
              <div className={styles.lessonBottom}>
                <button type="button" className={styles.secondaryButton} disabled={selected === 0}
                  onClick={() => setSelected(v => Math.max(0, v - 1))}>Anterior</button>
                <button type="button" className={styles.primaryButton}
                  disabled={savingProgress || progressState !== 'saved'}
                  onClick={() => void markCompleted()}>
                  {savingProgress ? 'Guardando…' :
                    completed.includes(section.id) ? 'Continuar' : 'Marcar leído y continuar'}
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
                <p>Tres preguntas ilustrativas. Se muestra el criterio de aprobado del 80 % de GHC, pero esta actividad no registra notas ni desbloquea módulos. Los exámenes oficiales y sus respuestas siguen reservados.</p>
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
                    <p role="status">
                      <strong>{assessment.correct} / {assessment.total} · {assessment.percentage}%</strong>
                      {assessment.passed
                        ? ` Simulación superada (mínimo ${GHC_PASS_PERCENT}%).`
                        : ` Simulación no superada (mínimo ${GHC_PASS_PERCENT}%).`}
                      {' '}No genera nota oficial ni desbloquea módulos.
                    </p>
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
        <p>Prototipo de aula privada. El progreso de lectura se guarda solo en la cuenta administradora de pruebas; no hay matrículas, pagos, notas oficiales ni publicaciones.</p>
        <span>Origen en revisión: {model.source_name}</span>
      </footer>
    </main>
  )
}
