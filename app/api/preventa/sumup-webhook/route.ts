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

    // La notificación nunca acredita estado por sí sola: siempre se reconsulta SumUp.
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
      });
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

      return NextResponse.json({
        ok: true,
        applied: true,
        verifiedAgainstSumUpApi: true,
        checkoutStatus: state.status,
        transition,
      });
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

    return NextResponse.json({
      ok: true,
      applied: true,
      verifiedAgainstSumUpApi: true,
      checkoutStatus: 'PAID',
      transition,
    });
  } catch (error) {
    if (error instanceof SumUpAdapterError) {
      return NextResponse.json(
        {
          ok: false,
          applied: false,
          code: error.code,
          error: error.message,
        },
        { status: 400 }
      );
    }

    console.error('SumUp webhook processing error', error);
    return NextResponse.json(
      { ok: false, code: 'SUMUP_WEBHOOK_PROCESSING_FAILED', error: 'No se pudo verificar o aplicar el evento SumUp.' },
      { status: 500 }
    );
  }
}
