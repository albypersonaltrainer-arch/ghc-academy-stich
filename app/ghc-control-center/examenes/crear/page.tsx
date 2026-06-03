"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import GHCLogo from "../../../components/GHCLogo";

type AnyRecord = Record<string, any>;
type GuardState = "checking" | "allowed" | "denied";
type SourceScope = "course" | "module" | "lesson" | "multi_lesson";
type Difficulty = "basic" | "medium" | "advanced" | "mixed";
type AttemptsMode = "limited" | "unlimited";
type QuestionKind = "test" | "true_false" | "case_options";

type BlueprintForm = {
  title: string;
  description: string;
  courseId: string;
  moduleId: string;
  lessonId: string;
  selectedLessonIds: string[];
  sourceScope: SourceScope;
  requestedQuestionCount: string;
  difficulty: Difficulty;
  passPercentage: string;
  attemptsMode: AttemptsMode;
  maxAttempts: string;
  questionKinds: QuestionKind[];
  answerCount: string;
  showExplanation: boolean;
  blockAdvance: boolean;
  aiInstructions: string;
};

type DashboardData = {
  courses: AnyRecord[];
  modules: AnyRecord[];
  lessons: AnyRecord[];
  blueprints: AnyRecord[];
};

const GREEN = "#63E546";
const BUILD_ID = "GHC-EXAM-BLUEPRINT-V3 · CLICK-DIAG · 2026-06-03";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const emptyForm: BlueprintForm = {
  title: "",
  description: "",
  courseId: "",
  moduleId: "",
  lessonId: "",
  selectedLessonIds: [],
  sourceScope: "course",
  requestedQuestionCount: "10",
  difficulty: "mixed",
  passPercentage: "70",
  attemptsMode: "limited",
  maxAttempts: "3",
  questionKinds: ["test"],
  answerCount: "4",
  showExplanation: true,
  blockAdvance: true,
  aiInstructions: "",
};

