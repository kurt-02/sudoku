import {
  boolean,
  char,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { Settings } from "@/lib/settings";
import type { Cell } from "@/types/game";

export const difficulty = pgEnum("difficulty", ["easy", "medium", "hard"]);
export const gameStatus = pgEnum("game_status", ["playing", "won", "lost", "abandoned"]);

/*
 * Every table enables Row Level Security with no policies. Supabase publishes the `public`
 * schema through its web API; with RLS on and no policies, that API can read and write nothing.
 * The app connects as the database owner, which RLS doesn't restrict.
 */

const createdAt = timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = timestamp("updated_at", { withTimezone: true })
  .notNull()
  .defaultNow()
  .$onUpdate(() => new Date());

/** One row per Google account. Name and picture are shown on the leaderboard. */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Google's stable account id (the OpenID `sub`); never changes even if the email does. */
  googleId: text("google_id").notNull().unique(),
  name: text("name"),
  email: text("email"),
  image: text("image"),
  /** Players can hide themselves from the public leaderboard. */
  showOnLeaderboard: boolean("show_on_leaderboard").notNull().default(true),
  createdAt,
  updatedAt,
}).enableRLS();

/**
 * A server-owned play-through. The solution never leaves the server except as needed for play,
 * and the finished board is checked against it before a win counts.
 */
export const games = pgTable(
  "games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    difficulty: difficulty("difficulty").notNull(),
    /** 81 digits, 0 for empty: the givens and the unique answer. */
    puzzle: char("puzzle", { length: 81 }).notNull(),
    solution: char("solution", { length: 81 }).notNull(),
    /** The player's board, including notes, as last saved. */
    cells: jsonb("cells").$type<Cell[]>().notNull(),
    /**
     * The official whole-second play time, written when the game finishes (stats and the
     * leaderboard read it). While playing, the clock lives in `playedMs`.
     */
    seconds: integer("seconds").notNull().default(0),
    /** Play time banked by the server, in milliseconds; see lib/gameTime.ts. */
    playedMs: integer("played_ms").notNull().default(0),
    mistakes: integer("mistakes").notNull().default(0),
    hintsUsed: integer("hints_used").notNull().default(0),
    status: gameStatus("status").notNull().default("playing"),
    /**
     * Brought over from guest play on sign-in. Its earlier time and moves weren't seen by the
     * server, so it counts toward the player's own stats but never the leaderboard.
     */
    imported: boolean("imported").notNull().default(false),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    /** When the clock last started running; null while paused or finished. */
    resumedAt: timestamp("resumed_at", { withTimezone: true }),
    /** Last save or check-in from the player, to stop counting time after a tab is closed. */
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    updatedAt,
  },
  (t) => [
    index("games_user_status_idx").on(t.userId, t.status),
    // Leaderboards scan finished games per difficulty.
    index("games_leaderboard_idx").on(t.difficulty, t.status),
  ],
).enableRLS();

/**
 * Running totals per player and difficulty, shown in the player's own stats. They can include
 * guest progress imported on sign-in, so the leaderboard never reads them (see db/leaderboard.ts).
 */
export const userStats = pgTable(
  "user_stats",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    difficulty: difficulty("difficulty").notNull(),
    started: integer("started").notNull().default(0),
    won: integer("won").notNull().default(0),
    lost: integer("lost").notNull().default(0),
    bestSeconds: integer("best_seconds"),
    totalWinSeconds: integer("total_win_seconds").notNull().default(0),
    currentStreak: integer("current_streak").notNull().default(0),
    bestStreak: integer("best_streak").notNull().default(0),
    updatedAt,
  },
  (t) => [primaryKey({ columns: [t.userId, t.difficulty] })],
).enableRLS();

/** Settings that follow the account across devices. */
export const userSettings = pgTable("user_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  settings: jsonb("settings").$type<Partial<Settings>>().notNull(),
  updatedAt,
}).enableRLS();
