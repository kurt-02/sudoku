/**
 * Server-side play clock. Time is banked into `seconds` at each pause; while running, the live
 * part is measured from `resumedAt`. It stops counting a short grace period after the player's
 * last save or check-in, so closing the tab without pausing doesn't keep the clock running.
 */
export const CHECK_IN_GRACE_MS = 30_000;

export type GameClock = {
  seconds: number;
  resumedAt: Date | null;
  lastSeenAt: Date;
};

export function activeSeconds(clock: GameClock, now: Date): number {
  if (!clock.resumedAt) return clock.seconds;
  const end = Math.min(now.getTime(), clock.lastSeenAt.getTime() + CHECK_IN_GRACE_MS);
  const running = Math.max(0, end - clock.resumedAt.getTime());
  return clock.seconds + Math.floor(running / 1000);
}
