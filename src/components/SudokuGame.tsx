"use client";

import { useState } from "react";
import DifficultyMenu from "@/components/DifficultyMenu";
import SudokuBoard from "@/components/SudokuBoard";
import { generatePuzzle, gridToString, type Difficulty } from "@/lib/sudoku";

type Game = {
  /** Remounts the board on every new game so its state starts fresh. */
  id: number;
  difficulty: Difficulty;
  puzzle: string;
};

/** Top-level flow: pick a difficulty, then play. */
export default function SudokuGame() {
  const [game, setGame] = useState<Game | null>(null);

  function startGame(difficulty: Difficulty) {
    // Generated on click (in the browser), so there's no server/client hydration mismatch.
    const puzzle = gridToString(generatePuzzle(difficulty).puzzle);
    setGame((prev) => ({ id: (prev?.id ?? 0) + 1, difficulty, puzzle }));
  }

  if (!game) return <DifficultyMenu onSelect={startGame} />;

  return (
    <SudokuBoard
      key={game.id}
      initialPuzzle={game.puzzle}
      difficulty={game.difficulty}
      onExit={() => setGame(null)}
    />
  );
}
