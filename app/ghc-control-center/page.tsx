"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import GHCLogo from "../components/GHCLogo";

type AnyRecord = Record<string, any>;
type AdminTab = "panel" | "cursos" | "contenido" | "alumnos" | "examenes" | "certificados" | "pagos" | "comunicaciones" | "analitica" | "seguridad" | "studio" | "ajustes";
type GuardState = "checking" | "allowed" | "denied";
type CourseStatus = "published" | "draft" | "hidden";
type CourseStatusFilter = "all" | CourseStatus;
type CourseViewMode = "grid" | "list";
type ModalMode = "none" | "createCourse" | "editCourse" | "createModule" | "editModule" | "createLesson" | "editLesson" | "sourceUpload" | "importDocument";

type DashboardData = {
  profiles: AnyRecord[];
  courses: AnyRecord[];
  modules: AnyRecord[];
  lessons: AnyRecord[];
  certificates: AnyRecord[];
  courseCompletions: AnyRecord[];
  moduleCompletions: AnyRecord[];
  lessonProgress: AnyRecord[];
  exams: AnyRecord[];
  examQuestions: AnyRecord[];
  examResults: AnyRecord[];
  examAttempts: AnyRecord[];
};

type CourseAdminView = {
  course: AnyRecord;
  id: string;
  title: string;
  subtitle: string;
  description: string;
  status: CourseStatus;
  statusLabel: string;
  level: string;
  category: string;
  price: string;
  modulesCount: number;
  lessonsCount: number;
  enrollmentsCount: number;
  updatedAt: string;
  image: string;
  progressHint: number;
};

type StudentAdminView = {
  id: string;
  profile: AnyRecord;
  name: string;
  email: string;
  initials: string;
  status: "active" | "inactive" | "risk" | "blocked";
  statusLabel: string;
  progress: number;
  completedLessons: number;
  completedCourses: number;
  activeCourses: number;
  certificates: number;
  lastActivity: string;
  inactiveDays: number | null;
  riskLabel: string;
  riskTone: "green" | "yellow" | "red" | "muted";
  totalInvested: string;
  commercialTier: string;
  commercialHint: string;
  latestCourse: string;
  followUpStatus: string;
};

type CertificateAdminView = {
  id: string;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  code: string;
  verificationPath: string;
  issuedAt: string;
  score: string;
  status: "valid" | "pending" | "revoked";
  statusLabel: string;
  downloadable: boolean;
};

type GlobalSearchResult = {
  id: string;
  title: string;
  subtitle: string;
  type: "Curso" | "Alumno" | "Certificado" | "Módulo" | "Examen";
  tab: AdminTab;
  icon: string;
  action?: () => void;
};

type CourseFormState = {
  id?: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  level: string;
  price: string;
  image: string;
  status: CourseStatus;
};

type ModuleFormState = {
  id?: string;
  courseId: string;
  title: string;
  description: string;
  position: string;
};

type LessonFormState = {
  id?: string;
  moduleId: string;
  title: string;
  contentType: "text" | "video" | "audio" | "pdf" | "mixed";
  content: string;
  videoUrl: string;
  audioUrl: string;
  pdfUrl: string;
  sortOrder: string;
  durationMinutes: string;
};

const GREEN = "#63E546";
const ADMIN_BUILD_ID = "EXAM-HUB-10 · 2026-06-11";
const COURSE_ASSETS_BUCKET = "ghc-course-assets";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const adminTabs: { id: AdminTab; label: string; helper: string; icon: string }[] = [
  { id: "panel", label: "Panel", helper: "Control", icon: "⌂" },
  { id: "cursos", label: "Cursos", helper: "Catálogo", icon: "▱" },
  { id: "contenido", label: "Contenido", helper: "Módulos", icon: "▤" },
  { id: "alumnos", label: "Alumnos", helper: "Usuarios", icon: "◎" },
  { id: "examenes", label: "Exámenes", helper: "Evaluación", icon: "◈" },
  { id: "certificados", label: "Certificados", helper: "Credenciales", icon: "✦" },
  { id: "pagos", label: "Pagos y accesos", helper: "Ventas", icon: "◷" },
  { id: "comunicaciones", label: "Comunicaciones", helper: "Avisos", icon: "✉" },
  { id: "analitica", label: "Analítica", helper: "Datos", icon: "⌁" },
  { id: "seguridad", label: "Seguridad", helper: "Accesos", icon: "◇" },
  { id: "studio", label: "Studio GHC", helper: "Editor", icon: "▣" },
  { id: "ajustes", label: "Ajustes", helper: "Sistema", icon: "⚙" },
];

const emptyDashboardData: DashboardData = {
  profiles: [],
  courses: [],
  modules: [],
  lessons: [],
  certificates: [],
  courseCompletions: [],
  moduleCompletions: [],
  lessonProgress: [],
  exams: [],
  examQuestions: [],
  examResults: [],
  examAttempts: [],
};

const emptyCourseForm: CourseFormState = {
  title: "",
  subtitle: "",
  description: "",
  category: "",
  level: "Intermedio",
  price: "",
  image: "",
  status: "draft",
};

const emptyModuleForm: ModuleFormState = {
  courseId: "",
  title: "",
  description: "",
  position: "",
};

const emptyLessonForm: LessonFormState = {
  moduleId: "",
  title: "",
  contentType: "text",
  content: "",
  videoUrl: "",
  audioUrl: "",
  pdfUrl: "",
  sortOrder: "",
  durationMinutes: "",
};

export default function Page() {
  const router = useRouter();

  const [guardState, setGuardState] = useState<GuardState>("checking");
  const [adminUser, setAdminUser] = useState<AnyRecord | null>(null);
  const [profile, setProfile] = useState<AnyRecord | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("panel");
  const [dashboardData, setDashboardData] = useState<DashboardData>(emptyDashboardData);
  const [systemMessage, setSystemMessage] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [globalSearch, setGlobalSearch] = useState("");
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);

  const [courseSearch, setCourseSearch] = useState("");
  const [courseStatusFilter, setCourseStatusFilter] = useState<CourseStatusFilter>("all");
  const [courseViewMode, setCourseViewMode] = useState<CourseViewMode>("grid");

  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [contentCourseId, setContentCourseId] = useState("");
  const [contentModuleId, setContentModuleId] = useState("");

  const [modalMode, setModalMode] = useState<ModalMode>("none");
  const [modalBusy, setModalBusy] = useState(false);
  const [courseForm, setCourseForm] = useState<CourseFormState>(emptyCourseForm);
  const [moduleForm, setModuleForm] = useState<ModuleFormState>(emptyModuleForm);
  const [lessonForm, setLessonForm] = useState<LessonFormState>(emptyLessonForm);
  const [lessonVideoFile, setLessonVideoFile] = useState<File | null>(null);
  const [lessonAudioFile, setLessonAudioFile] = useState<File | null>(null);
  const [lessonPdfFile, setLessonPdfFile] = useState<File | null>(null);
  const [sourceFileName, setSourceFileName] = useState("");

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
        setDashboardData(await loadDashboardData());
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

  const dashboardStats = useMemo(() => buildDashboardStats(dashboardData), [dashboardData]);
  const courseViews = useMemo(() => buildCourseAdminViews(dashboardData), [dashboardData]);
  const studentViews = useMemo(() => buildStudentAdminViews(dashboardData, courseViews), [dashboardData, courseViews]);
  const certificateViews = useMemo(() => buildCertificateAdminViews(dashboardData, courseViews, studentViews), [dashboardData, courseViews, studentViews]);
  const recentActivity = useMemo(() => buildRecentActivity(dashboardData), [dashboardData]);
  const priorityTasks = useMemo(() => buildPriorityTasks(dashboardData), [dashboardData]);

  const filteredCourseViews = useMemo(() => {
    const query = courseSearch.trim().toLowerCase();
    return courseViews.filter((item) => {
      const matchesSearch = !query || [item.title, item.subtitle, item.description, item.category, item.level, item.statusLabel].join(" ").toLowerCase().includes(query);
      const matchesStatus = courseStatusFilter === "all" || item.status === courseStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [courseViews, courseSearch, courseStatusFilter]);

  const filteredStudentViews = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    return studentViews.filter((student) => !query || [student.name, student.email, student.statusLabel, student.riskLabel, student.commercialTier].join(" ").toLowerCase().includes(query));
  }, [studentViews, studentSearch]);

  const selectedStudent = filteredStudentViews.find((student) => student.id === selectedStudentId) || filteredStudentViews[0] || studentViews[0] || null;

  useEffect(() => {
    if (!courseViews.length) return;

    const selectedCourseExists = contentCourseId && courseViews.some((course) => course.id === contentCourseId);
    const nextCourseId = selectedCourseExists ? contentCourseId : courseViews[0]?.id || "";

    if (nextCourseId && nextCourseId !== contentCourseId) {
      setContentCourseId(nextCourseId);
    }

    const modulesForCourse = dashboardData.modules.filter((module) => String(module.course_id) === nextCourseId);
    const selectedModuleExists = contentModuleId && modulesForCourse.some((module) => String(module.id) === contentModuleId);
    const nextModuleId = selectedModuleExists ? contentModuleId : String(modulesForCourse[0]?.id || "");

    if (nextModuleId !== contentModuleId) {
      setContentModuleId(nextModuleId);
    }
  }, [courseViews, dashboardData.modules, contentCourseId, contentModuleId]); // content selection fallback

  const globalResults = useMemo(() => {
    const query = globalSearch.trim().toLowerCase();
    const allResults: GlobalSearchResult[] = [
      ...courseViews.map((course) => ({
        id: `course-${course.id}`,
        title: course.title,
        subtitle: `${course.category} · ${course.level} · ${course.statusLabel}`,
        type: "Curso" as const,
        tab: "cursos" as AdminTab,
        icon: "▱",
        action: () => {
          setCourseSearch(course.title);
          setCourseStatusFilter("all");
        },
      })),
      ...studentViews.map((student) => ({
        id: `student-${student.id}`,
        title: student.name,
        subtitle: `${student.email} · ${student.statusLabel}`,
        type: "Alumno" as const,
        tab: "alumnos" as AdminTab,
        icon: "◎",
        action: () => {
          setStudentSearch(student.name);
          setSelectedStudentId(student.id);
        },
      })),
      ...certificateViews.map((certificate) => ({
        id: `certificate-${certificate.id}`,
        title: certificate.code,
        subtitle: `${certificate.studentName} · ${certificate.courseTitle}`,
        type: "Certificado" as const,
        tab: "certificados" as AdminTab,
        icon: "✦",
      })),
      ...dashboardData.modules.map((module, index) => ({
        id: `module-${module.id || index}`,
        title: String(module.title || module.name || `Módulo ${index + 1}`),
        subtitle: "Módulo académico",
        type: "Módulo" as const,
        tab: "contenido" as AdminTab,
        icon: "▤",
      })),
      ...dashboardData.exams.map((exam, index) => ({
        id: `exam-${exam.id || index}`,
        title: String(exam.title || exam.name || `Examen ${index + 1}`),
        subtitle: "Evaluación",
        type: "Examen" as const,
        tab: "examenes" as AdminTab,
        icon: "◈",
      })),
    ];

    if (!query) return allResults.slice(0, 8);
    return allResults.filter((item) => [item.title, item.subtitle, item.type].join(" ").toLowerCase().includes(query)).slice(0, 10);
  }, [globalSearch, courseViews, studentViews, certificateViews, dashboardData.modules, dashboardData.exams]);

  async function refreshDashboard(message?: string) {
    setIsRefreshing(true);
    try {
      setDashboardData(await loadDashboardData());
      if (message) setSystemMessage(message);
    } finally {
      setIsRefreshing(false);
    }
  }

  function goToResult(result: GlobalSearchResult) {
    result.action?.();
    setActiveTab(result.tab);
    setGlobalSearchOpen(false);
    setSystemMessage(`Resultado abierto en ${getTabLabel(result.tab)}: ${result.title}`);
  }

  function openCreateCourse() {
    setCourseForm(emptyCourseForm);
    setModalMode("createCourse");
    setSystemMessage(`Formulario de crear curso abierto · ${ADMIN_BUILD_ID}`);
  }

  function openEditCourse(course: CourseAdminView) {
    setCourseForm({
      id: course.id,
      title: course.title,
      subtitle: course.subtitle,
      description: course.description,
      category: course.category === "Sin categoría" ? "" : course.category,
      level: course.level === "Sin nivel" ? "" : course.level,
      price: course.course.price ?? course.course.amount ?? course.course.sale_price ?? "",
      image: course.image,
      status: course.status,
    });
    setModalMode("editCourse");
    setSystemMessage("");
  }

  function openCreateModule(courseId?: string) {
    setModuleForm({ ...emptyModuleForm, courseId: courseId || courseViews[0]?.id || "" });
    setModalMode("createModule");
    setSystemMessage("");
  }

  function openEditModule(module: AnyRecord) {
    setModuleForm({
      id: String(module.id || ""),
      courseId: String(module.course_id || courseViews[0]?.id || ""),
      title: String(module.title || module.name || ""),
      description: String(module.description || module.summary || ""),
      position: String(module.position ?? module.order_index ?? module.sort_order ?? ""),
    });
    setModalMode("editModule");
    setSystemMessage("");
  }

  function openCreateLesson(moduleId?: string) {
    const fallbackModuleId = moduleId || dashboardData.modules[0]?.id || "";
    setLessonForm({
      ...emptyLessonForm,
      moduleId: String(fallbackModuleId || ""),
    });
    setLessonVideoFile(null);
    setLessonAudioFile(null);
    setLessonPdfFile(null);
    setModalMode("createLesson");
    setSystemMessage(`Formulario de crear lección abierto · ${ADMIN_BUILD_ID}`);
  }

  function openEditLesson(lesson: AnyRecord) {
    setLessonForm({
      id: String(lesson.id || ""),
      moduleId: String(lesson.module_id || dashboardData.modules[0]?.id || ""),
      title: String(lesson.title || ""),
      contentType: normalizeLessonContentType(lesson.content_type || lesson.type),
      content: String(lesson.content || ""),
      videoUrl: String(lesson.video_url || ""),
      audioUrl: String(lesson.audio_url || ""),
      pdfUrl: String(lesson.pdf_url || ""),
      sortOrder: String(lesson.sort_order ?? ""),
      durationMinutes: String(lesson.duration_minutes ?? ""),
    });
    setLessonVideoFile(null);
    setLessonAudioFile(null);
    setLessonPdfFile(null);
    setModalMode("editLesson");
    setSystemMessage(`Formulario de editar lección abierto · ${ADMIN_BUILD_ID}`);
  }

  function openSourceUpload() {
    setSourceFileName("");
    setModalMode("sourceUpload");
    setSystemMessage("");
  }

  function openImportDocument() {
    setSourceFileName("");
    setModalMode("importDocument");
    setSystemMessage("");
  }

  async function handleCourseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSystemMessage(`Submit recibido · ${ADMIN_BUILD_ID}`);
    if (!courseForm.title.trim()) {
      setSystemMessage("El curso necesita al menos un título.");
      return;
    }

    setModalBusy(true);
    setSystemMessage(`Guardando curso por RPC seguro · ${ADMIN_BUILD_ID}`);
    try {
      if (modalMode === "editCourse" && courseForm.id) {
        await updateCourseInSupabase(courseForm.id, courseForm);
        await refreshDashboard(`Curso actualizado: ${courseForm.title}`);
      } else {
        await createCourseInSupabase(courseForm);
        await refreshDashboard(`Curso creado como borrador: ${courseForm.title}`);
      }
      setModalMode("none");
      setCourseSearch(courseForm.title);
      setCourseStatusFilter("all");
      setActiveTab("cursos");
    } catch (error) {
      console.error(error);
      setSystemMessage(getErrorMessage(error, "No se pudo guardar el curso. Revisa columnas/RLS de Supabase."));
    } finally {
      setModalBusy(false);
    }
  }

  async function handleModuleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!moduleForm.courseId) {
      setSystemMessage("Selecciona un curso para asociar el módulo.");
      return;
    }
    if (!moduleForm.title.trim()) {
      setSystemMessage("El módulo necesita al menos un título.");
      return;
    }

    setModalBusy(true);
    setSystemMessage(`Guardando módulo por RPC seguro · ${ADMIN_BUILD_ID}`);
    try {
      if (modalMode === "editModule" && moduleForm.id) {
        await updateModuleInSupabase(moduleForm.id, moduleForm);
        await refreshDashboard(`Módulo actualizado: ${moduleForm.title}`);
      } else {
        await createModuleInSupabase(moduleForm);
        await refreshDashboard(`Módulo creado: ${moduleForm.title}`);
      }
      setModalMode("none");
      setActiveTab("contenido");
    } catch (error) {
      console.error(error);
      setSystemMessage(getErrorMessage(error, "No se pudo guardar el módulo. Revisa columnas/RLS de Supabase."));
    } finally {
      setModalBusy(false);
    }
  }

  async function handleLessonSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    setSystemMessage(`Botón guardar lección pulsado · preparando validación · ${ADMIN_BUILD_ID}`);

    try {
      validateLessonAssetFiles(lessonVideoFile, lessonAudioFile, lessonPdfFile);
    } catch (error) {
      setSystemMessage(getErrorMessage(error, "Alguno de los archivos no es válido para subir."));
      return;
    }

    if (!lessonForm.moduleId) {
      setSystemMessage("Selecciona un módulo para asociar la lección.");
      return;
    }

    if (!lessonForm.title.trim()) {
      setSystemMessage("La lección necesita al menos un título.");
      return;
    }

    setModalBusy(true);
    setSystemMessage(`Guardando lección por RPC seguro · ${ADMIN_BUILD_ID}`);

    try {
      const filesToUpload = [lessonVideoFile, lessonAudioFile, lessonPdfFile].filter(Boolean).length;
      setSystemMessage(filesToUpload ? `Subiendo ${filesToUpload} archivo(s) antes de guardar lección · ${ADMIN_BUILD_ID}` : `Guardando lección sin archivos nuevos · ${ADMIN_BUILD_ID}`);

      const lessonPayload = await buildLessonFormWithUploadedAssets({
        form: lessonForm,
        videoFile: lessonVideoFile,
        audioFile: lessonAudioFile,
        pdfFile: lessonPdfFile,
        setSystemMessage,
      });

      if (modalMode === "editLesson" && lessonForm.id) {
        await updateLessonInSupabase(lessonForm.id, lessonPayload);
        await refreshDashboard(`Lección actualizada: ${lessonForm.title}`);
      } else {
        await createLessonInSupabase(lessonPayload);
        await refreshDashboard(`Lección creada: ${lessonForm.title}`);
      }

      setLessonVideoFile(null);
      setLessonAudioFile(null);
      setLessonPdfFile(null);
      setModalMode("none");
      setActiveTab("contenido");
    } catch (error) {
      console.error(error);
      setSystemMessage(getErrorMessage(error, "No se pudo guardar la lección. Revisa funciones RPC o columnas de lessons."));
    } finally {
      setModalBusy(false);
    }
  }

  function handleSourceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sourceFileName.trim()) {
      setSystemMessage("Selecciona un archivo antes de continuar.");
      return;
    }
    setModalMode("none");
    setActiveTab("contenido");
    setSystemMessage("Documento preparado en el panel. Para subida real falta conectar Storage/bucket y tabla de fuentes; no he simulado una subida que no exista.");
  }

  function topCreateAction() {
    if (activeTab === "cursos") return openCreateCourse();
    if (activeTab === "contenido") return openCreateModule();
    if (activeTab === "examenes") return router.push("/ghc-control-center/examenes/crear");
    if (activeTab === "certificados") return setSystemMessage("La emisión real de certificados debe validar curso completado y examen final aprobado antes de crear el PDF.");
    if (activeTab === "comunicaciones") return setSystemMessage("Preparado para crear borradores de comunicación. El envío real quedará siempre sujeto a aprobación humana.");
    openCreateCourse();
  }

  if (guardState === "checking") {
    return (
      <main className="admin-loading">
        <GlobalStyles />
        <Background />
        <section className="admin-loading-card">
          <GHCLogo size="md" showText tagline={false} />
          <h1>GHC Control Center</h1>
          <p>Verificando acceso administrativo...</p>
        </section>
      </main>
    );
  }

  if (guardState !== "allowed") return null;

  return (
    <main className="admin-page">
      <GlobalStyles />
      <Background />

      <aside className="admin-sidebar">
        <div>
          <div className="admin-logo"><GHCLogo size="md" showText tagline={false} /></div>
          <nav className="admin-nav" aria-label="Navegación administrador">
            {adminTabs.map((tab) => (
              <button key={tab.id} type="button" className={activeTab === tab.id ? "admin-nav-item active" : "admin-nav-item"} onClick={() => { setActiveTab(tab.id); setSystemMessage(""); setGlobalSearchOpen(false); }}>
                <span className="admin-nav-icon">{tab.icon}</span>
                <span><strong>{tab.label}</strong><small>{tab.helper}</small></span>
              </button>
            ))}
          </nav>
        </div>

        <div className="admin-sidebar-bottom">
          <div className="support-card">
            <span className="support-icon">◉</span>
            <div><strong>Soporte GHC</strong><p>Centro interno preparado</p></div>
            <button type="button" onClick={() => setSystemMessage("Soporte interno preparado. Lo conectaremos cuando definamos canal real.")}>Abrir soporte</button>
          </div>
          <div className="admin-user-card"><span>{initials}</span><div><strong>{shortName(displayName)}</strong><p>Administrador</p></div></div>
        </div>
      </aside>

      <section className="admin-shell">
        <header className="admin-topbar">
          <div className="breadcrumb"><span>⌂</span><span>Administración</span><span>›</span><strong>{getTabLabel(activeTab)}</strong></div>
          <div className="topbar-actions">
            <div className="admin-search-wrap">
              <label className="admin-search">
                <span>⌕</span>
                <input
                  value={globalSearch}
                  onChange={(event) => { setGlobalSearch(event.target.value); setGlobalSearchOpen(true); }}
                  onFocus={() => setGlobalSearchOpen(true)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && globalResults[0]) { event.preventDefault(); goToResult(globalResults[0]); }
                    if (event.key === "Escape") setGlobalSearchOpen(false);
                  }}
                  placeholder="Buscar alumnos, cursos, módulos, certificados..."
                />
              </label>
              {globalSearchOpen ? (
                <div className="global-search-panel">
                  <div className="global-search-head"><strong>Búsqueda global</strong><button type="button" onClick={() => setGlobalSearchOpen(false)}>Cerrar</button></div>
                  {globalResults.length ? globalResults.map((result) => (
                    <button key={result.id} type="button" className="global-result" onMouseDown={() => goToResult(result)}>
                      <span>{result.icon}</span><div><strong>{result.title}</strong><p>{result.type} · {result.subtitle}</p></div><em>{getTabLabel(result.tab)} ›</em>
                    </button>
                  )) : <div className="global-search-empty"><strong>Sin resultados</strong><p>Prueba por nombre de alumno, curso, módulo o código de certificado.</p></div>}
                </div>
              ) : null}
            </div>
            <button type="button" className="create-btn" onClick={topCreateAction}>+ Crear</button>
            <button type="button" className="studio-top-btn" onClick={() => setActiveTab("studio")}>Studio GHC</button>
            <button type="button" className="icon-btn" onClick={() => refreshDashboard("Datos refrescados desde Supabase.")}>{isRefreshing ? "…" : "↻"}</button>
            <div className="topbar-user"><span>{initials}</span><div><strong>{shortName(displayName)}</strong><p>Administrador</p></div></div>
          </div>
        </header>

        <div className="admin-build-strip">
          <strong>Admin build</strong>
          <span>{ADMIN_BUILD_ID}</span>
          <em>Si no ves esta marca, estás en un deployment o archivo anterior.</em>
        </div>

        {systemMessage ? <div className="admin-notice">{systemMessage}</div> : null}

        {activeTab === "panel" ? <PanelAdmin stats={dashboardStats} recentActivity={recentActivity} priorityTasks={priorityTasks} setActiveTab={setActiveTab} setSystemMessage={setSystemMessage} openCreateCourse={openCreateCourse} openCreateModule={() => openCreateModule()} /> : null}
        {activeTab === "cursos" ? <CursosAdmin stats={dashboardStats} courseViews={filteredCourseViews} allCourseViews={courseViews} search={courseSearch} setSearch={setCourseSearch} statusFilter={courseStatusFilter} setStatusFilter={setCourseStatusFilter} viewMode={courseViewMode} setViewMode={setCourseViewMode} setActiveTab={setActiveTab} setSystemMessage={setSystemMessage} openCreateCourse={openCreateCourse} openEditCourse={openEditCourse} openCreateModule={openCreateModule} /> : null}
        {activeTab === "contenido" ? <ContenidoAdmin stats={dashboardStats} courseViews={courseViews} dashboardData={dashboardData} setActiveTab={setActiveTab} setSystemMessage={setSystemMessage} selectedCourseId={contentCourseId} setSelectedCourseId={setContentCourseId} selectedModuleId={contentModuleId} setSelectedModuleId={setContentModuleId} openCreateModule={openCreateModule} openEditModule={openEditModule} openCreateLesson={openCreateLesson} openEditLesson={openEditLesson} openSourceUpload={openSourceUpload} openImportDocument={openImportDocument} /> : null}
        {activeTab === "alumnos" ? <AlumnosAdmin stats={dashboardStats} students={filteredStudentViews} allStudents={studentViews} selectedStudent={selectedStudent} search={studentSearch} setSearch={setStudentSearch} setSelectedStudentId={setSelectedStudentId} setActiveTab={setActiveTab} setSystemMessage={setSystemMessage} /> : null}
        {activeTab === "examenes" ? <ExamenesAdmin dashboardData={dashboardData} courseViews={courseViews} setActiveTab={setActiveTab} setSystemMessage={setSystemMessage} /> : null}
        {activeTab === "certificados" ? <CertificadosAdmin certificates={certificateViews} setActiveTab={setActiveTab} setSystemMessage={setSystemMessage} /> : null}
        {activeTab === "pagos" ? <PagosAdmin courseViews={courseViews} studentViews={studentViews} setActiveTab={setActiveTab} setSystemMessage={setSystemMessage} /> : null}
        {activeTab === "comunicaciones" ? <ComunicacionesAdmin courseViews={courseViews} studentViews={studentViews} setActiveTab={setActiveTab} setSystemMessage={setSystemMessage} /> : null}
        {activeTab === "analitica" ? <AnaliticaAdmin dashboardData={dashboardData} courseViews={courseViews} studentViews={studentViews} setActiveTab={setActiveTab} setSystemMessage={setSystemMessage} /> : null}
        {activeTab === "seguridad" ? <SeguridadAdmin dashboardData={dashboardData} studentViews={studentViews} setActiveTab={setActiveTab} setSystemMessage={setSystemMessage} /> : null}
        {activeTab === "studio" ? <StudioGHCAdmin courseViews={courseViews} setActiveTab={setActiveTab} setSystemMessage={setSystemMessage} /> : null}
        {activeTab === "ajustes" ? <AjustesAdmin setActiveTab={setActiveTab} setSystemMessage={setSystemMessage} /> : null}
      </section>

      {(modalMode === "createCourse" || modalMode === "editCourse") ? (
        <AdminModal title={modalMode === "editCourse" ? "Editar curso" : "Crear nuevo curso"} eyebrow="Cursos · Supabase" onClose={() => setModalMode("none")}>
          <form className="admin-form" onSubmit={handleCourseSubmit}>
            <div className="form-grid two"><label><span>Título *</span><input value={courseForm.title} onChange={(event) => setCourseForm({ ...courseForm, title: event.target.value })} /></label><label><span>Subtítulo</span><input value={courseForm.subtitle} onChange={(event) => setCourseForm({ ...courseForm, subtitle: event.target.value })} /></label></div>
            <label><span>Descripción</span><textarea value={courseForm.description} onChange={(event) => setCourseForm({ ...courseForm, description: event.target.value })} /></label>
            <div className="form-grid four"><label><span>Categoría</span><input value={courseForm.category} onChange={(event) => setCourseForm({ ...courseForm, category: event.target.value })} /></label><label><span>Nivel</span><select value={courseForm.level} onChange={(event) => setCourseForm({ ...courseForm, level: event.target.value })}><option value="Principiante">Principiante</option><option value="Intermedio">Intermedio</option><option value="Avanzado">Avanzado</option><option value="Profesional">Profesional</option></select></label><label><span>Precio</span><input value={courseForm.price} onChange={(event) => setCourseForm({ ...courseForm, price: event.target.value })} placeholder="197" /></label><label><span>Estado</span><select value={courseForm.status} onChange={(event) => setCourseForm({ ...courseForm, status: event.target.value as CourseStatus })}><option value="draft">Borrador</option><option value="published">Publicado</option><option value="hidden">Oculto</option></select></label></div>
            <label><span>Imagen / URL portada</span><input value={courseForm.image} onChange={(event) => setCourseForm({ ...courseForm, image: event.target.value })} /></label>
            <div className="form-warning"><strong>Regla GHC:</strong> por defecto los cursos nuevos se crean como borrador. No hay publicación automática por IA.</div>
            <div className="modal-actions"><button type="button" onClick={() => setModalMode("none")}>Cancelar</button><button type="submit" disabled={modalBusy}>{modalBusy ? "Guardando..." : modalMode === "editCourse" ? "Guardar cambios" : "Crear borrador"}</button></div>
          </form>
        </AdminModal>
      ) : null}

      {(modalMode === "createModule" || modalMode === "editModule") ? (
        <AdminModal title={modalMode === "editModule" ? "Editar módulo" : "Añadir módulo"} eyebrow="Contenido · Supabase" onClose={() => setModalMode("none")}>
          <form className="admin-form" onSubmit={handleModuleSubmit}>
            <label><span>Curso *</span><select value={moduleForm.courseId} onChange={(event) => setModuleForm({ ...moduleForm, courseId: event.target.value })}><option value="">Seleccionar curso</option>{courseViews.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
            <div className="form-grid two"><label><span>Título del módulo *</span><input value={moduleForm.title} onChange={(event) => setModuleForm({ ...moduleForm, title: event.target.value })} /></label><label><span>Orden</span><input value={moduleForm.position} onChange={(event) => setModuleForm({ ...moduleForm, position: event.target.value })} placeholder="1" /></label></div>
            <label><span>Descripción</span><textarea value={moduleForm.description} onChange={(event) => setModuleForm({ ...moduleForm, description: event.target.value })} /></label>
            <div className="modal-actions"><button type="button" onClick={() => setModalMode("none")}>Cancelar</button><button type="submit" disabled={modalBusy}>{modalBusy ? "Guardando..." : modalMode === "editModule" ? "Guardar módulo" : "Crear módulo"}</button></div>
          </form>
        </AdminModal>
      ) : null}

      {(modalMode === "createLesson" || modalMode === "editLesson") ? (
        <AdminModal title={modalMode === "editLesson" ? "Editar lección" : "Añadir lección"} eyebrow="Contenido · Lecciones" onClose={() => setModalMode("none")}>
          <form className="admin-form" onSubmit={handleLessonSubmit} noValidate>
            <label>
              <span>Módulo *</span>
              <select value={lessonForm.moduleId} onChange={(event) => setLessonForm({ ...lessonForm, moduleId: event.target.value })}>
                <option value="">Seleccionar módulo</option>
                {dashboardData.modules.map((module, index) => (
                  <option key={String(module.id || index)} value={String(module.id || "")}>
                    {module.title || module.name || `Módulo ${index + 1}`}
                  </option>
                ))}
              </select>
            </label>

            <div className="form-grid two">
              <label>
                <span>Título de la lección *</span>
                <input value={lessonForm.title} onChange={(event) => setLessonForm({ ...lessonForm, title: event.target.value })} />
              </label>

              <label>
                <span>Tipo de contenido</span>
                <select value={lessonForm.contentType} onChange={(event) => setLessonForm({ ...lessonForm, contentType: event.target.value as LessonFormState["contentType"] })}>
                  <option value="text">Texto</option>
                  <option value="video">Vídeo</option>
                  <option value="audio">Audio</option>
                  <option value="pdf">PDF</option>
                  <option value="mixed">Mixto</option>
                </select>
              </label>
            </div>

            <div className="form-grid two">
              <label>
                <span>Orden</span>
                <input value={lessonForm.sortOrder} onChange={(event) => setLessonForm({ ...lessonForm, sortOrder: event.target.value })} placeholder="1" />
              </label>

              <label>
                <span>Duración estimada en minutos</span>
                <input value={lessonForm.durationMinutes} onChange={(event) => setLessonForm({ ...lessonForm, durationMinutes: event.target.value })} placeholder="10" />
              </label>
            </div>

            <label>
              <span>Contenido / texto base</span>
              <textarea value={lessonForm.content} onChange={(event) => setLessonForm({ ...lessonForm, content: event.target.value })} />
            </label>

            <div className="lesson-upload-grid">
              <label className={lessonVideoFile || lessonForm.videoUrl ? "lesson-upload-field active" : "lesson-upload-field"}>
                <span>Cargar vídeo</span>
                <input
                  type="file"
                  accept="video/*,.mp4,.mov,.webm,.m4v"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setLessonVideoFile(file);
                    setSystemMessage(file ? `Vídeo seleccionado: ${file.name} · ${formatFileSize(file.size)}` : "Vídeo quitado.");
                  }}
                />
                <small>{formatAssetFileLabel(lessonVideoFile, lessonForm.videoUrl, "Sin vídeo cargado")}</small>
              </label>

              <label className={lessonAudioFile || lessonForm.audioUrl ? "lesson-upload-field active" : "lesson-upload-field"}>
                <span>Cargar audio</span>
                <input
                  type="file"
                  accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setLessonAudioFile(file);
                    setSystemMessage(file ? `Audio seleccionado: ${file.name} · ${formatFileSize(file.size)}` : "Audio quitado.");
                  }}
                />
                <small>{formatAssetFileLabel(lessonAudioFile, lessonForm.audioUrl, "Sin audio cargado")}</small>
              </label>

              <label className={lessonPdfFile || lessonForm.pdfUrl ? "lesson-upload-field active" : "lesson-upload-field"}>
                <span>Cargar PDF</span>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setLessonPdfFile(file);
                    setSystemMessage(file ? `PDF seleccionado: ${file.name} · ${formatFileSize(file.size)}` : "PDF quitado.");
                  }}
                />
                <small>{formatAssetFileLabel(lessonPdfFile, lessonForm.pdfUrl, "Sin PDF cargado")}</small>
              </label>
            </div>

            {(lessonForm.pdfUrl || lessonForm.videoUrl || lessonForm.audioUrl) ? (
              <div className="lesson-existing-assets">
                <strong>Archivos privados asociados</strong>
                {lessonForm.pdfUrl ? (
                  <button type="button" onClick={() => openPrivateLessonAsset(lessonForm.pdfUrl, setSystemMessage, "PDF")}>
                    Ver PDF actual
                  </button>
                ) : null}
                {lessonForm.videoUrl ? (
                  <button type="button" onClick={() => openPrivateLessonAsset(lessonForm.videoUrl, setSystemMessage, "vídeo")}>
                    Ver vídeo actual
                  </button>
                ) : null}
                {lessonForm.audioUrl ? (
                  <button type="button" onClick={() => openPrivateLessonAsset(lessonForm.audioUrl, setSystemMessage, "audio")}>
                    Ver audio actual
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="form-warning">
              <strong>Nota GHC:</strong> los archivos se suben al bucket privado ghc-course-assets. Más adelante serviremos el contenido al alumno con URLs firmadas y control de acceso.
            </div>

            <div className="modal-actions">
              <button type="button" onClick={() => setModalMode("none")}>Cancelar</button>
              <button type="submit" disabled={modalBusy} className="lesson-submit-button">
                {modalBusy ? "Subiendo y guardando..." : modalMode === "editLesson" ? "Guardar lección y archivos" : "Crear lección y subir archivos"}
              </button>
            </div>
          </form>
        </AdminModal>
      ) : null}

      {(modalMode === "sourceUpload" || modalMode === "importDocument") ? (
        <AdminModal title={modalMode === "importDocument" ? "Importador Word/PDF" : "Subir fuente"} eyebrow="Contenido fuente" onClose={() => setModalMode("none")}>
          <form className="admin-form" onSubmit={handleSourceSubmit}>
            <div className="source-drop"><span>DOCX / PDF</span><strong>{sourceFileName || "Selecciona un documento fuente"}</strong><p>Este panel queda preparado sin simular publicación. Para subir realmente el archivo hará falta conectar Supabase Storage y una tabla de fuentes.</p><input type="file" accept=".pdf,.doc,.docx" onChange={(event) => setSourceFileName(event.target.files?.[0]?.name || "")} /></div>
            <div className="form-warning"><strong>Importante:</strong> la IA podrá preparar borradores de estructura, pero nunca publicará contenido sin revisión humana.</div>
            <div className="modal-actions"><button type="button" onClick={() => setModalMode("none")}>Cancelar</button><button type="submit">Preparar documento</button></div>
          </form>
        </AdminModal>
      ) : null}
    </main>
  );
}

