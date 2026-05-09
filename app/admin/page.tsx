import GHCLogo from "../components/GHCLogo";

type NavItem = {
  label: string;
  icon: string;
  active?: boolean;
};

type StatCard = {
  title: string;
  value: string;
  trend: string;
  trendTone?: "good" | "bad" | "neutral";
  icon: string;
  spark?: "up" | "soft" | "flat" | "danger";
};

type ActivityItem = {
  icon: string;
  title: string;
  category: string;
  time: string;
};

type PendingItem = {
  icon: string;
  title: string;
  detail: string;
  priority: "Alta" | "Media" | "Baja";
  time: string;
};

const navItems: NavItem[] = [
  { label: "Panel", icon: "⌂", active: true },
  { label: "Alumnos", icon: "◎" },
  { label: "Cursos", icon: "▱" },
  { label: "Contenido", icon: "▤" },
  { label: "Ventas", icon: "◷" },
  { label: "Analítica", icon: "▥" },
  { label: "Certificados", icon: "◇" },
  { label: "Comunicaciones", icon: "✉" },
  { label: "Seguridad", icon: "⬡" },
  { label: "Studio", icon: "▧" },
  { label: "Ajustes", icon: "⚙" },
];

const stats: StatCard[] = [
  {
    title: "Alumnos activos",
    value: "2,458",
    trend: "+18.6% vs. mes anterior",
    icon: "◎",
    spark: "up",
  },
  {
    title: "Cursos publicados",
    value: "24",
    trend: "+9.1% vs. mes anterior",
    icon: "▱",
    spark: "soft",
  },
  {
    title: "Ingresos del mes",
    value: "$248,760",
    trend: "+16.4% vs. mes anterior",
    icon: "$",
    spark: "up",
  },
  {
    title: "Tasa de finalización",
    value: "68.3%",
    trend: "+6.7% vs. mes anterior",
    icon: "✓",
    spark: "flat",
  },
  {
    title: "Pendientes",
    value: "18",
    trend: "-5.2% vs. mes anterior",
    trendTone: "bad",
    icon: "◷",
    spark: "danger",
  },
];

const recentActivity: ActivityItem[] = [
  {
    icon: "◎",
    title: "María González completó Biomecánica Funcional",
    category: "Alumno",
    time: "Hace 5 min",
  },
  {
    icon: "▱",
    title: "Nuevo curso publicado: Adaptaciones Neuromusculares",
    category: "Curso",
    time: "Hace 15 min",
  },
  {
    icon: "$",
    title: "Pago recibido: Suscripción Pro Anual",
    category: "Venta",
    time: "Hace 28 min",
  },
  {
    icon: "◇",
    title: "Certificado emitido a Laura Méndez",
    category: "Certificados",
    time: "Hace 45 min",
  },
  {
    icon: "✉",
    title: "Comunicado enviado: Nuevos cursos disponibles",
    category: "Comunicaciones",
    time: "Hace 1 h",
  },
];

const pendingReviews: PendingItem[] = [
  {
    icon: "▤",
    title: "Curso: Hipertrofia Avanzada",
    detail: "Contenido pendiente de revisión",
    priority: "Alta",
    time: "Hace 1 h",
  },
  {
    icon: "☰",
    title: "Comentario de Ana Ruiz",
    detail: "En Biomecánica Funcional",
    priority: "Media",
    time: "Hace 3 h",
  },
  {
    icon: "◇",
    title: "Certificado: Javier Torres",
    detail: "Verificación de requisitos",
    priority: "Media",
    time: "Hace 5 h",
  },
  {
    icon: "↻",
    title: "Actualización de módulo: Fuerza Máxima",
    detail: "Cambios pendientes de publicación",
    priority: "Baja",
    time: "Hace 12 h",
  },
];

const quickActions = [
  { icon: "▱", title: "Crear curso", detail: "Añade un nuevo curso" },
  { icon: "⊞", title: "Añadir módulo", detail: "Crea contenido educativo" },
  { icon: "◇", title: "Emitir certificado", detail: "Reconoce logros" },
  { icon: "✈", title: "Enviar comunicado", detail: "Informa a tu comunidad" },
];

