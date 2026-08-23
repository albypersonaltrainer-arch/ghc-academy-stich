const sites = [
  { label: 'GHC Training', href: 'https://www.ghctraining.com', current: false },
  { label: 'GHC Academy', href: 'https://ghcacademy.net', current: true },
  { label: 'GHC Nutrition', href: 'https://www.ghcnutrition.com', current: false },
] as const;

export default function GHCEcosystemLinks() {
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
        paddingTop: 18,
        marginTop: 8,
        borderTop: '1px solid rgba(242,244,241,.10)',
      }}
    >
      <span
        style={{
          color: 'var(--ghc-green)',
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
            color: site.current ? 'var(--ghc-text)' : 'var(--ghc-muted)',
            fontSize: 13,
            fontWeight: site.current ? 900 : 750,
            textDecoration: 'none',
            borderBottom: site.current ? '1px solid var(--ghc-green)' : '1px solid transparent',
            paddingBottom: 3,
          }}
        >
          {site.label}
        </a>
      ))}
    </nav>
  );
}
