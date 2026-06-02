"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import GHCLogo from "../../components/GHCLogo";

type AnyRecord = Record<string, any>;
type GuardState = "checking" | "allowed" | "denied";
type ExamScope = "lesson" | "module" | "course";
type ExamStatus = "draft" | "published" | "hidden";
type CorrectOption = "A" | "B" | "C" | "D";

type DashboardData = {
  courses: AnyRecord[];
  modules: AnyRecord[];
  lessons: AnyRecord[];
  exams: AnyRecord[];
  examQuestions: AnyRecord[];
  examAttempts: AnyRecord[];
};

type ExamFormState = {
  id: string;
  title: string;
  description: string;
  scope: ExamScope;
  status: ExamStatus;
  passingScore: string;
};

type QuestionFormState = {
  id: string;
  examId: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: CorrectOption;
  sortOrder: string;
  explanation: string;
};

type UiMode = "createExam" | "editExam";
type QuestionMode = "createQuestion" | "editQuestion";

const GREEN = "#63E546";
const BUILD_ID = "EXAMS-RESET-PREMIUM-01 · 2026-06-02";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const emptyData: DashboardData = {
  courses: [],
  modules: [],
  lessons: [],
  exams: [],
  examQuestions: [],
  examAttempts: [],
};

const emptyExamForm: ExamFormState = {
  id: "",
  title: "",
  description: "",
  scope: "lesson",
  status: "draft",
  passingScore: "70",
};

const emptyQuestionForm: QuestionFormState = {
  id: "",
  examId: "",
  question: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctOption: "A",
  sortOrder: "1",
  explanation: "",
};

