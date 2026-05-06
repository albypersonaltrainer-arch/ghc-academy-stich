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
