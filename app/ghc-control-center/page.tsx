"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import GHCLogo from "../components/GHCLogo";

type AnyRecord = Record<string, any>;

type AdminTab =
  | "panel"
  | "cursos"
  | "contenido"
  | "alumnos"
  | "examenes"
  | "certificados"
  | "pagos"
  | "comunicaciones"
  | "analitica"
  | "seguridad"
  | "studio"
  | "ajustes";

type GuardState = "checking" | "allowed" | "denied";
type CourseViewMode = "grid" | "list";
type CourseStatusFilter = "all" | "published" | "draft" | "hidden";

type DashboardData = {
  profiles: AnyRecord[];
  courses: AnyRecord[];
  modules: AnyRecord[];
  lessons: AnyRecord[];
  certificates: AnyRecord[];
  courseCompletions: AnyRecord[];
  moduleCompletions: AnyRecord[];
  lessonProgress: AnyRecord[];
};

type CourseAdminView = {
  course: AnyRecord;
  id: string;
  title: string;
  subtitle: string;
  description: string;
  status: "published" | "draft" | "hidden";
  statusLabel: string;
  level: string;
  category: string;
  price: string;
  modulesCount: number;
  lessonsCount: number;
  enrollmentsCount: number;
  updatedAt: string;
  image: string;
  progressHint: number;
};

