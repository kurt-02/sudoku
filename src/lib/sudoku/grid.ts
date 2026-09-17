import type { Cell } from "@/types/game";

/** 81 digits in row-major order; 0 means empty. The engine's plain-data board format. */
export type Grid = number[];

export function gridFromString(puzzle: string): Grid {
  if (!/^[0-9.]{81}$/.test(puzzle)) {
    throw new Error("Puzzle must be 81 characters of 0-9 or dots");
  }
  return puzzle.split("").map((ch) => (ch === "." ? 0 : Number(ch)));
}

export function gridToString(grid: Grid): string {
  return grid.join("");
}

export function gridFromCells(cells: Cell[]): Grid {
  return cells.map((cell) => cell.value ?? 0);
}
