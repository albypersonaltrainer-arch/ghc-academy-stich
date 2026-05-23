'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
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

const neon = '#63E546';

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

  const getModuleLessons = (moduleId: string) => {
    return lessons
      .filter((lesson) => String(lesson.module_id) === String(moduleId))
      .sort(sortLessons);
  };

  const isModuleUnlocked = (module: AnyRecord, index: number) => {
    if (index === 0) return true;
    if (isCourseCompleted) return true;
    if (completedModuleIds.has(String(module.id))) return true;

    const previousModule = modules[index - 1];

    if (!previousModule) return false;

    return completedModuleIds.has(String(previousModule.id));
  };

  if (loading) {
    return (
      <main className="course-detail-approved-page" style={pageStyle}>
        <div style={containerStyle}>
          <p style={loadingText}>Cargando contenido académico...</p>
        </div>
      </main>
    );
  }

  if (!course) {
    return (
      <main className="course-detail-approved-page" style={pageStyle}>
        <div style={containerStyle}>
          <Link href="/cursos" style={backButton}>
            ← Volver al catálogo
          </Link>

          <h1 style={titleStyle}>Curso no encontrado</h1>
          <p style={textStyle}>{systemMessage}</p>
        </div>
      </main>
    );
  }

  const certificateLink = effectiveCertificate
    ? `/certificados/${effectiveCertificate.verification_slug}`
    : '';

  return (
    <main className="course-detail-approved-page" style={pageStyle}>
      <div style={containerStyle}>
        <Link href="/cursos" style={backButton}>
          ← Volver al catálogo
        </Link>

        <section style={heroStyle}>
          <div>
            <p style={eyebrowStyle}>GHC Academy · contenido del curso</p>

            <div style={badgeRow}>
              {course.course_type && <span style={badgeMain}>{course.course_type}</span>}
              {course.level && <span style={badgeSecondary}>{course.level}</span>}

              {isCourseCompleted && (
                <span style={completedBadge}>
                  {!user?.id ? 'Curso completado · Preview' : 'Curso completado oficialmente'}
                </span>
              )}

              {finalExamUnlocked && (
                <span style={finalUnlockedBadge}>Evaluación final · próximamente</span>
              )}

              {effectiveCertificate && (
                <span style={certificateBadge}>
                  {!user?.id ? 'Certificado emitido · Preview' : 'Certificado emitido'}
                </span>
              )}
            </div>

            <h1 style={titleStyle}>{course.title}</h1>

            {course.subtitle && <p style={subtitleStyle}>{course.subtitle}</p>}

            <p style={textStyle}>
              {course.description || 'Formación premium basada en ciencia aplicada, estructura y rendimiento.'}
            </p>
          </div>

          <aside style={priceCardStyle}>
            <p style={smallLabel}>Precio</p>

            <p style={priceStyle}>
              {Number(course.price || 0).toLocaleString('es-ES')}€
            </p>

            <div style={dataGridStyle}>
              <div style={miniBox}>
                <p style={miniLabel}>Duración</p>
                <p style={miniValue}>{course.duration_minutes || 0} min</p>
              </div>

              <div style={miniBox}>
                <p style={miniLabel}>Certificado</p>
                <p style={miniValue}>
                  {effectiveCertificate ? 'Emitido' : course.has_certificate ? 'Sí' : 'No'}
                </p>
              </div>
            </div>

            <button style={buyButton}>
              {user ? 'Acceso activo' : 'Solicitar acceso'}
            </button>
          </aside>
        </section>

        <section style={statusGrid}>
          <article style={statusCard}>
            <p style={sectionLabel}>Estado oficial del curso</p>

            <h2 style={statusTitle}>
              {isCourseCompleted ? 'Curso completado' : 'Curso en progreso'}
            </h2>

            <p style={textStyle}>
              {isCourseCompleted
                ? !user?.id
                  ? 'Has aprobado el examen final en modo preview. Cuando activemos acceso completo, este cierre quedará guardado oficialmente en Supabase.'
                  : 'Has aprobado el examen final y el curso ya consta como completado oficialmente.'
                : 'Aprueba cada examen de módulo para desbloquear el siguiente bloque. Cuando completes todos los módulos, se desbloqueará la evaluación final del curso.'}
            </p>

            {!user && (
              <div style={noticeBox}>
                Vista previa activa. Los módulos, el cierre del curso y el certificado pueden
                probarse en este navegador. Cuando actives sesión, la fuente real será Supabase.
              </div>
            )}
          </article>

          <article style={statusCard}>
            <p style={sectionLabel}>Progreso de aprendizaje</p>

            <h2 style={statusTitle}>{lessonProgressPercent}%</h2>

            <div style={progressTrack}>
              <div style={{ ...progressFill, width: `${lessonProgressPercent}%` }} />
            </div>

            <p style={textStyle}>
              {completedLessons} de {totalLessons} lecciones completadas.
            </p>

            <p style={previewText}>
              {completedModulesCount} de {modules.length} módulos aprobados.
            </p>
          </article>
        </section>

        <section style={finalExamSectionStyle(finalExamUnlocked, isCourseCompleted)}>
          <div>
            <p style={sectionLabel}>
              {isCourseCompleted
                ? 'Cierre académico'
                : finalExamUnlocked
                  ? 'Evaluación final disponible'
                  : 'Evaluación final bloqueada'}
            </p>

            <h2 style={finalExamTitleStyle}>
              {isCourseCompleted
                ? 'Curso completado'
                : finalExamUnlocked
                  ? 'Evaluación final preparada para la siguiente fase'
                  : 'Completa todos los módulos para preparar la evaluación final'}
            </h2>

            <p style={textStyle}>
              {isCourseCompleted
                ? 'El curso ya está marcado como completado. El siguiente bloque es la certificación digital.'
                : finalExamUnlocked
                  ? 'Has aprobado todos los módulos. La evaluación final se activará cuando cerremos el motor de evaluaciones de GHC Academy.'
                  : `Has aprobado ${completedModulesCount} de ${modules.length} módulos. Cuando estén todos aprobados, aparecerá aquí el acceso a la evaluación final.`}
            </p>
          </div>

          {isCourseCompleted ? (
            <div style={finalExamLockedBox}>
              <p style={miniLabel}>Certificado</p>
              <p style={miniValue}>{effectiveCertificate ? 'Emitido' : 'Disponible'}</p>
            </div>
          ) : finalExamUnlocked ? (
            <div style={finalExamLockedBox}>
              <p style={miniLabel}>Estado</p>
              <p style={miniValue}>Próximamente</p>
            </div>
          ) : (
            <div style={finalExamLockedBox}>
              <p style={miniLabel}>Estado</p>
              <p style={miniValue}>Bloqueado</p>
            </div>
          )}
        </section>

        <section style={certificateSectionStyle(certificateAvailable, Boolean(effectiveCertificate))}>
          <div>
            <p style={sectionLabel}>
              {certificateAvailable ? 'Certificación digital' : 'Certificación bloqueada'}
            </p>

            <h2 style={finalExamTitleStyle}>
              {effectiveCertificate
                ? 'Certificado digital emitido'
                : certificateAvailable
                  ? 'Certificado digital disponible'
                  : 'Completa el curso para desbloquear el certificado'}
            </h2>

            <p style={textStyle}>
              {effectiveCertificate
                ? `Certificado ${effectiveCertificate.certificate_code} emitido para ${effectiveCertificate.student_name}.`
                : certificateAvailable
                  ? user?.id
                    ? 'Puedes emitir tu certificado digital real. Quedará guardado en Supabase y asociado a tu usuario.'
                    : 'Puedes emitir un certificado digital de prueba para validar el flujo completo.'
                  : 'El certificado solo estará disponible cuando el curso esté completado.'}
            </p>
          </div>

          {effectiveCertificate ? (
            <div style={certificateActions}>
              <Link href={certificateLink} style={finalExamButton}>
                Ver certificado →
              </Link>

              <div style={finalExamLockedBox}>
                <p style={miniLabel}>Estado</p>
                <p style={miniValue}>Válido</p>
              </div>
            </div>
          ) : certificateAvailable ? (
            <button onClick={issueCertificate} style={certificateButton}>
              {user?.id ? 'Emitir certificado digital →' : 'Emitir certificado de prueba →'}
            </button>
          ) : (
            <div style={finalExamLockedBox}>
              <p style={miniLabel}>Estado</p>
              <p style={miniValue}>Bloqueado</p>
            </div>
          )}
        </section>

        <section style={{ marginTop: '42px' }}>
          <p style={sectionLabel}>Contenido académico</p>
          <h2 style={sectionTitle}>Módulos y lecciones</h2>

          {systemMessage && <div style={noticeBox}>{systemMessage}</div>}

          <div style={modulesGrid}>
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

              return (
                <article
                  key={module.id}
                  style={{
                    ...moduleCard,
                    ...(moduleCompleted ? moduleCompletedCard : {}),
                    opacity: unlocked ? 1 : 0.48,
                  }}
                >
                  <div style={moduleHeader}>
                    <div>
                      <p style={moduleNumber}>Módulo {index + 1}</p>

                      <h3 style={moduleTitle}>{module.title}</h3>

                      <p style={textStyle}>
                        {module.description || 'Módulo formativo de GHC Academy.'}
                      </p>

                      <p style={moduleProgressText}>
                        {completedInModule} de {moduleLessons.length} lecciones completadas
                      </p>

                      {moduleCompleted && (
                        <p style={moduleScoreText}>
                          Módulo aprobado · Nota: {completionRecord?.final_score || 0}%
                          {!user ? ' · Preview' : ''}
                        </p>
                      )}
                    </div>

                    <span
                      style={
                        moduleCompleted
                          ? completedModuleBadge
                          : unlocked
                            ? availableBadge
                            : blockedBadge
                      }
                    >
                      {moduleCompleted ? 'Completado' : unlocked ? 'Disponible' : 'Bloqueado'}
                    </span>
                  </div>

                  <div style={lessonsList}>
                    {moduleLessons.length === 0 && (
                      <div style={lessonRow}>
                        <span>Lecciones pendientes de crear</span>
                        <span>—</span>
                      </div>
                    )}

                    {moduleLessons.map((lesson) => {
                      const lessonCompleted = completedLessonIds.has(String(lesson.id));
                      const lessonType = getLessonTypeLabel(lesson);

                      return (
                        <div key={lesson.id} style={lessonRow}>
                          <div>
                            <span>
                              {lessonCompleted ? '✓ ' : ''}
                              {lesson.title}
                            </span>

                            <div style={lessonMetaRow}>
                              <span style={lessonTypeBadge}>{lessonType}</span>
                            </div>
                          </div>

                          {unlocked ? (
                            <Link href={`/cursos/${slug}/${lesson.id}`} style={openLessonLink}>
                              Abrir
                            </Link>
                          ) : (
                            <span>🔒</span>
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

        <style jsx global>{`
          .course-detail-approved-page,
          .course-detail-approved-page * {
            box-sizing: border-box;
          }

          .course-detail-approved-page a,
          .course-detail-approved-page button {
            transition: transform .18s ease, border-color .18s ease, background .18s ease, box-shadow .18s ease;
          }

          .course-detail-approved-page a:hover,
          .course-detail-approved-page button:hover {
            transform: translateY(-1px);
          }

          .course-detail-approved-page {
            background:
              radial-gradient(circle at 12% -10%, rgba(99,229,70,.075), transparent 32%),
              radial-gradient(circle at 96% 8%, rgba(255,255,255,.035), transparent 28%),
              linear-gradient(135deg, #050706 0%, #070a09 46%, #030404 100%) !important;
          }

          .course-detail-approved-page h1,
          .course-detail-approved-page h2,
          .course-detail-approved-page h3 {
            letter-spacing: -.055em;
          }

          .course-detail-approved-page p {
            text-wrap: pretty;
          }

          @media (max-width: 920px) {
            .course-detail-approved-page {
              padding: 18px !important;
            }
          }
        `}</style>

      </div>
    </main>
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

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  background:
    'radial-gradient(circle at 12% -10%, rgba(99,229,70,.075), transparent 32%), radial-gradient(circle at 96% 8%, rgba(255,255,255,.035), transparent 28%), linear-gradient(135deg, #050706 0%, #070a09 46%, #030404 100%)',
  color: '#f4f6f2',
  padding: '24px',
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const containerStyle: CSSProperties = {
  maxWidth: '1320px',
  margin: '0 auto',
};

const loadingText: CSSProperties = {
  color: neon,
  fontWeight: 950,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
};

const backButton: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  width: 'fit-content',
  minHeight: '40px',
  marginBottom: '18px',
  color: neon,
  border: '1px solid rgba(99,229,70,0.22)',
  background: 'rgba(99,229,70,0.065)',
  padding: '0 15px',
  borderRadius: '999px',
  textDecoration: 'none',
  fontSize: '11px',
  fontWeight: 950,
  letterSpacing: '0.13em',
  textTransform: 'uppercase',
};

const heroStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.25fr) minmax(300px, 0.55fr)',
  gap: '18px',
  alignItems: 'stretch',
  borderRadius: '26px',
  border: '1px solid rgba(255,255,255,0.085)',
  background:
    'radial-gradient(circle at top right, rgba(99,229,70,.085), transparent 34%), linear-gradient(145deg, rgba(255,255,255,.052), rgba(255,255,255,.018)), rgba(8,12,10,.92)',
  padding: 'clamp(22px, 3vw, 34px)',
  boxShadow: '0 24px 82px rgba(0,0,0,.22)',
};

const eyebrowStyle: CSSProperties = {
  color: neon,
  fontSize: '10px',
  letterSpacing: '0.18em',
  fontWeight: 950,
  textTransform: 'uppercase',
  margin: '0 0 14px',
};

const badgeRow: CSSProperties = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
  marginBottom: '18px',
};

const titleStyle: CSSProperties = {
  fontSize: 'clamp(42px, 5vw, 74px)',
  lineHeight: '0.9',
  fontWeight: 950,
  letterSpacing: '-0.07em',
  margin: 0,
  color: '#f4f6f2',
};

const subtitleStyle: CSSProperties = {
  color: '#f4f6f2',
  fontWeight: 850,
  fontSize: '18px',
  lineHeight: '1.5',
  marginTop: '18px',
  maxWidth: '760px',
};

const textStyle: CSSProperties = {
  color: 'rgba(244,246,242,0.62)',
  fontSize: '15px',
  lineHeight: '1.75',
};

const previewText: CSSProperties = {
  color: neon,
  fontSize: '11px',
  fontWeight: 900,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
};

const priceCardStyle: CSSProperties = {
  borderRadius: '22px',
  border: '1px solid rgba(255,255,255,0.085)',
  background:
    'radial-gradient(circle at top right, rgba(99,229,70,.075), transparent 34%), linear-gradient(145deg, rgba(255,255,255,.052), rgba(255,255,255,.018)), rgba(5,7,6,.66)',
  padding: '22px',
  boxShadow: '0 20px 70px rgba(0,0,0,.18)',
  alignSelf: 'stretch',
};

const smallLabel: CSSProperties = {
  margin: 0,
  color: 'rgba(244,246,242,0.46)',
  fontSize: '10px',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  fontWeight: 900,
};

const priceStyle: CSSProperties = {
  margin: '8px 0 20px',
  color: '#f4f6f2',
  fontSize: '44px',
  lineHeight: 1,
  letterSpacing: '-0.055em',
  fontWeight: 950,
};

const dataGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '10px',
  marginBottom: '18px',
};

const miniBox: CSSProperties = {
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.075)',
  background: 'rgba(255,255,255,0.026)',
  padding: '12px',
};

const miniLabel: CSSProperties = {
  margin: 0,
  color: 'rgba(244,246,242,0.46)',
  fontSize: '10px',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  fontWeight: 900,
};

const miniValue: CSSProperties = {
  margin: '6px 0 0',
  color: '#f4f6f2',
  fontWeight: 900,
};

const buyButton: CSSProperties = {
  width: '100%',
  border: '1px solid rgba(99,229,70,.30)',
  borderRadius: '999px',
  background: 'linear-gradient(135deg, #63e546, #7bee65)',
  color: '#061008',
  padding: '14px',
  fontSize: '12px',
  fontWeight: 950,
  letterSpacing: '0.13em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  boxShadow: '0 0 30px rgba(99,229,70,.14)',
};

const statusGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.2fr) minmax(300px, 0.65fr)',
  gap: '18px',
  marginTop: '18px',
};

