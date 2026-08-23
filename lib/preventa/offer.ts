export type PreventaPaymentPlan = 'single' | 'split';

export const PREVENTA_OFFER = {
  code: 'GHC_FOUNDERS_2026',
  version: '2026-08-08',
  currency: 'EUR',
  founderPlaces: 100,
  founderPresaleClosesAt: '2026-10-01T23:59:59.999+02:00',
  founderPresaleCloseLabel: '1 de octubre de 2026 a las 23:59, hora de Madrid',
  openingDate: '2026-10-16',
  openingDateLabel: '16 de octubre de 2026',
  openingWindow: '16 de octubre de 2026',
  legalPackageVersion: 'GHC_ACADEMY_JURIDICO_PREVENTA_2026_APROBADO',
  termsVersion: 'PREVENTA_2026_TERMS_APPROVED_BASE',
  privacyVersion: 'PREVENTA_2026_PRIVACY_APPROVED_BASE',
  prices: {
    single: {
      totalAmountCents: 169000,
      installments: [169000] as const,
    },
    split: {
      totalAmountCents: 179000,
      installments: [89500, 89500] as const,
      secondInstallmentDaysAfterFirstPayment: 15,
    },
  },
} as const;

const founderCloseTimestamp = Date.parse(PREVENTA_OFFER.founderPresaleClosesAt);

export function isFounderPresaleOpen(now: Date = new Date()) {
  return Number.isFinite(founderCloseTimestamp) && now.getTime() <= founderCloseTimestamp;
}

export function isFounderPresaleClosed(now: Date = new Date()) {
  return !isFounderPresaleOpen(now);
}

export function getPreventaPrice(plan: PreventaPaymentPlan) {
  return PREVENTA_OFFER.prices[plan];
}

export function formatEuroCents(amountCents: number) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: PREVENTA_OFFER.currency,
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}
