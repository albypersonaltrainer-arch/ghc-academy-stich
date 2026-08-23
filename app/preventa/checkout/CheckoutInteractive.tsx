'use client';

import { FormEvent, useState } from 'react';
import styles from '../flow.module.css';
import ui from './checkout-interactive.module.css';

type PaymentPlan = 'single' | 'split';

type OrderResponse = {
  ok?: boolean;
  error?: string;
  errors?: string[];
  order?: {
    reference?: string;
  };
  checkout?: {
    installmentNo?: number;
    accessToken?: string;
  };
};

type CheckoutResponse = {
  ok?: boolean;
  error?: string;
  hostedCheckoutUrl?: string;
};

const euro = (cents: number) => new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
}).format(cents / 100);

export default function CheckoutInteractive({
  isPreview = false,
  initialPlan = 'single',
}: {
  isPreview?: boolean;
  initialPlan?: PaymentPlan;
}) {
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>(initialPlan);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState('');

  const total = paymentPlan === 'single' ? 169000 : 179000;
  const buttonLabel = paymentPlan === 'single'
    ? `Pagar ahora · 1.690 €${isPreview ? ' · Sandbox' : ''}`
    : `Pagar ahora · primera cuota 895 €${isPreview ? ' · Sandbox' : ''}`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setErrors([]);
    setStatus('Creando tu matrícula…');

    const form = new FormData(event.currentTarget);
    const requestKey = `web_${crypto.randomUUID().replace(/-/g, '')}`;

    const payload = {
      firstName: form.get('firstName'),
      lastName: form.get('lastName'),
      email: form.get('email'),
      country: form.get('country'),
      phone: form.get('phone'),
      paymentPlan,
      acceptedTerms: form.get('acceptedTerms') === 'on',
      acceptedPrivacy: form.get('acceptedPrivacy') === 'on',
      acknowledgedPrivateTraining: form.get('acknowledgedPrivateTraining') === 'on',
      marketingConsent: form.get('marketingConsent') === 'on',
      attribution: {
        sourceChannel: 'preventa-web',
        sourceDetail: isPreview ? 'public-checkout-preview-sandbox' : 'public-checkout',
        campaignCode: 'FOUNDERS_2026',
      },
    };

    try {
      const orderResponse = await fetch('/api/preventa/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': requestKey,
        },
        body: JSON.stringify(payload),
      });

      const order = await orderResponse.json().catch(() => ({})) as OrderResponse;
      const orderReference = order.order?.reference || '';
      const checkoutToken = order.checkout?.accessToken || '';

      if (!orderResponse.ok || !order.ok || !orderReference || !checkoutToken) {
        setErrors(order.errors || [order.error || 'No se pudo crear la matrícula.']);
        setStatus('');
        return;
      }

      setStatus(`Matrícula ${orderReference} creada. Preparando el pago seguro…`);

      const checkoutResponse = await fetch('/api/preventa/sumup-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderReference,
          installmentNo: 1,
          checkoutToken,
        }),
      });

      const checkout = await checkoutResponse.json().catch(() => ({})) as CheckoutResponse;
      if (!checkoutResponse.ok || !checkout.ok || !checkout.hostedCheckoutUrl) {
        setErrors([checkout.error || 'No se pudo preparar el pago. No se ha acreditado ningún cobro.']);
        setStatus(`La matrícula ${orderReference} se creó, pero el pago no llegó a iniciarse.`);
        return;
      }

      setStatus('Pago preparado. Abriendo SumUp…');
      window.location.assign(checkout.hostedCheckoutUrl);
    } catch {
      setErrors(['No se pudo conectar con el servicio de matrícula. No se ha acreditado ningún cobro.']);
      setStatus('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.checkoutGrid} onSubmit={handleSubmit}>
      <div className={styles.flow}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.step}>01</span>
            <div>
              <h2>Tu plaza fundadora</h2>
              <p>Antes de pedirte ningún dato, confirmamos exactamente qué estás contratando.</p>
            </div>
          </div>

          <div className={styles.productStrip}>
            <div><span>Producto</span><strong>Pack completo GHC Academy</strong></div>
            <div><span>Contenido</span><strong>3 niveles · 30 módulos</strong></div>
            <div><span>Edición</span><strong>Fundadora · máximo 100 plazas</strong></div>
            <div><span>Apertura</span><strong>Durante octubre de 2026</strong></div>
            <div><span>Formato</span><strong>Formación privada online</strong></div>
            <div><span>Confirmación</span><strong>La plaza se confirma tras verificar el pago</strong></div>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.step}>02</span>
            <div>
              <h2>Elige cómo quieres entrar</h2>
              <p>{isPreview ? 'Preview conectado a SumUp Sandbox: no se mueve dinero real.' : 'El pago se procesa de forma segura mediante SumUp.'}</p>
            </div>
          </div>

          <div className={styles.paymentChoices}>
            <label className={`${styles.paymentChoice} ${paymentPlan === 'single' ? ui.selected : ''}`}>
              <input className={ui.radio} type="radio" name="paymentPlan" value="single" checked={paymentPlan === 'single'} onChange={() => setPaymentPlan('single')} />
              <span className={styles.choiceLabel}>Mejor condición económica</span>
              <h3>Pago único</h3>
              <strong className={styles.price}>1.690 €</strong>
              <p>Un solo pago. Ahorras 100 € frente a la modalidad fraccionada y 600 € frente al precio futuro del pack.</p>
            </label>

            <label className={`${styles.paymentChoicePending} ${paymentPlan === 'split' ? ui.selected : ''}`}>
              <input className={ui.radio} type="radio" name="paymentPlan" value="split" checked={paymentPlan === 'split'} onChange={() => setPaymentPlan('split')} />
              <span className={styles.choiceLabel}>Modalidad alternativa</span>
              <h3>895 € + 895 €</h3>
              <strong className={styles.price}>1.790 € total</strong>
              <p>Pagas 895 € ahora. La segunda cuota vence 15 días naturales después de confirmar el primer pago.</p>
            </label>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.step}>03</span>
            <div>
              <h2>Datos de tu matrícula</h2>
              <p>Los usaremos para identificar tu plaza, enviarte las comunicaciones transaccionales y preparar el acceso.</p>
            </div>
          </div>

          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label htmlFor="firstName">Nombre</label>
              <input id="firstName" name="firstName" type="text" autoComplete="given-name" placeholder="Nombre" required />
            </div>
            <div className={styles.field}>
              <label htmlFor="lastName">Apellidos</label>
              <input id="lastName" name="lastName" type="text" autoComplete="family-name" placeholder="Apellidos" required />
            </div>
            <div className={styles.fieldFull}>
              <label htmlFor="email">Correo electrónico</label>
              <input id="email" name="email" type="email" autoComplete="email" placeholder="nombre@correo.com" required />
              <small>Aquí recibirás la confirmación, las instrucciones de apertura y las comunicaciones de tu matrícula.</small>
            </div>
            <div className={styles.field}>
              <label htmlFor="country">País de residencia</label>
              <select className={ui.controlAligned} id="country" name="country" defaultValue="" required>
                <option value="" disabled>Selecciona país</option>
                <option>España</option><option>México</option><option>Argentina</option><option>Colombia</option><option>Chile</option><option>Uruguay</option><option>Otro país hispanohablante</option>
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="phone">Teléfono · opcional</label>
              <input className={ui.controlAligned} id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+34 ..." />
              <small>No implica consentimiento comercial.</small>
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.step}>04</span>
            <div>
              <h2>Lo esencial antes de pagar</h2>
              <p>Queremos que la decisión sea clara antes de abrir la pasarela de pago.</p>
            </div>
          </div>

          <div className={styles.precontractGrid}>
            <div className={styles.fact}><span>Naturaleza</span><strong>Formación privada. No es una titulación oficial ni una habilitación automática.</strong></div>
            <div className={styles.fact}><span>Inicio</span><strong>Apertura durante octubre de 2026; el día exacto se comunicará cuando pueda garantizarse.</strong></div>
            <div className={styles.fact}><span>Contenido</span><strong>Tres niveles y treinta módulos dentro del entorno formativo de GHC Academy.</strong></div>
            <div className={styles.fact}><span>Evaluación</span><strong>Recorrido secuencial y umbral del 80 % por módulo.</strong></div>
            <div className={styles.fact}><span>Acompañamiento</span><strong>Dos sesiones grupales al mes: dudas y temas del grupo + Hot Seat. Incluye además soporte técnico, administrativo y académico básico; no incluye tutoría individual ni mentoring 1:1.</strong></div>
            <div className={styles.fact}><span>Pago fraccionado</span><strong>895 € al contratar y 895 € a los 15 días naturales tras confirmar la primera cuota.</strong></div>
          </div>

          {isPreview && (
            <div className={styles.legalPending}>
              <strong>Sandbox.</strong> Esta Preview crea registros de prueba y reserva capacidad temporal de prueba, pero SumUp no mueve dinero real.
            </div>
          )}
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.step}>05</span>
            <div>
              <h2>Aceptaciones y consentimientos</h2>
              <p>Lo obligatorio para contratar queda separado del consentimiento comercial opcional.</p>
            </div>
          </div>

          <div className={styles.checkList}>
            <label className={styles.checkRow}><input name="acceptedTerms" type="checkbox" required /><span><strong>Obligatoria.</strong> He leído la información precontractual y acepto las condiciones de contratación aplicables.</span></label>
            <label className={styles.checkRow}><input name="acceptedPrivacy" type="checkbox" required /><span><strong>Obligatoria.</strong> He leído la información de privacidad aplicable a mi matrícula.</span></label>
            <label className={styles.checkRow}><input name="acknowledgedPrivateTraining" type="checkbox" required /><span><strong>Obligatoria.</strong> Confirmo que conozco la naturaleza privada de GHC Academy.</span></label>
            <label className={styles.checkRow}><input name="marketingConsent" type="checkbox" /><span className={styles.optional}><strong>Opcional.</strong> Quiero recibir comunicaciones comerciales propias de GHC Academy.</span></label>
          </div>
        </section>

        {errors.length > 0 && (
          <section className={ui.errorBox} role="alert">
            <strong>Revisa estos puntos antes de continuar:</strong>
            <ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul>
          </section>
        )}

        {status && !errors.length && (
          <section className={ui.successBox} aria-live="polite">
            <span className={ui.successLabel}>{isPreview ? 'Sandbox activo' : 'Matrícula en curso'}</span>
            <p>{status}</p>
          </section>
        )}
      </div>

      <aside className={styles.summaryCard}>
        <div className={styles.summaryTop}><span>Resumen antes del pago</span><h2>Edición Fundadora 2026</h2></div>
        <div className={styles.summaryLines}>
          <div className={styles.summaryLine}><span>Producto</span><strong>3 niveles · 30 módulos</strong></div>
          <div className={styles.summaryLine}><span>Precio futuro del pack</span><strong><s>2.290 €</s></strong></div>
          <div className={styles.summaryLine}><span>Modalidad elegida</span><strong>{paymentPlan === 'single' ? 'Pago único' : '2 pagos'}</strong></div>
          <div className={styles.summaryLine}><span>Importe</span><strong>{paymentPlan === 'single' ? '1.690 €' : '895 € + 895 €'}</strong></div>
          {paymentPlan === 'split' && <div className={styles.summaryLine}><span>Segundo vencimiento</span><strong>15 días naturales después</strong></div>}
        </div>
        <div className={styles.total}>
          <span className={styles.totalLabel}>{paymentPlan === 'single' ? 'Total fundador' : 'Total fraccionado'}</span>
          <strong className={styles.totalPrice}>{euro(total)}</strong>
          <span className={styles.saving}>{paymentPlan === 'single' ? 'Ahorras 600 € frente al precio futuro del pack' : 'Pagas 895 € ahora · total 1.790 €'}</span>
        </div>
        <button className={`${styles.payButton} ${isPreview ? ui.previewButton : ''}`} type="submit" disabled={loading}>
          {loading ? 'Preparando pago…' : buttonLabel}
        </button>
        <p className={styles.secureNote}>
          {isPreview
            ? 'Prueba real del flujo con SumUp Sandbox. No se mueve dinero real.'
            : 'Pago procesado por SumUp. GHC Academy no almacena los datos de tu tarjeta. La plaza se confirma cuando el pago queda verificado.'}
        </p>
      </aside>
    </form>
  );
}
