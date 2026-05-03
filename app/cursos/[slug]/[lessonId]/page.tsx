'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const neon = '#00FF41';

type Course = {
  id: string;
  title: string;
  slug: string;
};

type Module = {
  id: string;
  course_id: string;
  title: string;
  position?: number | null;
};

type Lesson = {
  id: string;
  module_id: string;
  title: string;
  content?: string | null;
  content_type?: 'texto' | 'video' | 'audio' | 'pdf' | 'mixto' | null;
  video_url?: string | null;
  audio_url?: string | null;
  pdf_url?: string | null;
  sort_order?: number | null;
};

function getVideoEmbedUrl(url?: string | null) {
  if (!url) return '';

  if (url.includes('youtube.com/watch?v=')) {
    const videoId = url.split('v=')[1]?.split('&')[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  }

  if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1]?.split('?')[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  }

  if (url.includes('vimeo.com/')) {
    const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
    return videoId ? `https://player.vimeo.com/video/${videoId}` : url;
  }

  return url;
}

export default function LessonPage() {
  const params = useParams();
  const slug = String(params.slug);
  const lessonId = String(params.lessonId);

  const [course, setCourse] = useState<Course | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function loadLessonPlatform() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          setMessage('Faltan variables de conexión con Supabase.');
          setLoading(false);
          return;
        }

        const headers = {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        };

        const courseRes = await fetch(
          `${supabaseUrl}/rest/v1/courses?select=id,title,slug&slug=eq.${encodeURIComponent(slug)}&limit=1`,
          { headers }
        );

        const courseData = await courseRes.json();

        if (!Array.isArray(courseData) || courseData.length === 0) {
          setMessage('Curso no encontrado.');
          setLoading(false);
          return;
        }

        const selectedCourse = courseData[0] as Course;
        setCourse(selectedCourse);

        const lessonRes = await fetch(
          `${supabaseUrl}/rest/v1/lessons?select=id,module_id,title,content,content_type,video_url,audio_url,pdf_url,sort_order&id=eq.${encodeURIComponent(lessonId)}&limit=1`,
          { headers }
        );

        const lessonData = await lessonRes.json();

        if (!Array.isArray(lessonData) || lessonData.length === 0) {
          setMessage('Lección no encontrada.');
          setLoading(false);
          return;
        }

        const selectedLesson = lessonData[0] as Lesson;
        setLesson(selectedLesson);

        const modulesRes = await fetch(
          `${supabaseUrl}/rest/v1/modules?select=id,course_id,title,position&course_id=eq.${encodeURIComponent(selectedCourse.id)}&order=position.asc`,
          { headers }
        );

        const modulesData = await modulesRes.json();
        const finalModules: Module[] = Array.isArray(modulesData) ? modulesData : [];
        setModules(finalModules);

        if (finalModules.length === 0) {
          setLessons([]);
          setLoading(false);
          return;
        }

        const moduleIds = finalModules.map((module) => module.id).join(',');

        const lessonsRes = await fetch(
          `${supabaseUrl}/rest/v1/lessons?select=id,module_id,title,content,content_type,video_url,audio_url,pdf_url,sort_order&module_id=in.(${moduleIds})&order=sort_order.asc`,
          { headers }
        );

        const lessonsData = await lessonsRes.json();

        if (Array.isArray(lessonsData)) {
          setLessons(lessonsData);
        } else {
          setLessons([]);
        }
      } catch (error) {
        console.error('Error loading lesson platform:', error);
        setMessage('Error cargando la lección.');
      } finally {
        setLoading(false);
      }
    }

    loadLessonPlatform();
  }, [slug, lessonId]);

  const orderedLessons = useMemo(() => {
    const orderedModules = [...modules].sort(
      (a, b) => Number(a.position || 999) - Number(b.position || 999)
    );

    return orderedModules.flatMap((module) =>
      lessons
        .filter((item) => item.module_id === module.id)
        .sort((a, b) => Number(a.sort_order || 999) - Number(b.sort_order || 999))
    );
  }, [modules, lessons]);

  const currentIndex = orderedLessons.findIndex((item) => item.id === lesson?.id);
  const previousLesson = currentIndex > 0 ? orderedLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < orderedLessons.length - 1
      ? orderedLessons[currentIndex + 1]
      : null;

  if (loading) {
    return (
      <main style={pageStyle}>
        <p style={loadingStyle}>CARGANDO LECCIÓN...</p>
      </main>
    );
  }

  if (!lesson) {
    return (
      <main style={pageStyle}>
        <div style={contentStyle}>
          <Link href={`/cursos/${slug}`} style={backButton}>
            ← Volver al curso
          </Link>
          <h1 style={titleStyle}>Lección no encontrada</h1>
          <p style={textStyle}>{message}</p>
        </div>
      </main>
    );
  }

  const videoEmbedUrl = getVideoEmbedUrl(lesson.video_url);
  const typeLabel = lesson.content_type || 'texto';

  return (
    <main style={pageStyle}>
      <aside style={sidebarStyle}>
        <Link href={`/cursos/${slug}`} style={backButton}>
          ← Volver al curso
        </Link>

        <p style={sidebarBrand}>GHC Academy</p>
        <h2 style={sidebarTitle}>{course?.title || 'Curso'}</h2>

        <div style={{ display: 'grid', gap: '18px', marginTop: '26px' }}>
          {modules.map((module) => {
            const moduleLessons = lessons
              .filter((item) => item.module_id === module.id)
              .sort((a, b) => Number(a.sort_order || 999) - Number(b.sort_order || 999));

            return (
              <div key={module.id}>
                <p style={moduleTitleStyle}>{module.title}</p>

                <div style={{ display: 'grid', gap: '8px' }}>
                  {moduleLessons.length === 0 && (
                    <div style={emptyLessonStyle}>Lecciones pendientes</div>
                  )}

                  {moduleLessons.map((item) => {
                    const active = item.id === lesson.id;

                    return (
                      <Link
                        key={item.id}
                        href={`/cursos/${slug}/${item.id}`}
                        style={{
                          ...lessonLinkStyle,
                          border: active
                            ? '1px solid rgba(0,255,65,0.65)'
                            : '1px solid rgba(255,255,255,0.08)',
                          background: active
                            ? 'rgba(0,255,65,0.16)'
                            : 'rgba(255,255,255,0.035)',
                          color: active ? neon : 'rgba(255,255,255,0.78)',
                        }}
                      >
                        {item.title}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      <section style={contentStyle}>
        <p style={eyebrowStyle}>Lección activa</p>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <span style={typeBadge}>{typeLabel}</span>
          {lesson.video_url && <span style={softBadge}>vídeo</span>}
          {lesson.audio_url && <span style={softBadge}>audio</span>}
          {lesson.pdf_url && <span style={softBadge}>pdf</span>}
        </div>

        <h1 style={titleStyle}>{lesson.title}</h1>

        {(lesson.content_type === 'video' || lesson.content_type === 'mixto') && lesson.video_url && (
          <div style={mediaBlockStyle}>
            {videoEmbedUrl.includes('youtube.com/embed') || videoEmbedUrl.includes('player.vimeo.com') ? (
              <iframe
                src={videoEmbedUrl}
                title={lesson.title}
                style={iframeStyle}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video src={lesson.video_url} controls style={videoStyle} />
            )}
          </div>
        )}

        {(lesson.content_type === 'audio' || lesson.content_type === 'mixto') && lesson.audio_url && (
          <div style={audioBlockStyle}>
            <p style={mediaLabelStyle}>Audio de la lección</p>
            <audio controls src={lesson.audio_url} style={{ width: '100%' }} />
          </div>
        )}

        {(lesson.content_type === 'pdf' || lesson.content_type === 'mixto') && lesson.pdf_url && (
          <div style={pdfBlockStyle}>
            <p style={mediaLabelStyle}>Material PDF protegido</p>
            <iframe src={lesson.pdf_url} title="PDF de la lección" style={pdfFrameStyle} />
          </div>
        )}

        {(lesson.content_type === 'texto' || lesson.content_type === 'mixto' || !lesson.content_type) && (
          <div style={lessonContentStyle}>
            {lesson.content || 'Contenido aún no disponible.'}
          </div>
        )}

        {lesson.content_type === 'video' && !lesson.video_url && (
          <div style={noticeStyle}>Esta lección está marcada como vídeo, pero todavía no tiene video_url.</div>
        )}

        {lesson.content_type === 'audio' && !lesson.audio_url && (
          <div style={noticeStyle}>Esta lección está marcada como audio, pero todavía no tiene audio_url.</div>
        )}

        {lesson.content_type === 'pdf' && !lesson.pdf_url && (
          <div style={noticeStyle}>Esta lección está marcada como PDF, pero todavía no tiene pdf_url.</div>
        )}

        <div style={navigationStyle}>
          {previousLesson ? (
            <Link href={`/cursos/${slug}/${previousLesson.id}`} style={secondaryNavButton}>
              ← Anterior
              <span style={navLessonTitle}>{previousLesson.title}</span>
            </Link>
          ) : (
            <div style={disabledNavButton}>
              ← Anterior
              <span style={navLessonTitle}>Primera lección</span>
            </div>
          )}

          {nextLesson ? (
            <Link href={`/cursos/${slug}/${nextLesson.id}`} style={primaryNavButton}>
              Siguiente →
              <span style={navLessonTitle}>{nextLesson.title}</span>
            </Link>
          ) : (
            <div style={disabledNavButton}>
              Curso completado
              <span style={navLessonTitle}>No hay más lecciones</span>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background:
    'radial-gradient(circle at top left, rgba(0,255,65,0.10), transparent 32%), #030504',
  color: 'white',
  display: 'grid',
  gridTemplateColumns: '340px minmax(0, 1fr)',
  fontFamily: 'Arial, Helvetica, sans-serif',
};

const loadingStyle: React.CSSProperties = {
  color: neon,
  padding: '40px',
  fontWeight: 900,
  letterSpacing: '0.18em',
};

const sidebarStyle: React.CSSProperties = {
  borderRight: '1px solid rgba(0,255,65,0.22)',
  background: 'rgba(0,0,0,0.28)',
  padding: '24px',
  minHeight: '100vh',
  overflowY: 'auto',
};

const backButton: React.CSSProperties = {
  display: 'inline-block',
  color: neon,
  textDecoration: 'none',
  fontSize: '12px',
  fontWeight: 900,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  marginBottom: '26px',
};

const sidebarBrand: React.CSSProperties = {
  color: neon,
  fontSize: '11px',
  fontWeight: 900,
  letterSpacing: '0.28em',
  textTransform: 'uppercase',
  margin: 0,
};

const sidebarTitle: React.CSSProperties = {
  fontSize: '20px',
  lineHeight: '1.2',
  margin: '10px 0 0',
};

const moduleTitleStyle: React.CSSProperties = {
  color: neon,
  fontSize: '11px',
  fontWeight: 900,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  margin: '0 0 8px',
};

const lessonLinkStyle: React.CSSProperties = {
  display: 'block',
  borderRadius: '14px',
  padding: '12px',
  textDecoration: 'none',
  fontSize: '13px',
  lineHeight: '1.35',
};

const emptyLessonStyle: React.CSSProperties = {
  borderRadius: '14px',
  padding: '12px',
  color: 'rgba(255,255,255,0.42)',
  background: 'rgba(255,255,255,0.025)',
  fontSize: '13px',
};

const contentStyle: React.CSSProperties = {
  padding: '42px',
  maxWidth: '980px',
};

const eyebrowStyle: React.CSSProperties = {
  color: neon,
  fontSize: '12px',
  fontWeight: 900,
  letterSpacing: '0.3em',
  textTransform: 'uppercase',
};

const titleStyle: React.CSSProperties = {
  fontSize: 'clamp(38px, 5vw, 64px)',
  lineHeight: '1',
  fontWeight: 900,
  margin: '0 0 26px',
};

const textStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.68)',
  lineHeight: '1.75',
};

const typeBadge: React.CSSProperties = {
  background: neon,
  color: '#000',
  borderRadius: '999px',
  padding: '7px 10px',
  fontSize: '11px',
  fontWeight: 900,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
};

const softBadge: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.14)',
  color: 'rgba(255,255,255,0.72)',
  borderRadius: '999px',
  padding: '7px 10px',
  fontSize: '11px',
  fontWeight: 900,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
};

const mediaBlockStyle: React.CSSProperties = {
  borderRadius: '28px',
  overflow: 'hidden',
  border: '1px solid rgba(0,255,65,0.22)',
  background: 'rgba(255,255,255,0.045)',
  marginBottom: '22px',
  boxShadow: '0 0 60px rgba(0,255,65,0.06)',
};

const iframeStyle: React.CSSProperties = {
  width: '100%',
  aspectRatio: '16 / 9',
  border: 'none',
  display: 'block',
};

const videoStyle: React.CSSProperties = {
  width: '100%',
  display: 'block',
  background: '#000',
};

const audioBlockStyle: React.CSSProperties = {
  borderRadius: '24px',
  border: '1px solid rgba(0,255,65,0.22)',
  background: 'rgba(255,255,255,0.045)',
  padding: '22px',
  marginBottom: '22px',
};

const pdfBlockStyle: React.CSSProperties = {
  borderRadius: '24px',
  border: '1px solid rgba(0,255,65,0.22)',
  background: 'rgba(255,255,255,0.045)',
  padding: '22px',
  marginBottom: '22px',
};

const pdfFrameStyle: React.CSSProperties = {
  width: '100%',
  height: '680px',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '18px',
  background: '#111',
};

const mediaLabelStyle: React.CSSProperties = {
  margin: '0 0 14px',
  color: neon,
  fontSize: '12px',
  fontWeight: 900,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
};

const lessonContentStyle: React.CSSProperties = {
  borderRadius: '28px',
  border: '1px solid rgba(0,255,65,0.22)',
  background: 'rgba(255,255,255,0.045)',
  padding: '28px',
  color: 'rgba(255,255,255,0.78)',
  fontSize: '17px',
  lineHeight: '1.85',
  boxShadow: '0 0 60px rgba(0,255,65,0.06)',
};

const noticeStyle: React.CSSProperties = {
  borderRadius: '22px',
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.035)',
  padding: '18px',
  color: 'rgba(255,255,255,0.64)',
  marginBottom: '22px',
};

const navigationStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '16px',
  marginTop: '28px',
};

const primaryNavButton: React.CSSProperties = {
  borderRadius: '22px',
  border: '1px solid rgba(0,255,65,0.55)',
  background: neon,
  color: '#000',
  padding: '18px',
  textDecoration: 'none',
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
};

const secondaryNavButton: React.CSSProperties = {
  borderRadius: '22px',
  border: '1px solid rgba(0,255,65,0.28)',
  background: 'rgba(255,255,255,0.04)',
  color: neon,
  padding: '18px',
  textDecoration: 'none',
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
};

const disabledNavButton: React.CSSProperties = {
  borderRadius: '22px',
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.025)',
  color: 'rgba(255,255,255,0.32)',
  padding: '18px',
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
};

const navLessonTitle: React.CSSProperties = {
  display: 'block',
  marginTop: '8px',
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '0',
  textTransform: 'none',
  opacity: 0.72,
};
