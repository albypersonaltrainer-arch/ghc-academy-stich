'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

type Certificate = {
  certificate_id?: string;
  id?: string;
  certificate_code: string;
  verification_slug?: string;
  student_name: string;
  course_id?: string;
  course_title: string;
  final_score: number;
  issued_at: string;
  status: 'valid' | 'revoked' | string;
};

const GHC_GREEN = '#63E546';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function CertificateVerificationPage() {
  const params = useParams();
  const certificateId = decodeURIComponent(String(params.certificateId || ''));

  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'preview' | 'supabase' | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function loadCertificate() {
      try {
        setLoading(true);
        setMessage('');

        const previewCertificate = loadPreviewCertificate(certificateId);

        if (previewCertificate) {
          setCertificate(previewCertificate);
          setSource('preview');
          setLoading(false);
          return;
        }

        const realCertificate = await findCertificateInSupabase(certificateId);

        if (!realCertificate) {
          setMessage('No se ha encontrado ningún certificado con este identificador.');
          setLoading(false);
          return;
        }

        setCertificate(realCertificate);
        setSource('supabase');
        setLoading(false);
      } catch (error) {
        console.error('Unexpected certificate error:', error);
        setMessage('No se pudo consultar el certificado.');
        setLoading(false);
      }
    }

    if (certificateId) {
      loadCertificate();
    } else {
      setMessage('No se recibió un identificador de certificado.');
      setLoading(false);
    }
  }, [certificateId]);

  if (loading) {
    return (
      <main className="ghc-cert-page ghc-cert-center">
        <Background />
        <section className="ghc-message-card">
          <p>GHC Academy</p>
          <h1>Verificando certificado</h1>
          <span>Estamos comprobando la validez pública de la credencial digital.</span>
        </section>
        <GlobalStyles />
      </main>
    );
  }

  if (!certificate) {
    return (
      <main className="ghc-cert-page ghc-cert-center">
        <Background />
        <section className="ghc-message-card ghc-message-error">
          <Link href="/alumno" className="ghc-soft-link">
            ← Volver al área alumno
          </Link>
          <p>Certificado no encontrado</p>
          <h1>No se pudo verificar</h1>
          <span>{message}</span>
        </section>
        <GlobalStyles />
      </main>
    );
  }

  const isValid = certificate.status === 'valid';
  const publicId =
    certificate.verification_slug ||
    certificate.certificate_id ||
    certificate.id ||
    certificateId;

  return (
    <main className="ghc-cert-page">
      <Background />

      <section className="ghc-cert-shell">
        <header className="ghc-cert-topbar">
          <Link href="/alumno" className="ghc-top-brand">
            <span>G</span>
            <strong>GHC</strong>
            <em>Academy</em>
          </Link>

          <nav>
            <Link href="/alumno">Área alumno</Link>
            <Link href="/alumno">Mis cursos</Link>
            <span className={isValid ? 'ghc-status-pill is-valid' : 'ghc-status-pill is-revoked'}>
              {isValid ? 'VÁLIDO' : 'REVOCADO'}
            </span>
          </nav>
        </header>

        <section className="ghc-cert-layout">
          <article className="ghc-diploma">
            <div className="ghc-diploma-bg-grid" />
            <div className="ghc-diploma-watermark">GHC</div>

            <header className="ghc-diploma-head">
              <div className="ghc-diploma-brand">
                <span className="ghc-diploma-logo">G</span>
                <div>
                  <strong>GHC</strong>
                  <em>Academy</em>
                </div>
              </div>

              <div className={isValid ? 'ghc-diploma-state is-valid' : 'ghc-diploma-state is-revoked'}>
                <span>Estado</span>
                <strong>{isValid ? 'VÁLIDO' : 'REVOCADO'}</strong>
              </div>
            </header>

            <section className="ghc-diploma-center">
              <p className="ghc-diploma-kicker">Certificado oficial · Digital credential</p>
              <h1>Certificado de logro</h1>

              <p className="ghc-certifies">Se otorga a</p>
              <h2>{certificate.student_name}</h2>

              <p className="ghc-certifies">por completar satisfactoriamente el curso</p>
              <h3>{certificate.course_title}</h3>
            </section>

            <section className="ghc-diploma-data">
              <DataItem label="Nota final" value={`${certificate.final_score}%`} />
              <DataItem label="Fecha de emisión" value={formatDate(certificate.issued_at)} />
              <DataItem label="Código único" value={certificate.certificate_code} />
            </section>

            <footer className="ghc-diploma-footer">
              <div className="ghc-signature">
                <span />
                <p>Dirección académica</p>
              </div>

              <div className="ghc-diploma-footer-brand">
                <strong>GHC</strong>
                <span>Sport Through Science</span>
              </div>

              <div className="ghc-seal">
                <strong>GHC</strong>
                <span>{isValid ? 'VALID' : 'REVOKED'}</span>
              </div>
            </footer>
          </article>

          <aside className="ghc-verify-panel">
            <section>
              <p>Verificación pública</p>
              <strong>{certificate.certificate_code}</strong>
              <span>
                Credencial verificable vinculada al estado actual del certificado en GHC Academy.
              </span>
            </section>

            <section>
              <p>Alumno</p>
              <strong>{certificate.student_name}</strong>
              <span>{source === 'preview' ? 'Modo preview' : 'Verificado en Supabase'}</span>
            </section>

            <section>
              <p>ID público</p>
              <strong>{publicId}</strong>
              <span>Identificador público de consulta.</span>
            </section>

            <Link href="/alumno" className="ghc-primary-link">
              Volver al área alumno
            </Link>
          </aside>
        </section>

        {source === 'preview' && (
          <section className="ghc-preview-note">
            <strong>Modo preview:</strong> este certificado se ha generado en este navegador para validar el flujo.
            En producción, la credencial se emite desde Supabase y queda asociada al alumno real.
          </section>
        )}
      </section>

      <GlobalStyles />
    </main>
  );
}

function DataItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="ghc-diploma-data-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Background() {
  return (
    <div className="ghc-cert-bg" aria-hidden="true">
      <div className="ghc-cert-orb ghc-cert-orb-one" />
      <div className="ghc-cert-orb ghc-cert-orb-two" />
      <div className="ghc-cert-bg-grid" />
    </div>
  );
}

async function findCertificateInSupabase(identifier: string): Promise<Certificate | null> {
  const cleanId = identifier.trim();

  const bySlug = await supabase
    .from('certificates')
    .select('*')
    .eq('verification_slug', cleanId)
    .maybeSingle();

  if (bySlug.error) {
    console.error('Certificate lookup by slug failed:', bySlug.error);
  }

  if (bySlug.data) {
    return mapSupabaseCertificate(bySlug.data);
  }

  const byCode = await supabase
    .from('certificates')
    .select('*')
    .eq('certificate_code', cleanId)
    .maybeSingle();

  if (byCode.error) {
    console.error('Certificate lookup by code failed:', byCode.error);
  }

  if (byCode.data) {
    return mapSupabaseCertificate(byCode.data);
  }

  if (isUuid(cleanId)) {
    const byId = await supabase
      .from('certificates')
      .select('*')
      .eq('id', cleanId)
      .maybeSingle();

    if (byId.error) {
      console.error('Certificate lookup by UUID failed:', byId.error);
    }

    if (byId.data) {
      return mapSupabaseCertificate(byId.data);
    }
  }

  return null;
}

function mapSupabaseCertificate(data: any): Certificate {
  return {
    id: data.id,
    certificate_code: data.certificate_code,
    verification_slug: data.verification_slug,
    student_name: data.student_name,
    course_id: data.course_id,
    course_title: data.course_title,
    final_score: data.final_score,
    issued_at: data.issued_at,
    status: data.status,
  };
}

