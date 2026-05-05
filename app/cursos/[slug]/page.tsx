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

const neon = '#00FF41';

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
  const [previewModuleCompletions, setPreviewModuleCompletions] = useState<AnyRecord[]>([]);
  const [courseCompletion, setCourseCompletion] = useState<AnyRecord | null>(null);
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

        loadPreviewModuleCompletions(courseData.id);
        loadPreviewCourseCompletion(courseData.id);
        loadPreviewCertificate(courseData.id);

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
      student_name: user?.user_metadata?.full_name || user?.email || 'Alumno GHC Academy',
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
    const byModuleId = new Map<string, AnyRecord>();

    moduleCompletions.forEach((item) => {
      if (item?.module_id) {
        byModuleId.set(String(item.module_id), item);
      }
    });

    previewModuleCompletions.forEach((item) => {
      if (item?.module_id && !byModuleId.has(String(item.module_id))) {
        byModuleId.set(String(item.module_id), item);
      }
    });

    return Array.from(byModuleId.values());
  }, [moduleCompletions, previewModuleCompletions]);

  const effectiveCourseCompletion = courseCompletion || previewCourseCompletion;

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
      <main style={pageStyle}>
        <div style={containerStyle}>
          <p style={loadingText}>CARGANDO CONTENIDO ACADÉMICO...</p>
        </div>
      </main>
    );
  }

  if (!course) {
    return (
      <main style={pageStyle}>
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

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <Link href="/cursos" style={backButton}>
          ← Volver al catálogo
        </Link>

        <section style={heroStyle}>
          <div>
            <p style={eyebrowStyle}>GHC Academy · Sport Through Science</p>

            <div style={badgeRow}>
              {course.course_type && <span style={badgeMain}>{course.course_type}</span>}
              {course.level && <span style={badgeSecondary}>{course.level}</span>}

              {isCourseCompleted && (
                <span style={completedBadge}>
                  {previewCourseCompletion && !courseCompletion
                    ? 'Curso completado · Preview'
                    : 'Curso completado oficialmente'}
                </span>
              )}

              {finalExamUnlocked && (
                <span style={finalUnlockedBadge}>Evaluación final desbloqueada</span>
              )}

              {previewCertificate && (
                <span style={certificateBadge}>Certificado emitido · Preview</span>
              )}
            </div>

            <h1 style={titleStyle}>{course.title}</h1>

            {course.subtitle && <p style={subtitleStyle}>{course.subtitle}</p>}

            <p style={textStyle}>
              {course.description || 'Formación premium basada en ciencia real.'}
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
                  {previewCertificate ? 'Emitido' : course.has_certificate ? 'Sí' : 'No'}
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
                ? previewCourseCompletion && !courseCompletion
                  ? 'Has aprobado el examen final en modo preview. Cuando activemos login, este cierre quedará guardado oficialmente en Supabase.'
                  : 'Has aprobado el examen final y el curso ya consta como completado oficialmente.'
                : 'Aprueba cada examen de módulo para desbloquear el siguiente bloque. Cuando completes todos los módulos, se desbloqueará la evaluación final del curso.'}
            </p>

            {!user && (
              <div style={noticeBox}>
                Vista previa activa. Los módulos, el cierre del curso y el certificado pueden
                probarse en este navegador. Cuando activemos login, pagos y control de acceso, el
                progreso quedará guardado oficialmente por alumno.
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

            {previewModuleCompletions.length > 0 && !user && (
              <p style={previewText}>
                {previewModuleCompletions.length} módulo(s) desbloqueado(s) en modo preview.
              </p>
            )}
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
                  ? 'Ya puedes realizar el examen final del curso'
                  : 'Completa todos los módulos para desbloquear el examen final'}
            </h2>

            <p style={textStyle}>
              {isCourseCompleted
                ? 'El curso ya está marcado como completado. El siguiente bloque es la certificación digital.'
                : finalExamUnlocked
                  ? 'Has aprobado todos los módulos. Realiza la evaluación final para cerrar oficialmente el curso y desbloquear el paso de certificación.'
                  : `Has aprobado ${completedModulesCount} de ${modules.length} módulos. Cuando estén todos aprobados, aparecerá aquí el acceso a la evaluación final.`}
            </p>
          </div>

          {isCourseCompleted ? (
            <div style={finalExamLockedBox}>
              <p style={miniLabel}>Certificado</p>
              <p style={miniValue}>{previewCertificate ? 'Emitido' : 'Disponible'}</p>
            </div>
          ) : finalExamUnlocked ? (
            <Link href={`/exam?courseId=${course.id}`} style={finalExamButton}>
              Hacer examen final →
            </Link>
          ) : (
            <div style={finalExamLockedBox}>
              <p style={miniLabel}>Estado</p>
              <p style={miniValue}>Bloqueado</p>
            </div>
          )}
        </section>

        <section style={certificateSectionStyle(certificateAvailable, Boolean(previewCertificate))}>
          <div>
            <p style={sectionLabel}>
              {certificateAvailable ? 'Certificación digital' : 'Certificación bloqueada'}
            </p>

            <h2 style={finalExamTitleStyle}>
              {previewCertificate
                ? 'Certificado digital emitido'
                : certificateAvailable
                  ? 'Certificado digital disponible'
                  : 'Completa el curso para desbloquear el certificado'}
            </h2>

            <p style={textStyle}>
              {previewCertificate
                ? `Certificado ${previewCertificate.certificate_code} emitido para ${previewCertificate.student_name}.`
                : certificateAvailable
                  ? 'Puedes emitir un certificado digital de prueba para validar el flujo completo. Más adelante este certificado será generado desde Supabase y asociado al alumno real.'
                  : 'El certificado solo estará disponible cuando el curso esté completado oficialmente o en modo preview.'}
            </p>
          </div>

          {previewCertificate ? (
            <div style={certificateActions}>
              <Link
                href={`/certificados/${previewCertificate.verification_slug}`}
                style={finalExamButton}
              >
                Ver certificado →
              </Link>

              <div style={finalExamLockedBox}>
                <p style={miniLabel}>Estado</p>
                <p style={miniValue}>Válido</p>
              </div>
            </div>
          ) : certificateAvailable ? (
            <button onClick={issuePreviewCertificate} style={certificateButton}>
              Emitir certificado de prueba →
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
    'radial-gradient(circle at top left, rgba(0,255,65,0.16), transparent 35%), radial-gradient(circle at bottom right, rgba(0,255,65,0.10), transparent 30%), #030504',
  color: 'white',
  padding: '32px',
  fontFamily: 'Arial, Helvetica, sans-serif',
};

const containerStyle: CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
};

const loadingText: CSSProperties = {
  color: neon,
  fontWeight: 900,
  letterSpacing: '0.18em',
};

const backButton: CSSProperties = {
  display: 'inline-block',
  marginBottom: '28px',
  color: neon,
  border: '1px solid rgba(0,255,65,0.45)',
  padding: '12px 16px',
  borderRadius: '999px',
  textDecoration: 'none',
  fontSize: '12px',
  fontWeight: 900,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
};

const heroStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.4fr) minmax(280px, 0.6fr)',
  gap: '24px',
};

