import 'server-only';
import { PREVENTA_OFFER } from './offer';

export type SumUpWebhookPayload = {
  event_type: 'CHECKOUT_STATUS_CHANGED';
  id: string;
};

export type SumUpTransaction = {
  id?: string;
  transaction_code?: string;
  amount?: number;
  currency?: string;
  timestamp?: string;
  status?: 'SUCCESSFUL' | 'CANCELLED' | 'FAILED' | 'PENDING' | 'REFUNDED' | string;
};

export type SumUpCheckout = {
  id?: string;
  checkout_reference?: string;
  amount?: number;
  currency?: string;
  merchant_code?: string;
  status?: 'PENDING' | 'FAILED' | 'PAID' | 'EXPIRED' | string;
  transaction_id?: string;
  transaction_code?: string;
  transactions?: SumUpTransaction[];
  hosted_checkout_url?: string;
  redirect_url?: string;
  return_url?: string;
};

export type VerifiedSumUpPayment = {
  checkoutId: string;
  checkoutReference: string;
  orderReference: string;
  installmentNo: 1 | 2;
  attemptToken: string | null;
  amountCents: number;
  providerPaymentId: string;
  occurredAt: string;
  providerMetadata: Record<string, unknown>;
};

export class SumUpAdapterError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'SumUpAdapterError';
  }
}

function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function parseSumUpWebhookPayload(input: unknown): SumUpWebhookPayload {
  if (!input || typeof input !== 'object') {
    throw new SumUpAdapterError('INVALID_WEBHOOK_BODY', 'El webhook debe ser un objeto JSON.');
  }

  const object = input as Record<string, unknown>;
  const eventType = cleanString(object.event_type);
  const id = cleanString(object.id);

  if (eventType !== 'CHECKOUT_STATUS_CHANGED') {
    throw new SumUpAdapterError('UNSUPPORTED_EVENT_TYPE', `Evento SumUp no soportado: ${eventType || 'vacío'}.`);
  }

  if (!id || id.length > 128) {
    throw new SumUpAdapterError('INVALID_CHECKOUT_ID', 'El webhook no contiene un checkout id válido.');
  }

  return { event_type: 'CHECKOUT_STATUS_CHANGED', id };
}

export function createSumUpCheckoutReference(
  orderReference: string,
  installmentNo: 1 | 2,
  attemptToken?: string
) {
  const cleanOrderReference = orderReference.trim();
  if (!/^GHC-[A-Z0-9]{8}$/.test(cleanOrderReference)) {
    throw new SumUpAdapterError('INVALID_ORDER_REFERENCE', 'Referencia interna de matrícula no válida.');
  }

  const token = cleanString(attemptToken).toUpperCase();
  if (token && !/^[A-Z0-9]{6,16}$/.test(token)) {
    throw new SumUpAdapterError('INVALID_ATTEMPT_TOKEN', 'Identificador de intento SumUp no válido.');
  }

  return `${cleanOrderReference}-I${installmentNo}${token ? `-A${token}` : ''}`;
}

export function parseSumUpCheckoutReference(checkoutReference: string) {
  const match = checkoutReference.trim().match(/^(GHC-[A-Z0-9]{8})-I([12])(?:-A([A-Z0-9]{6,16}))?$/);
  if (!match) {
    throw new SumUpAdapterError('INVALID_CHECKOUT_REFERENCE', 'La referencia del checkout no pertenece al formato de preventa GHC.');
  }

  return {
    orderReference: match[1],
    installmentNo: Number(match[2]) as 1 | 2,
    attemptToken: match[3] || null,
  };
}

function expectedAmountCents(installmentNo: 1 | 2, checkoutReference: string): number[] {
  const { installmentNo: parsedInstallmentNo } = parseSumUpCheckoutReference(checkoutReference);
  if (parsedInstallmentNo !== installmentNo) {
    throw new SumUpAdapterError('INSTALLMENT_REFERENCE_MISMATCH', 'La cuota no coincide con la referencia del checkout.');
  }

  if (installmentNo === 1) {
    return [PREVENTA_OFFER.prices.single.installments[0], PREVENTA_OFFER.prices.split.installments[0]];
  }

  return [PREVENTA_OFFER.prices.split.installments[1]];
}