export default function Page() {
  const router = useRouter();
  const [guardState, setGuardState] = useState<GuardState>("checking");
  const [profile, setProfile] = useState<AnyRecord | null>(null);
  const [data, setData] = useState<DashboardData>({ courses: [], modules: [], lessons: [], blueprints: [] });
  const [form, setForm] = useState<BlueprintForm>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [systemMessage, setSystemMessage] = useState("");
  const [createdBlueprint, setCreatedBlueprint] = useState<AnyRecord | null>(null);

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
        const nextData = await loadBlueprintData();
        setData(nextData);

        const firstCourseId = String(nextData.courses[0]?.id || "");
        const firstModuleId = String(nextData.modules.find((module) => String(module.course_id) === firstCourseId)?.id || "");
        const firstLessonId = String(nextData.lessons.find((lesson) => String(lesson.module_id) === firstModuleId)?.id || "");

        setForm((current) => ({
          ...current,
          courseId: current.courseId || firstCourseId,
          moduleId: current.moduleId || firstModuleId,
          lessonId: current.lessonId || firstLessonId,
          selectedLessonIds: current.selectedLessonIds.length ? current.selectedLessonIds : firstLessonId ? [firstLessonId] : [],
        }));
      } catch (error) {
        console.error(error);
        setGuardState("denied");
        router.replace("/alumno");
      }
    }

    protectAndLoad();
  }, [router]);

  const selectedCourse = useMemo(
    () => data.courses.find((course) => String(course.id) === form.courseId) || null,
    [data.courses, form.courseId]
  );

  const modulesForCourse = useMemo(
    () => data.modules.filter((module) => String(module.course_id) === form.courseId),
    [data.modules, form.courseId]
  );

  const lessonsForModule = useMemo(
    () => data.lessons.filter((lesson) => String(lesson.module_id) === form.moduleId),
    [data.lessons, form.moduleId]
  );

  const lessonsForCourse = useMemo(() => {
    const moduleIds = new Set(modulesForCourse.map((module) => String(module.id)));
    return data.lessons.filter((lesson) => moduleIds.has(String(lesson.module_id)));
  }, [data.lessons, modulesForCourse]);

  const selectedLessons = useMemo(() => {
    const ids = new Set(form.selectedLessonIds);
    return data.lessons.filter((lesson) => ids.has(String(lesson.id)));
  }, [data.lessons, form.selectedLessonIds]);

  const recentBlueprints = useMemo(() => {
    return data.blueprints
      .slice()
      .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
      .slice(0, 6);
  }, [data.blueprints]);

  function updateCourseSelection(courseId: string) {
    const nextModuleId = String(data.modules.find((module) => String(module.course_id) === courseId)?.id || "");
    const nextLessonId = String(data.lessons.find((lesson) => String(lesson.module_id) === nextModuleId)?.id || "");

    setForm((current) => ({
      ...current,
      courseId,
      moduleId: nextModuleId,
      lessonId: nextLessonId,
      selectedLessonIds: nextLessonId ? [nextLessonId] : [],
    }));
    setCreatedBlueprint(null);
  }

  function updateModuleSelection(moduleId: string) {
    const nextLessonId = String(data.lessons.find((lesson) => String(lesson.module_id) === moduleId)?.id || "");
    setForm((current) => ({
      ...current,
      moduleId,
      lessonId: nextLessonId,
      selectedLessonIds: nextLessonId ? [nextLessonId] : [],
    }));
    setCreatedBlueprint(null);
  }

  function updateScope(scope: SourceScope) {
    setForm((current) => ({
      ...current,
      sourceScope: scope,
      blockAdvance: scope === "course" || scope === "module" || scope === "multi_lesson" ? true : current.blockAdvance,
    }));
    setCreatedBlueprint(null);
  }

  function toggleQuestionKind(kind: QuestionKind) {
    setForm((current) => {
      const exists = current.questionKinds.includes(kind);
      const nextKinds = exists ? current.questionKinds.filter((item) => item !== kind) : [...current.questionKinds, kind];
      return { ...current, questionKinds: nextKinds.length ? nextKinds : ["test"] };
    });
  }

  function toggleSelectedLesson(lessonId: string) {
    setForm((current) => {
      const exists = current.selectedLessonIds.includes(lessonId);
      const selectedLessonIds = exists
        ? current.selectedLessonIds.filter((id) => id !== lessonId)
        : [...current.selectedLessonIds, lessonId];
      return { ...current, selectedLessonIds };
    });
    setCreatedBlueprint(null);
  }

  async function refreshData(message?: string) {
    const nextData = await loadBlueprintData();
    setData(nextData);
    if (message) setSystemMessage(message);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createBlueprintFromForm();
  }

  async function createBlueprintFromForm() {
    setSystemMessage("Botón recibido. Validando configuración del borrador IA...");
    setCreatedBlueprint(null);

    const validation = validateBlueprintForm(form);
    if (validation) {
      setSystemMessage(validation);
      return;
    }

    setBusy(true);
    setSystemMessage("Validación correcta. Creando blueprint en Supabase...");

    try {
      const evaluationType = getEvaluationType(form.sourceScope);
      const payload = {
        p_course_id: form.courseId,
        p_module_id: form.sourceScope === "module" || form.sourceScope === "lesson" || form.sourceScope === "multi_lesson" ? form.moduleId || null : null,
        p_lesson_id: form.sourceScope === "lesson" ? form.lessonId || null : null,
        p_title: form.title.trim() || buildDefaultTitle(form.sourceScope),
        p_description: form.description.trim() || null,
        p_source_scope: form.sourceScope,
        p_evaluation_type: evaluationType,
        p_requested_question_count: clampNumber(form.requestedQuestionCount, 1, 100, 10),
        p_difficulty: form.difficulty,
        p_pass_percentage: clampNumber(form.passPercentage, 0, 100, 70),
        p_max_attempts: form.attemptsMode === "unlimited" ? null : clampNumber(form.maxAttempts, 1, 20, 3),
        p_attempts_mode: form.attemptsMode,
        p_question_kinds: form.questionKinds,
        p_answer_count: clampNumber(form.answerCount, 2, 6, 4),
        p_show_explanation: form.showExplanation,
        p_block_advance: form.blockAdvance,
        p_ai_instructions: form.aiInstructions.trim() || null,
      };

      const { data: blueprint, error } = await withTimeout(
        supabase.rpc("ghc_admin_create_exam_blueprint", payload),
        14000,
        "Supabase no respondió al crear la configuración del examen."
      );

      if (error) throw normalizeError(error);

      if (form.sourceScope === "multi_lesson") {
        for (let index = 0; index < form.selectedLessonIds.length; index += 1) {
          const lessonId = form.selectedLessonIds[index];
          const lesson = data.lessons.find((item) => String(item.id) === lessonId);
          const moduleId = String(lesson?.module_id || form.moduleId || "");

          const { error: lessonError } = await withTimeout(
            supabase.rpc("ghc_admin_add_blueprint_lesson", {
              p_blueprint_id: blueprint.id,
              p_course_id: form.courseId,
              p_module_id: moduleId || null,
              p_lesson_id: lessonId,
              p_sort_order: index + 1,
            }),
            14000,
            "Supabase no respondió al asociar una lección al blueprint."
          );

          if (lessonError) throw normalizeError(lessonError);
        }
      }

      setCreatedBlueprint(blueprint);
      await refreshData("Blueprint creado como borrador IA. Todavía no se ha llamado a la IA ni se ha publicado nada.");
    } catch (error) {
      console.error(error);
      setSystemMessage(getErrorMessage(error, "No se pudo crear el blueprint del examen."));
    } finally {
      setBusy(false);
    }
  }

  if (guardState === "checking") {
    return (
      <main className="blueprint-page">
        <GlobalStyles />
        <Background />
        <section className="loading-card">
          <GHCLogo size="md" showText tagline={false} />
          <h1>Agente de Exámenes GHC</h1>
          <p>Verificando acceso administrativo...</p>
        </section>
      </main>
    );
  }

  if (guardState !== "allowed") return null;

  return (
    <main className="blueprint-page">
      <GlobalStyles />
      <Background />

      <aside className="blueprint-sidebar">
        <div>
          <button type="button" className="back-link" onClick={() => router.push("/ghc-control-center/examenes")}>
            ← Centro de evaluación
          </button>
          <div className="brand-card">
            <GHCLogo size="md" showText tagline={false} />
            <p>Agente de Exámenes GHC v1</p>
          </div>

          <nav className="step-list" aria-label="Flujo de creación de blueprint">
            <Step active label="01" title="Configurar" text="Curso, módulo, lecciones y reglas." />
            <Step label="02" title="Borrador IA" text="La IA generará más adelante; no ahora." />
            <Step label="03" title="Revisión" text="Admin aprueba, rechaza o regenera." />
            <Step label="04" title="Publicación" text="Solo examen aprobado y validado." />
          </nav>
        </div>

        <div className="admin-mini-card">
          <span>{getInitials(profile?.full_name || profile?.email || "Admin")}</span>
          <div>
            <strong>{profile?.full_name || profile?.email || "Admin GHC"}</strong>
            <p>Administrador verificado</p>
          </div>
        </div>
      </aside>

      <section className="blueprint-shell">
        <header className="blueprint-hero">
          <div>
            <p className="kicker">Bloque 2 · Configuración base</p>
            <h1>Crear evaluación con IA</h1>
            <p>
              Define exactamente qué debe evaluar el Agente de Exámenes GHC. Esta pantalla solo crea la configuración en borrador; todavía no genera preguntas ni publica nada.
            </p>
          </div>
          <div className="hero-panel">
            <span>Regla fija</span>
            <strong>IA genera borrador. Admin decide.</strong>
            <p>Cero rastro de IA para el alumno. Nada pasa a publicado sin revisión humana.</p>
            <code>{BUILD_ID}</code>
          </div>
        </header>

        {systemMessage ? <div className="system-message">{systemMessage}</div> : null}

        <form className="blueprint-layout" onSubmit={handleSubmit} noValidate>
          <section className="builder-card source-card">
            <CardHead eyebrow="01" title="Fuente del examen" text="Elige de dónde leerá contenido el agente cuando activemos la generación IA." />

            <div className="scope-grid">
              <ScopeButton active={form.sourceScope === "course"} title="Todo el curso" text="Examen final o global" onClick={() => updateScope("course")} />
              <ScopeButton active={form.sourceScope === "module"} title="Todo un módulo" text="Bloquea avance por defecto" onClick={() => updateScope("module")} />
              <ScopeButton active={form.sourceScope === "lesson"} title="Una lección" text="Evaluación puntual" onClick={() => updateScope("lesson")} />
              <ScopeButton active={form.sourceScope === "multi_lesson"} title="Varias lecciones" text="Selección concreta" onClick={() => updateScope("multi_lesson")} />
            </div>

            <div className="field-grid two">
              <label>
                <span>Curso *</span>
                <select value={form.courseId} onChange={(event) => updateCourseSelection(event.target.value)}>
                  {data.courses.length ? data.courses.map((course) => (
                    <option key={String(course.id)} value={String(course.id)}>{course.title || course.name || "Curso GHC"}</option>
                  )) : <option value="">Sin cursos disponibles</option>}
                </select>
              </label>

              <label>
                <span>Módulo</span>
                <select
                  value={form.moduleId}
                  onChange={(event) => updateModuleSelection(event.target.value)}
                  disabled={form.sourceScope === "course" || !modulesForCourse.length}
                >
                  {modulesForCourse.length ? modulesForCourse.map((module, index) => (
                    <option key={String(module.id || index)} value={String(module.id || "")}>{module.title || module.name || `Módulo ${index + 1}`}</option>
                  )) : <option value="">Sin módulos</option>}
                </select>
              </label>
            </div>

            {form.sourceScope === "lesson" ? (
              <label>
                <span>Lección concreta *</span>
                <select value={form.lessonId} onChange={(event) => setForm({ ...form, lessonId: event.target.value, selectedLessonIds: event.target.value ? [event.target.value] : [] })}>
                  {lessonsForModule.length ? lessonsForModule.map((lesson, index) => (
                    <option key={String(lesson.id || index)} value={String(lesson.id || "")}>{lesson.title || `Lección ${index + 1}`}</option>
                  )) : <option value="">Sin lecciones en este módulo</option>}
                </select>
              </label>
            ) : null}

            {form.sourceScope === "multi_lesson" ? (
              <div className="lesson-picker">
                <div className="lesson-picker-head">
                  <strong>Lecciones seleccionadas</strong>
                  <span>{form.selectedLessonIds.length} elegidas</span>
                </div>

                {lessonsForCourse.length ? lessonsForCourse.map((lesson, index) => (
                  <button
                    key={String(lesson.id || index)}
                    type="button"
                    className={form.selectedLessonIds.includes(String(lesson.id)) ? "lesson-chip active" : "lesson-chip"}
                    onClick={() => toggleSelectedLesson(String(lesson.id))}
                  >
                    <span>{form.selectedLessonIds.includes(String(lesson.id)) ? "✓" : "○"}</span>
                    <div>
                      <strong>{lesson.title || `Lección ${index + 1}`}</strong>
                      <small>{getModuleTitle(data.modules, lesson.module_id)}</small>
                    </div>
                  </button>
                )) : <div className="empty-state">Este curso todavía no tiene lecciones seleccionables.</div>}
              </div>
            ) : null}
          </section>

          <section className="builder-card config-card">
            <CardHead eyebrow="02" title="Reglas de evaluación" text="Define la dificultad, intentos, nota mínima y tipo de preguntas." />

            <div className="field-grid two">
              <label>
                <span>Título del borrador *</span>
                <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder={buildDefaultTitle(form.sourceScope)} />
              </label>

              <label>
                <span>Dificultad</span>
                <select value={form.difficulty} onChange={(event) => setForm({ ...form, difficulty: event.target.value as Difficulty })}>
                  <option value="basic">Básica</option>
                  <option value="medium">Media</option>
                  <option value="advanced">Avanzada</option>
                  <option value="mixed">Mixta</option>
                </select>
              </label>
            </div>

            <label>
              <span>Descripción interna</span>
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Ejemplo: evaluación de comprensión para cerrar el módulo de fundamentos." />
            </label>

            <div className="field-grid four">
              <label>
                <span>Nº preguntas</span>
                <input inputMode="numeric" value={form.requestedQuestionCount} onChange={(event) => setForm({ ...form, requestedQuestionCount: event.target.value })} />
              </label>

              <label>
                <span>Nota mínima %</span>
                <input inputMode="numeric" value={form.passPercentage} onChange={(event) => setForm({ ...form, passPercentage: event.target.value })} />
              </label>

              <label>
                <span>Respuestas/pregunta</span>
                <select value={form.answerCount} onChange={(event) => setForm({ ...form, answerCount: event.target.value })}>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                </select>
              </label>

              <label>
                <span>Intentos</span>
                <select value={form.attemptsMode === "unlimited" ? "unlimited" : form.maxAttempts} onChange={(event) => {
                  const value = event.target.value;
                  if (value === "unlimited") setForm({ ...form, attemptsMode: "unlimited", maxAttempts: "" });
                  else setForm({ ...form, attemptsMode: "limited", maxAttempts: value });
                }}>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="unlimited">Ilimitados</option>
                </select>
              </label>
            </div>

            <div className="question-kind-grid">
              <ToggleChip active={form.questionKinds.includes("test")} title="Test" text="Opciones A/B/C/D" onClick={() => toggleQuestionKind("test")} />
              <ToggleChip active={form.questionKinds.includes("true_false")} title="Verdadero/Falso" text="Corrección automática" onClick={() => toggleQuestionKind("true_false")} />
              <ToggleChip active={form.questionKinds.includes("case_options")} title="Caso práctico" text="Situación + opciones" onClick={() => toggleQuestionKind("case_options")} />
            </div>

            <div className="switch-grid">
              <SwitchField label="Mostrar explicación al alumno" text="Después de entregar o según regla futura" checked={form.showExplanation} onChange={(value) => setForm({ ...form, showExplanation: value })} />
              <SwitchField label="Bloquear avance hasta aprobar" text="Módulo y final bloquean por defecto" checked={form.blockAdvance} onChange={(value) => setForm({ ...form, blockAdvance: value })} />
            </div>
          </section>

          <section className="builder-card instructions-card">
            <CardHead eyebrow="03" title="Instrucciones para la IA" text="Estas instrucciones serán internas. El alumno nunca las verá." />
            <label>
              <span>Instrucciones específicas</span>
              <textarea
                className="instructions-textarea"
                value={form.aiInstructions}
                onChange={(event) => setForm({ ...form, aiInstructions: event.target.value })}
                placeholder="Ejemplo: priorizar comprensión aplicada, evitar preguntas memorísticas, usar lenguaje claro y casos relacionados con entrenamiento/nutrición deportiva."
              />
            </label>
            <div className="notice-box">
              <strong>Importante:</strong> este paso crea el blueprint en estado <code>draft_ai</code>. La IA todavía no genera preguntas. El siguiente bloque será la ruta segura de generación.
            </div>
          </section>

          <aside className="summary-column">
            <article className="summary-card">
              <p className="kicker">Resumen del borrador</p>
              <h2>{form.title.trim() || buildDefaultTitle(form.sourceScope)}</h2>
              <div className="summary-list">
                <SummaryRow label="Curso" value={selectedCourse?.title || "Sin curso"} />
                <SummaryRow label="Alcance" value={getSourceScopeLabel(form.sourceScope)} />
                <SummaryRow label="Preguntas" value={form.requestedQuestionCount || "10"} />
                <SummaryRow label="Dificultad" value={getDifficultyLabel(form.difficulty)} />
                <SummaryRow label="Aprobado" value={`${form.passPercentage || "70"}%`} />
                <SummaryRow label="Intentos" value={form.attemptsMode === "unlimited" ? "Ilimitados" : form.maxAttempts || "3"} />
                <SummaryRow label="Respuestas" value={`${form.answerCount || "4"} por pregunta`} />
                <SummaryRow label="Lecciones" value={form.sourceScope === "multi_lesson" ? String(selectedLessons.length) : form.sourceScope === "lesson" ? "1" : "Según alcance"} />
              </div>
              <button
                type="button"
                disabled={busy}
                className="primary-action"
                onClick={() => void createBlueprintFromForm()}
              >
                {busy ? "Creando blueprint..." : "Crear borrador IA"}
              </button>
              <button type="button" className="secondary-action" onClick={() => router.push("/ghc-control-center/examenes")}>
                Volver al listado
              </button>
            </article>

            {createdBlueprint ? (
              <article className="created-card">
                <span>✓</span>
                <div>
                  <strong>Blueprint creado</strong>
                  <p>Estado: {createdBlueprint.status || "draft_ai"}</p>
                  <code>{String(createdBlueprint.id || "")}</code>
                </div>
              </article>
            ) : null}

            <article className="recent-card">
              <h3>Borradores recientes</h3>
              {recentBlueprints.length ? recentBlueprints.map((blueprint) => (
                <div key={String(blueprint.id)} className="recent-row">
                  <strong>{blueprint.title || "Blueprint GHC"}</strong>
                  <span>{getBlueprintStatusLabel(blueprint.status)} · {formatShortDate(blueprint.created_at)}</span>
                </div>
              )) : <p>No hay blueprints todavía.</p>}
            </article>
          </aside>
        </form>
      </section>
    </main>
  );
}