export default function ExamsControlCenterPage() {
  const router = useRouter();

  const [guardState, setGuardState] = useState<GuardState>("checking");
  const [adminName, setAdminName] = useState("Admin GHC");
  const [data, setData] = useState<DashboardData>(emptyData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [selectedScope, setSelectedScope] = useState<ExamScope>("lesson");
  const [selectedExamId, setSelectedExamId] = useState("");

  const [examMode, setExamMode] = useState<UiMode>("createExam");
  const [examForm, setExamForm] = useState<ExamFormState>(emptyExamForm);
  const [questionMode, setQuestionMode] = useState<QuestionMode>("createQuestion");
  const [questionForm, setQuestionForm] = useState<QuestionFormState>(emptyQuestionForm);

  useEffect(() => {
    async function protectAndLoad() {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          router.replace("/acceso");
          return;
        }

        const user = userData.user as AnyRecord;
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error(profileError);
          router.replace("/alumno");
          return;
        }

        const role = String(profile?.role || "").toLowerCase();
        if (!["admin", "superadmin", "owner"].includes(role)) {
          router.replace("/alumno");
          return;
        }

        setAdminName(profile?.full_name || user.user_metadata?.full_name || user.email || "Admin GHC");
        setGuardState("allowed");
        const loaded = await loadDashboardData();
        setData(loaded);
        hydrateInitialSelection(loaded);
      } catch (error) {
        console.error(error);
        router.replace("/alumno");
      }
    }

    protectAndLoad();
  }, [router]);

  function hydrateInitialSelection(loaded: DashboardData) {
    const firstCourse = loaded.courses[0];
    const courseId = String(firstCourse?.id || "");
    const courseModules = loaded.modules.filter((module) => String(module.course_id) === courseId);
    const moduleId = String(courseModules[0]?.id || "");
    const moduleLessons = loaded.lessons.filter((lesson) => String(lesson.module_id) === moduleId);
    const lessonId = String(moduleLessons[0]?.id || "");

    setSelectedCourseId(courseId);
    setSelectedModuleId(moduleId);
    setSelectedLessonId(lessonId);
    setSelectedScope("lesson");

    const firstMatchingExam = findExamForContext(loaded.exams, "lesson", courseId, moduleId, lessonId) || loaded.exams[0];
    if (firstMatchingExam) {
      loadExamIntoEditor(firstMatchingExam);
    } else {
      prepareNewExam("lesson", courseId, moduleId, lessonId);
    }
  }

  const courses = useMemo(() => data.courses.slice().sort(sortByTitle), [data.courses]);

  const selectedCourse = useMemo(
    () => courses.find((course) => String(course.id) === selectedCourseId) || courses[0] || null,
    [courses, selectedCourseId]
  );

  const modulesForCourse = useMemo(() => {
    if (!selectedCourse) return [];
    return data.modules
      .filter((module) => String(module.course_id) === String(selectedCourse.id))
      .slice()
      .sort(sortBySortOrder);
  }, [data.modules, selectedCourse]);

  const selectedModule = useMemo(
    () => modulesForCourse.find((module) => String(module.id) === selectedModuleId) || modulesForCourse[0] || null,
    [modulesForCourse, selectedModuleId]
  );

  const lessonsForModule = useMemo(() => {
    if (!selectedModule) return [];
    return data.lessons
      .filter((lesson) => String(lesson.module_id) === String(selectedModule.id))
      .slice()
      .sort(sortBySortOrder);
  }, [data.lessons, selectedModule]);

  const selectedLesson = useMemo(
    () => lessonsForModule.find((lesson) => String(lesson.id) === selectedLessonId) || lessonsForModule[0] || null,
    [lessonsForModule, selectedLessonId]
  );

  const examsForCourse = useMemo(() => {
    if (!selectedCourse) return [];
    return data.exams
      .filter((exam) => String(exam.course_id) === String(selectedCourse.id))
      .slice()
      .sort((a, b) => scopeWeight(a) - scopeWeight(b) || String(a.title || "").localeCompare(String(b.title || "")));
  }, [data.exams, selectedCourse]);

  const activeExam = useMemo(
    () => data.exams.find((exam) => String(exam.id) === selectedExamId) || null,
    [data.exams, selectedExamId]
  );

  const activeQuestions = useMemo(() => {
    if (!selectedExamId) return [];
    return data.examQuestions
      .filter((question) => String(question.exam_id) === selectedExamId)
      .slice()
      .sort(sortBySortOrder);
  }, [data.examQuestions, selectedExamId]);

  const selectedExamAttempts = useMemo(() => {
    if (!selectedExamId) return [];
    return data.examAttempts.filter((attempt) => String(attempt.exam_id) === selectedExamId);
  }, [data.examAttempts, selectedExamId]);

  const stats = useMemo(() => {
    const withoutQuestions = data.exams.filter((exam) => !data.examQuestions.some((question) => String(question.exam_id) === String(exam.id))).length;
    const published = data.exams.filter((exam) => normalizeStatus(exam.status) === "published").length;
    const draft = data.exams.filter((exam) => normalizeStatus(exam.status) === "draft").length;
    return {
      exams: data.exams.length,
      questions: data.examQuestions.length,
      attempts: data.examAttempts.length,
      published,
      draft,
      withoutQuestions,
    };
  }, [data]);

  async function refresh(message?: string) {
    setIsRefreshing(true);
    try {
      const loaded = await loadDashboardData();
      setData(loaded);
      if (message) setNotice(message);
    } finally {
      setIsRefreshing(false);
    }
  }

  function handleCourseChange(courseId: string) {
    const nextModules = data.modules.filter((module) => String(module.course_id) === courseId).slice().sort(sortBySortOrder);
    const moduleId = String(nextModules[0]?.id || "");
    const nextLessons = data.lessons.filter((lesson) => String(lesson.module_id) === moduleId).slice().sort(sortBySortOrder);
    const lessonId = String(nextLessons[0]?.id || "");

    setSelectedCourseId(courseId);
    setSelectedModuleId(moduleId);
    setSelectedLessonId(lessonId);
    selectContextExam(selectedScope, courseId, moduleId, lessonId);
  }

  function handleModuleChange(moduleId: string) {
    const nextLessons = data.lessons.filter((lesson) => String(lesson.module_id) === moduleId).slice().sort(sortBySortOrder);
    const lessonId = String(nextLessons[0]?.id || "");
    setSelectedModuleId(moduleId);
    setSelectedLessonId(lessonId);
    selectContextExam(selectedScope, selectedCourseId, moduleId, lessonId);
  }

  function handleLessonChange(lessonId: string) {
    setSelectedLessonId(lessonId);
    selectContextExam(selectedScope, selectedCourseId, selectedModuleId, lessonId);
  }

  function handleScopeChange(scope: ExamScope) {
    setSelectedScope(scope);
    selectContextExam(scope, selectedCourseId, selectedModuleId, selectedLessonId);
  }

  function selectContextExam(scope: ExamScope, courseId: string, moduleId: string, lessonId: string) {
    const match = findExamForContext(data.exams, scope, courseId, moduleId, lessonId);
    if (match) {
      loadExamIntoEditor(match);
    } else {
      prepareNewExam(scope, courseId, moduleId, lessonId);
    }
  }

  function prepareNewExam(scope: ExamScope, courseId = selectedCourseId, moduleId = selectedModuleId, lessonId = selectedLessonId) {
    const title = buildDefaultExamTitle(scope, selectedCourse, selectedModule, selectedLesson);
    setSelectedExamId("");
    setExamMode("createExam");
    setExamForm({
      ...emptyExamForm,
      title,
      scope,
      status: "draft",
      passingScore: "70",
    });
    setQuestionMode("createQuestion");
    setQuestionForm(emptyQuestionForm);
    setNotice(`Preparado nuevo ${getScopeLabel(scope).toLowerCase()} para el contexto seleccionado.`);
  }

  function loadExamIntoEditor(exam: AnyRecord) {
    const scope = normalizeScope(exam.exam_scope);
    setSelectedExamId(String(exam.id || ""));
    setExamMode("editExam");
    setExamForm({
      id: String(exam.id || ""),
      title: String(exam.title || ""),
      description: String(exam.description || ""),
      scope,
      status: normalizeStatus(exam.status),
      passingScore: String(exam.passing_score ?? exam.pass_score ?? 70),
    });

    setSelectedScope(scope);
    if (exam.course_id) setSelectedCourseId(String(exam.course_id));
    if (exam.module_id) setSelectedModuleId(String(exam.module_id));
    if (exam.lesson_id) setSelectedLessonId(String(exam.lesson_id));

    setQuestionMode("createQuestion");
    setQuestionForm({ ...emptyQuestionForm, examId: String(exam.id || ""), sortOrder: String(activeQuestions.length + 1) });
  }

  async function handleExamSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCourseId) {
      setNotice("Selecciona un curso antes de guardar el examen.");
      return;
    }
    if (examForm.scope === "module" && !selectedModuleId) {
      setNotice("Selecciona un módulo para crear un examen de módulo.");
      return;
    }
    if (examForm.scope === "lesson" && !selectedLessonId) {
      setNotice("Selecciona una lección para crear una evaluación de lección.");
      return;
    }
    if (!examForm.title.trim()) {
      setNotice("El examen necesita un título.");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        p_course_id: selectedCourseId,
        p_module_id: examForm.scope === "course" ? null : selectedModuleId || null,
        p_lesson_id: examForm.scope === "lesson" ? selectedLessonId || null : null,
        p_title: examForm.title.trim(),
        p_description: examForm.description.trim() || null,
        p_exam_scope: examForm.scope,
        p_passing_score: clampScore(examForm.passingScore),
        p_status: examForm.status,
      };

      let response;
      if (examMode === "editExam" && examForm.id) {
        response = await withTimeout(
          supabase.rpc("ghc_admin_update_exam", {
            p_exam_id: examForm.id,
            ...payload,
          }),
          12000,
          "Supabase no respondió al actualizar el examen."
        );
      } else {
        response = await withTimeout(
          supabase.rpc("ghc_admin_create_exam", payload),
          12000,
          "Supabase no respondió al crear el examen."
        );
      }

      if (response.error) throw response.error;

      const savedExam = response.data as AnyRecord;
      await refresh(examMode === "editExam" ? "Examen actualizado correctamente." : "Examen creado correctamente.");
      if (savedExam?.id) {
        setSelectedExamId(String(savedExam.id));
        setExamMode("editExam");
        setExamForm((current) => ({ ...current, id: String(savedExam.id) }));
        setQuestionForm((current) => ({ ...current, examId: String(savedExam.id) }));
      }
    } catch (error) {
      console.error(error);
      setNotice(getErrorMessage(error, "No se pudo guardar el examen."));
    } finally {
      setBusy(false);
    }
  }

  async function handleQuestionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const examId = questionForm.examId || selectedExamId;
    if (!examId) {
      setNotice("Primero guarda o selecciona un examen antes de crear preguntas.");
      return;
    }
    if (!questionForm.question.trim()) {
      setNotice("La pregunta es obligatoria.");
      return;
    }
    if (!questionForm.optionA.trim() || !questionForm.optionB.trim() || !questionForm.optionC.trim() || !questionForm.optionD.trim()) {
      setNotice("Las opciones A, B, C y D son obligatorias.");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        p_exam_id: examId,
        p_question: questionForm.question.trim(),
        p_option_a: questionForm.optionA.trim(),
        p_option_b: questionForm.optionB.trim(),
        p_option_c: questionForm.optionC.trim(),
        p_option_d: questionForm.optionD.trim(),
        p_correct_option: questionForm.correctOption,
        p_sort_order: parseInteger(questionForm.sortOrder, activeQuestions.length + 1),
        p_explanation: questionForm.explanation.trim() || null,
      };

      const response = questionMode === "editQuestion" && questionForm.id
        ? await withTimeout(
            supabase.rpc("ghc_admin_update_exam_question", {
              p_question_id: questionForm.id,
              ...payload,
            }),
            12000,
            "Supabase no respondió al actualizar la pregunta."
          )
        : await withTimeout(
            supabase.rpc("ghc_admin_create_exam_question", payload),
            12000,
            "Supabase no respondió al crear la pregunta."
          );

      if (response.error) throw response.error;

      await refresh(questionMode === "editQuestion" ? "Pregunta actualizada." : "Pregunta añadida al banco del examen.");
      setQuestionMode("createQuestion");
      setQuestionForm({ ...emptyQuestionForm, examId, sortOrder: String(activeQuestions.length + 2) });
    } catch (error) {
      console.error(error);
      setNotice(getErrorMessage(error, "No se pudo guardar la pregunta."));
    } finally {
      setBusy(false);
    }
  }

  async function deleteQuestion(questionId: string) {
    if (!questionId) return;
    const confirmed = window.confirm("¿Eliminar esta pregunta del examen? Esta acción no elimina el examen.");
    if (!confirmed) return;

    setBusy(true);
    try {
      const { error } = await withTimeout(
        supabase.rpc("ghc_admin_delete_exam_question", { p_question_id: questionId }),
        12000,
        "Supabase no respondió al eliminar la pregunta."
      );
      if (error) throw error;
      await refresh("Pregunta eliminada.");
      setQuestionMode("createQuestion");
      setQuestionForm({ ...emptyQuestionForm, examId: selectedExamId, sortOrder: String(Math.max(1, activeQuestions.length)) });
    } catch (error) {
      console.error(error);
      setNotice(getErrorMessage(error, "No se pudo eliminar la pregunta."));
    } finally {
      setBusy(false);
    }
  }

  function editQuestion(question: AnyRecord) {
    setQuestionMode("editQuestion");
    setQuestionForm({
      id: String(question.id || ""),
      examId: String(question.exam_id || selectedExamId || ""),
      question: String(question.question || ""),
      optionA: String(question.option_a || ""),
      optionB: String(question.option_b || ""),
      optionC: String(question.option_c || ""),
      optionD: String(question.option_d || ""),
      correctOption: normalizeCorrectOption(question.correct_option),
      sortOrder: String(question.sort_order || 1),
      explanation: String(question.explanation || ""),
    });
  }

  if (guardState === "checking") {
    return (
      <main className="exam-admin-loading">
        <ExamGlobalStyles />
        <ExamBackground />
        <section className="exam-loading-card">
          <GHCLogo size="md" showText tagline={false} />
          <h1>Centro de evaluación</h1>
          <p>Verificando acceso administrativo y cargando banco de exámenes...</p>
        </section>
      </main>
    );
  }

  if (guardState !== "allowed") return null;

  return (
    <main className="exam-admin-page">
      <ExamGlobalStyles />
      <ExamBackground />

      <aside className="exam-side-rail">
        <div className="exam-side-logo">
          <GHCLogo size="md" showText tagline={false} />
        </div>

        <div className="exam-side-copy">
          <span>Admin real</span>
          <strong>Centro de evaluación GHC</strong>
          <p>Curso, módulo, lección, exámenes y preguntas en una sola cabina.</p>
        </div>

        <nav className="exam-side-nav" aria-label="Accesos del control center">
          <button type="button" onClick={() => router.push("/ghc-control-center")}>Panel principal</button>
          <button type="button" onClick={() => router.push("/ghc-control-center#examenes")}>Vista antigua</button>
          <button type="button" onClick={() => refresh("Datos refrescados desde Supabase.")}>{isRefreshing ? "Refrescando..." : "Refrescar datos"}</button>
        </nav>

        <div className="exam-admin-user">
          <span>{getInitials(adminName)}</span>
          <div>
            <strong>{shortName(adminName)}</strong>
            <p>Administrador</p>
          </div>
        </div>
      </aside>

      <section className="exam-workspace">
        <header className="exam-topbar">
          <div className="exam-breadcrumb">
            <span>Administración</span>
            <em>›</em>
            <strong>Exámenes y evaluaciones</strong>
          </div>
          <div className="exam-top-actions">
            <span>{BUILD_ID}</span>
            <button type="button" onClick={() => prepareNewExam(selectedScope)}>+ Nuevo examen</button>
          </div>
        </header>

        {notice ? <div className="exam-notice">{notice}</div> : null}

        <section className="exam-hero-reset">
          <div className="exam-hero-copy">
            <p className="exam-kicker">Evaluación · certificación · control académico</p>
            <h1>Centro de evaluación GHC</h1>
            <p>
              Diseña evaluaciones de lección, exámenes de módulo y exámenes finales con preguntas A/B/C/D,
              publicación controlada y conexión real con Supabase.
            </p>
          </div>

          <div className="exam-hero-panel">
            <span>Operativo con RPC segura</span>
            <strong>Sin SQL manual</strong>
            <p>Usa las funciones GHC ya creadas. La IA no publica exámenes; el administrador revisa y aprueba.</p>
          </div>
        </section>

        <section className="exam-metric-grid">
          <MetricCard label="Exámenes" value={stats.exams} helper="Total Supabase" />
          <MetricCard label="Preguntas" value={stats.questions} helper="Banco real" />
          <MetricCard label="Publicados" value={stats.published} helper={`${stats.draft} borradores`} />
          <MetricCard label="Intentos" value={stats.attempts} helper="exam_attempts" />
          <MetricCard label="Sin preguntas" value={stats.withoutQuestions} helper="Revisar antes de publicar" warning={stats.withoutQuestions > 0} />
        </section>

        <section className="exam-command-grid">
          <aside className="academic-map-card">
            <div className="card-headline">
              <span>01</span>
              <div>
                <h2>Mapa académico</h2>
                <p>Selecciona el contexto exacto antes de crear o editar.</p>
              </div>
            </div>

            <label className="premium-field">
              <span>Curso</span>
              <select value={selectedCourseId} onChange={(event) => handleCourseChange(event.target.value)}>
                {courses.length ? courses.map((course) => (
                  <option key={String(course.id)} value={String(course.id)}>{course.title || "Curso GHC"}</option>
                )) : <option value="">Sin cursos</option>}
              </select>
            </label>

            <label className="premium-field">
              <span>Módulo</span>
              <select value={selectedModule?.id || ""} onChange={(event) => handleModuleChange(event.target.value)}>
                {modulesForCourse.length ? modulesForCourse.map((module, index) => (
                  <option key={String(module.id || index)} value={String(module.id || "")}>{module.title || `Módulo ${index + 1}`}</option>
                )) : <option value="">Este curso no tiene módulos</option>}
              </select>
            </label>

            <label className="premium-field">
              <span>Lección</span>
              <select value={selectedLesson?.id || ""} onChange={(event) => handleLessonChange(event.target.value)} disabled={!lessonsForModule.length}>
                {lessonsForModule.length ? lessonsForModule.map((lesson, index) => (
                  <option key={String(lesson.id || index)} value={String(lesson.id || "")}>{lesson.title || `Lección ${index + 1}`}</option>
                )) : <option value="">Este módulo no tiene lecciones</option>}
              </select>
            </label>

            <div className="scope-selector">
              <button type="button" className={selectedScope === "lesson" ? "active" : ""} onClick={() => handleScopeChange("lesson")}>Evaluación de lección</button>
              <button type="button" className={selectedScope === "module" ? "active" : ""} onClick={() => handleScopeChange("module")}>Examen de módulo</button>
              <button type="button" className={selectedScope === "course" ? "active" : ""} onClick={() => handleScopeChange("course")}>Examen final</button>
            </div>

            <div className="context-summary-card">
              <span>Contexto activo</span>
              <strong>{selectedCourse?.title || "Sin curso"}</strong>
              <p>{selectedModule?.title || "Sin módulo"}</p>
              <p>{selectedScope === "lesson" ? selectedLesson?.title || "Sin lección" : getScopeLabel(selectedScope)}</p>
            </div>
          </aside>

          <section className="exam-center-stack">
            <article className="exam-active-card">
              <div className="card-headline wide">
                <span>02</span>
                <div>
                  <h2>{examMode === "editExam" ? "Examen activo" : "Nuevo examen"}</h2>
                  <p>{examMode === "editExam" ? "Edita el examen seleccionado y su estado de publicación." : "Crea una estructura nueva en el contexto seleccionado."}</p>
                </div>
                <button type="button" onClick={() => prepareNewExam(selectedScope)}>+ Crear limpio</button>
              </div>

              <form className="exam-form-grid" onSubmit={handleExamSubmit}>
                <label className="premium-field span-two">
                  <span>Título</span>
                  <input value={examForm.title} onChange={(event) => setExamForm({ ...examForm, title: event.target.value })} placeholder="Evaluación de lección" />
                </label>

                <label className="premium-field">
                  <span>Tipo</span>
                  <select value={examForm.scope} onChange={(event) => { const scope = event.target.value as ExamScope; setExamForm({ ...examForm, scope }); setSelectedScope(scope); }}>
                    <option value="lesson">Evaluación de lección</option>
                    <option value="module">Examen de módulo</option>
                    <option value="course">Examen final</option>
                  </select>
                </label>

                <label className="premium-field">
                  <span>Estado</span>
                  <select value={examForm.status} onChange={(event) => setExamForm({ ...examForm, status: event.target.value as ExamStatus })}>
                    <option value="draft">Borrador</option>
                    <option value="published">Publicado</option>
                    <option value="hidden">Oculto</option>
                  </select>
                </label>

                <label className="premium-field">
                  <span>Nota mínima (%)</span>
                  <input value={examForm.passingScore} onChange={(event) => setExamForm({ ...examForm, passingScore: event.target.value })} inputMode="numeric" />
                </label>

                <label className="premium-field span-two">
                  <span>Descripción / instrucciones</span>
                  <textarea value={examForm.description} onChange={(event) => setExamForm({ ...examForm, description: event.target.value })} placeholder="Instrucciones internas o texto visible para el alumno..." />
                </label>

                <div className="exam-submit-row span-two">
                  <div>
                    <strong>{selectedExamId ? `${activeQuestions.length} preguntas` : "Sin examen guardado"}</strong>
                    <p>{selectedExamAttempts.length} intentos registrados para este examen.</p>
                  </div>
                  <button type="submit" disabled={busy}>{busy ? "Guardando..." : examMode === "editExam" ? "Guardar examen" : "Crear examen"}</button>
                </div>
              </form>
            </article>

            <article className="exam-list-premium-card">
              <div className="card-headline wide compact">
                <span>03</span>
                <div>
                  <h2>Exámenes del curso</h2>
                  <p>Selecciona uno para editarlo o crea una estructura nueva.</p>
                </div>
              </div>

              <div className="premium-exam-list">
                {examsForCourse.length ? examsForCourse.map((exam) => {
                  const examId = String(exam.id || "");
                  const questionCount = data.examQuestions.filter((question) => String(question.exam_id) === examId).length;
                  const isActive = selectedExamId === examId;
                  return (
                    <button key={examId} type="button" className={isActive ? "premium-exam-row active" : "premium-exam-row"} onClick={() => loadExamIntoEditor(exam)}>
                      <span className={`scope-badge ${normalizeScope(exam.exam_scope)}`}>{getScopeLabel(normalizeScope(exam.exam_scope))}</span>
                      <div>
                        <strong>{exam.title || "Examen GHC"}</strong>
                        <p>{questionCount} preguntas · {getStatusLabel(normalizeStatus(exam.status))} · Nota {exam.passing_score ?? exam.pass_score ?? 70}%</p>
                      </div>
                      <em>{isActive ? "Activo" : "Editar"}</em>
                    </button>
                  );
                }) : (
                  <div className="empty-exams-state">
                    <strong>Este curso aún no tiene exámenes</strong>
                    <p>Crea una evaluación de lección, examen de módulo o examen final desde el editor superior.</p>
                  </div>
                )}
              </div>
            </article>
          </section>

          <aside className="question-bank-card">
            <div className="card-headline">
              <span>04</span>
              <div>
                <h2>Banco de preguntas</h2>
                <p>Editor A/B/C/D vinculado al examen activo.</p>
              </div>
            </div>

            <div className="question-list-mini">
              {activeQuestions.length ? activeQuestions.map((question, index) => (
                <div key={String(question.id || index)} className="question-mini-row">
                  <button type="button" onClick={() => editQuestion(question)}>
                    <strong>{index + 1}. {question.question}</strong>
                    <span>Correcta: {question.correct_option || "—"}</span>
                  </button>
                  <button type="button" className="danger-mini" onClick={() => deleteQuestion(String(question.id || ""))}>×</button>
                </div>
              )) : (
                <div className="question-empty">
                  <strong>Sin preguntas</strong>
                  <p>Guarda el examen y añade la primera pregunta.</p>
                </div>
              )}
            </div>

            <form className="question-editor" onSubmit={handleQuestionSubmit}>
              <div className="question-editor-head">
                <strong>{questionMode === "editQuestion" ? "Editar pregunta" : "Nueva pregunta"}</strong>
                <button type="button" onClick={() => { setQuestionMode("createQuestion"); setQuestionForm({ ...emptyQuestionForm, examId: selectedExamId, sortOrder: String(activeQuestions.length + 1) }); }}>Limpiar</button>
              </div>

              <label className="premium-field">
                <span>Pregunta</span>
                <textarea value={questionForm.question} onChange={(event) => setQuestionForm({ ...questionForm, question: event.target.value })} placeholder="Escribe la pregunta..." />
              </label>

              <div className="answer-grid">
                <AnswerInput label="A" value={questionForm.optionA} onChange={(value) => setQuestionForm({ ...questionForm, optionA: value })} active={questionForm.correctOption === "A"} onSelect={() => setQuestionForm({ ...questionForm, correctOption: "A" })} />
                <AnswerInput label="B" value={questionForm.optionB} onChange={(value) => setQuestionForm({ ...questionForm, optionB: value })} active={questionForm.correctOption === "B"} onSelect={() => setQuestionForm({ ...questionForm, correctOption: "B" })} />
                <AnswerInput label="C" value={questionForm.optionC} onChange={(value) => setQuestionForm({ ...questionForm, optionC: value })} active={questionForm.correctOption === "C"} onSelect={() => setQuestionForm({ ...questionForm, correctOption: "C" })} />
                <AnswerInput label="D" value={questionForm.optionD} onChange={(value) => setQuestionForm({ ...questionForm, optionD: value })} active={questionForm.correctOption === "D"} onSelect={() => setQuestionForm({ ...questionForm, correctOption: "D" })} />
              </div>

              <label className="premium-field">
                <span>Explicación opcional</span>
                <textarea value={questionForm.explanation} onChange={(event) => setQuestionForm({ ...questionForm, explanation: event.target.value })} placeholder="Explica por qué la respuesta correcta es válida..." />
              </label>

              <div className="question-submit-row">
                <label>
                  <span>Orden</span>
                  <input value={questionForm.sortOrder} onChange={(event) => setQuestionForm({ ...questionForm, sortOrder: event.target.value })} />
                </label>
                <button type="submit" disabled={busy || !selectedExamId}>{busy ? "Guardando..." : questionMode === "editQuestion" ? "Guardar pregunta" : "Añadir pregunta"}</button>
              </div>
            </form>
          </aside>
        </section>
      </section>
    </main>
  );
}

