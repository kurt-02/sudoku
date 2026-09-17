import { describe, expect, it } from "vitest";
import {
  CLUE_TARGETS,
  blockingPeers,
  completedDigits,
  completedUnits,
  GRID_SIZE,
  countSolutions,
  createBoardState,
  digitCounts,
  findConflicts,
  gameReducer,
  generatePuzzle,
  gridFromString,
  gridToString,
  hasUniqueSolution,
  isSolved,
  mulberry32,
  peersOf,
  solve,
} from "@/lib/sudoku";

const PUZZLE = "530070000600195000098000060800060003400803001700020006060000280000419005000080079";
const SOLUTION =
  "534678912672195348198342567859761423426853791713924856961537284287419635345286179";

describe("sudoku engine smoke test", () => {
  it("resolves the @/* alias and runs", () => {
    expect(GRID_SIZE).toBe(9);
  });
});

describe("coords", () => {
  it("gives every cell 20 distinct peers, excluding itself", () => {
    for (let i = 0; i < 81; i++) {
      const peers = peersOf(i);
      expect(peers).toHaveLength(20);
      expect(new Set(peers).size).toBe(20);
      expect(peers).not.toContain(i);
    }
  });
});

describe("validate", () => {
  it("finds no conflicts in a valid puzzle", () => {
    expect(findConflicts(gridFromString(PUZZLE)).size).toBe(0);
  });

  it("flags both cells of a duplicate", () => {
    const grid = gridFromString(PUZZLE);
    grid[2] = 5; // row 0 already has a 5 at index 0
    expect([...findConflicts(grid)].sort((a, b) => a - b)).toEqual([0, 2]);
  });

  it("counts each digit on the board", () => {
    const counts = digitCounts(gridFromString(PUZZLE));
    expect(counts[0]).toBe(51); // 30 givens
    expect(counts[5]).toBe(3);
    expect(counts.slice(1).reduce((a, b) => a + b)).toBe(30);
  });

  it("reports completed digits, ignoring ones with conflicts", () => {
    expect(completedDigits(gridFromString(PUZZLE)).size).toBe(0);
    expect(completedDigits(gridFromString(SOLUTION))).toEqual(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]));

    const grid = gridFromString(SOLUTION);
    [grid[0], grid[1]] = [grid[1], grid[0]]; // swap a 5 and a 3 in row 0: still 9 of each, but conflicting
    const done = completedDigits(grid);
    expect(done.has(5)).toBe(false);
    expect(done.has(3)).toBe(false);
    expect(done.has(4)).toBe(true);
  });

  it("finds completed rows, columns, and boxes", () => {
    const solution = gridFromString(SOLUTION);
    expect(completedUnits(gridFromString(PUZZLE), solution)).toEqual([]);
    expect(completedUnits(solution, solution)).toHaveLength(27);

    const grid = gridFromString(SOLUTION);
    grid[80] = 0; // bottom-right cell empty: row 8, column 8, and box 8 are incomplete
    const keys = completedUnits(grid, solution).map((u) => u.key);
    expect(keys).toHaveLength(24);
    expect(keys).not.toContain("row-8");
    expect(keys).not.toContain("col-8");
    expect(keys).not.toContain("box-8");

    grid[80] = 3; // wrong digit: still not complete against the solution
    expect(completedUnits(grid, solution)).toHaveLength(24);
  });

  it("knows when the board is solved", () => {
    expect(isSolved(createBoardState(SOLUTION).cells)).toBe(true);
    expect(isSolved(createBoardState(PUZZLE).cells)).toBe(false);
  });
});

describe("solver", () => {
  it("solves a known puzzle without mutating the input", () => {
    const grid = gridFromString(PUZZLE);
    expect(gridToString(solve(grid)!)).toBe(SOLUTION);
    expect(gridToString(grid)).toBe(PUZZLE);
  });

  it("returns null for contradictory givens", () => {
    const grid = gridFromString(PUZZLE);
    grid[2] = 5;
    expect(solve(grid)).toBeNull();
    expect(countSolutions(grid)).toBe(0);
  });

  it("detects multiple solutions", () => {
    expect(hasUniqueSolution(gridFromString(PUZZLE))).toBe(true);
    expect(countSolutions(Array(81).fill(0), 5)).toBe(5);
  });
});

