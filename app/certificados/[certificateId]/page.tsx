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

const LOGO_SRC = "/logo-limpio.svg";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(
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

function BrandLockup({ small = false }: { small?: boolean }) {
  return (
    <div className={small ? "brand brand-small" : "brand"}>
      <div className="brand-mark">
        <img src={LOGO_SRC} alt="GHC Academy" />
      </div>

      <div className="brand-copy">
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
    <main className="certificate-page">
      <section className="state-shell">
        <BrandLockup />

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
          <Link href="/alumno" className="primary-button">
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
    <main className="certificate-page">
      <div className="page-grid" />
      <div className="orb orb-one" />
      <div className="orb orb-two" />

      <header className="topbar">
        <div className="topbar-inner">
          <BrandLockup small />

          <Link href="/alumno" className="topbar-link">
            Área alumno
          </Link>
        </div>
      </header>

      <section className="page-shell">
        <div className="title-row">
          <div>
            <p className="eyebrow">Certificado verificable</p>
            <h1>Validación académica GHC Academy</h1>
          </div>

          <span
            className={
              normalizedCertificate.isRevoked
                ? "status-pill status-revoked"
                : "status-pill status-valid"
            }
          >
            {normalizedCertificate.statusLabel}
          </span>
        </div>

        <div className="main-layout">
          <article className="certificate-frame">
            <div className="certificate-card">
              <div className="inner-line" />
              <div className="corner-glow" />

              <div className="certificate-top">
                <BrandLockup />

                <span
                  className={
                    normalizedCertificate.isRevoked
                      ? "certificate-status certificate-status-revoked"
                      : "certificate-status certificate-status-valid"
                  }
                >
                  {normalizedCertificate.statusLabel}
                </span>
              </div>

              <div className="certificate-center">
                <p className="mini-heading">Certifica que</p>

                <h2>{normalizedCertificate.studentName}</h2>

                <div className="green-line" />

                <p className="completion-text">
                  ha completado satisfactoriamente el programa académico
                </p>

                <h3>{normalizedCertificate.courseTitle}</h3>

                <p className="verification-text">
                  Certificación emitida por GHC Academy bajo criterio académico
                  profesional, con verificación digital vinculada a alumno,
                  curso, fecha y estado.
                </p>
              </div>

              <div className="metrics-row">
                <div className="metric-card">
                  <span>Nota final</span>
                  <strong>{normalizedCertificate.finalScore}</strong>
                </div>

                <div className="metric-card">
                  <span>Fecha emisión</span>
                  <strong>{normalizedCertificate.issuedAt}</strong>
                </div>

                <div className="metric-card">
                  <span>Código</span>
                  <strong>{normalizedCertificate.code}</strong>
                </div>
              </div>

              <div className="certificate-footer">
                <div className="signature">
                  <div />
                  <strong>Dirección académica</strong>
                  <span>GHC Academy</span>
                </div>

                <div className="seal">
                  <span>GHC</span>
                  <small>Verified</small>
                </div>
              </div>

              <div className="id-strip">
                ID verificable: {normalizedCertificate.verificationSlug}
              </div>
            </div>
          </article>

          <aside className="verification-panel">
            <div className="panel-card">
              <p className="eyebrow">Verificación</p>
              <h2>Estado del certificado</h2>

              <div
                className={
                  normalizedCertificate.isRevoked
                    ? "result-box result-revoked"
                    : "result-box result-valid"
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
                La autenticidad se comprueba mediante el identificador público
                del certificado y su estado registrado en GHC Academy.
              </p>

              <Link href="/alumno" className="primary-button">
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
        --card: #0a0f0c;
        --card-soft: #0e1511;
        --card-deep: #070b08;
        --line: rgba(255, 255, 255, 0.1);
        --line-strong: rgba(255, 255, 255, 0.16);
        --text: #f4f7f2;
        --muted: #aeb8b1;
        --muted-dark: #7f8a83;
        --green: #22d65b;
        --green-soft: rgba(34, 214, 91, 0.11);
        --danger: #ff6b6b;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        background: var(--bg);
      }

      .certificate-page {
        position: relative;
        min-height: 100vh;
        overflow-x: hidden;
        background:
          radial-gradient(circle at 18% 0%, rgba(34, 214, 91, 0.08), transparent 30%),
          radial-gradient(circle at 88% 18%, rgba(255, 255, 255, 0.045), transparent 28%),
          linear-gradient(180deg, #050806 0%, #080d0a 50%, #050806 100%);
        color: var(--text);
      }

      .page-grid {
        pointer-events: none;
        position: fixed;
        inset: 0;
        z-index: 0;
        opacity: 0.22;
        background-image:
          linear-gradient(rgba(255, 255, 255, 0.032) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.032) 1px, transparent 1px);
        background-size: 46px 46px;
        mask-image: linear-gradient(to bottom, black, transparent 72%);
      }

      .orb {
        pointer-events: none;
        position: fixed;
        z-index: 0;
        border-radius: 999px;
        filter: blur(88px);
      }

      .orb-one {
        width: 34rem;
        height: 34rem;
        left: -18rem;
        top: -18rem;
        background: rgba(34, 214, 91, 0.11);
      }

      .orb-two {
        width: 32rem;
        height: 32rem;
        right: -18rem;
        bottom: -18rem;
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
        min-width: 0;
      }

      .brand-small {
        transform: scale(0.92);
        transform-origin: left center;
      }

      .brand-mark {
        width: 42px;
        height: 42px;
        flex: 0 0 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 15px;
        border: 1px solid rgba(34, 214, 91, 0.24);
        background:
          radial-gradient(circle at 50% 0%, rgba(34, 214, 91, 0.14), transparent 58%),
          #07110c;
        box-shadow: 0 0 24px rgba(34, 214, 91, 0.1);
        overflow: hidden;
      }

      .brand-mark img {
        display: block;
        width: 28px;
        height: 28px;
        object-fit: contain;
      }

      .brand-copy {
        display: flex;
        min-width: 0;
        flex-direction: column;
        line-height: 1;
      }

      .brand-copy strong {
        color: var(--text);
        font-size: 14px;
        font-weight: 950;
        letter-spacing: 0.22em;
        white-space: nowrap;
      }

      .brand-copy span {
        margin-top: 6px;
        color: #8d9990;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: 0.3em;
        white-space: nowrap;
      }

      .topbar-link,
      .primary-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        text-decoration: none;
        font-weight: 950;
        transition:
          transform 180ms ease,
          border-color 180ms ease,
          background 180ms ease;
      }

      .topbar-link {
        min-height: 40px;
        padding: 0 18px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.055);
        color: #dce5de;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
      }

      .topbar-link:hover {
        transform: translateY(-1px);
        border-color: rgba(34, 214, 91, 0.35);
        background: rgba(34, 214, 91, 0.1);
      }

      .page-shell {
        position: relative;
        z-index: 2;
        width: min(1240px, calc(100% - 40px));
        margin: 0 auto;
        padding: 26px 0 48px;
      }

      .title-row {
        margin-bottom: 16px;
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 20px;
      }

      .eyebrow {
        margin: 0;
        color: var(--green);
        font-size: 12px;
        line-height: 1.2;
        font-weight: 950;
        text-transform: uppercase;
        letter-spacing: 0.28em;
      }

      .title-row h1 {
        margin: 9px 0 0;
        color: var(--text);
        font-size: clamp(28px, 3vw, 40px);
        line-height: 1.02;
        font-weight: 950;
        letter-spacing: -0.055em;
      }

      .status-pill,
      .certificate-status {
        flex: 0 0 auto;
        border-radius: 999px;
        font-weight: 950;
        text-transform: uppercase;
        white-space: nowrap;
      }

      .status-pill {
        padding: 10px 16px;
        font-size: 11px;
        letter-spacing: 0.18em;
      }

      .status-valid,
      .certificate-status-valid {
        border: 1px solid rgba(34, 214, 91, 0.35);
        background: rgba(34, 214, 91, 0.1);
        color: #b9ffd0;
      }

      .status-revoked,
      .certificate-status-revoked {
        border: 1px solid rgba(255, 107, 107, 0.35);
        background: rgba(255, 107, 107, 0.1);
        color: #ffb3b3;
      }

      .main-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 360px;
        gap: 24px;
        align-items: start;
      }

      .certificate-frame {
        min-width: 0;
        border-radius: 32px;
        border: 1px solid var(--line);
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.075), transparent 24%),
          linear-gradient(180deg, rgba(255, 255, 255, 0.052), rgba(255, 255, 255, 0.022)),
          #080d0a;
        padding: 12px;
        box-shadow:
          0 28px 90px rgba(0, 0, 0, 0.46),
          inset 0 1px 0 rgba(255, 255, 255, 0.08);
      }

      .certificate-card {
        position: relative;
        overflow: hidden;
        min-height: 540px;
        border-radius: 24px;
        border: 1px solid rgba(255, 255, 255, 0.13);
        background:
          radial-gradient(circle at 18% 0%, rgba(34, 214, 91, 0.125), transparent 30%),
          radial-gradient(circle at 88% 100%, rgba(255, 255, 255, 0.06), transparent 34%),
          linear-gradient(145deg, #111914 0%, #0a100c 50%, #070f0a 100%);
        box-shadow: inset 0 0 0 1px rgba(34, 214, 91, 0.045);
        padding: 28px 34px 26px;
      }

      .inner-line {
        pointer-events: none;
        position: absolute;
        inset: 18px;
        border-radius: 18px;
        border: 1px solid rgba(255, 255, 255, 0.105);
      }

      .corner-glow {
        pointer-events: none;
        position: absolute;
        width: 380px;
        height: 380px;
        right: -160px;
        top: -170px;
        border-radius: 999px;
        background: rgba(34, 214, 91, 0.095);
        filter: blur(70px);
      }

      .certificate-top {
        position: relative;
        z-index: 2;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 22px;
      }

      .certificate-status {
        padding: 9px 14px;
        font-size: 10px;
        letter-spacing: 0.18em;
      }

      .certificate-center {
        position: relative;
        z-index: 2;
        width: min(760px, 100%);
        margin: 38px auto 0;
        text-align: center;
      }

      .mini-heading {
        margin: 0;
        color: var(--muted-dark);
        font-size: 11px;
        font-weight: 950;
        text-transform: uppercase;
        letter-spacing: 0.36em;
      }

      .certificate-center h2 {
        margin: 20px 0 0;
        color: var(--text);
        font-size: clamp(46px, 5.7vw, 72px);
        line-height: 0.92;
        font-weight: 950;
        letter-spacing: -0.07em;
      }

      .green-line {
        width: 190px;
        height: 1px;
        margin: 23px auto 0;
        background: linear-gradient(90deg, transparent, var(--green), transparent);
      }

      .completion-text {
        margin: 23px auto 0;
        max-width: 650px;
        color: var(--muted);
        font-size: 14px;
        line-height: 1.7;
        font-weight: 700;
      }

      .certificate-center h3 {
        margin: 10px auto 0;
        max-width: 760px;
        color: var(--green);
        font-size: clamp(28px, 3vw, 40px);
        line-height: 1.08;
        font-weight: 950;
        letter-spacing: -0.045em;
      }

      .verification-text {
        margin: 20px auto 0;
        max-width: 690px;
        color: #8d9990;
        font-size: 13px;
        line-height: 1.75;
      }

      .metrics-row {
        position: relative;
        z-index: 2;
        margin-top: 28px;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }

      .metric-card {
        min-width: 0;
        border-radius: 18px;
        border: 1px solid rgba(255, 255, 255, 0.105);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.025)),
          rgba(255, 255, 255, 0.034);
        padding: 15px;
        text-align: center;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
      }

      .metric-card span {
        display: block;
        color: #7e8a83;
        font-size: 10px;
        font-weight: 950;
        text-transform: uppercase;
        letter-spacing: 0.22em;
      }

      .metric-card strong {
        display: block;
        margin-top: 9px;
        color: var(--text);
        font-size: 15px;
        line-height: 1.25;
        font-weight: 950;
        overflow-wrap: anywhere;
      }

      .metric-card:first-child strong {
        color: var(--green);
        font-size: 22px;
      }

      .certificate-footer {
        position: relative;
        z-index: 2;
        margin-top: 30px;
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 24px;
      }

      .signature div {
        width: 225px;
        height: 1px;
        margin-bottom: 12px;
        background: rgba(255, 255, 255, 0.24);
      }

      .signature strong {
        display: block;
        color: var(--text);
        font-size: 14px;
        font-weight: 950;
      }

      .signature span {
        display: block;
        margin-top: 5px;
        color: #7e8a83;
        font-size: 11px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.2em;
      }

      .seal {
        width: 88px;
        height: 88px;
        flex: 0 0 auto;
        border-radius: 999px;
        border: 1px solid rgba(34, 214, 91, 0.42);
        background:
          radial-gradient(circle at 50% 0%, rgba(34, 214, 91, 0.16), transparent 55%),
          #07110c;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 32px rgba(34, 214, 91, 0.15);
      }

      .seal span {
        color: var(--text);
        font-size: 18px;
        line-height: 1;
        font-weight: 950;
        letter-spacing: -0.08em;
      }

      .seal small {
        margin-top: 6px;
        color: var(--green);
        font-size: 8px;
        font-weight: 950;
        text-transform: uppercase;
        letter-spacing: 0.22em;
      }

      .id-strip {
        position: relative;
        z-index: 2;
        margin-top: 22px;
        border-radius: 15px;
        border: 1px solid rgba(255, 255, 255, 0.085);
        background: rgba(0, 0, 0, 0.16);
        padding: 11px 14px;
        color: #7e8a83;
        text-align: center;
        font-size: 10px;
        line-height: 1.5;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        overflow-wrap: anywhere;
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

      .panel-card h2 {
        margin: 12px 0 0;
        color: var(--text);
        font-size: 22px;
        line-height: 1.12;
        font-weight: 950;
        letter-spacing: -0.035em;
      }

      .result-box {
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

      .result-box strong {
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

      .result-box p,
      .panel-note p,
      .state-shell p {
        margin: 12px 0 0;
        color: var(--muted);
        font-size: 14px;
        line-height: 1.8;
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

      .primary-button {
        width: 100%;
        min-height: 48px;
        margin-top: 20px;
        border: 1px solid rgba(34, 214, 91, 0.32);
        background: var(--green);
        color: #06100a;
        padding: 0 20px;
        font-size: 14px;
        box-shadow: 0 0 30px rgba(34, 214, 91, 0.16);
      }

      .primary-button:hover {
        transform: translateY(-1px) scale(1.01);
      }

      .state-shell {
        position: relative;
        z-index: 2;
        width: min(680px, calc(100% - 40px));
        margin: 0 auto;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
      }

      .state-shell h1 {
        margin: 26px 0 0;
        color: var(--text);
        font-size: 32px;
        line-height: 1.1;
        font-weight: 950;
        letter-spacing: -0.045em;
      }

      .state-shell strong {
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
        .main-layout {
          grid-template-columns: 1fr;
        }

        .verification-panel {
          position: static;
        }
      }

      @media (max-width: 760px) {
        .topbar-inner,
        .page-shell {
          width: min(100% - 28px, 1240px);
        }

        .brand-copy strong {
          font-size: 12px;
          letter-spacing: 0.16em;
        }

        .brand-copy span {
          font-size: 8px;
          letter-spacing: 0.22em;
        }

        .topbar-link {
          padding: 0 13px;
          font-size: 10px;
          letter-spacing: 0.1em;
        }

        .title-row {
          flex-direction: column;
          align-items: flex-start;
        }

        .certificate-frame {
          border-radius: 24px;
          padding: 8px;
        }

        .certificate-card {
          min-height: auto;
          border-radius: 19px;
          padding: 24px 22px 22px;
        }

        .inner-line {
          inset: 12px;
        }

        .certificate-top {
          flex-direction: column;
        }

        .certificate-center {
          margin-top: 36px;
        }

        .certificate-center h2 {
          font-size: 46px;
        }

        .certificate-center h3 {
          font-size: 30px;
        }

        .metrics-row {
          grid-template-columns: 1fr;
        }

        .certificate-footer {
          flex-direction: column;
          align-items: flex-start;
        }

        .signature div {
          width: 220px;
        }
      }
    `}</style>
  );
}
