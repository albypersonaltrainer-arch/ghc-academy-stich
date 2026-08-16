import 'server-only';
import { createPublicKey, verify } from 'node:crypto';

const GITHUB_OIDC_ISSUER = 'https://token.actions.githubusercontent.com';
const GITHUB_OIDC_JWKS_URL = 'https://token.actions.githubusercontent.com/.well-known/jwks';
export const PREVENTA_CRON_OIDC_AUDIENCE = 'https://ghcacademy.net/api/preventa/cron';

const EXPECTED_REPOSITORY = 'albypersonaltrainer-arch/ghc-academy-stich';
const EXPECTED_REPOSITORY_ID = '1224335598';
const EXPECTED_REPOSITORY_OWNER_ID = '274641381';
const EXPECTED_REF = 'refs/heads/main';
const EXPECTED_SUBJECT = `repo:${EXPECTED_REPOSITORY}:ref:${EXPECTED_REF}`;
const EXPECTED_WORKFLOW_REF = `${EXPECTED_REPOSITORY}/.github/workflows/preventa-scheduled-maintenance.yml@refs/heads/main`;
const ALLOWED_EVENTS = new Set(['schedule', 'workflow_dispatch']);
const CLOCK_SKEW_SECONDS = 60;
const MAX_TOKEN_AGE_SECONDS = 15 * 60;
const JWKS_CACHE_MS = 10 * 60 * 1000;

type JwtHeader = {
  alg?: unknown;
  typ?: unknown;
  kid?: unknown;
};

type JwtPayload = {
  iss?: unknown;
  aud?: unknown;
  sub?: unknown;
  exp?: unknown;
  nbf?: unknown;
  iat?: unknown;
  repository?: unknown;
  repository_id?: unknown;
  repository_owner_id?: unknown;
  ref?: unknown;
  ref_type?: unknown;
  workflow_ref?: unknown;
  event_name?: unknown;
};

type GithubJwk = JsonWebKey & {
  kid?: string;
  alg?: string;
  use?: string;
};

type GithubJwks = {
  keys?: GithubJwk[];
};

let jwksCache: { keys: GithubJwk[]; expiresAt: number } | null = null;

function decodeJsonSegment<T>(segment: string): T | null {
  try {
    const json = Buffer.from(segment, 'base64url').toString('utf8');
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

function stringClaim(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function numericClaim(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function audienceMatches(value: unknown) {
  if (typeof value === 'string') return value === PREVENTA_CRON_OIDC_AUDIENCE;
  if (Array.isArray(value)) {
    return value.length === 1 && value[0] === PREVENTA_CRON_OIDC_AUDIENCE;
  }
  return false;
}

function validateClaims(payload: JwtPayload) {
  const now = Math.floor(Date.now() / 1000);
  const exp = numericClaim(payload.exp);
  const nbf = numericClaim(payload.nbf);
  const iat = numericClaim(payload.iat);

  if (stringClaim(payload.iss) !== GITHUB_OIDC_ISSUER) return false;
  if (!audienceMatches(payload.aud)) return false;
  if (stringClaim(payload.sub) !== EXPECTED_SUBJECT) return false;
  if (stringClaim(payload.repository) !== EXPECTED_REPOSITORY) return false;
  if (String(payload.repository_id ?? '') !== EXPECTED_REPOSITORY_ID) return false;
  if (String(payload.repository_owner_id ?? '') !== EXPECTED_REPOSITORY_OWNER_ID) return false;
  if (stringClaim(payload.ref) !== EXPECTED_REF) return false;
  if (stringClaim(payload.ref_type) !== 'branch') return false;
  if (stringClaim(payload.workflow_ref) !== EXPECTED_WORKFLOW_REF) return false;
  if (!ALLOWED_EVENTS.has(stringClaim(payload.event_name))) return false;

  if (exp === null || iat === null) return false;
  if (exp < now - CLOCK_SKEW_SECONDS) return false;
  if (iat > now + CLOCK_SKEW_SECONDS) return false;
  if (nbf !== null && nbf > now + CLOCK_SKEW_SECONDS) return false;
  if (exp - iat > MAX_TOKEN_AGE_SECONDS) return false;
  if (now - iat > MAX_TOKEN_AGE_SECONDS + CLOCK_SKEW_SECONDS) return false;

  return true;
}

async function fetchJwks(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && jwksCache && jwksCache.expiresAt > now) return jwksCache.keys;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(GITHUB_OIDC_JWKS_URL, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) return [];

    const body = (await response.json().catch(() => null)) as GithubJwks | null;
    const keys = Array.isArray(body?.keys)
      ? body!.keys.filter(
          (key) =>
            key &&
            key.kty === 'RSA' &&
            typeof key.kid === 'string' &&
            key.kid.length > 0 &&
            (!key.alg || key.alg === 'RS256') &&
            (!key.use || key.use === 'sig')
        )
      : [];

    if (keys.length > 0) {
      jwksCache = { keys, expiresAt: now + JWKS_CACHE_MS };
    }
    return keys;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveSigningKey(kid: string) {
  let keys = await fetchJwks(false);
  let key = keys.find((candidate) => candidate.kid === kid);
  if (key) return key;

  // GitHub can rotate signing keys. Refresh once when the JWT references a new kid.
  keys = await fetchJwks(true);
  key = keys.find((candidate) => candidate.kid === kid);
  return key || null;
}

export async function verifyGithubActionsCronOidcToken(token: string) {
  if (!token || token.length < 100 || token.length > 16_384) return false;

  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  if (!encodedHeader || !encodedPayload || !encodedSignature) return false;

  const header = decodeJsonSegment<JwtHeader>(encodedHeader);
  const payload = decodeJsonSegment<JwtPayload>(encodedPayload);
  if (!header || !payload) return false;

  if (header.alg !== 'RS256') return false;
  if (header.typ !== undefined && header.typ !== 'JWT') return false;
  const kid = stringClaim(header.kid);
  if (!kid || kid.length > 256) return false;
  if (!validateClaims(payload)) return false;

  const jwk = await resolveSigningKey(kid);
  if (!jwk) return false;

  try {
    const publicKey = createPublicKey({ key: jwk, format: 'jwk' });
    const signature = Buffer.from(encodedSignature, 'base64url');
    if (signature.length === 0) return false;

    return verify(
      'RSA-SHA256',
      Buffer.from(`${encodedHeader}.${encodedPayload}`, 'utf8'),
      publicKey,
      signature
    );
  } catch {
    return false;
  }
}
