import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getPreventaPersistenceStatus } from '../../../../lib/preventa/persistence';
import {
  getPreventaCheckoutContext,
  registerPreventaCheckoutAttempt,
} from '../../../../lib/preventa/checkout-persistence';
import {
  createSumUpCheckoutReference,
} from '../../../../lib/preventa/sumup-adapter';
import {
  createHostedSumUpCheckout,
  getSumUpIntegrationStatus,
} from '../../../../lib/preventa/sumup-client';

export const dynamic = 'force-dynamic';

function getPublicBaseUrl() {
  const value = (process.env.PREVENTA_PUBLIC_BASE_URL || '').trim().replace(/\/$/, '');
  if (!/^https:\/\/[A-Za-z0-9.-]+(?::\d+)?$/.test(value)) return null;
  return value;
}

function parseBody(input: unknown) {
  if (!input || typeof input !== 'object') return null;
  const value = input as Record<string, unknown>;
  const orderReference = typeof value.orderReference === 'string' ? value.orderReference.trim() : '';
  const installmentNo = Number(value.installmentNo);

  if (!/^GHC-[A-Z0-9]{8}$/.test(orderReference)) return null;
  if (installmentNo !== 1 && installmentNo !== 2) return null;

  return { orderReference, installmentNo: installmentNo as 1 | 2 };
}

export async function GET() {
  const persistence = getPreventaPersistenceStatus();
  const sumup = getSumUpIntegrationStatus();
  const publicBaseUrl = getPublicBaseUrl();

  return NextResponse.json({
    ok: true,
    route: 'preventa-sumup-checkout',
    persistenceReady: persistence.ready,
    sumupCheckoutEnabled: sumup.checkoutEnabled,
    sumupApiConfigured: sumup.apiConfigured,
    sumupMerchantConfigured: sumup.merchantConfigured,
    publicBaseUrlConfigured: Boolean(publicBaseUrl),
    checkoutReady:
      persistence.ready &&
      sumup.checkoutEnabled &&
      sumup.apiConfigured &&
      sumup.merchantConfigured &&
      Boolean(publicBaseUrl),
  });
}

export async function POST(request: NextRequest) {
  const persistence = getPreventaPersistenceStatus();
  const sumup = getSumUpIntegrationStatus();
  const publicBaseUrl = getPublicBaseUrl();

  if (!persistence.ready) {
    return NextResponse.json(
      { ok: false, code: 'PERSISTENCE_GATE_CLOSED', error: 'Persistencia de preventa no disponible.' },
      { status: 503 }
    );
  }

  if (!sumup.checkoutEnabled) {
    return NextResponse.json(
      { ok: false, code: 'SUMUP_CHECKOUT_GATE_CLOSED', error: 'Hosted Checkout permanece desactivado.' },
      { status: 503 }
    );
  }

  if (!sumup.apiConfigured || !sumup.merchantConfigured) {
    return NextResponse.json(
      { ok: false, code: 'SUMUP_NOT_CONFIGURED', error: 'Faltan credenciales privadas de SumUp.' },
      { status: 503 }
    );
  }

  if (!publicBaseUrl) {
    return NextResponse.json(
      { ok: false, code: 'PUBLIC_BASE_URL_NOT_CONFIGURED', error: 'Falta la URL pública contractual de preventa.' },
      { status: 503 }
    );
  }

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return NextResponse.json({ ok: false, error: 'Content-Type debe ser application/json.' }, { status: 415 });
  }

  const body = parseBody(await request.json().catch(() => null));
  if (!body) {
    return NextResponse.json(
      { ok: false, code: 'INVALID_CHECKOUT_REQUEST', error: 'Solicitud de checkout no válida.' },
      { status: 400 }
    );
  }

  try {
    const context = await getPreventaCheckoutContext(body);
    const attemptToken = randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();
    const checkoutReference = createSumUpCheckoutReference(
      context.orderReference,
      context.installmentNo,
      attemptToken
    );

    const description = context.installmentNo === 1
      ? `GHC Academy · Edición Fundadora · ${context.paymentPlan === 'single' ? 'Pago único' : 'Primera cuota'}`
      : 'GHC Academy · Edición Fundadora · Segunda cuota';

    const checkout = await createHostedSumUpCheckout({
      checkoutReference,
      amountCents: context.expectedAmountCents,
      currency: context.currency,
      description,
      redirectUrl: `${publicBaseUrl}/preventa/confirmacion?ref=${encodeURIComponent(context.orderReference)}`,
    });

    const occurredAt = new Date().toISOString();
    const persistenceResult = await registerPreventaCheckoutAttempt({
      orderReference: context.orderReference,
      installmentNo: context.installmentNo,
      checkoutReference,
      providerCheckoutId: checkout.id!,
      hostedCheckoutUrl: checkout.hosted_checkout_url!,
      expectedAmountCents: context.expectedAmountCents,
      idempotencyKey: `checkout:${checkout.id}`,
      occurredAt,
    });

    return NextResponse.json({
      ok: true,
      provider: 'sumup',
      orderReference: context.orderReference,
      installmentNo: context.installmentNo,
      amountCents: context.expectedAmountCents,
      currency: context.currency,
      checkoutReference,
      checkoutId: checkout.id,
      hostedCheckoutUrl: checkout.hosted_checkout_url,
      persistence: persistenceResult,
    });
  } catch (error) {
    console.error('SumUp Hosted Checkout creation error', error);

    return NextResponse.json(
      {
        ok: false,
        code: 'SUMUP_CHECKOUT_CREATION_FAILED',
        error: 'No se pudo preparar el pago. No se ha acreditado ningún cobro.',
      },
      { status: 500 }
    );
  }
}
