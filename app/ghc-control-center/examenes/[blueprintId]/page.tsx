"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import GHCLogo from "../../../components/GHCLogo";

type AnyRecord = Record<string, any>;
type GuardState = "checking" | "allowed" | "denied";
type UiState = "idle" | "loading" | "success" | "error";

type BlueprintBundle = {
  blueprint: AnyRecord | null;
  course: AnyRecord | null;
  module: AnyRecord | null;
  lesson: AnyRecord | null;
  blueprintLessons: AnyRecord[];
  exam: AnyRecord | null;
  questions: AnyRecord[];
  options: AnyRecord[];
  generations: AnyRecord[];
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const emptyBundle: BlueprintBundle = {
  blueprint: null,
  course: null,
  module: null,
  lesson: null,
  blueprintLessons: [],
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

const DETAIL_BUILD_ID = "GHC-EXAM-DETAIL-GENERATE-V3 · botón IA activo";

export default function BlueprintReviewPage() {
  const router = useRouter();
  const params = useParams<{ blueprintId: string }>();
  const blueprintId = String(params?.blueprintId || "");

  const [guardState, setGuardState] = useState<GuardState>("checking");
  const [bundle, setBundle] = useState<BlueprintBundle>(emptyBundle);
  const [message, setMessage] = useState("");
  const [uiState, setUiState] = useState<UiState>("idle");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const blueprint = bundle.blueprint;
  const activeQuestions = useMemo(
    () => bundle.questions.filter((question) => question.is_active !== false),
    [bundle.questions]
  );

  const approvedQuestions = useMemo(
    () => activeQuestions.filter((question) => ["approved", "edited"].includes(String(question.question_status || ""))).length,
    [activeQuestions]
  );

  const rejectedQuestions = useMemo(
    () => activeQuestions.filter((question) => String(question.question_status || "") === "rejected").length,
    [activeQuestions]
  );

  const canGenerate = Boolean(
    blueprint &&
      ["draft_ai", "in_review", "rejected"].includes(String(blueprint.status || "")) &&
      !isGenerating
  );

  useEffect(() => {
    async function protectAndLoad() {
      if (!blueprintId) {
        setGuardState("denied");
        setMessage("No se recibió ID de borrador.");
        return;
      }

      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError || !userData.user) {
          router.replace("/acceso");
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id,role,full_name,email")
          .eq("id", userData.user.id)
          .maybeSingle();

        if (profileError) {
          setGuardState("denied");
          setMessage(profileError.message);
          return;
        }

        const role = String(profileData?.role || "").toLowerCase();
        if (!["admin", "superadmin", "owner"].includes(role)) {
          router.replace("/alumno");
          return;
        }

        setGuardState("allowed");
        await loadBundle();
      } catch (error) {
        setGuardState("denied");
        setMessage(getErrorMessage(error));
      }
    }

    protectAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blueprintId, router]);

  async function loadBundle() {
    setIsRefreshing(true);
    try {
      const nextBundle = await fetchBlueprintBundle(blueprintId);
      setBundle(nextBundle);
      if (!nextBundle.blueprint) {
        setUiState("error");
        setMessage("Borrador no encontrado en exam_blueprints.");
      }
    } catch (error) {
      setUiState("error");
      setMessage(getErrorMessage(error));
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleGenerateQuestions() {
    if (!blueprint?.id) {
      setUiState("error");
      setMessage("No hay blueprint cargado.");
      return;
    }

    setIsGenerating(true);
    setUiState("loading");
    setMessage(`Botón recibido · ${DETAIL_BUILD_ID}. Generando preguntas IA sobre el contenido seleccionado. No cierres esta pantalla.`);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (sessionError || !token) {
        throw new Error("Sesión admin no disponible. Vuelve a iniciar sesión.");
      }

      const response = await fetch("/api/ghc/exams/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ blueprintId: blueprint.id }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || `No se pudo generar preguntas. HTTP ${response.status}`);
      }

      setUiState("success");
      setMessage(result.message || `Generadas ${result.generatedQuestionCount || 0} preguntas como borrador.`);
      await loadBundle();
    } catch (error) {
      setUiState("error");
      setMessage(getErrorMessage(error));
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleUpdateStatus(nextStatus: "in_review" | "approved" | "archived" | "rejected") {
    if (!blueprint?.id) return;

    setUiState("loading");
    setMessage(`Actualizando estado a ${getStatusLabel(nextStatus)}...`);

    const { error } = await supabase.rpc("ghc_admin_update_blueprint_status", {
      p_blueprint_id: blueprint.id,
      p_status: nextStatus,
      p_notes: null,
    });

    if (error) {
      setUiState("error");
      setMessage(error.message);
      return;
    }

    setUiState("success");
    setMessage(`Estado actualizado a ${getStatusLabel(nextStatus)}.`);
    await loadBundle();
  }

  if (guardState === "checking") {
    return (
      <main className="ghc-exam-review-page">
        <ReviewStyles />
        <Background />
        <section className="loading-card">
          <GHCLogo size="md" showText tagline={false} />
          <h1>Centro de evaluación GHC</h1>
          <p>Verificando acceso administrativo y cargando borrador...</p>
        </section>
      </main>
    );
  }

  if (guardState === "denied") {
    return (
      <main className="ghc-exam-review-page">
        <ReviewStyles />
        <Background />
        <section className="loading-card error">
          <GHCLogo size="md" showText tagline={false} />
          <h1>Acceso no disponible</h1>
          <p>{message || "No se pudo cargar este borrador."}</p>
          <button type="button" onClick={() => router.push("/ghc-control-center/examenes")}>Volver al listado</button>
        </section>
      </main>
    );
  }

  if (!blueprint) {
    return (
      <main className="ghc-exam-review-page">
        <ReviewStyles />
        <Background />
        <section className="loading-card error">
          <GHCLogo size="md" showText tagline={false} />
          <h1>Borrador no encontrado</h1>
          <p>{message || "No existe un blueprint con este ID."}</p>
          <button type="button" onClick={() => router.push("/ghc-control-center/examenes")}>Volver al listado</button>
        </section>
      </main>
    );
  }

  return (
    <main className="ghc-exam-review-page">
      <ReviewStyles />
      <Background />

      <header className="review-topbar">
        <button type="button" className="back-button" onClick={() => router.push("/ghc-control-center/examenes")}>
          ← Exámenes
        </button>
        <GHCLogo size="sm" showText tagline={false} />
        <div className="topbar-actions">
          <button type="button" onClick={loadBundle} disabled={isRefreshing}>{isRefreshing ? "Actualizando..." : "Actualizar"}</button>
          <button type="button" onClick={() => router.push("/ghc-control-center")}>Control Center</button>
        </div>
      </header>

      {message ? <div className={`review-message ${uiState}`}>{message}</div> : null}

      <section className="review-hero">
        <div>
          <p className="kicker">Agente de Exámenes GHC v1 · Revisión humana obligatoria</p>
          <h1>{blueprint.title || "Borrador de evaluación"}</h1>
          <p>
            Este borrador configura el examen, genera preguntas como revisión interna y mantiene la publicación bajo control humano.
            El alumno no ve IA, prompts, borradores ni respuestas correctas antes de entregar.
          </p>
          <div className="hero-chips">
            <span className={`status-chip ${String(blueprint.status || "draft_ai")}`}>{getStatusLabel(blueprint.status)}</span>
            <span>{getScopeLabel(blueprint.source_scope)}</span>
            <span>{getDifficultyLabel(blueprint.difficulty)}</span>
          </div>
        </div>

        <aside className="hero-command-card">
          <span>Acción principal</span>
          <strong>Generar preguntas IA</strong>
          <p>Lee solo el contenido seleccionado y guarda preguntas como borrador para revisión. No publica nada.</p>
          <button type="button" onClick={handleGenerateQuestions} disabled={!canGenerate}>
            {isGenerating ? "Generando..." : activeQuestions.length ? "Regenerar borrador IA" : "Generar preguntas IA"}
          </button>
          {!canGenerate ? <small>Disponible solo en draft_ai, in_review o rejected.</small> : null}
        </aside>
      </section>

      <section className="stats-grid">
        <MetricCard label="Solicitadas" value={Number(blueprint.requested_question_count || 0)} helper="Configuración admin" />
        <MetricCard label="Generadas" value={activeQuestions.length} helper="Preguntas reales" />
        <MetricCard label="Aprobadas" value={approvedQuestions} helper="Listas para publicar" />
        <MetricCard label="Rechazadas" value={rejectedQuestions} helper="Regenerables" danger={rejectedQuestions > 0} />
      </section>

      <section className="review-layout">
        <aside className="review-side">
          <article className="panel-card">
            <div className="panel-head">
              <span>Contexto académico</span>
              <h2>Contenido evaluado</h2>
            </div>
            <InfoBlock label="Curso" value={bundle.course?.title || blueprint.course_id || "Curso no encontrado"} />
            <InfoBlock label="Módulo" value={bundle.module?.title || (blueprint.module_id ? blueprint.module_id : "No aplica")} />
            <InfoBlock label="Lección" value={bundle.lesson?.title || (blueprint.lesson_id ? blueprint.lesson_id : "No aplica")} />
            {bundle.blueprintLessons.length ? (
              <div className="lesson-list">
                <span>Lecciones múltiples</span>
                {bundle.blueprintLessons.map((row, index) => (
                  <p key={String(row.id || index)}>L{index + 1} · {row.lesson_title || row.lesson_id}</p>
                ))}
              </div>
            ) : null}
          </article>

          <article className="panel-card">
            <div className="panel-head">
              <span>Configuración</span>
              <h2>Reglas del examen</h2>
            </div>
            <InfoGrid
              items={[
                ["Tipo", getScopeLabel(blueprint.evaluation_type || blueprint.source_scope)],
                ["Dificultad", getDifficultyLabel(blueprint.difficulty)],
                ["Nota mínima", `${Number(blueprint.pass_percentage || 70)}%`],
                ["Intentos", getAttemptsLabel(blueprint)],
                ["Respuestas", String(blueprint.answer_count || 4)],
                ["Explicación", blueprint.show_explanation ? "Sí" : "No"],
                ["Bloqueo", blueprint.block_advance ? "Sí" : "No"],
                ["Estado", getStatusLabel(blueprint.status)],
              ]}
            />
          </article>
        </aside>

        <section className="review-main">
          <article className="panel-card ai-instructions-card">
            <div className="panel-head row">
              <div>
                <span>Instrucciones internas</span>
                <h2>Brief para generación</h2>
              </div>
              <button type="button" onClick={() => router.push("/ghc-control-center/examenes/crear")}>Nuevo borrador</button>
            </div>
            <p>{blueprint.ai_instructions || "Sin instrucciones adicionales. La IA usará únicamente el contenido seleccionado y las reglas de configuración."}</p>
          </article>

          <article className="panel-card questions-card">
            <div className="panel-head row">
              <div>
                <span>Banco de preguntas</span>
                <h2>Preguntas generadas</h2>
              </div>
              <button type="button" onClick={handleGenerateQuestions} disabled={!canGenerate}>
                {isGenerating ? "Generando..." : "Generar IA"}
              </button>
            </div>

            {activeQuestions.length ? (
              <div className="question-stack">
                {activeQuestions.map((question, index) => (
                  <QuestionCard
                    key={String(question.id || index)}
                    index={index}
                    question={question}
                    options={bundle.options.filter((option) => String(option.question_id) === String(question.id))}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-questions">
                <span>◈</span>
                <h3>Aún no hay preguntas generadas</h3>
                <p>Pulsa “Generar preguntas IA”. Se crearán como draft_ai y quedarán pendientes de revisión humana.</p>
                <button type="button" onClick={handleGenerateQuestions} disabled={!canGenerate}>
                  {isGenerating ? "Generando..." : "Generar preguntas IA"}
                </button>
              </div>
            )}
          </article>
        </section>

        <aside className="review-side">
          <article className="panel-card command-panel">
            <div className="panel-head">
              <span>Control humano</span>
              <h2>Estados</h2>
            </div>
            <button type="button" onClick={() => handleUpdateStatus("in_review")}>Pasar a revisión</button>
            <button type="button" onClick={() => handleUpdateStatus("approved")} disabled={!activeQuestions.length}>Aprobar blueprint</button>
            <button type="button" onClick={() => handleUpdateStatus("rejected")}>Rechazar</button>
            <button type="button" onClick={() => handleUpdateStatus("archived")}>Archivar</button>
            <small>Publicar examen irá en el siguiente bloque, solo cuando existan preguntas aprobadas.</small>
          </article>

          <article className="panel-card generation-card">
            <div className="panel-head">
              <span>Historial IA</span>
              <h2>Generaciones</h2>
            </div>
            {bundle.generations.length ? (
              <div className="generation-list">
                {bundle.generations.map((generation, index) => (
                  <div key={String(generation.id || index)}>
                    <strong>{generation.generation_type || "initial"}</strong>
                    <span>{generation.status || "created"} · {generation.generated_question_count || 0} preguntas</span>
                    <p>{generation.output_summary || generation.error_message || formatShortDate(generation.created_at)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">Aún no hay generaciones registradas.</p>
            )}
          </article>
        </aside>
      </section>
    </main>
  );
}

async function fetchBlueprintBundle(blueprintId: string): Promise<BlueprintBundle> {
  const { data: blueprint, error: blueprintError } = await supabase
    .from("exam_blueprints")
    .select("*")
    .eq("id", blueprintId)
    .maybeSingle();

  if (blueprintError) throw blueprintError;
  if (!blueprint) return emptyBundle;

  const [course, module, lesson, blueprintLessons, exam, generations] = await Promise.all([
    maybeSingle("courses", blueprint.course_id, "id,title,subtitle,description,level,course_type"),
    blueprint.module_id ? maybeSingle("modules", blueprint.module_id, "id,title,description,course_id") : Promise.resolve(null),
    blueprint.lesson_id ? maybeSingle("lessons", blueprint.lesson_id, "id,title,content_type,module_id") : Promise.resolve(null),
    fetchBlueprintLessons(blueprint.id),
    fetchGeneratedExam(blueprint),
    fetchRows("exam_ai_generations", "*", "blueprint_id", blueprint.id, "created_at", false),
  ]);

  const examId = exam?.id || blueprint.generated_exam_id || null;
  const questions = examId
    ? await fetchRows("exam_questions", "*", "exam_id", examId, "sort_order", true)
    : await fetchRows("exam_questions", "*", "blueprint_id", blueprint.id, "sort_order", true);

  const questionIds = questions.map((question) => String(question.id)).filter(Boolean);
  const options = questionIds.length ? await fetchOptions(questionIds) : [];

  return {
    blueprint,
    course,
    module,
    lesson,
    blueprintLessons,
    exam,
    questions,
    options,
    generations,
  };
}

async function maybeSingle(table: string, id: string, columns: string): Promise<AnyRecord | null> {
  const { data } = await supabase.from(table).select(columns).eq("id", id).maybeSingle();
  return data ? (data as unknown as AnyRecord) : null;
}

async function fetchRows(table: string, columns: string, field: string, value: string, orderField: string, ascending: boolean): Promise<AnyRecord[]> {
  const { data } = await supabase
    .from(table)
    .select(columns)
    .eq(field, value)
    .order(orderField, { ascending });

  return Array.isArray(data) ? (data as unknown as AnyRecord[]) : [];
}

async function fetchGeneratedExam(blueprint: AnyRecord) {
  if (blueprint.generated_exam_id) {
    const exam = await maybeSingle("exams", blueprint.generated_exam_id, "*");
    if (exam) return exam;
  }

  const { data } = await supabase
    .from("exams")
    .select("*")
    .eq("blueprint_id", blueprint.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data || null;
}

async function fetchBlueprintLessons(blueprintId: string): Promise<AnyRecord[]> {
  const { data } = await supabase
    .from("exam_blueprint_lessons")
    .select("id,lesson_id,module_id,sort_order,lessons(title)")
    .eq("blueprint_id", blueprintId)
    .order("sort_order", { ascending: true });

  if (!Array.isArray(data)) return [];

  return (data as unknown as AnyRecord[]).map((row) => ({
    ...row,
    lesson_title: row.lessons?.title || "",
  }));
}

async function fetchOptions(questionIds: string[]): Promise<AnyRecord[]> {
  const { data } = await supabase
    .from("exam_question_options")
    .select("*")
    .in("question_id", questionIds)
    .order("sort_order", { ascending: true });

  return Array.isArray(data) ? (data as unknown as AnyRecord[]) : [];
}

function QuestionCard({ question, options, index }: { question: AnyRecord; options: AnyRecord[]; index: number }) {
  const normalizedOptions = options.length ? options : legacyOptions(question);

  return (
    <article className="question-card">
      <div className="question-topline">
        <span>Pregunta {index + 1}</span>
        <em className={`question-status ${String(question.question_status || "needs_review")}`}>{getQuestionStatusLabel(question.question_status)}</em>
      </div>
      <h3>{question.question}</h3>
      <div className="option-list">
        {normalizedOptions.map((option, optionIndex) => (
          <div key={`${question.id}-${option.label || optionIndex}`} className={option.is_correct ? "option-row correct" : "option-row"}>
            <strong>{option.label}</strong>
            <p>{option.option_text || option.text}</p>
            {option.is_correct ? <span>Correcta</span> : null}
          </div>
        ))}
      </div>
      {question.explanation ? <p className="explanation"><strong>Explicación:</strong> {question.explanation}</p> : null}
      {question.evaluated_objective ? <p className="objective"><strong>Objetivo evaluado:</strong> {question.evaluated_objective}</p> : null}
    </article>
  );
}

function legacyOptions(question: AnyRecord) {
  const correct = String(question.correct_option || "").toUpperCase();
  return [
    ["A", question.option_a],
    ["B", question.option_b],
    ["C", question.option_c],
    ["D", question.option_d],
  ]
    .filter(([, text]) => Boolean(text))
    .map(([label, text]) => ({ label, option_text: text, is_correct: label === correct }));
}

function MetricCard({ label, value, helper, danger = false }: { label: string; value: string | number; helper: string; danger?: boolean }) {
  return (
    <article className={danger ? "metric-card danger" : "metric-card"}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{helper}</p>
    </article>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-block">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function InfoGrid({ items }: { items: [string, string][] }) {
  return (
    <div className="info-grid">
      {items.map(([label, value]) => (
        <InfoBlock key={label} label={label} value={value} />
      ))}
    </div>
  );
}

function getStatusLabel(value: unknown) {
  const key = String(value || "draft_ai");
  return statusLabels[key] || key;
}

function getQuestionStatusLabel(value: unknown) {
  const key = String(value || "needs_review");
  const labels: Record<string, string> = {
    draft_ai: "Borrador IA",
    edited: "Editada",
    approved: "Aprobada",
    rejected: "Rechazada",
    needs_review: "Revisión",
  };
  return labels[key] || key;
}

function getDifficultyLabel(value: unknown) {
  const key = String(value || "mixed");
  return difficultyLabels[key] || key;
}

function getScopeLabel(value: unknown) {
  const key = String(value || "course");
  return scopeLabels[key] || key;
}

function getAttemptsLabel(blueprint: AnyRecord) {
  if (String(blueprint.attempts_mode || "limited") === "unlimited") return "Ilimitados";
  return `${Number(blueprint.max_attempts || 1)} intento(s)`;
}

function formatShortDate(value?: string | null) {
  if (!value) return "Sin fecha";
  try {
    return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch {
    return "Sin fecha";
  }
}

function getErrorMessage(error: unknown) {
  if (!error) return "Error desconocido.";
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message || "Error desconocido.");
  }
  return "Error desconocido.";
}

function Background() {
  return (
    <div className="review-bg" aria-hidden="true">
      <div className="orb one" />
      <div className="orb two" />
      <div className="grid" />
    </div>
  );
}

function ReviewStyles() {
  return (
    <style>{`
      :root{--bg:#050706;--panel:rgba(10,14,12,.9);--panel2:rgba(14,19,16,.88);--line:rgba(255,255,255,.085);--line2:rgba(99,229,70,.22);--white:#f4f6f2;--muted:rgba(244,246,242,.68);--soft:rgba(244,246,242,.48);--green:#63e546;--danger:#ff6464;--warning:#f7c948}*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--white)}body{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}button,input,select,textarea{font:inherit}button{transition:.18s ease}button:hover:not(:disabled){transform:translateY(-1px)}button:disabled{opacity:.52;cursor:not-allowed}.ghc-exam-review-page{min-height:100vh;background:var(--bg);color:var(--white);position:relative;overflow:hidden;padding:22px}.review-bg{position:fixed;inset:0;pointer-events:none;z-index:0}.orb{position:absolute;width:520px;height:520px;border-radius:999px;filter:blur(120px)}.orb.one{left:-180px;top:-180px;background:rgba(99,229,70,.09)}.orb.two{right:-210px;top:120px;background:rgba(255,255,255,.055)}.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.022) 1px,transparent 1px);background-size:44px 44px;opacity:.5;mask-image:radial-gradient(circle at center,black 0%,transparent 86%)}.review-topbar,.review-hero,.stats-grid,.review-layout,.review-message,.loading-card{position:relative;z-index:1}.review-topbar{min-height:62px;display:flex;align-items:center;justify-content:space-between;gap:14px;border:1px solid var(--line);border-radius:20px;background:rgba(255,255,255,.028);padding:12px 14px;margin-bottom:14px;backdrop-filter:blur(12px)}.back-button,.topbar-actions button,.panel-head button{min-height:40px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.04);color:var(--white);padding:0 14px;font-weight:900;cursor:pointer}.topbar-actions{display:flex;gap:9px}.review-message{border-radius:16px;border:1px solid var(--line);background:rgba(255,255,255,.04);padding:14px 16px;color:var(--muted);margin-bottom:14px}.review-message.success{border-color:rgba(99,229,70,.28);background:rgba(99,229,70,.07);color:var(--white)}.review-message.error{border-color:rgba(255,100,100,.32);background:rgba(255,100,100,.08);color:#ffd4d4}.review-message.loading{border-color:rgba(247,201,72,.28);background:rgba(247,201,72,.07);color:#ffe7a0}.review-hero{min-height:250px;border:1px solid var(--line);border-radius:28px;background:radial-gradient(circle at 82% 18%,rgba(99,229,70,.14),transparent 34%),linear-gradient(135deg,rgba(255,255,255,.07),rgba(255,255,255,.024));display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:22px;align-items:stretch;padding:28px;box-shadow:0 30px 100px rgba(0,0,0,.24);overflow:hidden}.kicker{margin:0 0 10px;color:var(--green);text-transform:uppercase;letter-spacing:.18em;font-size:11px;font-weight:950}.review-hero h1{margin:0;font-size:clamp(38px,5vw,72px);line-height:.9;letter-spacing:-.075em;font-weight:950;max-width:950px}.review-hero p{margin:18px 0 0;color:var(--muted);line-height:1.65;max-width:850px}.hero-chips{display:flex;flex-wrap:wrap;gap:9px;margin-top:22px}.hero-chips span,.status-chip{border-radius:999px;border:1px solid rgba(99,229,70,.22);background:rgba(99,229,70,.075);color:var(--green);padding:8px 11px;font-size:11px;text-transform:uppercase;letter-spacing:.12em;font-weight:950}.status-chip.rejected,.status-chip.archived{border-color:rgba(255,100,100,.25);background:rgba(255,100,100,.08);color:var(--danger)}.status-chip.in_review{border-color:rgba(247,201,72,.25);background:rgba(247,201,72,.08);color:var(--warning)}.hero-command-card{border:1px solid var(--line2);border-radius:22px;background:linear-gradient(145deg,rgba(99,229,70,.105),rgba(255,255,255,.028));padding:20px;display:flex;flex-direction:column;justify-content:center;box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}.hero-command-card span,.panel-head span{color:var(--green);text-transform:uppercase;letter-spacing:.16em;font-size:10px;font-weight:950}.hero-command-card strong{display:block;margin-top:9px;font-size:25px;line-height:1.04;letter-spacing:-.04em}.hero-command-card p{font-size:13px;margin:12px 0 18px}.hero-command-card button,.empty-questions button,.questions-card>.panel-head button,.command-panel button{min-height:46px;border:0;border-radius:999px;background:linear-gradient(135deg,#7cff55,var(--green));color:#061008;font-weight:950;padding:0 17px;cursor:pointer}.hero-command-card small,.command-panel small{display:block;margin-top:12px;color:var(--soft);line-height:1.45}.stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:14px}.metric-card,.panel-card{border:1px solid var(--line);border-radius:20px;background:var(--panel);box-shadow:0 22px 80px rgba(0,0,0,.18)}.metric-card{padding:18px;min-height:122px}.metric-card span{color:var(--muted);font-size:12px;font-weight:850}.metric-card strong{display:block;margin-top:10px;font-size:34px;letter-spacing:-.05em}.metric-card p{margin:7px 0 0;color:var(--soft);font-size:12px}.metric-card.danger strong{color:var(--danger)}.review-layout{display:grid;grid-template-columns:320px minmax(0,1fr) 320px;gap:14px;margin-top:14px;align-items:start}.review-side,.review-main{display:grid;gap:14px}.panel-card{padding:18px}.panel-head{margin-bottom:14px}.panel-head.row{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.panel-head h2{margin:7px 0 0;font-size:23px;line-height:1.05;letter-spacing:-.045em}.info-block{border:1px solid rgba(255,255,255,.075);border-radius:14px;background:rgba(0,0,0,.18);padding:12px;margin-top:9px}.info-block span{display:block;color:var(--soft);font-size:10px;text-transform:uppercase;letter-spacing:.12em;font-weight:950}.info-block strong{display:block;margin-top:6px;color:var(--white);line-height:1.28;font-size:13px}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.info-grid .info-block{margin-top:0}.lesson-list{border-top:1px solid var(--line);margin-top:14px;padding-top:12px}.lesson-list span{color:var(--green);font-size:10px;text-transform:uppercase;letter-spacing:.12em;font-weight:950}.lesson-list p{margin:8px 0 0;color:var(--muted);font-size:13px}.ai-instructions-card p{margin:0;color:var(--muted);line-height:1.7}.question-stack{display:grid;gap:12px}.question-card{border:1px solid rgba(255,255,255,.08);border-radius:18px;background:linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.02));padding:16px}.question-topline{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}.question-topline span{color:var(--green);font-size:11px;text-transform:uppercase;letter-spacing:.14em;font-weight:950}.question-status{font-style:normal;border-radius:999px;border:1px solid rgba(247,201,72,.25);background:rgba(247,201,72,.08);color:var(--warning);padding:6px 9px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;font-weight:950}.question-status.approved,.question-status.edited{border-color:rgba(99,229,70,.25);background:rgba(99,229,70,.08);color:var(--green)}.question-status.rejected{border-color:rgba(255,100,100,.28);background:rgba(255,100,100,.08);color:var(--danger)}.question-card h3{margin:0;font-size:20px;line-height:1.25;letter-spacing:-.025em}.option-list{display:grid;gap:8px;margin-top:14px}.option-row{display:grid;grid-template-columns:34px minmax(0,1fr) 84px;gap:10px;align-items:center;border:1px solid rgba(255,255,255,.07);border-radius:14px;background:rgba(0,0,0,.18);padding:10px}.option-row strong{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;background:rgba(255,255,255,.06);color:var(--white)}.option-row p{margin:0;color:var(--muted);line-height:1.4}.option-row span{color:var(--green);font-size:11px;font-weight:950}.option-row.correct{border-color:rgba(99,229,70,.22);background:rgba(99,229,70,.065)}.explanation,.objective{margin:12px 0 0;color:var(--muted);line-height:1.58;font-size:13px}.empty-questions{text-align:center;border:1px dashed rgba(99,229,70,.28);border-radius:18px;background:rgba(99,229,70,.045);padding:34px}.empty-questions span{width:58px;height:58px;margin:0 auto 16px;border-radius:18px;display:grid;place-items:center;background:rgba(99,229,70,.08);border:1px solid rgba(99,229,70,.18);color:var(--green);font-size:26px}.empty-questions h3{margin:0;font-size:26px;letter-spacing:-.04em}.empty-questions p{margin:12px auto 18px;color:var(--muted);max-width:520px;line-height:1.6}.command-panel{display:grid;gap:9px}.command-panel .panel-head{margin-bottom:5px}.command-panel button{width:100%;background:rgba(255,255,255,.045);color:var(--white);border:1px solid var(--line)}.command-panel button:first-of-type,.command-panel button:nth-of-type(2){background:linear-gradient(135deg,#7cff55,var(--green));color:#061008;border:0}.generation-list{display:grid;gap:10px}.generation-list div{border:1px solid rgba(255,255,255,.075);border-radius:14px;background:rgba(0,0,0,.18);padding:12px}.generation-list strong{display:block;color:var(--white)}.generation-list span,.generation-list p,.muted{display:block;margin:5px 0 0;color:var(--muted);font-size:12px;line-height:1.45}.loading-card{width:min(620px,calc(100vw - 40px));margin:14vh auto 0;border:1px solid var(--line);border-radius:26px;background:var(--panel);padding:30px;box-shadow:0 30px 100px rgba(0,0,0,.28)}.loading-card h1{margin:20px 0 0;font-size:42px;line-height:.95;letter-spacing:-.06em}.loading-card p{margin:14px 0 0;color:var(--muted);line-height:1.6}.loading-card button{margin-top:18px;min-height:42px;border-radius:999px;border:0;background:var(--green);color:#061008;font-weight:950;padding:0 16px;cursor:pointer}@media(max-width:1320px){.review-hero,.review-layout{grid-template-columns:1fr}.hero-command-card{width:100%}.stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.ghc-exam-review-page{padding:12px}.review-topbar{align-items:flex-start;flex-direction:column}.topbar-actions{width:100%;display:grid;grid-template-columns:1fr 1fr}.review-hero{padding:20px;border-radius:22px}.review-hero h1{font-size:42px}.stats-grid,.info-grid{grid-template-columns:1fr}.option-row{grid-template-columns:34px minmax(0,1fr)}.option-row span{grid-column:2}.panel-head.row{flex-direction:column}}
    `}</style>
  );
}