function majorUnitsToCents(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new SumUpAdapterError('INVALID_SUMUP_AMOUNT', 'SumUp no devolvió un importe numérico válido.');
  }
  return Math.round(value * 100);
}

function selectSuccessfulTransaction(checkout: SumUpCheckout, expectedCents: number) {
  const transactions = Array.isArray(checkout.transactions) ? checkout.transactions : [];

  const successful = transactions.find((transaction) => {
    if (transaction.status !== 'SUCCESSFUL') return false;
    if (transaction.currency !== PREVENTA_OFFER.currency) return false;
    if (!cleanString(transaction.id)) return false;
    try {
      return majorUnitsToCents(transaction.amount) === expectedCents;
    } catch {
      return false;
    }
  });

  if (!successful) {
    throw new SumUpAdapterError(
      'SUCCESSFUL_TRANSACTION_NOT_FOUND',
      'El checkout PAID no contiene una transacción SUCCESSFUL verificable con importe y moneda correctos.'
    );
  }

  return successful;
}

export function verifySumUpCheckoutForPreventa(input: {
  webhookCheckoutId: string;
  checkout: SumUpCheckout;
  expectedMerchantCode: string;
}): VerifiedSumUpPayment {
  const { webhookCheckoutId, checkout, expectedMerchantCode } = input;

  if (cleanString(checkout.id) !== webhookCheckoutId) {
    throw new SumUpAdapterError('CHECKOUT_ID_MISMATCH', 'El checkout recuperado no coincide con el id del webhook.');
  }

  if (cleanString(checkout.merchant_code) !== expectedMerchantCode.trim()) {
    throw new SumUpAdapterError('MERCHANT_CODE_MISMATCH', 'El checkout no pertenece al merchant configurado.');
  }

  if (checkout.currency !== PREVENTA_OFFER.currency) {
    throw new SumUpAdapterError('CURRENCY_MISMATCH', 'La moneda del checkout no coincide con la oferta GHC.');
  }

  if (checkout.status !== 'PAID') {
    throw new SumUpAdapterError('CHECKOUT_NOT_PAID', `El checkout está en estado ${checkout.status || 'desconocido'}, no PAID.`);
  }

  const checkoutReference = cleanString(checkout.checkout_reference);
  const parsed = parseSumUpCheckoutReference(checkoutReference);
  const checkoutAmountCents = majorUnitsToCents(checkout.amount);
  const validAmounts = expectedAmountCents(parsed.installmentNo, checkoutReference);

  if (!validAmounts.includes(checkoutAmountCents)) {
    throw new SumUpAdapterError('CHECKOUT_AMOUNT_MISMATCH', `Importe de checkout no válido para la cuota ${parsed.installmentNo}.`);
  }

  if (parsed.installmentNo === 2 && checkoutAmountCents !== PREVENTA_OFFER.prices.split.installments[1]) {
    throw new SumUpAdapterError('SECOND_INSTALLMENT_AMOUNT_MISMATCH', 'La segunda cuota debe ser de 895 €.');
  }

  const transaction = selectSuccessfulTransaction(checkout, checkoutAmountCents);
  const occurredAt = cleanString(transaction.timestamp) || new Date().toISOString();

  return {
    checkoutId: webhookCheckoutId,
    checkoutReference,
    orderReference: parsed.orderReference,
    installmentNo: parsed.installmentNo,
    attemptToken: parsed.attemptToken,
    amountCents: checkoutAmountCents,
    providerPaymentId: cleanString(transaction.id),
    occurredAt,
    providerMetadata: {
      provider: 'sumup',
      checkout_id: webhookCheckoutId,
      checkout_reference: checkoutReference,
      checkout_status: checkout.status,
      checkout_attempt: parsed.attemptToken,
      transaction_code: transaction.transaction_code || checkout.transaction_code || null,
      transaction_status: transaction.status,
      verified_via_sumup_api: true,
    },
  };
}
