import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import GHCLogo from '../../components/GHCLogo';
import {
  MatriculaAccessTokenError,
  verifyMatriculaAccessToken,
} from '../../../lib/preventa/matricula-access-token';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Estado de matrícula · GHC Academy',
  description: 'Consulta privada del estado administrativo de tu matrícula en GHC Academy.',
  robots: { index: false, follow: false },
};

function clean(value: string | undefined) {
  return (value || '').trim();
}

function formatEuro(cents: number) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatMadridDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Madrid',
  }).format(date);
}

function statusLabel(status: string, founderStatus: string, balanceCents: number) {
  if (status === 'refunded') return 'Matrícula reembolsada';
  if (status === 'cancelled') return 'Expediente cerrado';
  if (status === 'overdue') return 'Matrícula activa · segundo pago vencido';
  if (status === 'paid' && balanceCents <= 0 && founderStatus === 'confirmed') {
    return 'Matrícula confirmada y abonada';
  }
  if (status === 'partial' || founderStatus === 'reserved') {
    return 'Matrícula activa · pago pendiente';
  }
  if (status === 'awaiting_payment') return 'Pendiente de confirmación de pago';
  if (status === 'draft') return 'Matrícula iniciada';
  if (status === 'paid') return 'Pago confirmado';
  return 'Matrícula registrada';
}

function shell(children: React.ReactNode) {
  return (
    <main style={{ minHeight: '100vh', background: '#eef2ef', padding: '36px 16px', color: '#101411' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <Link href="/preventa" aria-label="Volver a GHC Academy" style={{ textDecoration: 'none' }}>
          <GHCLogo size="md" showText tagline />
        </Link>
        <section style={{ marginTop: 28, background: '#fff', border: '1px solid #dfe6e1', borderRadius: 16, overflow: 'hidden' }}>
          {children}
        </section>
      </div>
    </main>
  );
}

function message(title: string, text: string) {
  return shell(
    <div style={{ padding: 30 }}>
      <p style={{ margin: '0 0 8px', color: '#667068', fontWeight: 700 }}>Estado de matrícula</p>
      <h1 style={{ margin: '0 0 14px', fontSize: 28 }}>{title}</h1>
      <p style={{ margin: 0, lineHeight: 1.65 }}>{text}</p>
    </div>
  );
}

export default async function MatriculaPage({
  searchParams,
}: {
  searchParams?: Promise<{ order?: string; token?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const orderReference = (resolvedSearchParams?.order || '').trim();
  const token = (resolvedSearchParams?.token || '').trim();

  if (!orderReference || !token) {
    return message(
      'Este enlace no es válido.',
      'Abre de nuevo el enlace incluido en el correo de confirmación de GHC Academy.'
    );
  }

  try {
    verifyMatriculaAccessToken({ token, orderReference });
  } catch (error) {
    const expired = error instanceof MatriculaAccessTokenError && error.code === 'MATRICULA_TOKEN_EXPIRED';
    return message(
      expired ? 'Este enlace ha caducado.' : 'No hemos podido validar este enlace.',
      expired
        ? 'Solicita a soporte un nuevo enlace seguro para consultar tu matrícula.'
        : 'Utiliza el enlace original recibido por correo o contacta con soporte si necesitas revisar tu expediente.'
    );
  }

  const supabaseUrl = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const supportEmail = clean(process.env.PREVENTA_EMAIL_SUPPORT || process.env.PREVENTA_SUPPORT_EMAIL);

  if (!supabaseUrl || !serviceRoleKey) {
    return message(
      'Consulta temporalmente no disponible.',
      'Tu matrícula no se ha modificado. Inténtalo de nuevo más tarde o contacta con soporte.'
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data: order, error: orderError } = await supabase
    .from('preventa_orders')
    .select('id, order_reference, first_name, payment_plan, total_amount_cents, second_due_at, status, founder_place_number, founder_status, paid_at')
    .eq('order_reference', orderReference)
    .maybeSingle();

  if (orderError || !order) {
    return message(
      'No hemos podido cargar tu matrícula.',
      'El enlace es válido, pero no hemos podido recuperar el expediente en este momento. Contacta con soporte e indica tu referencia.'
    );
  }

  const { data: payments, error: paymentsError } = await supabase
    .from('preventa_payments')
    .select('paid_amount_cents, refunded_amount_cents')
    .eq('order_id', order.id);

  if (paymentsError) {
    return message(
      'No hemos podido cargar el estado económico.',
      'Tu matrícula no se ha modificado. Contacta con soporte e indica tu referencia para que podamos revisarla.'
    );
  }

  const paidCents = (payments || []).reduce(
    (sum, payment) => sum + Math.max(0, Number(payment.paid_amount_cents || 0) - Number(payment.refunded_amount_cents || 0)),
    0
  );
  const totalCents = Number(order.total_amount_cents || 0);
  const balanceCents = Math.max(0, totalCents - paidCents);
  const founderNumber = order.founder_place_number ? `n.º ${order.founder_place_number}` : 'Pendiente de asignación';
  const secondDue = formatMadridDate(order.second_due_at);
  const paymentPlan = order.payment_plan === 'split' ? 'Dos cuotas' : 'Pago único';
  const currentStatus = statusLabel(String(order.status || ''), String(order.founder_status || ''), balanceCents);

  const rows = [
    ['Referencia', order.order_reference],
    ['Estado', currentStatus],
    ['Modalidad', paymentPlan],
    ['Precio contratado', formatEuro(totalCents)],
    ['Importe abonado', formatEuro(paidCents)],
    ['Saldo pendiente', formatEuro(balanceCents)],
    ['Plaza Fundador', founderNumber],
    ...(order.payment_plan === 'split' && secondDue ? [['Segundo vencimiento', secondDue]] : []),
    ['Apertura', '16 de octubre de 2026'],
  ];

  return shell(
    <>
      <div style={{ padding: '26px 30px', background: '#080b09', color: '#fff' }}>
        <p style={{ margin: '0 0 8px', color: '#22D65B', fontSize: 12, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase' }}>
          Consulta privada
        </p>
        <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.2 }}>Estado de tu matrícula</h1>
      </div>
      <div style={{ padding: 30 }}>
        <p style={{ margin: '0 0 22px', fontSize: 17, lineHeight: 1.65 }}>
          Hola {order.first_name}. Este es el estado administrativo que consta actualmente en GHC Academy.
        </p>

        <div style={{ display: 'grid', gap: 10 }}>
          {rows.map(([label, value]) => (
            <div key={label} style={{ display: 'grid', gridTemplateColumns: 'minmax(145px, 40%) 1fr', gap: 12, padding: '13px 14px', background: '#f4f7f4', borderRadius: 9 }}>
              <span style={{ color: '#68706a', fontSize: 13 }}>{label}</span>
              <strong style={{ fontSize: 14, overflowWrap: 'anywhere' }}>{value}</strong>
            </div>
          ))}
        </div>

        <p style={{ margin: '24px 0 0', color: '#667068', fontSize: 13, lineHeight: 1.65 }}>
          Esta página es informativa y refleja el último estado registrado en nuestros sistemas. La confirmación de cualquier pago depende de la validación recibida del proveedor de pagos.
        </p>

        {supportEmail && (
          <p style={{ margin: '12px 0 0', color: '#667068', fontSize: 13, lineHeight: 1.65 }}>
            Soporte de matrícula: <a href={`mailto:${supportEmail}`} style={{ color: '#236b3a', fontWeight: 700 }}>{supportEmail}</a>
          </p>
        )}
      </div>
    </>
  );
}
