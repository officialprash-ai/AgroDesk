import React from 'react';

/**
 * AgroDesk brand logo — all variants render the official brand SVG.
 *
 * Variants:
 *  - icon      : official tractor+chart mark for dark backgrounds (collapsed sidebar)
 *  - full      : official full logo for light backgrounds (login mobile)
 *  - full-dark : official full logo, light-coloured version for dark backgrounds
 *                (sidebar expanded, login desktop dark panel)
 */

interface AgroDeskoLogoProps {
  variant?: 'icon' | 'full' | 'full-dark';
  /** Height in px; width scales proportionally */
  height?: number;
  className?: string;
}

/**
 * Tractor + chart mark only (no wordmark).
 * Pass dark=true (default) for dark sidebar backgrounds,
 * dark=false for light sidebar backgrounds.
 */
export const LogoMark: React.FC<{ height?: number; dark?: boolean; className?: string }> = ({
  height = 40,
  dark = true,
  className,
}) => (
  <img
    src={dark ? '/logo-mark-dark.svg' : '/logo-mark.svg'}
    alt="AgroDesk"
    height={height}
    style={{ display: 'block', width: 'auto', height }}
    className={className}
  />
);

/** Full horizontal logo — official brand SVG, light or dark variant */
const AgroDeskoLogo: React.FC<AgroDeskoLogoProps> = ({
  variant = 'full',
  height = 40,
  className,
}) => {
  if (variant === 'icon') {
    return <LogoMark height={height} className={className} />;
  }

  if (variant === 'full-dark') {
    /* Official SVG with bright green + gold + white paths — visible on dark bg */
    return (
      <img
        src="/logo-dark.svg"
        alt="AgroDesk"
        height={height}
        style={{ display: 'block', width: 'auto', height }}
        className={className}
      />
    );
  }

  /* variant="full" — official brand SVG for light backgrounds */
  return (
    <img
      src="/logo.svg"
      alt="AgroDesk"
      height={height}
      style={{ display: 'block', width: 'auto', height }}