type StudentAdminView = {
  id: string;
  profile: AnyRecord;
  name: string;
  email: string;
  initials: string;
  status: "active" | "inactive" | "risk" | "blocked";
  statusLabel: string;
  progress: number;
  completedLessons: number;
  completedCourses: number;
  activeCourses: number;
  certificates: number;
  lastActivity: string;
  inactiveDays: number | null;
  riskLabel: string;
  riskTone: "green" | "yellow" | "red" | "muted";
  totalInvested: string;
  commercialTier: string;
  commercialHint: string;
  latestCourse: string;
  followUpStatus: string;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const GREEN = "#63E546";

const adminTabs: { id: AdminTab; label: string; helper: string; icon: string }[] = [
  { id: "panel", label: "Panel", helper: "Control", icon: "⌂" },
  { id: "cursos", label: "Cursos", helper: "Catálogo", icon: "▱" },
  { id: "contenido", label: "Contenido", helper: "Módulos", icon: "▤" },
  { id: "alumnos", label: "Alumnos", helper: "Usuarios", icon: "◎" },
  { id: "examenes", label: "Exámenes", helper: "Evaluación", icon: "◈" },
  { id: "certificados", label: "Certificados", helper: "Credenciales", icon: "✦" },
  { id: "pagos", label: "Pagos y accesos", helper: "Ventas", icon: "◷" },
  { id: "comunicaciones", label: "Comunicaciones", helper: "Avisos", icon: "✉" },
  { id: "analitica", label: "Analítica", helper: "Datos", icon: "⌁" },
  { id: "seguridad", label: "Seguridad", helper: "Accesos", icon: "◇" },
  { id: "studio", label: "Studio GHC", helper: "Editor", icon: "▣" },
  { id: "ajustes", label: "Ajustes", helper: "Sistema", icon: "⚙" },
];

const emptyDashboardData: DashboardData = {
  profiles: [],
  courses: [],
  modules: [],
  lessons: [],
  certificates: [],
  courseCompletions: [],
  moduleCompletions: [],
  lessonProgress: [],
};

export default function Page() {
  const router = useRouter();
  const [guardState, setGuardState] = useState<GuardState>("checking");
  const [adminUser, setAdminUser] = useState<AnyRecord | null>(null);
  const [profile, setProfile] = useState<AnyRecord | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("panel");
  const [dashboardData, setDashboardData] = useState<DashboardData>(emptyDashboardData);
  const [systemMessage, setSystemMessage] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const [courseStatusFilter, setCourseStatusFilter] = useState<CourseStatusFilter>("all");
  const [courseViewMode, setCourseViewMode] = useState<CourseViewMode>("grid");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");

  useEffect(() => {
    async function protectAndLoad() {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          router.replace("/acceso");
          return;
        }

        const user = userData.user as AnyRecord;
        setAdminUser(user);

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error(profileError);
          setGuardState("denied");
          router.replace("/alumno");
          return;
        }

        const role = String(profileData?.role || "").toLowerCase();
        if (!["admin", "superadmin", "owner"].includes(role)) {
          setGuardState("denied");
          router.replace("/alumno");
          return;
        }

        setProfile(profileData || null);
        setGuardState("allowed");
        setDashboardData(await loadDashboardData());
      } catch (error) {
        console.error(error);
        setGuardState("denied");
        router.replace("/alumno");
      }
    }

    protectAndLoad();
  }, [router]);

  const displayName = profile?.full_name || adminUser?.user_metadata?.full_name || adminUser?.email || "Admin GHC";
  const initials = getInitials(displayName);
  const dashboardStats = useMemo(() => buildDashboardStats(dashboardData), [dashboardData]);
  const courseViews = useMemo(() => buildCourseAdminViews(dashboardData), [dashboardData]);
  const studentViews = useMemo(() => buildStudentAdminViews(dashboardData, courseViews), [dashboardData, courseViews]);
  const recentActivity = useMemo(() => buildRecentActivity(dashboardData), [dashboardData]);
  const priorityTasks = useMemo(() => buildPriorityTasks(dashboardData), [dashboardData]);

  const filteredCourseViews = useMemo(() => {
    const query = courseSearch.trim().toLowerCase();
    return courseViews.filter((item) => {
      const matchesSearch =
        !query ||
        [item.title, item.subtitle, item.description, item.category, item.level, item.statusLabel]
          .join(" ")
          .toLowerCase()
          .includes(query);

      const matchesStatus = courseStatusFilter === "all" || item.status === courseStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [courseViews, courseSearch, courseStatusFilter]);


  const filteredStudentViews = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    return studentViews.filter((student) => {
      if (!query) return true;
      return [student.name, student.email, student.statusLabel, student.riskLabel, student.commercialTier]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [studentViews, studentSearch]);

  const selectedStudent =
    filteredStudentViews.find((student) => student.id === selectedStudentId) ||
    filteredStudentViews[0] ||
    studentViews[0] ||
    null;

  if (guardState === "checking") {
    return (
      <main className="admin-loading">
        <GlobalStyles />
        <Background />
        <section className="admin-loading-card">
          <GHCLogo size="md" showText tagline={false} />
          <h1>GHC Control Center</h1>
          <p>Verificando acceso administrativo...</p>
        </section>
      </main>
    );
  }

  if (guardState !== "allowed") return null;

  return (
    <main className="admin-page">
      <GlobalStyles />
      <Background />

      <aside className="admin-sidebar">
        <div>
          <div className="admin-logo">
            <GHCLogo size="md" showText tagline={false} />
          </div>

          <nav className="admin-nav" aria-label="Navegación administrador">
            {adminTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? "admin-nav-item active" : "admin-nav-item"}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSystemMessage("");
                }}
              >
                <span className="admin-nav-icon">{tab.icon}</span>
                <span>
                  <strong>{tab.label}</strong>
                  <small>{tab.helper}</small>
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div className="admin-sidebar-bottom">
          <div className="support-card">
            <span className="support-icon">◉</span>
            <div>
              <strong>Soporte GHC</strong>
              <p>Centro de ayuda interno</p>
            </div>
            <button type="button">Abrir soporte</button>
          </div>

          <div className="admin-user-card">
            <span>{initials}</span>
            <div>
              <strong>{shortName(displayName)}</strong>
              <p>Administrador</p>
            </div>
          </div>
        </div>
      </aside>

      <section className="admin-shell">
        <header className="admin-topbar">
          <div className="breadcrumb">
            <span>⌂</span>
            <span>Administración</span>
            <span>›</span>
            <strong>{getTabLabel(activeTab)}</strong>
          </div>

          <div className="topbar-actions">
            <div className="admin-search">Buscar alumnos, cursos, certificados...</div>
            <button type="button" className="create-btn" onClick={() => setSystemMessage("La creación real se conectará por módulo. Empezaremos por Cursos y Contenido.")}>+ Crear</button>
            <button type="button" className="studio-top-btn" onClick={() => setActiveTab("studio")}>Studio GHC</button>
            <button type="button" className="icon-btn">♢</button>
            <div className="topbar-user">
              <span>{initials}</span>
              <div>
                <strong>{shortName(displayName)}</strong>
                <p>Administrador</p>
              </div>
            </div>
          </div>
        </header>

        {systemMessage && <div className="admin-notice">{systemMessage}</div>}

        {activeTab === "panel" ? (
          <PanelAdmin
            stats={dashboardStats}
            recentActivity={recentActivity}
            priorityTasks={priorityTasks}
            setActiveTab={setActiveTab}
            setSystemMessage={setSystemMessage}
          />
        ) : null}

        {activeTab === "cursos" ? (
          <CursosAdmin
            stats={dashboardStats}
            courseViews={filteredCourseViews}
            allCourseViews={courseViews}
            search={courseSearch}
            setSearch={setCourseSearch}
            statusFilter={courseStatusFilter}
            setStatusFilter={setCourseStatusFilter}
            viewMode={courseViewMode}
            setViewMode={setCourseViewMode}
            setActiveTab={setActiveTab}
            setSystemMessage={setSystemMessage}
          />
        ) : null}

        {activeTab === "contenido" ? (
          <ContenidoAdmin
            stats={dashboardStats}
            courseViews={courseViews}
            dashboardData={dashboardData}
            setActiveTab={setActiveTab}
            setSystemMessage={setSystemMessage}
          />
        ) : null}

        {activeTab === "alumnos" ? (
          <AlumnosAdmin
            stats={dashboardStats}
            students={filteredStudentViews}
            allStudents={studentViews}
            selectedStudent={selectedStudent}
            search={studentSearch}
            setSearch={setStudentSearch}
            setSelectedStudentId={setSelectedStudentId}
            setActiveTab={setActiveTab}
            setSystemMessage={setSystemMessage}
          />
        ) : null}

        {!["panel", "cursos", "contenido", "alumnos"].includes(activeTab) ? <ComingSoon tab={activeTab} /> : null}
      </section>
    </main>
  );
}

async function loadDashboardData(): Promise<DashboardData> {
  const [profiles, courses, modules, lessons, certificates, courseCompletions, moduleCompletions, lessonProgress] =
    await Promise.all([
      safeSelect("profiles", "*"),
      safeSelect("courses", "*"),
      safeSelect("modules", "*"),
      safeSelect("lessons", "*"),
      safeSelect("certificates", "*"),
      safeSelect("course_completions", "*"),
      safeSelect("module_completions", "*"),
      safeSelect("lesson_progress", "*"),
    ]);

  return { profiles, courses, modules, lessons, certificates, courseCompletions, moduleCompletions, lessonProgress };
}

async function safeSelect(table: string, columns: string): Promise<AnyRecord[]> {
  try {
    const { data, error } = await supabase.from(table).select(columns);
    if (error) {
      console.warn(`[GHC Admin] No se pudo cargar ${table}:`, error.message);
      return [];
    }
    return Array.isArray(data) ? (data as AnyRecord[]) : [];
  } catch (error) {
    console.warn(`[GHC Admin] Error leyendo ${table}:`, error);
    return [];
  }
}

function buildDashboardStats(data: DashboardData) {
  const students = data.profiles.filter((profile) => {
    const role = String(profile.role || "student").toLowerCase();
    return !["admin", "superadmin", "owner"].includes(role);
  });

  const publishedCourses = data.courses.filter((course) => normalizeCourseStatus(course) === "published");
  const draftCourses = data.courses.filter((course) => normalizeCourseStatus(course) === "draft");
  const hiddenCourses = data.courses.filter((course) => normalizeCourseStatus(course) === "hidden");
  const validCertificates = data.certificates.filter((certificate) => {
    const status = String(certificate.status || "valid").toLowerCase();
    return !["revoked", "revocado", "cancelled", "cancelado"].includes(status);
  });
  const completedCourses = data.courseCompletions.filter((item) => item.completed === true || String(item.status || "").toLowerCase() === "completed");
  const completionRate = students.length > 0 ? Math.round((completedCourses.length / Math.max(students.length, 1)) * 100) : 0;

  return {
    studentsTotal: students.length,
    activeStudents: students.length,
    coursesTotal: data.courses.length,
    publishedCourses: publishedCourses.length,
    draftCourses: draftCourses.length,
    hiddenCourses: hiddenCourses.length,
    certificates: validCertificates.length,
    modules: data.modules.length,
    lessons: data.lessons.length,
    moduleCompletions: data.moduleCompletions.length,
    lessonProgress: data.lessonProgress.length,
    completionRate: Math.min(100, completionRate),
    pendingReviews: draftCourses.length + Math.max(0, data.certificates.length - validCertificates.length),
  };
}

function buildCourseAdminViews(data: DashboardData): CourseAdminView[] {
  return data.courses
    .map((course, index) => {
      const id = String(course.id || `course-${index}`);
      const courseModules = data.modules.filter((module) => String(module.course_id) === id);
      const moduleIds = new Set(courseModules.map((module) => String(module.id)));
      const courseLessons = data.lessons.filter((lesson) => moduleIds.has(String(lesson.module_id)));
      const completions = data.courseCompletions.filter((item) => String(item.course_id) === id);
      const status = normalizeCourseStatus(course);

      return {
        course,
        id,
        title: String(course.title || course.name || "Curso GHC Academy"),
        subtitle: String(course.subtitle || course.short_description || "Formación premium basada en ciencia y aplicación real."),
        description: String(course.description || course.summary || "Curso preparado para edición, maquetación y publicación desde el panel administrador."),
        status,
        statusLabel: getCourseStatusLabel(status),
        level: String(course.level || course.difficulty || "Sin nivel"),
        category: String(course.category || course.course_type || course.type || course.area || "Sin categoría"),
        price: formatCoursePrice(course),
        modulesCount: courseModules.length,
        lessonsCount: courseLessons.length,
        enrollmentsCount: completions.length,
        updatedAt: formatShortDate(course.updated_at || course.created_at || course.published_at),
        image: getCourseImage(course),
        progressHint: Math.min(100, Math.max(12, Math.round(((courseLessons.length || courseModules.length || index + 1) / 12) * 100))),
      };
    })
    .sort((a, b) => {
      if (a.status === "draft" && b.status !== "draft") return -1;
      if (a.status !== "draft" && b.status === "draft") return 1;
      return a.title.localeCompare(b.title);
    });
}


function buildStudentAdminViews(data: DashboardData, courseViews: CourseAdminView[]): StudentAdminView[] {
  const students = data.profiles.filter((profile) => {
    const role = String(profile.role || "student").toLowerCase();
    return !["admin", "superadmin", "owner"].includes(role);
  });

  return students
    .map((profile, index) => {
      const id = String(profile.id || profile.user_id || `student-${index}`);
      const studentLessons = data.lessonProgress.filter((item) => String(item.user_id) === id);
      const studentCompletedCourses = data.courseCompletions.filter((item) => String(item.user_id) === id);
      const studentCertificates = data.certificates.filter((item) => String(item.user_id) === id);
      const activeCourseIds = new Set<string>();

      studentLessons.forEach((item) => {
        if (item.course_id) activeCourseIds.add(String(item.course_id));
      });
      studentCompletedCourses.forEach((item) => {
        if (item.course_id) activeCourseIds.add(String(item.course_id));
      });
      studentCertificates.forEach((item) => {
        if (item.course_id) activeCourseIds.add(String(item.course_id));
      });

      const completedLessons = studentLessons.filter(
        (item) => item.completed === true || String(item.status || "").toLowerCase() === "completed"
      ).length;

      const progress = data.lessons.length > 0 ? Math.min(100, Math.round((completedLessons / data.lessons.length) * 100)) : 0;
      const lastActivityRaw = profile.last_sign_in_at || profile.last_seen_at || profile.updated_at || profile.created_at || null;
      const inactiveDays = getInactiveDays(lastActivityRaw);
      const risk = getStudentRisk(inactiveDays, progress);
      const latestCourse = getLatestCourseName(activeCourseIds, courseViews);
      const name = String(profile.full_name || profile.name || profile.display_name || profile.email || `Alumno ${index + 1}`);
      const email = String(profile.email || "Email no registrado");
      const blocked = ["blocked", "suspended", "bloqueado", "suspendido"].includes(String(profile.status || "").toLowerCase());

      return {
        id,
        profile,
        name,
        email,
        initials: getInitials(name),
        status: (blocked ? "blocked" : risk.status) as StudentAdminView["status"],
        statusLabel: blocked ? "Bloqueado" : risk.statusLabel,
        progress,
        completedLessons,
        completedCourses: studentCompletedCourses.length,
        activeCourses: activeCourseIds.size,
        certificates: studentCertificates.length,
        lastActivity: formatRelative(lastActivityRaw),
        inactiveDays,
        riskLabel: risk.label,
        riskTone: risk.tone,
        totalInvested: "Pendiente",
        commercialTier: studentCertificates.length > 0 || studentCompletedCourses.length > 1 ? "Alumno comprometido" : "Por clasificar",
        commercialHint: "Conectar con Pagos y accesos",
        latestCourse,
        followUpStatus: risk.tone === "red" ? "Requiere contacto" : risk.tone === "yellow" ? "Seguimiento recomendado" : "Sin alerta",
      };
    })
    .sort((a, b) => {
      const toneOrder = { red: 0, yellow: 1, muted: 2, green: 3 } as Record<string, number>;
      return toneOrder[a.riskTone] - toneOrder[b.riskTone] || a.name.localeCompare(b.name);
    });
}

function getInactiveDays(value?: string | null) {
  if (!value) return null;
  try {
    const date = new Date(value);
    const diff = Date.now() - date.getTime();
    return Math.max(0, Math.floor(diff / 86400000));
  } catch {
    return null;
  }
}

function getStudentRisk(inactiveDays: number | null, progress: number): {
  status: "active" | "inactive" | "risk";
  statusLabel: string;
  label: string;
  tone: "green" | "yellow" | "red" | "muted";
} {
  if (inactiveDays === null) return { status: "inactive", statusLabel: "Sin actividad", label: "Sin datos de acceso", tone: "muted" };
  if (inactiveDays >= 21) return { status: "risk", statusLabel: "Riesgo", label: `Inactivo ${inactiveDays} días`, tone: "red" };
  if (inactiveDays >= 7) return { status: "inactive", statusLabel: "En pausa", label: `Inactivo ${inactiveDays} días`, tone: "yellow" };
  if (progress >= 80) return { status: "active", statusLabel: "Avanzado", label: "Alto compromiso", tone: "green" };
  return { status: "active", statusLabel: "Activo", label: "Actividad reciente", tone: "green" };
}

function getLatestCourseName(activeCourseIds: Set<string>, courseViews: CourseAdminView[]) {
  const firstId = Array.from(activeCourseIds)[0];
  if (!firstId) return "Sin curso activo detectado";
  return courseViews.find((course) => course.id === firstId)?.title || "Curso GHC Academy";
}

function buildRecentActivity(data: DashboardData) {
  const items: { icon: string; title: string; label: string; time: string }[] = [];
  data.certificates.slice(0, 2).forEach((certificate) => items.push({ icon: "✦", title: `Certificado emitido${certificate.course_title ? ` · ${certificate.course_title}` : ""}`, label: "Certificados", time: formatRelative(certificate.issued_at || certificate.created_at) }));
  data.courses.slice(0, 2).forEach((course) => items.push({ icon: "▱", title: `Curso disponible · ${course.title || "Curso GHC Academy"}`, label: "Cursos", time: formatRelative(course.updated_at || course.created_at) }));
  data.profiles.slice(0, 2).forEach((profile) => items.push({ icon: "◎", title: `Alumno registrado · ${profile.full_name || profile.email || "Nuevo alumno"}`, label: "Alumnos", time: formatRelative(profile.created_at) }));

  if (items.length === 0) {
    return [
      { icon: "◎", title: "Panel conectado y preparado para actividad real", label: "Sistema", time: "Ahora" },
      { icon: "▱", title: "Los eventos aparecerán cuando haya actividad en Supabase", label: "Actividad", time: "Próximamente" },
    ];
  }
  return items.slice(0, 5);
}

function buildPriorityTasks(data: DashboardData) {
  const draftCourses = data.courses.filter((course) => normalizeCourseStatus(course) === "draft");
  const pendingCertificates = data.certificates.filter((certificate) => ["pending", "pendiente", "review", "revision"].includes(String(certificate.status || "").toLowerCase()));
  const tasks: { title: string; text: string; tag: string }[] = [];
  draftCourses.slice(0, 2).forEach((course) => tasks.push({ title: course.title || "Curso en borrador", text: "Pendiente de maquetación, revisión o publicación", tag: "Curso" }));
  pendingCertificates.slice(0, 2).forEach((certificate) => tasks.push({ title: certificate.course_title || "Certificado pendiente", text: "Revisar requisitos antes de emitir", tag: "Certificado" }));

  if (tasks.length === 0) {
    return [
      { title: "Sin incidencias críticas", text: "No hay revisiones urgentes detectadas en este momento", tag: "OK" },
      { title: "Cursos en preparación", text: "Puedes empezar a maquetar borradores desde la pestaña Cursos", tag: "Próximo" },
    ];
  }
  return tasks;
}

function PanelAdmin({
  stats,
  recentActivity,
  priorityTasks,
  setActiveTab,
  setSystemMessage,
}: {
  stats: ReturnType<typeof buildDashboardStats>;
  recentActivity: { icon: string; title: string; label: string; time: string }[];
  priorityTasks: { title: string; text: string; tag: string }[];
  setActiveTab: (tab: AdminTab) => void;
  setSystemMessage: (message: string) => void;
}) {
  return (
    <div className="panel-page">
      <section className="admin-hero">
        <div>
          <p className="admin-kicker">GHC Academy Control Center</p>
          <h1>Panel de control</h1>
          <p>Gestiona cursos, alumnos, accesos, certificados y crecimiento desde una cabina premium.</p>
        </div>
        <div className="hero-athlete" aria-hidden="true" />
      </section>

      <section className="kpi-grid">
        <KpiCard title="Alumnos activos" value={formatNumber(stats.activeStudents)} trend="Base real Supabase" icon="◎" />
        <KpiCard title="Cursos publicados" value={formatNumber(stats.publishedCourses)} trend={`${stats.draftCourses} borradores`} icon="▱" />
        <KpiCard title="Ingresos del mes" value="Próximo" trend="Stripe/SumUp pendiente" icon="$" muted />
        <KpiCard title="Tasa de finalización" value={`${stats.completionRate}%`} trend="Según cursos completados" icon="✓" />
        <KpiCard title="Pendientes" value={formatNumber(stats.pendingReviews)} trend="Revisiones abiertas" icon="◷" danger={stats.pendingReviews > 0} />
      </section>

      <section className="admin-main-grid">
        <article className="growth-card">
          <div className="card-head">
            <div>
              <h2>Crecimiento de la academia</h2>
              <p>Vista operativa del avance académico y actividad general.</p>
            </div>
            <button type="button">Este mes</button>
          </div>
          <div className="chart-area"><ChartSvg /></div>
          <div className="chart-summary">
            <MiniMetric label="Alumnos registrados" value={formatNumber(stats.studentsTotal)} trend="real" />
            <MiniMetric label="Lecciones completadas" value={formatNumber(stats.lessonProgress)} trend="real" />
            <MiniMetric label="Módulos completados" value={formatNumber(stats.moduleCompletions)} trend="real" />
            <MiniMetric label="Certificados emitidos" value={formatNumber(stats.certificates)} trend="real" />
          </div>
        </article>

        <article className="quick-actions-card">
          <h2>Acciones rápidas</h2>
          <div className="quick-actions-grid">
            <QuickAction icon="▱" title="Crear curso" text="Ficha comercial y publicación" onClick={() => setActiveTab("cursos")} />
            <QuickAction icon="＋" title="Añadir módulo" text="Contenido académico" onClick={() => setActiveTab("contenido")} />
            <QuickAction icon="✦" title="Emitir certificado" text="Credenciales oficiales" onClick={() => setActiveTab("certificados")} />
            <QuickAction icon="➤" title="Enviar comunicado" text="Avisos a alumnos" onClick={() => setActiveTab("comunicaciones")} />
          </div>
        </article>

        <article className="activity-card">
          <div className="card-head compact"><h2>Actividad reciente</h2><button type="button" onClick={() => setSystemMessage("Más adelante conectaremos el histórico completo de actividad.")}>Ver todo</button></div>
          {recentActivity.map((item, index) => <ActivityItem key={`${item.title}-${index}`} icon={item.icon} title={item.title} label={item.label} time={item.time} />)}
        </article>

        <article className="platform-card">
          <h2>Estado de la plataforma</h2>
          <div className="platform-body"><div className="shield">✓</div><div className="status-list"><StatusRow label="Supabase Auth" value="Operativo" /><StatusRow label="Ruta privada admin" value="Activa" /><StatusRow label="Rol administrador" value="Verificado" /><StatusRow label="Pagos" value="Pendiente" warning /></div></div>
          <div className="platform-progress"><span>Base administrativa inicial</span><strong>Activa</strong></div>
        </article>

        <article className="review-card">
          <div className="card-head compact"><h2>Tareas prioritarias</h2><button type="button" onClick={() => setSystemMessage("Las tareas reales se conectarán por módulo del administrador.")}>Ver todas</button></div>
          {priorityTasks.map((item, index) => <ReviewItem key={`${item.title}-${index}`} title={item.title} text={item.text} tag={item.tag} />)}
        </article>

        <article className="studio-card">
          <div><h2>Todo tu contenido, editable desde el panel</h2><p>Studio GHC será el editor visual para landing, catálogo, textos, banners, checkout y experiencia pública. Sin tocar código para la mayoría de cambios.</p><button type="button" onClick={() => setActiveTab("studio")}>Ir a Studio ↗</button></div>
          <div className="studio-visual" aria-hidden="true"><div /><span /><span /></div>
        </article>
      </section>
    </div>
  );
}

function CursosAdmin({
  stats,
  courseViews,
  allCourseViews,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  viewMode,
  setViewMode,
  setActiveTab,
  setSystemMessage,
}: {
  stats: ReturnType<typeof buildDashboardStats>;
  courseViews: CourseAdminView[];
  allCourseViews: CourseAdminView[];
  search: string;
  setSearch: (value: string) => void;
  statusFilter: CourseStatusFilter;
  setStatusFilter: (value: CourseStatusFilter) => void;
  viewMode: CourseViewMode;
  setViewMode: (value: CourseViewMode) => void;
  setActiveTab: (tab: AdminTab) => void;
  setSystemMessage: (message: string) => void;
}) {
  const totalLessons = allCourseViews.reduce((acc, item) => acc + item.lessonsCount, 0);
  const totalModules = allCourseViews.reduce((acc, item) => acc + item.modulesCount, 0);
  const totalEnrollments = allCourseViews.reduce((acc, item) => acc + item.enrollmentsCount, 0);

  return (
    <div className="courses-admin-page">
      <section className="courses-hero">
        <div><p className="admin-kicker">Gestión académica y comercial</p><h1>Cursos</h1><p>Maqueta, revisa y publica cursos desde el panel sin depender del código. Empieza con borradores aunque el contenido final todavía no esté terminado.</p></div>
        <div className="courses-hero-panel"><span>Editor visual preparado</span><strong>Catálogo, módulos, precios y visibilidad</strong><p>La base queda lista para conectar creación, edición y publicación real por fases.</p><button type="button" onClick={() => setSystemMessage("El formulario real de creación será el siguiente paso funcional de Cursos.")}>+ Crear curso</button></div>
      </section>

      <section className="course-stats-grid">
        <CourseStat label="Total cursos" value={stats.coursesTotal} helper="Base Supabase" />
        <CourseStat label="Publicados" value={stats.publishedCourses} helper="Visibles o activos" />
        <CourseStat label="Borradores" value={stats.draftCourses} helper="Para maquetar" />
        <CourseStat label="Módulos" value={totalModules} helper="Estructura académica" />
        <CourseStat label="Lecciones" value={totalLessons} helper="Contenido cargado" />
        <CourseStat label="Matrículas" value={totalEnrollments} helper="Completions registradas" />
      </section>

      <section className="course-toolbar">
        <label className="course-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por título, categoría, nivel o estado..." /></label>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as CourseStatusFilter)}><option value="all">Todos los estados</option><option value="published">Publicados</option><option value="draft">Borradores</option><option value="hidden">Ocultos</option></select>
        <div className="course-view-toggle"><button type="button" className={viewMode === "grid" ? "active" : ""} onClick={() => setViewMode("grid")}>Grid</button><button type="button" className={viewMode === "list" ? "active" : ""} onClick={() => setViewMode("list")}>Lista</button></div>
      </section>

      <section className="courses-layout">
        <div className="courses-main-column">
          <div className="section-title-row"><div><h2>Biblioteca de cursos</h2><p>{courseViews.length} resultados preparados para gestión.</p></div><button type="button" onClick={() => setSystemMessage("Más adelante conectaremos edición masiva de estados y orden del catálogo.")}>Gestionar catálogo</button></div>
          {courseViews.length === 0 ? <article className="courses-empty"><span>▱</span><h3>No hay cursos que coincidan con los filtros</h3><p>Cuando crees o importes cursos, aparecerán aquí como borradores, publicados u ocultos.</p></article> : <div className={viewMode === "grid" ? "admin-course-grid" : "admin-course-list"}>{courseViews.map((item, index) => <AdminCourseCard key={item.id} item={item} index={index} viewMode={viewMode} setActiveTab={setActiveTab} setSystemMessage={setSystemMessage} />)}</div>}
        </div>
        <aside className="courses-side-column">
          <article className="course-side-card"><h2>Acciones de cursos</h2><button type="button" onClick={() => setSystemMessage("Siguiente fase: formulario real para crear cursos en Supabase.")}>+ Crear nuevo curso</button><button type="button" onClick={() => setActiveTab("contenido")}>Gestionar contenido</button><button type="button" onClick={() => setSystemMessage("Más adelante conectaremos plantillas de curso reutilizables.")}>Crear desde plantilla</button><button type="button" onClick={() => setSystemMessage("La vista pública se revisará después de alinear landing y catálogo.")}>Vista pública del catálogo</button></article>
          <article className="course-side-card"><h2>Estado del catálogo</h2><div className="catalog-ring"><strong>{stats.publishedCourses}</strong><span>publicados</span></div><div className="catalog-status-list"><StatusRow label="Publicados" value={formatNumber(stats.publishedCourses)} /><StatusRow label="Borradores" value={formatNumber(stats.draftCourses)} warning={stats.draftCourses > 0} /><StatusRow label="Ocultos" value={formatNumber(stats.hiddenCourses)} /></div></article>
          <article className="course-side-card"><h2>Próximos pasos</h2><div className="course-next-list"><span>1</span><p>Crear formulario real para añadir cursos sin tocar código.</p><span>2</span><p>Conectar edición de título, precio, categoría, nivel e imagen.</p><span>3</span><p>Pasar a Contenido para módulos, lecciones y recursos.</p></div></article>
        </aside>
      </section>
    </div>
  );
}

