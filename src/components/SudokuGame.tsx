"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import DifficultyMenu from "@/components/DifficultyMenu";
import SudokuBoard from "@/components/SudokuBoard";
import { newGameId, parseSavedGame, readSavedGameRaw, subscribeSavedGame } from "@/lib/savedGame";
import { recordAbandon, recordStart, updateStats } from "@/lib/stats";
import { createBoardState, generatePuzzle, gridToString, type Difficulty } from "@/lib/sudoku";
import type { BoardState } from "@/types/game";

type Game = {
  /** Remounts the board on every new game so its state starts fresh. */
  id: number;
  /** Play-through id used by the save (see savedGame.ts). */
  gameId: string;
  difficulty: Difficulty;
  initialBoard: BoardState;
  initialSeconds: number;
  initialMistakes: number;
  initialHintsUsed: number;
};

/** Top-level flow: pick a difficulty (or continue a saved game), then play. */
export default function SudokuGame() {
  const [game, setGame] = useState<Game | null>(null);

  // localStorage only exists in the browser; the server snapshot (null) keeps hydration consistent.
  const savedRaw = useSyncExternalStore(subscribeSavedGame, readSavedGameRaw, () => null);
  const saved = useMemo(() => parseSavedGame(savedRaw), [savedRaw]);

  function startGame(difficulty: Difficulty) {
    // Read fresh: the board may have just cleared the save without this component re-rendering.
    const unfinished = parseSavedGame(readSavedGameRaw());
    updateStats((s) =>
      recordStart(unfinished ? recordAbandon(s, unfinished.difficulty) : s, difficulty),
    );
    // Generated on click (in the browser), so there's no server/client hydration mismatch.
    const puzzle = gridToString(generatePuzzle(difficulty).puzzle);
    setGame((prev) => ({
      id: (prev?.id ?? 0) + 1,
      gameId: newGameId(),
      difficulty,
      initialBoard: createBoardState(puzzle),
      initialSeconds: 0,
      initialMistakes: 0,
      initialHintsUsed: 0,
    }));
  }

  function continueGame() {
    if (!saved) return;
    setGame((prev) => ({
      id: (prev?.id ?? 0) + 1,
      gameId: saved.id,
      difficulty: saved.difficulty,
      initialBoard: { cells: saved.cells, selectedIndex: null, noteMode: saved.noteMode },
      initialSeconds: saved.seconds,
      initialMistakes: saved.mistakes,
      initialHintsUsed: saved.hintsUsed,
    }));
  }

  if (!game) {
    return <DifficultyMenu saved={saved} onSelect={startGame} onContinue={continueGame} />;
  }

  return (
    <SudokuBoard
      key={game.id}
      gameId={game.gameId}
      initialBoard={game.initialBoard}
      initialSeconds={game.initialSeconds}
      initialMistakes={game.initialMistakes}
      initialHintsUsed={game.initialHintsUsed}
      difficulty={game.difficulty}
      onExit={() => setGame(null)}
      onNewGame={startGame}
    />
  );
}
