import { NextRequest, NextResponse } from 'next/server';
import { parseSumUpWebhookPayload, SumUpAdapterError, verifySumUpCheckoutForPreventa } from '../../../../lib/preventa/sumup-adapter';
import { getConfiguredSumUpMerchantCode, getSumUpIntegrationStatus, retrieveSumUpCheckout } from '../../../../lib/preventa/sumup-client';
import { confirmPreventaPayment, getPaymentPersistenceStatus } from '../../../../lib/preventa/payment-persistence';

export const dynamic = 'force-dynamic';

export async function GET() {
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
  });
}

export async function POST(request: NextRequest) {
  const sumup = getSumUpIntegrationStatus();
  const persistence = getPaymentPersistenceStatus();

  if (!sumup.webhookEnabled) {
    return NextResponse.json(
      { ok: false, code: 'SUMUP_WEBHOOK_GATE_CLOSED', error: 'Webhook SumUp desactivado por Gate técnico.' },
      { status: 503 }
    );
  }

  if (!sumup.apiConfigured || !sumup.merchantConfigured) {
    return NextResponse.json(
      { ok: false, code: 'SUMUP_NOT_CONFIGURED', error: 'Faltan credenciales privadas de SumUp.' },
      { status: 503 }
    );
  }

  if (!persistence.ready) {
    return NextResponse.json(
      { ok: false, code: 'PERSISTENCE_NOT_READY', error: 'Persistencia de preventa no habilitada.' },
      { status: 503 }
    );
  }

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return NextResponse.json({ ok: false, error: 'Content-Type debe ser application/json.' }, { status: 415 });
  }

  const body = await request.json().catch(() => null);

  try {
    const webhook = parseSumUpWebhookPayload(body);

    // El POST recibido es solo una notificación. La acreditación se hace consultando SumUp.
    const checkout = await retrieveSumUpCheckout(webhook.id);
    const verified = verifySumUpCheckoutForPreventa({
      webhookCheckoutId: webhook.id,
      checkout,
      expectedMerchantCode: getConfiguredSumUpMerchantCode(),
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

    return NextResponse.json({
      ok: true,
      verifiedAgainstSumUpApi: true,
      transition,
    });
  } catch (error) {
    if (error instanceof SumUpAdapterError) {
      const informational = error.code === 'CHECKOUT_NOT_PAID';
      return NextResponse.json(
        {
          ok: informational,
          applied: false,
          code: error.code,
          error: error.message,
        },
        { status: informational ? 200 : 400 }
      );
    }

    console.error('SumUp webhook processing error', error);
    return NextResponse.json(
      { ok: false, code: 'SUMUP_WEBHOOK_PROCESSING_FAILED', error: 'No se pudo verificar o aplicar el evento SumUp.' },
      { status: 500 }
    );
  }
}
