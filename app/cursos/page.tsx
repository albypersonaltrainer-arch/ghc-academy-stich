'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

type AnyRecord = Record<string, any>;

type Course = {
  id: string;
  title: string;
  slug: string;
  subtitle?: string | null;
  description?: string | null;
  course_type?: string | null;
  level?: string | null;
  price?: number | null;
  duration_minutes?: number | null;
  has_certificate?: boolean | null;
};

type Module = {
  id: string;
  course_id: string;
  title: string;
  description?: string | null;
  position?: number | null;
  sort_order?: number | null;
  order?: number | null;
  order_index?: number | null;
};

type Lesson = {
  id: string;
  module_id: string;
  title: string;
  content?: string | null;
  type?: string | null;
  content_type?: string | null;
  lesson_type?: string | null;
  video_url?: string | null;
  audio_url?: string | null;
  pdf_url?: string | null;
  file_url?: string | null;
  sort_order?: number | null;
  position?: number | null;
  order?: number | null;
  order_index?: number | null;
};

type CourseCompletion = {
  id: string;
  user_id: string;
  course_id: string;
  completed: boolean;
  final_score: number;
  completed_at: string;
};

type ModuleCompletion = {
  id: string;
  user_id: string;
  course_id: string;
  module_id: string;
  completed: boolean;
  final_score: number;
  completed_at: string;
};

