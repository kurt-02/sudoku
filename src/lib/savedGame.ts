import { CLUE_TARGETS, isSolved, type Difficulty } from "@/lib/sudoku";
import type { Cell } from "@/types/game";

/** Unfinished game kept in localStorage. Bump `version` if the shape changes. */
export type SavedGame = {
  version: 1;
  difficulty: Difficulty;
  cells: Cell[];
  noteMode: boolean;
  seconds: number;
};

const STORAGE_KEY = "sudoku:saved-game";

function isDigit(n: unknown): n is number {
  return Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 9;
}

function isCell(c: unknown): c is Cell {
  if (typeof c !== "object" || c === null) return false;
  const { value, isGiven, notes } = c as Record<string, unknown>;
  return (
    (value === null || isDigit(value)) &&
    typeof isGiven === "boolean" &&
    Array.isArray(notes) &&
    notes.every(isDigit)
  );
}

/** Parses stored JSON, returning null for anything missing, malformed, or already solved. */
export function parseSavedGame(raw: string | null): SavedGame | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const { version, difficulty, cells, noteMode, seconds } = data as Record<string, unknown>;
  const valid =
    version === 1 &&
    typeof difficulty === "string" &&
    difficulty in CLUE_TARGETS &&
    Array.isArray(cells) &&
    cells.length === 81 &&
    cells.every(isCell) &&
    typeof noteMode === "boolean" &&
    typeof seconds === "number" &&
    Number.isFinite(seconds) &&
    seconds >= 0;
  if (!valid || isSolved(cells)) return null;
  return data as SavedGame;
}

// Storage can throw (private mode, blocked site data, quota), so every access is guarded.

export function readSavedGameRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeSavedGame(game: Omit<SavedGame, "version">): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...game }));
  } catch {
    // Saving is best-effort; the game keeps working without it.
  }
}

export function clearSavedGame(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore: nothing we can do if storage is unavailable.
  }
}

/** Notifies when another tab changes the saved game. */
export function subscribeSavedGame(onChange: () => void): () => void {
  function onStorage(e: StorageEvent) {
    if (e.key === STORAGE_KEY || e.key === null) onChange();
  }
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}
