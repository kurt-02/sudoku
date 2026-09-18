import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { games } from "@/db/schema";
import { recordServerAbandon, recordServerResult, recordServerStart } from "@/db/stats";
import { activeSeconds } from "@/lib/gameTime";
import { isValidBoard, matchesSolution } from "@/lib/gameValidation";
import type { DifficultyStats } from "@/lib/stats";
import {
  createBoardState,
  generatePuzzle,
  gridToString,
  HINTS_BY_DIFFICULTY,
  type Difficulty,
} from "@/lib/sudoku";
import type { Cell } from "@/types/game";

/** What the browser gets back: never the solution. */
export type ServerGame = {
  id: string;
  difficulty: Difficulty;
  cells: Cell[];
  seconds: number;
  mistakes: number;
  hintsUsed: number;
};

export type Snapshot = {
  cells: unknown;
  mistakes: number;
  hintsUsed: number;
};

/** "gone": the game was finished, replaced, or isn't this player's (another tab or device). */
export type SyncResult = "ok" | "gone" | "invalid";

type GameRow = typeof games.$inferSelect;

function toClient(row: GameRow, now: Date): ServerGame {
  return {
    id: row.id,
    difficulty: row.difficulty,
    cells: row.cells,
    seconds: activeSeconds(row, now),
    mistakes: row.mistakes,
    hintsUsed: row.hintsUsed,
  };
}

/** Counts from the browser can only move forward, and hints stay within the allowance. */
function mergeCounts(row: GameRow, snapshot: Snapshot) {
  const count = (n: unknown) => (Number.isInteger(n) && (n as number) > 0 ? (n as number) : 0);
  return {
    mistakes: Math.max(row.mistakes, count(snapshot.mistakes)),
    hintsUsed: Math.min(
      HINTS_BY_DIFFICULTY[row.difficulty],
      Math.max(row.hintsUsed, count(snapshot.hintsUsed)),
    ),
  };
}

async function findPlaying(userId: string, gameId: string): Promise<GameRow | null> {
  const [row] = await getDb()
    .select()
    .from(games)
    .where(and(eq(games.id, gameId), eq(games.userId, userId), eq(games.status, "playing")))
    .limit(1);
  return row ?? null;
}

/**
 * While the clock runs, bank the time so far and restart it from now. Doing this at every
 * check-in means a gap longer than the grace period (tab closed, laptop asleep) is dropped
 * rather than counted once the player comes back.
 */
function rebankClock(row: GameRow, now: Date) {
  return row.resumedAt
    ? { seconds: activeSeconds(row, now), resumedAt: now, lastSeenAt: now }
    : { lastSeenAt: now };
}

/** The player's unfinished game, if any. */
export async function getPlayingGame(userId: string): Promise<ServerGame | null> {
  const [row] = await getDb()
    .select()
    .from(games)
    .where(and(eq(games.userId, userId), eq(games.status, "playing")))
    .orderBy(desc(games.startedAt))
    .limit(1);
  return row ? toClient(row, new Date()) : null;
}

/**
 * Starts a game: a new puzzle, or (with `retryOf`) the same puzzle as one of the player's own
 * games. Any other unfinished game is abandoned, so a player has one game in progress.
 */
export async function createGame(
  userId: string,
  options: { difficulty: Difficulty } | { retryOf: string },
): Promise<ServerGame | null> {
  return getDb().transaction(async (tx) => {
    let difficulty: Difficulty;
    let puzzle: string;
    let solution: string;
    if ("retryOf" in options) {
      const [source] = await tx
        .select({ difficulty: games.difficulty, puzzle: games.puzzle, solution: games.solution })
        .from(games)
        .where(and(eq(games.id, options.retryOf), eq(games.userId, userId)))
        .limit(1);
      if (!source) return null;
      ({ difficulty, puzzle, solution } = source);
    } else {
      difficulty = options.difficulty;
      const generated = generatePuzzle(difficulty);
      puzzle = gridToString(generated.puzzle);
      solution = gridToString(generated.solution);
    }

    const now = new Date();
    const abandoned = await tx
      .update(games)
      .set({ status: "abandoned", finishedAt: now, resumedAt: null })
      .where(and(eq(games.userId, userId), eq(games.status, "playing")))
      .returning({ difficulty: games.difficulty });
    for (const game of abandoned) await recordServerAbandon(tx, userId, game.difficulty);
    await recordServerStart(tx, userId, difficulty);
    const [row] = await tx
      .insert(games)
      .values({
        userId,
        difficulty,
        puzzle,
        solution,
        cells: createBoardState(puzzle).cells,
        resumedAt: now,
        lastSeenAt: now,
      })
      .returning();
    return toClient(row, now);
  });
}

/** Saves the board and counts; also serves as the periodic check-in that keeps the clock fair. */
export async function saveGame(
  userId: string,
  gameId: string,
  snapshot: Snapshot,
): Promise<SyncResult> {
  const row = await findPlaying(userId, gameId);
  if (!row) return "gone";
  if (!isValidBoard(snapshot.cells, row.puzzle)) return "invalid";
  const now = new Date();
  await getDb()
    .update(games)
    .set({ cells: snapshot.cells, ...mergeCounts(row, snapshot), ...rebankClock(row, now) })
    .where(and(eq(games.id, gameId), eq(games.status, "playing")));
  return "ok";
}

/** Stops or restarts the server clock. */
export async function setGamePaused(
  userId: string,
  gameId: string,
  paused: boolean,
): Promise<SyncResult> {
  const row = await findPlaying(userId, gameId);
  if (!row) return "gone";
  const now = new Date();
  const clock = paused
    ? { seconds: activeSeconds(row, now), resumedAt: null, lastSeenAt: now }
    : row.resumedAt
      ? rebankClock(row, now)
      : { resumedAt: now, lastSeenAt: now };
  await getDb()
    .update(games)
    .set(clock)
    .where(and(eq(games.id, gameId), eq(games.status, "playing")));
  return "ok";
}

export type FinishResult =
  | {
      status: "ok";
      /** The server's official play time. */
      seconds: number;
      /** This difficulty's stats, including this result. */
      stats: DifficultyStats;
      isNewBest: boolean;
    }
  | { status: "gone" | "invalid" | "not-solved" };

/**
 * Ends a game. A win only counts if every cell matches the stored solution; its time is the
 * server's clock, not the browser's.
 */
export async function finishGame(
  userId: string,
  gameId: string,
  snapshot: Snapshot & { outcome: "won" | "lost" },
): Promise<FinishResult> {
  const row = await findPlaying(userId, gameId);
  if (!row) return { status: "gone" };
  if (!isValidBoard(snapshot.cells, row.puzzle)) return { status: "invalid" };
  if (snapshot.outcome === "won" && !matchesSolution(snapshot.cells, row.solution)) {
    return { status: "not-solved" };
  }
  const now = new Date();
  const seconds = activeSeconds(row, now);
  const cells = snapshot.cells;
  return getDb().transaction(async (tx) => {
    // Only the request that actually moves the game out of "playing" records a result, so a
    // repeated or racing finish can't count twice.
    const finished = await tx
      .update(games)
      .set({
        cells,
        ...mergeCounts(row, snapshot),
        status: snapshot.outcome,
        seconds,
        resumedAt: null,
        lastSeenAt: now,
        finishedAt: now,
      })
      .where(and(eq(games.id, gameId), eq(games.status, "playing")))
      .returning({ id: games.id });
    if (finished.length === 0) return { status: "gone" } as const;
    const result = await recordServerResult(tx, userId, row.difficulty, snapshot.outcome, seconds);
    return { status: "ok", seconds, ...result } as const;
  });
}