function AdminCourseCard({ item, index, viewMode, setActiveTab, setSystemMessage }: { item: CourseAdminView; index: number; viewMode: CourseViewMode; setActiveTab: (tab: AdminTab) => void; setSystemMessage: (message: string) => void; }) {
  return (
    <article className={viewMode === "grid" ? "admin-course-card" : "admin-course-card list"}>
      <div className="admin-course-cover" style={{ backgroundImage: getCourseBackground(item, index) }}><span className={`course-status-pill ${item.status}`}>{item.statusLabel}</span></div>
      <div className="admin-course-body">
        <div className="course-title-row"><div><h3>{item.title}</h3><p>{item.subtitle}</p></div><button type="button" onClick={() => setSystemMessage(`Opciones rápidas para: ${item.title}`)}>•••</button></div>
        <div className="course-info-grid"><CourseInfo label="Categoría" value={item.category} /><CourseInfo label="Nivel" value={item.level} /><CourseInfo label="Precio" value={item.price} /><CourseInfo label="Actualizado" value={item.updatedAt} /></div>
        <div className="course-build-row"><div><strong>{item.modulesCount}</strong><span>Módulos</span></div><div><strong>{item.lessonsCount}</strong><span>Lecciones</span></div><div><strong>{item.enrollmentsCount}</strong><span>Matrículas</span></div></div>
        <div className="course-progress-block"><div><span>Preparación estimada</span><strong>{item.progressHint}%</strong></div><div className="course-progress-track"><div style={{ width: `${item.progressHint}%` }} /></div></div>
        <div className="admin-course-actions"><button type="button" onClick={() => setSystemMessage(`Siguiente fase: editar ficha de ${item.title}.`)}>Editar curso</button><button type="button" onClick={() => setActiveTab("contenido")}>Gestionar contenido</button><button type="button" onClick={() => setSystemMessage("La vista pública se ajustará cuando pasemos catálogo y landing a la estética Alumno.")}>Vista previa</button></div>
      </div>
    </article>
  );
}