function AnswerInput({ label, value, active, onChange, onSelect }: { label: CorrectOption; value: string; active: boolean; onChange: (value: string) => void; onSelect: () => void; }) {
  return (
    <label className={active ? "answer-input active" : "answer-input"}>
      <button type="button" onClick={onSelect}>{label}</button>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={`Opción ${label}`} />
    </label>
  );
}

function MetricCard({ label, value, helper, warning = false }: { label: string; value: number; helper: string; warning?: boolean }) {
  return (
    <article className={warning ? "metric-card warning" : "metric-card"}>
      <span>{label}</span>
      <strong>{new Intl.NumberFormat("es-ES").format(value || 0)}</strong>
      <p>{helper}</p>
    </article>
  );
}

async function loadDashboardData(): Promise<DashboardData> {
  const [courses, modules, lessons, exams, examQuestions, examAttempts] = await Promise.all([
    safeSelect("courses", "*"),
    safeSelect("modules", "*"),
    safeSelect("lessons", "*"),
    safeSelect("exams", "*"),
    safeSelect("exam_questions", "*"),
    safeSelect("exam_attempts", "*"),
  ]);

  return { courses, modules, lessons, exams, examQuestions, examAttempts };
}

async function safeSelect(table: string, columns: string): Promise<AnyRecord[]> {
  try {
    const { data, error } = await supabase.from(table).select(columns);
    if (error) {
      console.warn(`[GHC Exams Admin] No se pudo cargar ${table}:`, error.message);
      return [];
    }
    return Array.isArray(data) ? data as AnyRecord[] : [];
  } catch (error) {
    console.warn(`[GHC Exams Admin] Error leyendo ${table}:`, error);
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

function findExamForContext(exams: AnyRecord[], scope: ExamScope, courseId: string, moduleId: string, lessonId: string) {
  return exams.find((exam) => {
    const examScope = normalizeScope(exam.exam_scope);
    if (examScope !== scope) return false;
    if (String(exam.course_id || "") !== String(courseId || "")) return false;
    if (scope === "course") return true;
    if (scope === "module") return String(exam.module_id || "") === String(moduleId || "");
    return String(exam.lesson_id || "") === String(lessonId || "");
  });
}

function buildDefaultExamTitle(scope: ExamScope, course: AnyRecord | null, module: AnyRecord | null, lesson: AnyRecord | null) {
  if (scope === "lesson") return `Evaluación de lección · ${lesson?.title || "Nueva lección"}`;
  if (scope === "module") return `Examen de módulo · ${module?.title || "Nuevo módulo"}`;
  return `Examen final · ${course?.title || "Curso GHC"}`;
}

function normalizeScope(value: unknown): ExamScope {
  const scope = String(value || "course").toLowerCase();
  if (scope === "lesson") return "lesson";
  if (scope === "module") return "module";
  return "course";
}

function normalizeStatus(value: unknown): ExamStatus {
  const status = String(value || "draft").toLowerCase();
  if (status === "published") return "published";
  if (status === "hidden") return "hidden";
  return "draft";
}

function normalizeCorrectOption(value: unknown): CorrectOption {
  const option = String(value || "A").toUpperCase();
  if (["A", "B", "C", "D"].includes(option)) return option as CorrectOption;
  return "A";
}

function getScopeLabel(scope: ExamScope) {
  if (scope === "lesson") return "Evaluación de lección";
  if (scope === "module") return "Examen de módulo";
  return "Examen final";
}

function getStatusLabel(status: ExamStatus) {
  if (status === "published") return "Publicado";
  if (status === "hidden") return "Oculto";
  return "Borrador";
}

function scopeWeight(exam: AnyRecord) {
  const scope = normalizeScope(exam.exam_scope);
  if (scope === "lesson") return 1;
  if (scope === "module") return 2;
  return 3;
}

function sortByTitle(a: AnyRecord, b: AnyRecord) {
  return String(a.title || a.name || "").localeCompare(String(b.title || b.name || ""));
}

function sortBySortOrder(a: AnyRecord, b: AnyRecord) {
  return Number(a.sort_order ?? a.position ?? 0) - Number(b.sort_order ?? b.position ?? 0) || sortByTitle(a, b);
}

function clampScore(value: unknown) {
  const numeric = parseInteger(value, 70);
  return Math.max(0, Math.min(100, numeric));
}

function parseInteger(value: unknown, fallback: number) {
  const numeric = Number(String(value ?? "").replace(/[^0-9]/g, ""));
  return Number.isFinite(numeric) ? Math.round(numeric) : fallback;
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

function getInitials(name: string) {
  return String(name || "A")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function shortName(name: string) {
  return String(name || "Admin").split("@")[0].split(" ")[0] || "Admin";
}

function ExamBackground() {
  return (
    <div className="exam-bg" aria-hidden="true">
      <div className="exam-orb one" />
      <div className="exam-orb two" />
      <div className="exam-grid" />
    </div>
  );
}

function ExamGlobalStyles() {
  return <style>{`
    :root{--green:${GREEN};--bg:#050706;--panel:#0b0f0d;--panel2:#101612;--line:rgba(255,255,255,.09);--white:#f4f6f2;--muted:rgba(244,246,242,.64);--soft:rgba(244,246,242,.42);--warning:#f7c948;--danger:#ff5757}*{box-sizing:border-box}html,body{margin:0;background:var(--bg)}body{color:var(--white);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}button,input,select,textarea{font:inherit}button{transition:.18s ease}button:hover{transform:translateY(-1px)}
    .exam-admin-page{min-height:100vh;display:grid;grid-template-columns:286px minmax(0,1fr);background:var(--bg);color:var(--white);position:relative}.exam-admin-loading{min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--white);position:relative}.exam-loading-card{position:relative;z-index:2;width:min(560px,calc(100vw - 40px));border:1px solid rgba(99,229,70,.22);border-radius:30px;background:linear-gradient(145deg,rgba(255,255,255,.08),rgba(255,255,255,.025));padding:34px;box-shadow:0 30px 90px rgba(0,0,0,.45)}.exam-loading-card h1{margin:18px 0 0;font-size:42px;letter-spacing:-.06em;line-height:.95}.exam-loading-card p{color:var(--muted);line-height:1.55}.exam-bg{position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden}.exam-orb{position:absolute;width:620px;height:620px;border-radius:999px;filter:blur(120px)}.exam-orb.one{left:-260px;top:-260px;background:rgba(99,229,70,.12)}.exam-orb.two{right:-280px;top:120px;background:rgba(255,255,255,.055)}.exam-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:44px 44px;opacity:.45;mask-image:radial-gradient(circle at center,black 0%,transparent 86%)}
    .exam-side-rail{position:sticky;top:0;height:100vh;z-index:2;border-right:1px solid var(--line);background:linear-gradient(180deg,rgba(5,8,7,.98),rgba(5,7,6,.92));padding:22px;display:flex;flex-direction:column}.exam-side-logo{min-height:60px;display:flex;align-items:center}.exam-side-copy{margin-top:30px;border:1px solid rgba(99,229,70,.18);border-radius:22px;background:linear-gradient(145deg,rgba(99,229,70,.11),rgba(255,255,255,.025));padding:18px}.exam-side-copy span,.exam-kicker{display:block;color:var(--green);text-transform:uppercase;letter-spacing:.18em;font-size:10px;font-weight:950}.exam-side-copy strong{display:block;margin-top:10px;font-size:25px;line-height:1;letter-spacing:-.05em}.exam-side-copy p{margin:10px 0 0;color:var(--muted);font-size:13px;line-height:1.55}.exam-side-nav{display:grid;gap:9px;margin-top:22px}.exam-side-nav button{min-height:44px;border-radius:14px;border:1px solid rgba(255,255,255,.085);background:rgba(255,255,255,.035);color:var(--white);font-weight:900;text-align:left;padding:0 14px;cursor:pointer}.exam-side-nav button:first-child{background:var(--green);border-color:transparent;color:#061008}.exam-admin-user{margin-top:auto;border:1px solid var(--line);border-radius:18px;background:rgba(255,255,255,.035);padding:14px;display:grid;grid-template-columns:42px 1fr;gap:11px;align-items:center}.exam-admin-user>span{width:42px;height:42px;border-radius:999px;display:grid;place-items:center;background:rgba(99,229,70,.1);border:1px solid rgba(99,229,70,.2);color:var(--green);font-weight:950}.exam-admin-user p{margin:3px 0 0;color:var(--muted);font-size:12px}
    .exam-workspace{position:relative;z-index:1;min-width:0;padding:20px 22px 34px}.exam-topbar{min-height:58px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:18px}.exam-breadcrumb{display:flex;gap:10px;align-items:center;color:var(--muted);font-size:13px;font-weight:850}.exam-breadcrumb strong{color:var(--white)}.exam-breadcrumb em{font-style:normal;color:var(--soft)}.exam-top-actions{display:flex;align-items:center;gap:10px}.exam-top-actions span{border:1px solid rgba(99,229,70,.18);border-radius:999px;background:rgba(99,229,70,.06);color:var(--green);font-size:11px;font-weight:950;padding:8px 12px}.exam-top-actions button{min-height:40px;border:0;border-radius:999px;background:linear-gradient(135deg,#7cff55,var(--green));color:#061008;font-weight:950;padding:0 16px;cursor:pointer}.exam-notice{margin-bottom:14px;border:1px solid rgba(99,229,70,.2);border-radius:16px;background:rgba(99,229,70,.06);color:var(--muted);padding:13px 15px}
    .exam-hero-reset{min-height:210px;border:1px solid var(--line);border-radius:30px;background:radial-gradient(circle at 82% 18%,rgba(99,229,70,.2),transparent 32%),linear-gradient(135deg,rgba(255,255,255,.075),rgba(255,255,255,.022));box-shadow:0 32px 110px rgba(0,0,0,.28);display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:24px;align-items:center;padding:30px;overflow:hidden}.exam-hero-copy h1{margin:0;font-size:clamp(48px,5vw,76px);line-height:.88;letter-spacing:-.075em}.exam-hero-copy p:not(.exam-kicker){max-width:820px;color:var(--muted);font-size:16px;line-height:1.65}.exam-hero-panel{border:1px solid rgba(99,229,70,.24);border-radius:24px;background:linear-gradient(145deg,rgba(99,229,70,.12),rgba(255,255,255,.028));padding:20px;box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}.exam-hero-panel span{color:var(--green);text-transform:uppercase;letter-spacing:.16em;font-size:10px;font-weight:950}.exam-hero-panel strong{display:block;margin-top:10px;font-size:30px;line-height:.95;letter-spacing:-.05em}.exam-hero-panel p{color:var(--muted);line-height:1.55;font-size:13px}.exam-metric-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin-top:14px}.metric-card{min-height:118px;border:1px solid var(--line);border-radius:20px;background:linear-gradient(145deg,rgba(255,255,255,.06),rgba(255,255,255,.022));padding:16px;box-shadow:0 20px 60px rgba(0,0,0,.18)}.metric-card span{color:var(--muted);font-size:12px;font-weight:850}.metric-card strong{display:block;margin-top:9px;font-size:34px;line-height:1;letter-spacing:-.05em}.metric-card p{margin:7px 0 0;color:var(--muted);font-size:12px}.metric-card.warning strong{color:var(--warning)}
    .exam-command-grid{display:grid;grid-template-columns:320px minmax(0,1fr) 410px;gap:14px;align-items:start;margin-top:14px}.academic-map-card,.exam-active-card,.exam-list-premium-card,.question-bank-card{border:1px solid var(--line);border-radius:24px;background:rgba(10,14,12,.88);box-shadow:0 26px 80px rgba(0,0,0,.22);padding:18px}.academic-map-card,.question-bank-card{position:sticky;top:20px}.exam-center-stack{display:grid;gap:14px}.card-headline{display:grid;grid-template-columns:42px minmax(0,1fr);gap:12px;align-items:start;margin-bottom:16px}.card-headline.wide{grid-template-columns:42px minmax(0,1fr) auto}.card-headline.compact{margin-bottom:10px}.card-headline>span{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;background:rgba(99,229,70,.1);border:1px solid rgba(99,229,70,.2);color:var(--green);font-weight:950}.card-headline h2{margin:0;font-size:25px;line-height:1;letter-spacing:-.045em}.card-headline p{margin:7px 0 0;color:var(--muted);font-size:13px;line-height:1.45}.card-headline button{height:40px;border-radius:999px;border:1px solid rgba(99,229,70,.24);background:rgba(99,229,70,.07);color:var(--green);font-weight:950;padding:0 14px;cursor:pointer}.premium-field{display:grid;gap:7px;margin-bottom:12px}.premium-field span,.question-submit-row span{color:var(--soft);font-size:10px;text-transform:uppercase;letter-spacing:.14em;font-weight:950}.premium-field input,.premium-field select,.premium-field textarea,.question-submit-row input{width:100%;border:1px solid rgba(255,255,255,.095);border-radius:14px;background:rgba(255,255,255,.035);color:var(--white);outline:0;padding:12px 13px}.premium-field select option{background:#080b0a;color:var(--white)}.premium-field textarea{min-height:104px;resize:vertical;line-height:1.55}.scope-selector{display:grid;gap:8px;margin:14px 0}.scope-selector button{min-height:44px;border-radius:14px;border:1px solid rgba(255,255,255,.085);background:rgba(255,255,255,.03);color:var(--white);cursor:pointer;text-align:left;padding:0 13px;font-weight:900}.scope-selector button.active{border-color:rgba(99,229,70,.36);background:rgba(99,229,70,.1);color:var(--green);box-shadow:inset 3px 0 0 var(--green)}.context-summary-card{border:1px solid rgba(99,229,70,.18);border-radius:18px;background:rgba(99,229,70,.055);padding:14px}.context-summary-card span{color:var(--green);font-size:10px;text-transform:uppercase;letter-spacing:.14em;font-weight:950}.context-summary-card strong{display:block;margin-top:8px;font-size:17px;line-height:1.15}.context-summary-card p{margin:6px 0 0;color:var(--muted);font-size:12px;line-height:1.35}
    .exam-form-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:12px}.span-two{grid-column:1/-1}.exam-submit-row{border:1px solid rgba(99,229,70,.18);border-radius:18px;background:rgba(99,229,70,.055);padding:14px;display:flex;align-items:center;justify-content:space-between;gap:14px}.exam-submit-row p{margin:4px 0 0;color:var(--muted);font-size:12px}.exam-submit-row button,.question-submit-row button{min-height:44px;border:0;border-radius:999px;background:linear-gradient(135deg,#7cff55,var(--green));color:#061008;font-weight:950;padding:0 18px;cursor:pointer}.exam-submit-row button:disabled,.question-submit-row button:disabled{opacity:.45;cursor:not-allowed}.premium-exam-list{display:grid;gap:10px}.premium-exam-row{width:100%;min-height:80px;border-radius:17px;border:1px solid rgba(255,255,255,.075);background:linear-gradient(145deg,rgba(255,255,255,.048),rgba(255,255,255,.018));color:var(--white);display:grid;grid-template-columns:150px minmax(0,1fr) 70px;gap:12px;align-items:center;padding:12px;text-align:left;cursor:pointer}.premium-exam-row:hover,.premium-exam-row.active{border-color:rgba(99,229,70,.26);background:rgba(99,229,70,.07)}.premium-exam-row em{font-style:normal;color:var(--green);font-weight:950;font-size:12px;text-align:right}.premium-exam-row p{margin:5px 0 0;color:var(--muted);font-size:12px}.scope-badge{border-radius:999px;border:1px solid rgba(99,229,70,.24);background:rgba(99,229,70,.09);color:var(--green);padding:7px 9px;text-align:center;font-size:10px;text-transform:uppercase;letter-spacing:.08em;font-weight:950}.scope-badge.module{border-color:rgba(247,201,72,.25);background:rgba(247,201,72,.09);color:var(--warning)}.scope-badge.course{border-color:rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:var(--white)}.empty-exams-state,.question-empty{border:1px dashed rgba(255,255,255,.15);border-radius:18px;padding:18px;color:var(--muted)}.empty-exams-state strong,.question-empty strong{color:var(--white)}
    .question-list-mini{display:grid;gap:8px;max-height:260px;overflow:auto;padding-right:3px}.question-mini-row{display:grid;grid-template-columns:minmax(0,1fr) 36px;gap:7px}.question-mini-row button:first-child{min-height:58px;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:var(--white);text-align:left;padding:10px;cursor:pointer}.question-mini-row strong{display:block;font-size:12px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.question-mini-row span{display:block;margin-top:4px;color:var(--green);font-size:11px;font-weight:850}.danger-mini{border:1px solid rgba(255,87,87,.25);border-radius:12px;background:rgba(255,87,87,.08);color:var(--danger);font-size:20px;cursor:pointer}.question-editor{margin-top:16px;border-top:1px solid var(--line);padding-top:16px}.question-editor-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.question-editor-head button{border:1px solid rgba(255,255,255,.1);border-radius:999px;background:rgba(255,255,255,.035);color:var(--white);font-size:12px;font-weight:900;padding:7px 11px;cursor:pointer}.answer-grid{display:grid;gap:8px;margin:10px 0 12px}.answer-input{display:grid;grid-template-columns:42px minmax(0,1fr);gap:8px;align-items:center;border:1px solid rgba(255,255,255,.075);border-radius:14px;background:rgba(255,255,255,.025);padding:8px}.answer-input.active{border-color:rgba(99,229,70,.32);background:rgba(99,229,70,.07)}.answer-input button{width:34px;height:34px;border-radius:10px;border:1px solid rgba(99,229,70,.22);background:rgba(99,229,70,.08);color:var(--green);font-weight:950;cursor:pointer}.answer-input input{width:100%;border:0;outline:0;background:transparent;color:var(--white)}.question-submit-row{display:grid;grid-template-columns:96px minmax(0,1fr);gap:10px;align-items:end}.question-submit-row label{display:grid;gap:7px}
    @media(max-width:1520px){.exam-command-grid{grid-template-columns:300px minmax(0,1fr)}.question-bank-card{grid-column:1/-1;position:static}.exam-metric-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:1120px){.exam-admin-page{grid-template-columns:1fr}.exam-side-rail{position:relative;height:auto}.exam-command-grid,.exam-hero-reset,.exam-form-grid{grid-template-columns:1fr}.academic-map-card{position:static}.exam-metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.exam-topbar{align-items:flex-start;flex-direction:column}.premium-exam-row{grid-template-columns:1fr}.exam-submit-row{align-items:stretch;flex-direction:column}.exam-side-nav{grid-template-columns:1fr 1fr 1fr}}@media(max-width:720px){.exam-workspace{padding:14px}.exam-hero-reset{padding:20px;border-radius:22px}.exam-hero-copy h1{font-size:42px}.exam-metric-grid{grid-template-columns:1fr}.exam-side-nav{grid-template-columns:1fr}.question-submit-row{grid-template-columns:1fr}}
  `}</style>;
}
