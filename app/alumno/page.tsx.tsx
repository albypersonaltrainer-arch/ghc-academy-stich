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

type DashboardCard = {
  course: AnyRecord;
  courseModules: AnyRecord[];
  courseLessons: AnyRecord[];
  completedLessonCount: number;
  completedModuleCount: number;
  completion?: AnyRecord;
  certificate?: AnyRecord;
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
      <main className="student-page loading-page">
        <GlobalStyles />
        <Background />
        <section className="loading-card">
          <GHCLogo size="md" showText tagline={false} />
          <h1>Cargando dashboard</h1>
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
              Student <span>Pro</span>
            </p>
          </div>
          <button type="button" onClick={handleLogout}>
            <Icon name="logout" />
            Sign Out
          </button>
        </div>
      </aside>

      <section className="shell">
        <header className="topbar">
          <div className="breadcrumb">
            <Icon name="home" />
            <span>Dashboard</span>
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
                {unreadNotifications > 0 && <em>{unreadNotifications}</em>}
              </button>

              {notificationsOpen && (
                <div className="notifications-panel">
                  <div className="notifications-header">
                    <div>
                      <p>Student alerts</p>
                      <h3>Notifications</h3>
                    </div>
                    <span>{unreadNotifications} new</span>
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
          <DashboardView
            globalProgress={globalProgress}
            stats={stats}
            mainCourse={mainCourse}
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
  moduleViews,
  setActiveTab,
}: {
  globalProgress: number;
  stats: AnyRecord;
  mainCourse: DashboardCard | null;
  moduleViews: ModuleView[];
  setActiveTab: (tab: Tab) => void;
}) {
  return (
    <div className="dashboard-grid">
      <section className="hero-grid">
        <article className="progress-card">
          <h2>Overall Progress</h2>

          <div
            className="progress-ring"
            style={{
              background: `conic-gradient(${GREEN} ${globalProgress * 3.6}deg, rgba(255,255,255,0.095) 0deg)`,
            }}
          >
            <div>
              <strong>{globalProgress}%</strong>
              <span>Completed</span>
            </div>
          </div>

          <p>Excellent work. Keep building expertise and elevating performance.</p>

          <div className="mini-stats">
            <MiniStat icon="clock" label="Lessons" value={stats.lessons} />
            <MiniStat icon="certificate" label="Certificates" value={stats.certificates} />
          </div>
        </article>

        <article className="next-card">
          <div className="next-image" />
          <div className="next-body">
            <small>In progress</small>
            <h2>{mainCourse?.course?.title || 'Next Module'}</h2>
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
            <Link
              href={
                mainCourse?.nextLesson
                  ? `/cursos/${getCourseSlug(mainCourse.course)}/${mainCourse.nextLesson.id}`
                  : mainCourse
                    ? `/cursos/${getCourseSlug(mainCourse.course)}`
                    : '/cursos'
              }
              className="primary-action"
            >
              Continue Learning
              <Icon name="arrow" />
            </Link>
          </div>
        </article>
      </section>

      <Panel title="Curriculum">
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
                <Icon name={item.isCompleted ? 'check' : item.isLocked ? 'lock' : 'curriculum'} />
                <span>
                  <small>Module {item.index + 1}</small>
                  <strong>{item.module.title || `Módulo ${item.index + 1}`}</strong>
                </span>
                <em>{item.isLocked ? 'Locked' : `${item.progress}%`}</em>
              </Link>
            ))
          )}
        </div>
      </Panel>

      <section className="dashboard-bottom">
        <article className="mock-mini">
          <h2>Mock Exam Simulator</h2>
          <p>Test your knowledge under real conditions before earning your final certification.</p>
          <button type="button" onClick={() => setActiveTab('examenes')}>
            Start Simulation
            <Icon name="arrow" />
          </button>
        </article>

        <article className="cert-mini">
          <div />
          <span>
            <small>Official Credential</small>
            <h2>Certification</h2>
            <p>Earn your official GHC Academy certificate when your learning path is completed.</p>
            <button type="button" onClick={() => setActiveTab('certificados')}>
              View Certification
              <Icon name="arrow" />
            </button>
          </span>
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
        <h1>My Courses</h1>
        <p>Continue learning and track your progress across all your courses.</p>
      </section>

      <section className="filters">
        <label>
          <Icon name="search" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search courses..."
          />
        </label>

        <button
          type="button"
          className={courseStatusFilter === 'active' ? 'active' : ''}
          onClick={() => setCourseStatusFilter('active')}
        >
          Active
        </button>
        <button
          type="button"
          className={courseStatusFilter === 'completed' ? 'active' : ''}
          onClick={() => setCourseStatusFilter('completed')}
        >
          Completed
        </button>
        <button
          type="button"
          className={courseStatusFilter === 'all' ? 'active' : ''}
          onClick={() => setCourseStatusFilter('all')}
        >
          All
        </button>

        <select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)}>
          <option value="all">Level</option>
          {availableLevels.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>

        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
          <option value="all">Category</option>
          {availableCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <span />

        <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
          <option value="recent">Sort by: Recent</option>
          <option value="title">Sort by: Title</option>
          <option value="progress">Sort by: Progress</option>
        </select>

        <div className="view-toggle">
          <button
            type="button"
            className={viewMode === 'grid' ? 'active' : ''}
            onClick={() => setViewMode('grid')}
          >
            <Icon name="grid" />
          </button>
          <button
            type="button"
            className={viewMode === 'list' ? 'active' : ''}
            onClick={() => setViewMode('list')}
          >
            <Icon name="list" />
          </button>
        </div>
      </section>

      <section className="section-title-row">
        <h2>Courses</h2>
        <p>{filteredCards.length} results</p>
      </section>

      {filteredCards.length === 0 ? (
        <EmptyState text="No hay cursos que coincidan con los filtros seleccionados." />
      ) : (
        <div className={viewMode === 'grid' ? 'course-grid' : 'course-list'}>
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
      <section className="curriculum-head">
        <div>
          <h1>Curriculum</h1>
          <p>Your structured learning path to mastery.</p>
        </div>

        <div className="curriculum-side-head">
          <label>
            Current Course
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
          </label>

          <div className="curriculum-metrics">
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

      <section className="curriculum-grid">
        <article className="roadmap-panel">
          <h2>Module Roadmap</h2>
          <p>Track your progress through each module.</p>

          <div className="roadmap-list">
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
        </article>

        <article className="lesson-panel">
          <div className="lesson-panel-top">
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

            <div className="module-progress">
              <strong>{curriculumActiveModule?.progress || 0}%</strong>
              <span>Complete</span>
            </div>
          </div>

          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${curriculumActiveModule?.progress || 0}%` }} />
          </div>

          <div className="lesson-header-row">
            <span>Lessons</span>
            <span>Type</span>
            <span>Status</span>
          </div>

          <div className="lesson-list">
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
        </article>
      </section>

      <article className="curriculum-banner">
        <Icon name="trophy" />
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
    { title: 'Neuromuscular Adaptations', date: 'Attempted on May 12, 2025 · 10:30 AM', score: '85%', status: 'Passed', ok: true },
    { title: 'Energy Systems', date: 'Attempted on May 8, 2025 · 02:15 PM', score: '72%', status: 'Passed', ok: true },
    { title: 'Biomechanics Fundamentals', date: 'Attempted on May 5, 2025 · 11:45 AM', score: '65%', status: 'Failed', ok: false },
    { title: 'Hypertrophy Mechanics', date: 'Attempted on Apr 30, 2025 · 09:20 AM', score: '58%', status: 'Failed', ok: false },
  ];

  return (
    <div className="mock-page">
      <section className="mock-header">
        <div className="mock-title-block">
          <span>
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
          <MockFeature icon="chat" title="Instant Feedback" text="Detailed explanations" />
          <MockFeature icon="shield" title="Certification Prep" text="Aligned with standards" />
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
                background: `conic-gradient(${GREEN} ${78 * 3.6}deg, rgba(255,255,255,0.10) 0deg)`,
              }}
            >
              <div className="readiness-ring-inner">
                <strong>78%</strong>
                <span>Ready</span>
              </div>
            </div>
          </div>

          <p>You are well prepared. Keep practicing to boost your confidence.</p>

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
            {[
              { title: 'Neuromuscular Adaptations', meta: '3 / 3 Exams', score: 75, color: GREEN },
              { title: 'Energy Systems', meta: '2 / 2 Exams', score: 72, color: GREEN },
              { title: 'Biomechanics Fundamentals', meta: '2 / 2 Exams', score: 65, color: '#F7C948' },
              { title: 'Hypertrophy Mechanics', meta: '0 / 1 Exams', score: 0, color: '#FF5757' },
            ].map((item) => (
              <div key={item.title} className="module-exam-row">
                <Icon name="document" />
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.meta}</span>
                  <div className="module-exam-progress">
                    <div style={{ width: `${item.score}%`, background: item.color }} />
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
            <svg viewBox="0 0 520 170" className="trend-svg" aria-hidden="true">
              <path
                d="M20 120 L85 88 L150 100 L215 72 L280 80 L345 62 L410 70 L500 48"
                fill="none"
                stroke={GREEN}
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
        style={{ backgroundImage: getPremiumCourseBackground(course, index) }}
      >
        <div className="premium-image-overlay" />
        <div className="course-top-badges">
          <span className={completed ? 'completed-badge' : 'progress-badge'}>
            {completed ? 'Completed' : 'In Progress'}
          </span>
        </div>
        <span className="bookmark-icon"><Icon name={completed ? 'check' : 'bookmark'} /></span>
      </div>

      <div className="premium-course-body">
        <h3>{course.title || 'Curso GHC Academy'}</h3>
        <p>{course.subtitle || course.description || 'Formación premium basada en ciencia, estructura y rendimiento.'}</p>

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
            {completed ? 'Review' : 'Continue'} {!completed && <Icon name="arrow" />}
          </Link>
          <Link href={`/cursos/${getCourseSlug(course)}`} className="secondary-button-small">
            Details
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

function CurriculumMetric({ icon, label, value, helper }: { icon: IconName; label: string; value: string | number; helper: string }) {
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
          <p>{item.completedLessons} of {item.lessons.length} Lessons Completed</p>
          <div className="progress-track-mini">
            <div className="progress-fill" style={{ width: `${item.progress}%` }} />
          </div>
          <div className="roadmap-bottom-row">
            <span>{item.progress}% Complete</span>
            <span>Continue <Icon name="arrow" /></span>
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
      </Link>
    );
  }

  if (item.isLocked) {
    return (
      <article className="roadmap-row locked">
        <div className="roadmap-dot locked"><Icon name="lock" /></div>
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
      <span className="lesson-type-pill"><Icon name={icon} /> {contentType}</span>
      <span className={locked ? 'lesson-status locked' : completed ? 'lesson-status completed' : active ? 'lesson-status active' : 'lesson-status pending'}>
        {locked ? 'Locked' : completed ? 'Completed' : active ? 'In Progress' : 'Pending'}
      </span>
    </article>
  );

  if (locked) return content;
  return <Link href={href} className="lesson-link">{content}</Link>;
}

function CertificateCard({ certificate }: { certificate: AnyRecord }) {
  return (
    <article className="certificate-card">
      <div className="certificate-icon"><Icon name="star" /></div>
      <span className="progress-badge">Valid Certificate</span>
      <h3>{certificate.course_title || 'Curso completado'}</h3>
      <div className="profile-grid">
        <ProfileStat label="Score" value={`${certificate.final_score ?? '—'}%`} />
        <ProfileStat label="Status" value="Valid" />
        <ProfileStat label="Code" value={certificate.certificate_code || '—'} />
      </div>
      {certificate.verification_slug ? (
        <Link href={`/certificados/${certificate.verification_slug}`} className="primary-action">
          View Certificate <Icon name="arrow" />
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
      .progress-card,.next-card,.panel,.mock-mini,.cert-mini,.roadmap-panel,.lesson-panel,.mock-feature,.exam-simulator-card,.exam-rules-card,.latest-results-card,.readiness-card,.module-exams-card,.analytics-card,.premium-course-card,.premium-course-card-list,.certificate-card { border-radius: 16px; border: 1px solid rgba(255,255,255,.09); background: var(--panel); box-shadow: 0 20px 70px rgba(0,0,0,.16); }
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
      .progress-badge,.completed-badge { border-radius: 5px; padding: 6px 9px; font-size: 10px; line-height: 1; letter-spacing: .12em; text-transform: uppercase; font-weight: 900; }
      .progress-badge { border: 1px solid rgba(var(--green-rgb),.34); background: rgba(var(--green-rgb),.12); color: var(--green); }
      .completed-badge { border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.055); color: rgba(244,246,242,.74); }
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
      .lesson-status.completed { color: var(--green); font-weight: 900; }
      .lesson-status.active { color: var(--green); background: rgba(var(--green-rgb),.1); border: 1px solid rgba(var(--green-rgb),.2); border-radius: 999px; padding: 6px 9px; font-size: 11px; font-weight: 900; }
      .lesson-status.pending { color: var(--muted); }
      .lesson-status.locked { color: var(--soft); }
      .curriculum-banner { border-radius: 16px; border: 1px solid rgba(255,255,255,.09); background: linear-gradient(90deg, rgba(var(--green-rgb),.1), rgba(255,255,255,.028)); padding: 14px; display: grid; grid-template-columns: 48px minmax(0,1fr) auto; gap: 14px; align-items: center; box-shadow: 0 16px 50px rgba(0,0,0,.14); }
      .curriculum-banner > svg { width: 48px; height: 48px; border-radius: 14px; background: rgba(var(--green-rgb),.1); border: 1px solid rgba(var(--green-rgb),.22); color: var(--green); padding: 13px; }
      .curriculum-banner h3 { margin: 0; font-size: 16px; font-weight: 900; letter-spacing: -.02em; }
      .curriculum-banner p { margin: 6px 0 0; color: var(--muted); font-size: 13px; line-height: 1.45; }
      .curriculum-banner a { color: var(--green); text-decoration: none; display: inline-flex; gap: 8px; align-items: center; font-weight: 900; font-size: 13px; }

      .mock-page { display: grid; gap: 14px; }
      .mock-header { display: grid; grid-template-columns: minmax(0,.85fr) minmax(520px,1fr); gap: 16px; align-items: center; }
      .mock-title-block { display: flex; align-items: flex-start; gap: 14px; }
      .mock-title-block > span { width: 44px; height: 44px; border-radius: 999px; color: var(--green); display: grid; place-items: center; background: rgba(var(--green-rgb),.08); border: 1px solid rgba(var(--green-rgb),.2); flex-shrink: 0; }
      .mock-title-block h1 { margin: 0; font-size: 38px; line-height: .95; font-weight: 950; letter-spacing: -.055em; }
      .mock-title-block p { margin: 10px 0 0; color: var(--muted); line-height: 1.6; font-size: 15px; max-width: 620px; }
      .mock-feature-strip { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 10px; }
      .mock-feature { min-height: 78px; display: flex; gap: 12px; align-items: center; padding: 14px; }
      .mock-feature > span { width: 38px; height: 38px; border-radius: 999px; color: var(--green); display: grid; place-items: center; background: rgba(var(--green-rgb),.08); border: 1px solid rgba(var(--green-rgb),.16); flex-shrink: 0; }
      .mock-feature p { margin: 4px 0 0; color: var(--muted); font-size: 12px; line-height: 1.35; }
      .mock-hero-grid { display: grid; grid-template-columns: minmax(0,1.55fr) minmax(320px,.85fr); gap: 14px; }
      .exam-simulator-card { min-height: 260px; background: linear-gradient(90deg, rgba(11,15,13,.98), rgba(11,15,13,.86)), radial-gradient(circle at 75% 50%, rgba(255,255,255,.06), transparent 26%); display: grid; grid-template-columns: minmax(0,.9fr) minmax(360px,.85fr); overflow: hidden; padding: 20px; }
      .exam-simulator-content { display: grid; align-content: center; gap: 16px; min-width: 0; }
      .exam-title-row { display: flex; align-items: center; gap: 10px; }
      .exam-title-row h2,.exam-rules-title h2,.mock-card-header h2,.analytics-card > h2 { margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -.035em; }
      .exam-title-row span { color: var(--green); background: rgba(var(--green-rgb),.12); border: 1px solid rgba(var(--green-rgb),.24); border-radius: 999px; padding: 5px 8px; text-transform: uppercase; letter-spacing: .12em; font-size: 10px; font-weight: 900; }
      .exam-simulator-content > p { color: var(--muted); line-height: 1.6; max-width: 560px; }
      .exam-meta-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 10px; }
      .mock-meta-item { display: flex; gap: 8px; color: var(--muted); align-items: center; min-width: 0; }
      .mock-meta-item div { display: grid; gap: 3px; }
      .mock-meta-item strong { color: var(--white); }
      .exam-action-row { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
      .mock-primary-button { min-height: 46px; border: 0; padding: 0 20px; }
      .mock-ghost-button { min-height: 46px; border: 0; background: transparent; padding: 0; }
      .exam-laptop-visual { position: relative; min-height: 220px; background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,0)), url(https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80); background-size: cover; background-position: center; border-radius: 14px; filter: grayscale(1) contrast(1.08) brightness(.72); }
      .exam-laptop-screen { position: absolute; right: 32px; top: 32px; width: 180px; height: 116px; border-radius: 8px; border: 1px solid rgba(255,255,255,.2); background: rgba(0,0,0,.64); padding: 12px; color: var(--white); transform: perspective(700px) rotateY(-12deg) rotateX(4deg); display: grid; gap: 6px; }
      .exam-laptop-rows { display: grid; gap: 5px; }
      .exam-laptop-rows i { height: 5px; border-radius: 999px; background: rgba(255,255,255,.16); }
      .exam-rules-card { min-height: 260px; padding: 20px; display: grid; align-content: space-between; }
      .exam-rules-title { display: flex; gap: 12px; align-items: center; }
      .rule-list { display: grid; gap: 10px; margin: 16px 0; }
      .rule-item { display: flex; gap: 10px; align-items: center; color: var(--muted); font-size: 14px; }
      .mock-secondary-button { min-height: 40px; width: fit-content; padding: 0 16px; }
      .mock-middle-grid { display: grid; grid-template-columns: minmax(0,1.05fr) minmax(300px,.85fr) minmax(0,1fr); gap: 14px; }
      .latest-results-card,.readiness-card,.module-exams-card,.analytics-card { padding: 18px; }
      .readiness-card { display: grid; }
      .mock-card-header { display: flex; justify-content: space-between; gap: 14px; align-items: center; margin-bottom: 12px; }
      .mock-card-header button { border: 0; background: transparent; color: var(--green); font-size: 12px; font-weight: 850; cursor: pointer; }
      .results-list { display: grid; gap: 8px; }
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

      @media (max-width: 1320px) {
        .student-page { grid-template-columns: 102px minmax(0, 1fr); }
        .nav-item span,.user-card > div:nth-child(2) { display: none; }
      }

      @media (max-width: 1180px) {
        .student-page { grid-template-columns: 1fr; }
        .sidebar { position: relative; height: auto; }
        .mock-header,.mock-hero-grid,.mock-middle-grid,.analytics-grid,.hero-grid,.dashboard-bottom,.curriculum-grid,.curriculum-head { grid-template-columns: 1fr; }
      }
    `}</style>
  );
}
