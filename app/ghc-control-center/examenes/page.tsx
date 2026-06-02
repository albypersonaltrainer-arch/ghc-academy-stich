"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import GHCLogo from "../../components/GHCLogo";

type AnyRecord = Record<string, any>;
type GuardState = "checking" | "allowed" | "denied";
type ExamScope = "lesson" | "module" | "course";
type ExamStatus = "draft" | "published" | "hidden";
type QuestionOption = "A" | "B" | "C" | "D";

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
  correctOption: QuestionOption;
  sortOrder: string;
  explanation: string;
};

const GREEN = "#63E546";
const ADMIN_BUILD_ID = "EXAMS-ADMIN-REAL-01 · 2026-06-02";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

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

export default function Page() {
  const router = useRouter();

  const [guardState, setGuardState] = useState<GuardState>("checking");
  const [adminUser, setAdminUser] = useState<AnyRecord | null>(null);
  const [profile, setProfile] = useState<AnyRecord | null>(null);
  const [systemMessage, setSystemMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [courses, setCourses] = useState<AnyRecord[]>([]);
  const [modules, setModules] = useState<AnyRecord[]>([]);
  const [lessons, setLessons] = useState<AnyRecord[]>([]);
  const [exams, setExams] = useState<AnyRecord[]>([]);
  const [questions, setQuestions] = useState<AnyRecord[]>([]);
  const [attempts, setAttempts] = useState<AnyRecord[]>([]);

  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [selectedScope, setSelectedScope] = useState<ExamScope>("lesson");
  const [selectedExamId, setSelectedExamId] = useState("");

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

        const user = userData.user as AnyRecord;
        setAdminUser(user);

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
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
        await loadData();
      } catch (error) {
        console.error(error);
        setGuardState("denied");
        router.replace("/alumno");
      }
    }

    protectAndLoad();
  }, [router]);

  const displayName = profile?.full_name || adminUser?.user_metadata?.full_name || adminUser?.email || "Admin GHC";
  const initials = getInitials(displayName);

  const selectedCourse = useMemo(
    () => courses.find((course) => String(course.id) === selectedCourseId) || courses[0] || null,
    [courses, selectedCourseId]
  );

  const courseModules = useMemo(() => {
    if (!selectedCourse) return [];
    return modules
      .filter((module) => String(module.course_id) === String(selectedCourse.id))
      .slice()
      .sort((a, b) => Number(a.sort_order ?? a.position ?? 0) - Number(b.sort_order ?? b.position ?? 0));
  }, [modules, selectedCourse]);

  const selectedModule = useMemo(
    () => courseModules.find((module) => String(module.id) === selectedModuleId) || courseModules[0] || null,
    [courseModules, selectedModuleId]
  );

  const moduleLessons = useMemo(() => {
    if (!selectedModule) return [];
    return lessons
      .filter((lesson) => String(lesson.module_id) === String(selectedModule.id))
      .slice()
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  }, [lessons, selectedModule]);

  const selectedLesson = useMemo(
    () => moduleLessons.find((lesson) => String(lesson.id) === selectedLessonId) || moduleLessons[0] || null,
    [moduleLessons, selectedLessonId]
  );

  const filteredExams = useMemo(() => {
    if (!selectedCourse) return [];

    return exams
      .filter((exam) => String(exam.course_id) === String(selectedCourse.id))
      .filter((exam) => normalizeExamScope(exam.exam_scope) === selectedScope)
      .filter((exam) => {
        if (selectedScope === "course") return true;
        if (selectedScope === "module") return selectedModule ? String(exam.module_id) === String(selectedModule.id) : true;
        if (selectedScope === "lesson") return selectedLesson ? String(exam.lesson_id) === String(selectedLesson.id) : true;
        return true;
      })
      .slice()
      .sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
  }, [exams, selectedCourse, selectedScope, selectedModule, selectedLesson]);

  const selectedExam = useMemo(
    () => filteredExams.find((exam) => String(exam.id) === selectedExamId) || filteredExams[0] || null,
    [filteredExams, selectedExamId]
  );

  const selectedExamQuestions = useMemo(() => {
    if (!selectedExam) return [];
    return questions
      .filter((question) => String(question.exam_id) === String(selectedExam.id))
      .slice()
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  }, [questions, selectedExam]);

  const stats = useMemo(() => {
    const published = exams.filter((exam) => normalizeExamStatus(exam.status) === "published").length;
    const draft = exams.filter((exam) => normalizeExamStatus(exam.status) === "draft").length;
    const hidden = exams.filter((exam) => normalizeExamStatus(exam.status) === "hidden").length;
    const broken = exams.filter((exam) => questions.filter((q) => String(q.exam_id) === String(exam.id)).length === 0).length;

    return {
      exams: exams.length,
      questions: questions.length,
      attempts: attempts.length,
      published,
      draft,
      hidden,
      broken,
    };
  }, [exams, questions, attempts]);

  useEffect(() => {
    if (!selectedCourse && courses[0]) {
      setSelectedCourseId(String(courses[0].id));
      return;
    }

    if (selectedCourse && selectedCourseId !== String(selectedCourse.id)) {
      setSelectedCourseId(String(selectedCourse.id));
    }
  }, [courses, selectedCourse, selectedCourseId]);

  useEffect(() => {
    const firstModuleId = String(courseModules[0]?.id || "");
    if (!courseModules.some((module) => String(module.id) === selectedModuleId)) {
      setSelectedModuleId(firstModuleId);
    }
  }, [courseModules, selectedModuleId]);

  useEffect(() => {
    const firstLessonId = String(moduleLessons[0]?.id || "");
    if (!moduleLessons.some((lesson) => String(lesson.id) === selectedLessonId)) {
      setSelectedLessonId(firstLessonId);
    }
  }, [moduleLessons, selectedLessonId]);

  useEffect(() => {
    if (!selectedCourse) return;

    const moduleId = selectedScope === "course" ? "" : String(selectedModule?.id || "");
    const lessonId = selectedScope === "lesson" ? String(selectedLesson?.id || "") : "";

    setExamForm({
      ...emptyExamForm,
      courseId: String(selectedCourse.id),
      moduleId,
      lessonId,
      examScope: selectedScope,
      title: buildDefaultExamTitle(selectedScope, selectedModule, selectedLesson),
    });
  }, [selectedCourse, selectedModule, selectedLesson, selectedScope]);

  useEffect(() => {
    if (!selectedExam) {
      setSelectedExamId("");
      setQuestionForm({ ...emptyQuestionForm, sortOrder: String(selectedExamQuestions.length + 1) });
      return;
    }

    if (selectedExamId !== String(selectedExam.id)) {
      setSelectedExamId(String(selectedExam.id));
    }

    setQuestionForm({
      ...emptyQuestionForm,
      examId: String(selectedExam.id),
      sortOrder: String(selectedExamQuestions.length + 1),
    });
  }, [selectedExam, selectedExamId, selectedExamQuestions.length]);

  async function loadData(message?: string) {
    setIsLoading(true);
    try {
      const [coursesData, modulesData, lessonsData, examsData, questionsData, attemptsData] = await Promise.all([
        safeSelect("courses", "*"),
        safeSelect("modules", "*"),
        safeSelect("lessons", "*"),
        safeSelect("exams", "*"),
        safeSelect("exam_questions", "*"),
        safeSelect("exam_attempts", "*"),
      ]);

      setCourses(coursesData);
      setModules(modulesData);
      setLessons(lessonsData);
      setExams(examsData);
      setQuestions(questionsData);
      setAttempts(attemptsData);

      if (message) setSystemMessage(message);
    } catch (error) {
      console.error(error);
      setSystemMessage(getErrorMessage(error, "No se pudieron cargar los datos de exámenes."));
    } finally {
      setIsLoading(false);
    }
  }

  function handleScopeChange(scope: ExamScope) {
    setSelectedScope(scope);
    setSelectedExamId("");
    setSystemMessage(`Modo seleccionado: ${getExamScopeLabel(scope)}.`);
  }

  function handleEditExam(exam: AnyRecord) {
    const scope = normalizeExamScope(exam.exam_scope);
    setSelectedScope(scope);
    setSelectedExamId(String(exam.id));
    setSelectedCourseId(String(exam.course_id || ""));
    setSelectedModuleId(String(exam.module_id || ""));
    setSelectedLessonId(String(exam.lesson_id || ""));

    setExamForm({
      id: String(exam.id || ""),
      courseId: String(exam.course_id || ""),
      moduleId: String(exam.module_id || ""),
      lessonId: String(exam.lesson_id || ""),
      title: String(exam.title || ""),
      description: String(exam.description || ""),
      examScope: scope,
      passingScore: String(exam.passing_score ?? exam.pass_score ?? 70),
      status: normalizeExamStatus(exam.status),
    });

    setSystemMessage("Examen cargado para edición.");
  }

  function handleNewExam() {
    if (!selectedCourse) {
      setSystemMessage("Primero necesitas seleccionar un curso.");
      return;
    }

    const nextForm = {
      ...emptyExamForm,
      courseId: String(selectedCourse.id),
      moduleId: selectedScope === "course" ? "" : String(selectedModule?.id || ""),
      lessonId: selectedScope === "lesson" ? String(selectedLesson?.id || "") : "",
      examScope: selectedScope,
      title: buildDefaultExamTitle(selectedScope, selectedModule, selectedLesson),
    };

    setExamForm(nextForm);
    setSelectedExamId("");
    setSystemMessage("Formulario preparado para crear un examen nuevo.");
  }

  async function handleExamSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const courseId = examForm.courseId || String(selectedCourse?.id || "");
    const scope = examForm.examScope;
    const moduleId = scope === "course" ? "" : examForm.moduleId || String(selectedModule?.id || "");
    const lessonId = scope === "lesson" ? examForm.lessonId || String(selectedLesson?.id || "") : "";

    if (!courseId) {
      setSystemMessage("Selecciona un curso antes de guardar el examen.");
      return;
    }

    if (scope === "module" && !moduleId) {
      setSystemMessage("Selecciona un módulo para crear un examen de módulo.");
      return;
    }

    if (scope === "lesson" && !lessonId) {
      setSystemMessage("Selecciona una lección para crear una evaluación de lección.");
      return;
    }

    if (!examForm.title.trim()) {
      setSystemMessage("El examen necesita un título.");
      return;
    }

    setIsSaving(true);
    setSystemMessage("Guardando examen mediante RPC segura GHC...");

    try {
      const payload = {
        p_course_id: courseId,
        p_module_id: moduleId || null,
        p_lesson_id: lessonId || null,
        p_title: examForm.title.trim(),
        p_description: examForm.description.trim() || null,
        p_exam_scope: scope,
        p_passing_score: clampPercent(examForm.passingScore),
        p_status: examForm.status,
      };

      const request = examForm.id
        ? supabase.rpc("ghc_admin_update_exam", { p_exam_id: examForm.id, ...payload })
        : supabase.rpc("ghc_admin_create_exam", payload);

      const { data, error } = await request;

      if (error) throw error;

      setSelectedScope(scope);
      setSelectedExamId(String((data as AnyRecord)?.id || ""));
      await loadData(examForm.id ? "Examen actualizado correctamente." : "Examen creado correctamente como borrador.");
    } catch (error) {
      console.error(error);
      setSystemMessage(getErrorMessage(error, "No se pudo guardar el examen. Revisa la función RPC y los permisos admin."));
    } finally {
      setIsSaving(false);
    }
  }

  function handleEditQuestion(question: AnyRecord) {
    setQuestionForm({
      id: String(question.id || ""),
      examId: String(question.exam_id || selectedExam?.id || ""),
      question: String(question.question || ""),
      optionA: String(question.option_a || ""),
      optionB: String(question.option_b || ""),
      optionC: String(question.option_c || ""),
      optionD: String(question.option_d || ""),
      correctOption: normalizeCorrectOption(question.correct_option),
      sortOrder: String(question.sort_order ?? selectedExamQuestions.length + 1),
      explanation: String(question.explanation || ""),
    });

    setSystemMessage("Pregunta cargada para edición.");
  }

  function handleNewQuestion() {
    if (!selectedExam) {
      setSystemMessage("Primero crea o selecciona un examen.");
      return;
    }

    setQuestionForm({
      ...emptyQuestionForm,
      examId: String(selectedExam.id),
      sortOrder: String(selectedExamQuestions.length + 1),
    });

    setSystemMessage("Formulario preparado para añadir una pregunta nueva.");
  }

  async function handleQuestionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const examId = questionForm.examId || String(selectedExam?.id || "");

    if (!examId) {
      setSystemMessage("Primero selecciona un examen.");
      return;
    }

    if (!questionForm.question.trim()) {
      setSystemMessage("La pregunta no puede estar vacía.");
      return;
    }

    if (!questionForm.optionA.trim() || !questionForm.optionB.trim() || !questionForm.optionC.trim() || !questionForm.optionD.trim()) {
      setSystemMessage("Rellena las opciones A, B, C y D antes de guardar.");
      return;
    }

    setIsSaving(true);
    setSystemMessage("Guardando pregunta mediante RPC segura GHC...");

    try {
      const payload = {
        p_exam_id: examId,
        p_question: questionForm.question.trim(),
        p_option_a: questionForm.optionA.trim(),
        p_option_b: questionForm.optionB.trim(),
        p_option_c: questionForm.optionC.trim(),
        p_option_d: questionForm.optionD.trim(),
        p_correct_option: questionForm.correctOption,
        p_sort_order: parseInteger(questionForm.sortOrder, selectedExamQuestions.length + 1),
        p_explanation: questionForm.explanation.trim() || null,
      };

      const request = questionForm.id
        ? supabase.rpc("ghc_admin_update_exam_question", { p_question_id: questionForm.id, ...payload })
        : supabase.rpc("ghc_admin_create_exam_question", payload);

      const { error } = await request;

      if (error) throw error;

      await loadData(questionForm.id ? "Pregunta actualizada correctamente." : "Pregunta añadida correctamente.");
      handleNewQuestion();
    } catch (error) {
      console.error(error);
      setSystemMessage(getErrorMessage(error, "No se pudo guardar la pregunta. Revisa la función RPC y los permisos admin."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteQuestion(question: AnyRecord) {
    const questionId = String(question.id || "");

    if (!questionId) return;

    const confirmed = window.confirm("¿Eliminar esta pregunta? Esta acción no elimina el examen, solo la pregunta seleccionada.");
    if (!confirmed) return;

    setIsSaving(true);
    setSystemMessage("Eliminando pregunta mediante RPC segura GHC...");

    try {
      const { error } = await supabase.rpc("ghc_admin_delete_exam_question", { p_question_id: questionId });
      if (error) throw error;
      await loadData("Pregunta eliminada correctamente.");
      handleNewQuestion();
    } catch (error) {
      console.error(error);
      setSystemMessage(getErrorMessage(error, "No se pudo eliminar la pregunta."));
    } finally {
      setIsSaving(false);
    }
  }

  if (guardState === "checking") {
    return (
      <main className="ghc-exams-page">
        <GlobalStyles />
        <Background />
        <section className="loading-card">
          <GHCLogo size="md" showText tagline={false} />
          <h1>GHC Exámenes</h1>
          <p>Verificando acceso administrativo...</p>
        </section>
      </main>
    );
  }

  if (guardState !== "allowed") return null;

  return (
    <main className="ghc-exams-page">
      <GlobalStyles />
      <Background />

      <header className="admin-header">
        <div className="brand-block">
          <GHCLogo size="md" showText tagline={false} />
          <div>
            <span>GHC Control Center</span>
            <strong>Exámenes y evaluaciones</strong>
          </div>
        </div>

        <div className="header-actions">
          <button type="button" onClick={() => router.push("/ghc-control-center")}>Volver al panel</button>
          <button type="button" onClick={() => loadData("Datos refrescados desde Supabase.")}>{isLoading ? "Cargando..." : "Refrescar"}</button>
          <div className="user-pill"><span>{initials}</span><strong>{shortName(displayName)}</strong></div>
        </div>
      </header>

      <section className="hero-card">
        <div>
          <p className="kicker">Admin real · RPC segura · Supabase</p>
          <h1>Gestor de exámenes</h1>
          <p>
            Crea y edita evaluaciones de lección, exámenes de módulo y examen final de curso sin tocar SQL manualmente.
            La publicación queda bajo control humano.
          </p>
        </div>

        <aside>
          <span>{ADMIN_BUILD_ID}</span>
          <strong>Operativo sobre tablas reales</strong>
          <p>Usa exams y exam_questions con funciones RPC GHC. Sin datos falsos, sin columnas inventadas.</p>
        </aside>
      </section>

      {systemMessage ? <div className="notice">{systemMessage}</div> : null}

      <section className="stats-grid">
        <StatCard label="Exámenes" value={stats.exams} helper="Total en Supabase" />
        <StatCard label="Preguntas" value={stats.questions} helper="Banco real" />
        <StatCard label="Publicados" value={stats.published} helper={`${stats.draft} borradores`} />
        <StatCard label="Intentos" value={stats.attempts} helper="exam_attempts" />
        <StatCard label="Sin preguntas" value={stats.broken} helper="Revisar antes de publicar" warning={stats.broken > 0} />
      </section>

      <section className="workspace-grid">
        <aside className="selector-card">
          <div className="card-head">
            <div>
              <h2>Contexto académico</h2>
              <p>Selecciona el curso, módulo y lección exactos antes de crear o editar.</p>
            </div>
          </div>

          <label>
            <span>Curso</span>
            <select
              value={String(selectedCourse?.id || "")}
              onChange={(event) => {
                setSelectedCourseId(event.target.value);
                setSelectedExamId("");
                setSystemMessage("Curso seleccionado. Elige módulo, lección o tipo de examen.");
              }}
            >
              {courses.length ? courses.map((course) => (
                <option key={String(course.id)} value={String(course.id)}>{course.title || course.name || "Curso GHC"}</option>
              )) : <option value="">Sin cursos</option>}
            </select>
          </label>

          <label>
            <span>Módulo</span>
            <select
              value={String(selectedModule?.id || "")}
              onChange={(event) => {
                setSelectedModuleId(event.target.value);
                setSelectedExamId("");
                setSystemMessage("Módulo seleccionado.");
              }}
              disabled={!courseModules.length}
            >
              {courseModules.length ? courseModules.map((module, index) => (
                <option key={String(module.id || index)} value={String(module.id || "")}>{module.title || module.name || `Módulo ${index + 1}`}</option>
              )) : <option value="">Este curso no tiene módulos</option>}
            </select>
          </label>

          <label>
            <span>Lección</span>
            <select
              value={String(selectedLesson?.id || "")}
              onChange={(event) => {
                setSelectedLessonId(event.target.value);
                setSelectedExamId("");
                setSystemMessage("Lección seleccionada.");
              }}
              disabled={!moduleLessons.length}
            >
              {moduleLessons.length ? moduleLessons.map((lesson, index) => (
                <option key={String(lesson.id || index)} value={String(lesson.id || "")}>{lesson.title || `Lección ${index + 1}`}</option>
              )) : <option value="">Este módulo no tiene lecciones</option>}
            </select>
          </label>

          <div className="scope-tabs">
            <button type="button" className={selectedScope === "lesson" ? "active" : ""} onClick={() => handleScopeChange("lesson")}>Evaluación de lección</button>
            <button type="button" className={selectedScope === "module" ? "active" : ""} onClick={() => handleScopeChange("module")}>Examen de módulo</button>
            <button type="button" className={selectedScope === "course" ? "active" : ""} onClick={() => handleScopeChange("course")}>Examen final</button>
          </div>

          <div className="context-summary">
            <SummaryRow label="Curso" value={selectedCourse?.title || "Sin curso"} />
            <SummaryRow label="Módulo" value={selectedModule?.title || selectedModule?.name || "Sin módulo"} muted={selectedScope === "course"} />
            <SummaryRow label="Lección" value={selectedLesson?.title || "Sin lección"} muted={selectedScope !== "lesson"} />
          </div>
        </aside>

        <section className="main-column">
          <article className="exam-list-card">
            <div className="card-head">
              <div>
                <h2>{getExamScopeLabel(selectedScope)}</h2>
                <p>{filteredExams.length} exámenes encontrados para la selección actual.</p>
              </div>
              <button type="button" onClick={handleNewExam}>+ Nuevo examen</button>
            </div>

            <div className="exam-list">
              {filteredExams.length ? filteredExams.map((exam) => {
                const examQuestions = questions.filter((question) => String(question.exam_id) === String(exam.id));
                const isActive = selectedExam && String(selectedExam.id) === String(exam.id);

                return (
                  <button
                    key={String(exam.id)}
                    type="button"
                    className={isActive ? "exam-row active" : "exam-row"}
                    onClick={() => {
                      setSelectedExamId(String(exam.id));
                      handleEditExam(exam);
                    }}
                  >
                    <span className={`status-pill ${normalizeExamStatus(exam.status)}`}>{getExamStatusLabel(exam.status)}</span>
                    <div>
                      <strong>{exam.title || "Examen sin título"}</strong>
                      <p>{getExamScopeLabel(exam.exam_scope)} · {examQuestions.length} preguntas · mínimo {exam.passing_score ?? exam.pass_score ?? 70}%</p>
                    </div>
                    <em>{isActive ? "Editando" : "Abrir"}</em>
                  </button>
                );
              }) : (
                <div className="empty-card">
                  <span>◈</span>
                  <strong>No hay exámenes para esta selección</strong>
                  <p>Crea uno como borrador, añade preguntas y publícalo cuando esté revisado.</p>
                  <button type="button" onClick={handleNewExam}>Crear examen</button>
                </div>
              )}
            </div>
          </article>

          <article className="editor-card">
            <div className="card-head">
              <div>
                <h2>{examForm.id ? "Editar examen" : "Crear examen"}</h2>
                <p>Define alcance, título, nota mínima y estado de publicación.</p>
              </div>
              {selectedExam ? <button type="button" onClick={() => handleEditExam(selectedExam)}>Recargar seleccionado</button> : null}
            </div>

            <form className="admin-form" onSubmit={handleExamSubmit}>
              <div className="form-grid two">
                <label>
                  <span>Tipo</span>
                  <select value={examForm.examScope} onChange={(event) => setExamForm({ ...examForm, examScope: event.target.value as ExamScope })}>
                    <option value="lesson">Evaluación de lección</option>
                    <option value="module">Examen de módulo</option>
                    <option value="course">Examen final de curso</option>
                  </select>
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

              <label>
                <span>Título *</span>
                <input value={examForm.title} onChange={(event) => setExamForm({ ...examForm, title: event.target.value })} />
              </label>

              <label>
                <span>Descripción</span>
                <textarea value={examForm.description} onChange={(event) => setExamForm({ ...examForm, description: event.target.value })} />
              </label>

              <div className="form-grid three">
                <label>
                  <span>Nota mínima %</span>
                  <input value={examForm.passingScore} onChange={(event) => setExamForm({ ...examForm, passingScore: event.target.value })} placeholder="70" />
                </label>

                <label>
                  <span>Curso asociado</span>
                  <input value={selectedCourse?.title || ""} readOnly />
                </label>

                <label>
                  <span>Destino</span>
                  <input value={buildDestinationLabel(examForm.examScope, selectedModule, selectedLesson)} readOnly />
                </label>
              </div>

              <div className="form-warning">
                <strong>Regla GHC:</strong> un examen debe tener preguntas A/B/C/D revisadas antes de publicarse. La IA podrá proponer, pero no publica sola.
              </div>

              <div className="form-actions">
                <button type="button" onClick={handleNewExam}>Limpiar</button>
                <button type="submit" disabled={isSaving}>{isSaving ? "Guardando..." : examForm.id ? "Guardar examen" : "Crear examen"}</button>
              </div>
            </form>
          </article>
        </section>

        <aside className="questions-column">
          <article className="questions-card">
            <div className="card-head">
              <div>
                <h2>Preguntas</h2>
                <p>{selectedExam ? `${selectedExamQuestions.length} preguntas en el examen seleccionado.` : "Selecciona o crea un examen."}</p>
              </div>
              <button type="button" onClick={handleNewQuestion} disabled={!selectedExam}>+ Pregunta</button>
            </div>

            <div className="question-list">
              {selectedExamQuestions.length ? selectedExamQuestions.map((question, index) => (
                <div key={String(question.id || index)} className="question-row">
                  <div className="question-number">{index + 1}</div>
                  <div>
                    <strong>{question.question}</strong>
                    <p>Correcta: {question.correct_option || "—"} · Orden {question.sort_order || index + 1}</p>
                  </div>
                  <div className="question-actions">
                    <button type="button" onClick={() => handleEditQuestion(question)}>Editar</button>
                    <button type="button" onClick={() => handleDeleteQuestion(question)}>Eliminar</button>
                  </div>
                </div>
              )) : (
                <div className="empty-card compact">
                  <span>?</span>
                  <strong>{selectedExam ? "Este examen no tiene preguntas" : "Sin examen seleccionado"}</strong>
                  <p>{selectedExam ? "Añade la primera pregunta A/B/C/D." : "Crea o selecciona un examen para gestionar preguntas."}</p>
                </div>
              )}
            </div>
          </article>

          <article className="question-editor-card">
            <div className="card-head compact-head">
              <div>
                <h2>{questionForm.id ? "Editar pregunta" : "Añadir pregunta"}</h2>
                <p>Pregunta de respuesta única con opciones A/B/C/D.</p>
              </div>
            </div>

            <form className="admin-form" onSubmit={handleQuestionSubmit}>
              <label>
                <span>Pregunta *</span>
                <textarea value={questionForm.question} onChange={(event) => setQuestionForm({ ...questionForm, question: event.target.value })} />
              </label>

              <div className="option-grid">
                <OptionField letter="A" value={questionForm.optionA} active={questionForm.correctOption === "A"} onChange={(value) => setQuestionForm({ ...questionForm, optionA: value })} onCorrect={() => setQuestionForm({ ...questionForm, correctOption: "A" })} />
                <OptionField letter="B" value={questionForm.optionB} active={questionForm.correctOption === "B"} onChange={(value) => setQuestionForm({ ...questionForm, optionB: value })} onCorrect={() => setQuestionForm({ ...questionForm, correctOption: "B" })} />
                <OptionField letter="C" value={questionForm.optionC} active={questionForm.correctOption === "C"} onChange={(value) => setQuestionForm({ ...questionForm, optionC: value })} onCorrect={() => setQuestionForm({ ...questionForm, correctOption: "C" })} />
                <OptionField letter="D" value={questionForm.optionD} active={questionForm.correctOption === "D"} onChange={(value) => setQuestionForm({ ...questionForm, optionD: value })} onCorrect={() => setQuestionForm({ ...questionForm, correctOption: "D" })} />
              </div>

              <div className="form-grid two">
                <label>
                  <span>Respuesta correcta</span>
                  <select value={questionForm.correctOption} onChange={(event) => setQuestionForm({ ...questionForm, correctOption: event.target.value as QuestionOption })}>
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
                <span>Explicación / feedback</span>
                <textarea value={questionForm.explanation} onChange={(event) => setQuestionForm({ ...questionForm, explanation: event.target.value })} />
              </label>

              <div className="form-actions">
                <button type="button" onClick={handleNewQuestion} disabled={!selectedExam}>Limpiar</button>
                <button type="submit" disabled={isSaving || !selectedExam}>{isSaving ? "Guardando..." : questionForm.id ? "Guardar pregunta" : "Añadir pregunta"}</button>
              </div>
            </form>
          </article>
        </aside>
      </section>
    </main>
  );
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

function StatCard({ label, value, helper, warning = false }: { label: string; value: number; helper: string; warning?: boolean }) {
  return (
    <article className={warning ? "stat-card warning" : "stat-card"}>
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
      <p>{helper}</p>
    </article>
  );
}

function SummaryRow({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={muted ? "summary-row muted" : "summary-row"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function OptionField({ letter, value, active, onChange, onCorrect }: { letter: QuestionOption; value: string; active: boolean; onChange: (value: string) => void; onCorrect: () => void }) {
  return (
    <label className={active ? "option-field active" : "option-field"}>
      <span>Opción {letter}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
      <button type="button" onClick={onCorrect}>{active ? "Correcta" : "Marcar correcta"}</button>
    </label>
  );
}

function normalizeExamScope(value: unknown): ExamScope {
  const scope = String(value || "course").toLowerCase();
  if (scope === "lesson") return "lesson";
  if (scope === "module") return "module";
  return "course";
}

function normalizeExamStatus(value: unknown): ExamStatus {
  const status = String(value || "draft").toLowerCase();
  if (["published", "publicado"].includes(status)) return "published";
  if (["hidden", "oculto", "archived", "archivado"].includes(status)) return "hidden";
  return "draft";
}

function normalizeCorrectOption(value: unknown): QuestionOption {
  const option = String(value || "A").toUpperCase();
  if (["A", "B", "C", "D"].includes(option)) return option as QuestionOption;
  return "A";
}

function getExamScopeLabel(value: unknown) {
  const scope = normalizeExamScope(value);
  if (scope === "lesson") return "Evaluación de lección";
  if (scope === "module") return "Examen de módulo";
  return "Examen final de curso";
}

function getExamStatusLabel(value: unknown) {
  const status = normalizeExamStatus(value);
  if (status === "published") return "Publicado";
  if (status === "hidden") return "Oculto";
  return "Borrador";
}

function buildDefaultExamTitle(scope: ExamScope, module: AnyRecord | null, lesson: AnyRecord | null) {
  if (scope === "lesson") return `Evaluación · ${lesson?.title || "Lección"}`;
  if (scope === "module") return `Examen de módulo · ${module?.title || module?.name || "Módulo"}`;
  return "Examen final de curso";
}

function buildDestinationLabel(scope: ExamScope, module: AnyRecord | null, lesson: AnyRecord | null) {
  if (scope === "lesson") return lesson?.title || "Lección seleccionada";
  if (scope === "module") return module?.title || module?.name || "Módulo seleccionado";
  return "Curso completo";
}

function clampPercent(value: unknown) {
  const numeric = Number(String(value || "70").replace(/[^\d,.]/g, "").replace(",", "."));
  if (!Number.isFinite(numeric)) return 70;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function parseInteger(value: unknown, fallback: number) {
  const numeric = Number(String(value || "").replace(/[^\d-]/g, ""));
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(1, Math.round(numeric));
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

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-ES").format(value || 0);
}

function getInitials(name: string) {
  return String(name).split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function shortName(name: string) {
  return String(name).split("@")[0].split(" ")[0] || "Admin";
}

function Background() {
  return <div className="admin-background" aria-hidden="true"><div className="admin-orb one" /><div className="admin-orb two" /><div className="admin-grid-texture" /></div>;
}

function GlobalStyles() {
  return <style>{`
    :root{--green:#63e546;--bg:#050706;--panel:rgba(10,14,12,.90);--line:rgba(255,255,255,.085);--white:#f4f6f2;--muted:rgba(244,246,242,.64);--soft:rgba(244,246,242,.42);--danger:#ff5757;--warning:#f7c948}*{box-sizing:border-box}html,body{margin:0;padding:0;background:var(--bg)}body{color:var(--white);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}button,input,select,textarea{font:inherit}button{transition:.18s ease}button:hover:not(:disabled){transform:translateY(-1px)}button:disabled{opacity:.48;cursor:not-allowed}.ghc-exams-page{min-height:100vh;background:var(--bg);color:var(--white);position:relative;padding:22px;overflow:hidden}.admin-background{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:0}.admin-orb{position:absolute;width:520px;height:520px;border-radius:999px;filter:blur(110px)}.admin-orb.one{left:-180px;top:-180px;background:rgba(99,229,70,.09)}.admin-orb.two{right:-240px;top:120px;background:rgba(255,255,255,.055)}.admin-grid-texture{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);background-size:42px 42px;opacity:.5;mask-image:radial-gradient(circle at center,black 0%,transparent 84%)}.admin-header,.hero-card,.notice,.stats-grid,.workspace-grid{position:relative;z-index:1}.admin-header{min-height:68px;border:1px solid var(--line);border-radius:22px;background:linear-gradient(145deg,rgba(9,13,11,.96),rgba(9,13,11,.72));display:flex;align-items:center;justify-content:space-between;gap:18px;padding:14px 16px;margin-bottom:16px}.brand-block{display:flex;align-items:center;gap:14px}.brand-block span{display:block;color:var(--green);text-transform:uppercase;letter-spacing:.16em;font-size:10px;font-weight:950}.brand-block strong{display:block;margin-top:4px;font-size:19px;letter-spacing:-.035em}.header-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.header-actions button,.form-actions button,.card-head button,.empty-card button,.question-actions button{min-height:40px;border-radius:999px;border:1px solid rgba(255,255,255,.105);background:rgba(255,255,255,.04);color:var(--white);padding:0 14px;font-weight:900;cursor:pointer}.header-actions button:nth-child(2),.form-actions button[type="submit"],.card-head button,.empty-card button{background:linear-gradient(135deg,#7cff55,var(--green));color:#061008;border-color:transparent;box-shadow:0 14px 30px rgba(99,229,70,.14)}.user-pill{height:42px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.035);display:flex;align-items:center;gap:9px;padding:0 12px}.user-pill span{width:30px;height:30px;border-radius:999px;display:grid;place-items:center;background:rgba(99,229,70,.1);color:var(--green);font-size:12px;font-weight:950}.loading-card{position:relative;z-index:2;width:min(560px,calc(100vw - 40px));margin:20vh auto;border:1px solid var(--line);border-radius:28px;background:linear-gradient(145deg,rgba(255,255,255,.08),rgba(255,255,255,.025));padding:34px;box-shadow:0 30px 90px rgba(0,0,0,.45)}.loading-card h1{margin:18px 0 0;font-size:38px;line-height:.95;letter-spacing:-.055em}.loading-card p{margin:16px 0 0;color:var(--muted);font-size:16px}.hero-card{min-height:152px;border:1px solid var(--line);border-radius:26px;background:linear-gradient(90deg,rgba(9,13,11,.98),rgba(9,13,11,.76)),radial-gradient(circle at 80% 20%,rgba(99,229,70,.13),transparent 30%);display:grid;grid-template-columns:minmax(0,1fr) 390px;gap:22px;align-items:center;padding:28px;box-shadow:0 28px 90px rgba(0,0,0,.22)}.kicker{margin:0 0 10px;color:var(--green);text-transform:uppercase;letter-spacing:.18em;font-size:11px;font-weight:950}.hero-card h1{margin:0;font-size:clamp(40px,4vw,62px);line-height:.92;letter-spacing:-.065em;font-weight:950}.hero-card p{margin:12px 0 0;color:var(--muted);line-height:1.6;max-width:800px}.hero-card aside{border-radius:18px;border:1px solid rgba(99,229,70,.2);background:linear-gradient(145deg,rgba(99,229,70,.085),rgba(255,255,255,.025));padding:18px;box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 22px 60px rgba(0,0,0,.24)}.hero-card aside span{display:block;color:var(--green);font-size:11px;text-transform:uppercase;letter-spacing:.16em;font-weight:950}.hero-card aside strong{display:block;margin-top:10px;font-size:22px;letter-spacing:-.035em;line-height:1.12}.notice{margin:16px 0;border-radius:15px;border:1px solid rgba(99,229,70,.2);background:rgba(99,229,70,.055);color:var(--muted);padding:14px 16px;line-height:1.45}.stats-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin:16px 0}.stat-card,.selector-card,.exam-list-card,.editor-card,.questions-card,.question-editor-card{border:1px solid var(--line);border-radius:20px;background:var(--panel);box-shadow:0 22px 70px rgba(0,0,0,.18)}.stat-card{padding:16px;min-height:118px}.stat-card span{color:var(--muted);font-size:12px;font-weight:850}.stat-card strong{display:block;margin-top:9px;font-size:31px;letter-spacing:-.045em}.stat-card p{margin:6px 0 0;color:var(--muted);font-size:12px}.stat-card.warning strong{color:var(--warning)}.workspace-grid{display:grid;grid-template-columns:320px minmax(0,1fr) 430px;gap:14px;align-items:start}.selector-card,.exam-list-card,.editor-card,.questions-card,.question-editor-card{padding:18px}.main-column,.questions-column{display:grid;gap:14px}.card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:16px}.card-head h2{margin:0;font-size:23px;line-height:1.05;letter-spacing:-.04em}.card-head p{margin:7px 0 0;color:var(--muted);font-size:13px;line-height:1.45}.selector-card label,.admin-form label{display:grid;gap:7px;margin-top:13px}.selector-card label span,.admin-form label span{color:var(--muted);font-size:12px;font-weight:850}.selector-card select,.admin-form input,.admin-form select,.admin-form textarea{width:100%;border-radius:14px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--white);padding:12px 14px;outline:0}.selector-card option,.admin-form option{background:#080b0a;color:var(--white)}.admin-form textarea{min-height:104px;resize:vertical;line-height:1.55}.scope-tabs{display:grid;gap:8px;margin-top:16px}.scope-tabs button{min-height:44px;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.028);color:var(--muted);font-weight:900;cursor:pointer;text-align:left;padding:0 14px}.scope-tabs button.active{border-color:rgba(99,229,70,.28);background:rgba(99,229,70,.09);color:var(--green);box-shadow:inset 3px 0 0 var(--green)}.context-summary{margin-top:16px;border-top:1px solid var(--line);padding-top:10px}.summary-row{display:grid;gap:4px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.045)}.summary-row span{color:var(--soft);font-size:10px;text-transform:uppercase;letter-spacing:.12em;font-weight:950}.summary-row strong{font-size:13px;line-height:1.28}.summary-row.muted{opacity:.45}.exam-list{display:grid;gap:10px}.exam-row{width:100%;min-height:84px;border-radius:16px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(135deg,rgba(255,255,255,.038),rgba(255,255,255,.018));color:var(--white);display:grid;grid-template-columns:106px minmax(0,1fr) auto;gap:12px;align-items:center;text-align:left;padding:12px;cursor:pointer}.exam-row:hover,.exam-row.active{border-color:rgba(99,229,70,.24);background:linear-gradient(135deg,rgba(99,229,70,.075),rgba(255,255,255,.018))}.exam-row strong{display:block;font-size:16px}.exam-row p{margin:5px 0 0;color:var(--muted);font-size:12px}.exam-row em{font-style:normal;color:var(--green);font-size:12px;font-weight:950}.status-pill{display:inline-flex;align-items:center;justify-content:center;width:max-content;min-height:28px;border-radius:999px;padding:6px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.12em;font-weight:950;border:1px solid rgba(247,201,72,.26);background:rgba(247,201,72,.1);color:var(--warning)}.status-pill.published{border-color:rgba(99,229,70,.26);background:rgba(99,229,70,.1);color:var(--green)}.status-pill.hidden{border-color:rgba(255,255,255,.13);background:rgba(255,255,255,.055);color:var(--muted)}.empty-card{border:1px solid rgba(255,255,255,.08);border-radius:18px;background:rgba(255,255,255,.026);padding:24px;text-align:center;color:var(--muted)}.empty-card.compact{padding:18px}.empty-card span{width:52px;height:52px;border-radius:16px;display:grid;place-items:center;margin:0 auto 14px;background:rgba(99,229,70,.08);border:1px solid rgba(99,229,70,.18);color:var(--green);font-size:24px;font-weight:950}.empty-card strong{display:block;color:var(--white);font-size:19px}.empty-card p{line-height:1.55}.admin-form{display:grid;gap:13px}.form-grid{display:grid;gap:12px}.form-grid.two{grid-template-columns:1fr 1fr}.form-grid.three{grid-template-columns:1fr 1.2fr 1.2fr}.form-warning{border-radius:14px;border:1px solid rgba(247,201,72,.22);background:rgba(247,201,72,.07);color:var(--muted);padding:12px 14px;line-height:1.5}.form-warning strong{color:var(--warning)}.form-actions{display:flex;justify-content:flex-end;gap:10px;border-top:1px solid var(--line);padding-top:14px}.question-list{display:grid;gap:10px}.question-row{display:grid;grid-template-columns:42px minmax(0,1fr) 138px;gap:10px;align-items:center;border-radius:15px;border:1px solid rgba(255,255,255,.075);background:rgba(255,255,255,.026);padding:11px}.question-number{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:rgba(99,229,70,.09);border:1px solid rgba(99,229,70,.18);color:var(--green);font-weight:950}.question-row strong{display:block;font-size:14px;line-height:1.28}.question-row p{margin:5px 0 0;color:var(--muted);font-size:12px}.question-actions{display:grid;gap:7px}.question-actions button{min-height:33px;border-radius:10px;font-size:12px}.question-actions button:last-child{color:var(--danger)}.option-grid{display:grid;gap:9px}.option-field{border:1px solid rgba(255,255,255,.075);border-radius:15px;background:rgba(255,255,255,.026);padding:10px;margin:0!important}.option-field.active{border-color:rgba(99,229,70,.28);background:rgba(99,229,70,.07)}.option-field button{min-height:32px;border-radius:999px;border:1px solid rgba(255,255,255,.105);background:rgba(255,255,255,.04);color:var(--muted);font-size:12px;font-weight:900;cursor:pointer}.option-field.active button{background:var(--green);color:#061008;border-color:transparent}.compact-head{margin-bottom:10px}@media(max-width:1520px){.workspace-grid{grid-template-columns:1fr}.questions-column{grid-template-columns:1fr 1fr}.stats-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:980px){.ghc-exams-page{padding:14px}.admin-header,.hero-card{grid-template-columns:1fr;display:grid}.admin-header{align-items:flex-start}.hero-card{grid-template-columns:1fr}.stats-grid,.questions-column,.form-grid.two,.form-grid.three{grid-template-columns:1fr}.exam-row,.question-row{grid-template-columns:1fr}.header-actions{width:100%}.header-actions button{flex:1}.hero-card h1{font-size:40px}}
  `}</style>;
}
