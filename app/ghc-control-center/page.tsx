"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import GHCLogo from "../components/GHCLogo";

type AnyRecord = Record<string, any>;

type AdminTab =
  | "panel"
  | "alumnos"
  | "cursos"
  | "contenido"
  | "ventas"
  | "analitica"
  | "certificados"
  | "comunicaciones"
  | "seguridad"
  | "studio"
  | "ajustes";

type GuardState = "checking" | "allowed" | "denied";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const GREEN = "#63E546";

const adminTabs: { id: AdminTab; label: string; icon: string }[] = [
  { id: "panel", label: "Panel", icon: "⌂" },
  { id: "alumnos", label: "Alumnos", icon: "◎" },
  { id: "cursos", label: "Cursos", icon: "▱" },
  { id: "contenido", label: "Contenido", icon: "▤" },
  { id: "ventas", label: "Ventas", icon: "◷" },
  { id: "analitica", label: "Analítica", icon: "⌁" },
  { id: "certificados", label: "Certificados", icon: "✦" },
  { id: "comunicaciones", label: "Comunicaciones", icon: "✉" },
  { id: "seguridad", label: "Seguridad", icon: "◇" },
  { id: "studio", label: "Studio", icon: "▣" },
  { id: "ajustes", label: "Ajustes", icon: "⚙" },
];

export default function Page() {
  const router = useRouter();
  const [guardState, setGuardState] = useState<GuardState>("checking");
  const [adminUser, setAdminUser] = useState<AnyRecord | null>(null);
  const [profile, setProfile] = useState<AnyRecord | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("panel");

  useEffect(() => {
    async function protectAdminRoute() {
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
      } catch (error) {
        console.error(error);
        setGuardState("denied");
        router.replace("/alumno");
      }
    }

    protectAdminRoute();
  }, [router]);

  const displayName =
    profile?.full_name ||
    adminUser?.user_metadata?.full_name ||
    adminUser?.email ||
    "Admin GHC";

  const initials = getInitials(displayName);

  const stats = useMemo(
    () => ({
      alumnosActivos: "2,458",
      cursosPublicados: "24",
      ingresosMes: "$248,760",
      tasaFinalizacion: "68.3%",
      pendientes: "18",
    }),
    []
  );

  if (guardState === "checking") {
    return (
      <main className="admin-loading">
        <GlobalStyles />
        <Background />
        <section className="admin-loading-card">
          <GHCLogo size="md" showText tagline={false} />
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
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="admin-sidebar-bottom">
          <div className="support-card">
            <span className="support-icon">◉</span>
            <div>
              <strong>Soporte GHC</strong>
              <p>Centro de ayuda</p>
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

        {activeTab === "panel" ? <PanelAdmin stats={stats} /> : <ComingSoon tab={activeTab} />}
      </section>
    </main>
  );
}

