"use server";

// Server Functions are reachable by direct POST, so each one checks the session itself.
import { auth } from "@/auth";
import { getLeaderboard } from "@/db/leaderboard";
import { getLeaderboardVisibility, setLeaderboardVisibility } from "@/db/users";
import type { Leaderboard } from "@/lib/leaderboard";
import { CLUE_TARGETS, type Difficulty } from "@/lib/sudoku";

async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error("Sign in to see the leaderboard.");
  return id;
}

export type LeaderboardView = {
  boards: Leaderboard;
  /** Whether the viewer appears to other players. */
  showMe: boolean;
};

/** Only signed-in players can see the leaderboard. */
export async function getLeaderboardAction(difficulty: unknown): Promise<LeaderboardView> {
  const userId = await requireUserId();
  if (typeof difficulty !== "string" || !(difficulty in CLUE_TARGETS)) {
    throw new Error("Unknown difficulty.");
  }
  const [boards, showMe] = await Promise.all([
    getLeaderboard(userId, difficulty as Difficulty),
    getLeaderboardVisibility(userId),
  ]);
  return { boards, showMe };
}

export async function setLeaderboardVisibilityAction(show: unknown): Promise<void> {
  const userId = await requireUserId();
  if (typeof show !== "boolean") throw new Error("Expected true or false.");
  await setLeaderboardVisibility(userId, show);
}
