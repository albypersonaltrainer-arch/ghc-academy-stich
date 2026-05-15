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

type DashboardData = {
  profiles: AnyRecord[];
  courses: AnyRecord[];
  certificates: AnyRecord[];
  courseCompletions: AnyRecord[];
  moduleCompletions: AnyRecord[];
  lessonProgress: AnyRecord[];
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
        const allowedRoles = ["admin", "superadmin", "owner"];

        if (!allowedRoles.includes(role)) {
          setGuardState("denied");
          router.replace("/alumno");
          return;
        }

        setProfile(profileData || null);
        setGuardState("allowed");

        const loadedData = await loadDashboardData();
        setDashboardData(loadedData);
      } catch (error) {
        console.error(error);
        setGuardState("denied");
        router.replace("/alumno");
      }
    }

    protectAndLoad();
  }, [router]);

  const displayName =
    profile?.full_name ||
    adminUser?.user_metadata?.full_name ||
    adminUser?.email ||
    "Admin GHC";

  const initials = getInitials(displayName);

  const dashboardStats = useMemo(() => buildDashboardStats(dashboardData), [dashboardData]);
  const recentActivity = useMemo(() => buildRecentActivity(dashboardData), [dashboardData]);
  const priorityTasks = useMemo(() => buildPriorityTasks(dashboardData), [dashboardData]);

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

  if (guardState !== "allowed") {
    return null;
  }

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
                onClick={() => setActiveTab(tab.id)}
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
            <button type="button" className="create-btn">+ Crear</button>
            <button type="button" className="studio-top-btn">Studio GHC</button>
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
        ) : (
          <ComingSoon tab={activeTab} />
        )}
      </section>
    </main>
  );
}

