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

  try {
    const stored = window.localStorage.getItem(
      `ghc_preview_certificate_${identifier}`,
    );

    if (!stored) return null;

    const parsed = JSON.parse(stored) as CertificateRecord;

    if (parsed && typeof parsed === "object") return parsed;
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

function GhcMark() {
  return (
    <span className="ghc-mark" aria-hidden="true">
      <svg viewBox="0 0 48 48" role="img">
        <path
          d="M24 4.8 40.8 14.4v19.2L24 43.2 7.2 33.6V14.4L24 4.8Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M30.7 18.6a8.8 8.8 0 1 0 1.1 11.7h-7.3v-5.1h13.6v13.1h-4.8l-.4-3.2A14.3 14.3 0 1 1 34 15.1l-3.3 3.5Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

function Brand({ variant = "dark" }: { variant?: "dark" | "paper" }) {
  return (
    <div className={`brand brand-${variant}`}>
      <GhcMark />
      <div>
        <strong>GHC ACADEMY</strong>
        <span>SPORT THROUGH SCIENCE</span>
      </div>
    </div>
  );
}

function StateScreen({
  type,
  title,
  text,
  identifier,
}: {
  type: "loading" | "empty" | "error";
  title: string;
  text: string;
  identifier?: string;
}) {
  return (
    <main className="page">
      <div className="ambient-grid" />

      <section className="state">
        <Brand />

        {type === "loading" ? <div className="spinner" /> : null}

        <h1>{title}</h1>

        <p>
          {text}
          {identifier ? (
            <>
              {" "}
              <strong>{identifier}</strong>
            </>
          ) : null}
        </p>

        {type !== "loading" ? (
          <Link href="/alumno" className="green-button">
            Volver al área de alumno
          </Link>
        ) : null}
      </section>

      <CertificateStyles />
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
          const previewCertificate =
            readPreviewCertificate(certificateIdentifier);

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
        certificate?.verification_slug ||
        certificateIdentifier ||
        "No disponible",
      studentName: certificate?.student_name || "Alumno GHC Academy",
      courseTitle: certificate?.course_title || "Programa académico GHC Academy",
      finalScore: formatScore(certificate?.final_score),
      issuedAt: formatDate(certificate?.issued_at),
      status,
      statusLabel: getStatusLabel(status),
      statusDescription: getStatusDescription(status),
      isRevoked: status === "revoked",
    };
  }, [certificate, certificateIdentifier]);

  if (state === "loading") {
    return (
      <StateScreen
        type="loading"
        title="Verificando certificado"
        text="Estamos consultando el registro académico de GHC Academy."
      />
    );
  }

  if (state === "error") {
    return (
      <StateScreen
        type="error"
        title="No se pudo verificar el certificado"
        text="La conexión con el sistema académico no está disponible en este momento."
      />
    );
  }

  if (state === "not-found" || !certificate) {
    return (
      <StateScreen
        type="empty"
        title="Certificado no localizado"
        text="No hemos encontrado un certificado asociado al identificador:"
        identifier={certificateIdentifier}
      />
    );
  }

  return (
    <main className="page">
      <div className="ambient-grid" />
      <div className="orb orb-left" />
      <div className="orb orb-right" />

      <header className="topbar">
        <div className="topbar-inner">
          <Brand />

          <nav>
            <Link href="/alumno" className="nav-link">
              Área alumno
            </Link>
          </nav>
        </div>
      </header>

      <section className="shell">
        <div className="hero">
          <p>CREDENCIAL OFICIAL</p>
          <h1>
            VÁLIDO. VERIFICABLE.
            <br />
            PROFESIONAL.
          </h1>
          <span>
            Consulta la autenticidad de este certificado oficial de GHC Academy.
          </span>
        </div>

        <div className="layout">
          <article className="certificate-wrap">
            <div className="certificate-paper">
              <div className="paper-line" />

              <div className="paper-top">
                <Brand variant="paper" />

                <div
                  className={
                    normalizedCertificate.isRevoked
                      ? "paper-status paper-status-revoked"
                      : "paper-status paper-status-valid"
                  }
                >
                  {normalizedCertificate.statusLabel}
                </div>
              </div>

              <div className="paper-main">
                <p className="paper-kicker">GHC ACADEMY</p>

                <h2>CERTIFICADO</h2>

                <p className="paper-subtitle">de logro académico</p>

                <p className="paper-grants">se otorga a</p>

                <h3>{normalizedCertificate.studentName}</h3>

                <p className="paper-text">
                  por completar satisfactoriamente los requisitos de
                </p>

                <h4>{normalizedCertificate.courseTitle}</h4>
              </div>

              <div className="paper-footer">
                <div className="paper-signature">
                  <div />
                  <span>DIRECTOR ACADÉMICO</span>
                </div>

                <div className="paper-seal">
                  <span>GHC</span>
                  <small>VERIFIED</small>
                </div>

                <div className="paper-brand-note">
                  <strong>GHC</strong>
                  <span>SPORT THROUGH SCIENCE</span>
                </div>
              </div>

              <div className="paper-metrics">
                <div>
                  <span>Nota final</span>
                  <strong>{normalizedCertificate.finalScore}</strong>
                </div>

                <div>
                  <span>Fecha emisión</span>
                  <strong>{normalizedCertificate.issuedAt}</strong>
                </div>

                <div>
                  <span>Código</span>
                  <strong>{normalizedCertificate.code}</strong>
                </div>
              </div>
            </div>
          </article>

          <aside className="verification-panel">
            <div className="panel-card">
              <p className="panel-eyebrow">VERIFICACIÓN</p>
              <h2>Estado del certificado</h2>

              <div
                className={
                  normalizedCertificate.isRevoked
                    ? "result result-revoked"
                    : "result result-valid"
                }
              >
                <strong>{normalizedCertificate.statusLabel}</strong>
                <p>{normalizedCertificate.statusDescription}</p>
              </div>

              <dl>
                <div>
                  <dt>Alumno</dt>
                  <dd>{normalizedCertificate.studentName}</dd>
                </div>

                <div>
                  <dt>Curso</dt>
                  <dd>{normalizedCertificate.courseTitle}</dd>
                </div>

                <div>
                  <dt>Código</dt>
                  <dd>{normalizedCertificate.code}</dd>
                </div>

                <div>
                  <dt>Fecha de emisión</dt>
                  <dd>{normalizedCertificate.issuedAt}</dd>
                </div>
              </dl>
            </div>

            <div className="panel-note">
              <p>
                ID verificable:
                <br />
                <strong>{normalizedCertificate.verificationSlug}</strong>
              </p>

              <Link href="/alumno" className="green-button">
                Ir al área de alumno
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <CertificateStyles />
    </main>
  );
}

function CertificateStyles() {
  return (
    <style jsx global>{`
      :root {
        --bg: #050806;
        --panel: #0a0f0d;
        --panel-soft: #101712;
        --text: #f4f7f2;
        --muted: #aeb8b1;
        --muted-2: #7f8a83;
        --green: #22d65b;
        --green-soft: rgba(34, 214, 91, 0.12);
        --line: rgba(255, 255, 255, 0.1);
        --paper: #eef2e8;
        --paper-ink: #18231d;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        background: var(--bg);
      }

      .page {
        position: relative;
        min-height: 100vh;
        overflow-x: hidden;
        background:
          radial-gradient(circle at 18% 0%, rgba(34, 214, 91, 0.08), transparent 28%),
          radial-gradient(circle at 84% 16%, rgba(255, 255, 255, 0.045), transparent 28%),
          linear-gradient(180deg, #050806 0%, #080d0a 48%, #050806 100%);
        color: var(--text);
      }

      .ambient-grid {
        pointer-events: none;
        position: fixed;
        inset: 0;
        opacity: 0.22;
        background-image:
          linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
        background-size: 46px 46px;
        mask-image: linear-gradient(to bottom, black, transparent 72%);
      }

      .orb {
        pointer-events: none;
        position: fixed;
        z-index: 0;
        width: 34rem;
        height: 34rem;
        border-radius: 999px;
        filter: blur(90px);
      }

      .orb-left {
        top: -19rem;
        left: -18rem;
        background: rgba(34, 214, 91, 0.1);
      }

      .orb-right {
        right: -20rem;
        bottom: -19rem;
        background: rgba(130, 145, 136, 0.08);
      }

      .topbar {
        position: relative;
        z-index: 5;
        border-bottom: 1px solid var(--line);
        background: rgba(5, 8, 6, 0.9);
        backdrop-filter: blur(18px);
      }

      .topbar-inner {
        width: min(1240px, calc(100% - 40px));
        min-height: 74px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
      }

      .brand {
        display: inline-flex;
        align-items: center;
        gap: 12px;
      }

      .ghc-mark {
        display: inline-flex;
        width: 34px;
        height: 34px;
        flex: 0 0 34px;
        align-items: center;
        justify-content: center;
        color: var(--green);
      }

      .ghc-mark svg {
        width: 100%;
        height: 100%;
        display: block;
        filter: drop-shadow(0 0 10px rgba(34, 214, 91, 0.16));
      }

      .brand div {
        display: flex;
        flex-direction: column;
        line-height: 1;
      }

      .brand strong {
        color: var(--text);
        font-size: 14px;
        font-weight: 950;
        letter-spacing: 0.24em;
        white-space: nowrap;
      }

      .brand span {
        margin-top: 6px;
        color: #8d9990;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: 0.3em;
        white-space: nowrap;
      }

      .brand-paper .ghc-mark {
        width: 32px;
        height: 32px;
        color: #148c45;
      }

      .brand-paper strong {
        color: #243228;
      }

      .brand-paper span {
        color: #6c7a70;
      }

      .nav-link {
        display: inline-flex;
        min-height: 40px;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.055);
        padding: 0 18px;
        color: #dce5de;
        text-decoration: none;
        font-size: 12px;
        font-weight: 950;
        text-transform: uppercase;
        letter-spacing: 0.14em;
      }

      .shell {
        position: relative;
        z-index: 2;
        width: min(1240px, calc(100% - 40px));
        margin: 0 auto;
        padding: 30px 0 54px;
      }

      .hero {
        margin: 0 auto 22px;
        max-width: 920px;
        text-align: center;
      }

      .hero p {
        margin: 0;
        color: var(--green);
        font-size: 12px;
        font-weight: 950;
        text-transform: uppercase;
        letter-spacing: 0.32em;
      }

      .hero h1 {
        margin: 14px 0 0;
        color: var(--text);
        font-size: clamp(44px, 6vw, 82px);
        line-height: 0.86;
        font-weight: 950;
        letter-spacing: -0.075em;
        text-transform: uppercase;
        text-shadow: 0 0 34px rgba(255, 255, 255, 0.08);
      }

      .hero span {
        display: block;
        margin: 18px auto 0;
        max-width: 680px;
        color: var(--muted);
        font-size: 15px;
        line-height: 1.7;
      }

      .layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 360px;
        gap: 24px;
        align-items: start;
      }

      .certificate-wrap {
        min-width: 0;
        padding: 18px 8px 26px;
        perspective: 1400px;
      }

      .certificate-paper {
        position: relative;
        min-height: 430px;
        overflow: hidden;
        border-radius: 18px;
        border: 1px solid rgba(18, 35, 29, 0.22);
        background:
          radial-gradient(circle at 18% 0%, rgba(34, 214, 91, 0.09), transparent 28%),
          linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.42)),
          var(--paper);
        color: var(--paper-ink);
        box-shadow:
          0 28px 80px rgba(0, 0, 0, 0.36),
          0 0 0 1px rgba(255, 255, 255, 0.18) inset;
        padding: 34px 44px 26px;
        transform: rotate(-2.2deg);
      }

      .paper-line {
        pointer-events: none;
        position: absolute;
        inset: 18px;
        border-radius: 14px;
        border: 1px solid rgba(18, 35, 29, 0.12);
      }

      .paper-top {
        position: relative;
        z-index: 2;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
      }

      .paper-status {
        border-radius: 999px;
        padding: 8px 13px;
        font-size: 10px;
        font-weight: 950;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        flex: 0 0 auto;
      }

      .paper-status-valid {
        border: 1px solid rgba(22, 126, 61, 0.25);
        background: rgba(34, 214, 91, 0.12);
        color: #0b5e2d;
      }

      .paper-status-revoked {
        border: 1px solid rgba(170, 48, 48, 0.24);
        background: rgba(170, 48, 48, 0.1);
        color: #8d2323;
      }

      .paper-main {
        position: relative;
        z-index: 2;
        margin: 34px auto 0;
        max-width: 760px;
        text-align: center;
      }

      .paper-kicker {
        margin: 0;
        color: #3c4b42;
        font-size: 12px;
        font-weight: 950;
        letter-spacing: 0.42em;
      }

      .paper-main h2 {
        margin: 13px 0 0;
        color: #243228;
        font-family: Georgia, "Times New Roman", serif;
        font-size: clamp(38px, 5vw, 68px);
        line-height: 0.9;
        font-weight: 700;
        letter-spacing: 0.18em;
      }

      .paper-subtitle {
        margin: 6px 0 0;
        color: #69766d;
        font-size: 13px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }

      .paper-grants {
        margin: 20px 0 0;
        color: #69766d;
        font-size: 13px;
      }

      .paper-main h3 {
        margin: 5px 0 0;
        color: #203028;
        font-size: clamp(28px, 4vw, 48px);
        line-height: 1;
        font-weight: 950;
        letter-spacing: -0.04em;
      }

      .paper-text {
        margin: 13px 0 0;
        color: #69766d;
        font-size: 13px;
      }

      .paper-main h4 {
        margin: 8px 0 0;
        color: #148c45;
        font-size: clamp(20px, 2.5vw, 31px);
        line-height: 1.1;
        font-weight: 950;
        letter-spacing: -0.03em;
      }

      .paper-footer {
        position: relative;
        z-index: 2;
        margin-top: 26px;
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: end;
        gap: 20px;
      }

      .paper-signature div {
        width: 180px;
        height: 1px;
        margin-bottom: 8px;
        background: rgba(32, 48, 40, 0.35);
      }

      .paper-signature span,
      .paper-brand-note span {
        display: block;
        color: #69766d;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }

      .paper-seal {
        width: 68px;
        height: 68px;
        border-radius: 999px;
        border: 1px solid rgba(34, 214, 91, 0.32);
        background: rgba(34, 214, 91, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        color: #148c45;
      }

      .paper-seal span {
        font-size: 15px;
        font-weight: 950;
        letter-spacing: -0.06em;
      }

      .paper-seal small {
        margin-top: 4px;
        font-size: 7px;
        font-weight: 950;
        letter-spacing: 0.12em;
      }

      .paper-brand-note {
        text-align: right;
      }

      .paper-brand-note strong {
        display: block;
        color: #243228;
        font-size: 12px;
        font-weight: 950;
        letter-spacing: 0.16em;
      }

      .paper-metrics {
        position: relative;
        z-index: 2;
        margin-top: 22px;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }

      .paper-metrics div {
        min-width: 0;
        border-radius: 14px;
        border: 1px solid rgba(32, 48, 40, 0.12);
        background: rgba(255, 255, 255, 0.36);
        padding: 12px;
        text-align: center;
      }

      .paper-metrics span {
        display: block;
        color: #69766d;
        font-size: 9px;
        font-weight: 950;
        text-transform: uppercase;
        letter-spacing: 0.18em;
      }

      .paper-metrics strong {
        display: block;
        margin-top: 6px;
        color: #203028;
        font-size: 13px;
        font-weight: 950;
        overflow-wrap: anywhere;
      }

      .paper-metrics div:first-child strong {
        color: #148c45;
        font-size: 17px;
      }

      .verification-panel {
        position: sticky;
        top: 94px;
        display: grid;
        gap: 16px;
      }

      .panel-card,
      .panel-note {
        border-radius: 28px;
        border: 1px solid var(--line);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.025)),
          rgba(10, 15, 12, 0.94);
        box-shadow: 0 24px 90px rgba(0, 0, 0, 0.34);
        backdrop-filter: blur(18px);
        padding: 22px;
      }

      .panel-eyebrow {
        margin: 0;
        color: var(--green);
        font-size: 12px;
        font-weight: 950;
        text-transform: uppercase;
        letter-spacing: 0.28em;
      }

      .panel-card h2 {
        margin: 12px 0 0;
        color: var(--text);
        font-size: 22px;
        line-height: 1.12;
        font-weight: 950;
        letter-spacing: -0.035em;
      }

      .result {
        margin-top: 20px;
        border-radius: 20px;
        padding: 16px;
      }

      .result-valid {
        border: 1px solid rgba(34, 214, 91, 0.25);
        background: rgba(34, 214, 91, 0.1);
      }

      .result-revoked {
        border: 1px solid rgba(255, 107, 107, 0.25);
        background: rgba(255, 107, 107, 0.1);
      }

      .result strong {
        display: block;
        color: #b9ffd0;
        font-size: 14px;
        font-weight: 950;
        text-transform: uppercase;
        letter-spacing: 0.2em;
      }

      .result-revoked strong {
        color: #ffb3b3;
      }

      .result p,
      .panel-note p,
      .state p {
        margin: 12px 0 0;
        color: var(--muted);
        font-size: 14px;
        line-height: 1.8;
      }

      .panel-note strong {
        color: var(--text);
        overflow-wrap: anywhere;
      }

      .panel-card dl {
        margin: 20px 0 0;
        display: grid;
        gap: 12px;
      }

      .panel-card dl div {
        min-width: 0;
        border-radius: 18px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(0, 0, 0, 0.2);
        padding: 15px;
      }

      .panel-card dt {
        color: #77817a;
        font-size: 10px;
        font-weight: 950;
        text-transform: uppercase;
        letter-spacing: 0.22em;
      }

      .panel-card dd {
        margin: 8px 0 0;
        color: var(--text);
        font-size: 14px;
        line-height: 1.55;
        font-weight: 800;
        overflow-wrap: anywhere;
      }

      .green-button {
        display: inline-flex;
        width: 100%;
        min-height: 48px;
        margin-top: 20px;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        border: 1px solid rgba(34, 214, 91, 0.32);
        background: var(--green);
        color: #06100a;
        padding: 0 20px;
        text-decoration: none;
        font-size: 14px;
        font-weight: 950;
        box-shadow: 0 0 30px rgba(34, 214, 91, 0.16);
      }

      .state {
        position: relative;
        z-index: 2;
        width: min(680px, calc(100% - 40px));
        min-height: 100vh;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        text-align: center;
      }

      .state h1 {
        margin: 26px 0 0;
        color: var(--text);
        font-size: 32px;
        line-height: 1.1;
        font-weight: 950;
        letter-spacing: -0.045em;
      }

      .state strong {
        color: var(--text);
      }

      .spinner {
        width: 42px;
        height: 42px;
        margin-top: 30px;
        border-radius: 999px;
        border: 2px solid rgba(34, 214, 91, 0.2);
        border-top-color: var(--green);
        animation: spin 850ms linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      @media (max-width: 1120px) {
        .layout {
          grid-template-columns: 1fr;
        }

        .verification-panel {
          position: static;
        }
      }

      @media (max-width: 760px) {
        .topbar-inner,
        .shell {
          width: min(100% - 28px, 1240px);
        }

        .brand strong {
          font-size: 12px;
          letter-spacing: 0.16em;
        }

        .brand span {
          font-size: 8px;
          letter-spacing: 0.22em;
        }

        .nav-link {
          padding: 0 13px;
          font-size: 10px;
          letter-spacing: 0.1em;
        }

        .hero h1 {
          font-size: 44px;
        }

        .certificate-paper {
          min-height: auto;
          padding: 24px 22px 22px;
          transform: rotate(-1deg);
        }

        .paper-top {
          flex-direction: column;
        }

        .paper-main h2 {
          font-size: 38px;
        }

        .paper-footer {
          grid-template-columns: 1fr;
        }

        .paper-brand-note {
          text-align: left;
        }

        .paper-metrics {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  );
}