function loadPreviewCertificate(identifier: string): Certificate | null {
  if (typeof window === 'undefined') return null;

  const keys = Object.keys(window.localStorage).filter((key) =>
    key.startsWith('ghc_preview_certificate_')
  );

  for (const key of keys) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;

      const certificate = JSON.parse(raw) as Certificate;

      const matches =
        certificate.verification_slug === identifier ||
        certificate.certificate_id === identifier ||
        certificate.certificate_code === identifier;

      if (matches && certificate.status === 'valid') {
        return certificate;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function formatDate(value?: string) {
  if (!value) return '—';

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

function GlobalStyles() {
  return (
    <style jsx global>{`
      :root {
        --ghc-green: ${GHC_GREEN};
        --ghc-green-rgb: 99, 229, 70;
        --ghc-bg: #050706;
        --ghc-white: #f4f6f2;
        --ghc-paper: #eef1dc;
        --ghc-ink: #111713;
        --ghc-muted: rgba(244,246,242,.62);
        --ghc-danger: #ff7777;
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

      body {
        color: var(--ghc-white);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      a {
        color: inherit;
      }

      .ghc-cert-page {
        min-height: 100vh;
        position: relative;
        overflow-x: hidden;
        background:
          radial-gradient(circle at 12% -10%, rgba(var(--ghc-green-rgb), .075), transparent 32%),
          radial-gradient(circle at 96% 8%, rgba(255,255,255,.035), transparent 28%),
          linear-gradient(135deg, #050706 0%, #070a09 46%, #030404 100%);
      }

      .ghc-cert-bg {
        position: fixed;
        inset: 0;
        pointer-events: none;
        overflow: hidden;
        z-index: 0;
      }

      .ghc-cert-orb {
        position: absolute;
        border-radius: 999px;
        filter: blur(100px);
      }

      .ghc-cert-orb-one {
        width: 520px;
        height: 520px;
        top: -220px;
        left: -180px;
        background: rgba(var(--ghc-green-rgb), .10);
      }

      .ghc-cert-orb-two {
        width: 520px;
        height: 520px;
        right: -260px;
        top: 110px;
        background: rgba(120,135,130,.09);
      }

      .ghc-cert-bg-grid {
        position: absolute;
        inset: 0;
        background-image:
          linear-gradient(rgba(255,255,255,.022) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,.022) 1px, transparent 1px);
        background-size: 42px 42px;
        opacity: .34;
        mask-image: radial-gradient(circle at center, black 0%, transparent 82%);
      }

      .ghc-cert-shell {
        width: min(1440px, calc(100vw - 40px));
        margin: 0 auto;
        padding: 18px 0 32px;
        position: relative;
        z-index: 1;
        display: grid;
        gap: 14px;
      }

      .ghc-cert-topbar {
        min-height: 56px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        border-bottom: 1px solid rgba(255,255,255,.07);
        padding-bottom: 10px;
      }

      .ghc-top-brand {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        text-decoration: none;
        text-transform: uppercase;
        letter-spacing: .22em;
      }

      .ghc-top-brand span {
        width: 32px;
        height: 32px;
        border-radius: 12px;
        border: 1px solid rgba(var(--ghc-green-rgb), .36);
        background: rgba(var(--ghc-green-rgb), .075);
        color: var(--ghc-green);
        display: grid;
        place-items: center;
        font-size: 13px;
        font-weight: 950;
      }

      .ghc-top-brand strong {
        color: var(--ghc-white);
        font-size: 18px;
        font-weight: 950;
        letter-spacing: .18em;
      }

      .ghc-top-brand em {
        color: rgba(244,246,242,.62);
        font-style: normal;
        font-size: 12px;
        font-weight: 850;
      }

      .ghc-cert-topbar nav {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        flex-wrap: wrap;
      }

      .ghc-cert-topbar nav a,
      .ghc-soft-link {
        min-height: 36px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.035);
        color: rgba(244,246,242,.78);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0 13px;
        text-decoration: none;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: .08em;
        text-transform: uppercase;
      }

      .ghc-status-pill {
        min-height: 36px;
        min-width: 90px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0 15px;
        font-size: 11px;
        font-weight: 950;
        letter-spacing: .12em;
        text-transform: uppercase;
      }

      .is-valid {
        border: 1px solid rgba(var(--ghc-green-rgb), .28);
        background: rgba(var(--ghc-green-rgb), .085);
        color: var(--ghc-green);
      }

      .is-revoked {
        border: 1px solid rgba(255,119,119,.30);
        background: rgba(255,119,119,.08);
        color: var(--ghc-danger);
      }

      .ghc-cert-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 320px;
        gap: 14px;
        align-items: start;
      }

      .ghc-diploma {
        position: relative;
        overflow: hidden;
        width: 100%;
        min-height: clamp(520px, 74vh, 700px);
        border-radius: 24px;
        border: 1px solid rgba(255,255,255,.13);
        background:
          radial-gradient(circle at 100% 0%, rgba(var(--ghc-green-rgb), .18), transparent 26%),
          linear-gradient(145deg, rgba(238,241,220,.99), rgba(223,228,201,.96));
        color: var(--ghc-ink);
        padding: clamp(20px, 2.7vw, 34px);
        box-shadow: 0 24px 82px rgba(0,0,0,.28);
        display: grid;
        grid-template-rows: auto minmax(0, 1fr) auto auto;
        gap: 16px;
      }

      .ghc-diploma::before {
        content: '';
        position: absolute;
        inset: 16px;
        border-radius: 17px;
        border: 1px solid rgba(17,23,19,.12);
        pointer-events: none;
      }

      .ghc-diploma::after {
        content: '';
        position: absolute;
        inset: 28px;
        border-radius: 12px;
        border: 1px solid rgba(var(--ghc-green-rgb), .24);
        pointer-events: none;
      }

      .ghc-diploma-bg-grid {
        position: absolute;
        inset: 0;
        background:
          linear-gradient(90deg, rgba(17,23,19,.035) 1px, transparent 1px),
          linear-gradient(rgba(17,23,19,.035) 1px, transparent 1px);
        background-size: 44px 44px;
        opacity: .45;
        mask-image: radial-gradient(circle at center, black 0%, transparent 76%);
        pointer-events: none;
      }

      .ghc-diploma-watermark {
        position: absolute;
        right: -36px;
        bottom: -64px;
        color: rgba(17,23,19,.045);
        font-size: min(24vw, 280px);
        line-height: 1;
        font-weight: 950;
        letter-spacing: -.08em;
        pointer-events: none;
      }

      .ghc-diploma-head,
      .ghc-diploma-center,
      .ghc-diploma-data,
      .ghc-diploma-footer {
        position: relative;
        z-index: 1;
      }

      .ghc-diploma-head {
        display: flex;
        justify-content: space-between;
        gap: 18px;
        align-items: flex-start;
      }

      .ghc-diploma-brand {
        display: inline-flex;
        align-items: center;
        gap: 12px;
      }

      .ghc-diploma-logo {
        width: 42px;
        height: 42px;
        border-radius: 15px;
        border: 1px solid rgba(17,23,19,.18);
        background: rgba(17,23,19,.06);
        color: #24402a;
        display: grid;
        place-items: center;
        font-weight: 950;
      }

      .ghc-diploma-brand div {
        display: flex;
        align-items: baseline;
        gap: 10px;
        text-transform: uppercase;
      }

      .ghc-diploma-brand strong {
        color: var(--ghc-ink);
        font-size: 20px;
        line-height: 1;
        font-weight: 950;
        letter-spacing: .18em;
      }

      .ghc-diploma-brand em {
        color: rgba(17,23,19,.58);
        font-size: 12px;
        line-height: 1;
        font-style: normal;
        font-weight: 850;
        letter-spacing: .24em;
      }

      .ghc-diploma-state {
        min-width: 138px;
        border-radius: 18px;
        padding: 13px 14px;
        text-align: center;
      }

      .ghc-diploma-state span {
        display: block;
        color: rgba(17,23,19,.50);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: .14em;
        font-weight: 900;
      }

      .ghc-diploma-state strong {
        display: block;
        margin-top: 6px;
        font-size: 17px;
        line-height: 1;
        font-weight: 950;
        letter-spacing: .10em;
      }

      .ghc-diploma-center {
        align-self: center;
        text-align: center;
        padding: 8px 12px 4px;
      }

      .ghc-diploma-kicker {
        margin: 0 0 9px;
        color: rgba(17,23,19,.58);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: .20em;
        font-weight: 950;
      }

      .ghc-diploma-center h1 {
        margin: 0 0 20px;
        color: var(--ghc-ink);
        font-size: clamp(32px, 4vw, 54px);
        line-height: .95;
        letter-spacing: -.055em;
        font-weight: 950;
        text-transform: uppercase;
      }

      .ghc-certifies {
        margin: 0;
        color: rgba(17,23,19,.62);
        font-size: 14px;
        line-height: 1.5;
        font-weight: 700;
      }

      .ghc-diploma-center h2 {
        margin: 9px 0 16px;
        color: var(--ghc-ink);
        font-size: clamp(36px, 4.8vw, 64px);
        line-height: .95;
        letter-spacing: -.055em;
        font-weight: 950;
        text-transform: uppercase;
      }

      .ghc-diploma-center h3 {
        margin: 11px auto 0;
        max-width: 880px;
        color: #1e8f32;
        font-size: clamp(25px, 3.3vw, 44px);
        line-height: .98;
        letter-spacing: -.04em;
        font-weight: 950;
        text-transform: uppercase;
      }

      .ghc-diploma-data {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }

      .ghc-diploma-data-item {
        min-width: 0;
        border-radius: 15px;
        border: 1px solid rgba(17,23,19,.10);
        background: rgba(17,23,19,.045);
        padding: 13px;
      }

      .ghc-diploma-data-item span,
      .ghc-diploma-footer p,
      .ghc-verify-panel p {
        display: block;
        margin: 0;
        color: rgba(17,23,19,.50);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: .13em;
        font-weight: 900;
      }

      .ghc-diploma-data-item strong {
        display: block;
        margin-top: 7px;
        color: var(--ghc-ink);
        font-size: 14px;
        line-height: 1.25;
        font-weight: 950;
        overflow-wrap: anywhere;
      }

      .ghc-diploma-footer {
        border-top: 1px solid rgba(17,23,19,.10);
        padding-top: 14px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto auto;
        gap: 22px;
        align-items: center;
      }

      .ghc-signature span {
        display: block;
        width: min(190px, 100%);
        height: 1px;
        background: rgba(17,23,19,.32);
        margin-bottom: 8px;
      }

      .ghc-diploma-footer span {
        display: block;
        margin-top: 5px;
        color: rgba(17,23,19,.60);
        font-size: 12px;
      }

      .ghc-diploma-footer-brand {
        text-align: right;
      }

      .ghc-diploma-footer-brand strong {
        display: block;
        color: #1e8f32;
        font-size: 16px;
        line-height: 1;
        font-weight: 950;
        letter-spacing: .16em;
      }

      .ghc-seal {
        width: 76px;
        height: 76px;
        border-radius: 999px;
        border: 1px solid rgba(30,143,50,.38);
        background: rgba(30,143,50,.07);
        color: #1e8f32;
        display: grid;
        place-items: center;
        align-content: center;
      }

      .ghc-seal strong,
      .ghc-seal span {
        display: block;
      }

      .ghc-seal strong {
        font-size: 17px;
        line-height: 1;
        font-weight: 950;
        letter-spacing: .08em;
      }

      .ghc-seal span {
        margin-top: 6px;
        color: rgba(17,23,19,.58);
        font-size: 9px;
        font-weight: 950;
        letter-spacing: .12em;
      }

      .ghc-verify-panel {
        display: grid;
        gap: 12px;
        position: sticky;
        top: 14px;
      }

      .ghc-verify-panel section,
      .ghc-preview-note,
      .ghc-message-card {
        border-radius: 20px;
        border: 1px solid rgba(255,255,255,.085);
        background:
          radial-gradient(circle at top right, rgba(var(--ghc-green-rgb), .055), transparent 34%),
          linear-gradient(145deg, rgba(255,255,255,.052), rgba(255,255,255,.018)),
          rgba(8,12,10,.92);
        box-shadow: 0 24px 82px rgba(0,0,0,.22);
      }

      .ghc-verify-panel section {
        padding: 17px;
      }

      .ghc-verify-panel p {
        color: rgba(244,246,242,.46);
      }

      .ghc-verify-panel strong,
      .ghc-verify-panel span {
        display: block;
      }

      .ghc-verify-panel strong {
        margin-top: 8px;
        color: var(--ghc-white);
        font-size: 16px;
        line-height: 1.25;
        font-weight: 950;
        overflow-wrap: anywhere;
      }

      .ghc-verify-panel span {
        margin-top: 8px;
        color: rgba(244,246,242,.58);
        line-height: 1.45;
        font-size: 13px;
      }

      .ghc-primary-link {
        min-height: 44px;
        border-radius: 999px;
        border: 1px solid rgba(var(--ghc-green-rgb), .30);
        background: linear-gradient(135deg, var(--ghc-green), #7bee65);
        color: #061008;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0 18px;
        text-decoration: none;
        font-size: 12px;
        font-weight: 950;
        letter-spacing: .08em;
        text-transform: uppercase;
        box-shadow: 0 0 30px rgba(var(--ghc-green-rgb), .14);
      }

      .ghc-preview-note {
        padding: 18px 20px;
        color: rgba(244,246,242,.70);
        line-height: 1.65;
      }

      .ghc-preview-note strong {
        color: var(--ghc-green);
      }

      .ghc-cert-center {
        display: grid;
        place-items: center;
      }

      .ghc-message-card {
        position: relative;
        z-index: 1;
        width: min(780px, calc(100vw - 40px));
        padding: 34px;
      }

      .ghc-message-card p {
        margin: 0 0 12px;
        color: var(--ghc-green);
        text-transform: uppercase;
        letter-spacing: .16em;
        font-size: 10px;
        font-weight: 950;
      }

      .ghc-message-error p {
        color: var(--ghc-danger);
      }

      .ghc-message-card h1 {
        margin: 10px 0;
        color: var(--ghc-white);
        font-size: clamp(36px, 6vw, 70px);
        line-height: .92;
        letter-spacing: -.06em;
        font-weight: 950;
        text-transform: uppercase;
      }

      .ghc-message-card span {
        color: var(--ghc-muted);
        line-height: 1.6;
      }

      @media (max-width: 1120px) {
        .ghc-cert-layout {
          grid-template-columns: 1fr;
        }

        .ghc-verify-panel {
          position: static;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 760px) {
        .ghc-cert-shell {
          width: min(100% - 28px, 1440px);
          padding-top: 16px;
        }

        .ghc-cert-topbar,
        .ghc-diploma-head {
          align-items: flex-start;
          flex-direction: column;
        }

        .ghc-cert-topbar nav {
          justify-content: flex-start;
        }

        .ghc-diploma {
          min-height: auto;
          padding: 20px;
        }

        .ghc-diploma-center h1 {
          font-size: clamp(30px, 10vw, 44px);
        }

        .ghc-diploma-center h2 {
          font-size: clamp(34px, 11vw, 50px);
        }

        .ghc-diploma-center h3 {
          font-size: clamp(24px, 8vw, 36px);
        }

        .ghc-diploma-data,
        .ghc-verify-panel,
        .ghc-diploma-footer {
          grid-template-columns: 1fr;
        }

        .ghc-diploma-footer-brand {
          text-align: left;
        }
      }
    `}</style>
  );
}