const statusCard: CSSProperties = {
  borderRadius: '22px',
  padding: '22px',
  background:
    'radial-gradient(circle at top right, rgba(99,229,70,.055), transparent 34%), linear-gradient(145deg, rgba(255,255,255,.052), rgba(255,255,255,.018)), rgba(8,12,10,.90)',
  border: '1px solid rgba(255,255,255,0.085)',
  boxShadow: '0 24px 82px rgba(0,0,0,.18)',
};

const sectionLabel: CSSProperties = {
  color: neon,
  fontSize: '10px',
  fontWeight: 950,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  margin: '0 0 10px',
};

const sectionTitle: CSSProperties = {
  fontSize: '34px',
  lineHeight: 1,
  fontWeight: 950,
  letterSpacing: '-0.045em',
  marginTop: 0,
};

const statusTitle: CSSProperties = {
  fontSize: '28px',
  lineHeight: 1,
  fontWeight: 950,
  letterSpacing: '-0.045em',
  margin: '0 0 12px',
};

const progressTrack: CSSProperties = {
  height: '9px',
  borderRadius: '999px',
  overflow: 'hidden',
  background: 'rgba(255,255,255,0.075)',
  margin: '16px 0',
};

const progressFill: CSSProperties = {
  height: '100%',
  borderRadius: '999px',
  background: 'linear-gradient(90deg, #63e546, #7bee65)',
  boxShadow: '0 0 22px rgba(99,229,70,.26)',
};

