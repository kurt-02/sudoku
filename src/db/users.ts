import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";

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

/** Whether the player's account still exists (it may have been deleted on another device). */
export async function userExists(userId: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return Boolean(row);
}

/** Permanently deletes the player; their games, stats, and settings go with them (cascade). */
export async function deleteUser(userId: string): Promise<void> {
  await getDb().delete(users).where(eq(users.id, userId));
}