function Sparkline({ tone = "up" }: { tone?: StatCard["spark"] }) {
  const path =
    tone === "danger"
      ? "M2 28 C18 24 28 31 42 27 C56 23 66 32 80 27 C96 21 104 28 118 26 C134 24 140 37 154 31"
      : tone === "flat"
        ? "M2 29 C20 29 32 28 46 28 C62 27 72 28 86 27 C104 26 120 27 154 24"
        : tone === "soft"
          ? "M2 30 C20 31 32 25 46 27 C62 24 74 28 86 24 C104 18 124 23 154 17"
          : "M2 31 C18 28 28 25 40 27 C54 29 68 16 82 19 C98 21 110 14 124 12 C138 10 146 8 154 5";

  return (
    <svg
      className={tone === "danger" ? "admin-spark danger" : "admin-spark"}
      viewBox="0 0 156 42"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

function Sidebar() {
  return (
    <aside className="admin-sidebar">
      <div>
        <div className="admin-logo-wrap">
          <GHCLogo size="md" showText tagline={false} />
        </div>

        <p className="admin-sidebar-label">Administración</p>

        <nav className="admin-nav" aria-label="Administración GHC Academy">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={
                item.active ? "admin-nav-item active" : "admin-nav-item"
              }
            >
              <span className="admin-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="admin-sidebar-bottom">
        <div className="admin-support-card">
          <span className="admin-support-icon">◉</span>
          <div>
            <strong>Soporte GHC</strong>
            <p>Centro de ayuda</p>
          </div>
          <button type="button">Abrir soporte</button>
        </div>

        <div className="admin-profile-card">
          <span>AD</span>
          <div>
            <strong>Admin GHC</strong>
            <p>Administrador</p>
          </div>
          <em>⌄</em>
        </div>
      </div>
    </aside>
  );
}

function StatCardItem({ item }: { item: StatCard }) {
  const tone = item.trendTone || "good";

  return (
    <article
      className={tone === "bad" ? "admin-stat-card is-bad" : "admin-stat-card"}
    >
      <div className="admin-stat-head">
        <span>{item.title}</span>
        <i>{item.icon}</i>
      </div>
      <strong>{item.value}</strong>
      <p className={tone === "bad" ? "bad" : ""}>{item.trend}</p>
      <Sparkline tone={item.spark} />
    </article>
  );
}

function ActivityPanel() {
  return (
    <section className="admin-card admin-activity-card">
      <div className="admin-card-head">
        <div>
          <h2>Actividad reciente</h2>
          <p>Eventos recientes de la plataforma</p>
        </div>
        <button type="button">Ver todo</button>
      </div>

      <div className="admin-activity-list">
        {recentActivity.map((item) => (
          <article key={item.title} className="admin-activity-row">
            <span>{item.icon}</span>
            <div>
              <strong>{item.title}</strong>
              <p>{item.category}</p>
            </div>
            <time>{item.time}</time>
          </article>
        ))}
      </div>
    </section>
  );
}

function PlatformStatus() {
  const services = [
    "Plataforma web",
    "Sistema de pagos",
    "Entrega de email",
    "Almacenamiento",
  ];

  return (
    <section className="admin-card admin-platform-card">
      <div className="admin-card-head compact">
        <div>
          <h2>Estado de la plataforma</h2>
          <p>Sistemas operativos y servicios críticos</p>
        </div>
      </div>

      <div className="admin-platform-body">
        <div className="admin-shield">✓</div>
        <div className="admin-service-list">
          {services.map((service) => (
            <div key={service}>
              <span>{service}</span>
              <strong>Operativo</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-platform-footer">
        <span>Todos los sistemas operativos</span>
        <strong>100%</strong>
      </div>
      <div className="admin-progress-track">
        <div style={{ width: "100%" }} />
      </div>
    </section>
  );
}

function PendingReviews() {
  return (
    <section className="admin-card admin-pending-card">
      <div className="admin-card-head compact">
        <div>
          <h2>Revisiones pendientes</h2>
          <p>Tareas que requieren atención</p>
        </div>
        <button type="button">Ver todas</button>
      </div>

      <div className="admin-pending-list">
        {pendingReviews.map((item) => (
          <article key={item.title} className="admin-pending-row">
            <span>{item.icon}</span>
            <div>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </div>
            <b className={`priority priority-${item.priority.toLowerCase()}`}>
              {item.priority}
            </b>
            <time>{item.time}</time>
          </article>
        ))}
      </div>
    </section>
  );
}

function QuickActions() {
  return (
    <section className="admin-card admin-quick-card">
      <h2>Acciones rápidas</h2>
      <div className="admin-quick-grid">
        {quickActions.map((action) => (
          <button
            key={action.title}
            type="button"
            className="admin-quick-action"
          >
            <span>{action.icon}</span>
            <div>
              <strong>{action.title}</strong>
              <p>{action.detail}</p>
            </div>
            <em>›</em>
          </button>
        ))}
      </div>
    </section>
  );
}

function GrowthChart() {
  return (
    <section className="admin-card admin-growth-card">
      <div className="admin-card-head">
        <div>
          <h2>Crecimiento de la academia</h2>
          <p>Alumnos activos e ingresos acumulados</p>
        </div>
        <button type="button">Este mes ⌄</button>
      </div>

      <div className="admin-chart-wrap">
        <div className="chart-legend">
          <span>
            <i /> Alumnos activos
          </span>
          <span>
            <i className="muted" /> Ingresos ($)
          </span>
        </div>
        <svg
          className="admin-growth-chart"
          viewBox="0 0 900 270"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="greenArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(99,229,70,.42)" />
              <stop offset="100%" stopColor="rgba(99,229,70,0)" />
            </linearGradient>
          </defs>
          <path
            className="grid-line"
            d="M40 220 H860 M40 170 H860 M40 120 H860 M40 70 H860"
          />
          <path
            className="grid-line vertical"
            d="M40 42 V220 M210 42 V220 M380 42 V220 M550 42 V220 M720 42 V220 M860 42 V220"
          />
          <path
            className="gray-line"
            d="M40 158 C90 172 112 146 150 156 C196 166 230 126 278 118 C328 108 350 82 402 72 C450 62 486 98 532 86 C580 76 612 102 662 91 C710 78 740 44 786 58 C828 70 846 50 860 42"
          />
          <path
            className="green-area"
            d="M40 215 C90 204 116 184 152 186 C198 187 230 148 278 142 C326 136 360 120 408 100 C456 80 500 108 548 98 C596 87 628 112 668 103 C716 92 744 70 788 82 C824 93 842 59 860 70 V220 H40 Z"
          />
          <path
            className="green-line"
            d="M40 215 C90 204 116 184 152 186 C198 187 230 148 278 142 C326 136 360 120 408 100 C456 80 500 108 548 98 C596 87 628 112 668 103 C716 92 744 70 788 82 C824 93 842 59 860 70"
          />
          <circle className="green-point" cx="860" cy="70" r="6" />
        </svg>
        <div className="admin-chart-tooltip">
          <strong>31 May</strong>
          <span>
            <i /> Alumnos 2,458
          </span>
          <span>
            <i className="muted" /> Ingresos $248,760
          </span>
        </div>
      </div>

      <div className="admin-chart-metrics">
        <div>
          <span>Nuevos alumnos</span>
          <strong>186</strong>
          <em>+24.3%</em>
        </div>
        <div>
          <span>Ingresos acumulados</span>
          <strong>$248,760</strong>
          <em>+16.4%</em>
        </div>
        <div>
          <span>Cursos completados</span>
          <strong>1,326</strong>
          <em>+12.7%</em>
        </div>
        <div>
          <span>Certificados emitidos</span>
          <strong>964</strong>
          <em>+9.4%</em>
        </div>
      </div>
    </section>
  );
}

function StudioPanel() {
  return (
    <section className="admin-card admin-studio-card">
      <div>
        <h2>Todo tu contenido, editable desde el panel</h2>
        <p>
          Edita cursos, módulos, páginas y más con Studio GHC. Sin código, sin
          límites.
        </p>
        <button type="button">Ir a Studio ↗</button>
      </div>
      <div className="admin-studio-visual" aria-hidden="true">
        <span />
        <i />
        <b />
      </div>
    </section>
  );
}

function GlobalStyles() {
  return (
    <style>{`
      :root {
        --admin-bg: #050706;
        --admin-bg-2: #080b0a;
        --admin-card: rgba(11, 15, 13, .88);
        --admin-card-2: rgba(13, 18, 16, .94);
        --admin-border: rgba(237, 245, 235, .085);
        --admin-border-strong: rgba(99, 229, 70, .28);
        --admin-green: #63E546;
        --admin-green-deep: #22D65B;
        --admin-text: #F3F6EF;
        --admin-muted: rgba(243, 246, 239, .62);
        --admin-soft: rgba(243, 246, 239, .42);
        --admin-danger: #ff4d57;
        --admin-warning: #e4a72f;
      }

      * { box-sizing: border-box; }
      html, body { margin: 0; background: var(--admin-bg); }
      body { color: var(--admin-text); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      button { font: inherit; }

      .admin-page {
        min-height: 100vh;
        display: grid;
        grid-template-columns: 252px minmax(0, 1fr);
        background:
          radial-gradient(circle at 74% -8%, rgba(99,229,70,.10), transparent 34%),
          radial-gradient(circle at 8% 18%, rgba(255,255,255,.045), transparent 30%),
          var(--admin-bg);
        color: var(--admin-text);
        overflow: hidden;
      }

      .admin-page::before {
        content: '';
        position: fixed;
        inset: 0;
        pointer-events: none;
        background-image:
          linear-gradient(rgba(255,255,255,.020) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,.020) 1px, transparent 1px);
        background-size: 42px 42px;
        opacity: .48;
        mask-image: radial-gradient(circle at 58% 35%, black, transparent 80%);
      }

      .admin-sidebar {
        position: relative;
        z-index: 2;
        min-height: 100vh;
        padding: 24px 18px;
        border-right: 1px solid rgba(255,255,255,.065);
        background: linear-gradient(180deg, rgba(4,7,6,.98), rgba(5,8,7,.94));
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }

      .admin-logo-wrap { min-height: 54px; display: flex; align-items: center; margin-bottom: 28px; }
      .admin-sidebar-label { margin: 0 0 16px; color: var(--admin-soft); text-transform: uppercase; letter-spacing: .16em; font-size: 11px; font-weight: 800; }
      .admin-nav { display: grid; gap: 5px; }

      .admin-nav-item {
        position: relative;
        min-height: 48px;
        border: 1px solid transparent;
        border-radius: 0;
        background: transparent;
        color: rgba(243,246,239,.70);
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 0 13px;
        cursor: default;
        text-align: left;
      }

      .admin-nav-item.active {
        color: var(--admin-green);
        background: linear-gradient(90deg, rgba(99,229,70,.18), rgba(99,229,70,.045) 68%, transparent);
        box-shadow: inset 3px 0 0 var(--admin-green);
      }

      .admin-nav-icon {
        width: 23px;
        height: 23px;
        display: grid;
        place-items: center;
        color: currentColor;
      }

      .admin-sidebar-bottom { display: grid; gap: 14px; }
      .admin-support-card,
      .admin-profile-card {
        border: 1px solid var(--admin-border);
        background: rgba(255,255,255,.035);
        border-radius: 18px;
        padding: 16px;
      }

      .admin-support-card {
        display: grid;
        grid-template-columns: 40px 1fr;
        gap: 12px;
      }

      .admin-support-icon,
      .admin-profile-card > span {
        width: 42px;
        height: 42px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        color: var(--admin-green);
        background: rgba(99,229,70,.08);
        border: 1px solid rgba(99,229,70,.18);
        font-weight: 900;
      }

      .admin-support-card strong,
      .admin-profile-card strong { display: block; font-size: 15px; }
      .admin-support-card p,
      .admin-profile-card p { margin: 4px 0 0; color: var(--admin-muted); font-size: 12px; }
      .admin-support-card button {
        grid-column: 1 / -1;
        min-height: 40px;
        border: 1px solid rgba(99,229,70,.30);
        border-radius: 12px;
        color: var(--admin-green);
        background: rgba(99,229,70,.06);
        font-weight: 850;
      }

      .admin-profile-card { display: grid; grid-template-columns: 42px 1fr auto; gap: 12px; align-items: center; }
      .admin-profile-card em { color: var(--admin-soft); font-style: normal; }

      .admin-shell {
        position: relative;
        z-index: 1;
        min-width: 0;
        padding: 0 18px 18px;
        display: grid;
        grid-template-rows: 72px 1fr;
      }

      .admin-topbar {
        min-height: 72px;
        border-bottom: 1px solid rgba(255,255,255,.055);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
      }

      .admin-breadcrumb { display: flex; align-items: center; gap: 10px; color: var(--admin-muted); font-size: 13px; }
      .admin-breadcrumb strong { color: var(--admin-text); }
      .admin-user { display: flex; align-items: center; gap: 14px; }
      .admin-bell { position: relative; color: rgba(243,246,239,.65); font-size: 22px; }
      .admin-bell::after { content: ''; position: absolute; right: 0; top: 0; width: 7px; height: 7px; border-radius: 999px; background: var(--admin-green); }
      .admin-user-badge { width: 44px; height: 44px; border-radius: 999px; display: grid; place-items: center; background: rgba(99,229,70,.12); color: var(--admin-green); font-weight: 950; }
      .admin-user-text { display: grid; gap: 2px; }
      .admin-user-text strong { font-size: 14px; }
      .admin-user-text span { color: var(--admin-muted); font-size: 12px; }

      .admin-content { display: grid; gap: 14px; padding-top: 18px; min-width: 0; }

      .admin-hero {
        position: relative;
        overflow: hidden;
        border: 1px solid var(--admin-border);
        border-radius: 24px;
        background:
          radial-gradient(circle at 82% 6%, rgba(99,229,70,.10), transparent 30%),
          linear-gradient(135deg, rgba(255,255,255,.055), rgba(255,255,255,.020)),
          rgba(8,12,10,.92);
        min-height: 250px;
        padding: 26px;
      }

      .admin-hero::after {
        content: '';
        position: absolute;
        top: 0;
        right: 140px;
        width: 280px;
        height: 180px;
        background:
          radial-gradient(circle at center, rgba(255,255,255,.16), transparent 4%),
          linear-gradient(135deg, transparent 0%, rgba(99,229,70,.08) 45%, transparent 46%);
        transform: skewX(-18deg);
        opacity: .6;
      }

      .admin-athlete {
        position: absolute;
        right: 168px;
        top: 18px;
        width: 240px;
        height: 116px;
        opacity: .62;
        background:
          radial-gradient(ellipse at 52% 50%, rgba(255,255,255,.38), transparent 42%),
          linear-gradient(118deg, transparent 12%, rgba(255,255,255,.34) 14%, transparent 18%, transparent 42%, rgba(255,255,255,.20) 44%, transparent 48%);
        filter: blur(.1px) grayscale(1);
        clip-path: polygon(7% 76%, 28% 57%, 43% 52%, 58% 20%, 71% 22%, 58% 43%, 86% 58%, 82% 68%, 55% 55%, 38% 71%, 17% 88%);
      }

      .admin-hero-copy { position: relative; z-index: 1; max-width: 680px; }
      .admin-hero h1 { margin: 8px 0 8px; font-size: clamp(34px, 4vw, 48px); letter-spacing: -.045em; line-height: .98; }
      .admin-kicker { margin: 0; color: var(--admin-green); letter-spacing: .11em; text-transform: uppercase; font-size: 12px; font-weight: 950; }
      .admin-hero-copy > p:last-child { margin: 0; color: var(--admin-muted); line-height: 1.65; }

      .admin-stats-row {
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 12px;
        margin-top: 24px;
      }

      .admin-stat-card {
        min-height: 118px;
        border: 1px solid var(--admin-border);
        border-radius: 16px;
        background: rgba(0,0,0,.16);
        padding: 15px;
        position: relative;
        overflow: hidden;
      }

      .admin-stat-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; color: var(--admin-muted); font-size: 13px; }
      .admin-stat-head i { font-style: normal; color: var(--admin-green); font-weight: 950; font-size: 20px; }
      .admin-stat-card strong { display: block; margin-top: 11px; font-size: 30px; line-height: 1; letter-spacing: -.04em; }
      .admin-stat-card p { margin: 8px 0 0; color: var(--admin-green); font-size: 12px; font-weight: 800; }
      .admin-stat-card p.bad { color: var(--admin-danger); }
      .admin-spark { position: absolute; right: 12px; bottom: 10px; width: 112px; height: 34px; }
      .admin-spark path { fill: none; stroke: var(--admin-green); stroke-width: 3; stroke-linecap: round; opacity: .9; }
      .admin-spark.danger path { stroke: var(--admin-danger); }

      .admin-main-grid { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(390px, .9fr); gap: 14px; }
      .admin-left-stack,
      .admin-right-stack { display: grid; gap: 14px; align-content: start; min-width: 0; }
      .admin-card { border: 1px solid var(--admin-border); border-radius: 20px; background: var(--admin-card); box-shadow: 0 22px 70px rgba(0,0,0,.18); }
      .admin-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 18px 20px 0; }
      .admin-card-head.compact { padding-bottom: 0; }
      .admin-card h2 { margin: 0; font-size: 19px; letter-spacing: -.025em; }
      .admin-card p { margin: 5px 0 0; color: var(--admin-muted); font-size: 13px; line-height: 1.45; }
      .admin-card-head button { min-height: 34px; border-radius: 10px; border: 1px solid rgba(255,255,255,.10); background: rgba(255,255,255,.035); color: var(--admin-text); padding: 0 12px; }

      .admin-growth-card { min-height: 385px; }
      .admin-chart-wrap { position: relative; min-height: 255px; margin: 8px 20px 0; }
      .chart-legend { display: flex; gap: 24px; color: var(--admin-muted); font-size: 12px; margin-bottom: 2px; }
      .chart-legend span { display: inline-flex; align-items: center; gap: 8px; }
      .chart-legend i { width: 9px; height: 9px; border-radius: 999px; background: var(--admin-green); }
      .chart-legend i.muted { background: rgba(255,255,255,.38); }
      .admin-growth-chart { width: 100%; height: 250px; display: block; }
      .grid-line { stroke: rgba(255,255,255,.07); stroke-width: 1; }
      .grid-line.vertical { opacity: .65; }
      .green-area { fill: url(#greenArea); }
      .green-line { fill: none; stroke: var(--admin-green); stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; }
      .gray-line { fill: none; stroke: rgba(255,255,255,.42); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
      .green-point { fill: var(--admin-green); filter: drop-shadow(0 0 8px rgba(99,229,70,.8)); }
      .admin-chart-tooltip { position: absolute; right: 42px; top: 34px; min-width: 150px; border: 1px solid rgba(255,255,255,.10); background: rgba(5,7,6,.88); border-radius: 12px; padding: 11px; box-shadow: 0 18px 40px rgba(0,0,0,.35); display: grid; gap: 6px; }
      .admin-chart-tooltip strong { font-size: 12px; }
      .admin-chart-tooltip span { color: var(--admin-muted); font-size: 12px; display: flex; align-items: center; gap: 7px; }
      .admin-chart-tooltip i { width: 8px; height: 8px; border-radius: 999px; background: var(--admin-green); }
      .admin-chart-tooltip i.muted { background: rgba(255,255,255,.38); }
      .admin-chart-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-top: 1px solid rgba(255,255,255,.07); margin: 0 20px 18px; }
      .admin-chart-metrics div { padding: 14px 16px; border-right: 1px solid rgba(255,255,255,.06); }
      .admin-chart-metrics div:last-child { border-right: 0; }
      .admin-chart-metrics span { color: var(--admin-muted); font-size: 12px; display: block; }
      .admin-chart-metrics strong { display: inline-block; margin-top: 7px; font-size: 19px; letter-spacing: -.02em; }
      .admin-chart-metrics em { margin-left: 10px; color: var(--admin-green); font-size: 12px; font-style: normal; font-weight: 900; }

      .admin-bottom-grid { display: grid; grid-template-columns: .88fr 1fr; gap: 14px; }
      .admin-platform-card,
      .admin-pending-card { min-height: 214px; }
      .admin-platform-body { display: grid; grid-template-columns: 112px 1fr; gap: 18px; align-items: center; padding: 14px 20px; }
      .admin-shield { width: 94px; height: 100px; display: grid; place-items: center; color: var(--admin-green); font-size: 44px; font-weight: 950; background: radial-gradient(circle at center, rgba(99,229,70,.20), rgba(99,229,70,.05)); clip-path: polygon(50% 0%, 92% 18%, 84% 78%, 50% 100%, 16% 78%, 8% 18%); }
      .admin-service-list { display: grid; gap: 12px; }
      .admin-service-list div { display: flex; justify-content: space-between; gap: 14px; align-items: center; border-bottom: 1px solid rgba(255,255,255,.06); padding-bottom: 7px; }
      .admin-service-list span { color: var(--admin-muted); }
      .admin-service-list strong { color: var(--admin-green); font-size: 12px; }
      .admin-service-list strong::before { content: '●'; margin-right: 7px; }
      .admin-platform-footer { display: flex; justify-content: space-between; margin: 0 20px 8px; color: var(--admin-muted); font-size: 12px; }
      .admin-progress-track { height: 6px; border-radius: 999px; background: rgba(255,255,255,.09); margin: 0 20px 18px; overflow: hidden; }
      .admin-progress-track div { height: 100%; border-radius: inherit; background: var(--admin-green); box-shadow: 0 0 20px rgba(99,229,70,.45); }

      .admin-pending-list { display: grid; gap: 6px; padding: 14px 20px 18px; }
      .admin-pending-row { min-height: 40px; display: grid; grid-template-columns: 34px minmax(0, 1fr) 52px 58px; align-items: center; gap: 10px; border-bottom: 1px solid rgba(255,255,255,.055); padding: 6px 0; }
      .admin-pending-row > span { width: 30px; height: 30px; border-radius: 10px; display: grid; place-items: center; color: var(--admin-muted); background: rgba(255,255,255,.035); border: 1px solid rgba(255,255,255,.06); }
      .admin-pending-row strong { display: block; font-size: 13px; }
      .admin-pending-row p { margin: 2px 0 0; font-size: 12px; }
      .admin-pending-row time { color: var(--admin-soft); font-size: 11px; text-align: right; }
      .priority { justify-self: start; border-radius: 999px; padding: 4px 8px; font-size: 10px; font-weight: 900; }
      .priority-alta { color: #ff7b81; background: rgba(255,77,87,.09); }
      .priority-media { color: var(--admin-warning); background: rgba(228,167,47,.09); }
      .priority-baja { color: var(--admin-green); background: rgba(99,229,70,.08); }

      .admin-quick-card { padding: 18px 20px; }
      .admin-quick-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 16px; }
      .admin-quick-action { min-height: 70px; display: grid; grid-template-columns: 44px 1fr auto; gap: 14px; align-items: center; border-radius: 14px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.026); color: var(--admin-text); padding: 12px; text-align: left; }
      .admin-quick-action > span { width: 42px; height: 42px; border-radius: 14px; display: grid; place-items: center; color: var(--admin-green); background: rgba(99,229,70,.07); border: 1px solid rgba(99,229,70,.16); font-size: 24px; }
      .admin-quick-action strong { font-size: 14px; }
      .admin-quick-action p { margin: 3px 0 0; font-size: 12px; }
      .admin-quick-action em { color: var(--admin-soft); font-style: normal; font-size: 22px; }

      .admin-activity-card { min-height: 290px; }
      .admin-activity-list { padding: 14px 20px 18px; display: grid; gap: 7px; }
      .admin-activity-row { min-height: 42px; display: grid; grid-template-columns: 34px 1fr 72px; align-items: center; gap: 10px; border-bottom: 1px solid rgba(255,255,255,.055); padding: 6px 0; }
      .admin-activity-row > span { width: 30px; height: 30px; border-radius: 10px; display: grid; place-items: center; color: var(--admin-green); background: rgba(99,229,70,.07); }
      .admin-activity-row strong { font-size: 13px; }
      .admin-activity-row p { margin: 2px 0 0; font-size: 12px; }
      .admin-activity-row time { color: var(--admin-soft); font-size: 11px; text-align: right; }

      .admin-studio-card { min-height: 140px; padding: 18px 20px; display: grid; grid-template-columns: 1fr 210px; gap: 16px; align-items: center; overflow: hidden; position: relative; }
      .admin-studio-card::before { content: ''; position: absolute; inset: auto 30px -80px auto; width: 260px; height: 160px; background: radial-gradient(circle, rgba(99,229,70,.13), transparent 70%); }
      .admin-studio-card h2 { font-size: 20px; }
      .admin-studio-card button { margin-top: 14px; min-height: 40px; padding: 0 18px; border-radius: 11px; border: 1px solid rgba(99,229,70,.28); background: rgba(99,229,70,.07); color: var(--admin-green); font-weight: 900; }
      .admin-studio-visual { height: 92px; border: 1px solid rgba(255,255,255,.09); border-radius: 14px; background: linear-gradient(135deg, rgba(255,255,255,.055), rgba(255,255,255,.018)); display: grid; grid-template-columns: 1fr 1.2fr; gap: 8px; padding: 12px; position: relative; z-index: 1; }
      .admin-studio-visual span { display: block; border-radius: 9px; border: 1px solid rgba(99,229,70,.24); background: rgba(99,229,70,.07); }
      .admin-studio-visual i,
      .admin-studio-visual b { display: block; border-radius: 8px; background: rgba(255,255,255,.08); }
      .admin-studio-visual b { grid-column: 2; height: 18px; align-self: end; }

      @media (max-width: 1380px) {
        .admin-page { grid-template-columns: 92px minmax(0,1fr); }
        .admin-sidebar { padding: 20px 12px; }
        .admin-sidebar-label,
        .admin-nav-item span:last-child,
        .admin-support-card div,
        .admin-profile-card div,
        .admin-profile-card em { display: none; }
        .admin-nav-item { justify-content: center; padding: 0; }
        .admin-support-card { grid-template-columns: 1fr; justify-items: center; }
        .admin-support-card button { display: none; }
      }
    `}</style>
  );
}

export default function Page() {
  return (
    <main className="admin-page">
      <GlobalStyles />
      <Sidebar />

      <section className="admin-shell">
        <header className="admin-topbar">
          <div className="admin-breadcrumb">
            <span>⌂</span>
            <span>Administración</span>
            <span>›</span>
            <strong>Panel</strong>
          </div>

          <div className="admin-user">
            <span className="admin-bell">♧</span>
            <span className="admin-user-badge">AD</span>
            <span className="admin-user-text">
              <strong>Admin GHC</strong>
              <span>Administrador</span>
            </span>
          </div>
        </header>

        <div className="admin-content">
          <section className="admin-hero">
            <div className="admin-athlete" aria-hidden="true" />
            <div className="admin-hero-copy">
              <p className="admin-kicker">Panel operativo</p>
              <h1>Panel de control</h1>
              <p>
                Gestiona y haz crecer tu academia desde un único lugar.
                Supervisa alumnos, cursos, ingresos, certificaciones y tareas
                críticas con una experiencia premium.
              </p>
            </div>

            <div className="admin-stats-row">
              {stats.map((stat) => (
                <StatCardItem key={stat.title} item={stat} />
              ))}
            </div>
          </section>

          <section className="admin-main-grid">
            <div className="admin-left-stack">
              <GrowthChart />

              <div className="admin-bottom-grid">
                <PlatformStatus />
                <PendingReviews />
              </div>
            </div>

            <div className="admin-right-stack">
              <QuickActions />
              <ActivityPanel />
              <StudioPanel />
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
