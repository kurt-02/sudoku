"use client";

import { formatTime } from "@/lib/format";
import type { SavedGame } from "@/lib/savedGame";
import { CLUE_TARGETS, MAX_MISTAKES, type Difficulty } from "@/lib/sudoku";

type Props = {
  /** Unfinished game to offer resuming, if any. */
  saved: SavedGame | null;
  onSelect: (difficulty: Difficulty) => void;
  onContinue: () => void;
};

const OPTIONS: { difficulty: Difficulty; description: string }[] = [
  { difficulty: "easy", description: "A relaxed warm-up" },
  { difficulty: "medium", description: "Needs some notes" },
  { difficulty: "hard", description: "Few clues, lots of thinking" },
];

export default function DifficultyMenu({ saved, onSelect, onContinue }: Props) {
  const filled = saved ? saved.cells.filter((c) => c.value !== null).length : 0;

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
        Sudoku
      </h1>
      <p className="mb-6 text-lg text-zinc-600 dark:text-zinc-400">
        A clean, fast Sudoku you can play in the browser. Coming soon.
      </p>
      {saved && (
        <>
          <button
            onClick={onContinue}
            className="flex items-center justify-between rounded-lg border border-blue-600 bg-blue-600 px-5 py-4 text-left text-white hover:bg-blue-700"
          >
            <span>
              <span className="block text-lg font-semibold">Continue</span>
              <span className="block text-sm text-blue-100 capitalize">
                {saved.difficulty} · {filled}/81 filled · {saved.mistakes}/{MAX_MISTAKES} mistakes
              </span>
            </span>
            <span className="font-mono text-sm tabular-nums">{formatTime(saved.seconds)}</span>
          </button>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Starting a new game replaces your saved one.
          </p>
        </>
      )}

      <h2 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {saved ? "Or start a new game" : "Choose a difficulty"}
      </h2>
      {OPTIONS.map(({ difficulty, description }) => (
        <button
          key={difficulty}
          onClick={() => onSelect(difficulty)}
          className="flex items-center justify-between rounded-lg border border-neutral-300 bg-white px-5 py-4 text-left text-black hover:border-blue-600 hover:bg-blue-50"
        >
          <span>
            <span className="block text-lg font-semibold capitalize">{difficulty}</span>
            <span className="block text-sm text-neutral-600">{description}</span>
          </span>
          <span className="text-sm text-neutral-600">{CLUE_TARGETS[difficulty]} clues</span>
        </button>
      ))}
    </div>
  );
}
