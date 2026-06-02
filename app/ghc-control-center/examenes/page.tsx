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

type ExamFormState = {
  id?: string;
  courseId: string;
  moduleId: string;
  lessonId: string;
  title: string;
  description: string;
  examScope: ExamScope;
  passingScore: string;
  status: ExamStatus;
};

type QuestionFormState = {
  id?: string;
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

type DashboardData = {
  courses: AnyRecord[];
  modules: AnyRecord[];
  lessons: AnyRecord[];
  exams: AnyRecord[];
  examQuestions: AnyRecord[];
  examAttempts: AnyRecord[];
  profiles: AnyRecord[];
};

const GREEN = "#63E546";
const BUILD_ID = "EXAMS-PREMIUM-02 · 2026-06-02";

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
  profiles: [],
};

const emptyExamForm: ExamFormState = {
  courseId: "",
  moduleId: "",
  lessonId: "",
  title: "",
  description: "",
  examScope: "lesson",
  passingScore: "70",
  status: "draft",
};

const emptyQuestionForm: QuestionFormState = {
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

export default function ExamsAdminPage() {
  const router = useRouter();
  const [guardState, setGuardState] = useState<GuardState>("checking");
  const [data, setData] = useState<DashboardData>(emptyData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingExam, setIsSavingExam] = useState(false);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [notice, setNotice] = useState("");

  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [activeScope, setActiveScope] = useState<ExamScope>("lesson");
  const [selectedExamId, setSelectedExamId] = useState("");
  const [examSearch, setExamSearch] = useState("");

  const [examForm, setExamForm] = useState<ExamFormState>(emptyExamForm);
  const [questionForm, setQuestionForm] = useState<QuestionFormState>(emptyQuestionForm);

  useEffect(() => {
    async function protectAndLoad() {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError || !userData.user) {
          router.replace("/acceso");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userData.user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        const role = String(profile?.role || "").toLowerCase();
        if (!["admin", "superadmin", "owner"].includes(role)) {
          setGuardState("denied");
          router.replace("/alumno");
          return;
        }

        setGuardState("allowed");
        await refreshData("Gestor de exámenes conectado con Supabase.");
      } catch (error) {
        console.error(error);
        setGuardState("denied");
        router.replace("/alumno");
      }
    }

    protectAndLoad();
  }, [router]);

  async function refreshData(message?: string) {
    setIsLoading(true);
    try {
      const nextData = await loadDashboardData();
      setData(nextData);
      if (message) setNotice(message);

      const firstCourseId = selectedCourseId || String(nextData.courses[0]?.id || "");
      if (!selectedCourseId && firstCourseId) setSelectedCourseId(firstCourseId);
    } finally {
      setIsLoading(false);
    }
  }

  const selectedCourse = useMemo(
    () => data.courses.find((course) => String(course.id) === selectedCourseId) || data.courses[0] || null,
    [data.courses, selectedCourseId]
  );

  const modulesForCourse = useMemo(() => {
    if (!selectedCourse) return [];
    return data.modules
      .filter((module) => String(module.course_id) === String(selectedCourse.id))
      .slice()
      .sort((a, b) => Number(a.sort_order ?? a.position ?? 0) - Number(b.sort_order ?? b.position ?? 0));
  }, [data.modules, selectedCourse]);

  useEffect(() => {
    if (!selectedCourse) return;
    const currentModuleExists = modulesForCourse.some((module) => String(module.id) === selectedModuleId);
    const nextModuleId = currentModuleExists ? selectedModuleId : String(modulesForCourse[0]?.id || "");
    if (nextModuleId !== selectedModuleId) setSelectedModuleId(nextModuleId);
  }, [modulesForCourse, selectedCourse, selectedModuleId]);

  const selectedModule = useMemo(
    () => modulesForCourse.find((module) => String(module.id) === selectedModuleId) || modulesForCourse[0] || null,
    [modulesForCourse, selectedModuleId]
  );

  const lessonsForModule = useMemo(() => {
    if (!selectedModule) return [];
    return data.lessons
      .filter((lesson) => String(lesson.module_id) === String(selectedModule.id))
      .slice()
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  }, [data.lessons, selectedModule]);

  useEffect(() => {
    const currentLessonExists = lessonsForModule.some((lesson) => String(lesson.id) === selectedLessonId);
    const nextLessonId = currentLessonExists ? selectedLessonId : String(lessonsForModule[0]?.id || "");
    if (nextLessonId !== selectedLessonId) setSelectedLessonId(nextLessonId);
  }, [lessonsForModule, selectedLessonId]);

  const selectedLesson = useMemo(
    () => lessonsForModule.find((lesson) => String(lesson.id) === selectedLessonId) || lessonsForModule[0] || null,
    [lessonsForModule, selectedLessonId]
  );

  const scopedExams = useMemo(() => {
    const query = examSearch.trim().toLowerCase();

    return data.exams
      .filter((exam) => {
        const examCourseId = String(exam.course_id || "");
        if (selectedCourse && examCourseId !== String(selectedCourse.id)) return false;

        const scope = normalizeExamScope(exam.exam_scope);
        if (scope !== activeScope) return false;

        if (activeScope === "module" && selectedModule && exam.module_id && String(exam.module_id) !== String(selectedModule.id)) return false;
        if (activeScope === "lesson" && selectedLesson && exam.lesson_id && String(exam.lesson_id) !== String(selectedLesson.id)) return false;

        if (!query) return true;
        return [exam.title, exam.description, exam.status, exam.exam_scope].join(" ").toLowerCase().includes(query);
      })
      .slice()
      .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime());
  }, [data.exams, activeScope, selectedCourse, selectedModule, selectedLesson, examSearch]);

  const selectedExam = useMemo(
    () => data.exams.find((exam) => String(exam.id) === selectedExamId) || scopedExams[0] || null,
    [data.exams, selectedExamId, scopedExams]
  );

  useEffect(() => {
    const nextExamId = String(selectedExam?.id || "");
    if (nextExamId && nextExamId !== selectedExamId) {
      setSelectedExamId(nextExamId);
    }
  }, [selectedExam, selectedExamId]);

  const questionsForSelectedExam = useMemo(() => {
    if (!selectedExam) return [];
    return data.examQuestions
      .filter((question) => String(question.exam_id) === String(selectedExam.id))
      .slice()
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  }, [data.examQuestions, selectedExam]);

  const stats = useMemo(() => {
    const published = data.exams.filter((exam) => normalizeExamStatus(exam.status) === "published").length;
    const draft = data.exams.filter((exam) => normalizeExamStatus(exam.status) === "draft").length;
    const examsWithoutQuestions = data.exams.filter((exam) => !data.examQuestions.some((q) => String(q.exam_id) === String(exam.id))).length;

    return {
      exams: data.exams.length,
      questions: data.examQuestions.length,
      attempts: data.examAttempts.length,
      published,
      draft,
      examsWithoutQuestions,
    };
  }, [data]);

  function prepareNewExam(scope: ExamScope = activeScope) {
    const title = getDefaultExamTitle(scope, selectedCourse, selectedModule, selectedLesson);
    const nextForm: ExamFormState = {
      ...emptyExamForm,
      courseId: String(selectedCourse?.id || ""),
      moduleId: scope === "course" ? "" : String(selectedModule?.id || ""),
      lessonId: scope === "lesson" ? String(selectedLesson?.id || "") : "",
      title,
      description: "",
      examScope: scope,
      passingScore: "70",
      status: "draft",
    };

    setExamForm(nextForm);
    setQuestionForm(emptyQuestionForm);
    setSelectedExamId("");
    setNotice(`Nuevo ${getScopeLabel(scope).toLowerCase()} preparado. Revisa campos y guarda.`);
  }

  function editExam(exam: AnyRecord) {
    const scope = normalizeExamScope(exam.exam_scope);
    setActiveScope(scope);
    setSelectedExamId(String(exam.id || ""));
    setExamForm({
      id: String(exam.id || ""),
      courseId: String(exam.course_id || selectedCourse?.id || ""),
      moduleId: String(exam.module_id || ""),
      lessonId: String(exam.lesson_id || ""),
      title: String(exam.title || ""),
      description: String(exam.description || ""),
      examScope: scope,
      passingScore: String(exam.passing_score ?? exam.pass_score ?? 70),
      status: normalizeExamStatus(exam.status),
    });
    setQuestionForm({ ...emptyQuestionForm, examId: String(exam.id || ""), sortOrder: String(questionsForSelectedExam.length + 1) });
    setNotice(`Editando examen: ${exam.title || "sin título"}`);
  }

  function prepareNewQuestion() {
    if (!selectedExam?.id) {
      setNotice("Primero guarda o selecciona un examen antes de crear preguntas.");
      return;
    }

    setQuestionForm({
      ...emptyQuestionForm,
      examId: String(selectedExam.id),
      sortOrder: String(questionsForSelectedExam.length + 1),
    });
    setNotice("Nueva pregunta preparada. Rellena A/B/C/D y marca la correcta.");
  }

  function editQuestion(question: AnyRecord) {
    setQuestionForm({
      id: String(question.id || ""),
      examId: String(question.exam_id || selectedExam?.id || ""),
      question: String(question.question || ""),
      optionA: String(question.option_a || ""),
      optionB: String(question.option_b || ""),
      optionC: String(question.option_c || ""),
      optionD: String(question.option_d || ""),
      correctOption: normalizeCorrectOption(question.correct_option),
      sortOrder: String(question.sort_order || 1),
      explanation: String(question.explanation || ""),
    });
    setNotice("Pregunta cargada en el editor.");
  }

  async function submitExam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!examForm.courseId) {
      setNotice("Selecciona un curso antes de guardar el examen.");
      return;
    }

    if (examForm.examScope === "module" && !examForm.moduleId) {
      setNotice("Selecciona un módulo para crear un examen de módulo.");
      return;
    }

    if (examForm.examScope === "lesson" && !examForm.lessonId) {
      setNotice("Selecciona una lección para crear una evaluación de lección.");
      return;
    }

    if (!examForm.title.trim()) {
      setNotice("El examen necesita un título.");
      return;
    }

    setIsSavingExam(true);
    try {
      const passingScore = clampScore(examForm.passingScore);
      const payload = {
        p_course_id: examForm.courseId,
        p_module_id: examForm.examScope === "course" ? null : examForm.moduleId || null,
        p_lesson_id: examForm.examScope === "lesson" ? examForm.lessonId || null : null,
        p_title: examForm.title.trim(),
        p_description: examForm.description.trim() || null,
        p_exam_scope: examForm.examScope,
        p_passing_score: passingScore,
        p_status: examForm.status,
      };

      const response = examForm.id
        ? await supabase.rpc("ghc_admin_update_exam", { p_exam_id: examForm.id, ...payload })
        : await supabase.rpc("ghc_admin_create_exam", payload);

      if (response.error) throw response.error;

      const savedExam = response.data as AnyRecord;
      await refreshData(examForm.id ? "Examen actualizado correctamente." : "Examen creado correctamente.");
      setSelectedExamId(String(savedExam?.id || examForm.id || ""));
      setExamForm({
        ...examForm,
        id: String(savedExam?.id || examForm.id || ""),
      });
      setQuestionForm({ ...emptyQuestionForm, examId: String(savedExam?.id || examForm.id || ""), sortOrder: "1" });
    } catch (error) {
      console.error(error);
      setNotice(getErrorMessage(error, "No se pudo guardar el examen. Revisa las funciones RPC de Supabase."));
    } finally {
      setIsSavingExam(false);
    }
  }

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const examId = questionForm.examId || String(selectedExam?.id || "");
    if (!examId) {
      setNotice("Primero selecciona o guarda un examen.");
      return;
    }

    if (!questionForm.question.trim()) {
      setNotice("La pregunta no puede estar vacía.");
      return;
    }

    if (![questionForm.optionA, questionForm.optionB, questionForm.optionC, questionForm.optionD].every((value) => value.trim())) {
      setNotice("Las opciones A, B, C y D son obligatorias.");
      return;
    }

    setIsSavingQuestion(true);
    try {
      const payload = {
        p_exam_id: examId,
        p_question: questionForm.question.trim(),
        p_option_a: questionForm.optionA.trim(),
        p_option_b: questionForm.optionB.trim(),
        p_option_c: questionForm.optionC.trim(),
        p_option_d: questionForm.optionD.trim(),
        p_correct_option: questionForm.correctOption,
        p_sort_order: Math.max(1, Math.round(Number(questionForm.sortOrder) || 1)),
        p_explanation: questionForm.explanation.trim() || null,
      };

      const response = questionForm.id
        ? await supabase.rpc("ghc_admin_update_exam_question", { p_question_id: questionForm.id, ...payload })
        : await supabase.rpc("ghc_admin_create_exam_question", payload);

      if (response.error) throw response.error;

      await refreshData(questionForm.id ? "Pregunta actualizada correctamente." : "Pregunta creada correctamente.");
      setSelectedExamId(examId);
      setQuestionForm({ ...emptyQuestionForm, examId, sortOrder: String(questionsForSelectedExam.length + 2) });
    } catch (error) {
      console.error(error);
      setNotice(getErrorMessage(error, "No se pudo guardar la pregunta."));
    } finally {
      setIsSavingQuestion(false);
    }
  }

  async function deleteQuestion(question: AnyRecord) {
    const confirmation = window.confirm("¿Eliminar esta pregunta? Esta acción no elimina el examen.");
    if (!confirmation) return;

    try {
      const { error } = await supabase.rpc("ghc_admin_delete_exam_question", {
        p_question_id: String(question.id),
      });

      if (error) throw error;
      await refreshData("Pregunta eliminada correctamente.");
      setQuestionForm({ ...emptyQuestionForm, examId: String(selectedExam?.id || ""), sortOrder: String(Math.max(1, questionsForSelectedExam.length)) });
    } catch (error) {
      console.error(error);
      setNotice(getErrorMessage(error, "No se pudo eliminar la pregunta."));
    }
  }

  function changeCourse(courseId: string) {
    const nextCourse = data.courses.find((course) => String(course.id) === courseId);
    const nextModules = data.modules.filter((module) => String(module.course_id) === courseId);
    const nextModuleId = String(nextModules[0]?.id || "");
    const nextLessons = data.lessons.filter((lesson) => String(lesson.module_id) === nextModuleId);
    const nextLessonId = String(nextLessons[0]?.id || "");

    setSelectedCourseId(courseId);
    setSelectedModuleId(nextModuleId);
    setSelectedLessonId(nextLessonId);
    setSelectedExamId("");
    setQuestionForm(emptyQuestionForm);
    setExamForm({
      ...emptyExamForm,
      courseId,
      moduleId: nextModuleId,
      lessonId: nextLessonId,
      examScope: activeScope,
      title: getDefaultExamTitle(activeScope, nextCourse, nextModules[0], nextLessons[0]),
    });
  }

  function changeModule(moduleId: string) {
    const nextModule = data.modules.find((module) => String(module.id) === moduleId);
    const nextLessons = data.lessons.filter((lesson) => String(lesson.module_id) === moduleId);
    const nextLessonId = String(nextLessons[0]?.id || "");

    setSelectedModuleId(moduleId);
    setSelectedLessonId(nextLessonId);
    setSelectedExamId("");
    setQuestionForm(emptyQuestionForm);
    setExamForm({
      ...emptyExamForm,
      courseId: String(selectedCourse?.id || ""),
      moduleId,
      lessonId: nextLessonId,
      examScope: activeScope,
      title: getDefaultExamTitle(activeScope, selectedCourse, nextModule, nextLessons[0]),
    });
  }

  function changeLesson(lessonId: string) {
    const nextLesson = data.lessons.find((lesson) => String(lesson.id) === lessonId);
    setSelectedLessonId(lessonId);
    setSelectedExamId("");
    setQuestionForm(emptyQuestionForm);
    setExamForm({
      ...emptyExamForm,
      courseId: String(selectedCourse?.id || ""),
      moduleId: String(selectedModule?.id || ""),
      lessonId,
      examScope: activeScope,
      title: getDefaultExamTitle(activeScope, selectedCourse, selectedModule, nextLesson),
    });
  }

  function changeScope(scope: ExamScope) {
    setActiveScope(scope);
    setSelectedExamId("");
    setQuestionForm(emptyQuestionForm);
    setExamForm({
      ...emptyExamForm,
      courseId: String(selectedCourse?.id || ""),
      moduleId: scope === "course" ? "" : String(selectedModule?.id || ""),
      lessonId: scope === "lesson" ? String(selectedLesson?.id || "") : "",
      examScope: scope,
      title: getDefaultExamTitle(scope, selectedCourse, selectedModule, selectedLesson),
    });
  }

  if (guardState === "checking") {
    return (
      <main className="exam-admin-page exam-admin-loading">
        <ExamStyles />
        <ExamBackground />
        <section className="exam-admin-loading-card">
          <GHCLogo size="md" showText tagline={false} />
          <h1>Centro de evaluación GHC</h1>
          <p>Verificando permisos administrativos...</p>
        </section>
      </main>
    );
  }

  if (guardState !== "allowed") return null;

  return (
    <main className="exam-admin-page">
      <ExamStyles />
      <ExamBackground />

      <header className="exam-admin-topbar">
        <button type="button" className="exam-back-button" onClick={() => router.push("/ghc-control-center")}>← Control Center</button>
        <div className="exam-admin-brand"><GHCLogo size="sm" showText tagline={false} /></div>
        <div className="exam-admin-build"><span>{BUILD_ID}</span><strong>RPC segura · Supabase real</strong></div>
      </header>

      <section className="exam-admin-hero">
        <div>
          <p className="exam-kicker">Admin real · evaluación académica</p>
          <h1>Centro de evaluación</h1>
          <p>Crea y edita evaluaciones de lección, exámenes de módulo y examen final de curso sin tocar SQL manualmente. La publicación queda bajo control humano.</p>
          <div className="hero-actions">
            <button type="button" onClick={() => prepareNewExam("lesson")}>+ Evaluación de lección</button>
            <button type="button" onClick={() => prepareNewExam("module")}>+ Examen de módulo</button>
            <button type="button" onClick={() => prepareNewExam("course")}>+ Examen final</button>
          </div>
        </div>
        <aside className="exam-hero-panel">
          <span>GHC Academy</span>
          <strong>Evaluar, revisar, aprobar</strong>
          <p>Banco A/B/C/D conectado a exams y exam_questions. Sin datos falsos, sin columnas inventadas y sin publicación automática.</p>
        </aside>
      </section>

      {notice ? <div className="exam-notice">{notice}</div> : null}

      <section className="exam-kpi-grid">
        <ExamKpi label="Exámenes" value={stats.exams} helper="Total en Supabase" />
        <ExamKpi label="Preguntas" value={stats.questions} helper="Banco real" />
        <ExamKpi label="Publicados" value={stats.published} helper={`${stats.draft} borradores`} />
        <ExamKpi label="Intentos" value={stats.attempts} helper="exam_attempts" />
        <ExamKpi label="Sin preguntas" value={stats.examsWithoutQuestions} helper="Revisar antes de publicar" warning={stats.examsWithoutQuestions > 0} />
      </section>

      <section className="exam-admin-layout">
        <aside className="exam-context-panel">
          <div className="panel-head">
            <p className="exam-kicker">Contexto académico</p>
            <h2>Curso, módulo y lección</h2>
          </div>

          <div className="field-stack">
            <label>
              <span>Curso</span>
              <select value={selectedCourse?.id || ""} onChange={(event) => changeCourse(event.target.value)}>
                {data.courses.map((course) => <option key={String(course.id)} value={String(course.id)}>{course.title || course.name || "Curso GHC"}</option>)}
              </select>
            </label>

            <label>
              <span>Módulo</span>
              <select value={selectedModule?.id || ""} onChange={(event) => changeModule(event.target.value)} disabled={!modulesForCourse.length}>
                {modulesForCourse.length ? modulesForCourse.map((module, index) => <option key={String(module.id)} value={String(module.id)}>{module.title || module.name || `Módulo ${index + 1}`}</option>) : <option value="">Sin módulos</option>}
              </select>
            </label>

            <label>
              <span>Lección</span>
              <select value={selectedLesson?.id || ""} onChange={(event) => changeLesson(event.target.value)} disabled={!lessonsForModule.length}>
                {lessonsForModule.length ? lessonsForModule.map((lesson, index) => <option key={String(lesson.id)} value={String(lesson.id)}>{lesson.title || `Lección ${index + 1}`}</option>) : <option value="">Sin lecciones</option>}
              </select>
            </label>
          </div>

          <div className="scope-tabs" role="tablist" aria-label="Tipo de evaluación">
            <button type="button" className={activeScope === "lesson" ? "active" : ""} onClick={() => changeScope("lesson")}>Evaluación de lección</button>
            <button type="button" className={activeScope === "module" ? "active" : ""} onClick={() => changeScope("module")}>Examen de módulo</button>
            <button type="button" className={activeScope === "course" ? "active" : ""} onClick={() => changeScope("course")}>Examen final</button>
          </div>

          <div className="context-summary">
            <span>Selección activa</span>
            <strong>{getScopeLabel(activeScope)}</strong>
            <p>{selectedCourse?.title || "Sin curso"}</p>
            <p>{activeScope !== "course" ? selectedModule?.title || "Sin módulo" : "Curso completo"}</p>
            <p>{activeScope === "lesson" ? selectedLesson?.title || "Sin lección" : "—"}</p>
          </div>
        </aside>

        <section className="exam-main-panel">
          <div className="panel-head with-actions">
            <div>
              <p className="exam-kicker">Gestión operativa</p>
              <h2>{getScopeLabel(activeScope)}</h2>
            </div>
            <div className="panel-actions">
              <button type="button" onClick={() => refreshData("Datos refrescados desde Supabase.")}>{isLoading ? "Refrescando..." : "↻ Refrescar"}</button>
              <button type="button" className="primary" onClick={() => prepareNewExam(activeScope)}>+ Nuevo examen</button>
            </div>
          </div>

          <div className="exam-search-row">
            <input value={examSearch} onChange={(event) => setExamSearch(event.target.value)} placeholder="Buscar por título, descripción o estado..." />
          </div>

          <div className="exam-list-premium">
            {scopedExams.length ? scopedExams.map((exam) => {
              const questionCount = data.examQuestions.filter((q) => String(q.exam_id) === String(exam.id)).length;
              const isSelected = selectedExam && String(selectedExam.id) === String(exam.id);
              return (
                <button key={String(exam.id)} type="button" className={isSelected ? "exam-row-premium active" : "exam-row-premium"} onClick={() => editExam(exam)}>
                  <span className={`status-pill ${normalizeExamStatus(exam.status)}`}>{getStatusLabel(exam.status)}</span>
                  <div>
                    <strong>{exam.title || "Examen sin título"}</strong>
                    <p>{getExamContextLabel(exam, data)} · Nota mínima {exam.passing_score ?? exam.pass_score ?? 70}%</p>
                  </div>
                  <em>{questionCount} preguntas</em>
                </button>
              );
            }) : (
              <div className="empty-state">
                <span>◈</span>
                <strong>No hay exámenes para esta selección</strong>
                <p>Crea el primer examen para el curso, módulo o lección seleccionada.</p>
                <button type="button" onClick={() => prepareNewExam(activeScope)}>Crear ahora</button>
              </div>
            )}
          </div>

          <form className="exam-editor-card" onSubmit={submitExam}>
            <div className="editor-title-row">
              <div>
                <span>Editor de examen</span>
                <h3>{examForm.id ? "Editar examen" : "Crear examen"}</h3>
              </div>
              <strong>{examForm.examScope.toUpperCase()}</strong>
            </div>

            <div className="form-grid two">
              <label>
                <span>Título *</span>
                <input value={examForm.title} onChange={(event) => setExamForm({ ...examForm, title: event.target.value })} />
              </label>
              <label>
                <span>Estado</span>
                <select value={examForm.status} onChange={(event) => setExamForm({ ...examForm, status: event.target.value as ExamStatus })}>
                  <option value="draft">Borrador</option>
                  <option value="published">Publicado</option>
                  <option value="hidden">Oculto</option>
                </select>
              </label>
            </div>

            <div className="form-grid two compact">
              <label>
                <span>Tipo</span>
                <select value={examForm.examScope} onChange={(event) => setExamForm({ ...examForm, examScope: event.target.value as ExamScope })}>
                  <option value="lesson">Evaluación de lección</option>
                  <option value="module">Examen de módulo</option>
                  <option value="course">Examen final de curso</option>
                </select>
              </label>
              <label>
                <span>Nota mínima (%)</span>
                <input value={examForm.passingScore} onChange={(event) => setExamForm({ ...examForm, passingScore: event.target.value })} />
              </label>
            </div>

            <label>
              <span>Descripción</span>
              <textarea value={examForm.description} onChange={(event) => setExamForm({ ...examForm, description: event.target.value })} placeholder="Instrucciones internas o descripción para el examen..." />
            </label>

            <div className="editor-footer">
              <button type="button" onClick={() => prepareNewExam(activeScope)}>Limpiar</button>
              <button type="submit" disabled={isSavingExam}>{isSavingExam ? "Guardando..." : examForm.id ? "Guardar cambios" : "Crear examen"}</button>
            </div>
          </form>
        </section>

        <aside className="question-panel">
          <div className="panel-head with-actions compact-head">
            <div>
              <p className="exam-kicker">Banco de preguntas</p>
              <h2>Preguntas A/B/C/D</h2>
            </div>
            <button type="button" onClick={prepareNewQuestion}>+ Pregunta</button>
          </div>

          <div className="selected-exam-card">
            <span>Examen seleccionado</span>
            <strong>{selectedExam?.title || "Ningún examen seleccionado"}</strong>
            <p>{questionsForSelectedExam.length} preguntas vinculadas</p>
          </div>

          <div className="question-list">
            {questionsForSelectedExam.length ? questionsForSelectedExam.map((question, index) => (
              <article key={String(question.id)} className="question-mini-card">
                <div>
                  <span>P{index + 1}</span>
                  <strong>{question.question}</strong>
                  <p>Correcta: {question.correct_option || "—"}</p>
                </div>
                <div className="question-actions">
                  <button type="button" onClick={() => editQuestion(question)}>Editar</button>
                  <button type="button" onClick={() => deleteQuestion(question)}>Eliminar</button>
                </div>
              </article>
            )) : (
              <div className="question-empty">
                <strong>Sin preguntas todavía</strong>
                <p>Un examen no debería publicarse sin preguntas A/B/C/D completas.</p>
              </div>
            )}
          </div>

          <form className="question-editor" onSubmit={submitQuestion}>
            <div className="editor-title-row small">
              <div>
                <span>Editor de pregunta</span>
                <h3>{questionForm.id ? "Editar pregunta" : "Nueva pregunta"}</h3>
              </div>
              <strong>{questionForm.correctOption}</strong>
            </div>

            <label>
              <span>Pregunta *</span>
              <textarea value={questionForm.question} onChange={(event) => setQuestionForm({ ...questionForm, question: event.target.value })} />
            </label>

            <div className="answer-grid">
              <AnswerField label="A" value={questionForm.optionA} onChange={(value) => setQuestionForm({ ...questionForm, optionA: value })} />
              <AnswerField label="B" value={questionForm.optionB} onChange={(value) => setQuestionForm({ ...questionForm, optionB: value })} />
              <AnswerField label="C" value={questionForm.optionC} onChange={(value) => setQuestionForm({ ...questionForm, optionC: value })} />
              <AnswerField label="D" value={questionForm.optionD} onChange={(value) => setQuestionForm({ ...questionForm, optionD: value })} />
            </div>

            <div className="form-grid two compact">
              <label>
                <span>Respuesta correcta</span>
                <select value={questionForm.correctOption} onChange={(event) => setQuestionForm({ ...questionForm, correctOption: event.target.value as CorrectOption })}>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </label>
              <label>
                <span>Orden</span>
                <input value={questionForm.sortOrder} onChange={(event) => setQuestionForm({ ...questionForm, sortOrder: event.target.value })} />
              </label>
            </div>

            <label>
              <span>Explicación</span>
              <textarea value={questionForm.explanation} onChange={(event) => setQuestionForm({ ...questionForm, explanation: event.target.value })} placeholder="Explicación breve de la respuesta correcta..." />
            </label>

            <div className="editor-footer">
              <button type="button" onClick={prepareNewQuestion}>Limpiar</button>
              <button type="submit" disabled={isSavingQuestion}>{isSavingQuestion ? "Guardando..." : questionForm.id ? "Guardar pregunta" : "Crear pregunta"}</button>
            </div>
          </form>
        </aside>
      </section>
    </main>
  );
}

