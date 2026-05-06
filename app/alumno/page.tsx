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
  | 'home';

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
const white = '#F4F6F2';
const muted = 'rgba(244,246,242,0.62)';
const soft = 'rgba(244,246,242,0.42)';
const gold = '#D6B25E';

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
        lessonProgress.some(
          (progress) =>
            String(progress.lesson_id) === String(lesson.id) &&
            String(progress.course_id) === String(course.id)
        )
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
  const completedCourses = courseCards.filter((card) => card.completion);

  const mainCourse = useMemo(() => {
    const candidates = [...activeCourses, ...completedCourses];

    return (
      candidates.find((card) => card.nextLesson && card.courseModules.length > 0) ||
      candidates.find((card) => card.courseModules.length > 0 && card.courseLessons.length > 0) ||
      candidates.find((card) => card.progressPercent > 0) ||
      candidates[0] ||
      null
    );
  }, [activeCourses, completedCourses]);

  const totalLessons = courseCards.reduce((sum, card) => sum + card.courseLessons.length, 0);
  const completedLessonsInsideVisibleCourses = courseCards.reduce(
    (sum, card) => sum + card.completedLessonCount,
    0
  );

  const globalProgress =
    totalLessons > 0 ? Math.round((completedLessonsInsideVisibleCourses / totalLessons) * 100) : 0;

  const currentModule =
    mainCourse && mainCourse.nextLesson
      ? mainCourse.courseModules.find(
          (module) => String(module.id) === String(mainCourse.nextLesson?.module_id)
        )
      : mainCourse?.courseModules[0] || null;

  const moduleViews = useMemo<ModuleView[]>(() => {
    if (!mainCourse) return [];

    return mainCourse.courseModules.map((module, index) => {
      const moduleLessons = mainCourse.courseLessons.filter(
        (lesson) => String(lesson.module_id) === String(module.id)
      );

      const completedLessons = moduleLessons.filter((lesson) =>
        lessonProgress.some((progress) => String(progress.lesson_id) === String(lesson.id))
      ).length;

      const isCompleted = moduleCompletions.some(
        (completion) => String(completion.module_id) === String(module.id)
      );

      const previousModule = mainCourse.courseModules[index - 1];

      const isUnlocked =
        index === 0 ||
        isCompleted ||
        moduleCompletions.some(
          (completion) => String(completion.module_id) === String(previousModule?.id)
        );

      const isCurrent =
        Boolean(mainCourse.nextLesson) &&
        String(mainCourse.nextLesson?.module_id) === String(module.id);

      const firstLesson = moduleLessons[0];
      const nextLessonInsideModule = moduleLessons.find(
        (lesson) =>
          !lessonProgress.some((progress) => String(progress.lesson_id) === String(lesson.id))
      );

      const targetLesson = nextLessonInsideModule || firstLesson;
      const href =
        isUnlocked && targetLesson
          ? `/cursos/${getCourseSlug(mainCourse.course)}/${targetLesson.id}`
          : `/cursos/${getCourseSlug(mainCourse.course)}`;

      return {
        module,
        index,
        lessons: moduleLessons,
        completedLessons,
        progress:
          moduleLessons.length > 0
            ? Math.round((completedLessons / moduleLessons.length) * 100)
            : isCompleted
              ? 100
              : 0,
        isCompleted,
        isCurrent,
        isLocked: !isUnlocked,
        href,
      };
    });
  }, [mainCourse, lessonProgress, moduleCompletions]);

  const stats = {
    courses: courses.length,
    lessons: completedLessonsInsideVisibleCourses,
    modules: moduleCompletions.length,
    completedCourses: courseCompletions.length,
    certificates: certificates.length,
    globalProgress,
  };

  const availableLevels = useMemo(() => {
    const values = courseCards
      .map((card) => String(card.course.level || '').trim())
      .filter(Boolean);

    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
  }, [courseCards]);

  const availableCategories = useMemo(() => {
    const values = courseCards
      .map((card) =>
        String(
          card.course.category ||
            card.course.course_type ||
            card.course.type ||
            card.course.area ||
            ''
        ).trim()
      )
      .filter(Boolean);

    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
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
        id: 'progress',
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
            ? 'Ya tienes al menos un certificado válido disponible.'
            : 'Completa tu curso y examen final para emitir tu certificado.',
        type: 'Certification',
        time: 'Hoy',
        unread: certificates.length > 0,
        href: '/alumno',
      },
      {
        id: 'new-course',
        title: 'Catálogo GHC Academy',
        message: 'Revisa nuevos cursos y especializaciones disponibles.',
        type: 'Courses',
        time: 'Esta semana',
        unread: true,
        href: '/cursos',
      },
      {
        id: 'payment',
        title: 'Estado de acceso',
        message: 'Cuando activemos pagos, aquí aparecerán avisos de renovación o incidencias.',
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

            <div style={styles.progressTrackSubtle}>
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
            <span>Home</span>
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

                    <span style={styles.notificationBadge}>
                      {unreadNotifications} new
                    </span>
                  </div>

                  <div style={styles.notificationList}>
                    {notifications.map((notification) => {
                      const content = (
                        <article
                          key={notification.id}
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

                      return content;
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
          <div style={styles.dashboardGrid}>
            <section style={styles.topCardsGrid}>
              <article style={styles.progressCard}>
                <h2 style={styles.cardTitle}>Overall Progress</h2>

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
                  <MiniStat icon="clock" label="Lessons completed" value={stats.lessons} />
                  <MiniStat
                    icon="certificate"
                    label="Certificates earned"
                    value={stats.certificates}
                  />
                </div>
              </article>

              <article style={styles.nextModuleCard}>
                <div style={styles.athleteVisual}>
                  <div style={styles.athleteGlow} />
                  <div style={styles.athleteLabel}>GHC Performance</div>
                </div>

                <div style={styles.nextContent}>
                  <p style={styles.inProgressLabel}>In progress</p>

                  <h2 style={styles.nextTitle}>
                    {currentModule?.title ||
                      mainCourse?.nextLesson?.title ||
                      mainCourse?.course?.title ||
                      'Next Module'}
                  </h2>

                  <p style={styles.nextDescription}>
                    {mainCourse?.course?.subtitle ||
                      mainCourse?.course?.description ||
                      'Explore your next learning step and keep progressing through the academy.'}
                  </p>

                  <div style={styles.nextMeta}>
                    <MetaItem icon="clock" text="4–5 Hours" />
                    <MetaItem icon="chart" text={mainCourse?.course?.level || 'Intermediate'} />
                    <MetaItem
                      icon="document"
                      text={`${mainCourse?.courseLessons.length || 0} Lessons`}
                    />
                  </div>

                  <div style={styles.nextProgressBlock}>
                    <div style={styles.progressTrack}>
                      <div
                        style={{
                          ...styles.progressFill,
                          width: `${mainCourse?.progressPercent || 0}%`,
                        }}
                      />
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
                    style={styles.continueButton}
                  >
                    Continue Learning
                    <Icon name="arrow" />
                  </Link>
                </div>
              </article>
            </section>

            <Panel title="Curriculum">
              <div style={styles.curriculumList}>
                {moduleViews.length === 0 ? (
                  <EmptyState text="Aún no hay módulos visibles para este curso." />
                ) : (
                  moduleViews.slice(0, 6).map((item) => (
                    <CurriculumRow key={item.module.id} item={item} />
                  ))
                )}
              </div>
            </Panel>

            <section style={styles.bottomGrid}>
              <article style={styles.examCard}>
                <div style={styles.examContent}>
                  <h2 style={styles.largeCardTitle}>Mock Exam Simulator</h2>
                  <p style={styles.cardDescription}>
                    Test your knowledge under real conditions before earning your final
                    certification.
                  </p>

                  <button
                    type="button"
                    style={styles.darkButton}
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

                <div style={styles.examVisual}>
                  <span>?</span>
                </div>
              </article>

              <article style={styles.certificationCard}>
                <div style={styles.certificationBgPhoto} />
                <div style={styles.certificationBgOverlay} />

                <div style={styles.certContent}>
                  <p style={styles.certKicker}>Official Credential</p>
                  <h2 style={styles.largeCardTitle}>Certification</h2>
                  <p style={styles.cardDescription}>
                    Earn your official GHC Academy certificate when your learning path is
                    completed and verified.
                  </p>

                  <button
                    type="button"
                    style={styles.darkButton}
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
        )}

        {activeTab === 'cursos' && (
          <div style={styles.coursesPage}>
            <section style={styles.coursesHeader}>
              <div>
                <h1 style={styles.pageTitle}>My Courses</h1>
                <p style={styles.pageSubtitle}>
                  Continue learning and track your progress across all your courses.
                </p>
              </div>
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
                style={
                  courseStatusFilter === 'completed' ? styles.filterActive : styles.filterButton
                }
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

            <section style={styles.courseSection}>
              <div style={styles.courseSectionHeader}>
                <h2 style={styles.courseSectionTitle}>
                  {courseStatusFilter === 'completed'
                    ? 'Completed Courses'
                    : courseStatusFilter === 'all'
                      ? 'All Courses'
                      : 'Active Courses'}
                </h2>

                <span style={styles.resultCounter}>
                  {filteredCards.length} result{filteredCards.length === 1 ? '' : 's'}
                </span>
              </div>

              {filteredCards.length === 0 ? (
                <EmptyState text="No hay cursos que coincidan con los filtros seleccionados." />
              ) : (
                <div
                  style={viewMode === 'grid' ? styles.premiumCourseGrid : styles.premiumCourseList}
                >
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
            </section>
          </div>
        )}

        {activeTab === 'curriculum' && (
          <div style={styles.sectionStack}>
            <Panel title="Curriculum">
              <div style={styles.curriculumList}>
                {moduleViews.length === 0 ? (
                  <EmptyState text="Aún no hay módulos visibles para este curso." />
                ) : (
                  moduleViews.map((item) => <CurriculumRow key={item.module.id} item={item} />)
                )}
              </div>
            </Panel>

            <Panel title="Lessons">
              {mainCourse?.courseLessons.length ? (
                <div style={styles.lessonsGrid}>
                  {mainCourse.courseLessons.slice(0, 12).map((lesson) => {
                    const completed = lessonProgress.some(
                      (progress) => String(progress.lesson_id) === String(lesson.id)
                    );

                    return (
                      <Link
                        key={lesson.id}
                        href={`/cursos/${getCourseSlug(mainCourse.course)}/${lesson.id}`}
                        style={styles.lessonCard}
                      >
                        <span style={completed ? styles.lessonStatusDone : styles.lessonStatus}>
                          {completed ? 'Completed' : 'Pending'}
                        </span>
                        <strong>{lesson.title || 'Lección'}</strong>
                        <p>{lesson.content_type || lesson.type || 'Contenido académico'}</p>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <EmptyState text="No hay lecciones visibles todavía." />
              )}
            </Panel>
          </div>
        )}

        {activeTab === 'examenes' && (
          <div style={styles.sectionStack}>
            <Panel title="Mock Exams">
              <div style={styles.examGrid}>
                <InfoBlock
                  icon="exam"
                  title="Exámenes por módulo"
                  text="Los exámenes de desbloqueo se integran con el avance real por módulos."
                />
                <InfoBlock
                  icon="shield"
                  title="Control académico"
                  text="El alumno avanza cuando demuestra comprensión suficiente del bloque."
                />
                <InfoBlock
                  icon="chart"
                  title="Preparado para IA"
                  text="Más adelante la IA podrá generar exámenes en borrador para revisión del admin."
                />
              </div>
            </Panel>
          </div>
        )}

        {activeTab === 'certificados' && (
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
        )}

        {activeTab === 'perfil' && (
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
              <div style={styles.examGrid}>
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
        )}
      </section>
    </main>
  );
}

function Background() {
  return (
    <div style={styles.background} aria-hidden="true">
      <div style={styles.orbOne} />
      <div style={styles.orbTwo} />
      <div style={styles.orbThree} />
      <div style={styles.gridTexture} />
    </div>
  );
}

function GlobalCss() {
  return (
    <style>
      {`
        * {
          box-sizing: border-box;
        }

        body {
          background: ${bg};
        }

        a, button {
          -webkit-tap-highlight-color: transparent;
        }

        button, input, select {
          font: inherit;
        }

        input::placeholder {
          color: rgba(244,246,242,0.38);
        }

        select option {
          background: #080B0A;
          color: #F4F6F2;
        }

        @media (max-width: 1180px) {
          main[data-ghc-page="student"] {
            grid-template-columns: 104px minmax(0, 1fr) !important;
          }
        }

        @media (max-width: 960px) {
          main[data-ghc-page="student"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}
    </style>
  );
}

function NavButton({
  icon,
  label,
  helper,
  active,
  onClick,
}: {
  icon: IconName;
  label: string;
  helper: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} style={active ? styles.navActive : styles.navButton}>
      <span style={active ? styles.navIconActive : styles.navIcon}>
        <Icon name={icon} />
      </span>

      <span style={styles.navText}>
        <strong>{label}</strong>
        <small>{helper}</small>
      </span>
    </button>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={styles.panel}>
      <h2 style={styles.panelTitle}>{title}</h2>
      {children}
    </section>
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

  const title = String(course.title || 'Curso GHC Academy');
  const subtitle =
    course.subtitle ||
    course.description ||
    'Formación premium basada en ciencia, estructura y rendimiento.';

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
            {completed ? 'Completed' : 'In progress'}
          </span>
        </div>

        <span style={styles.bookmarkIcon}>
          <Icon name={completed ? 'check' : 'bookmark'} />
        </span>
      </div>

      <div style={styles.premiumCourseBody}>
        <h3 style={styles.premiumCourseTitle}>{title}</h3>

        <p style={styles.premiumCourseText}>{subtitle}</p>

        <div style={styles.premiumStatsGrid}>
          <PremiumMetric
            icon="document"
            value={card.courseLessons.length || card.completedLessonCount || 0}
            label="Lessons"
          />
          <PremiumMetric
            icon="box"
            value={card.courseModules.length || card.completedModuleCount || 0}
            label="Modules"
          />
          <PremiumMetric icon="chart" value={`${card.progressPercent}%`} label="Progress" />
        </div>

        <div style={styles.cardProgressArea}>
          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressFill, width: `${card.progressPercent}%` }} />
          </div>
          <span style={styles.cardProgressText}>{card.progressPercent}% Complete</span>
        </div>

        <div style={styles.premiumActions}>
          <Link href={href} style={completed ? styles.reviewButton : styles.courseContinueButton}>
            {completed ? 'Review' : 'Continue'}
            {!completed && <Icon name="arrow" />}
          </Link>

          <Link href={`/cursos/${getCourseSlug(course)}`} style={styles.courseDetailButton}>
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

function CurriculumRow({ item }: { item: ModuleView }) {
  const moduleNumber = item.index + 1;

  if (item.isLocked) {
    return (
      <article style={styles.curriculumRowLocked}>
        <div style={styles.curriculumIconLocked}>
          <Icon name="lock" />
        </div>

        <div style={styles.curriculumMain}>
          <p style={styles.moduleLabel}>Module {moduleNumber}</p>
          <h3>{item.module.title || `Módulo ${moduleNumber}`}</h3>
        </div>

        <span style={styles.lockedText}>Locked</span>
      </article>
    );
  }

  if (item.isCurrent) {
    return (
      <Link href={item.href} style={styles.curriculumRowActive}>
        <div style={styles.curriculumIconActive}>
          <Icon name="performance" />
        </div>

        <div style={styles.curriculumMain}>
          <div style={styles.moduleLabelRow}>
            <p style={styles.moduleLabel}>Module {moduleNumber}</p>
            <span style={styles.inProgressMini}>In progress</span>
          </div>

          <h3>{item.module.title || `Módulo ${moduleNumber}`}</h3>

          <div style={styles.curriculumProgressTrack}>
            <div style={{ ...styles.progressFill, width: `${item.progress}%` }} />
          </div>
        </div>

        <div style={styles.curriculumRight}>
          <strong>{item.progress}% Complete</strong>
          <span style={styles.arrowBox}>
            <Icon name="arrow" />
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link href={item.href} style={styles.curriculumRow}>
      <div style={item.isCompleted ? styles.curriculumIconDone : styles.curriculumIcon}>
        <Icon name={item.isCompleted ? 'check' : 'curriculum'} />
      </div>

      <div style={styles.curriculumMain}>
        <p style={styles.moduleLabel}>Module {moduleNumber}</p>
        <h3>{item.module.title || `Módulo ${moduleNumber}`}</h3>
      </div>

      <div style={styles.curriculumRight}>
        <strong>{item.isCompleted ? '100% Score' : `${item.progress}%`}</strong>
        {item.isCompleted && (
          <span style={styles.checkCircle}>
            <Icon name="check" />
          </span>
        )}
      </div>
    </Link>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string | number;
}) {
  return (
    <div style={styles.miniStat}>
      <span style={styles.miniStatIcon}>
        <Icon name={icon} />
      </span>

      <div style={styles.miniStatText}>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function MetaItem({ icon, text }: { icon: IconName; text: string }) {
  return (
    <span style={styles.metaItem}>
      <Icon name={icon} />
      {text}
    </span>
  );
}

function Feature({ icon, text }: { icon: IconName; text: string }) {
  return (
    <span style={styles.feature}>
      <Icon name={icon} />
      {text}
    </span>
  );
}

function CertificateCard({ certificate }: { certificate: AnyRecord }) {
  return (
    <article style={styles.certificateCard}>
      <div style={styles.certificateIcon}>
        <Icon name="star" />
      </div>

      <span style={styles.badgeGreen}>Valid Certificate</span>

      <h3 style={styles.courseCardTitle}>{certificate.course_title || 'Curso completado'}</h3>

      <div style={styles.courseStatsGrid}>
        <ProfileStat label="Score" value={`${certificate.final_score ?? '—'}%`} />
        <ProfileStat label="Status" value="Valid" />
        <ProfileStat label="Code" value={certificate.certificate_code || '—'} />
      </div>

      {certificate.verification_slug ? (
        <Link href={`/certificados/${certificate.verification_slug}`} style={styles.continueButton}>
          View Certificate
          <Icon name="arrow" />
        </Link>
      ) : (
        <p style={styles.courseCardText}>Certificado registrado sin enlace público.</p>
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
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <article style={styles.emptyState}>
      <p>{text}</p>
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

function cardBackground() {
  return 'linear-gradient(145deg, rgba(255,255,255,0.060), rgba(255,255,255,0.022)), rgba(8,12,10,0.86)';
}

const styles: Record<string, CSSProperties> = {
  loadingPage: {
    minHeight: '100vh',
    background: bg,
    color: white,
    position: 'relative',
    display: 'grid',
    placeItems: 'center',
    overflow: 'hidden',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },

  page: {
    minHeight: '100vh',
    background: bg,
    color: white,
    position: 'relative',
    overflow: 'hidden',
    display: 'grid',
    gridTemplateColumns: '282px minmax(0, 1fr)',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
    top: -220,
    left: -180,
    background: rgbaGreen(0.10),
    filter: 'blur(100px)',
  },

  orbTwo: {
    position: 'absolute',
    width: 520,
    height: 520,
    borderRadius: 999,
    right: -260,
    top: 120,
    background: 'rgba(120,135,130,0.09)',
    filter: 'blur(110px)',
  },

  orbThree: {
    position: 'absolute',
    width: 620,
    height: 620,
    borderRadius: 999,
    bottom: -320,
    left: '36%',
    background: rgbaGreen(0.05),
    filter: 'blur(120px)',
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

  loadingCard: {
    width: 'min(720px, calc(100vw - 44px))',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: 34,
    background: 'linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.022))',
    padding: 36,
    position: 'relative',
    zIndex: 2,
    boxShadow: '0 34px 130px rgba(0,0,0,0.45)',
  },

  loadingAccent: {
    width: 68,
    height: 4,
    borderRadius: 999,
    background: green,
    boxShadow: `0 0 28px ${rgbaGreen(0.45)}`,
    marginBottom: 24,
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
    fontSize: 'clamp(44px, 6vw, 76px)',
    lineHeight: 0.92,
    letterSpacing: '-0.065em',
    fontWeight: 950,
  },

  loadingText: {
    color: muted,
    lineHeight: 1.8,
    maxWidth: 620,
    marginTop: 16,
  },

  sidebar: {
    position: 'relative',
    zIndex: 2,
    minHeight: '100vh',
    borderRight: '1px solid rgba(255,255,255,0.07)',
    background: 'linear-gradient(180deg, rgba(6,9,8,0.97), rgba(3,5,4,0.93))',
    padding: 22,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },

  logoBlock: {
    height: 58,
    display: 'flex',
    alignItems: 'center',
    marginBottom: 24,
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
    borderRadius: 0,
    padding: '13px 14px',
    textAlign: 'left',
    cursor: 'pointer',
    position: 'relative',
  },

  navActive: {
    border: `1px solid ${rgbaGreen(0.12)}`,
    background: `linear-gradient(90deg, ${rgbaGreen(0.18)}, ${rgbaGreen(0.035)} 70%, transparent)`,
    color: green,
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    width: '100%',
    borderRadius: 0,
    padding: '13px 14px',
    textAlign: 'left',
    cursor: 'pointer',
    position: 'relative',
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
    padding: 18,
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
    maxWidth: 150,
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
    padding: '16px 0',
    marginTop: 18,
  },

  xpRow: {
    display: 'flex',
    justifyContent: 'space-between',
    color: muted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },

  progressTrackSubtle: {
    height: 7,
    borderRadius: 999,
    background: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
    marginTop: 12,
  },

  signOutButton: {
    marginTop: 18,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    background: 'transparent',
    border: '0',
    color: 'rgba(244,246,242,0.58)',
    fontSize: 13,
    cursor: 'pointer',
    padding: 0,
  },

  appShell: {
    position: 'relative',
    zIndex: 1,
    padding: 24,
    overflow: 'auto',
    height: '100vh',
  },

  topbar: {
    minHeight: 64,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
    marginBottom: 18,
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

  dashboardGrid: {
    display: 'grid',
    gap: 18,
  },

  topCardsGrid: {
    display: 'grid',
    gridTemplateColumns: '350px minmax(0, 1fr)',
    gap: 18,
  },

  progressCard: {
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.09)',
    background: cardBackground(),
    padding: 22,
    minHeight: 342,
  },

  cardTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 850,
    letterSpacing: '-0.02em',
  },

  progressRingWrap: {
    display: 'flex',
    justifyContent: 'center',
    margin: '20px 0 12px',
  },

  progressRing: {
    width: 168,
    height: 168,
    borderRadius: 999,
    display: 'grid',
    placeItems: 'center',
    boxShadow: `0 0 42px ${rgbaGreen(0.12)}`,
  },

  progressRingInner: {
    width: 122,
    height: 122,
    borderRadius: 999,
    background: '#080B0A',
    border: '1px solid rgba(255,255,255,0.10)',
    display: 'grid',
    placeItems: 'center',
    textAlign: 'center',
    alignContent: 'center',
  },

  progressRingValue: {
    display: 'block',
    color: white,
    fontSize: 48,
    lineHeight: 0.88,
    fontWeight: 950,
    letterSpacing: '-0.06em',
  },

  progressRingLabel: {
    display: 'block',
    color: 'rgba(244,246,242,0.62)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.10em',
    fontWeight: 850,
    marginTop: 8,
  },

  centerText: {
    maxWidth: 270,
    color: muted,
    textAlign: 'center',
    lineHeight: 1.6,
    margin: '10px auto 18px',
  },

  progressMiniStats: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 0,
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    overflow: 'hidden',
    background: 'rgba(0,0,0,0.18)',
  },

  miniStat: {
    minWidth: 0,
    display: 'grid',
    gridTemplateColumns: '28px minmax(0, 1fr)',
    alignItems: 'center',
    gap: 10,
    padding: '13px 12px',
    color: muted,
  },

  miniStatIcon: {
    width: 28,
    height: 28,
    borderRadius: 999,
    display: 'grid',
    placeItems: 'center',
    color: green,
    background: rgbaGreen(0.08),
    border: `1px solid ${rgbaGreen(0.18)}`,
  },

  miniStatText: {
    minWidth: 0,
    display: 'grid',
    gap: 2,
  },

  nextModuleCard: {
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.09)',
    background: cardBackground(),
    minHeight: 342,
    display: 'grid',
    gridTemplateColumns: '0.72fr 1fr',
    overflow: 'hidden',
  },

  athleteVisual: {
    position: 'relative',
    background:
      'linear-gradient(90deg, rgba(5,7,6,0.05), rgba(5,7,6,0.92)), url(https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=1200&q=80)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: 'grayscale(1) contrast(1.08) brightness(0.70)',
  },

  athleteGlow: {
    position: 'absolute',
    inset: 0,
    background: `radial-gradient(circle at 55% 42%, ${rgbaGreen(0.18)}, transparent 35%)`,
  },

  athleteLabel: {
    position: 'absolute',
    left: 22,
    bottom: 20,
    color: 'rgba(244,246,242,0.34)',
    textTransform: 'uppercase',
    letterSpacing: '0.18em',
    fontSize: 11,
    fontWeight: 900,
  },

  nextContent: {
    padding: 28,
    display: 'flex',
    flexDirection: 'column',
  },

  inProgressLabel: {
    margin: 0,
    color: green,
    textTransform: 'uppercase',
    letterSpacing: '0.16em',
    fontSize: 11,
    fontWeight: 900,
  },

  nextTitle: {
    margin: '12px 0 0',
    fontSize: 30,
    lineHeight: 1.05,
    letterSpacing: '-0.035em',
    fontWeight: 900,
  },

  nextDescription: {
    margin: '12px 0 0',
    color: muted,
    fontSize: 15,
    lineHeight: 1.65,
    maxWidth: 540,
  },

  nextMeta: {
    display: 'flex',
    gap: 20,
    flexWrap: 'wrap',
    marginTop: 22,
    color: muted,
  },

  metaItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
  },

  nextProgressBlock: {
    marginTop: 'auto',
    paddingTop: 26,
    color: green,
    fontWeight: 800,
  },

  progressTrack: {
    height: 8,
    borderRadius: 999,
    background: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 999,
    background: green,
    boxShadow: `0 0 24px ${rgbaGreen(0.34)}`,
  },

  continueButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 42,
    borderRadius: 10,
    border: `1px solid ${rgbaGreen(0.26)}`,
    background: `linear-gradient(135deg, ${green}, #7BEE65)`,
    color: '#061008',
    textDecoration: 'none',
    fontWeight: 900,
    fontSize: 13,
    padding: '0 18px',
    marginTop: 12,
    width: 'fit-content',
    boxShadow: `0 0 26px ${rgbaGreen(0.16)}`,
  },

  panel: {
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.09)',
    background: cardBackground(),
    padding: 20,
  },

  panelTitle: {
    margin: '0 0 18px',
    fontSize: 22,
    lineHeight: 1,
    fontWeight: 900,
    letterSpacing: '-0.035em',
  },

  curriculumList: {
    display: 'grid',
    gap: 8,
  },

  curriculumRow: {
    minHeight: 56,
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.026)',
    display: 'grid',
    gridTemplateColumns: '42px minmax(0,1fr) auto',
    alignItems: 'center',
    gap: 14,
    padding: '12px 14px',
    textDecoration: 'none',
    color: white,
  },

  curriculumRowActive: {
    minHeight: 64,
    borderRadius: 12,
    border: `1px solid ${rgbaGreen(0.55)}`,
    background: `linear-gradient(90deg, ${rgbaGreen(0.13)}, ${rgbaGreen(0.04)})`,
    display: 'grid',
    gridTemplateColumns: '42px minmax(0,1fr) auto',
    alignItems: 'center',
    gap: 14,
    padding: '12px 14px',
    textDecoration: 'none',
    color: white,
    boxShadow: `inset 0 0 0 1px ${rgbaGreen(0.08)}, 0 0 34px ${rgbaGreen(0.06)}`,
  },

  curriculumRowLocked: {
    minHeight: 56,
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.05)',
    background: 'rgba(255,255,255,0.018)',
    display: 'grid',
    gridTemplateColumns: '42px minmax(0,1fr) auto',
    alignItems: 'center',
    gap: 14,
    padding: '12px 14px',
    color: 'rgba(244,246,242,0.42)',
  },

  curriculumIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.10)',
    display: 'grid',
    placeItems: 'center',
    color: muted,
  },

  curriculumIconDone: {
    width: 34,
    height: 34,
    borderRadius: 10,
    border: `1px solid ${rgbaGreen(0.28)}`,
    background: rgbaGreen(0.08),
    display: 'grid',
    placeItems: 'center',
    color: green,
  },

  curriculumIconActive: {
    width: 34,
    height: 34,
    borderRadius: 10,
    border: `1px solid ${rgbaGreen(0.34)}`,
    background: rgbaGreen(0.10),
    display: 'grid',
    placeItems: 'center',
    color: green,
  },

  curriculumIconLocked: {
    width: 34,
    height: 34,
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.08)',
    display: 'grid',
    placeItems: 'center',
    color: 'rgba(244,246,242,0.35)',
  },

  curriculumMain: {
    minWidth: 0,
  },

  moduleLabelRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },

  moduleLabel: {
    margin: 0,
    color: green,
    textTransform: 'uppercase',
    letterSpacing: '0.13em',
    fontSize: 10,
    fontWeight: 900,
  },

  inProgressMini: {
    borderRadius: 999,
    background: rgbaGreen(0.12),
    color: green,
    padding: '3px 8px',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    fontSize: 9,
    fontWeight: 900,
  },

  curriculumRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    color: muted,
    fontSize: 13,
  },

  arrowBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: green,
    color: '#061008',
    display: 'grid',
    placeItems: 'center',
    boxShadow: `0 0 18px ${rgbaGreen(0.16)}`,
  },

  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 999,
    border: `1px solid ${rgbaGreen(0.30)}`,
    color: green,
    display: 'grid',
    placeItems: 'center',
  },

  lockedText: {
    color: soft,
    fontSize: 13,
  },

  curriculumProgressTrack: {
    height: 5,
    borderRadius: 999,
    background: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
    marginTop: 8,
  },

  bottomGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 18,
  },

  examCard: {
    minHeight: 240,
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.09)',
    background:
      'linear-gradient(90deg, rgba(11,15,13,0.98), rgba(11,15,13,0.86)), url(https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    padding: 22,
    display: 'grid',
    gridTemplateColumns: '1fr 160px',
    overflow: 'hidden',
    position: 'relative',
  },

  certificationCard: {
    minHeight: 240,
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.09)',
    background: 'rgba(11,15,13,0.92)',
    padding: 22,
    overflow: 'hidden',
    position: 'relative',
    isolation: 'isolate',
    display: 'flex',
    alignItems: 'stretch',
  },

  certificationBgPhoto: {
    position: 'absolute',
    inset: 0,
    backgroundImage:
      'linear-gradient(90deg, rgba(8,11,10,0.98) 0%, rgba(8,11,10,0.92) 24%, rgba(8,11,10,0.56) 58%, rgba(8,11,10,0.18) 100%), url(https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: 'grayscale(0.15) contrast(1.02) brightness(0.72)',
    zIndex: 0,
  },

  certificationBgOverlay: {
    position: 'absolute',
    inset: 0,
    background:
      'radial-gradient(circle at 82% 40%, rgba(214,178,94,0.10), transparent 26%), linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.10))',
    zIndex: 1,
  },

  examContent: {
    minWidth: 0,
    position: 'relative',
    zIndex: 2,
  },

  certContent: {
    width: '56%',
    minWidth: 0,
    position: 'relative',
    zIndex: 3,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },

  certKicker: {
    margin: '0 0 10px',
    color: gold,
    textTransform: 'uppercase',
    letterSpacing: '0.16em',
    fontSize: 10,
    fontWeight: 900,
  },

  largeCardTitle: {
    margin: 0,
    fontSize: 26,
    letterSpacing: '-0.04em',
    fontWeight: 900,
  },

  cardDescription: {
    color: muted,
    fontSize: 15,
    lineHeight: 1.7,
    maxWidth: 450,
  },

  darkButton: {
    minHeight: 42,
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.045)',
    color: white,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    padding: '0 16px',
    fontWeight: 800,
    cursor: 'pointer',
    marginTop: 10,
    width: 'fit-content',
  },

  featureRow: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap',
    marginTop: 26,
    color: muted,
    fontSize: 12,
  },

  feature: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
  },

  examVisual: {
    fontSize: 150,
    lineHeight: 1,
    color: 'rgba(244,246,242,0.08)',
    fontWeight: 950,
    display: 'grid',
    placeItems: 'center',
  },

  pageTitle: {
    margin: 0,
    fontSize: 36,
    lineHeight: 1,
    letterSpacing: '-0.05em',
    fontWeight: 900,
  },

  pageSubtitle: {
    margin: '12px 0 0',
    color: muted,
    fontSize: 15,
    lineHeight: 1.6,
  },

  coursesPage: {
    display: 'grid',
    gap: 18,
  },

  coursesHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'end',
    gap: 18,
  },

  courseControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    padding: '0 0 6px',
  },

  searchBox: {
    width: 320,
    minHeight: 46,
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
    height: 44,
  },

  filterActive: {
    minHeight: 46,
    borderRadius: 10,
    border: `1px solid ${rgbaGreen(0.32)}`,
    background: rgbaGreen(0.11),
    color: green,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 12,
    padding: '0 18px',
    cursor: 'pointer',
    fontWeight: 850,
    boxShadow: `0 0 16px ${rgbaGreen(0.08)}`,
  },

  filterButton: {
    minHeight: 46,
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.030)',
    color: 'rgba(244,246,242,0.78)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 12,
    padding: '0 18px',
    cursor: 'pointer',
    fontWeight: 800,
  },

  selectControl: {
    minHeight: 46,
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.030)',
    color: 'rgba(244,246,242,0.78)',
    padding: '0 16px',
    outline: 0,
    cursor: 'pointer',
    fontWeight: 800,
  },

  sortSelect: {
    minHeight: 46,
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.030)',
    color: 'rgba(244,246,242,0.78)',
    padding: '0 16px',
    outline: 0,
    cursor: 'pointer',
    fontWeight: 800,
  },

  controlsSpacer: {
    flex: 1,
  },

  viewToggle: {
    height: 46,
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.030)',
    display: 'flex',
    alignItems: 'center',
    padding: 4,
    gap: 4,
  },

  viewButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    border: '0',
    background: 'transparent',
    color: 'rgba(244,246,242,0.52)',
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
  },

  viewButtonActive: {
    width: 36,
    height: 36,
    borderRadius: 8,
    border: '0',
    background: rgbaGreen(0.12),
    color: green,
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
  },

  courseSection: {
    display: 'grid',
    gap: 14,
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
    gap: 18,
    alignItems: 'stretch',
  },

  premiumCourseList: {
    display: 'grid',
    gap: 14,
  },

  premiumCourseCard: {
    minHeight: 394,
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.09)',
    background:
      'linear-gradient(145deg, rgba(255,255,255,0.050), rgba(255,255,255,0.018)), rgba(8,12,10,0.88)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
  },

  premiumCourseCardList: {
    minHeight: 220,
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.09)',
    background:
      'linear-gradient(145deg, rgba(255,255,255,0.050), rgba(255,255,255,0.018)), rgba(8,12,10,0.88)',
    overflow: 'hidden',
    display: 'grid',
    gridTemplateColumns: '320px minmax(0, 1fr)',
    boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
  },

  premiumCourseImage: {
    height: 164,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    position: 'relative',
    filter: 'grayscale(1) contrast(1.05) brightness(0.82)',
    flexShrink: 0,
  },

  premiumCourseImageList: {
    height: '100%',
    minHeight: 220,
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
    minHeight: 52,
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
    minHeight: 60,
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
    marginTop: 13,
    display: 'grid',
    gap: 8,
  },

  cardProgressText: {
    color: green,
    fontSize: 13,
    fontWeight: 850,
  },

  premiumActions: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
    marginTop: 14,
  },

  courseContinueButton: {
    minHeight: 42,
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

  reviewButton: {
    minHeight: 42,
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

  courseDetailButton: {
    minHeight: 42,
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

  sectionStack: {
    display: 'grid',
    gap: 18,
  },

  courseGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
    gap: 18,
  },

  courseCardTitle: {
    margin: 0,
    fontSize: 24,
    lineHeight: 1.05,
    letterSpacing: '-0.035em',
    fontWeight: 900,
  },

  courseCardText: {
    color: muted,
    lineHeight: 1.65,
    fontSize: 14,
    minHeight: 66,
  },

  courseStatsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 10,
    marginTop: 16,
  },

  badgeGreen: {
    borderRadius: 999,
    background: rgbaGreen(0.12),
    border: `1px solid ${rgbaGreen(0.26)}`,
    color: green,
    padding: '6px 9px',
    textTransform: 'uppercase',
    letterSpacing: '0.11em',
    fontSize: 10,
    fontWeight: 900,
  },

  certificateCard: {
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.09)',
    background: cardBackground(),
    padding: 22,
  },

  certificateIcon: {
    width: 56,
    height: 56,
    borderRadius: 999,
    border: `1px solid ${rgbaGreen(0.26)}`,
    background: rgbaGreen(0.08),
    display: 'grid',
    placeItems: 'center',
    color: green,
    marginBottom: 16,
  },

  lessonsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 12,
  },

  lessonCard: {
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
    padding: 16,
    textDecoration: 'none',
    color: white,
  },

  lessonStatus: {
    display: 'inline-flex',
    marginBottom: 10,
    color: soft,
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    fontWeight: 900,
  },

  lessonStatusDone: {
    display: 'inline-flex',
    marginBottom: 10,
    color: green,
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    fontWeight: 900,
  },

  examGrid: {
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

  profileGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: 12,
  },

  profileStat: {
    borderRadius: 9,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(0,0,0,0.20)',
    padding: '10px 8px',
    minWidth: 0,
    display: 'grid',
    gap: 5,
    alignContent: 'center',
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

  emptyState: {
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.025)',
    padding: 18,
    color: muted,
  },
};
