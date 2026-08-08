import {
  applyPaymentEvent,
  createPaymentMachineState,
  PaymentTransitionError,
  type PaymentMachineState,
} from './payment-state';

type TestResult = {
  name: string;
  ok: boolean;
  detail: string;
};

function iso(value: string) {
  return new Date(value).toISOString();
}

function expect(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function expectThrows(fn: () => unknown, code: string) {
  try {
    fn();
  } catch (error) {
    if (error instanceof PaymentTransitionError && error.code === code) return;
    throw error;
  }
  throw new Error(`Se esperaba error ${code}.`);
}

function prepare(plan: 'single' | 'split') {
  return applyPaymentEvent(createPaymentMachineState(plan), {
    type: 'checkout_prepared',
    idempotencyKey: `checkout-${plan}-0001`,
    occurredAt: iso('2026-08-20T10:00:00Z'),
  }).state;
}

function run(name: string, fn: () => void): TestResult {
  try {
    fn();
    return { name, ok: true, detail: 'OK' };
  } catch (error) {
    return {
      name,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

export function runPaymentStateSelfTest() {
  const results: TestResult[] = [];

  results.push(run('Pago único · 1.690 € → paid + E01', () => {
    const state = prepare('single');
    const result = applyPaymentEvent(state, {
      type: 'payment_confirmed',
      idempotencyKey: 'single-paid-0001',
      occurredAt: iso('2026-08-20T10:05:00Z'),
      installmentNo: 1,
      amountCents: 169000,
      providerPaymentId: 'sumup-single-001',
    });
    expect(result.state.orderStatus === 'paid', 'La orden no quedó paid.');
    expect(result.state.founderStatus === 'confirmed', 'La plaza no quedó confirmed.');
    expect(result.state.commissionBaseCents === 169000, 'Base de comisión incorrecta.');
    expect(result.effects.enqueueEmails[0]?.templateCode === 'E01', 'No se encoló E01.');
  }));

  results.push(run('Pago fraccionado · primera cuota → partial + vencimiento +15 días', () => {
    const state = prepare('split');
    const result = applyPaymentEvent(state, {
      type: 'payment_confirmed',
      idempotencyKey: 'split-first-paid-0001',
      occurredAt: iso('2026-08-20T12:00:00Z'),
      installmentNo: 1,
      amountCents: 89500,
      providerPaymentId: 'sumup-split-001',
    });
    expect(result.state.orderStatus === 'partial', 'La orden no quedó partial.');
    expect(result.state.founderStatus === 'reserved', 'La plaza no quedó reserved.');
    expect(result.state.secondDueAt === iso('2026-09-04T12:00:00Z'), `Vencimiento incorrecto: ${result.state.secondDueAt}`);
    expect(result.effects.enqueueEmails.map((e) => e.templateCode).join(',') === 'E02,E03,E04,E05,E06,E07,E08,E09', 'Calendario E02-E09 incompleto.');
  }));

  results.push(run('Pago fraccionado · segunda cuota → paid + E10', () => {
    let state = prepare('split');
    state = applyPaymentEvent(state, {
      type: 'payment_confirmed',
      idempotencyKey: 'split-first-paid-0002',
      occurredAt: iso('2026-08-20T12:00:00Z'),
      installmentNo: 1,
      amountCents: 89500,
      providerPaymentId: 'sumup-split-002a',
    }).state;
    const result = applyPaymentEvent(state, {
      type: 'payment_confirmed',
      idempotencyKey: 'split-second-paid-0002',
      occurredAt: iso('2026-09-01T12:00:00Z'),
      installmentNo: 2,
      amountCents: 89500,
      providerPaymentId: 'sumup-split-002b',
    });
    expect(result.state.orderStatus === 'paid', 'La orden no quedó paid.');
    expect(result.state.commissionBaseCents === 179000, 'La comisión no suma ambas cuotas.');
    expect(result.effects.enqueueEmails[0]?.templateCode === 'E10', 'No se encoló E10.');
    expect(result.effects.cancelEmailTemplates.includes('E09'), 'No se cancelaron recordatorios pendientes.');
  }));

  results.push(run('Idempotencia · misma clave no duplica transición', () => {
    const state = prepare('single');
    const event = {
      type: 'payment_confirmed' as const,
      idempotencyKey: 'single-idempotent-0001',
      occurredAt: iso('2026-08-20T10:05:00Z'),
      installmentNo: 1 as const,
      amountCents: 169000,
      providerPaymentId: 'sumup-idem-001',
    };
    const once = applyPaymentEvent(state, event);
    const twice = applyPaymentEvent(once.state, event);
    expect(twice.effects.idempotentReplay === true, 'El segundo evento no se reconoció como replay.');
    expect(twice.state.commissionBaseCents === 169000, 'La comisión se duplicó.');
  }));

  results.push(run('Idempotencia · providerPaymentId duplicado se ignora', () => {
    let state = prepare('split');
    state = applyPaymentEvent(state, {
      type: 'payment_confirmed',
      idempotencyKey: 'provider-dup-first-0001',
      occurredAt: iso('2026-08-20T12:00:00Z'),
      installmentNo: 1,
      amountCents: 89500,
      providerPaymentId: 'sumup-provider-dup-001',
    }).state;
    const duplicate = applyPaymentEvent(state, {
      type: 'payment_confirmed',
      idempotencyKey: 'provider-dup-second-key-0001',
      occurredAt: iso('2026-08-20T12:01:00Z'),
      installmentNo: 1,
      amountCents: 89500,
      providerPaymentId: 'sumup-provider-dup-001',
    });
    expect(duplicate.effects.idempotentReplay === true, 'No se reconoció replay por providerPaymentId.');
    expect(duplicate.effects.duplicateProviderPayment === true, 'No se marcó duplicateProviderPayment.');
  }));

  results.push(run('Vencimiento · no puede marcar overdue antes de +1 día', () => {
    let state = prepare('split');
    state = applyPaymentEvent(state, {
      type: 'payment_confirmed',
      idempotencyKey: 'overdue-first-0001',
      occurredAt: iso('2026-08-20T12:00:00Z'),
      installmentNo: 1,
      amountCents: 89500,
      providerPaymentId: 'sumup-overdue-001',
    }).state;
    expectThrows(() => applyPaymentEvent(state, {
      type: 'second_installment_overdue',
      idempotencyKey: 'overdue-too-early-0001',
      occurredAt: iso('2026-09-04T12:00:00Z'),
    }), 'OVERDUE_TOO_EARLY');
  }));

  results.push(run('Vencimiento · +1 día → overdue y pago tardío recupera paid', () => {
    let state = prepare('split');
    state = applyPaymentEvent(state, {
      type: 'payment_confirmed',
      idempotencyKey: 'late-first-0001',
      occurredAt: iso('2026-08-20T12:00:00Z'),
      installmentNo: 1,
      amountCents: 89500,
      providerPaymentId: 'sumup-late-001a',
    }).state;
    state = applyPaymentEvent(state, {
      type: 'second_installment_overdue',
      idempotencyKey: 'late-overdue-0001',
      occurredAt: iso('2026-09-05T12:00:00Z'),
    }).state;
    expect(state.orderStatus === 'overdue', 'No quedó overdue.');
    state = applyPaymentEvent(state, {
      type: 'payment_confirmed',
      idempotencyKey: 'late-second-0001',
      occurredAt: iso('2026-09-08T12:00:00Z'),
      installmentNo: 2,
      amountCents: 89500,
      providerPaymentId: 'sumup-late-001b',
    }).state;
    expect(state.orderStatus === 'paid', 'El pago tardío no recuperó paid.');
    expect(state.founderStatus === 'confirmed', 'La plaza no quedó confirmed tras regularizar.');
  }));

  results.push(run('Reembolso total · paid → refunded y revierte comisión/plaza', () => {
    let state = prepare('single');
    state = applyPaymentEvent(state, {
      type: 'payment_confirmed',
      idempotencyKey: 'refund-paid-0001',
      occurredAt: iso('2026-08-20T10:05:00Z'),
      installmentNo: 1,
      amountCents: 169000,
      providerPaymentId: 'sumup-refund-001',
    }).state;
    const refunded = applyPaymentEvent(state, {
      type: 'full_refund_confirmed',
      idempotencyKey: 'refund-full-0001',
      occurredAt: iso('2026-08-22T10:05:00Z'),
      providerRefundId: 'sumup-refund-op-001',
    });
    expect(refunded.state.orderStatus === 'refunded', 'La orden no quedó refunded.');
    expect(refunded.state.founderStatus === 'released', 'La plaza no se liberó.');
    expect(refunded.state.commissionBaseCents === 0, 'No se revirtió la base de comisión.');
    expect(refunded.state.commissionStatus === 'reversed', 'No se marcó comisión reversed.');
  }));

  results.push(run('Impago · cierre día 60 solo después del plazo', () => {
    let state = prepare('split');
    state = applyPaymentEvent(state, {
      type: 'payment_confirmed',
      idempotencyKey: 'day60-first-0001',
      occurredAt: iso('2026-08-20T12:00:00Z'),
      installmentNo: 1,
      amountCents: 89500,
      providerPaymentId: 'sumup-day60-001',
    }).state;
    state = applyPaymentEvent(state, {
      type: 'second_installment_overdue',
      idempotencyKey: 'day60-overdue-0001',
      occurredAt: iso('2026-09-05T12:00:00Z'),
    }).state;
    expectThrows(() => applyPaymentEvent(state, {
      type: 'nonpayment_day60_close',
      idempotencyKey: 'day60-early-0001',
      occurredAt: iso('2026-10-01T12:00:00Z'),
    }), 'DAY60_TOO_EARLY');
    const closed = applyPaymentEvent(state, {
      type: 'nonpayment_day60_close',
      idempotencyKey: 'day60-close-0001',
      occurredAt: iso('2026-11-03T12:00:00Z'),
    });
    expect(closed.state.orderStatus === 'cancelled', 'La orden no quedó cancelled.');
    expect(closed.state.founderStatus === 'released', 'La plaza no se liberó al cierre.');
  }));

  const passed = results.filter((result) => result.ok).length;
  return {
    ok: passed === results.length,
    passed,
    total: results.length,
    results,
  };
}
