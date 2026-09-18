import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { userStats } from "@/db/schema";
import { emptyStats, type DifficultyStats } from "@/lib/stats";
import type { Difficulty } from "@/lib/sudoku";

/** A transaction, so stats change together with the game that caused them. */
type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

type StatsRow = typeof userStats.$inferSelect;

function toStats(row: StatsRow): DifficultyStats {
  return {
    started: row.started,
    won: row.won,
    lost: row.lost,
    bestSeconds: row.bestSeconds,
    totalWinSeconds: row.totalWinSeconds,
    currentStreak: row.currentStreak,
    bestStreak: row.bestStreak,
  };
}

const target = [userStats.userId, userStats.difficulty];

export async function recordServerStart(tx: Tx, userId: string, difficulty: Difficulty) {
  await tx
    .insert(userStats)
    .values({ userId, difficulty, started: 1 })
    .onConflictDoUpdate({ target, set: { started: sql`${userStats.started} + 1` } });
}

/** Giving up an unfinished game breaks that difficulty's streak. */
export async function recordServerAbandon(tx: Tx, userId: string, difficulty: Difficulty) {
  await tx
    .update(userStats)
    .set({ currentStreak: 0 })
    .where(and(eq(userStats.userId, userId), eq(userStats.difficulty, difficulty)));
}

/** Records a checked result. Returns the updated stats and whether it set a new best time. */
export async function recordServerResult(
  tx: Tx,
  userId: string,
  difficulty: Difficulty,
  outcome: "won" | "lost",
  seconds: number,
): Promise<{ stats: DifficultyStats; isNewBest: boolean }> {
  const [before] = await tx
    .select({ bestSeconds: userStats.bestSeconds })
    .from(userStats)
    .where(and(eq(userStats.userId, userId), eq(userStats.difficulty, difficulty)))
    .for("update");

  // A missing row means the start wasn't counted (e.g. a game from before stats moved here);
  // count it now so the win rate stays sensible.
  const [row] =
    outcome === "won"
      ? await tx
          .insert(userStats)
          .values({
            userId,
            difficulty,
            started: 1,
            won: 1,
            bestSeconds: seconds,
            totalWinSeconds: seconds,
            currentStreak: 1,
            bestStreak: 1,
          })
          .onConflictDoUpdate({
            target,
            set: {
              won: sql`${userStats.won} + 1`,
              bestSeconds: sql`least(coalesce(${userStats.bestSeconds}, ${seconds}), ${seconds})`,
              totalWinSeconds: sql`${userStats.totalWinSeconds} + ${seconds}`,
              currentStreak: sql`${userStats.currentStreak} + 1`,
              bestStreak: sql`greatest(${userStats.bestStreak}, ${userStats.currentStreak} + 1)`,
            },
          })
          .returning()
      : await tx
          .insert(userStats)
          .values({ userId, difficulty, started: 1, lost: 1 })
          .onConflictDoUpdate({
            target,
            set: { lost: sql`${userStats.lost} + 1`, currentStreak: 0 },
          })
          .returning();

  const isNewBest =
    outcome === "won" && (before?.bestSeconds == null || seconds < before.bestSeconds);
  return { stats: toStats(row), isNewBest };
}

/** The player's stats for one difficulty (zeroes if they haven't played it). */
export async function getServerDifficultyStats(
  userId: string,
  difficulty: Difficulty,
): Promise<DifficultyStats> {
  const [row] = await getDb()
    .select()
    .from(userStats)
    .where(and(eq(userStats.userId, userId), eq(userStats.difficulty, difficulty)))
    .limit(1);
  return row ? toStats(row) : emptyStats().byDifficulty[difficulty];
}

export async function resetServerStats(userId: string) {
  await getDb().delete(userStats).where(eq(userStats.userId, userId));
}
