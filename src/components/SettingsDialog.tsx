"use client";

import { useEffect, useState } from "react";
import { button } from "@/components/ui/button";
import { CloseIcon } from "@/components/ui/icons";
import type { Settings } from "@/lib/settings";
import { resetStats } from "@/lib/stats";
import { MAX_MISTAKES } from "@/lib/sudoku";
import { useSettings } from "@/lib/useSettings";

type Props = {
  onClose: () => void;
};

const OPTIONS: { key: keyof Settings; label: string; description: string }[] = [
  { key: "darkBoard", label: "Dark board", description: "Dark cells instead of light ones" },
  {
    key: "mistakeLimit",
    label: "Mistake limit",
    description: `End the game after ${MAX_MISTAKES} mistakes`,
  },
  {
    key: "highlightWrong",
    label: "Highlight wrong numbers",
    description:
      "Check against the answer: wrong numbers turn red and count as mistakes. Off: only clashes count",
  },
  {
    key: "blockImpossibleNotes",
    label: "Block impossible notes",
    description: "Refuse notes already in the row, column, or box",
  },
  {
    key: "highlightPeers",
    label: "Highlight related cells",
    description: "Shade the row, column, box, and matching numbers",
  },
  { key: "showTimer", label: "Show timer", description: "Display elapsed time while playing" },
  { key: "animations", label: "Animations", description: "Shakes, ripples, and pop effects" },
  { key: "vibration", label: "Vibration", description: "Buzz on mistakes (supported phones)" },
];

export default function SettingsDialog({ onClose }: Props) {
  const [settings, updateSettings] = useSettings();
  const [statsCleared, setStatsCleared] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function clearStats() {
    if (!window.confirm("Reset all stats? This can't be undone.")) return;
    resetStats();
    setStatsCleared(true);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-2xl bg-surface p-2 text-left text-fg shadow-[0_24px_60px_-20px_rgb(0_0_0/0.8)] motion-safe:animate-dialog-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between py-1 pr-1 pl-4">
          <h2 id="settings-title" className="text-xl font-semibold tracking-tight">
            Settings
          </h2>
          <button onClick={onClose} aria-label="Close settings" className={button.icon}>
            <CloseIcon />
          </button>
        </div>

        <ul className="mt-1">
          {OPTIONS.map(({ key, label, description }) => (
            <li key={key}>
              <button
                role="switch"
                aria-checked={settings[key]}
                onClick={() => updateSettings({ [key]: !settings[key] })}
                className="flex w-full items-center justify-between gap-4 rounded-xl px-4 py-3 text-left transition-colors duration-150 hover:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
              >
                <span>
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-xs leading-snug text-muted">{description}</span>
                </span>
                <span
                  className={`relative h-6 w-10 shrink-0 rounded-full transition-colors duration-200 ${
                    settings[key] ? "bg-accent" : "bg-line"
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 size-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
                      settings[key] ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-2 flex items-center justify-between gap-4 border-t border-line/60 px-4 pt-3 pb-2">
          <span className="text-xs text-muted">
            {statsCleared ? "Stats reset." : "Wins, best times, and streaks"}
          </span>
          <button onClick={clearStats} disabled={statsCleared} className={button.danger}>
            Reset stats
          </button>
        </div>
      </div>
    </div>
  );
}
