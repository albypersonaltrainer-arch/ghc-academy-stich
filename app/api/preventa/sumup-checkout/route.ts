import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getPreventaPersistenceStatus } from '../../../../lib/preventa/persistence';
import {
  attachPreventaCapacityCheckout,
  getPreventaCheckoutContext,
  PreventaCapacityError,
  registerPreventaCheckoutAttempt,
  releasePreventaCapacity,
  reservePreventaCapacity,
} from '../../../../lib/preventa/checkout-persistence';
import { createSumUpCheckoutReference } from '../../../../lib/preventa/sumup-adapter';
import {
  createHostedSumUpCheckout,
  getSumUpIntegrationStatus,
} from '../../../../lib/preventa/sumup-client';
import {
  CheckoutAccessTokenError,
  getCheckoutAccessTokenStatus,
  verifyCheckoutAccessToken,
} from '../../../../lib/preventa/checkout-access-token';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
};

// SumUp Hosted Checkout is nominally short-lived, but webhook delivery or the scheduled
// reconciliation job can be delayed. Keep founder capacity protected for three hours so
// a legitimate payment made within the provider session cannot lose its place before
// provider truth is reconciled. Failed/expired checkouts release the hold as soon as they
// are observed, so this is a safety ceiling rather than the normal reservation duration.
const FIRST_INSTALLMENT_HOLD_MINUTES = 180;

function getPublicBaseUrl() {
  const value = (process.env.PREVENTA_PUBLIC_BASE_URL || '').trim().replace(/\/$/, '');
  if (!/^https:\/\/[A-Za-z0-9.-]+(?::\d+)?$/.test(value)) return null;
  return value;
}

function getSumUpReturnUrl(publicBaseUrl: string) {
  const url = new URL('/api/preventa/sumup-webhook', publicBaseUrl);
  if (process.env.VERCEL_ENV === 'preview') {
    const bypassSecret = (process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '').trim();
    if (bypassSecret) url.searchParams.set('x-vercel-protection-bypass', bypassSecret);
  }
  return url.toString();
}

function parseBody(input: unknown) {
  if (!input || typeof input !== 'object') return null;
  const value = input as Record<string, unknown>;
  const orderReference = typeof value.orderReference === 'string' ? value.orderReference.trim() : '';
  const installmentNo = Number(value.installmentNo);
  const checkoutToken = typeof value.checkoutToken === 'string' ? value.checkoutToken.trim() : '';

  if (!/^GHC-[A-Z0-9]{8}$/.test(orderReference)) return null;
  if (installmentNo !== 1 && installmentNo !== 2) return null;
  if (!checkoutToken || checkoutToken.length > 768) return null;

  return { orderReference, installmentNo: installmentNo as 1 | 2, checkoutToken };
}

export async function GET() {
  if (process.env.VERCEL_ENV === 'production') {
    return NextResponse.json(
      { ok: false, code: 'NOT_FOUND' },
      { status: 404, headers: NO_STORE_HEADERS }
    );
  }

  const persistence = getPreventaPersistenceStatus();
  const sumup = getSumUpIntegrationStatus();
  const publicBaseUrl = getPublicBaseUrl();
  const token = getCheckoutAccessTokenStatus();

  return NextResponse.json({
    ok: true,
    route: 'preventa-sumup-checkout',
    persistenceReady: persistence.ready,
    sumupCheckoutEnabled: sumup.checkoutEnabled,
    sumupApiConfigured: sumup.apiConfigured,
    sumupMerchantConfigured: sumup.merchantConfigured,
    publicBaseUrlConfigured: Boolean(publicBaseUrl),
    checkoutTokenConfigured: token.configured,
    previewAutomationBypassConfigured:
      process.env.VERCEL_ENV !== 'preview' || Boolean(process.env.VERCEL_AUTOMATION_BYPASS_SECRET),
    checkoutReady:
      persistence.ready &&
      sumup.checkoutEnabled &&
      sumup.apiConfigured &&
      sumup.merchantConfigured &&
      Boolean(publicBaseUrl) &&
      token.configured,
  }, { headers: NO_STORE_HEADERS });
}

