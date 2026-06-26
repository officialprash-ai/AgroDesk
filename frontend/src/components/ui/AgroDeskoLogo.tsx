import React from 'react';

/**
 * AgroDesk brand logo — faithful SVG recreation of the official mark.
 *
 * Variants:
 *  - icon   : tractor + chart mark only (square, for collapsed sidebar / favicon)
 *  - full   : mark + "AgroDesk" wordmark (horizontal, for expanded sidebar / login)
 *  - full-dark : same but wordmark colours forced to work on dark backgrounds
 */

interface AgroDeskoLogoProps {
  variant?: 'icon' | 'full' | 'full-dark';
  /** Height in px; width scales proportionally */
  height?: number;
  className?: string;
}

// Brand colours extracted from the uploaded logo
const GREEN  = '#1C5E2D'; // tractor body + "Agro"
const GOLD   = '#C9A227'; // chart line + hub accent
const NAVY   = '#2D3A4A'; // "Desk" letterform

/** The tractor + rising chart mark — viewBox 0 0 120 100 */
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
    {/* rim detail */}
    <circle cx="38" cy="66" r="19" fill="none" stroke="white" strokeWidth="1.8" strokeOpacity="0.25" />
    {/* hub – gold accent matching chart */}
    <circle cx="38" cy="66" r="7" fill={GOLD} />
    <circle cx="38" cy="66" r="3" fill={GREEN} />

    {/* ── Front small wheel ─────────────────────────────────── */}
    <circle cx="84" cy="70" r="14" fill={GREEN} />
    <circle cx="84" cy="70" r="9"  fill="none" stroke="white" strokeWidth="1.5" strokeOpacity="0.25" />
    <circle cx="84" cy="70" r="4"  fill={GOLD} />
    <circle cx="84" cy="70" r="1.5" fill={GREEN} />

    {/* ── Chassis / frame ───────────────────────────────────── */}
    {/* axle beam */}
    <rect x="36" y="44" width="50" height="6"  rx="3" fill={GREEN} />
    {/* rear fender arch over big wheel */}
    <path d="M14,48 Q14,26 38,26 Q52,26 52,48 Z" fill={GREEN} />
    {/* hood / bonnet */}
    <rect x="52" y="38" width="30" height="12" rx="3" fill={GREEN} />
    {/* exhaust stack */}
    <rect x="53" y="22" width="6"  height="18" rx="3" fill={GREEN} />

    {/* ── Cabin ─────────────────────────────────────────────── */}
    <rect x="28" y="16" width="26" height="22" rx="3" fill={GREEN} />
    {/* window */}
    <rect x="32" y="20" width="18" height="13" rx="2" fill="white" fillOpacity="0.18" />

    {/* ── Rising chart line (gold) ───────────────────────────── */}
    {/* smooth upward trend from bottom-left to top-right */}
    <path
      d="M 8,80 L 28,62 L 52,50 L 74,34 L 90,18"
      stroke={GOLD}
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    {/* arrow head */}
    <polygon
      points="90,18 76,22 80,30"
      fill={GOLD}
    />
  </svg>
);

/** Full horizontal logo: mark + "AgroDesk" wordmark */
const AgroDeskoLogo: React.FC<AgroDeskoLogoProps> = ({
  variant = 'full',
  height = 40,
  className,
}) => {
  if (variant === 'icon') {
    return <LogoMark height={height} className={className} />;
  }

  const isDark = variant === 'full-dark';
  const textHeight = height;
  const markHeight = height;

  // "Agro" in brand green, "Desk" in navy (or white for dark bg)
  const agroColor = GREEN;
  const deskColor = isDark ? '#E8EDF2' : NAVY;

  const fontSize = textHeight * 0.6;

  return (
    <svg
      height={height}
      viewBox={`0 0 ${height * 6.5} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="AgroDesk"
    >
      {/* Mark scaled to fill height */}
      <g transform={`scale(${markHeight / 100})`}>
        {/* Rear large wheel */}
        <circle cx="38" cy="66" r="28" fill={GREEN} />
        <circle cx="38" cy="66" r="19" fill="none" stroke="white" strokeWidth="1.8" strokeOpacity="0.22" />
        <circle cx="38" cy="66" r="7"  fill={GOLD} />
        <circle cx="38" cy="66" r="3"  fill={GREEN} />
        {/* Front small wheel */}
        <circle cx="84" cy="70" r="14" fill={GREEN} />
        <circle cx="84" cy="70" r="9"  fill="none" stroke="white" strokeWidth="1.5" strokeOpacity="0.22" />
        <circle cx="84" cy="70" r="4"  fill={GOLD} />
        <circle cx="84" cy="70" r="1.5" fill={GREEN} />
        {/* Chassis */}
        <rect x="36" y="44" width="50" height="6"  rx="3" fill={GREEN} />
        <path d="M14,48 Q14,26 38,26 Q52,26 52,48 Z" fill={GREEN} />
        <rect x="52" y="38" width="30" height="12" rx="3" fill={GREEN} />
        <rect x="53" y="22" width="6"  height="18" rx="3" fill={GREEN} />
        {/* Cabin */}
        <rect x="28" y="16" width="26" height="22" rx="3" fill={GREEN} />
        <rect x="32" y="20" width="18" height="13" rx="2" fill="white" fillOpacity="0.18" />
        {/* Chart line */}
        <path d="M 8,80 L 28,62 L 52,50 L 74,34 L 90,18"
          stroke={GOLD} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <polygon points="90,18 76,22 80,30" fill={GOLD} />
      </g>

      {/* Wordmark */}
      <text
        x={markHeight * 1.08}
        y={height * 0.72}
        fontFamily="'Inter', 'DM Sans', system-ui, sans-serif"
        fontWeight="800"
        fontSize={fontSize}
        letterSpacing="-0.5"
        fill={agroColor}
      >
        Agro
      </text>
      <text
        x={markHeight * 1.08 + fontSize * 2.52}
        y={height * 0.72}
        fontFamily="'Inter', 'DM Sans', system-ui, sans-serif"
        fontWeight="800"
        fontSize={fontSize}
        letterSpacing="-0.5"
        fill={deskColor}
      >
        Desk
      </text>
    </svg>
  );
};

export default AgroDeskoLogo;
