import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { PreviewOrderInput } from '../../../../lib/preventa/validation';
import { validatePreviewOrderInput } from '../../../../lib/preventa/validation';
import {
  getPreventaPersistenceStatus,
  persistPreventaDraft,
} from '../../../../lib/preventa/persistence';

export const dynamic = 'force-dynamic';

function cleanRequestKey(value: string | null) {
  const key = (value || '').trim();
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(key)) return null;
  return key;
}

export async function GET() {
  const persistence = getPreventaPersistenceStatus();

  return NextResponse.json({
    ok: true,
    route: 'preventa-orders',
    persistenceEnabled: persistence.enabled,
    persistenceConfigured: persistence.configured,
    writeReady: persistence.ready,
    paymentsEnabled: false,
  });
}

export async function POST(request: NextRequest) {
  const persistence = getPreventaPersistenceStatus();

  if (!persistence.enabled) {
    return NextResponse.json(
      {
        ok: false,
        code: 'PERSISTENCE_GATE_CLOSED',
        error: 'La persistencia de preventa permanece desactivada por Gate técnico.',
      },
      { status: 503 }
    );
  }

  if (!persistence.configured) {
    return NextResponse.json(
      {
        ok: false,
        code: 'PERSISTENCE_NOT_CONFIGURED',
        error: 'La persistencia está habilitada pero faltan variables privadas de servidor.',
      },
      { status: 503 }
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
      { status: 400 }
    );
  }

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

  const orderReference = `GHC-${randomUUID().slice(0, 8).toUpperCase()}`;

  try {
    const persisted = await persistPreventaDraft(body, requestKey, orderReference);

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
      next: {
        requiresSumUpCheckout: true,
        requiresFinalPaymentGate: true,
      },
    });
  } catch (error) {
    console.error('Preventa persistence error', error);

    return NextResponse.json(
      {
        ok: false,
        code: 'PERSISTENCE_FAILED',
        error: 'No se pudo crear el borrador de matrícula.',
      },
      { status: 500 }
    );
  }
}
