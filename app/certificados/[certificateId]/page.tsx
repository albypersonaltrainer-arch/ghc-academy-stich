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
      <main className="ghc-credential-page">
        <Background />
        <section className="ghc-state-card">
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
      <main className="ghc-credential-page">
        <Background />
        <section className="ghc-state-card ghc-state-error">
          <Link href="/alumno" className="ghc-soft-button">
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
    <main className="ghc-credential-page">
      <Background />

      <section className="ghc-credential-shell">
        <header className="ghc-credential-topbar">
          <Link href="/alumno" className="ghc-top-brand">
            <span>G</span>
            <strong>GHC</strong>
            <em>Academy</em>
          </Link>

          <nav>
            <Link href="/alumno">Área alumno</Link>
            <Link href="/alumno">Mis cursos</Link>
            <span className={isValid ? 'ghc-state-pill ghc-valid' : 'ghc-state-pill ghc-revoked'}>
              {isValid ? 'VÁLIDO' : 'REVOCADO'}
            </span>
          </nav>
        </header>

        <section className="ghc-certificate-layout">
          <article className="ghc-certificate-card">
            <div className="ghc-card-watermark">GHC</div>

            <div className="ghc-certificate-brand">
              <span>G</span>
              <div>
                <strong>GHC</strong>
                <em>Academy</em>
              </div>
            </div>

            <div className="ghc-certificate-status-row">
              <p>Digital credential</p>
              <span className={isValid ? 'ghc-inline-status ghc-valid' : 'ghc-inline-status ghc-revoked'}>
                {isValid ? 'VÁLIDO' : 'REVOCADO'}
              </span>
            </div>

            <div className="ghc-certificate-main">
              <p className="ghc-certifies">GHC Academy certifica que</p>

              <h1>{certificate.student_name}</h1>

              <p className="ghc-certifies">ha completado satisfactoriamente el curso</p>

              <h2>{certificate.course_title}</h2>
            </div>

            <div className="ghc-certificate-data">
              <DataItem label="Nota final" value={`${certificate.final_score}%`} />
              <DataItem label="Fecha de emisión" value={formatDate(certificate.issued_at)} />
              <DataItem label="Código único" value={certificate.certificate_code} />
            </div>

            <div className="ghc-verification-box">
              <div>
                <p>Verificación pública</p>
                <strong>{certificate.certificate_code}</strong>
                <span>
                  Credencial verificable vinculada al estado actual del certificado en GHC Academy.
                </span>
              </div>

              <div className="ghc-seal">
                <strong>GHC</strong>
                <span>{isValid ? 'VALID' : 'REVOKED'}</span>
              </div>
            </div>

            <footer className="ghc-certificate-footer">
              <div>
                <p>GHC Academy</p>
                <span>Sport Through Science</span>
              </div>

              <div>
                <p>ID público</p>
                <span>{publicId}</span>
              </div>
            </footer>
          </article>

          <aside className="ghc-certificate-side">
            <section>
              <p>Estado</p>
              <strong className={isValid ? 'ghc-text-green' : 'ghc-text-danger'}>
                {isValid ? 'Certificado válido' : 'Certificado revocado'}
              </strong>
              <span>{source === 'preview' ? 'Modo preview' : 'Verificado en Supabase'}</span>
            </section>

            <section>
              <p>Alumno</p>
              <strong>{certificate.student_name}</strong>
              <span>Credencial académica GHC</span>
            </section>

            <section>
              <p>Curso</p>
              <strong>{certificate.course_title}</strong>
              <span>Finalización registrada</span>
            </section>

            <Link href="/alumno" className="ghc-primary-button">
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
    <div className="ghc-data-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Background() {
  return (
    <div className="ghc-background" aria-hidden="true">
      <div className="ghc-orb ghc-orb-one" />
      <div className="ghc-orb ghc-orb-two" />
      <div className="ghc-grid-texture" />
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
        --green: ${GHC_GREEN};
        --green-rgb: 99, 229, 70;
        --bg: #050706;
        --white: #f4f6f2;
        --muted: rgba(244,246,242,.62);
        --soft: rgba(244,246,242,.44);
        --danger: #ff7777;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        background: var(--bg);
      }

      body {
        color: var(--white);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      a {
        color: inherit;
      }

      .ghc-credential-page {
        min-height: 100vh;
        position: relative;
        overflow-x: hidden;
        background:
          radial-gradient(circle at 12% -10%, rgba(var(--green-rgb), .075), transparent 32%),
          radial-gradient(circle at 96% 8%, rgba(255,255,255,.035), transparent 28%),
          linear-gradient(135deg, #050706 0%, #070a09 46%, #030404 100%);
      }

      .ghc-background {
        position: fixed;
        inset: 0;
        pointer-events: none;
        overflow: hidden;
        z-index: 0;
      }

      .ghc-orb {
        position: absolute;
        border-radius: 999px;
        filter: blur(100px);
      }

      .ghc-orb-one {
        width: 520px;
        height: 520px;
        top: -220px;
        left: -180px;
        background: rgba(var(--green-rgb), .10);
      }

      .ghc-orb-two {
        width: 520px;
        height: 520px;
        right: -260px;
        top: 110px;
        background: rgba(120,135,130,.09);
      }

      .ghc-grid-texture {
        position: absolute;
        inset: 0;
        background-image:
          linear-gradient(rgba(255,255,255,.022) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,.022) 1px, transparent 1px);
        background-size: 42px 42px;
        opacity: .38;
        mask-image: radial-gradient(circle at center, black 0%, transparent 82%);
      }

      .ghc-credential-shell {
        width: min(1380px, calc(100vw - 42px));
        margin: 0 auto;
        padding: 22px 0 44px;
        position: relative;
        z-index: 1;
        display: grid;
        gap: 18px;
      }

      .ghc-credential-topbar {
        min-height: 62px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        border-bottom: 1px solid rgba(255,255,255,.07);
        padding-bottom: 12px;
      }

      .ghc-top-brand {
        min-height: 44px;
        display: flex;
        align-items: center;
        gap: 12px;
        color: var(--white);
        text-decoration: none;
        text-transform: uppercase;
        letter-spacing: .22em;
      }

      .ghc-top-brand span {
        width: 32px;
        height: 32px;
        border-radius: 12px;
        border: 1px solid rgba(var(--green-rgb), .35);
        color: var(--green);
        display: grid;
        place-items: center;
        font-size: 13px;
        font-weight: 950;
      }

      .ghc-top-brand strong {
        font-size: 18px;
        letter-spacing: .18em;
      }

      .ghc-top-brand em {
        color: rgba(244,246,242,.62);
        font-style: normal;
        font-size: 12px;
      }

      .ghc-credential-topbar nav {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 12px;
        flex-wrap: wrap;
      }

      .ghc-credential-topbar nav a,
      .ghc-soft-button {
        min-height: 38px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.035);
        color: rgba(244,246,242,.78);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0 14px;
        text-decoration: none;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: .08em;
        text-transform: uppercase;
      }

      .ghc-state-pill,
      .ghc-inline-status {
        min-height: 38px;
        min-width: 92px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0 16px;
        font-size: 11px;
        font-weight: 950;
        letter-spacing: .12em;
        text-transform: uppercase;
        white-space: nowrap;
      }

      .ghc-valid {
        border: 1px solid rgba(var(--green-rgb), .26);
        background: rgba(var(--green-rgb), .085);
        color: var(--green);
      }

      .ghc-revoked {
        border: 1px solid rgba(255,119,119,.30);
        background: rgba(255,119,119,.08);
        color: var(--danger);
      }

      .ghc-certificate-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 340px;
        gap: 18px;
        align-items: start;
      }

      .ghc-certificate-card,
      .ghc-certificate-side section,
      .ghc-state-card,
      .ghc-preview-note {
        border-radius: 24px;
        border: 1px solid rgba(255,255,255,.085);
        background:
          radial-gradient(circle at top right, rgba(var(--green-rgb), .055), transparent 34%),
          linear-gradient(145deg, rgba(255,255,255,.052), rgba(255,255,255,.018)),
          rgba(8,12,10,.92);
        box-shadow: 0 24px 82px rgba(0,0,0,.22);
      }

      .ghc-certificate-card {
        position: relative;
        overflow: hidden;
        min-height: 640px;
        padding: clamp(22px, 3vw, 34px);
        display: grid;
        gap: 22px;
      }

      .ghc-certificate-card::before {
        content: '';
        position: absolute;
        inset: 18px;
        border-radius: 18px;
        border: 1px solid rgba(var(--green-rgb), .16);
        pointer-events: none;
      }

      .ghc-card-watermark {
        position: absolute;
        right: -36px;
        bottom: -72px;
        color: rgba(var(--green-rgb), .035);
        font-size: min(24vw, 280px);
        line-height: 1;
        font-weight: 950;
        letter-spacing: -.08em;
        pointer-events: none;
      }

      .ghc-certificate-brand,
      .ghc-certificate-status-row,
      .ghc-certificate-main,
      .ghc-certificate-data,
      .ghc-verification-box,
      .ghc-certificate-footer {
        position: relative;
        z-index: 1;
      }

      .ghc-certificate-brand {
        width: fit-content;
        min-height: 52px;
        display: inline-flex;
        align-items: center;
        gap: 14px;
        padding: 8px 14px 8px 8px;
        border-radius: 18px;
        border: 1px solid rgba(var(--green-rgb), .20);
        background: linear-gradient(135deg, rgba(var(--green-rgb), .085), rgba(255,255,255,.026));
        box-shadow: 0 0 34px rgba(var(--green-rgb), .10);
      }

      .ghc-certificate-brand > span {
        width: 40px;
        height: 40px;
        border-radius: 14px;
        border: 1px solid rgba(var(--green-rgb), .42);
        color: var(--green);
        display: grid;
        place-items: center;
        font-weight: 950;
        background: rgba(var(--green-rgb), .075);
      }

      .ghc-certificate-brand div {
        display: flex;
        align-items: baseline;
        gap: 10px;
        text-transform: uppercase;
      }

      .ghc-certificate-brand strong {
        color: var(--white);
        font-size: 20px;
        line-height: 1;
        font-weight: 950;
        letter-spacing: .18em;
      }

      .ghc-certificate-brand em {
        color: rgba(244,246,242,.64);
        font-size: 12px;
        line-height: 1;
        font-style: normal;
        font-weight: 850;
        letter-spacing: .24em;
      }

      .ghc-certificate-status-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        padding-bottom: 18px;
        border-bottom: 1px solid rgba(255,255,255,.075);
      }

      .ghc-certificate-status-row p,
      .ghc-certifies,
      .ghc-data-item span,
      .ghc-verification-box p,
      .ghc-certificate-footer p,
      .ghc-certificate-side p {
        margin: 0;
        color: rgba(244,246,242,.46);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: .14em;
        font-weight: 900;
      }

      .ghc-certificate-main {
        text-align: center;
        padding: clamp(22px, 4vw, 46px) 10px 22px;
      }

      .ghc-certifies {
        color: rgba(244,246,242,.62);
        font-size: 14px;
        line-height: 1.6;
        text-transform: none;
        letter-spacing: 0;
      }

      .ghc-certificate-main h1 {
        margin: 12px 0 20px;
        color: var(--white);
        font-size: clamp(36px, 5.2vw, 66px);
        line-height: .95;
        letter-spacing: -.055em;
        font-weight: 950;
        text-transform: uppercase;
      }

      .ghc-certificate-main h2 {
        margin: 14px auto 0;
        max-width: 860px;
        color: var(--green);
        font-size: clamp(28px, 4vw, 48px);
        line-height: .98;
        letter-spacing: -.04em;
        font-weight: 950;
        text-transform: uppercase;
      }

      .ghc-certificate-data {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }

      .ghc-data-item {
        min-width: 0;
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,.075);
        background: rgba(255,255,255,.026);
        padding: 14px;
      }

      .ghc-data-item strong {
        display: block;
        margin-top: 8px;
        color: var(--white);
        font-size: 15px;
        line-height: 1.25;
        font-weight: 900;
        overflow-wrap: anywhere;
      }

      .ghc-verification-box {
        border-radius: 20px;
        border: 1px solid rgba(var(--green-rgb), .18);
        background: linear-gradient(90deg, rgba(var(--green-rgb),.06), rgba(255,255,255,.022));
        padding: 16px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) 86px;
        gap: 18px;
        align-items: center;
      }

      .ghc-verification-box strong {
        display: block;
        margin-top: 8px;
        color: var(--white);
        font-size: 17px;
        font-weight: 950;
        overflow-wrap: anywhere;
      }

      .ghc-verification-box span {
        display: block;
        margin-top: 8px;
        color: rgba(244,246,242,.62);
        line-height: 1.55;
        font-size: 13px;
      }

      .ghc-seal {
        width: 82px;
        height: 82px;
        border-radius: 999px;
        border: 1px solid rgba(var(--green-rgb), .42);
        background: rgba(var(--green-rgb), .055);
        color: var(--green);
        display: grid;
        place-items: center;
        align-content: center;
        box-shadow: 0 0 34px rgba(var(--green-rgb), .12);
      }

      .ghc-seal strong {
        color: var(--green);
        font-size: 18px;
        line-height: 1;
        letter-spacing: .08em;
      }

      .ghc-seal span {
        margin-top: 6px;
        color: rgba(244,246,242,.56);
        font-size: 9px;
        font-weight: 950;
        letter-spacing: .12em;
      }

      .ghc-certificate-footer {
        border-top: 1px solid rgba(255,255,255,.075);
        padding-top: 18px;
        display: flex;
        justify-content: space-between;
        gap: 18px;
        align-items: end;
      }

      .ghc-certificate-footer span {
        display: block;
        margin-top: 6px;
        max-width: 520px;
        color: rgba(244,246,242,.62);
        font-size: 13px;
        overflow-wrap: anywhere;
      }

      .ghc-certificate-footer div:last-child {
        text-align: right;
      }

      .ghc-certificate-side {
        display: grid;
        gap: 14px;
        position: sticky;
        top: 18px;
      }

      .ghc-certificate-side section {
        padding: 18px;
      }

      .ghc-certificate-side strong,
      .ghc-certificate-side span {
        display: block;
      }

      .ghc-certificate-side strong {
        margin-top: 8px;
        color: var(--white);
        font-size: 17px;
        line-height: 1.2;
      }

      .ghc-certificate-side span {
        margin-top: 8px;
        color: rgba(244,246,242,.58);
        line-height: 1.45;
        font-size: 13px;
      }

      .ghc-text-green {
        color: var(--green) !important;
      }

      .ghc-text-danger {
        color: var(--danger) !important;
      }

      .ghc-primary-button {
        min-height: 44px;
        border-radius: 999px;
        border: 1px solid rgba(var(--green-rgb), .30);
        background: linear-gradient(135deg, var(--green), #7bee65);
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
        box-shadow: 0 0 30px rgba(var(--green-rgb), .14);
      }

      .ghc-preview-note {
        padding: 18px 20px;
        color: rgba(244,246,242,.70);
        line-height: 1.65;
      }

      .ghc-preview-note strong {
        color: var(--green);
      }

      .ghc-state-card {
        position: relative;
        z-index: 1;
        width: min(780px, calc(100vw - 40px));
        padding: 34px;
      }

      .ghc-state-card p {
        margin: 0 0 12px;
        color: var(--green);
        text-transform: uppercase;
        letter-spacing: .16em;
        font-size: 10px;
        font-weight: 950;
      }

      .ghc-state-error p {
        color: var(--danger);
      }

      .ghc-state-card h1 {
        margin: 10px 0;
        color: var(--white);
        font-size: clamp(36px, 6vw, 70px);
        line-height: .92;
        letter-spacing: -.06em;
        font-weight: 950;
        text-transform: uppercase;
      }

      .ghc-state-card span {
        color: var(--muted);
        line-height: 1.6;
      }

      @media (max-width: 1080px) {
        .ghc-certificate-layout {
          grid-template-columns: 1fr;
        }

        .ghc-certificate-side {
          position: static;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 760px) {
        .ghc-credential-shell {
          width: min(100% - 28px, 1380px);
          padding-top: 16px;
        }

        .ghc-credential-topbar,
        .ghc-certificate-status-row,
        .ghc-certificate-footer {
          align-items: flex-start;
          flex-direction: column;
        }

        .ghc-credential-topbar nav {
          justify-content: flex-start;
        }

        .ghc-certificate-card {
          min-height: auto;
          padding: 20px;
        }

        .ghc-certificate-brand {
          width: 100%;
        }

        .ghc-certificate-brand div {
          flex-wrap: wrap;
        }

        .ghc-certificate-main h1 {
          font-size: clamp(34px, 11vw, 50px);
        }

        .ghc-certificate-main h2 {
          font-size: clamp(26px, 9vw, 38px);
        }

        .ghc-certificate-data,
        .ghc-verification-box,
        .ghc-certificate-side {
          grid-template-columns: 1fr;
        }

        .ghc-certificate-footer div:last-child {
          text-align: left;
        }

        .ghc-seal {
          justify-self: start;
        }
      }
    `}</style>
  );
}
