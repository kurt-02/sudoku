import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { userSettings, users } from "@/db/schema";
import { sanitizeSettings, type Settings } from "@/lib/settings";

type GoogleProfile = {
  googleId: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

/** Creates the player on first sign-in, or refreshes their name and picture. Returns their id. */
export async function upsertGoogleUser(profile: GoogleProfile): Promise<string> {
  const [row] = await getDb()
    .insert(users)
    .values(profile)
    .onConflictDoUpdate({
      target: users.googleId,
      set: { name: profile.name, email: profile.email, image: profile.image },
    })
    .returning({ id: users.id });
  return row.id;
}

export type Account = {
  showOnLeaderboard: boolean;
  /** Null if the player has never saved settings. */
  settings: Settings | null;
};

/**
 * What the page needs about the signed-in player, in one query. Null if the account no longer
 * exists (it may have been deleted on another device).
 */
export async function getAccount(userId: string): Promise<Account | null> {
  const [row] = await getDb()
    .select({ showOnLeaderboard: users.showOnLeaderboard, settings: userSettings.settings })
    .from(users)
    .leftJoin(userSettings, eq(userSettings.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);
  if (!row) return null;
  return {
    showOnLeaderboard: row.showOnLeaderboard,
    settings: row.settings ? sanitizeSettings(row.settings) : null,
  };
}

/** Permanently deletes the player; their games, stats, and settings go with them (cascade). */
export async function deleteUser(userId: string): Promise<void> {
  await getDb().delete(users).where(eq(users.id, userId));
}

export async function setLeaderboardVisibility(userId: string, show: boolean): Promise<void> {
  await getDb().update(users).set({ showOnLeaderboard: show }).where(eq(users.id, userId));
}
