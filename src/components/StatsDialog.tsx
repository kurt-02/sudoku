"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { getMyStatsAction } from "@/app/actions/account";
import { useAccountGames } from "@/components/AccountContext";
import Dialog from "@/components/ui/Dialog";
import Segmented from "@/components/ui/Segmented";
import { formatTime } from "@/lib/format";
import { averageWinSeconds, readStats, winRate, type DifficultyStats } from "@/lib/stats";
import type { Difficulty } from "@/lib/sudoku";

type Props = {
  onClose: () => void;
};

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const DIFFICULTY_TABS = DIFFICULTIES.map((d) => ({
  value: d,
  label: d.charAt(0).toUpperCase() + d.slice(1),
}));

function Headline({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-xl bg-ink/50 py-3">
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}

/** Your own stats, per difficulty: from the account when signed in, this device otherwise. */
export default function StatsDialog({ onClose }: Props) {
  const accountGames = useAccountGames();
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  // Account stats load one difficulty at a time, when its tab is opened (Easy on open), and are
  // kept while the panel is open. Guests' stats are already on this device.
  const [loaded, setLoaded] = useState<Partial<Record<Difficulty, DifficultyStats>>>(() =>
    accountGames ? {} : readStats().byDifficulty,
  );
  const [failed, setFailed] = useState<Difficulty | null>(null);
  /** Requests on their way, so a tab is never fetched twice at once. */
  const loading = useRef(new Set<Difficulty>());

  const loadIfMissing = useEffectEvent((d: Difficulty) => {
    if (loaded[d] || failed === d || loading.current.has(d)) return;
    loading.current.add(d);
    getMyStatsAction(d)
      .then((stats) => {
        setLoaded((prev) => ({ ...prev, [d]: stats }));
        setFailed((f) => (f === d ? null : f));
      })
      .catch(() => setFailed(d))
      .finally(() => loading.current.delete(d));
  });

  useEffect(() => {
    if (accountGames) loadIfMissing(difficulty);
  }, [accountGames, difficulty]);

  const s = loaded[difficulty];
  const rate = s && winRate(s);
  const average = s && averageWinSeconds(s);
  const loadFailed = failed === difficulty;

  return (
    <Dialog title="Stats" onClose={onClose}>
      <div className="px-2 pb-2">
        <Segmented
          label="Difficulty"
          options={DIFFICULTY_TABS}
          value={difficulty}
          onChange={setDifficulty}
        />

        {/* Fixed height, so switching tabs (or loading) doesn't make the sheet jump. */}
        <div className="flex min-h-[18.75rem] flex-col justify-center">
          {loadFailed ? (
            <p role="alert" className="px-2 py-8 text-center text-sm text-muted">
              Couldn&apos;t load your stats. Check your connection and try again.
            </p>
          ) : !s ? (
            <p className="px-2 py-8 text-center text-sm text-muted" aria-live="polite">
              Loading your stats…
            </p>
          ) : s.started === 0 && s.won === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-muted">
              No <span className="capitalize">{difficulty}</span> games yet. Start one from the menu
              and your results will show up here.
            </p>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Headline label="Played" value={String(s.started)} />
                <Headline label="Won" value={String(s.won)} />
                <Headline label="Win rate" value={rate === null ? "–" : `${rate}%`} />
              </div>
              <dl className="mt-2 divide-y divide-line/60 px-2">
                <Row
                  label="Best time"
                  value={s.bestSeconds === null ? "–" : formatTime(s.bestSeconds)}
                />
                <Row label="Average time" value={average == null ? "–" : formatTime(average)} />
                <Row label="Current streak" value={String(s.currentStreak)} />
                <Row label="Best streak" value={String(s.bestStreak)} />
                <Row label="Lost" value={String(s.lost)} />
              </dl>
            </>
          )}
        </div>

        <p className="mt-2 border-t border-line/60 px-2 pt-3 text-xs text-muted">
          {accountGames
            ? "Saved to your account, so they follow you to any device."
            : "Saved on this device. Sign in to keep them across devices."}
        </p>
      </div>
    </Dialog>
  );
}
