import Link from 'next/link';
import GHCLogo from '../../components/GHCLogo';
import { preventaEmailTemplates } from '../emailTemplates';
import styles from './correos.module.css';

export const metadata = {
  title: 'Correos transaccionales · Preventa GHC Academy',
  description: 'Preview interna de los correos transaccionales E01–E14 de la Edición Fundadora 2026.',
};

const toneLabel = {
  success: 'Confirmación',
  neutral: 'Información',
  warning: 'Atención',
  critical: 'Aviso importante',
};

export default function PreventaCorreosPage() {
  return (
    <main className={styles.page}>
      <div className={styles.banner}>
        <strong>Preview interna</strong>
        <span>Serie E01–E14 cerrada. Proveedor de envío todavía no conectado.</span>
      </div>

      <header className={styles.header}>
        <Link href="/preventa" className={styles.logoLink}>
          <GHCLogo size="md" showText tagline />
        </Link>
        <div className={styles.headerText}>Correos transaccionales · E01–E14</div>
        <Link href="/preventa/checkout" className={styles.backLink}>← Volver al checkout</Link>
      </header>

      <section className={styles.hero}>
        <p className={styles.eyebrow}>Sistema de comunicación postcontratación</p>
        <h1>Catorce correos para cubrir el ciclo completo de una matrícula.</h1>
        <p>
          Confirmación contractual, fraccionamiento, vencimientos, regularización, apertura,
          incidencias de checkout y reembolso. Cada mensaje responde a un estado verificable
          y evita que el alumno tenga que interpretar qué ha ocurrido.
        </p>
      </section>

      <nav className={styles.index} aria-label="Índice de correos">
        {preventaEmailTemplates.map((email) => (
          <a key={email.code} href={`#${email.code}`}>
            <strong>{email.code}</strong>
            <span>{email.name}</span>
          </a>
        ))}
      </nav>

      <section className={styles.emailList}>
        {preventaEmailTemplates.map((email) => (
          <article id={email.code} key={email.code} className={styles.emailBlock}>
            <div className={styles.meta}>
              <div>
                <span className={styles.code}>{email.code}</span>
                <h2>{email.name}</h2>
                <p><strong>Disparador:</strong> {email.trigger}</p>
              </div>
              <span className={`${styles.tone} ${styles[email.tone]}`}>{toneLabel[email.tone]}</span>
            </div>

            <div className={styles.emailShell}>
              <div className={styles.mailTop}>
                <GHCLogo size="sm" showText tagline />
                <span>Edición Fundadora 2026</span>
              </div>

              <div className={styles.subjectBox}>
                <span>Asunto</span>
                <strong>{email.subject}</strong>
                <small>{email.preheader}</small>
              </div>

              <div className={styles.mailBody}>
                {email.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}

                {email.facts && (
                  <div className={styles.facts}>
                    {email.facts.map((fact) => (
                      <div key={fact.label}>
                        <span>{fact.label}</span>
                        <strong>{fact.value}</strong>
                      </div>
                    ))}
                  </div>
                )}

                {email.cta && <div className={styles.cta}>{email.cta}</div>}

                <div className={styles.footNote}>
                  GHC Academy · GHC Training — Health Through Strength · Formación privada online. Para incidencias de matrícula o pago: {'{{support_email}}'}
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
