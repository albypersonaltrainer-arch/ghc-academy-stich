import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { PREVENTA_OFFER, formatEuroCents } from '../../../../lib/preventa/offer';
import { PreviewOrderInput, validatePreviewOrderInput } from '../../../../lib/preventa/validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    mode: 'preview-validation-only',
    persistence: false,
    paymentsEnabled: false,
    offer: {
      code: PREVENTA_OFFER.code,
      version: PREVENTA_OFFER.version,
      founderPlaces: PREVENTA_OFFER.founderPlaces,
      openingWindow: PREVENTA_OFFER.openingWindow,
      single: {
        totalAmountCents: PREVENTA_OFFER.prices.single.totalAmountCents,
        display: formatEuroCents(PREVENTA_OFFER.prices.single.totalAmountCents),
      },
      split: {
        totalAmountCents: PREVENTA_OFFER.prices.split.totalAmountCents,
        installments: PREVENTA_OFFER.prices.split.installments,
        display: '895 € + 895 €',
        secondInstallmentRule: '15 días naturales después de confirmar el primer pago',
      },
    },
  });
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return NextResponse.json(
      { ok: false, error: 'Content-Type debe ser application/json.' },
      { status: 415 }
    );
  }

  const body = (await request.json().catch(() => null)) as PreviewOrderInput | null;
  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { ok: false, error: 'Solicitud JSON no válida.' },
      { status: 400 }
    );
  }

  const validated = validatePreviewOrderInput(body);
  if (!validated.ok) {
    return NextResponse.json(
      { ok: false, errors: validated.errors },
      { status: 400 }
    );
  }

  const orderReference = `GHC-PREVIEW-${randomUUID().slice(0, 8).toUpperCase()}`;

  return NextResponse.json({
    ok: true,
    mode: 'preview-validation-only',
    persisted: false,
    paymentCreated: false,
    founderPlaceReserved: false,
    order: {
      reference: orderReference,
      status: 'draft',
      founderStatus: 'pending',
      ...validated.data,
    },
    next: {
      requiresSupabaseMigration: true,
      requiresSumUpIntegration: true,
      requiresFinalGate: true,
    },
  });
}
