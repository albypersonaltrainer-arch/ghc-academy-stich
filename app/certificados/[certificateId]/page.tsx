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

const GREEN = '#63E546';

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
      <main className="ghc-certificate-page loading-state">
        <Background />
        <section className="status-card">
          <p>GHC Academy · Digital Credential</p>
          <h1>Verificando certificado</h1>
          <span>Estamos comprobando la validez pública de la credencial digital.</span>
        </section>
        <GlobalStyles />
      </main>
    );
  }

  if (!certificate) {
    return (
      <main className="ghc-certificate-page loading-state">
        <Background />
        <section className="status-card error">
          <Link href="/cursos" className="ghost-button">← Volver a GHC Academy</Link>
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
    <main className="ghc-certificate-page">
      <Background />

      <section className="certificate-shell">
        <header className="certificate-topbar">
          <Link href="/cursos" className="brand">
            <span>G</span>
            <strong>GHC</strong>
            <em>Academy</em>
          </Link>

          <nav>
            <Link href="/alumno">Área alumno</Link>
            <Link href="/cursos">Cursos</Link>
            <span className={isValid ? 'state-badge valid' : 'state-badge revoked'}>
              {isValid ? 'Certificado válido' : 'Certificado revocado'}
            </span>
          </nav>
        </header>

        <section className="certificate-card">
          <div className="watermark">GHC</div>
          <div className="card-grid" />

          <div className="certificate-header">
            <div>
              <p className="kicker">GHC Academy · Digital Credential</p>
              <h1>Certificado digital</h1>
              <span>Verificación pública de finalización académica.</span>
            </div>

            <aside className={isValid ? 'validity valid' : 'validity revoked'}>
              <small>Estado</small>
              <strong>{isValid ? 'Válido' : 'Revocado'}</strong>
              <em>{source === 'preview' ? 'Modo preview' : 'Supabase verificado'}</em>
            </aside>
          </div>

          <div className="certificate-body">
            <p className="certifies">GHC Academy certifica que</p>
            <h2>{certificate.student_name}</h2>

            <p className="certifies">ha completado satisfactoriamente el curso</p>
            <h3>{certificate.course_title}</h3>

            <div className="data-grid">
              <DataBlock label="Nota final" value={`${certificate.final_score}%`} />
              <DataBlock label="Fecha de emisión" value={formatDate(certificate.issued_at)} />
              <DataBlock label="Código" value={certificate.certificate_code} />
            </div>

            <section className="verification-panel">
              <div>
                <p>Verificación pública</p>
                <strong>{certificate.certificate_code}</strong>
                <span>
                  Este certificado puede verificarse públicamente mediante su código único y su
                  estado actual en la plataforma.
                </span>
              </div>

              <div className="seal">
                <strong>GHC</strong>
                <span>{isValid ? 'VALID' : 'REVOKED'}</span>
              </div>
            </section>
          </div>

          <footer className="certificate-footer">
            <div>
              <p>GHC Academy</p>
              <span>Sport Through Science</span>
            </div>

            <div className="public-id">
              <span>ID público</span>
              <strong>{publicId}</strong>
            </div>
          </footer>
        </section>

        {source === 'preview' && (
          <section className="preview-notice">
            <strong>Modo preview:</strong> este certificado se ha generado en este navegador para
            validar el flujo completo. En producción, el certificado se emite desde Supabase y queda
            asociado al alumno real.
          </section>
        )}
      </section>

      <GlobalStyles />
    </main>
  );
}

function DataBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="data-block">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Background() {
  return (
    <div className="background" aria-hidden="true">
      <div className="orb orb-one" />
      <div className="orb orb-two" />
      <div className="grid-texture" />
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
        --green: ${GREEN};
        --green-rgb: 99, 229, 70;
        --bg: #050706;
        --white: #f4f6f2;
        --muted: rgba(244,246,242,.62);
        --soft: rgba(244,246,242,.44);
        --gold: #d6b25e;
        --danger: #ff7777;
      }

      * { box-sizing: border-box; }

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

      a { color: inherit; }

      .ghc-certificate-page {
        min-height: 100vh;
        position: relative;
        overflow-x: hidden;
        background:
          radial-gradient(circle at 12% -10%, rgba(var(--green-rgb), .075), transparent 32%),
          radial-gradient(circle at 96% 8%, rgba(255,255,255,.035), transparent 28%),
          linear-gradient(135deg, #050706 0%, #070a09 46%, #030404 100%);
      }

      .background {
        position: fixed;
        inset: 0;
        pointer-events: none;
        overflow: hidden;
        z-index: 0;
      }

      .orb {
        position: absolute;
        border-radius: 999px;
        filter: blur(100px);
      }

      .orb-one {
        width: 520px;
        height: 520px;
        top: -220px;
        left: -180px;
        background: rgba(var(--green-rgb), .10);
      }

      .orb-two {
        width: 520px;
        height: 520px;
        right: -260px;
        top: 110px;
        background: rgba(120,135,130,.09);
      }

      .grid-texture {
        position: absolute;
        inset: 0;
        background-image:
          linear-gradient(rgba(255,255,255,.022) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,.022) 1px, transparent 1px);
        background-size: 42px 42px;
        opacity: .38;
        mask-image: radial-gradient(circle at center, black 0%, transparent 82%);
      }

      .certificate-shell {
        width: min(1220px, calc(100vw - 42px));
        margin: 0 auto;
        padding: 22px 0 44px;
        position: relative;
        z-index: 1;
        display: grid;
        gap: 18px;
      }

      .certificate-topbar {
        min-height: 62px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        border-bottom: 1px solid rgba(255,255,255,.07);
        padding-bottom: 12px;
      }

      .brand {
        min-height: 44px;
        display: flex;
        align-items: center;
        gap: 12px;
        color: var(--white);
        text-decoration: none;
        text-transform: uppercase;
        letter-spacing: .22em;
      }

      .brand span {
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

      .brand strong {
        font-size: 18px;
        letter-spacing: .18em;
      }

      .brand em {
        color: rgba(244,246,242,.62);
        font-style: normal;
        font-size: 12px;
      }

      .certificate-topbar nav {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 12px;
        flex-wrap: wrap;
      }

      .certificate-topbar nav a,
      .ghost-button {
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

      .state-badge {
        min-height: 38px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0 14px;
        font-size: 11px;
        font-weight: 950;
        letter-spacing: .09em;
        text-transform: uppercase;
      }

      .state-badge.valid {
        border: 1px solid rgba(var(--green-rgb), .26);
        background: rgba(var(--green-rgb), .085);
        color: var(--green);
      }

      .state-badge.revoked {
        border: 1px solid rgba(255,119,119,.30);
        background: rgba(255,119,119,.08);
        color: var(--danger);
      }

      .certificate-card,
      .status-card,
      .preview-notice {
        border-radius: 28px;
        border: 1px solid rgba(255,255,255,.085);
        background:
          radial-gradient(circle at top right, rgba(var(--green-rgb), .055), transparent 34%),
          linear-gradient(145deg, rgba(255,255,255,.052), rgba(255,255,255,.018)),
          rgba(8,12,10,.92);
        box-shadow: 0 24px 82px rgba(0,0,0,.22);
      }

      .certificate-card {
        position: relative;
        overflow: hidden;
        min-height: 720px;
        padding: clamp(24px, 4vw, 48px);
      }

      .certificate-card::before {
        content: '';
        position: absolute;
        inset: 18px;
        border-radius: 22px;
        border: 1px solid rgba(var(--green-rgb), .18);
        pointer-events: none;
      }

      .watermark {
        position: absolute;
        right: -50px;
        bottom: -94px;
        color: rgba(var(--green-rgb), .035);
        font-size: min(28vw, 340px);
        line-height: 1;
        font-weight: 950;
        letter-spacing: -.08em;
        pointer-events: none;
      }

      .card-grid {
        position: absolute;
        inset: 0;
        background:
          linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px),
          linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px);
        background-size: 64px 64px;
        opacity: .18;
        mask-image: radial-gradient(circle at center, black 0%, transparent 72%);
        pointer-events: none;
      }

      .certificate-header,
      .certificate-body,
      .certificate-footer {
        position: relative;
        z-index: 1;
      }

      .certificate-header {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 210px;
        gap: 24px;
        align-items: start;
        border-bottom: 1px solid rgba(255,255,255,.075);
        padding-bottom: 30px;
      }

      .kicker {
        margin: 0 0 14px;
        color: var(--green);
        text-transform: uppercase;
        letter-spacing: .18em;
        font-size: 10px;
        font-weight: 950;
      }

      .certificate-header h1 {
        margin: 0;
        max-width: 790px;
        color: var(--white);
        font-size: clamp(42px, 6vw, 82px);
        line-height: .88;
        letter-spacing: -.065em;
        font-weight: 950;
        text-transform: uppercase;
      }

      .certificate-header > div > span {
        display: block;
        margin-top: 16px;
        color: rgba(244,246,242,.62);
        line-height: 1.55;
      }

      .validity {
        border-radius: 20px;
        padding: 18px;
        text-align: center;
      }

      .validity.valid {
        border: 1px solid rgba(var(--green-rgb), .28);
        background: rgba(var(--green-rgb), .075);
      }

      .validity.revoked {
        border: 1px solid rgba(255,119,119,.30);
        background: rgba(255,119,119,.08);
      }

      .validity small,
      .validity em,
      .data-block span,
      .verification-panel p,
      .public-id span {
        display: block;
        margin: 0;
        color: rgba(244,246,242,.46);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: .14em;
        font-weight: 900;
        font-style: normal;
      }

      .validity strong {
        display: block;
        margin-top: 8px;
        color: var(--green);
        font-size: 26px;
        line-height: 1;
        font-weight: 950;
        text-transform: uppercase;
      }

      .validity.revoked strong {
        color: var(--danger);
      }

      .validity em {
        margin-top: 10px;
        letter-spacing: .08em;
      }

      .certificate-body {
        padding: clamp(34px, 5vw, 62px) 0 34px;
        text-align: center;
      }

      .certifies {
        margin: 0 0 14px;
        color: rgba(244,246,242,.62);
        font-size: 16px;
        line-height: 1.6;
      }

      .certificate-body h2 {
        margin: 0 0 24px;
        color: var(--white);
        font-size: clamp(42px, 6vw, 74px);
        line-height: .95;
        letter-spacing: -.055em;
        font-weight: 950;
        text-transform: uppercase;
      }

      .certificate-body h3 {
        margin: 0 auto 34px;
        max-width: 920px;
        color: var(--green);
        font-size: clamp(28px, 4vw, 52px);
        line-height: .98;
        letter-spacing: -.04em;
        font-weight: 950;
        text-transform: uppercase;
      }

      .data-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        margin: 0 auto;
        max-width: 920px;
      }

      .data-block {
        border-radius: 18px;
        border: 1px solid rgba(255,255,255,.075);
        background: rgba(255,255,255,.026);
        padding: 16px;
        min-width: 0;
      }

      .data-block strong {
        display: block;
        margin-top: 8px;
        color: var(--white);
        font-size: 16px;
        line-height: 1.25;
        font-weight: 900;
        overflow-wrap: anywhere;
      }

      .verification-panel {
        margin: 24px auto 0;
        max-width: 920px;
        border-radius: 22px;
        border: 1px solid rgba(var(--green-rgb), .18);
        background: linear-gradient(90deg, rgba(var(--green-rgb),.06), rgba(255,255,255,.022));
        padding: 18px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) 96px;
        gap: 18px;
        align-items: center;
        text-align: left;
      }

      .verification-panel strong {
        display: block;
        margin-top: 8px;
        color: var(--white);
        font-size: 18px;
        font-weight: 950;
        overflow-wrap: anywhere;
      }

      .verification-panel span {
        display: block;
        margin-top: 8px;
        color: rgba(244,246,242,.62);
        line-height: 1.55;
        font-size: 14px;
      }

      .seal {
        width: 86px;
        height: 86px;
        border-radius: 999px;
        border: 1px solid rgba(var(--green-rgb), .42);
        background: rgba(var(--green-rgb), .055);
        color: var(--green);
        display: grid;
        place-items: center;
        align-content: center;
        box-shadow: 0 0 34px rgba(var(--green-rgb), .12);
      }

      .seal strong,
      .seal span {
        display: block;
      }

      .seal strong {
        font-size: 19px;
        line-height: 1;
        font-weight: 950;
        letter-spacing: .08em;
      }

      .seal span {
        color: rgba(244,246,242,.56);
        margin-top: 6px;
        font-size: 9px;
        font-weight: 950;
        letter-spacing: .12em;
      }

      .certificate-footer {
        border-top: 1px solid rgba(255,255,255,.075);
        padding-top: 22px;
        display: flex;
        justify-content: space-between;
        gap: 18px;
        align-items: end;
      }

      .certificate-footer p {
        margin: 0;
        color: var(--green);
        font-size: 12px;
        font-weight: 950;
        letter-spacing: .22em;
        text-transform: uppercase;
      }

      .certificate-footer span {
        display: block;
        margin-top: 6px;
        color: rgba(244,246,242,.52);
        font-size: 13px;
      }

      .public-id {
        text-align: right;
        min-width: 0;
      }

      .public-id strong {
        display: block;
        max-width: 520px;
        margin-top: 6px;
        color: rgba(244,246,242,.76);
        font-size: 13px;
        overflow-wrap: anywhere;
      }

      .preview-notice {
        padding: 18px 20px;
        color: rgba(244,246,242,.70);
        line-height: 1.65;
      }

      .preview-notice strong {
        color: var(--green);
      }

      .loading-state {
        display: grid;
        place-items: center;
      }

      .status-card {
        position: relative;
        z-index: 1;
        width: min(780px, calc(100vw - 40px));
        padding: 34px;
      }

      .status-card p {
        margin: 0 0 12px;
        color: var(--green);
        text-transform: uppercase;
        letter-spacing: .16em;
        font-size: 10px;
        font-weight: 950;
      }

      .status-card.error p {
        color: var(--danger);
      }

      .status-card h1 {
        margin: 10px 0;
        color: var(--white);
        font-size: clamp(36px, 6vw, 70px);
        line-height: .92;
        letter-spacing: -.06em;
        font-weight: 950;
        text-transform: uppercase;
      }

      .status-card span {
        color: var(--muted);
        line-height: 1.6;
      }

      .status-card .ghost-button {
        margin-bottom: 22px;
      }

      @media (max-width: 860px) {
        .certificate-shell {
          width: min(100% - 28px, 1220px);
          padding-top: 16px;
        }

        .certificate-topbar,
        .certificate-header,
        .certificate-footer {
          align-items: flex-start;
          grid-template-columns: 1fr;
          flex-direction: column;
        }

        .certificate-topbar nav {
          justify-content: flex-start;
        }

        .certificate-card {
          padding: 22px;
          min-height: auto;
        }

        .certificate-header h1 {
          font-size: clamp(38px, 12vw, 56px);
        }

        .certificate-body h2 {
          font-size: clamp(36px, 11vw, 54px);
        }

        .certificate-body h3 {
          font-size: clamp(26px, 8vw, 40px);
        }

        .data-grid,
        .verification-panel {
          grid-template-columns: 1fr;
        }

        .seal {
          justify-self: start;
        }

        .public-id {
          text-align: left;
        }
      }
    `}</style>
  );
}
