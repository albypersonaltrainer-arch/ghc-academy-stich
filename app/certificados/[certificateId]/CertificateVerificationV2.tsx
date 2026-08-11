import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import GHCLogo from '../../components/GHCLogo'
import DownloadCertificateButton from './DownloadCertificateButton'
import styles from './CertificateVerificationV2.module.css'

type Props = { certificateId: string }
type Certificate = {
  id: string
  certificate_code: string | null
  verification_slug: string | null
  status: string | null
  student_name: string | null
  course_title: string | null
  final_score: number | null
  issued_at: string | null
  revoked_at: string | null
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  { auth: { persistSession: false, autoRefreshToken: false } }
)

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(date)
}

async function verifyCertificate(certificateId: string): Promise<Certificate | null> {
  const value = decodeURIComponent(certificateId || '').trim()
  if (!value) return null

  const { data, error } = await supabase.rpc('ghc_public_verify_certificate', {
    p_certificate_id: value
  })

  if (error) return null
  if (Array.isArray(data)) return (data[0] || null) as Certificate | null
  return (data || null) as Certificate | null
}

export default async function CertificateVerificationV2({ certificateId }: Props) {
  const certificate = await verifyCertificate(certificateId)
  const status = String(certificate?.status || '').toLowerCase()
  const valid = Boolean(certificate && status === 'valid')
  const revoked = Boolean(certificate && status === 'revoked')
  const studentName = certificate?.student_name || '—'
  const courseTitle = certificate?.course_title || '—'
  const code = certificate?.certificate_code || certificateId || '—'
  const issuedAt = formatDate(certificate?.issued_at)
  const score = valid && certificate?.final_score !== null && certificate?.final_score !== undefined
    ? `${certificate.final_score}%`
    : valid ? 'Aprobado' : '—'

  return (
    <main className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />
      <header className={styles.topbar}>
        <Link href="/" className={styles.logoLink} aria-label="GHC Academy">
          <GHCLogo size="md" showText tagline />
        </Link>
        <span className={valid ? styles.validBadge : styles.invalidBadge}>
          <i />
          {!certificate ? 'No encontrado' : valid ? 'Certificado válido' : revoked ? 'Certificado revocado' : 'Certificado no válido'}
        </span>
      </header>

      <section className={styles.hero}>
        <p>Verificación oficial · GHC Academy</p>
        <h1>Certificado verificable</h1>
        <span>
          {!certificate
            ? 'No existe una credencial asociada a este código.'
            : valid
              ? 'La credencial existe y figura como válida en el registro oficial de GHC Academy.'
              : revoked
                ? 'La credencial existe, pero ha sido revocada y no debe presentarse como válida.'
                : 'La credencial existe, pero no figura actualmente como válida.'}
        </span>
      </section>

      <div className={styles.layout}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <GHCLogo size="sm" showText tagline={false} />
            <span className={valid ? styles.paperValid : styles.paperInvalid}>
              {valid ? 'VÁLIDO' : revoked ? 'REVOCADO' : 'NO VÁLIDO'}
            </span>
          </div>

          <div className={styles.cardBody}>
            <small>GHC Academy acredita a</small>
            <h2>{certificate ? studentName : 'Credencial no encontrada'}</h2>
            <p>por completar satisfactoriamente los requisitos académicos de</p>
            <h3>{certificate ? courseTitle : '—'}</h3>
          </div>

          <footer className={styles.cardFooter}>
            <div><span>Emisión</span><strong>{issuedAt}</strong></div>
            <div><span>Código</span><strong>{code}</strong></div>
          </footer>
        </section>

        <aside className={styles.panel}>
          <p className={styles.kicker}>Datos verificados</p>
          <h2>Estado de la credencial</h2>

          <div className={valid ? styles.statusBoxValid : styles.statusBoxInvalid}>
            <strong>{valid ? 'Válido' : revoked ? 'Revocado' : certificate ? 'No válido' : 'No encontrado'}</strong>
            <span>
              {valid
                ? 'Los datos mostrados proceden del registro público mínimo de verificación; no se expone la fila interna del certificado.'
                : 'No se genera ni permite imprimir un diploma válido para esta credencial.'}
            </span>
          </div>

          <dl className={styles.dataList}>
            <div><dt>Alumno</dt><dd>{studentName}</dd></div>
            <div><dt>Curso</dt><dd>{courseTitle}</dd></div>
            <div><dt>Código</dt><dd>{code}</dd></div>
            <div><dt>Fecha</dt><dd>{issuedAt}</dd></div>
            <div><dt>Nota final</dt><dd>{score}</dd></div>
          </dl>

          {valid ? (
            <div className={styles.printArea}>
              <DownloadCertificateButton />
              <small>La impresión solo está habilitada para credenciales válidas.</small>
            </div>
          ) : null}
        </aside>
      </div>

      {valid ? (
        <section className={styles.printDiploma} aria-hidden="true">
          <div className={styles.printFrame}>
            <p>GHC Academy · Sport Through Science</p>
            <h1>Certificado oficial</h1>
            <span>Se otorga a</span>
            <h2>{studentName}</h2>
            <span>por completar satisfactoriamente</span>
            <h3>{courseTitle}</h3>
            <footer>
              <div><small>Fecha de emisión</small><strong>{issuedAt}</strong></div>
              <div><small>Dirección académica</small><strong>GHC Academy</strong></div>
              <div><small>Código verificable</small><strong>{code}</strong></div>
            </footer>
          </div>
        </section>
      ) : null}
    </main>
  )
}
