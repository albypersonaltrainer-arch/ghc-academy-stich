import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const TOKEN_VERSION = 'matricula-v1';
const DEFAULT_TTL_SECONDS = 180 * 24 * 60 * 60;
const MAX_TTL_SECONDS = 365 * 24 * 60 * 60;
const MAX_TOKEN_LENGTH = 768;

type TokenPayload = {
  o: string;
  e: number;
  n: string;
  p: 'matricula-status';
};

export class MatriculaAccessTokenError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'MatriculaAccessTokenError';
  }
}

function getSecret() {
  return (process.env.PREVENTA_CHECKOUT_TOKEN_SECRET || '').trim();
}

function requireSecret() {
  const secret = getSecret();
  if (secret.length < 32) {
    throw new MatriculaAccessTokenError(
      'MATRICULA_TOKEN_SECRET_NOT_CONFIGURED',
      'No está configurada la clave de acceso seguro a matrícula.'
    );
  }
  return secret;
}

function assertOrderReference(value: string) {
  const reference = value.trim();
  if (!/^GHC-[A-Z0-9]{8}$/.test(reference)) {
    throw new MatriculaAccessTokenError('INVALID_ORDER_REFERENCE', 'Referencia de matrícula no válida.');
  }
  return reference;
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

export function issueMatriculaAccessToken(input: {
  orderReference: string;
  ttlSeconds?: number;
}) {
  const secret = requireSecret();
  const orderReference = assertOrderReference(input.orderReference);
  const ttlSeconds = Math.max(
    24 * 60 * 60,
    Math.min(input.ttlSeconds ?? DEFAULT_TTL_SECONDS, MAX_TTL_SECONDS)
  );

  const payload: TokenPayload = {
    o: orderReference,
    e: Math.floor(Date.now() / 1000) + ttlSeconds,
    n: randomBytes(16).toString('base64url'),
    p: 'matricula-status',
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = signPayload(encodedPayload, secret);
  return `${TOKEN_VERSION}.${encodedPayload}.${signature}`;
}

export function verifyMatriculaAccessToken(input: {
  token: string;
  orderReference: string;
}) {
  const secret = requireSecret();
  const expectedOrderReference = assertOrderReference(input.orderReference);
  const token = input.token.trim();

  if (!token || token.length > MAX_TOKEN_LENGTH) {
    throw new MatriculaAccessTokenError('INVALID_MATRICULA_TOKEN', 'Token de matrícula no válido.');
  }

  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) {
    throw new MatriculaAccessTokenError('INVALID_MATRICULA_TOKEN', 'Formato de token no válido.');
  }

  const [, encodedPayload, suppliedSignature] = parts;
  const expectedSignature = signPayload(encodedPayload, secret);
  if (!safeEqual(suppliedSignature, expectedSignature)) {
    throw new MatriculaAccessTokenError('INVALID_MATRICULA_TOKEN_SIGNATURE', 'Firma de token no válida.');
  }

  let payload: TokenPayload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as TokenPayload;
  } catch {
    throw new MatriculaAccessTokenError('INVALID_MATRICULA_TOKEN_PAYLOAD', 'Payload de token no válido.');
  }

  if (
    payload.o !== expectedOrderReference ||
    payload.p !== 'matricula-status' ||
    !Number.isInteger(payload.e) ||
    typeof payload.n !== 'string' ||
    payload.n.length < 16
  ) {
    throw new MatriculaAccessTokenError('MATRICULA_TOKEN_SCOPE_MISMATCH', 'El token no corresponde a esta matrícula.');
  }

  if (payload.e < Math.floor(Date.now() / 1000)) {
    throw new MatriculaAccessTokenError('MATRICULA_TOKEN_EXPIRED', 'El enlace de matrícula ha caducado.');
  }

  return {
    orderReference: payload.o,
    expiresAt: new Date(payload.e * 1000).toISOString(),
  };
}
