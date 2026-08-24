'use client';

import { usePathname } from 'next/navigation';

const sites = [
  { label: 'GHC Training', href: 'https://www.ghctraining.com', current: false },
  { label: 'GHC Academy', href: 'https://ghcacademy.net', current: true },
  { label: 'GHC Nutrition', href: 'https://www.ghcnutrition.com', current: false },
] as const;

type GHCEcosystemLinksProps = {
  hideOnPreventa?: boolean;
};

export default function GHCEcosystemLinks({ hideOnPreventa = false }: GHCEcosystemLinksProps) {
  const pathname = usePathname();

  if (hideOnPreventa && pathname === '/preventa') {
    return null;
  }

  return (
    <nav
      aria-label="Ecosistema GHC"
      style={{
        gridColumn: '1 / -1',
        width: '100%',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px 22px',
        padding: '18px 22px 20px',
        marginTop: 8,
        borderTop: '1px solid rgba(242,244,241,.10)',
        background: 'var(--ghc-bg-soft, #080B0A)',
      }}
    >
      <span
        style={{
          color: 'var(--ghc-green, #22D65B)',
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: '.18em',
          textTransform: 'uppercase',
        }}
      >
        Ecosistema GHC
      </span>
      {sites.map((site) => (
        <a
          key={site.href}
          href={site.href}
          aria-current={site.current ? 'page' : undefined}
          style={{
            color: site.current
              ? 'var(--ghc-text, #F2F4F1)'
              : 'var(--ghc-muted, rgba(242,244,241,.66))',
            fontSize: 13,
            fontWeight: site.current ? 900 : 750,
            textDecoration: 'none',
            borderBottom: site.current
              ? '1px solid var(--ghc-green, #22D65B)'
              : '1px solid transparent',
            paddingBottom: 3,
          }}
        >
          {site.label}
        </a>
      ))}
    </nav>
  );
}