async function loadDashboardData(): Promise<DashboardData> {
  const [profiles, courses, modules, lessons, certificates, courseCompletions, moduleCompletions, lessonProgress, exams, examQuestions, examResults, examAttempts] = await Promise.all([
    safeSelect("profiles", "*"), safeSelect("courses", "*"), safeSelect("modules", "*"), safeSelect("lessons", "*"), safeSelect("certificates", "*"), safeSelect("course_completions", "*"), safeSelect("module_completions", "*"), safeSelect("lesson_progress", "*"), safeSelect("exams", "*"), safeSelect("exam_questions", "*"), safeSelect("exam_results", "*"), safeSelect("exam_attempts", "*"),
  ]);
  return { profiles, courses, modules, lessons, certificates, courseCompletions, moduleCompletions, lessonProgress, exams, examQuestions, examResults, examAttempts };
}

async function safeSelect(table: string, columns: string): Promise<AnyRecord[]> {
  try {
    const { data, error } = await supabase.from(table).select(columns);
    if (error) {
      console.warn(`[GHC Admin] No se pudo cargar ${table}:`, error.message);
      return [];
    }
    return Array.isArray(data) ? data as AnyRecord[] : [];
  } catch (error) {
    console.warn(`[GHC Admin] Error leyendo ${table}:`, error);
    return [];
  }
}

async function createCourseInSupabase(form: CourseFormState) {
  const priceNumber = parseAdminNumber(form.price);
  const slug = createSlug(form.title);

  const { data, error } = await withTimeout(
    supabase.rpc("ghc_admin_create_course", {
      p_title: form.title.trim(),
      p_slug: slug,
      p_subtitle: form.subtitle.trim() || null,
      p_description: form.description.trim() || null,
      p_category: form.category.trim() || null,
      p_level: form.level.trim() || null,
      p_price: priceNumber ?? null,
      p_status: form.status,
      p_image_url: form.image.trim() || null,
    }),
    12000,
    "Supabase no respondió al crear el curso mediante función segura."
  );

  if (error) {
    throw normalizeSupabaseWriteError(error, "courses", "insert");
  }

  return data;
}

async function updateCourseInSupabase(id: string, form: CourseFormState) {
  const priceNumber = parseAdminNumber(form.price);
  const slug = createSlug(form.title);

  const { data, error } = await withTimeout(
    supabase.rpc("ghc_admin_update_course", {
      p_course_id: id,
      p_title: form.title.trim(),
      p_slug: slug,
      p_subtitle: form.subtitle.trim() || null,
      p_description: form.description.trim() || null,
      p_category: form.category.trim() || null,
      p_level: form.level.trim() || null,
      p_price: priceNumber ?? null,
      p_status: form.status,
      p_image_url: form.image.trim() || null,
    }),
    12000,
    "Supabase no respondió al actualizar el curso mediante función segura."
  );

  if (error) {
    throw normalizeSupabaseWriteError(error, "courses", "update");
  }

  return data;
}

async function createModuleInSupabase(form: ModuleFormState) {
  const position = parseAdminNumber(form.position);

  const { data, error } = await withTimeout(
    supabase.rpc("ghc_admin_create_module", {
      p_course_id: form.courseId,
      p_title: form.title.trim(),
      p_description: form.description.trim() || null,
      p_position: position ?? null,
    }),
    12000,
    "Supabase no respondió al crear el módulo mediante función segura."
  );

  if (error) {
    throw normalizeSupabaseWriteError(error, "modules", "insert");
  }

  return data;
}

async function updateModuleInSupabase(id: string, form: ModuleFormState) {
  const position = parseAdminNumber(form.position);

  const { data, error } = await withTimeout(
    supabase.rpc("ghc_admin_update_module", {
      p_module_id: id,
      p_course_id: form.courseId,
      p_title: form.title.trim(),
      p_description: form.description.trim() || null,
      p_position: position ?? null,
    }),
    12000,
    "Supabase no respondió al actualizar el módulo mediante función segura."
  );

  if (error) {
    throw normalizeSupabaseWriteError(error, "modules", "update");
  }

  return data;
}

async function writeWithFallback(table: string, mode: "insert" | "update", attempts: AnyRecord[], id?: string) {
  let lastError: any = null;

  for (const payload of attempts) {
    try {
      const request =
        mode === "insert"
          ? supabase.from(table).insert(payload).select("*").single()
          : supabase.from(table).update(payload).eq("id", id).select("*").single();

      const response = await withTimeout(
        request,
        12000,
        `Supabase no respondió al intentar ${mode === "insert" ? "crear" : "actualizar"} en ${table}.`
      );

      if (!response.error) return response.data;

      lastError = response.error;

      const message = String(response.error.message || "").toLowerCase();
      const details = String(response.error.details || "").toLowerCase();
      const hint = String(response.error.hint || "").toLowerCase();
      const full = `${message} ${details} ${hint}`;

      const recoverable =
        full.includes("column") ||
        full.includes("schema") ||
        full.includes("could not find") ||
        full.includes("does not exist") ||
        full.includes("violates not-null") ||
        full.includes("not-null");

      if (!recoverable) break;
    } catch (error) {
      lastError = error;
      break;
    }
  }

  throw normalizeSupabaseWriteError(lastError, table, mode);
}

