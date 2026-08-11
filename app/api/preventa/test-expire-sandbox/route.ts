import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import {
  attachPreventaCapacityCheckout,
  getPreventaCheckoutContext,
  registerPreventaCheckoutAttempt,
  releasePreventaCapacity,
  reservePreventaCapacity,
} from '../../../../lib/preventa/checkout-persistence';
import { createSumUpCheckoutReference } from '../../../../lib/preventa/sumup-adapter';
import { createHostedSumUpCheckout } from '../../../../lib/preventa/sumup-client';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const TEST_ORDER_REFERENCE = 'GHC-2435393F';
const FIRST_INSTALLMENT_HOLD_MINUTES = 45;

function getPublicBaseUrl() {
  const value = (process.env.PREVENTA_PUBLIC_BASE_URL || '').trim().replace(/\/$/, '');
  if (!/^https:\/\/[A-Za-z0-9.-]+(?::\d+)?$/.test(value)) return null;
  return value;
}

function getWebhookUrl(base: string) {
  const url = new URL('/api/preventa/sumup-webhook', base);
  const bypass = (process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '').trim();
  if (bypass) url.searchParams.set('x-vercel-protection-bypass', bypass);
  return url.toString();
}

export async function GET() {
  if (process.env.VERCEL_ENV !== 'preview') {
    return new NextResponse(null, { status: 404 });
  }

  const base = getPublicBaseUrl();
  const apiKey = (process.env.SUMUP_API_KEY || '').trim();
  if (!base || !apiKey) {
    return NextResponse.json({ ok: false, code: 'TEST_EXPIRE_CONFIG_MISSING' }, { status: 503 });
  }

  let checkoutReference = '';
  let capacityHeld = false;

  try {
    const context = await getPreventaCheckoutContext({
      orderReference: TEST_ORDER_REFERENCE,
      installmentNo: 1,
    });

    const attemptToken = randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();
    checkoutReference = createSumUpCheckoutReference(TEST_ORDER_REFERENCE, 1, attemptToken);
    const startedAt = new Date();
    const occurredAt = startedAt.toISOString();
    const heldUntil = new Date(
      startedAt.getTime() + FIRST_INSTALLMENT_HOLD_MINUTES * 60 * 1000
    ).toISOString();

    await reservePreventaCapacity({
      orderReference: TEST_ORDER_REFERENCE,
      checkoutReference,
      heldUntil,
      idempotencyKey: `capacity:${checkoutReference}`,
      occurredAt,
    });
    capacityHeld = true;

    const checkout = await createHostedSumUpCheckout({
      checkoutReference,
      amountCents: context.expectedAmountCents,
      currency: context.currency,
      description: 'GHC Academy · QA checkout EXPIRED',
      redirectUrl: `${base}/preventa/confirmacion?ref=${encodeURIComponent(TEST_ORDER_REFERENCE)}`,
      returnUrl: getWebhookUrl(base),
    });

    await attachPreventaCapacityCheckout({
      orderReference: TEST_ORDER_REFERENCE,
      checkoutReference,
      providerCheckoutId: checkout.id!,
      occurredAt: new Date().toISOString(),
    });

    await registerPreventaCheckoutAttempt({
      orderReference: TEST_ORDER_REFERENCE,
      installmentNo: 1,
      checkoutReference,
      providerCheckoutId: checkout.id!,
      hostedCheckoutUrl: checkout.hosted_checkout_url!,
      expectedAmountCents: context.expectedAmountCents,
      idempotencyKey: `checkout:${checkout.id}`,
      occurredAt: new Date().toISOString(),
    });

    const deactivate = await fetch(
      `https://api.sumup.com/v0.1/checkouts/${encodeURIComponent(checkout.id!)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      }
    );

    const deactivatedBody = await deactivate.json().catch(() => null) as
      | { status?: string; id?: string }
      | null;

    if (!deactivate.ok || deactivatedBody?.status !== 'EXPIRED') {
      throw new Error(`SUMUP_DEACTIVATE_NOT_EXPIRED:${deactivate.status}:${deactivatedBody?.status || 'unknown'}`);
    }

    const webhookResponse = await fetch(getWebhookUrl(base), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'CHECKOUT_STATUS_CHANGED',
        id: checkout.id,
      }),
      cache: 'no-store',
    });
    const webhookBody = await webhookResponse.json().catch(() => null);

    if (!webhookResponse.ok) {
      throw new Error(`TEST_EXPIRE_WEBHOOK_FAILED:${webhookResponse.status}`);
    }

    return NextResponse.json({
      ok: true,
      orderReference: TEST_ORDER_REFERENCE,
      providerCheckoutId: checkout.id,
      providerStatus: deactivatedBody.status,
      webhook: webhookBody,
    });
  } catch (error) {
    if (capacityHeld && checkoutReference) {
      try {
        await releasePreventaCapacity({
          orderReference: TEST_ORDER_REFERENCE,
          checkoutReference,
          reason: 'test_expire_failed_before_terminal_sync',
          occurredAt: new Date().toISOString(),
        });
      } catch (releaseError) {
        console.error('[preventa-test-expire-release]', releaseError);
      }
    }

    const message = error instanceof Error ? error.message : 'UNKNOWN_TEST_EXPIRE_ERROR';
    console.error('[preventa-test-expire-sandbox]', message);
    return NextResponse.json(
      { ok: false, code: 'TEST_EXPIRE_FAILED', detail: message.slice(0, 240) },
      { status: 500 }
    );
  }
}
