import Link from 'next/link';
import GHCLogo from '../../components/GHCLogo';
import styles from '../flow.module.css';

type ConfirmacionPageProps = {
  searchParams?: Promise<{
    ref?: string | string[];
  }>;
};

export const metadata = {
  title: 'Verificación de pago · Edición Fundadora · GHC Academy',
  description: 'Estado posterior al pago de la Edición Fundadora de GHC Academy.',
  robots: { index: false, follow: false },
};

function cleanReference(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && /^GHC-[A-Z0-9]{8}$/.test(raw) ? raw : null;
}

export default async function ConfirmacionPreventaPage({ searchParams }: ConfirmacionPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const reference = cleanReference(resolvedSearchParams?.ref);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/preventa" className={styles.logoLink} aria-label="Volver a la Edición Fundadora">
          <GHCLogo size="md" showText tagline />
        </Link>
        <div className={styles.headerCenter}>
          <span>●</span>
          Verificación · Edición Fundadora 2026
        </div>
        <Link href="/preventa" className={styles.backLink}>Volver a la preventa</Link>
      </header>

      <div className={styles.confirmShell}>
        <section className={styles.confirmHero}>
          <div className={styles.successMark}>…</div>
          <p className={styles.eyebrow}>Pago pendiente de confirmación</p>
          <h1>Hemos recibido tu retorno desde SumUp.</h1>
          <p>
            Volver a esta página no confirma por sí solo el cobro. Tu plaza fundadora queda confirmada únicamente cuando
            SumUp verifica el pago y nuestro sistema registra esa confirmación.
          </p>
        </section>

        <div className={styles.confirmGrid}>
          <section className={styles.confirmCard}>
            <h2>Referencia de tu operación</h2>
            <div className={styles.orderLines}>
              <div className={styles.orderLine}>
                <span>Referencia</span>
                <strong>{reference || 'No disponible'}</strong>
              </div>
              <div className={styles.orderLine}><span>Producto</span><strong>Edición Fundadora · 3 niveles · 30 módulos</strong></div>
              <div className={styles.orderLine}><span>Apertura</span><strong>16 de octubre de 2026</strong></div>
              <div className={styles.orderLine}><span>Naturaleza</span><strong>Formación privada online</strong></div>
            </div>
          </section>

          <section className={styles.confirmCard}>
            <h2>Qué ocurre ahora</h2>
            <div className={styles.nextSteps}>
              <div className={styles.nextStep}>
                <b>01</b>
                <div>
                  <strong>SumUp comunica el resultado</strong>
                  <p>La vuelta a esta página no se utiliza por sí sola como prueba de pago.</p>
                </div>
              </div>
              <div className={styles.nextStep}>
                <b>02</b>
                <div>
                  <strong>GHC registra la confirmación</strong>
                  <p>Cuando el pago queda verificado, la matrícula y la condición fundadora se actualizan automáticamente.</p>
                </div>
              </div>
              <div className={styles.nextStep}>
                <b>03</b>
                <div>
                  <strong>Recibirás la confirmación por correo</strong>
                  <p>Ese correo recoge la referencia y la información contractual asociada a tu matrícula.</p>
                </div>
              </div>
              <div className={styles.nextStep}>
                <b>04</b>
                <div>
                  <strong>Si elegiste pago fraccionado</strong>
                  <p>La segunda cuota de 895 € vence 15 días naturales después de la confirmación de la primera.</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className={styles.confirmFooter}>
          <strong>Si no ves la confirmación inmediatamente, no repitas el pago.</strong>
          <p>
            La notificación del proveedor de pago puede tardar unos instantes. Si el pago se ha completado correctamente,
            recibirás la confirmación de GHC Academy en el correo utilizado durante la matrícula.
          </p>
          <p>
            Puedes consultar las <Link href="/legal#contratacion">condiciones de contratación</Link> y la información de{' '}
            <Link href="/legal#desistimiento">desistimiento y reembolsos</Link>.
          </p>
        </section>
      </div>
    </main>
  );
}
