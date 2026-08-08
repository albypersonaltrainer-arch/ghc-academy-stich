import Link from 'next/link';
import GHCLogo from '../../components/GHCLogo';
import CheckoutInteractive from './CheckoutInteractive';
import styles from '../flow.module.css';

export const metadata = {
  title: 'Checkout · Edición Fundadora · GHC Academy',
  description: 'Resumen y preparación de matrícula de la Edición Fundadora GHC Academy 2026.',
};

export default function CheckoutPreventaPage() {
  return (
    <main className={styles.page}>
      <div className={styles.internalBanner}>
        <strong>Preview técnica</strong>
        <span>Validación server-side activa · sin cobro · sin reserva de plaza · sin escritura en Supabase.</span>
      </div>

      <header className={styles.header}>
        <Link href="/preventa" className={styles.logoLink} aria-label="Volver a GHC Academy">
          <GHCLogo size="md" showText tagline />
        </Link>
        <div className={styles.headerCenter}>
          <span>●</span>
          Matrícula · Edición Fundadora 2026
        </div>
        <Link href="/preventa" className={styles.backLink}>← Volver a la oferta</Link>
      </header>

      <div className={styles.shell}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Matrícula fundadora · Preview técnica</p>
          <h1>Prueba el flujo sin realizar ningún pago.</h1>
          <p>
            El formulario ya valida desde servidor datos, modalidad, precios y aceptaciones. Si todo es correcto,
            genera una referencia GHC simulada sin almacenar datos ni reservar una plaza real.
          </p>
        </section>

        <CheckoutInteractive />
      </div>
    </main>
  );
}
