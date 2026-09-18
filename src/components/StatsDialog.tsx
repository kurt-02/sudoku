"use client";

import { useEffect, useState } from "react";
import { getMyStatsAction } from "@/app/actions/account";
import { useAccountGames } from "@/components/AccountContext";
import Dialog from "@/components/ui/Dialog";
import Segmented from "@/components/ui/Segmented";
import { formatTime } from "@/lib/format";
import { averageWinSeconds, readStats, winRate, type Stats } from "@/lib/stats";
import type { Difficulty } from "@/lib/sudoku";

type Props = {
  onClose: () => void;
};

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const DIFFICULTY_TABS = DIFFICULTIES.map((d) => ({
  value: d,
  label: d.charAt(0).toUpperCase() + d.slice(1),
}));

/** Opens on the difficulty played most, so the first thing shown is the most relevant. */
function mostPlayed(stats: Stats): Difficulty {
  return DIFFICULTIES.reduce((best, d) =>
    stats.byDifficulty[d].started > stats.byDifficulty[best].started ? d : best,
  );
}

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
  // Guests' stats are right here; account stats are loaded fresh each time the panel opens.
  const [stats, setStats] = useState<Stats | null>(() => (accountGames ? null : readStats()));
  const [loadFailed, setLoadFailed] = useState(false);
  const [picked, setPicked] = useState<Difficulty | null>(null);

  useEffect(() => {
    if (!accountGames) return;
    let current = true;
    getMyStatsAction()
      .then((loaded) => current && setStats(loaded))
      .catch(() => current && setLoadFailed(true));
    return () => {
      current = false;
    };
  }, [accountGames]);

  const difficulty = picked ?? (stats ? mostPlayed(stats) : "easy");
  const s = stats?.byDifficulty[difficulty];
  const rate = s && winRate(s);
  const average = s && averageWinSeconds(s);

  return (
    <Dialog title="Stats" onClose={onClose}>
      <div className="px-2 pb-2">
        <Segmented
          label="Difficulty"
          options={DIFFICULTY_TABS}
          value={difficulty}
          onChange={setPicked}
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
