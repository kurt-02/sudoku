import { describe, expect, it } from "vitest";
import { activeSeconds, CHECK_IN_GRACE_MS } from "@/lib/gameTime";
import { isValidBoard, matchesSolution } from "@/lib/gameValidation";
import { createBoardState } from "@/lib/sudoku";

const PUZZLE = "530070000600195000098000060800060003400803001700020006060000280000419005000080079";
const SOLUTION =
  "534678912672195348198342567859761423426853791713924856961537284287419635345286179";

const at = (ms: number) => new Date(1_000_000 + ms);

describe("activeSeconds", () => {
  it("returns banked time while paused", () => {
    expect(activeSeconds({ seconds: 42, resumedAt: null, lastSeenAt: at(0) }, at(99_000))).toBe(42);
  });

  it("adds the running time since the last resume", () => {
    const clock = { seconds: 10, resumedAt: at(0), lastSeenAt: at(20_000) };
    expect(activeSeconds(clock, at(25_000))).toBe(35);
  });

  it("stops counting a grace period after the last check-in", () => {
    const clock = { seconds: 0, resumedAt: at(0), lastSeenAt: at(10_000) };
    const hourLater = at(3_600_000);
    expect(activeSeconds(clock, hourLater)).toBe((10_000 + CHECK_IN_GRACE_MS) / 1000);
  });
});

describe("isValidBoard", () => {
  const cells = createBoardState(PUZZLE).cells;

  it("accepts the puzzle's own board", () => {
    expect(isValidBoard(cells, PUZZLE)).toBe(true);
  });

  it("rejects changed givens, fake givens, and malformed cells", () => {
    const changedGiven = cells.map((c, i) => (i === 0 ? { ...c, value: 1 } : c));
    const fakeGiven = cells.map((c, i) => (i === 2 ? { ...c, value: 4, isGiven: true } : c));
    const badNotes = cells.map((c, i) => (i === 2 ? { ...c, notes: [1, 1] } : c));
    expect(isValidBoard(changedGiven, PUZZLE)).toBe(false);
    expect(isValidBoard(fakeGiven, PUZZLE)).toBe(false);
    expect(isValidBoard(badNotes, PUZZLE)).toBe(false);
    expect(isValidBoard(cells.slice(1), PUZZLE)).toBe(false);
    expect(isValidBoard("nope", PUZZLE)).toBe(false);
  });
});

describe("matchesSolution", () => {
  it("only accepts a board equal to the solution", () => {
    const solved = [...SOLUTION].map((d, i) => ({
      value: Number(d),
      isGiven: PUZZLE[i] !== "0",
      notes: [],
    }));
    expect(matchesSolution(solved, SOLUTION)).toBe(true);
    expect(matchesSolution(createBoardState(PUZZLE).cells, SOLUTION)).toBe(false);
  });
});
