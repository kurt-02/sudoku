"use server";

// Server Functions are reachable by direct POST, so each one checks the session itself and
// treats every argument as untrusted.
import { auth } from "@/auth";
import {
  createGame,
  finishGame,
  saveGame,
  setGamePaused,
  type FinishResult,
  type ServerGame,
  type Snapshot,
  type SyncResult,
} from "@/db/games";
import { CLUE_TARGETS, type Difficulty } from "@/lib/sudoku";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error("Sign in to save games to your account.");
  return id;
}

function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === "string" && value in CLUE_TARGETS;
}

function isGameId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

function toSnapshot(value: unknown): Snapshot {
  const v = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
  return {
    cells: v.cells,
    mistakes: typeof v.mistakes === "number" ? v.mistakes : 0,
    hintsUsed: typeof v.hintsUsed === "number" ? v.hintsUsed : 0,
  };
}

export async function startGameAction(difficulty: unknown): Promise<ServerGame> {
  const userId = await requireUserId();
  if (!isDifficulty(difficulty)) throw new Error("Unknown difficulty.");
  const game = await createGame(userId, { difficulty });
  if (!game) throw new Error("Couldn't start a game.");
  return game;
}

/** Starts the same puzzle again after a loss. */
export async function retryGameAction(gameId: unknown): Promise<ServerGame> {
  const userId = await requireUserId();
  if (!isGameId(gameId)) throw new Error("Unknown game.");
  const game = await createGame(userId, { retryOf: gameId });
  if (!game) throw new Error("Unknown game.");
  return game;
}

export async function saveGameAction(gameId: unknown, snapshot: unknown): Promise<SyncResult> {
  const userId = await requireUserId();
  if (!isGameId(gameId)) return "gone";
  return saveGame(userId, gameId, toSnapshot(snapshot));
}

export async function pauseGameAction(gameId: unknown, paused: unknown): Promise<SyncResult> {
  const userId = await requireUserId();
  if (!isGameId(gameId) || typeof paused !== "boolean") return "gone";
  return setGamePaused(userId, gameId, paused);
}

export async function finishGameAction(
  gameId: unknown,
  snapshot: unknown,
  outcome: unknown,
): Promise<FinishResult> {
  const userId = await requireUserId();
  if (!isGameId(gameId) || (outcome !== "won" && outcome !== "lost")) return { status: "gone" };
  return finishGame(userId, gameId, { ...toSnapshot(snapshot), outcome });
}
