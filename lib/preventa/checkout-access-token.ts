import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const TOKEN_VERSION = 'v1';
const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60;
const MAX_TOKEN_LENGTH = 768;

type TokenPayload = {
  o: string;
  i: 1 | 2;
  e: number;
  n: string;
};

export type CheckoutAccessTokenStatus = {
  configured: boolean;
};

export class CheckoutAccessTokenError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'CheckoutAccessTokenError';
  }
}

function getSecret() {
  return (process.env.PREVENTA_CHECKOUT_TOKEN_SECRET || '').trim();
}

export function getCheckoutAccessTokenStatus(): CheckoutAccessTokenStatus {
  return { configured: getSecret().length >= 32 };
}

function requireSecret() {
  const secret = getSecret();
  if (secret.length < 32) {
    throw new CheckoutAccessTokenError(
      'CHECKOUT_TOKEN_SECRET_NOT_CONFIGURED',
      'PREVENTA_CHECKOUT_TOKEN_SECRET debe tener al menos 32 caracteres.'
    );
  }
  return secret;
}

function signPayload(encodedPayload: string, secret: string) {
  return createHmac('sha256', secret)
    .update(`${TOKEN_VERSION}.${encodedPayload}`)
    .digest('base64url');
}

function safeEqual(left: string, right: string) {
  try {
    const a = Buffer.from(left, 'base64url');
    const b = Buffer.from(right, 'base64url');
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function assertOrderReference(value: string) {
  const reference = value.trim();
  if (!/^GHC-[A-Z0-9]{8}$/.test(reference)) {
    throw new CheckoutAccessTokenError('INVALID_ORDER_REFERENCE', 'Referencia de matrícula no válida.');
  }
  return reference;
}

export function issueCheckoutAccessToken(input: {
  orderReference: string;
  installmentNo: 1 | 2;
  ttlSeconds?: number;
}) {
  const secret = requireSecret();
  const orderReference = assertOrderReference(input.orderReference);
  const ttlSeconds = Math.max(300, Math.min(input.ttlSeconds ?? DEFAULT_TTL_SECONDS, 30 * 24 * 60 * 60));

  const payload: TokenPayload = {
    o: orderReference,
    i: input.installmentNo,
    e: Math.floor(Date.now() / 1000) + ttlSeconds,
    n: randomBytes(16).toString('base64url'),
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = signPayload(encodedPayload, secret);
  return `${TOKEN_VERSION}.${encodedPayload}.${signature}`;
}

export function verifyCheckoutAccessToken(input: {
  token: string;
  orderReference: string;
  installmentNo: 1 | 2;
}) {
  const secret = requireSecret();
  const token = input.token.trim();
  const expectedOrderReference = assertOrderReference(input.orderReference);

  if (!token || token.length > MAX_TOKEN_LENGTH) {
    throw new CheckoutAccessTokenError('INVALID_CHECKOUT_TOKEN', 'Token de checkout no válido.');
  }

  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) {
    throw new CheckoutAccessTokenError('INVALID_CHECKOUT_TOKEN', 'Formato de token de checkout no válido.');
  }

  const [, encodedPayload, suppliedSignature] = parts;
  const expectedSignature = signPayload(encodedPayload, secret);
  if (!safeEqual(suppliedSignature, expectedSignature)) {
    throw new CheckoutAccessTokenError('INVALID_CHECKOUT_TOKEN_SIGNATURE', 'Firma de token no válida.');
  }

  let payload: TokenPayload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as TokenPayload;
  } catch {
    throw new CheckoutAccessTokenError('INVALID_CHECKOUT_TOKEN_PAYLOAD', 'Payload de token no válido.');
  }

  if (
    payload.o !== expectedOrderReference ||
    payload.i !== input.installmentNo ||
    !Number.isInteger(payload.e) ||
    typeof payload.n !== 'string' ||
    payload.n.length < 16
  ) {
    throw new CheckoutAccessTokenError('CHECKOUT_TOKEN_SCOPE_MISMATCH', 'El token no corresponde a esta matrícula/cuota.');
  }

  if (payload.e < Math.floor(Date.now() / 1000)) {
    throw new CheckoutAccessTokenError('CHECKOUT_TOKEN_EXPIRED', 'El token de checkout ha caducado.');
  }

  return {
    orderReference: payload.o,
    installmentNo: payload.i,
    expiresAt: new Date(payload.e * 1000).toISOString(),
  };
}