async function withTimeout<T>(promiseLike: PromiseLike<T>, milliseconds: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(message));
    }, milliseconds);
  });

  try {
    return await Promise.race([Promise.resolve(promiseLike), timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function normalizeSupabaseWriteError(error: any, table: string, mode: "insert" | "update") {
  const fallback = `No se pudo ${mode === "insert" ? "crear" : "actualizar"} el registro en ${table}.`;

  if (!error) return new Error(fallback);

  const message = String(error.message || "");
  const details = String(error.details || "");
  const hint = String(error.hint || "");
  const fullMessage = [message, details, hint].filter(Boolean).join(" · ");

  if (!fullMessage) return new Error(fallback);

  const lower = fullMessage.toLowerCase();

  if (
    lower.includes("ghc_admin_create_course") ||
    lower.includes("ghc_admin_update_course") ||
    lower.includes("ghc_admin_create_module") ||
    lower.includes("ghc_admin_create_lesson") ||
    lower.includes("ghc_admin_update_lesson") ||
    lower.includes("ghc_admin_update_module") ||
    lower.includes("function") && lower.includes("does not exist")
  ) {
    return new Error(`${fullMessage} · Falta ejecutar el SQL de funciones seguras GHC en Supabase.`);
  }

  if (lower.includes("permission denied") || lower.includes("not authorized") || lower.includes("unauthorized") || lower.includes("admin permission")) {
    return new Error(`${fullMessage} · Tu usuario no está autorizado por la función segura de GHC. Revisa profiles.role y el email.`);
  }

  if (lower.includes("row-level security")) {
    return new Error(`${fullMessage} · RLS bloquea la operación directa. Usa las funciones seguras GHC del SQL actualizado.`);
  }

  if (lower.includes("slug")) {
    return new Error(`${fullMessage} · Hay una restricción sobre slug. El sistema ya lo genera automáticamente; revisa unicidad o nombre de columna.`);
  }

  return new Error(fullMessage);
}

function createSlug(value: string) {
  const base = String(value || "curso-ghc")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);

  const suffix = Math.random().toString(36).slice(2, 7);

  return `${base || "curso-ghc"}-${suffix}`;
}

function formatAssetFileLabel(file: File | null, storedPath: string, emptyLabel: string) {
  if (file) {
    return `${file.name} · ${formatFileSize(file.size)}`;
  }

  if (storedPath) {
    return storedPath;
  }

  return emptyLabel;
}

function formatFileSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) return "0 KB";
  const mb = size / (1024 * 1024);

  if (mb >= 1) {
    return `${mb.toFixed(2)} MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function validateLessonAssetFiles(videoFile: File | null, audioFile: File | null, pdfFile: File | null) {
  const maxVideoMb = 250;
  const maxAudioMb = 80;
  const maxPdfMb = 80;

  if (videoFile && videoFile.size > maxVideoMb * 1024 * 1024) {
    throw new Error(`El vídeo pesa ${formatFileSize(videoFile.size)}. Para esta prueba usa un vídeo menor de ${maxVideoMb} MB.`);
  }

  if (audioFile && audioFile.size > maxAudioMb * 1024 * 1024) {
    throw new Error(`El audio pesa ${formatFileSize(audioFile.size)}. Para esta prueba usa un audio menor de ${maxAudioMb} MB.`);
  }

  if (pdfFile && pdfFile.size > maxPdfMb * 1024 * 1024) {
    throw new Error(`El PDF pesa ${formatFileSize(pdfFile.size)}. Para esta prueba usa un PDF menor de ${maxPdfMb} MB.`);
  }
}

async function openPrivateLessonAsset(pathValue: unknown, setSystemMessage: (message: string) => void, label = "archivo") {
  const path = String(pathValue || "").trim();

  if (!path || path.toLowerCase() === "null") {
    setSystemMessage(`Esta lección no tiene ${label} asociado.`);
    return;
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    window.open(path, "_blank", "noopener,noreferrer");
    setSystemMessage(`Archivo externo abierto para ${label}.`);
    return;
  }

  setSystemMessage(`Generando enlace privado temporal para ${label} · ${ADMIN_BUILD_ID}`);

  const { data, error } = await withTimeout(
    supabase.storage
      .from(COURSE_ASSETS_BUCKET)
      .createSignedUrl(path, 60 * 10),
    12000,
    `Supabase Storage no respondió al generar enlace firmado para ${label}.`
  );

  if (error || !data?.signedUrl) {
    setSystemMessage(`${error?.message || "No se pudo generar enlace privado temporal."} · Revisa que el archivo exista en ${COURSE_ASSETS_BUCKET}.`);
    return;
  }

  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  setSystemMessage(`Enlace privado temporal generado para ${label}. Caduca en 10 minutos.`);
}

async function buildLessonFormWithUploadedAssets({
  form,
  videoFile,
  audioFile,
  pdfFile,
  setSystemMessage,
}: {
  form: LessonFormState;
  videoFile: File | null;
  audioFile: File | null;
  pdfFile: File | null;
  setSystemMessage: (message: string) => void;
}): Promise<LessonFormState> {
  const nextForm = { ...form };

  if (videoFile) {
    setSystemMessage(`Subiendo vídeo a Storage · ${ADMIN_BUILD_ID}`);
    nextForm.videoUrl = await uploadLessonAsset(videoFile, form.moduleId, "video");
  }

  if (audioFile) {
    setSystemMessage(`Subiendo audio a Storage · ${ADMIN_BUILD_ID}`);
    nextForm.audioUrl = await uploadLessonAsset(audioFile, form.moduleId, "audio");
  }

  if (pdfFile) {
    setSystemMessage(`Subiendo PDF a Storage · ${ADMIN_BUILD_ID}`);
    nextForm.pdfUrl = await uploadLessonAsset(pdfFile, form.moduleId, "pdf");
  }

  return nextForm;
}

async function uploadLessonAsset(file: File, moduleId: string, assetType: "video" | "audio" | "pdf") {
  const extension = getFileExtension(file.name);
  const safeName = createSafeFileName(file.name);
  const path = [
    "modules",
    moduleId || "sin-modulo",
    "lessons",
    assetType,
    `${Date.now()}-${safeName}${extension ? `.${extension}` : ""}`,
  ].join("/");

  const { data, error } = await withTimeout(
    supabase.storage
      .from(COURSE_ASSETS_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      }),
    30000,
    `Supabase Storage no respondió al subir ${assetType}.`
  );

  if (error) {
    throw new Error(`${error.message} · No se pudo subir el archivo al bucket privado ${COURSE_ASSETS_BUCKET}.`);
  }

  return data.path;
}

function getFileExtension(fileName: string) {
  const clean = String(fileName || "").split("?")[0].split("#")[0];
  const parts = clean.split(".");
  if (parts.length <= 1) return "";
  return parts.pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "";
}

function createSafeFileName(fileName: string) {
  const base = String(fileName || "archivo")
    .replace(/\.[^/.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return base || "archivo";
}

async function createLessonInSupabase(form: LessonFormState) {
  const sortOrder = parseAdminNumber(form.sortOrder);
  const durationMinutes = parseAdminNumber(form.durationMinutes);

  const { data, error } = await withTimeout(
    supabase.rpc("ghc_admin_create_lesson", {
      p_module_id: form.moduleId,
      p_title: form.title.trim(),
      p_content_type: normalizeLessonContentType(form.contentType),
      p_content: form.content.trim() || null,
      p_video_url: form.videoUrl.trim() || null,
      p_audio_url: form.audioUrl.trim() || null,
      p_pdf_url: form.pdfUrl.trim() || null,
      p_sort_order: sortOrder ? Math.round(sortOrder) : 1,
      p_duration_minutes: durationMinutes ? Math.round(durationMinutes) : 0,
    }),
    12000,
    "Supabase no respondió al crear la lección mediante función segura."
  );

  if (error) {
    throw normalizeSupabaseWriteError(error, "lessons", "insert");
  }

  return data;
}

async function updateLessonInSupabase(id: string, form: LessonFormState) {
  const sortOrder = parseAdminNumber(form.sortOrder);
  const durationMinutes = parseAdminNumber(form.durationMinutes);

  const { data, error } = await withTimeout(
    supabase.rpc("ghc_admin_update_lesson", {
      p_lesson_id: id,
      p_module_id: form.moduleId,
      p_title: form.title.trim(),
      p_content_type: normalizeLessonContentType(form.contentType),
      p_content: form.content.trim() || null,
      p_video_url: form.videoUrl.trim() || null,
      p_audio_url: form.audioUrl.trim() || null,
      p_pdf_url: form.pdfUrl.trim() || null,
      p_sort_order: sortOrder ? Math.round(sortOrder) : 1,
      p_duration_minutes: durationMinutes ? Math.round(durationMinutes) : 0,
    }),
    12000,
    "Supabase no respondió al actualizar la lección mediante función segura."
  );

  if (error) {
    throw normalizeSupabaseWriteError(error, "lessons", "update");
  }

  return data;
}

function normalizeLessonContentType(value: unknown): LessonFormState["contentType"] {
  const type = String(value || "text").toLowerCase();

  if (["video", "vídeo"].includes(type)) return "video";
  if (type === "audio") return "audio";
  if (type === "pdf") return "pdf";
  if (["mixed", "mixto"].includes(type)) return "mixed";

  return "text";
}

function getLessonTypeLabel(value: unknown) {
  const type = normalizeLessonContentType(value);

  if (type === "video") return "Vídeo";
  if (type === "audio") return "Audio";
  if (type === "pdf") return "PDF";
  if (type === "mixed") return "Mixto";

  return "Texto";
}

function cleanPayload(payload: AnyRecord) { return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== "")); }
function parseAdminNumber(value: unknown) { if (value === null || value === undefined || value === "") return undefined; const numeric = Number(String(value).replace(/[^\d,.]/g, "").replace(/\./g, "").replace(",", ".")); return Number.isFinite(numeric) ? numeric : undefined; }

function buildDashboardStats(data: DashboardData) {
  const students = data.profiles.filter((profile) => !["admin", "superadmin", "owner"].includes(String(profile.role || "student").toLowerCase()));
  const publishedCourses = data.courses.filter((course) => normalizeCourseStatus(course) === "published");
  const draftCourses = data.courses.filter((course) => normalizeCourseStatus(course) === "draft");
  const hiddenCourses = data.courses.filter((course) => normalizeCourseStatus(course) === "hidden");
  const validCertificates = data.certificates.filter((certificate) => !["revoked", "revocado", "cancelled", "cancelado"].includes(String(certificate.status || "valid").toLowerCase()));
  const completedCourses = data.courseCompletions.filter((item) => item.completed === true || String(item.status || "").toLowerCase() === "completed");
  const completionRate = students.length > 0 ? Math.round((completedCourses.length / Math.max(students.length, 1)) * 100) : 0;
  return { studentsTotal: students.length, activeStudents: students.length, coursesTotal: data.courses.length, publishedCourses: publishedCourses.length, draftCourses: draftCourses.length, hiddenCourses: hiddenCourses.length, certificates: validCertificates.length, modules: data.modules.length, lessons: data.lessons.length, moduleCompletions: data.moduleCompletions.length, lessonProgress: data.lessonProgress.length, completionRate: Math.min(100, completionRate), pendingReviews: draftCourses.length + Math.max(0, data.certificates.length - validCertificates.length) };
}

function buildCourseAdminViews(data: DashboardData): CourseAdminView[] {
  return data.courses.map((course, index) => {
    const id = String(course.id || `course-${index}`);
    const courseModules = data.modules.filter((module) => String(module.course_id) === id);
    const moduleIds = new Set(courseModules.map((module) => String(module.id)));
    const courseLessons = data.lessons.filter((lesson) => moduleIds.has(String(lesson.module_id)));
    const completions = data.courseCompletions.filter((item) => String(item.course_id) === id);
    const status = normalizeCourseStatus(course);
    return { course, id, title: String(course.title || course.name || "Curso GHC Academy"), subtitle: String(course.subtitle || course.short_description || "Formación premium basada en ciencia y aplicación real."), description: String(course.description || course.summary || "Curso preparado para edición, maquetación y publicación desde el panel administrador."), status, statusLabel: getCourseStatusLabel(status), level: String(course.level || course.difficulty || "Sin nivel"), category: String(course.category || course.course_type || course.type || course.area || "Sin categoría"), price: formatCoursePrice(course), modulesCount: courseModules.length, lessonsCount: courseLessons.length, enrollmentsCount: completions.length, updatedAt: formatShortDate(course.updated_at || course.created_at || course.published_at), image: getCourseImage(course), progressHint: Math.min(100, Math.max(12, Math.round(((courseLessons.length || courseModules.length || index + 1) / 12) * 100))) };
  }).sort((a, b) => a.status === "draft" && b.status !== "draft" ? -1 : a.status !== "draft" && b.status === "draft" ? 1 : a.title.localeCompare(b.title));
}

function buildStudentAdminViews(data: DashboardData, courseViews: CourseAdminView[]): StudentAdminView[] {
  return data.profiles.filter((profile) => !["admin", "superadmin", "owner"].includes(String(profile.role || "student").toLowerCase())).map((profile, index) => {
    const id = String(profile.id || profile.user_id || `student-${index}`);
    const studentLessons = data.lessonProgress.filter((item) => String(item.user_id) === id);
    const studentCompletedCourses = data.courseCompletions.filter((item) => String(item.user_id) === id);
    const studentCertificates = data.certificates.filter((item) => String(item.user_id) === id);
    const activeCourseIds = new Set<string>();
    studentLessons.forEach((item) => { if (item.course_id) activeCourseIds.add(String(item.course_id)); });
    studentCompletedCourses.forEach((item) => { if (item.course_id) activeCourseIds.add(String(item.course_id)); });
    studentCertificates.forEach((item) => { if (item.course_id) activeCourseIds.add(String(item.course_id)); });
    const completedLessons = studentLessons.filter((item) => item.completed === true || String(item.status || "").toLowerCase() === "completed").length;
    const progress = data.lessons.length > 0 ? Math.min(100, Math.round((completedLessons / data.lessons.length) * 100)) : 0;
    const lastActivityRaw = profile.last_sign_in_at || profile.last_seen_at || profile.updated_at || profile.created_at || null;
    const inactiveDays = getInactiveDays(lastActivityRaw);
    const risk = getStudentRisk(inactiveDays, progress);
    const name = String(profile.full_name || profile.name || profile.display_name || profile.email || `Alumno ${index + 1}`);
    const email = String(profile.email || "Email no registrado");
    const blocked = ["blocked", "suspended", "bloqueado", "suspendido"].includes(String(profile.status || "").toLowerCase());
    return { id, profile, name, email, initials: getInitials(name), status: (blocked ? "blocked" : risk.status) as StudentAdminView["status"], statusLabel: blocked ? "Bloqueado" : risk.statusLabel, progress, completedLessons, completedCourses: studentCompletedCourses.length, activeCourses: activeCourseIds.size, certificates: studentCertificates.length, lastActivity: formatRelative(lastActivityRaw), inactiveDays, riskLabel: risk.label, riskTone: risk.tone, totalInvested: "Pendiente", commercialTier: studentCertificates.length > 0 || studentCompletedCourses.length > 1 ? "Alumno comprometido" : "Por clasificar", commercialHint: "Conectar con Pagos y accesos", latestCourse: getLatestCourseName(activeCourseIds, courseViews), followUpStatus: risk.tone === "red" ? "Requiere contacto" : risk.tone === "yellow" ? "Seguimiento recomendado" : "Sin alerta" };
  }).sort((a, b) => ({ red: 0, yellow: 1, muted: 2, green: 3 }[a.riskTone] ?? 3) - (({ red: 0, yellow: 1, muted: 2, green: 3 }[b.riskTone] ?? 3)) || a.name.localeCompare(b.name));
}

function buildCertificateAdminViews(data: DashboardData, courseViews: CourseAdminView[], studentViews: StudentAdminView[]): CertificateAdminView[] {
  const real = data.certificates.map((certificate, index) => {
    const student = studentViews.find((item) => String(item.id) === String(certificate.user_id));
    const course = courseViews.find((item) => String(item.id) === String(certificate.course_id));
    const status = normalizeCertificateStatus(certificate.status);
    const code = getCertificateCode(certificate, index);
    return { id: String(certificate.id || `certificate-${index}`), studentName: String(certificate.student_name_snapshot || certificate.student_name || student?.name || "Alumno GHC"), studentEmail: String(student?.email || certificate.student_email || "Sin email"), courseTitle: String(certificate.course_title_snapshot || certificate.course_title || course?.title || "Curso GHC Academy"), code, verificationPath: `/certificados/${certificate.verification_slug || code}`, issuedAt: formatShortDate(certificate.issued_at || certificate.created_at), score: formatCertificateScore(certificate.final_score ?? certificate.score ?? certificate.grade), status, statusLabel: getCertificateStatusLabel(status), downloadable: status === "valid" };
  });
  if (real.length) return real;
  return courseViews.slice(0, 3).map((course, index) => { const student = studentViews[index]; const code = `GHC-${new Date().getFullYear()}-${320001 + index}-${makeVerificationSuffix(`${student?.id || "student"}-${course.id}`)}`; return { id: `pending-certificate-${index}`, studentName: student?.name || "Alumno pendiente", studentEmail: student?.email || "Pendiente de asignar", courseTitle: course.title, code, verificationPath: `/certificados/${code}`, issuedAt: "Pendiente", score: "Pendiente", status: "pending", statusLabel: "Pendiente", downloadable: false }; });
}

function buildRecentActivity(data: DashboardData) {
  const items: { icon: string; title: string; label: string; time: string }[] = [];
  data.certificates.slice(0, 2).forEach((certificate) => items.push({ icon: "✦", title: `Certificado emitido${certificate.course_title ? ` · ${certificate.course_title}` : ""}`, label: "Certificados", time: formatRelative(certificate.issued_at || certificate.created_at) }));
  data.courses.slice(0, 2).forEach((course) => items.push({ icon: "▱", title: `Curso disponible · ${course.title || "Curso GHC Academy"}`, label: "Cursos", time: formatRelative(course.updated_at || course.created_at) }));
  data.profiles.slice(0, 2).forEach((profile) => items.push({ icon: "◎", title: `Alumno registrado · ${profile.full_name || profile.email || "Nuevo alumno"}`, label: "Alumnos", time: formatRelative(profile.created_at) }));
  return items.length ? items.slice(0, 5) : [{ icon: "◎", title: "Panel conectado y preparado para actividad real", label: "Sistema", time: "Ahora" }, { icon: "▱", title: "Los eventos aparecerán cuando haya actividad en Supabase", label: "Actividad", time: "Próximamente" }];
}

function buildPriorityTasks(data: DashboardData) {
  const draftCourses = data.courses.filter((course) => normalizeCourseStatus(course) === "draft");
  const pendingCertificates = data.certificates.filter((certificate) => ["pending", "pendiente", "review", "revision"].includes(String(certificate.status || "").toLowerCase()));
  const tasks: { title: string; text: string; tag: string }[] = [];
  draftCourses.slice(0, 2).forEach((course) => tasks.push({ title: course.title || "Curso en borrador", text: "Pendiente de maquetación, revisión o publicación", tag: "Curso" }));
  pendingCertificates.slice(0, 2).forEach((certificate) => tasks.push({ title: certificate.course_title || "Certificado pendiente", text: "Revisar requisitos antes de emitir", tag: "Certificado" }));
  return tasks.length ? tasks : [{ title: "Sin incidencias críticas", text: "No hay revisiones urgentes detectadas en este momento", tag: "OK" }, { title: "Cursos en preparación", text: "Puedes empezar a maquetar borradores desde Cursos", tag: "Próximo" }];
}

function PanelAdmin({ stats, recentActivity, priorityTasks, setActiveTab, setSystemMessage, openCreateCourse, openCreateModule }: { stats: ReturnType<typeof buildDashboardStats>; recentActivity: { icon: string; title: string; label: string; time: string }[]; priorityTasks: { title: string; text: string; tag: string }[]; setActiveTab: (tab: AdminTab) => void; setSystemMessage: (message: string) => void; openCreateCourse: () => void; openCreateModule: () => void; }) {
  return <div className="panel-page"><section className="admin-hero"><div><p className="admin-kicker">GHC Academy Control Center</p><h1>Panel de control</h1><p>Gestiona cursos, alumnos, accesos, certificados y crecimiento desde una cabina premium.</p></div><div className="hero-athlete" aria-hidden="true" /></section><section className="kpi-grid"><KpiCard title="Alumnos activos" value={formatNumber(stats.activeStudents)} trend="Base real Supabase" icon="◎" /><KpiCard title="Cursos publicados" value={formatNumber(stats.publishedCourses)} trend={`${stats.draftCourses} borradores`} icon="▱" /><KpiCard title="Ingresos del mes" value="Próximo" trend="Stripe/SumUp pendiente" icon="$" muted /><KpiCard title="Tasa de finalización" value={`${stats.completionRate}%`} trend="Según cursos completados" icon="✓" /><KpiCard title="Pendientes" value={formatNumber(stats.pendingReviews)} trend="Revisiones abiertas" icon="◷" danger={stats.pendingReviews > 0} /></section><section className="admin-main-grid"><article className="growth-card"><div className="card-head"><div><h2>Crecimiento de la academia</h2><p>Vista operativa del avance académico y actividad general.</p></div><button type="button" onClick={() => setSystemMessage("Vista mensual preparada.")}>Este mes</button></div><div className="chart-area"><ChartSvg /></div><div className="chart-summary"><MiniMetric label="Alumnos registrados" value={formatNumber(stats.studentsTotal)} trend="real" /><MiniMetric label="Lecciones completadas" value={formatNumber(stats.lessonProgress)} trend="real" /><MiniMetric label="Módulos completados" value={formatNumber(stats.moduleCompletions)} trend="real" /><MiniMetric label="Certificados emitidos" value={formatNumber(stats.certificates)} trend="real" /></div></article><article className="quick-actions-card"><h2>Acciones rápidas</h2><div className="quick-actions-grid"><QuickAction icon="▱" title="Crear curso" text="Nuevo borrador real en Supabase" onClick={openCreateCourse} /><QuickAction icon="＋" title="Añadir módulo" text="Estructura académica real" onClick={openCreateModule} /><QuickAction icon="✦" title="Certificados" text="Credenciales oficiales" onClick={() => setActiveTab("certificados")} /><QuickAction icon="➤" title="Comunicados" text="Borradores revisables" onClick={() => setActiveTab("comunicaciones")} /></div></article><article className="activity-card"><div className="card-head compact"><h2>Actividad reciente</h2><button type="button" onClick={() => setSystemMessage("Más adelante conectaremos histórico completo de actividad.")}>Ver todo</button></div>{recentActivity.map((item, index) => <ActivityItem key={`${item.title}-${index}`} icon={item.icon} title={item.title} label={item.label} time={item.time} />)}</article><article className="platform-card"><h2>Estado de la plataforma</h2><div className="platform-body"><div className="shield">✓</div><div className="status-list"><StatusRow label="Supabase Auth" value="Operativo" /><StatusRow label="Ruta privada admin" value="Activa" /><StatusRow label="Rol administrador" value="Verificado" /><StatusRow label="Pagos" value="Pendiente" warning /></div></div><div className="platform-progress"><span>Base administrativa</span><strong>Activa</strong></div></article><article className="review-card"><div className="card-head compact"><h2>Tareas prioritarias</h2><button type="button" onClick={() => setSystemMessage("Las tareas reales se conectarán por módulo del administrador.")}>Ver todas</button></div>{priorityTasks.map((item, index) => <ReviewItem key={`${item.title}-${index}`} title={item.title} text={item.text} tag={item.tag} />)}</article><article className="studio-card"><div><h2>Todo tu contenido, editable desde el panel</h2><p>Studio GHC será el editor visual para landing, catálogo, textos, banners, checkout y experiencia pública.</p><button type="button" onClick={() => setActiveTab("studio")}>Ir a Studio ↗</button></div><div className="studio-visual" aria-hidden="true"><div /><span /><span /></div></article></section></div>;
}

function CursosAdmin({ stats, courseViews, allCourseViews, search, setSearch, statusFilter, setStatusFilter, viewMode, setViewMode, setActiveTab, setSystemMessage, openCreateCourse, openEditCourse, openCreateModule }: { stats: ReturnType<typeof buildDashboardStats>; courseViews: CourseAdminView[]; allCourseViews: CourseAdminView[]; search: string; setSearch: (value: string) => void; statusFilter: CourseStatusFilter; setStatusFilter: (value: CourseStatusFilter) => void; viewMode: CourseViewMode; setViewMode: (value: CourseViewMode) => void; setActiveTab: (tab: AdminTab) => void; setSystemMessage: (message: string) => void; openCreateCourse: () => void; openEditCourse: (course: CourseAdminView) => void; openCreateModule: (courseId?: string) => void; }) {
  const totalLessons = allCourseViews.reduce((acc, item) => acc + item.lessonsCount, 0); const totalModules = allCourseViews.reduce((acc, item) => acc + item.modulesCount, 0); const totalEnrollments = allCourseViews.reduce((acc, item) => acc + item.enrollmentsCount, 0);
  return <div className="courses-admin-page"><section className="courses-hero"><div><p className="admin-kicker">Gestión académica y comercial</p><h1>Cursos</h1><p>Maqueta, revisa y publica cursos desde el panel. La creación real entra como borrador para revisión humana.</p></div><div className="courses-hero-panel"><span>Editor funcional</span><strong>Catálogo, módulos, precios y visibilidad</strong><p>Crear y editar curso ya queda conectado con Supabase mediante guardado prudente.</p><button type="button" onClick={openCreateCourse}>+ Crear curso</button></div></section><section className="course-stats-grid"><CourseStat label="Total cursos" value={stats.coursesTotal} helper="Base Supabase" /><CourseStat label="Publicados" value={stats.publishedCourses} helper="Visibles o activos" /><CourseStat label="Borradores" value={stats.draftCourses} helper="Para maquetar" /><CourseStat label="Módulos" value={totalModules} helper="Estructura académica" /><CourseStat label="Lecciones" value={totalLessons} helper="Contenido cargado" /><CourseStat label="Matrículas" value={totalEnrollments} helper="Completions registradas" /></section><section className="course-toolbar"><label className="course-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por título, categoría, nivel o estado..." /></label><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as CourseStatusFilter)}><option value="all">Todos los estados</option><option value="published">Publicados</option><option value="draft">Borradores</option><option value="hidden">Ocultos</option></select><div className="course-view-toggle"><button type="button" className={viewMode === "grid" ? "active" : ""} onClick={() => setViewMode("grid")}>Grid</button><button type="button" className={viewMode === "list" ? "active" : ""} onClick={() => setViewMode("list")}>Lista</button></div></section><section className="courses-layout"><div className="courses-main-column"><div className="section-title-row"><div><h2>Biblioteca de cursos</h2><p>{courseViews.length} resultados preparados para gestión.</p></div><button type="button" onClick={openCreateCourse}>+ Nuevo curso</button></div>{courseViews.length === 0 ? <article className="courses-empty"><span>▱</span><h3>No hay cursos que coincidan con los filtros</h3><p>Cuando crees o importes cursos, aparecerán aquí como borradores, publicados u ocultos.</p></article> : <div className={viewMode === "grid" ? "admin-course-grid" : "admin-course-list"}>{courseViews.map((item, index) => <AdminCourseCard key={item.id} item={item} index={index} viewMode={viewMode} setActiveTab={setActiveTab} setSystemMessage={setSystemMessage} openEditCourse={openEditCourse} openCreateModule={openCreateModule} />)}</div>}</div><aside className="courses-side-column"><article className="course-side-card"><h2>Acciones de cursos</h2><button type="button" onClick={openCreateCourse}>+ Crear nuevo curso</button><button type="button" onClick={() => setActiveTab("contenido")}>Gestionar contenido</button><button type="button" onClick={() => setSystemMessage("Plantillas reutilizables preparadas para una fase posterior.")}>Crear desde plantilla</button><button type="button" onClick={() => setSystemMessage("La vista pública del catálogo se revisará después de alinear landing y catálogo.")}>Vista pública del catálogo</button></article><article className="course-side-card"><h2>Estado del catálogo</h2><div className="catalog-ring"><strong>{stats.publishedCourses}</strong><span>publicados</span></div><div className="catalog-status-list"><StatusRow label="Publicados" value={formatNumber(stats.publishedCourses)} /><StatusRow label="Borradores" value={formatNumber(stats.draftCourses)} warning={stats.draftCourses > 0} /><StatusRow label="Ocultos" value={formatNumber(stats.hiddenCourses)} /></div></article></aside></section></div>;
}

function AdminCourseCard({ item, index, viewMode, setActiveTab, openEditCourse, openCreateModule }: { item: CourseAdminView; index: number; viewMode: CourseViewMode; setActiveTab: (tab: AdminTab) => void; setSystemMessage: (message: string) => void; openEditCourse: (course: CourseAdminView) => void; openCreateModule: (courseId?: string) => void; }) {
  return <article className={viewMode === "grid" ? "admin-course-card" : "admin-course-card list"}><div className="admin-course-cover" style={{ backgroundImage: getCourseBackground(item, index) }}><span className={`course-status-pill ${item.status}`}>{item.statusLabel}</span></div><div className="admin-course-body"><div className="course-title-row"><div><h3>{item.title}</h3><p>{item.subtitle}</p></div></div><div className="course-info-grid"><CourseInfo label="Categoría" value={item.category} /><CourseInfo label="Nivel" value={item.level} /><CourseInfo label="Precio" value={item.price} /><CourseInfo label="Actualizado" value={item.updatedAt} /></div><div className="course-build-row"><div><strong>{item.modulesCount}</strong><span>Módulos</span></div><div><strong>{item.lessonsCount}</strong><span>Lecciones</span></div><div><strong>{item.enrollmentsCount}</strong><span>Matrículas</span></div></div><div className="course-progress-block"><div><span>Preparación estimada</span><strong>{item.progressHint}%</strong></div><div className="course-progress-track"><div style={{ width: `${item.progressHint}%` }} /></div></div><div className="admin-course-actions"><button type="button" onClick={() => openEditCourse(item)}>Editar curso</button><button type="button" onClick={() => openCreateModule(item.id)}>Añadir módulo</button><button type="button" onClick={() => setActiveTab("contenido")}>Contenido</button></div></div></article>;
}

function ContenidoAdmin({
  stats,
  courseViews,
  dashboardData,
  selectedCourseId,
  setSelectedCourseId,
  selectedModuleId,
  setSelectedModuleId,
  setActiveTab,
  setSystemMessage,
  openCreateModule,
  openEditModule,
  openCreateLesson,
  openEditLesson,
  openSourceUpload,
  openImportDocument,
}: {
  stats: ReturnType<typeof buildDashboardStats>;
  courseViews: CourseAdminView[];
  dashboardData: DashboardData;
  selectedCourseId: string;
  setSelectedCourseId: (value: string) => void;
  selectedModuleId: string;
  setSelectedModuleId: (value: string) => void;
  setActiveTab: (tab: AdminTab) => void;
  setSystemMessage: (message: string) => void;
  openCreateModule: (courseId?: string) => void;
  openEditModule: (module: AnyRecord) => void;
  openCreateLesson: (moduleId?: string) => void;
  openEditLesson: (lesson: AnyRecord) => void;
  openSourceUpload: () => void;
  openImportDocument: () => void;
}) {
  const selectedCourse = courseViews.find((course) => course.id === selectedCourseId) || courseViews[0] || null;
  const selectedCourseModules = selectedCourse
    ? dashboardData.modules.filter((module) => String(module.course_id) === selectedCourse.id)
    : [];

  const safeSelectedModuleId =
    selectedModuleId && selectedCourseModules.some((module) => String(module.id) === selectedModuleId)
      ? selectedModuleId
      : String(selectedCourseModules[0]?.id || "");

  const selectedModule =
    selectedCourseModules.find((module) => String(module.id) === safeSelectedModuleId) ||
    selectedCourseModules[0] ||
    null;

  const selectedModuleLessons = selectedModule
    ? dashboardData.lessons
        .filter((lesson) => String(lesson.module_id) === String(selectedModule.id))
        .slice()
        .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    : [];

  const productionCourses = courseViews.filter((course) => course.status !== "published");
  const pendingLessons = Math.max(0, (selectedCourseModules.length || 1) * 6 - selectedModuleLessons.length);

  function handleCourseSelection(value: string) {
    setSelectedCourseId(value);
    const nextModules = dashboardData.modules.filter((module) => String(module.course_id) === value);
    setSelectedModuleId(String(nextModules[0]?.id || ""));
    setSystemMessage("Curso seleccionado en Contenido. Ahora puedes gestionar sus módulos y lecciones.");
  }

  function handleModuleSelection(value: string) {
    setSelectedModuleId(value);
    setSystemMessage("Módulo seleccionado. Mostrando sus lecciones reales.");
  }

  return (
    <div className="content-admin-page">
      <section className="content-hero">
        <div>
          <p className="admin-kicker">Centro de producción académica</p>
          <h1>Contenido</h1>
          <p>Gestiona la estructura real curso → módulo → lección desde una cabina clara y controlada.</p>
        </div>
        <div className="content-hero-panel">
          <span>Curso → Módulo → Lección</span>
          <strong>Contenido V2 con selección real</strong>
          <p>Selecciona curso y módulo antes de crear o editar lecciones. Sin depender de selecciones automáticas.</p>
          <button type="button" onClick={openImportDocument}>Importar documento</button>
        </div>
      </section>

      <section className="content-stats-grid">
        <CourseStat label="Cursos en producción" value={productionCourses.length} helper="Borradores u ocultos" />
        <CourseStat label="Módulos creados" value={stats.modules} helper="Estructura Supabase" />
        <CourseStat label="Lecciones creadas" value={stats.lessons} helper="Contenido cargado" />
        <CourseStat label="Lecciones módulo" value={selectedModuleLessons.length} helper="Selección actual" />
      </section>

      <section className="content-selector-card">
        <div className="content-selector-head">
          <div>
            <h2>Selección de trabajo</h2>
            <p>Elige exactamente qué curso y módulo quieres editar. Las lecciones se muestran según esta selección.</p>
          </div>
          <button type="button" onClick={() => setActiveTab("cursos")}>Ver cursos</button>
        </div>

        <div className="content-selector-grid">
          <label>
            <span>Curso</span>
            <select value={selectedCourse?.id || ""} onChange={(event) => handleCourseSelection(event.target.value)}>
              {courseViews.length ? (
                courseViews.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title} · {course.statusLabel}
                  </option>
                ))
              ) : (
                <option value="">Sin cursos todavía</option>
              )}
            </select>
          </label>

          <label>
            <span>Módulo</span>
            <select value={selectedModule?.id || ""} onChange={(event) => handleModuleSelection(event.target.value)}>
              {selectedCourseModules.length ? (
                selectedCourseModules.map((module, index) => (
                  <option key={String(module.id || index)} value={String(module.id || "")}>
                    {module.title || module.name || `Módulo ${index + 1}`}
                  </option>
                ))
              ) : (
                <option value="">Este curso aún no tiene módulos</option>
              )}
            </select>
          </label>

          <div className="content-selector-actions">
            <button type="button" onClick={() => openCreateModule(selectedCourse?.id)}>+ Módulo</button>
            <button type="button" onClick={() => selectedModule ? openCreateLesson(String(selectedModule.id)) : setSystemMessage("Primero crea o selecciona un módulo.")}>
              + Lección
            </button>
          </div>
        </div>
      </section>

      <section className="content-layout">
        <div className="content-main-column">
          <article className="production-board-card">
            <div className="card-head">
              <div>
                <h2>Curso seleccionado</h2>
                <p>{selectedCourse ? "Vista operativa del curso activo en el editor de contenido." : "Aún no hay curso seleccionado."}</p>
              </div>
              <button type="button" onClick={() => setActiveTab("cursos")}>Gestionar curso</button>
            </div>

            {selectedCourse ? (
              <div className="production-course active">
                <span>GHC</span>
                <div>
                  <strong>{selectedCourse.title}</strong>
                  <p>{selectedCourse.statusLabel} · {selectedCourse.modulesCount} módulos · {selectedCourse.lessonsCount} lecciones</p>
                </div>
                <em>{selectedCourse.progressHint}%</em>
              </div>
            ) : (
              <div className="lesson-empty-card">
                <span>▱</span>
                <div>
                  <strong>Sin cursos todavía</strong>
                  <p>Crea un curso desde la pestaña Cursos para empezar a organizar contenido.</p>
                </div>
                <button type="button" onClick={() => setActiveTab("cursos")}>Ir a cursos</button>
              </div>
            )}
          </article>

          <article className="module-map-card">
            <div className="card-head compact">
              <h2>Módulos del curso</h2>
              <button type="button" onClick={() => openCreateModule(selectedCourse?.id)}>+ Añadir módulo</button>
            </div>

            <div className="module-map-list">
              {selectedCourseModules.length ? (
                selectedCourseModules.map((module, index) => {
                  const moduleLessons = dashboardData.lessons.filter((lesson) => String(lesson.module_id) === String(module.id));
                  const isSelected = selectedModule && String(module.id) === String(selectedModule.id);

                  return (
                    <div className={isSelected ? "module-map-row current" : "module-map-row"} key={module.id || `module-${index}`}>
                      <div className="module-index">M{index + 1}</div>
                      <div>
                        <strong>{module.title || module.name || `Módulo ${index + 1}`}</strong>
                        <p>{moduleLessons.length} lecciones · {isSelected ? "Seleccionado" : "Disponible"}</p>
                      </div>
                      <div className="module-row-actions">
                        <button type="button" onClick={() => handleModuleSelection(String(module.id))}>Ver</button>
                        <button type="button" onClick={() => openEditModule(module)}>Editar</button>
                        <button type="button" onClick={() => openCreateLesson(String(module.id))}>+ Lección</button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="lesson-empty-card">
                  <span>M</span>
                  <div>
                    <strong>Este curso aún no tiene módulos</strong>
                    <p>Crea el primer módulo para poder añadir lecciones.</p>
                  </div>
                  <button type="button" onClick={() => openCreateModule(selectedCourse?.id)}>Crear módulo</button>
                </div>
              )}
            </div>
          </article>

          <article className="lesson-admin-card">
            <div className="card-head compact">
              <h2>Lecciones del módulo seleccionado</h2>
              <button type="button" onClick={() => selectedModule ? openCreateLesson(String(selectedModule.id)) : setSystemMessage("Primero selecciona un módulo.")}>
                + Añadir lección
              </button>
            </div>

            {selectedModule ? (
              <div className="selected-module-banner">
                <span>Modulo activo</span>
                <strong>{selectedModule.title || selectedModule.name || "Módulo seleccionado"}</strong>
              </div>
            ) : null}

            <div className="lesson-admin-list">
              {selectedModuleLessons.length ? (
                selectedModuleLessons.map((lesson, index) => (
                  <div key={lesson.id || `lesson-${index}`} className="lesson-admin-row">
                    <span className="lesson-admin-index">L{index + 1}</span>
                    <div>
                      <strong>{lesson.title || `Lección ${index + 1}`}</strong>
                      <p>{getLessonTypeLabel(lesson.content_type || lesson.type)} · Orden {lesson.sort_order || index + 1} · {lesson.duration_minutes || 0} min</p>
                    </div>
                    <div className="lesson-row-actions">
                      {lesson.pdf_url ? (
                        <button type="button" onClick={() => openPrivateLessonAsset(lesson.pdf_url, setSystemMessage, "PDF")}>
                          Ver PDF
                        </button>
                      ) : null}
                      {lesson.video_url ? (
                        <button type="button" onClick={() => openPrivateLessonAsset(lesson.video_url, setSystemMessage, "vídeo")}>
                          Ver vídeo
                        </button>
                      ) : null}
                      {lesson.audio_url ? (
                        <button type="button" onClick={() => openPrivateLessonAsset(lesson.audio_url, setSystemMessage, "audio")}>
                          Ver audio
                        </button>
                      ) : null}
                      <button type="button" onClick={() => openEditLesson(lesson)}>Editar</button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="lesson-empty-card">
                  <span>▤</span>
                  <div>
                    <strong>{selectedModule ? "Este módulo todavía no tiene lecciones" : "Selecciona un módulo"}</strong>
                    <p>{selectedModule ? "Crea la primera lección para empezar a construir el contenido real." : "Necesitas un módulo activo para ver y crear lecciones."}</p>
                  </div>
                  <button type="button" onClick={() => selectedModule ? openCreateLesson(String(selectedModule.id)) : openCreateModule(selectedCourse?.id)}>
                    {selectedModule ? "Crear lección" : "Crear módulo"}
                  </button>
                </div>
              )}
            </div>
          </article>

          <article className="source-docs-card">
            <div className="card-head compact">
              <h2>Documentos fuente</h2>
              <button type="button" onClick={openSourceUpload}>Subir fuente</button>
            </div>
            <div className="source-doc-grid">
              <SourceDoc type="DOCX" title="Documento Word del curso" status="Preparado para conectar Storage" />
              <SourceDoc type="PDF" title="PDF base / manual académico" status="Preparado para revisión" />
              <SourceDoc type="NOTAS" title="Notas del autor y bibliografía" status="Preparado para curación" />
            </div>
          </article>
        </div>

        <aside className="content-side-column">
          <article className="content-side-card importer">
            <span>Importador preparado</span>
            <h2>Word / PDF</h2>
            <p>Convierte documentos fuente en módulos, lecciones, recursos y checklist de revisión.</p>
            <button type="button" onClick={openImportDocument}>Preparar importador</button>
          </article>

          <article className="content-side-card">
            <h2>Checklist de producción</h2>
            <ProductionCheck label="Curso seleccionado" done={Boolean(selectedCourse)} />
            <ProductionCheck label="Módulos creados" done={selectedCourseModules.length > 0} />
            <ProductionCheck label="Módulo seleccionado" done={Boolean(selectedModule)} />
            <ProductionCheck label="Lecciones creadas" done={selectedModuleLessons.length > 0} />
            <ProductionCheck label="Recursos revisados" />
            <ProductionCheck label="Exámenes preparados" />
          </article>

          <article className="content-side-card">
            <h2>Factoría IA</h2>
            <p>Reservado para conectar GHC Content Factory. La IA genera borradores, no publica.</p>
            <div className="factory-tags">
              <span>Guiones vídeo</span>
              <span>Audio curso</span>
              <span>Podcast</span>
              <span>Mini cursos</span>
              <span>Exámenes IA</span>
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
}

function AlumnosAdmin({ stats, students, allStudents, selectedStudent, search, setSearch, setSelectedStudentId, setActiveTab, setSystemMessage }: { stats: ReturnType<typeof buildDashboardStats>; students: StudentAdminView[]; allStudents: StudentAdminView[]; selectedStudent: StudentAdminView | null; search: string; setSearch: (value: string) => void; setSelectedStudentId: (value: string) => void; setActiveTab: (tab: AdminTab) => void; setSystemMessage: (message: string) => void; }) {
  const riskStudents = allStudents.filter((student) => student.riskTone === "red").length; const followUpStudents = allStudents.filter((student) => student.riskTone === "yellow").length; const certifiedStudents = allStudents.filter((student) => student.certificates > 0).length; const engagedStudents = allStudents.filter((student) => student.progress >= 70 || student.certificates > 0).length;
  return <div className="students-admin-page"><section className="students-hero"><div><p className="admin-kicker">Gestión de relación con el alumno</p><h1>Alumnos</h1><p>Supervisa progreso, accesos, certificados, fidelización y riesgo de abandono.</p></div><div className="students-hero-panel"><span>Seguimiento inteligente</span><strong>Académico + comercial + fidelización</strong><p>Preparado para premiar alumnos comprometidos y contactar a quienes se quedan parados.</p><button type="button" onClick={() => setActiveTab("comunicaciones")}>Contactar alumno</button></div></section><section className="student-stats-grid"><StudentStat label="Alumnos totales" value={allStudents.length} helper="Perfiles no admin" /><StudentStat label="Activos" value={stats.activeStudents} helper="Base Supabase" /><StudentStat label="Riesgo abandono" value={riskStudents} helper="Inactividad alta" danger /><StudentStat label="Seguimiento" value={followUpStudents} helper="Pausa reciente" warning /><StudentStat label="Certificados" value={certifiedStudents} helper="Con credencial" /><StudentStat label="Comprometidos" value={engagedStudents} helper="Candidatos a premio" /></section><section className="student-toolbar"><label className="student-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar alumno, email, estado o fidelización..." /></label><button type="button" onClick={() => setSystemMessage("La asignación manual se conectará desde Pagos y accesos.")}>Asignar curso</button><button type="button" onClick={() => setActiveTab("comunicaciones")}>Campaña seguimiento</button></section><section className="students-layout"><article className="students-list-card"><div className="section-title-row"><div><h2>Listado de alumnos</h2><p>{students.length} alumnos encontrados.</p></div><button type="button" onClick={() => setSystemMessage("Exportación CSV/Excel pendiente de conectar.")}>Exportar</button></div><div className="students-list">{students.length === 0 ? <div className="students-empty"><span>◎</span><h3>No hay alumnos que coincidan</h3><p>Cuando haya registros o cambies la búsqueda, aparecerán aquí.</p></div> : students.map((student) => <button key={student.id} type="button" className={selectedStudent?.id === student.id ? "student-row active" : "student-row"} onClick={() => setSelectedStudentId(student.id)}><span className="student-avatar">{student.initials}</span><div className="student-main-info"><strong>{student.name}</strong><p>{student.email}</p></div><div className="student-progress-mini"><strong>{student.progress}%</strong><span>progreso</span></div><div className={`student-risk ${student.riskTone}`}><strong>{student.statusLabel}</strong><span>{student.riskLabel}</span></div><div className="student-commercial-mini"><strong>{student.totalInvested}</strong><span>{student.commercialTier}</span></div></button>)}</div></article><aside className="student-detail-column">{selectedStudent ? <StudentDetailCard student={selectedStudent} setActiveTab={setActiveTab} setSystemMessage={setSystemMessage} /> : <article className="student-detail-card"><h2>Sin alumno seleccionado</h2><p>Selecciona un alumno para ver su perfil académico, relación comercial y seguimiento.</p></article>}</aside></section></div>;
}

function StudentDetailCard({ student, setActiveTab, setSystemMessage }: { student: StudentAdminView; setActiveTab: (tab: AdminTab) => void; setSystemMessage: (message: string) => void; }) {
  return <article className="student-detail-card"><div className="student-detail-head"><span>{student.initials}</span><div><p className="admin-kicker">Ficha del alumno</p><h2>{student.name}</h2><p>{student.email}</p></div></div><div className="student-detail-section"><h3>Perfil académico</h3><div className="student-detail-grid"><DetailMetric label="Progreso" value={`${student.progress}%`} /><DetailMetric label="Cursos activos" value={student.activeCourses} /><DetailMetric label="Cursos completados" value={student.completedCourses} /><DetailMetric label="Certificados" value={student.certificates} /></div><div className="student-progress-track"><div style={{ width: `${student.progress}%` }} /></div><p className="student-note">Último curso detectado: <strong>{student.latestCourse}</strong></p></div><div className="student-detail-section commercial"><h3>Relación comercial y fidelización</h3><div className="commercial-grid"><DetailMetric label="Total invertido" value={student.totalInvested} /><DetailMetric label="Nivel" value={student.commercialTier} /><DetailMetric label="Estado pagos" value={student.commercialHint} /><DetailMetric label="Acceso" value={student.statusLabel} /></div><div className="loyalty-actions"><button type="button" onClick={() => setSystemMessage("Curso gratuito pendiente de permisos de Pagos y accesos.")}>Curso gratuito</button><button type="button" onClick={() => setSystemMessage("Becas y descuentos se conectarán con trazabilidad.")}>Beca / descuento</button></div></div><div className="student-detail-section follow-up"><h3>Seguimiento y riesgo</h3><div className={`follow-up-status ${student.riskTone}`}><strong>{student.riskLabel}</strong><span>{student.followUpStatus}</span></div><div className="follow-up-grid"><DetailMetric label="Última actividad" value={student.lastActivity} /><DetailMetric label="Días inactivo" value={student.inactiveDays === null ? "Sin datos" : student.inactiveDays} /></div><div className="follow-up-actions"><button type="button" onClick={() => setActiveTab("comunicaciones")}>Enviar mensaje</button><button type="button" onClick={() => setSystemMessage("Estado de contacto pendiente de tabla de seguimiento.")}>Marcar contactado</button></div></div></article>;
}

function ExamenesAdmin({
  dashboardData,
  courseViews,
  setActiveTab,
  setSystemMessage,
}: {
  dashboardData: DashboardData;
  courseViews: CourseAdminView[];
  setActiveTab: (tab: AdminTab) => void;
  setSystemMessage: (message: string) => void;
}) {
  const router = useRouter();

  const exams = dashboardData.exams
    .slice()
    .sort((a, b) => {
      const aDate = new Date(a.published_at || a.updated_at || a.created_at || 0).getTime();
      const bDate = new Date(b.published_at || b.updated_at || b.created_at || 0).getTime();
      return bDate - aDate;
    });

  const publishedCount = exams.filter(
    (exam) => String(exam.status || "").toLowerCase() === "published"
  ).length;

  const reviewCount = exams.filter((exam) =>
    ["draft", "in_review", "review", "pending"].includes(
      String(exam.status || "draft").toLowerCase()
    )
  ).length;

  const archivedCount = exams.filter((exam) =>
    ["archived", "hidden", "inactive"].includes(
      String(exam.status || "").toLowerCase()
    )
  ).length;

  function getCourseTitle(exam: AnyRecord) {
    return (
      courseViews.find((course) => String(course.id) === String(exam.course_id))?.title ||
      "Curso GHC Academy"
    );
  }

  function getExamStatus(exam: AnyRecord) {
    const status = String(exam.status || "draft").toLowerCase();

    if (status === "published") {
      return { label: "Publicado", tone: "published" };
    }

    if (status === "in_review" || status === "review") {
      return { label: "En revisión", tone: "review" };
    }

    if (status === "archived" || status === "hidden" || status === "inactive") {
      return { label: "Archivado", tone: "archived" };
    }

    return { label: "Borrador", tone: "draft" };
  }

  function getExamScope(exam: AnyRecord) {
    const scope = String(exam.exam_scope || exam.scope || "course").toLowerCase();

    if (scope === "lesson") return "Lección";
    if (scope === "module") return "Módulo";
    return "Curso";
  }

  function openExam(exam: AnyRecord) {
    const blueprintId = String(exam.blueprint_id || "").trim();

    if (!blueprintId) {
      setSystemMessage(
        "Este examen pertenece al sistema anterior y no tiene blueprint de revisión. Se mantiene visible como histórico, pero no se editará desde el Agente de Exámenes."
      );
      return;
    }

    router.push(`/ghc-control-center/examenes/${blueprintId}`);
  }

  return (
    <div className="exams-admin-page exam-hub-page">
      <section className="exam-hub-hero">
        <div>
          <p className="admin-kicker">Agente de Exámenes GHC</p>
          <h1>Exámenes</h1>
          <p>
            Crea, revisa, publica y analiza evaluaciones reales desde un flujo seguro:
            borrador, revisión humana, publicación y estadísticas.
          </p>

          <div className="exam-hub-hero-actions">
            <button
              type="button"
              className="exam-hub-primary"
              onClick={() => router.push("/ghc-control-center/examenes/crear")}
            >
              + Crear evaluación
            </button>

            <button
              type="button"
              className="exam-hub-secondary"
              onClick={() => router.push("/ghc-control-center/examenes")}
            >
              Abrir centro de exámenes
            </button>
          </div>
        </div>

        <div className="exam-hub-principle">
          <span>Flujo oficial GHC</span>
          <strong>La IA propone. El administrador revisa y publica.</strong>
          <p>
            Ningún examen se publica automáticamente. La corrección del alumno se
            ejecuta de forma segura en Supabase.
          </p>

          <div className="exam-hub-flow">
            <span>Borrador</span>
            <i>→</i>
            <span>Revisión</span>
            <i>→</i>
            <span>Publicación</span>
            <i>→</i>
            <span>Resultados</span>
          </div>
        </div>
      </section>

      <section className="exam-hub-stats">
        <CourseStat label="Exámenes reales" value={exams.length} helper="Registrados en Supabase" />
        <CourseStat label="Publicados" value={publishedCount} helper="Disponibles para alumnos" />
        <CourseStat label="En revisión" value={reviewCount} helper="Pendientes de aprobación" />
        <CourseStat label="Preguntas" value={dashboardData.examQuestions.length} helper="Banco real" />
        <CourseStat label="Intentos" value={dashboardData.examAttempts.length} helper="Resultados registrados" />
        <CourseStat label="Archivados" value={archivedCount} helper="Histórico conservado" />
      </section>

      <section className="exam-hub-layout">
        <article className="exam-hub-list-card">
          <div className="exam-hub-section-head">
            <div>
              <p className="admin-kicker">Gestión operativa</p>
              <h2>Evaluaciones registradas</h2>
              <p>
                Accede a la revisión, publicación y estadísticas de cada examen creado
                con el sistema actual.
              </p>
            </div>

            <div className="exam-hub-head-actions">
              <button
                type="button"
                onClick={() => router.push("/ghc-control-center/examenes")}
              >
                Ver listado completo
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => router.push("/ghc-control-center/examenes/crear")}
              >
                + Nueva evaluación
              </button>
            </div>
          </div>

          {exams.length ? (
            <div className="exam-hub-list">
              {exams.map((exam, index) => {
                const status = getExamStatus(exam);
                const blueprintId = String(exam.blueprint_id || "").trim();
                const questionCount = dashboardData.examQuestions.filter(
                  (question) => String(question.exam_id) === String(exam.id)
                ).length;
                const attemptCount = dashboardData.examAttempts.filter(
                  (attempt) => String(attempt.exam_id) === String(exam.id)
                ).length;
                const passPercentage = Number(
                  exam.pass_percentage || exam.pass_score || exam.passing_score || 70
                );

                return (
                  <article className="exam-hub-row" key={String(exam.id || index)}>
                    <div className="exam-hub-row-main">
                      <span className={`exam-hub-status ${status.tone}`}>
                        {status.label}
                      </span>

                      <div>
                        <strong>
                          {String(exam.title || exam.name || `Evaluación ${index + 1}`)}
                        </strong>
                        <p>
                          {getCourseTitle(exam)} · Evaluación de {getExamScope(exam)}
                        </p>
                      </div>
                    </div>

                    <div className="exam-hub-row-metrics">
                      <div>
                        <span>Preguntas</span>
                        <strong>{questionCount}</strong>
                      </div>
                      <div>
                        <span>Intentos</span>
                        <strong>{attemptCount}</strong>
                      </div>
                      <div>
                        <span>Aprobado</span>
                        <strong>{passPercentage}%</strong>
                      </div>
                      <div>
                        <span>Modo</span>
                        <strong>
                          {String(exam.attempts_mode || "unlimited") === "limited"
                            ? `${exam.max_attempts || "—"} intentos`
                            : "Ilimitado"}
                        </strong>
                      </div>
                    </div>

                    <div className="exam-hub-row-actions">
                      <button
                        type="button"
                        className={blueprintId ? "primary" : ""}
                        onClick={() => openExam(exam)}
                      >
                        {blueprintId ? "Abrir gestión" : "Histórico"}
                      </button>

                      {blueprintId ? (
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/ghc-control-center/examenes/${blueprintId}#estadisticas`
                            )
                          }
                        >
                          Estadísticas
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="exam-hub-empty">
              <span>◈</span>
              <h3>Todavía no hay evaluaciones</h3>
              <p>
                Crea el primer blueprint para empezar el flujo de borrador, revisión,
                publicación y estadísticas.
              </p>
              <button
                type="button"
                onClick={() => router.push("/ghc-control-center/examenes/crear")}
              >
                Crear primera evaluación
              </button>
            </div>
          )}
        </article>

        <aside className="exam-hub-side">
          <article className="exam-hub-side-card highlighted">
            <p className="admin-kicker">Acceso directo</p>
            <h2>Agente de Exámenes</h2>
            <p>
              Crea un borrador, importa preguntas, revísalas y publica solo cuando estén
              aprobadas.
            </p>
            <button
              type="button"
              onClick={() => router.push("/ghc-control-center/examenes/crear")}
            >
              Crear borrador
            </button>
          </article>

          <article className="exam-hub-side-card">
            <h2>Estado del sistema</h2>
            <StatusRow label="Revisión humana" value="Activa" />
            <StatusRow label="Corrección segura" value="Supabase" />
            <StatusRow label="Intentos por defecto" value="Ilimitados" />
            <StatusRow label="Certificado" value="Condicionado" />
            <StatusRow label="Estadísticas" value="Activas" />
          </article>

          <article className="exam-hub-side-card">
            <h2>Atajos relacionados</h2>
            <button type="button" onClick={() => setActiveTab("contenido")}>
              Ver contenido del curso
            </button>
            <button type="button" onClick={() => setActiveTab("alumnos")}>
              Seguimiento de alumnos
            </button>
            <button type="button" onClick={() => setActiveTab("certificados")}>
              Ver certificados
            </button>
          </article>
        </aside>
      </section>
    </div>
  );
}

