'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
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
  | 'flame'
  | 'external';

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
const greenRgb = '99,229,70';
const bg = '#050706';
const panelBg = 'rgba(10,13,12,0.88)';
const white = '#F4F6F2';
const muted = 'rgba(244,246,242,0.62)';
const soft = 'rgba(244,246,242,0.44)';
const gold = '#D6B25E';
const danger = '#FF5757';
const warning = '#F7C948';

const rgbaGreen = (alpha: number) => `rgba(${greenRgb},${alpha})`;

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

  const [user, setUser] = useState<any>(null);
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
      <main style={styles.loadingPage}>
        <Background />
        <GlobalCss />

        <section style={styles.loadingCard}>
          <div style={styles.loadingAccent} />
          <GHCLogo size="md" showText tagline={false} />
          <p style={styles.kicker}>Portal privado</p>
          <h1 style={styles.loadingTitle}>Cargando dashboard</h1>
          <p style={styles.loadingText}>
            Preparando cursos, módulos, progreso, certificados y perfil real del alumno.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main data-ghc-page="student" style={styles.page}>
      <Background />
      <GlobalCss />

      <aside style={styles.sidebar}>
        <div>
          <div style={styles.logoBlock}>
            <GHCLogo size="md" showText tagline={false} />
          </div>

          <nav style={styles.nav}>
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

          <div style={styles.sidebarDivider} />

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

        <div style={styles.sidebarUserBox}>
          <div style={styles.sidebarUserTop}>
            <div style={styles.avatarLarge}>{getInitials(displayName)}</div>

            <div style={styles.sidebarUserText}>
              <p style={styles.sidebarUserName}>{shortName(displayName)}</p>
              <p style={styles.sidebarUserRole}>
                Student <span style={styles.proPill}>Pro</span>
              </p>
            </div>
          </div>

          <div style={styles.xpBox}>
            <div style={styles.xpRow}>
              <span>XP Level</span>
              <strong>{Math.max(1, stats.modules + stats.completedCourses)}</strong>
            </div>

            <div style={styles.progressTrackThin}>
              <div style={{ ...styles.progressFill, width: `${Math.min(100, globalProgress)}%` }} />
            </div>
          </div>

          <button type="button" onClick={handleLogout} style={styles.signOutButton}>
            <Icon name="logout" />
            Sign Out
          </button>
        </div>
      </aside>

      <section style={styles.appShell}>
        <header style={styles.topbar}>
          <div style={styles.breadcrumb}>
            <Icon name="home" />
            <span>Dashboard</span>
            <span style={styles.breadcrumbSeparator}>›</span>
            <span>{getCurrentPageLabel(activeTab)}</span>
          </div>

          <div style={styles.topbarRight}>
            <Link href="/" style={styles.topbarLink}>
              Inicio
            </Link>

            <Link href="/cursos" style={styles.topbarLinkStrong}>
              Explorar cursos
            </Link>

            <div style={styles.notificationArea}>
              <button
                type="button"
                style={styles.notificationButton}
                aria-label="Notificaciones"
                onClick={() => setNotificationsOpen((value) => !value)}
              >
                <Icon name="bell" />
                {unreadNotifications > 0 && <span style={styles.notificationDot} />}
                {unreadNotifications > 0 && (
                  <span style={styles.notificationCount}>{unreadNotifications}</span>
                )}
              </button>

              {notificationsOpen && (
                <div style={styles.notificationPanel}>
                  <div style={styles.notificationHeader}>
                    <div>
                      <p style={styles.notificationKicker}>Student alerts</p>
                      <h3 style={styles.notificationTitle}>Notifications</h3>
                    </div>

                    <span style={styles.notificationBadge}>{unreadNotifications} new</span>
                  </div>

                  <div style={styles.notificationList}>
                    {notifications.map((notification) => {
                      const content = (
                        <article
                          style={
                            notification.unread
                              ? styles.notificationItemUnread
                              : styles.notificationItem
                          }
                        >
                          <div style={styles.notificationItemTop}>
                            <span style={styles.notificationType}>{notification.type}</span>
                            <span style={styles.notificationTime}>{notification.time}</span>
                          </div>

                          <h4 style={styles.notificationItemTitle}>{notification.title}</h4>
                          <p style={styles.notificationMessage}>{notification.message}</p>
                        </article>
                      );

                      if (notification.href) {
                        return (
                          <Link
                            key={notification.id}
                            href={notification.href}
                            style={styles.notificationLink}
                            onClick={() => setNotificationsOpen(false)}
                          >
                            {content}
                          </Link>
                        );
                      }

                      return <div key={notification.id}>{content}</div>;
                    })}
                  </div>

                  <div style={styles.notificationFooter}>
                    <span>Supabase notifications ready for phase 2</span>
                  </div>
                </div>
              )}
            </div>

            <div style={styles.userMini}>
              <div>
                <p style={styles.welcomeText}>Welcome back,</p>
                <p style={styles.userMiniName}>{shortName(displayName)}</p>
              </div>
              <div style={styles.avatarMini}>{getInitials(displayName)}</div>
            </div>
          </div>
        </header>

        {systemMessage && <div style={styles.notice}>{systemMessage}</div>}

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

        {activeTab === 'certificados' && (
          <CertificationTab certificates={certificates} />
        )}

        {activeTab === 'perfil' && (
          <PerformanceTab displayName={displayName} user={user} profile={profile} stats={stats} />
        )}
      </section>
    </main>
  );
}

