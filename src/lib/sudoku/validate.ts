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

/** A board is solved when every cell is filled and nothing conflicts. */
export function isSolved(cells: Cell[]): boolean {
  const grid = gridFromCells(cells);
  return grid.every((digit) => digit !== 0) && findConflicts(grid).size === 0;
}
