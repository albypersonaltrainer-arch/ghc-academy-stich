"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";

type CertificateStatus = "valid" | "revoked" | string;

type CertificateRecord = {
  id?: string | null;
  certificate_code?: string | null;
  verification_slug?: string | null;
  student_name?: string | null;
  course_title?: string | null;
  final_score?: number | string | null;
  issued_at?: string | null;
  status?: CertificateStatus | null;
};

type LoadState = "loading" | "ready" | "not-found" | "error";

const GHC_GREEN = "#22D65B";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function normalizeIdentifier(value: string | string[] | undefined) {
  if (!value) return "";
  const raw = Array.isArray(value) ? value[0] : value;

  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}

function formatDate(value?: string | null) {
  if (!value) return "Fecha no disponible";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Fecha no disponible";

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatScore(value?: number | string | null) {
  if (value === null || value === undefined || value === "") {
    return "No disponible";
  }

  const numeric = Number(value);

  if (Number.isNaN(numeric)) return String(value);

  return `${numeric.toLocaleString("es-ES", {
    maximumFractionDigits: 1,
  })}%`;
}

function getStatusLabel(status?: CertificateStatus | null) {
  return status === "revoked" ? "REVOCADO" : "VÁLIDO";
}

function getStatusDescription(status?: CertificateStatus | null) {
  return status === "revoked"
    ? "Este certificado figura como revocado en el sistema académico de GHC Academy."
    : "Este certificado figura como válido y verificable en el sistema académico de GHC Academy.";
}

function readPreviewCertificate(identifier: string): CertificateRecord | null {
  if (typeof window === "undefined" || !identifier) return null;

  const directKey = `ghc_preview_certificate_${identifier}`;
  const possibleKeys = [directKey];

  try {
    for (const key of possibleKeys) {
      const stored = window.localStorage.getItem(key);

      if (!stored) continue;

      const parsed = JSON.parse(stored) as CertificateRecord;

      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    }
  } catch {
    return null;
  }

  return null;
}

async function queryCertificateByField(
  field: "verification_slug" | "certificate_code" | "id",
  value: string,
) {
  if (!supabase || !value) return null;

  const { data, error } = await supabase
    .from("certificates")
    .select("*")
    .eq(field, value)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(`Error buscando certificado por ${field}:`, error);
    return null;
  }

  return (data as CertificateRecord | null) ?? null;
}

async function findCertificate(identifier: string) {
  const previewCertificate = readPreviewCertificate(identifier);

  if (previewCertificate) return previewCertificate;

  const bySlug = await queryCertificateByField("verification_slug", identifier);
  if (bySlug) return bySlug;

  const byCode = await queryCertificateByField("certificate_code", identifier);
  if (byCode) return byCode;

  if (isUuid(identifier)) {
    const byId = await queryCertificateByField("id", identifier);
    if (byId) return byId;
  }

  return null;
}

function GhcIntegratedBrand() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#1d6f3a]/40 bg-[#07110c] shadow-[0_0_24px_rgba(34,214,91,0.16)]">
        <div className="absolute inset-[5px] rounded-xl border border-[#22D65B]/30" />
        <span className="relative text-[15px] font-black tracking-[-0.08em] text-[#EFFFF4]">
          GHC
        </span>
      </div>

      <div className="leading-none">
        <p className="text-[18px] font-black tracking-[0.18em] text-[#111815]">
          GHC ACADEMY
        </p>
        <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.32em] text-[#5b675f]">
          Sport Through Science
        </p>
      </div>
    </div>
  );
}

function GhcTopbarBrand() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-[#22D65B]/25 bg-[#0A130E] shadow-[0_0_26px_rgba(34,214,91,0.12)]">
        <span className="text-[13px] font-black tracking-[-0.08em] text-[#EFFFF4]">
          GHC
        </span>
      </div>

      <div>
        <p className="text-sm font-black tracking-[0.22em] text-[#F3F7F1]">
          GHC ACADEMY
        </p>
        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8D9990]">
          Sport Through Science
        </p>
      </div>
    </div>
  );
}