function DashboardView({
  globalProgress,
  stats,
  mainCourse,
  currentModuleView,
  moduleViews,
  setActiveTab,
}: {
  globalProgress: number;
  stats: {
    courses: number;
    lessons: number;
    modules: number;
    completedCourses: number;
    certificates: number;
    globalProgress: number;
  };
  mainCourse: DashboardCard | null;
  currentModuleView: ModuleView | null;
  moduleViews: ModuleView[];
  setActiveTab: (tab: Tab) => void;
}) {
  return (
    <div style={styles.dashboardGrid}>
      <section style={styles.dashboardTopGrid}>
        <article style={styles.progressCard}>
          <h2 style={styles.sectionTitleSmall}>Overall Progress</h2>

          <div style={styles.progressRingWrap}>
            <div
              style={{
                ...styles.progressRing,
                background: `conic-gradient(${green} ${globalProgress * 3.6}deg, rgba(255,255,255,0.095) 0deg)`,
              }}
            >
              <div style={styles.progressRingInner}>
                <strong style={styles.progressRingValue}>{globalProgress}%</strong>
                <span style={styles.progressRingLabel}>Completed</span>
              </div>
            </div>
          </div>

          <p style={styles.centerText}>
            Excellent work. Keep building expertise and elevating performance.
          </p>

          <div style={styles.progressMiniStats}>
            <MiniStat icon="clock" label="Lessons" value={stats.lessons} />
            <MiniStat icon="certificate" label="Certificates" value={stats.certificates} />
          </div>
        </article>

        <article style={styles.nextModuleCard}>
          <div style={styles.heroImage} />

          <div style={styles.nextContent}>
            <p style={styles.inProgressLabel}>In progress</p>

            <h2 style={styles.heroTitle}>
              {currentModuleView?.module?.title || mainCourse?.course?.title || 'Next Module'}
            </h2>

            <p style={styles.heroText}>
              {mainCourse?.course?.subtitle ||
                mainCourse?.course?.description ||
                'Explore your next learning step and keep progressing through the academy.'}
            </p>

            <div style={styles.metaRow}>
              <MetaItem icon="clock" text="4–5 Hours" />
              <MetaItem icon="chart" text={mainCourse?.course?.level || 'Intermediate'} />
              <MetaItem icon="document" text={`${mainCourse?.courseLessons.length || 0} Lessons`} />
            </div>

            <div style={styles.progressBlock}>
              <div style={styles.progressTrack}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${mainCourse?.progressPercent || 0}%`,
                  }}
                />
              </div>
              <span style={styles.progressTextGreen}>
                {mainCourse?.progressPercent || 0}% Complete
              </span>
            </div>

            <Link
              href={
                mainCourse?.nextLesson
                  ? `/cursos/${getCourseSlug(mainCourse.course)}/${mainCourse.nextLesson.id}`
                  : mainCourse
                    ? `/cursos/${getCourseSlug(mainCourse.course)}`
                    : '/cursos'
              }
              style={styles.primaryButton}
            >
              Continue Learning
              <Icon name="arrow" />
            </Link>
          </div>
        </article>
      </section>

      <Panel title="Curriculum">
        <div style={styles.curriculumRows}>
          {moduleViews.length === 0 ? (
            <EmptyState text="Aún no hay módulos visibles para este curso." />
          ) : (
            moduleViews.slice(0, 6).map((item) => (
              <DashboardModuleRow key={item.module.id} item={item} />
            ))
          )}
        </div>
      </Panel>

      <section style={styles.dashboardBottomGrid}>
        <article style={styles.examCard}>
          <div style={styles.examContent}>
            <h2 style={styles.largeCardTitle}>Mock Exam Simulator</h2>
            <p style={styles.cardDescription}>
              Test your knowledge under real conditions before earning your final certification.
            </p>

            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => setActiveTab('examenes')}
            >
              Start Simulation
              <Icon name="arrow" />
            </button>

            <div style={styles.featureRow}>
              <Feature icon="check" text="Real Exam Conditions" />
              <Feature icon="clock" text="Timed Sessions" />
              <Feature icon="shield" text="Detailed Feedback" />
            </div>
          </div>
        </article>

        <article style={styles.certificationCard}>
          <div style={styles.certificationBgPhoto} />
          <div style={styles.certificationBgOverlay} />

          <div style={styles.certContent}>
            <p style={styles.certKicker}>Official Credential</p>
            <h2 style={styles.largeCardTitle}>Certification</h2>
            <p style={styles.cardDescription}>
              Earn your official GHC Academy certificate when your learning path is completed and
              verified.
            </p>

            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => setActiveTab('certificados')}
            >
              View Certification
              <Icon name="arrow" />
            </button>

            <div style={styles.featureRow}>
              <Feature icon="shield" text="Trusted by Professionals" />
              <Feature icon="certificate" text="Industry Recognized" />
            </div>
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
    <div style={styles.coursesPage}>
      <section>
        <h1 style={styles.pageTitle}>My Courses</h1>
        <p style={styles.pageSubtitle}>
          Continue learning and track your progress across all your courses.
        </p>
      </section>

      <section style={styles.courseControls}>
        <label style={styles.searchBox}>
          <Icon name="search" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search courses..."
            style={styles.searchInput}
          />
        </label>

        <button
          type="button"
          style={courseStatusFilter === 'active' ? styles.filterActive : styles.filterButton}
          onClick={() => setCourseStatusFilter('active')}
        >
          Active
        </button>

        <button
          type="button"
          style={courseStatusFilter === 'completed' ? styles.filterActive : styles.filterButton}
          onClick={() => setCourseStatusFilter('completed')}
        >
          Completed
        </button>

        <button
          type="button"
          style={courseStatusFilter === 'all' ? styles.filterActive : styles.filterButton}
          onClick={() => setCourseStatusFilter('all')}
        >
          All
        </button>

        <select
          value={levelFilter}
          onChange={(event) => setLevelFilter(event.target.value)}
          style={styles.selectControl}
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
          style={styles.selectControl}
        >
          <option value="all">Category</option>
          {availableCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <div style={styles.controlsSpacer} />

        <select
          value={sortMode}
          onChange={(event) => setSortMode(event.target.value as SortMode)}
          style={styles.sortSelect}
        >
          <option value="recent">Sort by: Recent</option>
          <option value="title">Sort by: Title</option>
          <option value="progress">Sort by: Progress</option>
        </select>

        <div style={styles.viewToggle}>
          <button
            type="button"
            style={viewMode === 'grid' ? styles.viewButtonActive : styles.viewButton}
            onClick={() => setViewMode('grid')}
            aria-label="Ver en cuadrícula"
          >
            <Icon name="grid" />
          </button>

          <button
            type="button"
            style={viewMode === 'list' ? styles.viewButtonActive : styles.viewButton}
            onClick={() => setViewMode('list')}
            aria-label="Ver en lista"
          >
            <Icon name="list" />
          </button>
        </div>
      </section>

      <section style={styles.courseSectionHeader}>
        <h2 style={styles.courseSectionTitle}>Courses</h2>
        <span style={styles.resultCounter}>
          {filteredCards.length} result{filteredCards.length === 1 ? '' : 's'}
        </span>
      </section>

      {filteredCards.length === 0 ? (
        <EmptyState text="No hay cursos que coincidan con los filtros seleccionados." />
      ) : (
        <div style={viewMode === 'grid' ? styles.premiumCourseGrid : styles.premiumCourseList}>
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
}function CurriculumView({
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
    <div style={styles.curriculumPage}>
      <section style={styles.curriculumHeaderCompact}>
        <div>
          <h1 style={styles.pageTitle}>Curriculum</h1>
          <p style={styles.pageSubtitleCompact}>Your structured learning path to mastery.</p>
        </div>

        <div style={styles.curriculumHeaderRight}>
          <div style={styles.currentCourseBox}>
            <span style={styles.currentCourseLabel}>Current Course</span>
            <select
              value={selectedCurriculumCourseId || curriculumCourse?.course?.id || ''}
              onChange={(event) => setSelectedCurriculumCourseId(event.target.value)}
              style={styles.currentCourseSelect}
            >
              {courseCards.map((card) => (
                <option key={card.course.id} value={card.course.id}>
                  {card.course.title}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.curriculumMetricsRow}>
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

      <section style={styles.curriculumMainGridCompact}>
        <article style={styles.roadmapPanelCompact}>
          <div style={styles.panelHeaderCompact}>
            <h2 style={styles.panelHeading}>Module Roadmap</h2>
            <p style={styles.panelSubheading}>Track your progress through each module.</p>
          </div>

          <div style={styles.roadmapListCompact}>
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

          <div style={styles.roadmapFooterNoteCompact}>
            <Icon name="shield" />
            <span>Complete modules in order to unlock new content and assessments.</span>
          </div>
        </article>

        <article style={styles.moduleDetailPanel}>
          <div style={styles.moduleDetailTop}>
            <div>
              <h2 style={styles.panelHeading}>
                {curriculumActiveModule
                  ? `Module ${curriculumActiveModule.index + 1}: ${
                      curriculumActiveModule.module.title || 'Current Module'
                    }`
                  : 'Module Lessons'}
              </h2>

              <p style={styles.panelSubheading}>
                {curriculumCourse?.course?.subtitle ||
                  curriculumCourse?.course?.description ||
                  'Explore the current module and continue your learning path.'}
              </p>
            </div>

            <div style={styles.moduleProgressBadge}>
              <strong>{curriculumActiveModule?.progress || 0}%</strong>
              <span>Complete</span>
            </div>
          </div>

          <div style={styles.progressTrackCompact}>
            <div
              style={{
                ...styles.progressFill,
                width: `${curriculumActiveModule?.progress || 0}%`,
              }}
            />
          </div>

          <div style={styles.lessonTableHeaderCompact}>
            <span>Lessons</span>
            <span>Type</span>
            <span>Status</span>
          </div>

          <div style={styles.lessonRowsCompact}>
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

          <div style={styles.moduleFooterCompact}>
            <div style={styles.moduleFooterMeta}>
              <div style={styles.moduleFooterItem}>
                <Icon name="clock" />
                <div>
                  <span>Estimated Time</span>
                  <strong>4–5 Hours</strong>
                </div>
              </div>

              <div style={styles.moduleFooterItem}>
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
              style={styles.resourcesButton}
            >
              View Module Resources
              <Icon name="arrow" />
            </Link>
          </div>
        </article>
      </section>

      <article style={styles.curriculumBannerCompact}>
        <div style={styles.bannerIcon}>
          <Icon name="trophy" />
        </div>

        <div>
          <h3 style={styles.bannerTitle}>Stay Consistent, Achieve Excellence</h3>
          <p style={styles.bannerText}>
            Continue making progress each day. Small steps lead to big results.
          </p>
        </div>

        <Link
          href={
            curriculumCourse?.nextLesson
              ? `/cursos/${getCourseSlug(curriculumCourse.course)}/${curriculumCourse.nextLesson.id}`
              : curriculumCourse?.course
                ? `/cursos/${getCourseSlug(curriculumCourse.course)}`
                : '/cursos'
          }
          style={styles.keepGoingLink}
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
    { title: 'Biomechanics Fundamentals', meta: '2 / 2 Exams', score: 65, color: warning },
    { title: 'Hypertrophy Mechanics', meta: '0 / 1 Exams', score: 0, color: danger },
  ];

  return (
    <div style={styles.mockPage}>
      <section style={styles.mockHeader}>
        <div style={styles.mockTitleBlock}>
          <span style={styles.mockTargetIcon}>
            <Icon name="target" />
          </span>
          <div>
            <h1 style={styles.mockTitle}>Mock Exams</h1>
            <p style={styles.mockSubtitle}>
              Simulate real certification conditions and evaluate your readiness with advanced
              performance analytics.
            </p>
          </div>
        </div>

        <div style={styles.mockFeatureStrip}>
          <MockFeature icon="clock" title="Timed Sessions" text="Real exam time limits" />
          <MockFeature icon="chat" title="Instant Feedback" text="Detailed explanations and solutions" />
          <MockFeature icon="shield" title="Certification Prep" text="Aligned with GHC standards" />
        </div>
      </section>

      <section style={styles.mockHeroGrid}>
        <article style={styles.examSimulatorCard}>
          <div style={styles.examSimulatorContent}>
            <div style={styles.examTitleRow}>
              <h2>Exam Simulator</h2>
              <span style={styles.featuredBadge}>Featured</span>
            </div>

            <p>
              Take a full-length mock exam that simulates the real certification experience and
              tests your knowledge under pressure.
            </p>

            <div style={styles.examMetaGrid}>
              <MockMeta icon="lock" label="Mode" value="Timed Simulation" />
              <MockMeta icon="clock" label="Duration" value="2 Hours" />
              <MockMeta icon="document" label="Questions" value="90 Questions" />
              <MockMeta icon="target" label="Passing Score" value="70%" />
            </div>

            <div style={styles.examActionRow}>
              <button type="button" style={styles.mockPrimaryButton}>
                Start Simulation
                <Icon name="arrow" />
              </button>

              <button type="button" style={styles.mockGhostButton}>
                View Exam Details
                <Icon name="arrow" />
              </button>
            </div>
          </div>

          <div style={styles.examLaptopVisual}>
            <div style={styles.examLaptopScreen}>
              <span>Mock Exam</span>
              <strong>02:00:00</strong>
              <div style={styles.examLaptopRows}>
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
        </article>

        <article style={styles.examRulesCard}>
          <div style={styles.examRulesTitle}>
            <Icon name="document" />
            <h2>Exam Rules</h2>
          </div>

          <div style={styles.ruleList}>
            {[
              'Real exam timing and conditions',
              'No pause once the exam begins',
              'No external resources allowed',
              'Answers submitted automatically',
              'Results available immediately',
              'Review explanations after completion',
            ].map((rule) => (
              <div key={rule} style={styles.ruleItem}>
                <Icon name="check" />
                <span>{rule}</span>
              </div>
            ))}
          </div>

          <button type="button" style={styles.mockSecondaryButton}>
            View Full Rules
            <Icon name="arrow" />
          </button>
        </article>
      </section>

      <section style={styles.mockMiddleGrid}>
        <article style={styles.latestResultsCard}>
          <div style={styles.mockCardHeader}>
            <h2>Latest Results</h2>
            <button type="button">View All Results</button>
          </div>

          <div style={styles.resultsList}>
            {results.map((result) => (
              <div key={result.title} style={styles.resultRow}>
                <span style={result.ok ? styles.resultIconOk : styles.resultIconFail}>
                  <Icon name="document" />
                </span>

                <div style={styles.resultInfo}>
                  <strong>{result.title}</strong>
                  <p>{result.date}</p>
                </div>

                <div style={result.ok ? styles.resultScoreOk : styles.resultScoreFail}>
                  <strong>{result.score}</strong>
                  <span>{result.status}</span>
                </div>

                <Icon name="arrow" />
              </div>
            ))}
          </div>
        </article>

        <article style={styles.readinessCard}>
          <div style={styles.mockCardHeader}>
            <h2>Readiness Score</h2>
            <button type="button">View Details</button>
          </div>

          <div style={styles.readinessRingWrap}>
            <div
              style={{
                ...styles.readinessRing,
                background: `conic-gradient(${green} ${78 * 3.6}deg, rgba(255,255,255,0.10) 0deg)`,
              }}
            >
              <div style={styles.readinessRingInner}>
                <strong>78%</strong>
                <span>Ready</span>
              </div>
            </div>
          </div>

          <p style={styles.readinessText}>
            You're well prepared! Keep practicing to boost your confidence.
          </p>

          <div style={styles.readinessFooter}>
            <span>Target Score: 70%</span>
            <strong>Above Target</strong>
          </div>
        </article>

        <article style={styles.moduleExamsCard}>
          <div style={styles.mockCardHeader}>
            <h2>Module Exams</h2>
            <button type="button">View All Modules</button>
          </div>

          <div style={styles.moduleExamList}>
            {moduleExams.map((item) => (
              <div key={item.title} style={styles.moduleExamRow}>
                <Icon name="document" />
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.meta}</span>
                  <div style={styles.moduleExamProgress}>
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

      <section style={styles.analyticsCard}>
        <h2>Performance Analytics</h2>

        <div style={styles.analyticsGrid}>
          <div style={styles.averageScoreCard}>
            <span>Average Score</span>
            <strong>70%</strong>
            <p>Across 7 Attempts</p>
            <em>▲ 12% vs last month</em>
            <div style={styles.sparkline} />
          </div>

          <div style={styles.scoreTrendCard}>
            <div style={styles.scoreTrendTooltip}>
              <span>May 12, 2025</span>
              <strong>85%</strong>
            </div>

            <h3>Score Trend</h3>
            <div style={styles.scoreTrendGrid}>
              <svg viewBox="0 0 520 170" style={styles.trendSvg} aria-hidden="true">
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
                {[20, 85, 150, 215, 280, 345, 410, 500].map((x, idx) => {
                  const y = [120, 88, 100, 72, 80, 62, 70, 48][idx];
                  return <circle key={x} cx={x} cy={y} r="5" fill={green} />;
                })}
              </svg>
            </div>
          </div>

          <div style={styles.focusAreaCard}>
            <h3>Strengths & Focus Areas</h3>

            <div style={styles.focusItem}>
              <span style={styles.focusIconGreen}>
                <Icon name="flame" />
              </span>
              <div>
                <strong>Strengths</strong>
                <p>Energy Systems, Neuromuscular</p>
              </div>
            </div>

            <div style={styles.focusItem}>
              <span style={styles.focusIconGold}>
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
    <div style={styles.sectionStack}>
      <Panel title="Certification">
        {certificates.length === 0 ? (
          <EmptyState text="Aún no tienes certificados reales emitidos. Completa un curso y emite tu certificado para verlo aquí." />
        ) : (
          <div style={styles.courseGrid}>
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
    <div style={styles.sectionStack}>
      <Panel title="Performance Profile">
        <div style={styles.profileGrid}>
          <ProfileStat label="Alumno" value={displayName} />
          <ProfileStat label="Email" value={user?.email || '—'} />
          <ProfileStat label="Rol" value={profile?.role || 'student'} />
          <ProfileStat label="Cursos completados" value={stats.completedCourses} />
          <ProfileStat label="Certificados" value={stats.certificates} />
          <ProfileStat label="Progreso global" value={`${stats.globalProgress}%`} />
        </div>
      </Panel>

      <Panel title="Security Roadmap">
        <div style={styles.infoGrid}>
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
    <article style={styles.mockFeature}>
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
    <div style={styles.mockMetaItem}>
      <Icon name={icon} />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}function PremiumCourseCard({
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
    <article style={mode === 'grid' ? styles.premiumCourseCard : styles.premiumCourseCardList}>
      <div
        style={{
          ...styles.premiumCourseImage,
          ...(mode === 'list' ? styles.premiumCourseImageList : {}),
          backgroundImage: getPremiumCourseBackground(course, index),
        }}
      >
        <div style={styles.premiumImageOverlay} />

        <div style={styles.courseTopBadges}>
          <span style={completed ? styles.completedBadge : styles.progressBadge}>
            {completed ? 'Completed' : 'In Progress'}
          </span>
        </div>

        <span style={styles.bookmarkIcon}>
          <Icon name={completed ? 'check' : 'bookmark'} />
        </span>
      </div>

      <div style={styles.premiumCourseBody}>
        <h3 style={styles.premiumCourseTitle}>{course.title || 'Curso GHC Academy'}</h3>
        <p style={styles.premiumCourseText}>
          {course.subtitle ||
            course.description ||
            'Formación premium basada en ciencia, estructura y rendimiento.'}
        </p>

        <div style={styles.premiumStatsGrid}>
          <PremiumMetric icon="document" value={card.courseLessons.length} label="Lessons" />
          <PremiumMetric icon="box" value={card.courseModules.length} label="Modules" />
          <PremiumMetric icon="chart" value={`${card.progressPercent}%`} label="Progress" />
        </div>

        <div style={styles.cardProgressArea}>
          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressFill, width: `${card.progressPercent}%` }} />
          </div>
          <span style={styles.progressTextGreen}>{card.progressPercent}% Complete</span>
        </div>

        <div style={styles.premiumActions}>
          <Link href={href} style={completed ? styles.reviewButton : styles.primaryButtonSmall}>
            {completed ? 'Review' : 'Continue'}
            {!completed && <Icon name="arrow" />}
          </Link>

          <Link href={`/cursos/${getCourseSlug(course)}`} style={styles.secondaryButtonSmall}>
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
    <div style={styles.premiumMetric}>
      <div style={styles.metricTopLine}>
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
    <article style={styles.curriculumMetric}>
      <span style={styles.curriculumMetricIcon}>
        <Icon name={icon} />
      </span>

      <div style={styles.curriculumMetricContent}>
        <p style={styles.curriculumMetricLabel}>{label}</p>
        <strong style={styles.curriculumMetricValue}>{value}</strong>
        <span style={styles.curriculumMetricHelper}>{helper}</span>
      </div>
    </article>
  );
}

function RoadmapModuleRow({ item, course }: { item: ModuleView; course?: AnyRecord }) {
  const title = item.module.title || `Module ${item.index + 1}`;

  if (item.isCurrent) {
    return (
      <Link href={item.href} style={styles.roadmapCurrentCard}>
        <div style={styles.roadmapCurrentLine} />

        <div style={styles.roadmapCurrentContent}>
          <div style={styles.roadmapTopBadges}>
            <span style={styles.moduleMiniLabel}>Module {item.index + 1}</span>
            <span style={styles.inProgressMini}>In Progress</span>
          </div>

          <h3 style={styles.roadmapTitleCurrent}>{title}</h3>

          <p style={styles.roadmapSmallText}>
            {item.completedLessons} of {item.lessons.length} Lessons Completed
          </p>

          <div style={styles.progressTrackMini}>
            <div style={{ ...styles.progressFill, width: `${item.progress}%` }} />
          </div>

          <div style={styles.roadmapBottomRow}>
            <span style={styles.progressTextGreen}>{item.progress}% Complete</span>

            <span style={styles.roadmapContinueButton}>
              Continue
              <Icon name="arrow" />
            </span>
          </div>
        </div>

        <div
          style={{
            ...styles.roadmapCurrentImage,
            backgroundImage: `linear-gradient(180deg, rgba(5,7,6,0.02), rgba(5,7,6,0.74)), url(${getCourseImage(
              course || {}
            ) || 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=1200&q=80'})`,
          }}
        />
      </Link>
    );
  }

  if (item.isLocked) {
    return (
      <article style={styles.roadmapRowLocked}>
        <div style={styles.roadmapDotLocked}>
          <Icon name="lock" />
        </div>

        <div style={styles.roadmapBody}>
          <p style={styles.moduleMiniLabelMuted}>Module {item.index + 1}</p>
          <h3 style={styles.roadmapTitle}>{title}</h3>
          <p style={styles.roadmapSmallText}>{item.lessons.length} Lessons</p>
        </div>

        <span style={styles.lockedPill}>Locked</span>
      </article>
    );
  }

  return (
    <Link href={item.href} style={styles.roadmapRow}>
      <div style={item.isCompleted ? styles.roadmapDotDone : styles.roadmapDot}>
        <Icon name={item.isCompleted ? 'check' : 'curriculum'} />
      </div>

      <div style={styles.roadmapBody}>
        <p style={styles.moduleMiniLabel}>Module {item.index + 1}</p>
        <h3 style={styles.roadmapTitle}>{title}</h3>
        <p style={styles.roadmapSmallText}>{item.lessons.length} Lessons</p>
      </div>

      <div style={styles.roadmapSide}>
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
    <article
      style={
        active
          ? styles.lessonRowActive
          : locked
            ? styles.lessonRowLocked
            : styles.lessonRow
      }
    >
      <div style={styles.lessonNameCell}>
        <span
          style={
            completed
              ? styles.lessonIconDone
              : active
                ? styles.lessonIconActive
                : styles.lessonIcon
          }
        >
          <Icon name={completed ? 'check' : icon} />
        </span>

        <div>
          <strong style={styles.lessonTitleText}>{`${index + 1}. ${title}`}</strong>
          <p style={styles.lessonDescriptionText}>
            {lesson.description || lesson.subtitle || 'Contenido académico del módulo'}
          </p>
        </div>
      </div>

      <span style={styles.lessonTypePill}>
        <Icon name={icon} />
        {contentType}
      </span>

      <span
        style={
          locked
            ? styles.lessonStatusLocked
            : completed
              ? styles.lessonStatusCompleted
              : active
                ? styles.lessonStatusActive
                : styles.lessonStatusPending
        }
      >
        {locked ? 'Locked' : completed ? 'Completed' : active ? 'In Progress' : 'Pending'}
      </span>
    </article>
  );

  if (locked) return content;

  return (
    <Link href={href} style={styles.lessonLink}>
      {content}
    </Link>
  );
}