function CertificadosAdmin({ certificates, setActiveTab, setSystemMessage }: { certificates: CertificateAdminView[]; setActiveTab: (tab: AdminTab) => void; setSystemMessage: (message: string) => void; }) {
  const valid = certificates.filter((c) => c.status === "valid").length; const pending = certificates.filter((c) => c.status === "pending").length; const revoked = certificates.filter((c) => c.status === "revoked").length; const featured = certificates[0];
  return <SimpleSection className="certificates-admin-page" kicker="Credenciales oficiales y verificación pública" title="Certificados" text="Emite, verifica, revoca y controla las credenciales oficiales de GHC Academy." sideTitle="Formato aprobado" sideText="GHC-2026-320001-A7K9 · numeración alta, sufijo verificador y vínculo con alumno/curso/estado." sideAction="Preparar emisión" onSideAction={() => setSystemMessage("La emisión real validará curso completado y examen final aprobado.")}><section className="certificate-stats-grid"><CourseStat label="Emitidos" value={valid} helper="Descargables" /><CourseStat label="Pendientes" value={pending} helper="Revisión admin" /><CourseStat label="Revocados" value={revoked} helper="Sin validez" /><CourseStat label="Verificaciones" value={valid * 3} helper="URL pública futura" /></section><section className="certificates-layout"><div className="certificates-main-column"><article className="certificate-template-card"><div className="card-head"><div><h2>Plantilla oficial GHC</h2><p>Diseño premium, descargable solo cuando el certificado está emitido y válido.</p></div><button type="button" onClick={() => setSystemMessage("Edición de plantilla pendiente de Studio GHC.")}>Editar plantilla</button></div><div className="certificate-preview-admin"><div className="certificate-preview-brand"><GHCLogo size="sm" showText tagline={false} /></div><div className="certificate-preview-title">CERTIFICADO</div><div className="certificate-preview-subtitle">CREDENCIAL OFICIAL</div><div className="certificate-preview-awarded">Se otorga a</div><h3>{featured?.studentName || "Alumno GHC"}</h3><div className="certificate-preview-divider" /><small>{featured?.courseTitle || "Curso certificado GHC Academy"}</small><div className="certificate-preview-footer"><span>Dirección académica</span><code>{featured?.code || "GHC-2026-320001-A7K9"}</code></div></div></article><article className="certificate-list-card"><div className="card-head compact"><h2>Credenciales recientes</h2><button type="button" onClick={() => setSystemMessage("Filtros y búsqueda por código pendientes.")}>Ver todas</button></div><div className="certificate-table">{certificates.length ? certificates.slice(0,6).map((c) => <div key={c.id} className="certificate-table-row"><div><strong>{c.studentName}</strong><p>{c.studentEmail}</p></div><div><strong>{c.courseTitle}</strong><p>{c.issuedAt} · Nota {c.score}</p></div><code>{c.code}</code><span className={`certificate-status ${c.status}`}>{c.statusLabel}</span><div className="certificate-actions"><button onClick={() => setSystemMessage(`Vista preparada para ${c.code}.`)}>Ver</button><button onClick={() => setSystemMessage(`Enlace verificable: ${c.verificationPath}`)}>Copiar</button><button onClick={() => setSystemMessage(c.downloadable ? "Descarga preparada." : "Solo descarga si está válido.")}>PDF</button></div></div>) : <div className="certificate-empty">Aún no hay certificados ni candidatos detectados.</div>}</div></article></div><aside className="certificates-side-column"><article className="certificate-side-card"><h2>Acciones rápidas</h2><button onClick={() => setSystemMessage("La emisión manual requiere validación curso + examen final.")}>Emitir certificado</button><button onClick={() => setActiveTab("examenes")}>Ver exámenes finales</button><button onClick={() => setActiveTab("alumnos")}>Buscar alumno</button></article></aside></section></SimpleSection>;
}

function PagosAdmin({ courseViews, studentViews, setActiveTab, setSystemMessage }: { courseViews: CourseAdminView[]; studentViews: StudentAdminView[]; setActiveTab: (tab: AdminTab) => void; setSystemMessage: (message: string) => void; }) {
  const rows = buildPaymentRows(studentViews, courseViews); const commercial = studentViews.filter((s) => s.activeCourses > 0 || s.certificates > 0).length;
  return <SimpleSection className="payments-admin-page" kicker="Pagos, accesos y finanzas" title="Pagos y accesos" text="Controla ventas, transacciones, accesos, becas, comisiones, ingresos netos y reportes contables." sideTitle="Módulo comercial preparado" sideText="Stripe + SumUp + accesos manuales. Sin simular cobros hasta conectar pasarelas reales." sideAction="Preparar pasarelas" onSideAction={() => setSystemMessage("Stripe y SumUp se conectarán cuando activemos pagos reales.")}><section className="payment-stats-grid"><CourseStat label="Ingresos estimados" value={commercial * 197} helper="Hasta pagos reales" /><CourseStat label="Alumnos con acceso" value={commercial} helper="Cursos/certificados" /><CourseStat label="Cursos vendibles" value={courseViews.length} helper="Catálogo" /><CourseStat label="Bloqueados" value={studentViews.filter((s) => s.status === "blocked").length} helper="Revisar" /></section><section className="payments-layout"><div className="payments-main-column"><article className="payments-table-card"><div className="card-head compact"><h2>Operaciones recientes</h2><button onClick={() => setSystemMessage("Histórico pendiente de pasarelas reales.")}>Ver transacciones</button></div><PaymentRowsTable rows={rows} setSystemMessage={setSystemMessage} /></article></div><aside className="payments-side-column"><article className="payment-side-card"><h2>Acciones rápidas</h2><button onClick={() => setSystemMessage("Conceder acceso manual requiere tabla de permisos por curso.")}>Conceder acceso</button><button onClick={() => setSystemMessage("Becas se registrarán con trazabilidad interna.")}>Aplicar beca</button><button onClick={() => setActiveTab("alumnos")}>Ver alumno</button></article></aside></section></SimpleSection>;
}

