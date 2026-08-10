import { notFound } from 'next/navigation';
import GHCLogo from '../../components/GHCLogo';
import TestEmailPaymentClient from './TestEmailPaymentClient';

export const metadata = {
  title: 'Prueba email tras pago · GHC Academy',
  robots: { index: false, follow: false },
};

export default function TestEmailPaymentPage() {
  if (process.env.VERCEL_ENV === 'production') notFound();

  return (
    <main style={{ minHeight: '100vh', background: '#eef2ef', padding: '48px 20px' }}>
      <section
        style={{
          maxWidth: 720,
          margin: '0 auto',
          background: '#fff',
          border: '1px solid #dce4df',
          borderRadius: 18,
          overflow: 'hidden',
          boxShadow: '0 18px 50px rgba(0,0,0,.08)',
        }}
      >
        <header style={{ background: '#080b09', color: '#fff', padding: 28 }}>
          <GHCLogo size="md" showText tagline />
          <p style={{ margin: '18px 0 0', color: '#aab6ae', lineHeight: 1.6 }}>
            Prueba técnica · Preview · SumUp Sandbox · Resend
          </p>
        </header>

        <div style={{ padding: 30 }}>
          <h1 style={{ margin: '0 0 14px', fontSize: 28, lineHeight: 1.15 }}>
            Pago Sandbox → webhook → email E01
          </h1>
          <p style={{ margin: '0 0 20px', lineHeight: 1.7 }}>
            Esta pantalla crea una matrícula de prueba a nombre de Alby Aguiar con
            albycanarion@gmail.com, prepara un pago único de 1.690 € en SumUp Sandbox y,
            cuando el pago quede confirmado, debe generar y enviar el correo E01.
          </p>
          <div
            style={{
              marginBottom: 24,
              padding: 16,
              borderRadius: 12,
              background: '#f5f8f6',
              border: '1px solid #e1e8e3',
              lineHeight: 1.7,
            }}
          >
            <strong>No mueve dinero real.</strong> El importe y la tarjeta son exclusivamente de Sandbox.
          </div>
          <TestEmailPaymentClient />
        </div>
      </section>
    </main>
  );
}
