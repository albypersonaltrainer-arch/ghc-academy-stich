'use client';

import { useState } from 'react';

export default function PaymentResumeClient({
  orderReference,
  installmentNo,
  checkoutToken,
}: {
  orderReference: string;
  installmentNo: 1 | 2;
  checkoutToken: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/preventa/sumup-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderReference, installmentNo, checkoutToken }),
      });

      const payload = await response.json().catch(() => ({})) as {
        ok?: boolean;
        hostedCheckoutUrl?: string;
        error?: string;
      };

      if (!response.ok || !payload.ok || !payload.hostedCheckoutUrl) {
        throw new Error(payload.error || 'No se pudo preparar una nueva sesión de pago.');
      }

      window.location.assign(payload.hostedCheckoutUrl);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No se pudo preparar una nueva sesión de pago.'
      );
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <button
        type="button"
        onClick={handleContinue}
        disabled={loading}
        style={{
          border: '1px solid #22D65B',
          borderRadius: 10,
          background: '#101411',
          color: '#fff',
          padding: '14px 20px',
          fontSize: 16,
          fontWeight: 800,
          cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? 'Preparando pago seguro…' : 'Continuar al pago seguro'}
      </button>
      {error && (
        <p role="alert" style={{ margin: 0, color: '#9f2d2d', lineHeight: 1.5 }}>
          {error}
        </p>
      )}
    </div>
  );
}
