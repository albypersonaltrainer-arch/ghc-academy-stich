const fs = require('node:fs');
const path = require('node:path');

function loadPreventaLivePublicConfig() {
  if (process.env.VERCEL_ENV !== 'production') return null;

  const configPath = path.join(__dirname, '.preventa-live-public.json');
  if (!fs.existsSync(configPath)) {
    throw new Error('PREVENTA_LIVE_PUBLIC_CONFIG_NOT_GENERATED');
  }

  const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const legal = parsed?.legal || {};

  const valid =
    parsed?.publicBaseUrl === 'https://ghcacademy.net' &&
    typeof legal.owner === 'string' && legal.owner.trim().length >= 3 &&
    typeof legal.taxId === 'string' && legal.taxId.trim().length >= 5 &&
    typeof legal.address === 'string' && legal.address.trim().length >= 8 &&
    typeof legal.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(legal.email.trim());

  if (!valid) {
    throw new Error('PREVENTA_LIVE_PUBLIC_CONFIG_INVALID');
  }

  return parsed;
}

const preventaLive = loadPreventaLivePublicConfig();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: preventaLive
    ? {
        PREVENTA_PUBLIC_BASE_URL: preventaLive.publicBaseUrl,
        NEXT_PUBLIC_GHC_LEGAL_NAME: preventaLive.legal.owner,
        NEXT_PUBLIC_GHC_LEGAL_TAX_ID: preventaLive.legal.taxId,
        NEXT_PUBLIC_GHC_LEGAL_ADDRESS: preventaLive.legal.address,
        NEXT_PUBLIC_GHC_LEGAL_EMAIL: preventaLive.legal.email,
      }
    : {},
};

module.exports = nextConfig;