export async function POST(request: NextRequest) {
  const persistence = getPreventaPersistenceStatus();
  const sumup = getSumUpIntegrationStatus();
  const publicBaseUrl = getPublicBaseUrl();
  const token = getCheckoutAccessTokenStatus();

  if (!persistence.ready) {
    return NextResponse.json(
      { ok: false, code: 'PERSISTENCE_GATE_CLOSED', error: 'Persistencia de preventa no disponible.' },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  if (!sumup.checkoutEnabled) {
    return NextResponse.json(
      { ok: false, code: 'SUMUP_CHECKOUT_GATE_CLOSED', error: 'Hosted Checkout permanece desactivado.' },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  if (!sumup.apiConfigured || !sumup.merchantConfigured) {
    return NextResponse.json(
      { ok: false, code: 'SUMUP_NOT_CONFIGURED', error: 'Faltan credenciales privadas de SumUp.' },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  if (!publicBaseUrl) {
    return NextResponse.json(
      { ok: false, code: 'PUBLIC_BASE_URL_NOT_CONFIGURED', error: 'Falta la URL pública contractual de preventa.' },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  if (!token.configured) {
    return NextResponse.json(
      { ok: false, code: 'CHECKOUT_TOKEN_NOT_CONFIGURED', error: 'Falta la clave privada de acceso al checkout.' },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  if (process.env.VERCEL_ENV === 'preview' && !process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    return NextResponse.json(
      { ok: false, code: 'VERCEL_AUTOMATION_BYPASS_NOT_CONFIGURED', error: 'Falta el bypass de automatización para el callback de SumUp.' },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return NextResponse.json(
      { ok: false, error: 'Content-Type debe ser application/json.' },
      { status: 415, headers: NO_STORE_HEADERS }
    );
  }

  const body = parseBody(await request.json().catch(() => null));
  if (!body) {
    return NextResponse.json(
      { ok: false, code: 'INVALID_CHECKOUT_REQUEST', error: 'Solicitud de checkout no válida.' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  let checkoutReference: string | null = null;
  let capacityHeld = false;

  try {
    verifyCheckoutAccessToken({
      token: body.checkoutToken,
      orderReference: body.orderReference,
      installmentNo: body.installmentNo,
    });

    const context = await getPreventaCheckoutContext(body);
    const attemptToken = randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();
    checkoutReference = createSumUpCheckoutReference(
      context.orderReference,
      context.installmentNo,
      attemptToken
    );

    const startedAt = new Date();
    const occurredAt = startedAt.toISOString();

    if (context.installmentNo === 1) {
      const heldUntil = new Date(
        startedAt.getTime() + FIRST_INSTALLMENT_HOLD_MINUTES * 60 * 1000
      ).toISOString();

      await reservePreventaCapacity({
        orderReference: context.orderReference,
        checkoutReference,
        heldUntil,
        idempotencyKey: `capacity:${checkoutReference}`,
        occurredAt,
      });
      capacityHeld = true;
    }

    const description = context.installmentNo === 1
      ? `GHC Academy · Edición Fundadora · ${context.paymentPlan === 'single' ? 'Pago único' : 'Primera cuota'}`
      : 'GHC Academy · Edición Fundadora · Segunda cuota';

    const checkout = await createHostedSumUpCheckout({
      checkoutReference,
      amountCents: context.expectedAmountCents,
      currency: context.currency,
      description,
      redirectUrl: `${publicBaseUrl}/preventa/confirmacion?ref=${encodeURIComponent(context.orderReference)}`,
      returnUrl: getSumUpReturnUrl(publicBaseUrl),
    });

    const registeredAt = new Date().toISOString();

    if (context.installmentNo === 1) {
      await attachPreventaCapacityCheckout({
        orderReference: context.orderReference,
        checkoutReference,
        providerCheckoutId: checkout.id!,
        occurredAt: registeredAt,
      });
    }

    const persistenceResult = await registerPreventaCheckoutAttempt({
      orderReference: context.orderReference,
      installmentNo: context.installmentNo,
      checkoutReference,
      providerCheckoutId: checkout.id!,
      hostedCheckoutUrl: checkout.hosted_checkout_url!,
      expectedAmountCents: context.expectedAmountCents,
      idempotencyKey: `checkout:${checkout.id}`,
      occurredAt: registeredAt,
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
      capacityProtected: context.installmentNo === 1,
      persistence: persistenceResult,
    }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    if (capacityHeld && checkoutReference && /^GHC-[A-Z0-9]{8}$/.test(body.orderReference)) {
      try {
        await releasePreventaCapacity({
          orderReference: body.orderReference,
          checkoutReference,
          reason: 'checkout_creation_or_registration_failed',
          occurredAt: new Date().toISOString(),
        });
      } catch (releaseError) {
        console.error('Preventa capacity release error', releaseError);
      }
    }

    if (error instanceof CheckoutAccessTokenError) {
      return NextResponse.json(
        { ok: false, code: error.code, error: 'Acceso al checkout no autorizado o caducado.' },
        { status: 403, headers: NO_STORE_HEADERS }
      );
    }

    if (error instanceof PreventaCapacityError && error.code === 'FOUNDER_PLACES_FULL') {
      return NextResponse.json(
        {
          ok: false,
          code: 'FOUNDER_PLACES_FULL',
          error: 'Las 100 plazas de la Edición Fundadora están ocupadas en este momento. No se ha realizado ningún cobro.',
        },
        { status: 409, headers: NO_STORE_HEADERS }
      );
    }

    console.error('SumUp Hosted Checkout creation error', error);

    return NextResponse.json(
      {
        ok: false,
        code: 'SUMUP_CHECKOUT_CREATION_FAILED',
        error: 'No se pudo preparar el pago. No se ha acreditado ningún cobro.',
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
