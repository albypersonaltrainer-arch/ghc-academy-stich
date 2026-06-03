"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import GHCLogo from "../../../components/GHCLogo";

type AnyRecord = Record<string, any>;
type GuardState = "checking" | "allowed" | "denied";
type BlueprintStatus = "draft_ai" | "in_review" | "approved" | "published" | "archived" | "rejected";

type BlueprintDetail = {
  blueprint: AnyRecord | null;
  course: AnyRecord | null;
  module: AnyRecord | null;
  lesson: AnyRecord | null;
  lessons: AnyRecord[];
  exam: AnyRecord | null;
  questions: AnyRecord[];
  options: AnyRecord[];
  generations: AnyRecord[];
};

const GREEN = "#63E546";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const emptyDetail: BlueprintDetail = {
  blueprint: null,
  course: null,
  module: null,
  lesson: null,
  lessons: [],
  exam: null,
  questions: [],
  options: [],
  generations: [],
};

const statusLabels: Record<string, string> = {
  draft_ai: "Borrador IA",
  in_review: "En revisión",
  approved: "Aprobado",
  published: "Publicado",
  archived: "Archivado",
  rejected: "Rechazado",
};

const difficultyLabels: Record<string, string> = {
  basic: "Básica",
  medium: "Media",
  advanced: "Avanzada",
  mixed: "Mixta",
};

const scopeLabels: Record<string, string> = {
  course: "Todo el curso",
  module: "Todo el módulo",
  lesson: "Lección concreta",
  multi_lesson: "Varias lecciones",
};