function AnswerField({ label, value, onChange }: { label: CorrectOption; value: string; onChange: (value: string) => void }) {
  return (
    <label className="answer-field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ExamKpi({ label, value, helper, warning = false }: { label: string; value: number; helper: string; warning?: boolean }) {
  return (
    <article className={warning ? "exam-kpi warning" : "exam-kpi"}>
      <span>{label}</span>
      <strong>{new Intl.NumberFormat("es-ES").format(value)}</strong>
      <p>{helper}</p>
    </article>
  );
}

async function loadDashboardData(): Promise<DashboardData> {
  const [profiles, courses, modules, lessons, exams, examQuestions, examAttempts] = await Promise.all([
    safeSelect("profiles", "*"),
    safeSelect("courses", "*"),
    safeSelect("modules", "*"),
    safeSelect("lessons", "*"),
    safeSelect("exams", "*"),
    safeSelect("exam_questions", "*"),
    safeSelect("exam_attempts", "*"),
  ]);

  return { profiles, courses, modules, lessons, exams, examQuestions, examAttempts };
}

async function safeSelect(table: string, columns: string): Promise<AnyRecord[]> {
  try {
    const { data, error } = await supabase.from(table).select(columns);
    if (error) {
      console.warn(`[GHC Exams Admin] No se pudo cargar ${table}:`, error.message);
      return [];
    }
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn(`[GHC Exams Admin] Error leyendo ${table}:`, error);
    return [];
  }
}

function normalizeExamScope(value: unknown): ExamScope {
  const scope = String(value || "course").toLowerCase();
  if (scope === "lesson") return "lesson";
  if (scope === "module") return "module";
  return "course";
}

function normalizeExamStatus(value: unknown): ExamStatus {
  const status = String(value || "draft").toLowerCase();
  if (["published", "publicado", "active", "activo"].includes(status)) return "published";
  if (["hidden", "oculto", "archived", "archivado"].includes(status)) return "hidden";
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

function getStatusLabel(value: unknown) {
  const status = normalizeExamStatus(value);
  if (status === "published") return "Publicado";
  if (status === "hidden") return "Oculto";
  return "Borrador";
}

function clampScore(value: string) {
  const numeric = Number(String(value).replace(/[^\d]/g, ""));
  if (!Number.isFinite(numeric)) return 70;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function getDefaultExamTitle(scope: ExamScope, course?: AnyRecord | null, module?: AnyRecord | null, lesson?: AnyRecord | null) {
  if (scope === "lesson") return `Evaluación de lección - ${lesson?.title || "Nueva lección"}`;
  if (scope === "module") return `Examen de módulo - ${module?.title || "Nuevo módulo"}`;
  return `Examen final - ${course?.title || "Nuevo curso"}`;
}

function getExamContextLabel(exam: AnyRecord, data: DashboardData) {
  const scope = normalizeExamScope(exam.exam_scope);
  const course = data.courses.find((item) => String(item.id) === String(exam.course_id));
  const module = data.modules.find((item) => String(item.id) === String(exam.module_id));
  const lesson = data.lessons.find((item) => String(item.id) === String(exam.lesson_id));

  if (scope === "lesson") return `${course?.title || "Curso"} · ${lesson?.title || "Lección"}`;
  if (scope === "module") return `${course?.title || "Curso"} · ${module?.title || "Módulo"}`;
  return `${course?.title || "Curso"} · Examen final`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null) {
    const record = error as AnyRecord;
    return String(record.message || record.details || record.hint || fallback);
  }
  return fallback;
}

function ExamBackground() {
  return (
    <div className="exam-background" aria-hidden="true">
      <div className="orb one" />
      <div className="orb two" />
      <div className="grid" />
    </div>
  );
}

function ExamStyles() {
  return <style>{`
    :root{--exam-green:#63e546;--exam-bg:#050706;--exam-card:rgba(10,14,12,.88);--exam-line:rgba(255,255,255,.085);--exam-white:#f4f6f2;--exam-muted:rgba(244,246,242,.66);--exam-soft:rgba(244,246,242,.42);--exam-warning:#f7c948;--exam-danger:#ff5757}*{box-sizing:border-box}html,body{margin:0;background:var(--exam-bg)}body{color:var(--exam-white);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}button,input,select,textarea{font:inherit}button{transition:.18s ease}button:hover{transform:translateY(-1px)}
    .exam-admin-page{min-height:100vh;background:var(--exam-bg);color:var(--exam-white);position:relative;padding:24px;overflow:hidden}.exam-admin-page>*:not(.exam-background){position:relative;z-index:1}.exam-background{position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden}.orb{position:absolute;width:560px;height:560px;border-radius:999px;filter:blur(120px)}.orb.one{left:-180px;top:-180px;background:rgba(99,229,70,.10)}.orb.two{right:-260px;top:180px;background:rgba(255,255,255,.06)}.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);background-size:44px 44px;mask-image:radial-gradient(circle at center,black 0%,transparent 84%)}
    .exam-admin-loading{display:grid;place-items:center}.exam-admin-loading-card{width:min(560px,calc(100vw - 40px));border:1px solid var(--exam-line);border-radius:28px;background:linear-gradient(145deg,rgba(255,255,255,.08),rgba(255,255,255,.025));padding:34px;box-shadow:0 30px 90px rgba(0,0,0,.45)}.exam-admin-loading-card h1{margin:18px 0 0;font-size:40px;line-height:.95;letter-spacing:-.055em}.exam-admin-loading-card p{color:var(--exam-muted)}
    .exam-admin-topbar{height:64px;display:flex;align-items:center;justify-content:space-between;gap:16px;border:1px solid var(--exam-line);border-radius:20px;background:rgba(7,10,8,.8);backdrop-filter:blur(18px);padding:10px 14px;margin-bottom:16px}.exam-back-button{height:42px;border-radius:999px;border:1px solid rgba(99,229,70,.22);background:rgba(99,229,70,.07);color:var(--exam-green);font-weight:950;padding:0 16px;cursor:pointer}.exam-admin-brand{display:flex;align-items:center}.exam-admin-build{display:flex;flex-direction:column;align-items:flex-end;gap:2px}.exam-admin-build span{color:var(--exam-green);font-size:10px;text-transform:uppercase;letter-spacing:.15em;font-weight:950}.exam-admin-build strong{color:var(--exam-muted);font-size:12px}
    .exam-admin-hero{min-height:250px;border:1px solid var(--exam-line);border-radius:28px;background:linear-gradient(90deg,rgba(9,13,11,.98),rgba(9,13,11,.76)),radial-gradient(circle at 78% 30%,rgba(99,229,70,.16),transparent 34%);display:grid;grid-template-columns:minmax(0,1fr) 390px;gap:22px;align-items:center;padding:34px;box-shadow:0 28px 90px rgba(0,0,0,.28);overflow:hidden}.exam-kicker{margin:0 0 10px;color:var(--exam-green);text-transform:uppercase;letter-spacing:.18em;font-size:11px;font-weight:950}.exam-admin-hero h1{margin:0;font-size:clamp(48px,5vw,82px);line-height:.88;letter-spacing:-.075em;font-weight:950}.exam-admin-hero p{max-width:760px;margin:16px 0 0;color:var(--exam-muted);line-height:1.62}.hero-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}.hero-actions button,.panel-actions .primary,.editor-footer button[type="submit"],.question-panel .panel-head button{min-height:42px;border:0;border-radius:999px;background:linear-gradient(135deg,#7cff55,var(--exam-green));color:#061008;font-weight:950;padding:0 18px;cursor:pointer;box-shadow:0 16px 34px rgba(99,229,70,.16)}.hero-actions button:not(:first-child){border:1px solid rgba(99,229,70,.24);background:rgba(99,229,70,.07);color:var(--exam-green);box-shadow:none}.exam-hero-panel{border:1px solid rgba(99,229,70,.22);border-radius:22px;background:linear-gradient(145deg,rgba(99,229,70,.09),rgba(255,255,255,.025));padding:22px;box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 22px 60px rgba(0,0,0,.24)}.exam-hero-panel span{color:var(--exam-green);text-transform:uppercase;letter-spacing:.16em;font-size:11px;font-weight:950}.exam-hero-panel strong{display:block;margin-top:10px;font-size:24px;line-height:1.1;letter-spacing:-.04em}.exam-hero-panel p{font-size:13px;margin-top:12px;color:var(--exam-muted)}
    .exam-notice{margin:16px 0;border-radius:16px;border:1px solid rgba(99,229,70,.22);background:rgba(99,229,70,.055);color:var(--exam-muted);padding:14px 16px}.exam-kpi-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin:16px 0}.exam-kpi{min-height:118px;border:1px solid var(--exam-line);border-radius:18px;background:var(--exam-card);padding:16px;box-shadow:0 20px 70px rgba(0,0,0,.18)}.exam-kpi span{color:var(--exam-muted);font-size:12px;font-weight:850}.exam-kpi strong{display:block;margin-top:10px;font-size:34px;letter-spacing:-.05em}.exam-kpi p{margin:4px 0 0;color:var(--exam-green);font-size:12px;font-weight:850}.exam-kpi.warning strong,.exam-kpi.warning p{color:var(--exam-warning)}
    .exam-admin-layout{display:grid;grid-template-columns:330px minmax(0,1fr) 420px;gap:14px;align-items:start}.exam-context-panel,.exam-main-panel,.question-panel{border:1px solid var(--exam-line);border-radius:22px;background:var(--exam-card);box-shadow:0 24px 80px rgba(0,0,0,.2);padding:18px;min-width:0}.exam-context-panel,.question-panel{position:sticky;top:18px}.panel-head{margin-bottom:16px}.panel-head h2{margin:0;font-size:26px;line-height:1;letter-spacing:-.045em}.panel-head.with-actions{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.panel-head.compact-head h2{font-size:22px}.panel-actions{display:flex;gap:8px;align-items:center}.panel-actions button,.editor-footer button,.question-actions button,.empty-state button{min-height:38px;border-radius:999px;border:1px solid var(--exam-line);background:rgba(255,255,255,.035);color:var(--exam-white);font-weight:900;padding:0 13px;cursor:pointer}.field-stack{display:grid;gap:12px}label{display:grid;gap:7px}label span{color:var(--exam-muted);font-size:12px;font-weight:850}input,select,textarea{width:100%;border-radius:14px;border:1px solid var(--exam-line);background:rgba(255,255,255,.035);color:var(--exam-white);padding:12px 13px;outline:0}textarea{min-height:96px;resize:vertical;line-height:1.55}option{background:#080b0a;color:var(--exam-white)}.scope-tabs{display:grid;gap:8px;margin-top:16px}.scope-tabs button{min-height:48px;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.028);color:var(--exam-white);font-weight:900;text-align:left;padding:0 14px;cursor:pointer}.scope-tabs button.active{border-color:rgba(99,229,70,.32);background:rgba(99,229,70,.09);color:var(--exam-green);box-shadow:inset 3px 0 0 var(--exam-green)}.context-summary{margin-top:16px;border-radius:16px;border:1px solid rgba(99,229,70,.16);background:rgba(99,229,70,.045);padding:14px}.context-summary span{color:var(--exam-green);font-size:10px;text-transform:uppercase;letter-spacing:.14em;font-weight:950}.context-summary strong{display:block;margin:8px 0;font-size:18px}.context-summary p{margin:5px 0;color:var(--exam-muted);font-size:12px;line-height:1.4}
    .exam-search-row{margin-bottom:12px}.exam-list-premium{display:grid;gap:10px;margin-bottom:14px}.exam-row-premium{width:100%;border-radius:18px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(135deg,rgba(255,255,255,.042),rgba(255,255,255,.016));color:var(--exam-white);display:grid;grid-template-columns:116px minmax(0,1fr) 112px;gap:12px;align-items:center;text-align:left;padding:14px;cursor:pointer}.exam-row-premium.active{border-color:rgba(99,229,70,.32);background:linear-gradient(135deg,rgba(99,229,70,.09),rgba(255,255,255,.018));box-shadow:inset 3px 0 0 var(--exam-green)}.exam-row-premium strong{display:block;font-size:17px;line-height:1.18}.exam-row-premium p{margin:5px 0 0;color:var(--exam-muted);font-size:12px}.exam-row-premium em{font-style:normal;color:var(--exam-green);font-size:12px;font-weight:950;text-align:right}.status-pill{width:max-content;border-radius:999px;padding:7px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.12em;font-weight:950;border:1px solid rgba(99,229,70,.26);background:rgba(99,229,70,.1);color:var(--exam-green)}.status-pill.draft{border-color:rgba(247,201,72,.28);background:rgba(247,201,72,.1);color:var(--exam-warning)}.status-pill.hidden{border-color:rgba(255,255,255,.14);background:rgba(255,255,255,.055);color:var(--exam-muted)}.empty-state,.question-empty{border:1px dashed rgba(99,229,70,.24);border-radius:18px;background:rgba(99,229,70,.035);padding:22px;text-align:center;color:var(--exam-muted)}.empty-state span{width:52px;height:52px;border-radius:16px;display:grid;place-items:center;margin:0 auto 12px;background:rgba(99,229,70,.08);border:1px solid rgba(99,229,70,.18);color:var(--exam-green);font-size:28px}.empty-state strong,.question-empty strong{display:block;color:var(--exam-white);font-size:18px}.empty-state p,.question-empty p{line-height:1.5}.exam-editor-card,.question-editor,.selected-exam-card{border:1px solid rgba(255,255,255,.075);border-radius:20px;background:rgba(255,255,255,.026);padding:16px}.editor-title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}.editor-title-row span,.selected-exam-card span{color:var(--exam-green);font-size:10px;text-transform:uppercase;letter-spacing:.14em;font-weight:950}.editor-title-row h3{margin:5px 0 0;font-size:24px;letter-spacing:-.04em;line-height:1}.editor-title-row strong{min-width:48px;height:40px;border-radius:12px;display:grid;place-items:center;background:rgba(99,229,70,.1);border:1px solid rgba(99,229,70,.18);color:var(--exam-green);font-weight:950}.editor-title-row.small h3{font-size:20px}.form-grid{display:grid;gap:10px;margin-bottom:10px}.form-grid.two{grid-template-columns:1fr 1fr}.form-grid.compact{margin-top:10px}.editor-footer{display:flex;justify-content:flex-end;gap:8px;border-top:1px solid rgba(255,255,255,.07);padding-top:14px;margin-top:14px}
    .selected-exam-card{margin-bottom:12px}.selected-exam-card strong{display:block;margin-top:8px;font-size:18px;line-height:1.18}.selected-exam-card p{margin:6px 0 0;color:var(--exam-muted);font-size:12px}.question-list{display:grid;gap:10px;max-height:360px;overflow:auto;padding-right:4px;margin-bottom:12px}.question-mini-card{border-radius:16px;border:1px solid rgba(255,255,255,.075);background:rgba(255,255,255,.025);padding:12px}.question-mini-card span{color:var(--exam-green);font-size:10px;text-transform:uppercase;letter-spacing:.14em;font-weight:950}.question-mini-card strong{display:block;margin-top:6px;line-height:1.3}.question-mini-card p{margin:5px 0 0;color:var(--exam-muted);font-size:12px}.question-actions{display:flex;gap:7px;margin-top:10px}.question-actions button:last-child{color:var(--exam-danger)}.answer-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.answer-field{position:relative}.answer-field span{position:absolute;left:10px;top:50%;transform:translateY(-50%);width:24px;height:24px;border-radius:8px;display:grid;place-items:center;background:rgba(99,229,70,.1);color:var(--exam-green);border:1px solid rgba(99,229,70,.18);font-weight:950}.answer-field input{padding-left:44px}
    @media(max-width:1500px){.exam-kpi-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.exam-admin-layout{grid-template-columns:1fr}.exam-context-panel,.question-panel{position:static}.exam-admin-hero{grid-template-columns:1fr}.exam-hero-panel{width:100%}}@media(max-width:820px){.exam-admin-page{padding:14px}.exam-admin-topbar{height:auto;align-items:flex-start;flex-direction:column}.exam-admin-build{align-items:flex-start}.exam-admin-hero{padding:22px}.exam-admin-hero h1{font-size:46px}.hero-actions,.panel-head.with-actions,.panel-actions{flex-direction:column;align-items:stretch}.hero-actions button,.panel-actions button{width:100%}.exam-kpi-grid,.form-grid.two,.answer-grid{grid-template-columns:1fr}.exam-row-premium{grid-template-columns:1fr}.exam-row-premium em{text-align:left}}
  `}</style>;
}