function ComunicacionesAdmin({ courseViews, studentViews, setActiveTab, setSystemMessage }: { courseViews: CourseAdminView[]; studentViews: StudentAdminView[]; setActiveTab: (tab: AdminTab) => void; setSystemMessage: (message: string) => void; }) {
  const rows = buildCommunicationRows(studentViews, courseViews);
  return <SimpleSection className="communications-admin-page" kicker="Comunicaciones, marketing y seguimiento" title="Comunicaciones" text="Contacta alumnos, automatiza recordatorios, reactiva inactivos y prepara publicidad externa." sideTitle="Conexión futura" sideText="Alumnos + Pagos + Analítica + Ads. Nada se envía sin aprobación humana." sideAction="Preparar campaña" onSideAction={() => setSystemMessage("Campañas externas pendientes de privacidad/cookies/eventos.")}><section className="communication-stats-grid"><CourseStat label="Alumnos" value={studentViews.length} helper="Base comunicación" /><CourseStat label="Riesgo" value={studentViews.filter((s) => s.riskTone === "red" || s.riskTone === "yellow").length} helper="Seguimiento" /><CourseStat label="Cursos" value={courseViews.length} helper="Campañas" /><CourseStat label="Certificados" value={studentViews.filter((s) => s.certificates > 0).length} helper="Upsell" /></section><section className="communications-layout"><div className="communications-main-column"><article className="message-composer-card"><div className="card-head"><div><h2>Crear mensaje</h2><p>Email, aviso interno o seguimiento. Nada se envía sin aprobación.</p></div><button onClick={() => setSystemMessage("Borrador preparado; envío real pendiente de proveedor.")}>Guardar borrador</button></div><label className="message-field"><span>Asunto</span><input defaultValue="¿Necesitas ayuda para continuar tu curso?" /></label><label className="message-field"><span>Mensaje</span><textarea defaultValue={"Hola {{nombre}},\n\nHemos visto que llevas unos días sin avanzar. Si necesitas ayuda para retomar el curso, estamos aquí.\n\nGHC Academy"} /></label></article><article className="communications-table-card"><div className="card-head compact"><h2>Seguimientos preparados</h2><button onClick={() => setActiveTab("alumnos")}>Ver alumnos</button></div><div className="communication-table">{rows.map((row) => <div key={row.id} className="communication-table-row"><div><strong>{row.name}</strong><p>{row.email}</p></div><div><strong>{row.reason}</strong><p>{row.detail}</p></div><span className={`channel-pill ${row.channelTone}`}>{row.channel}</span><span className={`communication-status ${row.statusTone}`}>{row.status}</span><button onClick={() => setSystemMessage(row.actionMessage)}>{row.action}</button></div>)}</div></article></div><aside className="communications-side-column"><article className="communication-side-card"><h2>Acciones rápidas</h2><button onClick={() => setSystemMessage("Audiencias pendientes de tabla de segmentos.")}>Crear audiencia</button><button onClick={() => setSystemMessage("Plantillas pendientes de guardado.")}>Editar plantilla</button></article></aside></section></SimpleSection>;
}

function AnaliticaAdmin({ dashboardData, courseViews, studentViews, setActiveTab, setSystemMessage }: { dashboardData: DashboardData; courseViews: CourseAdminView[]; studentViews: StudentAdminView[]; setActiveTab: (tab: AdminTab) => void; setSystemMessage: (message: string) => void; }) {
  const analytics = buildAnalyticsSnapshot(dashboardData, courseViews, studentViews);
  return <SimpleSection className="analytics-admin-page" kicker="Inteligencia académica y comercial" title="Analítica" text="Mide progreso, retención, certificados, abandono y oportunidades de crecimiento." sideTitle="Panel estratégico" sideText="Datos académicos + ventas + comunicaciones para decidir mejor." sideAction="Preparar informe" onSideAction={() => setSystemMessage("Informes avanzados pendientes de pagos/campañas reales.")}><section className="analytics-stats-grid"><CourseStat label="Alumnos" value={analytics.activeStudents} helper="Base real" /><CourseStat label="Finalización" value={analytics.completionRate} helper="Porcentaje" /><CourseStat label="Certificados" value={analytics.certificates} helper="Emitidos" /><CourseStat label="Cursos" value={analytics.coursesTotal} helper="Catálogo" /></section><article className="analytics-growth-card"><div className="card-head"><div><h2>Tendencia general</h2><p>Progreso académico, actividad y crecimiento operativo.</p></div><button onClick={() => setSystemMessage("Vista últimos 30 días preparada.")}>Últimos 30 días</button></div><div className="chart-area"><ChartSvg /></div><div className="chart-summary"><MiniMetric label="Lecciones" value={formatNumber(analytics.lessonProgress)} trend="real" /><MiniMetric label="Módulos" value={formatNumber(analytics.moduleCompletions)} trend="real" /><MiniMetric label="Cursos" value={formatNumber(analytics.coursesTotal)} trend="catálogo" /><MiniMetric label="Contenido" value={formatNumber(analytics.lessonsTotal)} trend="lecciones" /></div></article><article className="analytics-side-card"><h2>Oportunidades</h2><OpportunityItem label="Reactivar alumnos" action="Comunicaciones" onClick={() => setActiveTab("comunicaciones")} /><OpportunityItem label="Premiar alto valor" action="Alumnos" onClick={() => setActiveTab("alumnos")} /><OpportunityItem label="Medir ventas" action="Pagos" onClick={() => setActiveTab("pagos")} /></article></SimpleSection>;
}

function SeguridadAdmin({ dashboardData, studentViews, setActiveTab, setSystemMessage }: { dashboardData: DashboardData; studentViews: StudentAdminView[]; setActiveTab: (tab: AdminTab) => void; setSystemMessage: (message: string) => void; }) {
  const admins = dashboardData.profiles.filter((p) => ["admin", "superadmin", "owner"].includes(String(p.role || "").toLowerCase())).length;
  return <SimpleSection className="security-admin-page" kicker="Protección, roles y auditoría" title="Seguridad" text="Supervisa accesos, roles, sesiones, dispositivos, eventos críticos y políticas de protección." sideTitle="Base segura activa" sideText="Supabase Auth + rol admin + ruta privada." sideAction="Preparar auditoría" onSideAction={() => setSystemMessage("Auditoría avanzada pendiente de tablas de eventos/sesiones.")}><section className="security-stats-grid"><CourseStat label="Admins" value={admins} helper="Autorizados" /><CourseStat label="Alumnos" value={studentViews.length} helper="Protegidos" /><CourseStat label="Bloqueados" value={studentViews.filter((s) => s.status === "blocked").length} helper="Restringidos" /><CourseStat label="Dispositivos" value={2} helper="Límite futuro" /></section><article className="security-permissions-card"><div className="card-head"><div><h2>Roles y permisos</h2><p>Matriz preparada para controlar qué puede ver y editar cada tipo de usuario.</p></div><button onClick={() => setSystemMessage("Edición real de roles requiere RLS y permisos owner.")}>Gestionar roles</button></div><div className="role-matrix">{["Acceso al panel privado", "Gestión de cursos", "Gestión de alumnos", "Pagos y accesos", "Certificados", "Seguridad y roles"].map((label) => <div key={label} className="role-matrix-row"><strong>{label}</strong><RoleCheck active /><RoleCheck active={label !== "Seguridad y roles"} /><RoleCheck active={label === "Gestión de alumnos" || label === "Certificados"} /><RoleCheck active={false} /></div>)}</div></article><article className="security-side-card"><h2>Acciones rápidas</h2><button onClick={() => setActiveTab("alumnos")}>Revisar alumnos</button><button onClick={() => setActiveTab("pagos")}>Ver accesos y pagos</button></article></SimpleSection>;
}