export default function Page() {
  const router = useRouter();
  const params = useParams<{ blueprintId?: string }>();
  const blueprintId = typeof params?.blueprintId === "string" ? params.blueprintId : "";

  const [guardState, setGuardState] = useState<GuardState>("checking");
  const [adminProfile, setAdminProfile] = useState<AnyRecord | null>(null);
  const [detail, setDetail] = useState<BlueprintDetail>(emptyDetail);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [systemMessage, setSystemMessage] = useState("");

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

        if (profileError) throw profileError;

        const role = String(profileData?.role || "").toLowerCase();
        if (!["admin", "superadmin", "owner"].includes(role)) {
          setGuardState("denied");
          router.replace("/alumno");
          return;
        }

        setAdminProfile(profileData || null);
        setGuardState("allowed");
        await loadDetail();
      } catch (error) {
        console.error(error);
        setGuardState("denied");
        router.replace("/alumno");
      }
    }

    if (blueprintId) protectAndLoad();
  }, [blueprintId, router]);

  async function loadDetail(message?: string) {
    setIsLoading(true);
    try {
      const nextDetail = await getBlueprintDetail(blueprintId);
      setDetail(nextDetail);
      if (message) setSystemMessage(message);
    } catch (error) {
      console.error(error);
      setSystemMessage(getErrorMessage(error, "No se pudo cargar el borrador."));
    } finally {
      setIsLoading(false);
    }
  }

  async function updateStatus(status: BlueprintStatus) {
    if (!detail.blueprint?.id) return;

    setIsBusy(true);
    setSystemMessage(`Actualizando estado a ${statusLabels[status] || status}...`);

    try {
      const { error } = await supabase.rpc("ghc_admin_update_blueprint_status", {
        p_blueprint_id: detail.blueprint.id,
        p_status: status,
        p_notes: null,
      });

      if (error) throw error;
      await loadDetail(`Estado actualizado: ${statusLabels[status] || status}.`);
    } catch (error) {
      console.error(error);
      setSystemMessage(getErrorMessage(error, "No se pudo actualizar el estado del borrador."));
    } finally {
      setIsBusy(false);
    }
  }

  const blueprint = detail.blueprint;
  const approvedQuestions = detail.questions.filter((item) => ["approved", "edited"].includes(String(item.question_status || ""))).length;
  const rejectedQuestions = detail.questions.filter((item) => String(item.question_status || "") === "rejected").length;
  const activeQuestions = detail.questions.filter((item) => item.is_active !== false).length;

  const selectedContentLabel = useMemo(() => {
    if (!blueprint) return "Sin selección";
    const scope = String(blueprint.source_scope || blueprint.evaluation_type || "course");

    if (scope === "multi_lesson") {
      return detail.lessons.length ? `${detail.lessons.length} lecciones seleccionadas` : "Varias lecciones";
    }

    if (scope === "lesson") return detail.lesson?.title || "Lección seleccionada";
    if (scope === "module") return detail.module?.title || "Módulo seleccionado";

    return detail.course?.title || "Curso completo";
  }, [blueprint, detail.course, detail.lesson, detail.lessons.length, detail.module]);

  if (guardState === "checking" || isLoading) {
    return (
      <main className="review-loading">
        <EvaluationStyles />
        <Background />
        <section className="loading-card">
          <GHCLogo size="md" showText tagline={false} />
          <h1>Cargando borrador</h1>
          <p>Verificando permisos y recuperando la configuración del Agente de Exámenes GHC.</p>
        </section>
      </main>
    );
  }

  if (guardState !== "allowed") return null;

  if (!blueprint) {
    return (
      <main className="review-page">
        <EvaluationStyles />
        <Background />
        <section className="not-found-card">
          <GHCLogo size="md" showText tagline={false} />
          <h1>Borrador no encontrado</h1>
          <p>No se encontró ningún blueprint con este identificador.</p>
          <button type="button" onClick={() => router.push("/ghc-control-center/examenes")}>Volver al listado</button>
        </section>
      </main>
    );
  }

  return (
    <main className="review-page">
      <EvaluationStyles />
      <Background />

      <aside className="review-sidebar">
        <div>
          <div className="sidebar-logo"><GHCLogo size="md" showText tagline={false} /></div>
          <nav className="review-nav" aria-label="Navegación del borrador">
            <button type="button" className="active">01 · Configuración</button>
            <button type="button" disabled>02 · Generación IA</button>
            <button type="button" disabled>03 · Revisión preguntas</button>
            <button type="button" disabled>04 · Publicación</button>
          </nav>
        </div>

        <div className="sidebar-status">
          <span>Estado actual</span>
          <strong>{statusLabels[String(blueprint.status)] || blueprint.status}</strong>
          <p>El alumno no ve este borrador ni ningún rastro de IA.</p>
        </div>
      </aside>

      <section className="review-shell">
        <header className="review-topbar">
          <button type="button" onClick={() => router.push("/ghc-control-center/examenes")}>← Exámenes</button>
          <div>
            <span>{adminProfile?.full_name || adminProfile?.email || "Admin GHC"}</span>
            <strong>Agente de Exámenes GHC v1</strong>
          </div>
        </header>

        {systemMessage ? <div className="system-message">{systemMessage}</div> : null}

        <section className="review-hero">
          <div>
            <p className="kicker">Borrador de evaluación</p>
            <h1>{blueprint.title || "Evaluación GHC"}</h1>
            <p>{blueprint.description || "Configuración preparada para generar preguntas con IA y revisión humana antes de publicar."}</p>
          </div>

          <div className="hero-panel">
            <span>Flujo protegido</span>
            <strong>IA genera · Admin revisa · Admin publica</strong>
            <p>Este blueprint aún no genera ni publica preguntas automáticamente.</p>
          </div>
        </section>

        <section className="metrics-grid">
          <MetricCard label="Preguntas solicitadas" value={blueprint.requested_question_count || 0} helper="Configuración del admin" />
          <MetricCard label="Preguntas activas" value={activeQuestions} helper="Creadas/generadas" />
          <MetricCard label="Aprobadas" value={approvedQuestions} helper="Listas para publicar" />
          <MetricCard label="Rechazadas" value={rejectedQuestions} helper="Pendientes de regenerar" warning={rejectedQuestions > 0} />
        </section>

        <section className="detail-layout">
          <article className="main-card configuration-card">
            <div className="card-head">
              <div>
                <p className="kicker">Configuración</p>
                <h2>Parámetros del borrador</h2>
              </div>
              <StatusPill status={String(blueprint.status)} />
            </div>

            <div className="config-grid">
              <InfoBox label="Curso" value={detail.course?.title || "Curso no localizado"} />
              <InfoBox label="Alcance" value={scopeLabels[String(blueprint.source_scope)] || String(blueprint.source_scope || "Curso")} />
              <InfoBox label="Contenido seleccionado" value={selectedContentLabel} />
              <InfoBox label="Tipo de evaluación" value={scopeLabels[String(blueprint.evaluation_type)] || String(blueprint.evaluation_type || "Curso")} />
              <InfoBox label="Dificultad" value={difficultyLabels[String(blueprint.difficulty)] || String(blueprint.difficulty || "Mixta")} />
              <InfoBox label="Nota mínima" value={`${blueprint.pass_percentage || 70}%`} />
              <InfoBox label="Intentos" value={String(blueprint.attempts_mode) === "unlimited" ? "Ilimitados" : `${blueprint.max_attempts || 1} intento(s)`} />
              <InfoBox label="Respuestas por pregunta" value={`${blueprint.answer_count || 4}`} />
              <InfoBox label="Mostrar explicación" value={blueprint.show_explanation ? "Sí" : "No"} />
              <InfoBox label="Bloquear avance" value={blueprint.block_advance ? "Sí" : "No"} />
              <InfoBox label="Creado" value={formatDate(blueprint.created_at)} />
              <InfoBox label="Actualizado" value={formatDate(blueprint.updated_at)} />
            </div>

            <div className="instructions-card">
              <span>Instrucciones internas para IA</span>
              <p>{blueprint.ai_instructions || "Sin instrucciones adicionales. La generación deberá respetar el contenido seleccionado y la configuración del blueprint."}</p>
            </div>
          </article>

          <aside className="side-column">
            <article className="side-card">
              <p className="kicker">Acciones</p>
              <h2>Control del borrador</h2>
              <button type="button" onClick={() => updateStatus("in_review")} disabled={isBusy || String(blueprint.status) === "in_review"}>Pasar a revisión</button>
              <button type="button" onClick={() => updateStatus("approved")} disabled={isBusy}>Marcar blueprint aprobado</button>
              <button type="button" onClick={() => setSystemMessage("La generación IA se conectará en el Bloque 3. De momento este botón no llama a ningún modelo ni crea preguntas.")}>Preparar generación IA</button>
              <button type="button" onClick={() => updateStatus("archived")} disabled={isBusy}>Archivar</button>
            </article>

            <article className="side-card muted-card">
              <p className="kicker">Seguridad</p>
              <h2>Cero rastro de IA</h2>
              <p>El alumno solo verá exámenes publicados. No verá prompts, modelo, generaciones, estados internos ni este blueprint.</p>
            </article>
          </aside>
        </section>

        <section className="detail-layout secondary">
          <article className="main-card">
            <div className="card-head">
              <div>
                <p className="kicker">Contenido fuente</p>
                <h2>Material seleccionado</h2>
              </div>
            </div>

            {String(blueprint.source_scope) === "multi_lesson" ? (
              <div className="lesson-list">
                {detail.lessons.length ? detail.lessons.map((lesson, index) => (
                  <div key={String(lesson.id || index)} className="lesson-row">
                    <span>L{index + 1}</span>
                    <div>
                      <strong>{lesson.title || `Lección ${index + 1}`}</strong>
                      <p>{getLessonSummary(lesson)}</p>
                    </div>
                  </div>
                )) : <EmptyState title="Sin lecciones vinculadas" text="Este blueprint multi-lección aún no tiene filas en exam_blueprint_lessons." />}
              </div>
            ) : (
              <div className="source-single">
                <span>{String(blueprint.source_scope) === "course" ? "Curso" : String(blueprint.source_scope) === "module" ? "Módulo" : "Lección"}</span>
                <strong>{selectedContentLabel}</strong>
                <p>La IA solo deberá leer el contenido correspondiente a este alcance cuando conectemos el Bloque 3.</p>
              </div>
            )}
          </article>

          <aside className="side-column">
            <article className="side-card">
              <p className="kicker">Preguntas</p>
              <h2>Revisión futura</h2>
              <p>{detail.questions.length ? `Hay ${detail.questions.length} pregunta(s) asociadas.` : "Todavía no hay preguntas generadas para este blueprint."}</p>
              <div className="mini-stack">
                <span>{approvedQuestions} aprobadas</span>
                <span>{rejectedQuestions} rechazadas</span>
                <span>{detail.questions.length - approvedQuestions - rejectedQuestions} pendientes</span>
              </div>
            </article>
          </aside>
        </section>
      </section>
    </main>
  );
}

