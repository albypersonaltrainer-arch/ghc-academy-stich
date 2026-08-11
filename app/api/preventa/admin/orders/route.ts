import { NextResponse } from 'next/server';
import { preventaAdminAuthHttpStatus, requirePreventaAdmin } from '../../../../../lib/preventa/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { identity, serviceClient } = await requirePreventaAdmin(request);

    const { data, error } = await serviceClient
      .from('preventa_orders')
      .select(`
        order_reference,
        first_name,
        last_name,
        email,
        payment_plan,
        total_amount_cents,
        first_installment_cents,
        second_installment_cents,
        status,
        founder_status,
        founder_place_number,
        second_due_at,
        created_at,
        paid_at,
        cancelled_at,
        preventa_payments (
          installment_no,
          status,
          expected_amount_cents,
          paid_amount_cents,
          refunded_amount_cents,
          due_at,
          paid_at
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw new Error(`PREVENTA_ADMIN_ORDERS_FAILED:${error.message}`);

    return NextResponse.json({
      ok: true,
      admin: { role: identity.role },
      orders: data || [],
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    const status = preventaAdminAuthHttpStatus(error);
    const message = error instanceof Error ? error.message : 'UNKNOWN_ADMIN_ORDERS_ERROR';
    if (status >= 500) console.error('[preventa-admin-orders]', message);
    return NextResponse.json(
      { ok: false, code: status === 401 ? 'UNAUTHENTICATED' : status === 403 ? 'FORBIDDEN' : 'ADMIN_ORDERS_FAILED' },
      { status, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
