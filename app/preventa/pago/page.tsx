import Link from 'next/link';
import GHCLogo from '../../components/GHCLogo';
import {
  CheckoutAccessTokenError,
  verifyCheckoutAccessToken,
} from '../../../lib/preventa/checkout-access-token';
import PaymentResumeClient from './PaymentResumeClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Continuar pago · GHC Academy',
  description: 'Acceso seguro para continuar un pago pendiente de la Edición Fundadora 2026.',
};

function shell(children: React.ReactNode) {
  return (
    <main style={{ minHeight: '100vh', background: '#eef2ef', padding: '36px 16px', color: '#101411' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <Link href="/preventa" aria-label="Volver a GHC Academy" style={{ textDecoration: 'none' }}>
          <GHCLogo size="md" showText tagline />
        </Link>
        <section style={{ marginTop: 28, background: '#fff', border: '1px solid #dfe6e1', borderRadius: 16, padding: 28 }}>
          {children}
        </section>
      </div>
    </main>
  );
}

export default async function PreventaPagoPage({
  searchParams,
}: {
  searchParams?: Promise<{ order?: string; installment?: string; token?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const orderReference = (resolvedSearchParams?.order || '').trim();
  const installmentValue = Number(resolvedSearchParams?.installment);
  const token = (resolvedSearchParams?.token || '').trim();
  const installmentNo = installmentValue === 1 || installmentValue === 2
    ? installmentValue as 1 | 2
    : null;

  if (!orderReference || !installmentNo || !token) {
    return shell(
      <>
        <p style={{ margin: '0 0 8px', color: '#667068', fontWeight: 700 }}>Enlace de pago</p>
        <h1 style={{ margin: '0 0 14px', fontSize: 28 }}>Este enlace no es válido.</h1>
        <p style={{ margin: 0, lineHeight: 1.65 }}>
          Abre de nuevo el enlace incluido en el correo de GHC Academy o solicita una nueva sesión de pago.
        </p>
      </>
    );
  }

  try {
    verifyCheckoutAccessToken({ token, orderReference, installmentNo });
  } catch (error) {
    const expired = error instanceof CheckoutAccessTokenError && error.code === 'CHECKOUT_TOKEN_EXPIRED';
    return shell(
      <>
        <p style={{ margin: '0 0 8px', color: '#667068', fontWeight: 700 }}>Enlace de pago</p>
        <h1 style={{ margin: '0 0 14px', fontSize: 28 }}>
          {expired ? 'Este enlace ha caducado.' : 'No hemos podido validar este enlace.'}
        </h1>
        <p style={{ margin: 0, lineHeight: 1.65 }}>
          No se ha realizado ningún cobro. Utiliza el enlace más reciente que hayas recibido de GHC Academy.
        </p>
      </>
    );
  }

  return shell(
    <>
      <p style={{ margin: '0 0 8px', color: '#236b3a', fontWeight: 800 }}>Sesión segura de pago</p>
      <h1 style={{ margin: '0 0 14px', fontSize: 28 }}>Continúa tu pago en SumUp.</h1>
      <p style={{ margin: '0 0 8px', lineHeight: 1.65 }}>
        Referencia: <strong>{orderReference}</strong>
      </p>
      <p style={{ margin: '0 0 24px', lineHeight: 1.65 }}>
        {installmentNo === 1 ? 'Pago inicial o pago único' : 'Segunda cuota'} · GHC Academy Edición Fundadora 2026.
      </p>
      <PaymentResumeClient
        orderReference={orderReference}
        installmentNo={installmentNo}
        checkoutToken={token}
      />
      <p style={{ margin: '20px 0 0', fontSize: 13, lineHeight: 1.55, color: '#6b746d' }}>
        GHC Academy no considera un pago confirmado hasta recibir la validación del proveedor mediante su canal seguro.
      </p>
    </>
  );
}