async function getBlueprintDetail(blueprintId: string): Promise<BlueprintDetail> {
  const { data: blueprint, error: blueprintError } = await supabase
    .from("exam_blueprints")
    .select("*")
    .eq("id", blueprintId)
    .maybeSingle();

  if (blueprintError) throw blueprintError;
  if (!blueprint) return emptyDetail;

  const [course, module, lesson, lessonLinks, exam, questions, generations] = await Promise.all([
    blueprint.course_id ? safeSingle("courses", blueprint.course_id) : Promise.resolve(null),
    blueprint.module_id ? safeSingle("modules", blueprint.module_id) : Promise.resolve(null),
    blueprint.lesson_id ? safeSingle("lessons", blueprint.lesson_id) : Promise.resolve(null),
    safeSelect("exam_blueprint_lessons", "*", "blueprint_id", blueprintId),
    blueprint.generated_exam_id ? safeSingle("exams", blueprint.generated_exam_id) : safeExamByBlueprint(blueprintId),
    safeSelect("exam_questions", "*", "blueprint_id", blueprintId),
    safeSelect("exam_ai_generations", "*", "blueprint_id", blueprintId),
  ]);

  const lessonIds = Array.isArray(lessonLinks) ? lessonLinks.map((item) => String(item.lesson_id)).filter(Boolean) : [];
  const lessons = lessonIds.length ? await safeIn("lessons", lessonIds) : [];
  const questionIds = questions.map((item) => String(item.id)).filter(Boolean);
  const options = questionIds.length ? await safeIn("exam_question_options", questionIds, "question_id") : [];

  return {
    blueprint,
    course,
    module,
    lesson,
    lessons: sortByBlueprintLessonOrder(lessons, lessonLinks),
    exam,
    questions: questions.sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)),
    options,
    generations,
  };
}

