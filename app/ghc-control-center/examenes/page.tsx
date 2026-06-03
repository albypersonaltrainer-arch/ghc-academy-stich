"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import GHCLogo from "../../components/GHCLogo";

type AnyRecord = Record<string, any>;
type GuardState = "checking" | "allowed" | "denied";
type BlueprintStatus = "draft_ai" | "in_review" | "approved" | "published" | "archived" | "rejected";

type DashboardData = {
  blueprints: AnyRecord[];
  courses: AnyRecord[];
  modules: AnyRecord[];
  lessons: AnyRecord[];
  exams: AnyRecord[];
  questions: AnyRecord[];
  generations: AnyRecord[];
};

type BlueprintView = {
  raw: AnyRecord;
  id: string;
  title: string;
  description: string;
  status: BlueprintStatus;
  statusLabel: string;
  statusTone: string;
  courseTitle: string;
  moduleTitle: string;
  lessonTitle: string;
  scopeLabel: string;
  evaluationLabel: string;
  requestedQuestionCount: number;
  approvedQuestions: number;
  rejectedQuestions: number;
  reviewQuestions: number;
  generatedQuestions: number;
  difficulty: string;
  passPercentage: number;
  attemptsLabel: string;
  answerCount: number;
  showExplanation: boolean;
  blockAdvance: boolean;
  createdAt: string;
  updatedAt: string;
  generatedAt: string;
  aiInstructions: string;
  reviewNotes: string;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const emptyData: DashboardData = {
  blueprints: [],
  courses: [],
  modules: [],
  lessons: [],
  exams: [],
  questions: [],
  generations: [],
};

const GREEN = "#63E546";
const BUILD_ID = "GHC-EXAMS-BLUEPRINTS-V1";

export default function Page() {
  const router = useRouter();

  const [guardState, setGuardState] = useState<GuardState>("checking");
  const [profile, setProfile] = useState<AnyRecord | null>(null);
  const [data, setData] = useState<DashboardData>(emptyData);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BlueprintStatus>("all");
  const [selectedBlueprintId, setSelectedBlueprintId] = useState("");

  useEffect(() => {
    async function protectAndLoad() {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError || !userData.user) {
          router.replace("/acceso");
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userData.user.id)
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
        const loaded = await loadDashboardData();
        setData(loaded);
        const firstBlueprintId = String(loaded.blueprints[0]?.id || "");
        setSelectedBlueprintId(firstBlueprintId);
      } catch (error) {
        console.error(error);
        setGuardState("denied");
        router.replace("/alumno");
      } finally {
        setIsLoading(false);
      }
    }

    protectAndLoad();
  }, [router]);

  const views = useMemo(() => buildBlueprintViews(data), [data]);

  const filteredViews = useMemo(() => {
    const query = search.trim().toLowerCase();

    return views.filter((item) => {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesSearch =
        !query ||
        [
          item.title,
          item.description,
          item.courseTitle,
          item.moduleTitle,
          item.lessonTitle,
          item.statusLabel,
          item.scopeLabel,
          item.evaluationLabel,
          item.difficulty,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [views, search, statusFilter]);

  const selectedBlueprint =
    filteredViews.find((item) => item.id === selectedBlueprintId) ||
    views.find((item) => item.id === selectedBlueprintId) ||
    filteredViews[0] ||
    views[0] ||
    null;

  const stats = useMemo(() => buildStats(views), [views]);
  const adminName = profile?.full_name || profile?.email || "Admin GHC";

  async function refreshData() {
    setIsRefreshing(true);
    setMessage("Actualizando borradores desde Supabase...");
    try {
      const loaded = await loadDashboardData();
      setData(loaded);
      setSelectedBlueprintId((current) => current || String(loaded.blueprints[0]?.id || ""));
      setMessage("Listado actualizado desde Supabase.");
    } catch (error) {
      console.error(error);
      setMessage(getErrorMessage(error, "No se pudo actualizar el listado."));
    } finally {
      setIsRefreshing(false);
    }
  }

  function goCreateBlueprint() {
    router.push("/ghc-control-center/examenes/crear");
  }

  function goControlCenter() {
    router.push("/ghc-control-center");
  }

  function openReview(blueprint: BlueprintView) {
    setSelectedBlueprintId(blueprint.id);
    if (!blueprint.id || blueprint.id.startsWith("blueprint-")) {
      setMessage("No se puede abrir este borrador porque no tiene un ID real de Supabase.");
      return;
    }
    router.push(`/ghc-control-center/examenes/${blueprint.id}`);
  }

  if (guardState === "checking" || isLoading) {
    return (
      <main className="evaluation-loading">
        <GlobalStyles />
        <Background />
        <section className="loading-card">
          <GHCLogo size="md" showText tagline={false} />
          <h1>Centro de Evaluación GHC</h1>
          <p>Verificando acceso administrativo y cargando blueprints...</p>
        </section>
      </main>
    );
  }

  if (guardState !== "allowed") return null;

  return (
    <main className="evaluation-page">
      <GlobalStyles />
      <Background />

      <aside className="evaluation-sidebar">
        <div>
          <div className="sidebar-logo">
            <GHCLogo size="md" showText tagline={false} />
          </div>

          <nav className="sidebar-nav" aria-label="Centro de evaluación">
            <button type="button" className="active">
              <span>◈</span>
              <div>
                <strong>Blueprints</strong>
                <small>Borradores IA</small>
              </div>
            </button>
            <button type="button" onClick={goCreateBlueprint}>
              <span>＋</span>
              <div>
                <strong>Crear evaluación</strong>
                <small>Configurar IA</small>
              </div>
            </button>
            <button type="button" onClick={() => setMessage("La revisión profunda de preguntas se construye en el siguiente bloque.")}> 
              <span>▣</span>
              <div>
                <strong>Revisión</strong>
                <small>Próximo bloque</small>
              </div>
            </button>
            <button type="button" onClick={goControlCenter}>
              <span>⌂</span>
              <div>
                <strong>Control Center</strong>
                <small>Volver al admin</small>
              </div>
            </button>
          </nav>
        </div>

        <div className="sidebar-status">
          <span>Build</span>
          <strong>{BUILD_ID}</strong>
          <p>Listado real conectado a Supabase. No genera ni publica preguntas automáticamente.</p>
        </div>
      </aside>

      <section className="evaluation-shell">
        <header className="evaluation-topbar">
          <div className="breadcrumb">
            <button type="button" onClick={goControlCenter}>GHC Control Center</button>
            <span>/</span>
            <strong>Exámenes</strong>
          </div>

          <div className="topbar-actions">
            <button type="button" className="ghost-button" onClick={refreshData} disabled={isRefreshing}>
              {isRefreshing ? "Actualizando..." : "Actualizar"}
            </button>
            <button type="button" className="primary-button" onClick={goCreateBlueprint}>
              + Crear evaluación IA
            </button>
            <div className="admin-pill">
              <span>{getInitials(adminName)}</span>
              <strong>{shortName(adminName)}</strong>
            </div>
          </div>
        </header>

        {message ? <div className="system-message">{message}</div> : null}

        <section className="hero-card">
          <div className="hero-copy">
            <p className="eyebrow">Agente de Exámenes GHC v1</p>
            <h1>Blueprints y borradores de evaluación</h1>
            <p>
              Aquí se listan las configuraciones reales creadas por el admin antes de generar preguntas con IA. La IA no publica nada: todo queda en borrador, revisión y aprobación humana.
            </p>
          </div>

          <div className="hero-panel">
            <span>Flujo oficial</span>
            <strong>Configurar → generar → revisar → aprobar → publicar</strong>
            <p>Cero rastro de IA para el alumno. Solo se mostrarán exámenes publicados.</p>
            <button type="button" onClick={goCreateBlueprint}>Crear nuevo blueprint</button>
          </div>
        </section>

        <section className="stats-grid">
          <StatCard label="Blueprints" value={stats.total} helper="Configuraciones creadas" />
          <StatCard label="Borradores IA" value={stats.draft} helper="Pendientes de generación/revisión" />
          <StatCard label="En revisión" value={stats.review} helper="Control humano" />
          <StatCard label="Publicados" value={stats.published} helper="Visibles para alumno" />
        </section>

        <section className="workspace-grid">
          <article className="list-card">
            <div className="list-head">
              <div>
                <p className="eyebrow">Listado real</p>
                <h2>Borradores y exámenes</h2>
                <span>{filteredViews.length} resultado(s)</span>
              </div>
              <button type="button" onClick={goCreateBlueprint}>+ Nuevo</button>
            </div>

            <div className="filters-row">
              <label className="search-field">
                <span>⌕</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por curso, estado, módulo o título..." />
              </label>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | BlueprintStatus)}>
                <option value="all">Todos los estados</option>
                <option value="draft_ai">Draft IA</option>
                <option value="in_review">En revisión</option>
                <option value="approved">Aprobado</option>
                <option value="published">Publicado</option>
                <option value="archived">Archivado</option>
                <option value="rejected">Rechazado</option>
              </select>
            </div>

            <div className="blueprint-list">
              {filteredViews.length ? (
                filteredViews.map((blueprint) => (
                  <button
                    key={blueprint.id}
                    type="button"
                    className={selectedBlueprint?.id === blueprint.id ? "blueprint-row active" : "blueprint-row"}
                    onClick={() => setSelectedBlueprintId(blueprint.id)}
                  >
                    <span className={`status-pill ${blueprint.statusTone}`}>{blueprint.statusLabel}</span>
                    <div className="blueprint-main">
                      <strong>{blueprint.title}</strong>
                      <p>{blueprint.courseTitle}</p>
                      <small>{blueprint.scopeLabel} · {blueprint.evaluationLabel} · {blueprint.difficulty}</small>
                    </div>
                    <div className="blueprint-metric">
                      <strong>{blueprint.requestedQuestionCount}</strong>
                      <span>pedidas</span>
                    </div>
                    <div className="blueprint-metric">
                      <strong>{blueprint.generatedQuestions}</strong>
                      <span>generadas</span>
                    </div>
                    <div className="blueprint-metric hide-mobile">
                      <strong>{blueprint.passPercentage}%</strong>
                      <span>mínimo</span>
                    </div>
                    <em>{blueprint.createdAt}</em>
                  </button>
                ))
              ) : (
                <div className="empty-state">
                  <span>◈</span>
                  <h3>No hay blueprints con estos filtros</h3>
                  <p>Crea un borrador IA o cambia la búsqueda para ver configuraciones existentes.</p>
                  <button type="button" onClick={goCreateBlueprint}>Crear primer blueprint</button>
                </div>
              )}
            </div>
          </article>

          <aside className="detail-card">
            {selectedBlueprint ? (
              <BlueprintDetail blueprint={selectedBlueprint} onReview={() => openReview(selectedBlueprint)} onCreate={goCreateBlueprint} />
            ) : (
              <div className="empty-detail">
                <span>▣</span>
                <h2>Sin borrador seleccionado</h2>
                <p>Selecciona un blueprint del listado o crea una nueva evaluación IA.</p>
                <button type="button" onClick={goCreateBlueprint}>Crear evaluación</button>
              </div>
            )}
          </aside>
        </section>
      </section>
    </main>
  );
}

function BlueprintDetail({ blueprint, onReview, onCreate }: { blueprint: BlueprintView; onReview: () => void; onCreate: () => void }) {
  return (
    <div className="detail-inner">
      <div className="detail-top">
        <span className={`status-pill ${blueprint.statusTone}`}>{blueprint.statusLabel}</span>
        <h2>{blueprint.title}</h2>
        <p>{blueprint.description || "Sin descripción añadida."}</p>
      </div>

      <div className="detail-section">
        <h3>Configuración</h3>
        <div className="detail-grid">
          <DetailMetric label="Curso" value={blueprint.courseTitle} />
          <DetailMetric label="Módulo" value={blueprint.moduleTitle} />
          <DetailMetric label="Lección" value={blueprint.lessonTitle} />
          <DetailMetric label="Alcance" value={blueprint.scopeLabel} />
          <DetailMetric label="Evaluación" value={blueprint.evaluationLabel} />
          <DetailMetric label="Dificultad" value={blueprint.difficulty} />
          <DetailMetric label="Preguntas" value={blueprint.requestedQuestionCount} />
          <DetailMetric label="Respuestas" value={blueprint.answerCount} />
          <DetailMetric label="Nota mínima" value={`${blueprint.passPercentage}%`} />
          <DetailMetric label="Intentos" value={blueprint.attemptsLabel} />
        </div>
      </div>

      <div className="detail-section">
        <h3>Revisión de preguntas</h3>
        <div className="review-grid">
          <ReviewBox label="Generadas" value={blueprint.generatedQuestions} />
          <ReviewBox label="Aprobadas" value={blueprint.approvedQuestions} tone="green" />
          <ReviewBox label="En revisión" value={blueprint.reviewQuestions} tone="yellow" />
          <ReviewBox label="Rechazadas" value={blueprint.rejectedQuestions} tone="red" />
        </div>
      </div>

      <div className="detail-section flags">
        <div>
          <span>{blueprint.showExplanation ? "✓" : "—"}</span>
          <p>Mostrar explicación al alumno</p>
        </div>
        <div>
          <span>{blueprint.blockAdvance ? "✓" : "—"}</span>
          <p>Bloquear avance hasta aprobar</p>
        </div>
      </div>

      <div className="detail-section">
        <h3>Instrucciones internas IA</h3>
        <p className="instruction-box">{blueprint.aiInstructions || "Sin instrucciones adicionales."}</p>
      </div>

      <div className="detail-actions">
        <button type="button" className="primary-button" onClick={onReview}>Revisar borrador</button>
        <button type="button" className="ghost-button" onClick={onCreate}>Crear otro</button>
      </div>
    </div>
  );
}

async function loadDashboardData(): Promise<DashboardData> {
  const [blueprints, courses, modules, lessons, exams, questions, generations] = await Promise.all([
    safeSelect("exam_blueprints", "*"),
    safeSelect("courses", "*"),
    safeSelect("modules", "*"),
    safeSelect("lessons", "*"),
    safeSelect("exams", "*"),
    safeSelect("exam_questions", "*"),
    safeSelect("exam_ai_generations", "*"),
  ]);

  return {
    blueprints: sortByDate(blueprints),
    courses,
    modules,
    lessons,
    exams,
    questions,
    generations,
  };
}

async function safeSelect(table: string, columns: string): Promise<AnyRecord[]> {
  try {
    const { data, error } = await supabase.from(table).select(columns);
    if (error) {
      console.warn(`[GHC Exams] No se pudo cargar ${table}:`, error.message);
      return [];
    }
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn(`[GHC Exams] Error leyendo ${table}:`, error);
    return [];
  }
}

function buildBlueprintViews(data: DashboardData): BlueprintView[] {
  return data.blueprints.map((blueprint, index) => {
    const id = String(blueprint.id || `blueprint-${index}`);
    const course = data.courses.find((item) => String(item.id) === String(blueprint.course_id));
    const module = data.modules.find((item) => String(item.id) === String(blueprint.module_id));
    const lesson = data.lessons.find((item) => String(item.id) === String(blueprint.lesson_id));
    const generatedExam = data.exams.find((item) => String(item.id) === String(blueprint.generated_exam_id) || String(item.blueprint_id) === id);
    const questions = data.questions.filter((item) => String(item.blueprint_id) === id || (generatedExam?.id && String(item.exam_id) === String(generatedExam.id)));
    const status = normalizeBlueprintStatus(blueprint.status);

    return {
      raw: blueprint,
      id,
      title: String(blueprint.title || `Blueprint ${index + 1}`),
      description: String(blueprint.description || ""),
      status,
      statusLabel: getStatusLabel(status),
      statusTone: getStatusTone(status),
      courseTitle: String(course?.title || course?.name || "Curso no encontrado"),
      moduleTitle: String(module?.title || module?.name || (blueprint.module_id ? "Módulo no encontrado" : "No aplica")),
      lessonTitle: String(lesson?.title || lesson?.name || (blueprint.lesson_id ? "Lección no encontrada" : "No aplica")),
      scopeLabel: getScopeLabel(blueprint.source_scope),
      evaluationLabel: getEvaluationLabel(blueprint.evaluation_type),
      requestedQuestionCount: Number(blueprint.requested_question_count || 0),
      approvedQuestions: questions.filter((item) => String(item.question_status || "").toLowerCase() === "approved").length,
      rejectedQuestions: questions.filter((item) => String(item.question_status || "").toLowerCase() === "rejected").length,
      reviewQuestions: questions.filter((item) => ["draft_ai", "needs_review", "edited"].includes(String(item.question_status || "needs_review").toLowerCase())).length,
      generatedQuestions: questions.length,
      difficulty: getDifficultyLabel(blueprint.difficulty),
      passPercentage: Number(blueprint.pass_percentage || blueprint.passing_score || 70),
      attemptsLabel: getAttemptsLabel(blueprint.attempts_mode, blueprint.max_attempts),
      answerCount: Number(blueprint.answer_count || 4),
      showExplanation: blueprint.show_explanation !== false,
      blockAdvance: blueprint.block_advance !== false,
      createdAt: formatShortDate(blueprint.created_at),
      updatedAt: formatShortDate(blueprint.updated_at),
      generatedAt: formatShortDate(blueprint.generated_at),
      aiInstructions: String(blueprint.ai_instructions || ""),
      reviewNotes: String(blueprint.human_review_notes || ""),
    };
  });
}

function buildStats(views: BlueprintView[]) {
  return {
    total: views.length,
    draft: views.filter((item) => item.status === "draft_ai").length,
    review: views.filter((item) => item.status === "in_review").length,
    published: views.filter((item) => item.status === "published").length,
  };
}

function sortByDate(rows: AnyRecord[]) {
  return rows.slice().sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
}

function normalizeBlueprintStatus(value: unknown): BlueprintStatus {
  const status = String(value || "draft_ai").toLowerCase();
  if (["in_review", "approved", "published", "archived", "rejected"].includes(status)) return status as BlueprintStatus;
  return "draft_ai";
}

function getStatusLabel(status: BlueprintStatus) {
  if (status === "draft_ai") return "Draft IA";
  if (status === "in_review") return "En revisión";
  if (status === "approved") return "Aprobado";
  if (status === "published") return "Publicado";
  if (status === "archived") return "Archivado";
  return "Rechazado";
}

function getStatusTone(status: BlueprintStatus) {
  if (status === "published" || status === "approved") return "green";
  if (status === "in_review" || status === "draft_ai") return "yellow";
  if (status === "rejected") return "red";
  return "muted";
}

function getScopeLabel(value: unknown) {
  const scope = String(value || "course").toLowerCase();
  if (scope === "module") return "Todo un módulo";
  if (scope === "lesson") return "Una lección";
  if (scope === "multi_lesson") return "Varias lecciones";
  return "Todo el curso";
}

function getEvaluationLabel(value: unknown) {
  const type = String(value || "course").toLowerCase();
  if (type === "module") return "Examen de módulo";
  if (type === "lesson") return "Evaluación de lección";
  if (type === "multi_lesson") return "Evaluación multi-lección";
  return "Examen final de curso";
}

function getDifficultyLabel(value: unknown) {
  const difficulty = String(value || "mixed").toLowerCase();
  if (difficulty === "basic") return "Básica";
  if (difficulty === "medium") return "Media";
  if (difficulty === "advanced") return "Avanzada";
  return "Mixta";
}

function getAttemptsLabel(mode: unknown, maxAttempts: unknown) {
  if (String(mode || "limited").toLowerCase() === "unlimited") return "Ilimitados";
  const value = Number(maxAttempts || 3);
  return `${Number.isFinite(value) ? value : 3} intento(s)`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null) {
    const candidate = (error as AnyRecord).message || (error as AnyRecord).details || (error as AnyRecord).hint;
    if (candidate) return String(candidate);
  }
  return fallback;
}

