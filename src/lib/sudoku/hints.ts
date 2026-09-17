import type { Cell } from "@/types/game";
import type { Difficulty } from "./generator";
import { gridFromCells, type Grid } from "./grid";
import { canPlace } from "./validate";

/** Harder puzzles get more help. */
export const HINTS_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

/**
 * Picks the cell a hint should fill: the selected cell if it's empty or wrong, otherwise the
 * empty-or-wrong cell with the fewest candidates (the most "stuck" spot). Null if none is left.
 */
export function findHintCell(
  cells: Cell[],
  solution: Grid,
  selected: number | null,
): number | null {
  const needsHelp = (i: number) => !cells[i].isGiven && cells[i].value !== solution[i];
  if (selected !== null && needsHelp(selected)) return selected;

  const grid = gridFromCells(cells);
  // Wrong entries shouldn't narrow anyone's candidates.
  cells.forEach((_, i) => needsHelp(i) && (grid[i] = 0));

  let best: number | null = null;
  let bestCount = 10;
  for (let i = 0; i < 81; i++) {
    if (!needsHelp(i)) continue;
    let count = 0;
    for (let d = 1; d <= 9; d++) if (canPlace(grid, i, d)) count++;
    if (count < bestCount) {
      best = i;
      bestCount = count;
    }
  }
  return best;
}
