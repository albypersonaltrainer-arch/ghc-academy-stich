import { PREVENTA_OFFER, PreventaPaymentPlan, getPreventaPrice } from './offer';

export type PreviewOrderInput = {
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  country?: unknown;
  phone?: unknown;
  taxId?: unknown;
  paymentPlan?: unknown;
  acceptedTerms?: unknown;
  acknowledgedPrivateTraining?: unknown;
  marketingConsent?: unknown;
  attribution?: {
    sourceChannel?: unknown;
    sourceDetail?: unknown;
    campaignCode?: unknown;
    closerCode?: unknown;
  } | null;
};

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function cleanOptionalText(value: unknown, maxLength: number) {
  const text = cleanText(value, maxLength);
  return text || null;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isPaymentPlan(value: unknown): value is PreventaPaymentPlan {
  return value === 'single' || value === 'split';
}

export function validatePreviewOrderInput(input: PreviewOrderInput) {
  const errors: string[] = [];

  const firstName = cleanText(input.firstName, 80);
  const lastName = cleanText(input.lastName, 120);
  const email = cleanText(input.email, 254).toLowerCase();
  const country = cleanText(input.country, 80);
  const phone = cleanOptionalText(input.phone, 40);
  const taxId = cleanOptionalText(input.taxId, 80);

  if (!firstName) errors.push('Nombre obligatorio.');
  if (!lastName) errors.push('Apellidos obligatorios.');
  if (!email || !isValidEmail(email)) errors.push('Correo electrónico no válido.');
  if (!country) errors.push('País de residencia obligatorio.');
  if (!isPaymentPlan(input.paymentPlan)) errors.push('Modalidad de pago no válida.');
  if (input.acceptedTerms !== true) errors.push('Debes aceptar las condiciones de contratación.');
  if (input.acknowledgedPrivateTraining !== true) {
    errors.push('Debes confirmar la naturaleza privada de la formación.');
  }

  const paymentPlan = isPaymentPlan(input.paymentPlan) ? input.paymentPlan : 'single';
  const price = getPreventaPrice(paymentPlan);

  const attribution = {
    sourceChannel: cleanOptionalText(input.attribution?.sourceChannel, 80),
    sourceDetail: cleanOptionalText(input.attribution?.sourceDetail, 160),
    campaignCode: cleanOptionalText(input.attribution?.campaignCode, 80),
    closerCode: cleanOptionalText(input.attribution?.closerCode, 80),
  };

  return {
    ok: errors.length === 0,
    errors,
    data: {
      firstName,
      lastName,
      email,
      country,
      phone,
      taxId,
      paymentPlan,
      totalAmountCents: price.totalAmountCents,
      firstInstallmentCents: price.installments[0],
      secondInstallmentCents: paymentPlan === 'split' ? price.installments[1] : 0,
      secondDueAt: null,
      acceptedTerms: input.acceptedTerms === true,
      acknowledgedPrivateTraining: input.acknowledgedPrivateTraining === true,
      marketingConsent: input.marketingConsent === true,
      attribution,
      offerCode: PREVENTA_OFFER.code,
      offerVersion: PREVENTA_OFFER.version,
      termsVersion: PREVENTA_OFFER.termsVersion,
      privacyVersion: PREVENTA_OFFER.privacyVersion,
      legalPackageVersion: PREVENTA_OFFER.legalPackageVersion,
    },
  };
}