function getInitials(value: string) {
  return String(value || "Admin")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function shortName(value: string) {
  return String(value || "Admin").split("@")[0].split(" ")[0] || "Admin";
}

function formatShortDate(value?: string | null) {
  if (!value) return "Sin fecha";
  try {
    return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
  } catch {
    return "Sin fecha";
  }
}

function StatCard({ label, value, helper }: { label: string; value: number; helper: string }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{new Intl.NumberFormat("es-ES").format(value || 0)}</strong>
      <p>{helper}</p>
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

function ReviewBox({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "green" | "yellow" | "red" | "neutral" }) {
  return (
    <div className={`review-box ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Background() {
  return (
    <div className="background" aria-hidden="true">
      <div className="orb one" />
      <div className="orb two" />
      <div className="grid-texture" />
    </div>
  );
}

function GlobalStyles() {
  return (
    <style>{`
      :root{--bg:#050706;--panel:rgba(10,14,12,.88);--panel2:rgba(15,20,17,.72);--line:rgba(255,255,255,.085);--line2:rgba(99,229,70,.22);--white:#f4f6f2;--muted:rgba(244,246,242,.66);--soft:rgba(244,246,242,.42);--green:${GREEN};--yellow:#f7c948;--red:#ff6464}*{box-sizing:border-box}html,body{margin:0;background:var(--bg)}body{color:var(--white);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}button,input,select{font:inherit}button{transition:.18s ease}button:hover{transform:translateY(-1px)}
      .evaluation-page{min-height:100vh;display:grid;grid-template-columns:292px minmax(0,1fr);background:var(--bg);color:var(--white);position:relative}.evaluation-loading{min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--white);position:relative}.loading-card{position:relative;z-index:2;width:min(560px,calc(100vw - 40px));border:1px solid var(--line);border-radius:28px;background:linear-gradient(145deg,rgba(255,255,255,.08),rgba(255,255,255,.025));padding:34px;box-shadow:0 30px 90px rgba(0,0,0,.45)}.loading-card h1{margin:18px 0 0;font-size:38px;line-height:.95;letter-spacing:-.055em}.loading-card p{margin:16px 0 0;color:var(--muted)}
      .background{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:0}.orb{position:absolute;width:560px;height:560px;border-radius:999px;filter:blur(120px)}.orb.one{left:-220px;top:-170px;background:rgba(99,229,70,.105)}.orb.two{right:-250px;top:190px;background:rgba(255,255,255,.055)}.grid-texture{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.022) 1px,transparent 1px);background-size:44px 44px;opacity:.48;mask-image:radial-gradient(circle at center,black 0%,transparent 84%)}
      .evaluation-sidebar{position:sticky;top:0;height:100vh;z-index:2;border-right:1px solid var(--line);background:linear-gradient(180deg,rgba(5,8,7,.98),rgba(3,5,4,.94));padding:22px;display:flex;flex-direction:column;justify-content:space-between}.sidebar-logo{min-height:60px;display:flex;align-items:center;margin-bottom:24px}.sidebar-nav{display:grid;gap:8px}.sidebar-nav button{width:100%;min-height:58px;border-radius:16px;border:1px solid transparent;background:transparent;color:rgba(244,246,242,.66);display:grid;grid-template-columns:38px minmax(0,1fr);gap:12px;align-items:center;padding:10px 12px;text-align:left;cursor:pointer}.sidebar-nav button:hover{background:rgba(255,255,255,.035);color:var(--white)}.sidebar-nav button.active{background:linear-gradient(90deg,rgba(99,229,70,.15),rgba(99,229,70,.035));border-color:rgba(99,229,70,.16);color:var(--green);box-shadow:inset 3px 0 0 var(--green)}.sidebar-nav button>span{width:38px;height:38px;border-radius:13px;display:grid;place-items:center;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.075);font-weight:950}.sidebar-nav strong{display:block;font-size:14px;line-height:1.05}.sidebar-nav small{display:block;margin-top:4px;color:var(--soft);font-size:11px}.sidebar-status{border:1px solid var(--line);border-radius:18px;background:rgba(255,255,255,.035);padding:16px}.sidebar-status span{color:var(--green);font-size:10px;text-transform:uppercase;letter-spacing:.16em;font-weight:950}.sidebar-status strong{display:block;margin-top:7px;font-size:13px}.sidebar-status p{margin:8px 0 0;color:var(--muted);font-size:12px;line-height:1.5}
      .evaluation-shell{position:relative;z-index:1;min-width:0;padding:18px 20px 32px;display:grid;gap:16px}.evaluation-topbar{min-height:58px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:18px}.breadcrumb{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:13px;font-weight:850}.breadcrumb button{border:0;background:transparent;color:var(--muted);cursor:pointer;font-weight:900;padding:0}.breadcrumb button:hover{color:var(--green);transform:none}.breadcrumb strong{color:var(--white)}.topbar-actions{display:flex;align-items:center;gap:10px;min-width:0}.admin-pill{height:42px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.035);display:flex;align-items:center;gap:10px;padding:0 12px}.admin-pill span{width:30px;height:30px;border-radius:999px;display:grid;place-items:center;background:rgba(99,229,70,.11);color:var(--green);font-size:11px;font-weight:950}.admin-pill strong{font-size:13px}.primary-button,.ghost-button{min-height:42px;border-radius:999px;padding:0 16px;font-weight:950;cursor:pointer}.primary-button{border:0;background:linear-gradient(135deg,#7cff55,var(--green));color:#061008;box-shadow:0 14px 34px rgba(99,229,70,.18)}.ghost-button{border:1px solid var(--line);background:rgba(255,255,255,.04);color:var(--white)}.ghost-button:disabled{opacity:.6;cursor:not-allowed}.system-message{border-radius:15px;border:1px solid rgba(99,229,70,.22);background:rgba(99,229,70,.06);padding:14px 16px;color:rgba(244,246,242,.78);font-size:14px;line-height:1.5}
      .hero-card{min-height:170px;border:1px solid var(--line);border-radius:24px;background:radial-gradient(circle at 80% 18%,rgba(99,229,70,.16),transparent 34%),linear-gradient(135deg,rgba(255,255,255,.07),rgba(255,255,255,.022));box-shadow:0 28px 90px rgba(0,0,0,.25);display:grid;grid-template-columns:minmax(0,1fr) 410px;gap:24px;align-items:center;padding:28px;overflow:hidden}.eyebrow{margin:0 0 10px;color:var(--green);text-transform:uppercase;letter-spacing:.18em;font-size:11px;font-weight:950}.hero-copy h1{margin:0;font-size:clamp(38px,4vw,58px);line-height:.92;letter-spacing:-.065em}.hero-copy p:not(.eyebrow){margin:14px 0 0;color:var(--muted);line-height:1.62;max-width:760px}.hero-panel{border:1px solid rgba(99,229,70,.22);border-radius:20px;background:linear-gradient(145deg,rgba(99,229,70,.085),rgba(255,255,255,.025));padding:18px;display:grid;gap:10px}.hero-panel span{color:var(--green);text-transform:uppercase;letter-spacing:.16em;font-size:10px;font-weight:950}.hero-panel strong{font-size:21px;line-height:1.1;letter-spacing:-.035em}.hero-panel p{margin:0;color:var(--muted);line-height:1.5;font-size:13px}.hero-panel button{justify-self:start;min-height:40px;border-radius:999px;border:0;background:var(--green);color:#061008;padding:0 16px;font-weight:950;cursor:pointer}
      .stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.stat-card{min-height:120px;border:1px solid var(--line);border-radius:18px;background:var(--panel);padding:16px;box-shadow:0 22px 70px rgba(0,0,0,.18)}.stat-card span{color:var(--muted);font-size:12px;font-weight:850}.stat-card strong{display:block;margin-top:9px;font-size:34px;letter-spacing:-.05em}.stat-card p{margin:6px 0 0;color:var(--muted);font-size:12px}.workspace-grid{display:grid;grid-template-columns:minmax(0,1fr) 420px;gap:14px;align-items:start}.list-card,.detail-card{border:1px solid var(--line);border-radius:22px;background:var(--panel);box-shadow:0 22px 70px rgba(0,0,0,.19);padding:18px}.detail-card{position:sticky;top:18px}.list-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:14px}.list-head h2{margin:0;font-size:27px;line-height:1;letter-spacing:-.045em}.list-head span{display:block;margin-top:8px;color:var(--muted);font-size:13px}.list-head button{min-height:38px;border-radius:999px;border:1px solid rgba(99,229,70,.24);background:rgba(99,229,70,.08);color:var(--green);font-weight:950;padding:0 14px;cursor:pointer}.filters-row{display:grid;grid-template-columns:minmax(0,1fr) 210px;gap:10px;margin-bottom:14px}.search-field{height:44px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.035);display:flex;align-items:center;gap:10px;padding:0 14px;color:var(--muted)}.search-field input{flex:1;min-width:0;height:42px;border:0;outline:0;background:transparent;color:var(--white)}.filters-row select{height:44px;border-radius:999px;border:1px solid var(--line);background:#0a0e0c;color:var(--white);padding:0 14px;outline:0}.blueprint-list{display:grid;gap:10px}.blueprint-row{width:100%;min-height:92px;border-radius:18px;border:1px solid rgba(255,255,255,.075);background:linear-gradient(135deg,rgba(255,255,255,.038),rgba(255,255,255,.016));color:var(--white);display:grid;grid-template-columns:118px minmax(0,1fr) 84px 92px 96px 92px;gap:12px;align-items:center;text-align:left;padding:13px;cursor:pointer}.blueprint-row:hover{border-color:rgba(99,229,70,.24);background:linear-gradient(135deg,rgba(99,229,70,.06),rgba(255,255,255,.018))}.blueprint-row.active{border-color:rgba(99,229,70,.38);background:linear-gradient(135deg,rgba(99,229,70,.12),rgba(255,255,255,.022));box-shadow:0 14px 40px rgba(0,0,0,.22)}.status-pill{display:inline-flex;align-items:center;justify-content:center;width:max-content;min-height:30px;border-radius:999px;padding:7px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.12em;font-weight:950;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.045);color:var(--muted);white-space:nowrap}.status-pill.green{border-color:rgba(99,229,70,.28);background:rgba(99,229,70,.1);color:var(--green)}.status-pill.yellow{border-color:rgba(247,201,72,.28);background:rgba(247,201,72,.095);color:var(--yellow)}.status-pill.red{border-color:rgba(255,100,100,.28);background:rgba(255,100,100,.095);color:var(--red)}.status-pill.muted{color:var(--soft)}.blueprint-main strong{display:block;font-size:17px;letter-spacing:-.02em;line-height:1.12}.blueprint-main p{margin:5px 0 0;color:var(--muted);font-size:13px}.blueprint-main small{display:block;margin-top:5px;color:var(--soft);font-size:11px}.blueprint-metric strong{display:block;font-size:22px;line-height:1;color:var(--white)}.blueprint-metric span{display:block;margin-top:4px;color:var(--soft);font-size:10px;text-transform:uppercase;letter-spacing:.12em;font-weight:900}.blueprint-row em{font-style:normal;color:var(--muted);font-size:12px}.empty-state,.empty-detail{text-align:center;padding:36px 22px;color:var(--muted)}.empty-state span,.empty-detail span{width:64px;height:64px;border-radius:20px;display:grid;place-items:center;margin:0 auto 16px;background:rgba(99,229,70,.08);border:1px solid rgba(99,229,70,.18);color:var(--green);font-size:28px}.empty-state h3,.empty-detail h2{margin:0;color:var(--white);letter-spacing:-.035em}.empty-state p,.empty-detail p{line-height:1.55}.empty-state button,.empty-detail button{min-height:42px;border-radius:999px;border:0;background:var(--green);color:#061008;font-weight:950;padding:0 16px;cursor:pointer}
      .detail-inner{display:grid;gap:18px}.detail-top h2{margin:12px 0 8px;font-size:30px;line-height:1;letter-spacing:-.055em}.detail-top p{margin:0;color:var(--muted);line-height:1.55}.detail-section{border-top:1px solid rgba(255,255,255,.075);padding-top:16px}.detail-section h3{margin:0 0 12px;font-size:16px;letter-spacing:-.02em}.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.detail-metric{border:1px solid rgba(255,255,255,.075);border-radius:14px;background:rgba(0,0,0,.17);padding:11px;min-width:0}.detail-metric span{display:block;color:var(--soft);font-size:10px;text-transform:uppercase;letter-spacing:.12em;font-weight:950}.detail-metric strong{display:block;margin-top:6px;font-size:13px;line-height:1.25;color:var(--white);word-break:break-word}.review-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.review-box{border:1px solid rgba(255,255,255,.075);border-radius:14px;background:rgba(255,255,255,.026);padding:12px}.review-box span{color:var(--muted);font-size:12px}.review-box strong{display:block;margin-top:5px;font-size:25px}.review-box.green strong{color:var(--green)}.review-box.yellow strong{color:var(--yellow)}.review-box.red strong{color:var(--red)}.flags{display:grid;gap:8px}.flags div{border:1px solid rgba(255,255,255,.075);border-radius:14px;background:rgba(255,255,255,.026);padding:12px;display:grid;grid-template-columns:30px minmax(0,1fr);gap:10px;align-items:center}.flags span{width:28px;height:28px;border-radius:999px;display:grid;place-items:center;background:rgba(99,229,70,.08);border:1px solid rgba(99,229,70,.2);color:var(--green);font-weight:950}.flags p{margin:0;color:var(--muted);font-size:13px}.instruction-box{border:1px solid rgba(255,255,255,.075);border-radius:14px;background:rgba(0,0,0,.17);padding:13px;color:var(--muted);line-height:1.55;white-space:pre-wrap}.detail-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      @media(max-width:1380px){.hero-card,.workspace-grid{grid-template-columns:1fr}.detail-card{position:static}.stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.blueprint-row{grid-template-columns:112px minmax(0,1fr) 84px 92px 92px}.hide-mobile{display:none}}
      @media(max-width:980px){.evaluation-page{grid-template-columns:1fr}.evaluation-sidebar{position:relative;height:auto}.evaluation-topbar{align-items:flex-start;flex-direction:column}.topbar-actions{width:100%;flex-wrap:wrap}.hero-card{padding:22px}.filters-row,.stats-grid,.detail-grid,.review-grid,.detail-actions{grid-template-columns:1fr}.blueprint-row{grid-template-columns:1fr}.evaluation-shell{padding:14px}.hero-copy h1{font-size:38px}}
    `}</style>
  );
}
