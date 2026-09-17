import SudokuBoard from "@/components/SudokuBoard";

export const metadata = { title: "Play Sudoku" }

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 text-center dark:bg-zinc-950">
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
            Sudoku
        </h1>
        <p className="mt-4 max-w-md text-lg text-zinc-600 dark:text-zinc-400">
            A clean, fast Sudoku you can play in the browser. Coming soon.
        </p>

        <SudokuBoard />   
    </main>
  );
}
