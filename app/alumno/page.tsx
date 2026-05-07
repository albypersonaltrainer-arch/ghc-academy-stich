'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import GHCLogo from '../components/GHCLogo';

type AnyRecord = Record<string, any>;

type Tab = 'dashboard' | 'cursos' | 'curriculum' | 'examenes' | 'certificados' | 'perfil';
type ViewMode = 'grid' | 'list';
type CourseStatusFilter = 'active' | 'completed' | 'all';
type SortMode = 'recent' | 'title' | 'progress';

type IconName =
  | 'home'
  | 'dashboard'
  | 'courses'
  | 'curriculum'
  | 'exam'
  | 'certificate'
  | 'performance'
  | 'resources'
  | 'support'
  | 'logout'
  | 'clock'
  | 'chart'
  | 'document'
  | 'lock'
  | 'check'
  | 'arrow'
  | 'bell'
  | 'shield'
  | 'star'
  | 'user'
  | 'search'
  | 'grid'
  | 'list'
  | 'bookmark'
  | 'box'
  | 'play'
  | 'audio'
  | 'pdf'
  | 'text'
  | 'trophy'
  | 'target'
  | 'chat'
  | 'flame';

type DashboardCard = {
  course: AnyRecord;
  courseModules: AnyRecord[];
  courseLessons: AnyRecord[];
  completedLessonCount: number;
  completedModuleCount: number;
  completion: AnyRecord | undefined;
  certificate: AnyRecord | undefined;
  progressPercent: number;
  nextLesson: AnyRecord | null;
};

