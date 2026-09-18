import { describe, expect, it } from "vitest";
import {
  activeSeconds,
  checkInClock,
  CHECK_IN_GRACE_MS,
  pauseClock,
  resumeClock,
  type GameClock,
} from "@/lib/gameTime";
import { isValidBoard, matchesSolution } from "@/lib/gameValidation";
import { createBoardState } from "@/lib/sudoku";

const PUZZLE = "530070000600195000098000060800060003400803001700020006060000280000419005000080079";
const SOLUTION =
  "534678912672195348198342567859761423426853791713924856961537284287419635345286179";

const at = (ms: number) => new Date(1_000_000 + ms);

describe("activeSeconds", () => {
  it("returns banked time while paused", () => {
    expect(
      activeSeconds({ playedMs: 42_000, resumedAt: null, lastSeenAt: at(0) }, at(99_000)),
    ).toBe(42);
  });

  it("adds the running time since the last resume", () => {
    const clock = { playedMs: 10_000, resumedAt: at(0), lastSeenAt: at(20_000) };
    expect(activeSeconds(clock, at(25_000))).toBe(35);
  });

  it("stops counting a grace period after the last check-in", () => {
    const clock = { playedMs: 0, resumedAt: at(0), lastSeenAt: at(10_000) };
    const hourLater = at(3_600_000);
    expect(activeSeconds(clock, hourLater)).toBe((10_000 + CHECK_IN_GRACE_MS) / 1000);
  });
});

describe("server clock over a real game", () => {
  it("saves after every move don't lose time (4 minutes stays 4 minutes)", () => {
    // The bug: every save restarted the clock and dropped the fraction of a second, which lost
    // about half a second per move (a 4:00 game was recorded as 3:32).
    let clock: GameClock = { playedMs: 0, resumedAt: at(0), lastSeenAt: at(0) };
    let t = 0;
    while (t < 240_000) {
      t += 2_300 + ((t / 7) % 1_700); // a save every 2.3-4 seconds, never on a whole second
      clock = { ...clock, ...checkInClock(clock, at(t)) };
    }
    expect(activeSeconds(clock, at(t))).toBe(Math.floor(t / 1000));
  });

  it("still drops a long gap without check-ins, counting only the grace period", () => {
    let clock: GameClock = { playedMs: 0, resumedAt: at(0), lastSeenAt: at(0) };
    // 1 minute of play, checking in every 15 seconds like the browser does.
    for (let t = 15_000; t <= 60_000; t += 15_000)
      clock = { ...clock, ...checkInClock(clock, at(t)) };
    // Laptop asleep for 10 minutes, then the player comes back.
    clock = { ...clock, ...checkInClock(clock, at(660_000)) };
    clock = { ...clock, ...checkInClock(clock, at(670_000)) }; // 10 more seconds of play
    expect(activeSeconds(clock, at(670_000))).toBe(60 + CHECK_IN_GRACE_MS / 1000 + 10);
  });

  it("pausing and resuming repeatedly doesn't drift", () => {
    let clock: GameClock = { playedMs: 0, resumedAt: null, lastSeenAt: at(0) };
    let t = 0;
    for (let i = 0; i < 40; i++) {
      clock = { ...clock, ...resumeClock(clock, at(t)) };
      t += 3_700; // play 3.7 seconds
      clock = { ...clock, ...pauseClock(clock, at(t)) };
      t += 5_000; // paused 5 seconds
    }
    // 40 x 3.7s = 148s of play, exactly: banking in milliseconds loses nothing at each pause.
    expect(activeSeconds(clock, at(t))).toBe(148);
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
