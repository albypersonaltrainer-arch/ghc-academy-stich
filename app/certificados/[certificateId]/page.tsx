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

const neon = '#00FF41';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function CertificateVerificationPage() {
  const params = useParams();
  const certificateId = String(params.certificateId || '');

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

        const { data, error } = await supabase
          .from('certificates')
          .select('*')
          .or(`verification_slug.eq.${certificateId},certificate_code.eq.${certificateId},id.eq.${certificateId}`)
          .maybeSingle();

        if (error) {
          console.error('Error loading certificate:', error);
          setMessage('No se pudo consultar el certificado.');
          setLoading(false);
          return;
        }

        if (!data) {
          setMessage('No se ha encontrado ningún certificado con este identificador.');
          setLoading(false);
          return;
        }

        setCertificate({
          id: data.id,
          certificate_code: data.certificate_code,
          verification_slug: data.verification_slug,
          student_name: data.student_name,
          course_id: data.course_id,
          course_title: data.course_title,
          final_score: data.final_score,
          issued_at: data.issued_at,
          status: data.status,
        });

        setSource('supabase');
        setLoading(false);
      } catch (error) {
        console.error('Unexpected certificate error:', error);
        setMessage('Error inesperado al verificar el certificado.');
        setLoading(false);
      }
    }

    if (certificateId) {
      loadCertificate();
    }
  }, [certificateId]);

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={containerStyle}>
          <p style={kickerStyle}>GHC Academy</p>
          <h1 style={titleStyle}>Verificando certificado</h1>
          <p style={textStyle}>Estamos comprobando la validez del certificado digital.</p>
        </div>
      </main>
    );
  }

  if (!certificate) {
    return (
      <main style={pageStyle}>
        <div style={containerStyle}>
          <Link href="/cursos" style={backButton}>
            ← Volver a GHC Academy
          </Link>

          <section style={errorCardStyle}>
            <p style={kickerStyle}>Certificado no encontrado</p>
            <h1 style={errorTitleStyle}>No se pudo verificar</h1>
            <p style={textStyle}>{message}</p>
          </section>
        </div>
      </main>
    );
  }

  const isValid = certificate.status === 'valid';

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <Link href="/cursos" style={backButton}>
          ← Volver a GHC Academy
        </Link>

        <section style={certificateShellStyle}>
          <div style={certificateHeaderStyle}>
            <div>
              <p style={kickerStyle}>GHC Academy · Digital Credential</p>

              <h1 style={certificateTitleStyle}>
                Certificado digital
              </h1>

              <p style={subtitleStyle}>
                Verificación pública de finalización académica.
              </p>
            </div>

            <div style={statusBoxStyle(isValid)}>
              <p style={smallLabel}>Estado</p>
              <p style={statusValueStyle(isValid)}>
                {isValid ? 'Válido' : 'Revocado'}
              </p>
            </div>
          </div>

          <div style={certificateBodyStyle}>
            <p style={certifiesTextStyle}>GHC Academy certifica que</p>

            <h2 style={studentNameStyle}>{certificate.student_name}</h2>

            <p style={certifiesTextStyle}>ha completado satisfactoriamente el curso</p>

            <h3 style={courseTitleStyle}>{certificate.course_title}</h3>

            <div style={dataGridStyle}>
              <div style={dataBoxStyle}>
                <p style={smallLabel}>Nota final</p>
                <p style={dataValueStyle}>{certificate.final_score}%</p>
              </div>

              <div style={dataBoxStyle}>
                <p style={smallLabel}>Fecha de emisión</p>
                <p style={dataValueStyle}>{formatDate(certificate.issued_at)}</p>
              </div>

              <div style={dataBoxStyle}>
                <p style={smallLabel}>Código</p>
                <p style={dataValueStyle}>{certificate.certificate_code}</p>
              </div>
            </div>

            <div style={verificationPanelStyle}>
              <div>
                <p style={smallLabel}>Verificación</p>
                <p style={verificationTextStyle}>
                  Este certificado puede verificarse públicamente mediante su código único.
                </p>
              </div>

              <span style={sourceBadgeStyle}>
                {source === 'preview' ? 'Modo preview' : 'Supabase'}
              </span>
            </div>
          </div>

          <div style={footerStyle}>
            <div>
              <p style={footerBrandStyle}>GHC Academy</p>
              <p style={footerTextStyle}>Sport Through Science</p>
            </div>

            <div style={sealStyle}>
              GHC
            </div>
          </div>
        </section>

        {source === 'preview' && (
          <section style={noticeBox}>
            <strong>Modo preview:</strong> este certificado se ha generado en este navegador para
            validar el flujo completo. Cuando activemos login, pagos y control de acceso, el
            certificado se emitirá desde Supabase y quedará asociado al alumno real.
          </section>
        )}
      </div>
    </main>
  );
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