const noticeBox: CSSProperties = {
  padding: '16px',
  borderRadius: '18px',
  border: '1px solid rgba(99,229,70,0.18)',
  color: 'rgba(244,246,242,0.70)',
  marginBottom: '18px',
  background:
    'linear-gradient(90deg, rgba(99,229,70,.06), rgba(255,255,255,.022))',
};

const modulesGrid: CSSProperties = {
  display: 'grid',
  gap: '14px',
};

const moduleCard: CSSProperties = {
  borderRadius: '22px',
  padding: '22px',
  background:
    'radial-gradient(circle at top right, rgba(99,229,70,.045), transparent 34%), linear-gradient(145deg, rgba(255,255,255,.052), rgba(255,255,255,.018)), rgba(8,12,10,.90)',
  border: '1px solid rgba(255,255,255,0.085)',
  boxShadow: '0 24px 82px rgba(0,0,0,.18)',
};

const moduleCompletedCard: CSSProperties = {
  border: '1px solid rgba(99,229,70,0.28)',
  background:
    'radial-gradient(circle at top right, rgba(99,229,70,.13), transparent 34%), linear-gradient(145deg, rgba(99,229,70,.055), rgba(255,255,255,.018)), rgba(8,12,10,.94)',
  boxShadow: '0 24px 82px rgba(0,0,0,.20), 0 0 34px rgba(99,229,70,.055)',
};