async function safeSingle(table: string, id: string) {
  const { data, error } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
  if (error) {
    console.warn(`[GHC Exams] No se pudo cargar ${table}:`, error.message);
    return null;
  }
  return data as AnyRecord | null;
}

async function safeExamByBlueprint(blueprintId: string) {
  const { data, error } = await supabase.from("exams").select("*").eq("blueprint_id", blueprintId).maybeSingle();
  if (error) {
    console.warn("[GHC Exams] No se pudo cargar exam por blueprint:", error.message);
    return null;
  }
  return data as AnyRecord | null;
}

async function safeSelect(table: string, columns: string, key: string, value: string) {
  const { data, error } = await supabase.from(table).select(columns).eq(key, value);
  if (error) {
    console.warn(`[GHC Exams] No se pudo cargar ${table}:`, error.message);
    return [];
  }
  return Array.isArray(data) ? data as AnyRecord[] : [];
}

async function safeIn(table: string, values: string[], key = "id") {
  const { data, error } = await supabase.from(table).select("*").in(key, values);
  if (error) {
    console.warn(`[GHC Exams] No se pudo cargar ${table} con in():`, error.message);
    return [];
  }
  return Array.isArray(data) ? data as AnyRecord[] : [];
}

function sortByBlueprintLessonOrder(lessons: AnyRecord[], links: AnyRecord[]) {
  const orderMap = new Map<string, number>();
  links.forEach((item) => orderMap.set(String(item.lesson_id), Number(item.sort_order || 0)));
  return lessons.slice().sort((a, b) => (orderMap.get(String(a.id)) || 0) - (orderMap.get(String(b.id)) || 0));
}

