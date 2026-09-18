import "server-only";
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
