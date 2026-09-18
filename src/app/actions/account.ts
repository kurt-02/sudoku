"use server";

// Server Functions are reachable by direct POST, so each one checks the session itself.
import { auth, signOut } from "@/auth";
import { importGuestData, type ImportResult } from "@/db/import";
import { saveServerSettings } from "@/db/settings";
import { getServerDifficultyStats, resetServerStats } from "@/db/stats";
import { deleteUser } from "@/db/users";
import type { DifficultyStats } from "@/lib/stats";
import { CLUE_TARGETS, type Difficulty } from "@/lib/sudoku";

async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error("Sign in to use account settings.");
  return id;
}

/** Stores the player's settings; unknown keys and non-boolean values are dropped. */
export async function saveSettingsAction(settings: unknown): Promise<void> {
  await saveServerSettings(await requireUserId(), settings);
}

/** The player's own stats for one difficulty, fetched when they open that tab. */
export async function getMyStatsAction(difficulty: unknown): Promise<DifficultyStats> {
  const userId = await requireUserId();
  if (typeof difficulty !== "string" || !(difficulty in CLUE_TARGETS)) {
    throw new Error("Unknown difficulty.");
  }
  return getServerDifficultyStats(userId, difficulty as Difficulty);
}

export async function resetStatsAction(): Promise<void> {
  await resetServerStats(await requireUserId());
}

/** Permanently deletes the account and everything saved with it, then signs out. */
export async function deleteAccountAction(): Promise<void> {
  await deleteUser(await requireUserId());
  await signOut({ redirectTo: "/" });
}

/** Moves guest progress from this browser into the account (see db/import.ts). */
export async function importGuestDataAction(data: unknown): Promise<ImportResult> {
  const userId = await requireUserId();
  const d = (typeof data === "object" && data !== null ? data : {}) as Record<string, unknown>;
  return importGuestData(userId, { stats: d.stats, game: d.game });
}
