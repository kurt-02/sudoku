// Runs against the real database in DATABASE_URL. Opt in with: RUN_DB_TESTS=1 npm test
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
// Next.js skips .env.local when NODE_ENV is "test", so load it directly.
if (process.env.RUN_DB_TESTS && !process.env.DATABASE_URL) process.loadEnvFile(".env.local");

describe.skipIf(!process.env.RUN_DB_TESTS)("server games (database)", async () => {
  const { eq } = await import("drizzle-orm");
  const { getDb } = await import("@/db");
  const { games, users } = await import("@/db/schema");
  const { createGame, finishGame, getPlayingGame, saveGame, setGamePaused } =
    await import("@/db/games");
  const { upsertGoogleUser } = await import("@/db/users");

  let userId = "";

  beforeAll(async () => {
    userId = await upsertGoogleUser({
      googleId: `test-${Date.now()}`,
      name: "Integration test",
      email: null,
      image: null,
    });
  });

  afterAll(async () => {
    // Deleting the player cascades to their games.
    await getDb().delete(users).where(eq(users.id, userId));
  });

  it("creates a game without sending the solution, and keeps one game in progress", async () => {
    const first = await createGame(userId, { difficulty: "easy" });
    expect(first).not.toBeNull();
    expect(first).not.toHaveProperty("solution");
    const second = await createGame(userId, { difficulty: "medium" });
    const playing = await getPlayingGame(userId);
    expect(playing?.id).toBe(second!.id);
    const [old] = await getDb().select().from(games).where(eq(games.id, first!.id));
    expect(old.status).toBe("abandoned");
  });

  it("saves boards, rejects tampered ones, and only lets counts go up", async () => {
    const game = (await createGame(userId, { difficulty: "easy" }))!;
    expect(await saveGame(userId, game.id, { cells: game.cells, mistakes: 2, hintsUsed: 1 })).toBe(
      "ok",
    );
    expect(await saveGame(userId, game.id, { cells: game.cells, mistakes: 0, hintsUsed: 0 })).toBe(
      "ok",
    );
    const saved = await getPlayingGame(userId);
    expect(saved?.mistakes).toBe(2);
    expect(saved?.hintsUsed).toBe(1);

    const tampered = game.cells.map((c) =>
      c.isGiven ? { ...c, value: c.value === 1 ? 2 : 1 } : c,
    );
    expect(await saveGame(userId, game.id, { cells: tampered, mistakes: 2, hintsUsed: 1 })).toBe(
      "invalid",
    );
    expect(
      await saveGame("00000000-0000-0000-0000-000000000000", game.id, {
        cells: game.cells,
        mistakes: 0,
        hintsUsed: 0,
      }),
    ).toBe("gone");
  });

  it("only accepts a win that matches the stored solution", async () => {
    const game = (await createGame(userId, { difficulty: "easy" }))!;
    const notSolved = await finishGame(userId, game.id, {
      cells: game.cells,
      mistakes: 0,
      hintsUsed: 0,
      outcome: "won",
    });
    expect(notSolved.status).toBe("not-solved");

    const [row] = await getDb().select().from(games).where(eq(games.id, game.id));
    const solved = game.cells.map((c, i) => ({ ...c, value: Number(row.solution[i]), notes: [] }));
    expect(await setGamePaused(userId, game.id, true)).toBe("ok");
    const won = await finishGame(userId, game.id, {
      cells: solved,
      mistakes: 0,
      hintsUsed: 0,
      outcome: "won",
    });
    expect(won.status).toBe("ok");
    // Finished games can't be saved or finished again.
    expect(await saveGame(userId, game.id, { cells: solved, mistakes: 0, hintsUsed: 0 })).toBe(
      "gone",
    );
  });

  it("retries the same puzzle as a new game", async () => {
    const game = (await createGame(userId, { difficulty: "hard" }))!;
    const retry = (await createGame(userId, { retryOf: game.id }))!;
    expect(retry.id).not.toBe(game.id);
    expect(retry.difficulty).toBe("hard");
    expect(retry.cells.map((c) => c.value)).toEqual(game.cells.map((c) => c.value));
  });
});
