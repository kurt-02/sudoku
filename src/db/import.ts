import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { games, userStats } from "@/db/schema";
import { sanitizeSavedGame } from "@/lib/savedGame";
import { hasStats, sanitizeStats } from "@/lib/stats";
import {
  countSolutions,
  givensFromCells,
  gridToString,
  HINTS_BY_DIFFICULTY,
  solve,
  type Difficulty,
} from "@/lib/sudoku";

/** Keeps imported numbers sane (and inside Postgres integers), whatever the browser sent. */
const MAX_COUNT = 100_000;
const MAX_SECONDS = 24 * 60 * 60;

const cap = (n: number, max = MAX_COUNT) => Math.min(Math.max(0, Math.floor(n)), max);

export type ImportResult = {
  /** Guest stats were added to the account's own stats. */
  stats: boolean;
  /** "imported": moved in; "kept-account-game": the account already had one in progress. */
  game: "imported" | "kept-account-game" | "none";
};

/**
 * Moves a guest's progress from this browser into their account. Nothing sent here is trusted:
 * it's validated again, numbers are capped, and imported games are flagged so they never reach
 * the leaderboard (their earlier moves and time weren't seen by the server).
 */
export async function importGuestData(
  userId: string,
  data: { stats?: unknown; game?: unknown },
): Promise<ImportResult> {
  const stats = sanitizeStats(data.stats);
  const saved = sanitizeSavedGame(data.game);

  return getDb().transaction(async (tx) => {
    const result: ImportResult = { stats: false, game: "none" };

    if (stats && hasStats(stats)) {
      for (const [difficulty, s] of Object.entries(stats.byDifficulty) as [
        Difficulty,
        (typeof stats.byDifficulty)[Difficulty],
      ][]) {
        if (s.started === 0 && s.won === 0 && s.lost === 0) continue;
        const best = s.bestSeconds === null ? null : cap(s.bestSeconds, MAX_SECONDS) || 1;
        const guest = {
          started: cap(s.started),
          won: cap(s.won),
          lost: cap(s.lost),
          bestSeconds: best,
          totalWinSeconds: cap(s.totalWinSeconds, MAX_COUNT * 60),
          currentStreak: cap(s.currentStreak),
          bestStreak: cap(s.bestStreak),
        };
        await tx
          .insert(userStats)
          .values({ userId, difficulty, ...guest })
          .onConflictDoUpdate({
            target: [userStats.userId, userStats.difficulty],
            set: {
              started: sql`${userStats.started} + ${guest.started}`,
              won: sql`${userStats.won} + ${guest.won}`,
              lost: sql`${userStats.lost} + ${guest.lost}`,
              bestSeconds:
                best === null
                  ? sql`${userStats.bestSeconds}`
                  : sql`least(coalesce(${userStats.bestSeconds}, ${best}), ${best})`,
              totalWinSeconds: sql`${userStats.totalWinSeconds} + ${guest.totalWinSeconds}`,
              bestStreak: sql`greatest(${userStats.bestStreak}, ${guest.bestStreak})`,
              // The account's own current streak is the more recent one; keep it.
            },
          });
      }
      result.stats = true;
    }

    if (saved) {
      const [existing] = await tx
        .select({ id: games.id })
        .from(games)
        .where(and(eq(games.userId, userId), eq(games.status, "playing")))
        .limit(1);
      if (existing) {
        result.game = "kept-account-game";
      } else {
        // The browser's puzzle becomes a server game only if it's a real Sudoku: the givens must
        // have exactly one solution, which the server works out for itself.
        const givens = givensFromCells(saved.cells);
        const solution = countSolutions(givens, 2) === 1 ? solve(givens) : null;
        if (solution) {
          const now = new Date();
          await tx.insert(games).values({
            userId,
            difficulty: saved.difficulty,
            puzzle: gridToString(givens),
            solution: gridToString(solution),
            cells: saved.cells,
            playedMs: cap(saved.seconds, MAX_SECONDS) * 1000,
            mistakes: cap(saved.mistakes),
            hintsUsed: Math.min(cap(saved.hintsUsed), HINTS_BY_DIFFICULTY[saved.difficulty]),
            imported: true,
            // Paused until the player continues it.
            resumedAt: null,
            lastSeenAt: now,
          });
          result.game = "imported";
        }
      }
    }

    return result;
  });
}
