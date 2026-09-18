import { MAX_MISTAKES, type Difficulty } from "@/lib/sudoku";

export type LeaderboardCategory = "fastest" | "wins" | "streak";

/**
 * Wins faster than this are left off the leaderboard: well beyond human speed for the
 * difficulty, so almost certainly a bot or a script.
 */
export const MIN_LEADERBOARD_SECONDS: Record<Difficulty, number> = {
  easy: 30,
  medium: 45,
  hard: 60,
};

/** A win only counts if it stayed under the mistake limit (so turning the limit off can't help). */
export const LEADERBOARD_MAX_MISTAKES = MAX_MISTAKES - 1;

/** Rows shown per board; the viewer's own row is added below if they rank lower. */
export const LEADERBOARD_SIZE = 10;

export type LeaderboardEntry = {
  rank: number;
  name: string;
  image: string | null;
  /** Seconds for "fastest", a count for "wins" and "streak". */
  value: number;
  isMe: boolean;
};

export type Leaderboard = Record<LeaderboardCategory, LeaderboardEntry[]>;

/**
 * Public name: first name and last initial ("Kurt Valderama" → "Kurt V."), so full names and
 * emails are never shown to other players.
 */
export function leaderboardName(name: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Player";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}
