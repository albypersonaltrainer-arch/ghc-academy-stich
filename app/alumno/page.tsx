"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import GHCLogo from "../components/GHCLogo";

type AnyRecord = Record<string, any>;

type Course = {
  id: string;
  slug?: string | null;
  title?: string | null;
  name?: string | null;
  description?: string | null;
  short_description?: string | null;
  category?: string | null;
  level?: string | null;
  image_url?: string | null;
  cover_url?: string | null;
  thumbnail_url?: string | null;
  status?: string | null;
  visibility?: string | null;
  is_published?: boolean | null;
  published?: boolean | null;
  created_at?: string | null;
};

type Module = {
  id: string;
  course_id?: string | null;
  title?: string | null;
  name?: string | null;
  description?: string | null;
  order?: number | null;
  order_index?: number | null;
  position?: number | null;
  module_order?: number | null;
  sort_order?: number | null;
  number?: number | null;
  is_locked?: boolean | null;
};

type Lesson = {
  id: string;
  course_id?: string | null;
  module_id?: string | null;
  title?: string | null;
  name?: string | null;
  description?: string | null;
  type?: string | null;
  lesson_type?: string | null;
  content_type?: string | null;
  order?: number | null;
  order_index?: number | null;
  position?: number | null;
  lesson_order?: number | null;
  sort_order?: number | null;
  duration?: string | number | null;
  video_url?: string | null;
  audio_url?: string | null;
  pdf_url?: string | null;
  text_content?: string | null;
};

type UserProgress = {
  id?: string;
  user_id?: string | null;
  course_id?: string | null;
  module_id?: string | null;
  lesson_id?: string | null;
  completed?: boolean | null;
  is_completed?: boolean | null;
  status?: string | null;
  progress?: number | null;
};

type Certificate = {
  id: string;
  user_id?: string | null;
  course_id?: string | null;
  title?: string | null;
  course_title?: string | null;
  description?: string | null;
  status?: string | null;
  certificate_code?: string | null;
  code?: string | null;
  verification_code?: string | null;
  verification_url?: string | null;
  issued_at?: string | null;
  created_at?: string | null;
  final_score?: number | string | null;
  score?: number | string | null;
  grade?: string | null;
};

type ModuleView = Module & {
  titleSafe: string;
  lessons: Lesson[];
  completedLessons: number;
  totalLessons: number;
  progress: number;
  locked: boolean;
};

type CourseView = Course & {
  titleSafe: string;
  descriptionSafe: string;
  slugSafe: string;
  imageSafe: string;
  modules: ModuleView[];
  lessons: Lesson[];
  completedLessons: number;
  totalLessons: number;
  progress: number;
  nextLesson: Lesson | null;
  certificate: Certificate | null;
};

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "success" | "info" | "warning" | "certificate";
  read?: boolean;
};

type ActiveTab = "dashboard" | "courses" | "curriculum" | "exams" | "certificates";
type LoadingState = "loading" | "ready" | "error";

const GREEN = "#63E546";
const GHC_GREEN = "#22D65B";
const BG = "#050706";
const CARD = "rgba(14,18,16,.84)";
const CARD_2 = "rgba(21,27,24,.92)";
const BORDER = "rgba(255,255,255,.1)";
const TEXT = "#F4F7F2";
const MUTED = "#A8B2AA";
const STEEL = "#7F8A84";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const DEFAULT_COURSE_BACKGROUNDS = [
  "radial-gradient(circle at 18% 18%, rgba(99,229,70,.34), transparent 30%), linear-gradient(135deg, #101611 0%, #222B24 48%, #070908 100%)",
  "radial-gradient(circle at 72% 20%, rgba(99,229,70,.28), transparent 28%), linear-gradient(135deg, #101316 0%, #1C2429 52%, #060808 100%)",
  "radial-gradient(circle at 24% 76%, rgba(99,229,70,.26), transparent 30%), linear-gradient(135deg, #13110F 0%, #29231B 52%, #070706 100%)",
  "radial-gradient(circle at 70% 70%, rgba(99,229,70,.24), transparent 32%), linear-gradient(135deg, #0F1512 0%, #23302B 48%, #050706 100%)",
];

function safeString(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text.length ? text : fallback;
}

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function normalizeStatus(value?: string | null): string {
  return safeString(value).toLowerCase();
}

function formatDate(value?: string | null): string {
  if (!value) return "Pendiente";
  try {
    return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
  } catch {
    return "Pendiente";
  }
}

function formatPercent(value: number): string {
  return `${Math.max(0, Math.min(100, Math.round(value || 0)))}%`;
}

function isVisibleCourse(course: Course): boolean {
  const status = normalizeStatus(course.status);
  const visibility = normalizeStatus(course.visibility);
  if (course.is_published === false || course.published === false) return false;
  if (["draft", "archived", "hidden", "inactive", "deleted"].includes(status)) return false;
  if (["private", "hidden", "draft", "archived"].includes(visibility)) return false;
  return true;
}

