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

const tabs: { id: Tab; label: string; helper: string; icon: IconName }[] = [
  { id: 'dashboard', label: 'Dashboard', helper: 'Resumen', icon: 'dashboard' },
  { id: 'cursos', label: 'My Courses', helper: 'Cursos activos', icon: 'courses' },
  { id: 'curriculum', label: 'Curriculum', helper: 'Módulos', icon: 'curriculum' },
  { id: 'examenes', label: 'Mock Exams', helper: 'Evaluación', icon: 'exam' },
  { id: 'certificados', label: 'Certification', helper: 'Credenciales', icon: 'certificate' },
  { id: 'perfil', label: 'Performance', helper: 'Perfil', icon: 'performance' },
];

const GREEN = '#63E546';

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

/* ------------------------------ HELPERS ------------------------------ */

function isVisibleCourse(course: AnyRecord) {
  const status = String(course.status || '').toLowerCase();
  if (!status) return true;
  return ['published', 'publicado', 'active', 'activo', 'preview', 'demo'].includes(status);
}

function buildModuleViews({
  courseCard,
  lessonProgress,
  moduleCompletions,
}: {
  courseCard: DashboardCard;
  lessonProgress: AnyRecord[];
  moduleCompletions: AnyRecord[];
}): ModuleView[] {
  return courseCard.courseModules.map((module, index) => {
    const moduleLessons = courseCard.courseLessons.filter(
      (lesson) => String(lesson.module_id) === String(module.id)
    );

    const completedLessons = moduleLessons.filter((lesson) =>
      lessonProgress.some((progress) => String(progress.lesson_id) === String(lesson.id))
    ).length;

    const isCompleted = moduleCompletions.some(
      (completion) => String(completion.module_id) === String(module.id)
    );

    const previousModule = courseCard.courseModules[index - 1];

    const isUnlocked =
      index === 0 ||
      isCompleted ||
      moduleCompletions.some(
        (completion) => String(completion.module_id) === String(previousModule?.id)
      );

    const isCurrent =
      Boolean(courseCard.nextLesson) &&
      String(courseCard.nextLesson?.module_id) === String(module.id);

    const nextLessonInsideModule = moduleLessons.find(
      (lesson) =>
        !lessonProgress.some((progress) => String(progress.lesson_id) === String(lesson.id))
    );

    const targetLesson = nextLessonInsideModule || moduleLessons[0];

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
      href:
        isUnlocked && targetLesson
          ? `/cursos/${getCourseSlug(courseCard.course)}/${targetLesson.id}`
          : `/cursos/${getCourseSlug(courseCard.course)}`,
    };
  });
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
