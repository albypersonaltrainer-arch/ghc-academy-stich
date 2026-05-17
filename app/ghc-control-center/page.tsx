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
type PaymentSubTab = "resumen" | "transacciones" | "accesos" | "becas" | "finanzas" | "reportes";
type CommunicationSubTab = "mensajes" | "automatizaciones" | "audiencias" | "campanas" | "publicidad" | "plantillas";

type DashboardData = {
  profiles: AnyRecord[];
  courses: AnyRecord[];
  modules: AnyRecord[];
  lessons: AnyRecord[];
  certificates: AnyRecord[];
  courseCompletions: AnyRecord[];
  moduleCompletions: AnyRecord[];
  lessonProgress: AnyRecord[];
  exams: AnyRecord[];
  examQuestions: AnyRecord[];
  examResults: AnyRecord[];
  examAttempts: AnyRecord[];
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

type CertificateAdminView = {
  id: string;
  raw: AnyRecord;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  code: string;
  verificationPath: string;
  issuedAt: string;
  score: string;
  status: "valid" | "pending" | "revoked";
  statusLabel: string;
  downloadable: boolean;
  source: "real" | "pending";
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
  exams: [],
  examQuestions: [],
  examResults: [],
  examAttempts: [],
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
  const [paymentSubTab, setPaymentSubTab] = useState<PaymentSubTab>("resumen");
  const [financeSearch, setFinanceSearch] = useState("");
  const [financeGateway, setFinanceGateway] = useState("all");
  const [financeStatus, setFinanceStatus] = useState("all");
  const [financeAmountMin, setFinanceAmountMin] = useState("");
  const [financeAmountMax, setFinanceAmountMax] = useState("");
  const [communicationSubTab, setCommunicationSubTab] = useState<CommunicationSubTab>("mensajes");
  const [communicationSearch, setCommunicationSearch] = useState("");

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

        {activeTab === "examenes" ? (
          <ExamenesAdmin
            dashboardData={dashboardData}
            courseViews={courseViews}
            setActiveTab={setActiveTab}
            setSystemMessage={setSystemMessage}
          />
        ) : null}

        {activeTab === "certificados" ? (
          <CertificadosAdmin
            dashboardData={dashboardData}
            courseViews={courseViews}
            studentViews={studentViews}
            setActiveTab={setActiveTab}
            setSystemMessage={setSystemMessage}
          />
        ) : null}

        {activeTab === "pagos" ? (
          <PagosAdmin
            dashboardData={dashboardData}
            courseViews={courseViews}
            studentViews={studentViews}
            paymentSubTab={paymentSubTab}
            setPaymentSubTab={setPaymentSubTab}
            financeSearch={financeSearch}
            setFinanceSearch={setFinanceSearch}
            financeGateway={financeGateway}
            setFinanceGateway={setFinanceGateway}
            financeStatus={financeStatus}
            setFinanceStatus={setFinanceStatus}
            financeAmountMin={financeAmountMin}
            setFinanceAmountMin={setFinanceAmountMin}
            financeAmountMax={financeAmountMax}
            setFinanceAmountMax={setFinanceAmountMax}
            setActiveTab={setActiveTab}
            setSystemMessage={setSystemMessage}
          />
        ) : null}

        {activeTab === "comunicaciones" ? (
          <ComunicacionesAdmin
            dashboardData={dashboardData}
            courseViews={courseViews}
            studentViews={studentViews}
            communicationSubTab={communicationSubTab}
            setCommunicationSubTab={setCommunicationSubTab}
            communicationSearch={communicationSearch}
            setCommunicationSearch={setCommunicationSearch}
            setActiveTab={setActiveTab}
            setSystemMessage={setSystemMessage}
          />
        ) : null}

        {activeTab === "analitica" ? (
          <AnaliticaAdmin
            dashboardData={dashboardData}
            courseViews={courseViews}
            studentViews={studentViews}
            setActiveTab={setActiveTab}
            setSystemMessage={setSystemMessage}
          />
        ) : null}

        {!["panel", "cursos", "contenido", "alumnos", "examenes", "certificados", "pagos", "comunicaciones", "analitica"].includes(activeTab) ? <ComingSoon tab={activeTab} /> : null}
      </section>
    </main>
  );
}

