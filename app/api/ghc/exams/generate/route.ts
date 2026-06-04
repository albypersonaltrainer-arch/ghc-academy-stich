import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type AnyRecord = Record<string, any>;

type GeneratedOption = {
  label: "A" | "B" | "C" | "D" | "E" | "F";
  text: string;
  is_correct: boolean;
};

type GeneratedQuestion = {
  question: string;
  question_type: "test" | "true_false" | "case_option";
  options: GeneratedOption[];
  correct_label: "A" | "B" | "C" | "D" | "E" | "F";
  explanation: string;
  difficulty: "basic" | "medium" | "advanced" | "mixed";
  evaluated_objective: string;
};

type GeneratePayload = {
  questions: GeneratedQuestion[];
};

const OPENAI_MODEL = process.env.OPENAI_EXAM_MODEL || "gpt-4.1-mini";
const MAX_CONTENT_CHARS = 52000;

export async function POST(request: NextRequest) {
  const startedAt = Date.now();

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { ok: false, error: "Faltan variables NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY." },
        { status: 500 }
      );
    }

    if (!openaiApiKey) {
      return NextResponse.json(
        { ok: false, error: "Falta OPENAI_API_KEY en Vercel." },
        { status: 500 }
      );
    }

    const authorization = request.headers.get("authorization") || "";
    const token = authorization.toLowerCase().startsWith("bearer ")
      ? authorization.slice(7).trim()
      : "";

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Sesión no encontrada. Vuelve a entrar como administrador." },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      return NextResponse.json(
        { ok: false, error: "No se pudo verificar el usuario administrador." },
        { status: 401 }
      );
    }

    const { data: isAdmin, error: adminError } = await supabase.rpc("ghc_is_admin");

    if (adminError || isAdmin !== true) {
      return NextResponse.json(
        { ok: false, error: "Tu usuario no tiene permisos de administrador GHC." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const blueprintId = String(body?.blueprintId || "").trim();

    if (!blueprintId) {
      return NextResponse.json(
        { ok: false, error: "blueprintId es obligatorio." },
        { status: 400 }
      );
    }

    const { data: blueprint, error: blueprintError } = await supabase
      .from("exam_blueprints")
      .select("*")
      .eq("id", blueprintId)
      .maybeSingle();

    if (blueprintError || !blueprint) {
      return NextResponse.json(
        { ok: false, error: "Borrador no encontrado en exam_blueprints." },
        { status: 404 }
      );
    }

    if (!["draft_ai", "in_review", "rejected"].includes(String(blueprint.status || ""))) {
      return NextResponse.json(
        { ok: false, error: "Este borrador no está en un estado válido para generar preguntas." },
        { status: 409 }
      );
    }

    const { data: exam, error: examError } = await supabase.rpc("ghc_admin_create_exam_from_blueprint", {
      p_blueprint_id: blueprint.id,
    });

    if (examError || !exam?.id) {
      return NextResponse.json(
        { ok: false, error: examError?.message || "No se pudo crear el examen borrador desde el blueprint." },
        { status: 500 }
      );
    }

    const context = await buildBlueprintContext(supabase, blueprint);

    if (!context.content.trim()) {
      return NextResponse.json(
        { ok: false, error: "No hay contenido suficiente en el curso/módulo/lección seleccionada para generar preguntas." },
        { status: 400 }
      );
    }

    const prompt = buildGenerationPrompt(blueprint, context.content);
    const promptHash = await sha256(prompt);

    const { data: generation, error: generationError } = await supabase.rpc("ghc_admin_start_ai_generation", {
      p_blueprint_id: blueprint.id,
      p_exam_id: exam.id,
      p_generation_type: "initial",
      p_model_provider: "openai",
      p_model_name: OPENAI_MODEL,
      p_prompt_hash: promptHash,
      p_input_summary: context.summary,
      p_requested_question_count: Number(blueprint.requested_question_count || 0),
      p_regenerated_question_ids: [],
    });

    if (generationError || !generation?.id) {
      return NextResponse.json(
        { ok: false, error: generationError?.message || "No se pudo registrar la generación IA." },
        { status: 500 }
      );
    }

    try {
      const generated = await callOpenAIForQuestions(openaiApiKey, prompt, blueprint);
      const cleanQuestions = normalizeGeneratedQuestions(generated, Number(blueprint.answer_count || 4));

      if (!cleanQuestions.length) {
        throw new Error("La IA no devolvió preguntas válidas en formato estructurado.");
      }

      for (let index = 0; index < cleanQuestions.length; index += 1) {
        const item = cleanQuestions[index];

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
          throw new Error(questionError.message || "No se pudo guardar una pregunta generada.");
        }
      }

      await supabase.rpc("ghc_admin_finish_ai_generation", {
        p_generation_id: generation.id,
        p_status: "created",
        p_generated_question_count: cleanQuestions.length,
        p_output_summary: `Generadas ${cleanQuestions.length} preguntas en ${Date.now() - startedAt}ms.`,
        p_error_message: null,
      });

      return NextResponse.json({
        ok: true,
        blueprintId: blueprint.id,
        examId: exam.id,
        generationId: generation.id,
        generatedQuestionCount: cleanQuestions.length,
        message: "Preguntas generadas como borrador. Pendientes de revisión humana.",
      });
    } catch (generationFailure: any) {
      await supabase.rpc("ghc_admin_finish_ai_generation", {
        p_generation_id: generation.id,
        p_status: "failed",
        p_generated_question_count: 0,
        p_output_summary: null,
        p_error_message: getErrorMessage(generationFailure),
      });

      return NextResponse.json(
        { ok: false, error: getErrorMessage(generationFailure) },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

async function buildBlueprintContext(supabase: any, blueprint: AnyRecord) {
  const parts: string[] = [];

  const { data: course } = await supabase
    .from("courses")
    .select("id,title,subtitle,description,level,course_type")
    .eq("id", blueprint.course_id)
    .maybeSingle();

  if (course) {
    parts.push(`CURSO: ${course.title || "Sin título"}`);
    if (course.subtitle) parts.push(`SUBTÍTULO: ${course.subtitle}`);
    if (course.description) parts.push(`DESCRIPCIÓN: ${course.description}`);
    if (course.level) parts.push(`NIVEL DEL CURSO: ${course.level}`);
  }

  const sourceScope = String(blueprint.source_scope || "course");

  if (sourceScope === "course") {
    const modules = await selectModulesForCourse(supabase, blueprint.course_id);
    const moduleIds = modules.map((module: AnyRecord) => module.id).filter(Boolean);
    const lessons = await selectLessonsForModules(supabase, moduleIds);
    appendModulesAndLessons(parts, modules, lessons);
  }

  if (sourceScope === "module") {
    const modules = await selectModulesByIds(supabase, [blueprint.module_id]);
    const lessons = await selectLessonsForModules(supabase, [blueprint.module_id]);
    appendModulesAndLessons(parts, modules, lessons);
  }

  if (sourceScope === "lesson") {
    const lessons = await selectLessonsByIds(supabase, [blueprint.lesson_id]);
    appendModulesAndLessons(parts, [], lessons);
  }

  if (sourceScope === "multi_lesson") {
    const { data: rows } = await supabase
      .from("exam_blueprint_lessons")
      .select("lesson_id,module_id,sort_order")
      .eq("blueprint_id", blueprint.id)
      .order("sort_order", { ascending: true });

    const lessonIds = Array.isArray(rows) ? rows.map((row) => row.lesson_id).filter(Boolean) : [];
    const moduleIds = Array.isArray(rows) ? rows.map((row) => row.module_id).filter(Boolean) : [];
    const modules = await selectModulesByIds(supabase, moduleIds);
    const lessons = await selectLessonsByIds(supabase, lessonIds);
    appendModulesAndLessons(parts, modules, lessons);
  }

  const content = parts.join("\n\n").slice(0, MAX_CONTENT_CHARS);

  return {
    content,
    summary: `scope=${sourceScope}; chars=${content.length}; course=${blueprint.course_id}; module=${blueprint.module_id || ""}; lesson=${blueprint.lesson_id || ""}`,
  };
}

async function selectModulesForCourse(supabase: any, courseId: string) {
  const { data } = await supabase
    .from("modules")
    .select("id,course_id,title,description,sort_order,position")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });

  return Array.isArray(data) ? data : [];
}

async function selectModulesByIds(supabase: any, moduleIds: string[]) {
  const ids = Array.from(new Set(moduleIds.filter(Boolean)));
  if (!ids.length) return [];

  const { data } = await supabase
    .from("modules")
    .select("id,course_id,title,description,sort_order,position")
    .in("id", ids);

  return Array.isArray(data) ? data : [];
}

async function selectLessonsForModules(supabase: any, moduleIds: string[]) {
  const ids = Array.from(new Set(moduleIds.filter(Boolean)));
  if (!ids.length) return [];

  const { data } = await supabase
    .from("lessons")
    .select("id,module_id,title,content,content_type,sort_order,duration_minutes")
    .in("module_id", ids)
    .order("sort_order", { ascending: true });

  return Array.isArray(data) ? data : [];
}

async function selectLessonsByIds(supabase: any, lessonIds: string[]) {
  const ids = Array.from(new Set(lessonIds.filter(Boolean)));
  if (!ids.length) return [];

  const { data } = await supabase
    .from("lessons")
    .select("id,module_id,title,content,content_type,sort_order,duration_minutes")
    .in("id", ids)
    .order("sort_order", { ascending: true });

  return Array.isArray(data) ? data : [];
}

function appendModulesAndLessons(parts: string[], modules: AnyRecord[], lessons: AnyRecord[]) {
  const modulesById = new Map(modules.map((module) => [String(module.id), module]));

  for (const module of modules) {
    parts.push(`MÓDULO: ${module.title || "Sin título"}`);
    if (module.description) parts.push(`DESCRIPCIÓN DEL MÓDULO: ${module.description}`);
  }

  for (const lesson of lessons) {
    const module = modulesById.get(String(lesson.module_id));
    parts.push([
      module?.title ? `MÓDULO ASOCIADO: ${module.title}` : "",
      `LECCIÓN: ${lesson.title || "Sin título"}`,
      lesson.content_type ? `TIPO: ${lesson.content_type}` : "",
      lesson.content ? `CONTENIDO:\n${lesson.content}` : "CONTENIDO: Esta lección no tiene texto base; usa únicamente título y contexto disponible.",
    ].filter(Boolean).join("\n"));
  }
}

function buildGenerationPrompt(blueprint: AnyRecord, content: string) {
  const requestedCount = Number(blueprint.requested_question_count || 3);
  const answerCount = Number(blueprint.answer_count || 4);
  const questionKinds = Array.isArray(blueprint.question_kinds) && blueprint.question_kinds.length
    ? blueprint.question_kinds.join(", ")
    : "test";

  return `
Eres el Agente de Exámenes GHC v1 para GHC Academy.

REGLAS INNEGOCIABLES:
- Genera solo preguntas basadas en el contenido proporcionado.
- No inventes datos externos.
- No menciones IA, modelo, prompt ni generación automática.
- El resultado será un borrador interno para revisión humana.
- Tono didáctico, profesional, claro y riguroso.
- Las preguntas deben evaluar comprensión real, no memoria superficial.

CONFIGURACIÓN DEL ADMIN:
- Número exacto de preguntas: ${requestedCount}
- Dificultad: ${blueprint.difficulty || "mixed"}
- Tipo(s) de pregunta: ${questionKinds}
- Número exacto de respuestas por pregunta: ${answerCount}
- Porcentaje mínimo para aprobar: ${blueprint.pass_percentage || 70}%
- Mostrar explicación al alumno: ${blueprint.show_explanation ? "sí" : "no"}
- Instrucciones internas del admin: ${blueprint.ai_instructions || "Sin instrucciones adicionales."}

FORMATO OBLIGATORIO:
Devuelve JSON válido con esta forma exacta:
{
  "questions": [
    {
      "question": "Texto de la pregunta",
      "question_type": "test" | "true_false" | "case_option",
      "options": [
        { "label": "A", "text": "Respuesta A", "is_correct": false },
        { "label": "B", "text": "Respuesta B", "is_correct": true }
      ],
      "correct_label": "B",
      "explanation": "Explicación didáctica de por qué la respuesta correcta lo es.",
      "difficulty": "basic" | "medium" | "advanced" | "mixed",
      "evaluated_objective": "Objetivo o competencia evaluada"
    }
  ]
}

REGLAS DE OPCIONES:
- Cada pregunta debe tener exactamente ${answerCount} opciones.
- Usa etiquetas consecutivas desde A.
- Exactamente una opción debe tener is_correct=true.
- correct_label debe coincidir con la opción correcta.
- Las opciones incorrectas deben ser plausibles, pero claramente incorrectas para quien domina el contenido.

CONTENIDO SELECCIONADO:
${content}
`.trim();
}

async function callOpenAIForQuestions(apiKey: string, prompt: string, blueprint: AnyRecord): Promise<GeneratePayload> {
  const requestedCount = Number(blueprint.requested_question_count || 3);

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        {
          role: "system",
          content: "Eres un generador de exámenes profesionales para una academia premium. Responde solo JSON válido.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "ghc_exam_questions",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["questions"],
            properties: {
              questions: {
                type: "array",
                minItems: requestedCount,
                maxItems: requestedCount,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["question", "question_type", "options", "correct_label", "explanation", "difficulty", "evaluated_objective"],
                  properties: {
                    question: { type: "string" },
                    question_type: { type: "string", enum: ["test", "true_false", "case_option"] },
                    options: {
                      type: "array",
                      minItems: 2,
                      maxItems: 6,
                      items: {
                        type: "object",
                        additionalProperties: false,
                        required: ["label", "text", "is_correct"],
                        properties: {
                          label: { type: "string", enum: ["A", "B", "C", "D", "E", "F"] },
                          text: { type: "string" },
                          is_correct: { type: "boolean" },
                        },
                      },
                    },
                    correct_label: { type: "string", enum: ["A", "B", "C", "D", "E", "F"] },
                    explanation: { type: "string" },
                    difficulty: { type: "string", enum: ["basic", "medium", "advanced", "mixed"] },
                    evaluated_objective: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    }),
  });

  const raw = await response.text();

  if (!response.ok) {
    throw new Error(`OpenAI API error ${response.status}: ${raw.slice(0, 900)}`);
  }

  const json = JSON.parse(raw);
  const outputText = extractOutputText(json);

  if (!outputText) {
    throw new Error("OpenAI no devolvió texto JSON estructurado.");
  }

  return JSON.parse(outputText) as GeneratePayload;
}

function extractOutputText(response: AnyRecord) {
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text;
  }

  const chunks: string[] = [];
  const output = Array.isArray(response.output) ? response.output : [];

  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (typeof part?.text === "string") chunks.push(part.text);
      if (typeof part?.content === "string") chunks.push(part.content);
    }
  }

  return chunks.join("\n").trim();
}

