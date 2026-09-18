// Runs against the real database in DATABASE_URL. Opt in with: RUN_DB_TESTS=1 npm test
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
// Next.js skips .env.local when NODE_ENV is "test", so load it directly.
if (process.env.RUN_DB_TESTS && !process.env.DATABASE_URL) process.loadEnvFile(".env.local");

describe.skipIf(!process.env.RUN_DB_TESTS)(
  "leaderboard (database)",
  { timeout: 30_000 },
  async () => {
    const { inArray } = await import("drizzle-orm");
    const { getDb } = await import("@/db");
    const { games, users } = await import("@/db/schema");
    const { getLeaderboardBoard } = await import("@/db/leaderboard");
    type Category = "fastest" | "wins" | "streak";
    const board = (viewer: string, category: Category) =>
      getLeaderboardBoard(viewer, "hard", category);
    const { setLeaderboardVisibility, upsertGoogleUser } = await import("@/db/users");
    const { createBoardState } = await import("@/lib/sudoku");

    const PUZZLE =
      "530070000600195000098000060800060003400803001700020006060000280000419005000080079";
    const SOLUTION =
      "534678912672195348198342567859761423426853791713924856961537284287419635345286179";
    const stamp = Date.now();
    let me = "";
    let hidden = "";
    const start = new Date("2026-01-01T00:00:00Z").getTime();
    let minute = 0;

    /** A finished hard game, one minute after the previous one. */
    async function played(
      userId: string,
      game: {
        status: "won" | "lost" | "abandoned";
        seconds?: number;
        mistakes?: number;
        imported?: boolean;
      },
    ) {
      await getDb()
        .insert(games)
        .values({
          userId,
          difficulty: "hard",
          puzzle: PUZZLE,
          solution: SOLUTION,
          cells: createBoardState(PUZZLE).cells,
          status: game.status,
          seconds: game.seconds ?? 120,
          mistakes: game.mistakes ?? 0,
          imported: game.imported ?? false,
          finishedAt: new Date(start + ++minute * 60_000),
        });
    }

    beforeAll(async () => {
      me = await upsertGoogleUser({
        googleId: `test-lb-me-${stamp}`,
        name: "Leader Tester",
        email: null,
        image: null,
      });
      hidden = await upsertGoogleUser({
        googleId: `test-lb-hidden-${stamp}`,
        name: "Hidden Tester",
        email: null,
        image: null,
      });
      await setLeaderboardVisibility(hidden, false);

      await played(me, { status: "won", seconds: 90 });
      await played(me, { status: "won", seconds: 70 }); // fastest that counts
      await played(me, { status: "won", seconds: 40 }); // too fast for hard: doesn't count
      await played(me, { status: "lost" });
      await played(me, { status: "won", seconds: 65, imported: true }); // imported: doesn't count
      await played(me, { status: "won", seconds: 61, mistakes: 3 }); // limit was off: doesn't count
      await played(me, { status: "won", seconds: 100 });
      await played(hidden, { status: "won", seconds: 61 });
    });

    afterAll(async () => {
      await getDb()
        .delete(users)
        .where(inArray(users.id, [me, hidden]));
    });

    it("only counts checked wins under the rules", async () => {
      const mine = async (category: Category) => (await board(me, category)).find((e) => e.isMe);
      expect((await mine("fastest"))?.value).toBe(70);
      expect((await mine("wins"))?.value).toBe(3); // 90, 70, 100
      // Runs: 90, 70 | broken by the too-fast win, the loss, and the over-limit win | 100.
      // Imported games are skipped entirely. Longest run: 2.
      expect((await mine("streak"))?.value).toBe(2);
      expect((await mine("fastest"))?.name).toBe("Leader T.");
    });

    it("leaves hidden players off every board", async () => {
      for (const category of ["fastest", "wins", "streak"] as const) {
        expect((await board(me, category)).some((e) => e.name === "Hidden T.")).toBe(false);
      }
      expect((await board(hidden, "fastest")).some((e) => e.isMe)).toBe(false);
    });

    it("orders boards best first and never exposes emails", async () => {
      const top = (await board(me, "fastest")).filter((e) => e.rank <= 10);
      const times = top.map((e) => e.value);
      expect(times).toEqual([...times].sort((a, b) => a - b));
      for (const entry of top)
        expect(Object.keys(entry).sort()).toEqual(["image", "isMe", "name", "rank", "value"]);
    });
  },
);