async function loadDashboardData(): Promise<DashboardData> {
  const [
    profiles,
    courses,
    modules,
    lessons,
    certificates,
    courseCompletions,
    moduleCompletions,
    lessonProgress,
    exams,
    examQuestions,
    examResults,
    examAttempts,
  ] = await Promise.all([
    safeSelect("profiles", "*"),
    safeSelect("courses", "*"),
    safeSelect("modules", "*"),
    safeSelect("lessons", "*"),
    safeSelect("certificates", "*"),
    safeSelect("course_completions", "*"),
    safeSelect("module_completions", "*"),
    safeSelect("lesson_progress", "*"),
    safeSelect("exams", "*"),
    safeSelect("exam_questions", "*"),
    safeSelect("exam_results", "*"),
    safeSelect("exam_attempts", "*"),
  ]);

  return {
    profiles,
    courses,
    modules,
    lessons,
    certificates,
    courseCompletions,
    moduleCompletions,
    lessonProgress,
    exams,
    examQuestions,
    examResults,
    examAttempts,
  };
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


type ExamAdminView = {
  id: string;
  title: string;
  courseTitle: string;
  moduleTitle: string;
  status: "published" | "draft" | "review" | "ai";
  statusLabel: string;
  questions: number;
  attempts: number;
  passScore: number;
  duration: string;
  difficulty: string;
};

function buildExamAdminViews(data: DashboardData, courseViews: CourseAdminView[]): ExamAdminView[] {
  if (data.exams.length > 0) {
    return data.exams.map((exam, index) => {
      const course = courseViews.find((item) => String(item.id) === String(exam.course_id));
      const module = data.modules.find((item) => String(item.id) === String(exam.module_id));
      const questions = data.examQuestions.filter((item) => String(item.exam_id) === String(exam.id)).length;
      const attempts = data.examAttempts.filter((item) => String(item.exam_id) === String(exam.id)).length;
      const status = normalizeExamStatus(exam.status || exam.visibility || exam.review_status);

      return {
        id: String(exam.id || `exam-${index}`),
        title: String(exam.title || exam.name || `Examen ${index + 1}`),
        courseTitle: String(course?.title || exam.course_title || "Curso GHC Academy"),
        moduleTitle: String(module?.title || module?.name || exam.module_title || "Módulo asociado"),
        status,
        statusLabel: getExamStatusLabel(status),
        questions: questions || Number(exam.questions_count || exam.question_count || 0),
        attempts,
        passScore: Number(exam.pass_score || exam.minimum_score || exam.min_score || 70),
        duration: exam.duration_minutes ? `${exam.duration_minutes} min` : String(exam.duration || "45 min"),
        difficulty: String(exam.difficulty || exam.level || "Intermedio"),
      };
    });
  }

  const sourceModules = data.modules.length > 0 ? data.modules.slice(0, 5) : [
    { id: "m1", title: "Fundamentos del curso" },
    { id: "m2", title: "Aplicación práctica" },
    { id: "m3", title: "Evaluación técnica" },
  ];

  return sourceModules.map((module, index) => {
    const course = courseViews.find((item) => String(item.id) === String((module as AnyRecord).course_id));
    const status: ExamAdminView["status"] = index === 0 ? "draft" : index === 1 ? "ai" : "review";
    return {
      id: String((module as AnyRecord).id || `module-exam-${index}`),
      title: `Examen módulo ${index + 1}`,
      courseTitle: course?.title || "Curso en maquetación",
      moduleTitle: String((module as AnyRecord).title || (module as AnyRecord).name || `Módulo ${index + 1}`),
      status,
      statusLabel: getExamStatusLabel(status),
      questions: index === 0 ? 12 : index === 1 ? 0 : 8,
      attempts: 0,
      passScore: 70,
      duration: index === 0 ? "35 min" : "Pendiente",
      difficulty: index === 2 ? "Avanzado" : "Intermedio",
    };
  });
}

function normalizeExamStatus(value: unknown): ExamAdminView["status"] {
  const status = String(value || "").toLowerCase();
  if (["published", "publicado", "active", "activo"].includes(status)) return "published";
  if (["review", "revision", "pending", "pendiente"].includes(status)) return "review";
  if (["ai", "ia", "generated", "borrador ia"].includes(status)) return "ai";
  return "draft";
}

function getExamStatusLabel(status: ExamAdminView["status"]) {
  if (status === "published") return "Publicado";
  if (status === "review") return "Revisión";
  if (status === "ai") return "Borrador IA";
  return "Borrador";
}

function ExamenesAdmin({
  dashboardData,
  courseViews,
  setActiveTab,
  setSystemMessage,
}: {
  dashboardData: DashboardData;
  courseViews: CourseAdminView[];
  setActiveTab: (tab: AdminTab) => void;
  setSystemMessage: (message: string) => void;
}) {
  const examViews = buildExamAdminViews(dashboardData, courseViews);
  const published = examViews.filter((exam) => exam.status === "published").length;
  const review = examViews.filter((exam) => exam.status === "review" || exam.status === "ai").length;
  const totalQuestions = dashboardData.examQuestions.length || examViews.reduce((acc, exam) => acc + exam.questions, 0);
  const totalAttempts = dashboardData.examAttempts.length || examViews.reduce((acc, exam) => acc + exam.attempts, 0);
  const averagePassScore = examViews.length
    ? Math.round(examViews.reduce((acc, exam) => acc + exam.passScore, 0) / examViews.length)
    : 70;

  return (
    <div className="exams-admin-page">
      <section className="exams-hero">
        <div>
          <p className="admin-kicker">Evaluación, certificación y agentes IA</p>
          <h1>Exámenes</h1>
          <p>Gestiona exámenes por módulo, examen final, banco de preguntas y futuros borradores generados por agentes IA. La IA propone; tú revisas y apruebas.</p>
        </div>
        <div className="exams-hero-panel">
          <span>Regla fija</span>
          <strong>La IA nunca publica exámenes sola</strong>
          <p>Borrador IA → revisión → aprobación admin → publicación.</p>
          <button type="button" onClick={() => setSystemMessage("El generador IA se conectará más adelante con GHC Content Factory. De momento queda preparado como flujo de revisión.")}>Preparar borrador IA</button>
        </div>
      </section>

      <section className="exam-stats-grid">
        <ExamStat label="Exámenes activos" value={published} helper="Publicados" />
        <ExamStat label="Banco de preguntas" value={totalQuestions} helper="Preguntas detectadas" />
        <ExamStat label="Intentos registrados" value={totalAttempts} helper="Resultados futuros" />
        <ExamStat label="Nota mínima media" value={`${averagePassScore}%`} helper="Criterio estándar" />
        <ExamStat label="Pendientes revisión" value={review} helper="IA o admin" warning={review > 0} />
      </section>

      <section className="exams-layout">
        <div className="exams-main-column">
          <article className="exam-builder-card">
            <div className="section-title-row">
              <div>
                <h2>Banco de preguntas y constructor</h2>
                <p>Prepara preguntas por objetivo, dificultad, módulo y fuente. Luego podrán generarse borradores con agentes IA.</p>
              </div>
              <button type="button" onClick={() => setSystemMessage("La creación real de preguntas se conectará cuando definamos la estructura de base de datos de exámenes.")}>+ Crear pregunta</button>
            </div>

            <div className="question-builder-grid">
              <div className="question-bank-card">
                <h3>Categorías</h3>
                {[
                  ["Fisiología", 24],
                  ["Biomecánica", 18],
                  ["Programación", 12],
                  ["Nutrición", 9],
                ].map(([label, count]) => (
                  <button key={String(label)} type="button" onClick={() => setSystemMessage(`Filtro preparado: ${label}`)}>
                    <span>{label}</span>
                    <strong>{count}</strong>
                  </button>
                ))}
              </div>

              <div className="question-draft-card">
                <div className="draft-header">
                  <span>Borrador de examen</span>
                  <strong>Examen final · Certificación</strong>
                  <p>90 preguntas · 70% mínimo · 2 intentos</p>
                </div>
                {["Pregunta tipo test", "Caso práctico", "Verdadero/Falso", "Pregunta de aplicación"].map((item, index) => (
                  <div className="draft-question-row" key={item}>
                    <span>{index + 1}</span>
                    <div>
                      <strong>{item}</strong>
                      <p>Dificultad {index === 1 ? "alta" : "media"} · pendiente de revisión humana</p>
                    </div>
                    <em>{index === 1 ? "3 pts" : "1 pt"}</em>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="exam-list-card">
            <div className="section-title-row">
              <div>
                <h2>Exámenes por módulo</h2>
                <p>{examViews.length} estructuras listas para revisión, publicación o conexión futura.</p>
              </div>
              <button type="button" onClick={() => setSystemMessage("La edición detallada del examen será el siguiente paso funcional cuando cerremos el diseño.")}>Gestionar</button>
            </div>
            <div className="exam-list">
              {examViews.map((exam) => (
                <div className="exam-row" key={exam.id}>
                  <span className={`exam-status ${exam.status}`}>{exam.statusLabel}</span>
                  <div>
                    <strong>{exam.title}</strong>
                    <p>{exam.courseTitle} · {exam.moduleTitle}</p>
                  </div>
                  <div><span>Preguntas</span><strong>{exam.questions}</strong></div>
                  <div><span>Duración</span><strong>{exam.duration}</strong></div>
                  <div><span>Nota mínima</span><strong>{exam.passScore}%</strong></div>
                  <button type="button" onClick={() => setSystemMessage(`Preparado para editar: ${exam.title}`)}>Editar</button>
                </div>
              ))}
            </div>
          </article>
        </div>

        <aside className="exams-side-column">
          <article className="exam-side-card ai-card">
            <h2>Generador IA de exámenes</h2>
            <p>Crea borradores a partir de módulos, lecciones, Word/PDF y materiales de GHC Content Factory.</p>
            <div className="ai-flow">
              <span>1</span><p>Analizar contenido fuente</p>
              <span>2</span><p>Proponer preguntas y dificultad</p>
              <span>3</span><p>Verificar coherencia y respuestas</p>
              <span>4</span><p>Enviar a revisión de Alby</p>
            </div>
            <button type="button" onClick={() => setSystemMessage("Bloque IA preparado. La integración se hará cuando GHC Content Factory esté madura.")}>Ver flujo IA</button>
          </article>

          <article className="exam-side-card">
            <h2>Examen final</h2>
            <div className="final-exam-ring"><strong>70%</strong><span>mínimo</span></div>
            <StatusRow label="Preguntas objetivo" value="90" />
            <StatusRow label="Duración" value="2 horas" />
            <StatusRow label="Intentos" value="2" />
            <StatusRow label="Publicación" value="Manual" warning />
          </article>

          <article className="exam-side-card">
            <h2>Estados de revisión</h2>
            <div className="review-flow-list">
              <span>Borrador IA</span>
              <span>Pendiente de revisión</span>
              <span>Requiere cambios</span>
              <span>Aprobado por admin</span>
              <span>Publicado</span>
            </div>
            <button type="button" onClick={() => setActiveTab("contenido")}>Volver a contenido</button>
          </article>
        </aside>
      </section>
    </div>
  );
}

function ExamStat({ label, value, helper, warning = false }: { label: string; value: string | number; helper: string; warning?: boolean }) {
  return (
    <article className={warning ? "exam-stat-card warning" : "exam-stat-card"}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{helper}</p>
    </article>
  );
}


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


function buildCertificateAdminViews(data: DashboardData, courseViews: CourseAdminView[], studentViews: StudentAdminView[]): CertificateAdminView[] {
  const realCertificates = data.certificates.map((certificate, index) => {
    const student = studentViews.find((item) => String(item.id) === String(certificate.user_id));
    const course = courseViews.find((item) => String(item.id) === String(certificate.course_id));
    const status = normalizeCertificateStatus(certificate.status);
    const code = getCertificateCode(certificate, index);

    return {
      id: String(certificate.id || `certificate-${index}`),
      raw: certificate,
      studentName: String(certificate.student_name_snapshot || certificate.student_name || student?.name || "Alumno GHC"),
      studentEmail: String(student?.email || certificate.student_email || "Sin email"),
      courseTitle: String(certificate.course_title_snapshot || certificate.course_title || course?.title || "Curso GHC Academy"),
      code,
      verificationPath: `/certificados/${certificate.verification_slug || code}`,
      issuedAt: formatShortDate(certificate.issued_at || certificate.created_at),
      score: formatCertificateScore(certificate.final_score ?? certificate.score ?? certificate.grade),
      status,
      statusLabel: getCertificateStatusLabel(status),
      downloadable: status === "valid",
      source: "real" as const,
    };
  });

  if (realCertificates.length > 0) return realCertificates;

  const pendingFromCompletions = data.courseCompletions.slice(0, 4).map((completion, index) => {
    const student = studentViews.find((item) => String(item.id) === String(completion.user_id));
    const course = courseViews.find((item) => String(item.id) === String(completion.course_id));
    return createPendingCertificateView(index, student, course, completion.created_at || completion.completed_at);
  });

  if (pendingFromCompletions.length > 0) return pendingFromCompletions;

  return courseViews.slice(0, 3).map((course, index) => createPendingCertificateView(index, studentViews[index], course));
}

function createPendingCertificateView(index: number, student?: StudentAdminView, course?: CourseAdminView, date?: string | null): CertificateAdminView {
  const code = `GHC-${new Date().getFullYear()}-${320001 + index}-${makeVerificationSuffix(`${student?.id || "student"}-${course?.id || "course"}-${index}`)}`;
  return {
    id: `pending-certificate-${index}`,
    raw: {},
    studentName: student?.name || "Alumno pendiente",
    studentEmail: student?.email || "Pendiente de asignar",
    courseTitle: course?.title || "Curso pendiente de certificación",
    code,
    verificationPath: `/certificados/${code}`,
    issuedAt: date ? formatShortDate(date) : "Pendiente",
    score: "Pendiente",
    status: "pending",
    statusLabel: "Pendiente",
    downloadable: false,
    source: "pending",
  };
}

function normalizeCertificateStatus(value: unknown): CertificateAdminView["status"] {
  const status = String(value || "valid").toLowerCase();
  if (["revoked", "revocado", "cancelled", "cancelado"].includes(status)) return "revoked";
  if (["pending", "pendiente", "review", "revision"].includes(status)) return "pending";
  return "valid";
}

function getCertificateStatusLabel(status: CertificateAdminView["status"]) {
  if (status === "revoked") return "Revocado";
  if (status === "pending") return "Pendiente";
  return "Válido";
}

function getCertificateCode(certificate: AnyRecord, index: number) {
  const existing = certificate.certificate_code || certificate.code || certificate.verification_code;
  if (existing) return String(existing);
  const date = certificate.issued_at || certificate.created_at;
  const year = date ? new Date(date).getFullYear() : new Date().getFullYear();
  const sequence = 320001 + index;
  const suffix = makeVerificationSuffix(String(certificate.id || `${certificate.user_id || "user"}-${certificate.course_id || "course"}-${index}`));
  return `GHC-${year}-${sequence}-${suffix}`;
}

function makeVerificationSuffix(seed: string) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  let output = "";
  for (let index = 0; index < 4; index += 1) {
    output += alphabet[(hash >> (index * 5)) % alphabet.length];
  }
  return output;
}

function formatCertificateScore(value: unknown) {
  if (value === null || value === undefined || value === "") return "Aprobado";
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric > 10 ? `${Math.round(numeric)}%` : `${numeric}/10`;
  return String(value);
}

function CertificadosAdmin({
  dashboardData,
  courseViews,
  studentViews,
  setActiveTab,
  setSystemMessage,
}: {
  dashboardData: DashboardData;
  courseViews: CourseAdminView[];
  studentViews: StudentAdminView[];
  setActiveTab: (tab: AdminTab) => void;
  setSystemMessage: (message: string) => void;
}) {
  const certificates = buildCertificateAdminViews(dashboardData, courseViews, studentViews);
  const validCount = certificates.filter((certificate) => certificate.status === "valid").length;
  const pendingCount = certificates.filter((certificate) => certificate.status === "pending").length;
  const revokedCount = certificates.filter((certificate) => certificate.status === "revoked").length;
  const publicVerifications = validCount ? validCount * 3 : 0;
  const featuredCertificate = certificates[0];

  return (
    <div className="certificates-admin-page">
      <section className="certificates-hero">
        <div>
          <p className="admin-kicker">Credenciales oficiales y verificación pública</p>
          <h1>Certificados</h1>
          <p>Emite, verifica, revoca y controla las credenciales oficiales de GHC Academy. El certificado es el único documento descargable por el alumno.</p>
        </div>
        <div className="certificates-hero-panel">
          <span>Formato aprobado</span>
          <strong>GHC-2026-320001-A7K9</strong>
          <p>Numeración alta, sufijo verificador y vínculo con alumno, curso, fecha, nota y estado.</p>
          <button type="button" onClick={() => setSystemMessage("La emisión real de certificados se conectará tras validar curso completado y examen final aprobado.")}>Preparar emisión</button>
        </div>
      </section>

      <section className="certificate-stats-grid">
        <CourseStat label="Emitidos" value={validCount} helper="Descargables por alumno" />
        <CourseStat label="Pendientes" value={pendingCount} helper="Revisión admin" />
        <CourseStat label="Revocados" value={revokedCount} helper="Sin validez pública" />
        <CourseStat label="Verificaciones" value={publicVerifications} helper="URL pública futura" />
      </section>

      <section className="certificates-layout">
        <div className="certificates-main-column">
          <article className="certificate-template-card">
            <div className="card-head">
              <div>
                <h2>Plantilla oficial GHC</h2>
                <p>Diseño premium, descargable solo cuando el certificado está emitido y válido.</p>
              </div>
              <button type="button" onClick={() => setSystemMessage("La edición de plantilla se conectará desde Certificados y Studio GHC.")}>Editar plantilla</button>
            </div>

            <div className="certificate-template-body">
              <div className="certificate-preview-admin">
                <div className="certificate-preview-border" />
                <div className="certificate-preview-brand">
                  <GHCLogo size="sm" showText tagline={false} />
                </div>
                <div className="certificate-preview-title">CERTIFICADO</div>
                <div className="certificate-preview-subtitle">CREDENCIAL OFICIAL</div>
                <div className="certificate-preview-awarded">Se otorga a</div>
                <h3>{featuredCertificate?.studentName || "Alumno GHC"}</h3>
                <div className="certificate-preview-divider" />
                <small className="certificate-preview-course">{featuredCertificate?.courseTitle || "Curso certificado GHC Academy"}</small>
                <div className="certificate-preview-footer">
                  <div className="certificate-signature">
                    <span />
                    <p>Dirección académica</p>
                  </div>
                  <div className="certificate-preview-code">Registro: {featuredCertificate?.code || "GHC-2026-320001-A7K9"}</div>
                </div>
              </div>

              <div className="certificate-rules-card">
                <h3>Reglas de emisión</h3>
                <CertificateRule label="Curso completado" done />
                <CertificateRule label="Examen final aprobado" done={validCount > 0} />
                <CertificateRule label="Revisión admin" done={false} />
                <CertificateRule label="Código único generado" done />
                <CertificateRule label="Descarga habilitada solo si es válido" done />
              </div>
            </div>
          </article>

          <article className="certificate-list-card">
            <div className="card-head compact">
              <h2>Credenciales recientes</h2>
              <button type="button" onClick={() => setSystemMessage("Más adelante conectaremos filtros, exportación y búsqueda por código.")}>Ver todas</button>
            </div>

            <div className="certificate-table">
              <div className="certificate-table-head">
                <span>Alumno</span>
                <span>Curso</span>
                <span>Código</span>
                <span>Estado</span>
                <span>Acciones</span>
              </div>
              {certificates.slice(0, 6).map((certificate) => (
                <div key={certificate.id} className="certificate-table-row">
                  <div>
                    <strong>{certificate.studentName}</strong>
                    <p>{certificate.studentEmail}</p>
                  </div>
                  <div>
                    <strong>{certificate.courseTitle}</strong>
                    <p>{certificate.issuedAt} · Nota {certificate.score}</p>
                  </div>
                  <code>{certificate.code}</code>
                  <span className={`certificate-status ${certificate.status}`}>{certificate.statusLabel}</span>
                  <div className="certificate-actions">
                    <button type="button" onClick={() => setSystemMessage(`Vista preparada para ${certificate.code}.`)}>Ver</button>
                    <button type="button" onClick={() => setSystemMessage(`Enlace verificable preparado: ${certificate.verificationPath}`)}>Copiar</button>
                    <button type="button" onClick={() => setSystemMessage(certificate.downloadable ? "El alumno podrá descargar solo este certificado." : "Solo se descarga cuando el certificado esté válido.")}>PDF</button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>

        <aside className="certificates-side-column">
          <article className="certificate-side-card verify-card">
            <span>Verificación pública</span>
            <h2>Validar certificado</h2>
            <p>Cualquier tercero podrá comprobar si una credencial es auténtica, válida o revocada mediante su código.</p>
            <div className="verification-input">GHC-2026-320001-A7K9</div>
            <button type="button" onClick={() => setSystemMessage("La página pública /certificados/[codigo] se conectará más adelante.")}>Probar verificación</button>
          </article>

          <article className="certificate-side-card">
            <h2>Política anti-copia</h2>
            <div className="policy-list">
              <StatusRow label="Único descargable" value="Certificado" />
              <StatusRow label="PDFs del curso" value="No descargables" warning />
              <StatusRow label="Vídeos/Audios" value="Protegidos" />
              <StatusRow label="Código público" value="Verificable" />
            </div>
          </article>

          <article className="certificate-side-card">
            <h2>Factoría IA</h2>
            <p>La IA podrá proponer rúbricas, criterios y borradores de certificado, pero nunca emitirá ni publicará sin aprobación humana.</p>
            <div className="factory-tags">
              <span>Borrador IA</span>
              <span>Revisión admin</span>
              <span>Aprobado</span>
              <span>Emitido</span>
            </div>
          </article>

          <article className="certificate-side-card">
            <h2>Acciones rápidas</h2>
            <button type="button" onClick={() => setSystemMessage("La emisión manual se conectará cuando esté lista la validación curso + examen final.")}>Emitir certificado</button>
            <button type="button" onClick={() => setActiveTab("examenes")}>Ver exámenes finales</button>
            <button type="button" onClick={() => setActiveTab("alumnos")}>Buscar alumno</button>
          </article>
        </aside>
      </section>
    </div>
  );
}

function CertificateRule({ label, done = false }: { label: string; done?: boolean }) {
  return (
    <div className={done ? "certificate-rule done" : "certificate-rule"}>
      <span>{done ? "✓" : "○"}</span>
      <p>{label}</p>
    </div>
  );
}

function PagosAdmin({
  dashboardData,
  courseViews,
  studentViews,
  paymentSubTab,
  setPaymentSubTab,
  financeSearch,
  setFinanceSearch,
  financeGateway,
  setFinanceGateway,
  financeStatus,
  setFinanceStatus,
  financeAmountMin,
  setFinanceAmountMin,
  financeAmountMax,
  setFinanceAmountMax,
  setActiveTab,
  setSystemMessage,
}: {
  dashboardData: DashboardData;
  courseViews: CourseAdminView[];
  studentViews: StudentAdminView[];
  paymentSubTab: PaymentSubTab;
  setPaymentSubTab: (tab: PaymentSubTab) => void;
  financeSearch: string;
  setFinanceSearch: (value: string) => void;
  financeGateway: string;
  setFinanceGateway: (value: string) => void;
  financeStatus: string;
  setFinanceStatus: (value: string) => void;
  financeAmountMin: string;
  setFinanceAmountMin: (value: string) => void;
  financeAmountMax: string;
  setFinanceAmountMax: (value: string) => void;
  setActiveTab: (tab: AdminTab) => void;
  setSystemMessage: (message: string) => void;
}) {
  const commercialStudents = studentViews.filter((student) => student.activeCourses > 0 || student.certificates > 0);
  const blockedStudents = studentViews.filter((student) => student.status === "blocked").length;
  const highValueStudents = studentViews.filter((student) => student.commercialTier !== "Inicial").length;
  const manualAccessCandidates = Math.max(0, courseViews.filter((course) => course.status === "draft").length);
  const estimatedRevenue = commercialStudents.length > 0 ? commercialStudents.length * 197 : 0;

  const paymentRows = buildPaymentRows(studentViews, courseViews);
  const financeRows = buildFinanceRows(paymentRows, courseViews, studentViews);
  const filteredFinanceRows = filterFinanceRows({
    rows: financeRows,
    search: financeSearch,
    gateway: financeGateway,
    status: financeStatus,
    min: financeAmountMin,
    max: financeAmountMax,
  });

  const financeTotals = buildFinanceTotals(filteredFinanceRows);
  const paymentTabs: { id: PaymentSubTab; label: string; helper: string }[] = [
    { id: "resumen", label: "Resumen", helper: "Vista general" },
    { id: "transacciones", label: "Transacciones", helper: "Operaciones" },
    { id: "accesos", label: "Accesos", helper: "Permisos" },
    { id: "becas", label: "Becas", helper: "Fidelización" },
    { id: "finanzas", label: "Finanzas", helper: "Contabilidad" },
    { id: "reportes", label: "Reportes", helper: "Exportación" },
  ];

  return (
    <div className="payments-admin-page">
      <section className="payments-hero">
        <div>
          <p className="admin-kicker">Pagos, accesos y finanzas</p>
          <h1>Pagos y accesos</h1>
          <p>Controla ventas, transacciones, accesos, becas, comisiones, ingresos netos y reportes contables desde una misma cabina.</p>
        </div>

        <div className="payments-hero-panel">
          <span>Módulo comercial preparado</span>
          <strong>Stripe + SumUp + accesos manuales + finanzas</strong>
          <p>La conexión real de cobros se hará con seguridad. De momento dejamos la arquitectura lista.</p>
          <button type="button" onClick={() => setSystemMessage("Stripe y SumUp se conectarán cuando activemos el módulo de pagos reales.")}>
            Preparar pasarelas
          </button>
        </div>
      </section>

      <section className="payment-tabs">
        {paymentTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={paymentSubTab === tab.id ? "active" : ""}
            onClick={() => {
              setPaymentSubTab(tab.id);
              setSystemMessage("");
            }}
          >
            <strong>{tab.label}</strong>
            <span>{tab.helper}</span>
          </button>
        ))}
      </section>

      {paymentSubTab === "resumen" ? (
        <PaymentSummaryView
          estimatedRevenue={estimatedRevenue}
          commercialStudents={commercialStudents.length}
          highValueStudents={highValueStudents}
          blockedStudents={blockedStudents}
          manualAccessCandidates={manualAccessCandidates}
          paymentRows={paymentRows}
          setActiveTab={setActiveTab}
          setPaymentSubTab={setPaymentSubTab}
          setSystemMessage={setSystemMessage}
        />
      ) : null}

      {paymentSubTab === "transacciones" ? (
        <PaymentTransactionsView paymentRows={paymentRows} setPaymentSubTab={setPaymentSubTab} setSystemMessage={setSystemMessage} />
      ) : null}

      {paymentSubTab === "accesos" ? (
        <PaymentAccessView studentViews={studentViews} courseViews={courseViews} setActiveTab={setActiveTab} setSystemMessage={setSystemMessage} />
      ) : null}

      {paymentSubTab === "becas" ? (
        <PaymentScholarshipsView highValueStudents={highValueStudents} studentViews={studentViews} setActiveTab={setActiveTab} setSystemMessage={setSystemMessage} />
      ) : null}

      {paymentSubTab === "finanzas" ? (
        <PaymentFinanceView
          financeRows={filteredFinanceRows}
          totals={financeTotals}
          search={financeSearch}
          setSearch={setFinanceSearch}
          gateway={financeGateway}
          setGateway={setFinanceGateway}
          status={financeStatus}
          setStatus={setFinanceStatus}
          amountMin={financeAmountMin}
          setAmountMin={setFinanceAmountMin}
          amountMax={financeAmountMax}
          setAmountMax={setFinanceAmountMax}
          setSystemMessage={setSystemMessage}
        />
      ) : null}

      {paymentSubTab === "reportes" ? (
        <PaymentReportsView totals={financeTotals} setPaymentSubTab={setPaymentSubTab} setSystemMessage={setSystemMessage} />
      ) : null}
    </div>
  );
}

function PaymentSummaryView({
  estimatedRevenue,
  commercialStudents,
  highValueStudents,
  blockedStudents,
  manualAccessCandidates,
  paymentRows,
  setActiveTab,
  setPaymentSubTab,
  setSystemMessage,
}: {
  estimatedRevenue: number;
  commercialStudents: number;
  highValueStudents: number;
  blockedStudents: number;
  manualAccessCandidates: number;
  paymentRows: ReturnType<typeof buildPaymentRows>;
  setActiveTab: (tab: AdminTab) => void;
  setPaymentSubTab: (tab: PaymentSubTab) => void;
  setSystemMessage: (message: string) => void;
}) {
  return (
    <>
      <section className="payment-stats-grid">
        <CourseStat label="Ingresos estimados" value={estimatedRevenue} helper="Simulación hasta conectar pagos" />
        <CourseStat label="Alumnos con acceso" value={commercialStudents} helper="Cursos activos o certificados" />
        <CourseStat label="Alto valor" value={highValueStudents} helper="Candidatos a fidelización" />
        <CourseStat label="Accesos bloqueados" value={blockedStudents} helper="Riesgo comercial" />
        <CourseStat label="Accesos manuales" value={manualAccessCandidates} helper="Becas / cortesías futuras" />
      </section>

      <section className="payments-layout">
        <div className="payments-main-column">
          <article className="payments-overview-card">
            <div className="card-head">
              <div>
                <h2>Resumen comercial</h2>
                <p>Visión preparada para compras, cuotas, becas y accesos por alumno.</p>
              </div>
              <button type="button" onClick={() => setPaymentSubTab("finanzas")}>Entrar en finanzas</button>
            </div>

            <div className="payment-chart-card">
              <svg viewBox="0 0 920 260" aria-hidden="true">
                <defs>
                  <linearGradient id="paymentChartGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={GREEN} stopOpacity="0.38" />
                    <stop offset="100%" stopColor={GREEN} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M30 215 L115 190 L200 198 L285 150 L370 138 L455 108 L540 118 L625 84 L710 96 L795 58 L890 42" fill="none" stroke={GREEN} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M30 215 L115 190 L200 198 L285 150 L370 138 L455 108 L540 118 L625 84 L710 96 L795 58 L890 42 L890 252 L30 252 Z" fill="url(#paymentChartGradient)" />
              </svg>
            </div>

            <div className="payment-breakdown">
              <MiniMetric label="Pagos completados" value="Próximo" trend="Stripe" />
              <MiniMetric label="Pagos pendientes" value="Próximo" trend="SumUp" />
              <MiniMetric label="Becas activas" value="0" trend="manual" />
              <MiniMetric label="Accesos gratuitos" value="0" trend="manual" />
            </div>
          </article>

          <article className="payments-table-card">
            <div className="card-head compact">
              <h2>Operaciones recientes</h2>
              <button type="button" onClick={() => setPaymentSubTab("transacciones")}>Ver transacciones</button>
            </div>
            <PaymentRowsTable rows={paymentRows} setSystemMessage={setSystemMessage} />
          </article>
        </div>

        <aside className="payments-side-column">
          <article className="payment-side-card">
            <h2>Acciones rápidas</h2>
            <button type="button" onClick={() => setSystemMessage("Conceder acceso manual se conectará a la tabla de accesos por curso.")}>Conceder acceso manual</button>
            <button type="button" onClick={() => setSystemMessage("Las becas se registrarán como acceso especial con motivo interno.")}>Aplicar beca</button>
            <button type="button" onClick={() => setSystemMessage("Los descuentos personalizados se conectarán con Comunicaciones y Marketing.")}>Crear descuento</button>
            <button type="button" onClick={() => setActiveTab("alumnos")}>Ver alumno</button>
          </article>

          <article className="payment-side-card gateways">
            <h2>Pasarelas</h2>
            <GatewayRow name="Stripe" status="Pendiente" />
            <GatewayRow name="SumUp" status="Pendiente" />
            <GatewayRow name="Accesos manuales" status="Preparado" active />
            <GatewayRow name="Cuotas" status="Diseñado" active />
          </article>

          <article className="payment-side-card">
            <h2>Fidelización comercial</h2>
            <p>Desde aquí se alimentará el bloque “Relación comercial y fidelización” de cada alumno.</p>
            <div className="loyalty-payment-list">
              <span>Alto valor</span>
              <strong>{highValueStudents}</strong>
              <span>Candidatos a curso gratuito</span>
              <strong>{Math.max(0, highValueStudents - 1)}</strong>
              <span>Seguimiento comercial</span>
              <strong>Preparado</strong>
            </div>
          </article>
        </aside>
      </section>
    </>
  );
}

function PaymentRowsTable({
  rows,
  setSystemMessage,
}: {
  rows: ReturnType<typeof buildPaymentRows>;
  setSystemMessage: (message: string) => void;
}) {
  return (
    <div className="payments-table">
      <div className="payments-table-head">
        <span>Alumno</span>
        <span>Curso / acceso</span>
        <span>Importe</span>
        <span>Estado</span>
        <span>Acción</span>
      </div>

      {rows.map((row) => (
        <div key={row.id} className="payments-table-row">
          <div>
            <strong>{row.student}</strong>
            <p>{row.email}</p>
          </div>
          <div>
            <strong>{row.course}</strong>
            <p>{row.kind}</p>
          </div>
          <strong>{row.amount}</strong>
          <span className={`payment-status ${row.statusTone}`}>{row.status}</span>
          <button type="button" onClick={() => setSystemMessage(row.actionMessage)}>{row.action}</button>
        </div>
      ))}
    </div>
  );
}

function PaymentTransactionsView({
  paymentRows,
  setPaymentSubTab,
  setSystemMessage,
}: {
  paymentRows: ReturnType<typeof buildPaymentRows>;
  setPaymentSubTab: (tab: PaymentSubTab) => void;
  setSystemMessage: (message: string) => void;
}) {
  return (
    <section className="payments-full-panel">
      <div className="card-head">
        <div>
          <h2>Transacciones</h2>
          <p>Operaciones de pago, accesos y compras. El histórico real se conectará con Stripe/SumUp.</p>
        </div>
        <button type="button" onClick={() => setPaymentSubTab("finanzas")}>Ver finanzas</button>
      </div>
      <PaymentRowsTable rows={paymentRows} setSystemMessage={setSystemMessage} />
    </section>
  );
}

function PaymentAccessView({
  studentViews,
  courseViews,
  setActiveTab,
  setSystemMessage,
}: {
  studentViews: StudentAdminView[];
  courseViews: CourseAdminView[];
  setActiveTab: (tab: AdminTab) => void;
  setSystemMessage: (message: string) => void;
}) {
  const active = studentViews.filter((student) => student.activeCourses > 0).length;
  const blocked = studentViews.filter((student) => student.status === "blocked").length;

  return (
    <section className="payments-detail-grid">
      <article className="payments-full-panel">
        <div className="card-head">
          <div>
            <h2>Accesos por alumno y curso</h2>
            <p>Control operativo de accesos activos, bloqueados, gratuitos y manuales.</p>
          </div>
          <button type="button" onClick={() => setActiveTab("alumnos")}>Ir a alumnos</button>
        </div>

        <div className="payment-access-grid">
          <CourseStat label="Accesos activos" value={active} helper="Alumnos con cursos" />
          <CourseStat label="Bloqueados" value={blocked} helper="Revisar pagos" />
          <CourseStat label="Cursos disponibles" value={courseViews.length} helper="Catálogo" />
        </div>

        <div className="access-rules-list">
          <StatusRow label="Pago completado" value="Acceso activo" />
          <StatusRow label="Pago fallido" value="Bloqueo" warning />
          <StatusRow label="Beca / regalo" value="Manual" />
          <StatusRow label="Plan 3 cuotas" value="Preparado" />
        </div>
      </article>

      <article className="payment-side-card">
        <h2>Acciones</h2>
        <button type="button" onClick={() => setSystemMessage("Conceder acceso manual se conectará en la fase de permisos por curso.")}>Conceder acceso</button>
        <button type="button" onClick={() => setSystemMessage("Revocar acceso requerirá registro interno y motivo.")}>Revocar acceso</button>
        <button type="button" onClick={() => setSystemMessage("Pausar acceso se conectará con cuotas y pagos pendientes.")}>Pausar acceso</button>
      </article>
    </section>
  );
}

function PaymentScholarshipsView({
  highValueStudents,
  studentViews,
  setActiveTab,
  setSystemMessage,
}: {
  highValueStudents: number;
  studentViews: StudentAdminView[];
  setActiveTab: (tab: AdminTab) => void;
  setSystemMessage: (message: string) => void;
}) {
  const candidates = studentViews.filter((student) => student.commercialTier !== "Inicial").slice(0, 4);

  return (
    <section className="payments-detail-grid">
      <article className="payments-full-panel">
        <div className="card-head">
          <div>
            <h2>Becas, descuentos y fidelización</h2>
            <p>Premia alumnos comprometidos, reactiva usuarios y concede accesos especiales con control interno.</p>
          </div>
          <button type="button" onClick={() => setActiveTab("comunicaciones")}>Campañas</button>
        </div>

        <div className="payment-access-grid">
          <CourseStat label="Candidatos" value={highValueStudents} helper="Alto compromiso" />
          <CourseStat label="Becas activas" value={0} helper="Por conectar" />
          <CourseStat label="Descuentos" value={0} helper="Por conectar" />
        </div>

        <div className="scholarship-list">
          {candidates.length ? candidates.map((student) => (
            <div key={student.id} className="scholarship-row">
              <span>{student.initials}</span>
              <div>
                <strong>{student.name}</strong>
                <p>{student.commercialTier} · {student.riskLabel}</p>
              </div>
              <button type="button" onClick={() => setSystemMessage(`Preparado para premiar a ${student.name} con beca, descuento o curso gratuito.`)}>Premiar</button>
            </div>
          )) : (
            <div className="scholarship-row">
              <span>GHC</span>
              <div>
                <strong>Sin candidatos todavía</strong>
                <p>Cuando haya actividad real, aparecerán alumnos con alto compromiso.</p>
              </div>
              <button type="button" onClick={() => setSystemMessage("Fidelización quedará conectada con Alumnos, Pagos y Comunicaciones.")}>Preparado</button>
            </div>
          )}
        </div>
      </article>

      <article className="payment-side-card">
        <h2>Tipos de premio</h2>
        <button type="button" onClick={() => setSystemMessage("Curso gratuito con trazabilidad interna.")}>Curso gratuito</button>
        <button type="button" onClick={() => setSystemMessage("Beca total o parcial con motivo registrado.")}>Beca</button>
        <button type="button" onClick={() => setSystemMessage("Descuento personalizado conectado con Comunicaciones.")}>Descuento</button>
      </article>
    </section>
  );
}

function PaymentFinanceView({
  financeRows,
  totals,
  search,
  setSearch,
  gateway,
  setGateway,
  status,
  setStatus,
  amountMin,
  setAmountMin,
  amountMax,
  setAmountMax,
  setSystemMessage,
}: {
  financeRows: FinanceRow[];
  totals: ReturnType<typeof buildFinanceTotals>;
  search: string;
  setSearch: (value: string) => void;
  gateway: string;
  setGateway: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  amountMin: string;
  setAmountMin: (value: string) => void;
  amountMax: string;
  setAmountMax: (value: string) => void;
  setSystemMessage: (message: string) => void;
}) {
  return (
    <section className="finance-page">
      <div className="finance-hero-card">
        <div>
          <p className="admin-kicker">Finanzas y contabilidad</p>
          <h2>Detalle contable de operaciones</h2>
          <p>Busca por alumno, email, curso, referencia, importe, pasarela, estado o rango de fecha. Preparado para Stripe/SumUp y exportación contable.</p>
        </div>
        <div className="finance-export-actions">
          <button type="button" onClick={() => setSystemMessage("Exportación CSV preparada para conectar con datos reales.")}>Exportar CSV</button>
          <button type="button" onClick={() => setSystemMessage("Exportación Excel preparada para conectar con datos reales.")}>Exportar Excel</button>
          <button type="button" onClick={() => setSystemMessage("La conciliación se conectará con referencias reales de pasarela.")}>Conciliar</button>
        </div>
      </div>

      <section className="finance-stats-grid">
        <FinanceMetric label="Ingresos brutos" value={formatCurrency(totals.gross)} />
        <FinanceMetric label="Comisiones" value={`-${formatCurrency(totals.fees)}`} warning />
        <FinanceMetric label="Reembolsos" value={`-${formatCurrency(totals.refunds)}`} danger />
        <FinanceMetric label="Ingresos netos" value={formatCurrency(totals.net)} accent />
        <FinanceMetric label="Ticket medio" value={formatCurrency(totals.averageTicket)} />
      </section>

      <section className="finance-filters">
        <label className="finance-search">
          <span>⌕</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Alumno, email, curso, referencia, código de operación..."
          />
        </label>

        <select value={gateway} onChange={(event) => setGateway(event.target.value)}>
          <option value="all">Todas las pasarelas</option>
          <option value="stripe">Stripe</option>
          <option value="sumup">SumUp</option>
          <option value="manual">Manual</option>
        </select>

        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">Todos los estados</option>
          <option value="paid">Pagado</option>
          <option value="pending">Pendiente</option>
          <option value="failed">Fallido</option>
          <option value="refunded">Reembolsado</option>
        </select>

        <input value={amountMin} onChange={(event) => setAmountMin(event.target.value)} placeholder="Importe mín." />
        <input value={amountMax} onChange={(event) => setAmountMax(event.target.value)} placeholder="Importe máx." />
      </section>

      <article className="finance-table-card">
        <div className="card-head compact">
          <h2>Movimientos contables</h2>
          <button type="button" onClick={() => setSystemMessage("Más adelante se abrirá el detalle de operación con referencia de pasarela.")}>Ver detalle</button>
        </div>

        <div className="finance-table">
          <div className="finance-table-head">
            <span>Fecha</span>
            <span>Alumno</span>
            <span>Producto</span>
            <span>Referencia</span>
            <span>Pasarela</span>
            <span>Bruto</span>
            <span>Comisión</span>
            <span>Reembolso</span>
            <span>Neto</span>
            <span>Estado</span>
          </div>

          {financeRows.map((row) => (
            <div key={row.id} className="finance-table-row">
              <span>{row.date}</span>
              <div>
                <strong>{row.student}</strong>
                <p>{row.email}</p>
              </div>
              <div>
                <strong>{row.product}</strong>
                <p>{row.course}</p>
              </div>
              <code>{row.reference}</code>
              <span className={`gateway-pill ${row.gateway}`}>{row.gatewayLabel}</span>
              <strong>{formatCurrency(row.gross)}</strong>
              <span className="fee-value">-{formatCurrency(row.fee)}</span>
              <span className="refund-value">{row.refund ? `-${formatCurrency(row.refund)}` : "—"}</span>
              <strong className="net-value">{formatCurrency(row.net)}</strong>
              <span className={`finance-status ${row.status}`}>{row.statusLabel}</span>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

function PaymentReportsView({
  totals,
  setPaymentSubTab,
  setSystemMessage,
}: {
  totals: ReturnType<typeof buildFinanceTotals>;
  setPaymentSubTab: (tab: PaymentSubTab) => void;
  setSystemMessage: (message: string) => void;
}) {
  return (
    <section className="payments-detail-grid">
      <article className="payments-full-panel">
        <div className="card-head">
          <div>
            <h2>Reportes financieros</h2>
            <p>Informes mensuales, exportación contable y preparación para conciliación fiscal.</p>
          </div>
          <button type="button" onClick={() => setPaymentSubTab("finanzas")}>Ir a finanzas</button>
        </div>

        <div className="reports-grid">
          <ReportCard title="Informe mensual" text="Resumen de bruto, comisiones, reembolsos y neto." action="Generar" onClick={() => setSystemMessage("Informe mensual preparado para conectar.")} />
          <ReportCard title="Exportación contable" text="CSV/Excel para asesoría, conciliación o archivo interno." action="Exportar" onClick={() => setSystemMessage("Exportación contable preparada.")} />
          <ReportCard title="Ventas por curso" text="Ranking de cursos por ventas, neto y ticket medio." action="Ver ranking" onClick={() => setSystemMessage("Ranking financiero se conectará con pagos reales.")} />
          <ReportCard title="Comisiones pasarela" text="Detalle Stripe/SumUp por fecha, curso y referencia." action="Ver comisiones" onClick={() => setSystemMessage("Comisiones se calcularán desde la pasarela.")} />
        </div>

        <div className="report-summary-strip">
          <MiniMetric label="Bruto filtrado" value={formatCurrency(totals.gross)} trend="resumen" />
          <MiniMetric label="Comisiones" value={`-${formatCurrency(totals.fees)}`} trend="pasarela" />
          <MiniMetric label="Reembolsos" value={`-${formatCurrency(totals.refunds)}`} trend="control" />
          <MiniMetric label="Neto" value={formatCurrency(totals.net)} trend="contable" />
        </div>
      </article>
    </section>
  );
}

function ReportCard({ title, text, action, onClick }: { title: string; text: string; action: string; onClick: () => void }) {
  return (
    <button type="button" className="report-card" onClick={onClick}>
      <span>▣</span>
      <strong>{title}</strong>
      <p>{text}</p>
      <em>{action} ›</em>
    </button>
  );
}

type FinanceRow = {
  id: string;
  date: string;
  student: string;
  email: string;
  product: string;
  course: string;
  reference: string;
  gateway: "stripe" | "sumup" | "manual";
  gatewayLabel: string;
  gross: number;
  fee: number;
  refund: number;
  net: number;
  status: "paid" | "pending" | "failed" | "refunded";
  statusLabel: string;
  searchable: string;
};

function buildFinanceRows(paymentRows: ReturnType<typeof buildPaymentRows>, courseViews: CourseAdminView[], studentViews: StudentAdminView[]): FinanceRow[] {
  const baseRows: FinanceRow[] = paymentRows.map((row, index) => {
    const gateway: FinanceRow["gateway"] = index % 3 === 0 ? "stripe" : index % 3 === 1 ? "sumup" : "manual";
    const gross = parseAmount(row.amount) || [497, 197, 97, 47, 297, 697][index % 6];
    const fee = gateway === "stripe" ? gross * 0.029 + 0.3 : gateway === "sumup" ? gross * 0.0169 : 0;
    const isRefunded = index === 4;
    const isPending = row.statusTone === "pending";
    const isFailed = row.statusTone === "risk";
    const refund = isRefunded ? Math.round(gross * 0.25) : 0;
    const status: FinanceRow["status"] = isRefunded ? "refunded" : isFailed ? "failed" : isPending ? "pending" : "paid";
    const statusLabel = status === "refunded" ? "Reembolsado" : status === "failed" ? "Fallido" : status === "pending" ? "Pendiente" : "Pagado";
    const reference = `GHC-PAY-2026-${String(320001 + index).padStart(6, "0")}`;

    return {
      id: row.id,
      date: `${String(12 + index).padStart(2, "0")}/05/2026`,
      student: row.student,
      email: row.email,
      product: row.course,
      course: row.kind,
      reference,
      gateway,
      gatewayLabel: gateway === "stripe" ? "Stripe" : gateway === "sumup" ? "SumUp" : "Manual",
      gross: Math.round(gross * 100) / 100,
      fee: Math.round(fee * 100) / 100,
      refund,
      net: Math.max(0, Math.round((gross - fee - refund) * 100) / 100),
      status,
      statusLabel,
      searchable: "",
    };
  });

  const rows = baseRows.length ? baseRows : [
    {
      id: "finance-demo-1",
      date: "12/05/2026",
      student: "Operación preparada",
      email: "pagos@ghcacademy.net",
      product: courseViews[0]?.title || "Curso GHC Academy",
      course: "Datos pendientes de pasarela real",
      reference: "GHC-PAY-2026-320001",
      gateway: "manual" as const,
      gatewayLabel: "Manual",
      gross: 0,
      fee: 0,
      refund: 0,
      net: 0,
      status: "pending" as const,
      statusLabel: "Pendiente",
      searchable: "",
    },
  ];

  return rows.map((row) => ({
    ...row,
    searchable: [
      row.student,
      row.email,
      row.product,
      row.course,
      row.reference,
      row.gatewayLabel,
      row.statusLabel,
      row.gross,
      row.net,
    ].join(" ").toLowerCase(),
  }));
}

function filterFinanceRows({
  rows,
  search,
  gateway,
  status,
  min,
  max,
}: {
  rows: FinanceRow[];
  search: string;
  gateway: string;
  status: string;
  min: string;
  max: string;
}) {
  const query = search.trim().toLowerCase();
  const minValue = Number(min);
  const maxValue = Number(max);

  return rows.filter((row) => {
    const queryOk = !query || row.searchable.includes(query);
    const gatewayOk = gateway === "all" || row.gateway === gateway;
    const statusOk = status === "all" || row.status === status;
    const minOk = !min || !Number.isFinite(minValue) || row.gross >= minValue;
    const maxOk = !max || !Number.isFinite(maxValue) || row.gross <= maxValue;
    return queryOk && gatewayOk && statusOk && minOk && maxOk;
  });
}

function buildFinanceTotals(rows: FinanceRow[]) {
  const gross = rows.reduce((acc, row) => acc + row.gross, 0);
  const fees = rows.reduce((acc, row) => acc + row.fee, 0);
  const refunds = rows.reduce((acc, row) => acc + row.refund, 0);
  const net = rows.reduce((acc, row) => acc + row.net, 0);
  return {
    gross,
    fees,
    refunds,
    net,
    averageTicket: rows.length ? gross / rows.length : 0,
  };
}

function parseAmount(value: string) {
  const cleaned = String(value || "").replace(/[^\d,.]/g, "").replace(/\./g, "").replace(",", ".");
  const numeric = Number(cleaned);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value || 0);
}

function FinanceMetric({ label, value, accent = false, warning = false, danger = false }: { label: string; value: string; accent?: boolean; warning?: boolean; danger?: boolean }) {
  return (
    <article className={accent ? "finance-metric accent" : warning ? "finance-metric warning" : danger ? "finance-metric danger" : "finance-metric"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}


function buildPaymentRows(studentViews: StudentAdminView[], courseViews: CourseAdminView[]) {
  const rows = studentViews.slice(0, 6).map((student, index) => {
    const course = courseViews[index % Math.max(courseViews.length, 1)];
    const hasAccess = student.activeCourses > 0 || student.certificates > 0;
    const isRisk = student.status === "blocked" || student.riskTone === "red";

    return {
      id: student.id,
      student: student.name,
      email: student.email,
      course: course?.title || student.latestCourse || "Curso GHC Academy",
      kind: hasAccess ? "Acceso activo / compra registrada" : "Sin compra registrada",
      amount: student.totalInvested,
      status: isRisk ? "Revisar" : hasAccess ? "Activo" : "Pendiente",
      statusTone: isRisk ? "risk" : hasAccess ? "active" : "pending",
      action: isRisk ? "Reactivar" : hasAccess ? "Gestionar" : "Asignar",
      actionMessage: isRisk
        ? "La reactivación se conectará con Pagos y accesos."
        : hasAccess
          ? "La gestión detallada se conectará con el historial comercial del alumno."
          : "La asignación manual de acceso se conectará en la siguiente fase.",
    };
  });

  if (rows.length > 0) return rows;

  return [
    {
      id: "empty-payment-1",
      student: "Sin alumnos comerciales",
      email: "Pagos no conectados todavía",
      course: "Acceso manual preparado",
      kind: "Becas, regalos y desbloqueos futuros",
      amount: "—",
      status: "Preparado",
      statusTone: "active",
      action: "Configurar",
      actionMessage: "Cuando haya alumnos y pagos, aparecerán aquí las operaciones reales.",
    },
  ];
}

function GatewayRow({ name, status, active = false }: { name: string; status: string; active?: boolean }) {
  return (
    <div className="gateway-row">
      <span>{name}</span>
      <strong className={active ? "active" : ""}>{status}</strong>
    </div>
  );
}


function ComunicacionesAdmin({
  dashboardData,
  courseViews,
  studentViews,
  communicationSubTab,
  setCommunicationSubTab,
  communicationSearch,
  setCommunicationSearch,
  setActiveTab,
  setSystemMessage,
}: {
  dashboardData: DashboardData;
  courseViews: CourseAdminView[];
  studentViews: StudentAdminView[];
  communicationSubTab: CommunicationSubTab;
  setCommunicationSubTab: (tab: CommunicationSubTab) => void;
  communicationSearch: string;
  setCommunicationSearch: (value: string) => void;
  setActiveTab: (tab: AdminTab) => void;
  setSystemMessage: (message: string) => void;
}) {
  const inactiveStudents = studentViews.filter((student) => student.riskTone === "yellow" || student.riskTone === "red");
  const highValueStudents = studentViews.filter((student) => student.commercialTier !== "Inicial");
  const certifiedStudents = studentViews.filter((student) => student.certificates > 0);
  const messageRows = buildCommunicationRows(studentViews, courseViews);
  const filteredMessageRows = filterCommunicationRows(messageRows, communicationSearch);

  const tabs: { id: CommunicationSubTab; label: string; helper: string }[] = [
    { id: "mensajes", label: "Mensajes", helper: "Emails y avisos" },
    { id: "automatizaciones", label: "Automatizaciones", helper: "Flujos" },
    { id: "audiencias", label: "Audiencias", helper: "Segmentos" },
    { id: "campanas", label: "Campañas", helper: "Marketing" },
    { id: "publicidad", label: "Publicidad externa", helper: "Meta / Google" },
    { id: "plantillas", label: "Plantillas", helper: "Mensajes base" },
  ];

  return (
    <div className="communications-admin-page">
      <section className="communications-hero">
        <div>
          <p className="admin-kicker">Comunicaciones, marketing y seguimiento</p>
          <h1>Comunicaciones</h1>
          <p>Contacta alumnos, automatiza recordatorios, reactiva inactivos, premia perfiles de alto valor y prepara integraciones con Meta, Instagram y Google Ads.</p>
        </div>

        <div className="communications-hero-panel">
          <span>Conexión futura</span>
          <strong>Alumnos + Pagos + Analítica + Ads</strong>
          <p>Mensajes internos ahora. Campañas externas, retargeting y conversiones cuando conectemos píxeles y eventos.</p>
          <button type="button" onClick={() => setCommunicationSubTab("publicidad")}>Ver publicidad</button>
        </div>
      </section>

      <section className="communication-stats-grid">
        <CourseStat label="Alumnos activos" value={studentViews.length} helper="Base de comunicación" />
        <CourseStat label="Riesgo abandono" value={inactiveStudents.length} helper="Seguimiento necesario" />
        <CourseStat label="Alto valor" value={highValueStudents.length} helper="Fidelización" />
        <CourseStat label="Con certificado" value={certifiedStudents.length} helper="Upsell avanzado" />
        <CourseStat label="Cursos" value={courseViews.length} helper="Campañas por producto" />
      </section>

      <section className="communication-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={communicationSubTab === tab.id ? "active" : ""}
            onClick={() => {
              setCommunicationSubTab(tab.id);
              setSystemMessage("");
            }}
          >
            <strong>{tab.label}</strong>
            <span>{tab.helper}</span>
          </button>
        ))}
      </section>

      {communicationSubTab === "mensajes" ? (
        <CommunicationMessagesView
          search={communicationSearch}
          setSearch={setCommunicationSearch}
          rows={filteredMessageRows}
          setCommunicationSubTab={setCommunicationSubTab}
          setSystemMessage={setSystemMessage}
        />
      ) : null}

      {communicationSubTab === "automatizaciones" ? (
        <CommunicationAutomationsView setCommunicationSubTab={setCommunicationSubTab} setSystemMessage={setSystemMessage} />
      ) : null}

      {communicationSubTab === "audiencias" ? (
        <CommunicationAudiencesView
          inactiveStudents={inactiveStudents.length}
          highValueStudents={highValueStudents.length}
          certifiedStudents={certifiedStudents.length}
          courseViews={courseViews}
          setActiveTab={setActiveTab}
          setSystemMessage={setSystemMessage}
        />
      ) : null}

      {communicationSubTab === "campanas" ? (
        <CommunicationCampaignsView courseViews={courseViews} setCommunicationSubTab={setCommunicationSubTab} setSystemMessage={setSystemMessage} />
      ) : null}

      {communicationSubTab === "publicidad" ? (
        <CommunicationAdsView setActiveTab={setActiveTab} setSystemMessage={setSystemMessage} />
      ) : null}

      {communicationSubTab === "plantillas" ? (
        <CommunicationTemplatesView setSystemMessage={setSystemMessage} />
      ) : null}
    </div>
  );
}

function CommunicationMessagesView({
  search,
  setSearch,
  rows,
  setCommunicationSubTab,
  setSystemMessage,
}: {
  search: string;
  setSearch: (value: string) => void;
  rows: CommunicationRow[];
  setCommunicationSubTab: (tab: CommunicationSubTab) => void;
  setSystemMessage: (message: string) => void;
}) {
  return (
    <section className="communications-layout">
      <div className="communications-main-column">
        <article className="message-composer-card">
          <div className="card-head">
            <div>
              <h2>Crear mensaje</h2>
              <p>Email, aviso interno o mensaje de seguimiento. Nada se envía sin aprobación del admin.</p>
            </div>
            <button type="button" onClick={() => setSystemMessage("El envío real se conectará cuando configuremos proveedor de email/WhatsApp.")}>Guardar borrador</button>
          </div>

          <div className="message-channel-grid">
            <button type="button" className="active">Email</button>
            <button type="button">Aviso interno</button>
            <button type="button">WhatsApp futuro</button>
            <button type="button">Push futuro</button>
          </div>

          <label className="message-field">
            <span>Asunto</span>
            <input defaultValue="¿Necesitas ayuda para continuar tu curso?" />
          </label>

          <label className="message-field">
            <span>Mensaje</span>
            <textarea defaultValue={"Hola {{nombre}},\n\nHemos visto que llevas unos días sin avanzar en tu formación. Si necesitas ayuda para retomar el curso, estamos aquí para acompañarte.\n\nUn abrazo,\nGHC Academy"} />
          </label>

          <div className="message-actions">
            <button type="button" onClick={() => setSystemMessage("Vista previa preparada. La plantilla real se conectará con Comunicaciones.")}>Vista previa</button>
            <button type="button" onClick={() => setSystemMessage("El envío quedará siempre sujeto a aprobación manual.")}>Preparar envío</button>
          </div>
        </article>

        <article className="communications-table-card">
          <div className="card-head compact">
            <h2>Mensajes y seguimientos preparados</h2>
            <button type="button" onClick={() => setCommunicationSubTab("automatizaciones")}>Ver automatizaciones</button>
          </div>

          <label className="communication-search">
            <span>⌕</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por alumno, tipo, estado o motivo..." />
          </label>

          <div className="communication-table">
            <div className="communication-table-head">
              <span>Destinatario</span>
              <span>Motivo</span>
              <span>Canal</span>
              <span>Estado</span>
              <span>Acción</span>
            </div>
            {rows.map((row) => (
              <div key={row.id} className="communication-table-row">
                <div>
                  <strong>{row.name}</strong>
                  <p>{row.email}</p>
                </div>
                <div>
                  <strong>{row.reason}</strong>
                  <p>{row.detail}</p>
                </div>
                <span className={`channel-pill ${row.channelTone}`}>{row.channel}</span>
                <span className={`communication-status ${row.statusTone}`}>{row.status}</span>
                <button type="button" onClick={() => setSystemMessage(row.actionMessage)}>{row.action}</button>
              </div>
            ))}
          </div>
        </article>
      </div>

      <aside className="communications-side-column">
        <article className="communication-side-card preview">
          <span>Vista previa</span>
          <h2>Mensaje de ayuda</h2>
          <p>Plantilla humana, profesional y cercana para alumnos con inactividad reciente.</p>
          <div className="email-preview-card">
            <strong>GHC Academy</strong>
            <h3>Estamos aquí para ayudarte</h3>
            <p>Retoma tu curso cuando quieras. Si necesitas orientación, podemos ayudarte a continuar.</p>
            <button type="button">Volver al curso</button>
          </div>
        </article>

        <article className="communication-side-card">
          <h2>Acciones rápidas</h2>
          <button type="button" onClick={() => setCommunicationSubTab("audiencias")}>Crear audiencia</button>
          <button type="button" onClick={() => setCommunicationSubTab("plantillas")}>Editar plantilla</button>
          <button type="button" onClick={() => setCommunicationSubTab("publicidad")}>Preparar retargeting</button>
        </article>
      </aside>
    </section>
  );
}

function CommunicationAutomationsView({
  setCommunicationSubTab,
  setSystemMessage,
}: {
  setCommunicationSubTab: (tab: CommunicationSubTab) => void;
  setSystemMessage: (message: string) => void;
}) {
  const automations = [
    ["Bienvenida alumno", "Se activa al registrarse o comprar un curso.", "Preparada"],
    ["Inactividad 7 días", "Mensaje amable de ayuda y acompañamiento.", "Preparada"],
    ["Inactividad 15 días", "Seguimiento personalizado y posible apoyo.", "Preparada"],
    ["Pago fallido", "Aviso de recuperación de acceso.", "Pendiente pagos"],
    ["Certificado emitido", "Aviso y enlace de descarga/verificación.", "Preparada"],
    ["Alumno alto valor", "Premio, descuento o curso gratuito.", "Fidelización"],
  ];

  return (
    <section className="communications-full-panel">
      <div className="card-head">
        <div>
          <h2>Automatizaciones</h2>
          <p>Flujos preparados para seguimiento, fidelización y recuperación. Siempre revisables por el administrador.</p>
        </div>
        <button type="button" onClick={() => setCommunicationSubTab("mensajes")}>Crear mensaje</button>
      </div>

      <div className="automation-grid">
        {automations.map(([title, text, status]) => (
          <article key={title} className="automation-card">
            <span>⚡</span>
            <strong>{title}</strong>
            <p>{text}</p>
            <em>{status}</em>
            <button type="button" onClick={() => setSystemMessage(`Automatización preparada: ${title}.`)}>
              Configurar
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function CommunicationAudiencesView({
  inactiveStudents,
  highValueStudents,
  certifiedStudents,
  courseViews,
  setActiveTab,
  setSystemMessage,
}: {
  inactiveStudents: number;
  highValueStudents: number;
  certifiedStudents: number;
  courseViews: CourseAdminView[];
  setActiveTab: (tab: AdminTab) => void;
  setSystemMessage: (message: string) => void;
}) {
  return (
    <section className="communications-layout">
      <div className="communications-main-column">
        <article className="communications-full-panel">
          <div className="card-head">
            <div>
              <h2>Audiencias inteligentes</h2>
              <p>Segmentos preparados para mensajes internos, campañas y publicidad externa.</p>
            </div>
            <button type="button" onClick={() => setActiveTab("alumnos")}>Ver alumnos</button>
          </div>

          <div className="audience-grid">
            <AudienceCard title="Inactivos recientes" value={inactiveStudents} text="Alumnos sin actividad o riesgo de abandono." />
            <AudienceCard title="Alto valor" value={highValueStudents} text="Candidatos a beca, premio o curso gratuito." />
            <AudienceCard title="Con certificado" value={certifiedStudents} text="Perfectos para upsell a cursos avanzados." />
            <AudienceCard title="Interesados por curso" value={courseViews.length} text="Segmentos por curso o categoría." />
          </div>
        </article>

        <article className="communications-full-panel">
          <h2>Constructor de segmento</h2>
          <div className="segment-builder-grid">
            <SegmentRule label="Último acceso" value="Más de 7 días" />
            <SegmentRule label="Curso comprado" value="Sí" />
            <SegmentRule label="Progreso" value="Menos del 25%" />
            <SegmentRule label="Certificado" value="No emitido" />
            <SegmentRule label="Total invertido" value="Mayor de 0€" />
            <SegmentRule label="Estado comercial" value="Activo" />
          </div>
          <button type="button" className="segment-main-action" onClick={() => setSystemMessage("El guardado de segmentos se conectará más adelante.")}>
            Guardar audiencia
          </button>
        </article>
      </div>

      <aside className="communications-side-column">
        <article className="communication-side-card">
          <h2>Uso futuro</h2>
          <p>Estas audiencias alimentarán emails, mensajes internos, descuentos, retargeting Meta/Google y analítica de conversión.</p>
        </article>
      </aside>
    </section>
  );
}

function CommunicationCampaignsView({
  courseViews,
  setCommunicationSubTab,
  setSystemMessage,
}: {
  courseViews: CourseAdminView[];
  setCommunicationSubTab: (tab: CommunicationSubTab) => void;
  setSystemMessage: (message: string) => void;
}) {
  return (
    <section className="communications-layout">
      <div className="communications-main-column">
        <article className="communications-full-panel">
          <div className="card-head">
            <div>
              <h2>Campañas</h2>
              <p>Promociones internas y futuras campañas conectadas a marketing externo.</p>
            </div>
            <button type="button" onClick={() => setCommunicationSubTab("publicidad")}>Publicidad externa</button>
          </div>

          <div className="campaign-grid">
            {courseViews.slice(0, 4).map((course) => (
              <article key={course.id} className="campaign-card">
                <span>▱</span>
                <strong>{course.title}</strong>
                <p>{course.category} · {course.level}</p>
                <button type="button" onClick={() => setSystemMessage(`Campaña preparada para ${course.title}.`)}>
                  Crear campaña
                </button>
              </article>
            ))}
            {courseViews.length === 0 ? (
              <article className="campaign-card">
                <span>GHC</span>
                <strong>Sin cursos todavía</strong>
                <p>Cuando haya cursos, podrás crear campañas por producto.</p>
                <button type="button" onClick={() => setSystemMessage("Campañas preparadas para cuando existan cursos.")}>Preparado</button>
              </article>
            ) : null}
          </div>
        </article>
      </div>

      <aside className="communications-side-column">
        <article className="communication-side-card">
          <h2>Objetivos de campaña</h2>
          <button type="button" onClick={() => setSystemMessage("Campaña de captación preparada.")}>Captar alumnos</button>
          <button type="button" onClick={() => setSystemMessage("Campaña de upsell preparada.")}>Vender curso avanzado</button>
          <button type="button" onClick={() => setSystemMessage("Campaña de recuperación preparada.")}>Recuperar abandono</button>
        </article>
      </aside>
    </section>
  );
}

function CommunicationAdsView({
  setActiveTab,
  setSystemMessage,
}: {
  setActiveTab: (tab: AdminTab) => void;
  setSystemMessage: (message: string) => void;
}) {
  return (
    <section className="communications-layout">
      <div className="communications-main-column">
        <article className="ads-connection-card">
          <div>
            <p className="admin-kicker">Publicidad externa preparada</p>
            <h2>Meta, Instagram y Google Ads</h2>
            <p>Prepara píxeles, eventos, audiencias, UTM y medición de conversiones para saber qué campaña vende más y qué curso convierte mejor.</p>
          </div>
          <button type="button" onClick={() => setSystemMessage("Las conexiones reales a Meta/Google se harán con credenciales y seguridad más adelante.")}>
            Preparar integraciones
          </button>
        </article>

        <article className="communications-full-panel">
          <div className="card-head compact">
            <h2>Eventos y conversiones</h2>
            <button type="button" onClick={() => setActiveTab("analitica")}>Ver analítica</button>
          </div>

          <div className="ads-event-grid">
            <AdEvent title="PageView" text="Visitas a landing y catálogo." status="Preparado" />
            <AdEvent title="ViewContent" text="Visita a página de curso." status="Preparado" />
            <AdEvent title="Lead" text="Registro o descarga recurso." status="Futuro" />
            <AdEvent title="InitiateCheckout" text="Inicio de compra." status="Pendiente pagos" />
            <AdEvent title="Purchase" text="Compra completada." status="Pendiente pagos" />
            <AdEvent title="CertificateEarned" text="Certificado obtenido." status="GHC propio" />
          </div>
        </article>

        <article className="communications-full-panel">
          <div className="card-head compact">
            <h2>Audiencias de retargeting</h2>
            <button type="button" onClick={() => setSystemMessage("La exportación de audiencias se conectará con consentimientos y privacidad.")}>Preparar audiencia</button>
          </div>

          <div className="retargeting-list">
            <RetargetingRow title="Visitó curso y no compró" channel="Meta / Google" />
            <RetargetingRow title="Abandonó checkout" channel="Meta / Email" />
            <RetargetingRow title="Compró curso base" channel="Upsell avanzado" />
            <RetargetingRow title="Obtuvo certificado" channel="Campaña premium" />
          </div>
        </article>
      </div>

      <aside className="communications-side-column">
        <article className="communication-side-card">
          <h2>Estado integraciones</h2>
          <GatewayRow name="Meta Pixel" status="Pendiente" />
          <GatewayRow name="Google Ads" status="Pendiente" />
          <GatewayRow name="Google Analytics" status="Pendiente" />
          <GatewayRow name="UTM tracking" status="Preparado" active />
        </article>

        <article className="communication-side-card">
          <h2>Privacidad</h2>
          <p>Antes de activar publicidad externa revisaremos cookies, consentimiento, política de privacidad y eventos permitidos.</p>
        </article>
      </aside>
    </section>
  );
}

function CommunicationTemplatesView({ setSystemMessage }: { setSystemMessage: (message: string) => void }) {
  const templates = [
    ["Bienvenida", "Primer contacto tras registro o compra."],
    ["Inactividad 7 días", "Ayuda suave para retomar el curso."],
    ["Pago fallido", "Recuperación sin tono agresivo."],
    ["Certificado emitido", "Aviso de logro y descarga."],
    ["Alumno alto valor", "Premio o invitación especial."],
    ["Nuevo curso", "Promoción interna a alumnos interesados."],
  ];

  return (
    <section className="communications-full-panel">
      <div className="card-head">
        <div>
          <h2>Plantillas</h2>
          <p>Biblioteca base de mensajes GHC, preparada para email, avisos internos y futuras campañas.</p>
        </div>
        <button type="button" onClick={() => setSystemMessage("Editor de plantillas pendiente de conectar.")}>Crear plantilla</button>
      </div>

      <div className="template-grid">
        {templates.map(([title, text]) => (
          <button key={title} type="button" className="template-card" onClick={() => setSystemMessage(`Plantilla preparada: ${title}.`)}>
            <span>✉</span>
            <strong>{title}</strong>
            <p>{text}</p>
            <em>Editar ›</em>
          </button>
        ))}
      </div>
    </section>
  );
}

type CommunicationRow = {
  id: string;
  name: string;
  email: string;
  reason: string;
  detail: string;
  channel: string;
  channelTone: "email" | "internal" | "ads";
  status: string;
  statusTone: "ready" | "draft" | "risk";
  action: string;
  actionMessage: string;
  searchable: string;
};

function buildCommunicationRows(studentViews: StudentAdminView[], courseViews: CourseAdminView[]): CommunicationRow[] {
  const rows: CommunicationRow[] = studentViews.slice(0, 8).map((student, index) => {
    const risk = student.riskTone === "yellow" || student.riskTone === "red";
    const highValue = student.commercialTier !== "Inicial";
    const hasCertificate = student.certificates > 0;
    const course = courseViews[index % Math.max(courseViews.length, 1)]?.title || student.latestCourse || "Curso GHC Academy";

    const reason = risk
      ? "Seguimiento por inactividad"
      : highValue
        ? "Fidelización alumno alto valor"
        : hasCertificate
          ? "Upsell tras certificado"
          : "Mensaje informativo";

    const detail = risk
      ? `${student.riskLabel} · ${course}`
      : highValue
        ? `${student.commercialTier} · premio/descuento`
        : hasCertificate
          ? "Proponer curso avanzado"
          : "Comunicación general";

    return {
      id: student.id,
      name: student.name,
      email: student.email,
      reason,
      detail,
      channel: risk ? "Email" : highValue ? "Interno" : "Email",
      channelTone: (risk ? "email" : highValue ? "internal" : "email") as CommunicationRow["channelTone"],
      status: risk ? "Preparado" : "Borrador",
      statusTone: (risk ? "ready" : "draft") as CommunicationRow["statusTone"],
      action: risk ? "Contactar" : "Preparar",
      actionMessage: risk
        ? `Mensaje de ayuda preparado para ${student.name}.`
        : `Mensaje en borrador para ${student.name}.`,
      searchable: "",
    };
  });

  if (rows.length > 0) {
    return rows.map((row) => ({
      ...row,
      searchable: [row.name, row.email, row.reason, row.detail, row.channel, row.status].join(" ").toLowerCase(),
    }));
  }

  return [
    {
      id: "communication-empty-1",
      name: "Sin alumnos todavía",
      email: "Cuando haya alumnos, aparecerán aquí.",
      reason: "Sistema preparado",
      detail: "Seguimiento, campañas y marketing",
      channel: "Interno",
      channelTone: "internal",
      status: "Preparado",
      statusTone: "ready",
      action: "Configurar",
      actionMessage: "Comunicaciones está preparada para alumnos reales.",
      searchable: "sin alumnos preparado seguimiento campañas marketing",
    },
  ];
}

function filterCommunicationRows(rows: CommunicationRow[], search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return rows;
  return rows.filter((row) => row.searchable.includes(query));
}

function AudienceCard({ title, value, text }: { title: string; value: number; text: string }) {
  return (
    <article className="audience-card">
      <strong>{value}</strong>
      <span>{title}</span>
      <p>{text}</p>
    </article>
  );
}

function SegmentRule({ label, value }: { label: string; value: string }) {
  return (
    <div className="segment-rule">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AdEvent({ title, text, status }: { title: string; text: string; status: string }) {
  return (
    <article className="ad-event">
      <span>◉</span>
      <strong>{title}</strong>
      <p>{text}</p>
      <em>{status}</em>
    </article>
  );
}

function RetargetingRow({ title, channel }: { title: string; channel: string }) {
  return (
    <div className="retargeting-row">
      <span>{title}</span>
      <strong>{channel}</strong>
    </div>
  );
}


function AnaliticaAdmin({
  dashboardData,
  courseViews,
  studentViews,
  setActiveTab,
  setSystemMessage,
}: {
  dashboardData: DashboardData;
  courseViews: CourseAdminView[];
  studentViews: StudentAdminView[];
  setActiveTab: (tab: AdminTab) => void;
  setSystemMessage: (message: string) => void;
}) {
  const analytics = buildAnalyticsSnapshot(dashboardData, courseViews, studentViews);
  const topCourses = buildTopCourseAnalytics(courseViews);
  const riskStudents = studentViews.filter((student) => student.riskTone === "yellow" || student.riskTone === "red");
  const highValueStudents = studentViews.filter((student) => student.commercialTier !== "Inicial");

  return (
    <div className="analytics-admin-page">
      <section className="analytics-hero">
        <div>
          <p className="admin-kicker">Inteligencia académica y comercial</p>
          <h1>Analítica</h1>
          <p>Mide progreso, ventas, retención, certificados, abandono y oportunidades para tomar mejores decisiones en GHC Academy.</p>
        </div>

        <div className="analytics-hero-panel">
          <span>Panel estratégico</span>
          <strong>Datos académicos + ventas + comunicaciones</strong>
          <p>Lectura unificada para saber qué cursos funcionan, dónde se pierde gente y qué oportunidades de crecimiento hay.</p>
          <button type="button" onClick={() => setSystemMessage("Los informes avanzados se conectarán cuando tengamos datos reales de pagos, campañas y progreso.")}>
            Preparar informe
          </button>
        </div>
      </section>

      <section className="analytics-stats-grid">
        <AnalyticsMetric label="Alumnos activos" value={analytics.activeStudents} helper="Base real Supabase" />
        <AnalyticsMetric label="Finalización" value={`${analytics.completionRate}%`} helper="Cursos completados" />
        <AnalyticsMetric label="Certificados" value={analytics.certificates} helper="Emitidos / válidos" />
        <AnalyticsMetric label="Riesgo abandono" value={riskStudents.length} helper="Seguimiento recomendado" warning />
        <AnalyticsMetric label="Alto valor" value={highValueStudents.length} helper="Fidelización" accent />
      </section>

      <section className="analytics-layout">
        <div className="analytics-main-column">
          <article className="analytics-growth-card">
            <div className="card-head">
              <div>
                <h2>Tendencia general</h2>
                <p>Progreso académico, actividad y crecimiento operativo de la academia.</p>
              </div>
              <button type="button">Últimos 30 días</button>
            </div>

            <div className="analytics-chart-area">
              <svg viewBox="0 0 960 300" aria-hidden="true">
                <defs>
                  <linearGradient id="analyticsGreen" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={GREEN} stopOpacity="0.42" />
                    <stop offset="100%" stopColor={GREEN} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M36 248 L120 220 L204 226 L288 180 L372 160 L456 122 L540 140 L624 108 L708 118 L792 82 L924 60" fill="none" stroke={GREEN} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M36 248 L120 220 L204 226 L288 180 L372 160 L456 122 L540 140 L624 108 L708 118 L792 82 L924 60 L924 286 L36 286 Z" fill="url(#analyticsGreen)" />
                <path d="M36 218 L120 230 L204 204 L288 196 L372 170 L456 142 L540 154 L624 126 L708 138 L792 110 L924 92" fill="none" stroke="rgba(244,246,242,.42)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <div className="analytics-summary-strip">
              <MiniMetric label="Lecciones completadas" value={formatNumber(analytics.lessonProgress)} trend="real" />
              <MiniMetric label="Módulos completados" value={formatNumber(analytics.moduleCompletions)} trend="real" />
              <MiniMetric label="Cursos activos" value={formatNumber(analytics.coursesTotal)} trend="catálogo" />
              <MiniMetric label="Contenido total" value={formatNumber(analytics.lessonsTotal)} trend="lecciones" />
            </div>
          </article>

          <article className="analytics-table-card">
            <div className="card-head compact">
              <h2>Cursos con mayor potencial</h2>
              <button type="button" onClick={() => setActiveTab("cursos")}>Ver cursos</button>
            </div>

            <div className="analytics-course-table">
              <div className="analytics-course-head">
                <span>Curso</span>
                <span>Estado</span>
                <span>Módulos</span>
                <span>Lecciones</span>
                <span>Potencial</span>
                <span>Acción</span>
              </div>

              {topCourses.map((course) => (
                <div key={course.id} className="analytics-course-row">
                  <div>
                    <strong>{course.title}</strong>
                    <p>{course.category} · {course.level}</p>
                  </div>
                  <span className={`analytics-status ${course.status}`}>{course.statusLabel}</span>
                  <strong>{course.modulesCount}</strong>
                  <strong>{course.lessonsCount}</strong>
                  <div className="potential-bar">
                    <div style={{ width: `${course.potential}%` }} />
                    <span>{course.potential}%</span>
                  </div>
                  <button type="button" onClick={() => setSystemMessage(`Análisis preparado para ${course.title}.`)}>
                    Analizar
                  </button>
                </div>
              ))}
            </div>
          </article>

          <section className="analytics-bottom-grid">
            <article className="analytics-insight-card">
              <h2>Embudo académico</h2>
              <FunnelRow label="Alumnos registrados" value={analytics.activeStudents} percent={100} />
              <FunnelRow label="Con progreso" value={analytics.studentsWithProgress} percent={analytics.progressPercent} />
              <FunnelRow label="Cursos completados" value={analytics.completedCourses} percent={analytics.completionRate} />
              <FunnelRow label="Certificados" value={analytics.certificates} percent={analytics.certificatePercent} />
            </article>

            <article className="analytics-insight-card">
              <h2>Alertas clave</h2>
              <InsightAlert title="Riesgo de abandono" text={`${riskStudents.length} alumnos necesitan seguimiento.`} tone="warning" />
              <InsightAlert title="Fidelización" text={`${highValueStudents.length} alumnos podrían recibir premio o acceso especial.`} tone="green" />
              <InsightAlert title="Pagos" text="Pendiente conectar Stripe/SumUp para ingreso neto real." tone="muted" />
              <InsightAlert title="Marketing" text="Publicidad externa preparada para Meta/Google." tone="green" />
            </article>
          </section>
        </div>

        <aside className="analytics-side-column">
          <article className="analytics-side-card">
            <h2>Oportunidades</h2>
            <OpportunityItem label="Reactivar alumnos inactivos" action="Comunicaciones" onClick={() => setActiveTab("comunicaciones")} />
            <OpportunityItem label="Premiar alumnos de alto valor" action="Alumnos" onClick={() => setActiveTab("alumnos")} />
            <OpportunityItem label="Crear upsell tras certificado" action="Certificados" onClick={() => setActiveTab("certificados")} />
            <OpportunityItem label="Medir ventas por curso" action="Finanzas" onClick={() => setActiveTab("pagos")} />
          </article>

          <article className="analytics-side-card">
            <h2>Decisiones recomendadas</h2>
            <p>La analítica debe ayudarte a decidir qué curso lanzar, qué alumno recuperar, qué campaña enviar y dónde invertir en publicidad.</p>
            <div className="decision-tags">
              <span>Retención</span>
              <span>Ventas</span>
              <span>Progreso</span>
              <span>Fidelización</span>
              <span>Ads</span>
            </div>
          </article>

          <article className="analytics-side-card">
            <h2>Reportes preparados</h2>
            <button type="button" onClick={() => setSystemMessage("Informe académico mensual preparado para conectar.")}>Informe académico</button>
            <button type="button" onClick={() => setSystemMessage("Informe comercial preparado para conectar con Finanzas.")}>Informe comercial</button>
            <button type="button" onClick={() => setSystemMessage("Informe de campañas preparado para Comunicaciones.")}>Informe marketing</button>
          </article>
        </aside>
      </section>
    </div>
  );
}

function buildAnalyticsSnapshot(data: DashboardData, courseViews: CourseAdminView[], studentViews: StudentAdminView[]) {
  const completedCourses = data.courseCompletions.filter(
    (item) => item.completed === true || String(item.status || "").toLowerCase() === "completed"
  ).length;

  const studentsWithProgress = studentViews.filter((student) => student.progress > 0).length;
  const activeStudents = studentViews.length;
  const certificates = data.certificates.filter((certificate) => {
    const status = String(certificate.status || "valid").toLowerCase();
    return !["revoked", "revocado", "cancelled", "cancelado"].includes(status);
  }).length;

  const completionRate = activeStudents ? Math.min(100, Math.round((completedCourses / activeStudents) * 100)) : 0;
  const progressPercent = activeStudents ? Math.round((studentsWithProgress / activeStudents) * 100) : 0;
  const certificatePercent = activeStudents ? Math.round((certificates / activeStudents) * 100) : 0;

  return {
    activeStudents,
    studentsWithProgress,
    progressPercent,
    completedCourses,
    completionRate,
    certificates,
    certificatePercent,
    moduleCompletions: data.moduleCompletions.length,
    lessonProgress: data.lessonProgress.length,
    coursesTotal: courseViews.length,
    lessonsTotal: data.lessons.length,
  };
}

function buildTopCourseAnalytics(courseViews: CourseAdminView[]) {
  return courseViews.slice(0, 6).map((course, index) => ({
    ...course,
    potential: Math.min(100, Math.max(22, course.progressHint + (index % 3) * 8)),
  }));
}

function AnalyticsMetric({
  label,
  value,
  helper,
  accent = false,
  warning = false,
}: {
  label: string;
  value: string | number;
  helper: string;
  accent?: boolean;
  warning?: boolean;
}) {
  return (
    <article className={accent ? "analytics-metric accent" : warning ? "analytics-metric warning" : "analytics-metric"}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{helper}</p>
    </article>
  );
}

function FunnelRow({ label, value, percent }: { label: string; value: number; percent: number }) {
  return (
    <div className="funnel-row">
      <div>
        <strong>{label}</strong>
        <span>{formatNumber(value)}</span>
      </div>
      <div className="funnel-track"><div style={{ width: `${Math.min(100, Math.max(6, percent))}%` }} /></div>
      <em>{percent}%</em>
    </div>
  );
}

function InsightAlert({ title, text, tone }: { title: string; text: string; tone: "green" | "warning" | "muted" }) {
  return (
    <div className={`insight-alert ${tone}`}>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function OpportunityItem({ label, action, onClick }: { label: string; action: string; onClick: () => void }) {
  return (
    <button type="button" className="opportunity-item" onClick={onClick}>
      <span>{label}</span>
      <strong>{action} ›</strong>
    </button>
  );
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

.exams-admin-page{display:grid;gap:16px}.exams-hero{min-height:128px;border:1px solid var(--line);border-radius:22px;background:linear-gradient(90deg,rgba(9,13,11,.98),rgba(9,13,11,.76)),radial-gradient(circle at 82% 24%,rgba(99,229,70,.14),transparent 34%);display:flex;align-items:center;justify-content:space-between;gap:22px;padding:26px;overflow:hidden;box-shadow:0 28px 90px rgba(0,0,0,.22)}.exams-hero h1{margin:0;font-size:clamp(36px,4vw,54px);line-height:.94;letter-spacing:-.06em;font-weight:950}.exams-hero p:not(.admin-kicker){margin:12px 0 0;color:var(--muted);line-height:1.6;max-width:760px}.exams-hero-panel{width:375px;border-radius:18px;border:1px solid rgba(99,229,70,.22);background:rgba(99,229,70,.055);padding:18px}.exams-hero-panel span{color:var(--green);font-size:11px;text-transform:uppercase;letter-spacing:.16em;font-weight:950}.exams-hero-panel strong{display:block;margin-top:8px;font-size:20px;line-height:1.12}.exams-hero-panel p{color:var(--muted);line-height:1.5;font-size:13px}.exams-hero-panel button,.exam-side-card button{min-height:40px;border-radius:999px;border:1px solid rgba(99,229,70,.28);background:rgba(99,229,70,.08);color:var(--green);padding:0 15px;font-weight:900;cursor:pointer}.exam-stats-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.exam-stat-card,.exam-builder-card,.exam-list-card,.exam-side-card{border:1px solid var(--line);border-radius:18px;background:var(--panel);box-shadow:0 22px 70px rgba(0,0,0,.18)}.exam-stat-card{padding:16px;min-height:118px}.exam-stat-card span{color:var(--muted);font-size:12px;font-weight:800}.exam-stat-card strong{display:block;margin-top:9px;font-size:30px;letter-spacing:-.045em}.exam-stat-card p{color:var(--muted);margin:6px 0 0;font-size:12px}.exam-stat-card.warning strong{color:var(--warning)}.exams-layout{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:14px;align-items:start}.exams-main-column,.exams-side-column{display:grid;gap:14px}.exam-builder-card,.exam-list-card,.exam-side-card{padding:18px}.question-builder-grid{display:grid;grid-template-columns:260px minmax(0,1fr);gap:14px;margin-top:16px}.question-bank-card,.question-draft-card{border:1px solid rgba(255,255,255,.075);border-radius:16px;background:rgba(255,255,255,.028);padding:14px}.question-bank-card h3{margin:0 0 12px;font-size:16px}.question-bank-card button{width:100%;min-height:42px;margin-top:8px;border-radius:12px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--white);display:flex;justify-content:space-between;align-items:center;padding:0 12px;cursor:pointer}.question-bank-card button strong{color:var(--green)}.draft-header{border-bottom:1px solid var(--line);padding-bottom:12px;margin-bottom:8px}.draft-header span{color:var(--green);text-transform:uppercase;letter-spacing:.14em;font-size:10px;font-weight:950}.draft-header strong{display:block;margin-top:6px;font-size:20px}.draft-header p{color:var(--muted);margin:5px 0 0;font-size:13px}.draft-question-row{display:grid;grid-template-columns:32px minmax(0,1fr) 54px;gap:10px;align-items:center;min-height:58px;border-top:1px solid rgba(255,255,255,.055);padding:10px 0}.draft-question-row>span{width:32px;height:32px;border-radius:999px;display:grid;place-items:center;background:rgba(99,229,70,.09);color:var(--green);border:1px solid rgba(99,229,70,.16);font-weight:950}.draft-question-row p{margin:4px 0 0;color:var(--muted);font-size:12px}.draft-question-row em{color:var(--muted);font-style:normal;font-size:12px;font-weight:900;text-align:right}.exam-list{display:grid;gap:10px;margin-top:14px}.exam-row{min-height:74px;border-radius:14px;border:1px solid rgba(255,255,255,.075);background:rgba(255,255,255,.028);display:grid;grid-template-columns:112px minmax(0,1fr) 92px 92px 98px 80px;gap:12px;align-items:center;padding:12px}.exam-status{width:fit-content;border-radius:999px;padding:7px 9px;text-transform:uppercase;letter-spacing:.1em;font-size:10px;font-weight:950;color:var(--green);background:rgba(99,229,70,.1);border:1px solid rgba(99,229,70,.22)}.exam-status.draft{color:var(--warning);background:rgba(247,201,72,.1);border-color:rgba(247,201,72,.22)}.exam-status.review,.exam-status.ai{color:#9fb6ff;background:rgba(120,150,255,.1);border-color:rgba(120,150,255,.22)}.exam-row p{margin:4px 0 0;color:var(--muted);font-size:12px}.exam-row div span{display:block;color:var(--soft);font-size:10px;text-transform:uppercase;letter-spacing:.12em;font-weight:900}.exam-row div strong{display:block;margin-top:4px}.exam-row button{min-height:38px;border-radius:10px;border:1px solid rgba(99,229,70,.24);background:rgba(99,229,70,.07);color:var(--green);cursor:pointer;font-weight:900}.ai-card{background:radial-gradient(circle at 80% 8%,rgba(99,229,70,.13),transparent 34%),var(--panel)}.exam-side-card h2{margin:0;font-size:21px;line-height:1.05;letter-spacing:-.035em}.exam-side-card p{color:var(--muted);line-height:1.55;font-size:13px}.ai-flow,.review-flow-list{display:grid;gap:10px;margin:14px 0}.ai-flow{grid-template-columns:32px minmax(0,1fr)}.ai-flow span{width:32px;height:32px;border-radius:999px;display:grid;place-items:center;background:rgba(99,229,70,.09);color:var(--green);border:1px solid rgba(99,229,70,.16);font-weight:950}.ai-flow p{margin:0;align-self:center}.final-exam-ring{width:132px;height:132px;border-radius:999px;margin:18px auto;display:grid;place-items:center;align-content:center;border:12px solid rgba(99,229,70,.22);box-shadow:inset 0 0 0 2px rgba(255,255,255,.04)}.final-exam-ring strong{font-size:32px;line-height:1}.final-exam-ring span{color:var(--muted);font-size:12px;margin-top:5px}.review-flow-list span{min-height:38px;border-radius:12px;border:1px solid rgba(255,255,255,.075);background:rgba(255,255,255,.028);display:flex;align-items:center;padding:0 12px;color:var(--muted);font-size:13px;font-weight:850}
.coming-soon{min-height:420px;padding:34px;display:grid;align-content:center}.coming-soon p:not(.admin-kicker){max-width:720px;color:var(--muted);line-height:1.7}

      .certificates-admin-page{display:grid;gap:16px}.certificates-hero{min-height:128px;border:1px solid var(--line);border-radius:22px;background:linear-gradient(90deg,rgba(9,13,11,.98),rgba(9,13,11,.76)),radial-gradient(circle at 80% 20%,rgba(99,229,70,.13),transparent 30%);display:flex;align-items:center;justify-content:space-between;padding:26px;overflow:hidden;position:relative;box-shadow:0 28px 90px rgba(0,0,0,.22)}.certificates-hero h1{margin:0;font-size:clamp(36px,4vw,54px);line-height:.94;letter-spacing:-.06em;font-weight:950}.certificates-hero p:not(.admin-kicker){margin:12px 0 0;color:var(--muted);line-height:1.6;max-width:760px}.certificates-hero-panel{width:390px;border-radius:18px;border:1px solid rgba(99,229,70,.2);background:rgba(99,229,70,.055);padding:18px}.certificates-hero-panel span{color:var(--green);font-size:11px;text-transform:uppercase;letter-spacing:.16em;font-weight:950}.certificates-hero-panel strong{display:block;margin-top:8px;font-size:21px;line-height:1.1;letter-spacing:-.02em}.certificates-hero-panel p{color:var(--muted);line-height:1.5;font-size:13px}.certificates-hero-panel button{min-height:40px;border:0;border-radius:999px;background:var(--green);color:#061008;font-weight:950;padding:0 16px;cursor:pointer}.certificate-stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.certificates-layout{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:14px;align-items:start}.certificates-main-column,.certificates-side-column{display:grid;gap:14px}.certificate-template-card,.certificate-list-card,.certificate-side-card{border:1px solid var(--line);border-radius:18px;background:var(--panel);box-shadow:0 22px 70px rgba(0,0,0,.18);padding:18px}.certificate-template-body{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:16px;align-items:stretch}.certificate-preview-admin{min-height:360px;border-radius:18px;border:1px solid rgba(214,178,94,.32);background:linear-gradient(135deg,#fff3d3,#d9c090);color:#16130b;position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:30px 30px 112px;gap:7px;box-shadow:0 22px 70px rgba(0,0,0,.28)}.certificate-preview-admin:before{content:"";position:absolute;inset:18px;border:2px solid rgba(75,55,20,.22);border-radius:12px}.certificate-preview-admin span{position:relative;text-transform:uppercase;letter-spacing:.22em;font-size:11px;font-weight:950}.certificate-preview-admin strong{position:relative;margin-top:6px;max-width:100%;font-family:Georgia,serif;font-size:clamp(34px,4vw,42px);line-height:.94;letter-spacing:.1em;word-break:keep-all}.certificate-preview-admin em{position:relative;font-style:normal;letter-spacing:.24em;font-size:11px}.certificate-preview-admin p{position:relative;margin:6px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:.14em}.certificate-preview-admin h3{position:relative;margin:4px 0 0;font-family:Georgia,serif;font-style:italic;font-size:clamp(28px,3vw,36px);line-height:1.05}.certificate-preview-course{position:relative;display:block;max-width:290px;font-family:Georgia,serif;font-size:16px;line-height:1.28;font-weight:700}.certificate-preview-code{position:absolute;left:28px;right:126px;bottom:28px;font-size:12px;line-height:1.2;font-weight:950;letter-spacing:.04em;text-align:left}.certificate-preview-seal{position:absolute;right:32px;bottom:26px;width:78px;height:78px;border-radius:999px;display:grid;place-items:center;background:radial-gradient(circle,#fff1bf,#d6b25e 42%,#7c5415);font-weight:950;color:#4d330a}.certificate-rules-card{border-radius:16px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.028);padding:16px}.certificate-rules-card h3{margin:0 0 10px;font-size:20px;letter-spacing:-.035em}.certificate-rule{display:grid;grid-template-columns:28px minmax(0,1fr);gap:10px;align-items:center;padding:10px 0;border-top:1px solid rgba(255,255,255,.055)}.certificate-rule span{width:26px;height:26px;border-radius:999px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.12);color:var(--soft);font-weight:950}.certificate-rule.done span{border-color:rgba(99,229,70,.28);background:rgba(99,229,70,.1);color:var(--green)}.certificate-rule p{margin:0;color:var(--muted)}.certificate-rule.done p{color:var(--white)}.certificate-table{display:grid;gap:9px}.certificate-table-head,.certificate-table-row{display:grid;grid-template-columns:1.1fr 1.3fr 190px 100px 190px;gap:12px;align-items:center}.certificate-table-head{color:var(--soft);font-size:10px;text-transform:uppercase;letter-spacing:.13em;font-weight:950;padding:0 12px}.certificate-table-row{min-height:74px;border-radius:14px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.026);padding:12px}.certificate-table-row strong{display:block}.certificate-table-row p{margin:5px 0 0;color:var(--muted);font-size:12px}.certificate-table-row code{color:var(--green);font-size:12px;white-space:normal;word-break:break-word}.certificate-status{width:max-content;border-radius:999px;padding:6px 9px;font-size:10px;text-transform:uppercase;letter-spacing:.12em;font-weight:950;border:1px solid rgba(99,229,70,.28);background:rgba(99,229,70,.1);color:var(--green)}.certificate-status.pending{border-color:rgba(247,201,72,.28);background:rgba(247,201,72,.1);color:var(--warning)}.certificate-status.revoked{border-color:rgba(255,87,87,.28);background:rgba(255,87,87,.1);color:var(--danger)}.certificate-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.certificate-actions button{min-height:34px;border-radius:9px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--white);font-size:12px;font-weight:850;cursor:pointer}.certificate-actions button:first-child{background:var(--green);color:#061008;border-color:transparent}.certificate-side-card>span{color:var(--green);font-size:11px;text-transform:uppercase;letter-spacing:.16em;font-weight:950}.certificate-side-card h2{margin:8px 0 0;font-size:22px;line-height:1.05;letter-spacing:-.035em}.certificate-side-card p{color:var(--muted);line-height:1.58;font-size:13px}.certificate-side-card button{width:100%;min-height:42px;margin-top:10px;border-radius:11px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--white);cursor:pointer;font-weight:850}.certificate-side-card button:first-of-type{background:var(--green);color:#061008;border-color:transparent}.verify-card{background:radial-gradient(circle at 78% 20%,rgba(99,229,70,.16),transparent 34%),var(--panel)}.verification-input{border-radius:12px;border:1px solid rgba(99,229,70,.2);background:rgba(99,229,70,.06);color:var(--green);font-weight:950;padding:12px;word-break:break-word}.policy-list{display:grid;gap:10px;margin-top:14px}


      .certificate-preview-admin{min-height:360px;border-radius:18px;border:1px solid rgba(214,178,94,.32);background:linear-gradient(135deg,#fff6df,#dcc69a);color:#16130b;position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;text-align:center;padding:30px 34px 34px;gap:0;box-shadow:0 22px 70px rgba(0,0,0,.28)}
      .certificate-preview-admin:before{content:"";position:absolute;inset:18px;border:2px solid rgba(75,55,20,.18);border-radius:12px;pointer-events:none}
      .certificate-preview-admin:after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 18% 12%,rgba(255,255,255,.55),transparent 28%),radial-gradient(circle at 84% 82%,rgba(214,178,94,.22),transparent 30%);pointer-events:none}
      .certificate-preview-border{position:absolute;inset:30px;border:1px solid rgba(75,55,20,.12);border-radius:8px;pointer-events:none;z-index:1}
      .certificate-preview-brand{position:relative;z-index:2;display:flex;align-items:center;justify-content:center;min-height:42px;margin-bottom:18px;filter:drop-shadow(0 2px 0 rgba(0,0,0,.08))}
      .certificate-preview-title{position:relative;z-index:2;font-family:Georgia,serif;font-size:clamp(34px,4vw,46px);line-height:.95;letter-spacing:.16em;font-weight:700;color:#221b10;text-transform:uppercase;white-space:nowrap;margin-top:2px}
      .certificate-preview-subtitle{position:relative;z-index:2;margin-top:9px;font-size:12px;letter-spacing:.22em;text-transform:uppercase;font-weight:800;color:rgba(34,27,16,.7)}
      .certificate-preview-awarded{position:relative;z-index:2;margin-top:20px;font-size:10px;text-transform:uppercase;letter-spacing:.16em;font-weight:850;color:rgba(34,27,16,.58)}
      .certificate-preview-admin h3{position:relative;z-index:2;margin:6px 0 0;font-family:Georgia,serif;font-style:italic;font-size:clamp(30px,3vw,38px);line-height:1.05;color:#21190d}
      .certificate-preview-divider{position:relative;z-index:2;width:48%;height:1px;background:rgba(75,55,20,.28);margin:10px 0 8px}
      .certificate-preview-course{position:relative;z-index:2;display:block;max-width:360px;font-family:Georgia,serif;font-size:16px;line-height:1.28;font-weight:700;color:#251b0d}
      .certificate-preview-footer{position:absolute;left:34px;right:34px;bottom:28px;z-index:2;display:grid;grid-template-columns:1fr auto 82px;gap:18px;align-items:end;text-align:left}
      .certificate-signature span{display:block;width:135px;height:1px;background:rgba(75,55,20,.45);margin-bottom:7px}
      .certificate-signature p{margin:0!important;font-size:9px!important;text-transform:uppercase;letter-spacing:.12em;color:rgba(34,27,16,.62)!important}
      .certificate-preview-code{position:static!important;align-self:end;font-size:9px!important;line-height:1.15;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:rgba(34,27,16,.48);text-align:center;max-width:150px;word-break:break-word}
      .certificate-preview-seal{position:static!important;width:68px!important;height:68px!important;border-radius:999px;display:grid;place-items:center;background:radial-gradient(circle,#fff1bf,#d6b25e 42%,#7c5415);font-weight:950;color:#4d330a;box-shadow:0 10px 24px rgba(80,52,12,.22)}

      

      /* Certificado GHC refinado: sobrio, alineado y profesional */
      .certificate-preview-admin{
        min-height:340px!important;
        width:100%;
        max-width:640px;
        margin:0 auto;
        border-radius:18px;
        color:#17130b;
        display:flex!important;
        flex-direction:column!important;
        align-items:center!important;
        justify-content:flex-start!important;
        padding:28px 40px 38px!important;
        gap:0!important;
        overflow:hidden!important;
      }
      .certificate-preview-admin:before{
        inset:18px!important;
        border:1.5px solid rgba(75,55,20,.18)!important;
      }
      .certificate-preview-border{
        inset:30px!important;
        border:1px solid rgba(75,55,20,.10)!important;
      }
      .certificate-preview-brand{
        position:relative!important;
        z-index:2!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        min-height:38px!important;
        margin:0 0 20px!important;
        transform:scale(.92);
        transform-origin:center;
      }
      .certificate-preview-title{
        position:relative!important;
        z-index:2!important;
        width:100%!important;
        max-width:520px!important;
        margin:0 auto!important;
        font-family:Georgia,serif!important;
        font-size:clamp(30px,3.2vw,38px)!important;
        line-height:1!important;
        letter-spacing:.105em!important;
        font-weight:700!important;
        color:#20180d!important;
        text-transform:uppercase!important;
        white-space:nowrap!important;
        text-align:center!important;
      }
      .certificate-preview-subtitle{
        position:relative!important;
        z-index:2!important;
        margin-top:10px!important;
        font-size:10px!important;
        letter-spacing:.22em!important;
        text-transform:uppercase!important;
        font-weight:850!important;
        color:rgba(34,27,16,.68)!important;
      }
      .certificate-preview-awarded{
        position:relative!important;
        z-index:2!important;
        margin-top:20px!important;
        font-size:9px!important;
        text-transform:uppercase!important;
        letter-spacing:.16em!important;
        font-weight:850!important;
        color:rgba(34,27,16,.55)!important;
      }
      .certificate-preview-admin h3{
        position:relative!important;
        z-index:2!important;
        margin:6px 0 0!important;
        font-family:Georgia,serif!important;
        font-style:italic!important;
        font-size:clamp(28px,2.6vw,34px)!important;
        line-height:1.05!important;
        color:#21190d!important;
      }
      .certificate-preview-divider{
        position:relative!important;
        z-index:2!important;
        width:42%!important;
        height:1px!important;
        background:rgba(75,55,20,.24)!important;
        margin:10px 0 8px!important;
      }
      .certificate-preview-course{
        position:relative!important;
        z-index:2!important;
        display:block!important;
        max-width:360px!important;
        font-family:Georgia,serif!important;
        font-size:15px!important;
        line-height:1.25!important;
        font-weight:700!important;
        color:#251b0d!important;
        text-align:center!important;
      }
      .certificate-preview-footer{
        position:absolute!important;
        left:40px!important;
        right:40px!important;
        bottom:30px!important;
        z-index:2!important;
        display:grid!important;
        grid-template-columns:1fr auto!important;
        gap:18px!important;
        align-items:end!important;
      }
      .certificate-signature{
        text-align:left!important;
      }
      .certificate-signature span{
        display:block!important;
        width:150px!important;
        height:1px!important;
        background:rgba(34,27,16,.34)!important;
        margin-bottom:7px!important;
      }
      .certificate-signature p{
        margin:0!important;
        font-size:8px!important;
        letter-spacing:.15em!important;
        text-transform:uppercase!important;
        color:rgba(34,27,16,.48)!important;
      }
      .certificate-preview-code{
        position:static!important;
        max-width:190px!important;
        align-self:end!important;
        justify-self:end!important;
        font-size:7.5px!important;
        line-height:1.2!important;
        font-weight:700!important;
        letter-spacing:.08em!important;
        text-transform:uppercase!important;
        color:rgba(34,27,16,.38)!important;
        text-align:right!important;
        word-break:normal!important;
      }
      .certificate-preview-seal{display:none!important;}


      .payments-admin-page{display:grid;gap:16px}.payments-hero{min-height:128px;border:1px solid var(--line);border-radius:22px;background:linear-gradient(90deg,rgba(9,13,11,.98),rgba(9,13,11,.76)),radial-gradient(circle at 80% 20%,rgba(99,229,70,.13),transparent 30%);display:flex;align-items:center;justify-content:space-between;padding:26px;overflow:hidden;position:relative;box-shadow:0 28px 90px rgba(0,0,0,.22)}.payments-hero h1{margin:0;font-size:clamp(36px,4vw,54px);line-height:.94;letter-spacing:-.06em;font-weight:950}.payments-hero p:not(.admin-kicker){margin:12px 0 0;color:var(--muted);line-height:1.6;max-width:760px}.payments-hero-panel{width:390px;border-radius:18px;border:1px solid rgba(99,229,70,.2);background:rgba(99,229,70,.055);padding:18px}.payments-hero-panel span{color:var(--green);font-size:11px;text-transform:uppercase;letter-spacing:.16em;font-weight:950}.payments-hero-panel strong{display:block;margin-top:8px;font-size:21px;line-height:1.1;letter-spacing:-.02em}.payments-hero-panel p{color:var(--muted);line-height:1.5;font-size:13px}.payments-hero-panel button{min-height:40px;border:0;border-radius:999px;background:var(--green);color:#061008;font-weight:950;padding:0 16px;cursor:pointer}.payment-stats-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.payments-layout{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:14px;align-items:start}.payments-main-column,.payments-side-column{display:grid;gap:14px}.payments-overview-card,.payments-table-card,.payment-side-card,.finance-card{border:1px solid var(--line);border-radius:18px;background:var(--panel);box-shadow:0 22px 70px rgba(0,0,0,.18);padding:18px}.payment-chart-card{min-height:240px;border-radius:16px;border:1px solid rgba(255,255,255,.06);background:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);background-size:50px 50px;overflow:hidden}.payment-chart-card svg{width:100%;height:240px;display:block}.payment-breakdown{margin-top:14px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid var(--line);border-radius:14px;overflow:hidden}.payments-table{display:grid;gap:9px}.payments-table-head,.payments-table-row{display:grid;grid-template-columns:1.1fr 1.35fr 110px 110px 110px;gap:12px;align-items:center}.payments-table-head{color:var(--soft);font-size:10px;text-transform:uppercase;letter-spacing:.13em;font-weight:950;padding:0 12px}.payments-table-row{min-height:76px;border-radius:14px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.026);padding:12px}.payments-table-row strong{display:block}.payments-table-row p{margin:5px 0 0;color:var(--muted);font-size:12px}.payments-table-row>button{min-height:34px;border-radius:9px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--white);font-size:12px;font-weight:850;cursor:pointer}.payment-status{width:max-content;border-radius:999px;padding:6px 9px;font-size:10px;text-transform:uppercase;letter-spacing:.12em;font-weight:950;border:1px solid rgba(99,229,70,.28);background:rgba(99,229,70,.1);color:var(--green)}.payment-status.pending{border-color:rgba(247,201,72,.28);background:rgba(247,201,72,.1);color:var(--warning)}.payment-status.risk{border-color:rgba(255,87,87,.28);background:rgba(255,87,87,.1);color:var(--danger)}.payment-side-card h2{margin:0 0 12px;font-size:22px;line-height:1.05;letter-spacing:-.035em}.payment-side-card p{color:var(--muted);line-height:1.58;font-size:13px}.payment-side-card>button{width:100%;min-height:42px;margin-top:10px;border-radius:11px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--white);cursor:pointer;font-weight:850}.payment-side-card>button:first-of-type{background:var(--green);color:#061008;border-color:transparent}.gateway-row,.loyalty-payment-list{display:grid;gap:10px}.gateway-row{grid-template-columns:minmax(0,1fr) auto;align-items:center;border-top:1px solid rgba(255,255,255,.06);padding:11px 0;color:var(--muted)}.gateway-row strong{color:var(--warning)}.gateway-row strong.active{color:var(--green)}.loyalty-payment-list{grid-template-columns:minmax(0,1fr) auto;margin-top:14px}.loyalty-payment-list span{color:var(--muted)}.loyalty-payment-list strong{color:var(--green)}.payment-rules{display:grid;gap:10px;margin-top:12px}.finance-summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:14px 0}.finance-metric{border-radius:14px;border:1px solid rgba(99,229,70,.16);background:rgba(99,229,70,.055);padding:14px;min-height:104px}.finance-metric span{display:block;color:var(--muted);font-size:12px;font-weight:850}.finance-metric strong{display:block;margin-top:8px;font-size:26px;letter-spacing:-.04em}.finance-metric p{margin:6px 0 0;color:var(--muted);font-size:12px;line-height:1.35}.finance-metric.warning{border-color:rgba(247,201,72,.18);background:rgba(247,201,72,.055)}.finance-metric.warning strong{color:var(--warning)}.finance-metric.muted{border-color:rgba(255,255,255,.08);background:rgba(255,255,255,.026)}.finance-metric.muted strong{color:var(--muted)}.course-finance-table{display:grid;gap:8px}.course-finance-head,.course-finance-row{display:grid;grid-template-columns:minmax(0,1.35fr) 72px 110px 110px 110px;gap:12px;align-items:center}.course-finance-head{color:var(--soft);font-size:10px;text-transform:uppercase;letter-spacing:.13em;font-weight:950;padding:0 12px}.course-finance-row{min-height:62px;border-radius:14px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.026);padding:11px 12px}.course-finance-row strong{display:block}.course-finance-row p{margin:5px 0 0;color:var(--muted);font-size:12px}.course-finance-row span{color:var(--muted);font-size:13px}.accounting-actions button:first-of-type{background:rgba(255,255,255,.035)!important;color:var(--white)!important;border-color:var(--line)!important}



      .payment-tabs{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}.payment-tabs button{min-height:66px;border-radius:16px;border:1px solid var(--line);background:rgba(255,255,255,.028);color:var(--muted);cursor:pointer;text-align:left;padding:12px 14px}.payment-tabs button strong{display:block;color:var(--white);font-size:14px}.payment-tabs button span{display:block;margin-top:4px;font-size:11px;color:var(--soft)}.payment-tabs button.active{border-color:rgba(99,229,70,.28);background:rgba(99,229,70,.08);box-shadow:inset 0 0 0 1px rgba(99,229,70,.08)}.payment-tabs button.active strong{color:var(--green)}.payments-full-panel,.finance-hero-card,.finance-table-card{border:1px solid var(--line);border-radius:18px;background:var(--panel);box-shadow:0 22px 70px rgba(0,0,0,.18);padding:18px}.payments-detail-grid{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:14px;align-items:start}.payment-access-grid,.finance-stats-grid,.reports-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.access-rules-list{display:grid;gap:10px;margin-top:16px;max-width:620px}.scholarship-list{display:grid;gap:10px;margin-top:16px}.scholarship-row{min-height:68px;border-radius:14px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.026);display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px}.scholarship-row>span{width:44px;height:44px;border-radius:999px;display:grid;place-items:center;background:rgba(99,229,70,.1);border:1px solid rgba(99,229,70,.18);color:var(--green);font-weight:950}.scholarship-row p{margin:4px 0 0;color:var(--muted);font-size:12px}.scholarship-row button{min-height:36px;border-radius:10px;border:1px solid rgba(99,229,70,.24);background:rgba(99,229,70,.07);color:var(--green);font-weight:900;cursor:pointer}.finance-page{display:grid;gap:14px}.finance-hero-card{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;background:radial-gradient(circle at 80% 20%,rgba(99,229,70,.11),transparent 34%),var(--panel)}.finance-hero-card h2{margin:0;font-size:30px;line-height:.98;letter-spacing:-.05em}.finance-hero-card p{color:var(--muted);line-height:1.6;max-width:780px}.finance-export-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.finance-export-actions button{min-height:40px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--white);padding:0 14px;font-weight:850;cursor:pointer}.finance-export-actions button:first-child{background:var(--green);color:#061008;border-color:transparent}.finance-stats-grid{grid-template-columns:repeat(5,minmax(0,1fr))}.finance-metric{border:1px solid var(--line);border-radius:16px;background:rgba(255,255,255,.026);padding:16px;min-height:104px}.finance-metric span{color:var(--muted);font-size:12px;font-weight:850}.finance-metric strong{display:block;margin-top:10px;font-size:26px;letter-spacing:-.04em}.finance-metric.accent strong{color:var(--green)}.finance-metric.warning strong{color:var(--warning)}.finance-metric.danger strong{color:var(--danger)}.finance-filters{display:grid;grid-template-columns:minmax(280px,1fr) 170px 160px 130px 130px;gap:10px;border:1px solid var(--line);border-radius:18px;background:var(--panel);padding:10px}.finance-search{min-height:42px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.035);display:flex;align-items:center;gap:10px;padding:0 14px;color:var(--muted)}.finance-search input,.finance-filters input,.finance-filters select{width:100%;min-height:42px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--white);padding:0 14px;outline:0}.finance-search input{border:0;background:transparent;padding:0}.finance-filters option{background:#080b0a;color:var(--white)}.finance-table{display:grid;gap:8px;overflow-x:auto}.finance-table-head,.finance-table-row{display:grid;grid-template-columns:90px 1.15fr 1.2fr 150px 90px 90px 90px 90px 90px 100px;gap:10px;align-items:center;min-width:1180px}.finance-table-head{color:var(--soft);font-size:10px;text-transform:uppercase;letter-spacing:.13em;font-weight:950;padding:0 10px}.finance-table-row{min-height:72px;border-radius:14px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.026);padding:11px}.finance-table-row p{margin:4px 0 0;color:var(--muted);font-size:12px}.finance-table-row code{color:var(--green);font-size:12px;white-space:normal;word-break:break-word}.gateway-pill,.finance-status{width:max-content;border-radius:999px;padding:6px 9px;font-size:10px;text-transform:uppercase;letter-spacing:.12em;font-weight:950}.gateway-pill{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.045);color:var(--white)}.gateway-pill.stripe{border-color:rgba(99,229,70,.24);color:var(--green);background:rgba(99,229,70,.08)}.gateway-pill.sumup{border-color:rgba(247,201,72,.24);color:var(--warning);background:rgba(247,201,72,.08)}.fee-value{color:var(--warning)}.refund-value{color:var(--danger)}.net-value{color:var(--green)}.finance-status{border:1px solid rgba(99,229,70,.28);background:rgba(99,229,70,.1);color:var(--green)}.finance-status.pending{border-color:rgba(247,201,72,.28);background:rgba(247,201,72,.1);color:var(--warning)}.finance-status.failed,.finance-status.refunded{border-color:rgba(255,87,87,.28);background:rgba(255,87,87,.1);color:var(--danger)}.report-card{min-height:160px;border-radius:16px;border:1px solid var(--line);background:rgba(255,255,255,.026);color:var(--white);display:grid;gap:8px;text-align:left;padding:16px;cursor:pointer}.report-card span{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:rgba(99,229,70,.09);color:var(--green);border:1px solid rgba(99,229,70,.16);font-weight:950}.report-card p{color:var(--muted);line-height:1.45;margin:0}.report-card em{color:var(--green);font-style:normal;font-weight:900}.report-summary-strip{margin-top:14px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid var(--line);border-radius:14px;overflow:hidden}


      
      .admin-shell,
      .payments-admin-page,
      .finance-page,
      .finance-table-card,
      .payments-full-panel,
      .payments-overview-card,
      .payments-table-card {
        min-width: 0;
      }

      .finance-hero-card {
        min-width: 0;
        overflow: hidden;
      }

      .finance-export-actions {
        min-width: 0;
        max-width: 100%;
        flex-wrap: wrap;
      }

      .finance-export-actions button {
        white-space: nowrap;
      }

      .finance-table-card {
        overflow: hidden;
      }

      .finance-table {
        width: 100%;
        max-width: 100%;
        overflow-x: auto;
        overflow-y: hidden;
        padding-bottom: 8px;
        scrollbar-width: thin;
        scrollbar-color: rgba(99,229,70,.45) rgba(255,255,255,.06);
      }

      .finance-table::-webkit-scrollbar {
        height: 9px;
      }

      .finance-table::-webkit-scrollbar-track {
        background: rgba(255,255,255,.055);
        border-radius: 999px;
      }

      .finance-table::-webkit-scrollbar-thumb {
        background: rgba(99,229,70,.45);
        border-radius: 999px;
      }

      .finance-table-head,
      .finance-table-row {
        min-width: 1180px;
      }

      .finance-table-row > *,
      .finance-table-head > * {
        min-width: 0;
      }

      .finance-table-row strong,
      .finance-table-row span,
      .finance-table-row code,
      .finance-table-row p {
        overflow-wrap: anywhere;
      }



      .communications-admin-page{display:grid;gap:16px}.communications-hero{min-height:128px;border:1px solid var(--line);border-radius:22px;background:linear-gradient(90deg,rgba(9,13,11,.98),rgba(9,13,11,.76)),radial-gradient(circle at 80% 20%,rgba(99,229,70,.13),transparent 30%);display:flex;align-items:center;justify-content:space-between;padding:26px;overflow:hidden;position:relative;box-shadow:0 28px 90px rgba(0,0,0,.22)}.communications-hero h1{margin:0;font-size:clamp(36px,4vw,54px);line-height:.94;letter-spacing:-.06em;font-weight:950}.communications-hero p:not(.admin-kicker){margin:12px 0 0;color:var(--muted);line-height:1.6;max-width:760px}.communications-hero-panel{width:410px;border-radius:18px;border:1px solid rgba(99,229,70,.2);background:rgba(99,229,70,.055);padding:18px}.communications-hero-panel span{color:var(--green);font-size:11px;text-transform:uppercase;letter-spacing:.16em;font-weight:950}.communications-hero-panel strong{display:block;margin-top:8px;font-size:21px;line-height:1.1;letter-spacing:-.02em}.communications-hero-panel p{color:var(--muted);line-height:1.5;font-size:13px}.communications-hero-panel button{min-height:40px;border:0;border-radius:999px;background:var(--green);color:#061008;font-weight:950;padding:0 16px;cursor:pointer}.communication-stats-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.communication-tabs{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}.communication-tabs button{min-height:66px;border-radius:16px;border:1px solid var(--line);background:rgba(255,255,255,.028);color:var(--muted);cursor:pointer;text-align:left;padding:12px 14px}.communication-tabs button strong{display:block;color:var(--white);font-size:14px}.communication-tabs button span{display:block;margin-top:4px;font-size:11px;color:var(--soft)}.communication-tabs button.active{border-color:rgba(99,229,70,.28);background:rgba(99,229,70,.08);box-shadow:inset 0 0 0 1px rgba(99,229,70,.08)}.communication-tabs button.active strong{color:var(--green)}.communications-layout{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:14px;align-items:start}.communications-main-column,.communications-side-column{display:grid;gap:14px}.message-composer-card,.communications-table-card,.communication-side-card,.communications-full-panel,.ads-connection-card{border:1px solid var(--line);border-radius:18px;background:var(--panel);box-shadow:0 22px 70px rgba(0,0,0,.18);padding:18px}.message-channel-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:14px}.message-channel-grid button{min-height:40px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--white);cursor:pointer;font-weight:850}.message-channel-grid button.active{background:rgba(99,229,70,.12);color:var(--green);border-color:rgba(99,229,70,.28)}.message-field{display:grid;gap:7px;margin-top:12px}.message-field span{color:var(--muted);font-size:12px;font-weight:850}.message-field input,.message-field textarea{width:100%;border-radius:14px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--white);padding:12px 14px;outline:0}.message-field textarea{min-height:170px;resize:vertical;line-height:1.55}.message-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}.message-actions button{min-height:40px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--white);padding:0 14px;font-weight:850;cursor:pointer}.message-actions button:last-child{background:var(--green);color:#061008;border-color:transparent}.communication-search{min-height:42px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.035);display:flex;align-items:center;gap:10px;padding:0 14px;color:var(--muted);margin-bottom:12px}.communication-search input{flex:1;min-width:0;height:40px;border:0;background:transparent;color:var(--white);outline:0}.communication-table{display:grid;gap:9px}.communication-table-head,.communication-table-row{display:grid;grid-template-columns:1.2fr 1.35fr 100px 110px 110px;gap:12px;align-items:center}.communication-table-head{color:var(--soft);font-size:10px;text-transform:uppercase;letter-spacing:.13em;font-weight:950;padding:0 12px}.communication-table-row{min-height:74px;border-radius:14px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.026);padding:12px}.communication-table-row p{margin:5px 0 0;color:var(--muted);font-size:12px}.communication-table-row button{min-height:34px;border-radius:9px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--white);font-size:12px;font-weight:850;cursor:pointer}.channel-pill,.communication-status{width:max-content;border-radius:999px;padding:6px 9px;font-size:10px;text-transform:uppercase;letter-spacing:.12em;font-weight:950;border:1px solid rgba(99,229,70,.28);background:rgba(99,229,70,.1);color:var(--green)}.channel-pill.internal{border-color:rgba(255,255,255,.14);background:rgba(255,255,255,.055);color:var(--white)}.channel-pill.ads{border-color:rgba(247,201,72,.28);background:rgba(247,201,72,.1);color:var(--warning)}.communication-status.draft{border-color:rgba(255,255,255,.14);background:rgba(255,255,255,.055);color:var(--muted)}.communication-status.risk{border-color:rgba(255,87,87,.28);background:rgba(255,87,87,.1);color:var(--danger)}.communication-side-card>span{color:var(--green);font-size:11px;text-transform:uppercase;letter-spacing:.16em;font-weight:950}.communication-side-card h2{margin:8px 0 12px;font-size:22px;line-height:1.05;letter-spacing:-.035em}.communication-side-card p{color:var(--muted);line-height:1.58;font-size:13px}.communication-side-card button{width:100%;min-height:42px;margin-top:10px;border-radius:11px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--white);cursor:pointer;font-weight:850}.communication-side-card button:first-of-type{background:var(--green);color:#061008;border-color:transparent}.email-preview-card{border-radius:16px;border:1px solid rgba(99,229,70,.18);background:radial-gradient(circle at 82% 20%,rgba(99,229,70,.18),transparent 34%),rgba(255,255,255,.035);padding:16px}.email-preview-card h3{font-size:26px;line-height:1.05;margin:12px 0;color:var(--green);letter-spacing:-.04em}.email-preview-card button{width:auto;background:var(--green);color:#061008;border:0;padding:0 16px}.automation-grid,.audience-grid,.campaign-grid,.ads-event-grid,.template-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.automation-card,.audience-card,.campaign-card,.ad-event,.template-card,.report-card{border-radius:16px;border:1px solid var(--line);background:rgba(255,255,255,.026);padding:16px;color:var(--white);text-align:left}.automation-card span,.campaign-card span,.ad-event span,.template-card span{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:rgba(99,229,70,.09);color:var(--green);border:1px solid rgba(99,229,70,.16);font-weight:950}.automation-card strong,.audience-card strong,.campaign-card strong,.ad-event strong,.template-card strong{display:block;margin-top:10px;font-size:18px}.automation-card p,.campaign-card p,.ad-event p,.template-card p,.audience-card p{color:var(--muted);line-height:1.45;font-size:13px}.automation-card em,.ad-event em,.template-card em{color:var(--green);font-style:normal;font-size:12px;font-weight:900}.automation-card button,.campaign-card button{min-height:36px;border-radius:10px;border:1px solid rgba(99,229,70,.24);background:rgba(99,229,70,.07);color:var(--green);font-weight:900;cursor:pointer}.audience-card strong{font-size:34px;line-height:1;color:var(--green)}.audience-card span{display:block;margin-top:8px;font-weight:900}.segment-builder-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px}.segment-rule{border-radius:14px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.026);padding:13px}.segment-rule span{color:var(--muted);font-size:12px}.segment-rule strong{display:block;margin-top:6px}.segment-main-action{margin-top:14px;min-height:42px;border-radius:999px;border:0;background:var(--green);color:#061008;font-weight:950;padding:0 16px}.ads-connection-card{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;background:radial-gradient(circle at 82% 22%,rgba(99,229,70,.16),transparent 34%),var(--panel)}.ads-connection-card h2{margin:0;font-size:30px;line-height:.98;letter-spacing:-.05em}.ads-connection-card p{color:var(--muted);line-height:1.6;max-width:760px}.ads-connection-card button{min-height:42px;border-radius:999px;border:0;background:var(--green);color:#061008;font-weight:950;padding:0 16px;white-space:nowrap}.retargeting-list{display:grid;gap:10px}.retargeting-row{min-height:52px;border-radius:14px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.026);display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;color:var(--muted)}.retargeting-row strong{color:var(--green)}.template-card{cursor:pointer}.template-card em{display:block;margin-top:auto}



      .analytics-admin-page{display:grid;gap:16px}.analytics-hero{min-height:128px;border:1px solid var(--line);border-radius:22px;background:linear-gradient(90deg,rgba(9,13,11,.98),rgba(9,13,11,.76)),radial-gradient(circle at 80% 20%,rgba(99,229,70,.13),transparent 30%);display:flex;align-items:center;justify-content:space-between;padding:26px;overflow:hidden;position:relative;box-shadow:0 28px 90px rgba(0,0,0,.22)}.analytics-hero h1{margin:0;font-size:clamp(36px,4vw,54px);line-height:.94;letter-spacing:-.06em;font-weight:950}.analytics-hero p:not(.admin-kicker){margin:12px 0 0;color:var(--muted);line-height:1.6;max-width:760px}.analytics-hero-panel{width:410px;border-radius:18px;border:1px solid rgba(99,229,70,.2);background:rgba(99,229,70,.055);padding:18px}.analytics-hero-panel span{color:var(--green);font-size:11px;text-transform:uppercase;letter-spacing:.16em;font-weight:950}.analytics-hero-panel strong{display:block;margin-top:8px;font-size:21px;line-height:1.1;letter-spacing:-.02em}.analytics-hero-panel p{color:var(--muted);line-height:1.5;font-size:13px}.analytics-hero-panel button{min-height:40px;border:0;border-radius:999px;background:var(--green);color:#061008;font-weight:950;padding:0 16px;cursor:pointer}.analytics-stats-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.analytics-metric{border:1px solid var(--line);border-radius:18px;background:var(--panel);box-shadow:0 22px 70px rgba(0,0,0,.18);padding:16px;min-height:118px}.analytics-metric span{color:var(--muted);font-size:12px;font-weight:850}.analytics-metric strong{display:block;margin-top:9px;font-size:30px;letter-spacing:-.045em}.analytics-metric p{color:var(--muted);margin:6px 0 0;font-size:12px}.analytics-metric.accent strong{color:var(--green)}.analytics-metric.warning strong{color:var(--warning)}.analytics-layout{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:14px;align-items:start}.analytics-main-column,.analytics-side-column{display:grid;gap:14px}.analytics-growth-card,.analytics-table-card,.analytics-insight-card,.analytics-side-card{border:1px solid var(--line);border-radius:18px;background:var(--panel);box-shadow:0 22px 70px rgba(0,0,0,.18);padding:18px}.analytics-chart-area{min-height:260px;border:1px solid rgba(255,255,255,.06);border-radius:16px;background:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);background-size:50px 50px;overflow:hidden}.analytics-chart-area svg{width:100%;height:260px;display:block}.analytics-summary-strip{margin-top:14px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid var(--line);border-radius:14px;overflow:hidden}.analytics-course-table{display:grid;gap:9px}.analytics-course-head,.analytics-course-row{display:grid;grid-template-columns:1.3fr 110px 70px 80px 170px 90px;gap:12px;align-items:center}.analytics-course-head{color:var(--soft);font-size:10px;text-transform:uppercase;letter-spacing:.13em;font-weight:950;padding:0 12px}.analytics-course-row{min-height:74px;border-radius:14px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.026);padding:12px}.analytics-course-row p{margin:5px 0 0;color:var(--muted);font-size:12px}.analytics-course-row button{min-height:34px;border-radius:9px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--white);font-size:12px;font-weight:850;cursor:pointer}.analytics-status{width:max-content;border-radius:999px;padding:6px 9px;font-size:10px;text-transform:uppercase;letter-spacing:.12em;font-weight:950;border:1px solid rgba(99,229,70,.28);background:rgba(99,229,70,.1);color:var(--green)}.analytics-status.draft{border-color:rgba(247,201,72,.28);background:rgba(247,201,72,.1);color:var(--warning)}.analytics-status.hidden{border-color:rgba(255,255,255,.12);background:rgba(255,255,255,.055);color:var(--muted)}.potential-bar{display:grid;grid-template-columns:minmax(0,1fr) 44px;gap:8px;align-items:center}.potential-bar>div{height:8px;border-radius:999px;background:var(--green);box-shadow:0 0 18px rgba(99,229,70,.22)}.potential-bar span{color:var(--green);font-size:12px;font-weight:950}.analytics-bottom-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.funnel-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(130px,240px) 48px;gap:10px;align-items:center;padding:11px 0;border-top:1px solid rgba(255,255,255,.055)}.funnel-row span{display:block;color:var(--muted);font-size:12px;margin-top:3px}.funnel-track{height:8px;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}.funnel-track div{height:100%;border-radius:999px;background:var(--green)}.funnel-row em{font-style:normal;color:var(--green);font-weight:950}.insight-alert{border-radius:14px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.026);padding:12px;margin-top:10px}.insight-alert p{margin:5px 0 0;color:var(--muted);font-size:13px;line-height:1.45}.insight-alert.green strong{color:var(--green)}.insight-alert.warning strong{color:var(--warning)}.insight-alert.muted strong{color:var(--white)}.analytics-side-card h2{margin:0 0 12px;font-size:22px;line-height:1.05;letter-spacing:-.035em}.analytics-side-card p{color:var(--muted);line-height:1.58;font-size:13px}.opportunity-item{width:100%;min-height:54px;border-radius:14px;border:1px solid rgba(255,255,255,.075);background:rgba(255,255,255,.026);color:var(--white);display:flex;justify-content:space-between;gap:12px;align-items:center;padding:12px;margin-top:9px;text-align:left;cursor:pointer}.opportunity-item span{color:var(--muted)}.opportunity-item strong{color:var(--green)}.decision-tags{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.decision-tags span{border-radius:999px;border:1px solid rgba(99,229,70,.2);background:rgba(99,229,70,.07);color:var(--green);padding:7px 10px;font-size:12px;font-weight:900}.analytics-side-card button{width:100%;min-height:42px;margin-top:10px;border-radius:11px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--white);cursor:pointer;font-weight:850}.analytics-side-card button:first-of-type{background:var(--green);color:#061008;border-color:transparent}


      @media(max-width:1460px){.analytics-stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.analytics-layout{grid-template-columns:1fr}.analytics-side-column{grid-template-columns:repeat(3,minmax(0,1fr))}.analytics-course-head,.analytics-course-row{grid-template-columns:1fr}.analytics-summary-strip,.analytics-bottom-grid{grid-template-columns:1fr}.communication-tabs{grid-template-columns:repeat(3,minmax(0,1fr))}.communication-stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.communications-layout{grid-template-columns:1fr}.communications-side-column{grid-template-columns:repeat(2,minmax(0,1fr))}.communication-table-head,.communication-table-row{grid-template-columns:1fr}.segment-builder-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.payment-tabs{grid-template-columns:repeat(3,minmax(0,1fr))}.finance-stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.finance-filters{grid-template-columns:1fr 1fr}.payments-detail-grid{grid-template-columns:1fr}.reports-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.payment-stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.payments-layout{grid-template-columns:1fr}.payments-side-column{grid-template-columns:repeat(2,minmax(0,1fr))}.payments-table-head,.payments-table-row{grid-template-columns:1fr}.payment-breakdown,.finance-summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.course-finance-head,.course-finance-row{grid-template-columns:1fr}.certificate-stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.certificates-layout{grid-template-columns:1fr}.certificates-side-column{grid-template-columns:repeat(2,minmax(0,1fr))}.certificate-template-body{grid-template-columns:1fr}.certificate-table-head,.certificate-table-row{grid-template-columns:1fr}.certificate-actions{grid-template-columns:repeat(3,minmax(0,1fr))}.exam-stats-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.exams-layout{grid-template-columns:1fr}.exams-side-column{grid-template-columns:repeat(3,minmax(0,1fr))}.student-stats-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.students-layout{grid-template-columns:1fr}.student-detail-column{position:static}.student-row{grid-template-columns:46px minmax(0,1fr) 90px 120px}.student-commercial-mini{display:none}.content-stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.content-layout{grid-template-columns:1fr}.content-side-column{grid-template-columns:repeat(3,minmax(0,1fr))}.source-doc-grid{grid-template-columns:1fr}.content-hero{align-items:stretch;flex-direction:column}.content-hero-panel{width:100%}.course-stats-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.courses-layout{grid-template-columns:1fr}.courses-side-column{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:1380px){.kpi-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.admin-main-grid{grid-template-columns:1fr}.studio-card{grid-column:auto}}@media(max-width:1080px){.analytics-hero{align-items:stretch;flex-direction:column}.analytics-hero-panel{width:100%}.analytics-stats-grid,.analytics-side-column,.funnel-row{grid-template-columns:1fr}.communications-hero{align-items:stretch;flex-direction:column}.communications-hero-panel{width:100%}.communication-tabs,.communication-stats-grid,.communications-side-column,.message-channel-grid,.segment-builder-grid{grid-template-columns:1fr}.ads-connection-card{flex-direction:column}.payment-tabs,.finance-stats-grid,.finance-filters,.reports-grid,.report-summary-strip{grid-template-columns:1fr}.finance-hero-card{flex-direction:column}.payments-hero{align-items:stretch;flex-direction:column}.payments-hero-panel{width:100%}.payment-stats-grid,.payments-side-column,.payment-breakdown,.finance-summary-grid{grid-template-columns:1fr}.course-finance-head,.course-finance-row{grid-template-columns:1fr}.certificates-hero{align-items:stretch;flex-direction:column}.certificates-hero-panel{width:100%}.certificate-stats-grid,.certificates-side-column,.certificate-actions{grid-template-columns:1fr}.exam-stats-grid,.question-builder-grid,.exams-side-column,.exam-row{grid-template-columns:1fr}.exams-hero{align-items:stretch;flex-direction:column}.exams-hero-panel{width:100%}.student-toolbar,.student-stats-grid,.student-detail-grid,.commercial-grid,.follow-up-grid{grid-template-columns:1fr}.students-hero{align-items:stretch;flex-direction:column}.students-hero-panel{width:100%}.student-row{grid-template-columns:46px minmax(0,1fr)}.student-progress-mini,.student-risk,.student-commercial-mini{display:block;border-left:0;padding-left:0}.admin-page{grid-template-columns:1fr}.admin-sidebar{position:relative;height:auto}.topbar-actions{flex-wrap:wrap;justify-content:flex-end}.admin-search{width:100%;max-width:none}.chart-summary,.quick-actions-grid,.kpi-grid,.course-stats-grid,.courses-side-column,.course-info-grid,.course-build-row,.admin-course-actions{grid-template-columns:1fr}.admin-course-card.list{grid-template-columns:1fr}.course-toolbar{grid-template-columns:1fr}.courses-hero{align-items:stretch;flex-direction:column}.courses-hero-panel{width:100%}}
    `}</style>
  );
}