function normalizeGeneratedQuestions(payload: GeneratePayload, answerCount: number) {
  const questions = Array.isArray(payload?.questions) ? payload.questions : [];
  const allowedLabels = ["A", "B", "C", "D", "E", "F"].slice(0, Math.max(2, Math.min(6, answerCount)));

  return questions.map((question) => {
    const options = Array.isArray(question.options)
      ? question.options
          .filter((option) => allowedLabels.includes(String(option.label || "").toUpperCase()))
          .slice(0, allowedLabels.length)
          .map((option) => ({
            label: String(option.label).toUpperCase() as GeneratedOption["label"],
            text: String(option.text || "").trim(),
            is_correct: option.is_correct === true,
          }))
      : [];

    const correct = options.find((option) => option.is_correct);

    return {
      question: String(question.question || "").trim(),
      question_type: normalizeQuestionType(question.question_type),
      options,
      correct_label: (correct?.label || question.correct_label || "A") as GeneratedQuestion["correct_label"],
      explanation: String(question.explanation || "").trim(),
      difficulty: normalizeDifficulty(question.difficulty),
      evaluated_objective: String(question.evaluated_objective || "Comprensión del contenido evaluado").trim(),
    };
  }).filter((question) => {
    const correctCount = question.options.filter((option) => option.is_correct).length;
    return Boolean(question.question) && question.options.length >= 2 && correctCount === 1;
  });
}

function normalizeQuestionType(value: unknown): GeneratedQuestion["question_type"] {
  const clean = String(value || "test").toLowerCase();
  if (clean === "true_false") return "true_false";
  if (clean === "case_option") return "case_option";
  return "test";
}

function normalizeDifficulty(value: unknown): GeneratedQuestion["difficulty"] {
  const clean = String(value || "mixed").toLowerCase();
  if (clean === "basic") return "basic";
  if (clean === "medium") return "medium";
  if (clean === "advanced") return "advanced";
  return "mixed";
}

async function sha256(value: string) {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function getErrorMessage(error: unknown) {
  if (!error) return "Error desconocido.";
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message || "Error desconocido.");
  }
  return "Error desconocido.";
}
