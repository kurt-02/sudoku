"use client";

import { formatTime } from "@/lib/format";
import { averageWinSeconds, winRate, type DifficultyStats } from "@/lib/stats";
import { MAX_MISTAKES, type Difficulty } from "@/lib/sudoku";

type Props = {
  difficulty: Difficulty;
  seconds: number;
  mistakes: number;
  hintsUsed: number;
  /** Stats for this difficulty, already including this win. */
  stats: DifficultyStats;
  isNewBest: boolean;
  onNewGame: () => void;
  onExit: () => void;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-lg font-semibold text-black tabular-nums">{value}</span>
      <span className="text-[0.65rem] tracking-wide text-neutral-500 uppercase">{label}</span>
    </div>
  );
}

/** Covers the solved board; fades in after the final completion ripple has played. */
export default function WinScreen({
  difficulty,
  seconds,
  mistakes,
  hintsUsed,
  stats,
  isNewBest,
  onNewGame,
  onExit,
}: Props) {
  const rate = winRate(stats);
  const average = averageWinSeconds(stats);

  return (
    <div
      role="dialog"
      aria-label="Puzzle solved"
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/95 px-4 motion-safe:animate-fade-in"
    >
      <p className="text-2xl font-semibold text-black">Solved!</p>

      <div className="flex flex-col items-center">
        <span className="font-mono text-3xl text-black tabular-nums">{formatTime(seconds)}</span>
        {isNewBest && (
          <span className="mt-1 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
            New best time
          </span>
        )}
        <span className="mt-1 text-xs text-neutral-500 capitalize">
          {difficulty} · {mistakes}/{MAX_MISTAKES} mistakes · {hintsUsed} hints
        </span>
      </div>

      <div className="grid w-full max-w-xs grid-cols-3 gap-y-2 border-t border-neutral-200 pt-3">
        <Stat label="Won" value={String(stats.won)} />
        <Stat label="Win rate" value={rate === null ? "–" : `${rate}%`} />
        <Stat label="Streak" value={String(stats.currentStreak)} />
        <Stat
          label="Best"
          value={stats.bestSeconds === null ? "–" : formatTime(stats.bestSeconds)}
        />
        <Stat label="Average" value={average === null ? "–" : formatTime(average)} />
        <Stat label="Best streak" value={String(stats.bestStreak)} />
      </div>

      <div className="mt-1 flex gap-2">
        <button
          onClick={onNewGame}
          className="rounded-md bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
        >
          New game
        </button>
        <button
          onClick={onExit}
          className="rounded-md border border-neutral-300 bg-white px-5 py-2 text-black hover:bg-neutral-100"
        >
          Menu
        </button>
      </div>
    </div>
  );
}
