import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  cn,
  formatCurrency,
  formatRelative,
  getLeadStatusColor,
  getUrgencyColor,
} from '@/lib/utils';

describe('formatCurrency (Indian number system)', () => {
  it('formats crores', () => {
    expect(formatCurrency(15000000)).toBe('₹1.5Cr');
  });
  it('formats lakhs', () => {
    expect(formatCurrency(250000)).toBe('₹2.5L');
  });
  it('formats thousands', () => {
    expect(formatCurrency(45000)).toBe('₹45K');
  });
  it('formats plain amounts with Indian grouping', () => {
    expect(formatCurrency(999)).toBe('₹999');
  });
});

describe('cn (class merge)', () => {
  it('merges and dedupes tailwind classes', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
  it('drops falsy values', () => {
    expect(cn('a', null, undefined, 'c')).toBe('a c');
  });
});

describe('getLeadStatusColor', () => {
  it('maps a known status', () => {
    expect(getLeadStatusColor('won')).toBe('status-active');
  });
  it('falls back to status-info for unknown status', () => {
    expect(getLeadStatusColor('nonsense')).toBe('status-info');
  });
});

describe('getUrgencyColor', () => {
  it('returns red for high urgency', () => {
    expect(getUrgencyColor(90)).toBe('#ef4444');
  });
  it('returns amber for medium urgency', () => {
    expect(getUrgencyColor(65)).toBe('#fbbf24');
  });
  it('returns green for low urgency', () => {
    expect(getUrgencyColor(20)).toBe('#4ade80');
  });
});

describe('formatRelative', () => {
  afterEach(() => vi.useRealTimers());

  it('reports minutes for recent timestamps', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-04T12:00:00Z'));
    expect(formatRelative('2026-07-04T11:30:00Z')).toBe('30m ago');
  });

  it('reports hours', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-04T12:00:00Z'));
    expect(formatRelative('2026-07-04T09:00:00Z')).toBe('3h ago');
  });

  it('reports days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-04T12:00:00Z'));
    expect(formatRelative('2026-07-01T12:00:00Z')).toBe('3d ago');
  });
});
