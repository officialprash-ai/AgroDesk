import React from 'react';

/**
 * AgroDesk brand logo — all variants render the official brand SVG.
 *
 * Variants:
 *  - icon      : official tractor+chart mark, dark=true for dark bg (collapsed sidebar)
 *  - full      : official full logo for light backgrounds (login mobile)
 *  - full-dark : official full logo, bright-coloured version for dark backgrounds
 *                (sidebar expanded in dark/night mode, login desktop dark panel)
 */

interface AgroDeskoLogoProps {
  variant?: 'icon' | 'full' | 'full-dark';
  /** Height in px; width scales proportionally */
  height?: number;
  className?: string;
}

/**
 * Tractor + chart mark only (no wordmark).
 * dark=true  → logo-mark-dark.svg (bright green+gold, for dark sidebar)
 * dark=false → logo-mark.svg      (brand green+gold, for light sidebar)
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

/** Full horizontal logo — official brand SVG, light or dark colour variant */
const AgroDeskoLogo: React.FC<AgroDeskoLogoProps> = ({
  variant = 'full',
  height = 40,
  className,
}) => {
  if (variant === 'icon') {
    return <LogoMark height={height} className={className} />;
  }

  if (variant === 'full-dark') {
    /* logo-dark.svg: bright green tractor + gold curve + white "Desk" — for dark bg */
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

  /* variant="full" — logo.svg: brand colours, for light backgrounds */
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
