import { NextResponse } from 'next/server';
import { preventaAdminAuthHttpStatus, requirePreventaAdmin } from '../../../../../lib/preventa/admin-auth';
import { refundPreventaOrderViaSumUp } from '../../../../../lib/preventa/refund-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function parseBody(input: unknown) {
  if (!input || typeof input !== 'object') return null;
  const value = input as Record<string, unknown>;
  const orderReference = typeof value.orderReference === 'string' ? value.orderReference.trim() : '';
  const confirmation = typeof value.confirmation === 'string' ? value.confirmation.trim() : '';

  if (!/^GHC-[A-Z0-9]{8}$/.test(orderReference)) return null;
  if (confirmation !== orderReference) return null;
  return { orderReference };
}

export async function POST(request: Request) {
  try {
    const { identity, serviceClient } = await requirePreventaAdmin(request);

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ ok: false, code: 'INVALID_CONTENT_TYPE' }, { status: 415 });
    }

    const body = parseBody(await request.json().catch(() => null));
    if (!body) {
      return NextResponse.json(
        { ok: false, code: 'INVALID_REFUND_CONFIRMATION', error: 'La referencia de confirmación debe coincidir exactamente.' },
        { status: 400 }
      );
    }

    const { data: order, error: orderError } = await serviceClient
      .from('preventa_orders')
      .select('id,status')
      .eq('order_reference', body.orderReference)
      .maybeSingle();

    if (orderError) throw new Error(`PREVENTA_ADMIN_REFUND_LOOKUP_FAILED:${orderError.message}`);
    if (!order) return NextResponse.json({ ok: false, code: 'ORDER_NOT_FOUND' }, { status: 404 });
    if (!['partial', 'paid', 'overdue'].includes(String(order.status))) {
      return NextResponse.json(
        { ok: false, code: 'ORDER_NOT_REFUNDABLE', status: order.status },
        { status: 409 }
      );
    }

    const result = await refundPreventaOrderViaSumUp(body.orderReference);

    let auditPersisted = true;
    const { error: auditError } = await serviceClient.from('preventa_events').insert({
      order_id: order.id,
      event_type: 'admin.refund.executed',
      idempotency_key: `admin:refund:${result.providerRefundReference}`,
      payload: {
        actor_user_id: identity.userId,
        actor_role: identity.role,
        provider_refund_reference: result.providerRefundReference,
        provider_transactions: result.providerResults.length,
      },
      occurred_at: new Date().toISOString(),
    });

    if (auditError) {
      auditPersisted = false;
      console.error('[preventa-admin-refund-audit]', auditError.message);
    }

    return NextResponse.json({
      ok: true,
      orderReference: result.orderReference,
      status: 'refunded',
      providerTransactions: result.providerResults.length,
      auditPersisted,
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    const authStatus = preventaAdminAuthHttpStatus(error);
    const message = error instanceof Error ? error.message : 'UNKNOWN_ADMIN_REFUND_ERROR';

    if (authStatus === 401 || authStatus === 403) {
      return NextResponse.json(
        { ok: false, code: authStatus === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN' },
        { status: authStatus }
      );
    }

    console.error('[preventa-admin-refund]', message);
    return NextResponse.json(
      { ok: false, code: 'REFUND_FAILED', error: 'No se pudo completar el reembolso. Comprueba el estado antes de reintentarlo.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
