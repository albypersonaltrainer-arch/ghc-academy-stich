'use client';

import { useState } from 'react';

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

export default function TestEmailPaymentClient() {
  const [loadingPlan, setLoadingPlan] = useState<PaymentPlan | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  async function startTest(paymentPlan: PaymentPlan) {
    setLoadingPlan(paymentPlan);
    setError('');
    setStatus('Creando matrícula Sandbox…');

    try {
      const idempotencyKey = `emailtest_${paymentPlan}_${crypto.randomUUID().replace(/-/g, '')}`;
      const orderResponse = await fetch('/api/preventa/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          firstName: 'Alby',
          lastName: 'Aguiar',
          email: 'albycanarion@gmail.com',
          country: 'España',
          phone: '',
          paymentPlan,
          acceptedTerms: true,
          acceptedPrivacy: true,
          acknowledgedPrivateTraining: true,
          marketingConsent: false,
          attribution: {
            sourceChannel: 'preview-test',
            sourceDetail: paymentPlan === 'single'
              ? 'email-payment-e2e-single'
              : 'email-payment-e2e-split-first',
            campaignCode: 'FOUNDERS_2026_EMAIL_E2E',
          },
        }),
      });

      const order = await orderResponse.json().catch(() => ({})) as OrderResponse;
      const orderReference = order.order?.reference || '';
      const checkoutToken = order.checkout?.accessToken || '';

      if (!orderResponse.ok || !order.ok || !orderReference || !checkoutToken) {
        const message = order.errors?.join(' ') || order.error || 'No se pudo crear la matrícula Sandbox.';
        throw new Error(message);
      }

      setStatus(`Matrícula ${orderReference} creada. Preparando SumUp Sandbox…`);

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
        throw new Error(checkout.error || 'No se pudo preparar el checkout Sandbox.');
      }

      setStatus('Checkout listo. Abriendo SumUp Sandbox…');
      window.location.assign(checkout.hostedCheckoutUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo iniciar la prueba.');
      setStatus('');
      setLoadingPlan(null);
    }
  }

  const loading = loadingPlan !== null;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <button
        type="button"
        onClick={() => startTest('single')}
        disabled={loading}
        style={{
          border: '1px solid #22D65B',
          borderRadius: 12,
          background: '#0d120f',
          color: '#fff',
          padding: '16px 22px',
          fontSize: 16,
          fontWeight: 800,
          cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.72 : 1,
        }}
      >
        {loadingPlan === 'single' ? 'Preparando pago único…' : 'Pago único Sandbox · 1.690 €'}
      </button>

      <button
        type="button"
        onClick={() => startTest('split')}
        disabled={loading}
        style={{
          border: '1px solid #22D65B',
          borderRadius: 12,
          background: '#fff',
          color: '#0d120f',
          padding: '16px 22px',
          fontSize: 16,
          fontWeight: 800,
          cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.72 : 1,
        }}
      >
        {loadingPlan === 'split'
          ? 'Preparando primera cuota…'
          : 'Fraccionado Sandbox · pagar primera cuota de 895 €'}
      </button>

      <p style={{ margin: 0, color: '#59645d', fontSize: 14, lineHeight: 1.6 }}>
        En fraccionado, esta prueba cobra únicamente la primera cuota de 895 €. La segunda queda programada 15 días después y genera E02 al confirmarse la primera.
      </p>

      {status && <p style={{ margin: 0, lineHeight: 1.6 }}>{status}</p>}
      {error && (
        <p role="alert" style={{ margin: 0, color: '#a52f2f', lineHeight: 1.6 }}>
          {error}
        </p>
      )}
    </div>
  );
}
