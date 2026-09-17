import type { Cell } from "@/types/game";
import { peersOf } from "./coords";
import { gridFromCells, type Grid } from "./grid";

/** Whether `digit` can go at `index` without repeating in its row, column, or box. */
export function canPlace(grid: Grid, index: number, digit: number): boolean {
  return peersOf(index).every((p) => grid[p] !== digit);
}

/** Indices of filled cells that share a digit with one of their peers. */
export function findConflicts(grid: Grid): Set<number> {
  const conflicts = new Set<number>();
  grid.forEach((digit, i) => {
    if (digit !== 0 && !canPlace(grid, i, digit)) conflicts.add(i);
  });
  return conflicts;
}

/** How many times each digit is on the board, indexed by digit (index 0 counts empty cells). */
export function digitCounts(grid: Grid): number[] {
  const counts = Array<number>(10).fill(0);
  for (const digit of grid) counts[digit]++;
  return counts;
}

/** Digits placed all 9 times with none of those placements conflicting. */
export function completedDigits(grid: Grid): Set<number> {
  const conflicts = findConflicts(grid);
  const counts = digitCounts(grid);
  const broken = new Set<number>();
  conflicts.forEach((i) => broken.add(grid[i]));
  const done = new Set<number>();
  for (let d = 1; d <= 9; d++) if (counts[d] === 9 && !broken.has(d)) done.add(d);
  return done;
}

/** A board is solved when every cell is filled and nothing conflicts. */
export function isSolved(cells: Cell[]): boolean {
  const grid = gridFromCells(cells);
  return grid.every((digit) => digit !== 0) && findConflicts(grid).size === 0;
}
