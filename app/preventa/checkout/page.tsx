import Link from 'next/link';
import GHCLogo from '../../components/GHCLogo';
import CheckoutInteractive from './CheckoutInteractive';
import styles from '../flow.module.css';

export const metadata = {
  title: 'Checkout · Edición Fundadora · GHC Academy',
  description: 'Matrícula y pago de la Edición Fundadora GHC Academy 2026.',
};

export default function CheckoutPreventaPage() {
  const isPreview = process.env.VERCEL_ENV === 'preview';

  return (
    <main className={styles.page}>
      {isPreview && (
        <div className={styles.internalBanner}>
          <strong>Preview Sandbox</strong>
          <span>Flujo real de matrícula y SumUp Sandbox · no se mueve dinero real.</span>
        </div>
      )}

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
          <p className={styles.eyebrow}>Matrícula fundadora</p>
          <h1>{isPreview ? 'Prueba el recorrido real de matrícula en Sandbox.' : 'Completa tu matrícula en la Edición Fundadora.'}</h1>
          <p>
            {isPreview
              ? 'El formulario crea una matrícula de prueba, protege temporalmente una plaza y abre SumUp Sandbox con el mismo recorrido que usará la preventa.'
              : 'Elige tu modalidad, completa tus datos y continúa al pago seguro con SumUp. La plaza fundadora se confirma cuando el pago queda verificado.'}
          </p>
        </section>

        <CheckoutInteractive isPreview={isPreview} />
      </div>
    </main>
  );
}
