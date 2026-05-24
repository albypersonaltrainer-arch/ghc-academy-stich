'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import GHCLogo from '../components/GHCLogo';

type AnyRecord = Record<string, any>;
type Tab = 'dashboard' | 'cursos' | 'curriculum' | 'examenes' | 'certificados' | 'perfil';
type ViewModo = 'grid' | 'list';
type CourseEstadoFilter = 'active' | 'completadod' | 'all';
type SortModo = 'recent' | 'title' | 'progress';

type PanelCard = {
  course: AnyRecord;
  courseModules: AnyRecord[];
  courseLessons: AnyRecord[];
  completadodLessonCount: number;
  completadodModuleCount: number;
  completion?: AnyRecord;
  certificate?: AnyRecord;
  progressPercent: number;
  nextLesson: AnyRecord | null;
};

type ModuleView = {
  module: AnyRecord;
  index: number;
  lessons: AnyRecord[];
  completadodLecciones: number;
  progress: number;
  isCompletado: boolean;
  isCurrent: boolean;
  isBloqueado: boolean;
  href: string;
};


type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  time: string;
  unread: boolean;
  href?: string;
};


type IconName =
  | 'home' | 'dashboard' | 'courses' | 'curriculum' | 'exam' | 'certificate'
  | 'performance' | 'resources' | 'support' | 'logout' | 'clock' | 'chart'
  | 'document' | 'lock' | 'check' | 'arrow' | 'bell' | 'shield' | 'star'
  | 'user' | 'search' | 'grid' | 'list' | 'bookmark' | 'box' | 'play'
  | 'audio' | 'pdf' | 'text' | 'trophy' | 'target' | 'chat' | 'flame';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const GREEN = '#63E546';
const COURSE_ASSETS_BUCKET = 'ghc-course-assets';

const tabs: { id: Tab; label: string; helper: string; icon: IconName }[] = [
  { id: 'dashboard', label: 'Panel', helper: 'Resumen', icon: 'dashboard' },
  { id: 'cursos', label: 'Mis cursos', helper: 'Cursos activos', icon: 'courses' },
  { id: 'curriculum', label: 'Itinerario', helper: 'Módulos', icon: 'curriculum' },
  { id: 'examenes', label: 'Simulador de exámenes', helper: 'Evaluación', icon: 'exam' },
  { id: 'certificados', label: 'Certificados', helper: 'Credenciales', icon: 'certificate' },
  { id: 'perfil', label: 'Rendimiento', helper: 'Perfil', icon: 'performance' },
];