type LessonProgress = {
  lesson_id: string;
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
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [courseCompletion, setCourseCompletion] = useState<CourseCompletion | null>(null);
  const [moduleCompletions, setModuleCompletions] = useState<ModuleCompletion[]>([]);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemMessage, setSystemMessage] = useState('');

  useEffect(() => {
    async function loadCourseContent() {
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

        const selectedCourse = courseData as Course;
        setCourse(selectedCourse);

        const { data: modulesData, error: modulesError } = await supabase
          .from('modules')
          .select('*')
          .eq('course_id', selectedCourse.id);

        if (modulesError) {
          console.error('Error cargando módulos:', modulesError);
          setSystemMessage('Curso cargado, pero no se pudieron cargar los módulos.');
          setModules([]);
          setLessons([]);
          setLoading(false);
          return;
        }

        const finalModules: Module[] = Array.isArray(modulesData)
          ? [...modulesData].sort(sortModules)
          : [];

        setModules(finalModules);

        if (finalModules.length === 0) {
          setSystemMessage(
            'Curso cargado correctamente, pero todavía no se han encontrado módulos asociados.'
          );
          setLessons([]);
          setLoading(false);
          return;
        }

        const moduleIds = finalModules.map((module) => module.id);

        const { data: lessonsData, error: lessonsError } = await supabase
          .from('lessons')
          .select('*')
          .in('module_id', moduleIds);

        if (lessonsError) {
          console.error('Error cargando lecciones:', lessonsError);
          setSystemMessage('Curso cargado, pero no se pudieron cargar las lecciones.');
          setLessons([]);
        } else {
          const finalLessons: Lesson[] = Array.isArray(lessonsData)
            ? [...lessonsData].sort(sortLessons)
            : [];

          setLessons(finalLessons);
        }

        if (activeUser?.id) {
          const { data: courseCompletionData } = await supabase
            .from('course_completions')
            .select('*')
            .eq('user_id', activeUser.id)
            .eq('course_id', selectedCourse.id)
            .maybeSingle();

          setCourseCompletion((courseCompletionData as CourseCompletion) || null);

          const { data: moduleCompletionData } = await supabase
            .from('module_completions')
            .select('*')
            .eq('user_id', activeUser.id)
            .eq('course_id', selectedCourse.id)
            .eq('completed', true);

          setModuleCompletions(
            Array.isArray(moduleCompletionData)
              ? (moduleCompletionData as ModuleCompletion[])
              : []
          );

          const { data: progressData } = await supabase
            .from('lesson_progress')
            .select('lesson_id')
            .eq('user_id', activeUser.id)
            .eq('course_id', selectedCourse.id)
            .eq('completed', true);

          setLessonProgress(Array.isArray(progressData) ? progressData : []);
        }
      } catch (error) {
        console.error('Error loading course content:', error);
        setSystemMessage('Error cargando el contenido del curso.');
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      loadCourseContent();
    }
  }, [slug]);

  const completedLessonIds = useMemo(() => {
    return new Set(lessonProgress.map((item) => item.lesson_id));
  }, [lessonProgress]);

  const completedModuleIds = useMemo(() => {
    return new Set(moduleCompletions.map((item) => item.module_id));
  }, [moduleCompletions]);

  const totalLessons = lessons.length;
  const completedLessons = lessonProgress.length;

  const lessonProgressPercent = useMemo(() => {
    if (totalLessons === 0) return 0;
    return Math.round((completedLessons / totalLessons) * 100);
  }, [completedLessons, totalLessons]);

  const isCourseOfficiallyCompleted = Boolean(courseCompletion?.completed);

  const moduleStatusMap = useMemo(() => {
    const map: Record<
      string,
      {
        lessons: Lesson[];
        completedLessons: number;
        totalLessons: number;
        completed: boolean;
        unlocked: boolean;
        finalScore?: number;
      }
    > = {};

    modules.forEach((module, index) => {
      const moduleLessons = lessons
        .filter((lesson) => lesson.module_id === module.id)
        .sort(sortLessons);

      const completedLessonCount = moduleLessons.filter((lesson) =>
        completedLessonIds.has(lesson.id)
      ).length;

      const moduleCompletionRecord = moduleCompletions.find(
        (item) => item.module_id === module.id && item.completed
      );

      const moduleCompleted = Boolean(moduleCompletionRecord);

      let unlocked = index === 0 || isCourseOfficiallyCompleted || moduleCompleted;

      if (!unlocked && index > 0) {
        const previousModule = modules[index - 1];
        unlocked = completedModuleIds.has(previousModule.id);
      }

      map[module.id] = {
        lessons: moduleLessons,
        completedLessons: completedLessonCount,
        totalLessons: moduleLessons.length,
        completed: moduleCompleted,
        unlocked,
        finalScore: moduleCompletionRecord?.final_score,
      };
    });

    return map;
  }, [
    modules,
    lessons,
    completedLessonIds,
    completedModuleIds,
    moduleCompletions,
    isCourseOfficiallyCompleted,
  ]);

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={containerStyle}>
          <p style={{ color: neon, fontWeight: 900, letterSpacing: '0.18em' }}>
            CARGANDO CONTENIDO ACADÉMICO...
          </p>
        </div>
      </main>
    );
  }

  if (!course) {
    return (
      <main style={pageStyle}>
        <div style={containerStyle}>
          <Link href="/cursos" style={backButton}>
            ← Volver a cursos
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
          ← Volver a cursos
        </Link>

        <section style={heroStyle}>
          <div>
            <p style={eyebrowStyle}>GHC Academy · Sport Through Science</p>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
              {course.course_type && <span style={badgeMain}>{course.course_type}</span>}
              {course.level && <span style={badgeSecondary}>{course.level}</span>}
              {isCourseOfficiallyCompleted && (
                <span style={completedBadge}>Curso completado oficialmente</span>
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
            <p style={priceStyle}>{Number(course.price || 0).toLocaleString('es-ES')}€</p>

            <div style={dataGridStyle}>
              <div style={miniBox}>
                <p style={miniLabel}>Duración</p>
                <p style={miniValue}>{course.duration_minutes || 0} min</p>
              </div>

              <div style={miniBox}>
                <p style={miniLabel}>Certificado</p>
                <p style={miniValue}>{course.has_certificate ? 'Sí' : 'No'}</p>
              </div>
            </div>

            <button style={buyButton}>
              {user ? 'Acceso activo' : 'Solicitar acceso'}
            </button>
          </aside>
        </section>

        <section style={statusGrid}>
          <article style={officialStatusCard(isCourseOfficiallyCompleted)}>
            <p style={sectionLabel}>Estado oficial del curso</p>

            <h2 style={statusTitle}>
              {isCourseOfficiallyCompleted ? 'Curso completado oficialmente' : 'Curso en progreso'}
            </h2>

            {isCourseOfficiallyCompleted ? (
              <>
                <p style={textStyle}>
                  Has aprobado el examen final y el curso ya consta como completado oficialmente.
                </p>

                <div style={statusDataGrid}>
                  <div style={miniBox}>
                    <p style={miniLabel}>Nota final</p>
                    <p style={miniValue}>{courseCompletion?.final_score || 0}%</p>
                  </div>

                  <div style={miniBox}>
                    <p style={miniLabel}>Fecha</p>
                    <p style={miniValue}>{formatDate(courseCompletion?.completed_at)}</p>
                  </div>

                  <div style={miniBox}>
                    <p style={miniLabel}>Certificado</p>
                    <p style={miniValue}>Próximamente</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p style={textStyle}>
                  El curso sigue en progreso. Aprueba cada examen de módulo para desbloquear el
                  siguiente bloque.
                </p>

                {!user && (
                  <div style={noticeBox}>
                    Vista previa activa. El módulo 1 está disponible para prueba. Cuando activemos
                    login y pagos, el progreso quedará asociado a cada alumno.
                  </div>
                )}
              </>
            )}
          </article>

          <article style={progressStatusCard}>
            <p style={sectionLabel}>Progreso de aprendizaje</p>

            <h2 style={statusTitle}>{lessonProgressPercent}%</h2>

            <div style={progressTrack}>
              <div style={{ ...progressFill, width: `${lessonProgressPercent}%` }} />
            </div>

            <p style={textStyle}>
              {completedLessons} de {totalLessons} lecciones completadas.
            </p>
          </article>
        </section>

        <section style={{ marginTop: '42px' }}>
          <p style={sectionLabel}>Contenido académico</p>
          <h2 style={sectionTitle}>Módulos y lecciones</h2>

          {systemMessage && <div style={noticeBox}>{systemMessage}</div>}

          <div style={{ display: 'grid', gap: '18px' }}>
            {modules.map((module, index) => {
              const status = moduleStatusMap[module.id];
              const moduleLessons = status?.lessons || [];
              const unlocked = Boolean(status?.unlocked);
              const moduleCompleted = Boolean(status?.completed);

              return (
                <article
                  key={module.id}
                  style={{
                    ...moduleCard,
                    ...(moduleCompleted ? moduleCompletedCard : {}),
                    opacity: unlocked ? 1 : 0.48,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                    <div>
                      <p style={moduleNumber}>Módulo {getOrder(module, index + 1)}</p>
                      <h3 style={moduleTitle}>{module.title}</h3>
                      <p style={textStyle}>
                        {module.description || 'Módulo formativo de GHC Academy.'}
                      </p>

                      <p style={moduleProgressText}>
                        {status?.completedLessons || 0} de {status?.totalLessons || 0} lecciones
                        completadas
                      </p>

                      {moduleCompleted && (
                        <p style={moduleScoreText}>
                          Módulo aprobado · Nota: {status?.finalScore || 0}%
                        </p>
                      )}
                    </div>

                    <span
                      style={
                        moduleCompleted
                          ? completedModuleBadge
                          : unlocked
                            ? lockBadge
                            : blockedBadge
                      }
                    >
                      {moduleCompleted ? 'Completado' : unlocked ? 'Disponible' : 'Bloqueado'}
                    </span>
                  </div>

                  <div style={{ marginTop: '18px', display: 'grid', gap: '10px' }}>
                    {moduleLessons.length === 0 && (
                      <div style={lessonRow}>
                        <span>Lecciones pendientes de crear</span>
                        <span>—</span>
                      </div>
                    )}

                    {moduleLessons.map((lesson) => {
                      const lessonCompleted = completedLessonIds.has(lesson.id);
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

function getOrder(item: AnyRecord, fallback: number) {
  return item.position ?? item.sort_order ?? item.order_index ?? item.order ?? fallback;
}

function sortModules(a: Module, b: Module) {
  const aNumber = extractModuleNumber(a.title);
  const bNumber = extractModuleNumber(b.title);

  if (aNumber !== bNumber) return aNumber - bNumber;

  return Number(getOrder(a, 999)) - Number(getOrder(b, 999));
}

function sortLessons(a: Lesson, b: Lesson) {
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

function getLessonTypeLabel(lesson: Lesson) {
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

function formatDate(value?: string) {
  if (!value) return '—';

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
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

const statusGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.4fr) minmax(280px, 0.6fr)',
  gap: '24px',
  marginTop: '28px',
};

const statusDataGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: '12px',
  marginTop: '18px',
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

const officialStatusCard = (completed: boolean): CSSProperties => ({
  borderRadius: '30px',
  padding: '24px',
  background: completed
    ? 'linear-gradient(145deg, rgba(0,255,65,0.16), rgba(255,255,255,0.045))'
    : 'linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025))',
  border: completed ? '1px solid rgba(0,255,65,0.55)' : '1px solid rgba(0,255,65,0.24)',
  boxShadow: completed ? '0 0 70px rgba(0,255,65,0.12)' : 'none',
});

const progressStatusCard: CSSProperties = {
  borderRadius: '30px',
  padding: '24px',
  background: 'linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025))',
  border: '1px solid rgba(0,255,65,0.24)',
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

const lockBadge: CSSProperties = {
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
