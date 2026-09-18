"use client";

import Image from "next/image";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { getLeaderboardAction, setLeaderboardVisibilityAction } from "@/app/actions/leaderboard";
import { useAccount } from "@/components/AccountContext";
import Dialog from "@/components/ui/Dialog";
import Segmented from "@/components/ui/Segmented";
import { formatTime } from "@/lib/format";
import {
  LEADERBOARD_MAX_MISTAKES,
  LEADERBOARD_SIZE,
  type LeaderboardCategory,
  type LeaderboardEntry,
} from "@/lib/leaderboard";
import type { Difficulty } from "@/lib/sudoku";

type Props = {
  onClose: () => void;
};

const DIFFICULTY_TABS: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const CATEGORY_TABS: { value: LeaderboardCategory; label: string }[] = [
  { value: "fastest", label: "Fastest" },
  { value: "wins", label: "Most wins" },
  { value: "streak", label: "Best streak" },
];

const CAPTION: Record<LeaderboardCategory, string> = {
  fastest: "Fastest win",
  wins: "Wins",
  streak: "Wins in a row",
};

function formatValue(category: LeaderboardCategory, value: number): string {
  return category === "fastest" ? formatTime(value) : String(value);
}

function Avatar({ entry }: { entry: LeaderboardEntry }) {
  if (entry.image) {
    return (
      // Google already serves small avatars; skip the image optimizer (and its usage quota).
      <Image
        src={entry.image}
        alt=""
        width={28}
        height={28}
        unoptimized
        className="size-7 rounded-full"
      />
    );
  }
  return (
    <span className="flex size-7 items-center justify-center rounded-full bg-surface-hover text-xs font-semibold text-fg">
      {entry.name.charAt(0).toUpperCase()}
    </span>
  );
}

function EntryRow({ entry, category }: { entry: LeaderboardEntry; category: LeaderboardCategory }) {
  return (
    <li
      className={`flex items-center gap-3 rounded-xl px-3 py-2 ${entry.isMe ? "bg-accent/12" : ""}`}
    >
      <span
        className={`w-6 text-right text-sm font-semibold tabular-nums ${
          entry.rank === 1 ? "text-accent" : "text-muted"
        }`}
      >
        {entry.rank}
      </span>
      <Avatar entry={entry} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
        {entry.name}
        {entry.isMe && <span className="ml-1.5 text-xs font-normal text-accent">You</span>}
      </span>
      <span className="text-sm font-semibold text-fg tabular-nums">
        {formatValue(category, entry.value)}
      </span>
    </li>
  );
}

