import { auth } from "@/auth";
import SudokuGame from "@/components/SudokuGame";
import { getPlayingGame, type ServerGame } from "@/db/games";
import { getServerSettings } from "@/db/settings";
import { userExists } from "@/db/users";
import type { Settings } from "@/lib/settings";
import type { SessionUser } from "@/types/auth";

export const metadata = { title: "Play Sudoku" };

export default async function Home() {
  // Reading the session cookie makes this page render per request.
  const session = await auth();
  let user: SessionUser | null = session?.user
    ? {
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
      }
    : null;

  // Signed-in players keep games on the server. If the database can't be reached, they fall back
  // to playing on this device like a guest rather than being locked out.
  let accountGames = false;
  let serverGame: ServerGame | null = null;
  let accountSettings: Settings | null = null;
  if (session?.user?.id) {
    try {
      let exists: boolean;
      [exists, serverGame, accountSettings] = await Promise.all([
        userExists(session.user.id),
        getPlayingGame(session.user.id),
        getServerSettings(session.user.id),
      ]);
      // The account was deleted (e.g. from another device) but this browser's sign-in cookie
      // remains: show the page as signed out, so signing in again starts a fresh account.
      if (exists) accountGames = true;
      else user = null;
    } catch (error) {
      console.error("[home] could not load the saved game", error);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-5">
      <SudokuGame
        user={user}
        accountGames={accountGames}
        serverGame={serverGame}
        accountSettings={accountSettings}
      />
    </main>
  );
}