function PanelAdmin({ stats }: { stats: AnyRecord }) {
  return (
    <div className="panel-page">
      <section className="admin-hero">
        <div>
          <h1>Panel de control</h1>
          <p>Gestiona y haz crecer tu academia desde un único lugar.</p>
        </div>
        <div className="hero-athlete" aria-hidden="true" />
      </section>

      <section className="kpi-grid">
        <KpiCard title="Alumnos activos" value={stats.alumnosActivos} trend="+18.6%" icon="◎" />
        <KpiCard title="Cursos publicados" value={stats.cursosPublicados} trend="+9.1%" icon="▱" />
        <KpiCard title="Ingresos del mes" value={stats.ingresosMes} trend="+16.4%" icon="$" />
        <KpiCard title="Tasa de finalización" value={stats.tasaFinalizacion} trend="+6.7%" icon="✓" />
        <KpiCard title="Pendientes" value={stats.pendientes} trend="-5.2%" icon="◷" danger />
      </section>

      <section className="admin-main-grid">
        <article className="growth-card">
          <div className="card-head">
            <div>
              <h2>Crecimiento de la academia</h2>
              <p>Alumnos activos e ingresos acumulados durante el mes.</p>
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
            <MiniMetric label="Nuevos alumnos" value="186" trend="+24.3%" />
            <MiniMetric label="Ingresos acumulados" value="$248,760" trend="+16.4%" />
            <MiniMetric label="Cursos completados" value="1,326" trend="+12.7%" />
            <MiniMetric label="Certificados emitidos" value="964" trend="+9.4%" />
          </div>
        </article>

        <article className="quick-actions-card">
          <h2>Acciones rápidas</h2>
          <div className="quick-actions-grid">
            <QuickAction icon="▱" title="Crear curso" text="Añade un nuevo curso" />
            <QuickAction icon="＋" title="Añadir módulo" text="Crea contenido educativo" />
            <QuickAction icon="✦" title="Emitir certificado" text="Reconoce logros" />
            <QuickAction icon="➤" title="Enviar comunicado" text="Informa a tu comunidad" />
          </div>
        </article>

        <article className="activity-card">
          <div className="card-head compact">
            <h2>Actividad reciente</h2>
            <button type="button">Ver todo</button>
          </div>
          <ActivityItem icon="◎" title="María González completó Biomecánica Funcional" label="Alumno" time="Hace 5 min" />
          <ActivityItem icon="▱" title="Nuevo curso publicado: Adaptaciones Neuromusculares" label="Curso" time="Hace 15 min" />
          <ActivityItem icon="$" title="Pago recibido: Suscripción Pro Anual" label="Venta" time="Hace 28 min" />
          <ActivityItem icon="✦" title="Certificado emitido a Laura Méndez" label="Certificados" time="Hace 45 min" />
          <ActivityItem icon="✉" title="Comunicado enviado: Nuevos cursos disponibles" label="Comunicaciones" time="Hace 1 h" />
        </article>

        <article className="platform-card">
          <h2>Estado de la plataforma</h2>
          <div className="platform-body">
            <div className="shield">✓</div>
            <div className="status-list">
              <StatusRow label="Plataforma web" />
              <StatusRow label="Sistema de pagos" />
              <StatusRow label="Entrega de email" />
              <StatusRow label="Almacenamiento" />
            </div>
          </div>
          <div className="platform-progress">
            <span>Todos los sistemas operativos</span>
            <strong>100%</strong>
          </div>
        </article>

        <article className="review-card">
          <div className="card-head compact">
            <h2>Revisiones pendientes</h2>
            <button type="button">Ver todas</button>
          </div>
          <ReviewItem title="Curso: Hipertrofia Avanzada" text="Contenido pendiente de revisión" tag="Alta" />
          <ReviewItem title="Comentario de Ana Ruiz" text="En Biomecánica Funcional" tag="Media" />
          <ReviewItem title="Certificado: Javier Torres" text="Verificación de requisitos" tag="Media" />
          <ReviewItem title="Actualización de módulo: Fuerza Máxima" text="Cambios pendientes de publicación" tag="Baja" />
        </article>

        <article className="studio-card">
          <div>
            <h2>Todo tu contenido, editable desde el panel</h2>
            <p>Edita cursos, módulos, páginas y comunicaciones desde Studio GHC. Sin código, sin límites.</p>
            <button type="button">Ir a Studio ↗</button>
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
}: {
  title: string;
  value: string;
  trend: string;
  icon: string;
  danger?: boolean;
}) {
  return (
    <article className={danger ? "kpi-card danger" : "kpi-card"}>
      <div className="kpi-top">
        <span>{title}</span>
        <em>{icon}</em>
      </div>
      <strong>{value}</strong>
      <p>{trend} <span>vs. mes anterior</span></p>
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

function QuickAction({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <button type="button" className="quick-action">
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

function StatusRow({ label }: { label: string }) {
  return (
    <div className="status-row">
      <span>{label}</span>
      <strong>Operativo</strong>
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
      <h1>{getTabLabel(tab)}</h1>
      <p>Esta pestaña se construirá manteniendo la misma estética premium del área Alumno y del Panel administrador.</p>
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
        grid-template-columns: 280px minmax(0, 1fr);
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

      .admin-loading-card p {
        margin: 20px 0 0;
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
        min-height: 46px;
        border: 1px solid transparent;
        background: transparent;
        color: rgba(244,246,242,.65);
        border-radius: 12px;
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
        padding: 18px 20px 28px;
      }

      .admin-topbar {
        min-height: 54px;
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
      }

      .breadcrumb strong {
        color: var(--white);
      }

      .topbar-actions {
        display: flex;
        align-items: center;
        gap: 12px;
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

      .panel-page {
        display: grid;
        gap: 16px;
      }

      .admin-hero {
        min-height: 112px;
        border: 1px solid var(--line);
        border-radius: 20px;
        background:
          linear-gradient(90deg, rgba(9,13,11,.98), rgba(9,13,11,.78)),
          radial-gradient(circle at 80% 20%, rgba(99,229,70,.13), transparent 30%);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 24px;
        overflow: hidden;
        position: relative;
      }

      .admin-hero h1 {
        margin: 0;
        font-size: clamp(32px, 4vw, 48px);
        line-height: .94;
        letter-spacing: -.055em;
        font-weight: 950;
      }

      .admin-hero p {
        margin: 12px 0 0;
        color: var(--muted);
        line-height: 1.6;
      }

      .hero-athlete {
        width: 320px;
        height: 120px;
        opacity: .55;
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
        min-height: 132px;
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

      .kpi-card > strong {
        display: block;
        margin-top: 12px;
        font-size: 30px;
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

      .kpi-card p span {
        color: var(--muted);
        font-weight: 500;
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

      .admin-main-grid {
        display: grid;
        grid-template-columns: 1.18fr .95fr;
        gap: 14px;
      }

      .growth-card {
        padding: 18px;
        min-height: 360px;
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
        font-size: 12px;
        font-weight: 900;
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
        min-height: 72px;
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
        min-height: 285px;
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
        background: rgba(247,201,72,.1);
        color: var(--warning);
        font-style: normal;
        font-size: 11px;
        font-weight: 900;
      }

      .review-item:first-of-type em {
        color: var(--danger);
        background: rgba(255,87,87,.1);
      }

      .review-item:last-child em {
        color: var(--green);
        background: rgba(99,229,70,.1);
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

      .coming-soon p {
        max-width: 720px;
        color: var(--muted);
        line-height: 1.7;
      }

      @media (max-width: 1280px) {
        .kpi-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .admin-main-grid {
          grid-template-columns: 1fr;
        }

        .studio-card {
          grid-column: auto;
        }
      }

      @media (max-width: 980px) {
        .admin-page {
          grid-template-columns: 1fr;
        }

        .admin-sidebar {
          position: relative;
          height: auto;
        }

        .chart-summary,
        .quick-actions-grid {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  );
}