const moduleHeader: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '16px',
};

const moduleNumber: CSSProperties = {
  color: neon,
  fontSize: '10px',
  fontWeight: 950,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  margin: 0,
};

const moduleTitle: CSSProperties = {
  fontSize: '26px',
  lineHeight: '1.05',
  fontWeight: 950,
  letterSpacing: '-0.04em',
  margin: '8px 0 10px',
};

const moduleProgressText: CSSProperties = {
  color: neon,
  fontSize: '11px',
  fontWeight: 900,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  marginTop: '10px',
};

const moduleScoreText: CSSProperties = {
  color: 'rgba(244,246,242,0.78)',
  fontSize: '13px',
  fontWeight: 800,
  marginTop: '8px',
};

const lessonsList: CSSProperties = {
  marginTop: '18px',
  display: 'grid',
  gap: '8px',
};

const lessonRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '16px',
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.075)',
  background: 'rgba(255,255,255,0.026)',
  padding: '13px 14px',
  color: 'rgba(244,246,242,0.76)',
  fontSize: '14px',
};

const lessonMetaRow: CSSProperties = {
  display: 'flex',
  gap: '8px',
  marginTop: '7px',
};

const lessonTypeBadge: CSSProperties = {
  display: 'inline-flex',
  width: 'fit-content',
  borderRadius: '999px',
  border: '1px solid rgba(99,229,70,0.22)',
  background: 'rgba(99,229,70,0.065)',
  color: neon,
  padding: '4px 8px',
  fontSize: '10px',
  fontWeight: 900,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
};

