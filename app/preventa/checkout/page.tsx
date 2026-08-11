import Link from 'next/link';
import GHCLogo from '../../components/GHCLogo';
import CheckoutInteractive from './CheckoutInteractive';
import styles from '../flow.module.css';

type CheckoutPageProps = {
  searchParams?: {
    plan?: string | string[];
  };
};

export const metadata = {
  title: 'Checkout · Edición Fundadora · GHC Academy',
  description: 'Matrícula y pago de la Edición Fundadora GHC Academy 2026.',
};

export default function CheckoutPreventaPage({ searchParams }: CheckoutPageProps) {
  const isPreview = process.env.VERCEL_ENV === 'preview';
  const requestedPlan = Array.isArray(searchParams?.plan) ? searchParams?.plan[0] : searchParams?.plan;
  const initialPlan = requestedPlan === 'split' ? 'split' : 'single';

  return (
    <main className={styles.page} data-preventa-root>
      {isPreview && (
        <div className={styles.internalBanner}>
          <strong>Preview Sandbox</strong>
          <span>Flujo real de matrícula y SumUp Sandbox · no se mueve dinero real.</span>
        </div>
      )}

      <header className={styles.header}>
        <Link href="/preventa" className={styles.logoLink} aria-label="Volver a la Edición Fundadora">
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
          <p className={styles.eyebrow}>Tu plaza fundadora</p>
          <h1>{isPreview ? 'Prueba el recorrido real de matrícula en Sandbox.' : 'Estás a un paso de reservar tu plaza en la primera generación.'}</h1>
          <p>
            {isPreview
              ? 'El formulario crea una matrícula de prueba, protege temporalmente una plaza y abre SumUp Sandbox con el mismo recorrido que usará la preventa.'
              : 'Revisa tu modalidad, completa tus datos y continúa al pago seguro. Tu plaza fundadora queda confirmada cuando SumUp verifica el pago.'}
          </p>
        </section>

        <CheckoutInteractive key={initialPlan} isPreview={isPreview} initialPlan={initialPlan} />
      </div>
    </main>
  );
}