const eyebrowStyle: CSSProperties = {
  color: neon,
  fontSize: '12px',
  letterSpacing: '0.35em',
  fontWeight: 900,
  textTransform: 'uppercase',
};

const badgeRow: CSSProperties = {
  display: 'flex',
  gap: '10px',
  flexWrap: 'wrap',
  marginBottom: '18px',
};

const titleStyle: CSSProperties = {
  fontSize: 'clamp(38px, 6vw, 72px)',
  lineHeight: '0.95',
  fontWeight: 900,
  textTransform: 'uppercase',
  margin: 0,
};

const subtitleStyle: CSSProperties = {
  color: neon,
  fontWeight: 900,
  fontSize: '18px',
  lineHeight: '1.5',
  marginTop: '20px',
};

const textStyle: CSSProperties = {
  color: 'rgba(255,255,255,0.66)',
  fontSize: '15px',
  lineHeight: '1.75',
};

const previewText: CSSProperties = {
  color: neon,
  fontSize: '12px',
  fontWeight: 900,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
};

const priceCardStyle: CSSProperties = {
  borderRadius: '30px',
  border: '1px solid rgba(0,255,65,0.26)',
  background: 'rgba(255,255,255,0.045)',
  padding: '24px',
  boxShadow: '0 0 60px rgba(0,255,65,0.08)',
};

const smallLabel: CSSProperties = {
  margin: 0,
  color: 'rgba(255,255,255,0.42)',
  fontSize: '11px',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
};

