import React from 'react';

/**
 * AgroDesk brand logo.
 *
 * Variants:
 *  - icon      : tractor + chart mark only (square, for collapsed sidebar)
 *  - full      : official SVG logo on light backgrounds (sidebar expanded, login mobile)
 *  - full-dark : white wordmark version for dark/green panel backgrounds (login desktop)
 */

interface AgroDeskoLogoProps {
  variant?: 'icon' | 'full' | 'full-dark';
  /** Height in px; width scales proportionally */
  height?: number;
  className?: string;
}

// Brand colours
const GREEN = '#1C5E2D';
const GOLD  = '#C9A227';

/**
 * Tractor + rising chart mark — hand-crafted for use on dark backgrounds
 * (collapsed sidebar, favicon tile). Uses bright brand colours that
 * remain visible against the dark sidebar background.
 */
export const LogoMark: React.FC<{ height?: number; className?: string }> = ({
  height = 40,
  className,
}) => (
  <svg
    height={height}
    viewBox="0 0 120 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* ── Rear large wheel ─────────────────────────────────── */}
    <circle cx="38" cy="66" r="28" fill={GREEN} />
    <circle cx="38" cy="66" r="19" fill="none" stroke="white" strokeWidth="1.8" strokeOpacity="0.25" />
    <circle cx="38" cy="66" r="7" fill={GOLD} />
    <circle cx="38" cy="66" r="3" fill={GREEN} />

    {/* ── Front small wheel ─────────────────────────────────── */}
    <circle cx="84" cy="70" r="14" fill={GREEN} />
    <circle cx="84" cy="70" r="9"  fill="none" stroke="white" strokeWidth="1.5" strokeOpacity="0.25" />
    <circle cx="84" cy="70" r="4"  fill={GOLD} />
    <circle cx="84" cy="70" r="1.5" fill={GREEN} />

    {/* ── Chassis / frame ───────────────────────────────────── */}
    <rect x="36" y="44" width="50" height="6"  rx="3" fill={GREEN} />
    <path d="M14,48 Q14,26 38,26 Q52,26 52,48 Z" fill={GREEN} />
    <rect x="52" y="38" width="30" height="12" rx="3" fill={GREEN} />
    <rect x="53" y="22" width="6"  height="18" rx="3" fill={GREEN} />

    {/* ── Cabin ─────────────────────────────────────────────── */}
    <rect x="28" y="16" width="26" height="22" rx="3" fill={GREEN} />
    <rect x="32" y="20" width="18" height="13" rx="2" fill="white" fillOpacity="0.18" />

    {/* ── Rising chart line (gold) ───────────────────────────── */}
    <path
      d="M 8,80 L 28,62 L 52,50 L 74,34 L 90,18"
      stroke={GOLD}
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <polygon points="90,18 76,22 80,30" fill={GOLD} />
  </svg>
);

/** Full horizontal logo using the official brand SVG */
const AgroDeskoLogo: React.FC<AgroDeskoLogoProps> = ({
  variant = 'full',
  height = 40,
  className,
}) => {
  if (variant === 'icon') {
    return <LogoMark height={height} className={className} />;
  }

  /* ── full-dark: white wordmark for dark/green login panel ── */
  if (variant === 'full-dark') {
    const iconH = height;
    const fontSize = height * 0.62;
    const gap = height * 0.18;
    const totalW = iconH + gap + fontSize * 4.55;

    return (
      <svg
        height={height}
        width={totalW}
        viewBox={`0 0 ${totalW} ${height}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        role="img"
        aria-label="AgroDesk"
      >
        {/* Tractor mark scaled to height, bright green/gold for visibility */}
        <g transform={`scale(${iconH / 100})`}>
          <circle cx="38" cy="66" r="28" fill="#4CAF6A" />
          <circle cx="38" cy="66" r="19" fill="none" stroke="white" strokeWidth="1.8" strokeOpacity="0.3" />
          <circle cx="38" cy="66" r="7" fill={GOLD} />
          <circle cx="38" cy="66" r="3" fill="#4CAF6A" />
          <circle cx="84" cy="70" r="14" fill="#4CAF6A" />
          <circle cx="84" cy="70" r="9"  fill="none" stroke="white" strokeWidth="1.5" strokeOpacity="0.3" />
          <circle cx="84" cy="70" r="4"  fill={GOLD} />
          <circle cx="84" cy="70" r="1.5" fill="#4CAF6A" />
          <rect x="36" y="44" width="50" height="6" rx="3" fill="#4CAF6A" />
          <path d="M14,48 Q14,26 38,26 Q52,26 52,48 Z" fill="#4CAF6A" />
          <rect x="52" y="38" width="30" height="12" rx="3" fill="#4CAF6A" />
          <rect x="53" y="22" width="6"  height="18" rx="3" fill="#4CAF6A" />
          <rect x="28" y="16" width="26" height="22" rx="3" fill="#4CAF6A" />
          <rect x="32" y="20" width="18" height="13" rx="2" fill="white" fillOpacity="0.2" />
          <path d="M 8,80 L 28,62 L 52,50 L 74,34 L 90,18"
            stroke={GOLD} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <polygon points="90,18 76,22 80,30" fill={GOLD} />
        </g>

        {/* "Agro" in white */}
        <text
          x={iconH + gap}
          y={height * 0.72}
          fontFamily="'Inter', 'DM Sans', system-ui, sans-serif"
          fontWeight="800"
          fontSize={fontSize}
          letterSpacing="-0.5"
          fill="rgba(255,255,255,0.95)"
        >
          Agro
        </text>
        {/* "Desk" in gold */}
        <text
          x={iconH + gap + fontSize * 2.52}
          y={height * 0.72}
          fontFamily="'Inter', 'DM Sans', system-ui, sans-serif"
          fontWeight="800"
          fontSize={fontSize}
          letterSpacing="-0.5"
          fill={GOLD}
        >
          Desk
        </text>
      </svg>
    );
  }

  /* ── full: official brand SVG via <img> for light backgrounds ── */
  return (
    <img
      src="/logo.svg"
      alt="AgroDesk"
      height={height}
      style={{ display: 'block', width: 'auto', height }}
      className={className}
    />
  );
};

export default AgroDeskoLogo;
