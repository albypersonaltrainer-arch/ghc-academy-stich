"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import GHCLogo from "../components/GHCLogo";

type AnyRecord = Record<string, any>;

type Course = {
  id: string;
  slug?: string | null;
  title?: string | null;
  name?: string | null;
  description?: string | null;
  short_description?: string | null;
  excerpt?: string | null;
  category?: string | null;
  level?: string | null;
  image_url?: string | null;
  cover_url?: string | null;
  thumbnail_url?: string | null;
  status?: string | null;
  visibility?: string | null;
  is_published?: boolean | null;
  published?: boolean | null;
  price?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type Module = {
  id: string;
  course_id?: string | null;
  title?: string | null;
  name?: string | null;
  description?: string | null;
  order?: number | null;
  order_index?: number | null;
  position?: number | null;
  module_order?: number | null;
  sort_order?: number | null;
  number?: number | null;
  is_locked?: boolean | null;
};

type Lesson = {
  id: string;
  course_id?: string | null;
  module_id?: string | null;
  title?: string | null;
  name?: string | null;
  description?: string | null;
  type?: string | null;
  lesson_type?: string | null;
  content_type?: string | null;
  order?: number | null;
  order_index?: number | null;
  position?: number | null;
  lesson_order?: number | null;
  sort_order?: number | null;
  duration?: string | number | null;
  video_url?: string | null;
  audio_url?: string | null;
  pdf_url?: string | null;
  text_content?: string | null;
};

type UserProgress = {
  id?: string;
  user_id?: string | null;
  course_id?: string | null;
  module_id?: string | null;
  lesson_id?: string | null;
  completed?: boolean | null;
  is_completed?: boolean | null;
  status?: string | null;
  progress?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type Certificate = {
  id: string;
  user_id?: string | null;
  course_id?: string | null;
  title?: string | null;
  course_title?: string | null;
  description?: string | null;
  status?: string | null;
  certificate_code?: string | null;
  code?: string | null;
  verification_code?: string | null;
  verification_url?: string | null;
  issued_at?: string | null;
  created_at?: string | null;
  final_score?: number | string | null;
  score?: number | string | null;
  grade?: string | null;
};

type ModuleView = Module & {
  titleSafe: string;
  lessons: Lesson[];
  completedLessons: number;
  totalLessons: number;
  progress: number;
  locked: boolean;
};

type CourseView = Course & {
  titleSafe: string;
  descriptionSafe: string;
  slugSafe: string;
  imageSafe: string;
  modules: ModuleView[];
  lessons: Lesson[];
  completedLessons: number;
  totalLessons: number;
  progress: number;
  nextLesson: Lesson | null;
  certificate: Certificate | null;
};

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "success" | "info" | "warning" | "certificate";
  read?: boolean;
};

type ActiveTab = "dashboard" | "courses" | "curriculum" | "exams" | "certificates";

type LoadingState = "idle" | "loading" | "ready" | "error";

const GREEN = "#63E546";
const GHC_GREEN = "#22D65B";
const BG = "#050706";
const CARD = "rgba(14, 18, 16, 0.82)";
const CARD_2 = "rgba(20, 26, 23, 0.92)";
const BORDER = "rgba(255, 255, 255, 0.10)";
const TEXT = "#F4F7F2";
const MUTED = "#A8B2AA";
const STEEL = "#7F8A84";

const DEFAULT_COURSE_BACKGROUNDS = [
  "radial-gradient(circle at 18% 18%, rgba(99,229,70,.34), transparent 30%), linear-gradient(135deg, #101611 0%, #222B24 48%, #070908 100%)",
  "radial-gradient(circle at 72% 20%, rgba(99,229,70,.28), transparent 28%), linear-gradient(135deg, #101316 0%, #1C2429 52%, #060808 100%)",
  "radial-gradient(circle at 24% 76%, rgba(99,229,70,.26), transparent 30%), linear-gradient(135deg, #13110F 0%, #29231B 52%, #070706 100%)",
  "radial-gradient(circle at 70% 70%, rgba(99,229,70,.24), transparent 32%), linear-gradient(135deg, #0F1512 0%, #23302B 48%, #050706 100%)",
];

function safeString(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text.length ? text : fallback;
}

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function formatDate(value?: string | null): string {
  if (!value) return "Pendiente";
  try {
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "Pendiente";
  }
}

function formatPercent(value: number): string {
  const safe = Math.max(0, Math.min(100, Math.round(value || 0)));
  return `${safe}%`;
}

function normalizeStatus(value?: string | null): string {
  return safeString(value, "").toLowerCase();
}

function isVisibleCourse(course: Course): boolean {
  const status = normalizeStatus(course.status);
  const visibility = normalizeStatus(course.visibility);
  if (course.is_published === false || course.published === false) return false;
  if (["draft", "archived", "hidden", "inactive", "deleted"].includes(status)) return false;
  if (["private", "hidden", "draft", "archived"].includes(visibility)) return false;
  return true;
}

function extractModuleNumber(module: Partial<Module>): number {
  const explicit = [module.order, module.order_index, module.position, module.module_order, module.sort_order, module.number]
    .map((v) => Number(v))
    .find((v) => Number.isFinite(v));
  if (explicit !== undefined) return explicit;
  const title = safeString(module.title || module.name, "");
  const match = title.match(/(?:m[oó]dulo|module|unidad|bloque)?\s*#?\s*(\d+)/i);
  return match ? Number(match[1]) : 9999;
}

function extractLessonNumber(lesson: Partial<Lesson>): number {
  const explicit = [lesson.order, lesson.order_index, lesson.position, lesson.lesson_order, lesson.sort_order]
    .map((v) => Number(v))
    .find((v) => Number.isFinite(v));
  if (explicit !== undefined) return explicit;
  const title = safeString(lesson.title || lesson.name, "");
  const match = title.match(/(?:lecci[oó]n|lesson|clase)?\s*#?\s*(\d+)/i);
  return match ? Number(match[1]) : 9999;
}

function getOrder(item: Partial<Module & Lesson>, fallback = 9999): number {
  const values = [item.order, item.order_index, item.position, item.sort_order, (item as AnyRecord).module_order, (item as AnyRecord).lesson_order, (item as AnyRecord).number];
  const found = values.map((v) => Number(v)).find((v) => Number.isFinite(v));
  return found === undefined ? fallback : found;
}

function sortModules(modules: Module[]): Module[] {
  return [...modules].sort((a, b) => {
    const byNumber = extractModuleNumber(a) - extractModuleNumber(b);
    if (byNumber !== 0) return byNumber;
    return safeString(a.title || a.name).localeCompare(safeString(b.title || b.name), "es");
  });
}

function sortLessons(lessons: Lesson[]): Lesson[] {
  return [...lessons].sort((a, b) => {
    const byNumber = extractLessonNumber(a) - extractLessonNumber(b);
    if (byNumber !== 0) return byNumber;
    return safeString(a.title || a.name).localeCompare(safeString(b.title || b.name), "es");
  });
}

function getCourseSlug(course: Course): string {
  const direct = safeString(course.slug, "");
  if (direct) return direct;
  const title = safeString(course.title || course.name, "curso");
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || safeString(course.id, "curso");
}

function getCourseImage(course: Course): string {
  return safeString(course.image_url || course.cover_url || course.thumbnail_url, "");
}

function getPremiumCourseBackground(course: Course, index = 0): string {
  const image = getCourseImage(course);
  if (image) return `linear-gradient(135deg, rgba(5,7,6,.78), rgba(5,7,6,.42)), url(${image})`;
  return DEFAULT_COURSE_BACKGROUNDS[index % DEFAULT_COURSE_BACKGROUNDS.length];
}

function getLessonType(lesson: Lesson): string {
  const raw = safeString(lesson.lesson_type || lesson.content_type || lesson.type, "texto").toLowerCase();
  if (raw.includes("video") || lesson.video_url) return "video";
  if (raw.includes("audio") || lesson.audio_url) return "audio";
  if (raw.includes("pdf") || lesson.pdf_url) return "pdf";
  if (raw.includes("mix") || raw.includes("multi")) return "mixto";
  return "texto";
}

function getLessonIcon(lesson: Lesson): string {
  const type = getLessonType(lesson);
  if (type === "video") return "▶";
  if (type === "audio") return "♪";
  if (type === "pdf") return "PDF";
  if (type === "mixto") return "◆";
  return "TXT";
}

function isProgressCompleted(progress: UserProgress): boolean {
  const status = normalizeStatus(progress.status);
  return progress.completed === true || progress.is_completed === true || ["completed", "complete", "done", "finished", "aprobado", "finalizado"].includes(status);
}

function buildModuleViews(modules: Module[], lessons: Lesson[], progress: UserProgress[]): ModuleView[] {
  const completedLessonIds = new Set(progress.filter(isProgressCompleted).map((item) => safeString(item.lesson_id)).filter(Boolean));

  return sortModules(modules).map((module) => {
    const moduleLessons = sortLessons(lessons.filter((lesson) => safeString(lesson.module_id) === safeString(module.id)));
    const completedLessons = moduleLessons.filter((lesson) => completedLessonIds.has(safeString(lesson.id))).length;
    const totalLessons = moduleLessons.length;
    const moduleProgress = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return {
      ...module,
      titleSafe: safeString(module.title || module.name, "Módulo sin título"),
      lessons: moduleLessons,
      completedLessons,
      totalLessons,
      progress: moduleProgress,
      locked: Boolean(module.is_locked),
    };
  });
}

function findNextLesson(modules: ModuleView[], progress: UserProgress[]): Lesson | null {
  const completedLessonIds = new Set(progress.filter(isProgressCompleted).map((item) => safeString(item.lesson_id)).filter(Boolean));
  for (const module of modules) {
    for (const lesson of module.lessons) {
      if (!completedLessonIds.has(safeString(lesson.id))) return lesson;
    }
  }
  return modules[0]?.lessons[0] || null;
}

function getCertificateCode(certificate: Certificate | null): string {
  if (!certificate) return "GHC-PENDIENTE";
  return safeString(certificate.certificate_code || certificate.verification_code || certificate.code, `GHC-${safeString(certificate.id).slice(0, 8).toUpperCase()}`);
}

function courseTitle(course: Course | null | undefined): string {
  return safeString(course?.title || course?.name, "Curso GHC Academy");
}

function courseDescription(course: Course | null | undefined): string {
  return safeString(course?.short_description || course?.description || course?.excerpt, "Formación avanzada con enfoque científico, práctico y profesional.");
}

function scoreText(certificate: Certificate | null): string {
  if (!certificate) return "Pendiente de evaluación final";
  const value = certificate.final_score ?? certificate.score ?? certificate.grade;
  if (value === null || value === undefined || value === "") return "Aprobado por GHC Academy";
  if (typeof value === "number") return `Nota final: ${Math.round(value)}%`;
  return `Resultado: ${String(value)}`;
}

function buildCourseViews(courses: Course[], modules: Module[], lessons: Lesson[], progress: UserProgress[], certificates: Certificate[]): CourseView[] {
  return courses.filter(isVisibleCourse).map((course, index) => {
    const courseId = safeString(course.id);
    const courseModules = modules.filter((module) => safeString(module.course_id) === courseId);
    const moduleViews = buildModuleViews(courseModules, lessons, progress);
    const courseLessons = moduleViews.flatMap((module) => module.lessons);
    const completedIds = new Set(progress.filter(isProgressCompleted).map((item) => safeString(item.lesson_id)).filter(Boolean));
    const completedLessons = courseLessons.filter((lesson) => completedIds.has(safeString(lesson.id))).length;
    const totalLessons = courseLessons.length;
    const progressValue = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const certificate = certificates.find((item) => safeString(item.course_id) === courseId) || null;

    return {
      ...course,
      titleSafe: courseTitle(course),
      descriptionSafe: courseDescription(course),
      slugSafe: getCourseSlug(course),
      imageSafe: getCourseImage(course) || getPremiumCourseBackground(course, index),
      modules: moduleViews,
      lessons: courseLessons,
      completedLessons,
      totalLessons,
      progress: progressValue,
      nextLesson: findNextLesson(moduleViews, progress),
      certificate,
    };
  });
}

const initialNotifications: NotificationItem[] = [
  {
    id: "cert-ready",
    title: "Certificación preparada",
    message: "Cuando completes un curso, tu credencial aparecerá aquí con verificación pública.",
    time: "Ahora",
    type: "certificate",
    read: false,
  },
  {
    id: "progress",
    title: "Progreso sincronizado",
    message: "Tus módulos, exámenes y certificados se actualizan con Supabase.",
    time: "Sistema",
    type: "success",
    read: true,
  },
];

export default function AlumnoPage() {
  const router = useRouter();
  const [status, setStatus] = useState<LoadingState>("loading");
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [user, setUser] = useState<any>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("todos");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const loadDashboard = useCallback(async () => {
    setStatus("loading");
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData?.user) {
      router.replace("/login");
      return;
    }

    const currentUser = authData.user;
    setUser(currentUser);

    try {
      const [{ data: coursesData }, { data: certificatesData }, { data: progressData }] = await Promise.all([
        supabase.from("courses").select("*").order("created_at", { ascending: false }),
        supabase.from("certificates").select("*").eq("user_id", currentUser.id).order("created_at", { ascending: false }),
        supabase.from("user_progress").select("*").eq("user_id", currentUser.id),
      ]);

      const safeCourses = asArray<Course>(coursesData as Course[]);
      const safeCertificates = asArray<Certificate>(certificatesData as Certificate[]);
      const safeProgress = asArray<UserProgress>(progressData as UserProgress[]);
      const courseIds = safeCourses.map((course) => course.id).filter(Boolean);

      let safeModules: Module[] = [];
      if (courseIds.length) {
        const { data: modulesData } = await supabase.from("modules").select("*").in("course_id", courseIds);
        safeModules = asArray<Module>(modulesData as Module[]);
      }

      const moduleIds = safeModules.map((module) => module.id).filter(Boolean);
      let safeLessons: Lesson[] = [];
      if (moduleIds.length) {
        const { data: lessonsData } = await supabase.from("lessons").select("*").in("module_id", moduleIds);
        safeLessons = asArray<Lesson>(lessonsData as Lesson[]);
      }

      setCourses(safeCourses);
      setModules(safeModules);
      setLessons(safeLessons);
      setProgress(safeProgress);
      setCertificates(safeCertificates);
      setStatus("ready");
    } catch (error) {
      console.error("Error cargando dashboard alumno:", error);
      setStatus("error");
    }
  }, [router]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const courseViews = useMemo(() => buildCourseViews(courses, modules, lessons, progress, certificates), [courses, modules, lessons, progress, certificates]);

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase();
    return courseViews.filter((course) => {
      const matchesQuery = !query || [course.titleSafe, course.descriptionSafe, course.category, course.level].some((value) => safeString(value).toLowerCase().includes(query));
      const matchesLevel = levelFilter === "todos" || safeString(course.level, "").toLowerCase() === levelFilter;
      return matchesQuery && matchesLevel;
    });
  }, [courseViews, search, levelFilter]);

  const stats = useMemo(() => {
    const issued = certificates.length;
    const inProgress = courseViews.filter((course) => !course.certificate && course.progress > 0 && course.progress < 100).length;
    const blocked = Math.max(courseViews.length - issued - inProgress, 0);
    const totalLessons = courseViews.reduce((sum, course) => sum + course.totalLessons, 0);
    const completedLessons = courseViews.reduce((sum, course) => sum + course.completedLessons, 0);
    const overallProgress = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
    return { issued, inProgress, blocked, totalLessons, completedLessons, overallProgress };
  }, [certificates, courseViews]);

  const primaryCertificateCourse = useMemo(() => {
    const withCert = courseViews.find((course) => course.certificate);
    if (withCert) return withCert;
    const mostAdvanced = [...courseViews].sort((a, b) => b.progress - a.progress)[0];
    return mostAdvanced || null;
  }, [courseViews]);

  const pendingCertificateCourse = useMemo(() => {
    return courseViews.find((course) => !course.certificate && course.id !== primaryCertificateCourse?.id) || courseViews.find((course) => !course.certificate) || null;
  }, [courseViews, primaryCertificateCourse]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  function markNotificationsRead() {
    setNotifications((items) => items.map((item) => ({ ...item, read: true })));
    setNotificationOpen((value) => !value);
  }

  if (status === "loading") {
    return (
      <main className="ghc-shell loading-shell">
        <GlobalStyles />
        <div className="loading-card">
          <div className="loading-logo"><GHCLogo /></div>
          <div className="loading-pulse" />
          <p>Cargando tu plataforma GHC Academy...</p>
        </div>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="ghc-shell loading-shell">
        <GlobalStyles />
        <div className="loading-card error-card">
          <div className="loading-logo"><GHCLogo /></div>
          <h1>No se pudo cargar el dashboard</h1>
          <p>La conexión con Supabase respondió con un error. Revisa variables de entorno y tablas.</p>
          <button className="primary-btn" onClick={loadDashboard}>Reintentar</button>
        </div>
      </main>
    );
  }

  return (
    <main className="ghc-shell">
      <GlobalStyles />
      <aside className="sidebar">
        <div className="brand-block">
          <GHCLogo />
          <div>
            <strong>GHC Academy</strong>
            <span>Sport Through Science</span>
          </div>
        </div>

        <nav className="side-nav" aria-label="Navegación alumno">
          <SideButton active={activeTab === "dashboard"} icon="⌂" label="Dashboard" onClick={() => setActiveTab("dashboard")} />
          <SideButton active={activeTab === "courses"} icon="▦" label="Mis cursos" onClick={() => setActiveTab("courses")} />
          <SideButton active={activeTab === "curriculum"} icon="◎" label="Itinerario" onClick={() => setActiveTab("curriculum")} />
          <SideButton active={activeTab === "exams"} icon="✦" label="Simulador" onClick={() => setActiveTab("exams")} />
          <SideButton active={activeTab === "certificates"} icon="◈" label="Certificados" onClick={() => setActiveTab("certificates")} />
        </nav>

        <div className="sidebar-progress">
          <div className="mini-ring" style={{ ["--value" as any]: `${stats.overallProgress * 3.6}deg` }}>
            <span>{stats.overallProgress}%</span>
          </div>
          <div>
            <strong>Progreso global</strong>
            <p>{stats.completedLessons} de {stats.totalLessons} lecciones completadas</p>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <div className="breadcrumb">Alumno / {tabLabel(activeTab)}</div>
            <h1>{topTitle(activeTab)}</h1>
          </div>

          <div className="top-actions">
            <div className="notification-wrap">
              <button className="icon-btn" onClick={markNotificationsRead} aria-label="Abrir notificaciones">
                <span>⌁</span>
                {notifications.some((item) => !item.read) && <i />}
              </button>
              {notificationOpen && <NotificationDropdown notifications={notifications} />}
            </div>
            <div className="user-pill">
              <span>{safeString(user?.email, "Alumno GHC").slice(0, 1).toUpperCase()}</span>
              <div>
                <strong>{safeString(user?.user_metadata?.full_name || user?.email, "Alumno GHC")}</strong>
                <small>Perfil activo</small>
              </div>
            </div>
            <button className="ghost-btn" onClick={handleLogout}>Salir</button>
          </div>
        </header>

        {activeTab === "dashboard" && <DashboardTab courses={courseViews} stats={stats} setActiveTab={setActiveTab} />}
        {activeTab === "courses" && (
          <CoursesTab
            courses={filteredCourses}
            search={search}
            setSearch={setSearch}
            levelFilter={levelFilter}
            setLevelFilter={setLevelFilter}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />
        )}
        {activeTab === "curriculum" && <CurriculumTab courses={courseViews} />}
        {activeTab === "exams" && <ExamsTab courses={courseViews} />}
        {activeTab === "certificates" && (
          <CertificatesTab
            primaryCourse={primaryCertificateCourse}
            pendingCourse={pendingCertificateCourse}
            courseViews={courseViews}
            stats={stats}
          />
        )}
      </section>
    </main>
  );
}

function tabLabel(tab: ActiveTab): string {
  const labels: Record<ActiveTab, string> = {
    dashboard: "Dashboard",
    courses: "Mis cursos",
    curriculum: "Itinerario",
    exams: "Simulador de exámenes",
    certificates: "Certificados",
  };
  return labels[tab];
}

function topTitle(tab: ActiveTab): string {
  if (tab === "certificates") return "Certificados";
  if (tab === "courses") return "Mis cursos";
  if (tab === "curriculum") return "Itinerario de aprendizaje";
  if (tab === "exams") return "Simulador de exámenes";
  return "Panel de alumno";
}

function SideButton({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) {
  return (
    <button className={`side-button ${active ? "active" : ""}`} onClick={onClick}>
      <span>{icon}</span>
      {label}
    </button>
  );
}

function NotificationDropdown({ notifications }: { notifications: NotificationItem[] }) {
  return (
    <div className="notification-dropdown">
      <div className="dropdown-head">
        <strong>Notificaciones</strong>
        <span>{notifications.length}</span>
      </div>
      {notifications.map((item) => (
        <article key={item.id} className={`notification-item ${item.read ? "" : "unread"}`}>
          <div className="notification-dot">{item.type === "certificate" ? "◈" : "•"}</div>
          <div>
            <strong>{item.title}</strong>
            <p>{item.message}</p>
            <small>{item.time}</small>
          </div>
        </article>
      ))}
    </div>
  );
}

function DashboardTab({ courses, stats, setActiveTab }: { courses: CourseView[]; stats: ReturnType<typeof buildStatsShape>; setActiveTab: (tab: ActiveTab) => void }) {
  const featured = courses[0] || null;
  return (
    <section className="tab-stack">
      <div className="dashboard-hero soft-card">
        <div>
          <span className="eyebrow">GHC Academy</span>
          <h2>Tu centro de alto rendimiento académico</h2>
          <p>Continúa tus formaciones, revisa tu avance y prepara tus certificaciones oficiales desde una experiencia premium y conectada a Supabase.</p>
          <div className="hero-actions">
            <button className="primary-btn" onClick={() => setActiveTab("courses")}>Continuar aprendizaje</button>
            <button className="secondary-btn" onClick={() => setActiveTab("certificates")}>Ver certificados</button>
          </div>
        </div>
        <div className="dashboard-metric">
          <strong>{stats.overallProgress}%</strong>
          <span>Progreso global</span>
          <div className="progress-line"><i style={{ width: `${stats.overallProgress}%` }} /></div>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard label="Cursos activos" value={courses.length} hint="Formaciones disponibles" />
        <StatCard label="Lecciones completadas" value={stats.completedLessons} hint={`de ${stats.totalLessons} totales`} />
        <StatCard label="Certificados" value={stats.issued} hint="Credenciales emitidas" />
        <StatCard label="En progreso" value={stats.inProgress} hint="Certificaciones abiertas" />
      </div>

      {featured && (
        <article className="featured-course soft-card">
          <div className="course-cover" style={{ background: getPremiumCourseBackground(featured, 0) }} />
          <div>
            <span className="eyebrow">Siguiente paso recomendado</span>
            <h3>{featured.titleSafe}</h3>
            <p>{featured.descriptionSafe}</p>
            <div className="progress-line"><i style={{ width: `${featured.progress}%` }} /></div>
          </div>
        </article>
      )}
    </section>
  );
}

function buildStatsShape() {
  return { issued: 0, inProgress: 0, blocked: 0, totalLessons: 0, completedLessons: 0, overallProgress: 0 };
}

function StatCard({ label, value, hint }: { label: string; value: number | string; hint: string }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{hint}</p>
    </article>
  );
}

function CoursesTab({ courses, search, setSearch, levelFilter, setLevelFilter, viewMode, setViewMode }: {
  courses: CourseView[];
  search: string;
  setSearch: (value: string) => void;
  levelFilter: string;
  setLevelFilter: (value: string) => void;
  viewMode: "grid" | "list";
  setViewMode: (value: "grid" | "list") => void;
}) {
  return (
    <section className="tab-stack">
      <div className="section-head">
        <div>
          <span className="eyebrow">Mis cursos</span>
          <h2>Formación activa</h2>
          <p>Busca, filtra y continúa los cursos conectados a Supabase.</p>
        </div>
        <div className="course-controls">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar curso..." />
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
            <option value="todos">Todos los niveles</option>
            <option value="principiante">Principiante</option>
            <option value="medio">Medio</option>
            <option value="intermedio">Intermedio</option>
            <option value="avanzado">Avanzado</option>
          </select>
          <button className="toggle-btn" onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}>{viewMode === "grid" ? "Vista lista" : "Vista grid"}</button>
        </div>
      </div>

      <div className={viewMode === "grid" ? "course-grid" : "course-list"}>
        {courses.map((course, index) => <CourseCard key={course.id} course={course} index={index} list={viewMode === "list"} />)}
      </div>

      {!courses.length && <EmptyState title="No hay cursos visibles" text="Cuando haya cursos publicados en Supabase aparecerán aquí automáticamente." />}
    </section>
  );
}

function CourseCard({ course, index, list = false }: { course: CourseView; index: number; list?: boolean }) {
  return (
    <article className={`course-card ${list ? "list" : ""}`}>
      <div className="course-cover" style={{ background: getPremiumCourseBackground(course, index) }}>
        <span>{safeString(course.level, "GHC")}</span>
      </div>
      <div className="course-body">
        <h3>{course.titleSafe}</h3>
        <p>{course.descriptionSafe}</p>
        <div className="course-meta">
          <span>{course.modules.length} módulos</span>
          <span>{course.totalLessons} lecciones</span>
          <span>{formatPercent(course.progress)}</span>
        </div>
        <div className="progress-line"><i style={{ width: `${course.progress}%` }} /></div>
        <Link className="course-link" href={`/cursos/${course.slugSafe}`}>Abrir curso</Link>
      </div>
    </article>
  );
}

function CurriculumTab({ courses }: { courses: CourseView[] }) {
  return (
    <section className="tab-stack">
      <div className="section-head">
        <div>
          <span className="eyebrow">Itinerario</span>
          <h2>Ruta de aprendizaje</h2>
          <p>Visualiza módulos, lecciones desbloqueadas y próximos pasos.</p>
        </div>
      </div>
      <div className="timeline-panel">
        {courses.map((course) => (
          <article key={course.id} className="timeline-course">
            <header>
              <div>
                <h3>{course.titleSafe}</h3>
                <p>{course.completedLessons}/{course.totalLessons} lecciones completadas</p>
              </div>
              <strong>{formatPercent(course.progress)}</strong>
            </header>
            <div className="timeline-modules">
              {course.modules.map((module) => (
                <div key={module.id} className="timeline-module">
                  <span className={module.progress === 100 ? "done" : ""}>{module.progress === 100 ? "✓" : extractModuleNumber(module)}</span>
                  <div>
                    <strong>{module.titleSafe}</strong>
                    <p>{module.completedLessons}/{module.totalLessons} lecciones · {formatPercent(module.progress)}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
      {!courses.length && <EmptyState title="Itinerario pendiente" text="Publica cursos, módulos y lecciones para construir la ruta automáticamente." />}
    </section>
  );
}

function ExamsTab({ courses }: { courses: CourseView[] }) {
  const ready = courses.filter((course) => course.progress >= 80);
  const locked = courses.filter((course) => course.progress < 80);
  return (
    <section className="tab-stack">
      <div className="exam-hero soft-card">
        <span className="eyebrow">Simulador GHC</span>
        <h2>Prepara tus exámenes finales con criterio profesional</h2>
        <p>Los exámenes se desbloquean con el avance real de módulos y lecciones. Esta zona está preparada para conectar bancos de preguntas desde Supabase.</p>
      </div>
      <div className="exam-grid">
        {[...ready, ...locked].map((course) => (
          <article key={course.id} className="exam-card">
            <span className={course.progress >= 80 ? "badge success" : "badge locked"}>{course.progress >= 80 ? "Disponible" : "Bloqueado"}</span>
            <h3>{course.titleSafe}</h3>
            <p>{course.progress >= 80 ? "Puedes preparar el examen final." : "Completa más módulos para desbloquear el simulador."}</p>
            <div className="progress-line"><i style={{ width: `${course.progress}%` }} /></div>
          </article>
        ))}
      </div>
      {!courses.length && <EmptyState title="Sin exámenes disponibles" text="Cuando haya cursos activos aparecerán sus simuladores aquí." />}
    </section>
  );
}

function CertificatesTab({ primaryCourse, pendingCourse, courseViews, stats }: {
  primaryCourse: CourseView | null;
  pendingCourse: CourseView | null;
  courseViews: CourseView[];
  stats: { issued: number; inProgress: number; blocked: number; totalLessons: number; completedLessons: number; overallProgress: number };
}) {
  const hasIssued = Boolean(primaryCourse?.certificate);
  const issuedCertificate = primaryCourse?.certificate || null;
  const ringValue = Math.max(8, Math.min(100, stats.issued ? Math.round((stats.issued / Math.max(courseViews.length, 1)) * 100) : stats.overallProgress));

  return (
    <section className="cert-page">
      <div className="cert-heading">
        <div>
          <div className="breadcrumb local">Alumno / Credenciales / Certificados</div>
          <span className="eyebrow">Certificación oficial</span>
          <h2>Certificados</h2>
          <p>Obtén credenciales oficiales de GHC Academy y demuestra tu experiencia.</p>
        </div>
      </div>

      <section className="cert-hero">
        <div className="cert-hero-copy">
          <span className="cert-kicker">Credenciales oficiales</span>
          <h3>Valida. Demuestra. Avanza.</h3>
          <p>
            Tus certificados GHC Academy validan conocimientos reales, fortalecen tu perfil profesional y permiten compartir una prueba clara de tus competencias dentro del ecosistema deportivo y científico.
          </p>
          <div className="benefit-grid">
            <Benefit icon="✓" title="Confiable por profesionales" text="Diseñado para reflejar progreso, evaluación y dominio práctico." />
            <Benefit icon="◈" title="Credenciales verificables" text="Cada certificado puede asociarse a un código único de validación." />
            <Benefit icon="✦" title="Reconocido en la industria" text="Una presentación seria para alumnos, entrenadores y perfiles técnicos." />
          </div>
        </div>
        <div className="certificate-art-wrap" aria-hidden="true">
          <div className="hero-orbit one" />
          <div className="hero-orbit two" />
          <div className="paper-certificate">
            <div className="paper-topline" />
            <div className="paper-logo">GHC</div>
            <span className="paper-small">ACADEMY OFFICIAL CREDENTIAL</span>
            <h4>CERTIFICADO</h4>
            <strong>DE LOGRO</strong>
            <p>Se certifica que</p>
            <h5>{hasIssued ? safeString(userNameFromCourse(primaryCourse), "John Doe") : "John Doe"}</h5>
            <p>ha completado satisfactoriamente la formación profesional</p>
            <div className="paper-course">{primaryCourse?.titleSafe || "Sport Through Science"}</div>
            <div className="paper-bottom">
              <div>
                <span>Firma</span>
                <b>GHC Academy</b>
              </div>
              <div className="gold-seal"><i>GHC</i></div>
              <div>
                <span>Código</span>
                <b>{getCertificateCode(issuedCertificate)}</b>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cert-layout">
        <div className="cert-main-column">
          <PanelHeader title="Certificados disponibles" text="Tus credenciales emitidas y las próximas certificaciones que puedes desbloquear." />

          {primaryCourse ? (
            <IssuedCertificateCard course={primaryCourse} certificate={issuedCertificate} />
          ) : (
            <PremiumEmptyCertificate />
          )}

          <LockedCertificateCard course={pendingCourse} fallbackProgress={stats.overallProgress} />

          <button className="all-certificates-row">
            <span>Ver todos los certificados</span>
            <i>→</i>
          </button>
        </div>

        <aside className="cert-side-column">
          <HowItWorksPanel />
          <VerificationPanel />
          <CredentialStatusPanel stats={stats} ringValue={ringValue} />
        </aside>
      </section>
    </section>
  );
}

function userNameFromCourse(_course: CourseView | null): string {
  return "Alumno GHC";
}

function Benefit({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <article className="benefit-card">
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </article>
  );
}

function PanelHeader({ title, text }: { title: string; text: string }) {
  return (
    <header className="panel-header">
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </header>
  );
}

function IssuedCertificateCard({ course, certificate }: { course: CourseView; certificate: Certificate | null }) {
  const issued = Boolean(certificate);
  return (
    <article className={`cert-card issued ${issued ? "" : "soft-empty"}`}>
      <div className="cert-thumbnail issued-thumb">
        <div className="thumb-inner">
          <span>GHC</span>
          <strong>CERTIFICADO</strong>
          <i>{issued ? "Emitido" : "Preparado"}</i>
        </div>
      </div>
      <div className="cert-card-content">
        <div className="cert-row-top">
          <span className={`badge ${issued ? "success" : "progress"}`}>{issued ? "Emitido" : "En progreso"}</span>
          <small>{formatDate(certificate?.issued_at || certificate?.created_at)}</small>
        </div>
        <h4>{issued ? (certificate?.course_title || certificate?.title || course.titleSafe) : course.titleSafe}</h4>
        <p>{certificate?.description || course.descriptionSafe}</p>
        <div className="cert-details-grid">
          <div><span>Nota</span><strong>{scoreText(certificate)}</strong></div>
          <div><span>Fecha</span><strong>{formatDate(certificate?.issued_at || certificate?.created_at)}</strong></div>
          <div><span>ID / Código</span><strong>{getCertificateCode(certificate)}</strong></div>
        </div>
        {issued ? (
          certificate?.verification_url ? (
            <Link className="primary-btn as-link" href={certificate.verification_url} target="_blank" rel="noreferrer">Ver certificado</Link>
          ) : (
            <button className="primary-btn">Ver certificado</button>
          )
        ) : (
          <button className="primary-btn disabled" disabled>Completa el curso para emitirlo</button>
        )}
      </div>
    </article>
  );
}

function LockedCertificateCard({ course, fallbackProgress }: { course: CourseView | null; fallbackProgress: number }) {
  const progressValue = course?.progress ?? fallbackProgress;
  return (
    <article className="cert-card locked-card">
      <div className="cert-thumbnail locked-thumb">
        <div className="lock-symbol">⌁</div>
        <strong>GHC</strong>
      </div>
      <div className="cert-card-content">
        <div className="cert-row-top">
          <span className="badge locked">Bloqueado</span>
          <small>{formatPercent(progressValue)} completado</small>
        </div>
        <h4>{course?.titleSafe || "Próxima certificación"}</h4>
        <p>{course ? "Sigue avanzando en módulos, lecciones y examen final para desbloquear esta credencial." : "Publica cursos y módulos para activar la siguiente certificación dentro del panel del alumno."}</p>
        <div className="progress-line xl"><i style={{ width: `${Math.max(0, Math.min(100, progressValue))}%` }} /></div>
        <div className="locked-meta">
          <span>Requisito</span>
          <strong>Completar módulos + aprobar examen final</strong>
        </div>
      </div>
    </article>
  );
}

function PremiumEmptyCertificate() {
  return (
    <article className="cert-card issued soft-empty">
      <div className="cert-thumbnail issued-thumb empty-thumb">
        <div className="thumb-inner">
          <span>GHC</span>
          <strong>CERTIFICADO</strong>
          <i>Pendiente</i>
        </div>
      </div>
      <div className="cert-card-content">
        <div className="cert-row-top">
          <span className="badge progress">Estado vacío premium</span>
          <small>Sin emisión todavía</small>
        </div>
        <h4>Aún no tienes certificados emitidos</h4>
        <p>Cuando completes un curso y apruebes su examen final, tu certificado oficial aparecerá aquí con fecha, código y verificación.</p>
        <div className="cert-details-grid">
          <div><span>Nota</span><strong>Pendiente</strong></div>
          <div><span>Fecha</span><strong>Pendiente</strong></div>
          <div><span>ID / Código</span><strong>GHC-PENDIENTE</strong></div>
        </div>
        <button className="primary-btn disabled" disabled>Sin certificado emitido</button>
      </div>
    </article>
  );
}

function HowItWorksPanel() {
  const steps = [
    ["01", "Completa módulos", "Avanza por el contenido y marca progreso real."],
    ["02", "Aprueba examen final", "Valida conocimientos con evaluación del curso."],
    ["03", "Recibe certificado", "La credencial se registra en Supabase."],
    ["04", "Verifica y comparte", "Usa el código para demostrar autenticidad."],
  ];
  return (
    <article className="side-panel how-panel">
      <h3>Cómo funciona</h3>
      <div className="steps-list">
        {steps.map(([num, title, text]) => (
          <div key={num} className="step-item">
            <span>{num}</span>
            <div>
              <strong>{title}</strong>
              <p>{text}</p>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function VerificationPanel() {
  return (
    <article className="side-panel verification-panel">
      <div className="shield-icon">🛡</div>
      <h3>Verificación</h3>
      <p>Cada certificado puede incorporar código único, fecha de emisión y validación pública para reforzar seguridad y trazabilidad profesional.</p>
      <div className="verify-strip">
        <span>Estado</span>
        <strong>Seguro y verificable</strong>
      </div>
    </article>
  );
}

function CredentialStatusPanel({ stats, ringValue }: { stats: { issued: number; inProgress: number; blocked: number }; ringValue: number }) {
  return (
    <article className="side-panel credential-panel">
      <h3>Estado de credenciales</h3>
      <div className="credential-ring" style={{ ["--value" as any]: `${ringValue * 3.6}deg` }}>
        <span>{ringValue}%</span>
      </div>
      <div className="credential-stats">
        <div><span>Emitidos</span><strong>{stats.issued}</strong></div>
        <div><span>En progreso</span><strong>{stats.inProgress}</strong></div>
        <div><span>Bloqueados</span><strong>{stats.blocked}</strong></div>
      </div>
    </article>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <span>◌</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function GlobalStyles() {
  return (
    <style jsx global>{`
      :root {
        --green: ${GREEN};
        --ghc-green: ${GHC_GREEN};
        --bg: ${BG};
        --card: ${CARD};
        --card-2: ${CARD_2};
        --border: ${BORDER};
        --text: ${TEXT};
        --muted: ${MUTED};
        --steel: ${STEEL};
      }

      * { box-sizing: border-box; }
      html, body { margin: 0; min-height: 100%; background: var(--bg); color: var(--text); }
      body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      a { color: inherit; text-decoration: none; }
      button, input, select { font: inherit; }

      .ghc-shell {
        min-height: 100vh;
        display: grid;
        grid-template-columns: 286px minmax(0, 1fr);
        background:
          radial-gradient(circle at 18% 3%, rgba(99,229,70,.14), transparent 25%),
          radial-gradient(circle at 88% 12%, rgba(99,229,70,.08), transparent 22%),
          linear-gradient(135deg, #030504 0%, #080C0A 38%, #0D1210 100%);
        overflow-x: hidden;
      }

      .loading-shell { display: flex; align-items: center; justify-content: center; padding: 24px; }
      .loading-card {
        width: min(460px, 100%);
        padding: 36px;
        border: 1px solid var(--border);
        border-radius: 34px;
        background: rgba(12, 16, 14, .86);
        box-shadow: 0 30px 100px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.06);
        text-align: center;
      }
      .loading-logo { width: 150px; margin: 0 auto 22px; }
      .loading-pulse { width: 60px; height: 60px; margin: 0 auto 18px; border-radius: 50%; background: conic-gradient(from 180deg, var(--green), transparent 70%); animation: spin 1.2s linear infinite; }
      .loading-card p { color: var(--muted); margin: 0; }
      .error-card h1 { margin: 0 0 10px; font-size: 26px; }
      @keyframes spin { to { transform: rotate(360deg); } }

      .sidebar {
        position: sticky;
        top: 0;
        height: 100vh;
        padding: 24px 18px;
        border-right: 1px solid rgba(255,255,255,.08);
        background: linear-gradient(180deg, rgba(10,14,12,.94), rgba(6,8,7,.92));
        backdrop-filter: blur(24px);
        display: flex;
        flex-direction: column;
        gap: 28px;
      }
      .brand-block { display: flex; align-items: center; gap: 14px; padding: 12px; border: 1px solid rgba(255,255,255,.08); border-radius: 22px; background: rgba(255,255,255,.035); }
      .brand-block > :first-child { width: 58px; flex: 0 0 58px; }
      .brand-block strong { display: block; font-size: 15px; letter-spacing: .02em; }
      .brand-block span { display: block; margin-top: 3px; color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: .16em; }

      .side-nav { display: grid; gap: 8px; }
      .side-button {
        width: 100%;
        border: 1px solid transparent;
        background: transparent;
        color: #CBD4CD;
        padding: 13px 14px;
        border-radius: 17px;
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        text-align: left;
        transition: .22s ease;
      }
      .side-button span { width: 28px; height: 28px; display: grid; place-items: center; border-radius: 10px; background: rgba(255,255,255,.055); color: var(--green); }
      .side-button:hover, .side-button.active { border-color: rgba(99,229,70,.32); background: linear-gradient(135deg, rgba(99,229,70,.16), rgba(255,255,255,.04)); color: #fff; box-shadow: 0 16px 45px rgba(0,0,0,.22); }

      .sidebar-progress { margin-top: auto; padding: 16px; border-radius: 24px; background: rgba(255,255,255,.045); border: 1px solid rgba(255,255,255,.08); display: flex; gap: 13px; align-items: center; }
      .sidebar-progress strong { display: block; font-size: 13px; }
      .sidebar-progress p { margin: 3px 0 0; color: var(--muted); font-size: 12px; line-height: 1.35; }
      .mini-ring { --value: 0deg; width: 56px; height: 56px; border-radius: 50%; flex: 0 0 56px; display: grid; place-items: center; background: conic-gradient(var(--green) var(--value), rgba(255,255,255,.08) 0); position: relative; }
      .mini-ring::after { content: ""; position: absolute; inset: 7px; border-radius: 50%; background: #0A0E0C; }
      .mini-ring span { position: relative; z-index: 1; font-size: 12px; font-weight: 800; }

      .workspace { min-width: 0; padding: 24px 30px 54px; }
      .topbar { min-height: 76px; display: flex; justify-content: space-between; align-items: center; gap: 24px; margin-bottom: 24px; }
      .breadcrumb { color: var(--steel); font-size: 13px; margin-bottom: 6px; }
      .breadcrumb.local { margin-bottom: 10px; color: rgba(168,178,170,.86); }
      .topbar h1 { margin: 0; font-size: clamp(26px, 3vw, 42px); letter-spacing: -.04em; }
      .top-actions { display: flex; align-items: center; gap: 12px; }
      .notification-wrap { position: relative; }
      .icon-btn { width: 46px; height: 46px; border-radius: 16px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.045); color: #fff; cursor: pointer; position: relative; }
      .icon-btn span { font-size: 22px; color: var(--green); }
      .icon-btn i { position: absolute; right: 10px; top: 9px; width: 9px; height: 9px; border-radius: 50%; background: var(--green); box-shadow: 0 0 16px rgba(99,229,70,.8); }
      .notification-dropdown { position: absolute; right: 0; top: 56px; width: 350px; border: 1px solid rgba(255,255,255,.1); border-radius: 24px; background: rgba(10,14,12,.96); box-shadow: 0 24px 90px rgba(0,0,0,.55); padding: 14px; z-index: 30; }
      .dropdown-head { display: flex; justify-content: space-between; align-items: center; padding: 4px 4px 12px; }
      .dropdown-head span { background: rgba(99,229,70,.16); color: var(--green); border: 1px solid rgba(99,229,70,.28); padding: 2px 8px; border-radius: 999px; font-size: 12px; }
      .notification-item { display: flex; gap: 12px; padding: 12px; border-radius: 17px; background: rgba(255,255,255,.035); margin-top: 8px; border: 1px solid rgba(255,255,255,.06); }
      .notification-item.unread { border-color: rgba(99,229,70,.25); background: rgba(99,229,70,.08); }
      .notification-dot { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 50%; background: rgba(99,229,70,.14); color: var(--green); flex: 0 0 30px; }
      .notification-item strong { display: block; font-size: 13px; }
      .notification-item p { margin: 4px 0; color: var(--muted); font-size: 12px; line-height: 1.4; }
      .notification-item small { color: var(--steel); }

      .user-pill { height: 46px; border: 1px solid rgba(255,255,255,.1); border-radius: 999px; background: rgba(255,255,255,.045); padding: 5px 12px 5px 5px; display: flex; gap: 9px; align-items: center; min-width: 210px; }
      .user-pill > span { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 50%; background: linear-gradient(135deg, var(--green), #D9FFD0); color: #071008; font-weight: 900; }
      .user-pill strong { display: block; max-width: 148px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
      .user-pill small { color: var(--muted); font-size: 11px; }

      .ghost-btn, .secondary-btn, .toggle-btn { border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.045); color: #F5F7F2; border-radius: 14px; padding: 12px 15px; cursor: pointer; transition: .22s ease; }
      .ghost-btn:hover, .secondary-btn:hover, .toggle-btn:hover { border-color: rgba(99,229,70,.3); background: rgba(99,229,70,.08); }
      .primary-btn { border: 0; border-radius: 15px; padding: 13px 18px; cursor: pointer; color: #071008; font-weight: 900; background: linear-gradient(135deg, var(--green), #C4FFB7); box-shadow: 0 16px 45px rgba(99,229,70,.18); display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
      .primary-btn.disabled { opacity: .62; cursor: not-allowed; box-shadow: none; }
      .primary-btn.as-link { width: fit-content; }

      .tab-stack { display: grid; gap: 22px; }
      .soft-card, .stat-card, .course-card, .timeline-course, .exam-card, .empty-state { border: 1px solid var(--border); background: var(--card); border-radius: 28px; box-shadow: 0 28px 90px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.05); }
      .dashboard-hero { min-height: 310px; padding: 34px; display: grid; grid-template-columns: 1.2fr .8fr; gap: 28px; align-items: center; overflow: hidden; position: relative; }
      .dashboard-hero::after { content: ""; position: absolute; right: -90px; top: -120px; width: 340px; height: 340px; border-radius: 50%; background: rgba(99,229,70,.16); filter: blur(10px); }
      .eyebrow { display: inline-flex; align-items: center; gap: 8px; color: var(--green); font-size: 12px; font-weight: 900; letter-spacing: .16em; text-transform: uppercase; }
      .eyebrow::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: var(--green); box-shadow: 0 0 18px rgba(99,229,70,.9); }
      .dashboard-hero h2, .section-head h2, .exam-hero h2 { margin: 10px 0 12px; font-size: clamp(30px, 4vw, 58px); line-height: .96; letter-spacing: -.06em; }
      .dashboard-hero p, .section-head p, .exam-hero p { margin: 0; max-width: 720px; color: var(--muted); line-height: 1.65; }
      .hero-actions { margin-top: 24px; display: flex; gap: 12px; flex-wrap: wrap; }
      .dashboard-metric { position: relative; z-index: 1; padding: 28px; border-radius: 28px; background: rgba(255,255,255,.055); border: 1px solid rgba(255,255,255,.09); }
      .dashboard-metric strong { display: block; font-size: 76px; letter-spacing: -.08em; color: var(--green); }
      .dashboard-metric span { color: var(--muted); }
      .progress-line { height: 8px; border-radius: 999px; background: rgba(255,255,255,.08); overflow: hidden; margin-top: 14px; }
      .progress-line i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--green), #C7FFB8); box-shadow: 0 0 18px rgba(99,229,70,.34); }
      .progress-line.xl { height: 10px; }
      .stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
      .stat-card { padding: 22px; }
      .stat-card span { color: var(--muted); font-size: 13px; }
      .stat-card strong { display: block; font-size: 38px; margin: 8px 0; letter-spacing: -.05em; }
      .stat-card p { margin: 0; color: var(--steel); font-size: 13px; }
      .featured-course { padding: 18px; display: grid; grid-template-columns: 230px 1fr; gap: 20px; align-items: center; }

      .section-head { display: flex; justify-content: space-between; gap: 20px; align-items: flex-end; }
      .course-controls { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
      .course-controls input, .course-controls select { height: 46px; border: 1px solid rgba(255,255,255,.11); background: rgba(255,255,255,.045); color: #fff; border-radius: 15px; padding: 0 14px; outline: none; }
      .course-controls input::placeholder { color: var(--steel); }
      .course-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
      .course-list { display: grid; gap: 14px; }
      .course-card { overflow: hidden; }
      .course-card.list { display: grid; grid-template-columns: 240px 1fr; }
      .course-cover { min-height: 172px; background-size: cover !important; background-position: center !important; position: relative; border-radius: 22px; overflow: hidden; }
      .course-card .course-cover { border-radius: 28px 28px 0 0; }
      .course-card.list .course-cover { border-radius: 28px 0 0 28px; min-height: 100%; }
      .course-cover span { position: absolute; left: 14px; top: 14px; border-radius: 999px; background: rgba(0,0,0,.48); border: 1px solid rgba(255,255,255,.14); padding: 7px 10px; font-size: 12px; color: #fff; backdrop-filter: blur(12px); }
      .course-body { padding: 20px; }
      .course-body h3, .featured-course h3, .timeline-course h3, .exam-card h3 { margin: 0 0 8px; font-size: 20px; letter-spacing: -.025em; }
      .course-body p, .featured-course p, .timeline-course p, .exam-card p { color: var(--muted); line-height: 1.55; margin: 0; }
      .course-meta { margin-top: 15px; display: flex; gap: 8px; flex-wrap: wrap; }
      .course-meta span { font-size: 12px; color: #DCE6DE; padding: 6px 9px; border-radius: 999px; background: rgba(255,255,255,.055); border: 1px solid rgba(255,255,255,.08); }
      .course-link { margin-top: 16px; display: inline-flex; color: var(--green); font-weight: 800; }

      .timeline-panel { display: grid; gap: 16px; }
      .timeline-course { padding: 22px; }
      .timeline-course header { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
      .timeline-course header strong { color: var(--green); font-size: 28px; }
      .timeline-modules { display: grid; gap: 12px; }
      .timeline-module { display: flex; align-items: center; gap: 12px; padding: 13px; border-radius: 18px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07); }
      .timeline-module > span { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; background: rgba(255,255,255,.08); color: var(--muted); font-weight: 900; }
      .timeline-module > span.done { background: rgba(99,229,70,.16); color: var(--green); }
      .timeline-module strong { display: block; }
      .timeline-module p { margin: 4px 0 0; color: var(--muted); font-size: 13px; }

      .exam-hero { padding: 34px; }
      .exam-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 16px; }
      .exam-card { padding: 22px; }
      .badge { display: inline-flex; width: fit-content; align-items: center; gap: 6px; border-radius: 999px; padding: 7px 10px; font-size: 12px; font-weight: 900; border: 1px solid rgba(255,255,255,.1); }
      .badge.success { color: var(--green); border-color: rgba(99,229,70,.32); background: rgba(99,229,70,.12); }
      .badge.locked { color: #C2C9C3; background: rgba(255,255,255,.06); }
      .badge.progress { color: #DBE7DD; border-color: rgba(255,255,255,.14); background: rgba(255,255,255,.06); }
      .exam-card h3 { margin-top: 14px; }

      .empty-state { padding: 36px; text-align: center; }
      .empty-state span { width: 54px; height: 54px; margin: 0 auto 16px; display: grid; place-items: center; border-radius: 50%; background: rgba(99,229,70,.12); color: var(--green); font-size: 24px; }
      .empty-state h3 { margin: 0 0 8px; }
      .empty-state p { margin: 0 auto; color: var(--muted); max-width: 520px; line-height: 1.55; }

      .cert-page { display: grid; gap: 24px; }
      .cert-heading { display: flex; justify-content: space-between; gap: 20px; align-items: flex-end; }
      .cert-heading h2 { margin: 8px 0 8px; font-size: clamp(38px, 5vw, 74px); line-height: .9; letter-spacing: -.07em; }
      .cert-heading p { margin: 0; color: var(--muted); font-size: 17px; max-width: 760px; }

      .cert-hero {
        min-height: 430px;
        border-radius: 38px;
        position: relative;
        overflow: hidden;
        display: grid;
        grid-template-columns: minmax(0, .96fr) minmax(420px, .86fr);
        gap: 18px;
        padding: clamp(28px, 4vw, 48px);
        border: 1px solid rgba(255,255,255,.105);
        background:
          radial-gradient(circle at 74% 24%, rgba(99,229,70,.24), transparent 30%),
          radial-gradient(circle at 42% 112%, rgba(99,229,70,.10), transparent 35%),
          linear-gradient(135deg, rgba(17,23,20,.96) 0%, rgba(8,11,10,.98) 46%, rgba(25,31,27,.95) 100%);
        box-shadow: 0 38px 130px rgba(0,0,0,.40), inset 0 1px 0 rgba(255,255,255,.07);
      }
      .cert-hero::before { content: ""; position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px); background-size: 42px 42px; mask-image: linear-gradient(90deg, black, transparent 76%); opacity: .38; }
      .cert-hero::after { content: ""; position: absolute; right: -180px; top: -230px; width: 560px; height: 560px; border-radius: 50%; border: 1px solid rgba(99,229,70,.16); box-shadow: inset 0 0 90px rgba(99,229,70,.08); }
      .cert-hero-copy { position: relative; z-index: 2; align-self: center; }
      .cert-kicker { display: inline-flex; padding: 8px 12px; border: 1px solid rgba(99,229,70,.26); background: rgba(99,229,70,.10); color: var(--green); border-radius: 999px; font-size: 12px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
      .cert-hero-copy h3 { max-width: 720px; margin: 18px 0 18px; font-size: clamp(46px, 5.7vw, 92px); line-height: .86; letter-spacing: -.085em; }
      .cert-hero-copy > p { max-width: 680px; margin: 0; color: #C9D3CB; line-height: 1.72; font-size: 16px; }
      .benefit-grid { margin-top: 28px; display: grid; gap: 12px; max-width: 680px; }
      .benefit-card { display: grid; grid-template-columns: 42px 1fr; gap: 12px; padding: 13px; border-radius: 19px; background: rgba(255,255,255,.045); border: 1px solid rgba(255,255,255,.075); backdrop-filter: blur(12px); }
      .benefit-card > span { width: 42px; height: 42px; border-radius: 15px; display: grid; place-items: center; background: linear-gradient(135deg, rgba(99,229,70,.26), rgba(99,229,70,.08)); color: var(--green); font-weight: 900; border: 1px solid rgba(99,229,70,.22); }
      .benefit-card strong { display: block; color: #fff; margin-bottom: 3px; }
      .benefit-card p { margin: 0; color: var(--muted); line-height: 1.42; font-size: 13px; }

      .certificate-art-wrap { position: relative; z-index: 2; min-height: 370px; display: grid; place-items: center; perspective: 1100px; }
      .hero-orbit { position: absolute; border-radius: 999px; border: 1px solid rgba(99,229,70,.22); filter: blur(.1px); }
      .hero-orbit.one { width: 420px; height: 420px; transform: rotate(-18deg); }
      .hero-orbit.two { width: 300px; height: 300px; transform: rotate(22deg); border-color: rgba(255,255,255,.09); }
      .paper-certificate {
        width: min(390px, 92%);
        min-height: 520px;
        padding: 30px 28px;
        border-radius: 12px;
        position: relative;
        transform: rotate(-8deg) rotateY(-10deg) rotateX(5deg);
        background:
          radial-gradient(circle at 82% 16%, rgba(212,175,55,.22), transparent 18%),
          linear-gradient(135deg, #FBF2D5 0%, #EFE0B8 52%, #FFF8E8 100%);
        color: #17150F;
        box-shadow: 0 44px 90px rgba(0,0,0,.52), 0 0 0 1px rgba(255,255,255,.42), inset 0 0 0 11px rgba(80,64,31,.08), inset 0 0 0 13px rgba(171,131,37,.28);
      }
      .paper-certificate::before { content: ""; position: absolute; inset: 22px; border: 1px solid rgba(115,83,21,.22); border-radius: 4px; pointer-events: none; }
      .paper-certificate::after { content: ""; position: absolute; right: -30px; bottom: 28px; width: 90px; height: 16px; background: rgba(0,0,0,.20); filter: blur(18px); transform: rotate(9deg); }
      .paper-topline { height: 5px; width: 120px; margin: 0 auto 20px; border-radius: 999px; background: linear-gradient(90deg, transparent, #B88A24, transparent); }
      .paper-logo { width: 62px; height: 62px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 12px; background: #15150E; color: #E7CC71; font-weight: 950; letter-spacing: -.06em; }
      .paper-small { display: block; text-align: center; font-size: 9px; letter-spacing: .24em; color: #725C2D; font-weight: 800; }
      .paper-certificate h4 { text-align: center; margin: 28px 0 0; font-size: 38px; letter-spacing: .03em; font-family: Georgia, "Times New Roman", serif; }
      .paper-certificate > strong { display: block; text-align: center; font-size: 18px; letter-spacing: .24em; color: #826223; margin-top: 3px; }
      .paper-certificate p { text-align: center; margin: 20px auto 0; color: #4C4634; line-height: 1.4; max-width: 290px; font-size: 13px; }
      .paper-certificate h5 { margin: 12px auto 4px; text-align: center; font-size: 30px; font-family: Georgia, "Times New Roman", serif; border-bottom: 1px solid rgba(115,83,21,.24); width: 78%; padding-bottom: 8px; }
      .paper-course { margin: 16px auto 0; text-align: center; font-weight: 900; color: #17150F; max-width: 280px; }
      .paper-bottom { margin-top: 36px; display: grid; grid-template-columns: 1fr 82px 1fr; align-items: center; gap: 12px; }
      .paper-bottom span { display: block; color: #7A6A46; font-size: 10px; text-transform: uppercase; letter-spacing: .14em; }
      .paper-bottom b { display: block; font-size: 11px; margin-top: 5px; border-top: 1px solid rgba(60,45,18,.32); padding-top: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .gold-seal { width: 82px; height: 82px; border-radius: 50%; display: grid; place-items: center; background: radial-gradient(circle at 34% 28%, #FFF1A7, #C99023 52%, #8B5D12 100%); color: #37280A; box-shadow: 0 8px 20px rgba(97,65,14,.3), inset 0 0 0 6px rgba(255,255,255,.17); }
      .gold-seal i { font-style: normal; font-weight: 950; font-size: 18px; }

      .cert-layout { display: grid; grid-template-columns: minmax(0, 1.38fr) minmax(340px, .62fr); gap: 22px; align-items: start; }
      .cert-main-column, .cert-side-column { display: grid; gap: 16px; }
      .cert-main-column { border: 1px solid rgba(255,255,255,.09); border-radius: 34px; padding: 20px; background: linear-gradient(180deg, rgba(16,21,18,.82), rgba(8,11,10,.82)); box-shadow: 0 30px 100px rgba(0,0,0,.28); }
      .panel-header { padding: 4px 4px 6px; }
      .panel-header h3, .side-panel h3 { margin: 0 0 7px; font-size: 22px; letter-spacing: -.03em; }
      .panel-header p, .side-panel p { margin: 0; color: var(--muted); line-height: 1.55; }

      .cert-card { display: grid; grid-template-columns: 190px 1fr; gap: 18px; padding: 16px; border-radius: 28px; background: rgba(255,255,255,.045); border: 1px solid rgba(255,255,255,.085); position: relative; overflow: hidden; }
      .cert-card::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(135deg, rgba(255,255,255,.045), transparent 45%); }
      .cert-card > * { position: relative; z-index: 1; }
      .cert-thumbnail { min-height: 210px; border-radius: 22px; display: grid; place-items: center; overflow: hidden; border: 1px solid rgba(255,255,255,.1); }
      .issued-thumb { background: radial-gradient(circle at 28% 18%, rgba(99,229,70,.26), transparent 24%), linear-gradient(135deg, #0D1510, #151C18 54%, #070908); box-shadow: inset 0 0 0 1px rgba(99,229,70,.18); }
      .thumb-inner { width: 78%; min-height: 142px; border-radius: 14px; border: 1px solid rgba(99,229,70,.45); display: grid; place-items: center; padding: 14px; text-align: center; background: rgba(0,0,0,.24); }
      .thumb-inner span { color: var(--green); font-weight: 950; letter-spacing: -.08em; font-size: 26px; }
      .thumb-inner strong { font-size: 13px; letter-spacing: .14em; }
      .thumb-inner i { color: var(--muted); font-size: 12px; font-style: normal; }
      .empty-thumb { opacity: .72; filter: saturate(.72); }
      .locked-thumb { background: linear-gradient(135deg, rgba(255,255,255,.075), rgba(255,255,255,.025)); color: var(--steel); position: relative; }
      .locked-thumb::before { content: ""; position: absolute; inset: 18px; border-radius: 18px; border: 1px dashed rgba(255,255,255,.15); }
      .lock-symbol { width: 70px; height: 70px; display: grid; place-items: center; border-radius: 50%; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); color: var(--green); font-size: 38px; }
      .locked-thumb strong { position: absolute; bottom: 24px; font-size: 18px; letter-spacing: -.06em; color: rgba(255,255,255,.34); }
      .cert-card-content { min-width: 0; display: flex; flex-direction: column; align-items: flex-start; }
      .cert-row-top { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; }
      .cert-row-top small { color: var(--steel); }
      .cert-card h4 { margin: 0 0 8px; font-size: clamp(22px, 2.2vw, 34px); letter-spacing: -.05em; }
      .cert-card p { margin: 0; color: var(--muted); line-height: 1.58; }
      .cert-details-grid { width: 100%; display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 10px; margin: 18px 0; }
      .cert-details-grid div, .locked-meta { padding: 12px; border-radius: 16px; background: rgba(0,0,0,.18); border: 1px solid rgba(255,255,255,.07); }
      .cert-details-grid span, .locked-meta span { display: block; color: var(--steel); font-size: 11px; text-transform: uppercase; letter-spacing: .12em; margin-bottom: 6px; }
      .cert-details-grid strong, .locked-meta strong { display: block; font-size: 13px; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .locked-meta { width: 100%; margin-top: 16px; }
      .soft-empty { border-color: rgba(255,255,255,.075); }
      .all-certificates-row { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 18px 20px; border-radius: 22px; border: 1px solid rgba(99,229,70,.18); background: linear-gradient(135deg, rgba(99,229,70,.10), rgba(255,255,255,.035)); color: #fff; cursor: pointer; }
      .all-certificates-row span { font-weight: 850; }
      .all-certificates-row i { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 50%; background: rgba(99,229,70,.16); color: var(--green); font-style: normal; }

      .side-panel { border-radius: 30px; border: 1px solid rgba(255,255,255,.09); background: linear-gradient(180deg, rgba(18,23,20,.88), rgba(8,11,10,.88)); padding: 22px; box-shadow: 0 24px 80px rgba(0,0,0,.26), inset 0 1px 0 rgba(255,255,255,.05); }
      .steps-list { display: grid; gap: 12px; margin-top: 18px; }
      .step-item { display: grid; grid-template-columns: 42px 1fr; gap: 12px; align-items: start; padding: 12px; border-radius: 18px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.065); }
      .step-item > span { width: 42px; height: 42px; border-radius: 15px; display: grid; place-items: center; background: rgba(99,229,70,.12); color: var(--green); font-weight: 950; border: 1px solid rgba(99,229,70,.2); }
      .step-item strong { display: block; margin-bottom: 4px; }
      .step-item p { font-size: 13px; line-height: 1.45; }
      .shield-icon { width: 62px; height: 62px; border-radius: 22px; display: grid; place-items: center; background: radial-gradient(circle at 30% 20%, rgba(99,229,70,.24), rgba(99,229,70,.07)); border: 1px solid rgba(99,229,70,.22); margin-bottom: 16px; font-size: 28px; }
      .verify-strip { margin-top: 18px; padding: 14px; border-radius: 18px; background: rgba(99,229,70,.08); border: 1px solid rgba(99,229,70,.16); }
      .verify-strip span { display: block; color: var(--steel); font-size: 11px; text-transform: uppercase; letter-spacing: .12em; margin-bottom: 5px; }
      .verify-strip strong { color: var(--green); }
      .credential-ring { --value: 0deg; width: 156px; height: 156px; margin: 22px auto; border-radius: 50%; display: grid; place-items: center; background: conic-gradient(var(--green) var(--value), rgba(255,255,255,.08) 0); position: relative; box-shadow: 0 20px 60px rgba(99,229,70,.10); }
      .credential-ring::after { content: ""; position: absolute; inset: 16px; border-radius: 50%; background: #0B0F0D; box-shadow: inset 0 0 0 1px rgba(255,255,255,.07); }
      .credential-ring span { position: relative; z-index: 1; font-size: 34px; letter-spacing: -.06em; font-weight: 950; color: #fff; }
      .credential-stats { display: grid; gap: 9px; }
      .credential-stats div { display: flex; justify-content: space-between; align-items: center; padding: 12px 13px; border-radius: 16px; background: rgba(255,255,255,.045); border: 1px solid rgba(255,255,255,.065); }
      .credential-stats span { color: var(--muted); }
      .credential-stats strong { color: #fff; }

      @media (max-width: 1180px) {
        .ghc-shell { grid-template-columns: 1fr; }
        .sidebar { position: relative; height: auto; flex-direction: row; align-items: center; overflow-x: auto; }
        .brand-block { min-width: 250px; }
        .side-nav { grid-auto-flow: column; grid-auto-columns: max-content; }
        .sidebar-progress { min-width: 270px; margin-top: 0; }
        .cert-hero, .dashboard-hero, .cert-layout { grid-template-columns: 1fr; }
        .certificate-art-wrap { min-height: 520px; }
        .course-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }

      @media (max-width: 760px) {
        .workspace { padding: 18px 14px 42px; }
        .topbar { align-items: flex-start; flex-direction: column; }
        .top-actions { width: 100%; flex-wrap: wrap; }
        .user-pill { flex: 1; min-width: 0; }
        .notification-dropdown { left: 0; right: auto; width: min(350px, calc(100vw - 28px)); }
        .section-head { flex-direction: column; align-items: stretch; }
        .course-controls { justify-content: stretch; }
        .course-controls input, .course-controls select, .toggle-btn { width: 100%; }
        .course-grid, .exam-grid, .stats-grid { grid-template-columns: 1fr; }
        .course-card.list, .featured-course, .cert-card { grid-template-columns: 1fr; }
        .course-card.list .course-cover { border-radius: 28px 28px 0 0; min-height: 180px; }
        .cert-hero { padding: 24px; border-radius: 30px; }
        .cert-hero-copy h3 { font-size: 48px; }
        .paper-certificate { transform: rotate(-4deg); min-height: 480px; }
        .cert-details-grid { grid-template-columns: 1fr; }
        .sidebar { padding: 14px; }
      }
    `}</style>
  );
}