const openLessonLink: CSSProperties = {
  color: neon,
  textDecoration: 'none',
  fontWeight: 950,
  borderRadius: '999px',
  border: '1px solid rgba(99,229,70,.20)',
  background: 'rgba(99,229,70,.06)',
  padding: '8px 11px',
  whiteSpace: 'nowrap',
};

const badgeMain: CSSProperties = {
  background: 'rgba(99,229,70,.105)',
  border: '1px solid rgba(99,229,70,.24)',
  color: neon,
  borderRadius: '999px',
  padding: '7px 10px',
  fontSize: '10px',
  fontWeight: 950,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
};

const badgeSecondary: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.11)',
  color: 'rgba(244,246,242,0.72)',
  borderRadius: '999px',
  padding: '7px 10px',
  fontSize: '10px',
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
};

const completedBadge: CSSProperties = {
  background: 'rgba(99,229,70,0.105)',
  border: '1px solid rgba(99,229,70,0.26)',
  color: neon,
  borderRadius: '999px',
  padding: '7px 10px',
  fontSize: '10px',
  fontWeight: 950,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
};

const finalUnlockedBadge: CSSProperties = {
  background: 'rgba(99,229,70,0.105)',
  border: '1px solid rgba(99,229,70,0.26)',
  color: neon,
  borderRadius: '999px',
  padding: '7px 10px',
  fontSize: '10px',
  fontWeight: 950,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
};

