import { CLUE_TARGETS, type Difficulty } from "@/lib/sudoku";

export type DifficultyStats = {
  started: number;
  won: number;
  lost: number;
  /** Fastest win in seconds; null until the first win. */
  bestSeconds: number | null;
  /** Sum of winning times, for the average. */
  totalWinSeconds: number;
  currentStreak: number;
  bestStreak: number;
};

/** Per-difficulty play history kept in localStorage. Bump `version` if the shape changes. */
export type Stats = {
  version: 1;
  byDifficulty: Record<Difficulty, DifficultyStats>;
};

const STORAGE_KEY = "sudoku:stats";
const DIFFICULTIES = Object.keys(CLUE_TARGETS) as Difficulty[];

function emptyDifficulty(): DifficultyStats {
  return {
    started: 0,
    won: 0,
    lost: 0,
    bestSeconds: null,
    totalWinSeconds: 0,
    currentStreak: 0,
    bestStreak: 0,
  };
}

export function emptyStats(): Stats {
  return {
    version: 1,
    byDifficulty: Object.fromEntries(DIFFICULTIES.map((d) => [d, emptyDifficulty()])) as Record<
      Difficulty,
      DifficultyStats
    >,
  };
}

function update(
  stats: Stats,
  difficulty: Difficulty,
  patch: (s: DifficultyStats) => DifficultyStats,
) {
  return {
    ...stats,
    byDifficulty: { ...stats.byDifficulty, [difficulty]: patch(stats.byDifficulty[difficulty]) },
  };
}

export function recordStart(stats: Stats, difficulty: Difficulty): Stats {
  return update(stats, difficulty, (s) => ({ ...s, started: s.started + 1 }));
}

export function recordWin(stats: Stats, difficulty: Difficulty, seconds: number): Stats {
  return update(stats, difficulty, (s) => {
    const currentStreak = s.currentStreak + 1;
    return {
      ...s,
      won: s.won + 1,
      bestSeconds: s.bestSeconds === null ? seconds : Math.min(s.bestSeconds, seconds),
      totalWinSeconds: s.totalWinSeconds + seconds,
      currentStreak,
      bestStreak: Math.max(s.bestStreak, currentStreak),
    };
  });
}

export function recordLoss(stats: Stats, difficulty: Difficulty): Stats {
  return update(stats, difficulty, (s) => ({ ...s, lost: s.lost + 1, currentStreak: 0 }));
}

/** Starting over an unfinished game gives it up, which breaks the streak. */
export function recordAbandon(stats: Stats, difficulty: Difficulty): Stats {
  return update(stats, difficulty, (s) => ({ ...s, currentStreak: 0 }));
}

export function winRate(s: DifficultyStats): number | null {
  if (s.started === 0) return null;
  // Capped: a game saved before stats existed can be won without ever being counted as started.
  return Math.min(100, Math.round((s.won / s.started) * 100));
}

export function averageWinSeconds(s: DifficultyStats): number | null {
  return s.won === 0 ? null : Math.round(s.totalWinSeconds / s.won);
}

function isCount(n: unknown): n is number {
  return Number.isInteger(n) && (n as number) >= 0;
}

function isDifficultyStats(value: unknown): value is DifficultyStats {
  if (typeof value !== "object" || value === null) return false;
  const s = value as Record<string, unknown>;
  return (
    isCount(s.started) &&
    isCount(s.won) &&
    isCount(s.lost) &&
    (s.bestSeconds === null || isCount(s.bestSeconds)) &&
    isCount(s.totalWinSeconds) &&
    isCount(s.currentStreak) &&
    isCount(s.bestStreak)
  );
}

/** Validates stats from anywhere (storage, or sent to the server); null if malformed. */
export function sanitizeStats(data: unknown): Stats | null {
  const d = data as { version?: unknown; byDifficulty?: Record<string, unknown> } | null;
  const valid =
    d?.version === 1 && DIFFICULTIES.every((k) => isDifficultyStats(d.byDifficulty?.[k]));
  return valid ? (data as Stats) : null;
}

/** Whether any game was ever started, won, or lost. */
export function hasStats(stats: Stats): boolean {
  return DIFFICULTIES.some((d) => {
    const s = stats.byDifficulty[d];
    return s.started > 0 || s.won > 0 || s.lost > 0;
  });
}

/** Parses stored JSON, falling back to empty stats for anything missing or malformed. */
export function parseStats(raw: string | null): Stats {
  if (!raw) return emptyStats();
  try {
    return sanitizeStats(JSON.parse(raw)) ?? emptyStats();
  } catch {
    return emptyStats();
  }
}

// Storage can throw (private mode, blocked site data, quota), so every access is guarded.

export function readStats(): Stats {
  try {
    return parseStats(localStorage.getItem(STORAGE_KEY));
  } catch {
    return emptyStats();
  }
}

export function resetStats(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing stored to clear.
  }
}

/** Reads, applies `change`, writes back, and returns the new stats. */
export function updateStats(change: (stats: Stats) => Stats): Stats {
  const next = change(readStats());
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Stats are best-effort; the game keeps working without them.
  }
  return next;
}
