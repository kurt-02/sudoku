import { describe, expect, it } from "vitest";
import {
  createBoardState,
  findHintCell,
  gameReducer,
  gridFromString,
  HINTS_BY_DIFFICULTY,
} from "@/lib/sudoku";

const PUZZLE = "530070000600195000098000060800060003400803001700020006060000280000419005000080079";
const SOLUTION = gridFromString(
  "534678912672195348198342567859761423426853791713924856961537284287419635345286179",
);
const EMPTY = 2; // row 0, col 2 is empty; its answer is 4

describe("hints", () => {
  it("gives more hints on harder difficulties", () => {
    expect(HINTS_BY_DIFFICULTY).toEqual({ easy: 1, medium: 2, hard: 3 });
  });

  it("prefers the selected cell when it needs help", () => {
    const { cells } = createBoardState(PUZZLE);
    expect(findHintCell(cells, SOLUTION, EMPTY)).toBe(EMPTY);
  });

  it("falls back to the cell with the fewest candidates", () => {
    const { cells } = createBoardState(PUZZLE);
    const index = findHintCell(cells, SOLUTION, 0)!; // 0 is a given
    expect(cells[index].value).toBeNull();
  });

  it("targets wrong entries and returns null once everything is correct", () => {
    const board = createBoardState(PUZZLE);
    const wrong = gameReducer(gameReducer(board, { type: "select", index: EMPTY }), {
      type: "input",
      digit: 1,
    });
    expect(findHintCell(wrong.cells, SOLUTION, EMPTY)).toBe(EMPTY);

    const solved = createBoardState(SOLUTION.join(""));
    expect(findHintCell(solved.cells, SOLUTION, null)).toBeNull();
  });
});