export default function AlumnoPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [viewModo, setViewModo] = useState<ViewModo>('grid');
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [courseEstadoFilter, setCourseEstadoFilter] = useState<CourseEstadoFilter>('active');
  const [levelFilter, setLevelFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortModo, setSortModo] = useState<SortModo>('recent');
  const [selectedItinerarioCourseId, setSelectedItinerarioCourseId] = useState('');
  const [selectedItinerarioModuleId, setSelectedItinerarioModuleId] = useState('');

  const [user, setUser] = useState<AnyRecord | null>(null);
  const [profile, setProfile] = useState<AnyRecord | null>(null);
  const [courses, setCourses] = useState<AnyRecord[]>([]);
  const [modules, setModules] = useState<AnyRecord[]>([]);
  const [lessons, setLessons] = useState<AnyRecord[]>([]);
  const [lessonProgreso, setLessonProgreso] = useState<AnyRecord[]>([]);
  const [moduleCompletions, setModuleCompletions] = useState<AnyRecord[]>([]);
  const [courseCompletions, setCourseCompletions] = useState<AnyRecord[]>([]);
  const [certificates, setCertificates] = useState<AnyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemMessage, setSystemMessage] = useState('');

  useEffect(() => {
    async function loadPanel() {
      try {
        setLoading(true);
        setSystemMessage('');

        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError || !userData.user) {
          router.replace('/acceso');
          return;
        }

        const activeUser = userData.user as AnyRecord;
        setUser(activeUser);

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', activeUser.id)
          .maybeSingle();

        setProfile(profileData || null);

        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('*');

        if (coursesError) {
          console.error(coursesError);
          setSystemMessage('No se pudieron cargar los cursos.');
          setCourses([]);
          return;
        }

        const visibleCursos = Array.isArray(coursesData)
          ? coursesData
              .filter(isVisibleCourse)
              .sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')))
          : [];

        setCourses(visibleCursos);

        const courseIds = visibleCursos.map((course) => course.id).filter(Boolean);

        if (courseIds.length > 0) {
          const { data: modulesData } = await supabase
            .from('modules')
            .select('*')
            .in('course_id', courseIds);

          const finalMódulos = Array.isArray(modulesData) ? [...modulesData].sort(sortMódulos) : [];
          setModules(finalMódulos);

          const moduleIds = finalMódulos.map((module) => module.id).filter(Boolean);

          if (moduleIds.length > 0) {
            const { data: lessonsData } = await supabase
              .from('lessons')
              .select('*')
              .in('module_id', moduleIds);

            setLessons(Array.isArray(lessonsData) ? [...lessonsData].sort(sortLecciones) : []);
          } else {
            setLessons([]);
          }
        } else {
          setModules([]);
          setLessons([]);
        }

        const { data: progressData } = await supabase
          .from('lesson_progress')
          .select('*')
          .eq('user_id', activeUser.id)
          .eq('completadod', true);

        setLessonProgreso(Array.isArray(progressData) ? progressData : []);

        const { data: moduleCompletionData } = await supabase
          .from('module_completions')
          .select('*')
          .eq('user_id', activeUser.id)
          .eq('completadod', true);

        setModuleCompletions(Array.isArray(moduleCompletionData) ? moduleCompletionData : []);

        const { data: courseCompletionData } = await supabase
          .from('course_completions')
          .select('*')
          .eq('user_id', activeUser.id)
          .eq('completadod', true);

        setCourseCompletions(Array.isArray(courseCompletionData) ? courseCompletionData : []);

        const { data: certificatesData } = await supabase
          .from('certificates')
          .select('*')
          .eq('user_id', activeUser.id)
          .eq('status', 'valid');

        setCertificates(Array.isArray(certificatesData) ? certificatesData : []);
      } catch (error) {
        console.error(error);
        setSystemMessage('Error cargando el panel del alumno.');
      } finally {
        setLoading(false);
      }
    }

    loadPanel();
  }, [router]);

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email ||
    'Alumno GHC Academy';

  const courseCards = useMemo<PanelCard[]>(() => {
    return courses.map((course) => {
      const courseModules = modules
        .filter((module) => String(module.course_id) === String(course.id))
        .sort(sortMódulos);

      const courseLessons = lessons
        .filter((lesson) =>
          courseModules.some((module) => String(module.id) === String(lesson.module_id))
        )
        .sort(sortLecciones);

      const completadodLessonCount = courseLessons.filter((lesson) =>
        lessonProgreso.some((progress) => String(progress.lesson_id) === String(lesson.id))
      ).length;

      const completadodModuleCount = courseModules.filter((module) =>
        moduleCompletions.some((completion) => String(completion.module_id) === String(module.id))
      ).length;

      const completion = courseCompletions.find(
        (item) => String(item.course_id) === String(course.id)
      );

      const certificate = certificates.find(
        (item) => String(item.course_id) === String(course.id)
      );

      const progressPercent =
        courseLessons.length > 0
          ? Math.round((completadodLessonCount / courseLessons.length) * 100)
          : completion
            ? 100
            : 0;

      const nextLesson = findNextLesson({
        courseModules,
        courseLessons,
        lessonProgreso,
        moduleCompletions,
      });

      return {
        course,
        courseModules,
        courseLessons,
        completadodLessonCount,
        completadodModuleCount,
        completion,
        certificate,
        progressPercent,
        nextLesson,
      };
    });
  }, [
    courses,
    modules,
    lessons,
    lessonProgreso,
    moduleCompletions,
    courseCompletions,
    certificates,
  ]);

  const activeCursos = courseCards.filter((card) => !card.completion);
  const completadodCursos = courseCards.filter((card) => Boolean(card.completion));

  const mainCourse = useMemo(() => {
    return (
      activeCursos.find((card) => card.courseModules.length > 0) ||
      completadodCursos.find((card) => card.courseModules.length > 0) ||
      courseCards[0] ||
      null
    );
  }, [activeCursos, completadodCursos, courseCards]);

  const curriculumCourse = useMemo(() => {
    if (selectedItinerarioCourseId) {
      const selected = courseCards.find(
        (card) => String(card.course.id) === String(selectedItinerarioCourseId)
      );
      if (selected) return selected;
    }
    return mainCourse || courseCards[0] || null;
  }, [courseCards, mainCourse, selectedItinerarioCourseId]);

  const moduleViews = useMemo<ModuleView[]>(() => {
    if (!mainCourse) return [];
    return buildModuleViews({
      courseCard: mainCourse,
      lessonProgreso,
      moduleCompletions,
    });
  }, [mainCourse, lessonProgreso, moduleCompletions]);

  const currentModuleView =
    moduleViews.find((item) => item.isCurrent) ||
    moduleViews.find((item) => !item.isBloqueado && !item.isCompletado) ||
    moduleViews[0] ||
    null;

  const curriculumModuleViews = useMemo<ModuleView[]>(() => {
    if (!curriculumCourse) return [];
    return buildModuleViews({
      courseCard: curriculumCourse,
      lessonProgreso,
      moduleCompletions,
    });
  }, [curriculumCourse, lessonProgreso, moduleCompletions]);

  const curriculumActivosModule = useMemo(() => {
    if (selectedItinerarioModuleId) {
      const selected = curriculumModuleViews.find(
        (item) => String(item.module.id) === String(selectedItinerarioModuleId)
      );

      if (selected) return selected;
    }

    return (
      curriculumModuleViews.find((item) => item.isCurrent) ||
      curriculumModuleViews.find((item) => !item.isBloqueado && !item.isCompletado) ||
      curriculumModuleViews[0] ||
      null
    );
  }, [curriculumModuleViews, selectedItinerarioModuleId]);

  const curriculumLecciones = curriculumActivosModule?.lessons || [];

  useEffect(() => {
    setSelectedItinerarioModuleId('');
  }, [selectedItinerarioCourseId]); // reset selected curriculum module when course changes


  const totalLecciones = courseCards.reduce((acc, card) => acc + card.courseLessons.length, 0);
  const completadodLeccionesVisible = courseCards.reduce(
    (acc, card) => acc + card.completadodLessonCount,
    0
  );

  const globalProgreso =
    totalLecciones > 0 ? Math.round((completadodLeccionesVisible / totalLecciones) * 100) : 0;

  const stats = {
    courses: courses.length,
    lessons: completadodLeccionesVisible,
    modules: moduleCompletions.length,
    completadodCursos: courseCompletions.length,
    certificates: certificates.length,
    globalProgreso,
  };

  const availableNivels = useMemo(() => {
    return Array.from(
      new Set(
        courseCards
          .map((card) => String(card.course.level || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [courseCards]);

  const availableCategories = useMemo(() => {
    return Array.from(
      new Set(
        courseCards
          .map((card) =>
            String(
              card.course.category ||
                card.course.course_type ||
                card.course.type ||
                card.course.area ||
                ''
            ).trim()
          )
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [courseCards]);

  const filteredCards = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    const filtered = courseCards.filter((card) => {
      const course = card.course;

      const statusOk =
        courseEstadoFilter === 'all' ||
        (courseEstadoFilter === 'active' && !card.completion) ||
        (courseEstadoFilter === 'completadod' && Boolean(card.completion));

      const level = String(course.level || '').trim();
      const category = String(
        course.category || course.course_type || course.type || course.area || ''
      ).trim();

      const levelOk = levelFilter === 'all' || level === levelFilter;
      const categoryOk = categoryFilter === 'all' || category === categoryFilter;

      const searchable = [
        course.title,
        course.subtitle,
        course.description,
        course.category,
        course.course_type,
        course.level,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const searchOk = !search || searchable.includes(search);

      return statusOk && levelOk && categoryOk && searchOk;
    });

    return filtered.sort((a, b) => {
      if (sortModo === 'title') {
        return String(a.course.title || '').localeCompare(String(b.course.title || ''));
      }

      if (sortModo === 'progress') {
        return b.progressPercent - a.progressPercent;
      }

      const aDate = new Date(
        a.course.updated_at || a.course.created_at || a.course.published_at || 0
      ).getTime();

      const bDate = new Date(
        b.course.updated_at || b.course.created_at || b.course.published_at || 0
      ).getTime();

      return bDate - aDate;
    });
  }, [courseCards, searchTerm, courseEstadoFilter, levelFilter, categoryFilter, sortModo]);

  const notifications = useMemo<NotificationItem[]>(() => {
    const nextHref = mainCourse?.course
      ? `/cursos/${getCourseSlug(mainCourse.course)}`
      : '/cursos';

    return [
      {
        id: 'learning',
        title: 'Continúa tu ruta activa',
        message: mainCourse?.course?.title
          ? `Tienes pendiente avanzar en ${mainCourse.course.title}.`
          : 'Tienes cursos disponibles para continuar tu formación.',
        type: 'Formación',
        time: 'Ahora',
        unread: true,
        href: nextHref,
      },
      {
        id: 'certificate',
        title: certificates.length > 0 ? 'Certificado disponible' : 'Certificación pendiente',
        message:
          certificates.length > 0
            ? 'Ya tienes al menos un certificado válido emitido.'
            : 'Completa tu curso y examen final para emitir tu certificado.',
        type: 'Certificados',
        time: 'Hoy',
        unread: certificates.length > 0,
        href: '/alumno',
      },
      {
        id: 'catalog',
        title: 'Catálogo GHC Academy',
        message: 'Explora nuevos cursos y especializaciones disponibles.',
        type: 'Cursos',
        time: 'Esta semana',
        unread: true,
        href: '/cursos',
      },
      {
        id: 'billing',
        title: 'Estado de acceso',
        message: 'Más adelante aquí aparecerán avisos de renovaciones o incidencias de pago.',
        type: 'Pagos',
        time: 'Próximamente',
        unread: false,
      },
    ];
  }, [mainCourse, certificates.length]);

  const unreadNotificaciones = notifications.filter((item) => item.unread).length;

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/acceso');
  }

  if (loading) {
    return (
      <main className="student-page loading-page">
        <GlobalStyles />
        <Background />
        <section className="loading-card">
          <GHCLogo size="md" showText tagline={false} />
          <h1>Cargando panel</h1>
          <p>Preparando cursos, módulos, progreso, certificados y perfil real del alumno.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="student-page">
      <GlobalStyles />
      <Background />

      <aside className="sidebar">
        <div>
          <div className="logo-block">
            <GHCLogo size="md" showText tagline={false} />
          </div>

          <nav className="nav">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? 'nav-item active' : 'nav-item'}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon name={tab.icon} />
                <span>
                  <strong>{tab.label}</strong>
                  <small>{tab.helper}</small>
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div className="user-card">
          <div className="avatar">{getInitials(displayName)}</div>
          <div>
            <strong>{shortName(displayName)}</strong>
            <p>
              Alumno <span>Pro</span>
            </p>
          </div>
          <button type="button" onClick={handleLogout}>
            <Icon name="logout" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <section className="shell">
        <header className="topbar">
          <div className="breadcrumb">
            <Icon name="home" />
            <span>Panel</span>
            <span>›</span>
            <strong>{getCurrentPageLabel(activeTab)}</strong>
          </div>

          <div className="topbar-actions">
            <Link href="/">Inicio</Link>
            <Link href="/cursos">Explorar cursos</Link>

            <div className="notifications">
              <button
                type="button"
                aria-label="Notificaciones"
                onClick={() => setNotificationsOpen((value) => !value)}
              >
                <Icon name="bell" />
                {unreadNotificaciones > 0 && <em>{unreadNotificaciones}</em>}
              </button>

              {notificationsOpen && (
                <div className="notifications-panel">
                  <div className="notifications-header">
                    <div>
                      <p>Avisos del alumno</p>
                      <h3>Notificaciones</h3>
                    </div>
                    <span>{unreadNotificaciones} nuevos</span>
                  </div>

                  {notifications.map((notification) => (
                    <Link
                      key={notification.id}
                      href={notification.href || '#'}
                      className={notification.unread ? 'notification unread' : 'notification'}
                      onClick={() => setNotificationsOpen(false)}
                    >
                      <small>{notification.type}</small>
                      <strong>{notification.title}</strong>
                      <p>{notification.message}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="mini-user">
              <span>{getInitials(displayName)}</span>
            </div>
          </div>
        </header>

        {systemMessage && <div className="notice">{systemMessage}</div>}

        {activeTab === 'dashboard' && (
          <PanelView
            globalProgreso={globalProgreso}
            stats={stats}
            mainCourse={mainCourse}
            moduleViews={moduleViews}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'cursos' && (
          <CursosView
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            courseEstadoFilter={courseEstadoFilter}
            setCourseEstadoFilter={setCourseEstadoFilter}
            levelFilter={levelFilter}
            setLevelFilter={setLevelFilter}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            sortModo={sortModo}
            setSortModo={setSortModo}
            viewModo={viewModo}
            setViewModo={setViewModo}
            availableNivels={availableNivels}
            availableCategories={availableCategories}
            filteredCards={filteredCards}
          />
        )}

        {activeTab === 'curriculum' && (
          <ItinerarioView
            courseCards={courseCards}
            curriculumCourse={curriculumCourse}
            curriculumModuleViews={curriculumModuleViews}
            curriculumActivosModule={curriculumActivosModule}
            curriculumLecciones={curriculumLecciones}
            lessonProgreso={lessonProgreso}
            selectedItinerarioCourseId={selectedItinerarioCourseId}
            setSelectedItinerarioCourseId={setSelectedItinerarioCourseId}
            selectedItinerarioModuleId={selectedItinerarioModuleId}
            setSelectedItinerarioModuleId={setSelectedItinerarioModuleId}
            setSystemMessage={setSystemMessage}
          />
        )}

        {activeTab === 'examenes' && <MockExamsView />}

        {activeTab === 'certificados' && (
          <CertificadosTab certificates={certificates} displayName={displayName} />
        )}

        {activeTab === 'perfil' && (
          <RendimientoTab
            displayName={displayName}
            user={user}
            profile={profile}
            stats={stats}
            certificates={certificates}
            courseCards={courseCards}
          />
        )}
      </section>
    </main>
  );
}

/* ------------------------------ VIEWS ------------------------------ */

function PanelView({
  globalProgreso,
  stats,
  mainCourse,
  moduleViews,
  setActiveTab,
}: {
  globalProgreso: number;
  stats: AnyRecord;
  mainCourse: PanelCard | null;
  moduleViews: ModuleView[];
  setActiveTab: (tab: Tab) => void;
}) {
  return (
    <div className="dashboard-grid">
      <section className="hero-grid">
        <article className="progress-card">
          <h2>Progreso general</h2>

          <div
            className="progress-ring"
            style={{
              background: `conic-gradient(${GREEN} ${globalProgreso * 3.6}deg, rgba(255,255,255,0.095) 0deg)`,
            }}
          >
            <div>
              <strong>{globalProgreso}%</strong>
              <span>Completado</span>
            </div>
          </div>

          <p>Buen trabajo. Sigue consolidando conocimientos y elevando tu rendimiento.</p>

          <div className="mini-stats">
            <MiniStat icon="clock" label="Lecciones" value={stats.lessons} />
            <MiniStat icon="certificate" label="Certificados" value={stats.certificates} />
          </div>
        </article>

        <article className="next-card">
          <div className="next-image" />
          <div className="next-body">
            <small>En progreso</small>
            <h2>{mainCourse?.course?.title || 'Siguiente módulo'}</h2>
            <p>
              {mainCourse?.course?.subtitle ||
                mainCourse?.course?.description ||
                'Continúa con el siguiente paso de tu formación dentro de la academia.'}
            </p>
            <div className="meta-row">
              <MetaItem icon="clock" text="4–5 horas" />
              <MetaItem icon="chart" text={mainCourse?.course?.level || 'Intermedio'} />
              <MetaItem icon="document" text={`${mainCourse?.courseLessons.length || 0} Lecciones`} />
            </div>
            <Link
              href={mainCourse?.course ? `/cursos/${getCourseSlug(mainCourse.course)}` : '/cursos'}
              className="primary-action"
            >
              Continuar formación
              <Icon name="arrow" />
            </Link>
          </div>
        </article>
      </section>

      <Panel title="Itinerario">
        <div className="compact-list">
          {moduleViews.length === 0 ? (
            <EmptyState text="Aún no hay módulos visibles para este curso." />
          ) : (
            moduleViews.slice(0, 6).map((item) => (
              <Link
                key={item.module.id}
                href={item.href}
                className={item.isCurrent ? 'compact-row active' : 'compact-row'}
              >
                <Icon name={item.isCompletado ? 'check' : item.isBloqueado ? 'lock' : 'curriculum'} />
                <span>
                  <small>Módulo {item.index + 1}</small>
                  <strong>{item.module.title || `Módulo ${item.index + 1}`}</strong>
                </span>
                <em>{item.isBloqueado ? 'Bloqueado' : `${item.progress}%`}</em>
              </Link>
            ))
          )}
        </div>
      </Panel>

      <section className="dashboard-bottom">
        <article className="mock-mini">
          <h2>Simulador de exámenes</h2>
          <p>Pon a prueba tus conocimientos en condiciones reales antes de obtener tu certificación final.</p>
          <button type="button" onClick={() => setActiveTab('examenes')}>
            Iniciar simulación
            <Icon name="arrow" />
          </button>
        </article>

        <article className="cert-mini">
          <div />
          <span>
            <small>Credencial oficial</small>
            <h2>Certificados</h2>
            <p>Obtén tu certificado oficial de GHC Academy al completar tu itinerario.</p>
            <button type="button" onClick={() => setActiveTab('certificados')}>
              Ver certificación
              <Icon name="arrow" />
            </button>
          </span>
        </article>
      </section>
    </div>
  );
}

function CursosView({
  searchTerm,
  setSearchTerm,
  courseEstadoFilter,
  setCourseEstadoFilter,
  levelFilter,
  setLevelFilter,
  categoryFilter,
  setCategoryFilter,
  sortModo,
  setSortModo,
  viewModo,
  setViewModo,
  availableNivels,
  availableCategories,
  filteredCards,
}: {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  courseEstadoFilter: CourseEstadoFilter;
  setCourseEstadoFilter: (value: CourseEstadoFilter) => void;
  levelFilter: string;
  setLevelFilter: (value: string) => void;
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
  sortModo: SortModo;
  setSortModo: (value: SortModo) => void;
  viewModo: ViewModo;
  setViewModo: (value: ViewModo) => void;
  availableNivels: string[];
  availableCategories: string[];
  filteredCards: PanelCard[];
}) {
  return (
    <div className="courses-page">
      <section>
        <h1>Mis cursos</h1>
        <p>Continúa tu formación y controla tu progreso en todos tus cursos.</p>
      </section>

      <section className="filters">
        <label>
          <Icon name="search" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar cursos..."
          />
        </label>

        <button
          type="button"
          className={courseEstadoFilter === 'active' ? 'active' : ''}
          onClick={() => setCourseEstadoFilter('active')}
        >
          Activos
        </button>
        <button
          type="button"
          className={courseEstadoFilter === 'completadod' ? 'active' : ''}
          onClick={() => setCourseEstadoFilter('completadod')}
        >
          Completado
        </button>
        <button
          type="button"
          className={courseEstadoFilter === 'all' ? 'active' : ''}
          onClick={() => setCourseEstadoFilter('all')}
        >
          Todos
        </button>

        <select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)}>
          <option value="all">Nivel</option>
          {availableNivels.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>

        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
          <option value="all">Categoría</option>
          {availableCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <span />

        <select value={sortModo} onChange={(event) => setSortModo(event.target.value as SortModo)}>
          <option value="recent">Ordenar: recientes</option>
          <option value="title">Ordenar: título</option>
          <option value="progress">Ordenar: progreso</option>
        </select>

        <div className="view-toggle">
          <button
            type="button"
            className={viewModo === 'grid' ? 'active' : ''}
            onClick={() => setViewModo('grid')}
          >
            <Icon name="grid" />
          </button>
          <button
            type="button"
            className={viewModo === 'list' ? 'active' : ''}
            onClick={() => setViewModo('list')}
          >
            <Icon name="list" />
          </button>
        </div>
      </section>

      <section className="section-title-row">
        <h2>Cursos</h2>
        <p>{filteredCards.length} resultados</p>
      </section>

      {filteredCards.length === 0 ? (
        <EmptyState text="No hay cursos que coincidan con los filtros seleccionados." />
      ) : (
        <div className={viewModo === 'grid' ? 'course-grid' : 'course-list'}>
          {filteredCards.map((card, index) => (
            <PremiumCourseCard
              key={card.course.id}
              card={card}
              index={index}
              mode={viewModo}
              completadod={Boolean(card.completion)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ItinerarioView({
  courseCards,
  curriculumCourse,
  curriculumModuleViews,
  curriculumActivosModule,
  curriculumLecciones,
  lessonProgreso,
  selectedItinerarioCourseId,
  setSelectedItinerarioCourseId,
  selectedItinerarioModuleId,
  setSelectedItinerarioModuleId,
  setSystemMessage,
}: {
  courseCards: PanelCard[];
  curriculumCourse: PanelCard | null;
  curriculumModuleViews: ModuleView[];
  curriculumActivosModule: ModuleView | null;
  curriculumLecciones: AnyRecord[];
  lessonProgreso: AnyRecord[];
  selectedItinerarioCourseId: string;
  setSelectedItinerarioCourseId: (value: string) => void;
  selectedItinerarioModuleId: string;
  setSelectedItinerarioModuleId: (value: string) => void;
  setSystemMessage: (message: string) => void;
}) {
  return (
    <div className="curriculum-page">
      <section className="curriculum-head">
        <div>
          <h1>Itinerario</h1>
          <p>Tu itinerario estructurado hacia el dominio.</p>
        </div>

        <div className="curriculum-side-head">
          <label>
            Curso actual
            <select
              value={selectedItinerarioCourseId || curriculumCourse?.course?.id || ''}
              onChange={(event) => {
                setSelectedItinerarioCourseId(event.target.value);
                setSelectedItinerarioModuleId('');
                setSystemMessage('Curso seleccionado. Ahora elige un módulo para ver sus lecciones.');
              }}
            >
              {courseCards.map((card) => (
                <option key={card.course.id} value={card.course.id}>
                  {card.course.title}
                </option>
              ))}
            </select>
          </label>

          <div className="curriculum-metrics">
            <ItinerarioMetric
              icon="curriculum"
              label="Módulos totales"
              value={curriculumCourse?.courseModules.length || 0}
              helper="Módulos"
            />
            <ItinerarioMetric
              icon="check"
              label="Lecciones completadas"
              value={`${curriculumCourse?.completadodLessonCount || 0}/${
                curriculumCourse?.courseLessons.length || 0
              }`}
              helper={`${curriculumCourse?.progressPercent || 0}% completado`}
            />
            <ItinerarioMetric
              icon="performance"
              label="Etapa actual"
              value={curriculumActivosModule ? `Módulo ${curriculumActivosModule.index + 1}` : '—'}
              helper={
                curriculumActivosModule?.isCurrent
                  ? 'En progreso'
                  : curriculumActivosModule?.isCompletado
                    ? 'Completado'
                    : 'Preparado'
              }
            />
          </div>
        </div>
      </section>

      <section className="curriculum-grid">
        <article className="roadmap-panel">
          <h2>Mapa de módulos</h2>
          <p>Sigue tu avance por cada módulo.</p>

          <div className="roadmap-list">
            {curriculumModuleViews.length === 0 ? (
              <EmptyState text="Aún no hay módulos visibles para este curso." />
            ) : (
              curriculumModuleViews.map((item) => (
                <RoadmapModuleRow
                  key={item.module.id}
                  item={item}
                  course={curriculumCourse?.course}
                  selected={String(curriculumActivosModule?.module?.id || '') === String(item.module.id)}
                  onSelect={() => {
                    setSelectedItinerarioModuleId(String(item.module.id || ''));
                    setSystemMessage(`Módulo seleccionado: ${item.module.title || `Módulo ${item.index + 1}`}`);
                  }}
                />
              ))
            )}
          </div>
        </article>

        <article className="lesson-panel">
          <div className="lesson-panel-top">
            <div>
              <h2>
                {curriculumActivosModule
                  ? `Módulo ${curriculumActivosModule.index + 1}: ${
                      curriculumActivosModule.module.title || 'Módulo actual'
                    }`
                  : 'Lecciones del módulo'}
              </h2>

              <p>
                {curriculumCourse?.course?.subtitle ||
                  curriculumCourse?.course?.description ||
                  'Explora el módulo actual y continúa tu itinerario de aprendizaje.'}
              </p>
            </div>

            <div className="module-progress">
              <strong>{curriculumActivosModule?.progress || 0}%</strong>
              <span>Completado</span>
            </div>
          </div>

          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${curriculumActivosModule?.progress || 0}%` }} />
          </div>

          <div className="lesson-header-row">
            <span>Lecciones</span>
            <span>Tipo</span>
            <span>Estado</span>
          </div>

          <div className="lesson-list">
            {curriculumLecciones.length === 0 ? (
              <EmptyState text="Este módulo todavía no tiene lecciones visibles." />
            ) : (
              curriculumLecciones.slice(0, 8).map((lesson, index) => {
                const completadod = lessonProgreso.some(
                  (progress) => String(progress.lesson_id) === String(lesson.id)
                );

                const active =
                  curriculumCourse?.nextLesson &&
                  String(curriculumCourse.nextLesson.id) === String(lesson.id);

                const locked =
                  curriculumActivosModule?.isBloqueado ||
                  (!completadod && !active && index > (curriculumActivosModule?.completadodLecciones || 0));

                return (
                  <LessonRow
                    key={lesson.id}
                    lesson={lesson}
                    index={index}
                    completadod={completadod}
                    active={Boolean(active)}
                    locked={Boolean(locked)}
                    href={
                      curriculumCourse?.course
                        ? `/cursos/${getCourseSlug(curriculumCourse.course)}/${lesson.id}`
                        : '#'
                    }
                    setSystemMessage={setSystemMessage}
                  />
                );
              })
            )}
          </div>
        </article>
      </section>

      <article className="curriculum-banner">
        <Icon name="trophy" />
        <div>
          <h3>Sé constante, alcanza la excelencia</h3>
          <p>Avanza cada día. Los pequeños pasos construyen grandes resultados.</p>
        </div>
        <Link
          href={curriculumCourse?.course ? `/cursos/${getCourseSlug(curriculumCourse.course)}` : '/cursos'}
        >
          Seguir avanzando
          <Icon name="arrow" />
        </Link>
      </article>
    </div>
  );
}

function MockExamsView() {
  return (
    <div className="mock-page exams-standby-page">
      <section className="mock-header exams-standby-hero">
        <div className="mock-title-block">
          <span>
            <Icon name="target" />
          </span>
          <div>
            <h1>Evaluaciones y exámenes</h1>
            <p>
              La estructura de evaluación de GHC Academy estará dividida en evaluaciones cortas
              por lección y exámenes por módulo. Esta sección queda preparada, pero todavía no
              activa, para no mostrar funciones incompletas al alumno.
            </p>
          </div>
        </div>

        <div className="mock-feature-strip">
          <MockFeature icon="document" title="Evaluaciones de lección" text="Comprobaciones breves de comprensión." />
          <MockFeature icon="exam" title="Exámenes de módulo" text="Evaluación completa al cerrar cada módulo." />
          <MockFeature icon="certificate" title="Examen final" text="Base futura para la certificación." />
        </div>
      </section>

      <section className="exams-standby-grid">
        <article className="exams-standby-card">
          <span><Icon name="document" /></span>
          <h2>Evaluaciones por lección</h2>
          <p>
            Servirán para comprobar si el alumno ha entendido cada lección. Serán cortas,
            didácticas y con feedback inmediato.
          </p>
          <em>Próximamente</em>
        </article>

        <article className="exams-standby-card featured">
          <span><Icon name="exam" /></span>
          <h2>Exámenes por módulo</h2>
          <p>
            Se activarán al completar todas las lecciones de un módulo. Más adelante permitirán
            desbloquear el siguiente bloque del curso.
          </p>
          <em>En desarrollo</em>
        </article>

        <article className="exams-standby-card">
          <span><Icon name="shield" /></span>
          <h2>Certificación final</h2>
          <p>
            Cuando el motor de evaluación esté cerrado, el examen final conectará con la emisión
            de certificados verificables.
          </p>
          <em>Fase posterior</em>
        </article>
      </section>
    </div>
  );
}

function CertificadosTab({
  certificates,
  displayName,
}: {
  certificates: AnyRecord[];
  displayName: string;
}) {
  const issuedCertificate = certificates[0] || null;
  const issuedCount = certificates.length;
  const studentName = String(displayName || '').includes('@')
    ? shortName(displayName)
    : displayName || 'Alumno GHC Academy';

  const heroCourse =
    issuedCertificate?.course_title ||
    issuedCertificate?.course_name ||
    issuedCertificate?.title ||
    'Especialización GHC Academy';

  const certificateCode =
    issuedCertificate?.certificate_code ||
    issuedCertificate?.verification_code ||
    issuedCertificate?.code ||
    'GHC-VERIFY';

  const finalScore =
    issuedCertificate?.final_score ??
    issuedCertificate?.score ??
    issuedCertificate?.grade ??
    '—';

  const issuedDate = issuedCertificate?.issued_at || issuedCertificate?.created_at || '';
  const inProgressCount = issuedCount > 0 ? 1 : 1;
  const lockedCount = issuedCount > 0 ? 1 : 2;

  return (
    <div className="cert-final-page">
      <section className="cert-final-hero">
        <div className="cert-final-copy">
          <p className="cert-final-kicker">Credenciales oficiales</p>
          <h1>Válido. Verificable. Profesional.</h1>
          <p className="cert-final-subtitle">
            Consulta tus credenciales oficiales de GHC Academy, verifica su estado y comparte certificados
            profesionales vinculados a tu progreso real.
          </p>
        </div>

        <div className="cert-final-visual" aria-hidden="true">
          <div className="cert-final-glow" />
          <div className="cert-final-paper">
            <div className="cert-final-paper-logo">GHC Academy</div>
            <div className="cert-final-paper-title">CERTIFICADO</div>
            <div className="cert-final-paper-subtitle">DE LOGRO</div>
            <div className="cert-final-paper-line">Se otorga a</div>
            <div className="cert-final-paper-name">{studentName}</div>
            <div className="cert-final-paper-copy">
              Por completar satisfactoriamente los requisitos de
            </div>
            <div className="cert-final-paper-course">{heroCourse}</div>
            <div className="cert-final-paper-signature" />
            <div className="cert-final-paper-director">Director académico</div>
            <div className="cert-final-paper-id">GHC · SPORT THROUGH SCIENCE</div>
            <div className="cert-final-seal">
              <Icon name="star" />
            </div>
          </div>
        </div>

        <div className="cert-final-trust">
          <div>
            <Icon name="star" />
            <strong>Confiable por profesionales</strong>
            <span>Formación con criterio técnico, estructura y aplicación real.</span>
          </div>
          <div>
            <Icon name="shield" />
            <strong>Credenciales verificables</strong>
            <span>Código único para consulta, validación y trazabilidad.</span>
          </div>
          <div>
            <Icon name="box" />
            <strong>Reconocido en la industria</strong>
            <span>Un distintivo premium para demostrar avance y especialización.</span>
          </div>
        </div>
      </section>

      <section className="cert-final-layout">
        <article className="cert-final-available">
          <div className="cert-final-section-head">
            <div>
              <p className="cert-final-kicker">Credenciales digitales</p>
              <h2>Certificados disponibles</h2>
            </div>
            <span>{issuedCount} emitido{issuedCount === 1 ? '' : 's'}</span>
          </div>

          {issuedCertificate ? (
            <article className="cert-final-issued">
              <div className="cert-final-card-art">
                <div className="cert-final-card-brand">GHC Academy</div>
                <div className="cert-final-card-title">CERTIFICADO</div>
                <div className="cert-final-card-subtitle">Credencial oficial</div>
                <div className="cert-final-card-name">{studentName}</div>
                <div className="cert-final-card-course">{heroCourse}</div>
                <div className="cert-final-card-footer">
                  <span>{certificateCode}</span>
                  <strong>{finalScore === '—' ? 'OK' : `${finalScore}%`}</strong>
                </div>
                <div className="cert-final-card-seal"><Icon name="star" /></div>
              </div>

              <div className="cert-final-card-content">
                <span className="cert-final-pill-issued">Emitido</span>
                <h3>{heroCourse}</h3>
                <p>
                  Has completado los requisitos del curso y aprobado la evaluación final. Tu
                  credencial está lista para consulta, verificación y presentación profesional.
                </p>

                <div className="cert-final-stats">
                  <ProfileStat label="Nota" value={finalScore === '—' ? 'Aprobado' : `${finalScore}%`} />
                  <ProfileStat label="Fecha" value={issuedDate ? formatShortDate(issuedDate) : '—'} />
                  <ProfileStat label="ID credencial" value={certificateCode} />
                </div>

                <div className="cert-final-code">
                  <span>Código de verificación</span>
                  <strong>{certificateCode}</strong>
                </div>

                {issuedCertificate.verification_slug ? (
                  <Link
                    href={`/certificados/${issuedCertificate.verification_slug}`}
                    className="cert-final-primary"
                  >
                    Ver certificado
                    <Icon name="arrow" />
                  </Link>
                ) : (
                  <span className="cert-final-muted">
                    Certificado registrado. El enlace público de verificación se activará desde administración.
                  </span>
                )}
              </div>
            </article>
          ) : (
            <article className="cert-final-empty">
              <div>
                <Icon name="certificate" />
              </div>
              <h3>Aún no hay certificados emitidos</h3>
              <p>
                Cuando completados un curso y apruebes el examen final, tu certificado aparecerá en
                este panel con código de verificación y estado oficial.
              </p>
            </article>
          )}

          <article className="cert-final-locked">
            <div className="cert-final-locked-art">
              <div className="cert-final-locked-bg" />
              <div className="cert-final-locked-brand">GHC Academy</div>
              <div className="cert-final-locked-title">CERTIFICADO</div>
              <div className="cert-final-locked-subtitle">Próxima credencial</div>
              <div className="cert-final-locked-name">Alumno GHC</div>
              <div className="cert-final-locked-course">Especialización pendiente</div>
              <div className="cert-final-locked-line" />
              <div className="cert-final-locked-seal"><Icon name="star" /></div>
              <div className="cert-final-locked-padlock"><Icon name="lock" /></div>
            </div>

            <div className="cert-final-card-content">
              <span className="cert-final-pill-locked">Bloqueado</span>
              <h3>Próxima certificación</h3>
              <p>
                Completa todos los módulos y supera el examen final para desbloquear esta
                credencial oficial de GHC Academy.
              </p>

              <div className="cert-final-progress">
                <div style={{ width: issuedCount > 0 ? '82%' : '34%' }} />
              </div>

              <span className="cert-final-muted">
                Progreso estimado: {issuedCount > 0 ? '82%' : '34%'}
              </span>
            </div>
          </article>

          <button type="button" className="cert-final-all">
            Ver todos los certificados
            <Icon name="arrow" />
          </button>
        </article>

        <aside className="cert-final-right">
          <article className="cert-final-how">
            <p className="cert-final-kicker">Proceso</p>
            <h2>Cómo funciona</h2>

            <div className="cert-final-steps">
              <div>
                <span><Icon name="curriculum" /></span>
                <strong>Completa módulos</strong>
                <p>Avanza en cada bloque del curso.</p>
              </div>
              <div>
                <span><Icon name="exam" /></span>
                <strong>Aprueba examen final</strong>
                <p>Supera la puntuación requerida.</p>
              </div>
              <div>
                <span><Icon name="certificate" /></span>
                <strong>Recibe certificado</strong>
                <p>Obtén tu credencial oficial.</p>
              </div>
              <div>
                <span><Icon name="resources" /></span>
                <strong>Verifica y comparte</strong>
                <p>Presenta tu logro con confianza.</p>
              </div>
            </div>
          </article>

          <article className="cert-final-verify">
            <div className="cert-final-verify-icon">
              <Icon name="shield" />
            </div>
            <div>
              <p className="cert-final-kicker">Seguridad</p>
              <h2>Verificación</h2>
              <p>
                Los certificados de GHC Academy están preparados para validación pública,
                control interno y trazabilidad de credenciales.
              </p>
              <button type="button">
                Verificar certificado
                <Icon name="arrow" />
              </button>
            </div>
          </article>

          <article className="cert-final-status">
            <div className="cert-final-ring">
              <strong>{issuedCount}</strong>
            </div>
            <div>
              <p className="cert-final-kicker">Estado</p>
              <h2>Estado de credenciales</h2>
              <p>Resumen de emisión, avance y credenciales pendientes.</p>
            </div>
            <ul>
              <li><span>Emitidos</span><strong>{issuedCount}</strong></li>
              <li><span>En progreso</span><strong>{inProgressCount}</strong></li>
              <li><span>Bloqueados</span><strong>{lockedCount}</strong></li>
            </ul>
          </article>
        </aside>
      </section>
    </div>
  );
}


function RendimientoTab({
  displayName,
  user,
  profile,
  stats,
  certificates,
  courseCards,
}: {
  displayName: string;
  user: AnyRecord | null;
  profile: AnyRecord | null;
  stats: AnyRecord;
  certificates: AnyRecord[];
  courseCards: PanelCard[];
}) {
  const email = String(user?.email || profile?.email || 'alumno@ghcacademy.com');
  const role = String(profile?.role || 'student');
  const completadodCourses = Number(stats.completadodCursos || 0);
  const modulesCompleted = Number(stats.modules || 0);
  const certificatesCount = Number(stats.certificates || certificates.length || 0);
  const progress = Math.max(0, Math.min(100, Number(stats.globalProgreso || 0)));
  const totalLessonsCompleted = Number(stats.lessons || 0);
  const activeCourses = Math.max(0, Number(stats.courses || 0) - completadodCourses);
  const learningHours = Math.max(1, Math.round((totalLessonsCompleted || 1) * 0.75));
  const quizzesPassed = Math.max(0, Math.min(100, progress || (completadodCourses ? 86 : 0)));
  const currentStreak = Math.max(1, Math.min(21, totalLessonsCompleted + certificatesCount + 3));
  const topCourses = [...courseCards]
    .sort((a, b) => b.progressPercent - a.progressPercent)
    .slice(0, 3);
  const recentCertificates = certificates.slice(0, 3);

  const progressPoints = [16, 24, 24, 35, 36, 46, 45, 55, 60, 60, 66, 66, 72, Math.max(74, progress)];
  const sparklinePath = progressPoints
    .map((value, index) => `${index === 0 ? 'M' : 'L'} ${24 + index * 38} ${150 - value * 1.18}`)
    .join(' ');
  const sparklineArea = `${sparklinePath} L ${24 + (progressPoints.length - 1) * 38} 168 L 24 168 Z`;

  return (
    <div className="performance-pro-page">
      <section className="performance-pro-header">
        <div>
          <div className="performance-pro-breadcrumb">
            <Icon name="home" />
            <span>Panel</span>
            <span>›</span>
            <strong>Rendimiento</strong>
          </div>
          <h1>Perfil de rendimiento</h1>
          <p>Analiza tu progreso, logros y evolución académica dentro de GHC Academy.</p>
        </div>

        <article className="performance-pro-quote">
          <strong>“</strong>
          <span>El éxito es la suma de pequeños esfuerzos repetidos cada día.</span>
          <em>— Robert Collier</em>
        </article>
      </section>

      <section className="performance-profile-card">
        <div className="performance-profile-main">
          <div className="performance-avatar-wrap">
            <div className="performance-avatar-large">{getInitials(displayName)}</div>
            <span className="performance-verified"><Icon name="check" /></span>
          </div>
          <div>
            <div className="performance-name-row">
              <h2>{displayName}</h2>
              <span>Pro</span>
            </div>
            <p>{email}</p>
            <p>{role === 'student' ? 'Alumno' : role} · GHC Academy</p>
            <p className="performance-enrolled"><Icon name="clock" /> Inscrito · {formatShortDate(profile?.created_at || user?.created_at || new Date().toISOString())}</p>
          </div>
        </div>

        <div className="performance-profile-goals">
          <Icon name="target" />
          <div>
            <h3>Mis objetivos</h3>
            <p>Convertirte en un profesional certificado dominando anatomía, fisiología, entrenamiento y criterio aplicado.</p>
            <button type="button"><Icon name="performance" /> Editar objetivos</button>
          </div>
        </div>

        <div className="performance-profile-status">
          <div>
            <Icon name="shield" />
            <h3>Estado de la cuenta</h3>
          </div>
          <strong><Icon name="check" /> Activa</strong>
          <p>Tu cuenta está activa y con acceso completo a las funciones disponibles.</p>
          <span>Plan: <b>Alumno Pro</b></span>
        </div>
      </section>

      <section className="performance-metrics-strip">
        <PerformanceMetric icon="clock" label="Tiempo total de estudio" value={`${learningHours}h ${totalLessonsCompleted ? '30m' : '00m'}`} trend="+12% vs últimos 30 días" />
        <PerformanceMetric icon="courses" label="Cursos completados" value={completadodCourses} trend={`+${completadodCourses || 0} vs últimos 30 días`} />
        <PerformanceMetric icon="box" label="Módulos completados" value={modulesCompleted} trend={`+${modulesCompleted || 0} vs últimos 30 días`} />
        <PerformanceMetric icon="check" label="Exámenes aprobados" value={`${quizzesPassed}%`} trend="+8% vs últimos 30 días" />
        <PerformanceMetric icon="flame" label="Racha actual" value={`${currentStreak} días`} trend="Sigue así" accent="gold" />
      </section>

      <section className="performance-pro-grid">
        <div className="performance-main-column">
          <article className="performance-progress-card">
          <div className="performance-card-header">
            <div>
              <h2>Resumen del progreso académico</h2>
              <p>Evolución general de tu rendimiento académico en el tiempo.</p>
            </div>
            <button type="button">Últimos 30 días</button>
          </div>

          <div className="performance-chart-wrap">
            <svg viewBox="0 0 560 190" className="performance-chart" aria-hidden="true">
              <defs>
                <linearGradient id="performanceArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(99,229,70,.46)" />
                  <stop offset="100%" stopColor="rgba(99,229,70,0)" />
                </linearGradient>
              </defs>
              {[0, 25, 50, 75, 100].map((line) => (
                <line key={line} x1="24" x2="536" y1={168 - line * 1.36} y2={168 - line * 1.36} />
              ))}
              {[0, 1, 2, 3, 4, 5, 6].map((line) => (
                <line key={line} x1={24 + line * 82} x2={24 + line * 82} y1="26" y2="168" />
              ))}
              <path d={sparklineArea} fill="url(#performanceArea)" />
              <path d={sparklinePath} fill="none" stroke={GREEN} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={24 + (progressPoints.length - 1) * 38} cy={150 - progressPoints[progressPoints.length - 1] * 1.18} r="6" />
            </svg>
            <div className="performance-chart-tooltip">{Math.max(75, progress)}%</div>
          </div>

          <div className="performance-rings-row">
            <PerformanceRing label="Progreso global" value={progress} trend="+15%" />
            <PerformanceRing label="Tareas" value={Math.max(82, progress)} trend="+10%" />
            <PerformanceRing label="Evaluaciones" value={Math.max(78, quizzesPassed)} trend="+12%" />
            <PerformanceRing label="Constancia" value={Math.max(70, Math.min(100, progress + 8))} trend="+8%" />
          </div>

          <div className="performance-insight-row">
            <Icon name="trophy" />
            <span>Gran trabajo. Has mostrado una mejora constante este mes.</span>
            <button type="button">Ver analítica detallada <Icon name="arrow" /></button>
          </div>
        </article>

          <article className="performance-top-courses-card performance-under-progress">
            <div className="performance-card-header compact">
              <h2>Cursos con mayor avance</h2>
              <button type="button">Ver todo</button>
            </div>
            <div className="performance-course-rank-list">
              {(topCourses.length ? topCourses : courseCards.slice(0, 3)).map((card, index) => (
                <div className="performance-course-rank" key={card.course.id || index}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{card.course.title || `Curso GHC ${index + 1}`}</strong>
                    <div><i style={{ width: `${Math.max(8, card.progressPercent)}%` }} /></div>
                  </div>
                  <em>{card.progressPercent}%</em>
                </div>
              ))}
              {topCourses.length === 0 && (
                <div className="performance-course-rank">
                  <span>1</span>
                  <div>
                    <strong>Fundamentos de biomecánica</strong>
                    <div><i style={{ width: '100%' }} /></div>
                  </div>
                  <em>100%</em>
                </div>
              )}
            </div>
            <div className="performance-total-row">
              <span>Total completado</span>
              <strong>{completadodCourses || 12} cursos</strong>
            </div>
          </article>
        </div>

        <aside className="performance-side-column">
          <article className="performance-cert-card">
            <div className="performance-card-header compact">
              <h2>Certificados obtenidos</h2>
              <button type="button">Ver todo</button>
            </div>
            <div className="performance-cert-list">
              {recentCertificates.length > 0 ? (
                recentCertificates.map((certificate, index) => (
                  <div className="performance-cert-row" key={certificate.id || certificate.certificate_code || index}>
                    <div className="performance-medal">{index + 1}</div>
                    <div>
                      <strong>{certificate.course_title || certificate.title || `Certificado nivel ${index + 1}`}</strong>
                      <p>{certificate.issuer || 'GHC Academy'}</p>
                      <span>Emitido el {certificate.issued_at ? formatShortDate(certificate.issued_at) : '—'}</span>
                    </div>
                    <em><Icon name="check" /> Verificado</em>
                  </div>
                ))
              ) : (
                [
                  ['Certificado Nivel 1', 'Emitido el 20 may 2024'],
                  ['Fundamentos de biomecánica', 'Emitido el 28 abr 2024'],
                  ['Sistemas energéticos', 'Emitido el 10 abr 2024'],
                ].map(([title, date], index) => (
                  <div className="performance-cert-row ghost" key={title}>
                    <div className="performance-medal">{index + 1}</div>
                    <div>
                      <strong>{title}</strong>
                      <p>GHC Academy</p>
                      <span>{date}</span>
                    </div>
                    <em><Icon name="check" /> Verificado</em>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="performance-activity-card">
            <div className="performance-card-header compact">
              <h2>Actividad académica reciente</h2>
              <button type="button">Ver todo</button>
            </div>
            <div className="performance-timeline">
              {[
                `Examen completado: ${topCourses[0]?.course?.title || 'Adaptaciones neuromusculares'}`,
                `Módulo completado ${modulesCompleted || 3}: ${topCourses[0]?.course?.title || 'Adaptaciones neuromusculares'}`,
                certificatesCount > 0 ? 'Certificado obtenido: Certificado Nivel 1' : 'Certificado pendiente: completa el examen final',
                `Curso iniciado: ${topCourses[1]?.course?.title || 'Mecánica de la hipertrofia'}`,
              ].map((activity, index) => (
                <div className="performance-timeline-item" key={`${activity}-${index}`}>
                  <span />
                  <div>
                    <strong>{activity}</strong>
                    <p>{index === 0 ? 'Hoy a las 10:24' : index === 1 ? 'Ayer a las 15:45' : '20 may 2024 a las 09:15'}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>


          <article className="performance-security-card">
            <div className="performance-card-header compact">
              <h2>Hoja de ruta de cuenta y seguridad</h2>
            </div>
            <div className="performance-security-list">
              <PerformanceSecurityItem icon="shield" title="Email Verificado" text={email} status="check" />
              <PerformanceSecurityItem icon="lock" title="Autenticación de dos factores" text="Añade una capa extra de seguridad" action="Activar" />
              <PerformanceSecurityItem icon="user" title="Actualizar contraseña" text="Última actualización hace 45 días" action="Actualizar" />
              <PerformanceSecurityItem icon="performance" title="Preferencias de aprendizaje" text="Personaliza tu experiencia" action="Gestionar" />
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
}

function PerformanceMetric({
  icon,
  label,
  value,
  trend,
  accent,
}: {
  icon: IconName;
  label: string;
  value: string | number;
  trend: string;
  accent?: 'gold';
}) {
  return (
    <article className="performance-metric-card">
      <span className={accent === 'gold' ? 'gold' : ''}><Icon name={icon} /></span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <em>{trend}</em>
      </div>
    </article>
  );
}

function PerformanceRing({ label, value, trend }: { label: string; value: number; trend: string }) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className="performance-mini-ring-item">
      <div
        className="performance-mini-ring"
        style={{ background: `conic-gradient(${GREEN} ${safeValue * 3.6}deg, rgba(255,255,255,.10) 0deg)` }}
      >
        <strong>{safeValue}%</strong>
      </div>
      <span>{label}</span>
      <em>{trend}</em>
    </div>
  );
}

function PerformanceSecurityItem({
  icon,
  title,
  text,
  status,
  action,
}: {
  icon: IconName;
  title: string;
  text: string;
  status?: 'check';
  action?: string;
}) {
  return (
    <div className="performance-security-item">
      <Icon name={icon} />
      <div>
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
      {status === 'check' ? <em><Icon name="check" /></em> : <button type="button">{action}</button>}
    </div>
  );
}

function MockFeature({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <article className="mock-feature">
      <span><Icon name={icon} /></span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </article>
  );
}

function MockMeta({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="mock-meta-item">
      <Icon name={icon} />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function PremiumCourseCard({
  card,
  completadod = false,
  index,
  mode,
}: {
  card: PanelCard;
  completadod?: boolean;
  index: number;
  mode: ViewModo;
}) {
  const course = card.course;
  const href = `/cursos/${getCourseSlug(course)}`;

  return (
    <article className={mode === 'grid' ? 'premium-course-card' : 'premium-course-card-list'}>
      <div
        className={mode === 'grid' ? 'premium-course-image' : 'premium-course-image list'}
        style={{ backgroundImage: getPremiumCourseBackground(course, index) }}
      >
        <div className="premium-image-overlay" />
        <div className="course-top-badges">
          <span className={completadod ? 'completadod-badge' : 'progress-badge'}>
            {completadod ? 'Completado' : 'En progreso'}
          </span>
        </div>
        <span className="bookmark-icon"><Icon name={completadod ? 'check' : 'bookmark'} /></span>
      </div>

      <div className="premium-course-body">
        <h3>{course.title || 'Curso GHC Academy'}</h3>
        <p>{course.subtitle || course.description || 'Formación premium basada en ciencia, estructura y rendimiento.'}</p>

        <div className="premium-stats-grid">
          <PremiumMetric icon="document" value={card.courseLessons.length} label="Lecciones" />
          <PremiumMetric icon="box" value={card.courseModules.length} label="Módulos" />
          <PremiumMetric icon="chart" value={`${card.progressPercent}%`} label="Progreso" />
        </div>

        <div className="card-progress-area">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${card.progressPercent}%` }} />
          </div>
          <span className="progress-text-green">{card.progressPercent}% Completado</span>
        </div>

        <div className="premium-actions">
          <Link href={href} className={completadod ? 'review-button' : 'primary-button-small'}>
            {completadod ? 'Repasar' : 'Continuar'} {!completadod && <Icon name="arrow" />}
          </Link>
          <Link href={`/cursos/${getCourseSlug(course)}`} className="secondary-button-small">
            Detalles
          </Link>
        </div>
      </div>
    </article>
  );
}

function PremiumMetric({ icon, value, label }: { icon: IconName; value: string | number; label: string }) {
  return (
    <div className="premium-metric">
      <div><Icon name={icon} /><strong>{value}</strong></div>
      <span>{label}</span>
    </div>
  );
}

function ItinerarioMetric({ icon, label, value, helper }: { icon: IconName; label: string; value: string | number; helper: string }) {
  return (
    <article className="curriculum-metric">
      <span><Icon name={icon} /></span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <em>{helper}</em>
      </div>
    </article>
  );
}

function RoadmapModuleRow({
  item,
  course,
  selected,
  onSelect,
}: {
  item: ModuleView;
  course?: AnyRecord;
  selected: boolean;
  onSelect: () => void;
}) {
  const title = item.module.title || `Módulo ${item.index + 1}`;

  if (item.isCurrent || selected) {
    return (
      <button type="button" onClick={onSelect} className={selected ? 'roadmap-current-card selected' : 'roadmap-current-card'}>
        <div className="roadmap-current-line" />
        <div className="roadmap-current-content">
          <div className="roadmap-top-badges">
            <span className="module-mini-label">Módulo {item.index + 1}</span>
            <span className="in-progress-mini">{selected ? 'Seleccionado' : 'En progreso'}</span>
          </div>
          <h3>{title}</h3>
          <p>{item.completadodLecciones} of {item.lessons.length} Lecciones Completado</p>
          <div className="progress-track-mini">
            <div className="progress-fill" style={{ width: `${item.progress}%` }} />
          </div>
          <div className="roadmap-bottom-row">
            <span>{item.progress}% Completado</span>
            <span>Ver lecciones <Icon name="arrow" /></span>
          </div>
        </div>
        <div
          className="roadmap-current-image"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(5,7,6,0.02), rgba(5,7,6,0.74)), url(${
              getCourseImage(course || {}) || 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=1200&q=80'
            })`,
          }}
        />
      </button>
    );
  }

  if (item.isBloqueado) {
    return (
      <button type="button" onClick={onSelect} className="roadmap-row locked selectable">
        <div className="roadmap-dot locked"><Icon name="lock" /></div>
        <div className="roadmap-body">
          <p className="module-mini-label muted">Módulo {item.index + 1}</p>
          <h3>{title}</h3>
          <p>{item.lessons.length} Lecciones</p>
        </div>
        <span className="locked-pill">Ver</span>
      </button>
    );
  }

  return (
    <button type="button" onClick={onSelect} className={selected ? 'roadmap-row selected' : 'roadmap-row selectable'}>
      <div className={item.isCompletado ? 'roadmap-dot done' : 'roadmap-dot'}>
        <Icon name={item.isCompletado ? 'check' : 'curriculum'} />
      </div>
      <div className="roadmap-body">
        <p className="module-mini-label">Módulo {item.index + 1}</p>
        <h3>{title}</h3>
        <p>{item.lessons.length} Lecciones</p>
      </div>
      <div className="roadmap-side">
        <strong>{item.isCompletado ? '100%' : `${item.progress}%`}</strong>
        <span>{item.isCompletado ? 'Completado' : 'Ver'}</span>
      </div>
    </button>
  );
}

function LessonRow({
  lesson,
  index,
  completadod,
  active,
  locked,
  href,
  setSystemMessage,
}: {
  lesson: AnyRecord;
  index: number;
  completadod: boolean;
  active: boolean;
  locked: boolean;
  href: string;
  setSystemMessage: (message: string) => void;
}) {
  const contentTipo = getLessonTipo(lesson);
  const icon = getLessonIcon(contentTipo);
  const title = lesson.title || `Lección ${index + 1}`;
  const pdfPath = cleanAssetPath(lesson.pdf_url);
  const videoPath = cleanAssetPath(lesson.video_url);
  const audioPath = cleanAssetPath(lesson.audio_url);
  const hasAssets = Boolean(pdfPath || videoPath || audioPath);
  const statusClass = locked
    ? 'lesson-status locked'
    : completadod
      ? 'lesson-status completadod'
      : active
        ? 'lesson-status active'
        : 'lesson-status pending';

  const statusLabel = locked ? 'Bloqueado' : completadod ? 'Completado' : active ? 'En progreso' : 'Pendiente';

  const mainContent = (
    <>
      <div className="lesson-name-cell">
        <span className={completadod ? 'lesson-icon done' : active ? 'lesson-icon active' : 'lesson-icon'}>
          <Icon name={completadod ? 'check' : icon} />
        </span>
        <div>
          <strong>{`${index + 1}. ${title}`}</strong>
          <p>{lesson.description || lesson.subtitle || lesson.content || 'Contenido académico del módulo'}</p>
        </div>
      </div>
      <span className="lesson-type-pill"><Icon name={icon} /> {contentTipo}</span>
      <span className={statusClass}>{statusLabel}</span>
    </>
  );

  return (
    <article className={active ? 'lesson-row active' : locked ? 'lesson-row locked' : 'lesson-row'}>
      {locked ? (
        <div className="lesson-main-link disabled">{mainContent}</div>
      ) : (
        <Link href={href} className="lesson-main-link">
          {mainContent}
        </Link>
      )}

      {!locked && hasAssets ? (
        <div className="student-asset-actions" aria-label="Recursos privados de la lección">
          {videoPath ? (
            <button type="button" onClick={() => openStudentPrivateAsset(videoPath, setSystemMessage, 'vídeo')}>
              <Icon name="play" />
              Ver vídeo
            </button>
          ) : null}

          {audioPath ? (
            <button type="button" onClick={() => openStudentPrivateAsset(audioPath, setSystemMessage, 'audio')}>
              <Icon name="audio" />
              Oír audio
            </button>
          ) : null}

          {pdfPath ? (
            <button type="button" onClick={() => openStudentPrivateAsset(pdfPath, setSystemMessage, 'PDF')}>
              <Icon name="pdf" />
              Ver PDF
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function CertificateCard({ certificate }: { certificate: AnyRecord }) {
  return (
    <article className="certificate-card">
      <div className="certificate-icon"><Icon name="star" /></div>
      <span className="progress-badge">Certificado válido</span>
      <h3>{certificate.course_title || 'Curso completado'}</h3>
      <div className="profile-grid">
        <ProfileStat label="Nota" value={`${certificate.final_score ?? '—'}%`} />
        <ProfileStat label="Estado" value="Válido" />
        <ProfileStat label="Código" value={certificate.certificate_code || '—'} />
      </div>
      {certificate.verification_slug ? (
        <Link href={`/certificados/${certificate.verification_slug}`} className="primary-action">
          Ver certificado <Icon name="arrow" />
        </Link>
      ) : (
        <p className="empty-text">Certificado registrado sin enlace público.</p>
      )}
    </article>
  );
}

function ProfileStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="profile-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function InfoBlock({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <article className="info-block">
      <span><Icon name={icon} /></span>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <article className="empty-state">
      <p>{text}</p>
    </article>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function MiniStat({ icon, label, value }: { icon: IconName; label: string; value: string | number }) {
  return (
    <div className="mini-stat">
      <span><Icon name={icon} /></span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
    </div>
  );
}

function MetaItem({ icon, text }: { icon: IconName; text: string }) {
  return <span className="meta-item"><Icon name={icon} /> {text}</span>;
}

function Background() {
  return (
    <div className="background" aria-hidden="true">
      <div className="orb-one" />
      <div className="orb-two" />
      <div className="grid-texture" />
    </div>
  );
}

function Icon({ name }: { name: IconName }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true,
  };

  if (name === 'home') return <svg {...common}><path d="m4 11 8-7 8 7v9h-5v-6H9v6H4v-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
  if (name === 'dashboard') return <svg {...common}><path d="M4 13h7V4H4v9Zm9 7h7V4h-7v16ZM4 20h7v-5H4v5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
  if (name === 'courses' || name === 'box') return <svg {...common}><path d="m12 4 8 4-8 4-8-4 8-4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M4 12l8 4 8-4M4 16l8 4 8-4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
  if (name === 'curriculum' || name === 'document') return <svg {...common}><path d="M7 4h7l3 3v13H7V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M14 4v4h4M9 12h6M9 16h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === 'exam') return <svg {...common}><path d="M5 5h14v14H5V5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="m8.5 12 2.1 2.1 4.9-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === 'certificate') return <svg {...common}><path d="M7 4h10v9a5 5 0 0 1-10 0V4Z" stroke="currentColor" strokeWidth="1.8" /><path d="m9 19-1 3 4-2 4 2-1-3" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
  if (name === 'performance' || name === 'chart') return <svg {...common}><path d="M4 19V5M4 19h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M7 15l3-4 3 2 4-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === 'resources' || name === 'list') return <svg {...common}><path d="M5 6h14M5 12h14M5 18h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === 'grid') return <svg {...common}><path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
  if (name === 'support') return <svg {...common}><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" stroke="currentColor" strokeWidth="1.8" /><path d="M9.8 9a2.2 2.2 0 1 1 3.5 1.8c-.8.6-1.3 1-1.3 2.2M12 16h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === 'logout') return <svg {...common}><path d="M10 6H6v12h4M14 8l4 4-4 4M18 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === 'clock') return <svg {...common}><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" stroke="currentColor" strokeWidth="1.8" /><path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === 'lock') return <svg {...common}><path d="M8 10V8a4 4 0 1 1 8 0v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M7 10h10v9H7v-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
  if (name === 'check') return <svg {...common}><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === 'arrow') return <svg {...common}><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === 'bell') return <svg {...common}><path d="M15 17H9m9-2V9a6 6 0 1 0-12 0v6l-2 2h16l-2-2ZM10 20h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === 'shield') return <svg {...common}><path d="M12 3.5 19 6v5.4c0 4.3-2.8 8-7 9.1-4.2-1.1-7-4.8-7-9.1V6l7-2.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
  if (name === 'star') return <svg {...common}><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
  if (name === 'bookmark') return <svg {...common}><path d="M7 4h10v16l-5-3-5 3V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
  if (name === 'search') return <svg {...common}><path d="m20 20-4-4M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === 'play') return <svg {...common}><path d="M8 5.5v13l10-6.5-10-6.5Z" fill="currentColor" /></svg>;
  if (name === 'audio') return <svg {...common}><path d="M5 10v4h3l4 4V6l-4 4H5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === 'pdf') return <svg {...common}><path d="M7 4h7l3 3v13H7V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M9 14h6M9 17h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === 'text') return <svg {...common}><path d="M5 6h14M5 10h14M5 14h10M5 18h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === 'trophy') return <svg {...common}><path d="M8 4h8v3a4 4 0 0 1-8 0V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M8 6H5a3 3 0 0 0 3 3M16 6h3a3 3 0 0 1-3 3M12 11v5M9 20h6M10 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === 'target') return <svg {...common}><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" stroke="currentColor" strokeWidth="1.8" /><path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 12h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === 'chat') return <svg {...common}><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v6A2.5 2.5 0 0 1 17.5 15H9l-5 4V6.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
  if (name === 'flame') return <svg {...common}><path d="M12 21c3.4-1.2 5.5-3.6 5.5-7 0-3-1.6-5.2-4.8-8.6-.1 2.7-1.1 4-2.6 5.3-.2-1.6-1-2.9-2.1-4C6.6 9 5.5 11 5.5 14c0 3.4 2.1 5.8 6.5 7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;

  return <svg {...common}><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}


function cleanAssetPath(value: unknown) {
  const path = String(value || '').trim();
  if (!path || path.toLowerCase() === 'null' || path.toLowerCase() === 'undefined') return '';
  return path;
}

async function openStudentPrivateAsset(
  pathValue: unknown,
  setSystemMessage: (message: string) => void,
  label = 'archivo'
) {
  const path = cleanAssetPath(pathValue);

  if (!path) {
    setSystemMessage(`Esta lección no tiene ${label} asociado.`);
    return;
  }

  if (path.startsWith('http://') || path.startsWith('https://')) {
    window.open(path, '_blank', 'noopener,noreferrer');
    setSystemMessage(`Abriendo ${label} externo.`);
    return;
  }

  setSystemMessage(`Generando acceso privado temporal para ${label}...`);

  const { data, error } = await withAlumnoTimeout(
    supabase.storage.from(COURSE_ASSETS_BUCKET).createSignedUrl(path, 60 * 10),
    12000,
    `Supabase Storage no respondió al generar el acceso privado para ${label}.`
  );

  if (error || !data?.signedUrl) {
    setSystemMessage(
      `${error?.message || 'No se pudo generar el acceso privado temporal.'} Revisa permisos del bucket ${COURSE_ASSETS_BUCKET}.`
    );
    return;
  }

  window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  setSystemMessage(`Acceso privado temporal generado para ${label}. Caduca en 10 minutos.`);
}

function withAlumnoTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);

    Promise.resolve(promise)
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

function formatShortDate(value: string) {
  try {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return '—';
  }
}

function GlobalStyles() {
  return (
    <style>{`
      :root {
        --green: #63e546;
        --green-rgb: 99, 229, 70;
        --bg: #050706;
        --panel: rgba(10, 13, 12, 0.88);
        --white: #f4f6f2;
        --muted: rgba(244, 246, 242, 0.62);
        --soft: rgba(244, 246, 242, 0.44);
        --gold: #d6b25e;
        --danger: #ff5757;
        --warning: #f7c948;
      }

      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: var(--bg); }
      body { color: var(--white); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      a { color: inherit; }
      button, input, select { font: inherit; }
      input::placeholder { color: rgba(244,246,242,.36); }
      select option { background: #080b0a; color: #f4f6f2; }
      select option:checked,
      select option:hover,
      select option:focus {
        background: linear-gradient(135deg, var(--green), #7bee65) !important;
        background-color: var(--green) !important;
        color: #061008 !important;
      }
      select:focus {
        outline: 0;
        border-color: rgba(var(--green-rgb),.42) !important;
        box-shadow: 0 0 0 3px rgba(var(--green-rgb),.12);
      }

      .student-page { min-height: 100vh; background: var(--bg); color: var(--white); position: relative; display: grid; grid-template-columns: 278px minmax(0, 1fr); overflow: visible; }
      .loading-page { display: grid; place-items: center; overflow: hidden; }
      .loading-card { width: min(720px, calc(100vw - 40px)); border-radius: 28px; border: 1px solid rgba(255,255,255,.1); background: linear-gradient(145deg, rgba(255,255,255,.08), rgba(255,255,255,.02)); padding: 34px; position: relative; z-index: 2; box-shadow: 0 28px 90px rgba(0,0,0,.42); }
      .loading-card h1 { margin: 14px 0 0; font-size: clamp(42px, 6vw, 74px); line-height: .92; font-weight: 950; letter-spacing: -.06em; }
      .loading-card p { margin-top: 16px; color: var(--muted); line-height: 1.75; max-width: 620px; }

      .background { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
      .orb-one { position: absolute; width: 520px; height: 520px; border-radius: 999px; top: -200px; left: -160px; background: rgba(var(--green-rgb), .1); filter: blur(100px); }
      .orb-two { position: absolute; width: 520px; height: 520px; border-radius: 999px; right: -250px; top: 120px; background: rgba(120,135,130,.09); filter: blur(110px); }
      .grid-texture { position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.022) 1px, transparent 1px); background-size: 42px 42px; opacity: .42; mask-image: radial-gradient(circle at center, black 0%, transparent 82%); }

      .sidebar { position: sticky; top: 0; height: 100vh; z-index: 2; border-right: 1px solid rgba(255,255,255,.07); background: linear-gradient(180deg, rgba(6,9,8,.97), rgba(3,5,4,.93)); padding: 20px; display: flex; flex-direction: column; justify-content: space-between; }
      .logo-block { display: flex; align-items: center; min-height: 58px; margin-bottom: 20px; }
      .nav { display: grid; gap: 6px; }
      .nav-item { border: 1px solid transparent; background: transparent; color: rgba(244,246,242,.62); display: flex; align-items: center; gap: 14px; width: 100%; padding: 12px 14px; text-align: left; cursor: pointer; border-radius: 0; }
      .nav-item.active { border: 1px solid rgba(var(--green-rgb), .12); background: linear-gradient(90deg, rgba(var(--green-rgb),.18), rgba(var(--green-rgb),.035) 70%, transparent); color: var(--green); box-shadow: inset 3px 0 0 rgba(var(--green-rgb),.95); }
      .nav-item svg { flex-shrink: 0; }
      .nav-item span { display: grid; gap: 3px; }
      .nav-item strong { font-size: 13px; }
      .nav-item small { color: var(--soft); }
      .sidebar-user-box,.user-card { border-radius: 16px; border: 1px solid rgba(255,255,255,.09); background: rgba(255,255,255,.035); padding: 16px; }
      .user-card { display: grid; gap: 12px; }
      .avatar { width: 52px; height: 52px; border-radius: 999px; background: rgba(var(--green-rgb),.11); border: 1px solid rgba(var(--green-rgb),.24); color: var(--green); display: grid; place-items: center; font-weight: 950; }
      .user-card p { margin: 4px 0 0; color: var(--muted); font-size: 13px; }
      .user-card p span { color: var(--green); background: rgba(var(--green-rgb),.12); border-radius: 999px; padding: 2px 7px; font-size: 11px; font-weight: 800; }
      .user-card button { display: inline-flex; align-items: center; gap: 8px; background: transparent; border: 0; color: rgba(244,246,242,.58); padding: 0; cursor: pointer; }

      .shell { position: relative; z-index: 1; padding: 20px; min-width: 0; }
      .topbar { min-height: 58px; display: flex; align-items: center; justify-content: space-between; gap: 18px; margin-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,.06); padding-bottom: 12px; }
      .breadcrumb { display: flex; align-items: center; gap: 10px; color: rgba(244,246,242,.72); font-size: 13px; font-weight: 800; }
      .topbar-actions { display: flex; align-items: center; gap: 16px; position: relative; }
      .topbar-actions a { text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: .12em; font-weight: 850; color: rgba(244,246,242,.65); }
      .topbar-actions a:nth-child(2) { color: var(--green); font-weight: 900; }
      .notifications { position: relative; }
      .notifications > button { width: 40px; height: 40px; border-radius: 999px; border: 1px solid rgba(255,255,255,.09); background: rgba(255,255,255,.035); color: rgba(244,246,242,.75); display: grid; place-items: center; position: relative; cursor: pointer; }
      .notifications em { position: absolute; right: -6px; top: -6px; min-width: 18px; height: 18px; border-radius: 999px; background: var(--green); color: #061008; display: grid; place-items: center; font-size: 10px; font-weight: 950; border: 2px solid #050706; font-style: normal; }
      .notifications-panel { position: absolute; top: 52px; right: 0; width: 360px; border-radius: 20px; border: 1px solid rgba(255,255,255,.12); background: linear-gradient(145deg, rgba(255,255,255,.08), rgba(255,255,255,.03)), rgba(7,10,9,.98); box-shadow: 0 28px 90px rgba(0,0,0,.48); padding: 16px; z-index: 40; backdrop-filter: blur(18px); }
      .notification-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 14px; }
      .notification-header p { margin: 0; color: var(--green); font-size: 10px; text-transform: uppercase; letter-spacing: .18em; font-weight: 900; }
      .notification-header h3 { margin: 6px 0 0; font-size: 20px; letter-spacing: -.03em; font-weight: 900; }
      .notification-header > span { border-radius: 999px; border: 1px solid rgba(var(--green-rgb),.24); background: rgba(var(--green-rgb),.1); color: var(--green); padding: 6px 9px; font-size: 11px; font-weight: 900; }
      .notification { display: block; text-decoration: none; border-radius: 14px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.03); padding: 12px; margin-top: 10px; }
      .notification.unread { border-color: rgba(var(--green-rgb),.18); background: rgba(var(--green-rgb),.055); }
      .notification small { color: var(--green); text-transform: uppercase; letter-spacing: .12em; font-weight: 900; }
      .notification strong { display: block; margin-top: 6px; }
      .notification p { color: var(--muted); margin: 6px 0 0; font-size: 12px; line-height: 1.55; }
      .notification-footer { margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,.08); color: var(--soft); font-size: 11px; }
      .mini-user span { width: 42px; height: 42px; border-radius: 999px; border: 1px solid rgba(var(--green-rgb),.2); background: rgba(var(--green-rgb),.09); color: var(--green); display: grid; place-items: center; font-weight: 900; }

      .notice { margin-bottom: 16px; border-radius: 16px; border: 1px solid rgba(var(--green-rgb),.2); background: rgba(var(--green-rgb),.06); color: var(--muted); padding: 16px; }

      .dashboard-grid,.courses-page,.curriculum-page,.mock-page,.section-stack { display: grid; gap: 16px; }
      .hero-grid { display: grid; grid-template-columns: 340px minmax(0,1fr); gap: 16px; }
      .progress-card,.next-card,.panel,.mock-mini,.cert-mini,.roadmap-panel,.lesson-panel,.mock-feature,.exam-simulator-card,.exam-rules-card,.latest-resultados-card,.readiness-card,.module-exams-card,.analytics-card,.premium-course-card,.premium-course-card-list,.certificate-card { border-radius: 16px; border: 1px solid rgba(255,255,255,.09); background: var(--panel); box-shadow: 0 20px 70px rgba(0,0,0,.16); }
      .progress-card { padding: 20px; }
      .progress-card h2 { margin: 0 0 18px; font-size: 18px; }
      .progress-ring { width: 172px; height: 172px; border-radius: 999px; display: grid; place-items: center; margin: 0 auto 16px; box-shadow: 0 0 42px rgba(var(--green-rgb),.12); }
      .progress-ring > div { width: 124px; height: 124px; border-radius: 999px; background: #080b0a; border: 1px solid rgba(255,255,255,.1); display: grid; place-items: center; text-align: center; align-content: center; }
      .progress-ring strong { display: block; color: var(--white); font-size: 50px; line-height: .88; font-weight: 950; letter-spacing: -.06em; }
      .progress-ring span { display: block; color: rgba(244,246,242,.62); font-size: 11px; text-transform: uppercase; letter-spacing: .1em; font-weight: 850; margin-top: 8px; }
      .progress-card > p { max-width: 270px; color: var(--muted); text-align: center; line-height: 1.6; margin: 8px auto 16px; }
      .mini-stats { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid rgba(255,255,255,.08); border-radius: 12px; overflow: hidden; background: rgba(0,0,0,.18); }
      .mini-stat { display: grid; grid-template-columns: 28px minmax(0,1fr); gap: 10px; padding: 12px; color: var(--muted); align-items: center; }
      .mini-stat > span { width: 28px; height: 28px; border-radius: 999px; display: grid; place-items: center; color: var(--green); background: rgba(var(--green-rgb),.08); border: 1px solid rgba(var(--green-rgb),.18); }
      .mini-stat div { display: grid; gap: 2px; }

      .next-card { min-height: 330px; display: grid; grid-template-columns: .72fr 1fr; overflow: hidden; }
      .next-image { background: linear-gradient(90deg, rgba(5,7,6,.08), rgba(5,7,6,.92)), url(https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=1200&q=80); background-size: cover; background-position: center; filter: grayscale(1) contrast(1.08) brightness(.7); }
      .next-body { padding: 24px; display: flex; flex-direction: column; }
      .next-body small { color: var(--green); text-transform: uppercase; letter-spacing: .16em; font-weight: 900; }
      .next-body h2 { margin: 10px 0 0; font-size: 30px; line-height: 1.05; letter-spacing: -.035em; }
      .next-body p { color: var(--muted); line-height: 1.65; }
      .meta-row { display: flex; gap: 18px; flex-wrap: wrap; margin-top: 18px; color: var(--muted); }
      .meta-item { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; }
      .primary-action,.primary-button-small,.mock-primary-button { display: inline-flex; align-items: center; justify-content: center; gap: 10px; border-radius: 10px; border: 1px solid rgba(var(--green-rgb),.26); background: linear-gradient(135deg, var(--green), #7bee65); color: #061008; text-decoration: none; font-weight: 900; font-size: 13px; box-shadow: 0 0 26px rgba(var(--green-rgb),.16); cursor: pointer; min-height: 42px; padding: 0 18px; width: fit-content; margin-top: auto; }
      .secondary-button,.secondary-button-small,.review-button,.mock-secondary-button,.mock-ghost-button { border-radius: 10px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.045); color: var(--white); display: inline-flex; align-items: center; justify-content: center; gap: 10px; font-weight: 800; cursor: pointer; text-decoration: none; min-height: 40px; padding: 0 16px; }

      .panel { padding: 18px; }
      .panel > h2 { margin: 0 0 16px; font-size: 22px; line-height: 1; font-weight: 900; letter-spacing: -.035em; }
      .compact-list { display: grid; gap: 8px; }
      .compact-row { min-height: 56px; border-radius: 12px; border: 1px solid rgba(255,255,255,.07); background: rgba(255,255,255,.026); display: grid; grid-template-columns: 36px minmax(0,1fr) auto; gap: 12px; align-items: center; padding: 12px 14px; text-decoration: none; color: var(--white); }
      .compact-row.active { border-color: rgba(var(--green-rgb),.4); background: linear-gradient(90deg, rgba(var(--green-rgb),.12), rgba(255,255,255,.025)); }
      .compact-row small { color: var(--green); text-transform: uppercase; letter-spacing: .12em; font-weight: 900; }
      .compact-row strong { display: block; margin-top: 4px; }
      .compact-row em { color: var(--muted); font-style: normal; font-weight: 850; }
      .dashboard-bottom { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .mock-mini { min-height: 238px; padding: 20px; background: linear-gradient(90deg, rgba(11,15,13,.98), rgba(11,15,13,.88)), url(https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80); background-size: cover; background-position: center; display: grid; align-items: center; }
      .cert-mini { min-height: 238px; padding: 20px; position: relative; overflow: hidden; display: flex; align-items: center; }
      .cert-mini > div { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(8,11,10,.98) 0%, rgba(8,11,10,.92) 24%, rgba(8,11,10,.56) 58%, rgba(8,11,10,.18) 100%), url(https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80); background-size: cover; background-position: center; filter: grayscale(.15) contrast(1.02) brightness(.72); }
      .cert-mini > span { position: relative; z-index: 2; max-width: 58%; }
      .cert-mini small { color: var(--gold); text-transform: uppercase; letter-spacing: .16em; font-weight: 900; }
      .cert-mini p,.mock-mini p { color: var(--muted); line-height: 1.65; }
      .mock-mini button,
      .cert-mini button {
        width: fit-content;
        min-height: 42px;
        border-radius: 10px;
        border: 1px solid rgba(var(--green-rgb),.26);
        background: linear-gradient(135deg, var(--green), #7bee65);
        color: #061008;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 0 18px;
        font-weight: 950;
        cursor: pointer;
        box-shadow: 0 0 26px rgba(var(--green-rgb),.16);
      }
      .mock-mini button:hover,
      .cert-mini button:hover {
        transform: translateY(-1px);
        box-shadow: 0 0 34px rgba(var(--green-rgb),.22);
      }

      .filters { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
      .filters label { width: 320px; min-height: 44px; border-radius: 10px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.03); display: flex; align-items: center; gap: 12px; padding: 0 15px; color: rgba(244,246,242,.48); font-size: 13px; }
      .filters input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--white); height: 42px; }
      .filters button,.filters select { min-height: 44px; border-radius: 10px; padding: 0 16px; cursor: pointer; font-weight: 800; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.03); color: rgba(244,246,242,.78); }
      .filters button.active { border-color: rgba(var(--green-rgb),.32); background: rgba(var(--green-rgb),.11); color: var(--green); }
      .filters > span { flex: 1; }
      .view-toggle { height: 44px; border-radius: 10px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.03); display: flex; align-items: center; padding: 4px; gap: 4px; }
      .view-toggle button { width: 34px; height: 34px; min-height: 34px; border: 0; padding: 0; display: grid; place-items: center; }
      .section-title-row { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
      .section-title-row h2 { margin: 0; font-size: 20px; line-height: 1; letter-spacing: -.03em; font-weight: 850; }
      .section-title-row p { color: var(--soft); font-size: 12px; text-transform: uppercase; letter-spacing: .12em; font-weight: 850; }
      .course-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px,1fr)); gap: 16px; }
      .course-list { display: grid; gap: 14px; }
      .premium-course-card { min-height: 386px; overflow: hidden; display: flex; flex-direction: column; }
      .premium-course-card-list { min-height: 216px; overflow: hidden; display: grid; grid-template-columns: 320px minmax(0,1fr); }
      .premium-course-image { height: 160px; background-size: cover; background-position: center; position: relative; filter: grayscale(1) contrast(1.05) brightness(.82); flex-shrink: 0; }
      .premium-course-image.list { height: 100%; min-height: 216px; }
      .premium-image-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(5,7,6,0), rgba(5,7,6,.86)), radial-gradient(circle at top right, rgba(var(--green-rgb),.13), transparent 34%); }
      .course-top-badges { position: absolute; left: 14px; top: 14px; display: flex; gap: 8px; z-index: 2; }
      .progress-badge,.completadod-badge { border-radius: 5px; padding: 6px 9px; font-size: 10px; line-height: 1; letter-spacing: .12em; text-transform: uppercase; font-weight: 900; }
      .progress-badge { border: 1px solid rgba(var(--green-rgb),.34); background: rgba(var(--green-rgb),.12); color: var(--green); }
      .completadod-badge { border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.055); color: rgba(244,246,242,.74); }
      .bookmark-icon { position: absolute; right: 14px; top: 14px; color: rgba(244,246,242,.76); z-index: 2; width: 24px; height: 24px; display: grid; place-items: center; }
      .premium-course-body { padding: 16px; display: flex; flex-direction: column; flex: 1; min-width: 0; }
      .premium-course-body h3 { margin: 0; min-height: 44px; color: var(--white); font-size: 21px; line-height: 1.08; letter-spacing: -.035em; font-weight: 900; }
      .premium-course-body p { margin: 10px 0 0; min-height: 50px; color: var(--muted); font-size: 14px; line-height: 1.55; }
      .premium-stats-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 8px; margin-top: auto; padding-top: 16px; }
      .premium-metric { min-height: 58px; border-radius: 9px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.032); padding: 10px 8px; display: grid; align-content: center; gap: 4px; min-width: 0; }
      .premium-metric div { display: flex; align-items: center; gap: 8px; color: rgba(244,246,242,.78); min-width: 0; }
      .card-progress-area { margin-top: 12px; display: grid; gap: 8px; }
      .premium-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; }

      .curriculum-head { display: grid; grid-template-columns: minmax(0, 280px) minmax(0,1fr); gap: 16px; align-items: start; }
      .curriculum-head h1,.courses-page h1 { margin: 0; font-size: 34px; line-height: 1; letter-spacing: -.05em; font-weight: 900; }
      .curriculum-head p,.courses-page > section p { margin: 10px 0 0; color: var(--muted); font-size: 15px; line-height: 1.6; }
      .curriculum-side-head { display: grid; gap: 12px; }
      .current-course-box, .curriculum-side-head label { display: grid; gap: 6px; max-width: 340px; color: var(--soft); font-size: 12px; font-weight: 800; }
      .curriculum-side-head select { min-height: 42px; border-radius: 10px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.032); color: var(--white); padding: 0 12px; outline: 0; font-weight: 800; }
      .curriculum-metrics { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 12px; }
      .curriculum-metric { min-height: 92px; border-radius: 14px; border: 1px solid rgba(255,255,255,.08); background: var(--panel); padding: 14px; display: flex; gap: 12px; align-items: center; box-shadow: 0 16px 50px rgba(0,0,0,.14); }
      .curriculum-metric > span { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: rgba(var(--green-rgb),.08); border: 1px solid rgba(var(--green-rgb),.18); color: var(--green); flex-shrink: 0; }
      .curriculum-metric div { display: grid; gap: 4px; min-width: 0; }
      .curriculum-metric p { margin: 0; color: var(--soft); font-size: 10px; text-transform: uppercase; letter-spacing: .14em; font-weight: 900; }
      .curriculum-metric strong { color: var(--white); font-size: 26px; line-height: 1; font-weight: 950; letter-spacing: -.04em; }
      .curriculum-metric em { color: var(--green); font-size: 12px; font-weight: 850; font-style: normal; }
      .curriculum-grid { display: grid; grid-template-columns: .93fr 1.07fr; gap: 14px; align-items: start; }
      .roadmap-panel,.lesson-panel { border-radius: 16px; border: 1px solid rgba(255,255,255,.09); background: var(--panel); padding: 16px; box-shadow: 0 20px 70px rgba(0,0,0,.16); }
      .roadmap-panel h2,.lesson-panel h2 { margin: 0; font-size: 18px; line-height: 1.1; font-weight: 900; letter-spacing: -.03em; }
      .roadmap-panel > p,.lesson-panel p { color: var(--muted); font-size: 13px; line-height: 1.5; }
      .roadmap-list { display: grid; gap: 10px; margin-top: 12px; }
      .roadmap-row,.roadmap-row.locked { min-height: 72px; border-radius: 14px; display: grid; grid-template-columns: 30px minmax(0,1fr) 74px; gap: 12px; align-items: center; padding: 12px; text-decoration: none; color: var(--white); }
      .roadmap-row { border: 1px solid rgba(255,255,255,.07); background: rgba(255,255,255,.026); }
      .roadmap-row.locked { border: 1px solid rgba(255,255,255,.05); background: rgba(255,255,255,.016); color: var(--soft); }
      .roadmap-current-card { min-height: 144px; border-radius: 16px; border: 1px solid rgba(var(--green-rgb),.52); background: linear-gradient(100deg, rgba(var(--green-rgb),.12), rgba(255,255,255,.028)); display: grid; grid-template-columns: 10px minmax(0,1fr) 146px; gap: 12px; align-items: stretch; padding: 12px; text-decoration: none; color: var(--white); box-shadow: 0 0 30px rgba(var(--green-rgb),.07); overflow: hidden; }
      .roadmap-current-line { width: 10px; border-radius: 999px; background: linear-gradient(180deg, var(--green), rgba(var(--green-rgb),.08)); }
      .roadmap-current-content { display: grid; align-content: center; gap: 8px; min-width: 0; }
      .roadmap-top-badges { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
      .roadmap-current-content h3 { margin: 0; font-size: 24px; line-height: 1.02; font-weight: 900; letter-spacing: -.04em; max-width: 320px; }
      .roadmap-current-content p,.roadmap-body p { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.45; }
      .roadmap-bottom-row { display: flex; justify-content: space-between; gap: 10px; align-items: center; }
      .roadmap-bottom-row > span:first-child,.progress-text-green { color: var(--green); font-size: 12px; font-weight: 850; }
      .roadmap-bottom-row > span:last-child { display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 999px; background: var(--green); color: #061008; font-size: 12px; font-weight: 900; }
      .roadmap-current-image { border-radius: 12px; background-size: cover; background-position: center; filter: grayscale(1) contrast(1.08) brightness(.76); min-height: 118px; }
      .roadmap-dot { width: 28px; height: 28px; border-radius: 999px; border: 1px solid rgba(255,255,255,.12); display: grid; place-items: center; color: var(--soft); }
      .roadmap-dot.done { border: 1px solid rgba(var(--green-rgb),.28); background: rgba(var(--green-rgb),.08); color: var(--green); }
      .roadmap-dot.locked { border: 1px solid rgba(255,255,255,.08); }
      .roadmap-body { min-width: 0; display: grid; gap: 4px; }
      .roadmap-body h3 { margin: 0; font-size: 18px; line-height: 1.15; font-weight: 850; letter-spacing: -.025em; }
      .roadmap-side { display: grid; gap: 4px; text-align: right; color: var(--muted); font-size: 12px; }
      .module-mini-label { margin: 0; color: var(--green); font-size: 10px; text-transform: uppercase; letter-spacing: .12em; font-weight: 900; }
      .module-mini-label.muted { color: var(--soft); }
      .in-progress-mini { border-radius: 999px; background: rgba(var(--green-rgb),.12); color: var(--green); padding: 3px 8px; text-transform: uppercase; letter-spacing: .12em; font-size: 9px; font-weight: 900; }
      .locked-pill { color: var(--soft); font-size: 12px; font-weight: 800; }

      .lesson-panel .progress-track { margin-top: 12px; }
      .lesson-panel-top,.module-detail-top { display: flex; justify-content: space-between; gap: 14px; align-items: flex-start; }
      .module-progress { min-width: 84px; border-radius: 12px; border: 1px solid rgba(var(--green-rgb),.18); background: rgba(var(--green-rgb),.06); padding: 10px; text-align: center; display: grid; gap: 2px; }
      .lesson-header-row { margin-top: 14px; display: grid; grid-template-columns: minmax(0,1fr) 100px 110px; gap: 12px; color: var(--soft); font-size: 10px; text-transform: uppercase; letter-spacing: .14em; font-weight: 900; padding: 0 10px; }
      .lesson-list { display: grid; gap: 8px; margin-top: 8px; }
      .lesson-link { text-decoration: none; color: inherit; }
      .lesson-row { min-height: 62px; border-radius: 12px; border: 1px solid rgba(255,255,255,.07); background: rgba(255,255,255,.026); display: grid; grid-template-columns: minmax(0,1fr) 100px 110px; gap: 12px; align-items: center; padding: 10px; }
      .lesson-row.active { border-color: rgba(var(--green-rgb),.48); background: linear-gradient(90deg, rgba(var(--green-rgb),.1), rgba(255,255,255,.026)); }
      .lesson-row.locked { border-color: rgba(255,255,255,.05); background: rgba(255,255,255,.014); opacity: .72; }
      .lesson-name-cell { display: flex; gap: 10px; align-items: center; min-width: 0; }
      .lesson-icon { width: 32px; height: 32px; border-radius: 10px; border: 1px solid rgba(255,255,255,.1); display: grid; place-items: center; color: var(--soft); flex-shrink: 0; }
      .lesson-icon.done { border-color: rgba(var(--green-rgb),.26); background: rgba(var(--green-rgb),.08); color: var(--green); }
      .lesson-icon.active { border-color: rgba(var(--green-rgb),.34); background: rgba(var(--green-rgb),.1); color: var(--green); }
      .lesson-name-cell strong { display: block; font-size: 14px; line-height: 1.25; font-weight: 850; }
      .lesson-name-cell p { margin: 4px 0 0; color: var(--muted); font-size: 12px; line-height: 1.4; }
      .lesson-type-pill { display: inline-flex; align-items: center; gap: 7px; color: var(--muted); font-size: 12px; font-weight: 800; }
      .lesson-status { justify-self: start; font-size: 12px; font-weight: 800; }
      .lesson-status.completadod { color: var(--green); font-weight: 900; }
      .lesson-status.active { color: var(--green); background: rgba(var(--green-rgb),.1); border: 1px solid rgba(var(--green-rgb),.2); border-radius: 999px; padding: 6px 9px; font-size: 11px; font-weight: 900; }
      .lesson-status.pending { color: var(--muted); }
      .lesson-status.locked { color: var(--soft); }
      .curriculum-banner { border-radius: 16px; border: 1px solid rgba(255,255,255,.09); background: linear-gradient(90deg, rgba(var(--green-rgb),.1), rgba(255,255,255,.028)); padding: 14px; display: grid; grid-template-columns: 48px minmax(0,1fr) auto; gap: 14px; align-items: center; box-shadow: 0 16px 50px rgba(0,0,0,.14); }
      .curriculum-banner > svg { width: 48px; height: 48px; border-radius: 14px; background: rgba(var(--green-rgb),.1); border: 1px solid rgba(var(--green-rgb),.22); color: var(--green); padding: 13px; }
      .curriculum-banner h3 { margin: 0; font-size: 16px; font-weight: 900; letter-spacing: -.02em; }
      .curriculum-banner p { margin: 6px 0 0; color: var(--muted); font-size: 13px; line-height: 1.45; }
      .curriculum-banner a { color: var(--green); text-decoration: none; display: inline-flex; gap: 8px; align-items: center; font-weight: 900; font-size: 13px; }

      .mock-page { display: grid; gap: 14px; }
      .mock-header { display: grid; grid-template-columns: minmax(0,.9fr) minmax(500px,1fr); gap: 16px; align-items: center; }
      .mock-title-block { display: flex; align-items: flex-start; gap: 14px; }
      .mock-title-block > span { width: 44px; height: 44px; border-radius: 999px; color: var(--green); display: grid; place-items: center; background: rgba(var(--green-rgb),.08); border: 1px solid rgba(var(--green-rgb),.2); flex-shrink: 0; }
      .mock-title-block h1 { margin: 0; font-size: 34px; line-height: .98; font-weight: 950; letter-spacing: -.055em; }
      .mock-title-block p { margin: 10px 0 0; color: var(--muted); line-height: 1.6; font-size: 15px; max-width: 620px; }
      .mock-feature-strip { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 10px; }
      .mock-feature { min-height: 78px; display: flex; gap: 12px; align-items: center; padding: 14px; }
      .mock-feature > span { width: 38px; height: 38px; border-radius: 999px; color: var(--green); display: grid; place-items: center; background: rgba(var(--green-rgb),.08); border: 1px solid rgba(var(--green-rgb),.16); flex-shrink: 0; }
      .mock-feature p { margin: 4px 0 0; color: var(--muted); font-size: 12px; line-height: 1.35; }
      .mock-hero-grid { display: grid; grid-template-columns: minmax(0,1.48fr) minmax(320px,.88fr); gap: 14px; }
      .exam-simulator-card { min-height: 260px; background: linear-gradient(90deg, rgba(11,15,13,.98), rgba(11,15,13,.86)), radial-gradient(circle at 75% 50%, rgba(255,255,255,.06), transparent 26%); display: grid; grid-template-columns: minmax(430px,1fr) minmax(340px,.92fr); overflow: hidden; padding: 20px; }
      .exam-simulator-content { display: grid; align-content: center; gap: 16px; min-width: 0; }
      .exam-title-row { display: flex; align-items: center; gap: 10px; }
      .exam-title-row h2,.exam-rules-title h2,.mock-card-header h2,.analytics-card > h2 { margin: 0; font-size: 21px; font-weight: 900; letter-spacing: -.035em; }
      .exam-title-row span { color: var(--green); background: rgba(var(--green-rgb),.12); border: 1px solid rgba(var(--green-rgb),.24); border-radius: 999px; padding: 5px 8px; text-transform: uppercase; letter-spacing: .12em; font-size: 10px; font-weight: 900; }
      .exam-simulator-content > p { color: var(--muted); line-height: 1.55; max-width: 620px; margin: 0; }
      .exam-meta-grid { display: grid; grid-template-columns: repeat(4,minmax(132px,1fr)); gap: 12px; align-items: stretch; }
      .mock-meta-item {
        min-height: 84px;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,.09);
        background: rgba(255,255,255,.032);
        display: grid;
        grid-template-columns: 42px minmax(0,1fr);
        gap: 12px;
        color: var(--muted);
        align-items: center;
        min-width: 0;
        padding: 14px;
      }
      .mock-meta-item > svg {
        width: 42px;
        height: 42px;
        border-radius: 12px;
        padding: 11px;
        color: var(--green);
        background: rgba(var(--green-rgb),.08);
        border: 1px solid rgba(var(--green-rgb),.18);
      }
      .mock-meta-item div { display: grid; gap: 5px; }
      .mock-meta-item span { font-size: 10px; text-transform: uppercase; letter-spacing: .12em; font-weight: 900; color: var(--soft); }
      .mock-meta-item strong { color: var(--white); font-size: 15px; line-height: 1.2; }
      .exam-action-row { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
      .mock-primary-button { min-height: 46px; border: 0; padding: 0 20px; }
      .mock-ghost-button { min-height: 46px; border: 0; background: transparent; padding: 0; }
      .exam-laptop-visual { position: relative; min-height: 220px; background: linear-gradient(90deg, rgba(5,7,6,.08), rgba(5,7,6,.50)), url(https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80); background-size: cover; background-position: center; border-radius: 14px; filter: grayscale(1) contrast(1.08) brightness(.58); }
      .exam-laptop-screen { position: absolute; right: 32px; top: 32px; width: 180px; height: 116px; border-radius: 8px; border: 1px solid rgba(255,255,255,.2); background: rgba(0,0,0,.64); padding: 12px; color: var(--white); transform: perspective(700px) rotateY(-12deg) rotateX(4deg); display: grid; gap: 6px; }
      .exam-laptop-rows { display: grid; gap: 5px; }
      .exam-laptop-rows i { height: 5px; border-radius: 999px; background: rgba(255,255,255,.16); }
      .exam-rules-card { min-height: 260px; padding: 20px; display: grid; align-content: space-between; }
      .exam-rules-title { display: flex; gap: 12px; align-items: center; }
      .rule-list { display: grid; gap: 10px; margin: 16px 0; }
      .rule-item { display: flex; gap: 10px; align-items: center; color: var(--muted); font-size: 14px; }
      .mock-secondary-button { min-height: 40px; width: fit-content; padding: 0 16px; }
      .mock-middle-grid { display: grid; grid-template-columns: minmax(0,1.05fr) minmax(300px,.85fr) minmax(0,1fr); gap: 14px; }
      .latest-resultados-card,.readiness-card,.module-exams-card,.analytics-card { padding: 18px; }
      .readiness-card { display: grid; }
      .mock-card-header { display: flex; justify-content: space-between; gap: 14px; align-items: center; margin-bottom: 12px; }
      .mock-card-header button { border: 0; background: transparent; color: var(--green); font-size: 12px; font-weight: 850; cursor: pointer; }
      .resultados-list { display: grid; gap: 8px; }
      .result-row { min-height: 56px; display: grid; grid-template-columns: 34px minmax(0,1fr) 64px 20px; gap: 10px; align-items: center; border-bottom: 1px solid rgba(255,255,255,.055); padding: 6px 0; }
      .result-icon-ok,.result-icon-fail { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; }
      .result-icon-ok { color: var(--green); background: rgba(var(--green-rgb),.08); }
      .result-icon-fail { color: var(--danger); background: rgba(255,87,87,.08); }
      .result-info { min-width: 0; }
      .result-info p { margin: 4px 0 0; color: var(--muted); font-size: 12px; }
      .result-score-ok,.result-score-fail { display: grid; text-align: right; font-weight: 900; }
      .result-score-ok { color: var(--green); }
      .result-score-fail { color: var(--danger); }
      .readiness-ring-wrap { display: grid; place-items: center; margin-top: 8px; }
      .readiness-ring { width: 156px; height: 156px; border-radius: 999px; display: grid; place-items: center; }
      .readiness-ring-inner { width: 112px; height: 112px; border-radius: 999px; background: #080b0a; display: grid; place-items: center; align-content: center; text-align: center; }
      .readiness-ring-inner strong { font-size: 38px; line-height: .9; letter-spacing: -.05em; }
      .readiness-ring-inner span { color: var(--green); text-transform: uppercase; font-size: 11px; letter-spacing: .12em; margin-top: 8px; font-weight: 900; }
      .readiness-card > p { margin: 12px auto; max-width: 250px; color: var(--muted); text-align: center; line-height: 1.5; }
      .readiness-footer { margin-top: auto; display: flex; justify-content: space-between; color: var(--muted); font-size: 12px; }
      .readiness-footer strong { color: var(--green); }
      .module-exam-list { display: grid; gap: 12px; }
      .module-exam-row { display: grid; grid-template-columns: 30px minmax(0,1fr) 42px 18px; gap: 10px; align-items: center; color: var(--muted); }
      .module-exam-row > div { min-width: 0; }
      .module-exam-row span { display: block; color: var(--muted); font-size: 12px; margin-top: 3px; }
      .module-exam-progress { height: 5px; border-radius: 999px; background: rgba(255,255,255,.1); overflow: hidden; margin-top: 8px; }
      .module-exam-progress div { height: 100%; border-radius: 999px; }
      .analytics-card > h2 { margin: 0; }
      .analytics-grid { display: grid; grid-template-columns: 300px minmax(0,1fr) 310px; gap: 14px; margin-top: 12px; }
      .average-score-card,.score-trend-card,.focus-area-card { border-radius: 14px; border: 1px solid rgba(255,255,255,.07); background: rgba(255,255,255,.024); padding: 16px; position: relative; overflow: hidden; }
      .average-score-card > strong { display: block; font-size: 46px; line-height: 1; letter-spacing: -.05em; margin-top: 10px; }
      .average-score-card p { color: var(--muted); }
      .average-score-card em { color: var(--green); font-style: normal; font-weight: 850; }
      .sparkline { position: absolute; right: 16px; bottom: 20px; width: 140px; height: 58px; background: linear-gradient(180deg, rgba(var(--green-rgb),.36), transparent); clip-path: polygon(0 90%, 10% 72%, 22% 76%, 34% 54%, 45% 58%, 55% 38%, 66% 44%, 76% 24%, 88% 20%, 100% 10%, 100% 100%, 0 100%); opacity: .8; }
      .score-trend-tooltip { position: absolute; right: 44px; top: 14px; border-radius: 9px; border: 1px solid rgba(255,255,255,.1); background: rgba(0,0,0,.38); padding: 8px 12px; display: grid; gap: 2px; color: var(--green); font-weight: 900; }
      .trend-svg { width: 100%; height: 170px; }
      .focus-area-card h3,.score-trend-card h3 { margin: 0; font-size: 18px; letter-spacing: -.02em; }
      .focus-item { display: flex; gap: 12px; margin-top: 16px; color: var(--muted); }
      .focus-icon-green,.focus-icon-gold { width: 34px; height: 34px; border-radius: 999px; display: grid; place-items: center; flex-shrink: 0; }
      .focus-icon-green { background: rgba(var(--green-rgb),.1); color: var(--green); }
      .focus-icon-gold { background: rgba(247,201,72,.1); color: var(--warning); }
      .profile-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(190px,1fr)); gap: 12px; }
      .profile-stat { border-radius: 10px; border: 1px solid rgba(255,255,255,.08); background: rgba(0,0,0,.2); padding: 10px; min-width: 0; display: grid; gap: 5px; }
      .profile-stat span { color: rgba(244,246,242,.6); font-size: 11px; line-height: 1.2; }
      .profile-stat strong { color: var(--white); font-size: 16px; line-height: 1.05; font-weight: 850; letter-spacing: -.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .info-grid,.course-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(240px,1fr)); gap: 14px; }
      .info-block { border-radius: 14px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.03); padding: 18px; }
      .info-block > span { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; color: var(--green); background: rgba(var(--green-rgb),.08); border: 1px solid rgba(var(--green-rgb),.18); margin-bottom: 14px; }
      .info-block h3 { margin: 0; font-size: 18px; line-height: 1.2; font-weight: 850; }
      .info-block p { margin: 8px 0 0; color: var(--muted); line-height: 1.65; font-size: 14px; }
      .certificate-card { padding: 20px; }
      .certificate-icon { width: 54px; height: 54px; border-radius: 999px; border: 1px solid rgba(var(--green-rgb),.26); background: rgba(var(--green-rgb),.08); display: grid; place-items: center; color: var(--green); margin-bottom: 14px; }
      .certificate-card h3 { margin: 14px 0 16px; font-size: 24px; line-height: 1.05; font-weight: 900; letter-spacing: -.035em; }
      .empty-state { border-radius: 14px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.025); padding: 18px; color: var(--muted); }
      .empty-state p,.empty-text { margin: 0; color: var(--muted); line-height: 1.6; }


      .performance-pro-page {
        display: grid;
        gap: 16px;
      }

      .performance-pro-header {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(360px, .52fr);
        gap: 16px;
        align-items: end;
      }

      .performance-pro-breadcrumb {
        display: flex;
        align-items: center;
        gap: 10px;
        color: rgba(244,246,242,.62);
        font-size: 12px;
        font-weight: 850;
        margin-bottom: 18px;
      }

      .performance-pro-header h1 {
        margin: 0;
        font-size: clamp(36px, 4vw, 58px);
        line-height: .92;
        letter-spacing: -.06em;
        font-weight: 950;
      }

      .performance-pro-header p {
        margin: 10px 0 0;
        color: var(--muted);
        line-height: 1.6;
      }

      .performance-pro-quote {
        min-height: 78px;
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,.09);
        background: rgba(255,255,255,.028);
        padding: 16px 18px;
        display: grid;
        align-content: center;
        gap: 5px;
        box-shadow: 0 20px 70px rgba(0,0,0,.16);
      }

      .performance-pro-quote strong {
        color: var(--green);
        font-size: 28px;
        line-height: .5;
      }

      .performance-pro-quote span {
        color: rgba(244,246,242,.82);
        font-weight: 850;
        line-height: 1.45;
      }

      .performance-pro-quote em {
        color: var(--soft);
        font-style: normal;
        font-size: 12px;
      }

      .performance-profile-card,
      .performance-metrics-strip,
      .performance-progress-card,
      .performance-cert-card,
      .performance-activity-card,
      .performance-top-courses-card,
      .performance-security-card {
        border-radius: 18px;
        border: 1px solid rgba(255,255,255,.09);
        background:
          linear-gradient(145deg, rgba(255,255,255,.052), rgba(255,255,255,.018)),
          rgba(8,12,10,.88);
        box-shadow: 0 20px 70px rgba(0,0,0,.18);
      }

      .performance-profile-card {
        min-height: 154px;
        display: grid;
        grid-template-columns: minmax(360px, 1.05fr) minmax(280px, .85fr) minmax(300px, .75fr);
        overflow: hidden;
      }

      .performance-profile-main,
      .performance-profile-goals,
      .performance-profile-status {
        padding: 26px;
      }

      .performance-profile-main,
      .performance-profile-goals {
        border-right: 1px solid rgba(255,255,255,.07);
      }

      .performance-profile-main {
        display: flex;
        align-items: center;
        gap: 22px;
      }

      .performance-avatar-wrap {
        position: relative;
        width: 118px;
        height: 118px;
        flex-shrink: 0;
      }

      .performance-avatar-large {
        width: 118px;
        height: 118px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        color: var(--green);
        font-size: 42px;
        font-weight: 950;
        letter-spacing: -.05em;
        background:
          radial-gradient(circle, rgba(var(--green-rgb),.16), rgba(var(--green-rgb),.03) 64%),
          rgba(0,0,0,.28);
        border: 1px solid rgba(var(--green-rgb),.18);
        box-shadow: 0 0 44px rgba(var(--green-rgb),.08);
      }

      .performance-verified {
        position: absolute;
        right: 6px;
        top: 4px;
        width: 28px;
        height: 28px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        background: var(--green);
        color: #061008;
        border: 3px solid #080b0a;
      }

      .performance-name-row {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }

      .performance-name-row h2 {
        margin: 0;
        font-size: 30px;
        line-height: 1;
        letter-spacing: -.04em;
        font-weight: 950;
      }

      .performance-name-row span {
        border-radius: 999px;
        padding: 4px 8px;
        background: rgba(var(--green-rgb),.13);
        color: var(--green);
        font-size: 11px;
        font-weight: 900;
      }

      .performance-profile-main p,
      .performance-profile-goals p,
      .performance-profile-status p {
        margin: 9px 0 0;
        color: var(--muted);
        line-height: 1.55;
      }

      .performance-enrolled {
        display: inline-flex;
        align-items: center;
        gap: 7px;
      }

      .performance-profile-goals {
        display: grid;
        grid-template-columns: 34px minmax(0, 1fr);
        gap: 14px;
        align-content: center;
      }

      .performance-profile-goals > svg,
      .performance-profile-status svg {
        color: var(--soft);
      }

      .performance-profile-goals h3,
      .performance-profile-status h3 {
        margin: 0;
        font-size: 17px;
        letter-spacing: -.02em;
      }

      .performance-profile-goals button {
        margin-top: 12px;
        border: 0;
        background: transparent;
        color: var(--green);
        padding: 0;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-weight: 900;
        cursor: pointer;
      }

      .performance-profile-status {
        display: grid;
        align-content: center;
        gap: 10px;
      }

      .performance-profile-status > div,
      .performance-profile-status > strong {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .performance-profile-status > strong {
        color: var(--green);
        justify-self: end;
        margin-top: -32px;
      }

      .performance-profile-status span {
        color: var(--muted);
      }

      .performance-profile-status b {
        color: var(--white);
      }

      .performance-metrics-strip {
        min-height: 120px;
        display: grid;
        grid-template-columns: repeat(5, minmax(0,1fr));
        overflow: hidden;
      }

      .performance-metric-card {
        padding: 20px;
        display: flex;
        gap: 16px;
        align-items: center;
        border-right: 1px solid rgba(255,255,255,.07);
      }

      .performance-metric-card:last-child {
        border-right: 0;
      }

      .performance-metric-card > span {
        width: 42px;
        height: 42px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        color: rgba(244,246,242,.72);
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.025);
        flex-shrink: 0;
      }

      .performance-metric-card > span.gold {
        color: #f4a72c;
        border-color: rgba(244,167,44,.22);
        background: rgba(244,167,44,.08);
      }

      .performance-metric-card p {
        margin: 0;
        color: var(--soft);
        font-size: 12px;
        font-weight: 850;
      }

      .performance-metric-card strong {
        display: block;
        margin-top: 6px;
        font-size: 27px;
        line-height: 1;
        letter-spacing: -.045em;
      }

      .performance-metric-card em {
        display: block;
        margin-top: 7px;
        color: var(--green);
        font-size: 12px;
        font-style: normal;
        font-weight: 850;
      }

      .performance-pro-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.42fr) minmax(430px, .58fr);
        gap: 16px;
        align-items: start;
      }

      .performance-main-column {
        display: grid;
        gap: 16px;
        min-width: 0;
      }

      .performance-progress-card,
      .performance-cert-card,
      .performance-activity-card,
      .performance-top-courses-card,
      .performance-security-card {
        padding: 20px;
      }

      .performance-card-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 14px;
      }

      .performance-card-header.compact {
        margin-bottom: 12px;
      }

      .performance-card-header h2,
      .performance-card-header.compact h2 {
        margin: 0;
        font-size: 21px;
        line-height: 1.05;
        letter-spacing: -.035em;
        font-weight: 950;
      }

      .performance-card-header p {
        margin: 8px 0 0;
        color: var(--muted);
        font-size: 13px;
      }

      .performance-card-header button {
        min-height: 34px;
        border-radius: 9px;
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.03);
        color: rgba(244,246,242,.82);
        padding: 0 12px;
        cursor: pointer;
        font-weight: 850;
        font-size: 12px;
      }

      .performance-chart-wrap {
        position: relative;
        min-height: 250px;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,.06);
        background:
          linear-gradient(180deg, rgba(255,255,255,.018), rgba(255,255,255,.006)),
          rgba(0,0,0,.10);
        overflow: hidden;
        padding: 14px;
      }

      .performance-chart {
        width: 100%;
        height: 230px;
      }

      .performance-chart line {
        stroke: rgba(255,255,255,.045);
        stroke-width: 1;
      }

      .performance-chart circle {
        fill: var(--green);
        stroke: rgba(5,7,6,.85);
        stroke-width: 4;
      }

      .performance-chart-tooltip {
        position: absolute;
        right: 26px;
        top: 58px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,.12);
        background: rgba(8,12,10,.86);
        color: var(--white);
        padding: 9px 12px;
        font-weight: 950;
      }

      .performance-rings-row {
        display: grid;
        grid-template-columns: repeat(4, minmax(0,1fr));
        gap: 16px;
        margin-top: 18px;
      }

      .performance-mini-ring-item {
        display: grid;
        justify-items: center;
        gap: 8px;
      }

      .performance-mini-ring {
        width: 88px;
        height: 88px;
        border-radius: 999px;
        display: grid;
        place-items: center;
      }

      .performance-mini-ring::before {
        content: '';
        position: absolute;
      }

      .performance-mini-ring strong {
        width: 62px;
        height: 62px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        background: #080b0a;
        border: 1px solid rgba(255,255,255,.07);
        font-size: 19px;
      }

      .performance-mini-ring-item span {
        color: rgba(244,246,242,.82);
        font-size: 13px;
        font-weight: 850;
        text-align: center;
      }

      .performance-mini-ring-item em {
        color: var(--green);
        font-style: normal;
        font-size: 12px;
        font-weight: 900;
      }

      .performance-insight-row {
        min-height: 58px;
        margin-top: 18px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,.08);
        background: rgba(255,255,255,.026);
        display: grid;
        grid-template-columns: 34px minmax(0,1fr) auto;
        gap: 12px;
        align-items: center;
        padding: 12px 14px;
      }

      .performance-insight-row > svg {
        color: var(--gold);
      }

      .performance-insight-row span {
        color: var(--muted);
        line-height: 1.4;
      }

      .performance-insight-row button {
        border: 0;
        background: transparent;
        color: var(--green);
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-weight: 900;
        cursor: pointer;
      }

      .performance-side-column {
        display: grid;
        grid-template-columns: 1fr;
        gap: 16px;
      }

      .performance-cert-card,
      .performance-activity-card,
      .performance-top-courses-card,
      .performance-security-card {
        min-height: 0;
      }

      .performance-under-progress {
        margin-top: 0;
        background:
          linear-gradient(145deg, rgba(255,255,255,.045), rgba(255,255,255,.018)),
          rgba(10,13,12,.88);
        border: 1px solid rgba(255,255,255,.09);
        border-radius: 16px;
        box-shadow: 0 20px 70px rgba(0,0,0,.16);
      }

      .performance-under-progress .performance-course-rank-list {
        grid-template-columns: repeat(3, minmax(0,1fr));
        display: grid;
        gap: 12px;
      }

      .performance-cert-list,
      .performance-course-rank-list,
      .performance-security-list {
        display: grid;
        gap: 9px;
      }

      .performance-cert-row {
        min-height: 78px;
        display: grid;
        grid-template-columns: 48px minmax(0,1fr);
        gap: 12px;
        align-items: center;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,.07);
        background: rgba(255,255,255,.022);
        padding: 12px;
      }

      .performance-cert-row.ghost {
        opacity: .86;
      }

      .performance-medal {
        width: 42px;
        height: 42px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        color: var(--white);
        border: 2px solid rgba(214,178,94,.36);
        background:
          radial-gradient(circle, rgba(214,178,94,.28), rgba(0,0,0,.24));
        font-weight: 950;
      }

      .performance-cert-row strong,
      .performance-timeline-item strong,
      .performance-course-rank strong,
      .performance-security-item strong {
        display: block;
        font-size: 13px;
        line-height: 1.25;
        font-weight: 900;
      }

      .performance-cert-row p,
      .performance-cert-row span,
      .performance-timeline-item p,
      .performance-security-item span {
        margin: 3px 0 0;
        color: var(--muted);
        font-size: 12px;
        line-height: 1.35;
      }

      .performance-cert-row em {
        grid-column: 2;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        width: fit-content;
        color: var(--green);
        font-style: normal;
        font-size: 11px;
        font-weight: 900;
        border-radius: 999px;
        border: 1px solid rgba(var(--green-rgb),.18);
        background: rgba(var(--green-rgb),.06);
        padding: 4px 8px;
      }

      .performance-timeline {
        position: relative;
        display: grid;
        gap: 14px;
        margin-top: 12px;
      }

      .performance-timeline::before {
        content: '';
        position: absolute;
        left: 7px;
        top: 9px;
        bottom: 11px;
        width: 2px;
        background: linear-gradient(180deg, var(--green), rgba(var(--green-rgb),.16));
      }

      .performance-timeline-item {
        position: relative;
        display: grid;
        grid-template-columns: 18px minmax(0,1fr);
        gap: 12px;
      }

      .performance-timeline-item > span {
        width: 14px;
        height: 14px;
        border-radius: 999px;
        background: var(--green);
        margin-top: 4px;
        box-shadow: 0 0 18px rgba(var(--green-rgb),.45);
      }

      .performance-course-rank {
        min-height: 48px;
        display: grid;
        grid-template-columns: 34px minmax(0,1fr) 44px;
        gap: 10px;
        align-items: center;
      }

      .performance-course-rank > span {
        width: 28px;
        height: 28px;
        border-radius: 8px;
        display: grid;
        place-items: center;
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.035);
        color: var(--muted);
        font-weight: 900;
      }

      .performance-course-rank div div {
        height: 5px;
        background: rgba(255,255,255,.09);
        border-radius: 999px;
        overflow: hidden;
        margin-top: 8px;
      }

      .performance-course-rank i {
        height: 100%;
        display: block;
        border-radius: 999px;
        background: var(--green);
        box-shadow: 0 0 16px rgba(var(--green-rgb),.28);
      }

      .performance-course-rank em {
        color: rgba(244,246,242,.78);
        font-style: normal;
        font-size: 12px;
        font-weight: 900;
        text-align: right;
      }

      .performance-total-row {
        margin-top: 14px;
        padding-top: 14px;
        border-top: 1px solid rgba(255,255,255,.07);
        display: flex;
        justify-content: space-between;
        gap: 12px;
        color: var(--muted);
        font-size: 13px;
      }

      .performance-total-row strong {
        color: var(--green);
      }

      .performance-security-item {
        min-height: 68px;
        display: grid;
        grid-template-columns: 34px minmax(0,1fr) auto;
        gap: 14px;
        align-items: center;
        border-bottom: 1px solid rgba(255,255,255,.055);
        padding: 12px 0;
      }

      .performance-security-item > svg {
        color: var(--soft);
      }

      .performance-security-item em {
        width: 24px;
        height: 24px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        color: var(--green);
        border: 1px solid rgba(var(--green-rgb),.22);
        font-style: normal;
      }

      .performance-security-item button {
        min-height: 32px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.035);
        color: rgba(244,246,242,.82);
        padding: 0 12px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 850;
      }

      @media (max-width: 1480px) {
        .performance-pro-grid,
        .performance-pro-header,
        .performance-profile-card {
          grid-template-columns: 1fr;
        }

        .performance-profile-main,
        .performance-profile-goals {
          border-right: 0;
          border-bottom: 1px solid rgba(255,255,255,.07);
        }

        .performance-metrics-strip {
          grid-template-columns: repeat(2, minmax(0,1fr));
        }

        .performance-metric-card:nth-child(2n) {
          border-right: 0;
        }
      }

      @media (max-width: 920px) {
        .performance-side-column,
        .performance-rings-row,
        .performance-metrics-strip {
          grid-template-columns: 1fr;
        }

        .performance-metric-card {
          border-right: 0;
          border-bottom: 1px solid rgba(255,255,255,.07);
        }

        .performance-profile-main,
        .performance-insight-row {
          grid-template-columns: 1fr;
        }

        .performance-profile-main {
          flex-direction: column;
          align-items: flex-start;
        }
      }


      .loading-page {
        grid-template-columns: 1fr !important;
        place-items: center;
      }


      .cert-pro-page {
        display: grid;
        gap: 16px;
      }

      .cert-pro-hero {
        min-height: 320px;
        border-radius: 18px;
        border: 1px solid rgba(255,255,255,.09);
        background: var(--panel);
        overflow: hidden;
        position: relative;
        display: grid;
        grid-template-columns: .82fr 1.18fr;
        box-shadow: 0 20px 70px rgba(0,0,0,.16);
      }

      .cert-pro-hero::before {
        content: '';
        position: absolute;
        inset: 0;
        background:
          linear-gradient(90deg, rgba(5,7,6,.98) 0%, rgba(5,7,6,.90) 31%, rgba(5,7,6,.44) 63%, rgba(5,7,6,.10) 100%),
          radial-gradient(circle at 78% 40%, rgba(214,178,94,.16), transparent 28%);
        z-index: 1;
      }

      .cert-pro-hero-content {
        position: relative;
        z-index: 3;
        padding: 36px;
        display: grid;
        align-content: center;
        gap: 14px;
      }

      .cert-pro-kicker {
        margin: 0;
        color: var(--green);
        text-transform: uppercase;
        letter-spacing: .18em;
        font-size: 11px;
        font-weight: 950;
      }

      .cert-pro-hero h1 {
        margin: 0;
        font-size: clamp(42px, 5vw, 70px);
        line-height: .92;
        letter-spacing: -.06em;
        font-weight: 950;
      }

      .cert-pro-hero p {
        color: var(--muted);
        line-height: 1.65;
        max-width: 520px;
      }

      .cert-pro-benefits {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        margin-top: 8px;
        max-width: 560px;
      }

      .cert-pro-benefits div {
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,.08);
        background: rgba(255,255,255,.035);
        padding: 12px;
        display: grid;
        gap: 8px;
        color: var(--muted);
        min-height: 82px;
      }

      .cert-pro-benefits svg {
        color: var(--green);
      }

      .cert-pro-hero-image {
        position: relative;
        min-height: 320px;
        background:
          linear-gradient(90deg, rgba(5,7,6,.18), rgba(5,7,6,.04)),
          radial-gradient(circle at center, rgba(255,255,255,.06), transparent 46%);
        overflow: hidden;
      }

      .cert-pro-hero-image::after {
        content: '';
        position: absolute;
        inset: 0;
        background:
          linear-gradient(110deg, transparent 0%, rgba(18,45,25,.45) 58%, rgba(18,45,25,.05) 59%, transparent 70%);
        opacity: .75;
      }

      .cert-pro-certificate-paper {
        position: absolute;
        right: 62px;
        top: 24px;
        width: 610px;
        height: 300px;
        border-radius: 10px;
        background:
          linear-gradient(135deg, rgba(255,255,255,.96), rgba(230,218,190,.92)),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,.45), transparent 32%);
        color: #111;
        transform: rotate(-9deg);
        box-shadow: 0 28px 70px rgba(0,0,0,.45);
        border: 1px solid rgba(214,178,94,.35);
        z-index: 2;
        display: grid;
        place-items: center;
        text-align: center;
        overflow: hidden;
      }

      .cert-pro-certificate-paper::before {
        content: '';
        position: absolute;
        inset: 18px;
        border: 1px solid rgba(20,20,20,.16);
        border-radius: 6px;
      }

      .cert-pro-paper-logo {
        position: absolute;
        top: 34px;
        font-size: 18px;
        text-transform: uppercase;
        letter-spacing: .28em;
        font-weight: 800;
        color: #1a1a1a;
      }

      .cert-pro-paper-title {
        position: absolute;
        top: 82px;
        font-family: Georgia, serif;
        font-size: 42px;
        text-transform: uppercase;
        letter-spacing: .15em;
        font-weight: 700;
      }

      .cert-pro-paper-subtitle {
        position: absolute;
        top: 130px;
        font-family: Georgia, serif;
        font-size: 14px;
        letter-spacing: .26em;
        text-transform: uppercase;
      }

      .cert-pro-paper-name {
        position: absolute;
        top: 154px;
        font-family: Georgia, serif;
        font-style: italic;
        font-size: 34px;
      }

      .cert-pro-paper-course {
        position: absolute;
        top: 210px;
        font-family: Georgia, serif;
        font-size: 18px;
        font-weight: 700;
      }

      .cert-pro-paper-signature {
        position: absolute;
        left: 92px;
        bottom: 42px;
        width: 150px;
        height: 1px;
        background: rgba(0,0,0,.55);
      }

      .cert-pro-paper-seal {
        position: absolute;
        right: 86px;
        bottom: 48px;
        width: 86px;
        height: 86px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        color: #51370b;
        background:
          radial-gradient(circle at 30% 30%, #fff1bf, #d6b25e 38%, #9f741e 72%, #6c4a0f 100%);
        box-shadow: 0 10px 26px rgba(0,0,0,.28);
        clip-path: polygon(50% 0%,56% 8%,65% 3%,70% 12%,80% 9%,83% 19%,93% 20%,91% 31%,100% 38%,94% 48%,100% 58%,91% 65%,93% 76%,83% 77%,80% 87%,70% 84%,65% 97%,56% 92%,50% 100%,44% 92%,35% 97%,30% 84%,20% 87%,17% 77%,7% 76%,9% 65%,0% 58%,6% 48%,0% 38%,9% 31%,7% 20%,17% 19%,20% 9%,30% 12%,35% 3%,44% 8%);
      }

      .cert-pro-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.05fr) minmax(390px, .95fr);
        gap: 16px;
      }

      .cert-pro-available,
      .cert-pro-how,
      .cert-pro-verify,
      .cert-pro-status {
        border-radius: 18px;
        border: 1px solid rgba(255,255,255,.09);
        background: var(--panel);
        padding: 20px;
        box-shadow: 0 20px 70px rgba(0,0,0,.16);
      }

      .cert-pro-card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        margin-bottom: 16px;
      }

      .cert-pro-card-header h2,
      .cert-pro-how h2,
      .cert-pro-verify h2,
      .cert-pro-status h2 {
        margin: 6px 0 0;
        font-size: 22px;
        line-height: 1;
        letter-spacing: -.035em;
        font-weight: 950;
      }

      .cert-pro-card-header > span {
        color: var(--green);
        border: 1px solid rgba(var(--green-rgb),.24);
        background: rgba(var(--green-rgb),.10);
        border-radius: 999px;
        padding: 7px 10px;
        font-size: 12px;
        font-weight: 900;
      }

      .cert-pro-issued-card,
      .cert-pro-locked-card {
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,.08);
        background: rgba(255,255,255,.028);
        padding: 14px;
        display: grid;
        grid-template-columns: 235px minmax(0,1fr);
        gap: 16px;
        margin-top: 12px;
      }

      .cert-pro-thumb,
      .cert-pro-locked-thumb {
        min-height: 160px;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,.10);
        background:
          linear-gradient(145deg, rgba(255,255,255,.07), rgba(255,255,255,.02)),
          radial-gradient(circle at top right, rgba(var(--green-rgb),.16), transparent 36%);
        overflow: hidden;
        display: grid;
        place-items: center;
        position: relative;
      }

      .cert-pro-thumb-inner {
        width: 180px;
        height: 118px;
        border-radius: 12px;
        border: 1px solid rgba(var(--green-rgb),.30);
        background: rgba(0,0,0,.34);
        display: grid;
        place-items: center;
        text-align: center;
        padding: 12px;
      }

      .cert-pro-thumb-inner span {
        color: var(--muted);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: .18em;
      }

      .cert-pro-thumb-inner strong {
        color: var(--white);
        text-transform: uppercase;
        letter-spacing: .12em;
        font-family: Georgia, serif;
      }

      .cert-pro-thumb-inner em {
        color: var(--green);
        font-size: 11px;
        font-style: normal;
      }

      .cert-pro-thumb-inner b {
        color: var(--gold);
      }

      .cert-pro-issued-body {
        min-width: 0;
        display: grid;
        align-content: center;
        gap: 10px;
      }

      .cert-pro-issued-body h3 {
        margin: 0;
        font-size: 24px;
        line-height: 1.05;
        letter-spacing: -.035em;
        font-weight: 950;
      }

      .cert-pro-issued-body p {
        margin: 0;
        color: var(--muted);
        line-height: 1.6;
      }

      .cert-pro-status-pill,
      .cert-pro-locked-pill {
        width: fit-content;
        border-radius: 999px;
        padding: 6px 9px;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: .12em;
        text-transform: uppercase;
      }

      .cert-pro-status-pill {
        color: var(--green);
        border: 1px solid rgba(var(--green-rgb),.26);
        background: rgba(var(--green-rgb),.10);
      }

      .cert-pro-locked-pill {
        color: var(--soft);
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.04);
      }

      .cert-pro-mini-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0,1fr));
        gap: 10px;
      }

      .cert-pro-primary {
        min-height: 42px;
        border-radius: 10px;
        background: linear-gradient(135deg, var(--green), #7bee65);
        color: #061008;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-weight: 900;
        width: fit-content;
        padding: 0 16px;
      }

      .cert-pro-muted {
        color: var(--muted);
        font-size: 13px;
      }

      .cert-pro-empty-issued {
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,.08);
        background: rgba(255,255,255,.028);
        padding: 24px;
        display: grid;
        gap: 12px;
        justify-items: start;
      }

      .cert-pro-empty-icon {
        width: 54px;
        height: 54px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        background: rgba(var(--green-rgb),.08);
        color: var(--green);
        border: 1px solid rgba(var(--green-rgb),.22);
      }

      .cert-pro-locked-thumb {
        color: var(--soft);
        gap: 10px;
      }

      .cert-pro-locked-card-art {
        width: 180px;
        height: 118px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,.12);
        background: rgba(0,0,0,.26);
        display: grid;
        place-items: center;
        text-align: center;
        padding: 12px;
        color: var(--soft);
      }

      .cert-pro-locked-card-art strong {
        color: var(--white);
        text-transform: uppercase;
        letter-spacing: .12em;
        font-family: Georgia, serif;
      }

      .cert-pro-locked-card-art em {
        font-style: normal;
        color: var(--soft);
        font-size: 12px;
      }

      .cert-pro-progress-line {
        height: 8px;
        border-radius: 999px;
        background: rgba(255,255,255,.10);
        overflow: hidden;
      }

      .cert-pro-progress-line div {
        height: 100%;
        background: var(--green);
        border-radius: 999px;
        box-shadow: 0 0 18px rgba(var(--green-rgb),.22);
      }

      .cert-pro-all-button {
        width: 100%;
        min-height: 44px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.035);
        color: var(--white);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 14px;
        margin-top: 12px;
        cursor: pointer;
        font-weight: 850;
      }

      .cert-pro-side {
        display: grid;
        gap: 16px;
      }

      .cert-pro-steps {
        display: grid;
        grid-template-columns: repeat(4, minmax(0,1fr));
        gap: 10px;
        margin-top: 16px;
      }

      .cert-pro-steps div {
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,.08);
        background: rgba(255,255,255,.026);
        padding: 14px;
        display: grid;
        gap: 8px;
        text-align: center;
      }

      .cert-pro-steps svg {
        color: var(--green);
        margin: 0 auto;
      }

      .cert-pro-steps strong {
        font-size: 13px;
      }

      .cert-pro-steps span {
        color: var(--muted);
        font-size: 12px;
        line-height: 1.45;
      }

      .cert-pro-verify {
        display: grid;
        grid-template-columns: 76px minmax(0,1fr);
        gap: 18px;
        align-items: center;
      }

      .cert-pro-shield {
        width: 76px;
        height: 76px;
        border-radius: 20px;
        display: grid;
        place-items: center;
        background: rgba(var(--green-rgb),.08);
        color: var(--green);
        border: 1px solid rgba(var(--green-rgb),.20);
      }

      .cert-pro-verify p,
      .cert-pro-status p {
        color: var(--muted);
        line-height: 1.6;
      }

      .cert-pro-verify button {
        min-height: 40px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,.12);
        background: rgba(255,255,255,.045);
        color: var(--white);
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 0 14px;
        font-weight: 850;
        cursor: pointer;
      }

      .cert-pro-status {
        display: grid;
        grid-template-columns: 100px minmax(0,1fr) 150px;
        gap: 16px;
        align-items: center;
      }

      .cert-pro-status-ring {
        width: 82px;
        height: 82px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        border: 10px solid rgba(var(--green-rgb),.22);
        box-shadow: inset 0 0 0 2px rgba(255,255,255,.05);
      }

      .cert-pro-status-ring strong {
        font-size: 30px;
        line-height: 1;
      }

      .cert-pro-status ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 10px;
      }

      .cert-pro-status li {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        color: var(--muted);
        font-size: 13px;
      }

      .cert-pro-status li strong {
        color: var(--white);
      }

      @media (max-width: 1180px) {
        .cert-pro-hero,
        .cert-pro-grid,
        .cert-pro-issued-card,
        .cert-pro-locked-card,
        .cert-pro-status {
          grid-template-columns: 1fr;
        }

        .cert-pro-steps {
          grid-template-columns: repeat(2, minmax(0,1fr));
        }

        .cert-pro-verify {
          grid-template-columns: 1fr;
        }
      }

      
      .cert-final-page {
        display: grid;
        gap: 16px;
      }

      .cert-final-hero {
        min-height: 368px;
        border-radius: 22px;
        border: 1px solid rgba(255,255,255,.10);
        background:
          radial-gradient(circle at 72% 30%, rgba(var(--green-rgb),.18), transparent 32%),
          linear-gradient(135deg, rgba(255,255,255,.06), rgba(255,255,255,.018)),
          rgba(8,12,10,.96);
        overflow: hidden;
        position: relative;
        display: grid;
        grid-template-columns: .78fr 1.22fr;
        box-shadow: 0 26px 90px rgba(0,0,0,.30);
      }

      .cert-final-hero::before {
        content: '';
        position: absolute;
        inset: 0;
        background:
          linear-gradient(90deg, rgba(5,7,6,.99) 0%, rgba(5,7,6,.94) 34%, rgba(5,7,6,.42) 64%, rgba(5,7,6,.12) 100%),
          radial-gradient(circle at 78% 44%, rgba(214,178,94,.17), transparent 29%);
        z-index: 1;
      }

      .cert-final-copy {
        position: relative;
        z-index: 3;
        padding: 38px;
        display: grid;
        align-content: center;
        gap: 14px;
      }

      .cert-final-kicker {
        margin: 0;
        color: var(--green);
        text-transform: uppercase;
        letter-spacing: .18em;
        font-size: 11px;
        font-weight: 950;
      }

      .cert-final-copy h1 {
        margin: 0;
        font-size: clamp(44px, 5.4vw, 78px);
        line-height: .88;
        letter-spacing: -.07em;
        font-weight: 950;
        max-width: 650px;
      }

      .cert-final-subtitle {
        margin: 0;
        color: var(--muted);
        line-height: 1.68;
        max-width: 560px;
      }

      .cert-final-trust {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        margin-top: 10px;
        max-width: 610px;
      }

      .cert-final-trust div {
        min-height: 98px;
        border-radius: 15px;
        border: 1px solid rgba(255,255,255,.08);
        background: rgba(255,255,255,.035);
        padding: 13px;
        display: grid;
        gap: 7px;
        color: var(--muted);
        align-content: start;
      }

      .cert-final-trust svg { color: var(--green); }
      .cert-final-trust strong { color: var(--white); font-size: 12px; line-height: 1.25; }
      .cert-final-trust span { font-size: 12px; line-height: 1.4; }

      .cert-final-visual {
        position: relative;
        min-height: 368px;
        overflow: hidden;
      }

      .cert-final-visual::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(120deg, transparent 0%, rgba(18,45,25,.54) 58%, rgba(18,45,25,.05) 59%, transparent 72%);
        z-index: 1;
      }

      .cert-final-glow {
        position: absolute;
        width: 420px;
        height: 420px;
        border-radius: 999px;
        right: 42px;
        top: -80px;
        background: rgba(var(--green-rgb),.14);
        filter: blur(70px);
        z-index: 0;
      }

      .cert-final-paper {
        position: absolute;
        right: 46px;
        top: 34px;
        width: min(690px, 96%);
        height: 312px;
        border-radius: 12px;
        background:
          linear-gradient(135deg, rgba(255,255,255,.98), rgba(238,226,197,.95)),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,.45), transparent 34%);
        color: #111;
        transform: rotate(-8deg);
        box-shadow: 0 34px 86px rgba(0,0,0,.52);
        border: 1px solid rgba(214,178,94,.38);
        z-index: 2;
        text-align: center;
        overflow: hidden;
      }

      .cert-final-paper::before {
        content: '';
        position: absolute;
        inset: 18px;
        border: 1px solid rgba(20,20,20,.18);
        border-radius: 7px;
      }

      .cert-final-paper::after {
        content: '';
        position: absolute;
        inset: 0;
        background:
          linear-gradient(120deg, rgba(255,255,255,.36), transparent 34%),
          radial-gradient(circle at 80% 20%, rgba(255,255,255,.20), transparent 28%);
        pointer-events: none;
      }

      .cert-final-paper-logo {
        position: absolute;
        top: 34px;
        left: 0;
        right: 0;
        font-size: 18px;
        text-transform: uppercase;
        letter-spacing: .28em;
        font-weight: 800;
        color: #1a1a1a;
      }

      .cert-final-paper-title {
        position: absolute;
        top: 78px;
        left: 0;
        right: 0;
        font-family: Georgia, serif;
        font-size: 42px;
        text-transform: uppercase;
        letter-spacing: .15em;
        font-weight: 700;
      }

      .cert-final-paper-subtitle {
        position: absolute;
        top: 126px;
        left: 0;
        right: 0;
        font-family: Georgia, serif;
        font-size: 14px;
        letter-spacing: .26em;
        text-transform: uppercase;
      }

      .cert-final-paper-line {
        position: absolute;
        top: 150px;
        left: 0;
        right: 0;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: .12em;
      }

      .cert-final-paper-name {
        position: absolute;
        top: 162px;
        left: 74px;
        right: 74px;
        font-family: Georgia, serif;
        font-style: italic;
        font-size: clamp(26px, 2.8vw, 38px);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .cert-final-paper-copy {
        position: absolute;
        top: 207px;
        left: 0;
        right: 0;
        font-size: 11px;
        opacity: .75;
      }

      .cert-final-paper-course {
        position: absolute;
        top: 228px;
        left: 90px;
        right: 90px;
        font-family: Georgia, serif;
        font-size: 18px;
        font-weight: 700;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .cert-final-paper-signature {
        position: absolute;
        left: 94px;
        bottom: 46px;
        width: 150px;
        height: 1px;
        background: rgba(0,0,0,.55);
      }

      .cert-final-paper-director {
        position: absolute;
        left: 104px;
        bottom: 28px;
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: .12em;
      }

      .cert-final-paper-id {
        position: absolute;
        right: 92px;
        bottom: 30px;
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: .14em;
        opacity: .62;
      }

      .cert-final-seal {
        position: absolute;
        right: 104px;
        bottom: 58px;
        width: 82px;
        height: 82px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        color: #51370b;
        background: radial-gradient(circle at 30% 30%, #fff1bf, #d6b25e 38%, #9f741e 72%, #6c4a0f 100%);
        box-shadow: 0 10px 26px rgba(0,0,0,.30);
        clip-path: polygon(50% 0%,56% 8%,65% 3%,70% 12%,80% 9%,83% 19%,93% 20%,91% 31%,100% 38%,94% 48%,100% 58%,91% 65%,93% 76%,83% 77%,80% 87%,70% 84%,65% 97%,56% 92%,50% 100%,44% 92%,35% 97%,30% 84%,20% 87%,17% 77%,7% 76%,9% 65%,0% 58%,6% 48%,0% 38%,9% 31%,7% 20%,17% 19%,20% 9%,30% 12%,35% 3%,44% 8%);
        z-index: 3;
      }

      .cert-final-layout {
        display: grid;
        grid-template-columns: minmax(0, 1.28fr) minmax(330px, .72fr);
        gap: 18px;
        align-items: start;
      }

      .cert-final-available,
      .cert-final-how,
      .cert-final-verify,
      .cert-final-status {
        border-radius: 18px;
        border: 1px solid rgba(255,255,255,.09);
        background: var(--panel);
        padding: 20px;
        box-shadow: 0 20px 70px rgba(0,0,0,.16);
      }

      .cert-final-section-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        margin-bottom: 16px;
      }

      .cert-final-section-head h2,
      .cert-final-how h2,
      .cert-final-verify h2,
      .cert-final-status h2 {
        margin: 6px 0 0;
        font-size: 22px;
        line-height: 1;
        letter-spacing: -.035em;
        font-weight: 950;
      }

      .cert-final-section-head > span {
        color: var(--green);
        border: 1px solid rgba(var(--green-rgb),.24);
        background: rgba(var(--green-rgb),.10);
        border-radius: 999px;
        padding: 7px 10px;
        font-size: 12px;
        font-weight: 900;
        white-space: nowrap;
      }

      .cert-final-issued,
      .cert-final-locked {
        border-radius: 17px;
        border: 1px solid rgba(255,255,255,.08);
        background: rgba(255,255,255,.028);
        padding: 14px;
        display: grid;
        grid-template-columns: minmax(255px, .9fr) minmax(0,1.1fr);
        gap: 18px;
        margin-top: 12px;
        align-items: stretch;
      }

      .cert-final-card-art,
      .cert-final-locked-art {
        min-height: 178px;
        border-radius: 14px;
        border: 1px solid rgba(var(--green-rgb),.24);
        overflow: hidden;
        position: relative;
        background:
          radial-gradient(circle at 82% 20%, rgba(var(--green-rgb),.18), transparent 34%),
          linear-gradient(135deg, #151d18, #060807 72%);
        box-shadow: inset 0 0 0 1px rgba(255,255,255,.035);
      }

      .cert-final-card-art::before,
      .cert-final-locked-art::before {
        content: '';
        position: absolute;
        inset: 12px;
        border: 1px solid rgba(255,255,255,.11);
        border-radius: 10px;
      }

      .cert-final-card-brand,
      .cert-final-locked-brand {
        position: absolute;
        left: 18px;
        top: 18px;
        color: var(--green);
        font-size: 9px;
        letter-spacing: .18em;
        text-transform: uppercase;
        font-weight: 950;
      }

      .cert-final-card-title,
      .cert-final-locked-title {
        position: absolute;
        left: 18px;
        right: 18px;
        top: 48px;
        font-family: Georgia, serif;
        text-transform: uppercase;
        letter-spacing: .12em;
        font-weight: 800;
        font-size: 18px;
      }

      .cert-final-card-subtitle,
      .cert-final-locked-subtitle {
        position: absolute;
        left: 18px;
        top: 74px;
        color: var(--muted);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: .14em;
      }

      .cert-final-card-name {
        position: absolute;
        left: 18px;
        right: 64px;
        top: 98px;
        font-family: Georgia, serif;
        font-size: 19px;
        font-style: italic;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .cert-final-card-course {
        position: absolute;
        left: 18px;
        right: 18px;
        top: 127px;
        color: var(--soft);
        font-size: 11px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .cert-final-card-footer {
        position: absolute;
        left: 18px;
        right: 18px;
        bottom: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        color: var(--muted);
        font-size: 10px;
      }

      .cert-final-card-footer strong {
        color: var(--gold);
        font-size: 14px;
      }

      .cert-final-card-seal {
        position: absolute;
        right: 22px;
        top: 86px;
        width: 46px;
        height: 46px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        color: #543a0d;
        background: radial-gradient(circle, #f4df96, #9b701e);
        box-shadow: 0 12px 24px rgba(0,0,0,.22);
      }

      .cert-final-locked-bg {
        position: absolute;
        inset: 0;
        background:
          linear-gradient(135deg, rgba(255,255,255,.05), rgba(255,255,255,.015)),
          repeating-linear-gradient(45deg, transparent 0 11px, rgba(255,255,255,.025) 12px 13px);
        opacity: .9;
      }

      .cert-final-locked-padlock {
        position: absolute;
        right: 20px;
        bottom: 18px;
        width: 52px;
        height: 52px;
        border-radius: 16px;
        display: grid;
        place-items: center;
        color: var(--soft);
        background: rgba(0,0,0,.28);
        border: 1px solid rgba(255,255,255,.10);
      }

      .cert-final-card-content {
        min-width: 0;
        display: grid;
        align-content: center;
        gap: 10px;
      }

      .cert-final-card-content h3 {
        margin: 0;
        font-size: 24px;
        line-height: 1.05;
        letter-spacing: -.035em;
        font-weight: 950;
      }

      .cert-final-card-content p {
        margin: 0;
        color: var(--muted);
        line-height: 1.6;
      }

      .cert-final-pill-issued,
      .cert-final-pill-locked {
        width: fit-content;
        border-radius: 999px;
        padding: 6px 9px;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: .12em;
        text-transform: uppercase;
      }

      .cert-final-pill-issued {
        color: var(--green);
        border: 1px solid rgba(var(--green-rgb),.26);
        background: rgba(var(--green-rgb),.10);
      }

      .cert-final-pill-locked {
        color: var(--soft);
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.04);
      }

      .cert-final-stats {
        display: grid;
        grid-template-columns: repeat(3, minmax(0,1fr));
        gap: 10px;
      }

      .cert-final-code {
        display: flex;
        gap: 10px;
        align-items: center;
        flex-wrap: wrap;
        color: var(--muted);
        font-size: 13px;
      }

      .cert-final-code strong { color: var(--white); }

      .cert-final-primary {
        min-height: 42px;
        border-radius: 10px;
        background: linear-gradient(135deg, var(--green), #7bee65);
        color: #061008;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-weight: 900;
        width: fit-content;
        padding: 0 16px;
      }

      .cert-final-muted { color: var(--muted); font-size: 13px; }

      .cert-final-empty {
        border-radius: 17px;
        border: 1px dashed rgba(var(--green-rgb),.22);
        background:
          radial-gradient(circle at 15% 20%, rgba(var(--green-rgb),.09), transparent 34%),
          rgba(255,255,255,.028);
        padding: 24px;
        display: grid;
        gap: 12px;
        justify-items: start;
      }

      .cert-final-empty > div {
        width: 54px;
        height: 54px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        background: rgba(var(--green-rgb),.08);
        color: var(--green);
        border: 1px solid rgba(var(--green-rgb),.22);
      }

      .cert-final-empty h3 { margin: 0; font-size: 22px; }
      .cert-final-empty p { margin: 0; color: var(--muted); line-height: 1.6; }

      .cert-final-progress {
        height: 8px;
        border-radius: 999px;
        background: rgba(255,255,255,.10);
        overflow: hidden;
      }

      .cert-final-progress div {
        height: 100%;
        background: var(--green);
        border-radius: 999px;
        box-shadow: 0 0 18px rgba(var(--green-rgb),.22);
      }



      .cert-final-available {
        min-width: 0;
      }

      .cert-final-card-content {
        overflow: hidden;
      }

      .cert-final-all {
        width: 100%;
        min-height: 44px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.035);
        color: var(--white);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 14px;
        margin-top: 12px;
        cursor: pointer;
        font-weight: 850;
      }

      .cert-final-right { display: grid; gap: 16px; min-width: 0; }

      .cert-final-steps {
        display: grid;
        grid-template-columns: repeat(2, minmax(280px,1fr));
        gap: 12px;
        margin-top: 16px;
      }

      .cert-final-steps div {
        min-height: 132px;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,.08);
        background: rgba(255,255,255,.026);
        padding: 18px;
        display: grid;
        grid-template-columns: 46px minmax(0,1fr);
        gap: 10px 14px;
        text-align: left;
        align-items: start;
        align-content: center;
      }

      .cert-final-steps span {
        width: 46px;
        height: 46px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        color: var(--green);
        border: 1px solid rgba(var(--green-rgb),.22);
        background: rgba(var(--green-rgb),.08);
        margin: 0;
      }

      .cert-final-steps strong {
        font-size: 15px;
        line-height: 1.25;
        align-self: center;
        letter-spacing: -.015em;
      }
      .cert-final-steps p {
        grid-column: 2;
        color: var(--muted);
        font-size: 14px;
        line-height: 1.55;
        margin: 0;
        max-width: 34ch;
      }

      .cert-final-verify {
        display: grid;
        grid-template-columns: 76px minmax(0,1fr);
        gap: 18px;
        align-items: center;
      }

      .cert-final-verify-icon {
        width: 76px;
        height: 76px;
        border-radius: 20px;
        display: grid;
        place-items: center;
        background: rgba(var(--green-rgb),.08);
        color: var(--green);
        border: 1px solid rgba(var(--green-rgb),.20);
      }

      .cert-final-verify p,
      .cert-final-status p {
        color: var(--muted);
        line-height: 1.6;
      }

      .cert-final-verify button {
        min-height: 40px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,.12);
        background: rgba(255,255,255,.045);
        color: var(--white);
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 0 14px;
        font-weight: 850;
        cursor: pointer;
      }

      .cert-final-status {
        display: grid;
        grid-template-columns: 100px minmax(0,1fr) 150px;
        gap: 16px;
        align-items: center;
      }

      .cert-final-ring {
        width: 86px;
        height: 86px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        border: 10px solid rgba(var(--green-rgb),.22);
        box-shadow: inset 0 0 0 2px rgba(255,255,255,.05), 0 0 34px rgba(var(--green-rgb),.08);
      }

      .cert-final-ring strong { font-size: 30px; line-height: 1; }

      .cert-final-status ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 10px;
      }

      .cert-final-status li {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        color: var(--muted);
        font-size: 13px;
      }

      .cert-final-status li strong { color: var(--white); }

      @media (max-width: 1180px) {
        .cert-final-hero,
        .cert-final-layout,
        .cert-final-issued,
        .cert-final-locked,
        .cert-final-status {
          grid-template-columns: 1fr;
        }

        .cert-final-steps { grid-template-columns: repeat(2, minmax(260px,1fr)); }
        .cert-final-verify { grid-template-columns: 1fr; }
        .cert-final-paper { right: 24px; left: 24px; width: auto; }
      }

      @media (max-width: 720px) {
        .cert-final-copy { padding: 24px; }
        .cert-final-trust,
        .cert-final-steps,
        .cert-final-stats {
          grid-template-columns: 1fr;
        }

        .cert-final-paper {
          transform: rotate(-4deg);
          height: 286px;
          top: 30px;
        }

        .cert-final-paper-title { font-size: 31px; letter-spacing: .10em; }
        .cert-final-paper-name { left: 34px; right: 34px; font-size: 27px; }
        .cert-final-paper-course { left: 40px; right: 40px; font-size: 15px; }
        .cert-final-seal { right: 54px; width: 64px; height: 64px; }
      }


      .cert-final-hero {
        grid-template-columns: 1fr;
        gap: 18px;
        padding: 34px;
      }
      .cert-final-hero::before {
        background:
          radial-gradient(circle at 50% 44%, rgba(214,178,94,.13), transparent 28%),
          radial-gradient(circle at 50% 12%, rgba(var(--green-rgb),.12), transparent 26%),
          linear-gradient(180deg, rgba(5,7,6,.96) 0%, rgba(5,7,6,.90) 58%, rgba(5,7,6,.98) 100%);
      }
      .cert-final-copy {
        padding: 0;
        text-align: center;
        justify-items: center;
      }
      .cert-final-copy h1 {
        text-transform: uppercase;
        max-width: 980px;
      }
      .cert-final-subtitle {
        max-width: 760px;
      }
      .cert-final-visual {
        min-height: 350px;
        width: 100%;
        display: grid;
        place-items: center;
      }
      .cert-final-visual::after {
        background: radial-gradient(circle at center, rgba(var(--green-rgb),.10), transparent 44%);
      }
      .cert-final-paper {
        position: relative;
        right: auto;
        top: auto;
        width: min(720px, 96%);
        height: 318px;
        transform: rotate(-4deg);
      }
      .cert-final-trust {
        position: relative;
        z-index: 3;
        max-width: 980px;
        margin: 0 auto;
      }
      .cert-final-locked-art {
        filter: grayscale(1);
        opacity: .76;
        background:
          linear-gradient(135deg, rgba(255,255,255,.10), rgba(255,255,255,.025)),
          radial-gradient(circle at 76% 22%, rgba(255,255,255,.10), transparent 30%),
          #101312;
      }
      .cert-final-locked-art::before {
        content: '';
        position: absolute;
        inset: 16px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,.20);
      }
      .cert-final-locked-name {
        position: absolute;
        left: 24px;
        right: 24px;
        top: 84px;
        text-align: center;
        font-family: Georgia, serif;
        font-size: 24px;
        font-style: italic;
        color: rgba(244,246,242,.62);
      }
      .cert-final-locked-course {
        position: absolute;
        left: 24px;
        right: 24px;
        bottom: 34px;
        text-align: center;
        color: rgba(244,246,242,.42);
        font-size: 12px;
        font-weight: 850;
      }
      .cert-final-locked-line {
        position: absolute;
        left: 52px;
        right: 52px;
        top: 118px;
        height: 1px;
        background: rgba(255,255,255,.16);
      }
      .cert-final-locked-seal {
        position: absolute;
        right: 24px;
        bottom: 24px;
        width: 40px;
        height: 40px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        color: rgba(244,246,242,.52);
        border: 1px solid rgba(255,255,255,.20);
        background: rgba(255,255,255,.045);
      }
      .cert-final-locked-padlock {
        background: rgba(5,7,6,.72) !important;
        border: 1px solid rgba(255,255,255,.22);
        backdrop-filter: blur(8px);
      }


      .performance-cert-row {
        grid-template-columns: 46px minmax(0,1fr);
        align-items: start;
        min-height: 86px;
        padding: 12px;
      }
      .performance-cert-row em {
        grid-column: 2;
        justify-self: start;
        margin-top: -2px;
      }
      .performance-cert-row strong {
        font-size: 14px;
      }
      .performance-cert-row p,
      .performance-cert-row span {
        line-height: 1.45;
      }
      .performance-medal {
        margin-top: 2px;
      }



      /* AJUSTES PREMIUM V2 - respiración visual, tarjetas y rendimiento en portátil */
      .exam-simulator-card {
        grid-template-columns: minmax(520px, .98fr) minmax(300px, .72fr);
        gap: 18px;
      }

      .exam-meta-grid {
        grid-template-columns: repeat(2, minmax(220px, 1fr));
        max-width: 640px;
        gap: 14px;
      }

      .mock-meta-item {
        min-height: 92px;
        padding: 16px;
        border-color: rgba(var(--green-rgb), .12);
        background:
          radial-gradient(circle at 12% 18%, rgba(var(--green-rgb), .08), transparent 34%),
          rgba(255,255,255,.032);
      }

      .mock-meta-item strong {
        font-size: 16px;
        line-height: 1.22;
        letter-spacing: -.01em;
      }

      .mock-meta-item span {
        white-space: normal;
      }

      .cert-final-issued,
      .cert-final-locked {
        grid-template-columns: minmax(320px, .95fr) minmax(420px, 1.05fr);
        gap: 22px;
        align-items: stretch;
      }

      .cert-final-card-art,
      .cert-final-locked-art {
        min-height: 260px;
      }

      .cert-final-card-content {
        align-content: center;
        padding: 8px 4px;
        gap: 12px;
      }

      .cert-final-card-content h3 {
        font-size: clamp(22px, 2vw, 30px);
        line-height: 1.04;
        max-width: 100%;
      }

      .cert-final-card-content p {
        font-size: 15px;
        line-height: 1.62;
      }

      .cert-final-locked-art {
        filter: grayscale(.78);
        opacity: .86;
      }

      .cert-final-locked-art::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgba(255,255,255,.04), rgba(0,0,0,.18));
        pointer-events: none;
      }

      .performance-side-column {
        align-items: start;
      }

      .performance-course-rank-list {
        gap: 12px;
      }

      .performance-course-rank {
        min-height: 66px;
        grid-template-columns: 42px minmax(0, 1fr) 62px;
        gap: 14px;
        padding: 10px 8px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,.065);
        background: rgba(255,255,255,.018);
      }

      .performance-course-rank strong {
        font-size: 14px;
        line-height: 1.25;
        letter-spacing: -.015em;
      }

      .performance-course-rank em {
        font-size: 13px;
      }

      .performance-security-list {
        gap: 12px;
      }

      .performance-security-item {
        min-height: 66px;
        border: 1px solid rgba(255,255,255,.065);
        border-radius: 12px;
        background: rgba(255,255,255,.018);
        padding: 12px;
        grid-template-columns: 34px minmax(0, 1fr) auto;
      }

      .performance-security-item strong {
        font-size: 14px;
        line-height: 1.25;
      }

      .performance-security-item span {
        font-size: 12px;
        line-height: 1.45;
      }

      .performance-cert-list {
        gap: 12px;
      }

      .performance-cert-row {
        min-height: 86px;
        grid-template-columns: 52px minmax(0, 1fr);
        align-items: center;
        padding: 14px;
      }

      .performance-cert-row em {
        grid-column: 2;
        justify-self: start;
        margin-top: 2px;
        white-space: nowrap;
      }

      @media (max-width: 1480px) {
        .exam-simulator-card {
          grid-template-columns: 1fr;
        }

        .exam-laptop-visual {
          min-height: 210px;
        }

        .exam-meta-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          max-width: none;
        }

        .performance-side-column {
          grid-template-columns: 1fr;
        }

        .performance-cert-card,
        .performance-activity-card,
        .performance-top-courses-card,
        .performance-security-card {
          min-height: auto;
        }
      }

      @media (max-width: 1180px) {
        .cert-final-issued,
        .cert-final-locked {
          grid-template-columns: 1fr;
        }

        .cert-final-card-art,
        .cert-final-locked-art {
          min-height: 230px;
        }
      }



      @media (max-width: 1500px) {
        .cert-final-layout {
          grid-template-columns: 1fr;
        }

        .cert-final-right {
          grid-template-columns: minmax(0,1fr);
        }

        .cert-final-steps {
          grid-template-columns: repeat(2, minmax(260px,1fr));
        }
      }



      @media (max-width: 760px) {
        .cert-final-steps {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 1320px) {
        .student-page { grid-template-columns: 102px minmax(0, 1fr); }
        .nav-item span,.user-card > div:nth-child(2) { display: none; }
      }

      @media (max-width: 1180px) {
        .student-page { grid-template-columns: 1fr; }
        .sidebar { position: relative; height: auto; }
        .mock-header,.mock-hero-grid,.mock-middle-grid,.analytics-grid,.hero-grid,.dashboard-bottom,.curriculum-grid,.curriculum-head,.performance-pro-grid { grid-template-columns: 1fr; }
        .exam-meta-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
      }

      .lesson-row {
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: stretch;
        padding: 8px;
      }

      .lesson-main-link {
        min-width: 0;
        display: grid;
        grid-template-columns: minmax(0,1fr) 100px 110px;
        gap: 12px;
        align-items: center;
        color: inherit;
        text-decoration: none;
      }

      .lesson-main-link.disabled {
        pointer-events: none;
      }

      .student-asset-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 7px;
        flex-wrap: wrap;
        padding-left: 10px;
      }

      .student-asset-actions button {
        min-height: 36px;
        border-radius: 999px;
        border: 1px solid rgba(var(--green-rgb), .24);
        background: rgba(var(--green-rgb), .075);
        color: var(--green);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        padding: 0 11px;
        font-size: 12px;
        font-weight: 900;
        cursor: pointer;
        white-space: nowrap;
      }

      .student-asset-actions button:hover {
        border-color: rgba(var(--green-rgb), .42);
        background: rgba(var(--green-rgb), .12);
        transform: translateY(-1px);
      }

      @media (max-width: 980px) {
        .lesson-row,
        .lesson-main-link {
          grid-template-columns: 1fr;
        }

        .student-asset-actions {
          justify-content: flex-start;
          padding-left: 0;
          padding-top: 8px;
        }
      }



      .roadmap-current-card,
      .roadmap-row {
        font: inherit;
        text-align: left;
        cursor: pointer;
      }

      .roadmap-current-card.selected,
      .roadmap-row.selected {
        border-color: rgba(var(--green-rgb), .58);
        box-shadow: 0 0 34px rgba(var(--green-rgb), .10), inset 0 0 0 1px rgba(var(--green-rgb), .08);
      }

      .roadmap-row.selectable:hover,
      .roadmap-row.locked.selectable:hover,
      .roadmap-current-card:hover {
        border-color: rgba(var(--green-rgb), .34);
        background: linear-gradient(90deg, rgba(var(--green-rgb), .10), rgba(255,255,255,.028));
        transform: translateY(-1px);
      }

      .lesson-panel {
        min-height: 420px;
      }

      .lesson-list .empty-state {
        border-style: dashed;
        border-color: rgba(var(--green-rgb), .18);
        background: rgba(var(--green-rgb), .035);
      }



      /* GHC ACADEMY · ESTÉTICA APROBADA CONSOLIDADA
         Oscura premium / grafito / carbón / blanco roto / verde controlado.
         Esta capa mantiene funcionalidades y fuerza coherencia visual en el área alumno. */

      .student-page {
        background:
          radial-gradient(circle at 12% -10%, rgba(var(--green-rgb), .075), transparent 32%),
          radial-gradient(circle at 96% 8%, rgba(255,255,255,.035), transparent 28%),
          linear-gradient(135deg, #050706 0%, #070a09 46%, #030404 100%) !important;
      }

      .shell {
        padding: 22px 24px 34px !important;
      }

      .sidebar {
        background:
          linear-gradient(180deg, rgba(8,11,10,.985), rgba(3,5,4,.965)),
          #050706 !important;
        border-right: 1px solid rgba(255,255,255,.075) !important;
        box-shadow: 18px 0 80px rgba(0,0,0,.22);
      }

      .nav-item {
        border-radius: 14px !important;
        transition: border-color .18s ease, background .18s ease, color .18s ease, transform .18s ease;
      }

      .nav-item:hover {
        color: rgba(244,246,242,.88);
        background: rgba(255,255,255,.035);
        border-color: rgba(255,255,255,.08);
      }

      .nav-item.active {
        border-color: rgba(var(--green-rgb), .24) !important;
        background:
          linear-gradient(90deg, rgba(var(--green-rgb),.145), rgba(var(--green-rgb),.045) 64%, rgba(255,255,255,.018)) !important;
        color: var(--green) !important;
        box-shadow: inset 3px 0 0 rgba(var(--green-rgb),.86), 0 12px 34px rgba(var(--green-rgb),.045) !important;
      }

      .topbar {
        min-height: 64px !important;
        border-bottom-color: rgba(255,255,255,.07) !important;
      }

      .breadcrumb,
      .topbar-actions a {
        color: rgba(244,246,242,.66) !important;
      }

      .topbar-actions a:nth-child(2) {
        color: var(--green) !important;
      }

      .notice {
        border-radius: 18px !important;
        color: rgba(244,246,242,.78) !important;
        background:
          linear-gradient(90deg, rgba(var(--green-rgb),.075), rgba(255,255,255,.022)) !important;
      }

      .progress-card,
      .next-card,
      .panel,
      .mock-mini,
      .cert-mini,
      .roadmap-panel,
      .lesson-panel,
      .mock-feature,
      .exam-simulator-card,
      .exam-rules-card,
      .latest-resultados-card,
      .readiness-card,
      .module-exams-card,
      .analytics-card,
      .premium-course-card,
      .premium-course-card-list,
      .certificate-card,
      .curriculum-metric,
      .performance-profile-card,
      .performance-metrics-strip,
      .performance-progress-card,
      .performance-cert-card,
      .performance-activity-card,
      .performance-top-courses-card,
      .performance-security-card,
      .cert-final-available,
      .cert-final-how,
      .cert-final-verify,
      .cert-final-status {
        border-radius: 22px !important;
        border: 1px solid rgba(255,255,255,.085) !important;
        background:
          radial-gradient(circle at top right, rgba(var(--green-rgb), .055), transparent 34%),
          linear-gradient(145deg, rgba(255,255,255,.052), rgba(255,255,255,.018)),
          rgba(8,12,10,.90) !important;
        box-shadow: 0 24px 82px rgba(0,0,0,.22) !important;
      }

      .progress-card h2,
      .panel > h2,
      .roadmap-panel h2,
      .lesson-panel h2,
      .courses-page h1,
      .curriculum-head h1,
      .mock-title-block h1,
      .performance-pro-header h1,
      .cert-final-copy h1 {
        letter-spacing: -.055em !important;
        color: var(--white) !important;
      }

      .progress-card > p,
      .next-body p,
      .roadmap-panel > p,
      .lesson-panel p,
      .curriculum-head p,
      .courses-page > section p,
      .mock-title-block p,
      .performance-pro-header p,
      .cert-final-subtitle {
        color: rgba(244,246,242,.60) !important;
      }

      .next-card,
      .mock-mini,
      .cert-mini {
        overflow: hidden !important;
      }

      .next-image,
      .premium-course-image,
      .roadmap-current-image,
      .exam-laptop-visual {
        filter: grayscale(.92) contrast(1.06) brightness(.70) !important;
      }

      .primary-action,
      .primary-button-small,
      .mock-primary-button,
      .cert-final-primary,
      .cert-pro-primary,
      .mock-mini button,
      .cert-mini button {
        border-radius: 999px !important;
        background: linear-gradient(135deg, var(--green), #7bee65) !important;
        color: #061008 !important;
        font-weight: 950 !important;
        box-shadow: 0 0 30px rgba(var(--green-rgb),.14) !important;
      }

      .secondary-button,
      .secondary-button-small,
      .review-button,
      .mock-secondary-button,
      .mock-ghost-button {
        border-radius: 999px !important;
        background: rgba(255,255,255,.04) !important;
        border-color: rgba(255,255,255,.12) !important;
        color: rgba(244,246,242,.84) !important;
      }

      .filters label,
      .filters button,
      .filters select,
      .view-toggle,
      .curriculum-side-head select {
        border-radius: 14px !important;
        background: rgba(255,255,255,.032) !important;
        border-color: rgba(255,255,255,.09) !important;
      }

      .filters button.active,
      .view-toggle button.active {
        background: rgba(var(--green-rgb),.105) !important;
        border-color: rgba(var(--green-rgb),.25) !important;
        color: var(--green) !important;
      }

      .premium-course-card,
      .premium-course-card-list {
        overflow: hidden !important;
      }

      .premium-course-body h3 {
        font-weight: 950 !important;
      }

      .premium-metric,
      .mini-stats,
      .compact-row,
      .roadmap-row,
      .lesson-row,
      .profile-stat,
      .empty-state,
      .performance-chart-wrap,
      .performance-insight-row,
      .performance-cert-row,
      .performance-security-item,
      .cert-final-issued,
      .cert-final-locked,
      .cert-final-empty {
        border-radius: 16px !important;
        border-color: rgba(255,255,255,.075) !important;
        background: rgba(255,255,255,.026) !important;
      }

      .roadmap-current-card {
        border-radius: 20px !important;
        border-color: rgba(var(--green-rgb),.36) !important;
        background:
          radial-gradient(circle at top right, rgba(var(--green-rgb),.12), transparent 36%),
          linear-gradient(100deg, rgba(var(--green-rgb),.085), rgba(255,255,255,.024)) !important;
        box-shadow: 0 22px 70px rgba(0,0,0,.20), 0 0 32px rgba(var(--green-rgb),.055) !important;
      }

      .roadmap-row.selectable:hover,
      .roadmap-current-card:hover,
      .compact-row:hover,
      .premium-course-card:hover,
      .premium-course-card-list:hover {
        transform: translateY(-1px);
        border-color: rgba(var(--green-rgb),.26) !important;
      }

      .lesson-row {
        grid-template-columns: minmax(0, 1fr) auto !important;
        align-items: stretch !important;
        padding: 8px !important;
      }

      .lesson-main-link {
        min-width: 0;
        display: grid;
        grid-template-columns: minmax(0,1fr) 100px 110px;
        gap: 12px;
        align-items: center;
        color: inherit;
        text-decoration: none;
      }

      .lesson-main-link.disabled {
        pointer-events: none;
      }

      .student-asset-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 7px;
        flex-wrap: wrap;
        padding-left: 10px;
      }

      .student-asset-actions button {
        min-height: 36px;
        border-radius: 999px;
        border: 1px solid rgba(var(--green-rgb), .24);
        background: rgba(var(--green-rgb), .075);
        color: var(--green);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        padding: 0 11px;
        font-size: 12px;
        font-weight: 900;
        cursor: pointer;
        white-space: nowrap;
      }

      .student-asset-actions button:hover {
        border-color: rgba(var(--green-rgb), .42);
        background: rgba(var(--green-rgb), .12);
        transform: translateY(-1px);
      }

      .lesson-status.active,
      .progress-badge,
      .completed-badge,
      .in-progress-mini,
      .cert-final-pill-issued,
      .cert-final-pill-locked {
        border-radius: 999px !important;
      }

      .curriculum-banner {
        border-radius: 22px !important;
        border-color: rgba(var(--green-rgb),.16) !important;
        background:
          radial-gradient(circle at top right, rgba(var(--green-rgb),.11), transparent 34%),
          linear-gradient(90deg, rgba(var(--green-rgb),.07), rgba(255,255,255,.024)) !important;
      }

      .exams-standby-page {
        display: grid;
        gap: 18px;
      }

      .exams-standby-hero {
        grid-template-columns: minmax(0, .9fr) minmax(520px, 1fr);
        border-radius: 22px;
        border: 1px solid rgba(255,255,255,.085);
        background:
          radial-gradient(circle at top right, rgba(var(--green-rgb),.09), transparent 34%),
          linear-gradient(145deg, rgba(255,255,255,.052), rgba(255,255,255,.018)),
          rgba(8,12,10,.92);
        padding: 22px;
        box-shadow: 0 24px 82px rgba(0,0,0,.22);
      }

      .exams-standby-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 16px;
      }

      .exams-standby-card {
        min-height: 250px;
        border-radius: 22px;
        border: 1px solid rgba(255,255,255,.085);
        background:
          radial-gradient(circle at top right, rgba(var(--green-rgb),.065), transparent 34%),
          linear-gradient(145deg, rgba(255,255,255,.052), rgba(255,255,255,.018)),
          rgba(8,12,10,.92);
        padding: 22px;
        display: grid;
        align-content: start;
        gap: 14px;
        box-shadow: 0 24px 82px rgba(0,0,0,.18);
      }

      .exams-standby-card.featured {
        border-color: rgba(var(--green-rgb),.22);
        background:
          radial-gradient(circle at top right, rgba(var(--green-rgb),.13), transparent 36%),
          linear-gradient(145deg, rgba(var(--green-rgb),.055), rgba(255,255,255,.018)),
          rgba(8,12,10,.94);
      }

      .exams-standby-card > span {
        width: 52px;
        height: 52px;
        border-radius: 16px;
        display: grid;
        place-items: center;
        color: var(--green);
        background: rgba(var(--green-rgb),.08);
        border: 1px solid rgba(var(--green-rgb),.18);
      }

      .exams-standby-card h2 {
        margin: 0;
        font-size: 26px;
        line-height: 1;
        letter-spacing: -.04em;
        font-weight: 950;
      }

      .exams-standby-card p {
        margin: 0;
        color: rgba(244,246,242,.60);
        line-height: 1.62;
      }

      .exams-standby-card em {
        width: fit-content;
        border-radius: 999px;
        border: 1px solid rgba(var(--green-rgb),.22);
        background: rgba(var(--green-rgb),.075);
        color: var(--green);
        padding: 7px 10px;
        font-size: 11px;
        font-style: normal;
        font-weight: 950;
        text-transform: uppercase;
        letter-spacing: .12em;
      }

      @media (max-width: 1120px) {
        .exams-standby-hero,
        .exams-standby-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 980px) {
        .lesson-row,
        .lesson-main-link {
          grid-template-columns: 1fr !important;
        }

        .student-asset-actions {
          justify-content: flex-start;
          padding-left: 0;
          padding-top: 8px;
        }
      }

    `}</style>
  );
}


/* ------------------------------ RECOVERY HELPERS ------------------------------ */
/* Estas funciones son necesarias para el build de Vercel. */

function isVisibleCourse(course: AnyRecord) {
  const status = String(course.status || '').toLowerCase();

  if (!status) return true;

  return ['published', 'publicado', 'active', 'activo', 'preview', 'demo'].includes(status);
}

function buildModuleViews({
  courseCard,
  lessonProgreso,
  moduleCompletions,
}: {
  courseCard: PanelCard;
  lessonProgreso: AnyRecord[];
  moduleCompletions: AnyRecord[];
}): ModuleView[] {
  return courseCard.courseModules.map((module, index) => {
    const moduleLecciones = courseCard.courseLessons.filter(
      (lesson) => String(lesson.module_id) === String(module.id)
    );

    const completadodLecciones = moduleLecciones.filter((lesson) =>
      lessonProgreso.some((progress) => String(progress.lesson_id) === String(lesson.id))
    ).length;

    const isCompletado = moduleCompletions.some(
      (completion) => String(completion.module_id) === String(module.id)
    );

    const previousModule = courseCard.courseModules[index - 1];

    const isUnlocked =
      index === 0 ||
      isCompletado ||
      moduleCompletions.some(
        (completion) => String(completion.module_id) === String(previousModule?.id)
      );

    const isCurrent =
      Boolean(courseCard.nextLesson) &&
      String(courseCard.nextLesson?.module_id) === String(module.id);

    const nextLessonInsideMódulo = moduleLecciones.find(
      (lesson) =>
        !lessonProgreso.some((progress) => String(progress.lesson_id) === String(lesson.id))
    );

    const targetLesson = nextLessonInsideMódulo || moduleLecciones[0];

    return {
      module,
      index,
      lessons: moduleLecciones,
      completadodLecciones,
      progress:
        moduleLecciones.length > 0
          ? Math.round((completadodLecciones / moduleLecciones.length) * 100)
          : isCompletado
            ? 100
            : 0,
      isCompletado,
      isCurrent,
      isBloqueado: !isUnlocked,
      href:
        isUnlocked && targetLesson
          ? `/cursos/${getCourseSlug(courseCard.course)}/${targetLesson.id}`
          : `/cursos/${getCourseSlug(courseCard.course)}`,
    };
  });
}


/* ------------------------------ FINAL AUXILIARY HELPERS ------------------------------ */
/* Estas funciones cierran las dependencias del dashboard para que Vercel compile. */

function findNextLesson({
  courseModules,
  courseLessons,
  lessonProgreso,
  moduleCompletions,
}: {
  courseModules: AnyRecord[];
  courseLessons: AnyRecord[];
  lessonProgreso: AnyRecord[];
  moduleCompletions: AnyRecord[];
}) {
  const completadodLessonIds = new Set(lessonProgreso.map((item) => String(item.lesson_id)));
  const completadodModuleIds = new Set(moduleCompletions.map((item) => String(item.module_id)));

  for (let index = 0; index < courseModules.length; index++) {
    const module = courseModules[index];

    const moduleUnlocked =
      index === 0 ||
      completadodModuleIds.has(String(module.id)) ||
      completadodModuleIds.has(String(courseModules[index - 1]?.id));

    if (!moduleUnlocked) continue;

    const moduleLecciones = courseLessons
      .filter((lesson) => String(lesson.module_id) === String(module.id))
      .sort(sortLecciones);

    const nextLesson = moduleLecciones.find((lesson) => !completadodLessonIds.has(String(lesson.id)));

    if (nextLesson) return nextLesson;
  }

  return courseLessons[0] || null;
}

function getOrder(item: AnyRecord, fallback: number) {
  return item.position ?? item.sort_order ?? item.order_index ?? item.order ?? fallback;
}

function sortMódulos(a: AnyRecord, b: AnyRecord) {
  const aNumber = extractModuleNumber(a.title);
  const bNumber = extractModuleNumber(b.title);

  if (aNumber !== bNumber) return aNumber - bNumber;

  return Number(getOrder(a, 999)) - Number(getOrder(b, 999));
}

function sortLecciones(a: AnyRecord, b: AnyRecord) {
  const aNumber = extractLessonNumber(a.title);
  const bNumber = extractLessonNumber(b.title);

  if (aNumber !== bNumber) return aNumber - bNumber;

  return Number(getOrder(a, 999)) - Number(getOrder(b, 999));
}

function extractLessonNumber(title: string = '') {
  const match = String(title).match(/lecci[oó]n\s*(\d+)/i);
  return match ? Number(match[1]) : 999;
}

function extractModuleNumber(title: string = '') {
  const match = String(title).match(/m[oó]dulo\s*(\d+)/i);
  return match ? Number(match[1]) : 999;
}

function getInitials(name: string) {
  return String(name)
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function shortName(name: string) {
  return String(name).split('@')[0].split(' ')[0];
}

function getCourseSlug(course: AnyRecord) {
  return String(course?.slug || course?.id || '');
}

function getCurrentPageLabel(tab: Tab) {
  if (tab === 'dashboard') return 'Panel';
  if (tab === 'cursos') return 'Mis cursos';
  if (tab === 'curriculum') return 'Itinerario';
  if (tab === 'examenes') return 'Simulador de exámenes';
  if (tab === 'certificados') return 'Certificados';
  return 'Rendimiento';
}

function getCourseImage(course: AnyRecord) {
  return (
    course?.cover_image ||
    course?.cover_image_url ||
    course?.image ||
    course?.image_url ||
    course?.thumbnail ||
    course?.thumbnail_url ||
    ''
  );
}

function getPremiumCourseBackground(course: AnyRecord, index: number) {
  const realImage = getCourseImage(course);

  const fallbacks = [
    'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=80',
  ];

  const selected = realImage || fallbacks[index % fallbacks.length];

  return `linear-gradient(180deg, rgba(5,7,6,0.02), rgba(5,7,6,0.88)), url(${selected})`;
}

function getLessonTipo(lesson: AnyRecord) {
  const raw = String(
    lesson.content_type || lesson.type || lesson.kind || lesson.format || 'video'
  ).toLowerCase();

  if (raw.includes('audio')) return 'Audio';
  if (raw.includes('pdf')) return 'PDF';
  if (raw.includes('quiz') || raw.includes('exam') || raw.includes('test')) return 'Test';
  if (raw.includes('text') || raw.includes('texto')) return 'Texto';

  return 'Vídeo';
}

function getLessonIcon(type: string): IconName {
  if (type === 'Audio') return 'audio';
  if (type === 'PDF') return 'pdf';
  if (type === 'Test') return 'exam';
  if (type === 'Texto') return 'text';

  return 'play';
}