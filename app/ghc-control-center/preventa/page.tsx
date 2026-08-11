'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import GHCLogo from '../../components/GHCLogo';

type PaymentRow = {
  installment_no: number;
  status: string;
  expected_amount_cents: number;
  paid_amount_cents: number;
  refunded_amount_cents: number;
  due_at: string | null;
  paid_at: string | null;
};

type OrderRow = {
  order_reference: string;
  first_name: string;
  last_name: string;
  email: string;
  payment_plan: 'single' | 'split';
  total_amount_cents: number;
  first_installment_cents: number;
  second_installment_cents: number;
  status: string;
  founder_status: string;
  founder_place_number: number | null;
  second_due_at: string | null;
  created_at: string;
  paid_at: string | null;
  cancelled_at: string | null;
  preventa_payments?: PaymentRow[];
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

function money(cents: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(cents || 0) / 100);
}

function date(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Madrid',
  }).format(new Date(value));
}

const REFUNDABLE = new Set(['partial', 'paid', 'overdue']);

export default function PreventaAdminPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyReference, setBusyReference] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const authHeaders = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token || '';
    if (!token) {
      router.replace('/acceso');
      throw new Error('NO_SESSION');
    }
    return { Authorization: `Bearer ${token}` };
  }, [router]);

  const load = useCallback(async () => {
    const headers = await authHeaders();
    const response = await fetch('/api/preventa/admin/orders', {
      headers,
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      router.replace('/acceso');
      return;
    }
    if (response.status === 403) throw new Error('Tu usuario no tiene permisos administrativos de preventa.');
    if (!response.ok || !data.ok) throw new Error('No se pudieron cargar las matrículas de preventa.');

    setOrders(Array.isArray(data.orders) ? data.orders : []);
  }, [authHeaders, router]);

  useEffect(() => {
    load()
      .catch((cause) => cause?.message !== 'NO_SESSION' && setError(cause?.message || 'No se pudo abrir Preventa.'))
      .finally(() => setLoading(false));
  }, [load]);

  const stats = useMemo(() => ({
    paid: orders.filter((order) => order.status === 'paid').length,
    partial: orders.filter((order) => order.status === 'partial').length,
    overdue: orders.filter((order) => order.status === 'overdue').length,
    refunded: orders.filter((order) => order.status === 'refunded').length,
  }), [orders]);

  const refund = async (order: OrderRow) => {
    const confirmation = window.prompt(
      `Esta acción solicita el reembolso completo en SumUp y libera la plaza.\n\nEscribe exactamente ${order.order_reference} para confirmar:`
    );
    if (confirmation === null) return;
    if (confirmation.trim() !== order.order_reference) {
      setError('La referencia escrita no coincide. No se ha ejecutado ningún reembolso.');
      return;
    }

    setBusyReference(order.order_reference);
    setError('');
    setMessage('');

    try {
      const headers = await authHeaders();
      const response = await fetch('/api/preventa/admin/refund', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderReference: order.order_reference,
          confirmation: order.order_reference,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.ok) {
        throw new Error(data.error || `No se pudo reembolsar ${order.order_reference}.`);
      }

      setMessage(`${order.order_reference} reembolsada. SumUp y Supabase quedaron sincronizados.`);
      await load();
    } catch (cause: any) {
      setError(cause?.message || 'No se pudo completar el reembolso.');
    } finally {
      setBusyReference('');
    }
  };

  return (
    <main style={{ minHeight: '100vh', background: '#050706', color: '#f2f4f1', padding: '28px' }}>
      <div style={{ width: 'min(1380px, 100%)', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'center', flexWrap: 'wrap', marginBottom: 28 }}>
          <GHCLogo size="md" showText tagline />
          <nav style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/ghc-control-center" style={{ color: '#f2f4f1', textDecoration: 'none' }}>Control Center</Link>
            <Link href="/ghc-control-center/accesos" style={{ color: '#22d65b', textDecoration: 'none' }}>Accesos</Link>
          </nav>
        </header>

        <section style={{ border: '1px solid rgba(34,214,91,.32)', borderRadius: 22, padding: 24, background: 'rgba(255,255,255,.025)', marginBottom: 18 }}>
          <p style={{ color: '#22d65b', fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase', fontSize: 12, margin: 0 }}>Preventa 2026</p>
          <h1 style={{ margin: '10px 0', fontSize: 'clamp(34px,5vw,62px)' }}>Matrículas y reembolsos</h1>
          <p style={{ color: 'rgba(242,244,241,.68)', maxWidth: 850, lineHeight: 1.7 }}>
            Vista administrativa de las matrículas fundadoras. Los reembolsos se solicitan primero a SumUp y solo después se reflejan en Supabase, liberan la plaza y generan el email transaccional correspondiente.
          </p>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 10, marginBottom: 18 }}>
          {[
            ['Pagadas', stats.paid],
            ['Fraccionadas activas', stats.partial],
            ['Vencidas', stats.overdue],
            ['Reembolsadas', stats.refunded],
          ].map(([label, value]) => (
            <div key={String(label)} style={{ border: '1px solid rgba(255,255,255,.1)', borderRadius: 16, padding: 18, background: 'rgba(255,255,255,.025)' }}>
              <span style={{ color: 'rgba(242,244,241,.55)', fontSize: 12 }}>{label}</span>
              <strong style={{ display: 'block', fontSize: 30, marginTop: 6 }}>{value}</strong>
            </div>
          ))}
        </section>

        {message && <div style={{ padding: 14, borderRadius: 12, background: 'rgba(34,214,91,.10)', border: '1px solid rgba(34,214,91,.3)', marginBottom: 14 }}>{message}</div>}
        {error && <div role="alert" style={{ padding: 14, borderRadius: 12, background: 'rgba(255,93,93,.10)', border: '1px solid rgba(255,93,93,.3)', marginBottom: 14 }}>{error}</div>}

        {loading ? (
          <p>Cargando matrículas…</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {orders.map((order) => {
              const payments = Array.isArray(order.preventa_payments) ? [...order.preventa_payments].sort((a, b) => a.installment_no - b.installment_no) : [];
              return (
                <article key={order.order_reference} style={{ border: '1px solid rgba(255,255,255,.1)', borderRadius: 18, padding: 20, background: 'rgba(255,255,255,.025)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                    <div>
                      <strong style={{ fontSize: 19 }}>{order.order_reference}</strong>
                      <div style={{ marginTop: 5, color: 'rgba(242,244,241,.7)' }}>{order.first_name} {order.last_name} · {order.email}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong>{money(order.total_amount_cents)}</strong>
                      <div style={{ color: '#22d65b', marginTop: 5 }}>{order.status} · {order.founder_status}{order.founder_place_number ? ` · plaza ${order.founder_place_number}` : ''}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10, marginTop: 16 }}>
                    <div><span style={{ color: 'rgba(242,244,241,.5)' }}>Modalidad</span><strong style={{ display: 'block', marginTop: 4 }}>{order.payment_plan === 'split' ? '895 € + 895 €' : 'Pago único'}</strong></div>
                    <div><span style={{ color: 'rgba(242,244,241,.5)' }}>Creada</span><strong style={{ display: 'block', marginTop: 4 }}>{date(order.created_at)}</strong></div>
                    <div><span style={{ color: 'rgba(242,244,241,.5)' }}>2.º vencimiento</span><strong style={{ display: 'block', marginTop: 4 }}>{date(order.second_due_at)}</strong></div>
                  </div>

                  {payments.length > 0 && (
                    <div style={{ display: 'grid', gap: 7, marginTop: 15 }}>
                      {payments.map((payment) => (
                        <div key={payment.installment_no} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '9px 11px', borderRadius: 10, background: 'rgba(255,255,255,.035)' }}>
                          <span>Cuota {payment.installment_no} · {payment.status}</span>
                          <strong>{money(payment.paid_amount_cents)} pagado · {money(payment.refunded_amount_cents)} reembolsado</strong>
                        </div>
                      ))}
                    </div>
                  )}

                  {REFUNDABLE.has(order.status) && (
                    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        disabled={Boolean(busyReference)}
                        onClick={() => refund(order)}
                        style={{ minHeight: 44, padding: '0 16px', borderRadius: 10, border: '1px solid rgba(255,93,93,.45)', background: 'rgba(255,93,93,.08)', color: '#fff', cursor: busyReference ? 'wait' : 'pointer', fontWeight: 800 }}
                      >
                        {busyReference === order.order_reference ? 'Procesando reembolso…' : 'Reembolso completo'}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
            {!orders.length && <p>No hay matrículas de preventa.</p>}
          </div>
        )}
      </div>
    </main>
  );
}
