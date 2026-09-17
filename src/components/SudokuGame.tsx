"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import DifficultyMenu from "@/components/DifficultyMenu";
import SudokuBoard from "@/components/SudokuBoard";
import { parseSavedGame, readSavedGameRaw, subscribeSavedGame } from "@/lib/savedGame";
import { createBoardState, generatePuzzle, gridToString, type Difficulty } from "@/lib/sudoku";
import type { BoardState } from "@/types/game";

type Game = {
  /** Remounts the board on every new game so its state starts fresh. */
  id: number;
  difficulty: Difficulty;
  initialBoard: BoardState;
  initialSeconds: number;
  initialMistakes: number;
};

/** Top-level flow: pick a difficulty (or continue a saved game), then play. */
export default function SudokuGame() {
  const [game, setGame] = useState<Game | null>(null);

  // localStorage only exists in the browser; the server snapshot (null) keeps hydration consistent.
  const savedRaw = useSyncExternalStore(subscribeSavedGame, readSavedGameRaw, () => null);
  const saved = useMemo(() => parseSavedGame(savedRaw), [savedRaw]);

  function startGame(difficulty: Difficulty) {
    // Generated on click (in the browser), so there's no server/client hydration mismatch.
    const puzzle = gridToString(generatePuzzle(difficulty).puzzle);
    setGame((prev) => ({
      id: (prev?.id ?? 0) + 1,
      difficulty,
      initialBoard: createBoardState(puzzle),
      initialSeconds: 0,
      initialMistakes: 0,
    }));
  }

  function continueGame() {
    if (!saved) return;
    setGame((prev) => ({
      id: (prev?.id ?? 0) + 1,
      difficulty: saved.difficulty,
      initialBoard: { cells: saved.cells, selectedIndex: null, noteMode: saved.noteMode },
      initialSeconds: saved.seconds,
      initialMistakes: saved.mistakes,
    }));
  }

  if (!game) {
    return <DifficultyMenu saved={saved} onSelect={startGame} onContinue={continueGame} />;
  }

  return (
    <SudokuBoard
      key={game.id}
      initialBoard={game.initialBoard}
      initialSeconds={game.initialSeconds}
      initialMistakes={game.initialMistakes}
      difficulty={game.difficulty}
      onExit={() => setGame(null)}
    />
  );
}