function MetricCard({ label, value, helper, warning = false }: { label: string; value: string | number; helper: string; warning?: boolean }) {
  return (
    <article className={warning ? "metric-card warning" : "metric-card"}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{helper}</p>
    </article>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-box">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  return <span className={`status-pill ${status}`}>{statusLabels[status] || status}</span>;
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <span>◈</span>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function getLessonSummary(lesson: AnyRecord) {
  const type = lesson.content_type || lesson.type || "texto";
  const duration = lesson.duration_minutes ? `${lesson.duration_minutes} min` : "sin duración";
  return `${type} · ${duration}`;
}

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  try {
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "Sin fecha";
  }
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

function Background() {
  return (
    <div className="background" aria-hidden="true">
      <div className="orb one" />
      <div className="orb two" />
      <div className="grid" />
    </div>
  );
}

function EvaluationStyles() {
  return <style>{`
    :root{--green:#63e546;--bg:#050706;--panel:rgba(10,14,12,.9);--panel2:rgba(255,255,255,.035);--line:rgba(255,255,255,.085);--white:#f4f6f2;--muted:rgba(244,246,242,.66);--soft:rgba(244,246,242,.42);--warning:#f7c948;--danger:#ff5757}*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--white);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}button,input,select,textarea{font:inherit}button{transition:.18s ease}button:not(:disabled):hover{transform:translateY(-1px)}button:disabled{opacity:.48;cursor:not-allowed}.background{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}.orb{position:absolute;width:540px;height:540px;border-radius:999px;filter:blur(120px)}.orb.one{left:-220px;top:-180px;background:rgba(99,229,70,.105)}.orb.two{right:-260px;top:120px;background:rgba(255,255,255,.055)}.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.022) 1px,transparent 1px);background-size:44px 44px;mask-image:radial-gradient(circle at center,black,transparent 82%);opacity:.62}.review-page,.review-loading{min-height:100vh;background:var(--bg);color:var(--white);position:relative}.review-page{display:grid;grid-template-columns:292px minmax(0,1fr)}.review-loading{display:grid;place-items:center}.loading-card,.not-found-card{position:relative;z-index:2;width:min(620px,calc(100vw - 40px));border:1px solid var(--line);border-radius:28px;background:linear-gradient(145deg,rgba(255,255,255,.08),rgba(255,255,255,.025));padding:34px;box-shadow:0 35px 110px rgba(0,0,0,.5)}.loading-card h1,.not-found-card h1{margin:20px 0 0;font-size:42px;line-height:.94;letter-spacing:-.06em}.loading-card p,.not-found-card p{margin:14px 0 0;color:var(--muted);line-height:1.6}.not-found-card button{margin-top:18px;min-height:42px;border-radius:999px;border:0;background:var(--green);color:#061008;font-weight:950;padding:0 18px;cursor:pointer}.review-sidebar{position:sticky;top:0;height:100vh;z-index:2;border-right:1px solid var(--line);background:linear-gradient(180deg,rgba(5,8,7,.98),rgba(3,5,4,.95));padding:22px;display:flex;flex-direction:column;justify-content:space-between}.sidebar-logo{min-height:58px;display:flex;align-items:center;margin-bottom:24px}.review-nav{display:grid;gap:8px}.review-nav button{min-height:48px;border-radius:14px;border:1px solid transparent;background:transparent;color:var(--muted);text-align:left;padding:0 14px;font-weight:900;cursor:pointer}.review-nav button.active{color:var(--green);background:linear-gradient(90deg,rgba(99,229,70,.15),rgba(99,229,70,.035));border-color:rgba(99,229,70,.16);box-shadow:inset 3px 0 0 var(--green)}.sidebar-status{border:1px solid rgba(99,229,70,.18);border-radius:18px;background:rgba(99,229,70,.055);padding:16px}.sidebar-status span,.kicker{display:block;color:var(--green);text-transform:uppercase;letter-spacing:.18em;font-size:11px;font-weight:950}.sidebar-status strong{display:block;margin-top:8px;font-size:22px;letter-spacing:-.035em}.sidebar-status p{color:var(--muted);font-size:12px;line-height:1.55;margin:8px 0 0}.review-shell{position:relative;z-index:1;min-width:0;padding:18px 20px 34px;display:grid;gap:16px}.review-topbar{min-height:58px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:18px}.review-topbar button{min-height:38px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--white);font-weight:900;padding:0 14px;cursor:pointer}.review-topbar div{text-align:right}.review-topbar span{display:block;color:var(--muted);font-size:12px}.review-topbar strong{display:block;margin-top:2px;color:var(--white);font-size:13px}.system-message{border-radius:14px;border:1px solid rgba(99,229,70,.2);background:rgba(99,229,70,.06);color:var(--muted);padding:14px 16px;line-height:1.5}.review-hero{min-height:178px;border:1px solid var(--line);border-radius:26px;background:radial-gradient(circle at 78% 28%,rgba(99,229,70,.14),transparent 34%),linear-gradient(135deg,rgba(255,255,255,.075),rgba(255,255,255,.025));display:flex;align-items:center;justify-content:space-between;gap:22px;padding:28px;box-shadow:0 30px 90px rgba(0,0,0,.22);overflow:hidden}.review-hero h1{margin:0;font-size:clamp(36px,4.6vw,64px);line-height:.9;letter-spacing:-.07em;max-width:820px}.review-hero p:not(.kicker){margin:14px 0 0;color:var(--muted);line-height:1.62;max-width:760px}.hero-panel{width:380px;border-radius:20px;border:1px solid rgba(99,229,70,.22);background:linear-gradient(145deg,rgba(99,229,70,.09),rgba(255,255,255,.025));padding:18px;box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}.hero-panel span{display:block;color:var(--green);text-transform:uppercase;letter-spacing:.16em;font-size:11px;font-weight:950}.hero-panel strong{display:block;margin-top:10px;font-size:22px;line-height:1.12;letter-spacing:-.04em}.hero-panel p{color:var(--muted);line-height:1.55;font-size:13px}.metrics-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.metric-card,.main-card,.side-card{border:1px solid var(--line);border-radius:20px;background:var(--panel);box-shadow:0 24px 80px rgba(0,0,0,.2)}.metric-card{padding:16px;min-height:118px}.metric-card span{display:block;color:var(--muted);font-size:12px;font-weight:850}.metric-card strong{display:block;margin-top:9px;font-size:32px;line-height:1;letter-spacing:-.05em}.metric-card p{color:var(--muted);margin:8px 0 0;font-size:12px}.metric-card.warning strong{color:var(--warning)}.detail-layout{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:14px;align-items:start}.detail-layout.secondary{align-items:start}.main-card,.side-card{padding:18px}.card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px}.card-head h2,.side-card h2{margin:0;font-size:25px;line-height:1.02;letter-spacing:-.045em}.config-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.info-box{border:1px solid rgba(255,255,255,.075);border-radius:14px;background:rgba(0,0,0,.17);padding:12px;min-height:82px}.info-box span{display:block;color:var(--soft);font-size:10px;text-transform:uppercase;letter-spacing:.13em;font-weight:950}.info-box strong{display:block;margin-top:7px;font-size:14px;line-height:1.32;color:var(--white)}.status-pill{display:inline-flex;align-items:center;justify-content:center;min-height:30px;border-radius:999px;padding:0 12px;border:1px solid rgba(99,229,70,.26);background:rgba(99,229,70,.1);color:var(--green);font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.12em}.status-pill.draft_ai{border-color:rgba(247,201,72,.26);background:rgba(247,201,72,.09);color:var(--warning)}.status-pill.rejected,.status-pill.archived{border-color:rgba(255,87,87,.25);background:rgba(255,87,87,.09);color:var(--danger)}.instructions-card{margin-top:14px;border:1px solid rgba(99,229,70,.16);border-radius:16px;background:rgba(99,229,70,.045);padding:14px}.instructions-card span{color:var(--green);font-size:11px;text-transform:uppercase;letter-spacing:.14em;font-weight:950}.instructions-card p{color:var(--muted);line-height:1.62;margin:9px 0 0}.side-column{display:grid;gap:14px;position:sticky;top:18px}.side-card p:not(.kicker){color:var(--muted);line-height:1.6}.side-card button{width:100%;min-height:44px;border-radius:13px;border:1px solid rgba(255,255,255,.095);background:linear-gradient(145deg,rgba(255,255,255,.06),rgba(255,255,255,.026));color:var(--white);font-weight:950;cursor:pointer;margin-top:10px;padding:0 14px}.side-card button:first-of-type{border:0;background:linear-gradient(135deg,#7cff55,var(--green));color:#061008;box-shadow:0 14px 30px rgba(99,229,70,.16)}.muted-card{background:linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.018))}.lesson-list{display:grid;gap:10px}.lesson-row{display:grid;grid-template-columns:48px minmax(0,1fr);gap:12px;align-items:center;border:1px solid rgba(255,255,255,.075);border-radius:16px;background:rgba(255,255,255,.026);padding:12px}.lesson-row>span{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:rgba(99,229,70,.09);border:1px solid rgba(99,229,70,.18);color:var(--green);font-weight:950}.lesson-row strong,.source-single strong{display:block;font-size:17px}.lesson-row p,.source-single p{margin:5px 0 0;color:var(--muted);font-size:13px;line-height:1.45}.source-single{border:1px solid rgba(99,229,70,.16);border-radius:18px;background:rgba(99,229,70,.045);padding:18px}.source-single span{display:inline-flex;border-radius:999px;border:1px solid rgba(99,229,70,.22);background:rgba(99,229,70,.08);color:var(--green);padding:7px 10px;font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.12em;margin-bottom:12px}.mini-stack{display:grid;gap:8px;margin-top:12px}.mini-stack span{border:1px solid rgba(255,255,255,.075);border-radius:12px;background:rgba(255,255,255,.026);padding:10px;color:var(--muted);font-weight:850}.empty-state{border:1px dashed rgba(255,255,255,.15);border-radius:18px;background:rgba(255,255,255,.022);padding:24px;text-align:center}.empty-state span{width:52px;height:52px;margin:0 auto 12px;display:grid;place-items:center;border-radius:18px;border:1px solid rgba(99,229,70,.18);background:rgba(99,229,70,.07);color:var(--green);font-size:26px}.empty-state strong{display:block;font-size:20px}.empty-state p{color:var(--muted);line-height:1.55;margin:8px auto 0;max-width:520px}@media(max-width:1280px){.review-page{grid-template-columns:1fr}.review-sidebar{position:relative;height:auto}.review-hero{flex-direction:column;align-items:stretch}.hero-panel{width:100%}.metrics-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.detail-layout{grid-template-columns:1fr}.side-column{position:static}.config-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.metrics-grid,.config-grid{grid-template-columns:1fr}.review-shell{padding:14px}.review-hero{padding:22px}.review-hero h1{font-size:38px}.review-topbar{flex-direction:column;align-items:flex-start}.review-topbar div{text-align:left}}
  `}</style>;
}