function CertificateCard({ certificate }: { certificate: AnyRecord }) {
  return (
    <article style={styles.certificateCard}>
      <div style={styles.certificateIcon}>
        <Icon name="star" />
      </div>

      <span style={styles.progressBadge}>Valid Certificate</span>

      <h3 style={styles.certificateTitle}>{certificate.course_title || 'Curso completado'}</h3>

      <div style={styles.profileGrid}>
        <ProfileStat label="Score" value={`${certificate.final_score ?? '—'}%`} />
        <ProfileStat label="Status" value="Valid" />
        <ProfileStat label="Code" value={certificate.certificate_code || '—'} />
      </div>

      {certificate.verification_slug ? (
        <Link href={`/certificados/${certificate.verification_slug}`} style={styles.primaryButton}>
          View Certificate
          <Icon name="arrow" />
        </Link>
      ) : (
        <p style={styles.emptyText}>Certificado registrado sin enlace público.</p>
      )}
    </article>
  );
}

function ProfileStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={styles.profileStat}>
      <span style={styles.profileStatLabel}>{label}</span>
      <strong style={styles.profileStatValue}>{value}</strong>
    </div>
  );
}

function InfoBlock({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <article style={styles.infoBlock}>
      <span style={styles.infoIcon}>
        <Icon name={icon} />
      </span>
      <h3 style={styles.infoBlockTitle}>{title}</h3>
      <p style={styles.infoBlockText}>{text}</p>
    </article>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <article style={styles.emptyState}>
      <p style={styles.emptyText}>{text}</p>
    </article>
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

  if (name === 'home') {
    return (
      <svg {...common}>
        <path
          d="m4 11 8-7 8 7v9h-5v-6H9v6H4v-9Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === 'dashboard') {
    return (
      <svg {...common}>
        <path
          d="M4 13h7V4H4v9Zm9 7h7V4h-7v16ZM4 20h7v-5H4v5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === 'courses' || name === 'box') {
    return (
      <svg {...common}>
        <path
          d="m12 4 8 4-8 4-8-4 8-4Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M4 12l8 4 8-4M4 16l8 4 8-4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === 'curriculum' || name === 'document') {
    return (
      <svg {...common}>
        <path
          d="M7 4h7l3 3v13H7V4Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M14 4v4h4M9 12h6M9 16h6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === 'exam') {
    return (
      <svg {...common}>
        <path
          d="M5 5h14v14H5V5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="m8.5 12 2.1 2.1 4.9-5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === 'certificate') {
    return (
      <svg {...common}>
        <path d="M7 4h10v9a5 5 0 0 1-10 0V4Z" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="m9 19-1 3 4-2 4 2-1-3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === 'performance' || name === 'chart') {
    return (
      <svg {...common}>
        <path d="M4 19V5M4 19h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path
          d="M7 15l3-4 3 2 4-7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === 'resources' || name === 'list') {
    return (
      <svg {...common}>
        <path
          d="M5 6h14M5 12h14M5 18h9"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === 'grid') {
    return (
      <svg {...common}>
        <path
          d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === 'support') {
    return (
      <svg {...common}>
        <path
          d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M9.8 9a2.2 2.2 0 1 1 3.5 1.8c-.8.6-1.3 1-1.3 2.2M12 16h.01"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === 'logout') {
    return (
      <svg {...common}>
        <path
          d="M10 6H6v12h4M14 8l4 4-4 4M18 12H9"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === 'clock') {
    return (
      <svg {...common}>
        <path
          d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === 'lock') {
    return (
      <svg {...common}>
        <path
          d="M8 10V8a4 4 0 1 1 8 0v2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M7 10h10v9H7v-9Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === 'check') {
    return (
      <svg {...common}>
        <path
          d="m5 12 4 4L19 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === 'arrow') {
    return (
      <svg {...common}>
        <path
          d="M5 12h14M13 6l6 6-6 6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === 'bell') {
    return (
      <svg {...common}>
        <path
          d="M15 17H9m9-2V9a6 6 0 1 0-12 0v6l-2 2h16l-2-2ZM10 20h4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === 'shield') {
    return (
      <svg {...common}>
        <path
          d="M12 3.5 19 6v5.4c0 4.3-2.8 8-7 9.1-4.2-1.1-7-4.8-7-9.1V6l7-2.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === 'star') {
    return (
      <svg {...common}>
        <path
          d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === 'bookmark') {
    return (
      <svg {...common}>
        <path
          d="M7 4h10v16l-5-3-5 3V4Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === 'search') {
    return (
      <svg {...common}>
        <path
          d="m20 20-4-4M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === 'play') {
    return (
      <svg {...common}>
        <path d="M8 5.5v13l10-6.5-10-6.5Z" fill="currentColor" />
      </svg>
    );
  }

  if (name === 'audio') {
    return (
      <svg {...common}>
        <path
          d="M5 10v4h3l4 4V6l-4 4H5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === 'pdf') {
    return (
      <svg {...common}>
        <path
          d="M7 4h7l3 3v13H7V4Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M9 14h6M9 17h4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === 'text') {
    return (
      <svg {...common}>
        <path
          d="M5 6h14M5 10h14M5 14h10M5 18h7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === 'trophy') {
    return (
      <svg {...common}>
        <path
          d="M8 4h8v3a4 4 0 0 1-8 0V4Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M8 6H5a3 3 0 0 0 3 3M16 6h3a3 3 0 0 1-3 3M12 11v5M9 20h6M10 16h4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === 'target') {
    return (
      <svg {...common}>
        <path
          d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 12h.01"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === 'chat') {
    return (
      <svg {...common}>
        <path
          d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v6A2.5 2.5 0 0 1 17.5 15H9l-5 4V6.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M8 9.5h.01M12 9.5h.01M16 9.5h.01"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === 'flame') {
    return (
      <svg {...common}>
        <path
          d="M12 21c3.4-1.2 5.5-3.6 5.5-7 0-3-1.6-5.2-4.8-8.6-.1 2.7-1.1 4-2.6 5.3-.2-1.6-1-2.9-2.1-4C6.6 9 5.5 11 5.5 14c0 3.4 2.1 5.8 6.5 7Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === 'external') {
    return (
      <svg {...common}>
        <path
          d="M14 4h6v6M20 4l-8 8M10 6H6v12h12v-4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path
        d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function isVisibleCourse(course: AnyRecord) {
  const status = String(course.status || '').toLowerCase();
  if (!status) return true;
  return ['published', 'publicado', 'active', 'activo', 'preview', 'demo'].includes(status);
}

function findNextLesson({
  courseModules,
  courseLessons,
  lessonProgress,
  moduleCompletions,
}: {
  courseModules: AnyRecord[];
  courseLessons: AnyRecord[];
  lessonProgress: AnyRecord[];
  moduleCompletions: AnyRecord[];
}) {
  const completedLessonIds = new Set(lessonProgress.map((item) => String(item.lesson_id)));
  const completedModuleIds = new Set(moduleCompletions.map((item) => String(item.module_id)));

  for (let index = 0; index < courseModules.length; index++) {
    const module = courseModules[index];

    const moduleUnlocked =
      index === 0 ||
      completedModuleIds.has(String(module.id)) ||
      completedModuleIds.has(String(courseModules[index - 1]?.id));

    if (!moduleUnlocked) continue;

    const moduleLessons = courseLessons
      .filter((lesson) => String(lesson.module_id) === String(module.id))
      .sort(sortLessons);

    const nextLesson = moduleLessons.find((lesson) => !completedLessonIds.has(String(lesson.id)));

    if (nextLesson) return nextLesson;
  }

  return courseLessons[0] || null;
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

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function shortName(name: string) {
  return name.split('@')[0].split(' ')[0];
}

function getCourseSlug(course: AnyRecord) {
  return String(course?.slug || course?.id || '');
}

function getCurrentPageLabel(tab: Tab) {
  if (tab === 'dashboard') return 'Dashboard';
  if (tab === 'cursos') return 'My Courses';
  if (tab === 'curriculum') return 'Curriculum';
  if (tab === 'examenes') return 'Mock Exams';
  if (tab === 'certificados') return 'Certification';
  return 'Performance';
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

function getLessonType(lesson: AnyRecord) {
  const raw = String(
    lesson.content_type || lesson.type || lesson.kind || lesson.format || 'video'
  ).toLowerCase();

  if (raw.includes('audio')) return 'Audio';
  if (raw.includes('pdf')) return 'PDF';
  if (raw.includes('quiz') || raw.includes('exam') || raw.includes('test')) return 'Quiz';
  if (raw.includes('text') || raw.includes('texto')) return 'Text';
  return 'Video';
}

function getLessonIcon(type: string): IconName {
  if (type === 'Audio') return 'audio';
  if (type === 'PDF') return 'pdf';
  if (type === 'Quiz') return 'exam';
  if (type === 'Text') return 'text';
  return 'play';
}

const styles: Record<string, CSSProperties> = {
  loadingPage: {
    minHeight: '100vh',
    position: 'relative',
    display: 'grid',
    placeItems: 'center',
    background: bg,
    color: white,
    overflow: 'hidden',
  },

  loadingCard: {
    width: 'min(720px, calc(100vw - 40px))',
    borderRadius: 28,
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
    padding: 34,
    position: 'relative',
    zIndex: 2,
    boxShadow: '0 28px 90px rgba(0,0,0,0.42)',
  },

  loadingAccent: {
    width: 66,
    height: 4,
    borderRadius: 999,
    background: green,
    boxShadow: `0 0 24px ${rgbaGreen(0.45)}`,
    marginBottom: 22,
  },

  kicker: {
    margin: '26px 0 0',
    color: green,
    textTransform: 'uppercase',
    letterSpacing: '0.26em',
    fontSize: 12,
    fontWeight: 950,
  },

  loadingTitle: {
    margin: '14px 0 0',
    fontSize: 'clamp(42px, 6vw, 74px)',
    lineHeight: 0.92,
    fontWeight: 950,
    letterSpacing: '-0.06em',
  },

  loadingText: {
    marginTop: 16,
    color: muted,
    lineHeight: 1.75,
    maxWidth: 620,
  },

  page: {
    minHeight: '100vh',
    background: bg,
    color: white,
    position: 'relative',
    display: 'grid',
    gridTemplateColumns: '278px minmax(0, 1fr)',
    overflow: 'visible',
  },

  background: {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 0,
    overflow: 'hidden',
  },

  orbOne: {
    position: 'absolute',
    width: 520,
    height: 520,
    borderRadius: 999,
    top: -200,
    left: -160,
    background: rgbaGreen(0.10),
    filter: 'blur(100px)',
  },

  orbTwo: {
    position: 'absolute',
    width: 520,
    height: 520,
    borderRadius: 999,
    right: -250,
    top: 120,
    background: 'rgba(120,135,130,0.09)',
    filter: 'blur(110px)',
  },

  gridTexture: {
    position: 'absolute',
    inset: 0,
    backgroundImage:
      'linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)',
    backgroundSize: '42px 42px',
    opacity: 0.42,
    maskImage: 'radial-gradient(circle at center, black 0%, transparent 82%)',
  },

  sidebar: {
    position: 'sticky',
    top: 0,
    height: '100vh',
    zIndex: 2,
    borderRight: '1px solid rgba(255,255,255,0.07)',
    background: 'linear-gradient(180deg, rgba(6,9,8,0.97), rgba(3,5,4,0.93))',
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },

  logoBlock: {
    display: 'flex',
    alignItems: 'center',
    minHeight: 58,
    marginBottom: 20,
  },

  nav: {
    display: 'grid',
    gap: 6,
  },

  navButton: {
    border: '1px solid transparent',
    background: 'transparent',
    color: 'rgba(244,246,242,0.62)',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    width: '100%',
    padding: '12px 14px',
    textAlign: 'left',
    cursor: 'pointer',
    borderRadius: 0,
  },

  navActive: {
    border: `1px solid ${rgbaGreen(0.12)}`,
    background: `linear-gradient(90deg, ${rgbaGreen(0.18)}, ${rgbaGreen(0.035)} 70%, transparent)`,
    color: green,
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    width: '100%',
    padding: '12px 14px',
    textAlign: 'left',
    cursor: 'pointer',
    borderRadius: 0,
    boxShadow: `inset 3px 0 0 ${rgbaGreen(0.95)}`,
  },

  navIcon: {
    width: 22,
    height: 22,
    display: 'grid',
    placeItems: 'center',
    color: 'rgba(244,246,242,0.50)',
    flexShrink: 0,
  },

  navIconActive: {
    width: 22,
    height: 22,
    display: 'grid',
    placeItems: 'center',
    color: green,
    flexShrink: 0,
  },

  navText: {
    display: 'grid',
    gap: 3,
  },

  sidebarDivider: {
    height: 1,
    background: 'rgba(255,255,255,0.08)',
    margin: '22px 0',
  },

  sidebarUserBox: {
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.09)',
    background: 'rgba(255,255,255,0.035)',
    padding: 16,
  },

  sidebarUserTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },

  avatarLarge: {
    width: 52,
    height: 52,
    borderRadius: 999,
    background: rgbaGreen(0.11),
    border: `1px solid ${rgbaGreen(0.24)}`,
    color: green,
    display: 'grid',
    placeItems: 'center',
    fontWeight: 950,
    fontSize: 17,
    flexShrink: 0,
  },

  sidebarUserText: {
    minWidth: 0,
  },

  sidebarUserName: {
    margin: 0,
    fontWeight: 900,
    fontSize: 16,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  sidebarUserRole: {
    margin: '4px 0 0',
    color: muted,
    fontSize: 13,
  },

  proPill: {
    marginLeft: 6,
    color: green,
    background: rgbaGreen(0.12),
    borderRadius: 999,
    padding: '2px 7px',
    fontSize: 11,
    fontWeight: 800,
  },

  xpBox: {
    borderTop: '1px solid rgba(255,255,255,0.08)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    padding: '14px 0',
    marginTop: 16,
  },

  xpRow: {
    display: 'flex',
    justifyContent: 'space-between',
    color: muted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },

  progressTrackThin: {
    height: 6,
    borderRadius: 999,
    background: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
    marginTop: 12,
  },

  signOutButton: {
    marginTop: 16,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    background: 'transparent',
    border: 0,
    color: 'rgba(244,246,242,0.58)',
    fontSize: 13,
    cursor: 'pointer',
    padding: 0,
  },

  appShell: {
    position: 'relative',
    zIndex: 1,
    padding: 20,
    minWidth: 0,
  },

  topbar: {
    minHeight: 58,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
    marginBottom: 16,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: 12,
  },

  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    color: 'rgba(244,246,242,0.72)',
    fontSize: 13,
    fontWeight: 800,
  },

  breadcrumbSeparator: {
    color: 'rgba(244,246,242,0.34)',
  },

  topbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    position: 'relative',
  },

  topbarLink: {
    color: 'rgba(244,246,242,0.65)',
    textDecoration: 'none',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    fontWeight: 850,
  },

  topbarLinkStrong: {
    color: green,
    textDecoration: 'none',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    fontWeight: 900,
  },

  notificationArea: {
    position: 'relative',
  },

  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.09)',
    background: 'rgba(255,255,255,0.035)',
    color: 'rgba(244,246,242,0.75)',
    display: 'grid',
    placeItems: 'center',
    position: 'relative',
    cursor: 'pointer',
  },

  notificationDot: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 999,
    background: green,
    right: 9,
    top: 8,
    boxShadow: `0 0 12px ${rgbaGreen(0.55)}`,
  },

  notificationCount: {
    position: 'absolute',
    right: -6,
    top: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 999,
    background: green,
    color: '#061008',
    display: 'grid',
    placeItems: 'center',
    fontSize: 10,
    fontWeight: 950,
    border: '2px solid #050706',
  },

  notificationPanel: {
    position: 'absolute',
    top: 52,
    right: 0,
    width: 360,
    borderRadius: 20,
    border: '1px solid rgba(255,255,255,0.12)',
    background:
      'linear-gradient(145deg, rgba(255,255,255,0.080), rgba(255,255,255,0.030)), rgba(7,10,9,0.98)',
    boxShadow: '0 28px 90px rgba(0,0,0,0.48)',
    padding: 16,
    zIndex: 40,
    backdropFilter: 'blur(18px)',
  },

  notificationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'flex-start',
    marginBottom: 14,
  },

  notificationKicker: {
    margin: 0,
    color: green,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.18em',
    fontWeight: 900,
  },

  notificationTitle: {
    margin: '6px 0 0',
    fontSize: 20,
    letterSpacing: '-0.03em',
    fontWeight: 900,
  },

  notificationBadge: {
    borderRadius: 999,
    border: `1px solid ${rgbaGreen(0.24)}`,
    background: rgbaGreen(0.10),
    color: green,
    padding: '6px 9px',
    fontSize: 11,
    fontWeight: 900,
  },

  notificationList: {
    display: 'grid',
    gap: 10,
  },

  notificationLink: {
    textDecoration: 'none',
    color: 'inherit',
  },

  notificationItem: {
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.030)',
    padding: 12,
  },

  notificationItemUnread: {
    borderRadius: 14,
    border: `1px solid ${rgbaGreen(0.18)}`,
    background: rgbaGreen(0.055),
    padding: 12,
  },

  notificationItemTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },

  notificationType: {
    color: green,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
    fontWeight: 900,
  },

  notificationTime: {
    color: soft,
    fontSize: 11,
  },

  notificationItemTitle: {
    margin: '8px 0 0',
    color: white,
    fontSize: 14,
    fontWeight: 900,
  },

  notificationMessage: {
    margin: '6px 0 0',
    color: muted,
    fontSize: 12,
    lineHeight: 1.55,
  },

  notificationFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTop: '1px solid rgba(255,255,255,0.08)',
    color: soft,
    fontSize: 11,
  },

  userMini: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    borderLeft: '1px solid rgba(255,255,255,0.08)',
    paddingLeft: 16,
  },

  welcomeText: {
    margin: 0,
    color: soft,
    fontSize: 12,
  },

  userMiniName: {
    margin: '2px 0 0',
    fontWeight: 850,
  },

  avatarMini: {
    width: 42,
    height: 42,
    borderRadius: 999,
    border: `1px solid ${rgbaGreen(0.20)}`,
    background: rgbaGreen(0.09),
    color: green,
    display: 'grid',
    placeItems: 'center',
    fontWeight: 900,
  },

  notice: {
    marginBottom: 16,
    borderRadius: 16,
    border: `1px solid ${rgbaGreen(0.20)}`,
    background: rgbaGreen(0.06),
    color: muted,
    padding: 16,
  },

  mockPage: {
    display: 'grid',
    gap: 14,
  },

  mockHeader: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 0.85fr) minmax(520px, 1fr)',
    gap: 16,
    alignItems: 'center',
  },

  mockTitleBlock: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
  },

  mockTargetIcon: {
    width: 44,
    height: 44,
    borderRadius: 999,
    color: green,
    display: 'grid',
    placeItems: 'center',
    background: rgbaGreen(0.08),
    border: `1px solid ${rgbaGreen(0.20)}`,
    flexShrink: 0,
  },

  mockTitle: {
    margin: 0,
    fontSize: 38,
    lineHeight: 0.95,
    fontWeight: 950,
    letterSpacing: '-0.055em',
  },

  mockSubtitle: {
    margin: '10px 0 0',
    color: muted,
    lineHeight: 1.6,
    fontSize: 15,
    maxWidth: 620,
  },

  mockFeatureStrip: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 10,
  },

  mockFeature: {
    minHeight: 78,
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.09)',
    background: panelBg,
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    padding: 14,
  },

  mockHeroGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.55fr) minmax(320px, 0.85fr)',
    gap: 14,
  },

  examSimulatorCard: {
    minHeight: 260,
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.09)',
    background:
      'linear-gradient(90deg, rgba(11,15,13,0.98), rgba(11,15,13,0.86)), radial-gradient(circle at 75% 50%, rgba(255,255,255,0.06), transparent 26%)',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 0.9fr) minmax(360px, 0.85fr)',
    overflow: 'hidden',
    padding: 20,
  },

  examSimulatorContent: {
    display: 'grid',
    alignContent: 'center',
    gap: 16,
    minWidth: 0,
  },

  examTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },

  featuredBadge: {
    color: green,
    background: rgbaGreen(0.12),
    border: `1px solid ${rgbaGreen(0.24)}`,
    borderRadius: 999,
    padding: '5px 8px',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    fontSize: 10,
    fontWeight: 900,
  },

  examMetaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 10,
  },

  mockMetaItem: {
    display: 'flex',
    gap: 8,
    color: muted,
    alignItems: 'center',
    minWidth: 0,
  },

  examActionRow: {
    display: 'flex',
    gap: 16,
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  mockPrimaryButton: {
    minHeight: 46,
    border: 0,
    borderRadius: 10,
    background: `linear-gradient(135deg, ${green}, #7BEE65)`,
    color: '#061008',
    padding: '0 20px',
    display: 'inline-flex',
    gap: 10,
    alignItems: 'center',
    fontWeight: 900,
    cursor: 'pointer',
  },

  mockGhostButton: {
    minHeight: 46,
    border: 0,
    background: 'transparent',
    color: white,
    padding: 0,
    display: 'inline-flex',
    gap: 8,
    alignItems: 'center',
    cursor: 'pointer',
    fontWeight: 850,
  },

  examLaptopVisual: {
    position: 'relative',
    minHeight: 220,
    background:
      'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.00)), url(https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    borderRadius: 14,
    filter: 'grayscale(1) contrast(1.08) brightness(0.72)',
  },

  examLaptopScreen: {
    position: 'absolute',
    right: 32,
    top: 32,
    width: 180,
    height: 116,
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.20)',
    background: 'rgba(0,0,0,0.64)',
    padding: 12,
    color: white,
    transform: 'perspective(700px) rotateY(-12deg) rotateX(4deg)',
    display: 'grid',
    gap: 6,
  },

  examLaptopRows: {
    display: 'grid',
    gap: 5,
  },

  examRulesCard: {
    minHeight: 260,
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.09)',
    background: panelBg,
    padding: 20,
    display: 'grid',
    alignContent: 'space-between',
  },

  examRulesTitle: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
  },

  ruleList: {
    display: 'grid',
    gap: 10,
    margin: '16px 0',
  },

  ruleItem: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    color: muted,
    fontSize: 14,
  },

  mockSecondaryButton: {
    minHeight: 40,
    width: 'fit-content',
    borderRadius: 9,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.045)',
    color: white,
    padding: '0 16px',
    display: 'inline-flex',
    gap: 8,
    alignItems: 'center',
    cursor: 'pointer',
    fontWeight: 850,
  },

  mockMiddleGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.05fr) minmax(300px, 0.85fr) minmax(0, 1fr)',
    gap: 14,
  },

  latestResultsCard: {
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.09)',
    background: panelBg,
    padding: 18,
  },

  readinessCard: {
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.09)',
    background: panelBg,
    padding: 18,
    display: 'grid',
  },

  moduleExamsCard: {
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.09)',
    background: panelBg,
    padding: 18,
  },

  mockCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 14,
    alignItems: 'center',
    marginBottom: 12,
  },

  resultsList: {
    display: 'grid',
    gap: 8,
  },

  resultRow: {
    minHeight: 56,
    display: 'grid',
    gridTemplateColumns: '34px minmax(0, 1fr) 64px 20px',
    gap: 10,
    alignItems: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.055)',
    padding: '6px 0',
  },

  resultIconOk: {
    width: 30,
    height: 30,
    borderRadius: 9,
    display: 'grid',
    placeItems: 'center',
    color: green,
    background: rgbaGreen(0.08),
  },

  resultIconFail: {
    width: 30,
    height: 30,
    borderRadius: 9,
    display: 'grid',
    placeItems: 'center',
    color: danger,
    background: 'rgba(255,87,87,0.08)',
  },

  resultInfo: {
    minWidth: 0,
  },

  resultScoreOk: {
    color: green,
    display: 'grid',
    textAlign: 'right',
    fontWeight: 900,
  },

  resultScoreFail: {
    color: danger,
    display: 'grid',
    textAlign: 'right',
    fontWeight: 900,
  },

  readinessRingWrap: {
    display: 'grid',
    placeItems: 'center',
    marginTop: 8,
  },

  readinessRing: {
    width: 156,
    height: 156,
    borderRadius: 999,
    display: 'grid',
    placeItems: 'center',
  },

  readinessRingInner: {
    width: 112,
    height: 112,
    borderRadius: 999,
    background: '#080B0A',
    display: 'grid',
    placeItems: 'center',
    alignContent: 'center',
    textAlign: 'center',
  },

  readinessText: {
    margin: '12px auto',
    maxWidth: 250,
    color: muted,
    textAlign: 'center',
    lineHeight: 1.5,
  },

  readinessFooter: {
    marginTop: 'auto',
    display: 'flex',
    justifyContent: 'space-between',
    color: muted,
    fontSize: 12,
  },

  moduleExamList: {
    display: 'grid',
    gap: 12,
  },

  moduleExamRow: {
    display: 'grid',
    gridTemplateColumns: '30px minmax(0,1fr) 42px 18px',
    gap: 10,
    alignItems: 'center',
    color: muted,
  },

  moduleExamProgress: {
    height: 5,
    borderRadius: 999,
    background: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
    marginTop: 8,
  },

  analyticsCard: {
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.09)',
    background: panelBg,
    padding: 18,
  },

  analyticsGrid: {
    display: 'grid',
    gridTemplateColumns: '300px minmax(0, 1fr) 310px',
    gap: 14,
    marginTop: 12,
  },

  averageScoreCard: {
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.07)',
    background: 'rgba(255,255,255,0.024)',
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },

  sparkline: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    width: 140,
    height: 58,
    background: `linear-gradient(180deg, ${rgbaGreen(0.36)}, transparent)`,
    clipPath:
      'polygon(0 90%, 10% 72%, 22% 76%, 34% 54%, 45% 58%, 55% 38%, 66% 44%, 76% 24%, 88% 20%, 100% 10%, 100% 100%, 0 100%)',
    opacity: 0.8,
  },

  scoreTrendCard: {
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.07)',
    background: 'rgba(255,255,255,0.024)',
    padding: 16,
    position: 'relative',
    minHeight: 170,
  },

  scoreTrendTooltip: {
    position: 'absolute',
    right: 44,
    top: 14,
    borderRadius: 9,
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(0,0,0,0.38)',
    padding: '8px 12px',
    display: 'grid',
    gap: 2,
    color: green,
    fontWeight: 900,
  },

  scoreTrendGrid: {
    height: 170,
  },

  trendSvg: {
    width: '100%',
    height: 170,
  },

  focusAreaCard: {
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.07)',
    background: 'rgba(255,255,255,0.024)',
    padding: 16,
  },

  focusItem: {
    display: 'flex',
    gap: 12,
    marginTop: 16,
    color: muted,
  },

  focusIconGreen: {
    width: 34,
    height: 34,
    borderRadius: 999,
    background: rgbaGreen(0.10),
    color: green,
    display: 'grid',
    placeItems: 'center',
  },

  focusIconGold: {
    width: 34,
    height: 34,
    borderRadius: 999,
    background: 'rgba(247,201,72,0.10)',
    color: warning,
    display: 'grid',
    placeItems: 'center',
  },

  pageTitle: {
    margin: 0,
    fontSize: 34,
    lineHeight: 1,
    letterSpacing: '-0.05em',
    fontWeight: 900,
  },

  pageSubtitle: {
    margin: '10px 0 0',
    color: muted,
    fontSize: 15,
    lineHeight: 1.6,
  },

  pageSubtitleCompact: {
    margin: '8px 0 0',
    color: muted,
    fontSize: 14,
    lineHeight: 1.5,
  },

  coursesPage: {
    display: 'grid',
    gap: 16,
  },

  courseControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },

  searchBox: {
    width: 320,
    minHeight: 44,
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.030)',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '0 15px',
    color: 'rgba(244,246,242,0.48)',
    fontSize: 13,
  },

  searchInput: {
    flex: 1,
    minWidth: 0,
    border: 0,
    outline: 0,
    background: 'transparent',
    color: white,
    height: 42,
  },

  filterActive: {
    minHeight: 44,
    borderRadius: 10,
    border: `1px solid ${rgbaGreen(0.32)}`,
    background: rgbaGreen(0.11),
    color: green,
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0 16px',
    cursor: 'pointer',
    fontWeight: 850,
  },

  filterButton: {
    minHeight: 44,
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.030)',
    color: 'rgba(244,246,242,0.78)',
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0 16px',
    cursor: 'pointer',
    fontWeight: 800,
  },

  selectControl: {
    minHeight: 44,
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.030)',
    color: 'rgba(244,246,242,0.78)',
    padding: '0 14px',
    outline: 0,
    cursor: 'pointer',
    fontWeight: 800,
  },

  sortSelect: {
    minHeight: 44,
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.030)',
    color: 'rgba(244,246,242,0.78)',
    padding: '0 14px',
    outline: 0,
    cursor: 'pointer',
    fontWeight: 800,
  },

  controlsSpacer: {
    flex: 1,
  },

  viewToggle: {
    height: 44,
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.030)',
    display: 'flex',
    alignItems: 'center',
    padding: 4,
    gap: 4,
  },

  viewButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    border: 0,
    background: 'transparent',
    color: 'rgba(244,246,242,0.52)',
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
  },

  viewButtonActive: {
    width: 34,
    height: 34,
    borderRadius: 8,
    border: 0,
    background: rgbaGreen(0.12),
    color: green,
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
  },

  courseSectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },

  courseSectionTitle: {
    margin: 0,
    fontSize: 20,
    lineHeight: 1,
    letterSpacing: '-0.03em',
    fontWeight: 850,
  },

  resultCounter: {
    color: soft,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    fontWeight: 850,
  },

  premiumCourseGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 16,
    alignItems: 'stretch',
  },

  premiumCourseList: {
    display: 'grid',
    gap: 14,
  },

  premiumCourseCard: {
    minHeight: 386,
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.09)',
    background:
      'linear-gradient(145deg, rgba(255,255,255,0.050), rgba(255,255,255,0.018)), rgba(8,12,10,0.88)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 70px rgba(0,0,0,0.16)',
  },

  premiumCourseCardList: {
    minHeight: 216,
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.09)',
    background:
      'linear-gradient(145deg, rgba(255,255,255,0.050), rgba(255,255,255,0.018)), rgba(8,12,10,0.88)',
    overflow: 'hidden',
    display: 'grid',
    gridTemplateColumns: '320px minmax(0, 1fr)',
    boxShadow: '0 20px 70px rgba(0,0,0,0.16)',
  },

  premiumCourseImage: {
    height: 160,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    position: 'relative',
    filter: 'grayscale(1) contrast(1.05) brightness(0.82)',
    flexShrink: 0,
  },

  premiumCourseImageList: {
    height: '100%',
    minHeight: 216,
  },

  premiumImageOverlay: {
    position: 'absolute',
    inset: 0,
    background: `linear-gradient(180deg, rgba(5,7,6,0.00), rgba(5,7,6,0.86)), radial-gradient(circle at top right, ${rgbaGreen(0.13)}, transparent 34%)`,
  },

  courseTopBadges: {
    position: 'absolute',
    left: 14,
    top: 14,
    display: 'flex',
    gap: 8,
    zIndex: 2,
  },

  progressBadge: {
    borderRadius: 5,
    border: `1px solid ${rgbaGreen(0.34)}`,
    background: rgbaGreen(0.12),
    color: green,
    padding: '6px 9px',
    fontSize: 10,
    lineHeight: 1,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    fontWeight: 900,
  },

  completedBadge: {
    borderRadius: 5,
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(255,255,255,0.055)',
    color: 'rgba(244,246,242,0.74)',
    padding: '6px 9px',
    fontSize: 10,
    lineHeight: 1,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    fontWeight: 900,
  },

  bookmarkIcon: {
    position: 'absolute',
    right: 14,
    top: 14,
    color: 'rgba(244,246,242,0.76)',
    zIndex: 2,
    width: 24,
    height: 24,
    display: 'grid',
    placeItems: 'center',
  },

  premiumCourseBody: {
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: 0,
  },

  premiumCourseTitle: {
    margin: 0,
    minHeight: 44,
    color: white,
    fontSize: 21,
    lineHeight: 1.08,
    letterSpacing: '-0.035em',
    fontWeight: 900,
  },

  premiumCourseText: {
    margin: '10px 0 0',
    minHeight: 50,
    color: muted,
    fontSize: 14,
    lineHeight: 1.55,
  },

  premiumStatsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 8,
    marginTop: 'auto',
    paddingTop: 16,
  },

  premiumMetric: {
    minHeight: 58,
    borderRadius: 9,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.032)',
    padding: '10px 8px',
    display: 'grid',
    alignContent: 'center',
    gap: 4,
    minWidth: 0,
  },

  metricTopLine: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: 'rgba(244,246,242,0.78)',
    minWidth: 0,
  },

  cardProgressArea: {
    marginTop: 12,
    display: 'grid',
    gap: 8,
  },

  premiumActions: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
    marginTop: 14,
  },

  primaryButtonSmall: {
    minHeight: 40,
    borderRadius: 9,
    background: `linear-gradient(135deg, ${green}, #7BEE65)`,
    color: '#061008',
    textDecoration: 'none',
    display: 'inline-flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    fontWeight: 900,
    fontSize: 13,
    boxShadow: `0 0 22px ${rgbaGreen(0.16)}`,
  },

  secondaryButtonSmall: {
    minHeight: 40,
    borderRadius: 9,
    background: 'rgba(255,255,255,0.040)',
    color: white,
    border: '1px solid rgba(255,255,255,0.10)',
    textDecoration: 'none',
    display: 'inline-flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontWeight: 850,
    fontSize: 13,
  },

  reviewButton: {
    minHeight: 40,
    borderRadius: 9,
    background: 'rgba(255,255,255,0.050)',
    color: white,
    border: '1px solid rgba(255,255,255,0.10)',
    textDecoration: 'none',
    display: 'inline-flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    fontWeight: 850,
    fontSize: 13,
  },

  sectionStack: {
    display: 'grid',
    gap: 16,
  },

  courseGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
    gap: 16,
  },

  certificateCard: {
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.09)',
    background: panelBg,
    padding: 20,
    boxShadow: '0 20px 70px rgba(0,0,0,0.16)',
  },

  certificateIcon: {
    width: 54,
    height: 54,
    borderRadius: 999,
    border: `1px solid ${rgbaGreen(0.26)}`,
    background: rgbaGreen(0.08),
    display: 'grid',
    placeItems: 'center',
    color: green,
    marginBottom: 14,
  },

  certificateTitle: {
    margin: '14px 0 16px',
    fontSize: 24,
    lineHeight: 1.05,
    fontWeight: 900,
    letterSpacing: '-0.035em',
  },

  profileGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: 12,
  },

  profileStat: {
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(0,0,0,0.20)',
    padding: '10px 10px',
    minWidth: 0,
    display: 'grid',
    gap: 5,
  },

  profileStatLabel: {
    color: 'rgba(244,246,242,0.60)',
    fontSize: 11,
    lineHeight: 1.2,
  },

  profileStatValue: {
    color: white,
    fontSize: 16,
    lineHeight: 1.05,
    fontWeight: 850,
    letterSpacing: '-0.01em',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 14,
  },

  infoBlock: {
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
    padding: 18,
  },

  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    display: 'grid',
    placeItems: 'center',
    color: green,
    background: rgbaGreen(0.08),
    border: `1px solid ${rgbaGreen(0.18)}`,
    marginBottom: 14,
  },

  infoBlockTitle: {
    margin: 0,
    fontSize: 18,
    lineHeight: 1.2,
    fontWeight: 850,
  },

  infoBlockText: {
    margin: '8px 0 0',
    color: muted,
    lineHeight: 1.65,
    fontSize: 14,
  },

  emptyState: {
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.025)',
    padding: 18,
    color: muted,
  },

  emptyText: {
    margin: 0,
    color: muted,
    lineHeight: 1.6,
  },
};
