"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type AnyRecord = Record<string, any>;

type ImportOption = {
  label: "A" | "B" | "C" | "D" | "E" | "F";
  text: string;
  is_correct: boolean;
};

type ImportQuestion = {
  question: string;
  question_type?: "test" | "true_false" | "case_option";
  options: ImportOption[];
  correct_label?: "A" | "B" | "C" | "D" | "E" | "F";
  explanation?: string;
  difficulty?: "basic" | "medium" | "advanced" | "mixed";
  evaluated_objective?: string;
};

type ImportPayload = {
  questions: ImportQuestion[];
};

type AlertState = {
  type: "idle" | "info" | "success" | "error" | "warning";
  message: string;
};

type ReviewOptionForm = {
  label: "A" | "B" | "C" | "D" | "E" | "F";
  option_text: string;
  is_correct: boolean;
};

type ReviewQuestionForm = {
  question: string;
  question_type: "test" | "true_false" | "case_option";
  options: ReviewOptionForm[];
  correct_label: "A" | "B" | "C" | "D" | "E" | "F";
  explanation: string;
  difficulty: "basic" | "medium" | "advanced" | "mixed";
  evaluated_objective: string;
};

const BUILD_MARK = "GHC-EXAM-REVIEW-V7 · revisión humana estable · sin saltos de pantalla";
const VALID_QUESTION_TYPES = new Set(["test", "true_false", "case_option"]);
const VALID_DIFFICULTIES = new Set(["basic", "medium", "advanced", "mixed"]);
const LABELS = ["A", "B", "C", "D", "E", "F"] as const;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export default function BlueprintDetailPage() {
  const params = useParams<{ blueprintId: string }>();
  const blueprintId = String(params?.blueprintId || "");

  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [detail, setDetail] = useState<AnyRecord | null>(null);
  const [jsonInput, setJsonInput] = useState("");
  const [importerOpen, setImporterOpen] = useState(false);
  const [allowAdditionalImport, setAllowAdditionalImport] = useState(false);
  const [validatedPayload, setValidatedPayload] = useState<ImportPayload | null>(null);
  const [alert, setAlert] = useState<AlertState>({ type: "idle", message: "" });
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ReviewQuestionForm | null>(null);

  const importerRef = useRef<HTMLTextAreaElement | null>(null);
  const questionsRef = useRef<HTMLDivElement | null>(null);

  const blueprint = detail?.blueprint || null;
  const exam = detail?.exam || null;
  const questions: AnyRecord[] = Array.isArray(detail?.questions) ? detail.questions : [];
  const options: AnyRecord[] = Array.isArray(detail?.options) ? detail.options : [];
  const questionCount = Number(detail?.question_count || questions.length || 0);
  const optionCount = Number(detail?.option_count || options.length || 0);
  const requestedQuestionCount = Number(blueprint?.requested_question_count || 0);
  const answerCount = Number(blueprint?.answer_count || 4);

  const reviewSummary = useMemo(() => {
    const total = questions.length;
    const approved = questions.filter((question) => question.question_status === "approved").length;
    const edited = questions.filter((question) => question.question_status === "edited").length;
    const rejected = questions.filter((question) => question.question_status === "rejected").length;
    const draft = questions.filter((question) => question.question_status === "draft_ai").length;
    const needsReview = questions.filter((question) => question.question_status === "needs_review").length;
    return {
      total,
      approved,
      edited,
      rejected,
      draft,
      needsReview,
      ready: total > 0 && rejected === 0 && approved + edited === total,
    };
  }, [questions]);

  const groupedOptions = useMemo(() => {
    const map = new Map<string, AnyRecord[]>();
    for (const option of options) {
      const key = String(option.question_id || "");
      if (!key) continue;
      const current = map.get(key) || [];
      current.push(option);
      map.set(
        key,
        current.sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
      );
    }
    return map;
  }, [options]);

  const loadDetail = useCallback(async (silent = false) => {
    if (!supabase) {
      setAlert({
        type: "error",
        message: "Faltan variables de Supabase en Vercel. Revisa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      });
      if (!silent) setLoading(false);
      return;
    }

    if (!blueprintId) {
      setAlert({ type: "error", message: "No se recibió blueprintId en la URL." });
      if (!silent) setLoading(false);
      return;
    }

    if (!silent) setLoading(true);

    const { data, error } = await supabase.rpc("ghc_admin_get_exam_blueprint_detail", {
      p_blueprint_id: blueprintId,
    });

    if (error) {
      setDetail(null);
      setAlert({
        type: "error",
        message: `No se pudo cargar el borrador: ${error.message}`,
      });
      if (!silent) setLoading(false);
      return;
    }

    setDetail(data || null);
    setAlert((current) =>
      current.type === "success" || current.type === "info" || current.type === "warning"
        ? current
        : { type: "idle", message: "" }
    );
    if (!silent) setLoading(false);
  }, [blueprintId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const openImporter = () => {
    setImporterOpen(true);
    setAlert({
      type: "info",
      message: "Importador abierto. Pega el JSON generado y valida antes de importar definitivamente.",
    });

    setTimeout(() => {
      importerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      importerRef.current?.focus();
    }, 80);
  };

  const validateJson = () => {
    try {
      const payload = parseAndValidateJson(jsonInput, answerCount);
      setValidatedPayload(payload);
      setAlert({
        type: "success",
        message: `JSON válido: ${payload.questions.length} preguntas detectadas, ${payload.questions.length * answerCount} opciones previstas.`,
      });
      return payload;
    } catch (error) {
      setValidatedPayload(null);
      setAlert({ type: "error", message: getErrorMessage(error) });
      return null;
    }
  };

  const importJson = async () => {
    if (!supabase) {
      setAlert({ type: "error", message: "Supabase no está configurado." });
      return;
    }

    if (!blueprint?.id) {
      setAlert({ type: "error", message: "No hay blueprint cargado." });
      return;
    }

    if (questionCount > 0 && !allowAdditionalImport) {
      setAlert({
        type: "warning",
        message:
          "Este borrador ya tiene preguntas importadas. Para evitar duplicados, activa la casilla de importación adicional solo si quieres añadir más preguntas.",
      });
      return;
    }

    const payload = validatedPayload || validateJson();
    if (!payload) return;

    setWorking(true);
    setAlert({
      type: "info",
      message: "Importando preguntas. No cierres la página hasta que termine.",
    });

    try {
      const { data: examRow, error: examError } = await supabase.rpc(
        "ghc_admin_create_exam_from_blueprint",
        {
          p_blueprint_id: blueprint.id,
        }
      );

      if (examError || !examRow?.id) {
        throw new Error(examError?.message || "No se pudo crear/recuperar el examen borrador.");
      }

      const { data: generationRow, error: generationError } = await supabase.rpc(
        "ghc_admin_start_ai_generation",
        {
          p_blueprint_id: blueprint.id,
          p_exam_id: examRow.id,
          p_generation_type: "initial",
          p_model_provider: "manual_bridge",
          p_model_name: "ChatGPT/Claude manual",
          p_prompt_hash: null,
          p_input_summary: "Importación manual desde JSON generado fuera de la plataforma.",
          p_requested_question_count: payload.questions.length,
          p_regenerated_question_ids: [],
        }
      );

      if (generationError || !generationRow?.id) {
        throw new Error(generationError?.message || "No se pudo registrar la generación manual.");
      }

      for (let index = 0; index < payload.questions.length; index += 1) {
        const item = payload.questions[index];
        const correct = item.options.find((option) => option.is_correct);
        const correctLabel = item.correct_label || correct?.label || "A";

        const { error: questionError } = await supabase.rpc(
          "ghc_admin_create_ai_question_with_options",
          {
            p_blueprint_id: blueprint.id,
            p_exam_id: examRow.id,
            p_ai_generation_id: generationRow.id,
            p_question: item.question,
            p_question_type: normalizeQuestionType(item.question_type),
            p_options: item.options.map((option, optionIndex) => ({
              label: option.label,
              option_text: option.text,
              is_correct: option.is_correct,
              sort_order: optionIndex + 1,
            })),
            p_correct_label: correctLabel,
            p_sort_order: questionCount + index + 1,
            p_explanation: item.explanation || "",
            p_difficulty: normalizeDifficulty(item.difficulty || blueprint.difficulty),
            p_evaluated_objective:
              item.evaluated_objective || "Comprensión y aplicación del contenido evaluado.",
            p_source_course_id: blueprint.course_id || null,
            p_source_module_id: blueprint.module_id || null,
            p_source_lesson_id: blueprint.lesson_id || null,
            p_regenerated_from_question_id: null,
          }
        );

        if (questionError) {
          throw new Error(questionError.message || `No se pudo guardar la pregunta ${index + 1}.`);
        }
      }

      const { error: finishError } = await supabase.rpc("ghc_admin_finish_ai_generation", {
        p_generation_id: generationRow.id,
        p_status: "created",
        p_generated_question_count: payload.questions.length,
        p_output_summary: `Importación manual completada: ${payload.questions.length} preguntas.`,
        p_error_message: null,
      });

      if (finishError) {
        throw new Error(finishError.message || "No se pudo finalizar la generación manual.");
      }

      setJsonInput("");
      setValidatedPayload(null);
      setAllowAdditionalImport(false);
      await loadDetail(true);

      setAlert({
        type: "success",
        message: `Importación completada correctamente: ${payload.questions.length} preguntas creadas y ${payload.questions.length * answerCount} opciones previstas. Estado actualizado a revisión.`,
      });

      setTimeout(() => {
        questionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    } catch (error) {
      setAlert({ type: "error", message: getErrorMessage(error) });
    } finally {
      setWorking(false);
    }
  };

  const copyPrompt = async () => {
    try {
      const prompt = await buildPromptForExternalAi(blueprint);
      await navigator.clipboard.writeText(prompt);
      setAlert({
        type: "success",
        message: "Prompt copiado. Pégalo en ChatGPT o Claude y solicita que devuelva solo JSON válido.",
      });
    } catch (error) {
      setAlert({
        type: "error",
        message: getErrorMessage(error),
      });
    }
  };

  const openQuestionEditor = (question: AnyRecord) => {
    const currentOptions = groupedOptions.get(String(question.id)) || fallbackOptionsFromQuestion(question);
    const normalizedOptions = buildReviewOptions(currentOptions, answerCount);
    const correct = normalizedOptions.find((option) => option.is_correct)?.label || String(question.correct_option || "A");

    setEditingQuestionId(String(question.id));
    setEditForm({
      question: String(question.question || ""),
      question_type: normalizeQuestionType(question.question_type) as ReviewQuestionForm["question_type"],
      options: normalizedOptions,
      correct_label: LABELS.includes(correct as any) ? (correct as ReviewQuestionForm["correct_label"]) : "A",
      explanation: String(question.explanation || ""),
      difficulty: normalizeDifficulty(question.difficulty) as ReviewQuestionForm["difficulty"],
      evaluated_objective: String(question.evaluated_objective || ""),
    });
    setAlert({ type: "info", message: "Modo edición activado. Revisa la pregunta y guarda los cambios antes de aprobar." });
  };

  const cancelQuestionEditor = () => {
    setEditingQuestionId(null);
    setEditForm(null);
  };

  const setEditOptionText = (label: ReviewOptionForm["label"], value: string) => {
    setEditForm((current) => current ? {
      ...current,
      options: current.options.map((option) => option.label === label ? { ...option, option_text: value } : option),
    } : current);
  };

  const setEditCorrectOption = (label: ReviewOptionForm["label"]) => {
    setEditForm((current) => current ? {
      ...current,
      correct_label: label,
      options: current.options.map((option) => ({ ...option, is_correct: option.label === label })),
    } : current);
  };

  const saveQuestionEdit = async () => {
    if (!supabase || !editingQuestionId || !editForm) return;

    const cleanOptions = editForm.options
      .map((option) => ({
        label: option.label,
        option_text: option.option_text.trim(),
        is_correct: option.label === editForm.correct_label,
      }))
      .filter((option) => option.option_text);

    if (!editForm.question.trim()) {
      setAlert({ type: "error", message: "La pregunta no puede estar vacía." });
      return;
    }

    if (cleanOptions.length < 2) {
      setAlert({ type: "error", message: "La pregunta debe tener al menos dos opciones." });
      return;
    }

    if (!cleanOptions.some((option) => option.is_correct)) {
      setAlert({ type: "error", message: "Debes marcar una respuesta correcta." });
      return;
    }

    setWorking(true);
    try {
      const { error } = await supabase.rpc("ghc_admin_update_review_question", {
        p_question_id: editingQuestionId,
        p_question: editForm.question.trim(),
        p_question_type: editForm.question_type,
        p_options: cleanOptions,
        p_correct_label: editForm.correct_label,
        p_explanation: editForm.explanation.trim(),
        p_difficulty: editForm.difficulty,
        p_evaluated_objective: editForm.evaluated_objective.trim(),
      });

      if (error) throw new Error(error.message || "No se pudo guardar la pregunta editada.");

      cancelQuestionEditor();
      await loadDetail(true);
      setAlert({ type: "success", message: "Pregunta actualizada correctamente. Queda marcada como editada y lista para aprobación." });
    } catch (error) {
      setAlert({ type: "error", message: getErrorMessage(error) });
    } finally {
      setWorking(false);
    }
  };

  const approveQuestion = async (questionId: string) => {
    if (!supabase || !questionId) return;
    setWorking(true);
    try {
      const { error } = await supabase.rpc("ghc_admin_approve_exam_question", { p_question_id: questionId });
      if (error) throw new Error(error.message || "No se pudo aprobar la pregunta.");
      await loadDetail(true);
      setAlert({ type: "success", message: "Pregunta aprobada. Se mantiene en borrador interno hasta publicar el examen completo." });
    } catch (error) {
      setAlert({ type: "error", message: getErrorMessage(error) });
    } finally {
      setWorking(false);
    }
  };

  const rejectQuestion = async (questionId: string) => {
    if (!supabase || !questionId) return;
    const reason = window.prompt("Motivo del rechazo para esta pregunta:", "Necesita ser regenerada o revisada.");
    if (reason === null) return;
    setWorking(true);
    try {
      const { error } = await supabase.rpc("ghc_admin_reject_exam_question", {
        p_question_id: questionId,
        p_rejected_reason: reason,
      });
      if (error) throw new Error(error.message || "No se pudo rechazar la pregunta.");
      await loadDetail(true);
      setAlert({ type: "warning", message: "Pregunta rechazada. Queda inactiva y pendiente de regeneración/revisión antes de publicar." });
    } catch (error) {
      setAlert({ type: "error", message: getErrorMessage(error) });
    } finally {
      setWorking(false);
    }
  };

  const markNeedsReview = async (questionId: string) => {
    if (!supabase || !questionId) return;
    setWorking(true);
    try {
      const { error } = await supabase.rpc("ghc_admin_mark_exam_question_needs_review", {
        p_question_id: questionId,
        p_note: "Marcada para revisión manual desde el panel admin.",
      });
      if (error) throw new Error(error.message || "No se pudo marcar para revisión.");
      await loadDetail(true);
      setAlert({ type: "info", message: "Pregunta marcada como pendiente de revisión. Es una marca interna para dejarla aparcada y volver a ella después." });
    } catch (error) {
      setAlert({ type: "error", message: getErrorMessage(error) });
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <main className="page-shell">
        <style jsx global>{styles}</style>
        <section className="loading-card">
          <div className="pulse" />
          <p>Cargando detalle del borrador...</p>
        </section>
      </main>
    );
  }

  if (!detail || !blueprint) {
    return (
      <main className="page-shell">
        <style jsx global>{styles}</style>
        <section className="error-card">
          <p className="eyebrow">Centro de evaluación GHC</p>
          <h1>Borrador no encontrado</h1>
          <p>{alert.message || "No se pudo cargar el blueprint solicitado."}</p>
          <Link href="/ghc-control-center/examenes">Volver al listado</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <style jsx global>{styles}</style>

      <section className="build-ribbon">
        <span>{BUILD_MARK}</span>
        <strong>
          {questionCount}/{requestedQuestionCount || "?"} preguntas · {optionCount} opciones
        </strong>
      </section>

      <section className="hero">
        <div>
          <p className="eyebrow">Centro de evaluación GHC</p>
          <h1>{blueprint.title || "Borrador de examen"}</h1>
          <p>
            Flujo actual sin API de pago: Academy prepara el trabajo, ChatGPT/Claude genera el JSON,
            y GHC importa las preguntas como borrador para revisión humana.
          </p>
        </div>

        <div className="hero-actions">
          <Link href="/ghc-control-center/examenes">Volver al listado</Link>
          <Link href="/ghc-control-center/examenes/crear">Crear otro borrador</Link>
        </div>
      </section>

      {alert.type !== "idle" && alert.message ? (
        <section className={`alert ${alert.type}`}>
          <strong>{getAlertTitle(alert.type)}</strong>
          <p>{alert.message}</p>
        </section>
      ) : null}

      <section className="overview-grid">
        <article className="metric-card">
          <span>Estado</span>
          <strong>{getBlueprintStatusLabel(blueprint.status)}</strong>
          <p>{blueprint.status}</p>
        </article>
        <article className="metric-card">
          <span>Preguntas</span>
          <strong>
            {questionCount}/{requestedQuestionCount || "?"}
          </strong>
          <p>{questionCount === requestedQuestionCount ? "Cantidad solicitada completa" : "Revisión pendiente"}</p>
        </article>
        <article className="metric-card">
          <span>Opciones</span>
          <strong>{optionCount}</strong>
          <p>{answerCount} respuestas por pregunta</p>
        </article>
        <article className="metric-card">
          <span>Nota mínima</span>
          <strong>{blueprint.pass_percentage || 70}%</strong>
          <p>{blueprint.attempts_mode === "unlimited" ? "Intentos ilimitados" : `${blueprint.max_attempts || 1} intentos`}</p>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Configuración</p>
              <h2>Blueprint del examen</h2>
            </div>
          </div>

          <div className="config-list">
            <div>
              <span>Alcance</span>
              <strong>{getScopeLabel(blueprint.source_scope)}</strong>
            </div>
            <div>
              <span>Tipo evaluación</span>
              <strong>{getEvaluationLabel(blueprint.evaluation_type)}</strong>
            </div>
            <div>
              <span>Dificultad</span>
              <strong>{getDifficultyLabel(blueprint.difficulty)}</strong>
            </div>
            <div>
              <span>Explicación al alumno</span>
              <strong>{blueprint.show_explanation ? "Sí" : "No"}</strong>
            </div>
            <div>
              <span>Bloquea avance</span>
              <strong>{blueprint.block_advance ? "Sí" : "No"}</strong>
            </div>
            <div>
              <span>Examen asociado</span>
              <strong>{exam?.id ? "Creado" : "Pendiente"}</strong>
            </div>
          </div>

          {blueprint.ai_instructions ? (
            <div className="notes">
              <strong>Instrucciones internas</strong>
              <p>{blueprint.ai_instructions}</p>
            </div>
          ) : null}
        </article>

        <article className="panel action-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Modo puente</p>
              <h2>ChatGPT / Claude</h2>
            </div>
          </div>

          <p className="muted">
            Esta fase no usa API de pago. Copia el prompt, genera el JSON fuera y pégalo aquí para
            que Academy lo importe como borrador.
          </p>

          <div className="action-stack">
            <button type="button" onClick={copyPrompt} disabled={working}>
              Copiar prompt para ChatGPT/Claude
            </button>
            <button type="button" onClick={openImporter} disabled={working}>
              Importar JSON de preguntas
            </button>
          </div>

          {questionCount > 0 ? (
            <div className="warning-box">
              <strong>Este borrador ya tiene preguntas.</strong>
              <p>
                Para evitar duplicados, la importación adicional está bloqueada salvo que la actives
                expresamente en el importador.
              </p>
            </div>
          ) : null}
        </article>
      </section>

      <section className={importerOpen ? "importer open" : "importer"}>
        <div className="panel-head">
          <div>
            <p className="eyebrow">Importación controlada</p>
            <h2>Pegar JSON de preguntas</h2>
          </div>
          <button type="button" onClick={() => setImporterOpen((value) => !value)}>
            {importerOpen ? "Ocultar importador" : "Mostrar importador"}
          </button>
        </div>

        {importerOpen ? (
          <>
            <textarea
              ref={importerRef}
              value={jsonInput}
              onChange={(event) => {
                setJsonInput(event.target.value);
                setValidatedPayload(null);
              }}
              placeholder='Pega aquí el JSON completo: {"questions":[...]}'
            />

            {questionCount > 0 ? (
              <label className="confirm-line">
                <input
                  type="checkbox"
                  checked={allowAdditionalImport}
                  onChange={(event) => setAllowAdditionalImport(event.target.checked)}
                />
                Permitir importación adicional aunque ya existen preguntas. Usar solo si quieres añadir más.
              </label>
            ) : null}

            <div className="import-actions">
              <button type="button" onClick={validateJson} disabled={working || !jsonInput.trim()}>
                Validar JSON
              </button>
              <button
                type="button"
                onClick={importJson}
                disabled={working || !jsonInput.trim() || (questionCount > 0 && !allowAdditionalImport)}
              >
                {working ? "Importando..." : "Importar definitivamente"}
              </button>
            </div>
          </>
        ) : (
          <p className="muted">
            Pulsa “Importar JSON de preguntas” para abrir este bloque, pegar el JSON y validarlo.
          </p>
        )}
      </section>

      <section className="questions-section" ref={questionsRef}>
        <div className="panel-head review-head">
          <div>
            <p className="eyebrow">Revisión humana</p>
            <h2>Preguntas importadas</h2>
            <p className="review-summary">
              {reviewSummary.approved} aprobadas · {reviewSummary.edited} editadas · {reviewSummary.draft} borradores · {reviewSummary.rejected} rechazadas · {reviewSummary.needsReview} en revisión
            </p>
          </div>
          <div className="review-head-actions">
            <span className={reviewSummary.ready ? "ready-pill ok" : "ready-pill pending"}>
              {reviewSummary.ready ? "Listo para publicar" : "Revisión pendiente"}
            </span>
            <button type="button" onClick={() => loadDetail()} disabled={working}>
              Refrescar
            </button>
          </div>
        </div>

        {questions.length ? (
          <div className="question-grid">
            {questions.map((question, index) => {
              const optionRows = groupedOptions.get(String(question.id)) || fallbackOptionsFromQuestion(question);
              return (
                <article key={String(question.id || index)} className={`question-card status-${String(question.question_status || "draft_ai")}`}>
                  <div className="question-top">
                    <span>Pregunta {index + 1}</span>
                    <em>{getQuestionStatusLabel(question.question_status)}</em>
                  </div>

                  {editingQuestionId === String(question.id) && editForm ? (
                    <div className="edit-box">
                      <label>
                        <span>Pregunta</span>
                        <textarea
                          value={editForm.question}
                          onChange={(event) => setEditForm({ ...editForm, question: event.target.value })}
                        />
                      </label>

                      <div className="edit-meta-grid">
                        <label>
                          <span>Tipo</span>
                          <select
                            value={editForm.question_type}
                            onChange={(event) => setEditForm({ ...editForm, question_type: event.target.value as ReviewQuestionForm["question_type"] })}
                          >
                            <option value="test">Test</option>
                            <option value="true_false">Verdadero/Falso</option>
                            <option value="case_option">Caso práctico</option>
                          </select>
                        </label>
                        <label>
                          <span>Dificultad</span>
                          <select
                            value={editForm.difficulty}
                            onChange={(event) => setEditForm({ ...editForm, difficulty: event.target.value as ReviewQuestionForm["difficulty"] })}
                          >
                            <option value="basic">Básica</option>
                            <option value="medium">Media</option>
                            <option value="advanced">Avanzada</option>
                            <option value="mixed">Mixta</option>
                          </select>
                        </label>
                      </div>

                      <label>
                        <span>Objetivo evaluado</span>
                        <input
                          value={editForm.evaluated_objective}
                          onChange={(event) => setEditForm({ ...editForm, evaluated_objective: event.target.value })}
                        />
                      </label>

                      <div className="edit-options">
                        {editForm.options.map((option) => (
                          <div key={option.label} className="edit-option-row">
                            <button
                              type="button"
                              className={editForm.correct_label === option.label ? "correct-selector active" : "correct-selector"}
                              onClick={() => setEditCorrectOption(option.label)}
                            >
                              {option.label}
                            </button>
                            <input
                              value={option.option_text}
                              onChange={(event) => setEditOptionText(option.label, event.target.value)}
                            />
                          </div>
                        ))}
                      </div>

                      <label>
                        <span>Explicación didáctica</span>
                        <textarea
                          value={editForm.explanation}
                          onChange={(event) => setEditForm({ ...editForm, explanation: event.target.value })}
                        />
                      </label>

                      <div className="question-actions edit-actions">
                        <button type="button" onClick={saveQuestionEdit} disabled={working}>Guardar cambios</button>
                        <button type="button" className="ghost" onClick={cancelQuestionEditor} disabled={working}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3>{question.question}</h3>
                      {question.evaluated_objective ? (
                        <p className="objective">{question.evaluated_objective}</p>
                      ) : null}

                      <div className="option-list">
                        {optionRows.map((option, optionIndex) => (
                          <div
                            key={`${String(question.id)}-${String(option.label || optionIndex)}`}
                            className={option.is_correct ? "option-row correct" : "option-row"}
                          >
                            <strong>{String(option.label || LABELS[optionIndex] || "?")}</strong>
                            <p>{getOptionText(option)}</p>
                            {option.is_correct ? <span>Correcta</span> : null}
                          </div>
                        ))}
                      </div>

                      {question.explanation ? (
                        <div className="explanation">
                          <strong>Explicación</strong>
                          <p>{question.explanation}</p>
                        </div>
                      ) : null}

                      {question.rejected_reason ? (
                        <div className="rejected-note">
                          <strong>Motivo de rechazo</strong>
                          <p>{question.rejected_reason}</p>
                        </div>
                      ) : null}

                      <div className="question-actions">
                        <button type="button" onClick={() => approveQuestion(String(question.id))} disabled={working || question.question_status === "approved"}>Aprobar</button>
                        <button type="button" className="secondary" onClick={() => openQuestionEditor(question)} disabled={working}>Editar</button>
                        <button type="button" className="ghost" onClick={() => markNeedsReview(String(question.id))} disabled={working || question.question_status === "needs_review"}>Marcar para revisar</button>
                        <button type="button" className="danger" onClick={() => rejectQuestion(String(question.id))} disabled={working || question.question_status === "rejected"}>Rechazar</button>
                      </div>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <article className="empty-questions">
            <span>◈</span>
            <h3>Sin preguntas todavía</h3>
            <p>
              Copia el prompt, genera el JSON en ChatGPT/Claude e impórtalo aquí para crear preguntas
              en borrador.
            </p>
          </article>
        )}
      </section>
    </main>
  );
}

function parseAndValidateJson(input: string, answerCount: number): ImportPayload {
  const raw = String(input || "").trim();

  if (!raw) {
    throw new Error("Pega primero el JSON de preguntas.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("JSON inválido. Revisa comillas, llaves y que no haya texto fuera del JSON.");
  }

  const payload = parsed as ImportPayload;
  if (!payload || !Array.isArray(payload.questions)) {
    throw new Error('El JSON debe tener esta estructura: {"questions":[...]}');
  }

  if (!payload.questions.length) {
    throw new Error("El JSON no contiene preguntas.");
  }

  const expectedAnswers = Math.max(2, Math.min(6, Number(answerCount || 4)));

  payload.questions.forEach((question, questionIndex) => {
    if (!question.question || typeof question.question !== "string") {
      throw new Error(`La pregunta ${questionIndex + 1} no tiene texto válido.`);
    }

    if (!Array.isArray(question.options)) {
      throw new Error(`La pregunta ${questionIndex + 1} no tiene array de opciones.`);
    }

    if (question.options.length !== expectedAnswers) {
      throw new Error(
        `La pregunta ${questionIndex + 1} debe tener exactamente ${expectedAnswers} opciones.`
      );
    }

    const correctCount = question.options.filter((option) => option.is_correct === true).length;
    if (correctCount !== 1) {
      throw new Error(`La pregunta ${questionIndex + 1} debe tener exactamente una respuesta correcta.`);
    }

    question.options.forEach((option, optionIndex) => {
      if (!LABELS.includes(option.label)) {
        throw new Error(`La opción ${optionIndex + 1} de la pregunta ${questionIndex + 1} tiene una etiqueta no válida.`);
      }
      if (!option.text || typeof option.text !== "string") {
        throw new Error(`La opción ${option.label} de la pregunta ${questionIndex + 1} no tiene texto válido.`);
      }
    });

    if (question.question_type && !VALID_QUESTION_TYPES.has(question.question_type)) {
      throw new Error(`La pregunta ${questionIndex + 1} tiene question_type no válido.`);
    }

    if (question.difficulty && !VALID_DIFFICULTIES.has(question.difficulty)) {
      throw new Error(`La pregunta ${questionIndex + 1} tiene difficulty no válido.`);
    }
  });

  return payload;
}

async function buildPromptForExternalAi(blueprint: AnyRecord | null) {
  if (!supabase || !blueprint?.id) {
    throw new Error("No se puede construir el prompt porque no hay blueprint cargado.");
  }

  const parts: string[] = [];

  const { data: course } = await supabase
    .from("courses")
    .select("id,title,subtitle,description,level,course_type")
    .eq("id", blueprint.course_id)
    .maybeSingle();

  if (course) {
    parts.push(`CURSO: ${course.title || "Sin título"}`);
    if (course.subtitle) parts.push(`SUBTÍTULO: ${course.subtitle}`);
    if (course.description) parts.push(`DESCRIPCIÓN DEL CURSO:\n${course.description}`);
    if (course.level) parts.push(`NIVEL DEL CURSO: ${course.level}`);
  }

  const scope = String(blueprint.source_scope || "course");

  if (scope === "course") {
    const modules = await getModulesForCourse(blueprint.course_id);
    const lessons = await getLessonsForModules(modules.map((module) => module.id).filter(Boolean));
    appendPromptContent(parts, modules, lessons);
  }

  if (scope === "module") {
    const modules = await getModulesByIds([blueprint.module_id]);
    const lessons = await getLessonsForModules([blueprint.module_id]);
    appendPromptContent(parts, modules, lessons);
  }

  if (scope === "lesson") {
    const lessons = await getLessonsByIds([blueprint.lesson_id]);
    appendPromptContent(parts, [], lessons);
  }

  if (scope === "multi_lesson") {
    const { data: rows } = await supabase
      .from("exam_blueprint_lessons")
      .select("lesson_id,module_id,sort_order")
      .eq("blueprint_id", blueprint.id)
      .order("sort_order", { ascending: true });

    const lessonIds = Array.isArray(rows) ? rows.map((row) => row.lesson_id).filter(Boolean) : [];
    const moduleIds = Array.isArray(rows) ? rows.map((row) => row.module_id).filter(Boolean) : [];
    const modules = await getModulesByIds(moduleIds);
    const lessons = await getLessonsByIds(lessonIds);
    appendPromptContent(parts, modules, lessons);
  }

  const content = parts.join("\n\n");

  return `Eres el Agente de Exámenes GHC v1 para GHC Academy.

MISIÓN:
Generar preguntas de evaluación para un curso premium de GHC Academy, usando SOLO el contenido proporcionado.

REGLAS INNEGOCIABLES:
- No inventes información externa.
- No menciones IA, ChatGPT, Claude, modelo, prompt ni automatización.
- El resultado será revisado por un administrador antes de publicar.
- Tono profesional, didáctico, claro y riguroso.
- Preguntas orientadas a comprensión real y aplicación, no solo memoria superficial.
- Devuelve SOLO JSON válido. No añadas explicación fuera del JSON. No uses markdown.

CONFIGURACIÓN DEL ADMIN:
- Número exacto de preguntas: ${blueprint.requested_question_count || 3}
- Dificultad: ${blueprint.difficulty || "medium"}
- Tipo(s) de pregunta: ${Array.isArray(blueprint.question_kinds) ? blueprint.question_kinds.join(", ") : "test"}
- Número exacto de respuestas por pregunta: ${blueprint.answer_count || 4}
- Porcentaje mínimo para aprobar: ${blueprint.pass_percentage || 70}%
- Mostrar explicación al alumno: ${blueprint.show_explanation ? "sí" : "no"}
- Bloquear avance hasta aprobar: ${blueprint.block_advance ? "sí" : "no"}
- Instrucciones internas del admin: ${blueprint.ai_instructions || "Sin instrucciones adicionales."}

FORMATO JSON OBLIGATORIO:
{
  "questions": [
    {
      "question": "Texto de la pregunta",
      "question_type": "test",
      "options": [
        { "label": "A", "text": "Respuesta A", "is_correct": false },
        { "label": "B", "text": "Respuesta B", "is_correct": true },
        { "label": "C", "text": "Respuesta C", "is_correct": false },
        { "label": "D", "text": "Respuesta D", "is_correct": false }
      ],
      "correct_label": "B",
      "explanation": "Explicación didáctica de por qué la respuesta correcta lo es.",
      "difficulty": "${blueprint.difficulty || "medium"}",
      "evaluated_objective": "Objetivo o competencia evaluada"
    }
  ]
}

REGLAS DE OPCIONES:
- Cada pregunta debe tener exactamente ${blueprint.answer_count || 4} opciones.
- Usa etiquetas consecutivas desde A.
- Exactamente una opción debe tener "is_correct": true.
- "correct_label" debe coincidir con la opción correcta.
- Las opciones incorrectas deben ser plausibles, pero claramente incorrectas para quien domina el contenido.
- question_type solo puede ser: "test", "true_false" o "case_option".
- difficulty solo puede ser: "basic", "medium", "advanced" o "mixed".

CONTENIDO SELECCIONADO:
${content}`;
}

async function getModulesForCourse(courseId: string) {
  if (!supabase || !courseId) return [];
  const { data } = await supabase
    .from("modules")
    .select("id,course_id,title,description,sort_order,position")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });

  return Array.isArray(data) ? data : [];
}

async function getModulesByIds(ids: string[]) {
  if (!supabase) return [];
  const cleanIds = Array.from(new Set(ids.filter(Boolean)));
  if (!cleanIds.length) return [];

  const { data } = await supabase
    .from("modules")
    .select("id,course_id,title,description,sort_order,position")
    .in("id", cleanIds);

  return Array.isArray(data) ? data : [];
}

async function getLessonsForModules(moduleIds: string[]) {
  if (!supabase) return [];
  const cleanIds = Array.from(new Set(moduleIds.filter(Boolean)));
  if (!cleanIds.length) return [];

  const { data } = await supabase
    .from("lessons")
    .select("id,module_id,title,content,content_type,sort_order,duration_minutes")
    .in("module_id", cleanIds)
    .order("sort_order", { ascending: true });

  return Array.isArray(data) ? data : [];
}

async function getLessonsByIds(ids: string[]) {
  if (!supabase) return [];
  const cleanIds = Array.from(new Set(ids.filter(Boolean)));
  if (!cleanIds.length) return [];

  const { data } = await supabase
    .from("lessons")
    .select("id,module_id,title,content,content_type,sort_order,duration_minutes")
    .in("id", cleanIds)
    .order("sort_order", { ascending: true });

  return Array.isArray(data) ? data : [];
}

function appendPromptContent(parts: string[], modules: AnyRecord[], lessons: AnyRecord[]) {
  const modulesById = new Map(modules.map((module) => [String(module.id), module]));

  for (const module of modules) {
    parts.push(`MÓDULO: ${module.title || "Sin título"}`);
    if (module.description) parts.push(`DESCRIPCIÓN DEL MÓDULO:\n${module.description}`);
  }

  for (const lesson of lessons) {
    const module = modulesById.get(String(lesson.module_id));
    parts.push(
      [
        module?.title ? `MÓDULO ASOCIADO: ${module.title}` : "",
        `LECCIÓN: ${lesson.title || "Sin título"}`,
        lesson.content_type ? `TIPO: ${lesson.content_type}` : "",
        lesson.content
          ? `CONTENIDO:\n${lesson.content}`
          : "CONTENIDO: Esta lección no tiene texto base; usa solo el contexto disponible.",
      ]
        .filter(Boolean)
        .join("\n")
    );
  }
}

function buildReviewOptions(optionRows: AnyRecord[], answerCount: number): ReviewOptionForm[] {
  const expected = Math.max(2, Math.min(6, Number(answerCount || 4)));
  const rowsByLabel = new Map<string, AnyRecord>();

  for (const row of optionRows) {
    const label = String(row.label || "").toUpperCase();
    if (LABELS.includes(label as any)) rowsByLabel.set(label, row);
  }

  const labels = LABELS.slice(0, expected);
  const options = labels.map((label) => {
    const row = rowsByLabel.get(label);
    return {
      label,
      option_text: getOptionText(row || {}),
      is_correct: Boolean(row?.is_correct),
    };
  });

  if (!options.some((option) => option.is_correct) && options[0]) {
    options[0].is_correct = true;
  }

  return options;
}

function fallbackOptionsFromQuestion(question: AnyRecord): AnyRecord[] {
  return [
    { label: "A", option_text: question.option_a, is_correct: question.correct_option === "A", sort_order: 1 },
    { label: "B", option_text: question.option_b, is_correct: question.correct_option === "B", sort_order: 2 },
    { label: "C", option_text: question.option_c, is_correct: question.correct_option === "C", sort_order: 3 },
    { label: "D", option_text: question.option_d, is_correct: question.correct_option === "D", sort_order: 4 },
  ].filter((option) => Boolean(option.option_text));
}

function getOptionText(option: AnyRecord) {
  return String(option.option_text ?? option.text ?? "");
}

function normalizeQuestionType(value: unknown) {
  const clean = String(value || "test").toLowerCase();
  return VALID_QUESTION_TYPES.has(clean) ? clean : "test";
}

function normalizeDifficulty(value: unknown) {
  const clean = String(value || "mixed").toLowerCase();
  return VALID_DIFFICULTIES.has(clean) ? clean : "mixed";
}

function getBlueprintStatusLabel(status: string) {
  const map: Record<string, string> = {
    draft_ai: "Borrador IA",
    in_review: "En revisión",
    approved: "Aprobado",
    published: "Publicado",
    archived: "Archivado",
    rejected: "Rechazado",
  };
  return map[String(status || "")] || "Sin estado";
}

function getQuestionStatusLabel(status: string) {
  const map: Record<string, string> = {
    draft_ai: "Borrador",
    edited: "Editada",
    approved: "Aprobada",
    rejected: "Rechazada",
    needs_review: "Revisión",
  };
  return map[String(status || "")] || "Borrador";
}

function getScopeLabel(scope: string) {
  const map: Record<string, string> = {
    course: "Todo el curso",
    module: "Todo un módulo",
    lesson: "Una lección",
    multi_lesson: "Varias lecciones",
  };
  return map[String(scope || "")] || "Curso";
}

function getEvaluationLabel(type: string) {
  const map: Record<string, string> = {
    course: "Examen final",
    module: "Examen de módulo",
    lesson: "Evaluación de lección",
    multi_lesson: "Evaluación multi-lección",
  };
  return map[String(type || "")] || "Evaluación";
}

function getDifficultyLabel(difficulty: string) {
  const map: Record<string, string> = {
    basic: "Básica",
    medium: "Media",
    advanced: "Avanzada",
    mixed: "Mixta",
  };
  return map[String(difficulty || "")] || "Media";
}

function getAlertTitle(type: AlertState["type"]) {
  const map: Record<string, string> = {
    info: "Información",
    success: "Correcto",
    error: "Error",
    warning: "Atención",
    idle: "",
  };
  return map[type] || "";
}

function getErrorMessage(error: unknown) {
  if (!error) return "Error desconocido.";
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message || "Error desconocido.");
  }
  return "Error desconocido.";
}

const styles = `
  :root {
    color-scheme: dark;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    background:
      radial-gradient(circle at top left, rgba(34, 214, 91, 0.13), transparent 35rem),
      radial-gradient(circle at bottom right, rgba(148, 163, 184, 0.08), transparent 40rem),
      #060808;
    color: #f4f2ea;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  button,
  textarea,
  input {
    font: inherit;
  }

  .page-shell {
    min-height: 100vh;
    padding: 32px;
    background:
      linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0)),
      #060808;
  }

  .build-ribbon {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
    border: 1px solid rgba(34, 214, 91, 0.26);
    background: rgba(34, 214, 91, 0.08);
    color: #d8ffe2;
    padding: 12px 16px;
    border-radius: 18px;
    margin-bottom: 20px;
    font-size: 13px;
  }

  .hero {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    padding: 30px;
    border-radius: 28px;
    border: 1px solid rgba(255,255,255,0.1);
    background:
      linear-gradient(135deg, rgba(255,255,255,0.09), rgba(255,255,255,0.035)),
      rgba(13, 17, 17, 0.92);
    box-shadow: 0 22px 80px rgba(0,0,0,0.42);
  }

  .hero h1 {
    margin: 8px 0 10px;
    max-width: 860px;
    font-size: clamp(32px, 4vw, 56px);
    line-height: 0.96;
    letter-spacing: -0.05em;
  }

  .hero p {
    max-width: 760px;
    margin: 0;
    color: rgba(244,242,234,0.72);
    line-height: 1.65;
  }

  .eyebrow {
    margin: 0;
    color: #22d65b;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-size: 12px;
    font-weight: 800;
  }

  .hero-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 190px;
  }

  .hero-actions a,
  .action-stack button,
  .import-actions button,
  .panel-head button,
  .error-card a {
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.07);
    color: #f4f2ea;
    padding: 12px 14px;
    border-radius: 14px;
    cursor: pointer;
    text-align: center;
    font-weight: 800;
    transition: 160ms ease;
  }

  .hero-actions a:hover,
  .action-stack button:hover,
  .import-actions button:hover,
  .panel-head button:hover,
  .error-card a:hover {
    transform: translateY(-1px);
    border-color: rgba(34,214,91,0.48);
    background: rgba(34,214,91,0.12);
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }

  .alert {
    margin-top: 18px;
    padding: 16px 18px;
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.06);
  }

  .alert strong {
    display: block;
    margin-bottom: 4px;
  }

  .alert p {
    margin: 0;
    color: rgba(244,242,234,0.76);
  }

  .alert.success {
    border-color: rgba(34,214,91,0.42);
    background: rgba(34,214,91,0.08);
  }

  .alert.error {
    border-color: rgba(248,113,113,0.48);
    background: rgba(127,29,29,0.24);
  }

  .alert.warning {
    border-color: rgba(250,204,21,0.42);
    background: rgba(113,63,18,0.22);
  }

  .overview-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-top: 18px;
  }

  .metric-card,
  .panel,
  .importer,
  .questions-section,
  .loading-card,
  .error-card {
    border: 1px solid rgba(255,255,255,0.1);
    background:
      linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.026)),
      rgba(12, 15, 15, 0.92);
    box-shadow: 0 22px 60px rgba(0,0,0,0.28);
    border-radius: 24px;
  }

  .metric-card {
    padding: 18px;
  }

  .metric-card span,
  .config-list span {
    display: block;
    color: rgba(244,242,234,0.52);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: 8px;
  }

  .metric-card strong {
    display: block;
    font-size: 28px;
    letter-spacing: -0.04em;
  }

  .metric-card p {
    margin: 8px 0 0;
    color: rgba(244,242,234,0.62);
    font-size: 13px;
  }

  .content-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(360px, 0.85fr);
    gap: 18px;
    margin-top: 18px;
  }

  .panel,
  .importer,
  .questions-section {
    padding: 22px;
  }

  .panel-head {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
    margin-bottom: 18px;
  }

  .panel-head h2 {
    margin: 4px 0 0;
    font-size: 24px;
    letter-spacing: -0.04em;
  }

  .config-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0,1fr));
    gap: 12px;
  }

  .config-list div {
    padding: 14px;
    border-radius: 18px;
    background: rgba(0,0,0,0.22);
    border: 1px solid rgba(255,255,255,0.07);
  }

  .config-list strong {
    font-size: 15px;
  }

  .notes,
  .warning-box,
  .explanation {
    margin-top: 16px;
    padding: 16px;
    border-radius: 18px;
    border: 1px solid rgba(34,214,91,0.22);
    background: rgba(34,214,91,0.06);
  }

  .notes p,
  .warning-box p,
  .explanation p,
  .muted {
    color: rgba(244,242,234,0.68);
    line-height: 1.6;
  }

  .action-stack {
    display: grid;
    gap: 10px;
    margin-top: 18px;
  }

  .action-stack button:first-child,
  .import-actions button:last-child {
    color: #06100a;
    background: linear-gradient(135deg, #22d65b, #a7f3d0);
    border-color: rgba(34,214,91,0.7);
  }

  .importer {
    margin-top: 18px;
  }

  .importer textarea {
    width: 100%;
    min-height: 300px;
    resize: vertical;
    border-radius: 18px;
    padding: 16px;
    background: rgba(0,0,0,0.34);
    border: 1px solid rgba(255,255,255,0.12);
    color: #f4f2ea;
    outline: none;
    line-height: 1.5;
  }

  .importer textarea:focus {
    border-color: rgba(34,214,91,0.62);
    box-shadow: 0 0 0 4px rgba(34,214,91,0.09);
  }

  .confirm-line {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    margin: 14px 0 0;
    color: rgba(244,242,234,0.72);
    line-height: 1.5;
  }

  .import-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 14px;
  }

  .questions-section {
    margin-top: 18px;
  }

  .question-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .question-card {
    padding: 18px;
    border-radius: 20px;
    background: rgba(0,0,0,0.25);
    border: 1px solid rgba(255,255,255,0.09);
  }

  .question-top {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
    margin-bottom: 12px;
  }

  .question-top span {
    color: #22d65b;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .question-top em {
    font-style: normal;
    color: rgba(244,242,234,0.72);
    font-size: 12px;
    padding: 5px 9px;
    border-radius: 999px;
    background: rgba(255,255,255,0.07);
  }

  .question-card h3 {
    margin: 0 0 12px;
    line-height: 1.35;
    font-size: 18px;
  }

  .objective {
    color: rgba(244,242,234,0.58);
    font-size: 13px;
    line-height: 1.5;
    margin: 0 0 14px;
  }

  .option-list {
    display: grid;
    gap: 8px;
  }

  .option-row {
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    padding: 10px;
    border-radius: 14px;
    background: rgba(255,255,255,0.045);
    border: 1px solid rgba(255,255,255,0.07);
  }

  .option-row strong {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: 999px;
    background: rgba(255,255,255,0.08);
  }

  .option-row p {
    margin: 0;
    color: rgba(244,242,234,0.76);
    line-height: 1.45;
  }

  .option-row span {
    color: #22d65b;
    font-size: 12px;
    font-weight: 900;
  }

  .option-row.correct {
    border-color: rgba(34,214,91,0.35);
    background: rgba(34,214,91,0.08);
  }

  .empty-questions {
    display: grid;
    place-items: center;
    text-align: center;
    min-height: 240px;
    border-radius: 20px;
    border: 1px dashed rgba(255,255,255,0.18);
    background: rgba(0,0,0,0.18);
    padding: 28px;
  }

  .empty-questions span {
    color: #22d65b;
    font-size: 36px;
  }

  .empty-questions h3 {
    margin: 10px 0 0;
  }

  .empty-questions p {
    max-width: 560px;
    color: rgba(244,242,234,0.62);
    line-height: 1.6;
  }

  .loading-card,
  .error-card {
    max-width: 760px;
    margin: 10vh auto;
    padding: 34px;
    text-align: center;
  }

  .pulse {
    width: 46px;
    height: 46px;
    border-radius: 999px;
    margin: 0 auto 18px;
    background: #22d65b;
    box-shadow: 0 0 0 0 rgba(34,214,91,0.42);
    animation: pulse 1.3s infinite;
  }

  @keyframes pulse {
    70% {
      box-shadow: 0 0 0 22px rgba(34,214,91,0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(34,214,91,0);
    }
  }

  @media (max-width: 1050px) {
    .overview-grid,
    .content-grid,
    .question-grid {
      grid-template-columns: 1fr;
    }

    .hero {
      flex-direction: column;
    }
  }

  @media (max-width: 640px) {
    .page-shell {
      padding: 18px;
    }

    .hero,
    .panel,
    .importer,
    .questions-section {
      border-radius: 20px;
      padding: 18px;
    }

    .build-ribbon {
      flex-direction: column;
      align-items: flex-start;
    }

    .config-list {
      grid-template-columns: 1fr;
    }

    .option-row {
      grid-template-columns: 30px 1fr;
    }

    .option-row span {
      grid-column: 2;
    }
  }
  .review-head { align-items: flex-start; }
  .review-summary { margin: 8px 0 0; color: rgba(244,242,234,0.62); font-size: 13px; }
  .review-head-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
  .ready-pill { border: 1px solid rgba(255,255,255,0.12); border-radius: 999px; padding: 8px 12px; font-size: 12px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
  .ready-pill.ok { border-color: rgba(34,214,91,0.38); color: #22d65b; background: rgba(34,214,91,0.08); }
  .ready-pill.pending { border-color: rgba(245,158,11,0.35); color: #fbbf24; background: rgba(245,158,11,0.08); }
  .question-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 18px; }
  .question-actions button { border: 1px solid rgba(34,214,91,0.32); background: rgba(34,214,91,0.12); color: #f4f2ea; border-radius: 14px; padding: 10px 14px; font-weight: 800; cursor: pointer; }
  .question-actions button:disabled { opacity: 0.45; cursor: not-allowed; }
  .question-actions .secondary { border-color: rgba(148,163,184,0.3); background: rgba(148,163,184,0.1); }
  .question-actions .ghost { border-color: rgba(255,255,255,0.14); background: rgba(255,255,255,0.04); }
  .question-actions .danger { border-color: rgba(248,113,113,0.34); background: rgba(248,113,113,0.1); color: #fecaca; }
  .status-approved { border-color: rgba(34,214,91,0.34) !important; }
  .status-rejected { border-color: rgba(248,113,113,0.34) !important; opacity: 0.82; }
  .status-edited { border-color: rgba(56,189,248,0.30) !important; }
  .edit-box { display: grid; gap: 14px; }
  .edit-box label { display: grid; gap: 7px; color: rgba(244,242,234,0.78); font-size: 13px; font-weight: 700; }
  .edit-box textarea, .edit-box input, .edit-box select { width: 100%; border: 1px solid rgba(255,255,255,0.12); background: rgba(0,0,0,0.32); color: #f4f2ea; border-radius: 14px; padding: 12px 13px; outline: none; }
  .edit-box textarea { min-height: 92px; resize: vertical; }
  .edit-meta-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 12px; }
  .edit-options { display: grid; gap: 10px; }
  .edit-option-row { display: grid; grid-template-columns: 48px 1fr; gap: 10px; align-items: center; }
  .correct-selector { border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.04); color: #f4f2ea; border-radius: 12px; padding: 12px 0; font-weight: 900; cursor: pointer; }
  .correct-selector.active { border-color: rgba(34,214,91,0.5); background: rgba(34,214,91,0.18); color: #22d65b; }
  .edit-actions { border-top: 1px solid rgba(255,255,255,0.08); padding-top: 14px; }
  .rejected-note { margin-top: 14px; border: 1px solid rgba(248,113,113,0.25); background: rgba(248,113,113,0.08); border-radius: 16px; padding: 14px; }
  .rejected-note strong { color: #fecaca; }
  .rejected-note p { margin: 6px 0 0; color: rgba(244,242,234,0.72); }

  @media (max-width: 760px) {
    .edit-meta-grid { grid-template-columns: 1fr; }
    .review-head-actions { justify-content: flex-start; }
  }

`;
