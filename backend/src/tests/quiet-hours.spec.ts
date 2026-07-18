/**
 * TRAI quiet-hours math.
 *
 * Regression guard for a production bug: the old worker applied the IST offset
 * twice, so at 21:11 IST it logged "waiting 384m" and woke at 03:35 IST — still
 * deep inside quiet hours. The correct answer is 714m (09:05 IST next morning).
 */
import { describe, it, expect } from 'vitest';
import { isQuietHours, msUntilAllowedWindow } from '../lib/quietHours.js';

const mins = (ms: number) => Math.round(ms / 60_000);
/** Build a UTC instant from an IST wall-clock time. */
const istToUtc = (y: number, m: number, d: number, h: number, min = 0) =>
  new Date(Date.UTC(y, m - 1, d, h, min) - 5.5 * 60 * 60 * 1000);

describe('isQuietHours', () => {
  it('21:11 IST is quiet (the exact case from the Railway logs)', () => {
    expect(isQuietHours(istToUtc(2026, 7, 17, 21, 11))).toBe(true);
  });
  it('03:00 IST is quiet', () => expect(isQuietHours(istToUtc(2026, 7, 18, 3))).toBe(true));
  it('08:59 IST is quiet', () => expect(isQuietHours(istToUtc(2026, 7, 18, 8, 59))).toBe(true));
  it('09:00 IST is allowed', () => expect(isQuietHours(istToUtc(2026, 7, 18, 9))).toBe(false));
  it('14:00 IST is allowed', () => expect(isQuietHours(istToUtc(2026, 7, 18, 14))).toBe(false));
  it('20:59 IST is allowed', () => expect(isQuietHours(istToUtc(2026, 7, 18, 20, 59))).toBe(false));
  it('21:00 IST is quiet', () => expect(isQuietHours(istToUtc(2026, 7, 18, 21))).toBe(true));
});

describe('msUntilAllowedWindow', () => {
  it('returns 714m at 21:11 IST — NOT the buggy 384m', () => {
    const d = msUntilAllowedWindow(istToUtc(2026, 7, 17, 21, 11));
    expect(mins(d)).toBe(714);
    expect(mins(d)).not.toBe(384);
  });

  it('returns 0 during allowed hours', () => {
    expect(msUntilAllowedWindow(istToUtc(2026, 7, 18, 14))).toBe(0);
  });

  it('after-midnight leg resumes the same morning', () => {
    // 03:00 IST → 09:05 IST is 6h05m
    expect(mins(msUntilAllowedWindow(istToUtc(2026, 7, 18, 3)))).toBe(365);
  });

  it('just before the window opens', () => {
    expect(mins(msUntilAllowedWindow(istToUtc(2026, 7, 18, 8, 59)))).toBe(6);
  });

  it('always lands strictly inside the allowed window', () => {
    for (const [h, m] of [[21, 0], [21, 11], [23, 59], [0, 30], [3, 0], [8, 59]] as const) {
      const now = istToUtc(2026, 7, 18, h, m);
      const resumeAt = new Date(now.getTime() + msUntilAllowedWindow(now));
      expect(isQuietHours(resumeAt)).toBe(false);
    }
  });
});
