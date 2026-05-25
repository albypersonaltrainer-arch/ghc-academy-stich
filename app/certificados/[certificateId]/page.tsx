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

function GhcLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "ghc-logo ghc-logo-compact" : "ghc-logo"}>
      <img src={LOGO_SRC} alt="GHC Academy" />
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
    <main className="ghc-page">
      <section className="ghc-state">
        <GhcLogo />

        {type === "loading" ? <div className="ghc-spinner" /> : null}

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
          <Link href="/alumno" className="ghc-button">
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
    <main className="ghc-page">
      <div className="ghc-bg-grid" />
      <div className="ghc-orb ghc-orb-a" />
      <div className="ghc-orb ghc-orb-b" />

      <header className="ghc-header">
        <div className="ghc-header-inner">
          <GhcLogo compact />

          <Link href="/alumno" className="ghc-header-link">
            Área alumno
          </Link>
        </div>
      </header>

      <section className="ghc-shell">
        <div className="ghc-title-row">
          <div>
            <p className="ghc-kicker">Certificado verificable</p>
            <h1>Validación académica GHC Academy</h1>
          </div>

          <span
            className={
              normalizedCertificate.isRevoked
                ? "ghc-status ghc-status-revoked"
                : "ghc-status ghc-status-valid"
            }
          >
            {normalizedCertificate.statusLabel}
          </span>
        </div>

        <div className="ghc-layout">
          <article className="ghc-certificate">
            <div className="ghc-certificate-inner">
              <div className="ghc-certificate-border" />
              <div className="ghc-certificate-glow" />

              <div className="ghc-certificate-top">
                <GhcLogo />

                <span
                  className={
                    normalizedCertificate.isRevoked
                      ? "ghc-cert-status ghc-cert-status-revoked"
                      : "ghc-cert-status ghc-cert-status-valid"
                  }
                >
                  {normalizedCertificate.statusLabel}
                </span>
              </div>

              <div className="ghc-certificate-body">
                <p className="ghc-mini-title">Certifica que</p>

                <h2>{normalizedCertificate.studentName}</h2>

                <div className="ghc-line" />

                <p className="ghc-body-text">
                  ha completado satisfactoriamente el programa académico
                </p>

                <h3>{normalizedCertificate.courseTitle}</h3>

                <p className="ghc-body-note">
                  Certificación emitida por GHC Academy bajo criterio académico
                  profesional, con verificación digital vinculada a alumno,
                  curso, fecha y estado.
                </p>
              </div>

              <div className="ghc-metrics">
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

              <div className="ghc-cert-footer">
                <div className="ghc-signature">
                  <div className="ghc-signature-line" />
                  <strong>Dirección académica</strong>
                  <span>GHC Academy</span>
                </div>

                <div className="ghc-seal">
                  <span>GHC</span>
                  <small>Verified</small>
                </div>
              </div>

              <div className="ghc-id-strip">
                ID verificable: {normalizedCertificate.verificationSlug}
              </div>
            </div>
          </article>

          <aside className="ghc-panel">
            <div className="ghc-panel-card">
              <p className="ghc-kicker">Verificación</p>
              <h2>Estado del certificado</h2>

              <div
                className={
                  normalizedCertificate.isRevoked
                    ? "ghc-result ghc-result-revoked"
                    : "ghc-result ghc-result-valid"
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

            <div className="ghc-panel-note">
              <p>
                La autenticidad se comprueba mediante el identificador público
                del certificado y su estado registrado en GHC Academy.
              </p>

              <Link href="/alumno" className="ghc-button">
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
        --panel: #0a0f0c;
        --panel-2: #0e1511;
        --panel-3: #121b15;
        --line: rgba(255, 255, 255, 0.1);
        --line-strong: rgba(255, 255, 255, 0.16);
        --text: #f4f7f2;
        --muted: #aeb8b1;
        --muted-2: #7e8a83;
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

      .ghc-page {
        position: relative;
        min-height: 100vh;
        overflow-x: hidden;
        background:
          radial-gradient(circle at 20% 0%, rgba(34, 214, 91, 0.08), transparent 30%),
          radial-gradient(circle at 90% 20%, rgba(255, 255, 255, 0.05), transparent 28%),
          linear-gradient(180deg, #050806 0%, #080d0a 48%, #050806 100%);
        color: var(--text);
      }

      .ghc-bg-grid {
        pointer-events: none;
        position: fixed;
        inset: 0;
        z-index: 0;
        opacity: 0.28;
        background-image:
          linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
        background-size: 46px 46px;
        mask-image: linear-gradient(to bottom, black, transparent 75%);
      }

      .ghc-orb {
        pointer-events: none;
        position: fixed;
        z-index: 0;
        border-radius: 999px;
        filter: blur(90px);
      }

      .ghc-orb-a {
        width: 34rem;
        height: 34rem;
        left: -18rem;
        top: -18rem;
        background: rgba(34, 214, 91, 0.12);
      }

      .ghc-orb-b {
        width: 32rem;
        height: 32rem;
        right: -18rem;
        bottom: -18rem;
        background: rgba(130, 145, 136, 0.09);
      }

      .ghc-header {
        position: relative;
        z-index: 5;
        border-bottom: 1px solid var(--line);
        background: rgba(5, 8, 6, 0.88);
        backdrop-filter: blur(18px);
      }

      .ghc-header-inner {
        width: min(1240px, calc(100% - 40px));
        min-height: 76px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
      }

      .ghc-logo {
        display: flex;
        align-items: center;
        width: 230px;
        max-width: 100%;
      }

      .ghc-logo img {
        display: block;
        width: 100%;
        height: auto;
        object-fit: contain;
      }

      .ghc-logo-compact {
        width: 190px;
      }

      .ghc-header-link,
      .ghc-button {
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

      .ghc-header-link {
        min-height: 40px;
        padding: 0 18px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.055);
        color: #dce5de;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
      }

      .ghc-header-link:hover {
        transform: translateY(-1px);
        border-color: rgba(34, 214, 91, 0.35);
        background: rgba(34, 214, 91, 0.1);
      }

      .ghc-shell {
        position: relative;
        z-index: 2;
        width: min(1240px, calc(100% - 40px));
        margin: 0 auto;
        padding: 30px 0 54px;
      }

      .ghc-title-row {
        margin-bottom: 18px;
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 20px;
      }

      .ghc-kicker {
        margin: 0;
        color: var(--green);
        font-size: 12px;
        line-height: 1.2;
        font-weight: 950;
        text-transform: uppercase;
        letter-spacing: 0.28em;
      }

      .ghc-title-row h1 {
        margin: 10px 0 0;
        color: var(--text);
        font-size: clamp(28px, 3.2vw, 42px);
        line-height: 1.02;
        font-weight: 950;
        letter-spacing: -0.055em;
      }

      .ghc-status,
      .ghc-cert-status {
        flex: 0 0 auto;
        border-radius: 999px;
        font-weight: 950;
        text-transform: uppercase;
        white-space: nowrap;
      }

      .ghc-status {
        padding: 10px 16px;
        font-size: 11px;
        letter-spacing: 0.18em;
      }

      .ghc-status-valid,
      .ghc-cert-status-valid {
        border: 1px solid rgba(34, 214, 91, 0.35);
        background: rgba(34, 214, 91, 0.1);
        color: #b9ffd0;
      }

      .ghc-status-revoked,
      .ghc-cert-status-revoked {
        border: 1px solid rgba(255, 107, 107, 0.35);
        background: rgba(255, 107, 107, 0.1);
        color: #ffb3b3;
      }

      .ghc-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 360px;
        gap: 24px;
        align-items: start;
      }

      .ghc-certificate {
        min-width: 0;
        border-radius: 34px;
        border: 1px solid var(--line);
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.08), transparent 24%),
          linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.025)),
          #080d0a;
        padding: 12px;
        box-shadow:
          0 28px 90px rgba(0, 0, 0, 0.46),
          inset 0 1px 0 rgba(255, 255, 255, 0.08);
      }

      .ghc-certificate-inner {
        position: relative;
        overflow: hidden;
        min-height: 640px;
        border-radius: 26px;
        border: 1px solid rgba(255, 255, 255, 0.13);
        background:
          radial-gradient(circle at 18% 0%, rgba(34, 214, 91, 0.13), transparent 32%),
          radial-gradient(circle at 90% 100%, rgba(255, 255, 255, 0.065), transparent 34%),
          linear-gradient(145deg, #101812 0%, #0a100c 48%, #07100b 100%);
        box-shadow: inset 0 0 0 1px rgba(34, 214, 91, 0.045);
        padding: 38px 42px 32px;
      }

      .ghc-certificate-border {
        pointer-events: none;
        position: absolute;
        inset: 22px;
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, 0.11);
      }

      .ghc-certificate-glow {
        pointer-events: none;
        position: absolute;
        width: 420px;
        height: 420px;
        right: -170px;
        top: -180px;
        border-radius: 999px;
        background: rgba(34, 214, 91, 0.1);
        filter: blur(70px);
      }

      .ghc-certificate-top {
        position: relative;
        z-index: 2;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 22px;
      }

      .ghc-certificate-top .ghc-logo {
        width: 245px;
      }

      .ghc-cert-status {
        padding: 10px 15px;
        font-size: 10px;
        letter-spacing: 0.18em;
      }

      .ghc-certificate-body {
        position: relative;
        z-index: 2;
        width: min(780px, 100%);
        margin: 64px auto 0;
        text-align: center;
      }

      .ghc-mini-title {
        margin: 0;
        color: var(--muted-2);
        font-size: 11px;
        font-weight: 950;
        text-transform: uppercase;
        letter-spacing: 0.36em;
      }

      .ghc-certificate-body h2 {
        margin: 24px 0 0;
        color: var(--text);
        font-size: clamp(52px, 6.5vw, 86px);
        line-height: 0.9;
        font-weight: 950;
        letter-spacing: -0.07em;
      }

      .ghc-line {
        width: 210px;
        height: 1px;
        margin: 28px auto 0;
        background: linear-gradient(90deg, transparent, var(--green), transparent);
      }

      .ghc-body-text {
        margin: 26px auto 0;
        max-width: 650px;
        color: var(--muted);
        font-size: 15px;
        line-height: 1.75;
        font-weight: 700;
      }

      .ghc-certificate-body h3 {
        margin: 14px auto 0;
        max-width: 760px;
        color: var(--green);
        font-size: clamp(30px, 3.4vw, 46px);
        line-height: 1.08;
        font-weight: 950;
        letter-spacing: -0.045em;
      }

      .ghc-body-note {
        margin: 26px auto 0;
        max-width: 690px;
        color: #8d9990;
        font-size: 14px;
        line-height: 1.8;
      }

      .ghc-metrics {
        position: relative;
        z-index: 2;
        margin-top: 38px;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }

      .ghc-metrics div {
        min-width: 0;
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, 0.105);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.025)),
          rgba(255, 255, 255, 0.035);
        padding: 18px;
        text-align: center;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
      }

      .ghc-metrics span {
        display: block;
        color: #7e8a83;
        font-size: 10px;
        font-weight: 950;
        text-transform: uppercase;
        letter-spacing: 0.22em;
      }

      .ghc-metrics strong {
        display: block;
        margin-top: 10px;
        color: var(--text);
        font-size: 16px;
        line-height: 1.25;
        font-weight: 950;
        overflow-wrap: anywhere;
      }

      .ghc-metrics div:first-child strong {
        color: var(--green);
        font-size: 24px;
      }

      .ghc-cert-footer {
        position: relative;
        z-index: 2;
        margin-top: 42px;
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 24px;
      }

      .ghc-signature-line {
        width: 235px;
        height: 1px;
        margin-bottom: 14px;
        background: rgba(255, 255, 255, 0.24);
      }

      .ghc-signature strong {
        display: block;
        color: var(--text);
        font-size: 14px;
        font-weight: 950;
      }

      .ghc-signature span {
        display: block;
        margin-top: 6px;
        color: #7e8a83;
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
        border: 1px solid rgba(34, 214, 91, 0.42);
        background:
          radial-gradient(circle at 50% 0%, rgba(34, 214, 91, 0.16), transparent 55%),
          #07110c;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 34px rgba(34, 214, 91, 0.16);
      }

      .ghc-seal span {
        color: var(--text);
        font-size: 20px;
        line-height: 1;
        font-weight: 950;
        letter-spacing: -0.08em;
      }

      .ghc-seal small {
        margin-top: 6px;
        color: var(--green);
        font-size: 8px;
        font-weight: 950;
        text-transform: uppercase;
        letter-spacing: 0.22em;
      }

      .ghc-id-strip {
        position: relative;
        z-index: 2;
        margin-top: 28px;
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.09);
        background: rgba(0, 0, 0, 0.16);
        padding: 12px 14px;
        color: #7e8a83;
        text-align: center;
        font-size: 10px;
        line-height: 1.5;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        overflow-wrap: anywhere;
      }

      .ghc-panel {
        position: sticky;
        top: 96px;
        display: grid;
        gap: 16px;
      }

      .ghc-panel-card,
      .ghc-panel-note,
      .ghc-state {
        border-radius: 32px;
        border: 1px solid var(--line);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.025)),
          rgba(10, 15, 12, 0.94);
        box-shadow: 0 24px 90px rgba(0, 0, 0, 0.34);
        backdrop-filter: blur(18px);
      }

      .ghc-panel-card,
      .ghc-panel-note {
        padding: 22px;
      }

      .ghc-panel-card h2 {
        margin: 12px 0 0;
        color: var(--text);
        font-size: 22px;
        line-height: 1.12;
        font-weight: 950;
        letter-spacing: -0.035em;
      }

      .ghc-result {
        margin-top: 20px;
        border-radius: 20px;
        padding: 16px;
      }

      .ghc-result-valid {
        border: 1px solid rgba(34, 214, 91, 0.25);
        background: rgba(34, 214, 91, 0.1);
      }

      .ghc-result-revoked {
        border: 1px solid rgba(255, 107, 107, 0.25);
        background: rgba(255, 107, 107, 0.1);
      }

      .ghc-result strong {
        display: block;
        color: #b9ffd0;
        font-size: 14px;
        font-weight: 950;
        text-transform: uppercase;
        letter-spacing: 0.2em;
      }

      .ghc-result-revoked strong {
        color: #ffb3b3;
      }

      .ghc-result p,
      .ghc-panel-note p,
      .ghc-state p {
        margin: 12px 0 0;
        color: var(--muted);
        font-size: 14px;
        line-height: 1.8;
      }

      .ghc-panel dl {
        margin: 20px 0 0;
        display: grid;
        gap: 12px;
      }

      .ghc-panel dl div {
        min-width: 0;
        border-radius: 18px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(0, 0, 0, 0.2);
        padding: 15px;
      }

      .ghc-panel dt {
        color: #77817a;
        font-size: 10px;
        font-weight: 950;
        text-transform: uppercase;
        letter-spacing: 0.22em;
      }

      .ghc-panel dd {
        margin: 8px 0 0;
        color: var(--text);
        font-size: 14px;
        line-height: 1.55;
        font-weight: 800;
        overflow-wrap: anywhere;
      }

      .ghc-button {
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

      .ghc-button:hover {
        transform: translateY(-1px) scale(1.01);
      }

      .ghc-state {
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
        background: transparent;
        box-shadow: none;
        border: none;
      }

      .ghc-state h1 {
        margin: 26px 0 0;
        color: var(--text);
        font-size: 32px;
        line-height: 1.1;
        font-weight: 950;
        letter-spacing: -0.045em;
      }

      .ghc-state strong {
        color: var(--text);
      }

      .ghc-spinner {
        width: 42px;
        height: 42px;
        margin-top: 30px;
        border-radius: 999px;
        border: 2px solid rgba(34, 214, 91, 0.2);
        border-top-color: var(--green);
        animation: ghc-spin 850ms linear infinite;
      }

      @keyframes ghc-spin {
        to {
          transform: rotate(360deg);
        }
      }

      @media (max-width: 1120px) {
        .ghc-layout {
          grid-template-columns: 1fr;
        }

        .ghc-panel {
          position: static;
        }
      }

      @media (max-width: 760px) {
        .ghc-header-inner,
        .ghc-shell {
          width: min(100% - 28px, 1240px);
        }

        .ghc-logo {
          width: 190px;
        }

        .ghc-logo-compact {
          width: 160px;
        }

        .ghc-header-link {
          padding: 0 13px;
          font-size: 10px;
          letter-spacing: 0.1em;
        }

        .ghc-title-row {
          flex-direction: column;
          align-items: flex-start;
        }

        .ghc-certificate {
          border-radius: 24px;
          padding: 8px;
        }

        .ghc-certificate-inner {
          min-height: auto;
          border-radius: 19px;
          padding: 28px 24px 24px;
        }

        .ghc-certificate-border {
          inset: 14px;
        }

        .ghc-certificate-top {
          flex-direction: column;
        }

        .ghc-certificate-top .ghc-logo {
          width: 210px;
        }

        .ghc-certificate-body {
          margin-top: 42px;
        }

        .ghc-certificate-body h2 {
          font-size: 46px;
        }

        .ghc-certificate-body h3 {
          font-size: 30px;
        }

        .ghc-metrics {
          grid-template-columns: 1fr;
        }

        .ghc-cert-footer {
          flex-direction: column;
          align-items: flex-start;
        }

        .ghc-signature-line {
          width: 220px;
        }
      }
    `}</style>
  );
}
