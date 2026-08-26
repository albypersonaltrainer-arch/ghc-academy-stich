import Link from 'next/link';
import GHCLogo from '../../components/GHCLogo';
import CheckoutInteractive from './CheckoutInteractive';
import {
  PREVENTA_OFFER,
  isFounderPresaleClosed,
} from '../../../lib/preventa/offer';
import styles from '../flow.module.css';

type CheckoutPageProps = {
  searchParams?: Promise<{
    plan?: string | string[];
  }>;
};

export const metadata = {
  title: 'Checkout · Edición Fundadora · GHC Academy',
  description: 'Matrícula y pago de la Edición Fundadora GHC Academy 2026.',
  robots: { index: false, follow: false },
};

export default async function CheckoutPreventaPage({ searchParams }: CheckoutPageProps) {
  const isPreview = process.env.VERCEL_ENV === 'preview';
  const presaleClosed = process.env.VERCEL_ENV === 'production' && isFounderPresaleClosed();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedPlan = Array.isArray(resolvedSearchParams?.plan)
    ? resolvedSearchParams.plan[0]
    : resolvedSearchParams?.plan;
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
        <div className={styles.logoLink} aria-label="GHC Academy">
          <GHCLogo size="md" showText tagline />
        </div>
        <div className={styles.headerCenter}>
          <span>●</span>
          Matrícula · Edición Fundadora 2026
        </div>
      </header>

      <div className={styles.shell}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>{presaleClosed ? 'Preventa cerrada' : 'Tu plaza fundadora'}</p>
          <h1>
            {isPreview
              ? 'Prueba el recorrido real de matrícula en Sandbox.'
              : presaleClosed
                ? 'La Edición Fundadora ya no admite nuevas matrículas de preventa.'
                : 'Estás a un paso de reservar tu plaza en la primera generación.'}
          </h1>
          <p>
            {isPreview
              ? 'El formulario crea una matrícula de prueba, protege temporalmente una plaza y abre SumUp Sandbox con el mismo recorrido que usará la preventa.'
              : presaleClosed
                ? `La preventa cerró el ${PREVENTA_OFFER.founderPresaleCloseLabel}, tal como estaba previsto en la oferta.`
                : 'Revisa tu modalidad, completa tus datos y continúa al pago seguro. Tu plaza fundadora queda confirmada cuando SumUp verifica el pago.'}
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.65, opacity: 0.82 }}>
            Antes de continuar puedes consultar las{' '}
            <Link href="/legal#contratacion">condiciones de contratación</Link>, la{' '}
            <Link href="/legal#desistimiento">información de desistimiento y reembolsos</Link> y la{' '}
            <Link href="/legal#privacidad">política de privacidad</Link>.
          </p>
        </section>

        {presaleClosed ? (
          <section className={styles.card} style={{ textAlign: 'center' }}>
            <h2 style={{ marginTop: 0 }}>La contratación de la Edición Fundadora está cerrada.</h2>
            <p style={{ marginBottom: 20, lineHeight: 1.7 }}>
              Las matrículas ya contratadas mantienen sus condiciones, pagos pendientes y comunicaciones. Este cierre solo impide iniciar nuevas matrículas de preventa.
            </p>
            <Link href="/preventa" className={styles.backLink}>Volver a GHC Academy</Link>
          </section>
        ) : (
          <CheckoutInteractive key={initialPlan} isPreview={isPreview} initialPlan={initialPlan} />
        )}
      </div>
    </main>
  );
}
