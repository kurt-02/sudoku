"use client";

import { useState } from "react";
import { deleteAccountAction, resetStatsAction } from "@/app/actions/account";
import { useAccountGames } from "@/components/AccountContext";
import { button } from "@/components/ui/button";
import Dialog from "@/components/ui/Dialog";
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
  const accountGames = useAccountGames();
  const [statsCleared, setStatsCleared] = useState(false);
  const [resetError, setResetError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  async function clearStats() {
    if (!window.confirm("Reset all stats? This can't be undone.")) return;
    setResetError(false);
    if (accountGames) {
      try {
        await resetStatsAction();
      } catch {
        setResetError(true);
        return;
      }
    } else {
      resetStats();
    }
    setStatsCleared(true);
  }

  async function deleteAccount() {
    const confirmed = window.confirm(
      "Delete your account? This permanently removes your saved game, stats, and settings, and signs you out. This can't be undone.",
    );
    if (!confirmed) return;
    setDeleting(true);
    setDeleteError(false);
    try {
      await deleteAccountAction(); // Signs out and reloads the page when it succeeds.
    } catch {
      setDeleteError(true);
      setDeleting(false);
    }
  }

  return (
    <Dialog title="Settings" onClose={onClose}>
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
          {resetError
            ? "Couldn't reset. Check your connection and try again."
            : statsCleared
              ? "Stats reset."
              : accountGames
                ? "Wins, best times, and streaks on your account"
                : "Wins, best times, and streaks"}
        </span>
        <button onClick={clearStats} disabled={statsCleared} className={button.danger}>
          Reset stats
        </button>
      </div>

      {accountGames && (
        <div className="flex items-center justify-between gap-4 px-4 pt-1 pb-2">
          <span className="text-xs text-muted">
            {deleteError
              ? "Couldn't delete your account. Check your connection and try again."
              : "Remove your account and everything saved with it"}
          </span>
          <button onClick={deleteAccount} disabled={deleting} className={button.danger}>
            {deleting ? "Deleting…" : "Delete account"}
          </button>
        </div>
      )}
    </Dialog>
  );
}