function CourseInfo({ label, value }: { label: string; value: string }) { return <div className="course-info-box"><span>{label}</span><strong>{value}</strong></div>; }
function CourseStat({ label, value, helper }: { label: string; value: number; helper: string }) { return <article className="course-stat-card"><span>{label}</span><strong>{formatNumber(value)}</strong><p>{helper}</p></article>; }
function KpiCard({ title, value, trend, icon, danger = false, muted = false }: { title: string; value: string; trend: string; icon: string; danger?: boolean; muted?: boolean; }) { return <article className={danger ? "kpi-card danger" : muted ? "kpi-card muted" : "kpi-card"}><div className="kpi-top"><span>{title}</span><em>{icon}</em></div><strong>{value}</strong><p>{trend}</p><div className="sparkline" /></article>; }
function MiniMetric({ label, value, trend }: { label: string; value: string; trend: string }) { return <div className="mini-metric"><span>{label}</span><strong>{value}</strong><em>{trend}</em></div>; }
function QuickAction({ icon, title, text, onClick }: { icon: string; title: string; text: string; onClick: () => void }) { return <button type="button" className="quick-action" onClick={onClick}><span>{icon}</span><div><strong>{title}</strong><p>{text}</p></div><em>›</em></button>; }
function ActivityItem({ icon, title, label, time }: { icon: string; title: string; label: string; time: string }) { return <div className="activity-item"><span>{icon}</span><div><strong>{title}</strong><p>{label}</p></div><em>{time}</em></div>; }
function StatusRow({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) { return <div className={warning ? "status-row warning" : "status-row"}><span>{label}</span><strong>{value}</strong></div>; }
function ReviewItem({ title, text, tag }: { title: string; text: string; tag: string }) { return <div className="review-item"><span>▣</span><div><strong>{title}</strong><p>{text}</p></div><em>{tag}</em></div>; }


function AlumnosAdmin({
  stats,
  students,
  allStudents,
  selectedStudent,
  search,
  setSearch,
  setSelectedStudentId,
  setActiveTab,
  setSystemMessage,
}: {
  stats: ReturnType<typeof buildDashboardStats>;
  students: StudentAdminView[];
  allStudents: StudentAdminView[];
  selectedStudent: StudentAdminView | null;
  search: string;
  setSearch: (value: string) => void;
  setSelectedStudentId: (value: string) => void;
  setActiveTab: (tab: AdminTab) => void;
  setSystemMessage: (message: string) => void;
}) {
  const riskStudents = allStudents.filter((student) => student.riskTone === "red").length;
  const followUpStudents = allStudents.filter((student) => student.riskTone === "yellow").length;
  const certifiedStudents = allStudents.filter((student) => student.certificates > 0).length;
  const engagedStudents = allStudents.filter((student) => student.progress >= 70 || student.certificates > 0).length;

  return (
    <div className="students-admin-page">
      <section className="students-hero">
        <div>
          <p className="admin-kicker">Gestión de relación con el alumno</p>
          <h1>Alumnos</h1>
          <p>Supervisa progreso, accesos, certificados, fidelización y riesgo de abandono desde una ficha completa del alumno.</p>
        </div>
        <div className="students-hero-panel">
          <span>Seguimiento inteligente</span>
          <strong>Académico + comercial + fidelización</strong>
          <p>Preparado para detectar alumnos comprometidos, premiarlos y contactar con quienes se queden parados.</p>
          <button type="button" onClick={() => setSystemMessage("Más adelante conectaremos mensajes personalizados desde Comunicaciones.")}>Contactar alumno</button>
        </div>
      </section>

      <section className="student-stats-grid">
        <StudentStat label="Alumnos totales" value={allStudents.length} helper="Perfiles no admin" />
        <StudentStat label="Activos" value={stats.activeStudents} helper="Base Supabase" />
        <StudentStat label="Riesgo abandono" value={riskStudents} helper="Inactividad alta" danger />
        <StudentStat label="Seguimiento" value={followUpStudents} helper="Pausa reciente" warning />
        <StudentStat label="Certificados" value={certifiedStudents} helper="Con credencial" />
        <StudentStat label="Comprometidos" value={engagedStudents} helper="Candidatos a premio" />
      </section>

      <section className="student-toolbar">
        <label className="student-search">
          <span>⌕</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar alumno, email, estado o fidelización..." />
        </label>
        <button type="button" onClick={() => setSystemMessage("La asignación manual de cursos se conectará desde Pagos y accesos.")}>Asignar curso</button>
        <button type="button" onClick={() => setActiveTab("comunicaciones")}>Campaña de seguimiento</button>
      </section>

      <section className="students-layout">
        <article className="students-list-card">
          <div className="section-title-row">
            <div>
              <h2>Listado de alumnos</h2>
              <p>{students.length} alumnos encontrados.</p>
            </div>
            <button type="button" onClick={() => setSystemMessage("Más adelante conectaremos exportación CSV y segmentación avanzada.")}>Exportar</button>
          </div>

          <div className="students-list">
            {students.length === 0 ? (
              <div className="students-empty">
                <span>◎</span>
                <h3>No hay alumnos que coincidan</h3>
                <p>Cuando haya registros o cambies la búsqueda, aparecerán aquí.</p>
              </div>
            ) : (
              students.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  className={selectedStudent?.id === student.id ? "student-row active" : "student-row"}
                  onClick={() => setSelectedStudentId(student.id)}
                >
                  <span className="student-avatar">{student.initials}</span>
                  <div className="student-main-info">
                    <strong>{student.name}</strong>
                    <p>{student.email}</p>
                  </div>
                  <div className="student-progress-mini">
                    <strong>{student.progress}%</strong>
                    <span>progreso</span>
                  </div>
                  <div className={`student-risk ${student.riskTone}`}>
                    <strong>{student.statusLabel}</strong>
                    <span>{student.riskLabel}</span>
                  </div>
                  <div className="student-commercial-mini">
                    <strong>{student.totalInvested}</strong>
                    <span>{student.commercialTier}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </article>

        <aside className="student-detail-column">
          {selectedStudent ? (
            <StudentDetailCard student={selectedStudent} setActiveTab={setActiveTab} setSystemMessage={setSystemMessage} />
          ) : (
            <article className="student-detail-card">
              <h2>Sin alumno seleccionado</h2>
              <p>Selecciona un alumno para ver su perfil académico, relación comercial y seguimiento.</p>
            </article>
          )}
        </aside>
      </section>
    </div>
  );
}

function StudentDetailCard({
  student,
  setActiveTab,
  setSystemMessage,
}: {
  student: StudentAdminView;
  setActiveTab: (tab: AdminTab) => void;
  setSystemMessage: (message: string) => void;
}) {
  return (
    <article className="student-detail-card">
      <div className="student-detail-head">
        <span>{student.initials}</span>
        <div>
          <p className="admin-kicker">Ficha del alumno</p>
          <h2>{student.name}</h2>
          <p>{student.email}</p>
        </div>
      </div>

      <div className="student-detail-section">
        <h3>Perfil académico</h3>
        <div className="student-detail-grid">
          <DetailMetric label="Progreso" value={`${student.progress}%`} />
          <DetailMetric label="Cursos activos" value={student.activeCourses} />
          <DetailMetric label="Cursos completados" value={student.completedCourses} />
          <DetailMetric label="Certificados" value={student.certificates} />
        </div>
        <div className="student-progress-track"><div style={{ width: `${student.progress}%` }} /></div>
        <p className="student-note">Último curso detectado: <strong>{student.latestCourse}</strong></p>
      </div>

      <div className="student-detail-section commercial">
        <h3>Relación comercial y fidelización</h3>
        <div className="commercial-grid">
          <DetailMetric label="Total invertido" value={student.totalInvested} />
          <DetailMetric label="Nivel" value={student.commercialTier} />
          <DetailMetric label="Estado pagos" value={student.commercialHint} />
          <DetailMetric label="Acceso" value={student.statusLabel} />
        </div>
        <div className="loyalty-actions">
          <button type="button" onClick={() => setSystemMessage("Más adelante conectaremos concesión de curso gratuito desde Pagos y accesos.")}>Curso gratuito</button>
          <button type="button" onClick={() => setSystemMessage("Más adelante conectaremos becas y descuentos personalizados.")}>Beca / descuento</button>
          <button type="button" onClick={() => setSystemMessage("Más adelante podremos marcar alumnos destacados para fidelización.")}>Alumno destacado</button>
        </div>
      </div>

      <div className="student-detail-section follow-up">
        <h3>Seguimiento y riesgo de abandono</h3>
        <div className={`follow-up-status ${student.riskTone}`}>
          <strong>{student.riskLabel}</strong>
          <span>{student.followUpStatus}</span>
        </div>
        <div className="follow-up-grid">
          <DetailMetric label="Última actividad" value={student.lastActivity} />
          <DetailMetric label="Días inactivo" value={student.inactiveDays === null ? "Sin datos" : student.inactiveDays} />
        </div>
        <div className="follow-up-actions">
          <button type="button" onClick={() => setActiveTab("comunicaciones")}>Enviar mensaje de ayuda</button>
          <button type="button" onClick={() => setSystemMessage("Alumno marcado como contactado. Próximamente guardaremos este estado en Supabase.")}>Marcar contactado</button>
        </div>
      </div>
    </article>
  );
}

function DetailMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="detail-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StudentStat({ label, value, helper, danger = false, warning = false }: { label: string; value: number; helper: string; danger?: boolean; warning?: boolean }) {
  return (
    <article className={danger ? "student-stat-card danger" : warning ? "student-stat-card warning" : "student-stat-card"}>
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
      <p>{helper}</p>
    </article>
  );
}

function ContenidoAdmin({
  stats,
  courseViews,
  dashboardData,
  setActiveTab,
  setSystemMessage,
}: {
  stats: ReturnType<typeof buildDashboardStats>;
  courseViews: CourseAdminView[];
  dashboardData: DashboardData;
  setActiveTab: (tab: AdminTab) => void;
  setSystemMessage: (message: string) => void;
}) {
  const productionCourses = courseViews.filter((course) => course.status !== "published");
  const focusCourse = productionCourses[0] || courseViews[0] || null;
  const focusModules = focusCourse
    ? dashboardData.modules.filter((module) => String(module.course_id) === focusCourse.id)
    : [];
  const focusModuleIds = new Set(focusModules.map((module) => String(module.id)));
  const focusLessons = dashboardData.lessons.filter((lesson) => focusModuleIds.has(String(lesson.module_id)));
  const pendingLessons = Math.max(0, (focusModules.length || 6) * 6 - focusLessons.length);

  return (
    <div className="content-admin-page">
      <section className="content-hero">
        <div>
          <p className="admin-kicker">Centro de producción académica</p>
          <h1>Contenido</h1>
          <p>
            Organiza documentos fuente, estructura módulos y convierte Word/PDF en lecciones premium antes de publicar.
          </p>
        </div>
        <div className="content-hero-panel">
          <span>Word / PDF → Curso premium</span>
          <strong>Maquetación, revisión y publicación guiada</strong>
          <p>Este espacio nace como taller interno para preparar cursos aunque el material aún esté sin maquetar.</p>
          <button type="button" onClick={() => setSystemMessage("El importador Word/PDF quedará conectado más adelante a la Factoría IA de Cursos GHC.")}>Importar documento</button>
        </div>
      </section>

      <section className="content-stats-grid">
        <CourseStat label="Cursos en producción" value={productionCourses.length} helper="Borradores u ocultos" />
        <CourseStat label="Módulos creados" value={stats.modules} helper="Estructura Supabase" />
        <CourseStat label="Lecciones creadas" value={stats.lessons} helper="Contenido cargado" />
        <CourseStat label="Lecciones pendientes" value={pendingLessons} helper="Estimación de maquetación" />
      </section>

      <section className="content-layout">
        <div className="content-main-column">
          <article className="production-board-card">
            <div className="card-head">
              <div>
                <h2>Cursos en maquetación</h2>
                <p>Prioriza borradores, estructura módulos y prepara el curso para revisión académica.</p>
              </div>
              <button type="button" onClick={() => setActiveTab("cursos")}>Ver cursos</button>
            </div>

            <div className="production-course-list">
              {(productionCourses.length ? productionCourses : courseViews.slice(0, 3)).map((course, index) => (
                <div className={index === 0 ? "production-course active" : "production-course"} key={course.id}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{course.title}</strong>
                    <p>{course.statusLabel} · {course.modulesCount} módulos · {course.lessonsCount} lecciones</p>
                  </div>
                  <em>{course.progressHint}%</em>
                </div>
              ))}

              {courseViews.length === 0 ? (
                <div className="production-course active">
                  <span>1</span>
                  <div>
                    <strong>Primer curso GHC Academy</strong>
                    <p>Pendiente de crear desde Cursos o importar desde Word/PDF.</p>
                  </div>
                  <em>0%</em>
                </div>
              ) : null}
            </div>
          </article>

          <article className="module-map-card">
            <div className="card-head compact">
              <h2>Mapa de módulos</h2>
              <button type="button" onClick={() => setSystemMessage("Siguiente fase: crear y ordenar módulos reales desde este panel.")}>+ Añadir módulo</button>
            </div>

            <div className="module-map-list">
              {(focusModules.length ? focusModules : createPlaceholderModules()).map((module, index) => {
                const moduleLessons = focusLessons.filter((lesson) => String(lesson.module_id) === String(module.id));
                return (
                  <div className={index === 0 ? "module-map-row current" : "module-map-row"} key={module.id || `placeholder-${index}`}>
                    <div className="module-index">M{index + 1}</div>
                    <div>
                      <strong>{module.title || module.name || `Módulo ${index + 1}`}</strong>
                      <p>{moduleLessons.length || (index + 3)} lecciones · {index === 0 ? "En maquetación" : index === 1 ? "Pendiente de dividir" : "Preparado"}</p>
                    </div>
                    <button type="button" onClick={() => setSystemMessage("La edición detallada de módulos se conectará en la siguiente fase.")}>Editar</button>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="source-docs-card">
            <div className="card-head compact">
              <h2>Documentos fuente</h2>
              <button type="button" onClick={() => setSystemMessage("Subida real de Word/PDF pendiente de conectar con Storage y Content Factory.")}>Subir fuente</button>
            </div>
            <div className="source-doc-grid">
              <SourceDoc type="DOCX" title="Documento Word del curso" status="Pendiente de dividir" />
              <SourceDoc type="PDF" title="PDF base / manual académico" status="Pendiente de adaptar" />
              <SourceDoc type="NOTAS" title="Notas del autor y bibliografía" status="Preparado para curación" />
            </div>
          </article>
        </div>

        <aside className="content-side-column">
          <article className="content-side-card importer">
            <span>Importador preparado</span>
            <h2>Word / PDF</h2>
            <p>Convierte documentos fuente en módulos, lecciones, recursos y checklist de revisión.</p>
            <button type="button" onClick={() => setSystemMessage("Este importador será la puerta de entrada de GHC Content Factory.")}>Preparar importador</button>
          </article>

          <article className="content-side-card">
            <h2>Checklist de producción</h2>
            <ProductionCheck label="Documento fuente recibido" done />
            <ProductionCheck label="Estructura del curso definida" done={focusModules.length > 0} />
            <ProductionCheck label="Módulos creados" done={focusModules.length > 0} />
            <ProductionCheck label="Lecciones maquetadas" done={focusLessons.length > 0} />
            <ProductionCheck label="Recursos revisados" />
            <ProductionCheck label="Exámenes preparados" />
            <ProductionCheck label="Vista alumno aprobada" />
          </article>

          <article className="content-side-card">
            <h2>Factoría IA</h2>
            <p>Reservado para conectar GHC Content Factory: investigación, guiones, audio, vídeo, podcast, exámenes y paquetes listos para revisión.</p>
            <div className="factory-tags">
              <span>Guiones vídeo</span>
              <span>Audio curso</span>
              <span>Podcast</span>
              <span>Mini cursos</span>
              <span>Exámenes IA</span>
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
}

function SourceDoc({ type, title, status }: { type: string; title: string; status: string }) {
  return (
    <div className="source-doc-card">
      <span>{type}</span>
      <strong>{title}</strong>
      <p>{status}</p>
    </div>
  );
}

function ProductionCheck({ label, done = false }: { label: string; done?: boolean }) {
  return (
    <div className={done ? "production-check done" : "production-check"}>
      <span>{done ? "✓" : "○"}</span>
      <p>{label}</p>
    </div>
  );
}

function createPlaceholderModules(): AnyRecord[] {
  return [
    { id: "placeholder-1", title: "Fundamentos y contexto" },
    { id: "placeholder-2", title: "Desarrollo del contenido principal" },
    { id: "placeholder-3", title: "Aplicación práctica y evaluación" },
  ];
}

function ComingSoon({ tab }: { tab: AdminTab }) { return <section className="coming-soon"><p className="admin-kicker">Módulo administrador</p><h1>{getTabLabel(tab)}</h1><p>Esta pestaña se construirá manteniendo la misma estética premium del área Alumno y del Panel administrador. La arquitectura ya queda preparada para hacerla funcional por fases.</p></section>; }
function ChartSvg() { return <svg viewBox="0 0 900 260" aria-hidden="true"><defs><linearGradient id="adminChartGradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={GREEN} stopOpacity="0.42" /><stop offset="100%" stopColor={GREEN} stopOpacity="0" /></linearGradient></defs><path d="M30 220 L110 190 L190 180 L270 135 L350 128 L430 86 L510 105 L590 92 L670 118 L750 72 L850 52" fill="none" stroke={GREEN} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /><path d="M30 220 L110 190 L190 180 L270 135 L350 128 L430 86 L510 105 L590 92 L670 118 L750 72 L850 52 L850 250 L30 250 Z" fill="url(#adminChartGradient)" /><path d="M30 185 L110 208 L190 174 L270 142 L350 118 L430 78 L510 108 L590 82 L670 98 L750 62 L850 88" fill="none" stroke="rgba(244,246,242,.42)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function Background() { return <div className="admin-background" aria-hidden="true"><div className="admin-orb one" /><div className="admin-orb two" /><div className="admin-grid-texture" /></div>; }

function isVisibleCourse(course: AnyRecord) { return normalizeCourseStatus(course) !== "hidden"; }
function normalizeCourseStatus(course: AnyRecord): "published" | "draft" | "hidden" { const status = String(course.status || course.visibility || "").toLowerCase(); if (["draft", "borrador"].includes(status)) return "draft"; if (["hidden", "oculto", "archived", "archivado", "inactive", "inactivo"].includes(status)) return "hidden"; if (course.is_published === false || course.published === false) return "draft"; return "published"; }
function getCourseStatusLabel(status: string) { if (status === "draft") return "Borrador"; if (status === "hidden") return "Oculto"; return "Publicado"; }
function formatCoursePrice(course: AnyRecord) { const raw = course.price ?? course.amount ?? course.sale_price ?? null; const currency = String(course.currency || "€"); if (raw === null || raw === undefined || raw === "") return "Sin precio"; const numeric = Number(raw); if (Number.isFinite(numeric)) { if (["EUR", "eur", "€"].includes(currency)) return `${numeric.toLocaleString("es-ES")}€`; if (["USD", "usd", "$"].includes(currency)) return `$${numeric.toLocaleString("es-ES")}`; return `${numeric.toLocaleString("es-ES")} ${currency}`; } return String(raw); }
function getCourseImage(course: AnyRecord) { return course?.cover_image || course?.cover_image_url || course?.image || course?.image_url || course?.thumbnail || course?.thumbnail_url || ""; }
function getCourseBackground(item: CourseAdminView, index: number) { const realImage = item.image; const fallbacks = ["https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1200&q=80"]; const selected = realImage || fallbacks[index % fallbacks.length]; return `linear-gradient(180deg, rgba(5,7,6,0.08), rgba(5,7,6,0.92)), url(${selected})`; }
function formatNumber(value: number) { return new Intl.NumberFormat("es-ES").format(value || 0); }
function formatShortDate(value?: string | null) { if (!value) return "Sin fecha"; try { return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)); } catch { return "Sin fecha"; } }
function formatRelative(value?: string | null) { if (!value) return "Reciente"; try { const date = new Date(value); const diff = Date.now() - date.getTime(); const minutes = Math.floor(diff / 60000); const hours = Math.floor(minutes / 60); const days = Math.floor(hours / 24); if (minutes < 1) return "Ahora"; if (minutes < 60) return `Hace ${minutes} min`; if (hours < 24) return `Hace ${hours} h`; if (days < 7) return `Hace ${days} días`; return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(date); } catch { return "Reciente"; } }
function getTabLabel(tab: AdminTab) { const found = adminTabs.find((item) => item.id === tab); return found?.label || "Panel"; }
function getInitials(name: string) { return String(name).split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function shortName(name: string) { return String(name).split("@")[0].split(" ")[0] || "Admin"; }

function GlobalStyles() {
  return (
    <style>{`
      :root { --green:#63e546; --bg:#050706; --panel:rgba(10,14,12,.88); --line:rgba(255,255,255,.085); --white:#f4f6f2; --muted:rgba(244,246,242,.64); --soft:rgba(244,246,242,.42); --danger:#ff5757; --warning:#f7c948; }
      *{box-sizing:border-box} html,body{margin:0;padding:0;background:var(--bg)} body{color:var(--white);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif} button,input,select{font:inherit}
      .admin-page{min-height:100vh;display:grid;grid-template-columns:292px minmax(0,1fr);background:var(--bg);color:var(--white);position:relative}.admin-loading{min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--white);position:relative}.admin-loading-card{position:relative;z-index:2;width:min(560px,calc(100vw - 40px));border:1px solid var(--line);border-radius:28px;background:linear-gradient(145deg,rgba(255,255,255,.08),rgba(255,255,255,.025));padding:34px;box-shadow:0 30px 90px rgba(0,0,0,.45)}.admin-loading-card h1{margin:18px 0 0;font-size:38px;line-height:.95;letter-spacing:-.055em}.admin-loading-card p{margin:16px 0 0;color:var(--muted);font-size:16px}
      .admin-background{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:0}.admin-orb{position:absolute;width:520px;height:520px;border-radius:999px;filter:blur(110px)}.admin-orb.one{left:-180px;top:-180px;background:rgba(99,229,70,.09)}.admin-orb.two{right:-240px;top:120px;background:rgba(255,255,255,.055)}.admin-grid-texture{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);background-size:42px 42px;opacity:.5;mask-image:radial-gradient(circle at center,black 0%,transparent 84%)}
      .admin-sidebar{position:sticky;top:0;height:100vh;z-index:2;border-right:1px solid var(--line);background:linear-gradient(180deg,rgba(5,8,7,.97),rgba(3,5,4,.94));padding:22px;display:flex;flex-direction:column;justify-content:space-between}.admin-logo{min-height:58px;display:flex;align-items:center;margin-bottom:24px}.admin-nav{display:grid;gap:6px}.admin-nav-item{width:100%;min-height:47px;border:1px solid transparent;background:transparent;color:rgba(244,246,242,.65);border-radius:13px;padding:0 13px;display:flex;align-items:center;gap:12px;cursor:pointer;text-align:left;transition:.18s ease}.admin-nav-item:hover{color:var(--white);background:rgba(255,255,255,.035)}.admin-nav-item.active{color:var(--green);background:linear-gradient(90deg,rgba(99,229,70,.15),rgba(99,229,70,.035));border-color:rgba(99,229,70,.16);box-shadow:inset 3px 0 0 var(--green)}.admin-nav-icon{width:24px;color:currentColor;font-weight:900;display:inline-flex;justify-content:center}.admin-nav-item strong{display:block;font-size:13px;line-height:1.05}.admin-nav-item small{display:block;margin-top:3px;color:var(--soft);font-size:11px}.admin-sidebar-bottom{display:grid;gap:14px}
      .support-card,.admin-user-card{border:1px solid var(--line);border-radius:18px;background:rgba(255,255,255,.035);padding:16px}.support-card{display:grid;grid-template-columns:40px minmax(0,1fr);gap:12px}.support-card button{grid-column:1/-1;min-height:38px;border-radius:10px;border:1px solid rgba(99,229,70,.28);color:var(--green);background:rgba(99,229,70,.06);cursor:pointer;font-weight:850}.support-icon,.admin-user-card>span{width:40px;height:40px;border-radius:999px;display:grid;place-items:center;background:rgba(99,229,70,.1);color:var(--green);border:1px solid rgba(99,229,70,.18);font-weight:950}.support-card p,.admin-user-card p{margin:3px 0 0;color:var(--muted);font-size:12px}.admin-user-card{display:grid;grid-template-columns:42px minmax(0,1fr);gap:12px;align-items:center}
      .admin-shell{position:relative;z-index:1;min-width:0;padding:18px 20px 30px}.admin-topbar{min-height:58px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:18px}.breadcrumb{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:13px;font-weight:850;white-space:nowrap}.breadcrumb strong{color:var(--white)}.topbar-actions{display:flex;align-items:center;gap:10px;min-width:0}.admin-search{width:320px;max-width:32vw;height:40px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--muted);display:flex;align-items:center;padding:0 16px;font-size:13px}.create-btn,.studio-top-btn{min-height:40px;border-radius:999px;padding:0 16px;cursor:pointer;font-weight:900}.create-btn{border:0;background:var(--green);color:#061008}.studio-top-btn{border:1px solid rgba(99,229,70,.24);background:rgba(99,229,70,.07);color:var(--green)}.icon-btn{width:40px;height:40px;border-radius:999px;border:1px solid var(--line);color:var(--white);background:rgba(255,255,255,.035);cursor:pointer}.topbar-user{display:flex;align-items:center;gap:10px}.topbar-user>span{width:42px;height:42px;border-radius:999px;display:grid;place-items:center;background:rgba(99,229,70,.11);color:var(--green);font-weight:950}.topbar-user p{margin:2px 0 0;color:var(--muted);font-size:12px}.admin-notice{margin-bottom:14px;border-radius:14px;border:1px solid rgba(99,229,70,.2);background:rgba(99,229,70,.055);color:var(--muted);padding:14px 16px}
      .panel-page,.courses-admin-page{display:grid;gap:16px}.admin-hero,.courses-hero{min-height:128px;border:1px solid var(--line);border-radius:22px;background:linear-gradient(90deg,rgba(9,13,11,.98),rgba(9,13,11,.76)),radial-gradient(circle at 80% 20%,rgba(99,229,70,.13),transparent 30%);display:flex;align-items:center;justify-content:space-between;padding:26px;overflow:hidden;position:relative;box-shadow:0 28px 90px rgba(0,0,0,.22)}.admin-kicker{margin:0 0 10px;color:var(--green);text-transform:uppercase;letter-spacing:.18em;font-size:11px;font-weight:950}.admin-hero h1,.courses-hero h1{margin:0;font-size:clamp(36px,4vw,54px);line-height:.94;letter-spacing:-.06em;font-weight:950}.admin-hero p:not(.admin-kicker),.courses-hero p:not(.admin-kicker){margin:12px 0 0;color:var(--muted);line-height:1.6;max-width:760px}.hero-athlete{width:360px;height:130px;opacity:.62;background:radial-gradient(circle at 45% 50%,rgba(244,246,242,.18),transparent 22%),radial-gradient(circle at 58% 42%,rgba(244,246,242,.12),transparent 18%),radial-gradient(circle at 70% 34%,rgba(244,246,242,.1),transparent 14%),linear-gradient(120deg,transparent 20%,rgba(99,229,70,.18),transparent 60%);clip-path:polygon(4% 70%,22% 48%,40% 55%,58% 20%,83% 30%,100% 14%,85% 42%,66% 40%,50% 70%,26% 65%,8% 88%)}.courses-hero-panel{width:360px;border-radius:18px;border:1px solid rgba(99,229,70,.2);background:rgba(99,229,70,.055);padding:18px}.courses-hero-panel span{color:var(--green);font-size:11px;text-transform:uppercase;letter-spacing:.16em;font-weight:950}.courses-hero-panel strong{display:block;margin-top:8px;font-size:20px;line-height:1.12}.courses-hero-panel p{color:var(--muted);line-height:1.5;font-size:13px}.courses-hero-panel button{min-height:40px;border:0;border-radius:999px;background:var(--green);color:#061008;font-weight:950;padding:0 16px;cursor:pointer}
      .kpi-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.kpi-card,.growth-card,.quick-actions-card,.activity-card,.platform-card,.review-card,.studio-card,.coming-soon,.course-stat-card,.course-toolbar,.admin-course-card,.courses-empty,.course-side-card{border:1px solid var(--line);border-radius:18px;background:var(--panel);box-shadow:0 22px 70px rgba(0,0,0,.18)}.kpi-card{min-height:136px;padding:16px;overflow:hidden}.kpi-top{display:flex;align-items:center;justify-content:space-between;color:var(--muted);font-size:13px}.kpi-top em{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:rgba(99,229,70,.09);color:var(--green);border:1px solid rgba(99,229,70,.14);font-style:normal;font-weight:950}.kpi-card.danger .kpi-top em{color:var(--danger);background:rgba(255,87,87,.08);border-color:rgba(255,87,87,.16)}.kpi-card.muted .kpi-top em{color:var(--soft);background:rgba(255,255,255,.045)}.kpi-card>strong{display:block;margin-top:12px;font-size:29px;letter-spacing:-.045em}.kpi-card p{margin:6px 0 0;color:var(--green);font-size:12px;font-weight:850}.kpi-card.danger p{color:var(--danger)}.kpi-card.muted p{color:var(--muted)}.sparkline{height:28px;margin-top:12px;background:linear-gradient(90deg,rgba(99,229,70,.12),rgba(99,229,70,.5),rgba(99,229,70,.18));clip-path:polygon(0 64%,12% 50%,22% 58%,34% 34%,47% 46%,62% 24%,78% 28%,100% 8%,100% 100%,0 100%);opacity:.75}.danger .sparkline{background:linear-gradient(90deg,rgba(255,87,87,.12),rgba(255,87,87,.55),rgba(255,87,87,.18))}.muted .sparkline{background:linear-gradient(90deg,rgba(255,255,255,.04),rgba(255,255,255,.18),rgba(255,255,255,.07))}
      .admin-main-grid{display:grid;grid-template-columns:1.18fr .95fr;gap:14px}.growth-card{padding:18px;min-height:370px}.card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:14px}.card-head.compact{align-items:center}.card-head h2,.quick-actions-card h2,.platform-card h2,.studio-card h2,.coming-soon h1,.section-title-row h2,.course-side-card h2{margin:0;font-size:21px;line-height:1.05;letter-spacing:-.035em}.card-head p,.section-title-row p{margin:6px 0 0;color:var(--muted);font-size:13px}.card-head button,.section-title-row button{min-height:34px;border-radius:10px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--white);padding:0 12px;cursor:pointer}.chart-area{min-height:230px;border:1px solid rgba(255,255,255,.06);border-radius:16px;background:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);background-size:50px 50px;overflow:hidden}.chart-area svg{width:100%;height:230px;display:block}.chart-summary{margin-top:14px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid var(--line);border-radius:14px;overflow:hidden}.mini-metric{padding:13px 14px;border-right:1px solid var(--line);min-width:0}.mini-metric:last-child{border-right:0}.mini-metric span{display:block;color:var(--muted);font-size:12px}.mini-metric strong{display:inline-block;margin-top:5px;font-size:19px}.mini-metric em{color:var(--green);margin-left:8px;font-style:normal;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.08em}
      .quick-actions-card,.activity-card,.platform-card,.review-card,.studio-card{padding:18px}.quick-actions-grid{margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:12px}.quick-action{min-height:76px;border-radius:14px;border:1px solid var(--line);background:rgba(255,255,255,.028);color:var(--white);display:grid;grid-template-columns:42px minmax(0,1fr) 18px;gap:12px;align-items:center;padding:12px;cursor:pointer;text-align:left}.quick-action:hover{border-color:rgba(99,229,70,.24);background:rgba(99,229,70,.055)}.quick-action>span,.activity-item>span,.review-item>span{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:rgba(99,229,70,.09);color:var(--green);border:1px solid rgba(99,229,70,.16);font-weight:950}.quick-action p,.activity-item p,.review-item p,.studio-card p{margin:4px 0 0;color:var(--muted);font-size:12px;line-height:1.45}.quick-action em{color:var(--muted);font-style:normal;font-size:22px}.activity-card{min-height:290px}.activity-item,.review-item{display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 0;border-top:1px solid rgba(255,255,255,.055)}.activity-item em{color:var(--muted);font-style:normal;font-size:12px}.platform-card{min-height:230px}.platform-body{display:grid;grid-template-columns:112px minmax(0,1fr);gap:18px;align-items:center;margin-top:18px}.shield{width:106px;height:106px;border-radius:30px;display:grid;place-items:center;color:var(--green);font-size:44px;background:radial-gradient(circle,rgba(99,229,70,.2),rgba(99,229,70,.04));border:1px solid rgba(99,229,70,.18)}.status-list{display:grid;gap:11px}.status-row{display:flex;justify-content:space-between;gap:12px;color:var(--muted)}.status-row strong{color:var(--green)}.status-row.warning strong{color:var(--warning)}.platform-progress{margin-top:18px;display:flex;justify-content:space-between;border-top:1px solid var(--line);padding-top:14px;color:var(--muted)}.platform-progress strong{color:var(--white)}.review-item em{border-radius:999px;padding:5px 8px;background:rgba(99,229,70,.1);color:var(--green);font-style:normal;font-size:11px;font-weight:900}.studio-card{grid-column:2/3;display:grid;grid-template-columns:minmax(0,1fr) 180px;gap:18px;align-items:center;background:radial-gradient(circle at 78% 50%,rgba(99,229,70,.11),transparent 34%),var(--panel)}.studio-card button{margin-top:14px;min-height:42px;border-radius:10px;border:1px solid rgba(99,229,70,.32);background:rgba(99,229,70,.08);color:var(--green);font-weight:900;cursor:pointer;padding:0 16px}.studio-visual{height:104px;border-radius:14px;border:1px solid var(--line);background:rgba(255,255,255,.035);padding:16px;display:grid;gap:10px}.studio-visual div,.studio-visual span{border-radius:8px;background:rgba(255,255,255,.12)}.studio-visual div{height:36px;position:relative}.studio-visual div:after{content:"";position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);border-left:10px solid var(--green);border-top:7px solid transparent;border-bottom:7px solid transparent}.studio-visual span{height:9px}
      .course-stats-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}.course-stat-card{padding:16px;min-height:118px}.course-stat-card span{color:var(--muted);font-size:12px;font-weight:800}.course-stat-card strong{display:block;margin-top:9px;font-size:30px;letter-spacing:-.045em}.course-stat-card p{color:var(--muted);margin:6px 0 0;font-size:12px}.course-toolbar{min-height:62px;padding:10px;display:grid;grid-template-columns:minmax(260px,1fr) 210px auto;gap:10px;align-items:center}.course-search{min-height:42px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.035);display:flex;align-items:center;gap:10px;padding:0 14px;color:var(--muted)}.course-search input{flex:1;min-width:0;height:40px;background:transparent;border:0;outline:0;color:var(--white)}.course-toolbar select{min-height:42px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--white);padding:0 14px}.course-toolbar option{background:#080b0a;color:var(--white)}.course-view-toggle{height:42px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.035);padding:4px;display:flex;gap:4px}.course-view-toggle button{border:0;border-radius:999px;padding:0 14px;background:transparent;color:var(--muted);cursor:pointer;font-weight:900}.course-view-toggle button.active{background:rgba(99,229,70,.14);color:var(--green)}.courses-layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:14px;align-items:start}.courses-main-column,.courses-side-column{display:grid;gap:14px}.section-title-row{display:flex;justify-content:space-between;align-items:center;gap:18px}.admin-course-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:14px}.admin-course-list{display:grid;gap:12px}.admin-course-card{overflow:hidden;display:grid;grid-template-rows:168px 1fr}.admin-course-card.list{grid-template-columns:310px minmax(0,1fr);grid-template-rows:1fr}.admin-course-cover{position:relative;min-height:168px;background-size:cover;background-position:center;filter:grayscale(.55) contrast(1.06) brightness(.78)}.course-status-pill{position:absolute;left:14px;top:14px;border-radius:999px;padding:7px 10px;font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.12em;border:1px solid rgba(99,229,70,.28);background:rgba(99,229,70,.12);color:var(--green)}.course-status-pill.draft{border-color:rgba(247,201,72,.28);background:rgba(247,201,72,.1);color:var(--warning)}.course-status-pill.hidden{border-color:rgba(255,255,255,.12);background:rgba(255,255,255,.055);color:var(--muted)}.admin-course-body{padding:16px;display:grid;gap:14px}.course-title-row{display:flex;justify-content:space-between;gap:12px}.course-title-row h3{margin:0;font-size:23px;line-height:1.05;letter-spacing:-.035em}.course-title-row p{margin:8px 0 0;color:var(--muted);line-height:1.45;font-size:13px}.course-title-row button{width:36px;height:36px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--muted);cursor:pointer}
      .course-info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.course-info-box{border:1px solid rgba(255,255,255,.07);border-radius:12px;background:rgba(0,0,0,.16);padding:10px;min-width:0;min-height:62px}.course-info-box span{display:block;color:var(--soft);font-size:10px;text-transform:uppercase;letter-spacing:.12em;font-weight:900;white-space:normal;overflow:visible;text-overflow:initial;line-height:1.2}.course-info-box strong{display:block;margin-top:5px;color:var(--white);font-size:13px;white-space:normal;overflow:visible;text-overflow:initial;line-height:1.25}.course-build-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.course-build-row div{border-radius:12px;border:1px solid rgba(99,229,70,.13);background:rgba(99,229,70,.045);padding:11px}.course-build-row strong{display:block;font-size:24px;line-height:1}.course-build-row span{display:block;color:var(--muted);font-size:12px;margin-top:4px}.course-progress-block{display:grid;gap:8px}.course-progress-block>div:first-child{display:flex;justify-content:space-between;color:var(--muted);font-size:12px;font-weight:800}.course-progress-block strong{color:var(--green)}.course-progress-track{height:8px;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}.course-progress-track div{height:100%;border-radius:999px;background:var(--green);box-shadow:0 0 20px rgba(99,229,70,.28)}.admin-course-actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}.admin-course-actions button{min-height:38px;border-radius:10px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--white);cursor:pointer;font-weight:850;font-size:12px}.admin-course-actions button:first-child{background:var(--green);color:#061008;border-color:transparent}.courses-empty{padding:28px;text-align:center}.courses-empty span{width:58px;height:58px;border-radius:18px;display:grid;place-items:center;margin:0 auto 14px;color:var(--green);border:1px solid rgba(99,229,70,.2);background:rgba(99,229,70,.07);font-size:28px}.courses-empty h3{margin:0;font-size:24px}.courses-empty p{color:var(--muted);line-height:1.6}.course-side-card{padding:18px}.course-side-card>button{width:100%;min-height:42px;margin-top:10px;border-radius:11px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--white);cursor:pointer;font-weight:850}.course-side-card>button:first-of-type{background:var(--green);color:#061008;border-color:transparent}.catalog-ring{width:138px;height:138px;border-radius:999px;margin:18px auto;display:grid;place-items:center;align-content:center;border:12px solid rgba(99,229,70,.22);box-shadow:inset 0 0 0 2px rgba(255,255,255,.04)}.catalog-ring strong{font-size:38px;line-height:1}.catalog-ring span{color:var(--muted);font-size:12px;margin-top:4px}.catalog-status-list{display:grid;gap:10px}.course-next-list{display:grid;grid-template-columns:30px minmax(0,1fr);gap:12px;margin-top:14px}.course-next-list span{width:30px;height:30px;border-radius:999px;display:grid;place-items:center;background:rgba(99,229,70,.1);color:var(--green);border:1px solid rgba(99,229,70,.18);font-weight:950}.course-next-list p{margin:0;color:var(--muted);line-height:1.45;font-size:13px}
      .content-admin-page{display:grid;gap:16px}.content-hero{min-height:128px;border:1px solid var(--line);border-radius:22px;background:linear-gradient(90deg,rgba(9,13,11,.98),rgba(9,13,11,.76)),radial-gradient(circle at 80% 20%,rgba(99,229,70,.13),transparent 30%);display:flex;align-items:center;justify-content:space-between;padding:26px;overflow:hidden;position:relative;box-shadow:0 28px 90px rgba(0,0,0,.22)}.content-hero h1{margin:0;font-size:clamp(36px,4vw,54px);line-height:.94;letter-spacing:-.06em;font-weight:950}.content-hero p:not(.admin-kicker){margin:12px 0 0;color:var(--muted);line-height:1.6;max-width:760px}.content-hero-panel{width:380px;border-radius:18px;border:1px solid rgba(99,229,70,.2);background:rgba(99,229,70,.055);padding:18px}.content-hero-panel span{color:var(--green);font-size:11px;text-transform:uppercase;letter-spacing:.16em;font-weight:950}.content-hero-panel strong{display:block;margin-top:8px;font-size:20px;line-height:1.12}.content-hero-panel p{color:var(--muted);line-height:1.5;font-size:13px}.content-hero-panel button{min-height:40px;border:0;border-radius:999px;background:var(--green);color:#061008;font-weight:950;padding:0 16px;cursor:pointer}.content-stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.content-layout{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:14px;align-items:start}.content-main-column,.content-side-column{display:grid;gap:14px}.production-board-card,.module-map-card,.source-docs-card,.content-side-card{border:1px solid var(--line);border-radius:18px;background:var(--panel);box-shadow:0 22px 70px rgba(0,0,0,.18);padding:18px}.production-course-list{display:grid;gap:10px}.production-course{display:grid;grid-template-columns:38px minmax(0,1fr) 54px;gap:12px;align-items:center;min-height:70px;border-radius:14px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.028);padding:12px}.production-course.active{border-color:rgba(99,229,70,.26);background:rgba(99,229,70,.065)}.production-course>span{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;color:var(--green);background:rgba(99,229,70,.09);border:1px solid rgba(99,229,70,.18);font-weight:950}.production-course strong{display:block}.production-course p{margin:5px 0 0;color:var(--muted);font-size:12px}.production-course em{font-style:normal;color:var(--green);font-weight:950}.module-map-list{display:grid;gap:10px}.module-map-row{display:grid;grid-template-columns:52px minmax(0,1fr) 82px;gap:12px;align-items:center;min-height:74px;border-radius:14px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.026);padding:12px}.module-map-row.current{border-color:rgba(99,229,70,.32);background:linear-gradient(90deg,rgba(99,229,70,.09),rgba(255,255,255,.024))}.module-index{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;background:rgba(99,229,70,.09);color:var(--green);border:1px solid rgba(99,229,70,.18);font-weight:950}.module-map-row p{margin:5px 0 0;color:var(--muted);font-size:12px}.module-map-row button{min-height:36px;border-radius:10px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--white);cursor:pointer;font-weight:850}.source-doc-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.source-doc-card{min-height:130px;border-radius:16px;border:1px solid rgba(255,255,255,.08);background:radial-gradient(circle at top right,rgba(99,229,70,.12),transparent 34%),rgba(255,255,255,.028);padding:16px;display:grid;align-content:center}.source-doc-card span{width:max-content;border-radius:999px;padding:6px 9px;background:rgba(99,229,70,.1);border:1px solid rgba(99,229,70,.22);color:var(--green);font-size:10px;font-weight:950;letter-spacing:.12em}.source-doc-card strong{display:block;margin-top:14px;font-size:18px;line-height:1.1}.source-doc-card p{margin:8px 0 0;color:var(--muted);font-size:12px}.content-side-card.importer{background:radial-gradient(circle at 78% 20%,rgba(99,229,70,.16),transparent 34%),var(--panel)}.content-side-card>span{color:var(--green);font-size:11px;text-transform:uppercase;letter-spacing:.16em;font-weight:950}.content-side-card h2{margin:8px 0 0;font-size:22px;line-height:1.05;letter-spacing:-.035em}.content-side-card p{color:var(--muted);line-height:1.58;font-size:13px}.content-side-card button{width:100%;min-height:42px;border-radius:11px;border:1px solid rgba(99,229,70,.28);background:rgba(99,229,70,.08);color:var(--green);cursor:pointer;font-weight:900}.production-check{display:grid;grid-template-columns:28px minmax(0,1fr);gap:10px;align-items:center;padding:10px 0;border-top:1px solid rgba(255,255,255,.055)}.production-check span{width:26px;height:26px;border-radius:999px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.12);color:var(--soft);font-weight:950}.production-check.done span{border-color:rgba(99,229,70,.28);background:rgba(99,229,70,.1);color:var(--green)}.production-check p{margin:0;color:var(--muted)}.production-check.done p{color:var(--white)}.factory-tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.factory-tags span{border-radius:999px;border:1px solid rgba(99,229,70,.18);background:rgba(99,229,70,.065);color:var(--green);padding:7px 9px;font-size:11px;font-weight:900}

.students-admin-page{display:grid;gap:16px}.students-hero{min-height:128px;border:1px solid var(--line);border-radius:22px;background:linear-gradient(90deg,rgba(9,13,11,.98),rgba(9,13,11,.76)),radial-gradient(circle at 80% 20%,rgba(99,229,70,.13),transparent 30%);display:flex;align-items:center;justify-content:space-between;padding:26px;overflow:hidden;position:relative;box-shadow:0 28px 90px rgba(0,0,0,.22)}.students-hero h1{margin:0;font-size:clamp(36px,4vw,54px);line-height:.94;letter-spacing:-.06em;font-weight:950}.students-hero p:not(.admin-kicker){margin:12px 0 0;color:var(--muted);line-height:1.6;max-width:760px}.students-hero-panel{width:390px;border-radius:18px;border:1px solid rgba(99,229,70,.2);background:rgba(99,229,70,.055);padding:18px}.students-hero-panel span{color:var(--green);font-size:11px;text-transform:uppercase;letter-spacing:.16em;font-weight:950}.students-hero-panel strong{display:block;margin-top:8px;font-size:20px;line-height:1.12}.students-hero-panel p{color:var(--muted);line-height:1.5;font-size:13px}.students-hero-panel button{min-height:40px;border:0;border-radius:999px;background:var(--green);color:#061008;font-weight:950;padding:0 16px;cursor:pointer}.student-stats-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}.student-stat-card{border:1px solid var(--line);border-radius:18px;background:var(--panel);box-shadow:0 22px 70px rgba(0,0,0,.18);padding:16px;min-height:118px}.student-stat-card span{color:var(--muted);font-size:12px;font-weight:800}.student-stat-card strong{display:block;margin-top:9px;font-size:30px;letter-spacing:-.045em}.student-stat-card p{color:var(--muted);margin:6px 0 0;font-size:12px}.student-stat-card.danger strong{color:var(--danger)}.student-stat-card.warning strong{color:var(--warning)}.student-toolbar{min-height:62px;border:1px solid var(--line);border-radius:18px;background:var(--panel);box-shadow:0 22px 70px rgba(0,0,0,.18);padding:10px;display:grid;grid-template-columns:minmax(260px,1fr) auto auto;gap:10px;align-items:center}.student-search{min-height:42px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.035);display:flex;align-items:center;gap:10px;padding:0 14px;color:var(--muted)}.student-search input{flex:1;min-width:0;height:40px;background:transparent;border:0;outline:0;color:var(--white)}.student-toolbar button{min-height:42px;border-radius:999px;border:1px solid rgba(99,229,70,.22);background:rgba(99,229,70,.07);color:var(--green);font-weight:900;padding:0 14px;cursor:pointer}.students-layout{display:grid;grid-template-columns:minmax(0,1fr) 390px;gap:14px;align-items:start}.students-list-card,.student-detail-card{border:1px solid var(--line);border-radius:18px;background:var(--panel);box-shadow:0 22px 70px rgba(0,0,0,.18);padding:18px}.students-list{display:grid;gap:10px;margin-top:14px}.student-row{width:100%;min-height:86px;border-radius:15px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.026);color:var(--white);display:grid;grid-template-columns:46px minmax(0,1.25fr) 96px 128px 138px;gap:12px;align-items:center;padding:12px;text-align:left;cursor:pointer}.student-row:hover,.student-row.active{border-color:rgba(99,229,70,.28);background:rgba(99,229,70,.055)}.student-avatar{width:46px;height:46px;border-radius:999px;display:grid;place-items:center;background:rgba(99,229,70,.1);color:var(--green);border:1px solid rgba(99,229,70,.18);font-weight:950}.student-main-info strong{display:block;font-size:15px}.student-main-info p,.student-progress-mini span,.student-risk span,.student-commercial-mini span{margin:4px 0 0;color:var(--muted);font-size:12px}.student-progress-mini strong,.student-commercial-mini strong{display:block;color:var(--white);font-size:18px}.student-risk{border-radius:12px;padding:9px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.025)}.student-risk strong{display:block;font-size:13px}.student-risk.green strong{color:var(--green)}.student-risk.yellow strong{color:var(--warning)}.student-risk.red strong{color:var(--danger)}.student-risk.muted strong{color:var(--muted)}.student-commercial-mini{border-left:1px solid rgba(255,255,255,.06);padding-left:12px}.students-empty{text-align:center;padding:28px}.students-empty span{width:58px;height:58px;border-radius:18px;display:grid;place-items:center;margin:0 auto 14px;color:var(--green);border:1px solid rgba(99,229,70,.2);background:rgba(99,229,70,.07);font-size:28px}.students-empty h3{margin:0;font-size:24px}.students-empty p{color:var(--muted);line-height:1.6}.student-detail-column{position:sticky;top:86px}.student-detail-head{display:grid;grid-template-columns:62px minmax(0,1fr);gap:14px;align-items:center}.student-detail-head>span{width:62px;height:62px;border-radius:20px;display:grid;place-items:center;background:rgba(99,229,70,.1);color:var(--green);border:1px solid rgba(99,229,70,.2);font-size:22px;font-weight:950}.student-detail-head h2{margin:0;font-size:26px;letter-spacing:-.04em;line-height:1}.student-detail-head p:not(.admin-kicker){margin:6px 0 0;color:var(--muted);font-size:13px}.student-detail-section{margin-top:16px;border-top:1px solid rgba(255,255,255,.07);padding-top:16px}.student-detail-section h3{margin:0 0 12px;font-size:17px;letter-spacing:-.02em}.student-detail-grid,.commercial-grid,.follow-up-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.detail-metric{border:1px solid rgba(255,255,255,.07);border-radius:12px;background:rgba(0,0,0,.16);padding:10px;min-width:0}.detail-metric span{display:block;color:var(--soft);font-size:10px;text-transform:uppercase;letter-spacing:.1em;font-weight:900}.detail-metric strong{display:block;margin-top:5px;color:var(--white);font-size:14px;line-height:1.25;overflow:hidden;text-overflow:ellipsis}.student-progress-track{height:9px;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden;margin-top:12px}.student-progress-track div{height:100%;border-radius:999px;background:var(--green);box-shadow:0 0 20px rgba(99,229,70,.28)}.student-note{color:var(--muted);font-size:13px;line-height:1.5}.student-note strong{color:var(--white)}.loyalty-actions,.follow-up-actions{display:grid;grid-template-columns:1fr;gap:8px;margin-top:12px}.loyalty-actions button,.follow-up-actions button{min-height:39px;border-radius:11px;border:1px solid rgba(99,229,70,.22);background:rgba(99,229,70,.07);color:var(--green);font-weight:900;cursor:pointer}.follow-up-status{border-radius:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.026);padding:12px;margin-bottom:10px}.follow-up-status strong{display:block;font-size:18px}.follow-up-status span{display:block;margin-top:4px;color:var(--muted);font-size:12px}.follow-up-status.green strong{color:var(--green)}.follow-up-status.yellow strong{color:var(--warning)}.follow-up-status.red strong{color:var(--danger)}.follow-up-status.muted strong{color:var(--muted)}
.coming-soon{min-height:420px;padding:34px;display:grid;align-content:center}.coming-soon p:not(.admin-kicker){max-width:720px;color:var(--muted);line-height:1.7}
      @media(max-width:1460px){.student-stats-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.students-layout{grid-template-columns:1fr}.student-detail-column{position:static}.student-row{grid-template-columns:46px minmax(0,1fr) 90px 120px}.student-commercial-mini{display:none}.content-stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.content-layout{grid-template-columns:1fr}.content-side-column{grid-template-columns:repeat(3,minmax(0,1fr))}.source-doc-grid{grid-template-columns:1fr}.content-hero{align-items:stretch;flex-direction:column}.content-hero-panel{width:100%}.course-stats-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.courses-layout{grid-template-columns:1fr}.courses-side-column{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:1380px){.kpi-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.admin-main-grid{grid-template-columns:1fr}.studio-card{grid-column:auto}}@media(max-width:1080px){.student-toolbar,.student-stats-grid,.student-detail-grid,.commercial-grid,.follow-up-grid{grid-template-columns:1fr}.students-hero{align-items:stretch;flex-direction:column}.students-hero-panel{width:100%}.student-row{grid-template-columns:46px minmax(0,1fr)}.student-progress-mini,.student-risk,.student-commercial-mini{display:block;border-left:0;padding-left:0}.admin-page{grid-template-columns:1fr}.admin-sidebar{position:relative;height:auto}.topbar-actions{flex-wrap:wrap;justify-content:flex-end}.admin-search{width:100%;max-width:none}.chart-summary,.quick-actions-grid,.kpi-grid,.course-stats-grid,.courses-side-column,.course-info-grid,.course-build-row,.admin-course-actions{grid-template-columns:1fr}.admin-course-card.list{grid-template-columns:1fr}.course-toolbar{grid-template-columns:1fr}.courses-hero{align-items:stretch;flex-direction:column}.courses-hero-panel{width:100%}}
    `}</style>
  );
}
