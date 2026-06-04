"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type AnyRecord = Record<string, any>;
type GuardState = "checking" | "allowed" | "denied";

type PageProps = {
  params: { blueprintId: string };
};

type ImportedOption = {
  label?: string;
  text?: string;
  option_text?: string;
  is_correct?: boolean;
};

type ImportedQuestion = {
  question?: string;
  question_type?: string;
  type?: string;
  options?: ImportedOption[];
  correct_label?: string;
  correct_option?: string;
  explanation?: string;
  difficulty?: string;
  evaluated_objective?: string;
  objective?: string;
};

const BUILD_ID = "GHC-EXAM-MANUAL-BRIDGE-V1 · sin API de pago";
const GREEN = "#63E546";
const MAX_CONTEXT_CHARS = 52000;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export default function BlueprintDetailPage({ params }: PageProps) {
  const router = useRouter();
  const blueprintId = params.blueprintId;

  const [guardState, setGuardState] = useState<GuardState>("checking");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const [blueprint, setBlueprint] = useState<AnyRecord | null>(null);
  const [course, setCourse] = useState<AnyRecord | null>(null);
  const [modules, setModules] = useState<AnyRecord[]>([]);
  const [lessons, setLessons] = useState<AnyRecord[]>([]);
  const [questions, setQuestions] = useState<AnyRecord[]>([]);
  const [options, setOptions] = useState<AnyRecord[]>([]);
  const [generations, setGenerations] = useState<AnyRecord[]>([]);

  const [showPrompt, setShowPrompt] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [jsonInput, setJsonInput] = useState("");

  useEffect(() => {
    protectAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blueprintId]);

  async function protectAndLoad() {
    try {
      setGuardState("checking");
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        router.replace("/acceso");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id,role,email,full_name")
        .eq("id", userData.user.id)
        .maybeSingle();

      if (profileError) {
        console.error(profileError);
        setGuardState("denied");
        router.replace("/alumno");
        return;
      }

      const role = String(profile?.role || "").toLowerCase();
      if (!["admin", "superadmin", "owner"].includes(role)) {
        setGuardState("denied");
        router.replace("/alumno");
        return;
      }

      setGuardState("allowed");
      await loadBlueprint();
    } catch (error) {
      console.error(error);
      setGuardState("denied");
      router.replace("/alumno");
    }
  }

  async function loadBlueprint() {
    setMessage("Cargando borrador del Agente de Exámenes GHC...");

    const { data: blueprintData, error: blueprintError } = await supabase
      .from("exam_blueprints")
      .select("*")
      .eq("id", blueprintId)
      .maybeSingle();

    if (blueprintError || !blueprintData) {
      console.error(blueprintError);
      setBlueprint(null);
      setMessage("Borrador no encontrado. Revisa que el ID pertenezca a exam_blueprints.");
      return;
    }

    setBlueprint(blueprintData);

    const [courseData, moduleData, lessonData, questionData, generationData] = await Promise.all([
      fetchCourse(blueprintData.course_id),
      fetchRelatedModules(blueprintData),
      fetchRelatedLessons(blueprintData),
      fetchQuestions(blueprintData.id),
      fetchGenerations(blueprintData.id),
    ]);

    setCourse(courseData);
    setModules(moduleData);
    setLessons(lessonData);
    setQuestions(questionData);
    setGenerations(generationData);

    const questionIds = questionData.map((item) => String(item.id)).filter(Boolean);
    setOptions(questionIds.length ? await fetchOptions(questionIds) : []);

    setMessage("");
  }

  async function fetchCourse(courseId: string) {
    if (!courseId) return null;
    const { data } = await supabase.from("courses").select("*").eq("id", courseId).maybeSingle();
    return data || null;
  }

  async function fetchRelatedModules(currentBlueprint: AnyRecord) {
    if (!currentBlueprint?.course_id) return [];

    if (currentBlueprint.source_scope === "module" && currentBlueprint.module_id) {
      const { data } = await supabase.from("modules").select("*").eq("id", currentBlueprint.module_id);
      return Array.isArray(data) ? data as AnyRecord[] : [];
    }

    if (currentBlueprint.source_scope === "multi_lesson") {
      const { data: rows } = await supabase
        .from("exam_blueprint_lessons")
        .select("module_id")
        .eq("blueprint_id", currentBlueprint.id);

      const ids = Array.from(new Set((rows || []).map((row: AnyRecord) => row.module_id).filter(Boolean)));
      if (!ids.length) return [];

      const { data } = await supabase.from("modules").select("*").in("id", ids);
      return Array.isArray(data) ? data as AnyRecord[] : [];
    }

    const { data } = await supabase
      .from("modules")
      .select("*")
      .eq("course_id", currentBlueprint.course_id)
      .order("sort_order", { ascending: true });

    return Array.isArray(data) ? data as AnyRecord[] : [];
  }

  async function fetchRelatedLessons(currentBlueprint: AnyRecord) {
    if (!currentBlueprint) return [];

    if (currentBlueprint.source_scope === "lesson" && currentBlueprint.lesson_id) {
      const { data } = await supabase.from("lessons").select("*").eq("id", currentBlueprint.lesson_id);
      return Array.isArray(data) ? data as AnyRecord[] : [];
    }

    if (currentBlueprint.source_scope === "multi_lesson") {
      const { data: rows } = await supabase
        .from("exam_blueprint_lessons")
        .select("lesson_id,sort_order")
        .eq("blueprint_id", currentBlueprint.id)
        .order("sort_order", { ascending: true });

      const ids = Array.from(new Set((rows || []).map((row: AnyRecord) => row.lesson_id).filter(Boolean)));
      if (!ids.length) return [];

      const { data } = await supabase
        .from("lessons")
        .select("*")
        .in("id", ids)
        .order("sort_order", { ascending: true });

      return Array.isArray(data) ? data as AnyRecord[] : [];
    }

    if (currentBlueprint.source_scope === "module" && currentBlueprint.module_id) {
      const { data } = await supabase
        .from("lessons")
        .select("*")
        .eq("module_id", currentBlueprint.module_id)
        .order("sort_order", { ascending: true });

      return Array.isArray(data) ? data as AnyRecord[] : [];
    }

    const { data: moduleRows } = await supabase
      .from("modules")
      .select("id")
      .eq("course_id", currentBlueprint.course_id);

    const moduleIds = Array.isArray(moduleRows) ? moduleRows.map((item) => item.id).filter(Boolean) : [];
    if (!moduleIds.length) return [];

    const { data } = await supabase
      .from("lessons")
      .select("*")
      .in("module_id", moduleIds)
      .order("sort_order", { ascending: true });

    return Array.isArray(data) ? data as AnyRecord[] : [];
  }

  async function fetchQuestions(currentBlueprintId: string) {
    const { data } = await supabase
      .from("exam_questions")
      .select("*")
      .eq("blueprint_id", currentBlueprintId)
      .order("sort_order", { ascending: true });

    return Array.isArray(data) ? data as AnyRecord[] : [];
  }

  async function fetchOptions(questionIds: string[]) {
    const { data } = await supabase
      .from("exam_question_options")
      .select("*")
      .in("question_id", questionIds)
      .order("sort_order", { ascending: true });

    return Array.isArray(data) ? data as AnyRecord[] : [];
  }

  async function fetchGenerations(currentBlueprintId: string) {
    const { data } = await supabase
      .from("exam_ai_generations")
      .select("*")
      .eq("blueprint_id", currentBlueprintId)
      .order("created_at", { ascending: false });

    return Array.isArray(data) ? data as AnyRecord[] : [];
  }

  const promptText = useMemo(() => {
    if (!blueprint) return "";
    return buildManualPrompt({ blueprint, course, modules, lessons });
  }, [blueprint, course, modules, lessons]);

  const groupedOptions = useMemo(() => {
    const map = new Map<string, AnyRecord[]>();
    for (const option of options) {
      const key = String(option.question_id || "");
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(option);
    }
    return map;
  }, [options]);

  const stats = useMemo(() => {
    const approved = questions.filter((question) => question.question_status === "approved").length;
    const rejected = questions.filter((question) => question.question_status === "rejected").length;
    const needsReview = questions.filter((question) => ["draft_ai", "needs_review", "edited"].includes(String(question.question_status || ""))).length;

    return {
      requested: Number(blueprint?.requested_question_count || 0),
      imported: questions.length,
      needsReview,
      approved,
      rejected,
    };
  }, [questions, blueprint]);

  async function copyPrompt() {
    if (!promptText.trim()) {
      setMessage("No se pudo preparar el prompt. Revisa que el blueprint exista.");
      return;
    }

    try {
      await navigator.clipboard.writeText(promptText);
      setMessage("Prompt copiado. Pégalo en ChatGPT o Claude y pide que devuelva SOLO el JSON.");
      setShowPrompt(true);
    } catch {
      setShowPrompt(true);
      setMessage("No pude copiar automáticamente. Te dejo el prompt abierto para copiarlo manualmente.");
    }
  }

  async function importJson() {
    if (!blueprint) {
      setMessage("No hay blueprint cargado.");
      return;
    }

    setBusy(true);
    setMessage("Validando JSON de preguntas...");

    try {
      const parsed = parseQuestionJson(jsonInput);
      const normalizedQuestions = normalizeImportedQuestions(parsed, Number(blueprint.answer_count || 4));

      if (!normalizedQuestions.length) {
        throw new Error("El JSON no contiene preguntas válidas.");
      }

      setMessage("JSON válido. Creando examen borrador y guardando preguntas...");

      const { data: exam, error: examError } = await supabase.rpc("ghc_admin_create_exam_from_blueprint", {
        p_blueprint_id: blueprint.id,
      });

      if (examError || !exam?.id) {
        throw new Error(examError?.message || "No se pudo crear o recuperar el examen borrador desde el blueprint.");
      }

      const { data: generation, error: generationError } = await supabase.rpc("ghc_admin_start_ai_generation", {
        p_blueprint_id: blueprint.id,
        p_exam_id: exam.id,
        p_generation_type: "initial",
        p_model_provider: "manual",
        p_model_name: "ChatGPT/Claude manual import",
        p_prompt_hash: "manual-import",
        p_input_summary: `Importación manual desde JSON · ${normalizedQuestions.length} preguntas`,
        p_requested_question_count: Number(blueprint.requested_question_count || normalizedQuestions.length),
        p_regenerated_question_ids: [],
      });

      if (generationError || !generation?.id) {
        throw new Error(generationError?.message || "No se pudo registrar la importación manual.");
      }

      for (let index = 0; index < normalizedQuestions.length; index += 1) {
        const item = normalizedQuestions[index];

        const { error: questionError } = await supabase.rpc("ghc_admin_create_ai_question_with_options", {
          p_blueprint_id: blueprint.id,
          p_exam_id: exam.id,
          p_ai_generation_id: generation.id,
          p_question: item.question,
          p_question_type: item.question_type,
          p_options: item.options.map((option, optionIndex) => ({
            label: option.label,
            option_text: option.text,
            is_correct: option.is_correct,
            sort_order: optionIndex + 1,
          })),
          p_correct_label: item.correct_label,
          p_sort_order: index + 1,
          p_explanation: item.explanation,
          p_difficulty: item.difficulty,
          p_evaluated_objective: item.evaluated_objective,
          p_source_course_id: blueprint.course_id,
          p_source_module_id: blueprint.module_id,
          p_source_lesson_id: blueprint.lesson_id,
          p_regenerated_from_question_id: null,
        });

        if (questionError) {
          throw new Error(questionError.message || `No se pudo guardar la pregunta ${index + 1}.`);
        }
      }

      const { error: finishError } = await supabase.rpc("ghc_admin_finish_ai_generation", {
        p_generation_id: generation.id,
        p_status: "created",
        p_generated_question_count: normalizedQuestions.length,
        p_output_summary: `Importadas manualmente ${normalizedQuestions.length} preguntas desde ChatGPT/Claude.`,
        p_error_message: null,
      });

      if (finishError) {
        throw new Error(finishError.message || "Las preguntas se guardaron, pero no se pudo finalizar la importación.");
      }

      setJsonInput("");
      setShowImporter(false);
      await loadBlueprint();
      setMessage(`Importación completada: ${normalizedQuestions.length} preguntas guardadas como borrador para revisión humana.`);
    } catch (error) {
      console.error(error);
      setMessage(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function updateBlueprintStatus(nextStatus: string) {
    if (!blueprint) return;

    setBusy(true);
    setMessage(`Actualizando estado a ${getStatusLabel(nextStatus)}...`);

    try {
      const { error } = await supabase.rpc("ghc_admin_update_blueprint_status", {
        p_blueprint_id: blueprint.id,
        p_status: nextStatus,
        p_notes: null,
      });

      if (error) {
        throw new Error(error.message || "No se pudo actualizar el estado.");
      }

      await loadBlueprint();
      setMessage(`Estado actualizado: ${getStatusLabel(nextStatus)}.`);
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (guardState === "checking") {
    return (
      <main className="page">
        <Styles />
        <Background />
        <section className="loading-card">
          <span>GHC</span>
          <h1>Verificando acceso</h1>
          <p>Cargando Agente de Exámenes GHC...</p>
        </section>
      </main>
    );
  }

  if (guardState !== "allowed") return null;

  if (!blueprint) {
    return (
      <main className="page">
        <Styles />
        <Background />
        <section className="empty-state">
          <p className="kicker">GHC Academy</p>
          <h1>Borrador no encontrado</h1>
          <p>{message || "No hemos encontrado este blueprint en Supabase."}</p>
          <button type="button" onClick={() => router.push("/ghc-control-center/examenes")}>Volver al listado</button>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <Styles />
      <Background />

      <aside className="sidebar">
        <button type="button" className="back-button" onClick={() => router.push("/ghc-control-center/examenes")}>← Exámenes</button>
        <div className="brand-card"><span>GHC</span><div><strong>Agente de Exámenes</strong><p>Modo puente sin API de pago</p></div></div>
        <nav className="side-nav"><a href="#configuracion">Configuración</a><a href="#prompt">Prompt</a><a href="#importar">Importar JSON</a><a href="#preguntas">Preguntas</a></nav>
        <div className="side-status"><span>Estado</span><strong>{getStatusLabel(blueprint.status)}</strong><p>{BUILD_ID}</p></div>
      </aside>

      <section className="shell">
        <div className="build-strip"><strong>{BUILD_ID}</strong><span>Ahora no llama a OpenAI/Claude API. Prepara prompt e importa JSON.</span></div>
        {message ? <div className="notice">{message}</div> : null}

        <section className="hero">
          <div><p className="kicker">GHC Academy · Content Factory</p><h1>{blueprint.title || "Borrador de evaluación"}</h1><p>Configuración real del examen. El agente prepara el prompt, tú generas fuera con ChatGPT/Claude mientras no activamos API, e importas el JSON para revisión humana.</p></div>
          <div className="hero-actions"><button type="button" onClick={copyPrompt}>Copiar prompt para ChatGPT/Claude</button><button type="button" onClick={() => setShowImporter(true)}>Importar JSON de preguntas</button></div>
        </section>

        <section className="stats-grid">
          <StatCard label="Preguntas solicitadas" value={stats.requested} helper="Blueprint" />
          <StatCard label="Preguntas importadas" value={stats.imported} helper="Borradores reales" />
          <StatCard label="Por revisar" value={stats.needsReview} helper="draft_ai / edited" />
          <StatCard label="Aprobadas" value={stats.approved} helper="Revisión humana" />
        </section>

        <section className="main-grid">
          <div className="left-column">
            <article className="card" id="configuracion">
              <div className="card-head"><div><p className="kicker">Blueprint</p><h2>Configuración del borrador</h2></div><span className={`status-pill ${String(blueprint.status || "").replace("_", "-")}`}>{getStatusLabel(blueprint.status)}</span></div>
              <div className="config-grid"><InfoBox label="Curso" value={course?.title || blueprint.course_id || "Sin curso"} /><InfoBox label="Alcance" value={getScopeLabel(blueprint.source_scope)} /><InfoBox label="Tipo evaluación" value={getEvaluationTypeLabel(blueprint.evaluation_type)} /><InfoBox label="Dificultad" value={getDifficultyLabel(blueprint.difficulty)} /><InfoBox label="Nota mínima" value={`${blueprint.pass_percentage || 70}%`} /><InfoBox label="Intentos" value={blueprint.attempts_mode === "unlimited" ? "Ilimitados" : String(blueprint.max_attempts || 1)} /><InfoBox label="Respuestas" value={`${blueprint.answer_count || 4} por pregunta`} /><InfoBox label="Explicación" value={blueprint.show_explanation ? "Sí" : "No"} /><InfoBox label="Bloqueo avance" value={blueprint.block_advance ? "Sí" : "No"} /></div>
              {blueprint.ai_instructions ? <div className="instructions"><strong>Instrucciones internas</strong><p>{blueprint.ai_instructions}</p></div> : null}
              <div className="state-actions"><button type="button" disabled={busy} onClick={() => updateBlueprintStatus("in_review")}>Pasar a revisión</button><button type="button" disabled={busy || stats.imported === 0} onClick={() => updateBlueprintStatus("approved")}>Marcar blueprint aprobado</button><button type="button" disabled={busy} onClick={() => updateBlueprintStatus("archived")}>Archivar</button></div>
            </article>

            <article className="card" id="prompt"><div className="card-head"><div><p className="kicker">Agente sin API</p><h2>Prompt preparado</h2></div><button type="button" onClick={copyPrompt}>Copiar prompt</button></div><p className="muted">Este prompt contiene la configuración del blueprint y el contenido seleccionado. Pégalo en ChatGPT o Claude. La respuesta debe ser solo JSON válido.</p>{showPrompt ? <textarea className="prompt-box" readOnly value={promptText} /> : <button type="button" className="primary-wide" onClick={() => setShowPrompt(true)}>Ver prompt completo</button>}</article>

            <article className="card" id="importar"><div className="card-head"><div><p className="kicker">Importación</p><h2>Pegar JSON de preguntas</h2></div><button type="button" onClick={() => setShowImporter(!showImporter)}>{showImporter ? "Cerrar" : "Abrir importador"}</button></div><p className="muted">Pega aquí el JSON devuelto por ChatGPT/Claude. GHC Academy validará la estructura y guardará las preguntas como draft_ai, nunca publicadas.</p>{showImporter ? <div className="json-importer"><textarea value={jsonInput} onChange={(event) => setJsonInput(event.target.value)} placeholder='{"questions":[{"question":"...","question_type":"test","options":[{"label":"A","text":"...","is_correct":false}],"correct_label":"A","explanation":"...","difficulty":"medium","evaluated_objective":"..."}]}' /><div className="import-actions"><button type="button" disabled={busy || !jsonInput.trim()} onClick={importJson}>{busy ? "Importando..." : "Validar e importar JSON"}</button><button type="button" disabled={busy} onClick={() => setJsonInput(exampleJson(Number(blueprint.answer_count || 4)))}>Insertar ejemplo</button></div></div> : null}</article>
          </div>

          <aside className="right-column">
            <article className="card"><p className="kicker">Contenido fuente</p><h2>Contexto seleccionado</h2><div className="context-list"><ContextItem label="Curso" title={course?.title || "Sin curso"} text={course?.description || course?.subtitle || "Sin descripción"} />{modules.slice(0, 6).map((module) => <ContextItem key={String(module.id)} label="Módulo" title={module.title || "Módulo sin título"} text={module.description || "Sin descripción"} />)}{lessons.slice(0, 8).map((lesson) => <ContextItem key={String(lesson.id)} label="Lección" title={lesson.title || "Lección sin título"} text={lesson.content ? `${String(lesson.content).slice(0, 170)}...` : "Sin contenido textual"} />)}</div></article>
            <article className="card"><p className="kicker">Historial</p><h2>Generaciones / importaciones</h2><div className="generation-list">{generations.length ? generations.map((generation) => <div key={String(generation.id)} className="generation-item"><strong>{generation.model_provider || "manual"}</strong><p>{generation.output_summary || generation.input_summary || "Importación registrada"}</p><span>{formatShortDate(generation.created_at)}</span></div>) : <p className="muted">Todavía no hay importaciones registradas.</p>}</div></article>
          </aside>
        </section>

        <section className="questions-section" id="preguntas"><div className="card-head"><div><p className="kicker">Revisión humana</p><h2>Preguntas importadas</h2></div><button type="button" onClick={loadBlueprint}>Refrescar</button></div>{questions.length ? <div className="question-grid">{questions.map((question, index) => <article key={String(question.id || index)} className="question-card"><div className="question-top"><span>Pregunta {index + 1}</span><em>{getQuestionStatusLabel(question.question_status)}</em></div><h3>{question.question}</h3>{question.evaluated_objective ? <p className="objective">{question.evaluated_objective}</p> : null}<div className="option-list">{(groupedOptions.get(String(question.id)) || fallbackOptionsFromQuestion(question)).map((option, optionIndex) => <div key={`${question.id}-${option.label || optionIndex}`} className={option.is_correct ? "option-row correct" : "option-row"}><strong>{option.label}</strong><p>{getOptionText(option)}</p>{option.is_correct ? <span>Correcta</span> : null}</div>)}</div>{question.explanation ? <div className="explanation"><strong>Explicación</strong><p>{question.explanation}</p></div> : null}</article>)}</div> : <article className="empty-questions"><span>◈</span><h3>Sin preguntas todavía</h3><p>Copia el prompt, genera el JSON en ChatGPT/Claude e impórtalo aquí para crear preguntas en borrador.</p></article>}</section>
      </section>
    </main>
  );
}

function buildManualPrompt({ blueprint, course, modules, lessons }: { blueprint: AnyRecord; course: AnyRecord | null; modules: AnyRecord[]; lessons: AnyRecord[] }) {
  const requestedCount = Number(blueprint.requested_question_count || 3);
  const answerCount = Number(blueprint.answer_count || 4);
  const parts: string[] = [];

  if (course) {
    parts.push(`CURSO: ${course.title || "Sin título"}`);
    if (course.subtitle) parts.push(`SUBTÍTULO: ${course.subtitle}`);
    if (course.description) parts.push(`DESCRIPCIÓN DEL CURSO:\n${course.description}`);
    if (course.level) parts.push(`NIVEL DEL CURSO: ${course.level}`);
  }

  modules.forEach((module) => {
    parts.push(`MÓDULO: ${module.title || "Sin título"}`);
    if (module.description) parts.push(`DESCRIPCIÓN DEL MÓDULO:\n${module.description}`);
  });

  lessons.forEach((lesson) => {
    parts.push([`LECCIÓN: ${lesson.title || "Sin título"}`, lesson.content_type ? `TIPO: ${lesson.content_type}` : "", lesson.content ? `CONTENIDO:\n${lesson.content}` : "CONTENIDO: Esta lección no tiene texto base; usa solo el contexto disponible."].filter(Boolean).join("\n"));
  });

  const selectedContent = parts.join("\n\n").slice(0, MAX_CONTEXT_CHARS);

  return `
Eres el Agente de Exámenes GHC v1 para GHC Academy.

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
- Número exacto de preguntas: ${requestedCount}
- Dificultad: ${blueprint.difficulty || "mixed"}
- Tipo(s) de pregunta: ${Array.isArray(blueprint.question_kinds) ? blueprint.question_kinds.join(", ") : "test"}
- Número exacto de respuestas por pregunta: ${answerCount}
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
      "difficulty": "medium",
      "evaluated_objective": "Objetivo o competencia evaluada"
    }
  ]
}

REGLAS DE OPCIONES:
- Cada pregunta debe tener exactamente ${answerCount} opciones.
- Usa etiquetas consecutivas desde A.
- Exactamente una opción debe tener "is_correct": true.
- "correct_label" debe coincidir con la opción correcta.
- Las opciones incorrectas deben ser plausibles, pero claramente incorrectas para quien domina el contenido.
- question_type solo puede ser: "test", "true_false" o "case_option".
- difficulty solo puede ser: "basic", "medium", "advanced" o "mixed".

CONTENIDO SELECCIONADO:
${selectedContent}
`.trim();
}

function parseQuestionJson(value: string): ImportedQuestion[] {
  const parsed = JSON.parse(value);
  if (Array.isArray(parsed)) return parsed as ImportedQuestion[];
  if (Array.isArray(parsed?.questions)) return parsed.questions as ImportedQuestion[];
  throw new Error('El JSON debe ser un objeto con propiedad "questions" o un array de preguntas.');
}

function normalizeImportedQuestions(items: ImportedQuestion[], answerCount: number) {
  const labels = ["A", "B", "C", "D", "E", "F"].slice(0, Math.max(2, Math.min(6, answerCount)));

  return items.map((item, index) => {
    const rawOptions = Array.isArray(item.options) ? item.options : [];
    const options = rawOptions.map((option, optionIndex) => {
      const label = String(option.label || labels[optionIndex] || "").toUpperCase();
      const text = String(option.text || option.option_text || "").trim();
      return { label, text, is_correct: option.is_correct === true };
    }).filter((option) => labels.includes(option.label) && option.text).slice(0, labels.length);

    const correctFromOptions = options.find((option) => option.is_correct)?.label || "";
    const correctLabel = String(item.correct_label || item.correct_option || correctFromOptions || "A").toUpperCase();
    const normalized = options.map((option) => ({ ...option, is_correct: option.label === correctLabel }));
    const correctCount = normalized.filter((option) => option.is_correct).length;

    if (!String(item.question || "").trim()) throw new Error(`La pregunta ${index + 1} no tiene texto.`);
    if (normalized.length !== labels.length) throw new Error(`La pregunta ${index + 1} debe tener exactamente ${labels.length} opciones.`);
    if (correctCount !== 1) throw new Error(`La pregunta ${index + 1} debe tener exactamente una respuesta correcta.`);

    return {
      question: String(item.question || "").trim(),
      question_type: normalizeQuestionType(item.question_type || item.type),
      options: normalized,
      correct_label: correctLabel,
      explanation: String(item.explanation || "").trim(),
      difficulty: normalizeDifficulty(item.difficulty),
      evaluated_objective: String(item.evaluated_objective || item.objective || "Comprensión del contenido evaluado").trim(),
    };
  });
}

function normalizeQuestionType(value: unknown) {
  const clean = String(value || "test").toLowerCase();
  if (["true_false", "verdadero_falso", "verdadero/falso"].includes(clean)) return "true_false";
  if (["case_option", "caso_practico", "caso práctico"].includes(clean)) return "case_option";
  return "test";
}

function normalizeDifficulty(value: unknown) {
  const clean = String(value || "mixed").toLowerCase();
  if (["basic", "basica", "básica"].includes(clean)) return "basic";
  if (["medium", "media"].includes(clean)) return "medium";
  if (["advanced", "avanzada"].includes(clean)) return "advanced";
  return "mixed";
}

function fallbackOptionsFromQuestion(question: AnyRecord) {
  return [
    { label: "A", text: question.option_a, is_correct: question.correct_option === "A" },
    { label: "B", text: question.option_b, is_correct: question.correct_option === "B" },
    { label: "C", text: question.option_c, is_correct: question.correct_option === "C" },
    { label: "D", text: question.option_d, is_correct: question.correct_option === "D" },
  ].filter((item) => item.text);
}


function getOptionText(option: AnyRecord | { label: string; text?: unknown; option_text?: unknown; is_correct?: boolean }) {
  const record = option as AnyRecord;
  return String(record.option_text ?? record.text ?? "");
}

function exampleJson(answerCount: number) {
  const labels = ["A", "B", "C", "D", "E", "F"].slice(0, Math.max(2, Math.min(6, answerCount)));
  return JSON.stringify({
    questions: [
      {
        question: "¿Cuál es el objetivo principal evaluado en este bloque de contenido?",
        question_type: "test",
        options: labels.map((label, index) => ({
          label,
          text: index === 0 ? "Identificar el concepto central y su aplicación práctica." : `Distractor plausible ${label}.`,
          is_correct: index === 0,
        })),
        correct_label: "A",
        explanation: "La opción A es correcta porque recoge el objetivo central del contenido evaluado.",
        difficulty: "medium",
        evaluated_objective: "Comprensión y aplicación del contenido del curso.",
      },
    ],
  }, null, 2);
}

function StatCard({ label, value, helper }: { label: string; value: number; helper: string }) { return <article className="stat-card"><span>{label}</span><strong>{value}</strong><p>{helper}</p></article>; }
function InfoBox({ label, value }: { label: string; value: string }) { return <div className="info-box"><span>{label}</span><strong>{value}</strong></div>; }
function ContextItem({ label, title, text }: { label: string; title: string; text: string }) { return <div className="context-item"><span>{label}</span><strong>{title}</strong><p>{text}</p></div>; }
function getScopeLabel(value: unknown) { const scope = String(value || "course"); if (scope === "module") return "Todo un módulo"; if (scope === "lesson") return "Una lección"; if (scope === "multi_lesson") return "Varias lecciones"; return "Todo el curso"; }
function getEvaluationTypeLabel(value: unknown) { const type = String(value || "course"); if (type === "module") return "Examen de módulo"; if (type === "lesson") return "Evaluación de lección"; if (type === "multi_lesson") return "Evaluación multi-lección"; return "Examen final de curso"; }
function getDifficultyLabel(value: unknown) { const difficulty = String(value || "mixed"); if (difficulty === "basic") return "Básica"; if (difficulty === "medium") return "Media"; if (difficulty === "advanced") return "Avanzada"; return "Mixta"; }
function getStatusLabel(value: unknown) { const status = String(value || "draft_ai"); if (status === "draft_ai") return "Borrador IA"; if (status === "in_review") return "En revisión"; if (status === "approved") return "Aprobado"; if (status === "published") return "Publicado"; if (status === "archived") return "Archivado"; if (status === "rejected") return "Rechazado"; return status; }
function getQuestionStatusLabel(value: unknown) { const status = String(value || "draft_ai"); if (status === "draft_ai") return "Borrador IA"; if (status === "needs_review") return "Necesita revisión"; if (status === "edited") return "Editada"; if (status === "approved") return "Aprobada"; if (status === "rejected") return "Rechazada"; return status; }
function formatShortDate(value: unknown) { if (!value) return "Sin fecha"; try { return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(String(value))); } catch { return "Sin fecha"; } }
function getErrorMessage(error: unknown) { if (!error) return "Error desconocido."; if (typeof error === "string") return error; if (typeof error === "object" && error !== null && "message" in error) return String((error as { message?: unknown }).message || "Error desconocido."); return "Error desconocido."; }
function Background() { return <div className="background" aria-hidden="true"><div className="orb one" /><div className="orb two" /><div className="grid" /></div>; }

function Styles() {
  return <style>{`
    :root{--green:${GREEN};--bg:#050706;--panel:rgba(10,14,12,.88);--line:rgba(255,255,255,.09);--white:#f4f6f2;--muted:rgba(244,246,242,.68);--soft:rgba(244,246,242,.42);--warning:#f7c948;--danger:#ff5757}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--white);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}button,input,textarea,select{font:inherit}button{transition:.18s ease}button:not(:disabled):hover{transform:translateY(-1px)}button:disabled{opacity:.45;cursor:not-allowed}.page{min-height:100vh;background:var(--bg);color:var(--white);display:grid;grid-template-columns:292px minmax(0,1fr);position:relative}.background{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:0}.orb{position:absolute;width:520px;height:520px;border-radius:999px;filter:blur(110px)}.orb.one{left:-180px;top:-180px;background:rgba(99,229,70,.1)}.orb.two{right:-240px;top:110px;background:rgba(255,255,255,.05)}.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px);background-size:42px 42px;opacity:.55;mask-image:radial-gradient(circle at center,black 0%,transparent 84%)}.sidebar{position:sticky;top:0;height:100vh;z-index:2;border-right:1px solid var(--line);background:linear-gradient(180deg,rgba(5,8,7,.97),rgba(3,5,4,.94));padding:22px;display:flex;flex-direction:column;gap:18px}.back-button{height:42px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--white);font-weight:900;cursor:pointer}.brand-card,.side-status{border:1px solid var(--line);border-radius:20px;background:rgba(255,255,255,.035);padding:16px}.brand-card{display:grid;grid-template-columns:48px minmax(0,1fr);gap:12px;align-items:center}.brand-card>span{width:48px;height:48px;border-radius:16px;display:grid;place-items:center;background:rgba(99,229,70,.1);color:var(--green);border:1px solid rgba(99,229,70,.2);font-weight:950}.brand-card p,.side-status p{margin:4px 0 0;color:var(--muted);font-size:12px;line-height:1.45}.side-nav{display:grid;gap:8px}.side-nav a{text-decoration:none;color:var(--muted);border:1px solid rgba(255,255,255,.06);border-radius:14px;background:rgba(255,255,255,.025);padding:13px 14px;font-weight:850}.side-nav a:hover{color:var(--green);border-color:rgba(99,229,70,.22);background:rgba(99,229,70,.06)}.side-status span{color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.14em;font-weight:950}.side-status strong{display:block;margin-top:8px;font-size:22px;letter-spacing:-.04em;color:var(--green)}.shell{position:relative;z-index:1;padding:18px 20px 36px;display:grid;gap:16px;min-width:0}.build-strip,.notice{border-radius:14px;border:1px solid rgba(99,229,70,.2);background:rgba(99,229,70,.055);padding:12px 14px;color:var(--muted);display:flex;gap:12px;align-items:center;flex-wrap:wrap}.build-strip strong{color:var(--green)}.notice{display:block;color:var(--white)}.hero{min-height:190px;border:1px solid var(--line);border-radius:26px;background:radial-gradient(circle at 82% 18%,rgba(99,229,70,.17),transparent 31%),linear-gradient(135deg,rgba(14,19,16,.96),rgba(7,10,8,.94));display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:26px;align-items:center;padding:28px;box-shadow:0 28px 100px rgba(0,0,0,.28)}.kicker{margin:0 0 10px;color:var(--green);font-size:11px;text-transform:uppercase;letter-spacing:.18em;font-weight:950}.hero h1,.empty-state h1,.loading-card h1{margin:0;font-size:clamp(38px,4.6vw,64px);line-height:.92;letter-spacing:-.065em}.hero p:not(.kicker),.muted{color:var(--muted);line-height:1.62;margin:14px 0 0}.hero-actions{border:1px solid rgba(99,229,70,.22);background:rgba(99,229,70,.055);border-radius:22px;padding:18px;display:grid;gap:10px}.hero-actions button,.card-head button,.state-actions button,.import-actions button,.primary-wide,.empty-state button{min-height:44px;border-radius:999px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:var(--white);padding:0 16px;font-weight:950;cursor:pointer}.hero-actions button:first-child,.import-actions button:first-child,.primary-wide,.empty-state button{background:linear-gradient(135deg,#7cff55,var(--green));color:#061008;border-color:transparent;box-shadow:0 14px 34px rgba(99,229,70,.18)}.stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.stat-card,.card,.questions-section,.empty-state,.loading-card{border:1px solid var(--line);border-radius:20px;background:var(--panel);box-shadow:0 22px 80px rgba(0,0,0,.2)}.stat-card{padding:18px;min-height:122px}.stat-card span,.info-box span{display:block;color:var(--muted);font-size:12px;font-weight:850}.stat-card strong{display:block;margin-top:9px;font-size:34px;letter-spacing:-.055em}.stat-card p{margin:6px 0 0;color:var(--muted);font-size:12px}.main-grid{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:14px;align-items:start}.left-column,.right-column{display:grid;gap:14px}.right-column{position:sticky;top:18px}.card,.questions-section{padding:18px}.card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:14px}.card-head h2{margin:0;font-size:25px;line-height:1.02;letter-spacing:-.045em}.status-pill{display:inline-flex;min-height:32px;align-items:center;border-radius:999px;padding:7px 11px;border:1px solid rgba(99,229,70,.26);background:rgba(99,229,70,.1);color:var(--green);font-size:10px;text-transform:uppercase;letter-spacing:.12em;font-weight:950}.status-pill.draft-ai{border-color:rgba(247,201,72,.26);background:rgba(247,201,72,.1);color:var(--warning)}.config-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.info-box{border:1px solid rgba(255,255,255,.07);border-radius:14px;background:rgba(0,0,0,.18);padding:12px;min-width:0}.info-box strong{display:block;margin-top:6px;line-height:1.25}.instructions{margin-top:12px;border:1px solid rgba(99,229,70,.18);background:rgba(99,229,70,.055);border-radius:14px;padding:13px}.instructions p{margin:8px 0 0;color:var(--muted);line-height:1.55}.state-actions{margin-top:14px;display:flex;gap:10px;flex-wrap:wrap}.prompt-box,.json-importer textarea{width:100%;min-height:330px;border-radius:16px;border:1px solid rgba(255,255,255,.09);background:rgba(0,0,0,.28);color:var(--white);padding:15px;line-height:1.55;outline:none;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono",monospace;font-size:12px}.json-importer{display:grid;gap:12px}.import-actions{display:flex;gap:10px;flex-wrap:wrap}.context-list,.generation-list{display:grid;gap:10px}.context-item,.generation-item{border:1px solid rgba(255,255,255,.07);border-radius:14px;background:rgba(255,255,255,.025);padding:12px}.context-item span,.generation-item span{color:var(--green);font-size:10px;text-transform:uppercase;letter-spacing:.12em;font-weight:950}.context-item strong,.generation-item strong{display:block;margin-top:6px;line-height:1.25}.context-item p,.generation-item p{margin:7px 0 0;color:var(--muted);font-size:12px;line-height:1.5}.question-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px}.question-card{border:1px solid rgba(255,255,255,.08);border-radius:18px;background:linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.018));padding:16px}.question-top{display:flex;justify-content:space-between;gap:10px;color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.12em;font-weight:950}.question-top em{font-style:normal;color:var(--green)}.question-card h3{margin:12px 0 10px;font-size:19px;line-height:1.25;letter-spacing:-.025em}.objective{color:var(--muted);font-size:13px;line-height:1.5}.option-list{display:grid;gap:8px;margin-top:12px}.option-row{display:grid;grid-template-columns:32px minmax(0,1fr) auto;gap:10px;align-items:center;border:1px solid rgba(255,255,255,.07);border-radius:12px;background:rgba(0,0,0,.18);padding:9px}.option-row strong{width:30px;height:30px;border-radius:10px;display:grid;place-items:center;background:rgba(255,255,255,.06);color:var(--white)}.option-row p{margin:0;color:var(--muted);line-height:1.42}.option-row span{color:var(--green);font-size:11px;font-weight:950}.option-row.correct{border-color:rgba(99,229,70,.24);background:rgba(99,229,70,.055)}.option-row.correct strong{background:rgba(99,229,70,.12);color:var(--green)}.explanation{margin-top:12px;border-top:1px solid rgba(255,255,255,.07);padding-top:12px}.explanation p{margin:6px 0 0;color:var(--muted);line-height:1.55;font-size:13px}.empty-questions{text-align:center;padding:34px;border:1px dashed rgba(99,229,70,.24);border-radius:18px;background:rgba(99,229,70,.035)}.empty-questions span{width:58px;height:58px;border-radius:18px;display:grid;place-items:center;margin:0 auto 14px;background:rgba(99,229,70,.08);border:1px solid rgba(99,229,70,.2);color:var(--green);font-size:28px}.empty-questions h3{margin:0;font-size:25px}.empty-questions p{color:var(--muted);line-height:1.55}.empty-state,.loading-card{position:relative;z-index:2;width:min(720px,calc(100vw - 40px));place-self:center;padding:32px;text-align:left}.loading-card span{width:56px;height:56px;border-radius:18px;display:grid;place-items:center;background:rgba(99,229,70,.1);color:var(--green);border:1px solid rgba(99,229,70,.2);font-weight:950}.empty-state p,.loading-card p{color:var(--muted);line-height:1.55}@media(max-width:1200px){.page{grid-template-columns:1fr}.sidebar{position:relative;height:auto}.hero,.main-grid{grid-template-columns:1fr}.right-column{position:static}.stats-grid,.config-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.stats-grid,.config-grid,.question-grid{grid-template-columns:1fr}.shell{padding:14px}.hero{padding:20px}.hero h1{font-size:38px}}
  `}</style>;
}
