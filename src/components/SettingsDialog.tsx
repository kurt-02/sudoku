"use client";

import { useEffect, useState } from "react";
import type { Settings } from "@/lib/settings";
import { resetStats } from "@/lib/stats";
import { MAX_MISTAKES } from "@/lib/sudoku";
import { useSettings } from "@/lib/useSettings";

type Props = {
  onClose: () => void;
};

const OPTIONS: { key: keyof Settings; label: string; description: string }[] = [
  {
    key: "mistakeLimit",
    label: "Mistake limit",
    description: `End the game after ${MAX_MISTAKES} mistakes`,
  },
  {
    key: "highlightWrong",
    label: "Highlight wrong numbers",
    description: "Show incorrect numbers in red right away",
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="w-full max-w-sm rounded-xl bg-white p-5 text-left text-black shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id="settings-title" className="text-xl font-semibold">
            Settings
          </h2>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="rounded-md px-2 py-1 text-neutral-500 hover:bg-neutral-100 hover:text-black"
          >
            ✕
          </button>
        </div>

        <ul className="divide-y divide-neutral-200">
          {OPTIONS.map(({ key, label, description }) => (
            <li key={key}>
              <button
                role="switch"
                aria-checked={settings[key]}
                onClick={() => updateSettings({ [key]: !settings[key] })}
                className="flex w-full items-center justify-between gap-4 py-3 text-left"
              >
                <span>
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-xs text-neutral-500">{description}</span>
                </span>
                <span
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                    settings[key] ? "bg-blue-600" : "bg-neutral-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${
                      settings[key] ? "translate-x-5.5" : "translate-x-0.5"
                    }`}
                  />
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-4">
          <span className="text-xs text-neutral-500">
            {statsCleared ? "Stats reset." : "Wins, best times, and streaks"}
          </span>
          <button
            onClick={clearStats}
            disabled={statsCleared}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Reset stats
          </button>
        </div>
      </div>
    </div>
  );
}
