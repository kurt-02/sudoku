import SudokuGame from "@/components/SudokuGame";

export const metadata = { title: "Play Sudoku" };

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-background px-6 text-center">
      <SudokuGame />
    </main>
  );
}
