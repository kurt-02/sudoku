import { describe, expect, it } from "vitest";
import { parseSavedGame } from "@/lib/savedGame";
import { createBoardState } from "@/lib/sudoku";

const PUZZLE = "530070000600195000098000060800060003400803001700020006060000280000419005000080079";
const SOLUTION =
  "534678912672195348198342567859761423426853791713924856961537284287419635345286179";

function save(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    version: 1,
    difficulty: "medium",
    cells: createBoardState(PUZZLE).cells,
    noteMode: false,
    seconds: 42,
    ...overrides,
  });
}

describe("parseSavedGame", () => {
  it("round-trips a valid unfinished game", () => {
    const game = parseSavedGame(save());
    expect(game?.difficulty).toBe("medium");
    expect(game?.seconds).toBe(42);
    expect(game?.cells).toHaveLength(81);
  });

  it("returns null for missing or corrupt data", () => {
    expect(parseSavedGame(null)).toBeNull();
    expect(parseSavedGame("not json")).toBeNull();
    expect(parseSavedGame(save({ version: 2 }))).toBeNull();
    expect(parseSavedGame(save({ difficulty: "extreme" }))).toBeNull();
    expect(parseSavedGame(save({ seconds: -1 }))).toBeNull();
    expect(parseSavedGame(save({ cells: [] }))).toBeNull();
  });

  it("tracks mistakes, defaulting old saves to 0 and dropping lost games", () => {
    expect(parseSavedGame(save({ mistakes: 2 }))?.mistakes).toBe(2);
    expect(parseSavedGame(save())?.mistakes).toBe(0);
    expect(parseSavedGame(save({ mistakes: 3 }))).toBeNull();
  });

  it("ignores a game that is already solved", () => {
    expect(parseSavedGame(save({ cells: createBoardState(SOLUTION).cells }))).toBeNull();
  });
});
