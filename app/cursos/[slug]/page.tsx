'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import GHCLogo from '../../components/GHCLogo';

type AnyRecord = Record<string, any>;

type PreviewCertificate = {
  certificate_id: string;
  certificate_code: string;
  verification_slug: string;
  student_name: string;
  course_id: string;
  course_title: string;
  final_score: number;
  issued_at: string;
  status: 'valid';
};

type FinalExamResult = {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  passed: boolean;
};

type FinalExamState = {
  exam: AnyRecord | null;
  questions: AnyRecord[];
  selectedAnswers: Record<string, string>;
  result: FinalExamResult | null;
  loading: boolean;
  submitting: boolean;
  message: string;
};

const emptyFinalExamState: FinalExamState = {
  exam: null,
  questions: [],
  selectedAnswers: {},
  result: null,
  loading: false,
  submitting: false,
  message: '',
};

const BUILD_MARK = 'GHC-COURSE-SECURE-EXAM-V2 · corrección segura en Supabase';
const GREEN = '#63E546';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function CourseDetailPage() {
  const params = useParams();
  const slug = String(params.slug || '');

  const [user, setUser] = useState<any>(null);
  const [course, setCourse] = useState<AnyRecord | null>(null);
  const [modules, setModules] = useState<AnyRecord[]>([]);
  const [lessons, setLessons] = useState<AnyRecord[]>([]);

  const [lessonProgress, setLessonProgress] = useState<AnyRecord[]>([]);
  const [moduleCompletions, setModuleCompletions] = useState<AnyRecord[]>([]);
  const [courseCompletion, setCourseCompletion] = useState<AnyRecord | null>(null);
  const [realCertificate, setRealCertificate] = useState<AnyRecord | null>(null);
  const [bestFinalExamAttempt, setBestFinalExamAttempt] = useState<AnyRecord | null>(null);
  const [finalExamState, setFinalExamState] = useState<FinalExamState>(emptyFinalExamState);
  const [currentHash, setCurrentHash] = useState('');

  const [previewModuleCompletions, setPreviewModuleCompletions] = useState<AnyRecord[]>([]);
  const [previewCourseCompletion, setPreviewCourseCompletion] = useState<AnyRecord | null>(null);
  const [previewCertificate, setPreviewCertificate] = useState<PreviewCertificate | null>(null);

  const [loading, setLoading] = useState(true);
  const [systemMessage, setSystemMessage] = useState('');

  useEffect(() => {
    const syncHash = () => setCurrentHash(window.location.hash || '');
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  useEffect(() => {
    async function loadCourseDetail() {
      try {
        setLoading(true);
        setSystemMessage('');
        setBestFinalExamAttempt(null);

        const { data: userData } = await supabase.auth.getUser();
        const activeUser = userData?.user || null;
        setUser(activeUser);

        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();

        if (courseError || !courseData) {
          setSystemMessage('Este curso no existe o todavía no está disponible.');
          setLoading(false);
          return;
        }

        setCourse(courseData);
        setFinalExamState({ ...emptyFinalExamState, loading: true });

        if (activeUser?.id) {
          const { data: secureExamData, error: secureExamError } = await supabase.rpc(
            'ghc_student_get_published_course_exam',
            { p_course_id: courseData.id }
          );

          if (secureExamError) {
            console.error('Error cargando examen final seguro:', secureExamError);
            setFinalExamState({
              ...emptyFinalExamState,
              loading: false,
              message: 'No se pudo cargar el examen final del curso.',
            });
          } else if (secureExamData?.exam?.id) {
            const secureQuestions = Array.isArray(secureExamData.questions)
              ? secureExamData.questions.map((question: AnyRecord) => {
                  const normalized = { ...question };
                  const optionRows = Array.isArray(question.options) ? question.options : [];

                  optionRows.forEach((option: AnyRecord) => {
                    const label = normalizeOption(option.label);
                    if (['A', 'B', 'C', 'D', 'E', 'F'].includes(label)) {
                      normalized[`option_${label.toLowerCase()}`] = option.text || '';
                    }
                  });

                  delete normalized.options;
                  delete normalized.correct_option;
                  return normalized;
                })
              : [];

            setFinalExamState({
              exam: secureExamData.exam,
              questions: secureQuestions,
              selectedAnswers: {},
              result: null,
              loading: false,
              submitting: false,
              message: '',
            });

            setBestFinalExamAttempt(
              secureExamData.has_passed
                ? {
                    passed: true,
                    score: Number(secureExamData.best_score || 0),
                    attempt_count: Number(secureExamData.attempt_count || 0),
                  }
                : null
            );

            if (secureExamData.certificate?.status === 'valid') {
              setRealCertificate(secureExamData.certificate);
            }
          } else {
            setFinalExamState({
              ...emptyFinalExamState,
              loading: false,
              message: 'Todavía no hay examen final publicado para este curso.',
            });
          }
        } else {
          setFinalExamState({
            ...emptyFinalExamState,
            loading: false,
            message: 'Inicia sesión como alumno para acceder al examen final.',
          });
        }

        if (!activeUser?.id) {
          loadPreviewModuleCompletions(courseData.id);
          loadPreviewCourseCompletion(courseData.id);
          loadPreviewCertificate(courseData.id);
        } else {
          setPreviewModuleCompletions([]);
          setPreviewCourseCompletion(null);
          setPreviewCertificate(null);
        }

        const { data: modulesData, error: modulesError } = await supabase
          .from('modules')
          .select('*')
          .eq('course_id', courseData.id);

        if (modulesError) {
          console.error('Error cargando módulos:', modulesError);
          setSystemMessage('Curso cargado, pero no se pudieron cargar los módulos.');
          setModules([]);
          setLessons([]);
          setLoading(false);
          return;
        }

        const orderedModules = Array.isArray(modulesData) ? [...modulesData].sort(sortModules) : [];
        setModules(orderedModules);

        if (orderedModules.length === 0) {
          setSystemMessage('Curso cargado correctamente, pero todavía no se han encontrado módulos asociados.');
          setLessons([]);
          setLoading(false);
          return;
        }

        const moduleIds = orderedModules.map((module) => module.id);

        const { data: lessonsData, error: lessonsError } = await supabase
          .from('lessons')
          .select('*')
          .in('module_id', moduleIds);

        if (lessonsError) {
          console.error('Error cargando lecciones:', lessonsError);
          setSystemMessage('Curso cargado, pero no se pudieron cargar las lecciones.');
          setLessons([]);
        } else {
          const orderedLessons = Array.isArray(lessonsData) ? [...lessonsData].sort(sortLessons) : [];
          setLessons(orderedLessons);
        }

        if (activeUser?.id) {
          const { data: progressData } = await supabase
            .from('lesson_progress')
            .select('*')
            .eq('user_id', activeUser.id)
            .eq('course_id', courseData.id)
            .eq('completed', true);

          setLessonProgress(Array.isArray(progressData) ? progressData : []);

          const { data: moduleCompletionData } = await supabase
            .from('module_completions')
            .select('*')
            .eq('user_id', activeUser.id)
            .eq('course_id', courseData.id)
            .eq('completed', true);

          setModuleCompletions(Array.isArray(moduleCompletionData) ? moduleCompletionData : []);

          const { data: courseCompletionData } = await supabase
            .from('course_completions')
            .select('*')
            .eq('user_id', activeUser.id)
            .eq('course_id', courseData.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          setCourseCompletion(courseCompletionData || null);

          const { data: certificateData } = await supabase
            .from('certificates')
            .select('*')
            .eq('user_id', activeUser.id)
            .eq('course_id', courseData.id)
            .eq('status', 'valid')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          setRealCertificate(certificateData || null);
        }
      } catch (error) {
        console.error('Error cargando detalle del curso:', error);
        setSystemMessage('Error cargando el contenido del curso.');
      } finally {
        setLoading(false);
      }
    }

    if (slug) loadCourseDetail();
  }, [slug]);


  function loadPreviewModuleCompletions(courseId: string) {
    try {
      if (typeof window === 'undefined') return;
      const raw = window.localStorage.getItem(`ghc_preview_module_completions_${courseId}`);
      if (!raw) {
        setPreviewModuleCompletions([]);
        return;
      }
      const parsed = JSON.parse(raw);
      const records = Object.values(parsed || {}) as AnyRecord[];
      setPreviewModuleCompletions(records.filter((item) => item?.completed));
    } catch (error) {
      console.error('Error leyendo preview module completions:', error);
      setPreviewModuleCompletions([]);
    }
  }

  function loadPreviewCourseCompletion(courseId: string) {
    try {
      if (typeof window === 'undefined') return;
      const raw = window.localStorage.getItem(`ghc_preview_course_completion_${courseId}`);
      if (!raw) {
        setPreviewCourseCompletion(null);
        return;
      }
      const parsed = JSON.parse(raw);
      setPreviewCourseCompletion(parsed?.completed ? parsed : null);
    } catch (error) {
      console.error('Error leyendo preview course completion:', error);
      setPreviewCourseCompletion(null);
    }
  }

  function loadPreviewCertificate(courseId: string) {
    try {
      if (typeof window === 'undefined') return;
      const raw = window.localStorage.getItem(`ghc_preview_certificate_${courseId}`);
      if (!raw) {
        setPreviewCertificate(null);
        return;
      }
      const parsed = JSON.parse(raw);
      setPreviewCertificate(parsed?.certificate_id && parsed?.status === 'valid' ? parsed : null);
    } catch (error) {
      console.error('Error leyendo preview certificate:', error);
      setPreviewCertificate(null);
    }
  }

  const effectiveModuleCompletions = useMemo(() => {
    if (user?.id) return moduleCompletions;
    const byModuleId = new Map<string, AnyRecord>();
    previewModuleCompletions.forEach((item) => {
      if (item?.module_id) byModuleId.set(String(item.module_id), item);
    });
    return Array.from(byModuleId.values());
  }, [user, moduleCompletions, previewModuleCompletions]);

  const effectiveCourseCompletion = user?.id ? courseCompletion : previewCourseCompletion;
  const effectiveCertificate = user?.id ? realCertificate : previewCertificate;

  const completedLessonIds = useMemo(() => new Set(lessonProgress.map((item) => String(item.lesson_id))), [lessonProgress]);
  const completedModuleIds = useMemo(() => new Set(effectiveModuleCompletions.map((item) => String(item.module_id))), [effectiveModuleCompletions]);

  const totalLessons = lessons.length;
  const completedLessons = lessonProgress.length;
  const lessonProgressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const allModulesCompleted = modules.length > 0 && modules.every((module) => completedModuleIds.has(String(module.id)));
  const completedModulesCount = modules.filter((module) => completedModuleIds.has(String(module.id))).length;

  const finalExamExists = Boolean(finalExamState.exam?.id);
  const finalExamPassed = Boolean(finalExamState.result?.passed || bestFinalExamAttempt?.passed);
  const finalExamScore = Number(finalExamState.result?.score ?? bestFinalExamAttempt?.score ?? effectiveCourseCompletion?.final_score ?? 0);

  // Regla nueva oficial:
  // si hay examen final publicado, el curso solo se considera superado cuando existe intento aprobado.
  // el 100% de lecciones ya no desbloquea certificado por sí solo.
  const isCourseCompleted = finalExamExists
    ? finalExamPassed
    : Boolean(effectiveCourseCompletion?.completed);

  const finalExamUnlocked = finalExamExists && allModulesCompleted && !finalExamPassed;
  const certificateAvailable = Boolean(isCourseCompleted && finalExamPassed);
  const certificateBlockedByExam = finalExamExists && allModulesCompleted && !finalExamPassed;

  const courseHeroStyle = {
    '--course-hero-image': `url(${getPremiumCourseImageUrl(course || {})})`,
  } as CSSProperties;

  const firstAvailableLesson = useMemo(() => {
    for (let moduleIndex = 0; moduleIndex < modules.length; moduleIndex += 1) {
      const module = modules[moduleIndex];
      const unlocked = isModuleUnlocked(module, moduleIndex);
      if (!unlocked) continue;

      const moduleLessons = getModuleLessons(String(module.id));
      const moduleCompleted = completedModuleIds.has(String(module.id));
      const pending = moduleLessons.find((lesson) => !completedLessonIds.has(String(lesson.id)));

      if (pending) return pending;
      if (!moduleCompleted && moduleLessons[0]) return moduleLessons[0];
    }

    for (let moduleIndex = modules.length - 1; moduleIndex >= 0; moduleIndex -= 1) {
      const module = modules[moduleIndex];
      const unlocked = isModuleUnlocked(module, moduleIndex);
      if (!unlocked) continue;
      const moduleLessons = getModuleLessons(String(module.id));
      if (moduleLessons[0]) return moduleLessons[0];
    }

    return lessons[0] || null;
  }, [modules, lessons, completedLessonIds, completedModuleIds, isCourseCompleted]);

  const activeModule = useMemo(() => {
    if (!firstAvailableLesson?.module_id) return modules[0] || null;
    return modules.find((module) => String(module.id) === String(firstAvailableLesson.module_id)) || modules[0] || null;
  }, [modules, firstAvailableLesson]);

  function getModuleLessons(moduleId: string) {
    return lessons.filter((lesson) => String(lesson.module_id) === String(moduleId)).sort(sortLessons);
  }

  function isModuleUnlocked(module: AnyRecord, index: number) {
    if (index === 0) return true;
    if (isCourseCompleted) return true;
    if (completedModuleIds.has(String(module.id))) return true;
    const previousModule = modules[index - 1];
    if (!previousModule) return false;
    return completedModuleIds.has(String(previousModule.id));
  }

  function selectFinalExamAnswer(questionId: string, option: string) {
    setFinalExamState((previous) => ({
      ...previous,
      selectedAnswers: {
        ...previous.selectedAnswers,
        [questionId]: option,
      },
      message: '',
    }));
  }

  async function submitFinalExam() {
    if (!course) return;

    if (!user?.id) {
      setFinalExamState((previous) => ({
        ...previous,
        message: 'Inicia sesión como alumno para guardar el examen final del curso.',
      }));
      return;
    }

    if (!finalExamUnlocked) {
      setFinalExamState((previous) => ({
        ...previous,
        message: finalExamPassed
          ? 'Este examen final ya figura como superado.'
          : 'Primero completa todos los módulos para desbloquear el examen final.',
      }));
      return;
    }

    if (!finalExamState.exam?.id || finalExamState.questions.length === 0) {
      setFinalExamState((previous) => ({
        ...previous,
        message: 'El examen final todavía no tiene preguntas configuradas.',
      }));
      return;
    }

    const allAnswered = finalExamState.questions.every((question) =>
      Boolean(finalExamState.selectedAnswers[String(question.id)])
    );

    if (!allAnswered) {
      setFinalExamState((previous) => ({
        ...previous,
        message: 'Responde todas las preguntas antes de enviar el examen final.',
      }));
      return;
    }

    try {
      setFinalExamState((previous) => ({
        ...previous,
        submitting: true,
        message: 'Corrigiendo examen final de forma segura...',
      }));

      const { data: secureResult, error: secureSubmitError } = await supabase.rpc(
        'ghc_student_submit_course_exam',
        {
          p_exam_id: finalExamState.exam.id,
          p_answers: finalExamState.selectedAnswers,
        }
      );

      if (secureSubmitError || !secureResult) {
        console.error('Error en corrección segura del examen final:', secureSubmitError);
        setFinalExamState((previous) => ({
          ...previous,
          submitting: false,
          message:
            secureSubmitError?.message ||
            'No se pudo corregir y guardar el examen final de forma segura.',
        }));
        return;
      }

      const result: FinalExamResult = {
        score: Number(secureResult.score || 0),
        totalQuestions: Number(secureResult.total_questions || finalExamState.questions.length),
        correctAnswers: Number(secureResult.correct_answers || 0),
        passed: Boolean(secureResult.passed),
      };

      setBestFinalExamAttempt({
        passed: result.passed,
        score: result.score,
        attempt_count: Number(secureResult.attempt_number || 1),
      });

      if (secureResult.certificate?.status === 'valid') {
        setRealCertificate(secureResult.certificate);
      }

      setFinalExamState((previous) => ({
        ...previous,
        result,
        submitting: false,
        message: result.passed
          ? `Examen final superado con ${result.score}%. Has acertado ${result.correctAnswers} de ${result.totalQuestions}. Certificación desbloqueada.`
          : `Examen final enviado con ${result.score}%. Has acertado ${result.correctAnswers} de ${result.totalQuestions}. Puedes volver a intentarlo cuando quieras.`,
      }));

      if (result.passed) {
        const { data: completionData } = await supabase
          .from('course_completions')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_id', course.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        setCourseCompletion(completionData || null);
      }
    } catch (error) {
      console.error('Error inesperado enviando examen final:', error);
      setFinalExamState((previous) => ({
        ...previous,
        submitting: false,
        message: 'Ha ocurrido un error inesperado al enviar el examen final.',
      }));
    }
  }

  async function saveCourseCompletion({ examAttemptId, score }: { examAttemptId: string | null; score: number }) {
    if (!user?.id || !course?.id || !finalExamState.exam?.id) return;

    const now = new Date().toISOString();
    const payload = {
      user_id: user.id,
      course_id: course.id,
      exam_id: finalExamState.exam.id,
      exam_attempt_id: examAttemptId,
      completed: true,
      final_score: score,
      completed_at: now,
      updated_at: now,
    };

    const { data: existing } = await supabase
      .from('course_completions')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', course.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      const { data, error } = await supabase
        .from('course_completions')
        .update(payload)
        .eq('id', existing.id)
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('Error actualizando course_completions:', error);
        setFinalExamState((previous) => ({ ...previous, message: 'Examen superado, pero no se pudo actualizar course_completions.' }));
        return;
      }

      const savedCompletion = data || payload;
      setCourseCompletion(savedCompletion);
      const issuedCertificate = await ensureCertificateForCompletion(savedCompletion);
      if (issuedCertificate) {
        setFinalExamState((previous) => ({ ...previous, message: `${previous.message} Certificado emitido automáticamente.` }));
      }
      return;
    }

    const { data, error } = await supabase
      .from('course_completions')
      .insert({ ...payload, created_at: now })
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Error creando course_completions:', error);
      setFinalExamState((previous) => ({ ...previous, message: 'Examen superado, pero no se pudo crear course_completions.' }));
      return;
    }

    const savedCompletion = data || payload;
    setCourseCompletion(savedCompletion);
    const issuedCertificate = await ensureCertificateForCompletion(savedCompletion);
    if (issuedCertificate) {
      setFinalExamState((previous) => ({ ...previous, message: `${previous.message} Certificado emitido automáticamente.` }));
    }
  }

  async function ensureCertificateForCompletion(completionRecord: AnyRecord | null) {
    if (!user?.id || !course?.id || !completionRecord?.completed) return null;

    const { data: existingCertificate, error: existingError } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', course.id)
      .eq('status', 'valid')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error('Error comprobando certificado existente:', existingError);
      return null;
    }

    if (existingCertificate) {
      setRealCertificate(existingCertificate);
      return existingCertificate;
    }

    const studentName = await getCertificateStudentName();
    const identifiers = generateCertificateIdentifiers();
    const now = new Date().toISOString();

    const { data: insertedCertificate, error: insertError } = await supabase
      .from('certificates')
      .insert({
        user_id: user.id,
        course_id: course.id,
        course_completion_id: completionRecord.id || courseCompletion?.id || null,
        student_name: studentName,
        course_title: String(course.title || 'Curso GHC Academy'),
        final_score: Number(completionRecord.final_score || 100),
        certificate_code: identifiers.code,
        verification_slug: identifiers.slug,
        status: 'valid',
        issued_at: now,
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .maybeSingle();

    if (insertError) {
      console.error('Error emitiendo certificado automático:', insertError);
      setFinalExamState((previous) => ({
        ...previous,
        message: `${previous.message} El curso quedó completado, pero no se pudo emitir el certificado automáticamente.`,
      }));
      return null;
    }

    if (insertedCertificate) setRealCertificate(insertedCertificate);
    return insertedCertificate || null;
  }

  async function getCertificateStudentName() {
    if (!user?.id) return 'Alumno GHC Academy';
    const metadataName = String(user?.user_metadata?.full_name || '').trim();
    if (metadataName) return metadataName;

    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('full_name,email')
      .eq('id', user.id)
      .maybeSingle();

    if (error) console.error('Error cargando nombre para certificado:', error);

    const profileName = String(profileData?.full_name || '').trim();
    const profileEmail = String(profileData?.email || '').trim();
    const userEmail = String(user?.email || '').trim();

    return profileName || profileEmail || userEmail || 'Alumno GHC Academy';
  }

  async function issueCertificate() {
    if (!course || !effectiveCourseCompletion?.completed || !finalExamPassed) return;

    if (!user?.id) {
      issuePreviewCertificate();
      return;
    }

    const issuedCertificate = await ensureCertificateForCompletion(effectiveCourseCompletion);
    if (!issuedCertificate) alert('No se pudo emitir el certificado real. Revisa Supabase.');
  }

  function issuePreviewCertificate() {
    if (!course || !effectiveCourseCompletion?.completed || !finalExamPassed) return;

    const now = new Date();
    const identifiers = generateCertificateIdentifiers();
    const certificate: PreviewCertificate = {
      certificate_id: crypto.randomUUID(),
      certificate_code: identifiers.code,
      verification_slug: identifiers.slug,
      student_name: 'Alumno GHC Academy',
      course_id: String(course.id),
      course_title: String(course.title || 'Curso GHC Academy'),
      final_score: Number(effectiveCourseCompletion.final_score || finalExamScore || 100),
      issued_at: now.toISOString(),
      status: 'valid',
    };

    window.localStorage.setItem(`ghc_preview_certificate_${course.id}`, JSON.stringify(certificate));
    setPreviewCertificate(certificate);
  }

  if (loading) {
    return (
      <main className="course-dashboard-page loading">
        <Background />
        <section className="loading-card">
          <GHCLogo size="md" showText tagline={false} />
          <h1>Cargando curso</h1>
          <span>Preparando módulos, lecciones, evaluación y certificado.</span>
        </section>
        <GlobalStyles />
      </main>
    );
  }

  if (!course) {
    return (
      <main className="course-dashboard-page loading">
        <Background />
        <section className="loading-card">
          <Link href="/cursos" className="ghost-pill">← Volver al catálogo</Link>
          <p>Curso no disponible</p>
          <h1>Curso no encontrado</h1>
          <span>{systemMessage}</span>
        </section>
        <GlobalStyles />
      </main>
    );
  }

  const certificateLink = effectiveCertificate ? `/certificados/${effectiveCertificate.verification_slug}` : '';
  const continueHref = firstAvailableLesson ? `/cursos/${slug}/${firstAvailableLesson.id}` : `/cursos/${slug}`;
  const courseTypeLabel = course.course_type || course.type || 'Curso';
  const levelLabel = course.level || 'Nivel GHC';
  const durationLabel = Number(course.duration_minutes || 0) > 0 ? `${Number(course.duration_minutes || 0)} min` : 'A tu ritmo';
  const evaluationStateLabel = finalExamPassed ? 'Curso completado' : finalExamUnlocked ? 'Disponible' : 'Bloqueado';

  return (
    <main className="course-dashboard-page">
      <Background />

      <aside className="rail">
        <div className="rail-dot active">⌂</div>
        <div className="rail-dot green">●</div>
        <div className="rail-dot">◌</div>
        <div className="rail-dot">◎</div>
        <div className="rail-dot">◇</div>
        <div className="rail-dot">⚙</div>
        <span>GX</span>
      </aside>

      <aside className="sidebar">
        <Link href="/alumno" className="brand official-brand" aria-label="Ir al panel del alumno de GHC Academy">
          <GHCLogo size="md" showText tagline={false} />
        </Link>

        <nav className="side-nav" aria-label="Navegación del alumno">
          <Link href="/alumno" className="side-item"><span>▦</span><div><strong>Panel</strong><small>Resumen</small></div></Link>
          <Link href="/alumno" className="side-item active"><span>▧</span><div><strong>Mis cursos</strong><small>Cursos activos</small></div></Link>
          <a href="#modulos" className="side-item"><span>▤</span><div><strong>Itinerario</strong><small>Módulos</small></div></a>
          <a href="#evaluacion" className="side-item"><span>☑</span><div><strong>Evaluaciones</strong><small>Examen final</small></div></a>
          <a href="#certificado" className="side-item"><span>▱</span><div><strong>Certificados</strong><small>Credenciales</small></div></a>
          <Link href="/alumno" className="side-item"><span>⌁</span><div><strong>Rendimiento</strong><small>Perfil</small></div></Link>
        </nav>

        <div className="student-card">
          <div className="avatar">A</div>
          <strong>Alby</strong>
          <span>Alumno <b>Pro</b></span>
          <Link href="/alumno">Cerrar sesión</Link>
        </div>

        <div className="weather-card"><span /><div><strong>31°C</strong><small>Soleado</small></div><em>⌄</em></div>
      </aside>

      <section className="course-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <Link href="/alumno">Panel</Link><span>›</span><Link href="/alumno">Mis cursos</Link><span>›</span><strong>{course.title || 'Curso GHC'}</strong>
          </div>
          <div className="toplinks"><Link href="/alumno">Inicio</Link><Link href="/cursos" className="green-link">Explorar cursos</Link><span className="bell">3</span><span className="avatar-mini">A</span></div>
        </header>

        <div className="build-ribbon">{BUILD_MARK}</div>
        {systemMessage && <div className="notice">{systemMessage}</div>}

        <div className={currentHash === '#evaluacion' ? 'dashboard-layout evaluation-focus' : 'dashboard-layout'}>
          <main className="main-column">
            <section className="course-heading">
              <div>
                <p className="kicker">Curso activo</p>
                <h1>{course.title}</h1>
                <p>{course.description || 'Formación premium basada en ciencia aplicada, estructura y rendimiento.'}</p>
              </div>

              <div className="course-progress-inline">
                <span>Progreso del curso</span>
                <strong>{lessonProgressPercent}%</strong>
                <div className="progress-mini"><div style={{ width: `${lessonProgressPercent}%` }} /></div>
              </div>
            </section>

            <section className="hero-card" style={courseHeroStyle}>
              <div className="hero-meta">
                <Metric label="Nivel" value={levelLabel} />
                <Metric label="Duración" value={durationLabel} />
                <Metric label="Módulos" value={modules.length} />
                <Metric label="Lecciones" value={totalLessons} />
              </div>

              <div className="hero-actions">
                <Link href={continueHref} className="primary-action">▶ Continuar curso</Link>
                <a href="#recursos" className="secondary-action">▥ Ver recursos</a>
              </div>
              <div className="hero-image" />
            </section>

            <nav className="tabs">
              <a href="#modulos" className="active">Contenido del curso</a>
              <a href="#recursos">Recursos</a>
              <a href="#evaluacion">Evaluación</a>
              <a href="#certificado">Certificado</a>
            </nav>

            <section id="modulos" className="modules-section">
              <div className="section-title-row"><p className="kicker">Módulos del curso</p><span>{completedModulesCount}/{modules.length} completados</span></div>
              <div className="modules-list">
                {modules.map((module, index) => {
                  const moduleLessons = getModuleLessons(String(module.id));
                  const unlocked = isModuleUnlocked(module, index);
                  const moduleCompleted = completedModuleIds.has(String(module.id));
                  const completionRecord = effectiveModuleCompletions.find((item) => String(item.module_id) === String(module.id));
                  const completedInModule = moduleLessons.filter((lesson) => completedLessonIds.has(String(lesson.id))).length;
                  const modulePercent = moduleLessons.length > 0 ? Math.round((completedInModule / moduleLessons.length) * 100) : 0;
                  const expanded = activeModule?.id ? String(activeModule.id) === String(module.id) : index === 0;

                  return (
                    <article key={module.id} className={['module-card', expanded ? 'expanded' : '', moduleCompleted ? 'completed' : '', !unlocked ? 'locked' : ''].filter(Boolean).join(' ')}>
                      <div className="module-header">
                        <div className="module-index"><span>{index + 1}</span></div>
                        <div className="module-copy"><strong>{module.title || `Módulo ${index + 1}`}</strong><small>{module.description || 'Bloque formativo de GHC Academy.'}</small></div>
                        <div className="module-state"><strong>{modulePercent}%</strong><span className={moduleCompleted ? 'dot done' : modulePercent > 0 ? 'dot working' : 'dot'} /><em>{expanded ? '⌃' : '⌄'}</em></div>
                      </div>

                      {expanded && (
                        <div className="lessons-list">
                          {moduleLessons.length === 0 && <div className="lesson-row empty"><div><strong>Lecciones pendientes de crear</strong><span>Este módulo todavía no tiene contenido visible.</span></div><em>—</em></div>}

                          {moduleLessons.map((lesson, lessonIndex) => {
                            const lessonCompleted = completedLessonIds.has(String(lesson.id));
                            const lessonType = getLessonTypeLabel(lesson);
                            const isCurrent = firstAvailableLesson?.id && String(firstAvailableLesson.id) === String(lesson.id);
                            return (
                              <div key={lesson.id} className={['lesson-row', lessonCompleted ? 'completed' : '', isCurrent ? 'current' : ''].filter(Boolean).join(' ')}>
                                <span className="lesson-icon">{lessonCompleted ? '✓' : isCurrent ? '▶' : '▤'}</span>
                                <div className="lesson-name"><small>Lección {index + 1}.{lessonIndex + 1}</small><strong>{lesson.title || 'Lección GHC'}</strong></div>
                                <span className="lesson-kind">{lessonType}</span>
                                <span className="lesson-status">{lessonCompleted ? 'Completada' : isCurrent ? 'En progreso' : unlocked ? 'Disponible' : 'Bloqueada'}</span>
                                <span className="lesson-duration">{Number(lesson.duration_minutes || 0) > 0 ? `${Number(lesson.duration_minutes || 0)} min` : '—'}</span>
                                {unlocked ? <Link href={`/cursos/${slug}/${lesson.id}`}>Abrir</Link> : <em>🔒</em>}
                              </div>
                            );
                          })}

                          {moduleCompleted && <div className="module-score">Módulo aprobado · Nota: {completionRecord?.final_score || 0}%{!user ? ' · Preview' : ''}</div>}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>

            <section id="evaluacion" className={finalExamUnlocked || finalExamPassed ? 'main-evaluation-section active' : 'main-evaluation-section locked'}>
              <div className="section-title-row evaluation-title-row">
                <div><p className="kicker">Evaluación final</p><h2>{finalExamState.exam?.title || 'Examen final del curso'}</h2></div>
                <span>{evaluationStateLabel}</span>
              </div>

              <div className="evaluation-main-card">
                <div className="evaluation-main-copy">
                  <span className="evaluation-pill">{finalExamState.questions.length || 3} preguntas · Aprobado mínimo {Number(finalExamState.exam?.pass_score || finalExamState.exam?.passing_score || finalExamState.exam?.pass_percentage || 70)}%</span>
                  <h3>{finalExamPassed ? 'Curso superado' : finalExamUnlocked ? 'Realiza la evaluación final para desbloquear el certificado' : 'Completa todos los módulos para desbloquear la evaluación final'}</h3>
                  <p>{finalExamPassed ? `Evaluación final superada con ${finalExamScore || 100}%. Ya puedes emitir o consultar tu certificado.` : finalExamUnlocked ? 'Responde las preguntas finales. Al aprobar, la plataforma registrará el curso como completado y desbloqueará la certificación digital.' : 'El examen final se activa cuando todos los módulos del curso están aprobados.'}</p>
                </div>

                {finalExamUnlocked ? (
                  <div className="final-exam-box main-final-exam-box">
                    {finalExamState.loading ? (
                      <p className="exam-helper">Cargando examen final...</p>
                    ) : finalExamState.questions.length === 0 ? (
                      <p className="exam-helper">{finalExamState.message || 'El examen final todavía no tiene preguntas configuradas.'}</p>
                    ) : (
                      <>
                        <div className="final-exam-meta"><span>{finalExamState.questions.length} preguntas</span><span>Aprobado mínimo {Number(finalExamState.exam?.pass_score || finalExamState.exam?.passing_score || finalExamState.exam?.pass_percentage || 70)}%</span></div>
                        <div className="final-question-list main-final-question-list">
                          {finalExamState.questions.map((question, index) => (
                            <article key={question.id} className="final-question-card main-final-question-card">
                              <h4>{index + 1}. {question.question}</h4>
                              {['A', 'B', 'C', 'D'].map((option) => {
                                const optionText = question[`option_${option.toLowerCase()}`];
                                if (!optionText) return null;
                                const checked = finalExamState.selectedAnswers[String(question.id)] === option;
                                return (
                                  <label key={option} className={checked ? 'final-answer selected' : 'final-answer'}>
                                    <input type="radio" name={`final-question-${question.id}`} checked={checked} onChange={() => selectFinalExamAnswer(String(question.id), option)} />
                                    <span>{option}</span><p>{optionText}</p>
                                  </label>
                                );
                              })}
                            </article>
                          ))}
                        </div>
                        <button type="button" onClick={submitFinalExam} disabled={finalExamState.submitting} className="primary-action as-button full">{finalExamState.submitting ? 'Enviando...' : 'Enviar examen final'}</button>
                        {finalExamState.result ? <div className={finalExamState.result.passed ? 'final-result passed' : 'final-result failed'}><strong>{finalExamState.result.score}%</strong><span>{finalExamState.result.correctAnswers} de {finalExamState.result.totalQuestions} correctas · {finalExamState.result.passed ? 'Superado' : 'No superado'}</span></div> : null}
                        {finalExamState.message ? <p className="exam-helper">{finalExamState.message}</p> : null}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="evaluation-locked-box">
                    <div className="module-side-progress"><div style={{ width: `${finalExamPassed ? 100 : lessonProgressPercent}%` }} /></div>
                    <p>{finalExamPassed ? 'La evaluación final ya está superada.' : `${completedModulesCount} de ${modules.length} módulos completados.`}</p>
                  </div>
                )}
              </div>
            </section>
          </main>

          <aside className="right-column">
            <section className="side-panel progress-panel">
              <p className="panel-title">Tu progreso</p>
              <div className="progress-ring-row">
                <div className="progress-ring" style={{ background: `conic-gradient(var(--green) ${lessonProgressPercent * 3.6}deg, rgba(255,255,255,.08) 0deg)` }}><div><strong>{lessonProgressPercent}%</strong><span>completado</span></div></div>
                <div className="progress-stats"><div><span>Módulos completados</span><strong>{completedModulesCount} de {modules.length}</strong></div><div><span>Lecciones completadas</span><strong>{completedLessons} de {totalLessons}</strong></div><div><span>Tipo</span><strong>{courseTypeLabel}</strong></div></div>
              </div>
              <Link href="/alumno" className="panel-link">↗ Ver rendimiento detallado</Link>
            </section>

            <section className="side-panel next-panel">
              <p className="panel-title">Siguiente paso</p>
              <div className="next-lesson"><div className="thumb" /><div><span>{finalExamUnlocked ? 'Evaluación final' : activeModule?.title || 'Curso GHC'}</span><strong>{finalExamUnlocked ? 'Examen final disponible' : firstAvailableLesson?.title || 'Lección pendiente'}</strong><small>{finalExamUnlocked ? 'Pendiente' : firstAvailableLesson ? 'En progreso' : 'Sin lecciones disponibles'}</small></div></div>
              <Link href={finalExamUnlocked ? '#evaluacion' : continueHref} className="primary-action full">{finalExamUnlocked ? 'Ir al examen final ▶' : 'Continuar lección ▶'}</Link>
            </section>

            <section id="recursos" className="side-panel resources-panel">
              <p className="panel-title">Recursos privados</p>
              <div className="resource-row"><span>▤ Guías y PDFs</span><strong>{lessons.filter((lesson) => hasLessonPdf(lesson)).length} archivos</strong></div>
              <div className="resource-row"><span>▣ Vídeos</span><strong>{lessons.filter((lesson) => hasLessonVideo(lesson)).length} vídeos</strong></div>
              <div className="resource-row"><span>◉ Audio</span><strong>{lessons.filter((lesson) => hasLessonAudio(lesson)).length} audios</strong></div>
              <a href="#modulos" className="panel-link">↗ Ver todos los recursos</a>
            </section>

            <section id="certificado" className={certificateAvailable || effectiveCertificate ? 'side-panel certificate-panel active' : 'side-panel certificate-panel'}>
              <p className="panel-title">Certificación</p>
              <strong>{effectiveCertificate ? 'Certificado emitido' : certificateAvailable ? 'Certificado disponible' : certificateBlockedByExam ? 'Examen final pendiente' : 'Bloqueado'}</strong>
              <p>{effectiveCertificate ? `Código ${effectiveCertificate.certificate_code}` : certificateAvailable ? 'Puedes emitir la certificación digital.' : certificateBlockedByExam ? 'Aprueba la evaluación final para desbloquear la certificación.' : 'Completa el curso para desbloquear la certificación.'}</p>
              {effectiveCertificate ? <Link href={certificateLink} className="secondary-action full">Ver certificado</Link> : certificateAvailable ? <button type="button" onClick={issueCertificate} className="primary-action as-button full">Emitir certificado</button> : <button type="button" className="disabled-button" disabled>Pendiente</button>}
            </section>
          </aside>
        </div>
      </section>

      <GlobalStyles />
    </main>
  );
}

function getCourseImage(course: AnyRecord) {
  return course?.cover_image || course?.cover_image_url || course?.image || course?.image_url || course?.thumbnail || course?.thumbnail_url || '';
}

function getPremiumCourseImageUrl(course: AnyRecord) {
  const realImage = getCourseImage(course);
  if (realImage) return realImage;

  const raw = [course?.title, course?.subtitle, course?.description, course?.category, course?.level, course?.tags].filter(Boolean).join(' ').toLowerCase();
  if (raw.includes('nutric') || raw.includes('dieta') || raw.includes('suplement')) return 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1400&q=80';
  if (raw.includes('salud') || raw.includes('ciencia') || raw.includes('science') || raw.includes('fisiolog')) return 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=1400&q=80';
  if (raw.includes('rendimiento') || raw.includes('performance') || raw.includes('atleta')) return 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1400&q=80';
  if (raw.includes('entren') || raw.includes('fitness') || raw.includes('fuerza') || raw.includes('personal')) return 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=1400&q=80';
  return 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?auto=format&fit=crop&w=1400&q=80';
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

function Background() {
  return <div className="background" aria-hidden="true"><div className="orb orb-one" /><div className="orb orb-two" /><div className="grid-texture" /></div>;
}

function normalizeOption(value: unknown) {
  return String(value || '').trim().toUpperCase();
}

function generateCertificateIdentifiers() {
  const year = new Date().getFullYear();
  const serial = 320000 + Math.floor(Math.random() * 680000);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, 'X');
  const slugSuffix = Math.random().toString(36).slice(2, 10).toLowerCase().padEnd(8, 'x');
  return { code: `GHC-${year}-${serial}-${suffix}`, slug: `ghc-${year}-${serial}-${slugSuffix}` };
}

function getOrder(item: AnyRecord, fallback: number) {
  return item.position ?? item.sort_order ?? item.order_index ?? item.order ?? fallback;
}

function sortModules(a: AnyRecord, b: AnyRecord) {
  const aNumber = extractModuleNumber(a.title);
  const bNumber = extractModuleNumber(b.title);
  if (aNumber !== bNumber) return aNumber - bNumber;
  return Number(getOrder(a, 999)) - Number(getOrder(b, 999));
}

function sortLessons(a: AnyRecord, b: AnyRecord) {
  const aNumber = extractLessonNumber(a.title);
  const bNumber = extractLessonNumber(b.title);
  if (aNumber !== bNumber) return aNumber - bNumber;
  return Number(getOrder(a, 999)) - Number(getOrder(b, 999));
}

function extractLessonNumber(title: string = '') {
  const match = title.match(/lecci[oó]n\s*(\d+)/i);
  return match ? Number(match[1]) : 999;
}

function extractModuleNumber(title: string = '') {
  const match = title.match(/m[oó]dulo\s*(\d+)/i);
  return match ? Number(match[1]) : 999;
}

function getLessonTypeLabel(lesson: AnyRecord) {
  const rawType = String(lesson.type || lesson.content_type || lesson.lesson_type || '').toLowerCase();
  const allValues = getLessonAssetText(lesson);
  const hasVideo = rawType.includes('video') || /\.(mp4|webm|mov|m4v)/i.test(allValues);
  const hasAudio = rawType.includes('audio') || /\.(mp3|wav|m4a|ogg)/i.test(allValues);
  const hasPdf = rawType.includes('pdf') || /\.pdf/i.test(allValues);
  const isMixed = rawType.includes('mixed') || rawType.includes('mixto');
  if (isMixed || [hasVideo, hasAudio, hasPdf].filter(Boolean).length >= 2) return 'Mixto';
  if (hasVideo) return 'Vídeo';
  if (hasAudio) return 'Audio';
  if (hasPdf) return 'PDF';
  return 'Texto';
}

function getLessonAssetText(lesson: AnyRecord) {
  return [lesson.content, lesson.video_url, lesson.audio_url, lesson.pdf_url, lesson.file_url, lesson.url, lesson.media_url, lesson.content_url].filter(Boolean).join(' ').toLowerCase();
}

function hasLessonPdf(lesson: AnyRecord) {
  return String(lesson.content_type || lesson.type || '').toLowerCase().includes('pdf') || Boolean(lesson.pdf_url) || /\.pdf/i.test(getLessonAssetText(lesson));
}

function hasLessonVideo(lesson: AnyRecord) {
  return String(lesson.content_type || lesson.type || '').toLowerCase().includes('video') || Boolean(lesson.video_url) || /\.(mp4|webm|mov|m4v)/i.test(getLessonAssetText(lesson));
}

function hasLessonAudio(lesson: AnyRecord) {
  return String(lesson.content_type || lesson.type || '').toLowerCase().includes('audio') || Boolean(lesson.audio_url) || /\.(mp3|wav|m4a|ogg)/i.test(getLessonAssetText(lesson));
}

function GlobalStyles() {
  return (
    <style jsx global>{`
      :root {
        --green: ${GREEN};
        --green-rgb: 99, 229, 70;
        --bg: #050706;
        --panel: rgba(8, 12, 10, .92);
        --white: #f4f6f2;
        --muted: rgba(244,246,242,.62);
        --soft: rgba(244,246,242,.44);
      }

      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: var(--bg); }
      body { color: var(--white); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      a { color: inherit; }
      button { font: inherit; }

      .course-dashboard-page {
        min-height: 100vh;
        position: relative;
        overflow-x: hidden;
        background:
          radial-gradient(circle at 12% -10%, rgba(var(--green-rgb), .075), transparent 32%),
          radial-gradient(circle at 96% 8%, rgba(255,255,255,.035), transparent 28%),
          linear-gradient(135deg, #050706 0%, #070a09 46%, #030404 100%);
        color: var(--white);
      }

      .background { position: fixed; inset: 0; pointer-events: none; overflow: hidden; z-index: 0; }
      .orb { position: absolute; border-radius: 999px; filter: blur(100px); }
      .orb-one { width: 520px; height: 520px; top: -220px; left: -180px; background: rgba(var(--green-rgb), .10); }
      .orb-two { width: 520px; height: 520px; right: -260px; top: 110px; background: rgba(120,135,130,.09); }
      .grid-texture { position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.022) 1px, transparent 1px); background-size: 42px 42px; opacity: .38; mask-image: radial-gradient(circle at center, black 0%, transparent 82%); }

      .rail { position: fixed; z-index: 3; left: 0; top: 0; width: 54px; height: 100vh; border-right: 1px solid rgba(255,255,255,.055); background: rgba(4,6,5,.78); display: grid; align-content: start; justify-items: center; gap: 18px; padding-top: 88px; }
      .rail-dot { width: 28px; height: 28px; border-radius: 999px; display: grid; place-items: center; color: rgba(244,246,242,.34); border: 1px solid transparent; font-size: 12px; }
      .rail-dot.active, .rail-dot.green { color: var(--green); background: rgba(var(--green-rgb), .08); border-color: rgba(var(--green-rgb), .18); }
      .rail > span { margin-top: auto; margin-bottom: 28px; color: rgba(244,246,242,.32); font-size: 10px; font-weight: 950; }

      .sidebar { position: fixed; z-index: 2; left: 54px; top: 0; width: 290px; height: 100vh; border-right: 1px solid rgba(255,255,255,.075); background: linear-gradient(180deg, rgba(8,11,10,.985), rgba(3,5,4,.965)), #050706; padding: 24px 24px 20px; display: grid; grid-template-rows: auto auto 1fr auto auto; gap: 22px; box-shadow: 18px 0 80px rgba(0,0,0,.22); }
      .brand { min-height: 44px; display: flex; align-items: center; gap: 12px; color: var(--white); text-decoration: none; }
      .side-nav { display: grid; gap: 8px; }
      .side-item { min-height: 58px; display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 12px; align-items: center; border-radius: 16px; color: rgba(244,246,242,.56); text-decoration: none; padding: 9px 12px; border: 1px solid transparent; }
      .side-item span { color: rgba(244,246,242,.46); text-align: center; }
      .side-item strong, .side-item small { display: block; }
      .side-item strong { color: rgba(244,246,242,.76); font-size: 14px; line-height: 1.1; }
      .side-item small { color: rgba(244,246,242,.42); margin-top: 4px; }
      .side-item.active { color: var(--green); border-color: rgba(var(--green-rgb), .20); background: linear-gradient(90deg, rgba(var(--green-rgb),.13), rgba(var(--green-rgb),.035)); box-shadow: inset 3px 0 0 rgba(var(--green-rgb),.82); }
      .side-item.active span, .side-item.active strong { color: var(--green); }

      .student-card, .weather-card { border-radius: 20px; border: 1px solid rgba(255,255,255,.075); background: rgba(255,255,255,.026); padding: 16px; }
      .student-card .avatar { width: 52px; height: 52px; border-radius: 999px; display: grid; place-items: center; border: 1px solid rgba(var(--green-rgb), .18); color: var(--green); background: rgba(var(--green-rgb), .06); font-weight: 950; margin-bottom: 12px; }
      .student-card strong, .student-card span, .student-card a { display: block; }
      .student-card span { color: rgba(244,246,242,.52); margin-top: 4px; }
      .student-card b { color: var(--green); font-size: 11px; margin-left: 4px; }
      .student-card a { color: rgba(244,246,242,.70); text-decoration: none; margin-top: 14px; }
      .weather-card { display: flex; align-items: center; gap: 12px; }
      .weather-card > span { width: 22px; height: 22px; border-radius: 999px; background: #f59d35; }
      .weather-card strong, .weather-card small { display: block; }
      .weather-card small, .weather-card em { color: rgba(244,246,242,.52); font-style: normal; }

      .course-shell { position: relative; z-index: 1; min-height: 100vh; margin-left: 344px; padding: 18px 32px 38px; }
      .topbar { min-height: 52px; display: flex; align-items: center; justify-content: space-between; gap: 18px; border-bottom: 1px solid rgba(255,255,255,.07); margin-bottom: 14px; }
      .breadcrumb, .toplinks { display: flex; align-items: center; gap: 10px; min-width: 0; }
      .breadcrumb, .breadcrumb a { color: rgba(244,246,242,.62); text-decoration: none; font-size: 12px; font-weight: 850; }
      .breadcrumb strong { color: var(--white); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .toplinks a { text-decoration: none; color: rgba(244,246,242,.52); text-transform: uppercase; letter-spacing: .14em; font-size: 11px; font-weight: 950; }
      .toplinks .green-link { color: var(--green); }
      .bell, .avatar-mini { width: 28px; height: 28px; border-radius: 999px; display: grid; place-items: center; border: 1px solid rgba(255,255,255,.08); color: var(--green); font-size: 11px; font-weight: 950; }
      .build-ribbon { width: fit-content; margin: 0 0 14px; border-radius: 999px; border: 1px solid rgba(var(--green-rgb), .18); background: rgba(var(--green-rgb), .055); color: var(--green); padding: 8px 12px; font-size: 10px; font-weight: 950; letter-spacing: .08em; text-transform: uppercase; }

      .dashboard-layout { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 24px; align-items: start; }
      .main-column, .right-column { display: grid; gap: 18px; }
      .dashboard-layout.evaluation-focus { grid-template-columns: minmax(0, 1fr) !important; }
      .dashboard-layout.evaluation-focus .right-column { display: none !important; }
      .dashboard-layout.evaluation-focus .main-column, .dashboard-layout.evaluation-focus .main-evaluation-section { width: 100%; max-width: none; }
      .dashboard-layout.evaluation-focus .evaluation-main-card { grid-template-columns: 300px minmax(0, 1fr); gap: 24px; }

      .course-heading { display: grid; grid-template-columns: minmax(0, 1fr) 330px; gap: 24px; align-items: end; }
      .kicker, .panel-title { margin: 0; color: var(--green); text-transform: uppercase; letter-spacing: .16em; font-size: 10px; font-weight: 950; }
      .course-heading h1 { margin: 8px 0; color: var(--white); font-size: clamp(28px, 3.5vw, 46px); line-height: .98; letter-spacing: -.052em; font-weight: 950; }
      .course-heading p:not(.kicker) { margin: 0; color: var(--muted); line-height: 1.55; }
      .course-progress-inline > span { display: block; color: rgba(244,246,242,.46); text-transform: uppercase; letter-spacing: .18em; font-size: 10px; font-weight: 900; }
      .course-progress-inline strong { display: inline-block; color: var(--green); font-size: 28px; line-height: 1; margin: 9px 12px 0 0; }
      .progress-mini, .module-side-progress { height: 8px; overflow: hidden; border-radius: 999px; background: rgba(255,255,255,.075); }
      .progress-mini { display: inline-block; width: min(180px, 100%); }
      .progress-mini div, .module-side-progress div { height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--green), #7bee65); box-shadow: 0 0 22px rgba(var(--green-rgb), .26); }

      .hero-card, .side-panel, .module-card, .loading-card, .notice, .main-evaluation-section { border-radius: 22px; border: 1px solid rgba(255,255,255,.085); background: radial-gradient(circle at top right, rgba(var(--green-rgb), .055), transparent 34%), linear-gradient(145deg, rgba(255,255,255,.052), rgba(255,255,255,.018)), rgba(8,12,10,.92); box-shadow: 0 24px 82px rgba(0,0,0,.22); }
      .hero-card { position: relative; min-height: 170px; overflow: hidden; display: grid; align-content: space-between; padding: 24px; }
      .hero-card::after, .hero-image { content: ''; position: absolute; inset: 0 0 0 auto; width: 55%; background: linear-gradient(90deg, rgba(8,12,10,1), rgba(8,12,10,.72), rgba(8,12,10,.20)), var(--course-hero-image, url('https://images.unsplash.com/photo-1517963879433-6ad2b056d712?auto=format&fit=crop&w=1200&q=70')); background-size: cover; background-position: center; filter: grayscale(1) contrast(1.1) brightness(.62); opacity: .48; pointer-events: none; }
      .hero-meta, .hero-actions { position: relative; z-index: 1; display: flex; gap: 12px; flex-wrap: wrap; }
      .hero-actions { margin-top: 24px; }
      .metric { min-width: 105px; min-height: 58px; border-radius: 16px; border: 1px solid rgba(255,255,255,.085); background: rgba(255,255,255,.032); padding: 12px; }
      .metric span, .resource-row span, .progress-stats span { display: block; color: rgba(244,246,242,.46); font-size: 10px; text-transform: uppercase; letter-spacing: .12em; font-weight: 900; }
      .metric strong, .resource-row strong, .progress-stats strong { display: block; color: var(--white); margin-top: 6px; font-size: 13px; font-weight: 900; }

      .primary-action, .secondary-action, .disabled-button { min-height: 42px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 0 18px; text-decoration: none; font-size: 12px; font-weight: 950; letter-spacing: .04em; cursor: pointer; }
      .primary-action { border: 1px solid rgba(var(--green-rgb), .30); background: linear-gradient(135deg, var(--green), #7bee65); color: #061008; box-shadow: 0 0 30px rgba(var(--green-rgb), .14); }
      .secondary-action, .disabled-button { border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.04); color: rgba(244,246,242,.82); }
      .disabled-button { width: 100%; color: rgba(244,246,242,.44); cursor: default; }
      .primary-action.full, .secondary-action.full, .primary-action.as-button.full { width: 100%; }
      button.primary-action { border: 1px solid rgba(var(--green-rgb), .30); }

      .tabs { min-height: 50px; display: flex; align-items: end; gap: 32px; border-bottom: 1px solid rgba(255,255,255,.075); }
      .tabs a { position: relative; padding: 0 0 14px; color: rgba(244,246,242,.50); text-decoration: none; font-size: 13px; font-weight: 900; }
      .tabs a.active { color: var(--green); }
      .tabs a.active::after { content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; background: var(--green); box-shadow: 0 0 20px rgba(var(--green-rgb), .28); }

      .modules-section { display: grid; gap: 14px; }
      .section-title-row { display: flex; align-items: end; justify-content: space-between; gap: 16px; }
      .section-title-row > span { color: rgba(244,246,242,.42); font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .12em; }
      .modules-list { display: grid; gap: 10px; }
      .module-card { overflow: hidden; }
      .module-card.completed { border-color: rgba(var(--green-rgb), .24); }
      .module-card.locked { opacity: .54; }
      .module-header { min-height: 64px; display: grid; grid-template-columns: 54px minmax(0, 1fr) 150px; gap: 12px; align-items: center; padding: 14px 16px; }
      .module-index { display: grid; place-items: center; }
      .module-index span { width: 31px; height: 31px; border-radius: 999px; display: grid; place-items: center; color: rgba(244,246,242,.70); border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.03); font-weight: 900; }
      .module-card.expanded .module-index span, .module-card.completed .module-index span { color: #061008; background: var(--green); }
      .module-copy strong, .module-copy small { display: block; }
      .module-copy strong { color: var(--white); font-size: 15px; font-weight: 900; }
      .module-copy small { color: rgba(244,246,242,.55); margin-top: 5px; }
      .module-state { display: grid; grid-template-columns: 45px 24px 20px; gap: 8px; align-items: center; justify-content: end; }
      .module-state strong { color: var(--white); font-size: 13px; }
      .module-state em { color: rgba(244,246,242,.54); font-style: normal; }
      .dot { width: 18px; height: 18px; border-radius: 999px; border: 2px solid rgba(255,255,255,.12); }
      .dot.working { border-color: rgba(var(--green-rgb), .60); border-top-color: transparent; }
      .dot.done { border-color: var(--green); background: var(--green); box-shadow: inset 0 0 0 4px rgba(0,0,0,.45); }
      .lessons-list { display: grid; gap: 0; padding: 0 16px 16px 70px; }
      .lesson-row { min-height: 48px; display: grid; grid-template-columns: 34px minmax(0, 1fr) 82px 120px 60px 70px; gap: 12px; align-items: center; border-top: 1px solid rgba(255,255,255,.055); color: rgba(244,246,242,.70); }
      .lesson-row.empty { grid-template-columns: minmax(0, 1fr) auto; color: rgba(244,246,242,.55); }
      .lesson-icon { width: 22px; height: 22px; border-radius: 999px; display: grid; place-items: center; color: var(--green); border: 1px solid rgba(var(--green-rgb), .18); background: rgba(var(--green-rgb), .055); font-size: 11px; }
      .lesson-name small, .lesson-name strong { display: block; }
      .lesson-name small { color: rgba(244,246,242,.46); font-size: 11px; }
      .lesson-name strong { color: rgba(244,246,242,.84); font-size: 13px; font-weight: 850; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .lesson-kind, .lesson-status, .lesson-duration { font-size: 12px; }
      .lesson-status { color: var(--green); }
      .lesson-duration { color: rgba(244,246,242,.46); }
      .lesson-row a { min-height: 30px; border-radius: 999px; border: 1px solid rgba(var(--green-rgb), .20); background: rgba(var(--green-rgb), .06); color: var(--green); display: inline-flex; align-items: center; justify-content: center; padding: 0 10px; text-decoration: none; font-size: 12px; font-weight: 950; }
      .lesson-row em { color: rgba(244,246,242,.36); font-style: normal; font-size: 12px; }
      .module-score { margin-top: 12px; border-radius: 14px; background: rgba(var(--green-rgb), .055); border: 1px solid rgba(var(--green-rgb), .18); color: var(--green); padding: 10px 12px; font-size: 12px; font-weight: 900; }

      .right-column { position: sticky; top: 18px; }
      .side-panel { padding: 20px; }
      .progress-ring-row { margin-top: 18px; display: grid; grid-template-columns: 106px minmax(0, 1fr); gap: 16px; align-items: center; }
      .progress-ring { width: 104px; height: 104px; border-radius: 999px; display: grid; place-items: center; }
      .progress-ring > div { width: 78px; height: 78px; border-radius: 999px; background: #070a09; display: grid; place-items: center; align-content: center; }
      .progress-ring strong, .progress-ring span { display: block; }
      .progress-ring strong { color: var(--green); font-size: 22px; line-height: 1; }
      .progress-ring span { color: rgba(244,246,242,.50); font-size: 10px; }
      .progress-stats { display: grid; gap: 10px; }
      .panel-link { margin-top: 16px; display: inline-flex; color: var(--green); text-decoration: none; font-size: 12px; font-weight: 900; }
      .next-lesson { margin: 16px 0; display: grid; grid-template-columns: 92px minmax(0, 1fr); gap: 14px; align-items: center; }
      .thumb { height: 62px; border-radius: 14px; background: linear-gradient(135deg, rgba(var(--green-rgb), .12), rgba(0,0,0,.18)), url('https://images.unsplash.com/photo-1571019613914-85f342c6a11e?auto=format&fit=crop&w=420&q=70'); background-size: cover; background-position: center; filter: grayscale(1) brightness(.72); }
      .next-lesson span, .next-lesson strong, .next-lesson small { display: block; }
      .next-lesson span { color: rgba(244,246,242,.48); font-size: 11px; }
      .next-lesson strong { color: var(--white); font-size: 14px; margin-top: 4px; }
      .next-lesson small { color: var(--green); margin-top: 6px; }
      .resource-row { min-height: 34px; display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid rgba(255,255,255,.055); }
      .resource-row span { text-transform: none; letter-spacing: 0; color: rgba(244,246,242,.66); font-size: 13px; }
      .resource-row strong { color: rgba(244,246,242,.62); font-size: 12px; }
      .certificate-panel > strong { display: block; margin-top: 14px; color: var(--white); font-weight: 900; }
      .certificate-panel p { color: var(--muted); line-height: 1.55; font-size: 13px; }
      .notice { padding: 14px 16px; color: rgba(244,246,242,.72); margin-bottom: 12px; }
      .loading { display: grid; place-items: center; }
      .loading-card { position: relative; z-index: 1; width: min(720px, calc(100vw - 40px)); padding: 34px; }
      .loading-card p { color: var(--green); text-transform: uppercase; letter-spacing: .16em; font-size: 10px; font-weight: 950; }
      .loading-card h1 { margin: 10px 0; font-size: clamp(34px, 5vw, 58px); line-height: .95; letter-spacing: -.06em; }
      .loading-card span { color: var(--muted); line-height: 1.6; }

      .main-evaluation-section { padding: 22px; scroll-margin-top: 20px; }
      .evaluation-title-row { margin-bottom: 16px; }
      .evaluation-title-row h2 { margin: 6px 0 0; font-size: clamp(26px, 3vw, 42px); line-height: .96; letter-spacing: -.055em; font-weight: 950; }
      .main-evaluation-section.locked { opacity: .92; }
      .evaluation-main-card { border-radius: 18px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.026); padding: 18px; display: grid; grid-template-columns: minmax(280px,.55fr) minmax(0,1.45fr); gap: 18px; align-items: start; }
      .evaluation-main-copy { position: sticky; top: 18px; display: grid; gap: 12px; }
      .evaluation-pill { width: fit-content; border-radius: 999px; border: 1px solid rgba(var(--green-rgb), .22); background: rgba(var(--green-rgb), .08); color: var(--green); padding: 7px 10px; font-size: 11px; font-weight: 900; }
      .evaluation-main-copy h3 { margin: 0; font-size: clamp(24px, 2.2vw, 34px); line-height: 1; letter-spacing: -.045em; font-weight: 950; }
      .evaluation-main-copy p, .evaluation-locked-box p { margin: 0; color: var(--muted); line-height: 1.65; }
      .main-final-exam-box { border-radius: 16px; border: 1px solid rgba(255,255,255,.08); background: rgba(0,0,0,.16); padding: 16px; }
      .final-exam-box { display: grid; gap: 12px; margin-top: 4px; }
      .final-exam-meta { display: flex; flex-wrap: wrap; gap: 8px; }
      .final-exam-meta span { border-radius: 999px; border: 1px solid rgba(99,229,70,.22); background: rgba(99,229,70,.08); color: var(--green); padding: 6px 9px; font-size: 11px; font-weight: 850; }
      .final-question-list { display: grid; gap: 14px; }
      .final-question-card { border-radius: 14px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.028); padding: 16px; display: grid; gap: 8px; }
      .final-question-card h4 { margin: 0 0 2px; font-size: 15px; line-height: 1.4; font-weight: 850; }
      .final-answer { min-height: 48px; border-radius: 11px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.024); display: grid; grid-template-columns: 22px 26px minmax(0,1fr); gap: 8px; align-items: center; padding: 10px; cursor: pointer; color: rgba(244,246,242,.76); }
      .final-answer.selected { border-color: rgba(99,229,70,.42); background: rgba(99,229,70,.09); color: var(--white); }
      .final-answer input { accent-color: var(--green); }
      .final-answer span { width: 24px; height: 24px; border-radius: 999px; display: grid; place-items: center; border: 1px solid rgba(255,255,255,.10); color: var(--green); font-size: 11px; font-weight: 950; }
      .final-answer p { margin: 0; font-size: 13px; line-height: 1.45; }
      .final-result { border-radius: 12px; border: 1px solid rgba(255,255,255,.10); background: rgba(255,255,255,.035); padding: 12px; display: grid; gap: 4px; }
      .final-result.passed { border-color: rgba(99,229,70,.28); background: rgba(99,229,70,.08); }
      .final-result.failed { border-color: rgba(255,105,105,.28); background: rgba(255,105,105,.08); }
      .final-result strong { color: var(--green); font-size: 28px; line-height: 1; }
      .final-result span, .exam-helper { color: var(--muted); font-size: 12px; line-height: 1.45; margin: 0; }

      @media (max-width: 1320px) {
        .dashboard-layout { grid-template-columns: 1fr; }
        .evaluation-main-card { grid-template-columns: 1fr; }
        .evaluation-main-copy { position: static; }
        .right-column { position: static; grid-template-columns: repeat(2, minmax(0, 1fr)); display: grid; }
        .course-heading { grid-template-columns: 1fr; }
      }

      @media (max-width: 1040px) {
        .rail, .sidebar { display: none; }
        .course-shell { margin-left: 0; padding: 16px; }
        .topbar { flex-direction: column; align-items: flex-start; }
        .dashboard-layout { gap: 18px; }
      }

      @media (max-width: 760px) {
        .right-column { grid-template-columns: 1fr; }
        .course-heading h1 { font-size: clamp(30px, 10vw, 42px); }
        .hero-card::after, .hero-image { opacity: .26; width: 100%; }
        .tabs { gap: 18px; overflow-x: auto; }
        .module-header { grid-template-columns: 40px minmax(0, 1fr); }
        .module-state { grid-column: 1 / -1; grid-template-columns: 45px 24px 20px; justify-content: start; }
        .lessons-list { padding: 0 12px 14px; }
        .lesson-row { grid-template-columns: 28px minmax(0, 1fr); }
        .lesson-kind, .lesson-status, .lesson-duration { grid-column: 2; }
        .lesson-row a, .lesson-row em { grid-column: 2; width: 100%; }
        .progress-ring-row, .next-lesson { grid-template-columns: 1fr; }
      }
    `}</style>
  );
}
