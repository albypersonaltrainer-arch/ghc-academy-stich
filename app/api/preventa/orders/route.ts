import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { PreviewOrderInput } from '../../../../lib/preventa/validation';
import { validatePreviewOrderInput } from '../../../../lib/preventa/validation';
import {
  getPreventaPersistenceStatus,
  persistPreventaDraft,
} from '../../../../lib/preventa/persistence';
import {
  getCheckoutAccessTokenStatus,
  issueCheckoutAccessToken,
} from '../../../../lib/preventa/checkout-access-token';
import {
  FOUNDER_PREVENTA_CLOSE_LABEL,
  isFounderPresaleClosed,
} from '../../../../lib/preventa/founder-offer';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
};

function cleanRequestKey(value: string | null) {
  const key = (value || '').trim();
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(key)) return null;
  return key;
}

export async function GET() {
  if (process.env.VERCEL_ENV === 'production') {
    return NextResponse.json(
      { ok: false, code: 'NOT_FOUND' },
      { status: 404, headers: NO_STORE_HEADERS }
    );
  }

  const persistence = getPreventaPersistenceStatus();
  const checkoutToken = getCheckoutAccessTokenStatus();

  return NextResponse.json({
    ok: true,
    route: 'preventa-orders',
    persistenceEnabled: persistence.enabled,
    persistenceConfigured: persistence.configured,
    checkoutTokenConfigured: checkoutToken.configured,
    writeReady: persistence.ready && checkoutToken.configured,
    paymentsEnabled: false,
  }, { headers: NO_STORE_HEADERS });
}

export async function POST(request: NextRequest) {
  const persistence = getPreventaPersistenceStatus();
  const checkoutToken = getCheckoutAccessTokenStatus();

  if (!persistence.enabled) {
    return NextResponse.json(
      {
        ok: false,
        code: 'PERSISTENCE_GATE_CLOSED',
        error: 'La persistencia de preventa permanece desactivada por Gate técnico.',
      },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  if (!persistence.configured) {
    return NextResponse.json(
      {
        ok: false,
        code: 'PERSISTENCE_NOT_CONFIGURED',
        error: 'La persistencia está habilitada pero faltan variables privadas de servidor.',
      },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  if (!checkoutToken.configured) {
    return NextResponse.json(
      {
        ok: false,
        code: 'CHECKOUT_TOKEN_NOT_CONFIGURED',
        error: 'Falta la clave privada para emitir accesos seguros al checkout.',
      },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  if (process.env.VERCEL_ENV === 'production' && isFounderPresaleClosed()) {
    return NextResponse.json(
      {
        ok: false,
        code: 'FOUNDER_PRESALE_CLOSED',
        error: `La Edición Fundadora cerró el ${FOUNDER_PREVENTA_CLOSE_LABEL}. Ya no se admiten nuevas matrículas de preventa.`,
      },
      { status: 410, headers: NO_STORE_HEADERS }
    );
  }

  const requestKey = cleanRequestKey(request.headers.get('idempotency-key'));
  if (!requestKey) {
    return NextResponse.json(
      {
        ok: false,
        code: 'INVALID_IDEMPOTENCY_KEY',
        error: 'Idempotency-Key es obligatorio y debe tener entre 16 y 128 caracteres seguros.',
      },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return NextResponse.json(
      { ok: false, error: 'Content-Type debe ser application/json.' },
      { status: 415, headers: NO_STORE_HEADERS }
    );
  }

  const body = (await request.json().catch(() => null)) as PreviewOrderInput | null;
  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { ok: false, error: 'Solicitud JSON no válida.' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const validated = validatePreviewOrderInput(body);
  if (!validated.ok) {
    return NextResponse.json(
      { ok: false, errors: validated.errors },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const orderReference = `GHC-${randomUUID().slice(0, 8).toUpperCase()}`;

  try {
    const persisted = await persistPreventaDraft(body, requestKey, orderReference);
    const checkoutAccessToken = issueCheckoutAccessToken({
      orderReference: persisted.orderReference,
      installmentNo: 1,
    });

    return NextResponse.json({
      ok: true,
      persisted: true,
      paymentCreated: false,
      founderPlaceReserved: false,
      idempotentReplay: persisted.idempotentReplay,
      order: {
        reference: persisted.orderReference,
        status: 'draft',
        founderStatus: 'pending',
        paymentPlan: validated.data.paymentPlan,
        totalAmountCents: validated.data.totalAmountCents,
        firstInstallmentCents: validated.data.firstInstallmentCents,
        secondInstallmentCents: validated.data.secondInstallmentCents,
        secondDueAt: null,
      },
      checkout: {
        installmentNo: 1,
        accessToken: checkoutAccessToken,
      },
      next: {
        requiresSumUpCheckout: true,
        requiresFinalPaymentGate: true,
      },
    }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Preventa persistence error', error);

    return NextResponse.json(
      {
        ok: false,
        code: 'PERSISTENCE_FAILED',
        error: 'No se pudo crear el borrador de matrícula.',
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
