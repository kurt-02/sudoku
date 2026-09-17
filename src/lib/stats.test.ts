import { describe, expect, it } from "vitest";
import {
  averageWinSeconds,
  emptyStats,
  parseStats,
  recordAbandon,
  recordLoss,
  recordStart,
  recordWin,
  winRate,
} from "@/lib/stats";

describe("stats", () => {
  it("tracks wins, best and average times, and streaks per difficulty", () => {
    let s = emptyStats();
    s = recordWin(recordStart(s, "easy"), "easy", 300);
    s = recordWin(recordStart(s, "easy"), "easy", 200);
    s = recordLoss(recordStart(s, "easy"), "easy");
    s = recordWin(recordStart(s, "easy"), "easy", 400);

    const easy = s.byDifficulty.easy;
    expect(easy).toMatchObject({ started: 4, won: 3, lost: 1, bestSeconds: 200 });
    expect(easy.currentStreak).toBe(1);
    expect(easy.bestStreak).toBe(2);
    expect(winRate(easy)).toBe(75);
    expect(averageWinSeconds(easy)).toBe(300);
    expect(s.byDifficulty.hard.started).toBe(0);
  });

  it("breaks the streak when a game is abandoned", () => {
    let s = recordWin(recordStart(emptyStats(), "medium"), "medium", 100);
    s = recordAbandon(s, "medium");
    expect(s.byDifficulty.medium.currentStreak).toBe(0);
    expect(s.byDifficulty.medium.bestStreak).toBe(1);
  });

  it("reports no rate or average before any games", () => {
    const easy = emptyStats().byDifficulty.easy;
    expect(winRate(easy)).toBeNull();
    expect(averageWinSeconds(easy)).toBeNull();
  });

  it("round-trips through JSON and ignores corrupt data", () => {
    const s = recordWin(recordStart(emptyStats(), "hard"), "hard", 999);
    expect(parseStats(JSON.stringify(s))).toEqual(s);
    expect(parseStats(null)).toEqual(emptyStats());
    expect(parseStats("not json")).toEqual(emptyStats());
    expect(parseStats(JSON.stringify({ version: 1, byDifficulty: {} }))).toEqual(emptyStats());
  });
});
