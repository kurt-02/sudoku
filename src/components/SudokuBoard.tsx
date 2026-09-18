"use client";

import {
  useEffect,
  useEffectEvent,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import {
  finishGameAction,
  pauseGameAction,
  retryGameAction,
  saveGameAction,
} from "@/app/actions/game";
import BoardOverlay from "@/components/BoardOverlay";
import SudokuCell from "@/components/SudokuCells";
import SettingsDialog from "@/components/SettingsDialog";
import WinScreen from "@/components/WinScreen";
import { button } from "@/components/ui/button";
import {
  AutoNotesIcon,
  ChevronLeftIcon,
  EraseIcon,
  HintIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  SettingsIcon,
  UndoIcon,
} from "@/components/ui/icons";
import { formatTime } from "@/lib/format";
import { useSettings } from "@/lib/useSettings";
import {
  finishSavedGame,
  newGameId,
  ownsSavedGame,
  subscribeSavedGame,
  writeSavedGame,
} from "@/lib/savedGame";
import { recordLoss, recordStart, recordWin, updateStats, type DifficultyStats } from "@/lib/stats";
import {
  blockingPeers,
  boxIndices,
  canUndo,
  colOf,
  completedDigits,
  completedUnits,
  createHistory,
  digitCounts,
  findConflicts,
  findHintCell,
  gameReducer,
  givensFromCells,
  gridFromCells,
  gridToString,
  HINTS_BY_DIFFICULTY,
  historyReducer,
  isSolved,
  MAX_MISTAKES,
  peersOf,
  rowOf,
  solve,
  type Difficulty,
  type Direction,
} from "@/lib/sudoku";
import type { BoardState, Cell } from "@/types/game";

/** Cell indices for each 3x3 box, so the board can be drawn as nine separate tiles. */
const BOX_CELLS = Array.from({ length: 9 }, (_, b) => boxIndices(b));

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

type ToolProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  label: string;
  /** Highlighted as switched on (Notes). */
  active?: boolean;
  /** Small count shown on the icon (hints left). */
  badge?: number;
};

/** An icon-over-label action under the number keys. */
function Tool({ icon, label, active = false, badge, className = "", ...props }: ToolProps) {
  return (
    <button
      {...props}
      className={`relative flex flex-col items-center gap-1 rounded-xl py-2.5 text-xs font-medium transition-[background-color,color,transform,opacity] duration-150 ease-out select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-35 motion-safe:active:scale-[0.94] ${
        active ? "bg-accent/15 text-accent" : "text-muted hover:bg-surface hover:text-fg"
      } ${className}`}
    >
      <span className="relative">
        {icon}
        {badge !== undefined && (
          <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[0.65rem] leading-none font-semibold text-white tabular-nums">
            {badge}
          </span>
        )}
      </span>
      {label}
    </button>
  );
}

const ARROWS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

/** How often a running game checks in with the server (see lib/gameTime.ts). */
const CHECK_IN_MS = 15_000;
/** Wait for moves to settle before saving to the server. */
const SAVE_DELAY_MS = 800;

type Props = {
  /** Identifies this play-through: the server's game id, or the local save's id. */
  gameId: string;
  /** Signed-in play: the server holds the game, its clock, and the solution. */
  accountGames: boolean;
  /** A fresh puzzle, or a restored saved game. */
  initialBoard: BoardState;
  initialSeconds: number;
  initialMistakes: number;
  initialHintsUsed: number;
  difficulty: Difficulty;
  /** Leave the game and go back to the difficulty menu. Progress stays saved. */
  onExit: () => void;
  /** Start a fresh puzzle at this difficulty (from the win screen). */
  onNewGame: (difficulty: Difficulty) => void;
};

