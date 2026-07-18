/**
 * TRAI quiet hours (9 PM – 9 AM IST).
 *
 * Single source of truth, shared by the queue (which defers jobs at enqueue
 * time) and the worker (which re-checks as a safety net). Consumer-facing
 * outbound — voice, WhatsApp, SMS — must not go out inside this window.
 *
 * All arithmetic is done in "IST-shifted space": add the offset once, then use
 * the UTC getters/setters so the shifted Date reads as IST wall-clock time.
 * Differences taken inside that space are offset-independent, so the result is
 * a correct real-world duration.
 *
 * (Previously this shifted into IST space and then ALSO subtracted the offset
 * when converting back, which aimed the resume time at 03:35 IST instead of
 * 09:05 IST — jobs woke ~5.5h early, still inside quiet hours.)
 */

export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Quiet window: [21:00, 24:00) ∪ [00:00, 09:00) IST. */
export const QUIET_START_HOUR = 21;
export const QUIET_END_HOUR = 9;

/** Resume slightly after the window opens, so we're never on the boundary. */
const RESUME_HOUR = 9;
const RESUME_MINUTE = 5;

/** Is the given instant inside TRAI quiet hours? */
export function isQuietHours(now: Date = new Date()): boolean {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const hour = ist.getUTCHours();
  return hour < QUIET_END_HOUR || hour >= QUIET_START_HOUR;
}

/**
 * Milliseconds from `now` until the next 09:05 IST.
 * Returns 0 when `now` is already inside the allowed window.
 */
export function msUntilAllowedWindow(now: Date = new Date()): number {
  if (!isQuietHours(now)) return 0;

  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const target = new Date(ist);
  target.setUTCHours(RESUME_HOUR, RESUME_MINUTE, 0, 0);

  // Already past today's resume time (i.e. it's the 21:00–24:00 leg) → tomorrow.
  if (target.getTime() <= ist.getTime()) {
    target.setUTCDate(target.getUTCDate() + 1);
  }

  // Both sides are shifted by the same offset, so the delta is the real duration.
  return target.getTime() - ist.getTime();
}

/** Agent types that carry consumer-facing outbound and must respect quiet hours. */
export const QUIET_HOURS_GATED_TYPES = new Set([
  'voice_call',
  'whatsapp',
  'sms',
  'money_recovery',
]);