async function loadBlueprintData(): Promise<DashboardData> {
  const [courses, modules, lessons, blueprints] = await Promise.all([
    safeSelect("courses", "*"),
    safeSelect("modules", "*"),
    safeSelect("lessons", "*"),
    safeSelect("exam_blueprints", "*"),
  ]);

  return { courses, modules, lessons, blueprints };
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

async function withTimeout<T>(promiseLike: PromiseLike<T>, milliseconds: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), milliseconds);
  });

  try {
    return await Promise.race([Promise.resolve(promiseLike), timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function validateBlueprintForm(form: BlueprintForm) {
  if (!form.courseId) return "Selecciona un curso antes de crear el blueprint.";
  // El título no es obligatorio: si el admin lo deja vacío, el sistema usa un título GHC por defecto.

  if (form.sourceScope === "module" && !form.moduleId) return "Selecciona un módulo para crear un examen de módulo.";
  if (form.sourceScope === "lesson" && !form.lessonId) return "Selecciona una lección para crear una evaluación de lección.";
  if (form.sourceScope === "multi_lesson" && form.selectedLessonIds.length < 2) return "Selecciona al menos dos lecciones para una evaluación multi-lección.";

  const questionCount = Number(form.requestedQuestionCount);
  if (!Number.isFinite(questionCount) || questionCount < 1) return "El número de preguntas debe ser mayor que cero.";

  const pass = Number(form.passPercentage);
  if (!Number.isFinite(pass) || pass < 0 || pass > 100) return "El porcentaje mínimo debe estar entre 0 y 100.";

  if (form.attemptsMode === "limited") {
    const attempts = Number(form.maxAttempts);
    if (!Number.isFinite(attempts) || attempts < 1) return "El número de intentos debe ser 1, 2, 3 o ilimitado.";
  }

  return "";
}

function normalizeError(error: any) {
  const message = [error?.message, error?.details, error?.hint].filter(Boolean).join(" · ");
  return new Error(message || "Error de Supabase sin detalle.");
}

function getErrorMessage(error: unknown, fallback: string) {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null && "message" in error) return String((error as AnyRecord).message || fallback);
  return fallback;
}

function getEvaluationType(scope: SourceScope) {
  if (scope === "lesson") return "lesson";
  if (scope === "module") return "module";
  if (scope === "multi_lesson") return "multi_lesson";
  return "course";
}

function buildDefaultTitle(scope: SourceScope) {
  if (scope === "lesson") return "Evaluación de lección";
  if (scope === "module") return "Examen de módulo";
  if (scope === "multi_lesson") return "Evaluación de varias lecciones";
  return "Examen final de curso";
}

function clampNumber(value: string, min: number, max: number, fallback: number) {
  const numeric = Number(String(value || "").replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numeric)));
}

