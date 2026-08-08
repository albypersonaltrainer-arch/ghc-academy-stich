import type { PreventaPaymentPlan } from './offer';
import { PREVENTA_OFFER } from './offer';

export type PreventaOrderStatus = 'draft' | 'awaiting_payment' | 'partial' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
export type FounderStatus = 'pending' | 'reserved' | 'confirmed' | 'released';
export type InstallmentStatus = 'pending' | 'paid' | 'overdue' | 'refunded';
export type CommissionStatus = 'not_eligible' | 'accruing' | 'reversed';
export type EmailTemplateCode = 'E01' | 'E02' | 'E03' | 'E04' | 'E05' | 'E06' | 'E07' | 'E08' | 'E09' | 'E10';

export type InstallmentState = {
  installmentNo: 1 | 2;
  expectedAmountCents: number;
  status: InstallmentStatus;
  dueAt: string | null;
  paidAt: string | null;
  providerPaymentId: string | null;
  refundedAmountCents: number;
};

export type PaymentMachineState = {
  paymentPlan: PreventaPaymentPlan;
  orderStatus: PreventaOrderStatus;
  founderStatus: FounderStatus;
  secondDueAt: string | null;
  commissionBaseCents: number;
  commissionStatus: CommissionStatus;
  installments: InstallmentState[];
  processedEventKeys: string[];
  processedProviderPaymentIds: string[];
};

export type EmailEffect = {
  templateCode: EmailTemplateCode;
  scheduledFor: string;
};

export type TransitionEffects = {
  eventType: string;
  idempotentReplay: boolean;
  duplicateProviderPayment: boolean;
  enqueueEmails: EmailEffect[];
  cancelEmailTemplates: EmailTemplateCode[];
  requiresFounderNumberAssignment: boolean;
};

export type PaymentMachineEvent =
  | { type: 'checkout_prepared'; idempotencyKey: string; occurredAt: string }
  | {
      type: 'payment_confirmed';
      idempotencyKey: string;
      occurredAt: string;
      installmentNo: 1 | 2;
      amountCents: number;
      providerPaymentId: string;
    }
  | { type: 'second_installment_overdue'; idempotencyKey: string; occurredAt: string }
  | { type: 'full_refund_confirmed'; idempotencyKey: string; occurredAt: string; providerRefundId: string }
  | { type: 'nonpayment_day60_close'; idempotencyKey: string; occurredAt: string };

export class PaymentTransitionError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'PaymentTransitionError';
  }
}

function isoAddDays(iso: string, days: number) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) throw new PaymentTransitionError('INVALID_TIMESTAMP', `Fecha inválida: ${iso}`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function assertIso(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) throw new PaymentTransitionError('INVALID_TIMESTAMP', `Fecha inválida: ${iso}`);
  return date;
}

function cloneState(state: PaymentMachineState): PaymentMachineState {
  return {
    ...state,
    installments: state.installments.map((item) => ({ ...item })),
    processedEventKeys: [...state.processedEventKeys],
    processedProviderPaymentIds: [...state.processedProviderPaymentIds],
  };
}

function baseEffects(eventType: string): TransitionEffects {
  return {
    eventType,
    idempotentReplay: false,
    duplicateProviderPayment: false,
    enqueueEmails: [],
    cancelEmailTemplates: [],
    requiresFounderNumberAssignment: false,
  };
}

function replayResult(state: PaymentMachineState, duplicateProviderPayment = false) {
  return {
    state: cloneState(state),
    effects: {
      ...baseEffects('idempotent.replay'),
      idempotentReplay: true,
      duplicateProviderPayment,
    },
  };
}

function addProcessedEvent(state: PaymentMachineState, idempotencyKey: string) {
  state.processedEventKeys.push(idempotencyKey);
}

function getInstallment(state: PaymentMachineState, installmentNo: 1 | 2) {
  const installment = state.installments.find((item) => item.installmentNo === installmentNo);
  if (!installment) throw new PaymentTransitionError('INSTALLMENT_NOT_FOUND', `La cuota ${installmentNo} no existe para esta modalidad.`);
  return installment;
}

