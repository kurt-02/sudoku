"use client";

import BoardOverlay from "@/components/BoardOverlay";
import { button } from "@/components/ui/button";
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
  animate: boolean;
  /** Hides the "of 3" when the mistake limit is off. */
  mistakeLimit: boolean;
  onNewGame: () => void;
  onExit: () => void;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-lg font-semibold text-(--overlay-fg) tabular-nums">{value}</span>
      <span className="text-xs text-(--overlay-muted)">{label}</span>
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
  animate,
  mistakeLimit,
  onNewGame,
  onExit,
}: Props) {
  const rate = winRate(stats);
  const average = averageWinSeconds(stats);
  const mistakeText = mistakeLimit
    ? `${mistakes} of ${MAX_MISTAKES} mistakes`
    : `${mistakes} ${mistakes === 1 ? "mistake" : "mistakes"}`;
  const hintText = `${hintsUsed} ${hintsUsed === 1 ? "hint" : "hints"}`;

  return (
    <BoardOverlay
      title="Solved"
      animation={animate ? "motion-safe:animate-fade-in-late" : ""}
      actions={
        <>
          <button onClick={onNewGame} className={button.primary}>
            New {difficulty} game
          </button>
          <button onClick={onExit} className={button.boardSecondary}>
            Menu
          </button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-4xl font-semibold tracking-tight text-(--overlay-fg) tabular-nums sm:text-5xl">
          {formatTime(seconds)}
        </span>
        {isNewBest && (
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-white">
            New best time
          </span>
        )}
        <span className="text-sm text-(--overlay-muted)">
          {mistakeText}, {hintText}
        </span>
      </div>

      <div className="grid w-full max-w-xs grid-cols-3 gap-y-2 rounded-xl bg-(--overlay-button) px-2 py-2.5 sm:gap-y-3 sm:py-3">
        <Stat label="Won" value={String(stats.won)} />
        <Stat label="Win rate" value={rate === null ? "–" : `${rate}%`} />
        <Stat label="Streak" value={String(stats.currentStreak)} />
        <Stat
          label="Best time"
          value={stats.bestSeconds === null ? "–" : formatTime(stats.bestSeconds)}
        />
        <Stat label="Average" value={average === null ? "–" : formatTime(average)} />
        <Stat label="Best streak" value={String(stats.bestStreak)} />
      </div>
    </BoardOverlay>
  );
}
