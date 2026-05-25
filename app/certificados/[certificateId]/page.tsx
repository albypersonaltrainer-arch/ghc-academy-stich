import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import GHCLogo from '../../components/GHCLogo';

type AnyRecord = Record<string, any>;

type PageProps = {
  params: {
    certificateId: string;
  };
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function CertificateVerificationPage({ params }: PageProps) {
  const certificateId = decodeURIComponent(params.certificateId || '').trim();
  const certificate = await getCertificate(certificateId);

  const isValid = Boolean(certificate && String(certificate.status || '').toLowerCase() !== 'revoked');

  const studentName =
    certificate?.student_name ||
    certificate?.full_name ||
    certificate?.alumno ||
    certificate?.recipient_name ||
    certificate?.profiles?.full_name ||
    'Alumno GHC Academy';

  const courseTitle =
    certificate?.course_title ||
    certificate?.course_name ||
    certificate?.title ||
    certificate?.courses?.title ||
    'Entrenador Personal Nivel 1';

  const certificateCode =
    certificate?.certificate_code ||
    certificate?.verification_code ||
    certificate?.code ||
    certificateId ||
    'GHC-VERIFY';

  const issuedDate =
    certificate?.issued_at ||
    certificate?.created_at ||
    certificate?.date ||
    '';

  const finalScore =
    certificate?.final_score ??
    certificate?.score ??
    certificate?.grade ??
    null;

  return (
    <main className="certificate-public-page">
      <Background />

      <header className="certificate-topbar">
        <Link href="/" className="certificate-logo-link" aria-label="GHC Academy">
          <GHCLogo size="sm" showText tagline />
        </Link>

        <div className="certificate-topbar-status">
          <span className={isValid ? 'status-dot valid' : 'status-dot invalid'} />
          <strong>{isValid ? 'Credencial válida' : 'Credencial no válida'}</strong>
        </div>
      </header>

      <section className="certificate-hero">
        <p className="certificate-kicker">Credencial oficial</p>
        <h1>
          Válido. Verificable.
          <br />
          Profesional.
        </h1>
        <p className="certificate-subtitle">
          Consulta la autenticidad de este certificado oficial de GHC Academy.
        </p>
      </section>

      <section className="certificate-layout">
        <article className="certificate-paper-shell">
          <div className="certificate-paper">
            <div className="paper-brand">
              <GHCLogo size="sm" showText tagline />
            </div>

            <div className="paper-status-pill">
              {isValid ? 'Válido' : 'No válido'}
            </div>

            <div className="paper-content">
              <p className="paper-academy">GHC Academy</p>
              <h2>Certificado</h2>
              <p className="paper-subtitle">de logro académico</p>

              <p className="paper-small">se otorga a</p>
              <h3>{studentName}</h3>

              <p className="paper-small">por completar satisfactoriamente los requisitos de</p>
              <h4>{courseTitle}</h4>
            </div>

            <div className="paper-footer">
              <div>
                <span>Fecha de emisión</span>
                <strong>{issuedDate ? formatDate(issuedDate) : '—'}</strong>
              </div>

              <div className="paper-signature">
                <i />
                <span>Dirección académica</span>
              </div>

              <div>
                <span>Código</span>
                <strong>{certificateCode}</strong>
              </div>
            </div>
          </div>
        </article>

        <aside className="verification-panel">
          <p className="certificate-kicker">Verificación</p>
          <h2>Estado del certificado</h2>

          <div className={isValid ? 'verification-box valid' : 'verification-box invalid'}>
            <strong>{isValid ? 'Válido' : 'No válido'}</strong>
            <p>
              {isValid
                ? 'Este certificado figura como válido y verificable en el sistema de GHC Academy.'
                : 'No hemos podido confirmar este certificado como válido en el sistema.'}
            </p>
          </div>

          <div className="verification-data">
            <DataRow label="Alumno" value={studentName} />
            <DataRow label="Curso" value={courseTitle} />
            <DataRow label="Código" value={certificateCode} />
            <DataRow label="Fecha" value={issuedDate ? formatDate(issuedDate) : '—'} />
            <DataRow label="Nota final" value={finalScore !== null ? `${finalScore}%` : '—'} />
            <DataRow label="Academia" value="GHC Academy" />
          </div>
        </aside>
      </section>

      <style>{`
        :root {
          --green: #63e546;
          --green-rgb: 99, 229, 70;
          --bg: #050706;
          --panel: rgba(8, 12, 10, 0.92);
          --white: #f4f6f2;
          --muted: rgba(244, 246, 242, 0.62);
          --soft: rgba(244, 246, 242, 0.42);
          --paper: #f2ead8;
          --paper-text: #1d2825;
          --line: rgba(255, 255, 255, 0.09);
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
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        a {
          color: inherit;
        }

        .certificate-public-page {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          padding: 34px clamp(20px, 4vw, 58px) 58px;
          background:
            radial-gradient(circle at 12% -10%, rgba(var(--green-rgb), 0.10), transparent 32%),
            radial-gradient(circle at 90% 8%, rgba(255,255,255,0.055), transparent 28%),
            linear-gradient(135deg, #050706 0%, #070a09 46%, #030404 100%);
        }

        .background {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }

        .orb-one {
          position: absolute;
          width: 560px;
          height: 560px;
          border-radius: 999px;
          top: -240px;
          left: -160px;
          background: rgba(var(--green-rgb), 0.10);
          filter: blur(105px);
        }

        .orb-two {
          position: absolute;
          width: 560px;
          height: 560px;
          border-radius: 999px;
          right: -260px;
          top: 140px;
          background: rgba(120,135,130,.10);
          filter: blur(115px);
        }

        .grid-texture {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,.022) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.022) 1px, transparent 1px);
          background-size: 42px 42px;
          opacity: .42;
          mask-image: radial-gradient(circle at center, black 0%, transparent 82%);
        }

        .certificate-topbar {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          min-height: 58px;
          margin-bottom: 58px;
        }

        .certificate-logo-link {
          display: inline-flex;
          align-items: center;
          text-decoration: none;
        }

        .certificate-topbar-status {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.035);
          color: rgba(244,246,242,.78);
          min-height: 40px;
          padding: 0 14px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .12em;
        }

        .status-dot {
          width: 9px;
          height: 9px;
          border-radius: 999px;
          display: inline-block;
          box-shadow: 0 0 20px currentColor;
        }

        .status-dot.valid {
          background: var(--green);
          color: var(--green);
        }

        .status-dot.invalid {
          background: #ff5757;
          color: #ff5757;
        }

        .certificate-hero {
          position: relative;
          z-index: 2;
          text-align: center;
          display: grid;
          justify-items: center;
          gap: 14px;
          margin-bottom: 42px;
        }

        .certificate-kicker {
          margin: 0;
          color: var(--green);
          text-transform: uppercase;
          letter-spacing: .22em;
          font-size: 12px;
          font-weight: 950;
        }

        .certificate-hero h1 {
          margin: 0;
          max-width: 1180px;
          color: var(--white);
          font-size: clamp(50px, 8vw, 116px);
          line-height: .82;
          text-transform: uppercase;
          letter-spacing: -.075em;
          font-weight: 950;
        }

        .certificate-subtitle {
          margin: 8px 0 0;
          color: rgba(244,246,242,.68);
          font-size: 16px;
          line-height: 1.65;
          max-width: 700px;
        }

        .certificate-layout {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: minmax(0, 1.12fr) minmax(340px, .48fr);
          gap: 24px;
          align-items: start;
          max-width: 1480px;
          margin: 0 auto;
        }

        .certificate-paper-shell,
        .verification-panel {
          border-radius: 28px;
          border: 1px solid rgba(255,255,255,.09);
          background:
            radial-gradient(circle at top right, rgba(var(--green-rgb), .055), transparent 34%),
            linear-gradient(145deg, rgba(255,255,255,.052), rgba(255,255,255,.018)),
            rgba(8,12,10,.90);
          box-shadow: 0 26px 90px rgba(0,0,0,.28);
        }

        .certificate-paper-shell {
          padding: clamp(16px, 2vw, 26px);
          min-width: 0;
        }

        .certificate-paper {
          position: relative;
          min-height: 560px;
          overflow: hidden;
          border-radius: 22px;
          background:
            radial-gradient(circle at 80% 10%, rgba(99,229,70,.08), transparent 26%),
            linear-gradient(135deg, rgba(255,255,255,.98), rgba(236,226,202,.96));
          color: var(--paper-text);
          border: 1px solid rgba(214,178,94,.28);
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,.36),
            0 34px 86px rgba(0,0,0,.34);
        }

        .certificate-paper::before {
          content: '';
          position: absolute;
          inset: 26px;
          border: 1px solid rgba(29,40,37,.15);
          border-radius: 16px;
          pointer-events: none;
        }

        .certificate-paper::after {
          content: '';
          position: absolute;
          inset: 0;
          background:
            linear-gradient(120deg, rgba(255,255,255,.38), transparent 34%),
            radial-gradient(circle at 82% 20%, rgba(255,255,255,.20), transparent 28%);
          pointer-events: none;
        }

        .paper-brand {
          position: absolute;
          z-index: 3;
          left: 42px;
          top: 36px;
          max-width: 310px;
          filter: none;
        }

        .paper-status-pill {
          position: absolute;
          z-index: 3;
          right: 42px;
          top: 38px;
          border-radius: 999px;
          border: 1px solid rgba(29,40,37,.12);
          background: rgba(99,229,70,.10);
          color: #1d6b33;
          padding: 8px 14px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .16em;
          font-weight: 950;
        }

        .paper-content {
          position: relative;
          z-index: 2;
          min-height: 420px;
          padding: 134px 56px 84px;
          display: grid;
          justify-items: center;
          text-align: center;
          align-content: center;
        }

        .paper-academy {
          margin: 0 0 18px;
          color: rgba(29,40,37,.62);
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .36em;
        }

        .paper-content h2 {
          margin: 0;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(52px, 7vw, 96px);
          line-height: .92;
          text-transform: uppercase;
          letter-spacing: .16em;
          color: rgba(29,40,37,.74);
          font-weight: 700;
        }

        .paper-subtitle {
          margin: 8px 0 24px;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: .28em;
          color: rgba(29,40,37,.48);
        }

        .paper-small {
          margin: 0 0 8px;
          color: rgba(29,40,37,.52);
          font-size: 12px;
          line-height: 1.5;
        }

        .paper-content h3 {
          margin: 0 0 22px;
          max-width: 760px;
          color: rgba(29,40,37,.82);
          font-size: clamp(34px, 4vw, 58px);
          line-height: 1;
          font-weight: 950;
          letter-spacing: -.045em;
        }

        .paper-content h4 {
          margin: 0;
          max-width: 820px;
          color: #159d6c;
          font-size: clamp(24px, 3vw, 42px);
          line-height: 1.06;
          font-weight: 950;
          letter-spacing: -.04em;
        }

        .paper-footer {
          position: absolute;
          z-index: 3;
          left: 44px;
          right: 44px;
          bottom: 34px;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 18px;
          align-items: end;
        }

        .paper-footer div {
          min-width: 0;
        }

        .paper-footer span {
          display: block;
          color: rgba(29,40,37,.46);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .16em;
          font-weight: 900;
        }

        .paper-footer strong {
          display: block;
          margin-top: 6px;
          color: rgba(29,40,37,.78);
          font-size: 13px;
          line-height: 1.2;
          font-weight: 900;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .paper-signature {
          text-align: center;
        }

        .paper-signature i {
          display: block;
          width: min(210px, 80%);
          height: 1px;
          margin: 0 auto 10px;
          background: rgba(29,40,37,.42);
        }

        .verification-panel {
          padding: 24px;
          position: sticky;
          top: 24px;
        }

        .verification-panel h2 {
          margin: 8px 0 18px;
          font-size: 30px;
          line-height: .98;
          letter-spacing: -.045em;
          font-weight: 950;
        }

        .verification-box {
          border-radius: 20px;
          padding: 18px;
          margin-bottom: 18px;
        }

        .verification-box.valid {
          border: 1px solid rgba(var(--green-rgb), .26);
          background:
            radial-gradient(circle at top right, rgba(var(--green-rgb), .12), transparent 40%),
            rgba(var(--green-rgb), .055);
        }

        .verification-box.invalid {
          border: 1px solid rgba(255,87,87,.26);
          background: rgba(255,87,87,.06);
        }

        .verification-box strong {
          display: block;
          color: var(--green);
          font-size: 15px;
          text-transform: uppercase;
          letter-spacing: .14em;
          font-weight: 950;
        }

        .verification-box.invalid strong {
          color: #ff5757;
        }

        .verification-box p {
          margin: 10px 0 0;
          color: rgba(244,246,242,.66);
          line-height: 1.6;
          font-size: 14px;
        }

        .verification-data {
          display: grid;
          gap: 10px;
        }

        .data-row {
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.075);
          background: rgba(255,255,255,.026);
          padding: 13px 14px;
          display: grid;
          gap: 5px;
        }

        .data-row span {
          color: rgba(244,246,242,.44);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .16em;
          font-weight: 900;
        }

        .data-row strong {
          color: rgba(244,246,242,.88);
          font-size: 14px;
          line-height: 1.25;
          font-weight: 850;
          overflow-wrap: anywhere;
        }

        @media (max-width: 1120px) {
          .certificate-layout {
            grid-template-columns: 1fr;
          }

          .verification-panel {
            position: relative;
            top: auto;
          }

          .certificate-topbar {
            margin-bottom: 42px;
          }
        }

        @media (max-width: 760px) {
          .certificate-public-page {
            padding: 22px 14px 34px;
          }

          .certificate-topbar {
            align-items: flex-start;
            flex-direction: column;
            gap: 16px;
          }

          .certificate-hero h1 {
            font-size: clamp(44px, 16vw, 72px);
          }

          .certificate-paper {
            min-height: 620px;
          }

          .paper-brand {
            left: 24px;
            top: 28px;
            max-width: 250px;
          }

          .paper-status-pill {
            right: 24px;
            top: 92px;
          }

          .paper-content {
            padding: 170px 24px 150px;
          }

          .paper-content h2 {
            font-size: 42px;
            letter-spacing: .10em;
          }

          .paper-content h3 {
            font-size: 34px;
          }

          .paper-content h4 {
            font-size: 25px;
          }

          .paper-footer {
            left: 24px;
            right: 24px;
            bottom: 26px;
            grid-template-columns: 1fr;
            gap: 12px;
            text-align: left;
          }

          .paper-signature {
            text-align: left;
          }

          .paper-signature i {
            margin-left: 0;
            margin-right: 0;
          }
        }
      `}</style>
    </main>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="data-row">
      <span>{label}</span>
      <strong>{value || '—'}</strong>
    </div>
  );
}

function Background() {
  return (
    <div className="background" aria-hidden="true">
      <div className="orb-one" />
      <div className="orb-two" />
      <div className="grid-texture" />
    </div>
  );
}

async function getCertificate(certificateId: string) {
  if (!certificateId || !supabaseUrl || !supabaseAnonKey) return null;

  const attempts = [
    { column: 'verification_slug', value: certificateId },
    { column: 'certificate_code', value: certificateId },
    { column: 'verification_code', value: certificateId },
    { column: 'code', value: certificateId },
    { column: 'id', value: certificateId },
  ];

  for (const attempt of attempts) {
    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .eq(attempt.column, attempt.value)
      .maybeSingle();

    if (!error && data) return data;
  }

  return null;
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return '—';
  }
}
