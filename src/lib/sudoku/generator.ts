import type { Grid } from "./grid";
import { shuffle, type Rng } from "./random";
import { hasUniqueSolution, solve } from "./solver";

export type Difficulty = "easy" | "medium" | "hard";

/** Target number of givens. Hard can land a few above target when no more cells can be removed. */
export const CLUE_TARGETS: Record<Difficulty, number> = {
  easy: 40,
  medium: 32,
  hard: 24,
};

export type Puzzle = {
  puzzle: Grid;
  solution: Grid;
  difficulty: Difficulty;
};

/** A random, completely filled, valid grid. */
export function generateSolution(rng: Rng = Math.random): Grid {
  const solution = solve(Array<number>(81).fill(0), rng);
  if (!solution) throw new Error("Failed to generate a solution");
  return solution;
}

/** Removes givens from a random solution while keeping the puzzle uniquely solvable. */
export function generatePuzzle(difficulty: Difficulty = "medium", rng: Rng = Math.random): Puzzle {
  const solution = generateSolution(rng);
  const puzzle = [...solution];
  const target = CLUE_TARGETS[difficulty];
  const order = shuffle(
    Array.from({ length: 81 }, (_, i) => i),
    rng,
  );
  let clues = 81;

  for (const i of order) {
    if (clues <= target) break;
    puzzle[i] = 0;
    if (hasUniqueSolution(puzzle)) clues--;
    else puzzle[i] = solution[i];
  }

  return { puzzle, solution, difficulty };
}