describe("generator", () => {
  it.each(["easy", "medium", "hard"] as const)("makes a unique %s puzzle", (difficulty) => {
    const { puzzle, solution } = generatePuzzle(difficulty, mulberry32(42));
    const clues = puzzle.filter((d) => d !== 0).length;

    expect(isSolved(createBoardState(gridToString(solution)).cells)).toBe(true);
    expect(hasUniqueSolution(puzzle)).toBe(true);
    expect(solve(puzzle)).toEqual(solution);
    puzzle.forEach((d, i) => d !== 0 && expect(d).toBe(solution[i]));
    expect(clues).toBeGreaterThanOrEqual(CLUE_TARGETS[difficulty]);
    if (difficulty !== "hard") expect(clues).toBe(CLUE_TARGETS[difficulty]);
  });

  it("is reproducible from a seed", () => {
    expect(generatePuzzle("medium", mulberry32(7))).toEqual(
      generatePuzzle("medium", mulberry32(7)),
    );
  });
});

describe("gameReducer", () => {
  const start = createBoardState(PUZZLE);
  const EMPTY = 2; // row 0, col 2 is empty

  it("ignores input without a selection or on a given", () => {
    expect(gameReducer(start, { type: "input", digit: 4 })).toBe(start);
    const onGiven = gameReducer(start, { type: "select", index: 0 });
    expect(gameReducer(onGiven, { type: "input", digit: 4 })).toBe(onGiven);
  });

  it("places, toggles off, and erases a digit", () => {
    let s = gameReducer(start, { type: "select", index: EMPTY });
    s = gameReducer(s, { type: "input", digit: 4 });
    expect(s.cells[EMPTY].value).toBe(4);
    expect(gameReducer(s, { type: "input", digit: 4 }).cells[EMPTY].value).toBeNull();
    expect(gameReducer(s, { type: "erase" }).cells[EMPTY].value).toBeNull();
  });

  it("toggles sorted notes and clears peer notes when a digit is placed", () => {
    let s = gameReducer(start, { type: "toggleNoteMode" });
    s = gameReducer(s, { type: "select", index: EMPTY });
    s = gameReducer(s, { type: "input", digit: 4 });
    s = gameReducer(s, { type: "input", digit: 1 });
    expect(s.cells[EMPTY].notes).toEqual([1, 4]);

    s = gameReducer(s, { type: "toggleNoteMode" });
    s = gameReducer(s, { type: "select", index: 3 }); // same row
    s = gameReducer(s, { type: "input", digit: 4 });
    expect(s.cells[EMPTY].notes).toEqual([1]);
  });

  it("rejects notes for digits already in the row, column, or box", () => {
    const s = gameReducer(start, { type: "select", index: EMPTY });
    // Row 0 has a 5 at index 0; box 0 has a 6 at index 9.
    expect(blockingPeers(gridFromString(PUZZLE), EMPTY, 5)).toEqual([0]);
    expect(blockingPeers(gridFromString(PUZZLE), EMPTY, 6)).toEqual([9]);
    expect(gameReducer(s, { type: "input", digit: 5, asNote: true })).toBe(s);
    expect(gameReducer(s, { type: "input", digit: 6, asNote: true })).toBe(s);
  });

  it("writes a note with asNote while note mode stays off", () => {
    let s = gameReducer(start, { type: "select", index: EMPTY });
    s = gameReducer(s, { type: "input", digit: 4, asNote: true });
    expect(s.noteMode).toBe(false);
    expect(s.cells[EMPTY].value).toBeNull();
    expect(s.cells[EMPTY].notes).toEqual([4]);
  });

  it("moves the selection and wraps at the edges", () => {
    let s = gameReducer(start, { type: "move", direction: "up" });
    expect(s.selectedIndex).toBe(0);
    s = gameReducer(s, { type: "move", direction: "up" });
    expect(s.selectedIndex).toBe(72);
    s = gameReducer(s, { type: "move", direction: "left" });
    expect(s.selectedIndex).toBe(80);
  });
});
