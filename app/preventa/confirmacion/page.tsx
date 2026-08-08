import Link from 'next/link';
import GHCLogo from '../../components/GHCLogo';
import styles from '../flow.module.css';

export const metadata = {
  title: 'Confirmación de matrícula · GHC Academy',
  description: 'Preview de confirmación de matrícula para la Edición Fundadora GHC Academy 2026.',
};

export default function ConfirmacionPreventaPage() {
  return (
    <main className={styles.page}>
      <div className={styles.internalBanner}>
        <strong>Preview interna</strong>
        <span>Ejemplo de pantalla posterior al pago. No representa una compra real.</span>
      </div>

      <header className={styles.header}>
        <Link href="/preventa" className={styles.logoLink} aria-label="Volver a GHC Academy">
          <GHCLogo size="md" showText tagline />
        </Link>
        <div className={styles.headerCenter}>
          <span>●</span>
          Confirmación · Edición Fundadora 2026
        </div>
        <Link href="/preventa/checkout" className={styles.backLink}>← Volver al checkout</Link>
      </header>

      <div className={styles.confirmShell}>
        <section className={styles.confirmHero}>
          <div className={styles.successMark}>✓</div>
          <p className={styles.eyebrow}>Confirmación propia de GHC Academy</p>
          <h1>Tu matrícula fundadora está registrada.</h1>
          <p>
            Esta pantalla acompaña al justificante del proveedor de pago. En producción también se enviará
            una confirmación contractual propia por correo electrónico y se conservará la trazabilidad de la orden.
          </p>

          <div className={styles.variantTabs}>
            <Link href="/preventa/confirmacion" data-active="true">Pago único · 1.690 €</Link>
            <Link href="/preventa/confirmacion?modalidad=fraccionado">Fraccionado · 895 € + 895 €</Link>
          </div>
        </section>

        <div className={styles.confirmGrid}>
          <section className={styles.confirmCard}>
            <h2>Resumen de la matrícula</h2>
            <div className={styles.orderLines}>
              <div className={styles.orderLine}><span>Referencia</span><strong>GHC-FUND-2026-XXXX</strong></div>
              <div className={styles.orderLine}><span>Producto</span><strong>Pack completo · 3 niveles · 30 módulos</strong></div>
              <div className={styles.orderLine}><span>Condición</span><strong>Alumno Fundador</strong></div>
              <div className={styles.orderLine}><span>Modalidad mostrada</span><strong>Pago único</strong></div>
              <div className={styles.orderLine}><span>Total pago único</span><strong>1.690 €</strong></div>
              <div className={styles.orderLine}><span>Alternativa fraccionada</span><strong>895 € + 895 € · total 1.790 €</strong></div>
              <div className={styles.orderLine}><span>Apertura prevista</span><strong>Durante octubre de 2026</strong></div>
              <div className={styles.orderLine}><span>Naturaleza</span><strong>Formación privada online</strong></div>
            </div>
          </section>

          <section className={styles.confirmCard}>
            <h2>Qué ocurre ahora</h2>
            <div className={styles.nextSteps}>
              <div className={styles.nextStep}>
                <b>01</b>
                <div>
                  <strong>Recibirás el correo de confirmación</strong>
                  <p>Incluirá la orden, modalidad, importe y las condiciones aplicables a la contratación.</p>
                </div>
              </div>
              <div className={styles.nextStep}>
                <b>02</b>
                <div>
                  <strong>Tu plaza quedará registrada</strong>
                  <p>La orden se vinculará a la Hoja Maestra, atribución comercial, estado de pago y condición fundadora.</p>
                </div>
              </div>
              <div className={styles.nextStep}>
                <b>03</b>
                <div>
                  <strong>Si eliges pago fraccionado</strong>
                  <p>El segundo pago de 895 € vencerá 15 días naturales después del primero.</p>
                </div>
              </div>
              <div className={styles.nextStep}>
                <b>04</b>
                <div>
                  <strong>Te avisaremos antes de la apertura</strong>
                  <p>GHC comunicará la fecha concreta cuando pueda garantizarla. No se promete todavía un día específico de octubre.</p>
                </div>
              </div>
              <div className={styles.nextStep}>
                <b>05</b>
                <div>
                  <strong>Activación de acceso</strong>
                  <p>El acceso dependerá del estado de pago y del Gate técnico completo de plataforma, evaluaciones, certificados y alta.</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className={styles.confirmFooter}>
          <strong>Esta Preview no crea una matrícula ni genera derechos contractuales.</strong>
          <p>
            El Gate económico y la base jurídica están aprobados. Antes de producción quedan la integración de pago,
            datos fiscales definitivos, URLs legales, correos, trazabilidad, alta automática y Gate técnico final.
          </p>
        </section>
      </div>
    </main>
  );
}
