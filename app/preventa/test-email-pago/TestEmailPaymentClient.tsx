'use client';

import { useState } from 'react';

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
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  async function startTest() {
    setLoading(true);
    setError('');
    setStatus('Creando matrícula Sandbox…');

    try {
      const idempotencyKey = `emailtest_${crypto.randomUUID().replace(/-/g, '')}`;
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
          paymentPlan: 'single',
          acceptedTerms: true,
          acceptedPrivacy: true,
          acknowledgedPrivateTraining: true,
          marketingConsent: false,
          attribution: {
            sourceChannel: 'preview-test',
            sourceDetail: 'email-payment-e2e',
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
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <button
        type="button"
        onClick={startTest}
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
        {loading ? 'Preparando prueba…' : 'Crear matrícula Sandbox y pagar 1.690 € de prueba'}
      </button>
      {status && <p style={{ margin: 0, lineHeight: 1.6 }}>{status}</p>}
      {error && (
        <p role="alert" style={{ margin: 0, color: '#a52f2f', lineHeight: 1.6 }}>
          {error}
        </p>
      )}
    </div>
  );
}
