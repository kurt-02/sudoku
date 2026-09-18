import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { userSettings } from "@/db/schema";
import { sanitizeSettings, type Settings } from "@/lib/settings";

/** The player's saved settings, or null before they've ever been saved. */
export async function getServerSettings(userId: string): Promise<Settings | null> {
  const [row] = await getDb()
    .select({ settings: userSettings.settings })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  return row ? sanitizeSettings(row.settings) : null;
}

export async function saveServerSettings(userId: string, settings: unknown) {
  const clean = sanitizeSettings(settings);
  await getDb()
    .insert(userSettings)
    .values({ userId, settings: clean })
    .onConflictDoUpdate({ target: userSettings.userId, set: { settings: clean } });
}
