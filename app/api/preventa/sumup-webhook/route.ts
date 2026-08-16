import { NextRequest, NextResponse } from 'next/server';
import {
  parseSumUpWebhookPayload,
  SumUpAdapterError,
  verifySumUpCheckoutForPreventa,
  verifySumUpCheckoutStateForPreventa,
} from '../../../../lib/preventa/sumup-adapter';
import {
  getConfiguredSumUpMerchantCode,
  getSumUpIntegrationStatus,
  retrieveSumUpCheckout,
} from '../../../../lib/preventa/sumup-client';
import {
  confirmPreventaPayment,
  getPaymentPersistenceStatus,
  markPreventaCheckoutTerminal,
} from '../../../../lib/preventa/payment-persistence';
import { isPreventaProviderCheckoutRegistered } from '../../../../lib/preventa/checkout-persistence';
import {
  getPreventaEmailWorkerStatus,
  runPreventaEmailWorker,
} from '../../../../lib/preventa/email-worker';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
};

async function flushTransactionalEmailBestEffort() {
  const worker = getPreventaEmailWorkerStatus();
  if (!worker.ready) return;

  try {
    const result = await runPreventaEmailWorker(10);
    console.info('[preventa-email-after-webhook]', {
      claimed: result.claimed,
      sent: result.sent,
      retryOrFailed: result.retryOrFailed,
    });
  } catch {
    console.error('[preventa-email-after-webhook] WORKER_FAILED');
  }
}

export async function GET() {
  if (process.env.VERCEL_ENV === 'production') {
    return NextResponse.json(
      { ok: false, code: 'NOT_FOUND' },
      { status: 404, headers: NO_STORE_HEADERS }
    );
  }

  const sumup = getSumUpIntegrationStatus();
  const persistence = getPaymentPersistenceStatus();
  const webhookReady =
    sumup.webhookEnabled &&
    sumup.apiConfigured &&
    sumup.merchantConfigured &&
    persistence.ready;

  return NextResponse.json({
    ok: true,
    route: 'sumup-webhook',
    sumupWebhookEnabled: sumup.webhookEnabled,
    sumupApiConfigured: sumup.apiConfigured,
    sumupMerchantConfigured: sumup.merchantConfigured,
    persistenceReady: persistence.ready,
    writeReady: webhookReady,
  }, { headers: NO_STORE_HEADERS });
}

export async function POST(request: NextRequest) {
  const sumup = getSumUpIntegrationStatus();
  const persistence = getPaymentPersistenceStatus();

  if (!sumup.webhookEnabled) {
    return NextResponse.json(
      { ok: false, code: 'SUMUP_WEBHOOK_GATE_CLOSED', error: 'Webhook SumUp desactivado por Gate técnico.' },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  if (!sumup.apiConfigured || !sumup.merchantConfigured) {
    return NextResponse.json(
      { ok: false, code: 'SUMUP_NOT_CONFIGURED', error: 'Faltan credenciales privadas de SumUp.' },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  if (!persistence.ready) {
    return NextResponse.json(
      { ok: false, code: 'PERSISTENCE_NOT_READY', error: 'Persistencia de preventa no habilitada.' },
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

  const body = await request.json().catch(() => null);

  try {
    const webhook = parseSumUpWebhookPayload(body);

    // A buyer cannot pay before the checkout route has registered the provider ID:
    // the hosted URL is returned only after registration succeeds. Rejecting unknown
    // IDs here prevents arbitrary callers from spending our authenticated SumUp API
    // quota as an oracle with provider checkout IDs unrelated to GHC.
    const registered = await isPreventaProviderCheckoutRegistered(webhook.id);
    if (!registered) {
      return NextResponse.json(
        { ok: true, applied: false },
        { status: 200, headers: NO_STORE_HEADERS }
      );
    }

    // The notification never accredits money by itself: status is re-fetched from SumUp.
    const checkout = await retrieveSumUpCheckout(webhook.id);
    const expectedMerchantCode = getConfiguredSumUpMerchantCode();
    const state = verifySumUpCheckoutStateForPreventa({
      webhookCheckoutId: webhook.id,
      checkout,
      expectedMerchantCode,
    });

    if (state.status === 'PENDING') {
      return NextResponse.json({
        ok: true,
        applied: false,
        verifiedAgainstSumUpApi: true,
        checkoutStatus: 'PENDING',
      }, { headers: NO_STORE_HEADERS });
    }

    if (state.status === 'FAILED' || state.status === 'EXPIRED') {
      const terminalStatus = state.status.toLowerCase() as 'failed' | 'expired';
      const transition = await markPreventaCheckoutTerminal({
        orderReference: state.orderReference,
        installmentNo: state.installmentNo,
        providerCheckoutId: state.checkoutId,
        terminalStatus,
        idempotencyKey: `sumup:${state.checkoutId}:${terminalStatus}`,
        occurredAt: state.occurredAt,
        providerMetadata: state.providerMetadata,
      });

      await flushTransactionalEmailBestEffort();

      return NextResponse.json({
        ok: true,
        applied: true,
        verifiedAgainstSumUpApi: true,
        checkoutStatus: state.status,
        transition,
      }, { headers: NO_STORE_HEADERS });
    }

    const verified = verifySumUpCheckoutForPreventa({
      webhookCheckoutId: webhook.id,
      checkout,
      expectedMerchantCode,
    });

    const transition = await confirmPreventaPayment({
      orderReference: verified.orderReference,
      installmentNo: verified.installmentNo,
      amountCents: verified.amountCents,
      providerPaymentId: verified.providerPaymentId,
      idempotencyKey: `sumup:${verified.checkoutId}:${verified.providerPaymentId}:paid`,
      occurredAt: verified.occurredAt,
      providerMetadata: verified.providerMetadata,
    });

    await flushTransactionalEmailBestEffort();

    return NextResponse.json({
      ok: true,
      applied: true,
      verifiedAgainstSumUpApi: true,
      checkoutStatus: 'PAID',
      transition,
    }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof SumUpAdapterError) {
      return NextResponse.json(
        {
          ok: false,
          applied: false,
          code: error.code,
          error: 'Evento SumUp no válido o no verificable.',
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    console.error('[preventa-sumup-webhook] PROCESSING_FAILED');
    return NextResponse.json(
      { ok: false, code: 'SUMUP_WEBHOOK_PROCESSING_FAILED', error: 'No se pudo verificar o aplicar el evento SumUp.' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