const certificateBadge: CSSProperties = {
  background: 'rgba(214,178,94,0.10)',
  border: '1px solid rgba(214,178,94,0.26)',
  color: '#d6b25e',
  borderRadius: '999px',
  padding: '7px 10px',
  fontSize: '10px',
  fontWeight: 950,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
};

const availableBadge: CSSProperties = {
  height: 'fit-content',
  borderRadius: '999px',
  border: '1px solid rgba(99,229,70,0.22)',
  background: 'rgba(99,229,70,0.065)',
  color: neon,
  padding: '9px 12px',
  fontSize: '10px',
  fontWeight: 950,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
};

const completedModuleBadge: CSSProperties = {
  height: 'fit-content',
  borderRadius: '999px',
  border: '1px solid rgba(99,229,70,0.28)',
  background: 'rgba(99,229,70,0.10)',
  color: neon,
  padding: '9px 12px',
  fontSize: '10px',
  fontWeight: 950,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
};

const blockedBadge: CSSProperties = {
  height: 'fit-content',
  borderRadius: '999px',
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.025)',
  color: 'rgba(244,246,242,0.42)',
  padding: '9px 12px',
  fontSize: '10px',
  fontWeight: 900,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
};

const finalExamButton: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  maxWidth: '320px',
  borderRadius: '999px',
  background: 'linear-gradient(135deg, #63e546, #7bee65)',
  color: '#061008',
  padding: '15px 18px',
  fontSize: '12px',
  fontWeight: 950,
  letterSpacing: '0.13em',
  textTransform: 'uppercase',
  textDecoration: 'none',
  textAlign: 'center',
  boxShadow: '0 0 30px rgba(99,229,70,.14)',
};

