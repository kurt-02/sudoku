import { auth } from "@/auth";
import SudokuGame from "@/components/SudokuGame";
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

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-5">
      <SudokuGame user={user} />
    </main>
  );
}