function extractModuleNumber(module: Partial<Module>): number {
  const explicit = [module.order, module.order_index, module.position, module.module_order, module.sort_order, module.number]
    .map((value) => Number(value))
    .find((value) => Number.isFinite(value));
  if (explicit !== undefined) return explicit;
  const match = safeString(module.title || module.name).match(/(?:m[oó]dulo|module|unidad|bloque)?\s*#?\s*(\d+)/i);
  return match ? Number(match[1]) : 9999;
}

function extractLessonNumber(lesson: Partial<Lesson>): number {
  const explicit = [lesson.order, lesson.order_index, lesson.position, lesson.lesson_order, lesson.sort_order]
    .map((value) => Number(value))
    .find((value) => Number.isFinite(value));
  if (explicit !== undefined) return explicit;
  const match = safeString(lesson.title || lesson.name).match(/(?:lecci[oó]n|lesson|clase)?\s*#?\s*(\d+)/i);
  return match ? Number(match[1]) : 9999;
}

function getOrder(item: Partial<Module & Lesson>): number {
  if ("module_order" in item || "number" in item) return extractModuleNumber(item as Partial<Module>);
  return extractLessonNumber(item as Partial<Lesson>);
}

function sortModules(modules: Module[]): Module[] {
  return [...modules].sort((a, b) => extractModuleNumber(a) - extractModuleNumber(b));
}

function sortLessons(lessons: Lesson[]): Lesson[] {
  return [...lessons].sort((a, b) => extractLessonNumber(a) - extractLessonNumber(b));
}

function getCourseSlug(course: Course): string {
  const raw = safeString(course.slug || course.title || course.name || course.id, "curso");
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "curso";
}

function getCourseImage(course: Course): string {
  return safeString(course.image_url || course.cover_url || course.thumbnail_url, "");
}

function getPremiumCourseBackground(course: Course, index = 0): string {
  const image = getCourseImage(course);
  if (image) {
    return `linear-gradient(135deg, rgba(5,7,6,.78), rgba(5,7,6,.28)), url(${image}) center/cover`;
  }
  return DEFAULT_COURSE_BACKGROUNDS[index % DEFAULT_COURSE_BACKGROUNDS.length];
}

function getLessonType(lesson: Lesson): string {
  const raw = normalizeStatus(lesson.type || lesson.lesson_type || lesson.content_type);
  if (raw.includes("video")) return "video";
  if (raw.includes("audio")) return "audio";
  if (raw.includes("pdf")) return "pdf";
  if (raw.includes("mix") || raw.includes("mixto")) return "mixto";
  return raw || "texto";
}

function getLessonIcon(lesson: Lesson): string {
  const type = getLessonType(lesson);
  if (type === "video") return "▶";
  if (type === "audio") return "◉";
  if (type === "pdf") return "▣";
  if (type === "mixto") return "✦";
  return "◆";
}

function isLessonCompleted(progress: UserProgress[], lessonId?: string | null): boolean {
  if (!lessonId) return false;
  return progress.some((item) => item.lesson_id === lessonId && (item.completed === true || item.is_completed === true || normalizeStatus(item.status) === "completed"));
}

function findNextLesson(modules: ModuleView[]): Lesson | null {
  for (const module of modules) {
    const next = module.lessons.find((lesson) => !(lesson as AnyRecord).__completed);
    if (next) return next;
  }
  return modules.flatMap((module) => module.lessons)[0] || null;
}

function buildModuleViews(modules: Module[], lessons: Lesson[], progress: UserProgress[]): ModuleView[] {
  return sortModules(modules).map((module, moduleIndex) => {
    const moduleLessons = sortLessons(lessons.filter((lesson) => lesson.module_id === module.id)).map((lesson) => ({
      ...lesson,
      __completed: isLessonCompleted(progress, lesson.id),
    })) as Lesson[];

    const totalLessons = moduleLessons.length;
    const completedLessons = moduleLessons.filter((lesson) => Boolean((lesson as AnyRecord).__completed)).length;
    const previousModules = sortModules(modules).slice(0, moduleIndex);
    const previousLessonIds = previousModules.flatMap((previous) => lessons.filter((lesson) => lesson.module_id === previous.id).map((lesson) => lesson.id));
    const previousDone = previousLessonIds.length === 0 || previousLessonIds.every((id) => isLessonCompleted(progress, id));

    return {
      ...module,
      titleSafe: safeString(module.title || module.name, `Módulo ${moduleIndex + 1}`),
      lessons: moduleLessons,
      completedLessons,
      totalLessons,
      progress: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0,
      locked: module.is_locked === true || !previousDone,
    };
  });
}

function buildNotifications(courseViews: CourseView[], certificates: Certificate[]): NotificationItem[] {
  const issued = certificates.length;
  const advanced = courseViews.find((course) => course.progress >= 70 && course.progress < 100);

  return [
    issued
      ? { id: "cert-ok", title: "Certificado disponible", message: `Tienes ${issued} credencial${issued === 1 ? "" : "es"} emitida${issued === 1 ? "" : "s"}.`, time: "Ahora", type: "certificate" }
      : { id: "cert-empty", title: "Certificación en progreso", message: "Completa módulos y aprueba el examen final para emitir tu primera credencial.", time: "Hoy", type: "info" },
    advanced
      ? { id: "progress", title: "Muy cerca del objetivo", message: `${advanced.titleSafe} está al ${advanced.progress}% de avance.`, time: "Reciente", type: "success" }
      : { id: "progress-start", title: "Siguiente paso", message: "Continúa con tu próxima lección recomendada.", time: "Hoy", type: "info" },
  ];
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="ghc-stat-card">
      <div className="ghc-stat-value">{value}</div>
      <div className="ghc-stat-label">{label}</div>
      {hint ? <div className="ghc-stat-hint">{hint}</div> : null}
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="ghc-progress-track">
      <div className="ghc-progress-fill" style={{ width: formatPercent(value) }} />
    </div>
  );
}

function GlobalStyles() {
  return (
    <style jsx global>{`
      :root { color-scheme: dark; }
      * { box-sizing: border-box; }
      body { margin: 0; background: ${BG}; color: ${TEXT}; }
      a { color: inherit; text-decoration: none; }
      button, input, select { font: inherit; }

      .ghc-shell {
        min-height: 100vh;
        background:
          radial-gradient(circle at 18% 0%, rgba(99,229,70,.13), transparent 31%),
          radial-gradient(circle at 80% 10%, rgba(255,255,255,.06), transparent 30%),
          ${BG};
        display: grid;
        grid-template-columns: 286px 1fr;
      }

      .ghc-sidebar {
        position: sticky;
        top: 0;
        height: 100vh;
        padding: 28px 20px;
        border-right: 1px solid ${BORDER};
        background: linear-gradient(180deg, rgba(7,10,8,.98), rgba(12,16,14,.9));
        backdrop-filter: blur(18px);
      }

      .ghc-brand {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 34px;
      }

      .ghc-brand-text {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .ghc-brand-title {
        font-size: 14px;
        font-weight: 900;
        letter-spacing: .14em;
        text-transform: uppercase;
      }

      .ghc-brand-subtitle {
        color: ${MUTED};
        font-size: 12px;
      }

      .ghc-nav {
        display: grid;
        gap: 10px;
      }

      .ghc-nav-button {
        width: 100%;
        border: 1px solid transparent;
        color: ${MUTED};
        background: transparent;
        border-radius: 18px;
        padding: 13px 14px;
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        text-align: left;
        transition: .2s ease;
      }

      .ghc-nav-button:hover {
        color: ${TEXT};
        background: rgba(255,255,255,.05);
      }

      .ghc-nav-button.is-active {
        color: #071008;
        background: linear-gradient(135deg, ${GREEN}, ${GHC_GREEN});
        box-shadow: 0 18px 48px rgba(99,229,70,.22);
        font-weight: 900;
      }

      .ghc-sidebar-card {
        position: absolute;
        left: 20px;
        right: 20px;
        bottom: 22px;
        padding: 18px;
        border: 1px solid rgba(99,229,70,.2);
        border-radius: 24px;
        background: radial-gradient(circle at top right, rgba(99,229,70,.18), transparent 40%), rgba(255,255,255,.04);
      }

      .ghc-main {
        min-width: 0;
        padding: 22px 30px 44px;
      }

      .ghc-topbar {
        min-height: 76px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 16px;
      }

      .ghc-breadcrumb {
        color: ${STEEL};
        font-size: 13px;
        margin-bottom: 5px;
      }

      .ghc-page-title {
        margin: 0;
        font-size: clamp(32px, 4vw, 56px);
        line-height: .96;
        letter-spacing: -.05em;
      }

      .ghc-page-subtitle {
        color: ${MUTED};
        max-width: 760px;
        line-height: 1.65;
        margin: 12px 0 0;
      }

      .ghc-top-actions {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .ghc-search {
        min-width: 260px;
        border: 1px solid ${BORDER};
        border-radius: 999px;
        background: rgba(255,255,255,.05);
        color: ${TEXT};
        padding: 12px 15px;
        outline: none;
      }

      .ghc-icon-button {
        position: relative;
        width: 46px;
        height: 46px;
        border-radius: 999px;
        border: 1px solid ${BORDER};
        background: rgba(255,255,255,.05);
        color: ${TEXT};
        cursor: pointer;
      }

      .ghc-dot {
        position: absolute;
        right: 10px;
        top: 10px;
        width: 9px;
        height: 9px;
        border-radius: 999px;
        background: ${GREEN};
        box-shadow: 0 0 18px rgba(99,229,70,.75);
      }

      .ghc-notifications {
        position: absolute;
        right: 30px;
        top: 82px;
        z-index: 20;
        width: 360px;
        border: 1px solid ${BORDER};
        border-radius: 24px;
        background: rgba(8,12,10,.96);
        box-shadow: 0 24px 80px rgba(0,0,0,.5);
        padding: 14px;
      }

      .ghc-notification {
        padding: 13px;
        border-radius: 18px;
        background: rgba(255,255,255,.045);
        margin-top: 9px;
      }

      .ghc-grid {
        display: grid;
        gap: 18px;
      }

      .ghc-grid-3 {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .ghc-card {
        border: 1px solid ${BORDER};
        border-radius: 28px;
        background: ${CARD};
        box-shadow: 0 22px 70px rgba(0,0,0,.28);
        backdrop-filter: blur(18px);
      }

      .ghc-card-inner {
        padding: 22px;
      }

      .ghc-card-title {
        margin: 0;
        font-size: 18px;
        letter-spacing: -.02em;
      }

      .ghc-kicker {
        color: ${GREEN};
        text-transform: uppercase;
        letter-spacing: .16em;
        font-size: 11px;
        font-weight: 900;
      }

      .ghc-stat-card {
        border: 1px solid ${BORDER};
        border-radius: 26px;
        padding: 20px;
        background: linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.035));
      }

      .ghc-stat-value {
        font-size: 34px;
        font-weight: 950;
        letter-spacing: -.05em;
      }

      .ghc-stat-label {
        color: ${TEXT};
        font-weight: 800;
        margin-top: 5px;
      }

      .ghc-stat-hint {
        color: ${MUTED};
        font-size: 13px;
        margin-top: 8px;
      }

      .ghc-progress-track {
        height: 9px;
        border-radius: 999px;
        overflow: hidden;
        background: rgba(255,255,255,.09);
      }

      .ghc-progress-fill {
        height: 100%;
        border-radius: 999px;
        background: linear-gradient(90deg, ${GHC_GREEN}, ${GREEN});
        box-shadow: 0 0 24px rgba(99,229,70,.55);
      }

      .ghc-button {
        border: 0;
        cursor: pointer;
        border-radius: 999px;
        padding: 12px 17px;
        font-weight: 900;
        background: linear-gradient(135deg, ${GREEN}, ${GHC_GREEN});
        color: #061006;
        box-shadow: 0 16px 40px rgba(99,229,70,.22);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .ghc-button-ghost {
        border: 1px solid ${BORDER};
        background: rgba(255,255,255,.05);
        color: ${TEXT};
        box-shadow: none;
      }

      .ghc-course-card {
        min-height: 260px;
        border-radius: 30px;
        border: 1px solid ${BORDER};
        overflow: hidden;
        position: relative;
        padding: 22px;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        box-shadow: 0 24px 80px rgba(0,0,0,.32);
      }

      .ghc-course-card:before {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, transparent, rgba(0,0,0,.72));
      }

      .ghc-course-card > * {
        position: relative;
        z-index: 1;
      }

      .ghc-pill {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        width: fit-content;
        border: 1px solid rgba(99,229,70,.24);
        background: rgba(99,229,70,.09);
        color: ${GREEN};
        border-radius: 999px;
        padding: 7px 10px;
        font-size: 12px;
        font-weight: 900;
      }

      .cert-hero {
        position: relative;
        overflow: hidden;
        min-height: 360px;
        display: grid;
        grid-template-columns: minmax(0, 1.05fr) minmax(360px, .95fr);
        gap: 24px;
        border-radius: 36px;
        border: 1px solid rgba(255,255,255,.11);
        background:
          radial-gradient(circle at 75% 18%, rgba(99,229,70,.22), transparent 34%),
          linear-gradient(135deg, rgba(18,24,20,.95), rgba(6,8,7,.98));
        box-shadow: 0 30px 110px rgba(0,0,0,.42);
        padding: 34px;
      }

      .cert-hero:after {
        content: "";
        position: absolute;
        inset: auto -10% -50% 35%;
        height: 300px;
        background: radial-gradient(circle, rgba(99,229,70,.2), transparent 65%);
        filter: blur(20px);
      }

      .cert-hero-left,
      .cert-hero-art {
        position: relative;
        z-index: 1;
      }

      .cert-hero h2 {
        margin: 12px 0 14px;
        font-size: clamp(42px, 6vw, 78px);
        line-height: .9;
        letter-spacing: -.07em;
        max-width: 720px;
      }

      .cert-benefits {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        margin-top: 26px;
      }

      .cert-benefit {
        border: 1px solid rgba(255,255,255,.09);
        border-radius: 20px;
        padding: 14px;
        background: rgba(255,255,255,.045);
        color: ${MUTED};
        font-size: 13px;
        line-height: 1.35;
      }

      .cert-benefit strong {
        display: block;
        color: ${TEXT};
        margin: 8px 0 3px;
      }

      .cert-hero-art {
        display: grid;
        place-items: center;
        perspective: 1200px;
      }

      .cert-paper {
        width: min(380px, 100%);
        aspect-ratio: 1.36 / 1;
        border-radius: 18px;
        padding: 28px 30px;
        color: #1e1a12;
        background:
          radial-gradient(circle at 20% 10%, rgba(255,255,255,.9), transparent 26%),
          linear-gradient(135deg, #fff4d5, #d9c394);
        box-shadow: 0 36px 90px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.45) inset;
        transform: rotate(-8deg) rotateY(-12deg);
        position: relative;
      }

      .cert-paper:before {
        content: "";
        position: absolute;
        inset: 14px;
        border: 2px solid rgba(110,80,35,.28);
        border-radius: 12px;
      }

      .cert-paper-title {
        position: relative;
        text-align: center;
        font-weight: 950;
        letter-spacing: .18em;
        font-size: 29px;
        margin-top: 18px;
      }

      .cert-paper-sub {
        position: relative;
        text-align: center;
        letter-spacing: .34em;
        font-size: 12px;
        margin-top: 6px;
      }

      .cert-paper-name {
        position: relative;
        text-align: center;
        font-family: Georgia, serif;
        font-size: 34px;
        margin-top: 32px;
      }

      .cert-paper-line {
        position: relative;
        height: 1px;
        background: rgba(60,45,22,.42);
        margin: 8px auto 0;
        width: 72%;
      }

      .cert-seal {
        position: absolute;
        right: 34px;
        bottom: 34px;
        width: 62px;
        height: 62px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        color: #3d2b06;
        font-weight: 950;
        background: radial-gradient(circle, #ffe78f, #b88720);
        box-shadow: 0 12px 24px rgba(82,50,0,.25);
      }

      .cert-sign {
        position: absolute;
        left: 34px;
        bottom: 38px;
        font-family: Georgia, serif;
        font-size: 18px;
      }

      .cert-layout {
        display: grid;
        grid-template-columns: minmax(0, 1.35fr) minmax(330px, .65fr);
        gap: 18px;
        margin-top: 18px;
      }

      .cert-list {
        display: grid;
        gap: 14px;
      }

      .cert-card {
        display: grid;
        grid-template-columns: 166px 1fr;
        gap: 18px;
        border: 1px solid rgba(255,255,255,.1);
        border-radius: 26px;
        padding: 16px;
        background: linear-gradient(135deg, rgba(255,255,255,.07), rgba(255,255,255,.035));
      }

      .cert-thumb {
        min-height: 116px;
        border-radius: 20px;
        border: 1px solid rgba(99,229,70,.35);
        background:
          radial-gradient(circle at 75% 15%, rgba(99,229,70,.2), transparent 34%),
          linear-gradient(135deg, #101713, #060706);
        padding: 15px;
        position: relative;
        overflow: hidden;
      }

      .cert-thumb-title {
        font-size: 11px;
        color: ${GREEN};
        letter-spacing: .18em;
        font-weight: 950;
      }

      .cert-thumb-name {
        margin-top: 20px;
        font-weight: 950;
        font-size: 19px;
        letter-spacing: -.03em;
      }

      .cert-thumb-line {
        height: 1px;
        background: rgba(255,255,255,.18);
        margin-top: 12px;
      }

      .cert-lock {
        display: grid;
        place-items: center;
        min-height: 116px;
        border-radius: 20px;
        border: 1px solid rgba(255,255,255,.11);
        background: linear-gradient(135deg, rgba(255,255,255,.055), rgba(255,255,255,.02));
        color: ${MUTED};
        font-size: 34px;
      }

      .cert-badge {
        display: inline-flex;
        width: fit-content;
        border-radius: 999px;
        padding: 7px 10px;
        font-size: 12px;
        font-weight: 950;
        border: 1px solid rgba(99,229,70,.25);
        background: rgba(99,229,70,.1);
        color: ${GREEN};
      }

      .cert-badge.locked {
        border-color: rgba(255,255,255,.13);
        background: rgba(255,255,255,.05);
        color: ${MUTED};
      }

      .cert-meta {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        margin: 14px 0;
      }

      .cert-meta-box {
        border: 1px solid rgba(255,255,255,.08);
        border-radius: 16px;
        padding: 10px;
        background: rgba(0,0,0,.16);
      }

      .cert-meta-box span {
        display: block;
        color: ${STEEL};
        font-size: 11px;
        margin-bottom: 3px;
      }

      .steps {
        display: grid;
        gap: 11px;
        margin-top: 16px;
      }

      .step {
        display: grid;
        grid-template-columns: 34px 1fr;
        gap: 11px;
        align-items: start;
      }

      .step-num {
        width: 34px;
        height: 34px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        background: rgba(99,229,70,.1);
        color: ${GREEN};
        border: 1px solid rgba(99,229,70,.22);
        font-weight: 950;
      }

      .ring {
        width: 132px;
        height: 132px;
        border-radius: 999px;
        margin: 18px auto;
        display: grid;
        place-items: center;
        background: conic-gradient(${GREEN} var(--value), rgba(255,255,255,.09) 0);
      }

      .ring-inner {
        width: 98px;
        height: 98px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        background: #0b100d;
        font-size: 28px;
        font-weight: 950;
      }

      .empty {
        border: 1px dashed rgba(99,229,70,.28);
        border-radius: 28px;
        padding: 26px;
        background: rgba(99,229,70,.045);
        text-align: center;
        color: ${MUTED};
      }

      @media (max-width: 1120px) {
        .ghc-shell { grid-template-columns: 1fr; }
        .ghc-sidebar { position: relative; height: auto; }
        .ghc-sidebar-card { position: static; margin-top: 20px; }
        .cert-hero, .cert-layout { grid-template-columns: 1fr; }
        .ghc-grid-3 { grid-template-columns: 1fr; }
      }

      @media (max-width: 720px) {
        .ghc-main { padding: 18px; }
        .ghc-topbar { align-items: flex-start; flex-direction: column; }
        .ghc-search { min-width: 0; width: 100%; }
        .cert-hero { padding: 22px; }
        .cert-benefits, .cert-card, .cert-meta { grid-template-columns: 1fr; }
      }
    `}</style>
  );
}

export default function AlumnoPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [loading, setLoading] = useState<LoadingState>("loading");
  const [error, setError] = useState<string>("");
  const [user, setUser] = useState<AnyRecord | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [query, setQuery] = useState("");
  const [courseViewMode, setCourseViewMode] = useState<"grid" | "list">("grid");
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!supabase) {
      setError("Faltan las variables NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      setLoading("error");
      return;
    }

    setLoading("loading");
    setError("");

    try {
      const sessionResult = await supabase.auth.getSession();
      const sessionUser = sessionResult.data.session?.user || null;

      if (!sessionUser) {
        router.replace("/login");
        return;
      }

      setUser(sessionUser as AnyRecord);

      const [coursesResult, modulesResult, lessonsResult, progressResult, certificatesResult] = await Promise.all([
        supabase.from("courses").select("*"),
        supabase.from("modules").select("*"),
        supabase.from("lessons").select("*"),
        supabase.from("user_progress").select("*").eq("user_id", sessionUser.id),
        supabase.from("certificates").select("*").eq("user_id", sessionUser.id),
      ]);

      if (coursesResult.error) throw coursesResult.error;
      if (modulesResult.error) throw modulesResult.error;
      if (lessonsResult.error) throw lessonsResult.error;

      setCourses(asArray(coursesResult.data as Course[]).filter(isVisibleCourse));
      setModules(asArray(modulesResult.data as Module[]));
      setLessons(asArray(lessonsResult.data as Lesson[]));
      setProgress(asArray(progressResult.data as UserProgress[]));
      setCertificates(asArray(certificatesResult.data as Certificate[]));
      setLoading("ready");
    } catch (err: any) {
      setError(err?.message || "No se pudo cargar el dashboard del alumno.");
      setLoading("error");
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const courseViews = useMemo<CourseView[]>(() => {
    return courses.map((course) => {
      const courseLessons = lessons.filter((lesson) => lesson.course_id === course.id);
      const courseModules = modules.filter((module) => module.course_id === course.id);
      const moduleViews = buildModuleViews(courseModules, courseLessons, progress);
      const completedLessons = courseLessons.filter((lesson) => isLessonCompleted(progress, lesson.id)).length;
      const totalLessons = courseLessons.length;
      const certificate = certificates.find((item) => item.course_id === course.id) || null;

      return {
        ...course,
        titleSafe: safeString(course.title || course.name, "Curso GHC Academy"),
        descriptionSafe: safeString(course.short_description || course.description, "Formación profesional basada en ciencia, práctica y criterio real."),
        slugSafe: getCourseSlug(course),
        imageSafe: getCourseImage(course),
        modules: moduleViews,
        lessons: sortLessons(courseLessons),
        completedLessons,
        totalLessons,
        progress: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0,
        nextLesson: findNextLesson(moduleViews),
        certificate,
      };
    });
  }, [courses, modules, lessons, progress, certificates]);

  const filteredCourses = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return courseViews;

    return courseViews.filter((course) =>
      `${course.titleSafe} ${course.descriptionSafe} ${course.category || ""} ${course.level || ""}`
        .toLowerCase()
        .includes(needle)
    );
  }, [courseViews, query]);

  const notifications = useMemo(() => buildNotifications(courseViews, certificates), [courseViews, certificates]);
  const totalLessons = courseViews.reduce((sum, course) => sum + course.totalLessons, 0);
  const completedLessons = courseViews.reduce((sum, course) => sum + course.completedLessons, 0);
  const globalProgress = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const issuedCertificates = certificates.length;
  const inProgressCertificates = courseViews.filter((course) => !course.certificate && course.progress > 0 && course.progress < 100).length;
  const blockedCertificates = Math.max(0, courseViews.length - issuedCertificates - inProgressCertificates);

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut();
    router.replace("/login");
  }

  const pageCopy: Record<ActiveTab, { title: string; subtitle: string }> = {
    dashboard: {
      title: "Panel alumno",
      subtitle: "Tu centro de control para avanzar, revisar progreso y continuar tu formación GHC Academy.",
    },
    courses: {
      title: "Mis cursos",
      subtitle: "Filtra, busca y continúa tus programas activos desde una experiencia premium y enfocada.",
    },
    curriculum: {
      title: "Itinerario",
      subtitle: "Visualiza módulos, lecciones, bloqueos y el siguiente paso recomendado.",
    },
    exams: {
      title: "Simulador de exámenes",
      subtitle: "Prepárate para las evaluaciones de módulo y para el examen final del curso.",
    },
    certificates: {
      title: "Certificados",
      subtitle: "Obtén credenciales oficiales de GHC Academy y demuestra tu experiencia.",
    },
  };

  if (loading === "loading") {
    return (
      <>
        <GlobalStyles />
        <main className="ghc-shell" style={{ display: "grid", placeItems: "center", gridTemplateColumns: "1fr" }}>
          <div className="ghc-card" style={{ padding: 34, textAlign: "center", maxWidth: 520 }}>
            <GHCLogo />
            <h1 style={{ margin: "22px 0 8px" }}>Cargando GHC Academy</h1>
            <p style={{ color: MUTED, margin: 0 }}>Preparando cursos, progreso y credenciales del alumno.</p>
          </div>
        </main>
      </>
    );
  }

  if (loading === "error") {
    return (
      <>
        <GlobalStyles />
        <main className="ghc-shell" style={{ display: "grid", placeItems: "center", gridTemplateColumns: "1fr" }}>
          <div className="ghc-card" style={{ padding: 34, maxWidth: 640 }}>
            <h1>No se pudo cargar el dashboard</h1>
            <p style={{ color: MUTED }}>{error}</p>
            <button className="ghc-button" onClick={loadData}>
              Reintentar
            </button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <GlobalStyles />
      <main className="ghc-shell">
        <aside className="ghc-sidebar">
          <div className="ghc-brand">
            <GHCLogo />
            <div className="ghc-brand-text">
              <div className="ghc-brand-title">GHC Academy</div>
              <div className="ghc-brand-subtitle">Sport Through Science</div>
            </div>
          </div>

          <nav className="ghc-nav" aria-label="Panel alumno">
            {[
              ["dashboard", "Panel", "⌁"],
              ["courses", "Mis cursos", "▦"],
              ["curriculum", "Itinerario", "☷"],
              ["exams", "Exámenes", "◈"],
              ["certificates", "Certificados", "✦"],
            ].map(([key, label, icon]) => (
              <button key={key} className={`ghc-nav-button ${activeTab === key ? "is-active" : ""}`} onClick={() => setActiveTab(key as ActiveTab)}>
                <span>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="ghc-sidebar-card">
            <div className="ghc-kicker">Progreso global</div>
            <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", margin: "10px 0" }}>
              <strong style={{ fontSize: 34, letterSpacing: "-.05em" }}>{formatPercent(globalProgress)}</strong>
              <span style={{ color: MUTED, fontSize: 13 }}>
                {completedLessons}/{totalLessons} lecciones
              </span>
            </div>
            <ProgressBar value={globalProgress} />
          </div>
        </aside>

        <section className="ghc-main">
          <header className="ghc-topbar">
            <div>
              <div className="ghc-breadcrumb">Alumno / Dashboard / {pageCopy[activeTab].title}</div>
              <h1 className="ghc-page-title">{pageCopy[activeTab].title}</h1>
              <p className="ghc-page-subtitle">{pageCopy[activeTab].subtitle}</p>
            </div>

            <div className="ghc-top-actions">
              <input className="ghc-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cursos, módulos..." />
              <button className="ghc-icon-button" onClick={() => setNotificationsOpen((value) => !value)} aria-label="Notificaciones">
                ♢<span className="ghc-dot" />
              </button>
              <button className="ghc-button ghc-button-ghost" onClick={handleLogout}>
                Salir
              </button>
            </div>
          </header>

          {notificationsOpen ? (
            <div className="ghc-notifications">
              <strong>Notificaciones</strong>
              {notifications.map((item) => (
                <div className="ghc-notification" key={item.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <strong>{item.title}</strong>
                    <span style={{ color: STEEL, fontSize: 12 }}>{item.time}</span>
                  </div>
                  <p style={{ color: MUTED, margin: "6px 0 0", fontSize: 13 }}>{item.message}</p>
                </div>
              ))}
            </div>
          ) : null}

          {activeTab === "dashboard" ? renderDashboard() : null}
          {activeTab === "courses" ? renderCourses() : null}
          {activeTab === "curriculum" ? renderCurriculum() : null}
          {activeTab === "exams" ? renderExams() : null}
          {activeTab === "certificates" ? renderCertificates() : null}
        </section>
      </main>
    </>
  );

  function renderDashboard() {
    const nextCourse = courseViews.find((course) => course.nextLesson) || courseViews[0];

    return (
      <div className="ghc-grid">
        <div className="ghc-grid ghc-grid-3">
          <StatCard label="Cursos activos" value={courseViews.length} hint="Programas disponibles" />
          <StatCard label="Progreso total" value={formatPercent(globalProgress)} hint="Media de lecciones completadas" />
          <StatCard label="Certificados" value={issuedCertificates} hint="Credenciales emitidas" />
        </div>

        <div className="ghc-card">
          <div className="ghc-card-inner" style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 18 }}>
            <div>
              <div className="ghc-kicker">Siguiente acción</div>
              <h2 style={{ fontSize: 34, margin: "10px 0", letterSpacing: "-.04em" }}>{nextCourse?.titleSafe || "Empieza tu formación"}</h2>
              <p style={{ color: MUTED, lineHeight: 1.7 }}>{nextCourse?.descriptionSafe || "Cuando tengas cursos activos, aparecerá aquí la próxima lección recomendada."}</p>
              {nextCourse ? (
                <Link className="ghc-button" href={`/cursos/${nextCourse.slugSafe}`}>
                  Continuar curso
                </Link>
              ) : null}
            </div>
            <div className="ghc-card" style={{ background: nextCourse ? getPremiumCourseBackground(nextCourse) : CARD_2, minHeight: 230 }} />
          </div>
        </div>
      </div>
    );
  }

  function renderCourses() {
    return (
      <div className="ghc-grid">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div className="ghc-pill">{filteredCourses.length} cursos encontrados</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className={`ghc-button ${courseViewMode === "grid" ? "" : "ghc-button-ghost"}`} onClick={() => setCourseViewMode("grid")}>
              Grid
            </button>
            <button className={`ghc-button ${courseViewMode === "list" ? "" : "ghc-button-ghost"}`} onClick={() => setCourseViewMode("list")}>
              Lista
            </button>
          </div>
        </div>

        <div className="ghc-grid" style={{ gridTemplateColumns: courseViewMode === "grid" ? "repeat(auto-fit, minmax(280px, 1fr))" : "1fr" }}>
          {filteredCourses.map((course, index) => (
            <article key={course.id} className="ghc-course-card" style={{ background: getPremiumCourseBackground(course, index) }}>
              <span className="ghc-pill">{course.level || "GHC Academy"}</span>
              <h2 style={{ margin: "14px 0 8px", fontSize: 26 }}>{course.titleSafe}</h2>
              <p style={{ color: MUTED, lineHeight: 1.55 }}>{course.descriptionSafe}</p>
              <div style={{ marginTop: 14 }}>
                <ProgressBar value={course.progress} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
                <span style={{ color: MUTED }}>{formatPercent(course.progress)}</span>
                <Link className="ghc-button" href={`/cursos/${course.slugSafe}`}>
                  Entrar
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  }

  function renderCurriculum() {
    return (
      <div className="ghc-grid">
        {filteredCourses.map((course) => (
          <section className="ghc-card" key={course.id}>
            <div className="ghc-card-inner">
              <div className="ghc-kicker">Curriculum</div>
              <h2 className="ghc-card-title" style={{ fontSize: 28 }}>
                {course.titleSafe}
              </h2>
              <div style={{ margin: "14px 0 20px" }}>
                <ProgressBar value={course.progress} />
              </div>
              <div className="ghc-grid">
                {course.modules.length ? (
                  course.modules.map((module) => (
                    <div key={module.id} className="ghc-card" style={{ background: CARD_2 }}>
                      <div className="ghc-card-inner">
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <strong>
                            {module.locked ? "🔒 " : "✓ "}
                            {module.titleSafe}
                          </strong>
                          <span style={{ color: GREEN }}>{formatPercent(module.progress)}</span>
                        </div>
                        <div style={{ margin: "12px 0" }}>
                          <ProgressBar value={module.progress} />
                        </div>
                        <div style={{ display: "grid", gap: 8 }}>
                          {module.lessons.map((lesson) => (
                            <div key={lesson.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: `1px solid ${BORDER}` }}>
                              <span>
                                {getLessonIcon(lesson)} {safeString(lesson.title || lesson.name, "Lección")}
                              </span>
                              <span style={{ color: (lesson as AnyRecord).__completed ? GREEN : MUTED }}>{(lesson as AnyRecord).__completed ? "Completada" : getLessonType(lesson)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty">Este curso todavía no tiene módulos publicados.</div>
                )}
              </div>
            </div>
          </section>
        ))}
      </div>
    );
  }

  function renderExams() {
    return (
      <div className="ghc-grid ghc-grid-3">
        <div className="ghc-card">
          <div className="ghc-card-inner">
            <div className="ghc-kicker">Módulos</div>
            <h2>Exámenes por módulo</h2>
            <p style={{ color: MUTED }}>Desbloqueados al completar cada bloque formativo.</p>
          </div>
        </div>
        <div className="ghc-card">
          <div className="ghc-card-inner">
            <div className="ghc-kicker">Final</div>
            <h2>Examen final</h2>
            <p style={{ color: MUTED }}>Necesario para emitir la credencial oficial del curso.</p>
          </div>
        </div>
        <div className="ghc-card">
          <div className="ghc-card-inner">
            <div className="ghc-kicker">Simulación</div>
            <h2>Preparación</h2>
            <p style={{ color: MUTED }}>Repasa conocimientos antes de validar tu certificación.</p>
          </div>
        </div>
      </div>
    );
  }

  function renderCertificates() {
    const firstCertificate = certificates[0] || null;
    const firstCertifiedCourse = firstCertificate ? courseViews.find((course) => course.id === firstCertificate.course_id) : null;
    const nextCertCourse = courseViews.find((course) => !course.certificate) || courseViews[0] || null;
    const ringValue = Math.min(100, Math.max(8, issuedCertificates ? 100 : globalProgress));

    return (
      <div className="ghc-grid">
        <section className="cert-hero">
          <div className="cert-hero-left">
            <div className="ghc-kicker">Credenciales oficiales</div>
            <h2>Valida. Demuestra. Avanza.</h2>
            <p className="ghc-page-subtitle" style={{ margin: 0 }}>
              Los certificados GHC Academy validan tus conocimientos con una credencial profesional, verificable y preparada para reforzar tu perfil en el sector del entrenamiento, la nutrición y la salud.
            </p>
            <div className="cert-benefits">
              <div className="cert-benefit">
                <span>◎</span>
                <strong>Confiable por profesionales</strong>
                Formación diseñada con criterio técnico y aplicación real.
              </div>
              <div className="cert-benefit">
                <span>▣</span>
                <strong>Credenciales verificables</strong>
                Código único para confirmar autenticidad y trazabilidad.
              </div>
              <div className="cert-benefit">
                <span>✦</span>
                <strong>Reconocido en la industria</strong>
                Un distintivo premium para demostrar avance y especialización.
              </div>
            </div>
          </div>

          <div className="cert-hero-art" aria-hidden="true">
            <div className="cert-paper">
              <div className="cert-paper-title">CERTIFICADO</div>
              <div className="cert-paper-sub">DE LOGRO</div>
              <div className="cert-paper-name">John Doe</div>
              <div className="cert-paper-line" />
              <div style={{ position: "relative", textAlign: "center", marginTop: 14, fontSize: 12 }}>GHC ACADEMY · SPORT THROUGH SCIENCE</div>
              <div className="cert-sign">GHC Academy</div>
              <div className="cert-seal">GHC</div>
            </div>
          </div>
        </section>

        <section className="cert-layout">
          <div className="ghc-card">
            <div className="ghc-card-inner">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div className="ghc-kicker">Credenciales</div>
                  <h2 className="ghc-card-title" style={{ fontSize: 28 }}>
                    Certificados disponibles
                  </h2>
                </div>
                <span className="ghc-pill">{issuedCertificates} emitidos</span>
              </div>

              <div className="cert-list">
                {firstCertificate ? (
                  <article className="cert-card">
                    <div className="cert-thumb">
                      <div className="cert-thumb-title">GHC CERTIFICATE</div>
                      <div className="cert-thumb-name">{safeString(firstCertificate.title || firstCertificate.course_title || firstCertifiedCourse?.titleSafe, "Certificado oficial")}</div>
                      <div className="cert-thumb-line" />
                      <div style={{ position: "absolute", right: 14, bottom: 14, color: GREEN, fontWeight: 950 }}>✓</div>
                    </div>
                    <div>
                      <span className="cert-badge">Emitido</span>
                      <h3 style={{ fontSize: 24, margin: "12px 0 8px" }}>{safeString(firstCertificate.title || firstCertificate.course_title || firstCertifiedCourse?.titleSafe, "Certificado oficial GHC Academy")}</h3>
                      <p style={{ color: MUTED, lineHeight: 1.6, margin: 0 }}>{safeString(firstCertificate.description, "Credencial emitida tras completar los requisitos del curso y superar la evaluación final.")}</p>
                      <div className="cert-meta">
                        <div className="cert-meta-box">
                          <span>Nota</span>
                          {safeString(firstCertificate.grade || firstCertificate.final_score || firstCertificate.score, "Aprobado")}
                        </div>
                        <div className="cert-meta-box">
                          <span>Fecha</span>
                          {formatDate(firstCertificate.issued_at || firstCertificate.created_at)}
                        </div>
                        <div className="cert-meta-box">
                          <span>ID</span>
                          {safeString(firstCertificate.certificate_code || firstCertificate.code || firstCertificate.verification_code, firstCertificate.id.slice(0, 8).toUpperCase())}
                        </div>
                      </div>
                      {firstCertificate.verification_url ? (
                        <Link className="ghc-button" href={firstCertificate.verification_url}>
                          Ver certificado
                        </Link>
                      ) : (
                        <button className="ghc-button">Ver certificado</button>
                      )}
                    </div>
                  </article>
                ) : (
                  <div className="empty">
                    <h3 style={{ color: TEXT, marginTop: 0 }}>Aún no tienes certificados emitidos</h3>
                    Completa los módulos, aprueba el examen final y aquí aparecerá tu credencial oficial con código de verificación.
                  </div>
                )}

                <article className="cert-card">
                  <div className="cert-lock">🔒</div>
                  <div>
                    <span className="cert-badge locked">Bloqueado</span>
                    <h3 style={{ fontSize: 24, margin: "12px 0 8px" }}>{nextCertCourse ? nextCertCourse.titleSafe : "Próxima certificación"}</h3>
                    <p style={{ color: MUTED, lineHeight: 1.6, margin: 0 }}>Avanza en el itinerario, desbloquea módulos y supera la evaluación final para liberar esta credencial.</p>
                    <div style={{ marginTop: 18 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", color: MUTED, fontSize: 13, marginBottom: 8 }}>
                        <span>Progreso estimado</span>
                        <span>{formatPercent(nextCertCourse?.progress || 0)}</span>
                      </div>
                      <ProgressBar value={nextCertCourse?.progress || 0} />
                    </div>
                  </div>
                </article>

                <button className="ghc-button ghc-button-ghost" style={{ width: "100%" }}>
                  Ver todos los certificados
                </button>
              </div>
            </div>
          </div>

          <aside className="ghc-grid">
            <div className="ghc-card">
              <div className="ghc-card-inner">
                <div className="ghc-kicker">Proceso</div>
                <h2 className="ghc-card-title">Cómo funciona</h2>
                <div className="steps">
                  {["Completa módulos", "Aprueba examen final", "Recibe certificado", "Verifica y comparte"].map((step, index) => (
                    <div className="step" key={step}>
                      <div className="step-num">{index + 1}</div>
                      <div>
                        <strong>{step}</strong>
                        <p style={{ margin: "4px 0 0", color: MUTED, fontSize: 13 }}>Paso necesario para validar tu avance académico.</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="ghc-card">
              <div className="ghc-card-inner">
                <div className="ghc-kicker">Seguridad</div>
                <h2 className="ghc-card-title">Verificación</h2>
                <p style={{ color: MUTED, lineHeight: 1.6 }}>Cada certificado puede asociarse a un código único para consulta pública, validación interna y trazabilidad de credenciales.</p>
                <div className="ghc-pill">🛡 Verificación pública segura</div>
              </div>
            </div>

            <div className="ghc-card">
              <div className="ghc-card-inner">
                <div className="ghc-kicker">Estado</div>
                <h2 className="ghc-card-title">Estado de credenciales</h2>
                <div className="ring" style={{ ["--value" as any]: `${ringValue}%` }}>
                  <div className="ring-inner">{issuedCertificates}</div>
                </div>
                <div className="cert-meta" style={{ gridTemplateColumns: "1fr" }}>
                  <div className="cert-meta-box">
                    <span>Emitidos</span>
                    {issuedCertificates}
                  </div>
                  <div className="cert-meta-box">
                    <span>En progreso</span>
                    {inProgressCertificates}
                  </div>
                  <div className="cert-meta-box">
                    <span>Bloqueados</span>
                    {blockedCertificates}
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </div>
    );
  }
}