const certificateButton: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  maxWidth: '360px',
  border: '1px solid rgba(99,229,70,.30)',
  borderRadius: '999px',
  background: 'linear-gradient(135deg, #63e546, #7bee65)',
  color: '#061008',
  padding: '15px 18px',
  fontSize: '12px',
  fontWeight: 950,
  letterSpacing: '0.13em',
  textTransform: 'uppercase',
  textDecoration: 'none',
  textAlign: 'center',
  boxShadow: '0 0 30px rgba(99,229,70,.14)',
  cursor: 'pointer',
};

const finalExamTitleStyle: CSSProperties = {
  fontSize: '28px',
  fontWeight: 950,
  letterSpacing: '-0.045em',
  margin: '0 0 12px',
  lineHeight: 1.05,
};

const finalExamLockedBox: CSSProperties = {
  minWidth: '220px',
  borderRadius: '18px',
  border: '1px solid rgba(255,255,255,0.085)',
  background: 'rgba(255,255,255,0.026)',
  padding: '16px',
};

const certificateActions: CSSProperties = {
  display: 'grid',
  gap: '14px',
};

function finalExamSectionStyle(unlocked: boolean, completed: boolean): CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(240px, 320px)',
    gap: '18px',
    alignItems: 'center',
    marginTop: '18px',
    borderRadius: '24px',
    padding: '22px',
    border:
      unlocked || completed
        ? '1px solid rgba(99,229,70,0.24)'
        : '1px solid rgba(255,255,255,0.085)',
    background:
      unlocked || completed
        ? 'radial-gradient(circle at top right, rgba(99,229,70,.12), transparent 34%), linear-gradient(145deg, rgba(99,229,70,.055), rgba(255,255,255,.018)), rgba(8,12,10,.94)'
        : 'radial-gradient(circle at top right, rgba(99,229,70,.045), transparent 34%), linear-gradient(145deg, rgba(255,255,255,.052), rgba(255,255,255,.018)), rgba(8,12,10,.90)',
    boxShadow: '0 24px 82px rgba(0,0,0,.20)',
  };
}

function certificateSectionStyle(available: boolean, emitted: boolean): CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(240px, 360px)',
    gap: '18px',
    alignItems: 'center',
    marginTop: '18px',
    borderRadius: '24px',
    padding: '22px',
    border: available
      ? '1px solid rgba(214,178,94,0.24)'
      : '1px solid rgba(255,255,255,0.085)',
    background: emitted
      ? 'radial-gradient(circle at top right, rgba(214,178,94,.12), transparent 34%), linear-gradient(145deg, rgba(255,255,255,.055), rgba(255,255,255,.018)), rgba(8,12,10,.94)'
      : available
        ? 'radial-gradient(circle at top right, rgba(214,178,94,.09), transparent 34%), linear-gradient(145deg, rgba(255,255,255,.052), rgba(255,255,255,.018)), rgba(8,12,10,.92)'
        : 'radial-gradient(circle at top right, rgba(99,229,70,.045), transparent 34%), linear-gradient(145deg, rgba(255,255,255,.052), rgba(255,255,255,.018)), rgba(8,12,10,.90)',
    boxShadow: '0 24px 82px rgba(0,0,0,.20)',
  };
}
