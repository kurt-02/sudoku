import { isCell } from "@/lib/savedGame";
import type { Cell } from "@/types/game";

/**
 * Checks for boards sent from the browser. The server trusts none of it: the shape must be
 * exact, and the given numbers must be the puzzle's, unchanged.
 */
export function isValidBoard(cells: unknown, puzzle: string): cells is Cell[] {
  if (!Array.isArray(cells) || cells.length !== 81 || puzzle.length !== 81) return false;
  return cells.every((cell, i) => {
    if (!isCell(cell)) return false;
    // Notes: at most nine distinct digits.
    if (cell.notes.length > 9 || new Set(cell.notes).size !== cell.notes.length) return false;
    const given = puzzle[i] !== "0";
    if (cell.isGiven !== given) return false;
    return given ? cell.value === Number(puzzle[i]) : true;
  });
}

/** Every cell holds the solution's number. */
export function matchesSolution(cells: Cell[], solution: string): boolean {
  return cells.every((cell, i) => cell.value === Number(solution[i]));
}