async function loadDashboardData(): Promise<DashboardData> {
  const [profiles, courses, certificates, courseCompletions, moduleCompletions, lessonProgress] =
    await Promise.all([
      safeSelect("profiles", "*"),
      safeSelect("courses", "*"),
      safeSelect("certificates", "*"),
      safeSelect("course_completions", "*"),
      safeSelect("module_completions", "*"),
      safeSelect("lesson_progress", "*"),
    ]);

  return {
    profiles,
    courses,
    certificates,
    courseCompletions,
    moduleCompletions,
    lessonProgress,
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

  const visibleCourses = data.courses.filter(isVisibleCourse);
  const publishedCourses = visibleCourses.filter((course) => {
    const status = String(course.status || "").toLowerCase();
    return !status || ["published", "publicado", "active", "activo", "preview", "demo"].includes(status);
  });

  const draftCourses = data.courses.filter((course) => {
    const status = String(course.status || "").toLowerCase();
    return ["draft", "borrador"].includes(status);
  });

  const validCertificates = data.certificates.filter((certificate) => {
    const status = String(certificate.status || "valid").toLowerCase();
    return !["revoked", "revocado", "cancelled", "cancelado"].includes(status);
  });

  const completedCourses = data.courseCompletions.filter(
    (item) => item.completed === true || String(item.status || "").toLowerCase() === "completed"
  );

  const completionRate =
    students.length > 0 && publishedCourses.length > 0
      ? Math.round((completedCourses.length / Math.max(students.length, 1)) * 100)
      : 0;

  return {
    studentsTotal: students.length,
    activeStudents: students.length,
    publishedCourses: publishedCourses.length,
    draftCourses: draftCourses.length,
    certificates: validCertificates.length,
    moduleCompletions: data.moduleCompletions.length,
    lessonProgress: data.lessonProgress.length,
    completionRate: Math.min(100, completionRate),
    pendingReviews: draftCourses.length + Math.max(0, data.certificates.length - validCertificates.length),
  };
}

function buildRecentActivity(data: DashboardData) {
  const items: { icon: string; title: string; label: string; time: string }[] = [];

  data.certificates.slice(0, 2).forEach((certificate) => {
    items.push({
      icon: "✦",
      title: `Certificado emitido${certificate.course_title ? ` · ${certificate.course_title}` : ""}`,
      label: "Certificados",
      time: formatRelative(certificate.issued_at || certificate.created_at),
    });
  });

  data.courses.slice(0, 2).forEach((course) => {
    items.push({
      icon: "▱",
      title: `Curso disponible · ${course.title || "Curso GHC Academy"}`,
      label: "Cursos",
      time: formatRelative(course.updated_at || course.created_at),
    });
  });

  data.profiles.slice(0, 2).forEach((profile) => {
    items.push({
      icon: "◎",
      title: `Alumno registrado · ${profile.full_name || profile.email || "Nuevo alumno"}`,
      label: "Alumnos",
      time: formatRelative(profile.created_at),
    });
  });

  if (items.length === 0) {
    return [
      {
        icon: "◎",
        title: "Panel conectado y preparado para actividad real",
        label: "Sistema",
        time: "Ahora",
      },
      {
        icon: "▱",
        title: "Los eventos aparecerán cuando haya actividad en Supabase",
        label: "Actividad",
        time: "Próximamente",
      },
    ];
  }

  return items.slice(0, 5);
}

function buildPriorityTasks(data: DashboardData) {
  const draftCourses = data.courses.filter((course) =>
    ["draft", "borrador"].includes(String(course.status || "").toLowerCase())
  );

  const pendingCertificates = data.certificates.filter((certificate) =>
    ["pending", "pendiente", "review", "revision"].includes(String(certificate.status || "").toLowerCase())
  );

  const tasks: { title: string; text: string; tag: string }[] = [];

  draftCourses.slice(0, 2).forEach((course) => {
    tasks.push({
      title: course.title || "Curso en borrador",
      text: "Pendiente de revisión o publicación",
      tag: "Curso",
    });
  });

  pendingCertificates.slice(0, 2).forEach((certificate) => {
    tasks.push({
      title: certificate.course_title || "Certificado pendiente",
      text: "Revisar requisitos antes de emitir",
      tag: "Certificado",
    });
  });

  if (tasks.length === 0) {
    return [
      {
        title: "Sin incidencias críticas",
        text: "No hay revisiones urgentes detectadas en este momento",
        tag: "OK",
      },
      {
        title: "Pagos y accesos",
        text: "Pendiente conectar Stripe/SumUp para métricas reales",
        tag: "Próximo",
      },
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

          <div className="chart-area">
            <svg viewBox="0 0 900 260" aria-hidden="true">
              <defs>
                <linearGradient id="adminChartGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={GREEN} stopOpacity="0.42" />
                  <stop offset="100%" stopColor={GREEN} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M30 220 L110 190 L190 180 L270 135 L350 128 L430 86 L510 105 L590 92 L670 118 L750 72 L850 52"
                fill="none"
                stroke={GREEN}
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M30 220 L110 190 L190 180 L270 135 L350 128 L430 86 L510 105 L590 92 L670 118 L750 72 L850 52 L850 250 L30 250 Z"
                fill="url(#adminChartGradient)"
              />
              <path
                d="M30 185 L110 208 L190 174 L270 142 L350 118 L430 78 L510 108 L590 82 L670 98 L750 62 L850 88"
                fill="none"
                stroke="rgba(244,246,242,.42)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

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
          <div className="card-head compact">
            <h2>Actividad reciente</h2>
            <button type="button" onClick={() => setSystemMessage("Más adelante conectaremos el histórico completo de actividad.")}>Ver todo</button>
          </div>

          {recentActivity.map((item, index) => (
            <ActivityItem key={`${item.title}-${index}`} icon={item.icon} title={item.title} label={item.label} time={item.time} />
          ))}
        </article>

        <article className="platform-card">
          <h2>Estado de la plataforma</h2>
          <div className="platform-body">
            <div className="shield">✓</div>
            <div className="status-list">
              <StatusRow label="Supabase Auth" value="Operativo" />
              <StatusRow label="Ruta privada admin" value="Activa" />
              <StatusRow label="Rol administrador" value="Verificado" />
              <StatusRow label="Pagos" value="Pendiente" warning />
            </div>
          </div>
          <div className="platform-progress">
            <span>Base administrativa inicial</span>
            <strong>Activa</strong>
          </div>
        </article>

        <article className="review-card">
          <div className="card-head compact">
            <h2>Tareas prioritarias</h2>
            <button type="button" onClick={() => setSystemMessage("Las tareas reales se conectarán por módulo del administrador.")}>Ver todas</button>
          </div>

          {priorityTasks.map((item, index) => (
            <ReviewItem key={`${item.title}-${index}`} title={item.title} text={item.text} tag={item.tag} />
          ))}
        </article>

        <article className="studio-card">
          <div>
            <h2>Todo tu contenido, editable desde el panel</h2>
            <p>Studio GHC será el editor visual para landing, catálogo, textos, banners, checkout y experiencia pública. Sin tocar código para la mayoría de cambios.</p>
            <button type="button" onClick={() => setActiveTab("studio")}>Ir a Studio ↗</button>
          </div>
          <div className="studio-visual" aria-hidden="true">
            <div />
            <span />
            <span />
          </div>
        </article>
      </section>
    </div>
  );
}

function KpiCard({
  title,
  value,
  trend,
  icon,
  danger = false,
  muted = false,
}: {
  title: string;
  value: string;
  trend: string;
  icon: string;
  danger?: boolean;
  muted?: boolean;
}) {
  return (
    <article className={danger ? "kpi-card danger" : muted ? "kpi-card muted" : "kpi-card"}>
      <div className="kpi-top">
        <span>{title}</span>
        <em>{icon}</em>
      </div>
      <strong>{value}</strong>
      <p>{trend}</p>
      <div className="sparkline" />
    </article>
  );
}

function MiniMetric({ label, value, trend }: { label: string; value: string; trend: string }) {
  return (
    <div className="mini-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{trend}</em>
    </div>
  );
}

function QuickAction({
  icon,
  title,
  text,
  onClick,
}: {
  icon: string;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="quick-action" onClick={onClick}>
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
      <em>›</em>
    </button>
  );
}

function ActivityItem({
  icon,
  title,
  label,
  time,
}: {
  icon: string;
  title: string;
  label: string;
  time: string;
}) {
  return (
    <div className="activity-item">
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{label}</p>
      </div>
      <em>{time}</em>
    </div>
  );
}

function StatusRow({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return (
    <div className={warning ? "status-row warning" : "status-row"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ReviewItem({ title, text, tag }: { title: string; text: string; tag: string }) {
  return (
    <div className="review-item">
      <span>▣</span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
      <em>{tag}</em>
    </div>
  );
}

function ComingSoon({ tab }: { tab: AdminTab }) {
  return (
    <section className="coming-soon">
      <p className="admin-kicker">Módulo administrador</p>
      <h1>{getTabLabel(tab)}</h1>
      <p>Esta pestaña se construirá manteniendo la misma estética premium del área Alumno y del Panel administrador. La arquitectura ya queda preparada para hacerla funcional por fases.</p>
    </section>
  );
}

function Background() {
  return (
    <div className="admin-background" aria-hidden="true">
      <div className="admin-orb one" />
      <div className="admin-orb two" />
      <div className="admin-grid-texture" />
    </div>
  );
}

function isVisibleCourse(course: AnyRecord) {
  const status = String(course.status || "").toLowerCase();

  if (!status) return true;

  return ["published", "publicado", "active", "activo", "preview", "demo"].includes(status);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-ES").format(value || 0);
}

function formatRelative(value?: string | null) {
  if (!value) return "Reciente";

  try {
    const date = new Date(value);
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "Ahora";
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours} h`;
    if (days < 7) return `Hace ${days} días`;

    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return "Reciente";
  }
}

function getTabLabel(tab: AdminTab) {
  const found = adminTabs.find((item) => item.id === tab);
  return found?.label || "Panel";
}

function getInitials(name: string) {
  return String(name)
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function shortName(name: string) {
  return String(name).split("@")[0].split(" ")[0] || "Admin";
}

function GlobalStyles() {
  return (
    <style>{`
      :root {
        --green: #63e546;
        --green-soft: rgba(99,229,70,.14);
        --bg: #050706;
        --panel: rgba(10, 14, 12, .88);
        --panel-2: rgba(13, 18, 16, .96);
        --line: rgba(255,255,255,.085);
        --white: #f4f6f2;
        --muted: rgba(244,246,242,.64);
        --soft: rgba(244,246,242,.42);
        --danger: #ff5757;
        --warning: #f7c948;
      }

      * { box-sizing: border-box; }

      html, body {
        margin: 0;
        padding: 0;
        background: var(--bg);
      }

      body {
        color: var(--white);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      button, input, select {
        font: inherit;
      }

      .admin-page {
        min-height: 100vh;
        display: grid;
        grid-template-columns: 292px minmax(0, 1fr);
        background: var(--bg);
        color: var(--white);
        position: relative;
      }

      .admin-loading {
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: var(--bg);
        color: var(--white);
        position: relative;
      }

      .admin-loading-card {
        position: relative;
        z-index: 2;
        width: min(560px, calc(100vw - 40px));
        border: 1px solid var(--line);
        border-radius: 28px;
        background: linear-gradient(145deg, rgba(255,255,255,.08), rgba(255,255,255,.025));
        padding: 34px;
        box-shadow: 0 30px 90px rgba(0,0,0,.45);
      }

      .admin-loading-card h1 {
        margin: 18px 0 0;
        font-size: 38px;
        line-height: .95;
        letter-spacing: -.055em;
      }

      .admin-loading-card p {
        margin: 16px 0 0;
        color: var(--muted);
        font-size: 16px;
      }

      .admin-background {
        position: fixed;
        inset: 0;
        pointer-events: none;
        overflow: hidden;
        z-index: 0;
      }

      .admin-orb {
        position: absolute;
        width: 520px;
        height: 520px;
        border-radius: 999px;
        filter: blur(110px);
      }

      .admin-orb.one {
        left: -180px;
        top: -180px;
        background: rgba(99,229,70,.09);
      }

      .admin-orb.two {
        right: -240px;
        top: 120px;
        background: rgba(255,255,255,.055);
      }

      .admin-grid-texture {
        position: absolute;
        inset: 0;
        background-image:
          linear-gradient(rgba(255,255,255,.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,.02) 1px, transparent 1px);
        background-size: 42px 42px;
        opacity: .5;
        mask-image: radial-gradient(circle at center, black 0%, transparent 84%);
      }

      .admin-sidebar {
        position: sticky;
        top: 0;
        height: 100vh;
        z-index: 2;
        border-right: 1px solid var(--line);
        background: linear-gradient(180deg, rgba(5,8,7,.97), rgba(3,5,4,.94));
        padding: 22px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }

      .admin-logo {
        min-height: 58px;
        display: flex;
        align-items: center;
        margin-bottom: 24px;
      }

      .admin-nav {
        display: grid;
        gap: 6px;
      }

      .admin-nav-item {
        width: 100%;
        min-height: 47px;
        border: 1px solid transparent;
        background: transparent;
        color: rgba(244,246,242,.65);
        border-radius: 13px;
        padding: 0 13px;
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        text-align: left;
        transition: .18s ease;
      }

      .admin-nav-item:hover {
        color: var(--white);
        background: rgba(255,255,255,.035);
      }

      .admin-nav-item.active {
        color: var(--green);
        background: linear-gradient(90deg, rgba(99,229,70,.15), rgba(99,229,70,.035));
        border-color: rgba(99,229,70,.16);
        box-shadow: inset 3px 0 0 var(--green);
      }

      .admin-nav-icon {
        width: 24px;
        color: currentColor;
        font-weight: 900;
        display: inline-flex;
        justify-content: center;
      }

      .admin-nav-item strong {
        display: block;
        font-size: 13px;
        line-height: 1.05;
      }

      .admin-nav-item small {
        display: block;
        margin-top: 3px;
        color: var(--soft);
        font-size: 11px;
      }

      .admin-sidebar-bottom {
        display: grid;
        gap: 14px;
      }

      .support-card,
      .admin-user-card {
        border: 1px solid var(--line);
        border-radius: 18px;
        background: rgba(255,255,255,.035);
        padding: 16px;
      }

      .support-card {
        display: grid;
        grid-template-columns: 40px minmax(0,1fr);
        gap: 12px;
      }

      .support-card button {
        grid-column: 1 / -1;
        min-height: 38px;
        border-radius: 10px;
        border: 1px solid rgba(99,229,70,.28);
        color: var(--green);
        background: rgba(99,229,70,.06);
        cursor: pointer;
        font-weight: 850;
      }

      .support-icon,
      .admin-user-card > span {
        width: 40px;
        height: 40px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        background: rgba(99,229,70,.1);
        color: var(--green);
        border: 1px solid rgba(99,229,70,.18);
        font-weight: 950;
      }

      .support-card p,
      .admin-user-card p {
        margin: 3px 0 0;
        color: var(--muted);
        font-size: 12px;
      }

      .admin-user-card {
        display: grid;
        grid-template-columns: 42px minmax(0,1fr);
        gap: 12px;
        align-items: center;
      }

      .admin-shell {
        position: relative;
        z-index: 1;
        min-width: 0;
        padding: 18px 20px 30px;
      }

      .admin-topbar {
        min-height: 58px;
        border-bottom: 1px solid var(--line);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        margin-bottom: 18px;
      }

      .breadcrumb {
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--muted);
        font-size: 13px;
        font-weight: 850;
        white-space: nowrap;
      }

      .breadcrumb strong {
        color: var(--white);
      }

      .topbar-actions {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }

      .admin-search {
        width: 320px;
        max-width: 32vw;
        height: 40px;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: rgba(255,255,255,.035);
        color: var(--muted);
        display: flex;
        align-items: center;
        padding: 0 16px;
        font-size: 13px;
      }

      .create-btn,
      .studio-top-btn {
        min-height: 40px;
        border-radius: 999px;
        padding: 0 16px;
        cursor: pointer;
        font-weight: 900;
      }

      .create-btn {
        border: 0;
        background: var(--green);
        color: #061008;
      }

      .studio-top-btn {
        border: 1px solid rgba(99,229,70,.24);
        background: rgba(99,229,70,.07);
        color: var(--green);
      }

      .icon-btn {
        width: 40px;
        height: 40px;
        border-radius: 999px;
        border: 1px solid var(--line);
        color: var(--white);
        background: rgba(255,255,255,.035);
        cursor: pointer;
      }

      .topbar-user {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .topbar-user > span {
        width: 42px;
        height: 42px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        background: rgba(99,229,70,.11);
        color: var(--green);
        font-weight: 950;
      }

      .topbar-user p {
        margin: 2px 0 0;
        color: var(--muted);
        font-size: 12px;
      }

      .admin-notice {
        margin-bottom: 14px;
        border-radius: 14px;
        border: 1px solid rgba(99,229,70,.2);
        background: rgba(99,229,70,.055);
        color: var(--muted);
        padding: 14px 16px;
      }

      .panel-page {
        display: grid;
        gap: 16px;
      }

      .admin-hero {
        min-height: 128px;
        border: 1px solid var(--line);
        border-radius: 22px;
        background:
          linear-gradient(90deg, rgba(9,13,11,.98), rgba(9,13,11,.76)),
          radial-gradient(circle at 80% 20%, rgba(99,229,70,.13), transparent 30%);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 26px;
        overflow: hidden;
        position: relative;
        box-shadow: 0 28px 90px rgba(0,0,0,.22);
      }

      .admin-kicker {
        margin: 0 0 10px;
        color: var(--green);
        text-transform: uppercase;
        letter-spacing: .18em;
        font-size: 11px;
        font-weight: 950;
      }

      .admin-hero h1 {
        margin: 0;
        font-size: clamp(36px, 4vw, 54px);
        line-height: .94;
        letter-spacing: -.06em;
        font-weight: 950;
      }

      .admin-hero p:not(.admin-kicker) {
        margin: 12px 0 0;
        color: var(--muted);
        line-height: 1.6;
        max-width: 720px;
      }

      .hero-athlete {
        width: 360px;
        height: 130px;
        opacity: .62;
        background:
          radial-gradient(circle at 45% 50%, rgba(244,246,242,.18), transparent 22%),
          radial-gradient(circle at 58% 42%, rgba(244,246,242,.12), transparent 18%),
          radial-gradient(circle at 70% 34%, rgba(244,246,242,.1), transparent 14%),
          linear-gradient(120deg, transparent 20%, rgba(99,229,70,.18), transparent 60%);
        clip-path: polygon(4% 70%, 22% 48%, 40% 55%, 58% 20%, 83% 30%, 100% 14%, 85% 42%, 66% 40%, 50% 70%, 26% 65%, 8% 88%);
      }

      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 12px;
      }

      .kpi-card,
      .growth-card,
      .quick-actions-card,
      .activity-card,
      .platform-card,
      .review-card,
      .studio-card,
      .coming-soon {
        border: 1px solid var(--line);
        border-radius: 18px;
        background: var(--panel);
        box-shadow: 0 22px 70px rgba(0,0,0,.18);
      }

      .kpi-card {
        min-height: 136px;
        padding: 16px;
        overflow: hidden;
      }

      .kpi-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: var(--muted);
        font-size: 13px;
      }

      .kpi-top em {
        width: 34px;
        height: 34px;
        border-radius: 11px;
        display: grid;
        place-items: center;
        background: rgba(99,229,70,.09);
        color: var(--green);
        border: 1px solid rgba(99,229,70,.14);
        font-style: normal;
        font-weight: 950;
      }

      .kpi-card.danger .kpi-top em {
        color: var(--danger);
        background: rgba(255,87,87,.08);
        border-color: rgba(255,87,87,.16);
      }

      .kpi-card.muted .kpi-top em {
        color: var(--soft);
        background: rgba(255,255,255,.045);
      }

      .kpi-card > strong {
        display: block;
        margin-top: 12px;
        font-size: 29px;
        letter-spacing: -.045em;
      }

      .kpi-card p {
        margin: 6px 0 0;
        color: var(--green);
        font-size: 12px;
        font-weight: 850;
      }

      .kpi-card.danger p {
        color: var(--danger);
      }

      .kpi-card.muted p {
        color: var(--muted);
      }

      .sparkline {
        height: 28px;
        margin-top: 12px;
        background: linear-gradient(90deg, rgba(99,229,70,.12), rgba(99,229,70,.5), rgba(99,229,70,.18));
        clip-path: polygon(0 64%, 12% 50%, 22% 58%, 34% 34%, 47% 46%, 62% 24%, 78% 28%, 100% 8%, 100% 100%, 0 100%);
        opacity: .75;
      }

      .danger .sparkline {
        background: linear-gradient(90deg, rgba(255,87,87,.12), rgba(255,87,87,.55), rgba(255,87,87,.18));
      }

      .muted .sparkline {
        background: linear-gradient(90deg, rgba(255,255,255,.04), rgba(255,255,255,.18), rgba(255,255,255,.07));
      }

      .admin-main-grid {
        display: grid;
        grid-template-columns: 1.18fr .95fr;
        gap: 14px;
      }

      .growth-card {
        padding: 18px;
        min-height: 370px;
      }

      .card-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
        margin-bottom: 14px;
      }

      .card-head.compact {
        align-items: center;
      }

      .card-head h2,
      .quick-actions-card h2,
      .platform-card h2,
      .studio-card h2,
      .coming-soon h1 {
        margin: 0;
        font-size: 21px;
        line-height: 1.05;
        letter-spacing: -.035em;
      }

      .card-head p {
        margin: 6px 0 0;
        color: var(--muted);
        font-size: 13px;
      }

      .card-head button {
        min-height: 34px;
        border-radius: 10px;
        border: 1px solid var(--line);
        background: rgba(255,255,255,.035);
        color: var(--white);
        padding: 0 12px;
        cursor: pointer;
      }

      .chart-area {
        min-height: 230px;
        border: 1px solid rgba(255,255,255,.06);
        border-radius: 16px;
        background:
          linear-gradient(rgba(255,255,255,.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,.02) 1px, transparent 1px);
        background-size: 50px 50px;
        overflow: hidden;
      }

      .chart-area svg {
        width: 100%;
        height: 230px;
        display: block;
      }

      .chart-summary {
        margin-top: 14px;
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        border: 1px solid var(--line);
        border-radius: 14px;
        overflow: hidden;
      }

      .mini-metric {
        padding: 13px 14px;
        border-right: 1px solid var(--line);
        min-width: 0;
      }

      .mini-metric:last-child {
        border-right: 0;
      }

      .mini-metric span {
        display: block;
        color: var(--muted);
        font-size: 12px;
      }

      .mini-metric strong {
        display: inline-block;
        margin-top: 5px;
        font-size: 19px;
      }

      .mini-metric em {
        color: var(--green);
        margin-left: 8px;
        font-style: normal;
        font-size: 11px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: .08em;
      }

      .quick-actions-card,
      .activity-card,
      .platform-card,
      .review-card,
      .studio-card {
        padding: 18px;
      }

      .quick-actions-grid {
        margin-top: 16px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .quick-action {
        min-height: 76px;
        border-radius: 14px;
        border: 1px solid var(--line);
        background: rgba(255,255,255,.028);
        color: var(--white);
        display: grid;
        grid-template-columns: 42px minmax(0,1fr) 18px;
        gap: 12px;
        align-items: center;
        padding: 12px;
        cursor: pointer;
        text-align: left;
      }

      .quick-action:hover {
        border-color: rgba(99,229,70,.24);
        background: rgba(99,229,70,.055);
      }

      .quick-action > span,
      .activity-item > span,
      .review-item > span {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        display: grid;
        place-items: center;
        background: rgba(99,229,70,.09);
        color: var(--green);
        border: 1px solid rgba(99,229,70,.16);
        font-weight: 950;
      }

      .quick-action p,
      .activity-item p,
      .review-item p,
      .studio-card p {
        margin: 4px 0 0;
        color: var(--muted);
        font-size: 12px;
        line-height: 1.45;
      }

      .quick-action em {
        color: var(--muted);
        font-style: normal;
        font-size: 22px;
      }

      .activity-card {
        min-height: 290px;
      }

      .activity-item,
      .review-item {
        display: grid;
        grid-template-columns: 40px minmax(0,1fr) auto;
        gap: 12px;
        align-items: center;
        padding: 10px 0;
        border-top: 1px solid rgba(255,255,255,.055);
      }

      .activity-item em {
        color: var(--muted);
        font-style: normal;
        font-size: 12px;
      }

      .platform-card {
        min-height: 230px;
      }

      .platform-body {
        display: grid;
        grid-template-columns: 112px minmax(0,1fr);
        gap: 18px;
        align-items: center;
        margin-top: 18px;
      }

      .shield {
        width: 106px;
        height: 106px;
        border-radius: 30px;
        display: grid;
        place-items: center;
        color: var(--green);
        font-size: 44px;
        background: radial-gradient(circle, rgba(99,229,70,.2), rgba(99,229,70,.04));
        border: 1px solid rgba(99,229,70,.18);
      }

      .status-list {
        display: grid;
        gap: 11px;
      }

      .status-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        color: var(--muted);
      }

      .status-row strong {
        color: var(--green);
      }

      .status-row.warning strong {
        color: var(--warning);
      }

      .platform-progress {
        margin-top: 18px;
        display: flex;
        justify-content: space-between;
        border-top: 1px solid var(--line);
        padding-top: 14px;
        color: var(--muted);
      }

      .platform-progress strong {
        color: var(--white);
      }

      .review-item em {
        border-radius: 999px;
        padding: 5px 8px;
        background: rgba(99,229,70,.1);
        color: var(--green);
        font-style: normal;
        font-size: 11px;
        font-weight: 900;
      }

      .studio-card {
        grid-column: 2 / 3;
        display: grid;
        grid-template-columns: minmax(0,1fr) 180px;
        gap: 18px;
        align-items: center;
        background:
          radial-gradient(circle at 78% 50%, rgba(99,229,70,.11), transparent 34%),
          var(--panel);
      }

      .studio-card button {
        margin-top: 14px;
        min-height: 42px;
        border-radius: 10px;
        border: 1px solid rgba(99,229,70,.32);
        background: rgba(99,229,70,.08);
        color: var(--green);
        font-weight: 900;
        cursor: pointer;
        padding: 0 16px;
      }

      .studio-visual {
        height: 104px;
        border-radius: 14px;
        border: 1px solid var(--line);
        background: rgba(255,255,255,.035);
        padding: 16px;
        display: grid;
        gap: 10px;
      }

      .studio-visual div,
      .studio-visual span {
        border-radius: 8px;
        background: rgba(255,255,255,.12);
      }

      .studio-visual div {
        height: 36px;
        position: relative;
      }

      .studio-visual div:after {
        content: "";
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        border-left: 10px solid var(--green);
        border-top: 7px solid transparent;
        border-bottom: 7px solid transparent;
      }

      .studio-visual span {
        height: 9px;
      }

      .coming-soon {
        min-height: 420px;
        padding: 34px;
        display: grid;
        align-content: center;
      }

      .coming-soon p:not(.admin-kicker) {
        max-width: 720px;
        color: var(--muted);
        line-height: 1.7;
      }

      @media (max-width: 1380px) {
        .kpi-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .admin-main-grid {
          grid-template-columns: 1fr;
        }

        .studio-card {
          grid-column: auto;
        }
      }

      @media (max-width: 1080px) {
        .admin-page {
          grid-template-columns: 1fr;
        }

        .admin-sidebar {
          position: relative;
          height: auto;
        }

        .topbar-actions {
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .admin-search {
          width: 100%;
          max-width: none;
        }

        .chart-summary,
        .quick-actions-grid,
        .kpi-grid {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  );
}
