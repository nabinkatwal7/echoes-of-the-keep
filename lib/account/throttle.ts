export const WINDOW_MS = 10 * 60 * 1000;
export const MAX_FAILURES = 5;
export const HOLD_MS = 14 * 24 * 60 * 60 * 1000;

export const isThrottled = (failures: number, windowStart: Date, now = Date.now()) =>
  failures >= MAX_FAILURES && now - windowStart.getTime() < WINDOW_MS;

/** A deleted account can still sign in during this window. After it, the row is removed. */
export const holdExpired = (deletedAt: Date, now = Date.now()) => now - deletedAt.getTime() > HOLD_MS;