function getSourceScopeLabel(scope: SourceScope) {
  if (scope === "lesson") return "Una lección";
  if (scope === "module") return "Todo un módulo";
  if (scope === "multi_lesson") return "Varias lecciones";
  return "Todo el curso";
}

function getDifficultyLabel(value: Difficulty) {
  if (value === "basic") return "Básica";
  if (value === "medium") return "Media";
  if (value === "advanced") return "Avanzada";
  return "Mixta";
}

function getBlueprintStatusLabel(value: unknown) {
  const status = String(value || "draft_ai");
  if (status === "in_review") return "En revisión";
  if (status === "approved") return "Aprobado";
  if (status === "published") return "Publicado";
  if (status === "archived") return "Archivado";
  if (status === "rejected") return "Rechazado";
  return "Borrador IA";
}

function getModuleTitle(modules: AnyRecord[], moduleId: unknown) {
  const module = modules.find((item) => String(item.id) === String(moduleId));
  return String(module?.title || module?.name || "Módulo sin título");
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

function formatShortDate(value?: string | null) {
  if (!value) return "Sin fecha";
  try {
    return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
  } catch {
    return "Sin fecha";
  }
}

function Step({ active = false, label, title, text }: { active?: boolean; label: string; title: string; text: string }) {
  return (
    <div className={active ? "step active" : "step"}>
      <span>{label}</span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}

function CardHead({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="card-head">
      <span>{eyebrow}</span>
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </div>
  );
}

function ScopeButton({ active, title, text, onClick }: { active: boolean; title: string; text: string; onClick: () => void }) {
  return (
    <button type="button" className={active ? "scope-button active" : "scope-button"} onClick={onClick}>
      <strong>{title}</strong>
      <span>{text}</span>
    </button>
  );
}

function ToggleChip({ active, title, text, onClick }: { active: boolean; title: string; text: string; onClick: () => void }) {
  return (
    <button type="button" className={active ? "toggle-chip active" : "toggle-chip"} onClick={onClick}>
      <strong>{title}</strong>
      <span>{text}</span>
    </button>
  );
}

function SwitchField({ label, text, checked, onChange }: { label: string; text: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button type="button" className={checked ? "switch-field active" : "switch-field"} onClick={() => onChange(!checked)}>
      <span>{checked ? "✓" : "○"}</span>
      <div>
        <strong>{label}</strong>
        <small>{text}</small>
      </div>
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="summary-row">
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
      <div className="grid" />
    </div>
  );
}

function GlobalStyles() {
  return <style>{`
    :root{--green:${GREEN};--bg:#050706;--panel:rgba(10,14,12,.88);--panel2:rgba(14,18,16,.92);--line:rgba(255,255,255,.085);--white:#f4f6f2;--muted:rgba(244,246,242,.66);--soft:rgba(244,246,242,.45);--warning:#f7c948;--danger:#ff5757}*{box-sizing:border-box}html,body{margin:0;background:var(--bg)}body{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--white)}button,input,select,textarea{font:inherit}button{transition:.18s ease}button:hover{transform:translateY(-1px)}.blueprint-page{min-height:100vh;display:grid;grid-template-columns:300px minmax(0,1fr);background:var(--bg);color:var(--white);position:relative}.background{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:0}.orb{position:absolute;width:540px;height:540px;border-radius:999px;filter:blur(120px)}.orb.one{left:-230px;top:-190px;background:rgba(99,229,70,.105)}.orb.two{right:-260px;top:100px;background:rgba(255,255,255,.055)}.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);background-size:42px 42px;opacity:.42;mask-image:radial-gradient(circle at center,black 0%,transparent 84%)}.blueprint-sidebar{position:sticky;top:0;height:100vh;z-index:2;border-right:1px solid var(--line);background:linear-gradient(180deg,rgba(5,8,7,.98),rgba(4,6,5,.94));padding:22px;display:flex;flex-direction:column;justify-content:space-between}.back-link{width:max-content;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.035);color:var(--muted);border-radius:999px;min-height:38px;padding:0 13px;cursor:pointer;font-weight:850}.brand-card{margin-top:18px;border:1px solid var(--line);border-radius:22px;background:linear-gradient(145deg,rgba(255,255,255,.065),rgba(255,255,255,.018));padding:18px}.brand-card p{margin:16px 0 0;color:var(--muted);font-size:13px}.step-list{margin-top:18px;display:grid;gap:10px}.step{display:grid;grid-template-columns:44px minmax(0,1fr);gap:12px;align-items:center;border:1px solid rgba(255,255,255,.065);border-radius:16px;background:rgba(255,255,255,.025);padding:12px}.step.active{border-color:rgba(99,229,70,.26);background:rgba(99,229,70,.065)}.step>span{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;color:var(--green);background:rgba(99,229,70,.09);border:1px solid rgba(99,229,70,.18);font-weight:950}.step strong{display:block;font-size:14px}.step p{margin:4px 0 0;color:var(--muted);font-size:12px;line-height:1.45}.admin-mini-card{border:1px solid var(--line);border-radius:18px;background:rgba(255,255,255,.035);padding:14px;display:grid;grid-template-columns:42px minmax(0,1fr);gap:12px;align-items:center}.admin-mini-card>span{width:42px;height:42px;border-radius:999px;display:grid;place-items:center;background:rgba(99,229,70,.1);color:var(--green);font-weight:950}.admin-mini-card p{margin:4px 0 0;color:var(--muted);font-size:12px}.blueprint-shell{position:relative;z-index:1;min-width:0;padding:22px;display:grid;gap:16px}.blueprint-hero{min-height:176px;border:1px solid var(--line);border-radius:28px;background:radial-gradient(circle at 82% 20%,rgba(99,229,70,.14),transparent 32%),linear-gradient(135deg,rgba(12,17,14,.98),rgba(8,11,10,.82));padding:28px;display:grid;grid-template-columns:minmax(0,1fr) 410px;gap:22px;align-items:center;box-shadow:0 32px 100px rgba(0,0,0,.22)}.kicker{margin:0 0 11px;color:var(--green);font-size:11px;letter-spacing:.18em;text-transform:uppercase;font-weight:950}.blueprint-hero h1{margin:0;font-size:clamp(42px,4.2vw,68px);line-height:.9;letter-spacing:-.065em}.blueprint-hero p:not(.kicker){margin:16px 0 0;color:var(--muted);line-height:1.62;max-width:820px}.hero-panel{border:1px solid rgba(99,229,70,.22);border-radius:22px;background:linear-gradient(145deg,rgba(99,229,70,.085),rgba(255,255,255,.025));padding:20px;box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}.hero-panel span{color:var(--green);font-size:11px;letter-spacing:.16em;text-transform:uppercase;font-weight:950}.hero-panel strong{display:block;margin-top:9px;font-size:24px;line-height:1.08;letter-spacing:-.04em}.hero-panel p{color:var(--muted);line-height:1.55}.hero-panel code{display:block;width:max-content;max-width:100%;overflow:hidden;text-overflow:ellipsis;border-radius:999px;border:1px solid rgba(255,255,255,.09);background:rgba(0,0,0,.18);color:var(--soft);padding:8px 10px;font-size:11px}.system-message{border:1px solid rgba(99,229,70,.22);background:rgba(99,229,70,.06);border-radius:16px;padding:14px 16px;color:var(--muted);line-height:1.5}.blueprint-layout{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:16px;align-items:start}.builder-card,.summary-card,.created-card,.recent-card,.loading-card{border:1px solid var(--line);border-radius:24px;background:var(--panel);box-shadow:0 24px 80px rgba(0,0,0,.18)}.builder-card{padding:20px;display:grid;gap:16px}.source-card,.config-card,.instructions-card{grid-column:1}.summary-column{grid-column:2;grid-row:1 / span 3;display:grid;gap:14px;position:sticky;top:22px}.card-head{display:grid;grid-template-columns:46px minmax(0,1fr);gap:14px;align-items:start}.card-head>span{width:46px;height:46px;border-radius:15px;display:grid;place-items:center;background:rgba(99,229,70,.09);border:1px solid rgba(99,229,70,.18);color:var(--green);font-weight:950}.card-head h2{margin:0;font-size:27px;line-height:1;letter-spacing:-.045em}.card-head p{margin:8px 0 0;color:var(--muted);font-size:13px;line-height:1.55}.scope-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.scope-button,.toggle-chip,.switch-field,.lesson-chip{border:1px solid rgba(255,255,255,.08);background:linear-gradient(145deg,rgba(255,255,255,.05),rgba(255,255,255,.018));color:var(--white);border-radius:16px;padding:14px;text-align:left;cursor:pointer}.scope-button.active,.toggle-chip.active,.switch-field.active,.lesson-chip.active{border-color:rgba(99,229,70,.32);background:linear-gradient(145deg,rgba(99,229,70,.13),rgba(255,255,255,.022))}.scope-button strong,.toggle-chip strong{display:block;font-size:15px}.scope-button span,.toggle-chip span{display:block;margin-top:6px;color:var(--muted);font-size:12px;line-height:1.45}.field-grid{display:grid;gap:12px}.field-grid.two{grid-template-columns:1fr 1fr}.field-grid.four{grid-template-columns:repeat(4,minmax(0,1fr))}label{display:grid;gap:7px}label>span{color:var(--muted);font-size:12px;font-weight:850}input,select,textarea{width:100%;border:1px solid rgba(255,255,255,.09);border-radius:15px;background:rgba(255,255,255,.035);color:var(--white);padding:13px 14px;outline:none}input:focus,select:focus,textarea:focus{border-color:rgba(99,229,70,.32);box-shadow:0 0 0 4px rgba(99,229,70,.07)}select:disabled{opacity:.45}option{background:#080b0a;color:var(--white)}textarea{min-height:116px;resize:vertical;line-height:1.55}.instructions-textarea{min-height:180px}.lesson-picker{border:1px solid rgba(255,255,255,.07);border-radius:18px;background:rgba(0,0,0,.14);padding:12px;display:grid;gap:8px}.lesson-picker-head{display:flex;justify-content:space-between;color:var(--muted);font-size:12px;padding:4px 4px 8px}.lesson-picker-head strong{color:var(--white)}.lesson-chip{width:100%;display:grid;grid-template-columns:30px minmax(0,1fr);gap:10px;align-items:center;padding:11px 12px}.lesson-chip>span{width:28px;height:28px;border-radius:999px;display:grid;place-items:center;color:var(--green);border:1px solid rgba(99,229,70,.18);background:rgba(99,229,70,.08)}.lesson-chip strong{display:block}.lesson-chip small{display:block;margin-top:4px;color:var(--muted)}.question-kind-grid,.switch-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.switch-grid{grid-template-columns:1fr 1fr}.switch-field{display:grid;grid-template-columns:34px minmax(0,1fr);gap:11px;align-items:center}.switch-field>span{width:32px;height:32px;border-radius:999px;display:grid;place-items:center;color:var(--green);border:1px solid rgba(99,229,70,.18);background:rgba(99,229,70,.08);font-weight:950}.switch-field small{display:block;margin-top:4px;color:var(--muted);line-height:1.4}.notice-box{border:1px solid rgba(247,201,72,.22);background:rgba(247,201,72,.07);border-radius:16px;padding:14px;color:var(--muted);line-height:1.55}.notice-box strong{color:var(--warning)}.notice-box code{color:var(--white);background:rgba(0,0,0,.2);border-radius:8px;padding:2px 6px}.summary-card{padding:20px;background:radial-gradient(circle at top right,rgba(99,229,70,.13),transparent 36%),var(--panel2)}.summary-card h2{margin:0 0 14px;font-size:28px;line-height:1.02;letter-spacing:-.045em}.summary-list{display:grid;border-top:1px solid rgba(255,255,255,.07);margin-top:14px}.summary-row{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.055)}.summary-row span{color:var(--muted);font-size:12px}.summary-row strong{text-align:right;font-size:13px}.primary-action,.secondary-action{width:100%;min-height:46px;border-radius:999px;margin-top:14px;font-weight:950;cursor:pointer}.primary-action{border:0;background:linear-gradient(135deg,#7cff55,var(--green));color:#061008;box-shadow:0 16px 36px rgba(99,229,70,.18)}.primary-action:disabled{opacity:.65;cursor:not-allowed}.secondary-action{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.035);color:var(--white)}.created-card{padding:14px;display:grid;grid-template-columns:40px minmax(0,1fr);gap:12px;align-items:start;border-color:rgba(99,229,70,.26);background:rgba(99,229,70,.055)}.created-card>span{width:40px;height:40px;border-radius:14px;display:grid;place-items:center;background:rgba(99,229,70,.1);color:var(--green);border:1px solid rgba(99,229,70,.18);font-weight:950}.created-card p{margin:5px 0;color:var(--muted);font-size:13px}.created-card code{display:block;color:var(--soft);font-size:11px;word-break:break-all}.recent-card{padding:16px}.recent-card h3{margin:0 0 12px;font-size:18px}.recent-card p{color:var(--muted);line-height:1.5}.recent-row{border-top:1px solid rgba(255,255,255,.06);padding:10px 0}.recent-row strong{display:block;font-size:13px}.recent-row span{display:block;margin-top:4px;color:var(--muted);font-size:12px}.empty-state{border:1px dashed rgba(255,255,255,.12);border-radius:14px;padding:18px;color:var(--muted);text-align:center}.loading-card{position:relative;z-index:1;width:min(560px,calc(100vw - 40px));place-self:center;padding:34px}.loading-card h1{margin:18px 0 0;font-size:42px;line-height:.95;letter-spacing:-.06em}.loading-card p{color:var(--muted)}@media(max-width:1320px){.blueprint-page{grid-template-columns:1fr}.blueprint-sidebar{position:relative;height:auto}.blueprint-hero,.blueprint-layout{grid-template-columns:1fr}.summary-column{grid-column:auto;grid-row:auto;position:static}.scope-grid,.field-grid.four,.question-kind-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.blueprint-shell{padding:14px}.blueprint-hero{padding:20px}.blueprint-hero h1{font-size:40px}.scope-grid,.field-grid.two,.field-grid.four,.question-kind-grid,.switch-grid{grid-template-columns:1fr}}
  `}</style>;
}
