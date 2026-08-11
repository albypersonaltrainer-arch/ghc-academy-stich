import {
  SumUpAdapterError,
  parseSumUpWebhookPayload,
  verifySumUpCheckoutForPreventa,
  verifySumUpCheckoutStateForPreventa,
} from './sumup-adapter';

export type SumUpSelfTestResult = {
  name: string;
  ok: boolean;
  detail: string;
};

function expect(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function expectError(fn: () => unknown, code: string) {
  try {
    fn();
  } catch (error) {
    if (error instanceof SumUpAdapterError && error.code === code) return;
    throw error;
  }
  throw new Error(`Se esperaba error ${code}.`);
}

function run(name: string, fn: () => void): SumUpSelfTestResult {
  try {
    fn();
    return { name, ok: true, detail: 'OK' };
  } catch (error) {
    return {
      name,
      ok: false,
      detail: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

const merchantCode = 'MERCHANT_TEST_GHC';
const checkoutId = 'checkout-test-001';

const validSingle = {
  id: checkoutId,
  checkout_reference: 'GHC-ABC12345-I1',
  amount: 1690,
  currency: 'EUR',
  merchant_code: merchantCode,
  status: 'PAID',
  transactions: [
    {
      id: 'tx-single-001',
      transaction_code: 'T-SINGLE-001',
      amount: 1690,
      currency: 'EUR',
      timestamp: '2026-08-08T12:00:00.000Z',
      status: 'SUCCESSFUL',
    },
  ],
};

export function runSumUpAdapterSelfTest() {
  const results: SumUpSelfTestResult[] = [];

  results.push(run('Webhook válido · CHECKOUT_STATUS_CHANGED + id', () => {
    const payload = parseSumUpWebhookPayload({ event_type: 'CHECKOUT_STATUS_CHANGED', id: checkoutId });
    expect(payload.id === checkoutId, 'No se conservó el checkout id.');
  }));

  results.push(run('Pago único verificado · 1.690 €', () => {
    const payment = verifySumUpCheckoutForPreventa({
      webhookCheckoutId: checkoutId,
      checkout: validSingle,
      expectedMerchantCode: merchantCode,
    });
    expect(payment.orderReference === 'GHC-ABC12345', 'Referencia de orden incorrecta.');
    expect(payment.installmentNo === 1, 'Cuota incorrecta.');
    expect(payment.amountCents === 169000, 'Importe incorrecto.');
    expect(payment.providerPaymentId === 'tx-single-001', 'Transacción incorrecta.');
  }));

  results.push(run('Primera cuota fraccionada verificada · 895 €', () => {
    const payment = verifySumUpCheckoutForPreventa({
      webhookCheckoutId: 'checkout-split-001',
      checkout: {
        id: 'checkout-split-001', checkout_reference: 'GHC-FF001122-I1', amount: 895,
        currency: 'EUR', merchant_code: merchantCode, status: 'PAID',
        transactions: [{ id: 'tx-split-1', amount: 895, currency: 'EUR', status: 'SUCCESSFUL', timestamp: '2026-08-08T12:00:00.000Z' }],
      },
      expectedMerchantCode: merchantCode,
    });
    expect(payment.amountCents === 89500, 'Primera cuota split incorrecta.');
    expect(payment.installmentNo === 1, 'Número de cuota split incorrecto.');
  }));

  results.push(run('Segunda cuota fraccionada verificada · 895 €', () => {
    const payment = verifySumUpCheckoutForPreventa({
      webhookCheckoutId: 'checkout-split-002',
      checkout: {
        id: 'checkout-split-002', checkout_reference: 'GHC-FF001122-I2', amount: 895,
        currency: 'EUR', merchant_code: merchantCode, status: 'PAID',
        transactions: [{ id: 'tx-split-2', amount: 895, currency: 'EUR', status: 'SUCCESSFUL', timestamp: '2026-08-23T12:00:00.000Z' }],
      },
      expectedMerchantCode: merchantCode,
    });
    expect(payment.installmentNo === 2, 'Número de segunda cuota incorrecto.');
  }));

  for (const terminalStatus of ['PENDING', 'FAILED', 'EXPIRED'] as const) {
    results.push(run(`Estado ${terminalStatus} · se clasifica sin acreditar pago`, () => {
      const state = verifySumUpCheckoutStateForPreventa({
        webhookCheckoutId: checkoutId,
        checkout: {
          ...validSingle,
          status: terminalStatus,
          transactions: terminalStatus === 'FAILED' ? [{
            id: 'tx-failed-001', amount: 1690, currency: 'EUR', status: 'FAILED', timestamp: '2026-08-08T12:01:00.000Z',
          }] : [],
          valid_until: terminalStatus === 'EXPIRED' ? '2026-08-08T12:30:00.000Z' : null,
        },
        expectedMerchantCode: merchantCode,
      });
      expect(state.status === terminalStatus, `Estado ${terminalStatus} no reconocido.`);
    }));
  }

  results.push(run('Checkout no pagado · no pasa como PAID', () => {
    expectError(() => verifySumUpCheckoutForPreventa({
      webhookCheckoutId: checkoutId,
      checkout: { ...validSingle, status: 'PENDING' },
      expectedMerchantCode: merchantCode,
    }), 'CHECKOUT_NOT_PAID');
  }));

  results.push(run('Merchant distinto · se rechaza', () => {
    expectError(() => verifySumUpCheckoutStateForPreventa({
      webhookCheckoutId: checkoutId,
      checkout: { ...validSingle, merchant_code: 'OTHER_MERCHANT' },
      expectedMerchantCode: merchantCode,
    }), 'MERCHANT_CODE_MISMATCH');
  }));

  results.push(run('Importe manipulado · se rechaza', () => {
    expectError(() => verifySumUpCheckoutStateForPreventa({
      webhookCheckoutId: checkoutId,
      checkout: { ...validSingle, amount: 1600 },
      expectedMerchantCode: merchantCode,
    }), 'CHECKOUT_AMOUNT_MISMATCH');
  }));

  results.push(run('Referencia ajena/corrupta · se rechaza', () => {
    expectError(() => verifySumUpCheckoutStateForPreventa({
      webhookCheckoutId: checkoutId,
      checkout: { ...validSingle, checkout_reference: 'OTHER-ORDER' },
      expectedMerchantCode: merchantCode,
    }), 'INVALID_CHECKOUT_REFERENCE');
  }));

  results.push(run('Evento desconocido · se rechaza', () => {
    expectError(() => parseSumUpWebhookPayload({ event_type: 'SOMETHING_ELSE', id: checkoutId }), 'UNSUPPORTED_EVENT_TYPE');
  }));

  return {
    ok: results.every((result) => result.ok),
    passed: results.filter((result) => result.ok).length,
    total: results.length,
    results,
  };
}