function StudioGHCAdmin({
  courseViews,
  setActiveTab,
  setSystemMessage,
}: {
  courseViews: CourseAdminView[];
  setActiveTab: (tab: AdminTab) => void;
  setSystemMessage: (message: string) => void;
}) {
  const editablePages = [
    {
      title: "Landing principal",
      status: "Borrador preparado",
      area: "Web pública",
      description: "Hero, propuesta de valor, confianza y CTA principal.",
      state: "active",
    },
    {
      title: "Catálogo de cursos",
      status: "Requiere diseño",
      area: "Cursos",
      description: "Listado comercial con filtros, categorías y niveles.",
      state: "draft",
    },
    {
      title: "Página de curso",
      status: "Base activa",
      area: "Venta",
      description: "Ficha comercial, módulos, precio y acceso al checkout.",
      state: "ready",
    },
    {
      title: "Checkout",
      status: "Pendiente pagos",
      area: "Pagos",
      description: "Compra segura con Stripe/SumUp y activación de acceso.",
      state: "pending",
    },
    {
      title: "Login / acceso",
      status: "Funcional",
      area: "Auth",
      description: "Entrada protegida para alumnos y administradores.",
      state: "ready",
    },
    {
      title: "Certificados públicos",
      status: "Preparado",
      area: "Credenciales",
      description: "Verificación pública de certificados y códigos.",
      state: "ready",
    },
  ];

  const approvedBlocks = [
    "Hero GHC",
    "Cursos destacados",
    "Bloque científico",
    "Testimonios",
    "FAQ",
    "CTA final",
  ];

  const selectedPage = editablePages[0];

  return (
    <div className="studio-admin-page">
      <section className="studio-hero-main">
        <div>
          <p className="admin-kicker">Editor visual controlado</p>
          <h1>Studio GHC</h1>
          <p>
            Editor interno para páginas públicas, bloques, textos y experiencia visual,
            protegido por la estética premium de GHC Academy.
          </p>
        </div>

        <div className="studio-hero-panel">
          <span>Studio GHC</span>
          <strong>Edición visual sin romper la marca</strong>
          <p>
            Cambios en borrador, bloques aprobados y publicación manual con revisión.
          </p>
          <button type="button" onClick={() => setSystemMessage("La publicación real se conectará con control de versiones y permisos.")}>
            Preparar publicación
          </button>
        </div>
      </section>

      <section className="studio-v2-layout">
        <aside className="studio-v2-sidebar">
          <article className="studio-v2-card">
            <div className="studio-v2-card-head">
              <h2>Páginas editables</h2>
              <p>Selecciona una página para editar estructura, textos y bloques.</p>
            </div>

            <div className="studio-v2-page-list">
              {editablePages.map((page, index) => (
                <button
                  key={page.title}
                  type="button"
                  className={index === 0 ? "studio-v2-page-item active" : "studio-v2-page-item"}
                  onClick={() => setSystemMessage(`Preparado para editar: ${page.title}.`)}
                >
                  <span className="studio-v2-page-index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="studio-v2-page-copy">
                    <strong>{page.title}</strong>
                    <small>{page.area}</small>
                    <em>{page.description}</em>
                  </span>
                  <span className={`studio-v2-page-status ${page.state}`}>{page.status}</span>
                </button>
              ))}
            </div>
          </article>
        </aside>

        <section className="studio-v2-workspace">
          <div className="studio-v2-toolbar">
            <div>
              <span>Edición actual</span>
              <strong>{selectedPage.title}</strong>
            </div>

            <div className="studio-v2-device-toggle">
              <button type="button" className="active">Desktop</button>
              <button type="button">Tablet</button>
              <button type="button">Móvil</button>
            </div>
          </div>

          <div className="studio-v2-canvas">
            <section className="studio-v2-preview-hero">
              <div>
                <p>GHC Academy</p>
                <h2>Formación profesional desde la ciencia</h2>
                <span>Entrenamiento · Nutrición · Salud · Rendimiento</span>
                <div>
                  <button type="button">Explorar cursos</button>
                  <button type="button">Ver certificaciones</button>
                </div>
              </div>

              <div className="studio-v2-preview-figure" aria-hidden="true" />
            </section>

            <section className="studio-v2-preview-grid">
              <article>
                <strong>Cursos destacados</strong>
                <p>Cards conectadas al catálogo real.</p>
              </article>
              <article>
                <strong>Beneficios GHC</strong>
                <p>Ciencia aplicada, certificación y progresión.</p>
              </article>
              <article>
                <strong>CTA final</strong>
                <p>Bloque de conversión editable.</p>
              </article>
            </section>
          </div>

          <div className="studio-v2-footer">
            <span>Borrador guardado automáticamente</span>
            <div>
              <button type="button" onClick={() => setSystemMessage("Vista previa real pendiente de conectar.")}>Vista previa</button>
              <button type="button" onClick={() => setSystemMessage("Publicación pendiente de control de versiones y permisos.")}>Publicar cambios</button>
            </div>
          </div>
        </section>

        <aside className="studio-v2-inspector">
          <article className="studio-v2-card">
            <div className="studio-v2-card-head">
              <h2>Propiedades</h2>
              <p>Control de la página seleccionada.</p>
            </div>

            <div className="studio-v2-property-list">
              <StudioProperty label="Página" value={selectedPage.title} />
              <StudioProperty label="Estado" value={selectedPage.status} />
              <StudioProperty label="Área" value={selectedPage.area} />
              <StudioProperty label="Estilo" value="GHC Dark Premium" />
            </div>
          </article>

          <article className="studio-v2-card">
            <div className="studio-v2-card-head">
              <h2>Bloques aprobados</h2>
              <p>Bloques disponibles, agrupados y controlados.</p>
            </div>

            <div className="studio-v2-block-chips">
              {approvedBlocks.map((block) => (
                <span key={block}>{block}</span>
              ))}
            </div>
          </article>

          <article className="studio-v2-card">
            <div className="studio-v2-card-head">
              <h2>Acciones</h2>
              <p>Atajos relacionados con el contenido público.</p>
            </div>

            <div className="studio-v2-actions">
              <button type="button" onClick={() => setActiveTab("cursos")}>Editar catálogo</button>
              <button type="button" onClick={() => setActiveTab("contenido")}>Editar contenido</button>
              <button type="button" onClick={() => setSystemMessage("Restaurar versión se conectará al historial de publicaciones.")}>Restaurar versión</button>
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
}

function AjustesAdmin({ setActiveTab, setSystemMessage }: { setActiveTab: (tab: AdminTab) => void; setSystemMessage: (message: string) => void; }) {
  return <SimpleSection className="settings-admin-page" kicker="Configuración global" title="Ajustes" text="Configura identidad, marca, dominio, SEO, emails, pagos, integraciones, legal, backups y preferencias generales." sideTitle="Centro de configuración" sideText="Los cambios críticos quedarán protegidos por permisos, revisión y confirmación." sideAction="Guardar cambios" onSideAction={() => setSystemMessage("Guardado global pendiente de tabla de ajustes.")}><section className="settings-stats-grid"><CourseStat label="Dominio" value={1} helper="ghcacademy.net" /><CourseStat label="Marca" value={1} helper="GHC" /><CourseStat label="Pagos" value={0} helper="Pendiente" /><CourseStat label="Backups" value={0} helper="Preparado" /></section><section className="settings-layout"><div className="settings-main-column"><article className="settings-card"><div className="card-head"><div><h2>Identidad de la academia</h2><p>Datos base visibles en plataforma, emails, certificados y páginas públicas.</p></div><button onClick={() => setSystemMessage("Edición real pendiente de tabla global.")}>Editar</button></div><div className="settings-grid"><SettingField label="Nombre" value="GHC Academy" /><SettingField label="Tagline" value="Sport Through Science" /><SettingField label="Dominio" value="ghcacademy.net" /><SettingField label="Email soporte" value="soporte@ghcacademy.net" /><SettingField label="Zona horaria" value="Europe/Madrid" /><SettingField label="Idioma" value="Español" /></div></article></div><aside className="settings-side-column"><article className="settings-side-card"><h2>Estado del sistema</h2><StatusRow label="Ruta privada admin" value="Activa" /><StatusRow label="/admin público" value="Bloqueado" /><StatusRow label="Role admin" value="Verificado" /><StatusRow label="Alumno visual" value="Referencia oficial" /><StatusRow label="Pagos reales" value="Pendiente" warning /></article><article className="settings-side-card"><h2>Marca</h2><p>Oscuro/grafito, blanco roto, gris acero y verde GHC controlado.</p><button onClick={() => setActiveTab("studio")}>Abrir Studio</button></article></aside></section></SimpleSection>;
}

function SimpleSection({ className, kicker, title, text, sideTitle, sideText, sideAction, onSideAction, children }: { className: string; kicker: string; title: string; text: string; sideTitle: string; sideText: string; sideAction: string; onSideAction: () => void; children: ReactNode; }) {
  return <div className={className}><section className="admin-hero"><div><p className="admin-kicker">{kicker}</p><h1>{title}</h1><p>{text}</p></div><div className="courses-hero-panel"><span>{sideTitle}</span><strong>{sideText.split(":")[0]}</strong><p>{sideText}</p><button type="button" onClick={onSideAction}>{sideAction}</button></div></section>{children}</div>;
}

function AdminModal({ title, eyebrow, children, onClose }: { title: string; eyebrow: string; children: ReactNode; onClose: () => void; }) { return <div className="modal-backdrop" role="dialog" aria-modal="true"><section className="admin-modal"><div className="modal-head"><div><p className="admin-kicker">{eyebrow}</p><h2>{title}</h2></div><button type="button" onClick={onClose}>×</button></div>{children}</section></div>; }
function CourseInfo({ label, value }: { label: string; value: string }) { return <div className="course-info-box"><span>{label}</span><strong>{value}</strong></div>; }
function CourseStat({ label, value, helper }: { label: string; value: number; helper: string }) { return <article className="course-stat-card"><span>{label}</span><strong>{formatNumber(value)}</strong><p>{helper}</p></article>; }
function KpiCard({ title, value, trend, icon, danger = false, muted = false }: { title: string; value: string; trend: string; icon: string; danger?: boolean; muted?: boolean; }) { return <article className={danger ? "kpi-card danger" : muted ? "kpi-card muted" : "kpi-card"}><div className="kpi-top"><span>{title}</span><em>{icon}</em></div><strong>{value}</strong><p>{trend}</p><div className="sparkline" /></article>; }
function MiniMetric({ label, value, trend }: { label: string; value: string; trend: string }) { return <div className="mini-metric"><span>{label}</span><strong>{value}</strong><em>{trend}</em></div>; }
function QuickAction({ icon, title, text, onClick }: { icon: string; title: string; text: string; onClick: () => void }) { return <button type="button" className="quick-action" onClick={onClick}><span>{icon}</span><div><strong>{title}</strong><p>{text}</p></div><em>›</em></button>; }
function ActivityItem({ icon, title, label, time }: { icon: string; title: string; label: string; time: string }) { return <div className="activity-item"><span>{icon}</span><div><strong>{title}</strong><p>{label}</p></div><em>{time}</em></div>; }
function StatusRow({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) { return <div className={warning ? "status-row warning" : "status-row"}><span>{label}</span><strong>{value}</strong></div>; }
function ReviewItem({ title, text, tag }: { title: string; text: string; tag: string }) { return <div className="review-item"><span>▣</span><div><strong>{title}</strong><p>{text}</p></div><em>{tag}</em></div>; }
function SourceDoc({ type, title, status }: { type: string; title: string; status: string }) { return <div className="source-doc-card"><span>{type}</span><strong>{title}</strong><p>{status}</p></div>; }
function ProductionCheck({ label, done = false }: { label: string; done?: boolean }) { return <div className={done ? "production-check done" : "production-check"}><span>{done ? "✓" : "○"}</span><p>{label}</p></div>; }
function StudentStat({ label, value, helper, danger = false, warning = false }: { label: string; value: number; helper: string; danger?: boolean; warning?: boolean }) { return <article className={danger ? "student-stat-card danger" : warning ? "student-stat-card warning" : "student-stat-card"}><span>{label}</span><strong>{formatNumber(value)}</strong><p>{helper}</p></article>; }
function DetailMetric({ label, value }: { label: string; value: string | number }) { return <div className="detail-metric"><span>{label}</span><strong>{value}</strong></div>; }
function PaymentRowsTable({ rows, setSystemMessage }: { rows: ReturnType<typeof buildPaymentRows>; setSystemMessage: (message: string) => void; }) { return <div className="payments-table"><div className="payments-table-head"><span>Alumno</span><span>Curso / acceso</span><span>Importe</span><span>Estado</span><span>Acción</span></div>{rows.map((row) => <div key={row.id} className="payments-table-row"><div><strong>{row.student}</strong><p>{row.email}</p></div><div><strong>{row.course}</strong><p>{row.kind}</p></div><strong>{row.amount}</strong><span className={`payment-status ${row.statusTone}`}>{row.status}</span><button type="button" onClick={() => setSystemMessage(row.actionMessage)}>{row.action}</button></div>)}</div>; }
function OpportunityItem({ label, action, onClick }: { label: string; action: string; onClick: () => void }) { return <button type="button" className="opportunity-item" onClick={onClick}><span>{label}</span><strong>{action} ›</strong></button>; }
function RoleCheck({ active }: { active: boolean }) { return <span className={active ? "role-check active" : "role-check"}>{active ? "✓" : "—"}</span>; }
function SettingField({ label, value }: { label: string; value: string }) { return <div className="setting-field"><span>{label}</span><strong>{value}</strong></div>; }

function normalizeCourseStatus(course: AnyRecord): CourseStatus { const status = String(course.status || course.visibility || "").toLowerCase(); if (["draft", "borrador"].includes(status)) return "draft"; if (["hidden", "oculto", "archived", "archivado", "inactive", "inactivo"].includes(status)) return "hidden"; if (course.is_published === false || course.published === false) return "draft"; return "published"; }
function normalizeCertificateStatus(value: unknown): CertificateAdminView["status"] { const status = String(value || "valid").toLowerCase(); if (["revoked", "revocado", "cancelled", "cancelado"].includes(status)) return "revoked"; if (["pending", "pendiente", "review", "revision"].includes(status)) return "pending"; return "valid"; }
function getCertificateStatusLabel(status: CertificateAdminView["status"]) { if (status === "revoked") return "Revocado"; if (status === "pending") return "Pendiente"; return "Válido"; }
function getCertificateCode(certificate: AnyRecord, index: number) { const existing = certificate.certificate_code || certificate.code || certificate.verification_code; if (existing) return String(existing); const date = certificate.issued_at || certificate.created_at; const year = date ? new Date(date).getFullYear() : new Date().getFullYear(); return `GHC-${year}-${320001 + index}-${makeVerificationSuffix(String(certificate.id || `${certificate.user_id || "user"}-${certificate.course_id || "course"}-${index}`))}`; }
function makeVerificationSuffix(seed: string) { const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let hash = 0; for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0; let output = ""; for (let i = 0; i < 4; i += 1) output += alphabet[(hash >> (i * 5)) % alphabet.length]; return output; }
function formatCertificateScore(value: unknown) { if (value === null || value === undefined || value === "") return "Aprobado"; const numeric = Number(value); if (Number.isFinite(numeric)) return numeric > 10 ? `${Math.round(numeric)}%` : `${numeric}/10`; return String(value); }
function getInactiveDays(value?: string | null) { if (!value) return null; try { const diff = Date.now() - new Date(value).getTime(); return Math.max(0, Math.floor(diff / 86400000)); } catch { return null; } }
function getStudentRisk(inactiveDays: number | null, progress: number): { status: "active" | "inactive" | "risk"; statusLabel: string; label: string; tone: "green" | "yellow" | "red" | "muted" } { if (inactiveDays === null) return { status: "inactive", statusLabel: "Sin actividad", label: "Sin datos de acceso", tone: "muted" }; if (inactiveDays >= 21) return { status: "risk", statusLabel: "Riesgo", label: `Inactivo ${inactiveDays} días`, tone: "red" }; if (inactiveDays >= 7) return { status: "inactive", statusLabel: "En pausa", label: `Inactivo ${inactiveDays} días`, tone: "yellow" }; if (progress >= 80) return { status: "active", statusLabel: "Avanzado", label: "Alto compromiso", tone: "green" }; return { status: "active", statusLabel: "Activo", label: "Actividad reciente", tone: "green" }; }
function getLatestCourseName(activeCourseIds: Set<string>, courseViews: CourseAdminView[]) { const firstId = Array.from(activeCourseIds)[0]; if (!firstId) return "Sin curso activo detectado"; return courseViews.find((course) => course.id === firstId)?.title || "Curso GHC Academy"; }
function buildAnalyticsSnapshot(data: DashboardData, courseViews: CourseAdminView[], studentViews: StudentAdminView[]) { const completedCourses = data.courseCompletions.filter((item) => item.completed === true || String(item.status || "").toLowerCase() === "completed").length; const activeStudents = studentViews.length; const certificates = data.certificates.filter((certificate) => !["revoked", "revocado", "cancelled", "cancelado"].includes(String(certificate.status || "valid").toLowerCase())).length; const completionRate = activeStudents ? Math.min(100, Math.round((completedCourses / activeStudents) * 100)) : 0; return { activeStudents, completedCourses, completionRate, certificates, moduleCompletions: data.moduleCompletions.length, lessonProgress: data.lessonProgress.length, coursesTotal: courseViews.length, lessonsTotal: data.lessons.length }; }
function buildPaymentRows(studentViews: StudentAdminView[], courseViews: CourseAdminView[]) { const rows = studentViews.slice(0, 6).map((student, index) => { const course = courseViews[index % Math.max(courseViews.length, 1)]; const hasAccess = student.activeCourses > 0 || student.certificates > 0; const isRisk = student.status === "blocked" || student.riskTone === "red"; return { id: student.id, student: student.name, email: student.email, course: course?.title || student.latestCourse || "Curso GHC Academy", kind: hasAccess ? "Acceso activo / compra registrada" : "Sin compra registrada", amount: student.totalInvested, status: isRisk ? "Revisar" : hasAccess ? "Activo" : "Pendiente", statusTone: isRisk ? "risk" : hasAccess ? "active" : "pending", action: isRisk ? "Reactivar" : hasAccess ? "Gestionar" : "Asignar", actionMessage: isRisk ? "La reactivación se conectará con Pagos y accesos." : hasAccess ? "La gestión detallada se conectará con el historial comercial." : "La asignación manual se conectará en la siguiente fase." }; }); return rows.length ? rows : [{ id: "empty-payment-1", student: "Sin alumnos comerciales", email: "Pagos no conectados todavía", course: "Acceso manual preparado", kind: "Becas, regalos y desbloqueos futuros", amount: "—", status: "Preparado", statusTone: "active", action: "Configurar", actionMessage: "Cuando haya alumnos y pagos, aparecerán aquí." }]; }
function buildCommunicationRows(studentViews: StudentAdminView[], courseViews: CourseAdminView[]) { const rows = studentViews.slice(0, 8).map((student, index) => { const risk = student.riskTone === "yellow" || student.riskTone === "red"; const course = courseViews[index % Math.max(courseViews.length, 1)]?.title || student.latestCourse || "Curso GHC Academy"; return { id: student.id, name: student.name, email: student.email, reason: risk ? "Seguimiento por inactividad" : "Mensaje informativo", detail: risk ? `${student.riskLabel} · ${course}` : "Comunicación general", channel: risk ? "Email" : "Interno", channelTone: risk ? "email" : "internal", status: risk ? "Preparado" : "Borrador", statusTone: risk ? "ready" : "draft", action: risk ? "Contactar" : "Preparar", actionMessage: risk ? `Mensaje de ayuda preparado para ${student.name}.` : `Mensaje en borrador para ${student.name}.` }; }); return rows.length ? rows : [{ id: "communication-empty-1", name: "Sin alumnos todavía", email: "Cuando haya alumnos, aparecerán aquí.", reason: "Sistema preparado", detail: "Seguimiento, campañas y marketing", channel: "Interno", channelTone: "internal", status: "Preparado", statusTone: "ready", action: "Configurar", actionMessage: "Comunicaciones preparada." }]; }
function createPlaceholderModules(): AnyRecord[] { return [{ id: "placeholder-1", title: "Fundamentos y contexto" }, { id: "placeholder-2", title: "Desarrollo del contenido principal" }, { id: "placeholder-3", title: "Aplicación práctica y evaluación" }]; }
function getCourseStatusLabel(status: string) { if (status === "draft") return "Borrador"; if (status === "hidden") return "Oculto"; return "Publicado"; }
function formatCoursePrice(course: AnyRecord) { const raw = course.price ?? course.amount ?? course.sale_price ?? null; const currency = String(course.currency || "€"); if (raw === null || raw === undefined || raw === "") return "Sin precio"; const numeric = Number(raw); if (Number.isFinite(numeric)) { if (["EUR", "eur", "€"].includes(currency)) return `${numeric.toLocaleString("es-ES")}€`; if (["USD", "usd", "$"].includes(currency)) return `$${numeric.toLocaleString("es-ES")}`; return `${numeric.toLocaleString("es-ES")} ${currency}`; } return String(raw); }
function getCourseImage(course: AnyRecord) { return course?.cover_image || course?.cover_image_url || course?.image || course?.image_url || course?.thumbnail || course?.thumbnail_url || ""; }
function getCourseBackground(item: CourseAdminView, index: number) { if (item.image) return `linear-gradient(180deg, rgba(5,7,6,.08), rgba(5,7,6,.92)), url(${item.image})`; const fallbacks = ["radial-gradient(circle at 72% 22%, rgba(99,229,70,.22), transparent 32%), linear-gradient(135deg, rgba(244,246,242,.08), rgba(255,255,255,.015))", "radial-gradient(circle at 18% 24%, rgba(244,246,242,.16), transparent 28%), linear-gradient(135deg, rgba(99,229,70,.16), rgba(255,255,255,.018))", "radial-gradient(circle at 80% 80%, rgba(99,229,70,.18), transparent 32%), linear-gradient(135deg, rgba(255,255,255,.055), rgba(255,255,255,.016))"]; return fallbacks[index % fallbacks.length]; }
function getErrorMessage(error: unknown, fallback: string) { if (!error) return fallback; if (typeof error === "string") return error; if (typeof error === "object" && error !== null) { const candidate = (error as AnyRecord).message || (error as AnyRecord).details || (error as AnyRecord).hint; if (candidate) return String(candidate); } return fallback; }
function formatNumber(value: number) { return new Intl.NumberFormat("es-ES").format(value || 0); }
function formatShortDate(value?: string | null) { if (!value) return "Sin fecha"; try { return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)); } catch { return "Sin fecha"; } }
function formatRelative(value?: string | null) { if (!value) return "Reciente"; try { const date = new Date(value); const diff = Date.now() - date.getTime(); const minutes = Math.floor(diff / 60000); const hours = Math.floor(minutes / 60); const days = Math.floor(hours / 24); if (minutes < 1) return "Ahora"; if (minutes < 60) return `Hace ${minutes} min`; if (hours < 24) return `Hace ${hours} h`; if (days < 7) return `Hace ${days} días`; return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(date); } catch { return "Reciente"; } }
function getTabLabel(tab: AdminTab) { return adminTabs.find((item) => item.id === tab)?.label || "Panel"; }
function getInitials(name: string) { return String(name).split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function shortName(name: string) { return String(name).split("@")[0].split(" ")[0] || "Admin"; }
function ChartSvg() { return <svg viewBox="0 0 900 260" aria-hidden="true"><defs><linearGradient id="adminChartGradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={GREEN} stopOpacity="0.42" /><stop offset="100%" stopColor={GREEN} stopOpacity="0" /></linearGradient></defs><path d="M30 220 L110 190 L190 180 L270 135 L350 128 L430 86 L510 105 L590 92 L670 118 L750 72 L850 52" fill="none" stroke={GREEN} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /><path d="M30 220 L110 190 L190 180 L270 135 L350 128 L430 86 L510 105 L590 92 L670 118 L750 72 L850 52 L850 250 L30 250 Z" fill="url(#adminChartGradient)" /></svg>; }
function Background() { return <div className="admin-background" aria-hidden="true"><div className="admin-orb one" /><div className="admin-orb two" /><div className="admin-grid-texture" /></div>; }


function StudioMetric({
  label,
  value,
  helper,
  warning = false,
}: {
  label: string;
  value: string | number;
  helper: string;
  warning?: boolean;
}) {
  return (
    <article className={warning ? "studio-metric warning" : "studio-metric"}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{helper}</p>
    </article>
  );
}


function StudioProperty({ label, value }: { label: string; value: string }) {
  return (
    <div className="studio-property">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function GlobalStyles() {
  return <style>{`
    :root{--green:#63e546;--bg:#050706;--panel:rgba(10,14,12,.88);--line:rgba(255,255,255,.085);--white:#f4f6f2;--muted:rgba(244,246,242,.64);--soft:rgba(244,246,242,.42);--danger:#ff5757;--warning:#f7c948}*{box-sizing:border-box}html,body{margin:0;padding:0;background:var(--bg)}body{color:var(--white);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}button,input,select,textarea{font:inherit}button{transition:.18s ease}button:hover{transform:translateY(-1px)}
    .admin-page{min-height:100vh;display:grid;grid-template-columns:292px minmax(0,1fr);background:var(--bg);color:var(--white);position:relative}.admin-loading{min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--white);position:relative}.admin-loading-card{position:relative;z-index:2;width:min(560px,calc(100vw - 40px));border:1px solid var(--line);border-radius:28px;background:linear-gradient(145deg,rgba(255,255,255,.08),rgba(255,255,255,.025));padding:34px;box-shadow:0 30px 90px rgba(0,0,0,.45)}.admin-loading-card h1{margin:18px 0 0;font-size:38px;line-height:.95;letter-spacing:-.055em}.admin-loading-card p{margin:16px 0 0;color:var(--muted);font-size:16px}.admin-background{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:0}.admin-orb{position:absolute;width:520px;height:520px;border-radius:999px;filter:blur(110px)}.admin-orb.one{left:-180px;top:-180px;background:rgba(99,229,70,.09)}.admin-orb.two{right:-240px;top:120px;background:rgba(255,255,255,.055)}.admin-grid-texture{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);background-size:42px 42px;opacity:.5;mask-image:radial-gradient(circle at center,black 0%,transparent 84%)}
    .admin-sidebar{position:sticky;top:0;height:100vh;z-index:2;border-right:1px solid var(--line);background:linear-gradient(180deg,rgba(5,8,7,.97),rgba(3,5,4,.94));padding:22px;display:flex;flex-direction:column;justify-content:space-between}.admin-logo{min-height:58px;display:flex;align-items:center;margin-bottom:24px}.admin-nav{display:grid;gap:6px}.admin-nav-item{width:100%;min-height:47px;border:1px solid transparent;background:transparent;color:rgba(244,246,242,.65);border-radius:13px;padding:0 13px;display:flex;align-items:center;gap:12px;cursor:pointer;text-align:left}.admin-nav-item:hover{color:var(--white);background:rgba(255,255,255,.035)}.admin-nav-item.active{color:var(--green);background:linear-gradient(90deg,rgba(99,229,70,.15),rgba(99,229,70,.035));border-color:rgba(99,229,70,.16);box-shadow:inset 3px 0 0 var(--green)}.admin-nav-icon{width:24px;color:currentColor;font-weight:900;display:inline-flex;justify-content:center}.admin-nav-item strong{display:block;font-size:13px;line-height:1.05}.admin-nav-item small{display:block;margin-top:3px;color:var(--soft);font-size:11px}.admin-sidebar-bottom{display:grid;gap:14px}.support-card,.admin-user-card{border:1px solid var(--line);border-radius:18px;background:rgba(255,255,255,.035);padding:16px}.support-card{display:grid;grid-template-columns:40px minmax(0,1fr);gap:12px}.support-card button{grid-column:1/-1;min-height:38px;border-radius:10px;border:1px solid rgba(99,229,70,.28);color:var(--green);background:rgba(99,229,70,.06);cursor:pointer;font-weight:850}.support-icon,.admin-user-card>span{width:40px;height:40px;border-radius:999px;display:grid;place-items:center;background:rgba(99,229,70,.1);color:var(--green);border:1px solid rgba(99,229,70,.18);font-weight:950}.support-card p,.admin-user-card p{margin:3px 0 0;color:var(--muted);font-size:12px}.admin-user-card{display:grid;grid-template-columns:42px minmax(0,1fr);gap:12px;align-items:center}
    .admin-shell{position:relative;z-index:1;min-width:0;padding:18px 20px 30px}.admin-topbar{min-height:58px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:18px}.breadcrumb{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:13px;font-weight:850;white-space:nowrap}.breadcrumb strong{color:var(--white)}.topbar-actions{display:flex;align-items:center;gap:10px;min-width:0}.admin-search-wrap{position:relative;width:360px;max-width:36vw}.admin-search{height:40px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--muted);display:flex;align-items:center;gap:9px;padding:0 14px;font-size:13px}.admin-search input{flex:1;min-width:0;height:38px;border:0;outline:0;background:transparent;color:var(--white)}.global-search-panel{position:absolute;right:0;top:48px;width:min(540px,calc(100vw - 40px));border:1px solid rgba(99,229,70,.22);border-radius:18px;background:rgba(5,8,7,.98);box-shadow:0 28px 80px rgba(0,0,0,.45);padding:10px;z-index:30}.global-search-head{display:flex;justify-content:space-between;align-items:center;padding:6px 8px 10px;color:var(--muted);font-size:12px}.global-search-head strong{color:var(--white)}.global-search-head button{border:0;background:transparent;color:var(--muted);cursor:pointer}.global-result{width:100%;border:1px solid rgba(255,255,255,.065);background:rgba(255,255,255,.028);color:var(--white);border-radius:14px;display:grid;grid-template-columns:38px minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px;text-align:left;cursor:pointer;margin-top:7px}.global-result:hover{border-color:rgba(99,229,70,.25);background:rgba(99,229,70,.07)}.global-result>span{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:rgba(99,229,70,.09);color:var(--green);border:1px solid rgba(99,229,70,.18);font-weight:950}.global-result p,.global-search-empty p{margin:4px 0 0;color:var(--muted);font-size:12px}.global-result em{font-style:normal;color:var(--green);font-weight:900;font-size:12px}.global-search-empty{padding:18px;color:var(--white)}.create-btn,.studio-top-btn{min-height:40px;border-radius:999px;padding:0 16px;cursor:pointer;font-weight:900}.create-btn{border:0;background:var(--green);color:#061008}.studio-top-btn{border:1px solid rgba(99,229,70,.24);background:rgba(99,229,70,.07);color:var(--green)}.icon-btn{width:40px;height:40px;border-radius:999px;border:1px solid var(--line);color:var(--white);background:rgba(255,255,255,.035);cursor:pointer}.topbar-user{display:flex;align-items:center;gap:10px}.topbar-user>span{width:42px;height:42px;border-radius:999px;display:grid;place-items:center;background:rgba(99,229,70,.11);color:var(--green);font-weight:950}.topbar-user p{margin:2px 0 0;color:var(--muted);font-size:12px}.admin-notice{margin-bottom:14px;border-radius:14px;border:1px solid rgba(99,229,70,.2);background:rgba(99,229,70,.055);color:var(--muted);padding:14px 16px}
    .panel-page,.courses-admin-page,.content-admin-page,.students-admin-page,.exams-admin-page,.certificates-admin-page,.payments-admin-page,.communications-admin-page,.analytics-admin-page,.security-admin-page,.studio-admin-page,.settings-admin-page{display:grid;gap:16px}.admin-hero,.courses-hero,.content-hero,.students-hero,.exams-hero,.certificates-hero,.payments-hero,.communications-hero,.analytics-hero,.security-hero,.studio-hero-main,.settings-hero{min-height:128px;border:1px solid var(--line);border-radius:22px;background:linear-gradient(90deg,rgba(9,13,11,.98),rgba(9,13,11,.76)),radial-gradient(circle at 80% 20%,rgba(99,229,70,.13),transparent 30%);display:flex;align-items:center;justify-content:space-between;gap:22px;padding:26px;overflow:hidden;position:relative;box-shadow:0 28px 90px rgba(0,0,0,.22)}.admin-kicker{margin:0 0 10px;color:var(--green);text-transform:uppercase;letter-spacing:.18em;font-size:11px;font-weight:950}.admin-hero h1,.courses-hero h1,.content-hero h1,.students-hero h1,.exams-hero h1,.certificates-hero h1,.payments-hero h1,.communications-hero h1,.analytics-hero h1,.security-hero h1,.studio-hero-main h1,.settings-hero h1{margin:0;font-size:clamp(36px,4vw,54px);line-height:.94;letter-spacing:-.06em;font-weight:950}.admin-hero p:not(.admin-kicker),.courses-hero p:not(.admin-kicker),.content-hero p:not(.admin-kicker),.students-hero p:not(.admin-kicker),.exams-hero p:not(.admin-kicker),.certificates-hero p:not(.admin-kicker),.payments-hero p:not(.admin-kicker),.communications-hero p:not(.admin-kicker),.analytics-hero p:not(.admin-kicker),.security-hero p:not(.admin-kicker),.studio-hero-main p:not(.admin-kicker),.settings-hero p:not(.admin-kicker){margin:12px 0 0;color:var(--muted);line-height:1.6;max-width:760px}.hero-athlete{width:360px;height:130px;opacity:.62;background:radial-gradient(circle at 45% 50%,rgba(244,246,242,.18),transparent 22%),linear-gradient(120deg,transparent 20%,rgba(99,229,70,.18),transparent 60%);clip-path:polygon(4% 70%,22% 48%,40% 55%,58% 20%,83% 30%,100% 14%,85% 42%,66% 40%,50% 70%,26% 65%,8% 88%)}.courses-hero-panel,.content-hero-panel,.students-hero-panel,.exams-hero-panel,.certificates-hero-panel,.payments-hero-panel,.communications-hero-panel,.analytics-hero-panel,.security-hero-panel,.studio-hero-panel,.settings-hero-panel{width:390px;border-radius:18px;border:1px solid rgba(99,229,70,.2);background:rgba(99,229,70,.055);padding:18px}.courses-hero-panel span{color:var(--green);font-size:11px;text-transform:uppercase;letter-spacing:.16em;font-weight:950}.courses-hero-panel strong{display:block;margin-top:8px;font-size:20px;line-height:1.12}.courses-hero-panel p{color:var(--muted);line-height:1.5;font-size:13px}.courses-hero-panel button{min-height:40px;border:0;border-radius:999px;background:var(--green);color:#061008;font-weight:950;padding:0 16px;cursor:pointer}
    .kpi-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.kpi-card,.growth-card,.quick-actions-card,.activity-card,.platform-card,.review-card,.studio-card,.course-stat-card,.course-toolbar,.admin-course-card,.courses-empty,.course-side-card,.production-board-card,.module-map-card,.source-docs-card,.content-side-card,.student-stat-card,.students-list-card,.student-detail-card,.exam-list-card,.certificate-template-card,.certificate-list-card,.certificate-side-card,.payments-table-card,.payment-side-card,.message-composer-card,.communications-table-card,.communication-side-card,.analytics-growth-card,.analytics-side-card,.security-permissions-card,.security-side-card,.studio-panel-card,.studio-canvas-panel,.settings-card,.settings-side-card{border:1px solid var(--line);border-radius:18px;background:var(--panel);box-shadow:0 22px 70px rgba(0,0,0,.18)}.kpi-card{min-height:136px;padding:16px;overflow:hidden}.kpi-top{display:flex;align-items:center;justify-content:space-between;color:var(--muted);font-size:13px}.kpi-top em{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:rgba(99,229,70,.09);color:var(--green);border:1px solid rgba(99,229,70,.14);font-style:normal;font-weight:950}.kpi-card>strong{display:block;margin-top:12px;font-size:29px;letter-spacing:-.045em}.kpi-card p{margin:6px 0 0;color:var(--green);font-size:12px;font-weight:850}.kpi-card.danger p,.kpi-card.danger .kpi-top em{color:var(--danger)}.kpi-card.muted p,.kpi-card.muted .kpi-top em{color:var(--muted)}.sparkline{height:28px;margin-top:12px;background:linear-gradient(90deg,rgba(99,229,70,.12),rgba(99,229,70,.5),rgba(99,229,70,.18));clip-path:polygon(0 64%,12% 50%,22% 58%,34% 34%,47% 46%,62% 24%,78% 28%,100% 8%,100% 100%,0 100%);opacity:.75}.admin-main-grid{display:grid;grid-template-columns:1.18fr .95fr;gap:14px}.growth-card,.quick-actions-card,.activity-card,.platform-card,.review-card,.studio-card,.course-side-card,.production-board-card,.module-map-card,.source-docs-card,.content-side-card,.students-list-card,.student-detail-card,.exam-list-card,.certificate-template-card,.certificate-list-card,.certificate-side-card,.payments-table-card,.payment-side-card,.message-composer-card,.communications-table-card,.communication-side-card,.analytics-growth-card,.analytics-side-card,.security-permissions-card,.security-side-card,.studio-panel-card,.studio-canvas-panel,.settings-card,.settings-side-card{padding:18px}.card-head,.section-title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:14px}.card-head h2,.section-title-row h2,.quick-actions-card h2,.platform-card h2{margin:0;font-size:21px;line-height:1.05;letter-spacing:-.035em}.card-head p,.section-title-row p{margin:6px 0 0;color:var(--muted);font-size:13px}.card-head button,.section-title-row button{min-height:34px;border-radius:10px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--white);padding:0 12px;cursor:pointer}.chart-area{min-height:230px;border:1px solid rgba(255,255,255,.06);border-radius:16px;background:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);background-size:50px 50px;overflow:hidden}.chart-area svg{width:100%;height:230px;display:block}.chart-summary{margin-top:14px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid var(--line);border-radius:14px;overflow:hidden}.mini-metric{padding:13px 14px;border-right:1px solid var(--line);min-width:0}.mini-metric:last-child{border-right:0}.mini-metric span{display:block;color:var(--muted);font-size:12px}.mini-metric strong{display:inline-block;margin-top:5px;font-size:19px}.mini-metric em{color:var(--green);margin-left:8px;font-style:normal;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.08em}.quick-actions-grid{margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:12px}.quick-action{min-height:76px;border-radius:14px;border:1px solid var(--line);background:rgba(255,255,255,.028);color:var(--white);display:grid;grid-template-columns:42px minmax(0,1fr) 18px;gap:12px;align-items:center;padding:12px;cursor:pointer;text-align:left}.quick-action>span,.activity-item>span,.review-item>span{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:rgba(99,229,70,.09);color:var(--green);border:1px solid rgba(99,229,70,.16);font-weight:950}.quick-action p,.activity-item p,.review-item p,.studio-card p{margin:4px 0 0;color:var(--muted);font-size:12px;line-height:1.45}.quick-action em{color:var(--muted);font-style:normal;font-size:22px}.activity-item,.review-item{display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 0;border-top:1px solid rgba(255,255,255,.055)}.activity-item em,.review-item em{color:var(--muted);font-style:normal;font-size:12px}.platform-body{display:grid;grid-template-columns:112px minmax(0,1fr);gap:18px;align-items:center;margin-top:18px}.shield{width:106px;height:106px;border-radius:30px;display:grid;place-items:center;color:var(--green);font-size:44px;background:radial-gradient(circle,rgba(99,229,70,.2),rgba(99,229,70,.04));border:1px solid rgba(99,229,70,.18)}.status-row{display:flex;justify-content:space-between;gap:12px;color:var(--muted);padding:8px 0;border-top:1px solid rgba(255,255,255,.045)}.status-row strong{color:var(--green)}.status-row.warning strong{color:var(--warning)}.platform-progress{margin-top:18px;display:flex;justify-content:space-between;border-top:1px solid var(--line);padding-top:14px;color:var(--muted)}.platform-progress strong{color:var(--white)}.studio-card{grid-column:2/3;display:grid;grid-template-columns:minmax(0,1fr) 180px;gap:18px;align-items:center;background:radial-gradient(circle at 78% 50%,rgba(99,229,70,.11),transparent 34%),var(--panel)}.studio-card button{margin-top:14px;min-height:42px;border-radius:10px;border:1px solid rgba(99,229,70,.32);background:rgba(99,229,70,.08);color:var(--green);font-weight:900;cursor:pointer;padding:0 16px}.studio-visual{height:104px;border-radius:14px;border:1px solid var(--line);background:rgba(255,255,255,.035);padding:16px;display:grid;gap:10px}.studio-visual div,.studio-visual span{border-radius:8px;background:rgba(255,255,255,.12)}.studio-visual div{height:36px}.studio-visual span{height:9px}
    .course-stats-grid,.student-stats-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}.content-stats-grid,.certificate-stats-grid,.payment-stats-grid,.analytics-stats-grid,.security-stats-grid,.studio-stats-grid,.settings-stats-grid,.exam-stats-grid,.communication-stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.course-stat-card,.student-stat-card{padding:16px;min-height:118px}.course-stat-card span,.student-stat-card span{color:var(--muted);font-size:12px;font-weight:800}.course-stat-card strong,.student-stat-card strong{display:block;margin-top:9px;font-size:30px;letter-spacing:-.045em}.course-stat-card p,.student-stat-card p{color:var(--muted);margin:6px 0 0;font-size:12px}.student-stat-card.danger strong{color:var(--danger)}.student-stat-card.warning strong{color:var(--warning)}.course-toolbar,.student-toolbar{min-height:62px;padding:10px;display:grid;grid-template-columns:minmax(260px,1fr) 210px auto;gap:10px;align-items:center}.course-search,.student-search{min-height:42px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.035);display:flex;align-items:center;gap:10px;padding:0 14px;color:var(--muted)}.course-search input,.student-search input{flex:1;min-width:0;height:40px;background:transparent;border:0;outline:0;color:var(--white)}.course-toolbar select,.admin-form select{min-height:42px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--white);padding:0 14px}.course-toolbar option,.admin-form option{background:#080b0a;color:var(--white)}.course-view-toggle{height:42px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.035);padding:4px;display:flex;gap:4px}.course-view-toggle button{border:0;border-radius:999px;padding:0 14px;background:transparent;color:var(--muted);cursor:pointer;font-weight:900}.course-view-toggle button.active{background:rgba(99,229,70,.14);color:var(--green)}.courses-layout,.content-layout,.students-layout,.exams-layout,.certificates-layout,.payments-layout,.communications-layout,.analytics-layout,.security-layout,.settings-layout{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:14px;align-items:start}.courses-main-column,.courses-side-column,.content-main-column,.content-side-column,.certificates-main-column,.certificates-side-column,.payments-main-column,.payments-side-column,.communications-main-column,.communications-side-column,.settings-main-column,.settings-side-column{display:grid;gap:14px}.students-layout{grid-template-columns:minmax(0,1fr) 390px}.admin-course-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:14px}.admin-course-list{display:grid;gap:12px}.admin-course-card{overflow:hidden;display:grid;grid-template-rows:168px 1fr}.admin-course-card.list{grid-template-columns:310px minmax(0,1fr);grid-template-rows:1fr}.admin-course-cover{position:relative;min-height:168px;background-size:cover;background-position:center;filter:grayscale(.35) contrast(1.06) brightness(.78)}.course-status-pill{position:absolute;left:14px;top:14px;border-radius:999px;padding:7px 10px;font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.12em;border:1px solid rgba(99,229,70,.28);background:rgba(99,229,70,.12);color:var(--green)}.course-status-pill.draft{border-color:rgba(247,201,72,.28);background:rgba(247,201,72,.1);color:var(--warning)}.course-status-pill.hidden{border-color:rgba(255,255,255,.12);background:rgba(255,255,255,.055);color:var(--muted)}.admin-course-body{padding:16px;display:grid;gap:14px}.course-title-row{display:flex;justify-content:space-between;gap:12px}.course-title-row h3{margin:0;font-size:23px;line-height:1.05;letter-spacing:-.035em}.course-title-row p{margin:8px 0 0;color:var(--muted);line-height:1.45;font-size:13px}.course-info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.course-info-box,.detail-metric,.setting-field{border:1px solid rgba(255,255,255,.07);border-radius:12px;background:rgba(0,0,0,.16);padding:10px;min-width:0}.course-info-box span,.detail-metric span,.setting-field span{display:block;color:var(--soft);font-size:10px;text-transform:uppercase;letter-spacing:.12em;font-weight:900;line-height:1.2}.course-info-box strong,.detail-metric strong,.setting-field strong{display:block;margin-top:5px;color:var(--white);font-size:13px;line-height:1.25}.course-build-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.course-build-row div{border-radius:12px;border:1px solid rgba(99,229,70,.13);background:rgba(99,229,70,.045);padding:11px}.course-build-row strong{display:block;font-size:24px;line-height:1}.course-build-row span{display:block;color:var(--muted);font-size:12px;margin-top:4px}.course-progress-block{display:grid;gap:8px}.course-progress-block>div:first-child{display:flex;justify-content:space-between;color:var(--muted);font-size:12px;font-weight:800}.course-progress-block strong{color:var(--green)}.course-progress-track,.student-progress-track{height:8px;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}.course-progress-track div,.student-progress-track div{height:100%;border-radius:999px;background:var(--green);box-shadow:0 0 20px rgba(99,229,70,.28)}.admin-course-actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}.admin-course-actions button,.module-map-row button,.exam-row button,.payments-table-row button,.communication-table-row button{min-height:38px;border-radius:10px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--white);cursor:pointer;font-weight:850;font-size:12px}.admin-course-actions button:first-child{background:var(--green);color:#061008;border-color:transparent}.courses-empty,.certificate-empty{padding:28px;text-align:center;color:var(--muted)}.courses-empty span{width:58px;height:58px;border-radius:18px;display:grid;place-items:center;margin:0 auto 14px;color:var(--green);border:1px solid rgba(99,229,70,.2);background:rgba(99,229,70,.07);font-size:28px}.courses-empty h3{margin:0;font-size:24px;color:var(--white)}.course-side-card h2,.content-side-card h2,.payment-side-card h2,.communication-side-card h2,.analytics-side-card h2,.settings-side-card h2{margin:0 0 12px;font-size:22px;line-height:1.05;letter-spacing:-.035em}.course-side-card p,.content-side-card p,.payment-side-card p,.communication-side-card p,.analytics-side-card p,.settings-side-card p{color:var(--muted);line-height:1.58;font-size:13px}.course-side-card>button,.content-side-card>button,.payment-side-card>button,.communication-side-card>button,.settings-side-card>button{width:100%;min-height:42px;margin-top:10px;border-radius:11px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--white);cursor:pointer;font-weight:850}.course-side-card>button:first-of-type,.payment-side-card>button:first-of-type,.communication-side-card>button:first-of-type,.settings-side-card>button:first-of-type{background:var(--green);color:#061008;border-color:transparent}.catalog-ring{width:138px;height:138px;border-radius:999px;margin:18px auto;display:grid;place-items:center;align-content:center;border:12px solid rgba(99,229,70,.22)}.catalog-ring strong{font-size:38px;line-height:1}.catalog-ring span{color:var(--muted);font-size:12px;margin-top:4px}.catalog-status-list{display:grid;gap:10px}
    .production-course-list,.module-map-list,.students-list,.exam-list,.certificate-table,.payments-table,.communication-table,.role-matrix{display:grid;gap:10px}.production-course,.module-map-row,.student-row,.exam-row,.certificate-table-row,.payments-table-row,.communication-table-row,.role-matrix-row{border-radius:14px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.026);padding:12px}.production-course{display:grid;grid-template-columns:38px minmax(0,1fr) 54px;gap:12px;align-items:center;min-height:70px}.production-course.active,.module-map-row.current,.student-row.active{border-color:rgba(99,229,70,.26);background:rgba(99,229,70,.065)}.production-course>span,.module-index{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;color:var(--green);background:rgba(99,229,70,.09);border:1px solid rgba(99,229,70,.18);font-weight:950}.production-course p,.module-map-row p,.student-main-info p,.student-progress-mini span,.student-risk span,.student-commercial-mini span,.exam-row p,.certificate-table-row p,.payments-table-row p,.communication-table-row p{margin:5px 0 0;color:var(--muted);font-size:12px}.production-course em{font-style:normal;color:var(--green);font-weight:950}.module-map-row{display:grid;grid-template-columns:52px minmax(0,1fr) 82px;gap:12px;align-items:center}.source-doc-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.source-doc-card{min-height:130px;border-radius:16px;border:1px solid rgba(255,255,255,.08);background:radial-gradient(circle at top right,rgba(99,229,70,.12),transparent 34%),rgba(255,255,255,.028);padding:16px;display:grid;align-content:center}.source-doc-card span{width:max-content;border-radius:999px;padding:6px 9px;background:rgba(99,229,70,.1);border:1px solid rgba(99,229,70,.22);color:var(--green);font-size:10px;font-weight:950;letter-spacing:.12em}.source-doc-card strong{display:block;margin-top:14px;font-size:18px;line-height:1.1}.source-doc-card p{margin:8px 0 0;color:var(--muted);font-size:12px}.production-check{display:grid;grid-template-columns:28px minmax(0,1fr);gap:10px;align-items:center;padding:10px 0;border-top:1px solid rgba(255,255,255,.055)}.production-check span{width:26px;height:26px;border-radius:999px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.12);color:var(--soft);font-weight:950}.production-check.done span{border-color:rgba(99,229,70,.28);background:rgba(99,229,70,.1);color:var(--green)}.production-check p{margin:0;color:var(--muted)}.production-check.done p{color:var(--white)}.student-toolbar{grid-template-columns:minmax(260px,1fr) auto auto}.student-toolbar button{min-height:42px;border-radius:999px;border:1px solid rgba(99,229,70,.22);background:rgba(99,229,70,.07);color:var(--green);font-weight:900;padding:0 14px;cursor:pointer}.student-row{width:100%;min-height:86px;color:var(--white);display:grid;grid-template-columns:46px minmax(0,1.25fr) 96px 128px 138px;gap:12px;align-items:center;text-align:left;cursor:pointer}.student-avatar{width:46px;height:46px;border-radius:999px;display:grid;place-items:center;background:rgba(99,229,70,.1);color:var(--green);border:1px solid rgba(99,229,70,.18);font-weight:950}.student-progress-mini strong,.student-commercial-mini strong{display:block;color:var(--white);font-size:18px}.student-risk{border-radius:12px;padding:9px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.025)}.student-risk.green strong{color:var(--green)}.student-risk.yellow strong{color:var(--warning)}.student-risk.red strong{color:var(--danger)}.student-risk.muted strong{color:var(--muted)}.student-detail-column{position:sticky;top:86px}.student-detail-head{display:grid;grid-template-columns:62px minmax(0,1fr);gap:14px;align-items:center}.student-detail-head>span{width:62px;height:62px;border-radius:20px;display:grid;place-items:center;background:rgba(99,229,70,.1);color:var(--green);border:1px solid rgba(99,229,70,.2);font-size:22px;font-weight:950}.student-detail-head h2{margin:0;font-size:26px;letter-spacing:-.04em;line-height:1}.student-detail-head p:not(.admin-kicker){margin:6px 0 0;color:var(--muted);font-size:13px}.student-detail-section{margin-top:16px;border-top:1px solid rgba(255,255,255,.07);padding-top:16px}.student-detail-section h3{margin:0 0 12px;font-size:17px;letter-spacing:-.02em}.student-detail-grid,.commercial-grid,.follow-up-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.student-note{color:var(--muted);font-size:13px;line-height:1.5}.loyalty-actions,.follow-up-actions{display:grid;grid-template-columns:1fr;gap:8px;margin-top:12px}.loyalty-actions button,.follow-up-actions button{min-height:39px;border-radius:11px;border:1px solid rgba(99,229,70,.22);background:rgba(99,229,70,.07);color:var(--green);font-weight:900;cursor:pointer}.follow-up-status{border-radius:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.026);padding:12px;margin-bottom:10px}.follow-up-status span{display:block;margin-top:4px;color:var(--muted);font-size:12px}
    .exam-row{display:grid;grid-template-columns:112px minmax(0,1fr) 92px 92px 98px 80px;gap:12px;align-items:center}.exam-status,.certificate-status,.payment-status,.channel-pill,.communication-status{width:max-content;border-radius:999px;padding:6px 9px;font-size:10px;text-transform:uppercase;letter-spacing:.12em;font-weight:950;border:1px solid rgba(99,229,70,.28);background:rgba(99,229,70,.1);color:var(--green)}.exam-status.draft,.certificate-status.pending,.payment-status.pending{border-color:rgba(247,201,72,.28);background:rgba(247,201,72,.1);color:var(--warning)}.certificate-status.revoked,.payment-status.risk{border-color:rgba(255,87,87,.28);background:rgba(255,87,87,.1);color:var(--danger)}.certificate-preview-admin{min-height:340px;width:100%;border-radius:18px;border:1px solid rgba(214,178,94,.32);background:linear-gradient(135deg,#fff6df,#dcc69a);color:#17130b;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;text-align:center;padding:28px 40px 38px}.certificate-preview-brand{min-height:38px;margin:0 0 20px;transform:scale(.92)}.certificate-preview-title{font-family:Georgia,serif;font-size:clamp(30px,3.2vw,38px);line-height:1;letter-spacing:.105em;font-weight:700;color:#20180d}.certificate-preview-subtitle{margin-top:10px;font-size:10px;letter-spacing:.22em;text-transform:uppercase;font-weight:850;color:rgba(34,27,16,.68)}.certificate-preview-awarded{margin-top:20px;font-size:9px;text-transform:uppercase;letter-spacing:.16em;font-weight:850;color:rgba(34,27,16,.55)}.certificate-preview-admin h3{margin:6px 0 0;font-family:Georgia,serif;font-style:italic;font-size:clamp(28px,2.6vw,34px);line-height:1.05;color:#21190d}.certificate-preview-divider{width:42%;height:1px;background:rgba(75,55,20,.24);margin:10px 0 8px}.certificate-preview-footer{position:absolute;left:40px;right:40px;bottom:30px;display:grid;grid-template-columns:1fr auto;gap:18px;align-items:end;font-size:10px}.certificate-table-row,.payments-table-row,.communication-table-row{display:grid;grid-template-columns:1.1fr 1.35fr 130px 110px 170px;gap:12px;align-items:center}.certificate-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.certificate-actions button{min-height:34px;border-radius:9px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--white);font-size:12px;font-weight:850;cursor:pointer}.certificate-actions button:first-child{background:var(--green);color:#061008;border-color:transparent}.message-field{display:grid;gap:7px;margin-top:12px}.message-field span{color:var(--muted);font-size:12px;font-weight:850}.message-field input,.message-field textarea{width:100%;border-radius:14px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--white);padding:12px 14px;outline:0}.message-field textarea{min-height:170px;resize:vertical;line-height:1.55}.channel-pill.internal,.communication-status.draft{border-color:rgba(255,255,255,.14);background:rgba(255,255,255,.055);color:var(--muted)}.opportunity-item{width:100%;min-height:54px;border-radius:14px;border:1px solid rgba(255,255,255,.075);background:rgba(255,255,255,.026);color:var(--white);display:flex;justify-content:space-between;gap:12px;align-items:center;padding:12px 14px;margin-top:9px;text-align:left;cursor:pointer}.opportunity-item strong{color:var(--green)}.role-matrix-row{display:grid;grid-template-columns:minmax(0,1.6fr) repeat(4,90px);gap:10px;align-items:center}.role-check{width:32px;height:32px;border-radius:999px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.12);color:var(--soft);font-weight:950}.role-check.active{background:rgba(99,229,70,.1);border-color:rgba(99,229,70,.26);color:var(--green)}.studio-layout{display:grid;grid-template-columns:280px minmax(0,1fr) 320px;gap:14px;align-items:start}.studio-left-panel,.studio-right-panel{display:grid;gap:14px}.studio-panel-card button{width:100%;min-height:48px;margin-top:8px;border-radius:14px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.026);color:var(--white);text-align:left;padding:12px;cursor:pointer}.studio-panel-card button.active{border-color:rgba(99,229,70,.28);background:rgba(99,229,70,.08)}.studio-panel-card span{display:block;color:var(--muted);font-size:12px;margin-top:4px}.studio-canvas{border-radius:18px;border:1px solid rgba(255,255,255,.07);background:#070a08;padding:18px;min-height:420px;overflow:hidden}.studio-page-preview-hero{min-height:260px;border-radius:18px;border:1px solid rgba(99,229,70,.16);background:radial-gradient(circle at 75% 24%,rgba(99,229,70,.18),transparent 34%),linear-gradient(135deg,rgba(255,255,255,.055),rgba(255,255,255,.018));display:grid;grid-template-columns:1.1fr .9fr;gap:18px;align-items:center;padding:26px}.studio-page-preview-hero p{margin:0;color:var(--green);text-transform:uppercase;letter-spacing:.18em;font-size:11px;font-weight:950}.studio-page-preview-hero h2{margin:10px 0 8px;font-size:44px;line-height:.95;letter-spacing:-.06em}.studio-page-preview-hero span{color:var(--muted)}.studio-page-preview-hero button{min-height:38px;margin-top:16px;margin-right:8px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.04);color:var(--white);padding:0 14px;font-weight:850}.studio-preview-athlete{height:210px;opacity:.68;background:radial-gradient(circle at 45% 45%,rgba(244,246,242,.2),transparent 20%),linear-gradient(120deg,transparent 20%,rgba(99,229,70,.2),transparent 62%);clip-path:polygon(5% 70%,25% 46%,45% 56%,60% 20%,86% 30%,100% 12%,88% 44%,67% 40%,50% 74%,27% 66%,8% 90%)}.studio-canvas-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:14px;color:var(--muted)}.studio-canvas-footer button{min-height:40px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--white);padding:0 14px;font-weight:850;cursor:pointer}.studio-canvas-footer button:last-child{background:var(--green);color:#061008;border-color:transparent}.settings-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.modal-backdrop{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.72);backdrop-filter:blur(10px);display:grid;place-items:center;padding:20px}.admin-modal{width:min(820px,calc(100vw - 30px));max-height:calc(100vh - 40px);overflow:auto;border:1px solid rgba(99,229,70,.24);border-radius:24px;background:linear-gradient(145deg,rgba(12,16,14,.98),rgba(5,8,7,.98));box-shadow:0 35px 120px rgba(0,0,0,.62);padding:22px}.modal-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;border-bottom:1px solid var(--line);padding-bottom:16px;margin-bottom:16px}.modal-head h2{margin:0;font-size:32px;line-height:.95;letter-spacing:-.055em}.modal-head button{width:40px;height:40px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--white);font-size:24px;cursor:pointer}.admin-form{display:grid;gap:14px}.admin-form label{display:grid;gap:7px}.admin-form label span{color:var(--muted);font-size:12px;font-weight:850}.admin-form input,.admin-form textarea,.admin-form select{width:100%;border-radius:14px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--white);padding:12px 14px;outline:0}.admin-form textarea{min-height:120px;resize:vertical;line-height:1.55}.form-grid{display:grid;gap:12px}.form-grid.two{grid-template-columns:1fr 1fr}.form-grid.four{grid-template-columns:repeat(4,minmax(0,1fr))}.form-warning{border-radius:14px;border:1px solid rgba(247,201,72,.22);background:rgba(247,201,72,.07);color:var(--muted);padding:12px 14px;line-height:1.5}.form-warning strong{color:var(--warning)}.modal-actions{display:flex;justify-content:flex-end;gap:10px;border-top:1px solid var(--line);padding-top:14px}.modal-actions button{min-height:42px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--white);padding:0 16px;font-weight:900;cursor:pointer}.modal-actions button[type="submit"],.modal-actions button:last-child{background:var(--green);color:#061008;border-color:transparent}.source-drop{position:relative;border:1px dashed rgba(99,229,70,.35);border-radius:18px;background:rgba(99,229,70,.055);padding:28px;text-align:center}.source-drop span{display:inline-flex;border-radius:999px;border:1px solid rgba(99,229,70,.2);background:rgba(99,229,70,.08);color:var(--green);padding:7px 10px;font-size:11px;font-weight:950;letter-spacing:.12em}.source-drop strong{display:block;margin-top:14px;font-size:22px;letter-spacing:-.03em}.source-drop p{color:var(--muted);line-height:1.55}.source-drop input{margin-top:10px}
    @media(max-width:1460px){.kpi-grid,.course-stats-grid,.student-stats-grid,.content-stats-grid,.certificate-stats-grid,.payment-stats-grid,.analytics-stats-grid,.security-stats-grid,.studio-stats-grid,.settings-stats-grid,.exam-stats-grid,.communication-stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.admin-main-grid,.courses-layout,.content-layout,.students-layout,.exams-layout,.certificates-layout,.payments-layout,.communications-layout,.analytics-layout,.security-layout,.settings-layout,.studio-layout{grid-template-columns:1fr}.courses-side-column,.content-side-column,.certificates-side-column,.payments-side-column,.communications-side-column,.settings-side-column{grid-template-columns:repeat(2,minmax(0,1fr))}.studio-card{grid-column:auto}.certificate-table-row,.payments-table-row,.communication-table-row,.exam-row,.role-matrix-row{grid-template-columns:1fr}.student-detail-column{position:static}.student-row{grid-template-columns:46px minmax(0,1fr) 90px 120px}.student-commercial-mini{display:none}.settings-grid{grid-template-columns:1fr}}
    @media(max-width:1080px){.admin-page{grid-template-columns:1fr}.admin-sidebar{position:relative;height:auto}.admin-topbar{align-items:flex-start;flex-direction:column}.topbar-actions{width:100%;flex-wrap:wrap}.admin-search-wrap{width:100%;max-width:none}.admin-hero,.courses-hero,.content-hero,.students-hero,.exams-hero,.certificates-hero,.payments-hero,.communications-hero,.analytics-hero,.security-hero,.studio-hero-main,.settings-hero{align-items:stretch;flex-direction:column}.courses-hero-panel,.content-hero-panel,.students-hero-panel,.exams-hero-panel,.certificates-hero-panel,.payments-hero-panel,.communications-hero-panel,.analytics-hero-panel,.security-hero-panel,.studio-hero-panel,.settings-hero-panel{width:100%}.kpi-grid,.course-stats-grid,.student-stats-grid,.content-stats-grid,.certificate-stats-grid,.payment-stats-grid,.analytics-stats-grid,.security-stats-grid,.studio-stats-grid,.settings-stats-grid,.exam-stats-grid,.communication-stats-grid,.chart-summary,.quick-actions-grid,.course-info-grid,.course-build-row,.admin-course-actions,.source-doc-grid,.student-detail-grid,.commercial-grid,.follow-up-grid,.form-grid.two,.form-grid.four{grid-template-columns:1fr}.course-toolbar,.student-toolbar{grid-template-columns:1fr}.admin-course-card.list{grid-template-columns:1fr}.student-row,.module-map-row,.production-course{grid-template-columns:1fr}.platform-body{grid-template-columns:1fr}.studio-page-preview-hero{grid-template-columns:1fr}.studio-canvas-footer{flex-direction:column;align-items:flex-start}.courses-side-column,.content-side-column,.certificates-side-column,.payments-side-column,.communications-side-column,.settings-side-column{grid-template-columns:1fr}}


    /* GHC ADMIN VISUAL FIX — corrige botones blancos/default y paneles demasiado planos */
    .courses-hero-panel,.content-hero-panel,.students-hero-panel,.exams-hero-panel,.certificates-hero-panel,.payments-hero-panel,.communications-hero-panel,.analytics-hero-panel,.security-hero-panel,.studio-hero-panel,.settings-hero-panel{display:flex!important;flex-direction:column!important;align-items:flex-start!important;gap:10px!important;background:linear-gradient(145deg,rgba(99,229,70,.085),rgba(255,255,255,.025))!important;border:1px solid rgba(99,229,70,.22)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 22px 60px rgba(0,0,0,.24)!important}
    .courses-hero-panel span,.content-hero-panel span,.students-hero-panel span,.exams-hero-panel span,.certificates-hero-panel span,.payments-hero-panel span,.communications-hero-panel span,.analytics-hero-panel span,.security-hero-panel span,.studio-hero-panel span,.settings-hero-panel span{display:block!important;width:100%!important;margin:0!important;color:var(--green)!important;text-transform:uppercase!important;letter-spacing:.16em!important;font-size:11px!important;line-height:1.25!important;font-weight:950!important}
    .courses-hero-panel strong,.content-hero-panel strong,.students-hero-panel strong,.exams-hero-panel strong,.certificates-hero-panel strong,.payments-hero-panel strong,.communications-hero-panel strong,.analytics-hero-panel strong,.security-hero-panel strong,.studio-hero-panel strong,.settings-hero-panel strong{display:block!important;width:100%!important;margin:0!important;color:var(--white)!important;font-size:clamp(19px,1.35vw,23px)!important;line-height:1.14!important;letter-spacing:-.035em!important;white-space:normal!important}
    .courses-hero-panel p,.content-hero-panel p,.students-hero-panel p,.exams-hero-panel p,.certificates-hero-panel p,.payments-hero-panel p,.communications-hero-panel p,.analytics-hero-panel p,.security-hero-panel p,.studio-hero-panel p,.settings-hero-panel p{display:block!important;width:100%!important;margin:0!important;color:rgba(244,246,242,.72)!important;line-height:1.55!important;font-size:13px!important}
    .courses-hero-panel button,.content-hero-panel button,.students-hero-panel button,.exams-hero-panel button,.certificates-hero-panel button,.payments-hero-panel button,.communications-hero-panel button,.analytics-hero-panel button,.security-hero-panel button,.studio-hero-panel button,.settings-hero-panel button{appearance:none!important;-webkit-appearance:none!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;width:auto!important;min-height:42px!important;margin:2px 0 0!important;padding:0 18px!important;border:0!important;border-radius:999px!important;background:linear-gradient(135deg,#7cff55,var(--green))!important;color:#061008!important;box-shadow:0 14px 34px rgba(99,229,70,.18)!important;font-size:13px!important;font-weight:950!important;cursor:pointer!important;text-decoration:none!important;white-space:nowrap!important}
    .course-side-card button,.content-side-card button,.exam-side-card button,.certificate-side-card button,.payment-side-card button,.communication-side-card button,.analytics-side-card button,.security-side-card button,.settings-side-card button,.studio-panel-card button,.card-head button,.section-title-row button,.module-map-row button,.exam-row button,.analytics-course-row button,.payments-table-row button,.communication-table-row button,.certificate-actions button,.modal-actions button,.loyalty-actions button,.follow-up-actions button,.message-actions button,.analytics-report-button{appearance:none!important;-webkit-appearance:none!important;min-height:38px!important;border-radius:11px!important;border:1px solid rgba(255,255,255,.105)!important;background:linear-gradient(145deg,rgba(255,255,255,.06),rgba(255,255,255,.026))!important;color:var(--white)!important;box-shadow:none!important;font-weight:900!important;cursor:pointer!important;text-decoration:none!important;white-space:normal!important}
    .course-side-card>button,.content-side-card>button,.exam-side-card>button,.certificate-side-card>button,.payment-side-card>button,.communication-side-card>button,.security-side-card>button,.settings-side-card>button,.studio-panel-card>button{display:flex!important;width:100%!important;align-items:center!important;justify-content:center!important;margin-top:10px!important;padding:0 14px!important;text-align:center!important}
    .course-side-card>button:first-of-type,.content-side-card>button:first-of-type,.exam-side-card>button:first-of-type,.certificate-side-card>button:first-of-type,.payment-side-card>button:first-of-type,.communication-side-card>button:first-of-type,.security-side-card>button:first-of-type,.settings-side-card>button:first-of-type,.studio-panel-card>button:first-of-type,.certificate-actions button:first-child,.admin-course-actions button:first-child,.message-actions button:last-child,.modal-actions button[type="submit"],.analytics-report-button.primary{border-color:transparent!important;background:linear-gradient(135deg,#7cff55,var(--green))!important;color:#061008!important;box-shadow:0 14px 30px rgba(99,229,70,.16)!important}
    .course-side-card button:hover,.content-side-card button:hover,.exam-side-card button:hover,.certificate-side-card button:hover,.payment-side-card button:hover,.communication-side-card button:hover,.analytics-side-card button:hover,.security-side-card button:hover,.settings-side-card button:hover,.studio-panel-card button:hover,.card-head button:hover,.section-title-row button:hover,.module-map-row button:hover,.exam-row button:hover,.analytics-course-row button:hover,.payments-table-row button:hover,.communication-table-row button:hover,.certificate-actions button:hover{border-color:rgba(99,229,70,.28)!important;background:rgba(99,229,70,.08)!important;color:var(--green)!important}
    .exam-list-card{overflow:hidden!important}.exam-list{gap:12px!important}.exam-row{min-height:82px!important;border-radius:16px!important;border:1px solid rgba(255,255,255,.08)!important;background:linear-gradient(135deg,rgba(255,255,255,.038),rgba(255,255,255,.018))!important}.exam-row:hover{border-color:rgba(99,229,70,.20)!important;background:linear-gradient(135deg,rgba(99,229,70,.055),rgba(255,255,255,.018))!important}.exam-row div span{display:block!important;color:var(--soft)!important;font-size:10px!important;text-transform:uppercase!important;letter-spacing:.12em!important;font-weight:950!important}.exam-row div strong{display:block!important;margin-top:4px!important;color:var(--white)!important;line-height:1.2!important}
    .exam-status,.certificate-status,.payment-status,.communication-status,.channel-pill,.analytics-status{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-height:28px!important;border-radius:999px!important;padding:6px 10px!important;background:rgba(99,229,70,.10)!important;color:var(--green)!important;border:1px solid rgba(99,229,70,.24)!important}.exam-status.draft,.certificate-status.pending,.payment-status.pending{background:rgba(247,201,72,.095)!important;color:var(--warning)!important;border-color:rgba(247,201,72,.24)!important}
    .certificate-side-card,.security-side-card,.content-side-card,.communication-side-card,.payment-side-card,.exam-side-card{overflow:hidden!important}.certificate-side-card .status-row,.security-side-card .status-row,.payment-side-card .status-row,.settings-side-card .status-row{align-items:center!important}.modal-actions button:first-child{background:rgba(255,255,255,.045)!important;color:var(--white)!important;border:1px solid rgba(255,255,255,.105)!important;box-shadow:none!important}.source-drop input{background:rgba(255,255,255,.045)!important;color:var(--white)!important;border:1px solid rgba(255,255,255,.105)!important}


    
      
      @media(max-width:1080px){
        .studio-page-list button{
          grid-template-columns:1fr!important;
          row-gap:8px!important;
          align-items:flex-start!important;
        }

        .studio-page-list button .studio-page-status{
          width:auto!important;
          justify-content:flex-start!important;
          text-align:left!important;
        }
      }


      @media(max-width:1080px){
        .studio-page-list button{
          grid-template-columns:1fr;
          row-gap:8px;
          align-items:flex-start;
        }
        .studio-page-list button .studio-page-status{
          width:auto;
          justify-content:flex-start;
          text-align:left;
        }
      }


      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      @media(max-width:1080px){}


      .premium-studio-layout{grid-template-columns:340px minmax(0,1fr) 320px}
      .studio-panel-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:16px}
      .studio-panel-heading h2{margin:0;font-size:22px;line-height:1.05;letter-spacing:-.04em}
      .studio-panel-heading p{margin:7px 0 0;color:var(--muted);line-height:1.48;font-size:13px}
      .studio-page-list{display:grid;gap:12px}
      .studio-page-card{appearance:none;-webkit-appearance:none;width:100%;min-height:138px;display:grid;gap:11px;padding:16px;border-radius:20px;border:1px solid rgba(255,255,255,.095);background:linear-gradient(145deg,rgba(255,255,255,.058),rgba(255,255,255,.022));color:var(--white);text-align:left;box-shadow:inset 0 1px 0 rgba(255,255,255,.035);cursor:pointer;overflow:hidden;position:relative}
      .studio-page-card:before{content:"";position:absolute;left:0;top:18px;bottom:18px;width:3px;border-radius:999px;background:rgba(255,255,255,.12)}
      .studio-page-card:hover{transform:translateY(-1px);border-color:rgba(99,229,70,.24);background:linear-gradient(145deg,rgba(99,229,70,.07),rgba(255,255,255,.024))}
      .studio-page-card:hover:before{background:var(--green)}
      .studio-page-card.active{border-color:rgba(99,229,70,.38);background:linear-gradient(145deg,rgba(99,229,70,.14),rgba(255,255,255,.028));box-shadow:0 18px 44px rgba(0,0,0,.24),inset 0 1px 0 rgba(255,255,255,.07)}
      .studio-page-card.active:before{background:var(--green);box-shadow:0 0 18px rgba(99,229,70,.45)}
      .studio-page-topline{display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0}
      .studio-page-area{display:inline-flex;align-items:center;width:max-content;max-width:100%;color:var(--green);font-size:10px;line-height:1;font-weight:950;text-transform:uppercase;letter-spacing:.14em;white-space:normal}
      .studio-page-readiness{display:inline-flex;align-items:center;justify-content:center;min-height:26px;padding:6px 9px;border-radius:999px;border:1px solid rgba(99,229,70,.18);background:rgba(99,229,70,.08);color:var(--green);font-size:10px;line-height:1;font-weight:950;white-space:nowrap}
      .studio-page-card.active .studio-page-readiness{background:var(--green);border-color:transparent;color:#061008}
      .studio-page-title{display:block;color:var(--white);font-size:22px;line-height:1.02;font-weight:950;letter-spacing:-.05em;text-shadow:none}
      .studio-page-description{display:block;color:rgba(244,246,242,.66);font-size:12.5px;line-height:1.48;font-weight:650}
      .studio-page-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:2px}
      .studio-page-status{display:inline-flex;align-items:center;justify-content:center;min-height:32px;padding:7px 11px;border-radius:999px;border:1px solid rgba(255,255,255,.105);background:rgba(255,255,255,.045);color:rgba(244,246,242,.74);font-size:11px;line-height:1.12;font-weight:900;text-align:center;white-space:normal}
      .studio-page-arrow{width:30px;height:30px;border-radius:999px;display:grid;place-items:center;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);color:var(--green);font-size:20px;line-height:1}
      .studio-page-card.active .studio-page-title{color:var(--white)}
      .studio-page-card.active .studio-page-description{color:rgba(244,246,242,.72)}
      .studio-page-card.active .studio-page-status{border-color:rgba(99,229,70,.28);background:rgba(99,229,70,.10);color:var(--green)}
      .studio-block-list,.studio-property-list,.studio-history-list{display:grid;gap:9px}
      .studio-block-list button{border-radius:14px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.026);color:var(--white);min-height:48px;text-align:left;padding:12px;cursor:pointer;display:grid;grid-template-columns:30px minmax(0,1fr);gap:10px;align-items:center}
      .studio-block-list button:hover{border-color:rgba(99,229,70,.24);background:rgba(99,229,70,.07)}
      .studio-block-list span{color:var(--green)}
      @media(max-width:1080px){.premium-studio-layout{grid-template-columns:1fr}.studio-page-topline,.studio-page-footer{align-items:flex-start;flex-direction:column}.studio-page-readiness,.studio-page-status{white-space:normal;justify-content:flex-start;text-align:left}}


            .studio-v2-layout{display:grid;grid-template-columns:360px minmax(0,1fr) 320px;gap:16px;align-items:start}
      .studio-v2-sidebar,.studio-v2-inspector{display:grid;gap:14px}
      .studio-v2-card,.studio-v2-workspace{border:1px solid var(--line);border-radius:20px;background:var(--panel);box-shadow:0 22px 70px rgba(0,0,0,.18);padding:18px}
      .studio-v2-card-head{margin-bottom:16px}
      .studio-v2-card-head h2{margin:0;font-size:22px;line-height:1.05;letter-spacing:-.04em}
      .studio-v2-card-head p{margin:7px 0 0;color:var(--muted);font-size:13px;line-height:1.45}
      .studio-v2-page-list{display:grid;gap:10px}
      .studio-v2-page-item{appearance:none;-webkit-appearance:none;width:100%;display:grid;grid-template-columns:34px minmax(0,1fr);grid-template-areas:"index copy" "status status";gap:10px 12px;align-items:flex-start;min-height:126px;padding:14px;border-radius:18px;border:1px solid rgba(255,255,255,.095);background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.022));color:var(--white);text-align:left;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.035)}
      .studio-v2-page-item:hover{border-color:rgba(99,229,70,.25);background:linear-gradient(145deg,rgba(99,229,70,.065),rgba(255,255,255,.024));transform:translateY(-1px)}
      .studio-v2-page-item.active{border-color:rgba(99,229,70,.38);background:linear-gradient(145deg,rgba(99,229,70,.115),rgba(255,255,255,.026));box-shadow:0 16px 42px rgba(0,0,0,.23),inset 3px 0 0 var(--green)}
      .studio-v2-page-index{grid-area:index;width:34px;height:34px;border-radius:12px;display:grid;place-items:center;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08);color:var(--muted);font-size:11px;font-weight:950}
      .studio-v2-page-item.active .studio-v2-page-index{background:var(--green);border-color:transparent;color:#061008}
      .studio-v2-page-copy{grid-area:copy;display:grid;gap:6px;min-width:0}
      .studio-v2-page-copy strong{display:block;color:var(--white);font-size:19px;line-height:1.06;font-weight:950;letter-spacing:-.045em;white-space:normal;overflow-wrap:break-word}
      .studio-v2-page-copy small{color:var(--green);font-size:10px;line-height:1;text-transform:uppercase;letter-spacing:.14em;font-weight:950}
      .studio-v2-page-copy em{color:rgba(244,246,242,.64);font-size:12px;line-height:1.42;font-style:normal;font-weight:650}
      .studio-v2-page-status{grid-area:status;display:inline-flex;width:max-content;max-width:100%;align-items:center;justify-content:center;min-height:30px;padding:7px 11px;border-radius:999px;border:1px solid rgba(99,229,70,.20);background:rgba(99,229,70,.075);color:var(--green);font-size:11px;line-height:1.12;font-weight:900;text-align:left;white-space:normal}
      .studio-v2-page-status.pending,.studio-v2-page-status.draft{border-color:rgba(247,201,72,.22);background:rgba(247,201,72,.08);color:var(--warning)}
      .studio-v2-toolbar{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:14px}
      .studio-v2-toolbar span{display:block;color:var(--muted);font-size:12px;margin-bottom:4px}
      .studio-v2-toolbar strong{font-size:18px;letter-spacing:-.02em}
      .studio-v2-device-toggle{display:flex;gap:6px;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.035);padding:4px}
      .studio-v2-device-toggle button{border:0;background:transparent;color:var(--muted);border-radius:999px;padding:7px 12px;cursor:pointer;font-weight:850}
      .studio-v2-device-toggle button.active{background:rgba(99,229,70,.14);color:var(--green)}
      .studio-v2-canvas{border-radius:20px;border:1px solid rgba(255,255,255,.07);background:#070a08;padding:18px;min-height:520px;overflow:hidden}
      .studio-v2-preview-hero{min-height:270px;border-radius:20px;border:1px solid rgba(99,229,70,.16);background:radial-gradient(circle at 75% 24%,rgba(99,229,70,.18),transparent 34%),linear-gradient(135deg,rgba(255,255,255,.055),rgba(255,255,255,.018));display:grid;grid-template-columns:1.1fr .9fr;gap:18px;align-items:center;padding:28px}
      .studio-v2-preview-hero p{margin:0;color:var(--green);text-transform:uppercase;letter-spacing:.18em;font-size:11px;font-weight:950}
      .studio-v2-preview-hero h2{margin:10px 0 8px;font-size:44px;line-height:.95;letter-spacing:-.06em}
      .studio-v2-preview-hero span{color:var(--muted)}
      .studio-v2-preview-hero button{min-height:38px;margin-top:16px;margin-right:8px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.04);color:var(--white);padding:0 14px;font-weight:850}
      .studio-v2-preview-hero button:first-child{background:var(--green);color:#061008;border-color:transparent}
      .studio-v2-preview-figure{height:210px;opacity:.68;background:radial-gradient(circle at 45% 45%,rgba(244,246,242,.2),transparent 20%),linear-gradient(120deg,transparent 20%,rgba(99,229,70,.2),transparent 62%);clip-path:polygon(5% 70%,25% 46%,45% 56%,60% 20%,86% 30%,100% 12%,88% 44%,67% 40%,50% 74%,27% 66%,8% 90%)}
      .studio-v2-preview-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:14px}
      .studio-v2-preview-grid article{border-radius:14px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.026);padding:14px}
      .studio-v2-preview-grid p{color:var(--muted);font-size:13px;line-height:1.4}
      .studio-v2-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:14px;color:var(--muted)}
      .studio-v2-footer button{min-height:40px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--white);padding:0 14px;font-weight:850;cursor:pointer}
      .studio-v2-footer button:last-child{background:var(--green);color:#061008;border-color:transparent}
      .studio-v2-property-list{display:grid;gap:9px}
      .studio-v2-block-chips{display:flex;gap:8px;flex-wrap:wrap}
      .studio-v2-block-chips span{border-radius:999px;border:1px solid rgba(99,229,70,.18);background:rgba(99,229,70,.065);color:var(--green);padding:7px 10px;font-size:12px;font-weight:900}
      .studio-v2-actions{display:grid;gap:9px}
      .studio-v2-actions button{width:100%;min-height:40px;border-radius:11px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--white);font-weight:850;cursor:pointer}
      .studio-v2-actions button:first-child{background:var(--green);color:#061008;border-color:transparent}
      @media(max-width:1460px){.studio-v2-layout{grid-template-columns:1fr}.studio-v2-sidebar,.studio-v2-inspector{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:1080px){.studio-v2-sidebar,.studio-v2-inspector,.studio-v2-preview-grid,.studio-v2-preview-hero{grid-template-columns:1fr}.studio-v2-toolbar,.studio-v2-footer{flex-direction:column;align-items:flex-start}.studio-v2-page-status{width:auto}}


      .admin-build-strip{margin-bottom:14px;border:1px solid rgba(99,229,70,.24);border-radius:14px;background:linear-gradient(90deg,rgba(99,229,70,.09),rgba(255,255,255,.026));padding:12px 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;color:var(--muted);font-size:12px}
      .admin-build-strip strong{color:var(--green);text-transform:uppercase;letter-spacing:.12em;font-size:10px}
      .admin-build-strip span{color:var(--white);font-weight:950}
      .admin-build-strip em{font-style:normal;color:rgba(244,246,242,.55)}


      .lesson-admin-card{border:1px solid var(--line);border-radius:18px;background:var(--panel);box-shadow:0 22px 70px rgba(0,0,0,.18);padding:18px}
      .lesson-admin-list{display:grid;gap:10px}
      .lesson-admin-row{min-height:66px;border-radius:14px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.026);display:grid;grid-template-columns:46px minmax(0,1fr) minmax(160px,auto);gap:12px;align-items:center;padding:12px}
      .lesson-admin-index{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;background:rgba(99,229,70,.09);color:var(--green);border:1px solid rgba(99,229,70,.18);font-weight:950}
      .lesson-admin-row strong{display:block;color:var(--white)}
      .lesson-admin-row p{margin:5px 0 0;color:var(--muted);font-size:12px}
      .lesson-admin-row button,.lesson-empty-card button{min-height:36px;border-radius:10px;border:1px solid rgba(99,229,70,.24);background:rgba(99,229,70,.07);color:var(--green);cursor:pointer;font-weight:900}
      .lesson-empty-card{border-radius:16px;border:1px dashed rgba(99,229,70,.22);background:rgba(99,229,70,.045);padding:16px;display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:12px;align-items:center}
      .lesson-empty-card>span{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:rgba(99,229,70,.09);border:1px solid rgba(99,229,70,.18);color:var(--green);font-weight:950}
      .lesson-empty-card p{margin:5px 0 0;color:var(--muted);font-size:13px;line-height:1.45}
      .module-row-actions{display:grid;gap:7px}
      .form-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}
      @media(max-width:1080px){.lesson-admin-row,.lesson-empty-card{grid-template-columns:1fr}.form-grid.three{grid-template-columns:1fr}}


      .content-selector-card{border:1px solid var(--line);border-radius:18px;background:var(--panel);box-shadow:0 22px 70px rgba(0,0,0,.18);padding:18px}
      .content-selector-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:14px}
      .content-selector-head h2{margin:0;font-size:22px;letter-spacing:-.04em;line-height:1.05}
      .content-selector-head p{margin:7px 0 0;color:var(--muted);font-size:13px;line-height:1.45}
      .content-selector-head button{min-height:38px;border-radius:999px;border:1px solid rgba(99,229,70,.22);background:rgba(99,229,70,.07);color:var(--green);font-weight:900;padding:0 14px;cursor:pointer}
      .content-selector-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto;gap:12px;align-items:end}
      .content-selector-grid label{display:grid;gap:7px}
      .content-selector-grid label span{color:var(--muted);font-size:12px;font-weight:850}
      .content-selector-grid select{width:100%;min-height:42px;border-radius:12px;border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--white);padding:0 12px;outline:0}
      .content-selector-grid option{background:#080b0a;color:var(--white)}
      .content-selector-actions{display:flex;gap:8px}
      .content-selector-actions button{min-height:42px;border-radius:999px;border:1px solid rgba(99,229,70,.22);background:rgba(99,229,70,.07);color:var(--green);font-weight:900;padding:0 14px;cursor:pointer;white-space:nowrap}
      .content-selector-actions button:last-child{background:var(--green);border-color:transparent;color:#061008}
      .selected-module-banner{border-radius:14px;border:1px solid rgba(99,229,70,.18);background:rgba(99,229,70,.055);padding:12px 14px;margin-bottom:12px}
      .selected-module-banner span{display:block;color:var(--green);font-size:10px;text-transform:uppercase;letter-spacing:.14em;font-weight:950}
      .selected-module-banner strong{display:block;margin-top:5px;color:var(--white);font-size:16px;line-height:1.15}
      @media(max-width:1080px){.content-selector-head{flex-direction:column}.content-selector-grid{grid-template-columns:1fr}.content-selector-actions{flex-direction:column}.content-selector-actions button{width:100%}}


      .lesson-upload-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
      .lesson-upload-field{border:1px solid rgba(99,229,70,.18);border-radius:16px;background:rgba(99,229,70,.045);padding:14px;display:grid;gap:8px}
      .lesson-upload-field span{color:var(--green)!important;font-size:11px!important;text-transform:uppercase;letter-spacing:.13em;font-weight:950}
      .lesson-upload-field input[type="file"]{width:100%;border-radius:12px;border:1px dashed rgba(99,229,70,.28);background:rgba(255,255,255,.035);color:var(--muted);padding:10px;font-size:12px}
      .lesson-upload-field small{display:block;color:rgba(244,246,242,.62);font-size:12px;line-height:1.35;word-break:break-word}
      @media(max-width:1080px){.lesson-upload-grid{grid-template-columns:1fr}}


      .lesson-row-actions{display:flex;gap:7px;justify-content:flex-end;flex-wrap:wrap}
      .lesson-row-actions button{min-height:34px;border-radius:10px;border:1px solid rgba(99,229,70,.24);background:rgba(99,229,70,.07);color:var(--green);cursor:pointer;font-weight:900;padding:0 10px;font-size:12px}
      .lesson-row-actions button:last-child{border-color:rgba(255,255,255,.10);background:rgba(255,255,255,.035);color:var(--white)}
      .lesson-existing-assets{border:1px solid rgba(99,229,70,.18);border-radius:16px;background:rgba(99,229,70,.045);padding:14px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      .lesson-existing-assets strong{width:100%;color:var(--green);font-size:11px;text-transform:uppercase;letter-spacing:.13em}
      .lesson-existing-assets button{min-height:36px;border-radius:999px;border:1px solid rgba(99,229,70,.24);background:rgba(99,229,70,.08);color:var(--green);font-weight:900;padding:0 12px;cursor:pointer}
      @media(max-width:1080px){.lesson-row-actions{justify-content:flex-start}.lesson-existing-assets{align-items:flex-start}}


      .lesson-upload-field.active{border-color:rgba(99,229,70,.42);background:rgba(99,229,70,.085);box-shadow:inset 0 0 0 1px rgba(99,229,70,.08)}
      .lesson-upload-field.active small{color:var(--white);font-weight:800}
      .lesson-submit-button{box-shadow:0 0 0 1px rgba(99,229,70,.22),0 18px 50px rgba(99,229,70,.16)!important}


    /* =========================================================
       GHC EXAM HUB · integración real en el panel principal
       ========================================================= */
    .exam-hub-page{display:grid;gap:16px}
    .exam-hub-hero{min-height:210px;border:1px solid var(--line);border-radius:24px;background:radial-gradient(circle at 83% 18%,rgba(99,229,70,.15),transparent 31%),linear-gradient(110deg,rgba(9,13,11,.99),rgba(7,10,9,.88));display:grid;grid-template-columns:minmax(0,1.25fr) minmax(340px,.75fr);gap:28px;align-items:center;padding:30px;box-shadow:0 30px 90px rgba(0,0,0,.24);overflow:hidden}
    .exam-hub-hero h1{margin:0;font-size:clamp(40px,4.4vw,62px);line-height:.92;letter-spacing:-.065em;font-weight:950}
    .exam-hub-hero>div>p:not(.admin-kicker){margin:14px 0 0;color:var(--muted);line-height:1.65;max-width:760px}
    .exam-hub-hero-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}
    .exam-hub-primary,.exam-hub-secondary{min-height:44px;border-radius:999px;padding:0 18px;font-weight:950;cursor:pointer}
    .exam-hub-primary{border:0;background:linear-gradient(135deg,#7cff55,var(--green));color:#061008;box-shadow:0 16px 34px rgba(99,229,70,.18)}
    .exam-hub-secondary{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:var(--white)}
    .exam-hub-principle{border:1px solid rgba(99,229,70,.22);border-radius:20px;background:linear-gradient(145deg,rgba(99,229,70,.095),rgba(255,255,255,.025));padding:20px}
    .exam-hub-principle>span{color:var(--green);text-transform:uppercase;letter-spacing:.16em;font-size:10px;font-weight:950}
    .exam-hub-principle>strong{display:block;margin-top:9px;font-size:23px;line-height:1.12;letter-spacing:-.035em}
    .exam-hub-principle>p{margin:10px 0 0;color:var(--muted);font-size:13px;line-height:1.55}
    .exam-hub-flow{display:flex;flex-wrap:wrap;align-items:center;gap:7px;margin-top:16px}
    .exam-hub-flow span{border-radius:999px;border:1px solid rgba(99,229,70,.18);background:rgba(99,229,70,.065);color:var(--green);padding:6px 9px;font-size:10px;font-weight:900}
    .exam-hub-flow i{color:rgba(244,246,242,.34);font-style:normal}
    .exam-hub-stats{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}
    .exam-hub-layout{display:grid;grid-template-columns:minmax(0,1fr) 350px;gap:14px;align-items:start}
    .exam-hub-list-card,.exam-hub-side-card{border:1px solid var(--line);border-radius:20px;background:var(--panel);box-shadow:0 22px 70px rgba(0,0,0,.18)}
    .exam-hub-list-card{padding:20px}
    .exam-hub-section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding-bottom:18px;border-bottom:1px solid rgba(255,255,255,.07)}
    .exam-hub-section-head h2{margin:0;font-size:28px;line-height:1;letter-spacing:-.045em}
    .exam-hub-section-head p:not(.admin-kicker){margin:8px 0 0;color:var(--muted);font-size:13px;line-height:1.5}
    .exam-hub-head-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px}
    .exam-hub-head-actions button,.exam-hub-row-actions button,.exam-hub-side-card button,.exam-hub-empty button{min-height:39px;border-radius:11px;border:1px solid rgba(255,255,255,.105);background:linear-gradient(145deg,rgba(255,255,255,.06),rgba(255,255,255,.026));color:var(--white);padding:0 13px;font-weight:900;cursor:pointer}
    .exam-hub-head-actions button.primary,.exam-hub-row-actions button.primary,.exam-hub-side-card.highlighted button,.exam-hub-empty button{border-color:transparent;background:linear-gradient(135deg,#7cff55,var(--green));color:#061008;box-shadow:0 12px 28px rgba(99,229,70,.15)}
    .exam-hub-list{display:grid;gap:12px;margin-top:18px}
    .exam-hub-row{border:1px solid rgba(255,255,255,.08);border-radius:17px;background:linear-gradient(135deg,rgba(255,255,255,.04),rgba(255,255,255,.018));padding:15px;display:grid;grid-template-columns:minmax(260px,1.1fr) minmax(390px,1fr) auto;gap:16px;align-items:center}
    .exam-hub-row:hover{border-color:rgba(99,229,70,.23);background:linear-gradient(135deg,rgba(99,229,70,.055),rgba(255,255,255,.018))}
    .exam-hub-row-main{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:center}
    .exam-hub-row-main strong{display:block;font-size:16px;line-height:1.25}
    .exam-hub-row-main p{margin:5px 0 0;color:var(--muted);font-size:12px;line-height:1.4}
    .exam-hub-status{display:inline-flex;align-items:center;justify-content:center;min-width:88px;min-height:29px;border-radius:999px;padding:6px 9px;text-transform:uppercase;letter-spacing:.1em;font-size:9px;font-weight:950;border:1px solid rgba(255,255,255,.12)}
    .exam-hub-status.published{color:var(--green);background:rgba(99,229,70,.09);border-color:rgba(99,229,70,.24)}
    .exam-hub-status.review{color:#62d9ff;background:rgba(98,217,255,.08);border-color:rgba(98,217,255,.24)}
    .exam-hub-status.draft{color:var(--warning);background:rgba(247,201,72,.08);border-color:rgba(247,201,72,.24)}
    .exam-hub-status.archived{color:var(--muted);background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.1)}
    .exam-hub-row-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
    .exam-hub-row-metrics>div{border:1px solid rgba(255,255,255,.065);border-radius:12px;background:rgba(0,0,0,.15);padding:9px;min-width:0}
    .exam-hub-row-metrics span{display:block;color:var(--soft);font-size:9px;text-transform:uppercase;letter-spacing:.1em;font-weight:900}
    .exam-hub-row-metrics strong{display:block;margin-top:5px;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .exam-hub-row-actions{display:grid;gap:7px;min-width:130px}
    .exam-hub-side{display:grid;gap:14px;position:sticky;top:88px}
    .exam-hub-side-card{padding:18px}
    .exam-hub-side-card.highlighted{background:radial-gradient(circle at top right,rgba(99,229,70,.13),transparent 40%),linear-gradient(145deg,rgba(99,229,70,.075),rgba(255,255,255,.02));border-color:rgba(99,229,70,.2)}
    .exam-hub-side-card h2{margin:0;font-size:23px;line-height:1.05;letter-spacing:-.035em}
    .exam-hub-side-card p{color:var(--muted);font-size:13px;line-height:1.55}
    .exam-hub-side-card>button{display:flex;width:100%;align-items:center;justify-content:center;margin-top:9px}
    .exam-hub-empty{text-align:center;padding:48px 24px}
    .exam-hub-empty>span{width:66px;height:66px;border-radius:20px;display:grid;place-items:center;margin:0 auto 16px;color:var(--green);background:rgba(99,229,70,.08);border:1px solid rgba(99,229,70,.2);font-size:30px}
    .exam-hub-empty h3{margin:0;font-size:26px;letter-spacing:-.04em}
    .exam-hub-empty p{margin:10px auto 18px;max-width:560px;color:var(--muted);line-height:1.55}
    @media(max-width:1460px){
      .exam-hub-stats{grid-template-columns:repeat(3,minmax(0,1fr))}
      .exam-hub-layout{grid-template-columns:1fr}
      .exam-hub-side{position:static;grid-template-columns:repeat(3,minmax(0,1fr))}
      .exam-hub-row{grid-template-columns:1fr}
      .exam-hub-row-actions{grid-template-columns:1fr 1fr}
    }
    @media(max-width:900px){
      .exam-hub-hero{grid-template-columns:1fr;padding:22px}
      .exam-hub-stats,.exam-hub-side{grid-template-columns:1fr}
      .exam-hub-section-head{flex-direction:column}
      .exam-hub-head-actions{justify-content:flex-start}
      .exam-hub-row-main{grid-template-columns:1fr}
      .exam-hub-row-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}
      .exam-hub-row-actions{grid-template-columns:1fr}
    }

  `}</style>;
}