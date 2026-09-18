import { auth } from "@/auth";
import SudokuGame from "@/components/SudokuGame";
import { getPlayingGame, type ServerGame } from "@/db/games";
import type { SessionUser } from "@/types/auth";

export const metadata = { title: "Play Sudoku" };

export default async function Home() {
  // Reading the session cookie makes this page render per request.
  const session = await auth();
  const user: SessionUser | null = session?.user
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
  if (session?.user?.id) {
    try {
      serverGame = await getPlayingGame(session.user.id);
      accountGames = true;
    } catch (error) {
      console.error("[home] could not load the saved game", error);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-5">
      <SudokuGame user={user} accountGames={accountGames} serverGame={serverGame} />
    </main>
  );
}
