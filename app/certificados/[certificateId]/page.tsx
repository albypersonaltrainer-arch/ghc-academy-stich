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

  const isValid = Boolean(
    certificate && String(certificate.status || '').toLowerCase() !== 'revoked'
  );

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

            <div className={isValid ? 'paper-status-pill valid' : 'paper-status-pill invalid'}>
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
          --white: #f4f6f2;
          --muted: rgba(244, 246, 242, 0.62);
          --soft: rgba(244, 246, 242, 0.42);
          --paper-text: #1d2825;
          --gold: #d6b25e;
          --danger: #ff5757;
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
          padding: 18px clamp(20px, 4vw, 54px) 44px;
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
          min-height: 56px;
          margin-bottom: 22px;
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
          min-height: 40px;
          padding: 0 14px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.035);
          color: rgba(244,246,242,.78);
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
          background: var(--danger);
          color: var(--danger);
        }

        .certificate-hero {
          position: relative;
          z-index: 2;
          text-align: center;
          display: grid;
          justify-items: center;
          gap: 12px;
          margin-bottom: 24px;
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
          max-width: 1060px;
          color: var(--white);
          font-size: clamp(38px, 5.2vw, 72px);
          line-height: .88;
          text-transform: uppercase;
          letter-spacing: -.06em;
          font-weight: 950;
        }

        .certificate-subtitle {
          margin: 4px 0 0;
          color: rgba(244,246,242,.68);
          font-size: 14px;
          line-height: 1.6;
          max-width: 720px;
        }

        .certificate-layout {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
          gap: 18px;
          align-items: start;
          max-width: 1240px;
          margin: 0 auto;
        }

        .certificate-paper-shell,
        .verification-panel {
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,.09);
          background:
            radial-gradient(circle at top right, rgba(var(--green-rgb), .055), transparent 34%),
            linear-gradient(145deg, rgba(255,255,255,.052), rgba(255,255,255,.018)),
            rgba(8,12,10,.90);
          box-shadow: 0 26px 90px rgba(0,0,0,.28);
        }

        .certificate-paper-shell {
          padding: 14px;
          min-width: 0;
        }

        .certificate-paper {
          position: relative;
          min-height: 430px;
          overflow: hidden;
          border-radius: 20px;
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
          inset: 22px;
          border: 1px solid rgba(29,40,37,.15);
          border-radius: 15px;
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
          left: 28px;
          top: 24px;
          max-width: 250px;
          filter: none;
        }

        .paper-status-pill {
          position: absolute;
          z-index: 3;
          right: 28px;
          top: 26px;
          border-radius: 999px;
          border: 1px solid rgba(29,40,37,.12);
          padding: 8px 13px;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .16em;
          font-weight: 950;
        }

        .paper-status-pill.valid {
          background: rgba(99,229,70,.10);
          color: #1d6b33;
        }

        .paper-status-pill.invalid {
          background: rgba(255,87,87,.10);
          color: #a02020;
        }

        .paper-content {
          position: relative;
          z-index: 2;
          min-height: 320px;
          padding: 100px 38px 68px;
          display: grid;
          justify-items: center;
          text-align: center;
          align-content: center;
        }

        .paper-academy {
          margin: 0 0 12px;
          color: rgba(29,40,37,.62);
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .32em;
        }

        .paper-content h2 {
          margin: 0;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(38px, 4.8vw, 62px);
          line-height: .92;
          text-transform: uppercase;
          letter-spacing: .13em;
          color: rgba(29,40,37,.74);
          font-weight: 700;
        }

        .paper-subtitle {
          margin: 5px 0 16px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .26em;
          color: rgba(29,40,37,.48);
        }

        .paper-small {
          margin: 0 0 7px;
          color: rgba(29,40,37,.52);
          font-size: 11px;
          line-height: 1.45;
        }

        .paper-content h3 {
          margin: 0 0 16px;
          max-width: 720px;
          color: rgba(29,40,37,.82);
          font-size: clamp(28px, 3vw, 40px);
          line-height: 1;
          font-weight: 950;
          letter-spacing: -.045em;
        }

        .paper-content h4 {
          margin: 0;
          max-width: 660px;
          color: #159d6c;
          font-size: clamp(20px, 2.2vw, 30px);
          line-height: 1.06;
          font-weight: 950;
          letter-spacing: -.04em;
        }

        .paper-footer {
          position: absolute;
          z-index: 3;
          left: 28px;
          right: 28px;
          bottom: 24px;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 16px;
          align-items: end;
        }

        .paper-footer div {
          min-width: 0;
        }

        .paper-footer span {
          display: block;
          color: rgba(29,40,37,.46);
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: .16em;
          font-weight: 900;
        }

        .paper-footer strong {
          display: block;
          margin-top: 5px;
          color: rgba(29,40,37,.78);
          font-size: 12px;
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
          width: min(190px, 80%);
          height: 1px;
          margin: 0 auto 9px;
          background: rgba(29,40,37,.42);
        }

        .verification-panel {
          padding: 18px;
          position: sticky;
          top: 18px;
        }

        .verification-panel h2 {
          margin: 8px 0 16px;
          font-size: 24px;
          line-height: .98;
          letter-spacing: -.045em;
          font-weight: 950;
        }

        .verification-box {
          border-radius: 18px;
          padding: 16px;
          margin-bottom: 16px;
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
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: .14em;
          font-weight: 950;
        }

        .verification-box.invalid strong {
          color: var(--danger);
        }

        .verification-box p {
          margin: 10px 0 0;
          color: rgba(244,246,242,.66);
          line-height: 1.58;
          font-size: 13px;
        }

        .verification-data {
          display: grid;
          gap: 9px;
        }

        .data-row {
          border-radius: 15px;
          border: 1px solid rgba(255,255,255,.075);
          background: rgba(255,255,255,.026);
          padding: 12px 13px;
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
          font-size: 13px;
          line-height: 1.25;
          font-weight: 850;
          overflow-wrap: anywhere;
        }

        @media (max-width: 1120px) {
          .certificate-layout {
            grid-template-columns: 1fr;
            max-width: 920px;
          }

          .certificate-paper {
            min-height: 430px;
          }

          .verification-panel {
            position: relative;
            top: auto;
          }

          .certificate-topbar {
            margin-bottom: 24px;
          }
        }

        @media (max-width: 760px) {
          .certificate-public-page {
            padding: 14px 14px 34px;
          }

          .certificate-topbar {
            align-items: flex-start;
            flex-direction: column;
            gap: 16px;
          }

          .certificate-hero h1 {
            font-size: clamp(34px, 12vw, 54px);
          }

          .certificate-paper-shell {
            padding: 10px;
          }

          .certificate-paper {
            min-height: 500px;
          }

          .paper-brand {
            left: 22px;
            top: 22px;
            max-width: 220px;
          }

          .paper-status-pill {
            right: 22px;
            top: 78px;
          }

          .paper-content {
            padding: 104px 24px 76px;
          }

          .paper-content h2 {
            font-size: 32px;
            letter-spacing: .085em;
          }

          .paper-content h3 {
            font-size: 30px;
          }

          .paper-content h4 {
            font-size: 22px;
          }

          .paper-footer {
            left: 22px;
            right: 22px;
            bottom: 22px;
            grid-template-columns: 1fr;
            gap: 10px;
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
