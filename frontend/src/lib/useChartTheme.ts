import { useAppStore } from '../store';

/**
 * Theme-aware color tokens for Recharts (ticks, grid, axes).
 * Recharts renders to SVG and can't read CSS variables on <text fill>,
 * so we resolve concrete colors per active theme. Fixes near-invisible
 * axis labels in light mode.
 */
export function useChartTheme() {
  const theme = useAppStore(s => s.theme) ?? 'dark';
  const light = theme === 'light';

  return {
    light,
    tick:    { fontSize: 11, fill: light ? 'rgba(17,19,24,0.62)' : 'rgba(240,253,244,0.45)' },
    tickSm:  { fontSize: 10, fill: light ? 'rgba(17,19,24,0.50)' : 'rgba(240,253,244,0.38)' },
    grid:    light ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.05)',
    axisLine: light ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)',
    cursor:  light ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)',
  };
}
