'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

type AnyRecord = Record<string, any>;

type PreviewCertificate = {
  certificate_id: string;
  certificate_code: string;
  verification_slug: string;
  student_name: string;
  course_id: string;
  course_title: string;
  final_score: number;
  issued_at: string;
  status: 'valid';
};

const GREEN = '#63E546';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function CourseDetailPage() {
  const params = useParams();
  const slug = String(params.slug || '');

  const [user, setUser] = useState<any>(null);
  const [course, setCourse] = useState<AnyRecord | null>(null);
  const [modules, setModules] = useState<AnyRecord[]>([]);
  const [lessons, setLessons] = useState<AnyRecord[]>([]);

  const [lessonProgress, setLessonProgress] = useState<AnyRecord[]>([]);
  const [moduleCompletions, setModuleCompletions] = useState<AnyRecord[]>([]);
  const [courseCompletion, setCourseCompletion] = useState<AnyRecord | null>(null);
  const [realCertificate, setRealCertificate] = useState<AnyRecord | null>(null);

  const [previewModuleCompletions, setPreviewModuleCompletions] = useState<AnyRecord[]>([]);
  const [previewCourseCompletion, setPreviewCourseCompletion] = useState<AnyRecord | null>(null);
  const [previewCertificate, setPreviewCertificate] = useState<PreviewCertificate | null>(null);

  const [loading, setLoading] = useState(true);
  const [systemMessage, setSystemMessage] = useState('');

  useEffect(() => {
    async function loadCourseDetail() {
      try {
        setLoading(true);
        setSystemMessage('');

        const { data: userData } = await supabase.auth.getUser();
        const activeUser = userData?.user || null;
        setUser(activeUser);

        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();

        if (courseError || !courseData) {
          setSystemMessage('Este curso no existe o todavía no está disponible.');
          setLoading(false);
          return;
        }

        setCourse(courseData);

        if (!activeUser?.id) {
          loadPreviewModuleCompletions(courseData.id);
          loadPreviewCourseCompletion(courseData.id);
          loadPreviewCertificate(courseData.id);
        } else {
          setPreviewModuleCompletions([]);
          setPreviewCourseCompletion(null);
          setPreviewCertificate(null);
        }

        const { data: modulesData, error: modulesError } = await supabase
          .from('modules')
          .select('*')
          .eq('course_id', courseData.id);

        if (modulesError) {
          console.error('Error cargando módulos:', modulesError);
          setSystemMessage('Curso cargado, pero no se pudieron cargar los módulos.');
          setModules([]);
          setLessons([]);
          setLoading(false);
          return;
        }

        const orderedModules = Array.isArray(modulesData)
          ? [...modulesData].sort(sortModules)
          : [];

        setModules(orderedModules);

        if (orderedModules.length === 0) {
          setSystemMessage(
            'Curso cargado correctamente, pero todavía no se han encontrado módulos asociados.'
          );
          setLessons([]);
          setLoading(false);
          return;
        }

        const moduleIds = orderedModules.map((module) => module.id);

        const { data: lessonsData, error: lessonsError } = await supabase
          .from('lessons')
          .select('*')
          .in('module_id', moduleIds);

        if (lessonsError) {
          console.error('Error cargando lecciones:', lessonsError);
          setSystemMessage('Curso cargado, pero no se pudieron cargar las lecciones.');
          setLessons([]);
        } else {
          const orderedLessons = Array.isArray(lessonsData)
            ? [...lessonsData].sort(sortLessons)
            : [];

          setLessons(orderedLessons);
        }

        if (activeUser?.id) {
          const { data: progressData } = await supabase
            .from('lesson_progress')
            .select('*')
            .eq('user_id', activeUser.id)
            .eq('course_id', courseData.id)
            .eq('completed', true);

          setLessonProgress(Array.isArray(progressData) ? progressData : []);

          const { data: moduleCompletionData } = await supabase
            .from('module_completions')
            .select('*')
            .eq('user_id', activeUser.id)
            .eq('course_id', courseData.id)
            .eq('completed', true);

          setModuleCompletions(
            Array.isArray(moduleCompletionData) ? moduleCompletionData : []
          );

          const { data: courseCompletionData } = await supabase
            .from('course_completions')
            .select('*')
            .eq('user_id', activeUser.id)
            .eq('course_id', courseData.id)
            .maybeSingle();

          setCourseCompletion(courseCompletionData || null);

          const { data: certificateData } = await supabase
            .from('certificates')
            .select('*')
            .eq('user_id', activeUser.id)
            .eq('course_id', courseData.id)
            .eq('status', 'valid')
            .maybeSingle();

          setRealCertificate(certificateData || null);
        }
      } catch (error) {
        console.error('Error cargando detalle del curso:', error);
        setSystemMessage('Error cargando el contenido del curso.');
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      loadCourseDetail();
    }
  }, [slug]);

  function loadPreviewModuleCompletions(courseId: string) {
    try {
      if (typeof window === 'undefined') return;

      const storageKey = `ghc_preview_module_completions_${courseId}`;
      const raw = window.localStorage.getItem(storageKey);

      if (!raw) {
        setPreviewModuleCompletions([]);
        return;
      }

      const parsed = JSON.parse(raw);
      const records = Object.values(parsed || {}) as AnyRecord[];

      setPreviewModuleCompletions(records.filter((item) => item?.completed));
    } catch (error) {
      console.error('Error leyendo preview module completions:', error);
      setPreviewModuleCompletions([]);
    }
  }

  function loadPreviewCourseCompletion(courseId: string) {
    try {
      if (typeof window === 'undefined') return;

      const storageKey = `ghc_preview_course_completion_${courseId}`;
      const raw = window.localStorage.getItem(storageKey);

      if (!raw) {
        setPreviewCourseCompletion(null);
        return;
      }

      const parsed = JSON.parse(raw);

      if (parsed?.completed) {
        setPreviewCourseCompletion(parsed);
        return;
      }

      setPreviewCourseCompletion(null);
    } catch (error) {
      console.error('Error leyendo preview course completion:', error);
      setPreviewCourseCompletion(null);
    }
  }

  function loadPreviewCertificate(courseId: string) {
    try {
      if (typeof window === 'undefined') return;

      const storageKey = `ghc_preview_certificate_${courseId}`;
      const raw = window.localStorage.getItem(storageKey);

      if (!raw) {
        setPreviewCertificate(null);
        return;
      }

      const parsed = JSON.parse(raw);

      if (parsed?.certificate_id && parsed?.status === 'valid') {
        setPreviewCertificate(parsed);
        return;
      }

      setPreviewCertificate(null);
    } catch (error) {
      console.error('Error leyendo preview certificate:', error);
      setPreviewCertificate(null);
    }
  }

  const effectiveModuleCompletions = useMemo(() => {
    if (user?.id) return moduleCompletions;

    const byModuleId = new Map<string, AnyRecord>();

    previewModuleCompletions.forEach((item) => {
      if (item?.module_id) {
        byModuleId.set(String(item.module_id), item);
      }
    });

    return Array.from(byModuleId.values());
  }, [user, moduleCompletions, previewModuleCompletions]);

  const effectiveCourseCompletion = user?.id
    ? courseCompletion
    : previewCourseCompletion;

  const effectiveCertificate = user?.id
    ? realCertificate
    : previewCertificate;

  const completedLessonIds = useMemo(() => {
    return new Set(lessonProgress.map((item) => String(item.lesson_id)));
  }, [lessonProgress]);

  const completedModuleIds = useMemo(() => {
    return new Set(effectiveModuleCompletions.map((item) => String(item.module_id)));
  }, [effectiveModuleCompletions]);

  const totalLessons = lessons.length;
  const completedLessons = lessonProgress.length;

  const lessonProgressPercent =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const isCourseCompleted = Boolean(effectiveCourseCompletion?.completed);

  const allModulesCompleted =
    modules.length > 0 &&
    modules.every((module) => completedModuleIds.has(String(module.id)));

  const completedModulesCount = modules.filter((module) =>
    completedModuleIds.has(String(module.id))
  ).length;

  const finalExamUnlocked = allModulesCompleted && !isCourseCompleted;
  const certificateAvailable = isCourseCompleted;

  const firstAvailableLesson = useMemo(() => {
    for (let moduleIndex = 0; moduleIndex < modules.length; moduleIndex += 1) {
      const module = modules[moduleIndex];
      const unlocked = isModuleUnlocked(module, moduleIndex);
      if (!unlocked) continue;

      const moduleLessons = getModuleLessons(String(module.id));
      const pending = moduleLessons.find((lesson) => !completedLessonIds.has(String(lesson.id)));

      if (pending) return pending;
      if (moduleLessons[0]) return moduleLessons[0];
    }

    return lessons[0] || null;
  }, [modules, lessons, completedLessonIds, completedModuleIds, isCourseCompleted]);

  function getModuleLessons(moduleId: string) {
    return lessons
      .filter((lesson) => String(lesson.module_id) === String(moduleId))
      .sort(sortLessons);
  }

  function isModuleUnlocked(module: AnyRecord, index: number) {
    if (index === 0) return true;
    if (isCourseCompleted) return true;
    if (completedModuleIds.has(String(module.id))) return true;

    const previousModule = modules[index - 1];

    if (!previousModule) return false;

    return completedModuleIds.has(String(previousModule.id));
  }

  async function issueCertificate() {
    if (!course || !effectiveCourseCompletion?.completed) return;

    if (!user?.id) {
      issuePreviewCertificate();
      return;
    }

    const existing = realCertificate;

    if (existing) return;

    const code = generateCertificateCode(course.title);
    const certificateId = crypto.randomUUID();
    const verificationSlug = `${code.toLowerCase()}-${certificateId.slice(0, 8)}`;

    const { data, error } = await supabase
      .from('certificates')
      .insert({
        user_id: user.id,
        course_id: course.id,
        course_completion_id: courseCompletion?.id || null,
        student_name:
          user?.user_metadata?.full_name || user?.email || 'Alumno GHC Academy',
        course_title: String(course.title || 'Curso GHC Academy'),
        final_score: Number(effectiveCourseCompletion.final_score || 100),
        certificate_code: code,
        verification_slug: verificationSlug,
        status: 'valid',
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error emitiendo certificado real:', error);
      alert('No se pudo emitir el certificado real. Revisa Supabase.');
      return;
    }

    setRealCertificate(data);
  }

  function issuePreviewCertificate() {
    if (!course || !effectiveCourseCompletion?.completed) return;

    const now = new Date();
    const certificateId = crypto.randomUUID();
    const code = generateCertificateCode(course.title);
    const verificationSlug = `${code.toLowerCase()}-${certificateId.slice(0, 8)}`;

    const certificate: PreviewCertificate = {
      certificate_id: certificateId,
      certificate_code: code,
      verification_slug: verificationSlug,
      student_name: 'Alumno GHC Academy',
      course_id: String(course.id),
      course_title: String(course.title || 'Curso GHC Academy'),
      final_score: Number(effectiveCourseCompletion.final_score || 100),
      issued_at: now.toISOString(),
      status: 'valid',
    };

    window.localStorage.setItem(
      `ghc_preview_certificate_${course.id}`,
      JSON.stringify(certificate)
    );

    setPreviewCertificate(certificate);
  }

  if (loading) {
    return (
      <main className="ghc-course-page loading">
        <Background />
        <section className="loading-card">
          <p>GHC Academy</p>
          <h1>Cargando curso</h1>
          <span>Preparando módulos, lecciones y progreso del alumno.</span>
        </section>
        <GlobalStyles />
      </main>
    );
  }

  if (!course) {
    return (
      <main className="ghc-course-page loading">
        <Background />
        <section className="loading-card">
          <Link href="/cursos" className="ghost-pill">← Volver al catálogo</Link>
          <p>Curso no disponible</p>
          <h1>Curso no encontrado</h1>
          <span>{systemMessage}</span>
        </section>
        <GlobalStyles />
      </main>
    );
  }

  const certificateLink = effectiveCertificate
    ? `/certificados/${effectiveCertificate.verification_slug}`
    : '';

  const continueHref = firstAvailableLesson
    ? `/cursos/${slug}/${firstAvailableLesson.id}`
    : `/cursos/${slug}`;

  const levelLabel = course.level || 'Nivel GHC';
  const typeLabel = course.course_type || course.type || 'Curso';
  const durationLabel = Number(course.duration_minutes || 0) > 0
    ? `${Number(course.duration_minutes || 0)} min`
    : 'A tu ritmo';

  return (
    <main className="ghc-course-page">
      <Background />

      <section className="course-shell">
        <header className="course-topbar">
          <div className="breadcrumb">
            <Link href="/alumno">Panel alumno</Link>
            <span>›</span>
            <Link href="/cursos">Cursos</Link>
            <span>›</span>
            <strong>{course.title || 'Curso GHC'}</strong>
          </div>

          <div className="top-actions">
            <Link href="/alumno" className="ghost-pill">Área alumno</Link>
            <Link href="/cursos" className="ghost-pill">Catálogo</Link>
          </div>
        </header>

        {systemMessage && <div className="notice">{systemMessage}</div>}

        <section className="course-hero-card">
          <div className="hero-copy">
            <p className="kicker">GHC Academy · contenido del curso</p>

            <div className="badge-row">
              <span>{typeLabel}</span>
              <span>{levelLabel}</span>
              {isCourseCompleted && <span className="success">Curso completado</span>}
              {effectiveCertificate && <span className="gold">Certificado emitido</span>}
              {finalExamUnlocked && <span className="success">Evaluación final · próximamente</span>}
            </div>

            <h1>{course.title}</h1>

            {course.subtitle ? <h2>{course.subtitle}</h2> : null}

            <p className="hero-text">
              {course.description ||
                'Formación premium basada en ciencia aplicada, estructura y rendimiento.'}
            </p>

            <div className="hero-actions">
              <Link href={continueHref} className="primary-action">
                Continuar formación
              </Link>
              <a href="#modulos" className="secondary-action">
                Ver módulos
              </a>
            </div>
          </div>

          <aside className="course-summary-card">
            <p className="kicker">Resumen</p>

            <div className="summary-price">
              <span>Precio</span>
              <strong>{Number(course.price || 0).toLocaleString('es-ES')}€</strong>
            </div>

            <div className="summary-grid">
              <Metric label="Duración" value={durationLabel} />
              <Metric label="Lecciones" value={totalLessons} />
              <Metric label="Módulos" value={modules.length} />
              <Metric label="Certificado" value={effectiveCertificate ? 'Emitido' : course.has_certificate ? 'Sí' : 'No'} />
            </div>

            <button type="button" className="access-button">
              {user ? 'Acceso activo' : 'Solicitar acceso'}
            </button>
          </aside>
        </section>

        <section className="status-grid">
          <article className="status-card">
            <div>
              <p className="kicker">Estado del curso</p>
              <h3>{isCourseCompleted ? 'Curso completado' : 'Curso en progreso'}</h3>
              <p>
                {isCourseCompleted
                  ? 'El curso consta como completado. El siguiente bloque es la certificación digital.'
                  : 'Avanza por los módulos y lecciones. La evaluación final queda preparada para la siguiente fase del sistema.'}
              </p>
            </div>

            {!user && (
              <div className="preview-note">
                Vista previa activa. Al iniciar sesión, el progreso real se guardará desde Supabase.
              </div>
            )}
          </article>

          <article className="progress-card">
            <div className="progress-head">
              <div>
                <p className="kicker">Progreso</p>
                <h3>{lessonProgressPercent}%</h3>
              </div>
              <span>{completedLessons}/{totalLessons}</span>
            </div>

            <div className="progress-track">
              <div style={{ width: `${lessonProgressPercent}%` }} />
            </div>

            <p>{completedModulesCount} de {modules.length} módulos aprobados.</p>
          </article>
        </section>

        <section className={finalExamUnlocked || isCourseCompleted ? 'phase-card active' : 'phase-card'}>
          <div>
            <p className="kicker">
              {isCourseCompleted
                ? 'Cierre académico'
                : finalExamUnlocked
                  ? 'Evaluación final preparada'
                  : 'Evaluación final bloqueada'}
            </p>

            <h3>
              {isCourseCompleted
                ? 'Curso completado'
                : finalExamUnlocked
                  ? 'Evaluación final lista para la siguiente fase'
                  : 'Completa los módulos para preparar la evaluación final'}
            </h3>

            <p>
              {isCourseCompleted
                ? 'El curso ya está cerrado académicamente. La certificación puede emitirse si está disponible.'
                : finalExamUnlocked
                  ? 'Has completado los módulos. El motor de evaluaciones se activará más adelante para cerrar esta fase.'
                  : `Has aprobado ${completedModulesCount} de ${modules.length} módulos.`}
            </p>
          </div>

          <div className="phase-status">
            <span>Estado</span>
            <strong>{isCourseCompleted ? 'Completado' : finalExamUnlocked ? 'Próximamente' : 'Bloqueado'}</strong>
          </div>
        </section>

        <section className={certificateAvailable || effectiveCertificate ? 'certificate-card active' : 'certificate-card'}>
          <div>
            <p className="kicker">{certificateAvailable ? 'Certificación digital' : 'Certificación bloqueada'}</p>

            <h3>
              {effectiveCertificate
                ? 'Certificado digital emitido'
                : certificateAvailable
                  ? 'Certificado digital disponible'
                  : 'Completa el curso para desbloquear el certificado'}
            </h3>

            <p>
              {effectiveCertificate
                ? `Certificado ${effectiveCertificate.certificate_code} emitido para ${effectiveCertificate.student_name}.`
                : certificateAvailable
                  ? 'Puedes emitir tu certificado digital. Quedará asociado al curso y al alumno.'
                  : 'El certificado solo estará disponible cuando el curso esté completado.'}
            </p>
          </div>

          {effectiveCertificate ? (
            <div className="certificate-actions">
              <Link href={certificateLink} className="primary-action">
                Ver certificado
              </Link>
              <div className="phase-status">
                <span>Estado</span>
                <strong>Válido</strong>
              </div>
            </div>
          ) : certificateAvailable ? (
            <button type="button" onClick={issueCertificate} className="primary-action as-button">
              {user?.id ? 'Emitir certificado' : 'Emitir certificado de prueba'}
            </button>
          ) : (
            <div className="phase-status">
              <span>Estado</span>
              <strong>Bloqueado</strong>
            </div>
          )}
        </section>

        <section id="modulos" className="modules-section">
          <div className="section-head">
            <div>
              <p className="kicker">Contenido académico</p>
              <h3>Módulos y lecciones</h3>
            </div>
            <span>{modules.length} módulos · {totalLessons} lecciones</span>
          </div>

          <div className="modules-list">
            {modules.map((module, index) => {
              const moduleLessons = getModuleLessons(String(module.id));
              const unlocked = isModuleUnlocked(module, index);
              const moduleCompleted = completedModuleIds.has(String(module.id));

              const completionRecord = effectiveModuleCompletions.find(
                (item) => String(item.module_id) === String(module.id)
              );

              const completedInModule = moduleLessons.filter((lesson) =>
                completedLessonIds.has(String(lesson.id))
              ).length;

              const modulePercent =
                moduleLessons.length > 0
                  ? Math.round((completedInModule / moduleLessons.length) * 100)
                  : 0;

              return (
                <article
                  key={module.id}
                  className={[
                    'module-card',
                    moduleCompleted ? 'completed' : '',
                    !unlocked ? 'locked' : '',
                  ].filter(Boolean).join(' ')}
                >
                  <div className="module-top">
                    <div>
                      <p className="module-number">Módulo {index + 1}</p>
                      <h4>{module.title || `Módulo ${index + 1}`}</h4>
                      <p>
                        {module.description || 'Módulo formativo de GHC Academy.'}
                      </p>

                      <div className="module-progress-line">
                        <div style={{ width: `${modulePercent}%` }} />
                      </div>

                      <span className="module-progress-text">
                        {completedInModule} de {moduleLessons.length} lecciones completadas
                      </span>

                      {moduleCompleted && (
                        <span className="module-score">
                          Módulo aprobado · Nota: {completionRecord?.final_score || 0}%
                          {!user ? ' · Preview' : ''}
                        </span>
                      )}
                    </div>

                    <span className={moduleCompleted ? 'state-pill success' : unlocked ? 'state-pill' : 'state-pill muted'}>
                      {moduleCompleted ? 'Completado' : unlocked ? 'Disponible' : 'Bloqueado'}
                    </span>
                  </div>

                  <div className="lessons-list">
                    {moduleLessons.length === 0 && (
                      <div className="lesson-row">
                        <div>
                          <strong>Lecciones pendientes de crear</strong>
                          <span>Este módulo todavía no tiene contenido visible.</span>
                        </div>
                        <em>—</em>
                      </div>
                    )}

                    {moduleLessons.map((lesson) => {
                      const lessonCompleted = completedLessonIds.has(String(lesson.id));
                      const lessonType = getLessonTypeLabel(lesson);

                      return (
                        <div key={lesson.id} className={lessonCompleted ? 'lesson-row completed' : 'lesson-row'}>
                          <div>
                            <strong>
                              {lessonCompleted ? '✓ ' : ''}
                              {lesson.title || 'Lección GHC'}
                            </strong>
                            <span>{lessonType}</span>
                          </div>

                          {unlocked ? (
                            <Link href={`/cursos/${slug}/${lesson.id}`}>
                              Abrir
                            </Link>
                          ) : (
                            <em>Bloqueado</em>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </section>

      <GlobalStyles />
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Background() {
  return (
    <div className="background" aria-hidden="true">
      <div className="orb orb-one" />
      <div className="orb orb-two" />
      <div className="grid-texture" />
    </div>
  );
}

function generateCertificateCode(courseTitle: string) {
  const prefix = String(courseTitle || 'GHC')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 6)
    .toUpperCase()
    .padEnd(6, 'G');

  const random = Math.random().toString(36).slice(2, 8).toUpperCase();

  return `GHC-${prefix}-${random}`;
}

function getOrder(item: AnyRecord, fallback: number) {
  return item.position ?? item.sort_order ?? item.order_index ?? item.order ?? fallback;
}

function sortModules(a: AnyRecord, b: AnyRecord) {
  const aNumber = extractModuleNumber(a.title);
  const bNumber = extractModuleNumber(b.title);

  if (aNumber !== bNumber) return aNumber - bNumber;

  return Number(getOrder(a, 999)) - Number(getOrder(b, 999));
}

function sortLessons(a: AnyRecord, b: AnyRecord) {
  const aNumber = extractLessonNumber(a.title);
  const bNumber = extractLessonNumber(b.title);

  if (aNumber !== bNumber) return aNumber - bNumber;

  return Number(getOrder(a, 999)) - Number(getOrder(b, 999));
}

function extractLessonNumber(title: string = '') {
  const match = title.match(/lecci[oó]n\s*(\d+)/i);
  return match ? Number(match[1]) : 999;
}

function extractModuleNumber(title: string = '') {
  const match = title.match(/m[oó]dulo\s*(\d+)/i);
  return match ? Number(match[1]) : 999;
}

function getLessonTypeLabel(lesson: AnyRecord) {
  const rawType = String(
    lesson.type ||
      lesson.content_type ||
      lesson.lesson_type ||
      ''
  ).toLowerCase();

  const allValues = [
    lesson.content,
    lesson.video_url,
    lesson.audio_url,
    lesson.pdf_url,
    lesson.file_url,
    lesson.url,
    lesson.media_url,
    lesson.content_url,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const hasVideo = rawType.includes('video') || /\.(mp4|webm|mov|m4v)/i.test(allValues);
  const hasAudio = rawType.includes('audio') || /\.(mp3|wav|m4a|ogg)/i.test(allValues);
  const hasPdf = rawType.includes('pdf') || /\.pdf/i.test(allValues);
  const isMixed = rawType.includes('mixed') || rawType.includes('mixto');

  if (isMixed || [hasVideo, hasAudio, hasPdf].filter(Boolean).length >= 2) return 'Mixto';
  if (hasVideo) return 'Vídeo';
  if (hasAudio) return 'Audio';
  if (hasPdf) return 'PDF';

  return 'Texto';
}

function GlobalStyles() {
  return (
    <style jsx global>{`
      :root {
        --green: ${GREEN};
        --green-rgb: 99, 229, 70;
        --bg: #050706;
        --panel: rgba(8, 12, 10, .92);
        --white: #f4f6f2;
        --muted: rgba(244,246,242,.62);
        --soft: rgba(244,246,242,.44);
        --gold: #d6b25e;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        background: var(--bg);
      }

      body {
        color: var(--white);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      a {
        color: inherit;
      }

      button {
        font: inherit;
      }

      .ghc-course-page {
        min-height: 100vh;
        position: relative;
        overflow-x: hidden;
        background:
          radial-gradient(circle at 12% -10%, rgba(var(--green-rgb), .075), transparent 32%),
          radial-gradient(circle at 96% 8%, rgba(255,255,255,.035), transparent 28%),
          linear-gradient(135deg, #050706 0%, #070a09 46%, #030404 100%);
        color: var(--white);
      }

      .background {
        position: fixed;
        inset: 0;
        pointer-events: none;
        overflow: hidden;
        z-index: 0;
      }

      .orb {
        position: absolute;
        border-radius: 999px;
        filter: blur(100px);
      }

      .orb-one {
        width: 520px;
        height: 520px;
        top: -220px;
        left: -180px;
        background: rgba(var(--green-rgb), .10);
      }

      .orb-two {
        width: 520px;
        height: 520px;
        right: -260px;
        top: 110px;
        background: rgba(120,135,130,.09);
      }

      .grid-texture {
        position: absolute;
        inset: 0;
        background-image:
          linear-gradient(rgba(255,255,255,.022) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,.022) 1px, transparent 1px);
        background-size: 42px 42px;
        opacity: .42;
        mask-image: radial-gradient(circle at center, black 0%, transparent 82%);
      }

      .course-shell {
        width: min(1360px, calc(100vw - 42px));
        margin: 0 auto;
        padding: 22px 0 44px;
        position: relative;
        z-index: 1;
        display: grid;
        gap: 18px;
      }

      .course-topbar {
        min-height: 62px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        border-bottom: 1px solid rgba(255,255,255,.07);
        padding-bottom: 12px;
      }

      .breadcrumb {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        color: rgba(244,246,242,.62);
        font-size: 12px;
        font-weight: 850;
      }

      .breadcrumb a {
        text-decoration: none;
        color: rgba(244,246,242,.62);
      }

      .breadcrumb strong {
        color: var(--white);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .top-actions,
      .hero-actions,
      .certificate-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        align-items: center;
      }

      .ghost-pill,
      .secondary-action {
        min-height: 40px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.035);
        color: rgba(244,246,242,.78);
        padding: 0 15px;
        text-decoration: none;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: .08em;
        text-transform: uppercase;
      }

      .primary-action,
      .access-button {
        min-height: 42px;
        border-radius: 999px;
        border: 1px solid rgba(var(--green-rgb), .30);
        background: linear-gradient(135deg, var(--green), #7bee65);
        color: #061008;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 0 18px;
        text-decoration: none;
        font-size: 12px;
        font-weight: 950;
        letter-spacing: .08em;
        text-transform: uppercase;
        box-shadow: 0 0 30px rgba(var(--green-rgb), .14);
        cursor: pointer;
      }

      .primary-action.as-button {
        border: 1px solid rgba(var(--green-rgb), .30);
      }

      .course-hero-card,
      .status-card,
      .progress-card,
      .phase-card,
      .certificate-card,
      .module-card,
      .loading-card {
        border-radius: 22px;
        border: 1px solid rgba(255,255,255,.085);
        background:
          radial-gradient(circle at top right, rgba(var(--green-rgb), .055), transparent 34%),
          linear-gradient(145deg, rgba(255,255,255,.052), rgba(255,255,255,.018)),
          rgba(8,12,10,.92);
        box-shadow: 0 24px 82px rgba(0,0,0,.22);
      }

      .course-hero-card {
        display: grid;
        grid-template-columns: minmax(0, 1.24fr) minmax(310px, .56fr);
        gap: 18px;
        padding: clamp(22px, 3vw, 34px);
        align-items: stretch;
      }

      .hero-copy {
        min-width: 0;
        display: grid;
        align-content: center;
      }

      .kicker,
      .module-number {
        margin: 0;
        color: var(--green);
        text-transform: uppercase;
        letter-spacing: .16em;
        font-size: 10px;
        font-weight: 950;
      }

      .badge-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin: 14px 0 18px;
      }

      .badge-row span,
      .state-pill {
        min-height: 28px;
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,.11);
        background: rgba(255,255,255,.035);
        color: rgba(244,246,242,.74);
        padding: 0 10px;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: .11em;
        text-transform: uppercase;
      }

      .badge-row .success,
      .state-pill.success,
      .state-pill:not(.muted) {
        border-color: rgba(var(--green-rgb), .24);
        background: rgba(var(--green-rgb), .085);
        color: var(--green);
      }

      .badge-row .gold {
        border-color: rgba(214,178,94,.28);
        background: rgba(214,178,94,.08);
        color: var(--gold);
      }

      .hero-copy h1 {
        margin: 0;
        max-width: 880px;
        color: var(--white);
        font-size: clamp(34px, 4vw, 56px);
        line-height: .96;
        letter-spacing: -.055em;
        font-weight: 950;
      }

      .hero-copy h2 {
        margin: 18px 0 0;
        max-width: 740px;
        color: rgba(244,246,242,.88);
        font-size: clamp(18px, 2vw, 25px);
        line-height: 1.25;
        letter-spacing: -.035em;
        font-weight: 850;
      }

      .hero-text,
      .status-card p,
      .phase-card p,
      .certificate-card p,
      .module-card p {
        color: var(--muted);
        line-height: 1.65;
        font-size: 14px;
      }

      .hero-text {
        max-width: 780px;
        margin: 16px 0 0;
      }

      .hero-actions {
        margin-top: 24px;
      }

      .course-summary-card {
        border-radius: 20px;
        border: 1px solid rgba(255,255,255,.085);
        background:
          radial-gradient(circle at top right, rgba(var(--green-rgb), .08), transparent 34%),
          rgba(5,7,6,.52);
        padding: 20px;
        display: grid;
        align-content: space-between;
        gap: 16px;
      }

      .summary-price span,
      .metric span,
      .phase-status span {
        display: block;
        color: rgba(244,246,242,.48);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: .14em;
        font-weight: 900;
      }

      .summary-price strong {
        display: block;
        margin-top: 8px;
        color: var(--white);
        font-size: 42px;
        line-height: 1;
        letter-spacing: -.055em;
        font-weight: 950;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      .metric,
      .phase-status,
      .preview-note {
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,.075);
        background: rgba(255,255,255,.026);
        padding: 12px;
      }

      .metric strong,
      .phase-status strong {
        display: block;
        margin-top: 6px;
        color: var(--white);
        font-size: 16px;
        line-height: 1.05;
        font-weight: 900;
      }

      .status-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.2fr) minmax(310px, .65fr);
        gap: 18px;
      }

      .status-card,
      .progress-card,
      .phase-card,
      .certificate-card {
        padding: 22px;
      }

      .status-card h3,
      .progress-card h3,
      .phase-card h3,
      .certificate-card h3,
      .section-head h3 {
        margin: 8px 0 0;
        color: var(--white);
        font-size: clamp(22px, 2.4vw, 32px);
        line-height: 1;
        letter-spacing: -.045em;
        font-weight: 950;
      }

      .preview-note {
        margin-top: 14px;
        color: rgba(244,246,242,.68);
        line-height: 1.5;
        font-size: 13px;
      }

      .progress-head {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        align-items: flex-start;
      }

      .progress-head span {
        border-radius: 999px;
        border: 1px solid rgba(var(--green-rgb), .22);
        background: rgba(var(--green-rgb), .07);
        color: var(--green);
        padding: 8px 10px;
        font-size: 12px;
        font-weight: 950;
      }

      .progress-track,
      .module-progress-line {
        height: 9px;
        overflow: hidden;
        border-radius: 999px;
        background: rgba(255,255,255,.075);
      }

      .progress-track {
        margin: 16px 0 12px;
      }

      .progress-track div,
      .module-progress-line div {
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, var(--green), #7bee65);
        box-shadow: 0 0 22px rgba(var(--green-rgb), .26);
      }

      .phase-card,
      .certificate-card {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(220px, 320px);
        gap: 18px;
        align-items: center;
      }

      .phase-card.active,
      .certificate-card.active {
        border-color: rgba(var(--green-rgb), .22);
        background:
          radial-gradient(circle at top right, rgba(var(--green-rgb), .11), transparent 34%),
          linear-gradient(145deg, rgba(var(--green-rgb), .05), rgba(255,255,255,.018)),
          rgba(8,12,10,.94);
      }

      .certificate-card.active {
        border-color: rgba(214,178,94,.24);
        background:
          radial-gradient(circle at top right, rgba(214,178,94,.10), transparent 34%),
          linear-gradient(145deg, rgba(255,255,255,.052), rgba(255,255,255,.018)),
          rgba(8,12,10,.94);
      }

      .modules-section {
        display: grid;
        gap: 16px;
        margin-top: 4px;
      }

      .section-head {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 18px;
        padding: 0 2px;
      }

      .section-head > span {
        color: rgba(244,246,242,.48);
        font-size: 11px;
        font-weight: 900;
        letter-spacing: .12em;
        text-transform: uppercase;
      }

      .modules-list {
        display: grid;
        gap: 14px;
      }

      .module-card {
        padding: 20px;
      }

      .module-card.completed {
        border-color: rgba(var(--green-rgb), .24);
        background:
          radial-gradient(circle at top right, rgba(var(--green-rgb), .12), transparent 34%),
          linear-gradient(145deg, rgba(var(--green-rgb), .05), rgba(255,255,255,.018)),
          rgba(8,12,10,.94);
      }

      .module-card.locked {
        opacity: .52;
      }

      .module-top {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 18px;
        align-items: start;
      }

      .module-card h4 {
        margin: 8px 0 8px;
        color: var(--white);
        font-size: clamp(22px, 2vw, 30px);
        line-height: 1;
        letter-spacing: -.04em;
        font-weight: 950;
      }

      .module-progress-line {
        margin: 14px 0 9px;
      }

      .module-progress-text,
      .module-score {
        display: block;
        color: var(--green);
        font-size: 11px;
        font-weight: 900;
        letter-spacing: .09em;
        text-transform: uppercase;
      }

      .module-score {
        margin-top: 8px;
        color: rgba(244,246,242,.72);
      }

      .lessons-list {
        display: grid;
        gap: 8px;
        margin-top: 16px;
      }

      .lesson-row {
        min-height: 58px;
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,.075);
        background: rgba(255,255,255,.026);
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 14px;
        align-items: center;
        padding: 12px 14px;
      }

      .lesson-row.completed {
        border-color: rgba(var(--green-rgb), .18);
        background: rgba(var(--green-rgb), .045);
      }

      .lesson-row strong {
        display: block;
        color: rgba(244,246,242,.88);
        font-size: 14px;
        line-height: 1.25;
        font-weight: 850;
      }

      .lesson-row span {
        display: inline-flex;
        width: fit-content;
        margin-top: 6px;
        border-radius: 999px;
        border: 1px solid rgba(var(--green-rgb), .18);
        background: rgba(var(--green-rgb), .055);
        color: var(--green);
        padding: 4px 8px;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: .10em;
        text-transform: uppercase;
      }

      .lesson-row a {
        min-height: 34px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        border: 1px solid rgba(var(--green-rgb), .20);
        background: rgba(var(--green-rgb), .06);
        color: var(--green);
        padding: 0 12px;
        text-decoration: none;
        font-size: 12px;
        font-weight: 950;
      }

      .lesson-row em {
        color: rgba(244,246,242,.42);
        font-style: normal;
        font-size: 12px;
        font-weight: 850;
      }

      .notice {
        border-radius: 18px;
        border: 1px solid rgba(var(--green-rgb), .18);
        background: linear-gradient(90deg, rgba(var(--green-rgb),.06), rgba(255,255,255,.022));
        color: rgba(244,246,242,.72);
        padding: 14px 16px;
      }

      .loading {
        display: grid;
        place-items: center;
      }

      .loading-card {
        position: relative;
        z-index: 1;
        width: min(720px, calc(100vw - 40px));
        padding: 34px;
      }

      .loading-card p {
        color: var(--green);
        text-transform: uppercase;
        letter-spacing: .16em;
        font-size: 10px;
        font-weight: 950;
      }

      .loading-card h1 {
        margin: 10px 0;
        font-size: clamp(34px, 5vw, 58px);
        line-height: .95;
        letter-spacing: -.06em;
      }

      .loading-card span {
        color: var(--muted);
        line-height: 1.6;
      }

      @media (max-width: 1040px) {
        .course-hero-card,
        .status-grid,
        .phase-card,
        .certificate-card {
          grid-template-columns: 1fr;
        }

        .course-summary-card,
        .phase-status {
          max-width: none;
        }
      }

      @media (max-width: 720px) {
        .course-shell {
          width: min(100% - 28px, 1360px);
          padding-top: 16px;
        }

        .course-topbar,
        .section-head,
        .module-top {
          align-items: flex-start;
          flex-direction: column;
        }

        .breadcrumb {
          flex-wrap: wrap;
        }

        .top-actions {
          width: 100%;
        }

        .ghost-pill,
        .primary-action,
        .secondary-action,
        .access-button {
          width: 100%;
        }

        .hero-copy h1 {
          font-size: clamp(32px, 12vw, 44px);
        }

        .summary-grid {
          grid-template-columns: 1fr;
        }

        .lesson-row {
          grid-template-columns: 1fr;
        }

        .lesson-row a {
          width: 100%;
        }
      }
    `}</style>
  );
}
