"use client";

import { useState } from "react";
import AccountPanel from "@/components/AccountPanel";
import SettingsDialog from "@/components/SettingsDialog";
import { button } from "@/components/ui/button";
import { SettingsIcon } from "@/components/ui/icons";
import { formatTime } from "@/lib/format";
import type { SavedGame } from "@/lib/savedGame";
import { CLUE_TARGETS, type Difficulty } from "@/lib/sudoku";
import type { SessionUser } from "@/types/auth";

type Props = {
  user: SessionUser | null;
  /** Unfinished game to offer resuming, if any. */
  saved: SavedGame | null;
  onSelect: (difficulty: Difficulty) => void;
  onContinue: () => void;
};

const OPTIONS: { difficulty: Difficulty; level: number; description: string }[] = [
  { difficulty: "easy", level: 1, description: "A relaxed warm-up" },
  { difficulty: "medium", level: 2, description: "Needs some notes" },
  { difficulty: "hard", level: 3, description: "Few clues, lots of thinking" },
];

/** A 3x3 box with one cell filled: the game's mark. */
function LogoMark() {
  return (
    <span aria-hidden="true" className="grid grid-cols-3 gap-[3px]">
      {Array.from({ length: 9 }, (_, i) => (
        <span
          key={i}
          className={`size-2.5 rounded-[3px] ${i === 4 ? "bg-accent" : "bg-surface-hover"}`}
        />
      ))}
    </span>
  );
}

/** Three bars, filled up to the difficulty level. */
function LevelMeter({ level }: { level: number }) {
  return (
    <span aria-hidden="true" className="flex items-end gap-1">
      {[1, 2, 3].map((bar) => (
        <span
          key={bar}
          className={`w-1.5 rounded-full ${bar <= level ? "bg-accent" : "bg-line"}`}
          style={{ height: `${6 + bar * 4}px` }}
        />
      ))}
    </span>
  );
}

/** How much of the saved board is filled, as a ring. */
function ProgressRing({ filled }: { filled: number }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg viewBox="0 0 44 44" className="size-11 shrink-0 -rotate-90" aria-hidden="true">
      <circle
        cx="22"
        cy="22"
        r={radius}
        fill="none"
        stroke="rgb(255 255 255 / 0.25)"
        strokeWidth="4"
      />
      <circle
        cx="22"
        cy="22"
        r={radius}
        fill="none"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - filled / 81)}
      />
    </svg>
  );
}

export default function DifficultyMenu({ user, saved, onSelect, onContinue }: Props) {
  const filled = saved ? saved.cells.filter((c) => c.value !== null).length : 0;
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="flex w-full max-w-[26rem] flex-col gap-7 py-10 text-left">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <LogoMark />
            <h1 className="text-4xl font-semibold tracking-tight text-fg">Sudoku</h1>
          </div>
          <p className="mt-2 text-muted">
            Pick a difficulty to start. Your progress saves as you play.
          </p>
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
          title="Settings"
          className={button.icon}
        >
          <SettingsIcon />
        </button>
      </header>

      <AccountPanel user={user} />

      {saved && (
        <button
          onClick={onContinue}
          className="flex items-center gap-4 rounded-2xl bg-accent px-5 py-4 text-left text-white transition-[background-color,transform] duration-150 ease-out hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-safe:active:scale-[0.98]"
        >
          <ProgressRing filled={filled} />
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-semibold">Continue</span>
            <span className="block text-sm text-white/75">
              <span className="capitalize">{saved.difficulty}</span>, {filled} of 81 filled
              {saved.mistakes > 0 &&
                `, ${saved.mistakes} ${saved.mistakes === 1 ? "mistake" : "mistakes"}`}
            </span>
          </span>
          <span className="text-lg font-medium tabular-nums">{formatTime(saved.seconds)}</span>
        </button>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted">
          {saved ? "Or start a new game" : "New game"}
        </h2>
        <div className="flex flex-col overflow-hidden rounded-2xl bg-surface">
          {OPTIONS.map(({ difficulty, level, description }, i) => (
            <button
              key={difficulty}
              onClick={() => onSelect(difficulty)}
              title={`${CLUE_TARGETS[difficulty]} starting numbers`}
              className={`flex items-center justify-between gap-4 px-5 py-4 text-left transition-colors duration-150 hover:bg-surface-hover focus-visible:relative focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
                i > 0 ? "border-t border-line/60" : ""
              }`}
            >
              <span>
                <span className="block text-lg font-semibold text-fg capitalize">{difficulty}</span>
                <span className="block text-sm text-muted">{description}</span>
              </span>
              <LevelMeter level={level} />
            </button>
          ))}
        </div>
        {saved && (
          <p className="mt-3 text-sm text-muted">Starting a new game replaces your saved one.</p>
        )}
      </section>

      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