type ModuleView = {
  module: AnyRecord;
  index: number;
  lessons: AnyRecord[];
  completedLessons: number;
  progress: number;
  isCompleted: boolean;
  isCurrent: boolean;
  isLocked: boolean;
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const green = '#63E546';

const tabs: { id: Tab; label: string; helper: string; icon: IconName }[] = [
  { id: 'dashboard', label: 'Dashboard', helper: 'Resumen', icon: 'dashboard' },
  { id: 'cursos', label: 'My Courses', helper: 'Cursos activos', icon: 'courses' },
  { id: 'curriculum', label: 'Curriculum', helper: 'Módulos', icon: 'curriculum' },
  { id: 'examenes', label: 'Mock Exams', helper: 'Evaluación', icon: 'exam' },
  { id: 'certificados', label: 'Certification', helper: 'Credenciales', icon: 'certificate' },
  { id: 'perfil', label: 'Performance', helper: 'Perfil', icon: 'performance' },
];

export default function AlumnoPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [courseStatusFilter, setCourseStatusFilter] = useState<CourseStatusFilter>('active');
  const [levelFilter, setLevelFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [selectedCurriculumCourseId, setSelectedCurriculumCourseId] = useState('');

  const [user, setUser] = useState<AnyRecord | null>(null);
  const [profile, setProfile] = useState<AnyRecord | null>(null);

  const [courses, setCourses] = useState<AnyRecord[]>([]);
  const [modules, setModules] = useState<AnyRecord[]>([]);
  const [lessons, setLessons] = useState<AnyRecord[]>([]);
  const [lessonProgress, setLessonProgress] = useState<AnyRecord[]>([]);
  const [moduleCompletions, setModuleCompletions] = useState<AnyRecord[]>([]);
  const [courseCompletions, setCourseCompletions] = useState<AnyRecord[]>([]);
  const [certificates, setCertificates] = useState<AnyRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [systemMessage, setSystemMessage] = useState('');

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setSystemMessage('');

        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError || !userData.user) {
          router.replace('/acceso');
          return;
        }

        const activeUser = userData.user;
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

        const visibleCourses = Array.isArray(coursesData)
          ? coursesData
              .filter(isVisibleCourse)
              .sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')))
          : [];

        setCourses(visibleCourses);

        const courseIds = visibleCourses.map((course) => course.id).filter(Boolean);

        if (courseIds.length > 0) {
          const { data: modulesData } = await supabase
            .from('modules')
            .select('*')
            .in('course_id', courseIds);

          const finalModules = Array.isArray(modulesData) ? [...modulesData].sort(sortModules) : [];
          setModules(finalModules);

          const moduleIds = finalModules.map((module) => module.id).filter(Boolean);

          if (moduleIds.length > 0) {
            const { data: lessonsData } = await supabase
              .from('lessons')
              .select('*')
              .in('module_id', moduleIds);

            setLessons(Array.isArray(lessonsData) ? [...lessonsData].sort(sortLessons) : []);
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
          .eq('completed', true);

        setLessonProgress(Array.isArray(progressData) ? progressData : []);

        const { data: moduleCompletionData } = await supabase
          .from('module_completions')
          .select('*')
          .eq('user_id', activeUser.id)
          .eq('completed', true);

        setModuleCompletions(Array.isArray(moduleCompletionData) ? moduleCompletionData : []);

        const { data: courseCompletionData } = await supabase
          .from('course_completions')
          .select('*')
          .eq('user_id', activeUser.id)
          .eq('completed', true);

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

    loadDashboard();
  }, [router]);

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email ||
    'Alumno GHC Academy';

  const courseCards = useMemo<DashboardCard[]>(() => {
    return courses.map((course) => {
      const courseModules = modules
        .filter((module) => String(module.course_id) === String(course.id))
        .sort(sortModules);

      const courseLessons = lessons
        .filter((lesson) =>
          courseModules.some((module) => String(module.id) === String(lesson.module_id))
        )
        .sort(sortLessons);

      const completedLessonCount = courseLessons.filter((lesson) =>
        lessonProgress.some((progress) => String(progress.lesson_id) === String(lesson.id))
      ).length;

      const completedModuleCount = courseModules.filter((module) =>
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
          ? Math.round((completedLessonCount / courseLessons.length) * 100)
          : completion
            ? 100
            : 0;

      const nextLesson = findNextLesson({
        courseModules,
        courseLessons,
        lessonProgress,
        moduleCompletions,
      });

      return {
        course,
        courseModules,
        courseLessons,
        completedLessonCount,
        completedModuleCount,
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
    lessonProgress,
    moduleCompletions,
    courseCompletions,
    certificates,
  ]);

  const activeCourses = courseCards.filter((card) => !card.completion);
  const completedCourses = courseCards.filter((card) => Boolean(card.completion));

  const mainCourse = useMemo(() => {
    return (
      activeCourses.find((card) => card.courseModules.length > 0) ||
      completedCourses.find((card) => card.courseModules.length > 0) ||
      courseCards[0] ||
      null
    );
  }, [activeCourses, completedCourses, courseCards]);

  const curriculumCourse = useMemo(() => {
    if (selectedCurriculumCourseId) {
      const selected = courseCards.find(
        (card) => String(card.course.id) === String(selectedCurriculumCourseId)
      );
      if (selected) return selected;
    }

    return mainCourse || courseCards[0] || null;
  }, [courseCards, mainCourse, selectedCurriculumCourseId]);

  const moduleViews = useMemo<ModuleView[]>(() => {
    if (!mainCourse) return [];
    return buildModuleViews({
      courseCard: mainCourse,
      lessonProgress,
      moduleCompletions,
    });
  }, [mainCourse, lessonProgress, moduleCompletions]);

  const currentModuleView =
    moduleViews.find((item) => item.isCurrent) ||
    moduleViews.find((item) => !item.isLocked && !item.isCompleted) ||
    moduleViews[0] ||
    null;

  const curriculumModuleViews = useMemo<ModuleView[]>(() => {
    if (!curriculumCourse) return [];
    return buildModuleViews({
      courseCard: curriculumCourse,
      lessonProgress,
      moduleCompletions,
    });
  }, [curriculumCourse, lessonProgress, moduleCompletions]);

  const curriculumActiveModule =
    curriculumModuleViews.find((item) => item.isCurrent) ||
    curriculumModuleViews.find((item) => !item.isLocked && !item.isCompleted) ||
    curriculumModuleViews[0] ||
    null;

  const curriculumLessons = curriculumActiveModule?.lessons || [];

  const totalLessons = courseCards.reduce((acc, card) => acc + card.courseLessons.length, 0);
  const completedLessonsVisible = courseCards.reduce(
    (acc, card) => acc + card.completedLessonCount,
    0
  );

  const globalProgress =
    totalLessons > 0 ? Math.round((completedLessonsVisible / totalLessons) * 100) : 0;

  const stats = {
    courses: courses.length,
    lessons: completedLessonsVisible,
    modules: moduleCompletions.length,
    completedCourses: courseCompletions.length,
    certificates: certificates.length,
    globalProgress,
  };

  const availableLevels = useMemo(() => {
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
        courseStatusFilter === 'all' ||
        (courseStatusFilter === 'active' && !card.completion) ||
        (courseStatusFilter === 'completed' && Boolean(card.completion));

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
      if (sortMode === 'title') {
        return String(a.course.title || '').localeCompare(String(b.course.title || ''));
      }

      if (sortMode === 'progress') {
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
  }, [courseCards, searchTerm, courseStatusFilter, levelFilter, categoryFilter, sortMode]);

  const notifications = useMemo<NotificationItem[]>(() => {
    const nextHref =
      mainCourse?.nextLesson && mainCourse?.course
        ? `/cursos/${getCourseSlug(mainCourse.course)}/${mainCourse.nextLesson.id}`
        : mainCourse?.course
          ? `/cursos/${getCourseSlug(mainCourse.course)}`
          : '/cursos';

    return [
      {
        id: 'learning',
        title: 'Continúa tu ruta activa',
        message: mainCourse?.course?.title
          ? `Tienes pendiente avanzar en ${mainCourse.course.title}.`
          : 'Tienes cursos disponibles para continuar tu formación.',
        type: 'Learning',
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
        type: 'Certification',
        time: 'Hoy',
        unread: certificates.length > 0,
        href: '/alumno',
      },
      {
        id: 'catalog',
        title: 'Catálogo GHC Academy',
        message: 'Explora nuevos cursos y especializaciones disponibles.',
        type: 'Courses',
        time: 'Esta semana',
        unread: true,
        href: '/cursos',
      },
      {
        id: 'billing',
        title: 'Estado de acceso',
        message: 'Más adelante aquí aparecerán avisos de renovaciones o incidencias de pago.',
        type: 'Billing',
        time: 'Próximamente',
        unread: false,
      },
    ];
  }, [mainCourse, certificates.length]);

  const unreadNotifications = notifications.filter((item) => item.unread).length;

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/acceso');
  }

  if (loading) {
    return (
      <main className="page loading-page">
        <GlobalStyles />
        <Background />
        <section className="loading-card">
          <div className="loading-accent" />
          <GHCLogo size="md" showText tagline={false} />
          <p className="kicker">Portal privado</p>
          <h1>Cargando dashboard</h1>
          <p>Preparando cursos, módulos, progreso, certificados y perfil real del alumno.</p>
        </section>
      </main>
    );
  }

  return (
    <main data-ghc-page="student" className="page">
      <GlobalStyles />
      <Background />

      <aside className="sidebar">
        <div>
          <div className="logo-block">
            <GHCLogo size="md" showText tagline={false} />
          </div>

          <nav className="nav">
            {tabs.map((tab) => (
              <NavButton
                key={tab.id}
                icon={tab.icon}
                label={tab.label}
                helper={tab.helper}
                active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}
          </nav>

          <div className="sidebar-divider" />

          <NavButton
            icon="resources"
            label="Resources"
            helper="Materiales"
            active={false}
            onClick={() => setActiveTab('curriculum')}
          />

          <NavButton
            icon="support"
            label="Support"
            helper="Ayuda"
            active={false}
            onClick={() => setActiveTab('perfil')}
          />
        </div>

        <div className="sidebar-user-box">
          <div className="sidebar-user-top">
            <div className="avatar-large">{getInitials(displayName)}</div>

            <div className="sidebar-user-text">
              <p className="sidebar-user-name">{shortName(displayName)}</p>
              <p className="sidebar-user-role">
                Student <span className="pro-pill">Pro</span>
              </p>
            </div>
          </div>

          <div className="xp-box">
            <div className="xp-row">
              <span>XP Level</span>
              <strong>{Math.max(1, stats.modules + stats.completedCourses)}</strong>
            </div>

            <div className="progress-track-thin">
              <div className="progress-fill" style={{ width: `${Math.min(100, globalProgress)}%` }} />
            </div>
          </div>

          <button type="button" onClick={handleLogout} className="sign-out-button">
            <Icon name="logout" />
            Sign Out
          </button>
        </div>
      </aside>

      <section className="app-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <Icon name="home" />
            <span>Dashboard</span>
            <span className="breadcrumb-separator">›</span>
            <span>{getCurrentPageLabel(activeTab)}</span>
          </div>

          <div className="topbar-right">
            <Link href="/" className="topbar-link">
              Inicio
            </Link>

            <Link href="/cursos" className="topbar-link-strong">
              Explorar cursos
            </Link>

            <div className="notification-area">
              <button
                type="button"
                className="notification-button"
                aria-label="Notificaciones"
                onClick={() => setNotificationsOpen((value) => !value)}
              >
                <Icon name="bell" />
                {unreadNotifications > 0 && <span className="notification-dot" />}
                {unreadNotifications > 0 && (
                  <span className="notification-count">{unreadNotifications}</span>
                )}
              </button>

              {notificationsOpen && (
                <div className="notification-panel">
                  <div className="notification-header">
                    <div>
                      <p>Student alerts</p>
                      <h3>Notifications</h3>
                    </div>

                    <span>{unreadNotifications} new</span>
                  </div>

                  <div className="notification-list">
                    {notifications.map((notification) => {
                      const content = (
                        <article
                          className={
                            notification.unread ? 'notification-item unread' : 'notification-item'
                          }
                        >
                          <div className="notification-item-top">
                            <span>{notification.type}</span>
                            <small>{notification.time}</small>
                          </div>

                          <h4>{notification.title}</h4>
                          <p>{notification.message}</p>
                        </article>
                      );

                      if (notification.href) {
                        return (
                          <Link
                            key={notification.id}
                            href={notification.href}
                            className="notification-link"
                            onClick={() => setNotificationsOpen(false)}
                          >
                            {content}
                          </Link>
                        );
                      }

                      return <div key={notification.id}>{content}</div>;
                    })}
                  </div>

                  <div className="notification-footer">
                    Supabase notifications ready for phase 2
                  </div>
                </div>
              )}
            </div>

            <div className="user-mini">
              <div>
                <p>Welcome back,</p>
                <strong>{shortName(displayName)}</strong>
              </div>
              <div className="avatar-mini">{getInitials(displayName)}</div>
            </div>
          </div>
        </header>

        {systemMessage && <div className="notice">{systemMessage}</div>}

        {activeTab === 'dashboard' && (
          <DashboardView
            globalProgress={globalProgress}
            stats={stats}
            mainCourse={mainCourse}
            currentModuleView={currentModuleView}
            moduleViews={moduleViews}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'cursos' && (
          <CoursesView
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            courseStatusFilter={courseStatusFilter}
            setCourseStatusFilter={setCourseStatusFilter}
            levelFilter={levelFilter}
            setLevelFilter={setLevelFilter}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            sortMode={sortMode}
            setSortMode={setSortMode}
            viewMode={viewMode}
            setViewMode={setViewMode}
            availableLevels={availableLevels}
            availableCategories={availableCategories}
            filteredCards={filteredCards}
          />
        )}

        {activeTab === 'curriculum' && (
          <CurriculumView
            courseCards={courseCards}
            curriculumCourse={curriculumCourse}
            curriculumModuleViews={curriculumModuleViews}
            curriculumActiveModule={curriculumActiveModule}
            curriculumLessons={curriculumLessons}
            lessonProgress={lessonProgress}
            selectedCurriculumCourseId={selectedCurriculumCourseId}
            setSelectedCurriculumCourseId={setSelectedCurriculumCourseId}
          />
        )}

        {activeTab === 'examenes' && <MockExamsView />}

        {activeTab === 'certificados' && <CertificationTab certificates={certificates} />}

        {activeTab === 'perfil' && (
          <PerformanceTab displayName={displayName} user={user} profile={profile} stats={stats} />
        )}
      </section>
    </main>
  );
}

/* ------------------------------ VIEWS ------------------------------ */

function DashboardView({
  globalProgress,
  stats,
  mainCourse,
  currentModuleView,
  moduleViews,
  setActiveTab,
}: {
  globalProgress: number;
  stats: AnyRecord;
  mainCourse: DashboardCard | null;
  currentModuleView: ModuleView | null;
  moduleViews: ModuleView[];
  setActiveTab: (tab: Tab) => void;
}) {
  return (
    <div className="dashboard-grid">
      <section className="dashboard-top-grid">
        <article className="progress-card">
          <h2>Overall Progress</h2>

          <div className="progress-ring-wrap">
            <div
              className="progress-ring"
              style={{
                background: `conic-gradient(${green} ${globalProgress * 3.6}deg, rgba(255,255,255,0.095) 0deg)`,
              }}
            >
              <div className="progress-ring-inner">
                <strong>{globalProgress}%</strong>
                <span>Completed</span>
              </div>
            </div>
          </div>

          <p className="center-text">
            Excellent work. Keep building expertise and elevating performance.
          </p>

          <div className="progress-mini-stats">
            <MiniStat icon="clock" label="Lessons" value={stats.lessons} />
            <MiniStat icon="certificate" label="Certificates" value={stats.certificates} />
          </div>
        </article>

        <article className="next-module-card">
          <div className="hero-image" />

          <div className="next-content">
            <p className="in-progress-label">In progress</p>

            <h2>{currentModuleView?.module?.title || mainCourse?.course?.title || 'Next Module'}</h2>

            <p>
              {mainCourse?.course?.subtitle ||
                mainCourse?.course?.description ||
                'Explore your next learning step and keep progressing through the academy.'}
            </p>

            <div className="meta-row">
              <MetaItem icon="clock" text="4–5 Hours" />
              <MetaItem icon="chart" text={mainCourse?.course?.level || 'Intermediate'} />
              <MetaItem icon="document" text={`${mainCourse?.courseLessons.length || 0} Lessons`} />
            </div>

            <div className="progress-block">
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${mainCourse?.progressPercent || 0}%` }} />
              </div>
              <span>{mainCourse?.progressPercent || 0}% Complete</span>
            </div>

            <Link
              href={
                mainCourse?.nextLesson
                  ? `/cursos/${getCourseSlug(mainCourse.course)}/${mainCourse.nextLesson.id}`
                  : mainCourse
                    ? `/cursos/${getCourseSlug(mainCourse.course)}`
                    : '/cursos'
              }
              className="primary-button"
            >
              Continue Learning
              <Icon name="arrow" />
            </Link>
          </div>
        </article>
      </section>

      <Panel title="Curriculum">
        <div className="curriculum-rows">
          {moduleViews.length === 0 ? (
            <EmptyState text="Aún no hay módulos visibles para este curso." />
          ) : (
            moduleViews.slice(0, 6).map((item) => (
              <DashboardModuleRow key={item.module.id} item={item} />
            ))
          )}
        </div>
      </Panel>

      <section className="dashboard-bottom-grid">
        <article className="exam-card">
          <div>
            <h2>Mock Exam Simulator</h2>
            <p>Test your knowledge under real conditions before earning your final certification.</p>
            <button type="button" className="secondary-button" onClick={() => setActiveTab('examenes')}>
              Start Simulation
              <Icon name="arrow" />
            </button>
          </div>
        </article>

        <article className="certification-card">
          <div className="certification-bg-photo" />
          <div className="certification-bg-overlay" />
          <div className="cert-content">
            <p>Official Credential</p>
            <h2>Certification</h2>
            <p>Earn your official GHC Academy certificate when your learning path is completed and verified.</p>
            <button type="button" className="secondary-button" onClick={() => setActiveTab('certificados')}>
              View Certification
              <Icon name="arrow" />
            </button>
          </div>
        </article>
      </section>
    </div>
  );
}

function CoursesView({
  searchTerm,
  setSearchTerm,
  courseStatusFilter,
  setCourseStatusFilter,
  levelFilter,
  setLevelFilter,
  categoryFilter,
  setCategoryFilter,
  sortMode,
  setSortMode,
  viewMode,
  setViewMode,
  availableLevels,
  availableCategories,
  filteredCards,
}: {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  courseStatusFilter: CourseStatusFilter;
  setCourseStatusFilter: (value: CourseStatusFilter) => void;
  levelFilter: string;
  setLevelFilter: (value: string) => void;
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
  sortMode: SortMode;
  setSortMode: (value: SortMode) => void;
  viewMode: ViewMode;
  setViewMode: (value: ViewMode) => void;
  availableLevels: string[];
  availableCategories: string[];
  filteredCards: DashboardCard[];
}) {
  return (
    <div className="courses-page">
      <section>
        <h1 className="page-title">My Courses</h1>
        <p className="page-subtitle">
          Continue learning and track your progress across all your courses.
        </p>
      </section>

      <section className="course-controls">
        <label className="search-box">
          <Icon name="search" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search courses..."
          />
        </label>

        <button
          type="button"
          className={courseStatusFilter === 'active' ? 'filter-active' : 'filter-button'}
          onClick={() => setCourseStatusFilter('active')}
        >
          Active
        </button>

        <button
          type="button"
          className={courseStatusFilter === 'completed' ? 'filter-active' : 'filter-button'}
          onClick={() => setCourseStatusFilter('completed')}
        >
          Completed
        </button>

        <button
          type="button"
          className={courseStatusFilter === 'all' ? 'filter-active' : 'filter-button'}
          onClick={() => setCourseStatusFilter('all')}
        >
          All
        </button>

        <select
          value={levelFilter}
          onChange={(event) => setLevelFilter(event.target.value)}
          className="select-control"
        >
          <option value="all">Level</option>
          {availableLevels.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="select-control"
        >
          <option value="all">Category</option>
          {availableCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <div className="controls-spacer" />

        <select
          value={sortMode}
          onChange={(event) => setSortMode(event.target.value as SortMode)}
          className="sort-select"
        >
          <option value="recent">Sort by: Recent</option>
          <option value="title">Sort by: Title</option>
          <option value="progress">Sort by: Progress</option>
        </select>

        <div className="view-toggle">
          <button
            type="button"
            className={viewMode === 'grid' ? 'view-button-active' : 'view-button'}
            onClick={() => setViewMode('grid')}
            aria-label="Ver en cuadrícula"
          >
            <Icon name="grid" />
          </button>

          <button
            type="button"
            className={viewMode === 'list' ? 'view-button-active' : 'view-button'}
            onClick={() => setViewMode('list')}
            aria-label="Ver en lista"
          >
            <Icon name="list" />
          </button>
        </div>
      </section>

      <section className="course-section-header">
        <h2>
          {courseStatusFilter === 'completed'
            ? 'Completed Courses'
            : courseStatusFilter === 'all'
              ? 'All Courses'
              : 'Active Courses'}
        </h2>

        <span>
          {filteredCards.length} result{filteredCards.length === 1 ? '' : 's'}
        </span>
      </section>

      {filteredCards.length === 0 ? (
        <EmptyState text="No hay cursos que coincidan con los filtros seleccionados." />
      ) : (
        <div className={viewMode === 'grid' ? 'premium-course-grid' : 'premium-course-list'}>
          {filteredCards.map((card, index) => (
            <PremiumCourseCard
              key={card.course.id}
              card={card}
              index={index}
              mode={viewMode}
              completed={Boolean(card.completion)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CurriculumView({
  courseCards,
  curriculumCourse,
  curriculumModuleViews,
  curriculumActiveModule,
  curriculumLessons,
  lessonProgress,
  selectedCurriculumCourseId,
  setSelectedCurriculumCourseId,
}: {
  courseCards: DashboardCard[];
  curriculumCourse: DashboardCard | null;
  curriculumModuleViews: ModuleView[];
  curriculumActiveModule: ModuleView | null;
  curriculumLessons: AnyRecord[];
  lessonProgress: AnyRecord[];
  selectedCurriculumCourseId: string;
  setSelectedCurriculumCourseId: (value: string) => void;
}) {
  return (
    <div className="curriculum-page">
      <section className="curriculum-header-compact">
        <div>
          <h1 className="page-title">Curriculum</h1>
          <p className="page-subtitle">Your structured learning path to mastery.</p>
        </div>

        <div className="curriculum-header-right">
          <div className="current-course-box">
            <span>Current Course</span>
            <select
              value={selectedCurriculumCourseId || curriculumCourse?.course?.id || ''}
              onChange={(event) => setSelectedCurriculumCourseId(event.target.value)}
            >
              {courseCards.map((card) => (
                <option key={card.course.id} value={card.course.id}>
                  {card.course.title}
                </option>
              ))}
            </select>
          </div>

          <div className="curriculum-metrics-row">
            <CurriculumMetric
              icon="curriculum"
              label="Total Modules"
              value={curriculumCourse?.courseModules.length || 0}
              helper="Modules"
            />
            <CurriculumMetric
              icon="check"
              label="Completed Lessons"
              value={`${curriculumCourse?.completedLessonCount || 0}/${
                curriculumCourse?.courseLessons.length || 0
              }`}
              helper={`${curriculumCourse?.progressPercent || 0}% complete`}
            />
            <CurriculumMetric
              icon="performance"
              label="Current Stage"
              value={curriculumActiveModule ? `Module ${curriculumActiveModule.index + 1}` : '—'}
              helper={
                curriculumActiveModule?.isCurrent
                  ? 'In Progress'
                  : curriculumActiveModule?.isCompleted
                    ? 'Completed'
                    : 'Ready'
              }
            />
          </div>
        </div>
      </section>

      <section className="curriculum-main-grid-compact">
        <article className="roadmap-panel-compact">
          <div className="panel-header-compact">
            <h2>Module Roadmap</h2>
            <p>Track your progress through each module.</p>
          </div>

          <div className="roadmap-list-compact">
            {curriculumModuleViews.length === 0 ? (
              <EmptyState text="Aún no hay módulos visibles para este curso." />
            ) : (
              curriculumModuleViews.map((item) => (
                <RoadmapModuleRow
                  key={item.module.id}
                  item={item}
                  course={curriculumCourse?.course}
                />
              ))
            )}
          </div>

          <div className="roadmap-footer-note-compact">
            <Icon name="shield" />
            <span>Complete modules in order to unlock new content and assessments.</span>
          </div>
        </article>

        <article className="module-detail-panel">
          <div className="module-detail-top">
            <div>
              <h2>
                {curriculumActiveModule
                  ? `Module ${curriculumActiveModule.index + 1}: ${
                      curriculumActiveModule.module.title || 'Current Module'
                    }`
                  : 'Module Lessons'}
              </h2>

              <p>
                {curriculumCourse?.course?.subtitle ||
                  curriculumCourse?.course?.description ||
                  'Explore the current module and continue your learning path.'}
              </p>
            </div>

            <div className="module-progress-badge">
              <strong>{curriculumActiveModule?.progress || 0}%</strong>
              <span>Complete</span>
            </div>
          </div>

          <div className="progress-track-compact">
            <div
              className="progress-fill"
              style={{
                width: `${curriculumActiveModule?.progress || 0}%`,
              }}
            />
          </div>

          <div className="lesson-table-header-compact">
            <span>Lessons</span>
            <span>Type</span>
            <span>Status</span>
          </div>

          <div className="lesson-rows-compact">
            {curriculumLessons.length === 0 ? (
              <EmptyState text="Este módulo todavía no tiene lecciones visibles." />
            ) : (
              curriculumLessons.slice(0, 8).map((lesson, index) => {
                const completed = lessonProgress.some(
                  (progress) => String(progress.lesson_id) === String(lesson.id)
                );

                const active =
                  curriculumCourse?.nextLesson &&
                  String(curriculumCourse.nextLesson.id) === String(lesson.id);

                const locked =
                  curriculumActiveModule?.isLocked ||
                  (!completed && !active && index > (curriculumActiveModule?.completedLessons || 0));

                return (
                  <LessonRow
                    key={lesson.id}
                    lesson={lesson}
                    index={index}
                    completed={completed}
                    active={Boolean(active)}
                    locked={Boolean(locked)}
                    href={
                      curriculumCourse?.course
                        ? `/cursos/${getCourseSlug(curriculumCourse.course)}/${lesson.id}`
                        : '#'
                    }
                  />
                );
              })
            )}
          </div>

          <div className="module-footer-compact">
            <div className="module-footer-meta">
              <div className="module-footer-item">
                <Icon name="clock" />
                <div>
                  <span>Estimated Time</span>
                  <strong>4–5 Hours</strong>
                </div>
              </div>

              <div className="module-footer-item">
                <Icon name="chart" />
                <div>
                  <span>Difficulty</span>
                  <strong>{curriculumCourse?.course?.level || 'Intermediate'}</strong>
                </div>
              </div>
            </div>

            <Link
              href={
                curriculumCourse?.course
                  ? `/cursos/${getCourseSlug(curriculumCourse.course)}`
                  : '/cursos'
              }
              className="resources-button"
            >
              View Module Resources
              <Icon name="arrow" />
            </Link>
          </div>
        </article>
      </section>

      <article className="curriculum-banner-compact">
        <div className="banner-icon">
          <Icon name="trophy" />
        </div>

        <div>
          <h3>Stay Consistent, Achieve Excellence</h3>
          <p>Continue making progress each day. Small steps lead to big results.</p>
        </div>

        <Link
          href={
            curriculumCourse?.nextLesson
              ? `/cursos/${getCourseSlug(curriculumCourse.course)}/${curriculumCourse.nextLesson.id}`
              : curriculumCourse?.course
                ? `/cursos/${getCourseSlug(curriculumCourse.course)}`
                : '/cursos'
          }
          className="keep-going-link"
        >
          Keep Going
          <Icon name="arrow" />
        </Link>
      </article>
    </div>
  );
}

function MockExamsView() {
  const results = [
    {
      title: 'Neuromuscular Adaptations',
      date: 'Attempted on May 12, 2025 · 10:30 AM',
      score: '85%',
      status: 'Passed',
      ok: true,
    },
    {
      title: 'Energy Systems',
      date: 'Attempted on May 8, 2025 · 02:15 PM',
      score: '72%',
      status: 'Passed',
      ok: true,
    },
    {
      title: 'Biomechanics Fundamentals',
      date: 'Attempted on May 5, 2025 · 11:45 AM',
      score: '65%',
      status: 'Failed',
      ok: false,
    },
    {
      title: 'Hypertrophy Mechanics',
      date: 'Attempted on Apr 30, 2025 · 09:20 AM',
      score: '58%',
      status: 'Failed',
      ok: false,
    },
  ];

  const moduleExams = [
    { title: 'Neuromuscular Adaptations', meta: '3 / 3 Exams', score: 75, color: green },
    { title: 'Energy Systems', meta: '2 / 2 Exams', score: 72, color: green },
    { title: 'Biomechanics Fundamentals', meta: '2 / 2 Exams', score: 65, color: '#F7C948' },
    { title: 'Hypertrophy Mechanics', meta: '0 / 1 Exams', score: 0, color: '#FF5757' },
  ];

  return (
    <div className="mock-page">
      <section className="mock-header">
        <div className="mock-title-block">
          <span className="mock-target-icon">
            <Icon name="target" />
          </span>
          <div>
            <h1>Mock Exams</h1>
            <p>
              Simulate real certification conditions and evaluate your readiness with advanced
              performance analytics.
            </p>
          </div>
        </div>

        <div className="mock-feature-strip">
          <MockFeature icon="clock" title="Timed Sessions" text="Real exam time limits" />
          <MockFeature
            icon="chat"
            title="Instant Feedback"
            text="Detailed explanations and solutions"
          />
          <MockFeature
            icon="shield"
            title="Certification Prep"
            text="Aligned with GHC standards"
          />
        </div>
      </section>

      <section className="mock-hero-grid">
        <article className="exam-simulator-card">
          <div className="exam-simulator-content">
            <div className="exam-title-row">
              <h2>Exam Simulator</h2>
              <span>Featured</span>
            </div>

            <p>
              Take a full-length mock exam that simulates the real certification experience and
              tests your knowledge under pressure.
            </p>

            <div className="exam-meta-grid">
              <MockMeta icon="lock" label="Mode" value="Timed Simulation" />
              <MockMeta icon="clock" label="Duration" value="2 Hours" />
              <MockMeta icon="document" label="Questions" value="90 Questions" />
              <MockMeta icon="target" label="Passing Score" value="70%" />
            </div>

            <div className="exam-action-row">
              <button type="button" className="mock-primary-button">
                Start Simulation
                <Icon name="arrow" />
              </button>

              <button type="button" className="mock-ghost-button">
                View Exam Details
                <Icon name="arrow" />
              </button>
            </div>
          </div>

          <div className="exam-laptop-visual">
            <div className="exam-laptop-screen">
              <span>Mock Exam</span>
              <strong>02:00:00</strong>
              <div className="exam-laptop-rows">
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
        </article>

        <article className="exam-rules-card">
          <div className="exam-rules-title">
            <Icon name="document" />
            <h2>Exam Rules</h2>
          </div>

          <div className="rule-list">
            {[
              'Real exam timing and conditions',
              'No pause once the exam begins',
              'No external resources allowed',
              'Answers submitted automatically',
              'Results available immediately',
              'Review explanations after completion',
            ].map((rule) => (
              <div key={rule} className="rule-item">
                <Icon name="check" />
                <span>{rule}</span>
              </div>
            ))}
          </div>

          <button type="button" className="mock-secondary-button">
            View Full Rules
            <Icon name="arrow" />
          </button>
        </article>
      </section>

      <section className="mock-middle-grid">
        <article className="latest-results-card">
          <div className="mock-card-header">
            <h2>Latest Results</h2>
            <button type="button">View All Results</button>
          </div>

          <div className="results-list">
            {results.map((result) => (
              <div key={result.title} className="result-row">
                <span className={result.ok ? 'result-icon-ok' : 'result-icon-fail'}>
                  <Icon name="document" />
                </span>

                <div className="result-info">
                  <strong>{result.title}</strong>
                  <p>{result.date}</p>
                </div>

                <div className={result.ok ? 'result-score-ok' : 'result-score-fail'}>
                  <strong>{result.score}</strong>
                  <span>{result.status}</span>
                </div>

                <Icon name="arrow" />
              </div>
            ))}
          </div>
        </article>

        <article className="readiness-card">
          <div className="mock-card-header">
            <h2>Readiness Score</h2>
            <button type="button">View Details</button>
          </div>

          <div className="readiness-ring-wrap">
            <div
              className="readiness-ring"
              style={{
                background: `conic-gradient(${green} ${78 * 3.6}deg, rgba(255,255,255,0.10) 0deg)`,
              }}
            >
              <div className="readiness-ring-inner">
                <strong>78%</strong>
                <span>Ready</span>
              </div>
            </div>
          </div>

          <p>You're well prepared! Keep practicing to boost your confidence.</p>

          <div className="readiness-footer">
            <span>Target Score: 70%</span>
            <strong>Above Target</strong>
          </div>
        </article>

        <article className="module-exams-card">
          <div className="mock-card-header">
            <h2>Module Exams</h2>
            <button type="button">View All Modules</button>
          </div>

          <div className="module-exam-list">
            {moduleExams.map((item) => (
              <div key={item.title} className="module-exam-row">
                <Icon name="document" />
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.meta}</span>
                  <div className="module-exam-progress">
                    <div
                      style={{
                        width: `${item.score}%`,
                        height: '100%',
                        borderRadius: 999,
                        background: item.color,
                      }}
                    />
                  </div>
                </div>
                <strong style={{ color: item.color }}>{item.score}%</strong>
                <Icon name="arrow" />
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="analytics-card">
        <h2>Performance Analytics</h2>

        <div className="analytics-grid">
          <div className="average-score-card">
            <span>Average Score</span>
            <strong>70%</strong>
            <p>Across 7 Attempts</p>
            <em>▲ 12% vs last month</em>
            <div className="sparkline" />
          </div>

          <div className="score-trend-card">
            <div className="score-trend-tooltip">
              <span>May 12, 2025</span>
              <strong>85%</strong>
            </div>

            <h3>Score Trend</h3>
            <div className="score-trend-grid">
              <svg viewBox="0 0 520 170" className="trend-svg" aria-hidden="true">
                <path
                  d="M20 120 L85 88 L150 100 L215 72 L280 80 L345 62 L410 70 L500 48"
                  fill="none"
                  stroke={green}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M20 120 L85 88 L150 100 L215 72 L280 80 L345 62 L410 70 L500 48 L500 160 L20 160 Z"
                  fill="rgba(99,229,70,0.10)"
                />
              </svg>
            </div>
          </div>

          <div className="focus-area-card">
            <h3>Strengths & Focus Areas</h3>

            <div className="focus-item">
              <span className="focus-icon-green">
                <Icon name="flame" />
              </span>
              <div>
                <strong>Strengths</strong>
                <p>Energy Systems, Neuromuscular</p>
              </div>
            </div>

            <div className="focus-item">
              <span className="focus-icon-gold">
                <Icon name="target" />
              </span>
              <div>
                <strong>Focus Areas</strong>
                <p>Hypertrophy Mechanics, Biomechanics</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function CertificationTab({ certificates }: { certificates: AnyRecord[] }) {
  return (
    <div className="section-stack">
      <Panel title="Certification">
        {certificates.length === 0 ? (
          <EmptyState text="Aún no tienes certificados reales emitidos. Completa un curso y emite tu certificado para verlo aquí." />
        ) : (
          <div className="course-grid">
            {certificates.map((certificate) => (
              <CertificateCard key={certificate.id} certificate={certificate} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function PerformanceTab({
  displayName,
  user,
  profile,
  stats,
}: {
  displayName: string;
  user: AnyRecord | null;
  profile: AnyRecord | null;
  stats: AnyRecord;
}) {
  return (
    <div className="section-stack">
      <Panel title="Performance Profile">
        <div className="profile-grid">
          <ProfileStat label="Alumno" value={displayName} />
          <ProfileStat label="Email" value={user?.email || '—'} />
          <ProfileStat label="Rol" value={profile?.role || 'student'} />
          <ProfileStat label="Cursos completados" value={stats.completedCourses} />
          <ProfileStat label="Certificados" value={stats.certificates} />
          <ProfileStat label="Progreso global" value={`${stats.globalProgress}%`} />
        </div>
      </Panel>

      <Panel title="Security Roadmap">
        <div className="info-grid">
          <InfoBlock
            icon="shield"
            title="Acceso protegido"
            text="Ruta /alumno protegida mediante Supabase Auth."
          />
          <InfoBlock
            icon="user"
            title="Dispositivos"
            text="Preparado para añadir control de sesiones y dispositivos autorizados."
          />
          <InfoBlock
            icon="performance"
            title="IA 24/7"
            text="Base preparada para tutoría inteligente y recomendaciones personalizadas."
          />
        </div>
      </Panel>
    </div>
  );
}

function MockFeature({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <article className="mock-feature">
      <span>
        <Icon name={icon} />
      </span>
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

function DashboardModuleRow({ item }: { item: ModuleView }) {
  if (item.isLocked) {
    return (
      <article className="dashboard-module-row locked">
        <div className="dashboard-module-icon locked">
          <Icon name="lock" />
        </div>

        <div className="dashboard-module-body">
          <p className="module-mini-label muted">Module {item.index + 1}</p>
          <h3>{item.module.title || `Módulo ${item.index + 1}`}</h3>
        </div>

        <span className="locked-pill">Locked</span>
      </article>
    );
  }

  return (
    <Link href={item.href} className={item.isCurrent ? 'dashboard-module-row active' : 'dashboard-module-row'}>
      <div className={item.isCompleted ? 'dashboard-module-icon done' : 'dashboard-module-icon'}>
        <Icon name={item.isCompleted ? 'check' : 'curriculum'} />
      </div>

      <div className="dashboard-module-body">
        <div className="dashboard-module-top">
          <p className="module-mini-label">Module {item.index + 1}</p>
          {item.isCurrent && <span className="in-progress-mini">In progress</span>}
        </div>

        <h3>{item.module.title || `Módulo ${item.index + 1}`}</h3>

        {item.isCurrent && (
          <div className="progress-track-mini">
            <div className="progress-fill" style={{ width: `${item.progress}%` }} />
          </div>
        )}
      </div>

      <div className="dashboard-module-right">
        <strong>{item.isCompleted ? '100% Score' : `${item.progress}%`}</strong>
      </div>
    </Link>
  );
}

function PremiumCourseCard({
  card,
  completed = false,
  index,
  mode,
}: {
  card: DashboardCard;
  completed?: boolean;
  index: number;
  mode: ViewMode;
}) {
  const course = card.course;
  const href = card.nextLesson
    ? `/cursos/${getCourseSlug(course)}/${card.nextLesson.id}`
    : `/cursos/${getCourseSlug(course)}`;

  return (
    <article className={mode === 'grid' ? 'premium-course-card' : 'premium-course-card-list'}>
      <div
        className={mode === 'grid' ? 'premium-course-image' : 'premium-course-image list'}
        style={{
          backgroundImage: getPremiumCourseBackground(course, index),
        }}
      >
        <div className="premium-image-overlay" />

        <div className="course-top-badges">
          <span className={completed ? 'completed-badge' : 'progress-badge'}>
            {completed ? 'Completed' : 'In Progress'}
          </span>
        </div>

        <span className="bookmark-icon">
          <Icon name={completed ? 'check' : 'bookmark'} />
        </span>
      </div>

      <div className="premium-course-body">
        <h3>{course.title || 'Curso GHC Academy'}</h3>
        <p>
          {course.subtitle ||
            course.description ||
            'Formación premium basada en ciencia, estructura y rendimiento.'}
        </p>

        <div className="premium-stats-grid">
          <PremiumMetric icon="document" value={card.courseLessons.length} label="Lessons" />
          <PremiumMetric icon="box" value={card.courseModules.length} label="Modules" />
          <PremiumMetric icon="chart" value={`${card.progressPercent}%`} label="Progress" />
        </div>

        <div className="card-progress-area">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${card.progressPercent}%` }} />
          </div>
          <span className="progress-text-green">{card.progressPercent}% Complete</span>
        </div>

        <div className="premium-actions">
          <Link href={href} className={completed ? 'review-button' : 'primary-button-small'}>
            {completed ? 'Review' : 'Continue'}
            {!completed && <Icon name="arrow" />}
          </Link>

          <Link href={`/cursos/${getCourseSlug(course)}`} className="secondary-button-small">
            Details
          </Link>
        </div>
      </div>
    </article>
  );
}

function PremiumMetric({
  icon,
  value,
  label,
}: {
  icon: IconName;
  value: string | number;
  label: string;
}) {
  return (
    <div className="premium-metric">
      <div>
        <Icon name={icon} />
        <strong>{value}</strong>
      </div>
      <span>{label}</span>
    </div>
  );
}

function CurriculumMetric({
  icon,
  label,
  value,
  helper,
}: {
  icon: IconName;
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <article className="curriculum-metric">
      <span>
        <Icon name={icon} />
      </span>

      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <em>{helper}</em>
      </div>
    </article>
  );
}

function RoadmapModuleRow({ item, course }: { item: ModuleView; course?: AnyRecord }) {
  const title = item.module.title || `Module ${item.index + 1}`;

  if (item.isCurrent) {
    return (
      <Link href={item.href} className="roadmap-current-card">
        <div className="roadmap-current-line" />

        <div className="roadmap-current-content">
          <div className="roadmap-top-badges">
            <span className="module-mini-label">Module {item.index + 1}</span>
            <span className="in-progress-mini">In Progress</span>
          </div>

          <h3>{title}</h3>

          <p>
            {item.completedLessons} of {item.lessons.length} Lessons Completed
          </p>

          <div className="progress-track-mini">
            <div className="progress-fill" style={{ width: `${item.progress}%` }} />
          </div>

          <div className="roadmap-bottom-row">
            <span>{item.progress}% Complete</span>

            <span>
              Continue
              <Icon name="arrow" />
            </span>
          </div>
        </div>

        <div
          className="roadmap-current-image"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(5,7,6,0.02), rgba(5,7,6,0.74)), url(${
              getCourseImage(course || {}) ||
              'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=1200&q=80'
            })`,
          }}
        />
      </Link>
    );
  }

  if (item.isLocked) {
    return (
      <article className="roadmap-row locked">
        <div className="roadmap-dot locked">
          <Icon name="lock" />
        </div>

        <div className="roadmap-body">
          <p className="module-mini-label muted">Module {item.index + 1}</p>
          <h3>{title}</h3>
          <p>{item.lessons.length} Lessons</p>
        </div>

        <span className="locked-pill">Locked</span>
      </article>
    );
  }

  return (
    <Link href={item.href} className="roadmap-row">
      <div className={item.isCompleted ? 'roadmap-dot done' : 'roadmap-dot'}>
        <Icon name={item.isCompleted ? 'check' : 'curriculum'} />
      </div>

      <div className="roadmap-body">
        <p className="module-mini-label">Module {item.index + 1}</p>
        <h3>{title}</h3>
        <p>{item.lessons.length} Lessons</p>
      </div>

      <div className="roadmap-side">
        <strong>{item.isCompleted ? '100%' : `${item.progress}%`}</strong>
        <span>{item.isCompleted ? 'Completed' : 'Ready'}</span>
      </div>
    </Link>
  );
}

function LessonRow({
  lesson,
  index,
  completed,
  active,
  locked,
  href,
}: {
  lesson: AnyRecord;
  index: number;
  completed: boolean;
  active: boolean;
  locked: boolean;
  href: string;
}) {
  const contentType = getLessonType(lesson);
  const icon = getLessonIcon(contentType);
  const title = lesson.title || `Lesson ${index + 1}`;

  const content = (
    <article className={active ? 'lesson-row active' : locked ? 'lesson-row locked' : 'lesson-row'}>
      <div className="lesson-name-cell">
        <span className={completed ? 'lesson-icon done' : active ? 'lesson-icon active' : 'lesson-icon'}>
          <Icon name={completed ? 'check' : icon} />
        </span>

        <div>
          <strong>{`${index + 1}. ${title}`}</strong>
          <p>{lesson.description || lesson.subtitle || 'Contenido académico del módulo'}</p>
        </div>
      </div>

      <span className="lesson-type-pill">
        <Icon name={icon} />
        {contentType}
      </span>

      <span
        className={
          locked
            ? 'lesson-status locked'
            : completed
              ? 'lesson-status completed'
              : active
                ? 'lesson-status active'
                : 'lesson-status pending'
        }
      >
        {locked ? 'Locked' : completed ? 'Completed' : active ? 'In Progress' : 'Pending'}
      </span>
    </article>
  );

  if (locked) return content;

  return (
    <Link href={href} className="lesson-link">
      {content}
    </Link>
  );
}

function CertificateCard({ certificate }: { certificate: AnyRecord }) {
  return (
    <article className="certificate-card">
      <div className="certificate-icon">
        <Icon name="star" />
      </div>

      <span className="progress-badge">Valid Certificate</span>

      <h3>{certificate.course_title || 'Curso completado'}</h3>

      <div className="profile-grid">
        <ProfileStat label="Score" value={`${certificate.final_score ?? '—'}%`} />
        <ProfileStat label="Status" value="Valid" />
        <ProfileStat label="Code" value={certificate.certificate_code || '—'} />
      </div>

      {certificate.verification_slug ? (
        <Link href={`/certificados/${certificate.verification_slug}`} className="primary-button">
          View Certificate
          <Icon name="arrow" />
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
      <span>
        <Icon name={icon} />
      </span>
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