const priceStyle: CSSProperties = {
  margin: '8px 0 20px',
  color: neon,
  fontSize: '46px',
  fontWeight: 900,
};

const dataGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '12px',
  marginBottom: '18px',
};

const miniBox: CSSProperties = {
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(0,0,0,0.28)',
  padding: '12px',
};

const miniLabel: CSSProperties = {
  margin: 0,
  color: 'rgba(255,255,255,0.38)',
  fontSize: '11px',
};

const miniValue: CSSProperties = {
  margin: '5px 0 0',
  color: 'white',
  fontWeight: 800,
};

const buyButton: CSSProperties = {
  width: '100%',
  border: 'none',
  borderRadius: '18px',
  background: neon,
  color: '#000',
  padding: '15px',
  fontSize: '13px',
  fontWeight: 900,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  boxShadow: '0 0 28px rgba(0,255,65,0.30)',
};

const statusGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.4fr) minmax(280px, 0.6fr)',
  gap: '24px',
  marginTop: '28px',
};

const statusCard: CSSProperties = {
  borderRadius: '30px',
  padding: '24px',
  background: 'linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025))',
  border: '1px solid rgba(0,255,65,0.24)',
};

const sectionLabel: CSSProperties = {
  color: neon,
  fontSize: '12px',
  fontWeight: 900,
  letterSpacing: '0.3em',
  textTransform: 'uppercase',
};

const sectionTitle: CSSProperties = {
  fontSize: '34px',
  fontWeight: 900,
  textTransform: 'uppercase',
  marginTop: 0,
};

const statusTitle: CSSProperties = {
  fontSize: '30px',
  fontWeight: 900,
  textTransform: 'uppercase',
  margin: '0 0 12px',
};

const progressTrack: CSSProperties = {
  height: '12px',
  borderRadius: '999px',
  overflow: 'hidden',
  background: 'rgba(255,255,255,0.12)',
  margin: '18px 0',
};

const progressFill: CSSProperties = {
  height: '100%',
  borderRadius: '999px',
  background: neon,
  boxShadow: '0 0 20px rgba(0,255,65,0.55)',
};

const noticeBox: CSSProperties = {
  padding: '22px',
  borderRadius: '24px',
  border: '1px solid rgba(0,255,65,0.22)',
  color: 'rgba(255,255,255,0.72)',
  marginBottom: '20px',
  background: 'rgba(255,255,255,0.035)',
};

const modulesGrid: CSSProperties = {
  display: 'grid',
  gap: '18px',
};

const moduleCard: CSSProperties = {
  borderRadius: '28px',
  padding: '24px',
  background: 'linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025))',
  border: '1px solid rgba(0,255,65,0.24)',
};

const moduleCompletedCard: CSSProperties = {
  border: '1px solid rgba(0,255,65,0.58)',
  background: 'linear-gradient(145deg, rgba(0,255,65,0.13), rgba(255,255,255,0.035))',
  boxShadow: '0 0 50px rgba(0,255,65,0.10)',
};

const moduleHeader: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '16px',
};

const moduleNumber: CSSProperties = {
  color: neon,
  fontSize: '12px',
  fontWeight: 900,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  margin: 0,
};

const moduleTitle: CSSProperties = {
  fontSize: '26px',
  lineHeight: '1.15',
  fontWeight: 900,
  margin: '8px 0 10px',
};

const moduleProgressText: CSSProperties = {
  color: neon,
  fontSize: '12px',
  fontWeight: 900,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  marginTop: '10px',
};

const moduleScoreText: CSSProperties = {
  color: 'rgba(255,255,255,0.78)',
  fontSize: '13px',
  fontWeight: 800,
  marginTop: '8px',
};

const lessonsList: CSSProperties = {
  marginTop: '18px',
  display: 'grid',
  gap: '10px',
};

const lessonRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '16px',
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(0,0,0,0.26)',
  padding: '13px 14px',
  color: 'rgba(255,255,255,0.75)',
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
  border: '1px solid rgba(0,255,65,0.24)',
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
  fontWeight: 900,
};

const badgeMain: CSSProperties = {
  background: neon,
  color: '#000',
  borderRadius: '999px',
  padding: '7px 10px',
  fontSize: '11px',
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
};

