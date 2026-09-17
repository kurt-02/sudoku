import { boxOf, colOf, rowOf } from "./coords";
import type { Grid } from "./grid";
import { shuffle, type Rng } from "./random";

const ALL_DIGITS = 0b1111111110; // bits 1..9
const ROW = Array.from({ length: 81 }, (_, i) => rowOf(i));
const COL = Array.from({ length: 81 }, (_, i) => colOf(i));
const BOX = Array.from({ length: 81 }, (_, i) => boxOf(i));

type Search = {
  grid: Grid;
  rows: number[];
  cols: number[];
  boxes: number[];
  rng?: Rng;
  /** Called with each solution found; return true to stop searching. */
  onSolution: (grid: Grid) => boolean;
};

function bitCount(mask: number): number {
  let n = 0;
  for (; mask; mask &= mask - 1) n++;
  return n;
}

/** Copies the grid and builds used-digit bitmasks. Returns null if the givens already conflict. */
function prepare(input: Grid, onSolution: Search["onSolution"], rng?: Rng): Search | null {
  if (input.length !== 81) throw new Error("Grid must have 81 cells");
  const grid = [...input];
  const rows = Array<number>(9).fill(0);
  const cols = Array<number>(9).fill(0);
  const boxes = Array<number>(9).fill(0);
  for (let i = 0; i < 81; i++) {
    const digit = grid[i];
    if (digit === 0) continue;
    const bit = 1 << digit;
    if ((rows[ROW[i]] | cols[COL[i]] | boxes[BOX[i]]) & bit) return null;
    rows[ROW[i]] |= bit;
    cols[COL[i]] |= bit;
    boxes[BOX[i]] |= bit;
  }
  return { grid, rows, cols, boxes, rng, onSolution };
}

/** Backtracking search that always branches on the empty cell with the fewest candidates. */
function search(s: Search): boolean {
  let best = -1;
  let bestMask = 0;
  let bestCount = 10;
  for (let i = 0; i < 81; i++) {
    if (s.grid[i] !== 0) continue;
    const mask = ALL_DIGITS & ~(s.rows[ROW[i]] | s.cols[COL[i]] | s.boxes[BOX[i]]);
    const count = bitCount(mask);
    if (count === 0) return false;
    if (count < bestCount) {
      best = i;
      bestMask = mask;
      bestCount = count;
      if (count === 1) break;
    }
  }
  if (best === -1) return s.onSolution([...s.grid]);

  const digits: number[] = [];
  for (let d = 1; d <= 9; d++) if (bestMask & (1 << d)) digits.push(d);
  if (s.rng) shuffle(digits, s.rng);

  const r = ROW[best];
  const c = COL[best];
  const b = BOX[best];
  for (const digit of digits) {
    const bit = 1 << digit;
    s.grid[best] = digit;
    s.rows[r] |= bit;
    s.cols[c] |= bit;
    s.boxes[b] |= bit;
    const stop = search(s);
    s.grid[best] = 0;
    s.rows[r] &= ~bit;
    s.cols[c] &= ~bit;
    s.boxes[b] &= ~bit;
    if (stop) return true;
  }
  return false;
}

/** Returns a solution for the grid, or null if it has none. Does not mutate the input. */
export function solve(grid: Grid, rng?: Rng): Grid | null {
  let solution: Grid | null = null;
  const s = prepare(
    grid,
    (found) => {
      solution = found;
      return true;
    },
    rng,
  );
  if (s) search(s);
  return solution;
}

/** Counts solutions, stopping once `limit` is reached (2 is enough to test uniqueness). */
export function countSolutions(grid: Grid, limit = 2): number {
  let count = 0;
  const s = prepare(grid, () => ++count >= limit);
  if (s) search(s);
  return count;
}

export function hasUniqueSolution(grid: Grid): boolean {
  return countSolutions(grid, 2) === 1;
}
