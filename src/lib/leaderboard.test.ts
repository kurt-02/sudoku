import { describe, expect, it } from "vitest";
import { leaderboardName } from "@/lib/leaderboard";

describe("leaderboardName", () => {
  it("shows first name and last initial only", () => {
    expect(leaderboardName("Kurt Valderama")).toBe("Kurt V.");
    expect(leaderboardName("Ana Maria de la cruz")).toBe("Ana C.");
    expect(leaderboardName("  Kurt  ")).toBe("Kurt");
  });

  it("falls back when there's no name", () => {
    expect(leaderboardName(null)).toBe("Player");
    expect(leaderboardName("   ")).toBe("Player");
  });
});