function CertificateSeal() {
  return (
    <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-[#22D65B]/40 bg-[#07110c] shadow-[0_0_34px_rgba(34,214,91,0.18)]">
      <div className="absolute inset-2 rounded-full border border-[#22D65B]/25" />
      <div className="absolute inset-4 rounded-full border border-[#E9EFE6]/15" />

      <div className="relative text-center">
        <p className="text-[18px] font-black tracking-[-0.08em] text-[#EFFFF4]">
          GHC
        </p>
        <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.22em] text-[#22D65B]">
          Verified
        </p>
      </div>
    </div>
  );
}

function LoadingView() {
  return (
    <main className="min-h-screen bg-[#050806] text-[#F4F7F2]">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-8 text-center shadow-2xl">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#22D65B]/20 border-t-[#22D65B]" />
          <p className="mt-5 text-sm font-semibold tracking-[0.18em] text-[#B7C1BA]">
            VERIFICANDO CERTIFICADO
          </p>
        </div>
      </div>
    </main>
  );
}

function EmptyView({ identifier }: { identifier: string }) {
  return (
    <main className="min-h-screen bg-[#050806] text-[#F4F7F2]">
      <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6">
        <section className="rounded-[2rem] border border-white/10 bg-[#0B100D] p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#F5C76A]/25 bg-[#F5C76A]/10 text-xl">
            !
          </div>

          <h1 className="mt-6 text-2xl font-black tracking-tight text-[#F4F7F2]">
            Certificado no localizado
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#AAB5AE]">
            No hemos encontrado un certificado válido asociado al identificador{" "}
            <span className="font-semibold text-[#EAF0E8]">{identifier}</span>.
            Revisa que el enlace sea correcto o vuelve al área de alumno.
          </p>

          <div className="mt-8 flex justify-center">
            <Link
              href="/alumno"
              className="rounded-full border border-[#22D65B]/30 bg-[#22D65B] px-6 py-3 text-sm font-black text-[#06100A] shadow-[0_0_28px_rgba(34,214,91,0.18)] transition hover:scale-[1.02]"
            >
              Volver al área de alumno
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function ErrorView() {
  return (
    <main className="min-h-screen bg-[#050806] text-[#F4F7F2]">
      <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6">
        <section className="rounded-[2rem] border border-white/10 bg-[#0B100D] p-8 text-center shadow-2xl">
          <h1 className="text-2xl font-black tracking-tight text-[#F4F7F2]">
            No se pudo verificar el certificado
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#AAB5AE]">
            La conexión con el sistema académico no está disponible en este
            momento. Comprueba la configuración de Supabase o vuelve a intentarlo
            desde el área de alumno.
          </p>

          <div className="mt-8 flex justify-center">
            <Link
              href="/alumno"
              className="rounded-full border border-white/10 bg-white/[0.06] px-6 py-3 text-sm font-bold text-[#F4F7F2] transition hover:bg-white/[0.09]"
            >
              Volver al área de alumno
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function PublicCertificatePage() {
  const params = useParams();
  const certificateIdentifier = normalizeIdentifier(params?.certificateId);

  const [state, setState] = useState<LoadState>("loading");
  const [certificate, setCertificate] = useState<CertificateRecord | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadCertificate() {
      if (!certificateIdentifier) {
        setState("not-found");
        return;
      }

      try {
        if (!supabase) {
          const previewCertificate = readPreviewCertificate(certificateIdentifier);

          if (previewCertificate && mounted) {
            setCertificate(previewCertificate);
            setState("ready");
            return;
          }

          if (mounted) setState("error");
          return;
        }

        const result = await findCertificate(certificateIdentifier);

        if (!mounted) return;

        if (!result) {
          setState("not-found");
          return;
        }

        setCertificate(result);
        setState("ready");
      } catch (error) {
        console.error("Error cargando certificado público:", error);

        if (mounted) setState("error");
      }
    }

    loadCertificate();

    return () => {
      mounted = false;
    };
  }, [certificateIdentifier]);

  const normalizedCertificate = useMemo(() => {
    const status = certificate?.status ?? "valid";
    const code =
      certificate?.certificate_code ||
      certificate?.verification_slug ||
      certificate?.id ||
      certificateIdentifier;

    return {
      id: certificate?.id || "ID no disponible",
      code,
      verificationSlug:
        certificate?.verification_slug || certificateIdentifier || "No disponible",
      studentName: certificate?.student_name || "Alumno GHC Academy",
      courseTitle:
        certificate?.course_title || "Programa académico GHC Academy",
      finalScore: formatScore(certificate?.final_score),
      issuedAt: formatDate(certificate?.issued_at),
      status,
      statusLabel: getStatusLabel(status),
      statusDescription: getStatusDescription(status),
      isRevoked: status === "revoked",
    };
  }, [certificate, certificateIdentifier]);

  if (state === "loading") return <LoadingView />;
  if (state === "error") return <ErrorView />;
  if (state === "not-found" || !certificate) {
    return <EmptyView identifier={certificateIdentifier} />;
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#050806] text-[#F4F7F2]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[-14rem] top-[-18rem] h-[34rem] w-[34rem] rounded-full bg-[#22D65B]/[0.08] blur-3xl" />
        <div className="absolute bottom-[-16rem] right-[-14rem] h-[34rem] w-[34rem] rounded-full bg-[#7A8A80]/[0.08] blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.055),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_22%)]" />
      </div>

      <header className="relative z-10 border-b border-white/[0.08] bg-[#050806]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
          <GhcTopbarBrand />

          <nav className="flex items-center gap-3">
            <Link
              href="/alumno"
              className="rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#DCE5DE] transition hover:border-[#22D65B]/35 hover:bg-[#22D65B]/10 hover:text-white"
            >
              Área alumno
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-6 px-5 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8 lg:py-8">
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#22D65B]">
                Certificado verificable
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-[#F4F7F2] sm:text-3xl">
                Validación académica GHC Academy
              </h1>
            </div>

            <div
              className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.18em] ${
                normalizedCertificate.isRevoked
                  ? "border-[#FF6B6B]/35 bg-[#FF6B6B]/10 text-[#FFB3B3]"
                  : "border-[#22D65B]/35 bg-[#22D65B]/10 text-[#B9FFD0]"
              }`}
            >
              {normalizedCertificate.statusLabel}
            </div>
          </div>

          <article className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0A0F0C] p-3 shadow-[0_24px_90px_rgba(0,0,0,0.42)]">
            <div className="relative overflow-hidden rounded-[1.55rem] bg-[#F2F0E8] text-[#101611] shadow-inner">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(34,214,91,0.13),transparent_28%),radial-gradient(circle_at_100%_100%,rgba(10,15,12,0.10),transparent_34%)]" />
              <div className="absolute inset-5 rounded-[1.2rem] border border-[#111815]/10" />
              <div className="absolute inset-8 rounded-[1rem] border border-[#22D65B]/20" />

              <div className="relative px-7 py-7 sm:px-10 sm:py-8 lg:px-12">
                <div className="flex items-start justify-between gap-4">
                  <GhcIntegratedBrand />

                  <div
                    className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] ${
                      normalizedCertificate.isRevoked
                        ? "border-[#A93636]/25 bg-[#A93636]/10 text-[#8D2323]"
                        : "border-[#177D3E]/25 bg-[#22D65B]/12 text-[#0B5E2D]"
                    }`}
                  >
                    {normalizedCertificate.statusLabel}
                  </div>
                </div>

                <div className="mx-auto mt-8 max-w-3xl text-center sm:mt-10">
                  <p className="text-[11px] font-black uppercase tracking-[0.36em] text-[#69736D]">
                    Certifica que
                  </p>

                  <h2 className="mt-5 text-4xl font-black tracking-[-0.045em] text-[#101611] sm:text-5xl lg:text-6xl">
                    {normalizedCertificate.studentName}
                  </h2>

                  <div className="mx-auto mt-5 h-px w-44 bg-gradient-to-r from-transparent via-[#22D65B] to-transparent" />

                  <p className="mx-auto mt-6 max-w-2xl text-sm font-semibold leading-7 text-[#56615A] sm:text-base">
                    ha completado satisfactoriamente el programa académico
                  </p>

                  <h3
                    className="mx-auto mt-3 max-w-3xl text-2xl font-black leading-tight tracking-[-0.03em] sm:text-3xl"
                    style={{ color: GHC_GREEN }}
                  >
                    {normalizedCertificate.courseTitle}
                  </h3>

                  <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-[#5F6963]">
                    Emitido por GHC Academy bajo criterio académico profesional,
                    con verificación digital vinculada al alumno, curso, fecha y
                    estado del certificado.
                  </p>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[#101611]/10 bg-white/45 p-4 text-center shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#69736D]">
                      Nota final
                    </p>
                    <p className="mt-2 text-xl font-black text-[#101611]">
                      {normalizedCertificate.finalScore}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#101611]/10 bg-white/45 p-4 text-center shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#69736D]">
                      Fecha emisión
                    </p>
                    <p className="mt-2 text-base font-black text-[#101611]">
                      {normalizedCertificate.issuedAt}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#101611]/10 bg-white/45 p-4 text-center shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#69736D]">
                      Código
                    </p>
                    <p className="mt-2 break-all text-sm font-black text-[#101611]">
                      {normalizedCertificate.code}
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-6 sm:mt-10 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="h-px w-56 bg-[#101611]/35" />
                    <p className="mt-3 text-sm font-black text-[#101611]">
                      Dirección académica
                    </p>
                    <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#69736D]">
                      GHC Academy
                    </p>
                  </div>

                  <CertificateSeal />
                </div>

                <div className="mt-7 rounded-2xl border border-[#101611]/10 bg-[#101611]/[0.045] px-4 py-3">
                  <p className="break-all text-center text-[10px] font-bold uppercase tracking-[0.18em] text-[#68736D]">
                    ID verificable: {normalizedCertificate.verificationSlug}
                  </p>
                </div>
              </div>
            </div>
          </article>
        </div>

        <aside className="h-fit rounded-[2rem] border border-white/10 bg-[#0A0F0C]/92 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.34)] backdrop-blur-xl lg:sticky lg:top-24">
          <div className="rounded-[1.4rem] border border-white/[0.08] bg-white/[0.035] p-5">
            <p className="text-xs font-black uppercase tracking-[0.26em] text-[#22D65B]">
              Verificación
            </p>

            <h2 className="mt-3 text-xl font-black tracking-tight text-[#F4F7F2]">
              Estado del certificado
            </h2>

            <div
              className={`mt-5 rounded-2xl border p-4 ${
                normalizedCertificate.isRevoked
                  ? "border-[#FF6B6B]/25 bg-[#FF6B6B]/10"
                  : "border-[#22D65B]/25 bg-[#22D65B]/10"
              }`}
            >
              <p
                className={`text-sm font-black uppercase tracking-[0.2em] ${
                  normalizedCertificate.isRevoked
                    ? "text-[#FFB3B3]"
                    : "text-[#B9FFD0]"
                }`}
              >
                {normalizedCertificate.statusLabel}
              </p>

              <p className="mt-3 text-sm leading-7 text-[#AEB8B1]">
                {normalizedCertificate.statusDescription}
              </p>
            </div>

            <dl className="mt-5 space-y-4">
              <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
                <dt className="text-[10px] font-black uppercase tracking-[0.22em] text-[#77817A]">
                  Alumno
                </dt>
                <dd className="mt-2 text-sm font-bold text-[#F4F7F2]">
                  {normalizedCertificate.studentName}
                </dd>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
                <dt className="text-[10px] font-black uppercase tracking-[0.22em] text-[#77817A]">
                  Curso
                </dt>
                <dd className="mt-2 text-sm font-bold leading-6 text-[#F4F7F2]">
                  {normalizedCertificate.courseTitle}
                </dd>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
                <dt className="text-[10px] font-black uppercase tracking-[0.22em] text-[#77817A]">
                  Código
                </dt>
                <dd className="mt-2 break-all text-sm font-bold text-[#F4F7F2]">
                  {normalizedCertificate.code}
                </dd>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
                <dt className="text-[10px] font-black uppercase tracking-[0.22em] text-[#77817A]">
                  Fecha de emisión
                </dt>
                <dd className="mt-2 text-sm font-bold text-[#F4F7F2]">
                  {normalizedCertificate.issuedAt}
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-4 rounded-[1.4rem] border border-white/[0.08] bg-white/[0.025] p-5">
            <p className="text-sm leading-7 text-[#AAB5AE]">
              La autenticidad se comprueba mediante el identificador público del
              certificado y su estado registrado en GHC Academy.
            </p>

            <Link
              href="/alumno"
              className="mt-5 flex w-full items-center justify-center rounded-full border border-[#22D65B]/30 bg-[#22D65B] px-5 py-3 text-sm font-black text-[#06100A] shadow-[0_0_30px_rgba(34,214,91,0.16)] transition hover:scale-[1.015]"
            >
              Ir al área de alumno
            </Link>
          </div>
        </aside>
      </section>
    </main>
  );
}
