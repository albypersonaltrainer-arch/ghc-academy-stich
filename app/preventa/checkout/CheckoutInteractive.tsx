'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import styles from '../flow.module.css';
import ui from './checkout-interactive.module.css';

type PaymentPlan = 'single' | 'split';

type PreviewResponse = {
  ok: boolean;
  errors?: string[];
  error?: string;
  order?: {
    reference: string;
    status: string;
    founderStatus: string;
    paymentPlan: PaymentPlan;
    totalAmountCents: number;
    firstInstallmentCents: number;
    secondInstallmentCents: number;
    secondDueAt: string | null;
  };
};

const euro = (cents: number) => new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
}).format(cents / 100);

export default function CheckoutInteractive() {
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>('single');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<PreviewResponse['order'] | null>(null);

  const total = paymentPlan === 'single' ? 169000 : 179000;
  const buttonLabel = useMemo(
    () => paymentPlan === 'single'
      ? 'Validar matrícula de prueba · 1.690 €'
      : 'Validar matrícula de prueba · 895 € + 895 €',
    [paymentPlan]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrors([]);
    setResult(null);

    const form = new FormData(event.currentTarget);

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
        sourceChannel: 'preview-web',
        sourceDetail: 'checkout-interactive',
        campaignCode: 'FOUNDERS_2026_PREVIEW',
      },
    };

    try {
      const response = await fetch('/api/preventa/preview-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json() as PreviewResponse;

      if (!response.ok || !data.ok || !data.order) {
        setErrors(data.errors || [data.error || 'No se pudo validar la matrícula de prueba.']);
        return;
      }

      setResult(data.order);
    } catch {
      setErrors(['No se pudo conectar con la validación de Preview.']);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.checkoutGrid} onSubmit={handleSubmit} noValidate>
      <div className={styles.flow}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.step}>01</span>
            <div>
              <h2>Resumen de matrícula</h2>
              <p>Solo lo que condiciona la decisión de compra.</p>
            </div>
          </div>

          <div className={styles.productStrip}>
            <div><span>Producto</span><strong>Pack completo GHC Academy</strong></div>
            <div><span>Contenido</span><strong>3 niveles · 30 módulos</strong></div>
            <div><span>Edición</span><strong>Fundadora · máximo 100 plazas</strong></div>
            <div><span>Apertura</span><strong>Durante octubre de 2026</strong></div>
            <div><span>Formato</span><strong>Formación privada online</strong></div>
            <div><span>Acceso</span><strong>Mientras la plataforma esté operativa</strong></div>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.step}>02</span>
            <div>
              <h2>Elige cómo pagar</h2>
              <p>En Preview solo se valida la modalidad; no se crea ningún cobro.</p>
            </div>
          </div>

          <div className={styles.paymentChoices}>
            <label className={`${styles.paymentChoice} ${paymentPlan === 'single' ? ui.selected : ''}`}>
              <input className={ui.radio} type="radio" name="paymentPlan" value="single" checked={paymentPlan === 'single'} onChange={() => setPaymentPlan('single')} />
              <span className={styles.choiceLabel}>Mejor precio</span>
              <h3>Pago único</h3>
              <strong className={styles.price}>1.690 €</strong>
              <p>Un solo pago. Ahorras 100 € frente a la modalidad fraccionada.</p>
            </label>

            <label className={`${styles.paymentChoicePending} ${paymentPlan === 'split' ? ui.selected : ''}`}>
              <input className={ui.radio} type="radio" name="paymentPlan" value="split" checked={paymentPlan === 'split'} onChange={() => setPaymentPlan('split')} />
              <span className={styles.choiceLabel}>Pago fraccionado</span>
              <h3>895 € + 895 €</h3>
              <strong className={styles.price}>1.790 €</strong>
              <p>La segunda cuota vence 15 días naturales después de confirmar el primer pago.</p>
            </label>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.step}>03</span>
            <div>
              <h2>Datos del comprador</h2>
              <p>Estos datos se validan en servidor, pero en Preview no se guardan.</p>
            </div>
          </div>

          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label htmlFor="firstName">Nombre</label>
              <input id="firstName" name="firstName" type="text" autoComplete="given-name" placeholder="Nombre" />
            </div>
            <div className={styles.field}>
              <label htmlFor="lastName">Apellidos</label>
              <input id="lastName" name="lastName" type="text" autoComplete="family-name" placeholder="Apellidos" />
            </div>
            <div className={styles.fieldFull}>
              <label htmlFor="email">Correo electrónico</label>
              <input id="email" name="email" type="email" autoComplete="email" placeholder="nombre@correo.com" />
              <small>Cuenta, confirmación, acceso y soporte.</small>
            </div>
            <div className={styles.field}>
              <label htmlFor="country">País de residencia</label>
              <select id="country" name="country" defaultValue="">
                <option value="" disabled>Selecciona país</option>
                <option>España</option><option>México</option><option>Argentina</option><option>Colombia</option><option>Chile</option><option>Uruguay</option><option>Otro país hispanohablante</option>
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="phone">Teléfono · opcional</label>
              <input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+34 ..." />
              <small>No implica consentimiento comercial.</small>
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.step}>04</span>
            <div>
              <h2>Información esencial antes del pago</h2>
              <p>Base jurídica aprobada. La Preview reproduce ya las condiciones esenciales del flujo.</p>
            </div>
          </div>

          <div className={styles.precontractGrid}>
            <div className={styles.fact}><span>Naturaleza</span><strong>Formación privada. No es una titulación oficial ni una habilitación automática.</strong></div>
            <div className={styles.fact}><span>Inicio</span><strong>Apertura durante octubre de 2026; el día exacto se comunicará cuando pueda garantizarse.</strong></div>
            <div className={styles.fact}><span>Contenido</span><strong>Tres niveles y treinta módulos dentro de la plataforma.</strong></div>
            <div className={styles.fact}><span>Evaluación</span><strong>Recorrido secuencial y umbral del 80 % por módulo, sujeto al Gate técnico completo.</strong></div>
            <div className={styles.fact}><span>Soporte</span><strong>Técnico, administrativo y académico básico. Sin tutoría individual ni mentoría.</strong></div>
            <div className={styles.fact}><span>Pago fraccionado</span><strong>895 € al contratar y 895 € a los 15 días naturales tras confirmar la primera cuota.</strong></div>
          </div>

          <div className={styles.legalPending}>
            <strong>Preview técnica.</strong> No se reserva plaza, no se genera pago y no se escribe ningún dato en Supabase.
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.step}>05</span>
            <div>
              <h2>Aceptaciones y consentimientos</h2>
              <p>Las obligatorias se registrarán por separado de cualquier consentimiento comercial.</p>
            </div>
          </div>

          <div className={styles.checkList}>
            <label className={styles.checkRow}><input name="acceptedTerms" type="checkbox" /><span><strong>Obligatoria.</strong> He leído la información precontractual y acepto las condiciones de contratación aplicables.</span></label>
            <label className={styles.checkRow}><input name="acceptedPrivacy" type="checkbox" /><span><strong>Obligatoria.</strong> He leído la información de privacidad aplicable a mi matrícula.</span></label>
            <label className={styles.checkRow}><input name="acknowledgedPrivateTraining" type="checkbox" /><span><strong>Obligatoria.</strong> Confirmo que conozco la naturaleza privada de GHC Academy.</span></label>
            <label className={styles.checkRow}><input name="marketingConsent" type="checkbox" /><span className={styles.optional}><strong>Opcional.</strong> Quiero recibir comunicaciones comerciales propias de GHC Academy.</span></label>
          </div>
        </section>

        {errors.length > 0 && (
          <section className={ui.errorBox} role="alert">
            <strong>Revisa estos puntos antes de continuar:</strong>
            <ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul>
          </section>
        )}

        {result && (
          <section className={ui.successBox} aria-live="polite">
            <span className={ui.successLabel}>Validación completada</span>
            <h2>Matrícula simulada correcta.</h2>
            <div className={ui.reference}>{result.reference}</div>
            <div className={ui.resultGrid}>
              <div><span>Modalidad</span><strong>{result.paymentPlan === 'single' ? 'Pago único' : '895 € + 895 €'}</strong></div>
              <div><span>Total validado</span><strong>{euro(result.totalAmountCents)}</strong></div>
              <div><span>Estado</span><strong>{result.status}</strong></div>
              <div><span>Plaza fundadora</span><strong>No reservada · Preview</strong></div>
            </div>
            <p>La API ha validado datos, modalidad, importes y aceptaciones. No se ha creado cobro ni registro persistente.</p>
            <Link className={ui.confirmLink} href={`/preventa/confirmacion?modalidad=${result.paymentPlan === 'split' ? 'fraccionado' : 'unico'}&preview=1`}>Continuar a la confirmación de ejemplo →</Link>
          </section>
        )}
      </div>

      <aside className={styles.summaryCard}>
        <div className={styles.summaryTop}><span>Resumen del pedido</span><h2>Edición Fundadora 2026</h2></div>
        <div className={styles.summaryLines}>
          <div className={styles.summaryLine}><span>Producto</span><strong>3 niveles · 30 módulos</strong></div>
          <div className={styles.summaryLine}><span>Precio habitual pack</span><strong><s>2.290 €</s></strong></div>
          <div className={styles.summaryLine}><span>Modalidad elegida</span><strong>{paymentPlan === 'single' ? 'Pago único' : '50 % + 50 %'}</strong></div>
          <div className={styles.summaryLine}><span>Importe</span><strong>{paymentPlan === 'single' ? '1.690 €' : '895 € + 895 €'}</strong></div>
          {paymentPlan === 'split' && <div className={styles.summaryLine}><span>Segundo vencimiento</span><strong>+15 días</strong></div>}
        </div>
        <div className={styles.total}>
          <span className={styles.totalLabel}>{paymentPlan === 'single' ? 'Total fundador' : 'Total fraccionado'}</span>
          <strong className={styles.totalPrice}>{euro(total)}</strong>
          <span className={styles.saving}>{paymentPlan === 'single' ? 'Ahorras 600 € frente al pack habitual' : 'Dos cuotas de 895 € · +100 € por fraccionamiento'}</span>
        </div>
        <button className={`${styles.payButton} ${ui.previewButton}`} type="submit" disabled={loading}>
          {loading ? 'Validando matrícula…' : buttonLabel}
        </button>
        <p className={styles.secureNote}>Este botón solo llama a la API de Preview. No cobra, no reserva plaza y no guarda datos.</p>
      </aside>
    </form>
  );
}
