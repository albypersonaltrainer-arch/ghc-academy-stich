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

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: preventaLive
    ? {
        PREVENTA_PUBLIC_BASE_URL: preventaLive.publicBaseUrl,
        PREVENTA_SUMUP_LIVE_VERIFIED: preventaLive.sumupLiveVerified ? 'true' : 'false',
        PREVENTA_LEGAL_READY: preventaLive.legalReady ? 'true' : 'false',
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