export default function SudokuBoard({
  gameId: initialGameId,
  accountGames,
  initialBoard,
  initialSeconds,
  initialMistakes,
  initialHintsUsed,
  difficulty,
  onExit,
  onNewGame,
}: Props) {
  const [history, dispatch] = useReducer(historyReducer, initialBoard, createHistory);
  const state = history.present;
  const { cells, selectedIndex, noteMode } = state;

  // Generated puzzles have exactly one solution, so it can be recovered from the clues alone.
  const givens = useMemo(() => givensFromCells(initialBoard.cells), [initialBoard]);
  const solution = useMemo(() => solve(givens), [givens]);

  const [mistakes, setMistakes] = useState(initialMistakes);
  const [settings] = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Latched when the limit is hit, so turning the setting off afterwards can't revive a lost game.
  const [gameOver, setGameOver] = useState(false);

  // Correct numbers lock once placed, like the given ones: no erasing, overwriting, or undoing
  // them. Only while numbers are checked against the answer ("Highlight wrong numbers"):
  // otherwise a cell refusing to change would give away that its number is right.
  const lockedCells = useMemo(() => {
    const locked = new Set<number>();
    if (!settings.highlightWrong || !solution) return locked;
    cells.forEach((cell, i) => {
      if (!cell.isGiven && cell.value !== null && cell.value === solution[i]) locked.add(i);
    });
    return locked;
  }, [settings.highlightWrong, solution, cells]);
  const selectedLocked = selectedIndex !== null && lockedCells.has(selectedIndex);

  function erase() {
    if (!selectedLocked) dispatch({ type: "erase" });
  }

  function undo() {
    dispatch({ type: "undo", keep: [...lockedCells] });
  }

  const [hintsUsed, setHintsUsed] = useState(initialHintsUsed);
  const hintsLeft = Math.max(0, HINTS_BY_DIFFICULTY[difficulty] - hintsUsed);
  // A hint shows the answer in a cell without entering it; it goes away once that cell is right.
  const [hintIndex, setHintIndex] = useState<number | null>(null);
  const activeHint =
    hintIndex !== null && solution && cells[hintIndex].value !== solution[hintIndex]
      ? hintIndex
      : null;

  const grid = useMemo(() => gridFromCells(cells), [cells]);
  const conflicts = useMemo(() => findConflicts(grid), [grid]);
  const completed = useMemo(() => completedDigits(grid), [grid]);
  const counts = useMemo(() => digitCounts(grid), [grid]);
  const solved = useMemo(() => isSolved(cells), [cells]);
  const peers = useMemo(
    () => new Set(selectedIndex === null ? [] : peersOf(selectedIndex)),
    [selectedIndex],
  );
  const selectedValue = selectedIndex === null ? null : cells[selectedIndex].value;

  // Timer: accumulates real elapsed milliseconds while the game is being played. Measuring the
  // actual time between ticks (and at the moment of pausing) means partial seconds are never lost,
  // so rapidly pausing and resuming can't freeze the clock.
  const [elapsedMs, setElapsedMs] = useState(initialSeconds * 1000);
  const seconds = Math.floor(elapsedMs / 1000);
  const [paused, setPaused] = useState(false);
  // Set when another tab ends this game or starts a new one; this tab then stops playing it.
  const [takenOver, setTakenOver] = useState(false);
  const finished = solved || gameOver || takenOver;
  const running = !paused && !finished;
  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    function tick() {
      const now = performance.now();
      const delta = now - last;
      last = now;
      setElapsedMs((ms) => ms + delta);
    }
    const interval = setInterval(tick, 250);
    return () => {
      clearInterval(interval);
      tick(); // Count the partial interval up to the pause.
    };
  }, [running]);

  // Save after every move and timer tick. The first write claims the save for this game; after
  // that, only keep writing while storage still holds it, so a tab left open on an old game can't
  // overwrite (or bring back) a game that another tab ended or replaced.
  const [gameId, setGameId] = useState(initialGameId);
  const claimedSave = useRef(false);
  useEffect(() => {
    if (accountGames || takenOver) return;
    if (claimedSave.current && !ownsSavedGame(gameId)) return;
    claimedSave.current = true;
    if (solved || gameOver) finishSavedGame(gameId);
    else writeSavedGame({ id: gameId, difficulty, cells, noteMode, seconds, mistakes, hintsUsed });
  }, [
    accountGames,
    takenOver,
    gameId,
    solved,
    gameOver,
    difficulty,
    cells,
    noteMode,
    seconds,
    mistakes,
    hintsUsed,
  ]);

  // Another tab changed the save: if it's no longer this game, stop here.
  const onSaveChangedElsewhere = useEffectEvent(() => {
    if (accountGames) return;
    if (claimedSave.current && !solved && !gameOver && !ownsSavedGame(gameId)) setTakenOver(true);
  });
  useEffect(() => subscribeSavedGame(onSaveChangedElsewhere), []);

  // --- Signed-in play: keep the server's copy of the game (and its clock) up to date. ---

  /** Moves not yet sent to the server. */
  const unsaved = useRef(false);
  const saveToServer = useEffectEvent(() => {
    unsaved.current = false;
    saveGameAction(gameId, { cells, mistakes, hintsUsed })
      .then((result) => {
        // Finished or replaced in another tab or on another device.
        if (result === "gone" && !solved && !gameOver) setTakenOver(true);
      })
      .catch(() => {
        unsaved.current = true; // Offline for a moment: try again with the next change.
      });
  });

  // Save shortly after the board or counts change, batching quick bursts of moves.
  useEffect(() => {
    if (!accountGames || finished) return;
    unsaved.current = true;
    const timer = setTimeout(saveToServer, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [accountGames, finished, cells, mistakes, hintsUsed]);

  // Leaving the board (back to the menu) sends any moves still waiting.
  useEffect(
    () => () => {
      if (unsaved.current) saveToServer();
    },
    [],
  );

  // Check in while the clock runs, so the server stops counting soon after a tab is closed.
  useEffect(() => {
    if (!accountGames || !running) return;
    const timer = setInterval(saveToServer, CHECK_IN_MS);
    return () => clearInterval(timer);
  }, [accountGames, running]);

  // The server keeps the official clock: start it while playing, stop it on pause or leaving.
  const setServerClock = useEffectEvent((paused: boolean) => {
    pauseGameAction(gameId, paused).catch(() => {});
  });
  useEffect(() => {
    if (!accountGames || !running) return;
    setServerClock(false);
    return () => setServerClock(true);
  }, [accountGames, running]);

  /** Reports the end of the game; the server checks a win against the stored solution. */
  function finishOnServer(outcome: "won" | "lost", finalCells: Cell[], finalMistakes: number) {
    if (!accountGames) return;
    unsaved.current = false;
    finishGameAction(gameId, { cells: finalCells, mistakes: finalMistakes, hintsUsed }, outcome)
      .then((result) => {
        if (result.status !== "ok")
          console.error("[game] the server did not accept", outcome, result);
      })
      .catch((error) => console.error("[game] could not finish on the server", error));
  }

  // Filled in by the move that solves the puzzle; drives the win screen.
  const [winResult, setWinResult] = useState<{
    stats: DifficultyStats;
    isNewBest: boolean;
  } | null>(null);

  function recordSolve() {
    let previousBest: number | null = null;
    const stats = updateStats((s) => {
      previousBest = s.byDifficulty[difficulty].bestSeconds;
      return recordWin(s, difficulty, seconds);
    });
    setWinResult({
      stats: stats.byDifficulty[difficulty],
      isNewBest: previousBest === null || seconds < previousBest,
    });
  }

  const [retryError, setRetryError] = useState<string | null>(null);

  async function retry() {
    setRetryError(null);
    // A retry is a new play-through with the same puzzle.
    if (accountGames) {
      try {
        const replay = await retryGameAction(gameId);
        setGameId(replay.id);
      } catch {
        setRetryError("Couldn't restart the puzzle. Check your connection and try again.");
        return;
      }
    } else {
      setGameId(newGameId());
      claimedSave.current = false; // The new local save is claimed afresh.
    }
    updateStats((s) => recordStart(s, difficulty));
    dispatch({ type: "load", puzzle: gridToString(givens) });
    setElapsedMs(0);
    setMistakes(0);
    setGameOver(false);
    setHintsUsed(0);
    setHintIndex(null);
    setWinResult(null);
    setPaused(false);
  }

  // Auto-pause when the tab is hidden, so switching away doesn't cost time.
  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden) setPaused(true);
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  // Holding Shift writes notes temporarily, without flipping the Notes toggle.
  const [shiftHeld, setShiftHeld] = useState(false);
  const notesActive = noteMode || shiftHeld;

  // Feedback for a rejected note: the target and its blocking peers shake briefly.
  const [shake, setShake] = useState({ target: -1, blockers: new Set<number>(), id: 0 });
  useEffect(() => {
    if (shake.target === -1) return;
    const timer = setTimeout(
      () => setShake((s) => ({ ...s, target: -1, blockers: new Set() })),
      450,
    );
    return () => clearTimeout(timer);
  }, [shake]);

  function rejectFeedback(target: number, blockers: number[]) {
    setShake((s) => ({ target, blockers: new Set(blockers), id: s.id + 1 }));
    // Haptic buzz on devices that support it (most Android phones; not iOS Safari).
    if (settings.vibration) navigator.vibrate?.(80);
  }

  // Completion animations: cells pulse outward from the move; finished numbers pop off the pad.
  const [celebration, setCelebration] = useState({
    id: 0,
    delays: new Map<number, number>(),
    digits: new Set<number>(),
  });
  useEffect(() => {
    if (celebration.delays.size === 0 && celebration.digits.size === 0) return;
    const longestDelay = Math.max(0, ...celebration.delays.values());
    const timer = setTimeout(
      () => setCelebration((c) => ({ ...c, delays: new Map(), digits: new Set() })),
      longestDelay + 600,
    );
    return () => clearTimeout(timer);
  }, [celebration]);

  /** Animates whatever the move at `origin` newly completed. */
  function celebrateCompletions(nextGrid: number[], origin: number) {
    if (!settings.animations) return;
    // Only compare with the answer when wrong numbers are shown anyway; otherwise a ripple would
    // quietly confirm that a row is correct.
    const answer = settings.highlightWrong ? solution : null;
    const before = new Set(completedUnits(grid, answer).map((u) => u.key));
    const newUnits = completedUnits(nextGrid, answer).filter((u) => !before.has(u.key));
    const newDigits = [...completedDigits(nextGrid)].filter((d) => !completed.has(d));

    const pulsing = new Set(newUnits.flatMap((u) => u.cells));
    nextGrid.forEach((d, k) => newDigits.includes(d) && pulsing.add(k));
    if (pulsing.size === 0) return;

    const delays = new Map(
      [...pulsing].map((k) => {
        const distance = Math.abs(rowOf(k) - rowOf(origin)) + Math.abs(colOf(k) - colOf(origin));
        return [k, distance * 40];
      }),
    );
    setCelebration((c) => ({ id: c.id + 1, delays, digits: new Set(newDigits) }));
  }

  function enterDigit(digit: number, asNote: boolean) {
    if (finished || selectedLocked) return;
    const i = selectedIndex;
    const action = {
      type: "input",
      digit,
      asNote,
      allowImpossibleNotes: !settings.blockImpossibleNotes,
    } as const;
    if (i !== null && !cells[i].isGiven) {
      const cell = cells[i];
      const blockers = blockingPeers(grid, i, digit);
      if (noteMode || asNote) {
        // Impossible notes are refused outright (unless the player turned that off).
        const isAdding = cell.value === null && !cell.notes.includes(digit);
        if (settings.blockImpossibleNotes && isAdding && blockers.length > 0) {
          rejectFeedback(i, blockers);
          return;
        }
      } else if (
        cell.value !== digit &&
        // With "Highlight wrong numbers" on, check against the answer. With it off, only count
        // clashes the player can already see, so no feedback leaks whether a guess is right.
        (settings.highlightWrong && solution ? digit !== solution[i] : blockers.length > 0)
      ) {
        // Mistakes still go in, but shake and cost a mistake.
        rejectFeedback(i, blockers);
        setMistakes((m) => m + 1);
        if (settings.mistakeLimit && mistakes + 1 >= MAX_MISTAKES) {
          setGameOver(true);
          updateStats((s) => recordLoss(s, difficulty));
          finishOnServer("lost", cells, mistakes + 1);
        }
      }
      if (!noteMode && !asNote) {
        // The reducer is pure, so preview the move to see what it completes.
        const next = gameReducer(state, action);
        if (next !== state) celebrateCompletions(gridFromCells(next.cells), i);
        if (next !== state && isSolved(next.cells)) {
          recordSolve();
          finishOnServer("won", next.cells, mistakes);
        }
      }
    }
    dispatch(action);
  }

  // Briefly dims everything except the hinted cell, like a camera focusing on it.
  const [spotlight, setSpotlight] = useState({ id: 0, on: false });
  useEffect(() => {
    if (!spotlight.on) return;
    const timer = setTimeout(() => setSpotlight((s) => ({ ...s, on: false })), 1500);
    return () => clearTimeout(timer);
  }, [spotlight]);

  /** Points at one empty or wrong cell and shows its correct number, without entering it. */
  function giveHint() {
    if (paused || finished || !solution) return;
    // An unused hint is still showing: point at it again instead of spending another.
    const index =
      activeHint ?? (hintsLeft > 0 ? findHintCell(cells, solution, selectedIndex) : null);
    if (index === null) return;
    dispatch({ type: "select", index });
    setSpotlight((s) => ({ id: s.id + 1, on: true }));
    if (activeHint === null) {
      setHintIndex(index);
      setHintsUsed((h) => h + 1);
    }
  }

  // Effect events always see the latest render's state, so the listener doesn't need re-binding.
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === "Shift") setShiftHeld(true);
    // Ctrl+Z / Cmd+Z undoes, matching every other app.
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.code === "KeyZ") {
      e.preventDefault();
      if (!paused && !finished) undo();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if ((e.key === "p" || e.key === "P") && !finished) {
      setPaused((p) => !p);
      return;
    }
    // The board is locked while paused and once the game is won or lost.
    if (paused || finished) return;
    // Match the physical key: with Shift held, e.key is "!" or "@" rather than "1" or "2".
    const digitKey = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
    if (e.key in ARROWS) {
      e.preventDefault();
      dispatch({ type: "move", direction: ARROWS[e.key] });
    } else if (digitKey) {
      e.preventDefault();
      enterDigit(Number(digitKey[1]), e.shiftKey);
    } else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
      erase();
    } else if (e.key === "h" || e.key === "H") {
      giveHint();
    } else if (e.key === "a" || e.key === "A") {
      dispatch({ type: "autoNotes" });
    } else if (e.key === "n" || e.key === "N") {
      dispatch({ type: "toggleNoteMode" });
    } else if (e.key === "Escape") {
      dispatch({ type: "select", index: null });
    }
  });

  useEffect(() => {
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === "Shift") setShiftHeld(false);
    }
    // Releasing Shift in another window never fires keyup here, so reset on blur.
    function onBlur() {
      setShiftHeld(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const mistakeText = settings.mistakeLimit
    ? `${mistakes} of ${MAX_MISTAKES} mistakes`
    : `${mistakes} ${mistakes === 1 ? "mistake" : "mistakes"}`;

  function renderCell(i: number) {
    const cell = cells[i];
    return (
      <SudokuCell
        key={i}
        cell={cell}
        index={i}
        isSelected={i === selectedIndex}
        isPeer={settings.highlightPeers && peers.has(i)}
        isSameValue={
          settings.highlightPeers && selectedValue !== null && cell.value === selectedValue
        }
        isConflict={
          conflicts.has(i) ||
          (settings.highlightWrong &&
            !cell.isGiven &&
            cell.value !== null &&
            !!solution &&
            cell.value !== solution[i])
        }
        shakeKey={i === shake.target || shake.blockers.has(i) ? shake.id : null}
        isBlocking={shake.blockers.has(i)}
        celebrateKey={celebration.delays.has(i) ? celebration.id : null}
        celebrateDelay={celebration.delays.get(i) ?? 0}
        hintDigit={i === activeHint && solution ? solution[i] : null}
        isDimmed={spotlight.on && activeHint !== null && i !== activeHint}
        animate={settings.animations}
        onSelect={(index) => dispatch({ type: "select", index })}
      />
    );
  }

  return (
    <div
      data-board={settings.darkBoard ? "dark" : "light"}
      className="flex w-full max-w-[26rem] flex-col gap-5 py-6"
      // Clicking or tapping a button shouldn't focus it: a focused button repeats on Enter or
      // Space, so pressing Enter after tapping "5" would enter 5 again and clear the cell.
      // Keyboard users who Tab to a button still get focus and can press it normally.
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest("button")) e.preventDefault();
      }}
    >
      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}

      <header className="flex items-center gap-1">
        <button
          onClick={onExit}
          aria-label="Back to menu"
          title="Back to menu"
          className={button.icon}
        >
          <ChevronLeftIcon />
        </button>
        <div className="ml-1 flex min-w-0 flex-1 flex-col items-start gap-1">
          <span className="text-base leading-none font-semibold text-fg capitalize">
            {difficulty}
          </span>
          {settings.mistakeLimit ? (
            <span className="flex items-center gap-1" title={mistakeText}>
              <span className="sr-only">{mistakeText}</span>
              {Array.from({ length: MAX_MISTAKES }, (_, k) => (
                <span
                  key={k}
                  aria-hidden="true"
                  className={`size-2 rounded-full transition-colors duration-300 ${
                    k < mistakes ? "bg-danger" : "bg-line"
                  }`}
                />
              ))}
            </span>
          ) : (
            <span className={`text-xs leading-none ${mistakes > 0 ? "text-danger" : "text-muted"}`}>
              {mistakeText}
            </span>
          )}
        </div>
        {settings.showTimer && (
          <span
            className="mr-1 min-w-[3.25rem] text-right text-lg font-medium text-fg tabular-nums"
            aria-label="Elapsed time"
          >
            {formatTime(seconds)}
          </span>
        )}
        <button
          onClick={() => setPaused((p) => !p)}
          disabled={finished}
          aria-label={paused ? "Resume" : "Pause"}
          title={paused ? "Resume (P)" : "Pause (P)"}
          className={button.icon}
        >
          {paused ? <PlayIcon /> : <PauseIcon />}
        </button>
        <button
          onClick={() => {
            if (!finished) setPaused(true);
            setSettingsOpen(true);
          }}
          aria-label="Settings"
          title="Settings"
          className={button.icon}
        >
          <SettingsIcon />
        </button>
      </header>

      <div
        role="grid"
        aria-label="Sudoku board"
        className="relative grid aspect-square w-full grid-cols-3 grid-rows-3 gap-1 rounded-2xl bg-(--board) p-1 shadow-[0_18px_40px_-18px_rgb(0_0_0/0.7)]"
      >
        {solved && winResult && (
          <WinScreen
            difficulty={difficulty}
            seconds={seconds}
            mistakes={mistakes}
            hintsUsed={hintsUsed}
            stats={winResult.stats}
            isNewBest={winResult.isNewBest}
            animate={settings.animations}
            mistakeLimit={settings.mistakeLimit}
            onNewGame={() => onNewGame(difficulty)}
            onExit={onExit}
          />
        )}
        {gameOver && (
          <BoardOverlay
            title="Out of mistakes"
            role="status"
            animation={settings.animations ? "motion-safe:animate-fade-in" : ""}
            actions={
              <>
                <button onClick={retry} className={button.primary}>
                  Try again
                </button>
                <button onClick={onExit} className={button.boardSecondary}>
                  Menu
                </button>
              </>
            }
          >
            <p className="max-w-64 text-sm text-(--overlay-muted)">
              The game ends after {MAX_MISTAKES} mistakes. You played for {formatTime(seconds)}.
            </p>
            {retryError && (
              <p role="alert" className="max-w-64 text-sm text-(--digit-wrong)">
                {retryError}
              </p>
            )}
          </BoardOverlay>
        )}
        {takenOver && !solved && !gameOver && (
          <BoardOverlay
            title="Game continued elsewhere"
            solid
            actions={
              <button onClick={onExit} className={button.primary}>
                Back to menu
              </button>
            }
          >
            <p className="max-w-64 text-sm text-(--overlay-muted)">
              This game was finished or replaced in another tab or on another device.
            </p>
          </BoardOverlay>
        )}
        {paused && !gameOver && !takenOver && (
          // Solid, so the puzzle can't be studied while the clock is stopped.
          <BoardOverlay
            title="Paused"
            solid
            actions={
              <button onClick={() => setPaused(false)} className={button.primary}>
                <PlayIcon />
                Resume
              </button>
            }
          >
            <p className="max-w-64 text-sm text-(--overlay-muted)">
              The board is hidden while the clock is stopped.
            </p>
          </BoardOverlay>
        )}
        {BOX_CELLS.map((boxCells, b) => (
          <div
            key={b}
            role="presentation"
            className="grid min-h-0 grid-cols-3 grid-rows-3 gap-px overflow-hidden rounded-lg bg-(--line)"
          >
            {boxCells.map(renderCell)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-9 gap-1.5">
        {DIGITS.map((digit) => {
          const isComplete = completed.has(digit);
          // Just completed: play the pop-out first, then settle into the hidden state.
          const isLeaving = celebration.digits.has(digit);
          // Clamp at 0: over-placing a digit (a mistake) shouldn't show a negative count.
          const remaining = Math.max(0, 9 - counts[digit]);
          return (
            <button
              key={digit}
              onClick={(e) => enterDigit(digit, e.shiftKey)}
              disabled={isComplete || paused || finished}
              aria-hidden={isComplete}
              aria-label={`${digit}, ${remaining} left`}
              // Stay in the grid while hidden so the other keys keep their positions.
              className={`flex aspect-[4/5] flex-col items-center justify-center gap-1 rounded-xl bg-surface transition-[background-color,color,transform,opacity] duration-150 ease-out select-none hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none motion-safe:active:scale-[0.9] ${
                notesActive ? "text-accent" : "text-fg"
              } ${
                isLeaving
                  ? "motion-safe:animate-pad-pop motion-reduce:invisible"
                  : isComplete
                    ? "invisible"
                    : paused || finished
                      ? "opacity-40"
                      : ""
              }`}
            >
              <span
                className={`leading-none font-medium transition-[font-size] duration-150 ${
                  notesActive ? "text-lg" : "text-2xl"
                }`}
              >
                {digit}
              </span>
              <span className="text-[0.65rem] leading-none text-muted tabular-nums">
                {remaining}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-5 gap-1">
        <Tool
          icon={<UndoIcon />}
          label="Undo"
          onClick={undo}
          // Mistakes already made stay counted; undo only restores the board.
          disabled={paused || finished || !canUndo(history)}
          title="Undo (Ctrl+Z)"
        />
        <Tool
          icon={<EraseIcon />}
          label="Erase"
          onClick={erase}
          disabled={paused || finished || selectedLocked}
          title="Erase (Backspace)"
        />
        <Tool
          icon={<PencilIcon />}
          label={shiftHeld && !noteMode ? "Notes (Shift)" : "Notes"}
          active={notesActive}
          onClick={() => dispatch({ type: "toggleNoteMode" })}
          disabled={paused || finished}
          aria-pressed={noteMode}
          title="Notes (N), or hold Shift while entering a number"
        />
        <Tool
          icon={<AutoNotesIcon />}
          label="Auto notes"
          onClick={() => dispatch({ type: "autoNotes" })}
          disabled={paused || finished}
          title="Fill every empty cell with its possible numbers (A)"
        />
        <Tool
          icon={<HintIcon />}
          label="Hint"
          badge={hintsLeft}
          onClick={giveHint}
          disabled={paused || finished || (hintsLeft === 0 && activeHint === null)}
          title="Show where a number goes (H)"
          aria-label={`Hint, ${hintsLeft} left`}
        />
      </div>
    </div>
  );
}
