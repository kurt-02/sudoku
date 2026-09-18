/**
 * Server-side play clock. Play time is banked into `playedMs` (milliseconds, so nothing is lost
 * to rounding) whenever the clock stops; while it runs, the live part is measured from
 * `resumedAt`. It stops counting a short grace period after the player's last save or check-in,
 * so closing the tab without pausing doesn't keep it running.
 *
 * Saves and check-ins only record that the player is still here; they don't restart the clock.
 */
export const CHECK_IN_GRACE_MS = 30_000;

export type GameClock = {
  playedMs: number;
  resumedAt: Date | null;
  lastSeenAt: Date;
};

/** Play time in milliseconds, counting the running part only up to the grace period. */
function activeMs(clock: GameClock, now: Date): number {
  if (!clock.resumedAt) return clock.playedMs;
  const end = Math.min(now.getTime(), clock.lastSeenAt.getTime() + CHECK_IN_GRACE_MS);
  return clock.playedMs + Math.max(0, end - clock.resumedAt.getTime());
}

/** Whole seconds played, as shown to the player and recorded when a game finishes. */
export function activeSeconds(clock: GameClock, now: Date): number {
  return Math.floor(activeMs(clock, now) / 1000);
}

/**
 * A save or check-in. While the player keeps checking in, the clock runs on untouched. After a
 * gap longer than the grace period (tab closed, laptop asleep), the time that counted is banked
 * and the clock restarts now, so the gap itself is never counted.
 */
export function checkInClock(clock: GameClock, now: Date): Partial<GameClock> {
  if (!clock.resumedAt) return { lastSeenAt: now };
  if (now.getTime() - clock.lastSeenAt.getTime() <= CHECK_IN_GRACE_MS) return { lastSeenAt: now };
  return { playedMs: activeMs(clock, now), resumedAt: now, lastSeenAt: now };
}

export function pauseClock(clock: GameClock, now: Date): Partial<GameClock> {
  return { playedMs: activeMs(clock, now), resumedAt: null, lastSeenAt: now };
}

export function resumeClock(clock: GameClock, now: Date): Partial<GameClock> {
  return clock.resumedAt ? checkInClock(clock, now) : { resumedAt: now, lastSeenAt: now };
}
