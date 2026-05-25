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

    if (parsed && typeof parsed === "object") {
      return parsed;
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

function GhcTopbarBrand() {
  return (
    <div className="ghc-topbar-brand">
      <div className="ghc-topbar-logo">GHC</div>
      <div>
        <p className="ghc-topbar-title">GHC ACADEMY</p>
        <p className="ghc-topbar-subtitle">Sport Through Science</p>
      </div>
    </div>
  );
}

function GhcDiplomaBrand() {
  return (
    <div className="ghc-diploma-brand">
      <div className="ghc-diploma-logo">GHC</div>
      <div>
        <p className="ghc-diploma-brand-title">GHC ACADEMY</p>
        <p className="ghc-diploma-brand-subtitle">Sport Through Science</p>
      </div>
    </div>
  );
}

function CertificateSeal() {
  return (
    <div className="ghc-seal">
      <div className="ghc-seal-inner">
        <p>GHC</p>
        <span>Verified</span>
      </div>
    </div>
  );
}

function LoadingView() {
  return (
    <main className="ghc-page">
      <div className="ghc-centered-shell">
        <section className="ghc-state-card">
          <div className="ghc-spinner" />
          <p>VERIFICANDO CERTIFICADO</p>
        </section>
      </div>

      <CertificateStyles />
    </main>
  );
}

function EmptyView({ identifier }: { identifier: string }) {
  return (
    <main className="ghc-page">
      <div className="ghc-centered-shell">
        <section className="ghc-state-card">
          <div className="ghc-warning-badge">!</div>
          <h1>Certificado no localizado</h1>
          <p>
            No hemos encontrado un certificado válido asociado al identificador{" "}
            <strong>{identifier}</strong>. Revisa que el enlace sea correcto o
            vuelve al área de alumno.
          </p>

          <Link href="/alumno" className="ghc-primary-button">
            Volver al área de alumno
          </Link>
        </section>
      </div>

      <CertificateStyles />
    </main>
  );
}

function ErrorView() {
  return (
    <main className="ghc-page">
      <div className="ghc-centered-shell">
        <section className="ghc-state-card">
          <h1>No se pudo verificar el certificado</h1>
          <p>
            La conexión con el sistema académico no está disponible en este
            momento. Comprueba la configuración de Supabase o vuelve a
            intentarlo desde el área de alumno.
          </p>

          <Link href="/alumno" className="ghc-secondary-button">
            Volver al área de alumno
          </Link>
        </section>
      </div>

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

  if (state === "loading") return <LoadingView />;
  if (state === "error") return <ErrorView />;
  if (state === "not-found" || !certificate) {
    return <EmptyView identifier={certificateIdentifier} />;
  }

  return (
    <main className="ghc-page">
      <div className="ghc-bg-orb ghc-bg-orb-left" />
      <div className="ghc-bg-orb ghc-bg-orb-right" />
      <div className="ghc-bg-texture" />

      <header className="ghc-header">
        <div className="ghc-header-inner">
          <GhcTopbarBrand />

          <Link href="/alumno" className="ghc-header-link">
            Área alumno
          </Link>
        </div>
      </header>

      <section className="ghc-main-shell">
        <div className="ghc-content-column">
          <div className="ghc-page-heading">
            <div>
              <p className="ghc-kicker">Certificado verificable</p>
              <h1>Validación académica GHC Academy</h1>
            </div>

            <div
              className={
                normalizedCertificate.isRevoked
                  ? "ghc-status-pill ghc-status-pill-revoked"
                  : "ghc-status-pill ghc-status-pill-valid"
              }
            >
              {normalizedCertificate.statusLabel}
            </div>
          </div>

          <article className="ghc-diploma-frame">
            <div className="ghc-diploma">
              <div className="ghc-diploma-glow ghc-diploma-glow-left" />
              <div className="ghc-diploma-glow ghc-diploma-glow-right" />
              <div className="ghc-diploma-border-one" />
              <div className="ghc-diploma-border-two" />

              <div className="ghc-diploma-content">
                <div className="ghc-diploma-top">
                  <GhcDiplomaBrand />

                  <div
                    className={
                      normalizedCertificate.isRevoked
                        ? "ghc-diploma-status ghc-diploma-status-revoked"
                        : "ghc-diploma-status ghc-diploma-status-valid"
                    }
                  >
                    {normalizedCertificate.statusLabel}
                  </div>
                </div>

                <div className="ghc-diploma-center">
                  <p className="ghc-diploma-small-title">Certifica que</p>

                  <h2>{normalizedCertificate.studentName}</h2>

                  <div className="ghc-diploma-divider" />

                  <p className="ghc-diploma-description">
                    ha completado satisfactoriamente el programa académico
                  </p>

                  <h3>{normalizedCertificate.courseTitle}</h3>

                  <p className="ghc-diploma-legal">
                    Emitido por GHC Academy bajo criterio académico profesional,
                    con verificación digital vinculada al alumno, curso, fecha y
                    estado del certificado.
                  </p>
                </div>

                <div className="ghc-diploma-metrics">
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

                <div className="ghc-diploma-footer">
                  <div className="ghc-signature">
                    <div />
                    <strong>Dirección académica</strong>
                    <span>GHC Academy</span>
                  </div>

                  <CertificateSeal />
                </div>

                <div className="ghc-verification-strip">
                  ID verificable: {normalizedCertificate.verificationSlug}
                </div>
              </div>
            </div>
          </article>
        </div>

        <aside className="ghc-verification-panel">
          <div className="ghc-verification-card">
            <p className="ghc-kicker">Verificación</p>
            <h2>Estado del certificado</h2>

            <div
              className={
                normalizedCertificate.isRevoked
                  ? "ghc-result-box ghc-result-box-revoked"
                  : "ghc-result-box ghc-result-box-valid"
              }
            >
              <strong>{normalizedCertificate.statusLabel}</strong>
              <p>{normalizedCertificate.statusDescription}</p>
            </div>

            <dl className="ghc-data-list">
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

          <div className="ghc-info-card">
            <p>
              La autenticidad se comprueba mediante el identificador público del
              certificado y su estado registrado en GHC Academy.
            </p>

            <Link href="/alumno" className="ghc-primary-button">
              Ir al área de alumno
            </Link>
          </div>
        </aside>
      </section>

      <CertificateStyles />
    </main>
  );
}

function CertificateStyles() {
  return (
    <style jsx global>{`
      :root {
        --ghc-bg: #050806;
        --ghc-panel: #0a0f0c;
        --ghc-panel-soft: #0e1510;
        --ghc-text: #f4f7f2;
        --ghc-muted: #aab5ae;
        --ghc-muted-2: #7d8981;
        --ghc-green: #22d65b;
        --ghc-green-soft: rgba(34, 214, 91, 0.12);
        --ghc-line: rgba(255, 255, 255, 0.1);
        --ghc-paper: #f2f0e8;
        --ghc-ink: #101611;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        background: var(--ghc-bg);
      }

      .ghc-page {
        position: relative;
        min-height: 100vh;
        overflow-x: hidden;
        background:
          radial-gradient(
            circle at top,
            rgba(255, 255, 255, 0.055),
            transparent 34%
          ),
          linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.03),
            transparent 22%
          ),
          var(--ghc-bg);
        color: var(--ghc-text);
      }

      .ghc-bg-orb {
        pointer-events: none;
        position: fixed;
        z-index: 0;
        width: 34rem;
        height: 34rem;
        border-radius: 999px;
        filter: blur(80px);
      }

      .ghc-bg-orb-left {
        top: -18rem;
        left: -14rem;
        background: rgba(34, 214, 91, 0.08);
      }

      .ghc-bg-orb-right {
        right: -14rem;
        bottom: -16rem;
        background: rgba(122, 138, 128, 0.08);
      }

      .ghc-bg-texture {
        pointer-events: none;
        position: fixed;
        inset: 0;
        z-index: 0;
        background-image:
          linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
          linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.025) 1px,
            transparent 1px
          );
        background-size: 44px 44px;
        mask-image: linear-gradient(to bottom, black, transparent 70%);
      }

      .ghc-header {
        position: relative;
        z-index: 5;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(5, 8, 6, 0.88);
        backdrop-filter: blur(18px);
      }

      .ghc-header-inner {
        width: min(1240px, calc(100% - 40px));
        margin: 0 auto;
        min-height: 74px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
      }

      .ghc-topbar-brand,
      .ghc-diploma-brand {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .ghc-topbar-logo {
        width: 44px;
        height: 44px;
        border-radius: 17px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(34, 214, 91, 0.25);
        background: #0a130e;
        color: #effff4;
        font-size: 13px;
        font-weight: 950;
        letter-spacing: -0.08em;
        box-shadow: 0 0 26px rgba(34, 214, 91, 0.12);
      }

      .ghc-topbar-title,
      .ghc-topbar-subtitle,
      .ghc-diploma-brand-title,
      .ghc-diploma-brand-subtitle {
        margin: 0;
        text-transform: uppercase;
      }

      .ghc-topbar-title {
        color: #f3f7f1;
        font-size: 14px;
        font-weight: 950;
        letter-spacing: 0.22em;
      }

      .ghc-topbar-subtitle {
        margin-top: 4px;
        color: #8d9990;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.28em;
      }

      .ghc-header-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 40px;
        padding: 0 18px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.055);
        color: #dce5de;
        text-decoration: none;
        font-size: 12px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        transition:
          transform 180ms ease,
          border-color 180ms ease,
          background 180ms ease;
      }

      .ghc-header-link:hover {
        transform: translateY(-1px);
        border-color: rgba(34, 214, 91, 0.35);
        background: rgba(34, 214, 91, 0.1);
        color: #fff;
      }

      .ghc-main-shell {
        position: relative;
        z-index: 2;
        width: min(1240px, calc(100% - 40px));
        margin: 0 auto;
        padding: 28px 0 48px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) 360px;
        gap: 24px;
        align-items: start;
      }

      .ghc-content-column {
        min-width: 0;
      }

      .ghc-page-heading {
        margin-bottom: 16px;
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 18px;
      }

      .ghc-kicker {
        margin: 0;
        color: var(--ghc-green);
        font-size: 12px;
        line-height: 1.2;
        font-weight: 950;
        text-transform: uppercase;
        letter-spacing: 0.28em;
      }

      .ghc-page-heading h1 {
        margin: 10px 0 0;
        color: var(--ghc-text);
        font-size: clamp(26px, 3vw, 36px);
        line-height: 1.05;
        font-weight: 950;
        letter-spacing: -0.045em;
      }

      .ghc-status-pill {
        flex: 0 0 auto;
        border-radius: 999px;
        padding: 10px 16px;
        font-size: 11px;
        font-weight: 950;
        text-transform: uppercase;
        letter-spacing: 0.18em;
      }

      .ghc-status-pill-valid {
        border: 1px solid rgba(34, 214, 91, 0.35);
        background: rgba(34, 214, 91, 0.1);
        color: #b9ffd0;
      }

      .ghc-status-pill-revoked {
        border: 1px solid rgba(255, 107, 107, 0.35);
        background: rgba(255, 107, 107, 0.1);
        color: #ffb3b3;
      }

      .ghc-diploma-frame {
        width: 100%;
        overflow: hidden;
        border-radius: 32px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: #0a0f0c;
        padding: 12px;
        box-shadow: 0 24px 90px rgba(0, 0, 0, 0.42);
      }

      .ghc-diploma {
        position: relative;
        overflow: hidden;
        min-height: 620px;
        border-radius: 25px;
        background: var(--ghc-paper);
        color: var(--ghc-ink);
        box-shadow: inset 0 0 0 1px rgba(16, 22, 17, 0.03);
      }

      .ghc-diploma-glow {
        position: absolute;
        z-index: 0;
        width: 360px;
        height: 360px;
        border-radius: 999px;
        filter: blur(18px);
      }

      .ghc-diploma-glow-left {
        top: -170px;
        left: -120px;
        background: rgba(34, 214, 91, 0.14);
      }

      .ghc-diploma-glow-right {
        right: -150px;
        bottom: -160px;
        background: rgba(10, 15, 12, 0.12);
      }

      .ghc-diploma-border-one,
      .ghc-diploma-border-two {
        position: absolute;
        pointer-events: none;
        z-index: 1;
        border-radius: 20px;
      }

      .ghc-diploma-border-one {
        inset: 22px;
        border: 1px solid rgba(16, 22, 17, 0.1);
      }

      .ghc-diploma-border-two {
        inset: 34px;
        border: 1px solid rgba(34, 214, 91, 0.22);
      }

      .ghc-diploma-content {
        position: relative;
        z-index: 2;
        min-height: 620px;
        padding: 34px 42px 30px;
        display: flex;
        flex-direction: column;
      }

      .ghc-diploma-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
      }

      .ghc-diploma-logo {
        position: relative;
        width: 52px;
        height: 52px;
        flex: 0 0 auto;
        border-radius: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(29, 111, 58, 0.4);
        background: #07110c;
        color: #effff4;
        font-size: 15px;
        font-weight: 950;
        letter-spacing: -0.08em;
        box-shadow: 0 0 24px rgba(34, 214, 91, 0.16);
      }

      .ghc-diploma-logo::after {
        content: "";
        position: absolute;
        inset: 5px;
        border-radius: 13px;
        border: 1px solid rgba(34, 214, 91, 0.3);
      }

      .ghc-diploma-brand-title {
        color: #111815;
        font-size: 18px;
        line-height: 1;
        font-weight: 950;
        letter-spacing: 0.18em;
      }

      .ghc-diploma-brand-subtitle {
        margin-top: 7px;
        color: #5b675f;
        font-size: 9px;
        line-height: 1;
        font-weight: 900;
        letter-spacing: 0.32em;
      }

      .ghc-diploma-status {
        border-radius: 999px;
        padding: 10px 15px;
        font-size: 10px;
        font-weight: 950;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        white-space: nowrap;
      }

      .ghc-diploma-status-valid {
        border: 1px solid rgba(23, 125, 62, 0.25);
        background: rgba(34, 214, 91, 0.12);
        color: #0b5e2d;
      }

      .ghc-diploma-status-revoked {
        border: 1px solid rgba(169, 54, 54, 0.25);
        background: rgba(169, 54, 54, 0.1);
        color: #8d2323;
      }

      .ghc-diploma-center {
        width: min(760px, 100%);
        margin: 56px auto 0;
        text-align: center;
      }

      .ghc-diploma-small-title {
        margin: 0;
        color: #69736d;
        font-size: 11px;
        font-weight: 950;
        text-transform: uppercase;
        letter-spacing: 0.36em;
      }

      .ghc-diploma-center h2 {
        margin: 22px 0 0;
        color: #101611;
        font-size: clamp(42px, 6vw, 72px);
        line-height: 0.95;
        font-weight: 950;
        letter-spacing: -0.055em;
      }

      .ghc-diploma-divider {
        width: 180px;
        height: 1px;
        margin: 24px auto 0;
        background: linear-gradient(
          90deg,
          transparent,
          var(--ghc-green),
          transparent
        );
      }

      .ghc-diploma-description {
        width: min(620px, 100%);
        margin: 24px auto 0;
        color: #56615a;
        font-size: 15px;
        line-height: 1.8;
        font-weight: 700;
      }

      .ghc-diploma-center h3 {
        width: min(760px, 100%);
        margin: 12px auto 0;
        color: var(--ghc-green);
        font-size: clamp(26px, 3vw, 38px);
        line-height: 1.12;
        font-weight: 950;
        letter-spacing: -0.035em;
      }

      .ghc-diploma-legal {
        width: min(680px, 100%);
        margin: 24px auto 0;
        color: #5f6963;
        font-size: 14px;
        line-height: 1.8;
      }

      .ghc-diploma-metrics {
        margin-top: 34px;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }

      .ghc-diploma-metrics div {
        min-width: 0;
        border: 1px solid rgba(16, 22, 17, 0.1);
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.45);
        padding: 16px;
        text-align: center;
        box-shadow: 0 10px 22px rgba(16, 22, 17, 0.035);
      }

      .ghc-diploma-metrics span {
        display: block;
        color: #69736d;
        font-size: 10px;
        font-weight: 950;
        text-transform: uppercase;
        letter-spacing: 0.22em;
      }

      .ghc-diploma-metrics strong {
        display: block;
        margin-top: 8px;
        color: #101611;
        font-size: 16px;
        line-height: 1.25;
        font-weight: 950;
        overflow-wrap: anywhere;
      }

      .ghc-diploma-metrics div:first-child strong {
        font-size: 22px;
      }

      .ghc-diploma-footer {
        margin-top: auto;
        padding-top: 34px;
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 24px;
      }

      .ghc-signature div {
        width: 230px;
        height: 1px;
        margin-bottom: 12px;
        background: rgba(16, 22, 17, 0.35);
      }

      .ghc-signature strong {
        display: block;
        color: #101611;
        font-size: 14px;
        font-weight: 950;
      }

      .ghc-signature span {
        display: block;
        margin-top: 5px;
        color: #69736d;
        font-size: 11px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.2em;
      }

      .ghc-seal {
        width: 98px;
        height: 98px;
        flex: 0 0 auto;
        border-radius: 999px;
        border: 1px solid rgba(34, 214, 91, 0.4);
        background: #07110c;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 34px rgba(34, 214, 91, 0.18);
      }

      .ghc-seal-inner {
        width: 76px;
        height: 76px;
        border-radius: 999px;
        border: 1px solid rgba(34, 214, 91, 0.25);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }

      .ghc-seal-inner p {
        margin: 0;
        color: #effff4;
        font-size: 18px;
        line-height: 1;
        font-weight: 950;
        letter-spacing: -0.08em;
      }

      .ghc-seal-inner span {
        margin-top: 5px;
        color: var(--ghc-green);
        font-size: 8px;
        line-height: 1;
        font-weight: 950;
        text-transform: uppercase;
        letter-spacing: 0.22em;
      }

      .ghc-verification-strip {
        margin-top: 24px;
        border: 1px solid rgba(16, 22, 17, 0.1);
        border-radius: 16px;
        background: rgba(16, 22, 17, 0.045);
        padding: 12px 14px;
        color: #68736d;
        text-align: center;
        font-size: 10px;
        line-height: 1.5;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        overflow-wrap: anywhere;
      }

      .ghc-verification-panel {
        position: sticky;
        top: 96px;
        display: grid;
        gap: 16px;
      }

      .ghc-verification-card,
      .ghc-info-card,
      .ghc-state-card {
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 32px;
        background: rgba(10, 15, 12, 0.94);
        box-shadow: 0 24px 90px rgba(0, 0, 0, 0.34);
        backdrop-filter: blur(18px);
      }

      .ghc-verification-card {
        padding: 22px;
      }

      .ghc-verification-card h2 {
        margin: 12px 0 0;
        color: var(--ghc-text);
        font-size: 22px;
        line-height: 1.12;
        font-weight: 950;
        letter-spacing: -0.035em;
      }

      .ghc-result-box {
        margin-top: 20px;
        border-radius: 20px;
        padding: 16px;
      }

      .ghc-result-box-valid {
        border: 1px solid rgba(34, 214, 91, 0.25);
        background: rgba(34, 214, 91, 0.1);
      }

      .ghc-result-box-revoked {
        border: 1px solid rgba(255, 107, 107, 0.25);
        background: rgba(255, 107, 107, 0.1);
      }

      .ghc-result-box strong {
        display: block;
        color: #b9ffd0;
        font-size: 14px;
        font-weight: 950;
        text-transform: uppercase;
        letter-spacing: 0.2em;
      }

      .ghc-result-box-revoked strong {
        color: #ffb3b3;
      }

      .ghc-result-box p,
      .ghc-info-card p,
      .ghc-state-card p {
        margin: 12px 0 0;
        color: var(--ghc-muted);
        font-size: 14px;
        line-height: 1.8;
      }

      .ghc-data-list {
        margin: 20px 0 0;
        display: grid;
        gap: 12px;
      }

      .ghc-data-list div {
        min-width: 0;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 18px;
        background: rgba(0, 0, 0, 0.2);
        padding: 15px;
      }

      .ghc-data-list dt {
        color: #77817a;
        font-size: 10px;
        font-weight: 950;
        text-transform: uppercase;
        letter-spacing: 0.22em;
      }

      .ghc-data-list dd {
        margin: 8px 0 0;
        color: var(--ghc-text);
        font-size: 14px;
        line-height: 1.55;
        font-weight: 800;
        overflow-wrap: anywhere;
      }

      .ghc-info-card {
        padding: 22px;
      }

      .ghc-primary-button,
      .ghc-secondary-button {
        width: 100%;
        margin-top: 20px;
        min-height: 48px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0 20px;
        text-decoration: none;
        font-size: 14px;
        font-weight: 950;
        transition:
          transform 180ms ease,
          border-color 180ms ease,
          background 180ms ease;
      }

      .ghc-primary-button {
        border: 1px solid rgba(34, 214, 91, 0.3);
        background: var(--ghc-green);
        color: #06100a;
        box-shadow: 0 0 30px rgba(34, 214, 91, 0.16);
      }

      .ghc-secondary-button {
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.06);
        color: var(--ghc-text);
      }

      .ghc-primary-button:hover,
      .ghc-secondary-button:hover {
        transform: translateY(-1px) scale(1.01);
      }

      .ghc-centered-shell {
        width: min(760px, calc(100% - 40px));
        min-height: 100vh;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .ghc-state-card {
        width: 100%;
        padding: 34px;
        text-align: center;
      }

      .ghc-state-card h1 {
        margin: 18px 0 0;
        color: var(--ghc-text);
        font-size: 26px;
        line-height: 1.15;
        font-weight: 950;
        letter-spacing: -0.035em;
      }

      .ghc-state-card strong {
        color: var(--ghc-text);
      }

      .ghc-spinner {
        width: 42px;
        height: 42px;
        margin: 0 auto;
        border-radius: 999px;
        border: 2px solid rgba(34, 214, 91, 0.2);
        border-top-color: var(--ghc-green);
        animation: ghc-spin 850ms linear infinite;
      }

      .ghc-warning-badge {
        width: 56px;
        height: 56px;
        margin: 0 auto;
        border-radius: 20px;
        border: 1px solid rgba(245, 199, 106, 0.25);
        background: rgba(245, 199, 106, 0.1);
        color: #f5c76a;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        font-weight: 950;
      }

      @keyframes ghc-spin {
        to {
          transform: rotate(360deg);
        }
      }

      @media (max-width: 1100px) {
        .ghc-main-shell {
          grid-template-columns: 1fr;
        }

        .ghc-verification-panel {
          position: static;
          grid-template-columns: 1fr;
        }

        .ghc-diploma {
          min-height: auto;
        }

        .ghc-diploma-content {
          min-height: auto;
        }
      }

      @media (max-width: 760px) {
        .ghc-header-inner,
        .ghc-main-shell {
          width: min(100% - 28px, 1240px);
        }

        .ghc-header-inner {
          min-height: 70px;
        }

        .ghc-topbar-title {
          font-size: 12px;
          letter-spacing: 0.18em;
        }

        .ghc-topbar-subtitle {
          font-size: 9px;
          letter-spacing: 0.2em;
        }

        .ghc-header-link {
          padding: 0 13px;
          font-size: 10px;
          letter-spacing: 0.1em;
        }

        .ghc-page-heading {
          align-items: flex-start;
          flex-direction: column;
        }

        .ghc-diploma-frame {
          border-radius: 24px;
          padding: 8px;
        }

        .ghc-diploma {
          border-radius: 20px;
        }

        .ghc-diploma-border-one {
          inset: 14px;
        }

        .ghc-diploma-border-two {
          inset: 24px;
        }

        .ghc-diploma-content {
          padding: 26px 24px 24px;
        }

        .ghc-diploma-top {
          flex-direction: column;
        }

        .ghc-diploma-brand-title {
          font-size: 15px;
          letter-spacing: 0.14em;
        }

        .ghc-diploma-center {
          margin-top: 36px;
        }

        .ghc-diploma-center h2 {
          font-size: 42px;
        }

        .ghc-diploma-center h3 {
          font-size: 26px;
        }

        .ghc-diploma-metrics {
          grid-template-columns: 1fr;
        }

        .ghc-diploma-footer {
          align-items: flex-start;
          flex-direction: column;
        }

        .ghc-signature div {
          width: 220px;
        }

        .ghc-seal {
          width: 92px;
          height: 92px;
        }
      }
    `}</style>
  );
}