/** Rankings of signed-in players, built only from games the server checked. */
export default function LeaderboardDialog({ onClose }: Props) {
  const { accountGames, showOnLeaderboard: showMe, setShowOnLeaderboard } = useAccount();
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [category, setCategory] = useState<LeaderboardCategory>("fastest");
  // Boards load one at a time, only when selected (Easy / Fastest on open), and are kept for
  // this visit so switching back doesn't refetch. Keyed "difficulty:category".
  const [boards, setBoards] = useState<Record<string, LeaderboardEntry[]>>({});
  const [failed, setFailed] = useState<string | null>(null);
  /** Requests on their way, so a board is never fetched twice at once. */
  const loading = useRef(new Set<string>());
  const [savingShowMe, setSavingShowMe] = useState(false);
  const key = `${difficulty}:${category}`;

  /** Fetches one board. State only changes once the server answers. */
  function fetchBoard(d: Difficulty, c: LeaderboardCategory) {
    const k = `${d}:${c}`;
    if (loading.current.has(k)) return;
    loading.current.add(k);
    getLeaderboardAction(d, c)
      .then((entries) => {
        setBoards((prev) => ({ ...prev, [k]: entries }));
        setFailed((f) => (f === k ? null : f));
      })
      .catch(() => setFailed(k))
      .finally(() => loading.current.delete(k));
  }

  const loadIfMissing = useEffectEvent((d: Difficulty, c: LeaderboardCategory) => {
    const k = `${d}:${c}`;
    if (!boards[k] && failed !== k) fetchBoard(d, c);
  });

  useEffect(() => {
    if (accountGames) loadIfMissing(difficulty, category);
  }, [accountGames, difficulty, category]);

  async function toggleShowMe() {
    const next = !showMe;
    setShowOnLeaderboard(next);
    setSavingShowMe(true);
    try {
      await setLeaderboardVisibilityAction(next);
      // Your own rows appear or disappear, so the boards already loaded are out of date. Only
      // the one on screen is fetched again; the rest reload if and when they're opened.
      setBoards({});
      fetchBoard(difficulty, category);
    } catch {
      setShowOnLeaderboard(!next);
    } finally {
      setSavingShowMe(false);
    }
  }

  if (!accountGames) {
    return (
      <Dialog title="Leaderboard" onClose={onClose}>
        <p className="px-4 pt-2 pb-5 text-sm text-muted">
          Sign in with Google to see the leaderboard and compete with other players. Only games
          played while signed in can rank.
        </p>
      </Dialog>
    );
  }

  const entries = boards[key];
  const top = entries?.filter((e) => e.rank <= LEADERBOARD_SIZE) ?? [];
  const meBelow = entries?.find((e) => e.isMe && e.rank > LEADERBOARD_SIZE);

  return (
    <Dialog title="Leaderboard" onClose={onClose}>
      <div className="flex flex-col gap-2 px-2 pb-2">
        <Segmented
          label="Difficulty"
          options={DIFFICULTY_TABS}
          value={difficulty}
          onChange={setDifficulty}
        />
        <Segmented
          label="Ranking"
          size="sm"
          options={CATEGORY_TABS}
          value={category}
          onChange={setCategory}
        />

        {/* Fixed height, so switching boards doesn't make the sheet jump. */}
        <div className="flex min-h-[22rem] flex-col">
          {failed === key ? (
            <p role="alert" className="m-auto px-2 text-center text-sm text-muted">
              Couldn&apos;t load the leaderboard. Check your connection and try again.
            </p>
          ) : !entries ? (
            <p className="m-auto text-sm text-muted" aria-live="polite">
              Loading the leaderboard…
            </p>
          ) : entries.length === 0 ? (
            <p className="m-auto px-4 text-center text-sm text-muted">
              No counted <span className="lowercase">{difficulty}</span> wins yet. Win one while
              signed in to take the top spot.
            </p>
          ) : (
            <>
              <div className="flex justify-between px-3 pt-2 pb-1 text-xs text-muted">
                <span>Player</span>
                <span>{CAPTION[category]}</span>
              </div>
              <ol>
                {top.map((entry, i) => (
                  <EntryRow key={`${entry.rank}-${i}`} entry={entry} category={category} />
                ))}
              </ol>
              {meBelow && (
                <>
                  <div aria-hidden="true" className="py-0.5 text-center text-xs text-muted">
                    ⋯
                  </div>
                  <ol>
                    <EntryRow entry={meBelow} category={category} />
                  </ol>
                </>
              )}
            </>
          )}
        </div>

        <div className="border-t border-line/60 pt-2">
          <button
            role="switch"
            aria-checked={showMe}
            disabled={savingShowMe}
            onClick={toggleShowMe}
            className="flex w-full items-center justify-between gap-4 rounded-xl px-2 py-2 text-left transition-colors duration-150 hover:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
          >
            <span>
              <span className="block text-sm font-medium">Show me on the leaderboard</span>
              <span className="block text-xs leading-snug text-muted">
                {showMe === false
                  ? "You're hidden from other players."
                  : "Other signed-in players see your first name, last initial, and picture."}
              </span>
            </span>
            <span
              className={`relative h-6 w-10 shrink-0 rounded-full transition-colors duration-200 ${
                showMe === false ? "bg-line" : "bg-accent"
              }`}
            >
              <span
                className={`absolute top-1 left-1 size-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
                  showMe === false ? "translate-x-0" : "translate-x-4"
                }`}
              />
            </span>
          </button>
          <p className="px-2 pt-1 text-xs leading-snug text-muted">
            Counts wins played while signed in with {LEADERBOARD_MAX_MISTAKES} or fewer mistakes.
            Guest games brought into an account don&apos;t count.
          </p>
        </div>
      </div>
    </Dialog>
  );
}
