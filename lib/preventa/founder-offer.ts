export const FOUNDER_PREVENTA_CLOSE_AT = '2026-10-01T23:59:59.999+02:00';
export const FOUNDER_PREVENTA_CLOSE_LABEL = '1 de octubre de 2026 a las 23:59, hora de Madrid';
export const FOUNDER_OPENING_DATE_LABEL = '16 de octubre de 2026';

const founderCloseTimestamp = Date.parse(FOUNDER_PREVENTA_CLOSE_AT);

export function isFounderPresaleOpen(now: Date = new Date()) {
  return Number.isFinite(founderCloseTimestamp) && now.getTime() <= founderCloseTimestamp;
}

export function isFounderPresaleClosed(now: Date = new Date()) {
  return !isFounderPresaleOpen(now);
}
