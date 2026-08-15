const fs = require('node:fs');
const path = require('node:path');

function loadPreventaLivePublicConfig() {
  if (process.env.VERCEL_ENV !== 'production') return null;

  const configPath = path.join(__dirname, '.preventa-live-public.json');
  if (!fs.existsSync(configPath)) {
    throw new Error('PREVENTA_LIVE_PUBLIC_CONFIG_NOT_GENERATED');
  }

  const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (parsed?.publicBaseUrl !== 'https://ghcacademy.net') {
    throw new Error('PREVENTA_LIVE_PUBLIC_CONFIG_INVALID');
  }

  return parsed;
}

const preventaLive = loadPreventaLivePublicConfig();
const legal = preventaLive?.legalReady ? preventaLive.legal : null;
const verifiedMerchantCode = preventaLive?.merchantLiveVerified ? preventaLive.merchantCode : null;

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'"
  }
];

const privateNoStoreHeaders = [
  { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
  { key: 'Pragma', value: 'no-cache' }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/ghc-control-center/:path*', headers: privateNoStoreHeaders },
      { source: '/alumno/:path*', headers: privateNoStoreHeaders },
      { source: '/cursos/:path*', headers: privateNoStoreHeaders }
    ];
  },
  env: preventaLive
    ? {
        PREVENTA_PUBLIC_BASE_URL: preventaLive.publicBaseUrl,
        PREVENTA_SUMUP_LIVE_VERIFIED: preventaLive.sumupLiveVerified ? 'true' : 'false',
        PREVENTA_LEGAL_READY: preventaLive.legalReady ? 'true' : 'false',
        ...(verifiedMerchantCode
          ? {
              SUMUP_MERCHANT_CODE: verifiedMerchantCode,
            }
          : {}),
        ...(legal
          ? {
              NEXT_PUBLIC_GHC_LEGAL_NAME: legal.owner,
              NEXT_PUBLIC_GHC_LEGAL_TAX_ID: legal.taxId,
              NEXT_PUBLIC_GHC_LEGAL_ADDRESS: legal.address,
              NEXT_PUBLIC_GHC_LEGAL_EMAIL: legal.email,
            }
          : {}),
      }
    : {},
};

module.exports = nextConfig;