function formatDate(value?: string) {
  if (!value) return '—';

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background:
    'radial-gradient(circle at top left, rgba(0,255,65,0.16), transparent 35%), radial-gradient(circle at bottom right, rgba(0,255,65,0.10), transparent 30%), #030504',
  color: 'white',
  padding: '32px',
  fontFamily: 'Arial, Helvetica, sans-serif',
};

const containerStyle: React.CSSProperties = {
  maxWidth: '1120px',
  margin: '0 auto',
};

const backButton: React.CSSProperties = {
  display: 'inline-block',
  marginBottom: '28px',
  color: neon,
  border: '1px solid rgba(0,255,65,0.45)',
  padding: '12px 16px',
  borderRadius: '999px',
  textDecoration: 'none',
  fontSize: '12px',
  fontWeight: 900,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
};

const kickerStyle: React.CSSProperties = {
  color: neon,
  fontSize: '12px',
  letterSpacing: '0.34em',
  fontWeight: 900,
  textTransform: 'uppercase',
  margin: '0 0 14px',
};

const titleStyle: React.CSSProperties = {
  fontSize: 'clamp(42px, 7vw, 84px)',
  lineHeight: '0.92',
  fontWeight: 950,
  textTransform: 'uppercase',
  letterSpacing: '-0.04em',
  margin: 0,
};

const subtitleStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.72)',
  fontSize: '17px',
  lineHeight: 1.6,
  margin: '16px 0 0',
};

const textStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.66)',
  fontSize: '15px',
  lineHeight: '1.75',
};

const certificateShellStyle: React.CSSProperties = {
  borderRadius: '38px',
  border: '1px solid rgba(0,255,65,0.42)',
  background:
    'linear-gradient(145deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03))',
  padding: '34px',
  boxShadow: '0 0 90px rgba(0,255,65,0.12)',
  position: 'relative',
  overflow: 'hidden',
};

const certificateHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '24px',
  alignItems: 'flex-start',
  borderBottom: '1px solid rgba(255,255,255,0.12)',
  paddingBottom: '28px',
};

const certificateTitleStyle: React.CSSProperties = {
  fontSize: 'clamp(42px, 7vw, 82px)',
  lineHeight: '0.9',
  fontWeight: 950,
  textTransform: 'uppercase',
  letterSpacing: '-0.04em',
  margin: 0,
};

const statusBoxStyle = (valid: boolean): React.CSSProperties => ({
  minWidth: '170px',
  borderRadius: '24px',
  border: valid ? '1px solid rgba(0,255,65,0.55)' : '1px solid rgba(255,80,80,0.45)',
  background: valid ? 'rgba(0,255,65,0.10)' : 'rgba(255,80,80,0.10)',
  padding: '18px',
  textAlign: 'center',
});

const smallLabel: React.CSSProperties = {
  margin: 0,
  color: 'rgba(255,255,255,0.45)',
  fontSize: '11px',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  fontWeight: 900,
};

