"use server";

// Server Functions are reachable by direct POST, so each one checks the session itself.
import { auth } from "@/auth";
import { getLeaderboardBoard } from "@/db/leaderboard";
import { setLeaderboardVisibility } from "@/db/users";
import type { LeaderboardCategory, LeaderboardEntry } from "@/lib/leaderboard";
import { CLUE_TARGETS, type Difficulty } from "@/lib/sudoku";

const CATEGORIES: LeaderboardCategory[] = ["fastest", "wins", "streak"];

async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error("Sign in to see the leaderboard.");
  return id;
}

/** One leaderboard (difficulty and category); only signed-in players can see them. */
export async function getLeaderboardAction(
  difficulty: unknown,
  category: unknown,
): Promise<LeaderboardEntry[]> {
  const userId = await requireUserId();
  if (typeof difficulty !== "string" || !(difficulty in CLUE_TARGETS)) {
    throw new Error("Unknown difficulty.");
  }
  if (!CATEGORIES.includes(category as LeaderboardCategory)) throw new Error("Unknown ranking.");
  return getLeaderboardBoard(userId, difficulty as Difficulty, category as LeaderboardCategory);
}

export async function setLeaderboardVisibilityAction(show: unknown): Promise<void> {
  const userId = await requireUserId();
  if (typeof show !== "boolean") throw new Error("Expected true or false.");
  await setLeaderboardVisibility(userId, show);
}
