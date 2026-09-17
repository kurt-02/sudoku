"use client";

import { CLUE_TARGETS, type Difficulty } from "@/lib/sudoku";

type Props = {
  onSelect: (difficulty: Difficulty) => void;
};

const OPTIONS: { difficulty: Difficulty; description: string }[] = [
  { difficulty: "easy", description: "A relaxed warm-up" },
  { difficulty: "medium", description: "Needs some notes" },
  { difficulty: "hard", description: "Few clues, lots of thinking" },
];

export default function DifficultyMenu({ onSelect }: Props) {
  return (
    <div className="mt-8 flex w-full max-w-md flex-col gap-3">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Choose a difficulty</h2>
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