const badgeSecondary: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.14)',
  color: 'rgba(255,255,255,0.72)',
  borderRadius: '999px',
  padding: '7px 10px',
  fontSize: '11px',
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
};

const completedBadge: CSSProperties = {
  background: 'rgba(0,255,65,0.14)',
  border: '1px solid rgba(0,255,65,0.55)',
  color: neon,
  borderRadius: '999px',
  padding: '7px 10px',
  fontSize: '11px',
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
};

const finalUnlockedBadge: CSSProperties = {
  background: neon,
  border: '1px solid rgba(0,255,65,0.75)',
  color: '#000',
  borderRadius: '999px',
  padding: '7px 10px',
  fontSize: '11px',
  fontWeight: 950,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
};

const certificateBadge: CSSProperties = {
  background: 'rgba(255,255,255,0.92)',
  border: '1px solid rgba(255,255,255,0.92)',
  color: '#000',
  borderRadius: '999px',
  padding: '7px 10px',
  fontSize: '11px',
  fontWeight: 950,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
};

const availableBadge: CSSProperties = {
  height: 'fit-content',
  borderRadius: '999px',
  border: '1px solid rgba(0,255,65,0.35)',
  color: neon,
  padding: '9px 12px',
  fontSize: '11px',
  fontWeight: 900,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
};

const completedModuleBadge: CSSProperties = {
  height: 'fit-content',
  borderRadius: '999px',
  border: '1px solid rgba(0,255,65,0.65)',
  background: 'rgba(0,255,65,0.14)',
  color: neon,
  padding: '9px 12px',
  fontSize: '11px',
  fontWeight: 900,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
};

const blockedBadge: CSSProperties = {
  height: 'fit-content',
  borderRadius: '999px',
  border: '1px solid rgba(255,255,255,0.16)',
  color: 'rgba(255,255,255,0.42)',
  padding: '9px 12px',
  fontSize: '11px',
  fontWeight: 900,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
};

const finalExamButton: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  maxWidth: '320px',
  borderRadius: '18px',
  background: neon,
  color: '#000',
  padding: '16px 20px',
  fontSize: '13px',
  fontWeight: 950,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  textDecoration: 'none',
  textAlign: 'center',
  boxShadow: '0 0 34px rgba(0,255,65,0.34)',
};

const certificateButton: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  maxWidth: '360px',
  border: 'none',
  borderRadius: '18px',
  background: neon,
  color: '#000',
  padding: '16px 20px',
  fontSize: '13px',
  fontWeight: 950,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  textDecoration: 'none',
  textAlign: 'center',
  boxShadow: '0 0 34px rgba(0,255,65,0.34)',
  cursor: 'pointer',
};

const finalExamTitleStyle: CSSProperties = {
  fontSize: '30px',
  fontWeight: 950,
  textTransform: 'uppercase',
  margin: '0 0 12px',
  lineHeight: 1.08,
};

const finalExamLockedBox: CSSProperties = {
  minWidth: '220px',
  borderRadius: '20px',
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(0,0,0,0.28)',
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
    gap: '24px',
    alignItems: 'center',
    marginTop: '28px',
    borderRadius: '32px',
    padding: '26px',
    border: unlocked || completed
      ? '1px solid rgba(0,255,65,0.60)'
      : '1px solid rgba(0,255,65,0.24)',
    background: unlocked || completed
      ? 'linear-gradient(145deg, rgba(0,255,65,0.16), rgba(255,255,255,0.04))'
      : 'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.025))',
    boxShadow: unlocked || completed ? '0 0 70px rgba(0,255,65,0.12)' : 'none',
  };
}

function certificateSectionStyle(available: boolean, emitted: boolean): CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(240px, 360px)',
    gap: '24px',
    alignItems: 'center',
    marginTop: '28px',
    borderRadius: '32px',
    padding: '26px',
    border: available
      ? '1px solid rgba(255,255,255,0.38)'
      : '1px solid rgba(0,255,65,0.20)',
    background: emitted
      ? 'linear-gradient(145deg, rgba(255,255,255,0.14), rgba(0,255,65,0.08))'
      : available
        ? 'linear-gradient(145deg, rgba(255,255,255,0.09), rgba(0,255,65,0.06))'
        : 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
    boxShadow: available ? '0 0 70px rgba(255,255,255,0.08)' : 'none',
  };
}
