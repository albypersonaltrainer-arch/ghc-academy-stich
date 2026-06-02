"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
const BUILD_ID = "EXAMS-EDITOR-FIX-02 · 2026-06-02";

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
  const examEditorRef = useRef<HTMLElement | null>(null);
  const questionEditorRef = useRef<HTMLFormElement | null>(null);

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

  function scrollToExamEditor() {
    window.setTimeout(() => {
      examEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  function scrollToQuestionEditor() {
    window.setTimeout(() => {
      questionEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
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
    setNotice(`Modo edición abierto: ${String(exam.title || "Examen GHC")}. Modifica los campos del editor y pulsa Guardar examen.`);
    scrollToExamEditor();
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
    <main className="exam-admin-page exam-command-room">
      <ExamGlobalStyles />
      <ExamBackground />

      <aside className="ghc-eval-sidebar">
        <div className="ghc-eval-brand">
          <GHCLogo size="md" showText tagline={false} />
        </div>

        <div className="sidebar-command-card">
          <span>Control Center</span>
          <strong>Evaluation Room</strong>
          <p>Gestión real de evaluaciones, exámenes finales y banco de preguntas.</p>
        </div>

        <nav className="sidebar-actions" aria-label="Navegación evaluación GHC">
          <button type="button" onClick={() => router.push("/ghc-control-center")}>← Panel principal</button>
          <button type="button" onClick={() => prepareNewExam(selectedScope)}>+ Nuevo examen</button>
          <button type="button" onClick={() => refresh("Datos refrescados desde Supabase.")}>{isRefreshing ? "Refrescando..." : "Refrescar datos"}</button>
        </nav>

        <div className="workflow-card">
          <span>Flujo seguro</span>
          <ol>
            <li className={selectedCourse ? "done" : ""}>Curso seleccionado</li>
            <li className={selectedScope === "course" || selectedModule ? "done" : ""}>Contexto académico</li>
            <li className={selectedExamId ? "done" : ""}>Examen guardado</li>
            <li className={activeQuestions.length ? "done" : ""}>Preguntas A/B/C/D</li>
          </ol>
        </div>

        <div className="sidebar-user-card">
          <span>{getInitials(adminName)}</span>
          <div>
            <strong>{shortName(adminName)}</strong>
            <p>Administrador</p>
          </div>
        </div>
      </aside>

      <section className="evaluation-stage">
        <header className="evaluation-topbar">
          <div className="evaluation-breadcrumb">
            <span>GHC Academy</span>
            <em>›</em>
            <strong>Centro de Evaluación</strong>
          </div>
          <div className="evaluation-top-actions">
            <span>{BUILD_ID}</span>
            <button type="button" onClick={() => router.push("/ghc-control-center")}>Volver al admin</button>
          </div>
        </header>

        {notice ? <div className="exam-notice"><strong>Estado</strong><span>{notice}</span></div> : null}

        <section className="evaluation-hero">
          <div className="hero-copy-block">
            <p className="exam-kicker">Evaluación · certificación · ciencia aplicada</p>
            <h1>Centro de Evaluación GHC</h1>
            <p>
              Una cabina premium para crear evaluaciones de lección, exámenes de módulo y examen final,
              con preguntas A/B/C/D, publicación controlada y edición real mediante Supabase RPC.
            </p>
            <div className="hero-cta-row">
              <button type="button" onClick={() => prepareNewExam("lesson")}>Evaluación de lección</button>
              <button type="button" onClick={() => prepareNewExam("module")}>Examen de módulo</button>
              <button type="button" onClick={() => prepareNewExam("course")}>Examen final</button>
            </div>
          </div>

          <div className="hero-system-visual" aria-hidden="true">
            <div className="system-core">
              <span>{stats.published}</span>
              <strong>publicados</strong>
            </div>
            <div className="system-line one" />
            <div className="system-line two" />
            <div className="system-node a">Curso</div>
            <div className="system-node b">Módulo</div>
            <div className="system-node c">Lección</div>
            <div className="system-node d">Certificación</div>
          </div>
        </section>

        <section className="exam-metric-grid command-metrics">
          <MetricCard label="Exámenes" value={stats.exams} helper="Total Supabase" />
          <MetricCard label="Preguntas" value={stats.questions} helper="Banco real" />
          <MetricCard label="Publicados" value={stats.published} helper={`${stats.draft} borradores`} />
          <MetricCard label="Intentos" value={stats.attempts} helper="exam_attempts" />
          <MetricCard label="Sin preguntas" value={stats.withoutQuestions} helper="Revisar antes de publicar" warning={stats.withoutQuestions > 0} />
        </section>

        <section className="evaluation-grid">
          <aside className="academic-command-panel">
            <div className="panel-heading">
              <span>01</span>
              <div>
                <h2>Mapa académico</h2>
                <p>El examen nace ligado a un curso, módulo o lección concreta.</p>
              </div>
            </div>

            <label className="premium-field course-field">
              <span>Curso activo</span>
              <select value={selectedCourseId} onChange={(event) => handleCourseChange(event.target.value)}>
                {courses.length ? courses.map((course) => (
                  <option key={String(course.id)} value={String(course.id)}>{course.title || "Curso GHC"}</option>
                )) : <option value="">Sin cursos</option>}
              </select>
            </label>

            <div className="scope-orbit" aria-label="Tipo de evaluación">
              <button type="button" className={selectedScope === "lesson" ? "active" : ""} onClick={() => handleScopeChange("lesson")}>
                <span>01</span><strong>Lección</strong><small>Evaluación corta</small>
              </button>
              <button type="button" className={selectedScope === "module" ? "active" : ""} onClick={() => handleScopeChange("module")}>
                <span>02</span><strong>Módulo</strong><small>Bloque académico</small>
              </button>
              <button type="button" className={selectedScope === "course" ? "active" : ""} onClick={() => handleScopeChange("course")}>
                <span>03</span><strong>Final</strong><small>Certificación</small>
              </button>
            </div>

            <div className="module-timeline">
              <div className="mini-section-title">
                <strong>Módulos</strong>
                <span>{modulesForCourse.length}</span>
              </div>
              {modulesForCourse.length ? modulesForCourse.map((module, index) => {
                const active = String(module.id) === String(selectedModule?.id || "");
                return (
                  <button key={String(module.id || index)} type="button" className={active ? "timeline-item active" : "timeline-item"} onClick={() => handleModuleChange(String(module.id || ""))}>
                    <span>M{index + 1}</span>
                    <strong>{module.title || `Módulo ${index + 1}`}</strong>
                  </button>
                );
              }) : <div className="empty-mini">Este curso aún no tiene módulos.</div>}
            </div>

            <div className="lesson-rail">
              <div className="mini-section-title">
                <strong>Lecciones</strong>
                <span>{lessonsForModule.length}</span>
              </div>
              {lessonsForModule.length ? lessonsForModule.map((lesson, index) => {
                const active = String(lesson.id) === String(selectedLesson?.id || "");
                return (
                  <button key={String(lesson.id || index)} type="button" className={active ? "lesson-chip active" : "lesson-chip"} onClick={() => handleLessonChange(String(lesson.id || ""))}>
                    <span>L{index + 1}</span>
                    <strong>{lesson.title || `Lección ${index + 1}`}</strong>
                  </button>
                );
              }) : <div className="empty-mini">Este módulo aún no tiene lecciones.</div>}
            </div>
          </aside>

          <section className="exam-console-column">
            <article className={examMode === "editExam" ? "exam-editor-console editing" : "exam-editor-console"} ref={examEditorRef}>
              <div className="console-header">
                <div>
                  <p className="exam-kicker">{examMode === "editExam" ? "Modo edición activo" : "Nueva estructura"}</p>
                  <h2>{examMode === "editExam" ? "Editor de examen" : "Crear examen"}</h2>
                  <p>{examMode === "editExam" ? "El examen está cargado. Cambia los campos y pulsa Guardar examen." : "Define el examen dentro del contexto seleccionado."}</p>
                </div>
                <div className="console-status">
                  <span>{examMode === "editExam" ? "EDITANDO" : "BORRADOR"}</span>
                  <strong>{activeQuestions.length}</strong>
                  <small>preguntas</small>
                </div>
              </div>

              <form className="console-form" onSubmit={handleExamSubmit}>
                <label className="premium-field title-field">
                  <span>Título del examen</span>
                  <input value={examForm.title} onChange={(event) => setExamForm({ ...examForm, title: event.target.value })} placeholder="Evaluación de lección" />
                </label>

                <div className="form-row-three">
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
                    <span>Nota mínima</span>
                    <input value={examForm.passingScore} onChange={(event) => setExamForm({ ...examForm, passingScore: event.target.value })} inputMode="numeric" />
                  </label>
                </div>

                <label className="premium-field">
                  <span>Instrucciones / descripción</span>
                  <textarea value={examForm.description} onChange={(event) => setExamForm({ ...examForm, description: event.target.value })} placeholder="Texto de contexto para el alumno o notas internas de evaluación..." />
                </label>

                <div className="exam-submit-row console-actions">
                  <div>
                    <strong>{selectedExamId ? "Examen guardado en Supabase" : "Pendiente de guardar"}</strong>
                    <p>{selectedExamAttempts.length} intentos registrados · {getScopeLabel(examForm.scope)}</p>
                  </div>
                  <div>
                    <button type="button" className="ghost-action" onClick={() => prepareNewExam(selectedScope)}>Limpiar</button>
                    <button type="submit" disabled={busy}>{busy ? "Guardando..." : examMode === "editExam" ? "Guardar examen" : "Crear examen"}</button>
                  </div>
                </div>
              </form>
            </article>

            <article className="exam-catalog-console">
              <div className="panel-heading compact">
                <span>03</span>
                <div>
                  <h2>Exámenes del curso</h2>
                  <p>Listado real del curso seleccionado. Editar carga el examen en la consola superior.</p>
                </div>
              </div>

              <div className="exam-catalog-list">
                {examsForCourse.length ? examsForCourse.map((exam) => {
                  const examId = String(exam.id || "");
                  const questionCount = data.examQuestions.filter((question) => String(question.exam_id) === examId).length;
                  const isActive = selectedExamId === examId;
                  return (
                    <article key={examId} className={isActive ? "exam-catalog-row active" : "exam-catalog-row"}>
                      <div className="catalog-scope">
                        <span className={`scope-badge ${normalizeScope(exam.exam_scope)}`}>{getScopeLabel(normalizeScope(exam.exam_scope))}</span>
                      </div>
                      <div>
                        <strong>{exam.title || "Examen GHC"}</strong>
                        <p>{questionCount} preguntas · {getStatusLabel(normalizeStatus(exam.status))} · Nota {exam.passing_score ?? exam.pass_score ?? 70}%</p>
                      </div>
                      <button type="button" className="row-edit-button" onClick={() => loadExamIntoEditor(exam)}>{isActive ? "Editando" : "Editar"}</button>
                    </article>
                  );
                }) : (
                  <div className="empty-exams-state">
                    <strong>Este curso aún no tiene exámenes</strong>
                    <p>Crea una evaluación de lección, un examen de módulo o un examen final desde la consola superior.</p>
                  </div>
                )}
              </div>
            </article>
          </section>

          <aside className="question-forge-panel">
            <div className="panel-heading">
              <span>04</span>
              <div>
                <h2>Banco de preguntas</h2>
                <p>Preguntas A/B/C/D asociadas al examen activo.</p>
              </div>
            </div>

            <div className="question-stack">
              {activeQuestions.length ? activeQuestions.map((question, index) => (
                <div key={String(question.id || index)} className="question-card-mini">
                  <button type="button" onClick={() => { editQuestion(question); scrollToQuestionEditor(); }}>
                    <span>Q{index + 1}</span>
                    <strong>{question.question}</strong>
                    <small>Correcta: {question.correct_option || "—"}</small>
                  </button>
                  <button type="button" className="delete-question" onClick={() => deleteQuestion(String(question.id || ""))}>×</button>
                </div>
              )) : (
                <div className="question-empty">
                  <strong>Sin preguntas todavía</strong>
                  <p>Guarda el examen y crea la primera pregunta.</p>
                </div>
              )}
            </div>

            <form className={questionMode === "editQuestion" ? "question-forge-form editing" : "question-forge-form"} ref={questionEditorRef} onSubmit={handleQuestionSubmit}>
              <div className="question-editor-head">
                <div>
                  <strong>{questionMode === "editQuestion" ? "Editar pregunta" : "Nueva pregunta"}</strong>
                  <p>{selectedExamId ? "Vinculada al examen activo" : "Primero guarda un examen"}</p>
                </div>
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
                <span>Explicación</span>
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
    :root{--green:${GREEN};--bg:#050706;--ink:#f4f6f2;--muted:rgba(244,246,242,.66);--soft:rgba(244,246,242,.42);--line:rgba(255,255,255,.09);--panel:rgba(10,14,12,.88);--panel2:rgba(14,20,16,.94);--danger:#ff5757;--warning:#f7c948;--gold:#d7b56d}*{box-sizing:border-box}html,body{margin:0;background:var(--bg)}body{color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}button,input,select,textarea{font:inherit}button{transition:.18s ease}button:hover{transform:translateY(-1px)}
    .exam-admin-loading{min-height:100vh;display:grid;place-items:center;background:#050706;color:var(--ink);position:relative}.exam-loading-card{position:relative;z-index:2;width:min(560px,calc(100vw - 40px));border:1px solid rgba(99,229,70,.22);border-radius:30px;background:linear-gradient(145deg,rgba(255,255,255,.08),rgba(255,255,255,.025));padding:34px;box-shadow:0 30px 90px rgba(0,0,0,.45)}.exam-loading-card h1{margin:18px 0 0;font-size:42px;letter-spacing:-.06em;line-height:.95}.exam-loading-card p{color:var(--muted);line-height:1.55}.exam-bg{position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden}.exam-orb{position:absolute;width:680px;height:680px;border-radius:999px;filter:blur(130px)}.exam-orb.one{left:-320px;top:-300px;background:rgba(99,229,70,.12)}.exam-orb.two{right:-340px;top:10vh;background:rgba(255,255,255,.06)}.exam-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:44px 44px;opacity:.43;mask-image:radial-gradient(circle at center,black 0%,transparent 86%)}
    .exam-admin-page{min-height:100vh;display:grid;grid-template-columns:304px minmax(0,1fr);background:var(--bg);color:var(--ink);position:relative}.ghc-eval-sidebar{position:sticky;top:0;height:100vh;z-index:2;border-right:1px solid var(--line);background:linear-gradient(180deg,rgba(5,8,7,.985),rgba(3,5,4,.94));padding:24px;display:flex;flex-direction:column}.ghc-eval-brand{min-height:64px;display:flex;align-items:center}.sidebar-command-card{margin-top:28px;border:1px solid rgba(99,229,70,.18);border-radius:24px;background:radial-gradient(circle at 90% 0%,rgba(99,229,70,.20),transparent 42%),linear-gradient(145deg,rgba(255,255,255,.07),rgba(255,255,255,.024));padding:20px;box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 24px 70px rgba(0,0,0,.20)}.sidebar-command-card span,.exam-kicker{display:block;color:var(--green);text-transform:uppercase;letter-spacing:.18em;font-size:10px;font-weight:950}.sidebar-command-card strong{display:block;margin-top:10px;font-size:29px;line-height:.92;letter-spacing:-.06em}.sidebar-command-card p{margin:12px 0 0;color:var(--muted);font-size:13px;line-height:1.55}.sidebar-actions{display:grid;gap:9px;margin-top:22px}.sidebar-actions button{min-height:45px;border-radius:14px;border:1px solid rgba(255,255,255,.085);background:rgba(255,255,255,.035);color:var(--ink);font-weight:900;text-align:left;padding:0 14px;cursor:pointer}.sidebar-actions button:first-child{background:linear-gradient(135deg,#7cff55,var(--green));border-color:transparent;color:#061008}.workflow-card{margin-top:18px;border:1px solid var(--line);border-radius:22px;background:rgba(255,255,255,.028);padding:16px}.workflow-card>span{display:block;color:var(--soft);text-transform:uppercase;letter-spacing:.14em;font-size:10px;font-weight:950}.workflow-card ol{list-style:none;margin:14px 0 0;padding:0;display:grid;gap:10px}.workflow-card li{position:relative;display:flex;align-items:center;gap:10px;color:var(--muted);font-size:13px;font-weight:800}.workflow-card li:before{content:"";width:22px;height:22px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.025)}.workflow-card li.done{color:var(--ink)}.workflow-card li.done:before{background:var(--green);border-color:var(--green);box-shadow:0 0 18px rgba(99,229,70,.32)}.sidebar-user-card{margin-top:auto;border:1px solid var(--line);border-radius:18px;background:rgba(255,255,255,.035);padding:14px;display:grid;grid-template-columns:42px 1fr;gap:11px;align-items:center}.sidebar-user-card>span{width:42px;height:42px;border-radius:999px;display:grid;place-items:center;background:rgba(99,229,70,.1);border:1px solid rgba(99,229,70,.2);color:var(--green);font-weight:950}.sidebar-user-card p{margin:3px 0 0;color:var(--muted);font-size:12px}
    .evaluation-stage{position:relative;z-index:1;min-width:0;padding:20px 24px 38px}.evaluation-topbar{min-height:60px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:18px}.evaluation-breadcrumb{display:flex;gap:10px;align-items:center;color:var(--muted);font-size:13px;font-weight:850}.evaluation-breadcrumb strong{color:var(--ink)}.evaluation-breadcrumb em{font-style:normal;color:var(--soft)}.evaluation-top-actions{display:flex;align-items:center;gap:10px}.evaluation-top-actions span{border:1px solid rgba(99,229,70,.18);border-radius:999px;background:rgba(99,229,70,.06);color:var(--green);font-size:11px;font-weight:950;padding:8px 12px}.evaluation-top-actions button{min-height:40px;border:1px solid rgba(255,255,255,.11);border-radius:999px;background:rgba(255,255,255,.04);color:var(--ink);font-weight:900;padding:0 14px;cursor:pointer}.exam-notice{margin-bottom:14px;border:1px solid rgba(99,229,70,.20);border-radius:16px;background:linear-gradient(90deg,rgba(99,229,70,.08),rgba(255,255,255,.025));color:var(--muted);padding:13px 15px;display:flex;gap:10px;align-items:flex-start}.exam-notice strong{color:var(--green);text-transform:uppercase;letter-spacing:.12em;font-size:11px}.exam-notice span{line-height:1.45}
    .evaluation-hero{min-height:252px;border:1px solid var(--line);border-radius:32px;background:radial-gradient(circle at 82% 20%,rgba(99,229,70,.18),transparent 30%),linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.02));box-shadow:0 34px 120px rgba(0,0,0,.30);display:grid;grid-template-columns:minmax(0,1fr) 420px;gap:24px;align-items:center;padding:32px;overflow:hidden}.hero-copy-block h1{margin:0;font-size:clamp(52px,5.4vw,88px);line-height:.84;letter-spacing:-.085em}.hero-copy-block p:not(.exam-kicker){max-width:850px;color:var(--muted);font-size:16px;line-height:1.65}.hero-cta-row{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}.hero-cta-row button{min-height:42px;border-radius:999px;border:1px solid rgba(99,229,70,.24);background:rgba(99,229,70,.07);color:var(--green);font-weight:950;padding:0 15px;cursor:pointer}.hero-cta-row button:first-child{background:linear-gradient(135deg,#7cff55,var(--green));color:#061008;border-color:transparent}.hero-system-visual{position:relative;min-height:210px;border:1px solid rgba(99,229,70,.18);border-radius:26px;background:linear-gradient(145deg,rgba(5,8,7,.52),rgba(255,255,255,.03));overflow:hidden}.system-core{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:118px;height:118px;border-radius:999px;display:grid;place-items:center;align-content:center;background:radial-gradient(circle,rgba(99,229,70,.22),rgba(99,229,70,.05));border:1px solid rgba(99,229,70,.28);box-shadow:0 0 50px rgba(99,229,70,.16)}.system-core span{font-size:34px;font-weight:950;line-height:1}.system-core strong{color:var(--green);font-size:11px;text-transform:uppercase;letter-spacing:.13em}.system-line{position:absolute;left:20%;right:20%;top:50%;height:1px;background:linear-gradient(90deg,transparent,rgba(99,229,70,.42),transparent)}.system-line.two{transform:rotate(90deg)}.system-node{position:absolute;border-radius:999px;border:1px solid rgba(255,255,255,.11);background:rgba(255,255,255,.045);padding:8px 10px;font-size:11px;font-weight:950;color:var(--muted)}.system-node.a{left:28px;top:28px}.system-node.b{right:28px;top:28px}.system-node.c{left:28px;bottom:28px}.system-node.d{right:28px;bottom:28px;color:var(--green);border-color:rgba(99,229,70,.22);background:rgba(99,229,70,.07)}
    .exam-metric-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin-top:14px}.metric-card{min-height:116px;border:1px solid var(--line);border-radius:22px;background:linear-gradient(145deg,rgba(255,255,255,.06),rgba(255,255,255,.022));padding:16px;box-shadow:0 20px 64px rgba(0,0,0,.18)}.metric-card span{color:var(--muted);font-size:12px;font-weight:850}.metric-card strong{display:block;margin-top:10px;font-size:34px;line-height:1;letter-spacing:-.05em}.metric-card p{margin:7px 0 0;color:var(--muted);font-size:12px}.metric-card.warning strong{color:var(--warning)}
    .evaluation-grid{display:grid;grid-template-columns:350px minmax(0,1fr) 440px;gap:14px;align-items:start;margin-top:14px}.academic-command-panel,.exam-editor-console,.exam-catalog-console,.question-forge-panel{border:1px solid var(--line);border-radius:26px;background:linear-gradient(180deg,rgba(11,16,13,.92),rgba(7,10,8,.88));box-shadow:0 28px 90px rgba(0,0,0,.24);padding:18px}.academic-command-panel,.question-forge-panel{position:sticky;top:20px}.exam-console-column{display:grid;gap:14px}.panel-heading{display:grid;grid-template-columns:44px minmax(0,1fr);gap:12px;align-items:start;margin-bottom:16px}.panel-heading.compact{margin-bottom:12px}.panel-heading>span{width:44px;height:44px;border-radius:15px;display:grid;place-items:center;background:rgba(99,229,70,.1);border:1px solid rgba(99,229,70,.2);color:var(--green);font-weight:950}.panel-heading h2{margin:0;font-size:25px;line-height:1;letter-spacing:-.045em}.panel-heading p{margin:7px 0 0;color:var(--muted);font-size:13px;line-height:1.45}.premium-field{display:grid;gap:7px;margin-bottom:12px}.premium-field span,.question-submit-row span{color:var(--soft);font-size:10px;text-transform:uppercase;letter-spacing:.14em;font-weight:950}.premium-field input,.premium-field select,.premium-field textarea,.question-submit-row input{width:100%;border:1px solid rgba(255,255,255,.095);border-radius:14px;background:rgba(255,255,255,.035);color:var(--ink);outline:0;padding:12px 13px}.premium-field select option{background:#080b0a;color:var(--ink)}.premium-field textarea{min-height:106px;resize:vertical;line-height:1.55}.course-field select{min-height:50px;border-color:rgba(99,229,70,.18);background:rgba(99,229,70,.055)}.scope-orbit{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:14px 0}.scope-orbit button{min-height:86px;border-radius:18px;border:1px solid rgba(255,255,255,.085);background:rgba(255,255,255,.03);color:var(--ink);cursor:pointer;text-align:left;padding:12px;font-weight:900}.scope-orbit button span{display:block;color:var(--soft);font-size:10px}.scope-orbit button strong{display:block;margin-top:6px;color:var(--ink);font-size:14px}.scope-orbit button small{display:block;margin-top:4px;color:var(--muted);font-size:11px;line-height:1.2}.scope-orbit button.active{border-color:rgba(99,229,70,.36);background:rgba(99,229,70,.105);box-shadow:inset 0 0 0 1px rgba(99,229,70,.12)}.scope-orbit button.active strong,.scope-orbit button.active span{color:var(--green)}.mini-section-title{display:flex;align-items:center;justify-content:space-between;margin:16px 0 8px;color:var(--muted)}.mini-section-title strong{color:var(--ink);font-size:13px}.mini-section-title span{width:26px;height:26px;border-radius:999px;display:grid;place-items:center;background:rgba(99,229,70,.08);color:var(--green);font-weight:950;font-size:11px}.module-timeline,.lesson-rail{display:grid;gap:8px}.timeline-item,.lesson-chip{width:100%;border:1px solid rgba(255,255,255,.075);border-radius:15px;background:rgba(255,255,255,.026);color:var(--ink);text-align:left;display:grid;grid-template-columns:38px minmax(0,1fr);gap:9px;align-items:center;padding:10px;cursor:pointer}.timeline-item span,.lesson-chip span{width:34px;height:34px;border-radius:12px;display:grid;place-items:center;background:rgba(255,255,255,.055);color:var(--soft);font-size:11px;font-weight:950}.timeline-item strong,.lesson-chip strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:13px}.timeline-item.active,.lesson-chip.active{border-color:rgba(99,229,70,.30);background:rgba(99,229,70,.07)}.timeline-item.active span,.lesson-chip.active span{background:var(--green);color:#061008}.empty-mini{border:1px dashed rgba(255,255,255,.12);border-radius:15px;padding:12px;color:var(--muted);font-size:13px}
    .console-header{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:18px}.console-header h2{margin:0;font-size:34px;line-height:.95;letter-spacing:-.06em}.console-header p:not(.exam-kicker){margin:8px 0 0;color:var(--muted);font-size:13px;line-height:1.45}.console-status{width:118px;min-height:118px;border-radius:26px;border:1px solid rgba(99,229,70,.24);background:radial-gradient(circle at center,rgba(99,229,70,.17),rgba(99,229,70,.045));display:grid;place-items:center;align-content:center}.console-status span{color:var(--green);font-size:10px;text-transform:uppercase;letter-spacing:.14em;font-weight:950}.console-status strong{font-size:36px;line-height:1}.console-status small{color:var(--muted);font-size:12px}.exam-editor-console.editing{border-color:rgba(99,229,70,.34);box-shadow:0 30px 100px rgba(0,0,0,.28),inset 0 0 0 1px rgba(99,229,70,.12)}.console-form{display:grid;gap:12px}.title-field input{min-height:54px;font-size:18px;font-weight:850}.form-row-three{display:grid;grid-template-columns:1fr 1fr 130px;gap:12px}.exam-submit-row{border:1px solid rgba(99,229,70,.18);border-radius:20px;background:rgba(99,229,70,.055);padding:14px;display:flex;align-items:center;justify-content:space-between;gap:14px}.exam-submit-row p{margin:4px 0 0;color:var(--muted);font-size:12px}.console-actions>div:last-child{display:flex;gap:8px}.exam-submit-row button,.question-submit-row button{min-height:44px;border:0;border-radius:999px;background:linear-gradient(135deg,#7cff55,var(--green));color:#061008;font-weight:950;padding:0 18px;cursor:pointer}.exam-submit-row .ghost-action{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:var(--ink)}.exam-submit-row button:disabled,.question-submit-row button:disabled{opacity:.45;cursor:not-allowed}.exam-catalog-list{display:grid;gap:10px}.exam-catalog-row{min-height:86px;border-radius:18px;border:1px solid rgba(255,255,255,.085);background:linear-gradient(145deg,rgba(255,255,255,.052),rgba(255,255,255,.018));display:grid;grid-template-columns:160px minmax(0,1fr) 104px;gap:12px;align-items:center;padding:13px}.exam-catalog-row:hover,.exam-catalog-row.active{border-color:rgba(99,229,70,.30);background:rgba(99,229,70,.075)}.exam-catalog-row.active{box-shadow:inset 4px 0 0 var(--green),0 18px 44px rgba(0,0,0,.20)}.exam-catalog-row p{margin:5px 0 0;color:var(--muted);font-size:12px}.row-edit-button{min-height:40px;border-radius:999px;border:1px solid rgba(99,229,70,.28);background:rgba(99,229,70,.08);color:var(--green);font-weight:950;cursor:pointer}.exam-catalog-row.active .row-edit-button{background:linear-gradient(135deg,#7cff55,var(--green));border-color:transparent;color:#061008}.scope-badge{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;border:1px solid rgba(99,229,70,.24);background:rgba(99,229,70,.09);color:var(--green);padding:7px 9px;text-align:center;font-size:10px;text-transform:uppercase;letter-spacing:.08em;font-weight:950}.scope-badge.module{border-color:rgba(247,201,72,.25);background:rgba(247,201,72,.09);color:var(--warning)}.scope-badge.course{border-color:rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:var(--ink)}.empty-exams-state,.question-empty{border:1px dashed rgba(255,255,255,.15);border-radius:18px;padding:18px;color:var(--muted)}.empty-exams-state strong,.question-empty strong{color:var(--ink)}
    .question-stack{display:grid;gap:8px;max-height:282px;overflow:auto;padding-right:3px}.question-card-mini{display:grid;grid-template-columns:minmax(0,1fr) 36px;gap:7px}.question-card-mini button:first-child{min-height:66px;border-radius:15px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:var(--ink);text-align:left;padding:10px;cursor:pointer;display:grid;grid-template-columns:34px minmax(0,1fr);gap:8px;align-items:center}.question-card-mini button:first-child span{grid-row:1/3;width:30px;height:30px;border-radius:10px;display:grid;place-items:center;background:rgba(99,229,70,.08);color:var(--green);font-size:11px;font-weight:950}.question-card-mini strong{display:block;font-size:12px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.question-card-mini small{display:block;color:var(--green);font-size:11px;font-weight:850}.delete-question{border:1px solid rgba(255,87,87,.25);border-radius:12px;background:rgba(255,87,87,.08);color:var(--danger);font-size:20px;cursor:pointer}.question-forge-form{margin-top:16px;border-top:1px solid var(--line);padding-top:16px}.question-forge-form.editing{border:1px solid rgba(99,229,70,.28);border-radius:20px;background:rgba(99,229,70,.045);padding:16px;margin-top:16px}.question-editor-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}.question-editor-head strong{display:block;font-size:17px}.question-editor-head p{margin:4px 0 0;color:var(--muted);font-size:12px}.question-editor-head button{border:1px solid rgba(255,255,255,.1);border-radius:999px;background:rgba(255,255,255,.035);color:var(--ink);font-size:12px;font-weight:900;padding:7px 11px;cursor:pointer}.answer-grid{display:grid;gap:8px;margin:10px 0 12px}.answer-input{display:grid;grid-template-columns:42px minmax(0,1fr);gap:8px;align-items:center;border:1px solid rgba(255,255,255,.075);border-radius:14px;background:rgba(255,255,255,.025);padding:8px}.answer-input.active{border-color:rgba(99,229,70,.32);background:rgba(99,229,70,.07)}.answer-input button{width:34px;height:34px;border-radius:10px;border:1px solid rgba(99,229,70,.22);background:rgba(99,229,70,.08);color:var(--green);font-weight:950;cursor:pointer}.answer-input input{width:100%;border:0;outline:0;background:transparent;color:var(--ink)}.question-submit-row{display:grid;grid-template-columns:96px minmax(0,1fr);gap:10px;align-items:end}.question-submit-row label{display:grid;gap:7px}
    @media(max-width:1580px){.evaluation-grid{grid-template-columns:330px minmax(0,1fr)}.question-forge-panel{grid-column:1/-1;position:static}.exam-metric-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:1160px){.exam-admin-page{grid-template-columns:1fr}.ghc-eval-sidebar{position:relative;height:auto}.evaluation-grid,.evaluation-hero,.form-row-three{grid-template-columns:1fr}.academic-command-panel{position:static}.exam-metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.evaluation-topbar{align-items:flex-start;flex-direction:column}.exam-catalog-row{grid-template-columns:1fr}.exam-submit-row{align-items:stretch;flex-direction:column}.scope-orbit{grid-template-columns:1fr}.sidebar-actions{grid-template-columns:1fr 1fr 1fr}.hero-system-visual{display:none}}@media(max-width:760px){.evaluation-stage{padding:14px}.evaluation-hero{padding:20px;border-radius:22px}.hero-copy-block h1{font-size:42px}.exam-metric-grid{grid-template-columns:1fr}.sidebar-actions{grid-template-columns:1fr}.question-submit-row{grid-template-columns:1fr}.console-header{flex-direction:column}.console-status{width:100%;min-height:94px}.console-actions>div:last-child{flex-direction:column}.exam-submit-row button{width:100%}}
  `}</style>;
}