export function createPaymentMachineState(paymentPlan: PreventaPaymentPlan): PaymentMachineState {
  const price = PREVENTA_OFFER.prices[paymentPlan];
  const installments: InstallmentState[] = [
    {
      installmentNo: 1,
      expectedAmountCents: price.installments[0],
      status: 'pending',
      dueAt: null,
      paidAt: null,
      providerPaymentId: null,
      refundedAmountCents: 0,
    },
  ];

  if (paymentPlan === 'split') {
    installments.push({
      installmentNo: 2,
      expectedAmountCents: price.installments[1],
      status: 'pending',
      dueAt: null,
      paidAt: null,
      providerPaymentId: null,
      refundedAmountCents: 0,
    });
  }

  return {
    paymentPlan,
    orderStatus: 'draft',
    founderStatus: 'pending',
    secondDueAt: null,
    commissionBaseCents: 0,
    commissionStatus: 'not_eligible',
    installments,
    processedEventKeys: [],
    processedProviderPaymentIds: [],
  };
}

export function applyPaymentEvent(current: PaymentMachineState, event: PaymentMachineEvent) {
  if (!event.idempotencyKey || event.idempotencyKey.length < 8) {
    throw new PaymentTransitionError('INVALID_IDEMPOTENCY_KEY', 'La clave de idempotencia es obligatoria.');
  }

  if (current.processedEventKeys.includes(event.idempotencyKey)) return replayResult(current);

  if (event.type === 'payment_confirmed' && current.processedProviderPaymentIds.includes(event.providerPaymentId)) {
    return replayResult(current, true);
  }

  const state = cloneState(current);
  assertIso(event.occurredAt);

  if (event.type === 'checkout_prepared') {
    if (state.orderStatus !== 'draft') {
      throw new PaymentTransitionError('INVALID_ORDER_STATE', 'Solo una orden draft puede quedar preparada para pago.');
    }
    state.orderStatus = 'awaiting_payment';
    addProcessedEvent(state, event.idempotencyKey);
    return { state, effects: baseEffects('checkout.prepared') };
  }

  if (event.type === 'payment_confirmed') {
    if (!event.providerPaymentId.trim()) {
      throw new PaymentTransitionError('INVALID_PROVIDER_PAYMENT_ID', 'providerPaymentId es obligatorio.');
    }

    const installment = getInstallment(state, event.installmentNo);
    if (event.amountCents !== installment.expectedAmountCents) {
      throw new PaymentTransitionError('PAYMENT_AMOUNT_MISMATCH', `Importe recibido ${event.amountCents}; esperado ${installment.expectedAmountCents}.`);
    }

    const effects = baseEffects('payment.confirmed');

    if (state.paymentPlan === 'single') {
      if (event.installmentNo !== 1 || state.orderStatus !== 'awaiting_payment') {
        throw new PaymentTransitionError('INVALID_ORDER_STATE', 'El pago único solo puede confirmarse desde awaiting_payment.');
      }

      installment.status = 'paid';
      installment.paidAt = event.occurredAt;
      installment.providerPaymentId = event.providerPaymentId;
      state.orderStatus = 'paid';
      state.founderStatus = 'confirmed';
      state.commissionBaseCents = installment.expectedAmountCents;
      state.commissionStatus = 'accruing';
      state.processedProviderPaymentIds.push(event.providerPaymentId);
      addProcessedEvent(state, event.idempotencyKey);

      effects.eventType = 'payment.single.paid';
      effects.enqueueEmails = [{ templateCode: 'E01', scheduledFor: event.occurredAt }];
      effects.requiresFounderNumberAssignment = true;
      return { state, effects };
    }

    if (event.installmentNo === 1) {
      if (state.orderStatus !== 'awaiting_payment') {
        throw new PaymentTransitionError('INVALID_ORDER_STATE', 'La primera cuota solo puede confirmarse desde awaiting_payment.');
      }

      installment.status = 'paid';
      installment.paidAt = event.occurredAt;
      installment.providerPaymentId = event.providerPaymentId;
      const dueAt = isoAddDays(event.occurredAt, PREVENTA_OFFER.prices.split.secondInstallmentDaysAfterFirstPayment);
      const second = getInstallment(state, 2);
      second.dueAt = dueAt;
      state.secondDueAt = dueAt;
      state.orderStatus = 'partial';
      state.founderStatus = 'reserved';
      state.commissionBaseCents = installment.expectedAmountCents;
      state.commissionStatus = 'accruing';
      state.processedProviderPaymentIds.push(event.providerPaymentId);
      addProcessedEvent(state, event.idempotencyKey);

      effects.eventType = 'payment.installment1.paid';
      effects.requiresFounderNumberAssignment = true;
      effects.enqueueEmails = [
        { templateCode: 'E02', scheduledFor: event.occurredAt },
        { templateCode: 'E03', scheduledFor: isoAddDays(dueAt, -3) },
        { templateCode: 'E04', scheduledFor: dueAt },
        { templateCode: 'E05', scheduledFor: isoAddDays(dueAt, 1) },
        { templateCode: 'E06', scheduledFor: isoAddDays(dueAt, 7) },
        { templateCode: 'E07', scheduledFor: isoAddDays(dueAt, 30) },
        { templateCode: 'E08', scheduledFor: isoAddDays(dueAt, 53) },
        { templateCode: 'E09', scheduledFor: isoAddDays(dueAt, 60) },
      ];
      return { state, effects };
    }

    if (!['partial', 'overdue'].includes(state.orderStatus)) {
      throw new PaymentTransitionError('INVALID_ORDER_STATE', 'La segunda cuota requiere una primera cuota confirmada.');
    }
    const first = getInstallment(state, 1);
    if (first.status !== 'paid') {
      throw new PaymentTransitionError('FIRST_INSTALLMENT_NOT_PAID', 'La primera cuota debe constar como pagada.');
    }

    installment.status = 'paid';
    installment.paidAt = event.occurredAt;
    installment.providerPaymentId = event.providerPaymentId;
    state.orderStatus = 'paid';
    state.founderStatus = 'confirmed';
    state.commissionBaseCents = first.expectedAmountCents + installment.expectedAmountCents;
    state.commissionStatus = 'accruing';
    state.processedProviderPaymentIds.push(event.providerPaymentId);
    addProcessedEvent(state, event.idempotencyKey);

    effects.eventType = 'payment.installment2.paid';
    effects.enqueueEmails = [{ templateCode: 'E10', scheduledFor: event.occurredAt }];
    effects.cancelEmailTemplates = ['E03', 'E04', 'E05', 'E06', 'E07', 'E08', 'E09'];
    return { state, effects };
  }

  if (event.type === 'second_installment_overdue') {
    if (state.paymentPlan !== 'split' || state.orderStatus !== 'partial' || !state.secondDueAt) {
      throw new PaymentTransitionError('INVALID_ORDER_STATE', 'Solo una matrícula fraccionada partial puede pasar a overdue.');
    }
    const minimumOverdueAt = new Date(isoAddDays(state.secondDueAt, 1));
    if (assertIso(event.occurredAt).getTime() < minimumOverdueAt.getTime()) {
      throw new PaymentTransitionError('OVERDUE_TOO_EARLY', 'No puede marcarse vencida antes del primer día posterior al vencimiento.');
    }

    getInstallment(state, 2).status = 'overdue';
    state.orderStatus = 'overdue';
    addProcessedEvent(state, event.idempotencyKey);
    return { state, effects: baseEffects('payment.installment2.overdue') };
  }

  if (event.type === 'full_refund_confirmed') {
    if (!['partial', 'paid', 'overdue'].includes(state.orderStatus) || state.commissionBaseCents <= 0) {
      throw new PaymentTransitionError('NOTHING_TO_REFUND', 'No existe importe cobrado que permita un reembolso total.');
    }

    for (const installment of state.installments) {
      if (installment.status === 'paid') {
        installment.status = 'refunded';
        installment.refundedAmountCents = installment.expectedAmountCents;
      }
    }
    state.orderStatus = 'refunded';
    state.founderStatus = 'released';
    state.commissionBaseCents = 0;
    state.commissionStatus = 'reversed';
    addProcessedEvent(state, event.idempotencyKey);

    const effects = baseEffects('payment.full_refunded');
    effects.cancelEmailTemplates = ['E03', 'E04', 'E05', 'E06', 'E07', 'E08', 'E09'];
    return { state, effects };
  }

  if (event.type === 'nonpayment_day60_close') {
    if (state.paymentPlan !== 'split' || state.orderStatus !== 'overdue' || !state.secondDueAt) {
      throw new PaymentTransitionError('INVALID_ORDER_STATE', 'El cierre por impago requiere una matrícula fraccionada overdue.');
    }
    const closeAt = new Date(isoAddDays(state.secondDueAt, 60));
    if (assertIso(event.occurredAt).getTime() < closeAt.getTime()) {
      throw new PaymentTransitionError('DAY60_TOO_EARLY', 'No puede cerrarse por día 60 antes de cumplirse el plazo.');
    }

    state.orderStatus = 'cancelled';
    state.founderStatus = 'released';
    addProcessedEvent(state, event.idempotencyKey);
    const effects = baseEffects('order.cancelled.nonpayment');
    effects.cancelEmailTemplates = ['E03', 'E04', 'E05', 'E06', 'E07', 'E08'];
    return { state, effects };
  }

  throw new PaymentTransitionError('UNSUPPORTED_EVENT', 'Evento no soportado.');
}