const statusValueStyle = (valid: boolean): React.CSSProperties => ({
  margin: '7px 0 0',
  color: valid ? neon : '#ff7777',
  fontSize: '24px',
  fontWeight: 950,
  textTransform: 'uppercase',
});

const certificateBodyStyle: React.CSSProperties = {
  padding: '38px 0 32px',
  textAlign: 'center',
};

const certifiesTextStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.62)',
  fontSize: '17px',
  lineHeight: 1.6,
  margin: '0 0 12px',
};

const studentNameStyle: React.CSSProperties = {
  fontSize: 'clamp(38px, 6vw, 74px)',
  lineHeight: '0.95',
  fontWeight: 950,
  textTransform: 'uppercase',
  margin: '0 0 24px',
};

const courseTitleStyle: React.CSSProperties = {
  color: neon,
  fontSize: 'clamp(26px, 4vw, 48px)',
  lineHeight: '1.05',
  fontWeight: 950,
  textTransform: 'uppercase',
  margin: '0 0 34px',
};

const dataGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: '14px',
  marginTop: '28px',
};

const dataBoxStyle: React.CSSProperties = {
  borderRadius: '20px',
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(0,0,0,0.28)',
  padding: '16px',
};

const dataValueStyle: React.CSSProperties = {
  margin: '7px 0 0',
  color: 'white',
  fontSize: '17px',
  fontWeight: 900,
};

const verificationPanelStyle: React.CSSProperties = {
  marginTop: '24px',
  borderRadius: '24px',
  border: '1px solid rgba(0,255,65,0.24)',
  background: 'rgba(0,255,65,0.06)',
  padding: '18px',
  display: 'flex',
  justifyContent: 'space-between',
  gap: '18px',
  alignItems: 'center',
  textAlign: 'left',
};

const verificationTextStyle: React.CSSProperties = {
  margin: '6px 0 0',
  color: 'rgba(255,255,255,0.70)',
  fontSize: '14px',
  lineHeight: 1.6,
};

const sourceBadgeStyle: React.CSSProperties = {
  borderRadius: '999px',
  border: '1px solid rgba(0,255,65,0.45)',
  color: neon,
  padding: '9px 12px',
  fontSize: '11px',
  fontWeight: 950,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
};

const footerStyle: React.CSSProperties = {
  borderTop: '1px solid rgba(255,255,255,0.12)',
  paddingTop: '24px',
  display: 'flex',
  justifyContent: 'space-between',
  gap: '24px',
  alignItems: 'center',
};

const footerBrandStyle: React.CSSProperties = {
  color: neon,
  fontSize: '13px',
  fontWeight: 950,
  letterSpacing: '0.25em',
  textTransform: 'uppercase',
  margin: 0,
};

const footerTextStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.58)',
  fontSize: '13px',
  margin: '6px 0 0',
};

const sealStyle: React.CSSProperties = {
  width: '82px',
  height: '82px',
  borderRadius: '999px',
  border: '1px solid rgba(0,255,65,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: neon,
  fontWeight: 950,
  letterSpacing: '0.12em',
  boxShadow: '0 0 34px rgba(0,255,65,0.20)',
};

const noticeBox: React.CSSProperties = {
  marginTop: '24px',
  padding: '22px',
  borderRadius: '24px',
  border: '1px solid rgba(0,255,65,0.22)',
  color: 'rgba(255,255,255,0.72)',
  background: 'rgba(255,255,255,0.035)',
  lineHeight: 1.7,
};

const errorCardStyle: React.CSSProperties = {
  borderRadius: '32px',
  border: '1px solid rgba(255,80,80,0.38)',
  background: 'rgba(255,80,80,0.08)',
  padding: '30px',
};

const errorTitleStyle: React.CSSProperties = {
  fontSize: 'clamp(36px, 6vw, 66px)',
  lineHeight: '0.95',
  fontWeight: 950,
  textTransform: 'uppercase',
  margin: 0,
};
