"use server";

// Server Functions are reachable by direct POST, so each one checks the session itself.
import { auth } from "@/auth";
import { saveServerSettings } from "@/db/settings";
import { resetServerStats } from "@/db/stats";

async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error("Sign in to use account settings.");
  return id;
}

/** Stores the player's settings; unknown keys and non-boolean values are dropped. */
export async function saveSettingsAction(settings: unknown): Promise<void> {
  await saveServerSettings(await requireUserId(), settings);
}

export async function resetStatsAction(): Promise<void> {
  await resetServerStats(await requireUserId());
}
