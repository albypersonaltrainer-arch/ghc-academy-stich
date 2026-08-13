type GHCLogoProps = {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  tagline?: boolean;
};

export default function GHCLogo({
  size = 'md',
  showText = true,
  tagline = true,
}: GHCLogoProps) {
  const sizes = {
    sm: {
      mark: 34,
      title: 15,
      subtitle: 8,
      gap: 10,
    },
    md: {
      mark: 44,
      title: 19,
      subtitle: 9,
      gap: 13,
    },
    lg: {
      mark: 64,
      title: 30,
      subtitle: 12,
      gap: 18,
    },
  };

  const current = sizes[size];

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: current.gap,
        color: '#F2F4F1',
      }}
    >
      <style>{`
        .conversion-authority-stat {
          position: relative !important;
          min-height: 440px !important;
          overflow: hidden !important;
          border-radius: 26px !important;
          border: 1px solid rgba(34, 214, 91, 0.28) !important;
          background-image:
            linear-gradient(180deg, rgba(3,4,3,0.02) 44%, rgba(3,4,3,0.86) 100%),
            url('/images/alby-ghc-academy-founder.jpg') !important;
          background-size: cover !important;
          background-position: center top !important;
          background-repeat: no-repeat !important;
          box-shadow: 0 24px 70px rgba(0,0,0,0.28) !important;
        }
        .conversion-authority-stat > div {
          position: absolute !important;
          left: 18px !important;
          right: 18px !important;
          bottom: 18px !important;
          z-index: 2 !important;
          display: flex !important;
          align-items: baseline !important;
          gap: 10px !important;
          padding: 14px 16px !important;
          border-radius: 14px !important;
          border: 1px solid rgba(255,255,255,0.12) !important;
          background: rgba(7,11,8,0.76) !important;
          backdrop-filter: blur(10px) !important;
        }
        .conversion-authority-stat > div strong {
          font-size: 28px !important;
          color: #22D65B !important;
          line-height: 1 !important;
        }
        .conversion-authority-stat > div span {
          color: rgba(242,244,241,0.82) !important;
          font-size: 12px !important;
          text-transform: uppercase !important;
          letter-spacing: 0.08em !important;
        }
      `}</style>

      <div
        style={{
          width: current.mark,
          height: current.mark,
          position: 'relative',
          display: 'grid',
          placeItems: 'center',
          borderRadius: Math.round(current.mark * 0.28),
          background:
            'linear-gradient(145deg, rgba(255,255,255,0.16), rgba(34,214,91,0.12)), #080B0A',
          border: '1px solid rgba(255,255,255,0.20)',
          boxShadow: '0 0 34px rgba(34,214,91,0.14)',
          overflow: 'hidden',
        }}
      >
        <svg
          width={Math.round(current.mark * 0.72)}
          height={Math.round(current.mark * 0.72)}
          viewBox="0 0 100 100"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M50 5L88.97 27.5V72.5L50 95L11.03 72.5V27.5L50 5Z"
            stroke="url(#outerGradient)"
            strokeWidth="9"
            strokeLinejoin="round"
          />

          <path
            d="M50 24L73 37.5V62.5L50 76L27 62.5V37.5L50 24Z"
            stroke="rgba(242,244,241,0.82)"
            strokeWidth="8"
            strokeLinejoin="round"
          />

          <path
            d="M50 24L73 37.5V62.5L50 76"
            stroke="#22D65B"
            strokeWidth="8"
            strokeLinejoin="round"
          />

          <path
            d="M50 50H72"
            stroke="#22D65B"
            strokeWidth="9"
            strokeLinecap="round"
          />

          <path
            d="M50 50H63"
            stroke="rgba(242,244,241,0.72)"
            strokeWidth="5"
            strokeLinecap="round"
          />

          <defs>
            <linearGradient
              id="outerGradient"
              x1="18"
              y1="10"
              x2="84"
              y2="92"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#F2F4F1" stopOpacity="0.96" />
              <stop offset="0.48" stopColor="#8A8F98" stopOpacity="0.70" />
              <stop offset="1" stopColor="#22D65B" stopOpacity="0.95" />
            </linearGradient>
          </defs>
        </svg>

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 70% 72%, rgba(34,214,91,0.22), transparent 42%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {showText && (
        <div
          style={{
            display: 'grid',
            gap: size === 'lg' ? 5 : 2,
            lineHeight: 1,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: size === 'lg' ? 13 : 8,
            }}
          >
            <span
              style={{
                fontSize: current.title,
                fontWeight: 950,
                letterSpacing: '0.18em',
                color: '#F2F4F1',
              }}
            >
              GHC
            </span>

            <span
              style={{
                fontSize: Math.round(current.title * 0.82),
                fontWeight: 500,
                letterSpacing: '0.34em',
                color: 'rgba(242,244,241,0.72)',
              }}
            >
              ACADEMY
            </span>
          </div>

          {tagline && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
              }}
            >
              <span
                style={{
                  width: size === 'lg' ? 54 : 36,
                  height: 1,
                  background: '#22D65B',
                  opacity: 0.85,
                }}
              />

              <span
                style={{
                  fontSize: current.subtitle,
                  fontWeight: 900,
                  letterSpacing: '0.32em',
                  color: '#22D65B',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}
              >
                Sport Through Science
              </span>

              <span
                style={{
                  width: size === 'lg' ? 54 : 36,
                  height: 1,
                  background: '#22D65B',
                  opacity: 0.85,
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
