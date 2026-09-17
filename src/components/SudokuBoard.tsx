"use client";

import { useEffect, useEffectEvent, useMemo, useReducer, useState } from "react";
import SudokuCell from "@/components/SudokuCells";
import SettingsDialog from "@/components/SettingsDialog";
import WinScreen from "@/components/WinScreen";
import { formatTime } from "@/lib/format";
import { useSettings } from "@/lib/useSettings";
import { clearSavedGame, writeSavedGame } from "@/lib/savedGame";
import { recordLoss, recordStart, recordWin, updateStats, type DifficultyStats } from "@/lib/stats";
import {
  blockingPeers,
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
import type { BoardState } from "@/types/game";

const CONTROL =
  "flex flex-col items-center gap-0.5 rounded-md border border-neutral-300 bg-white py-2 text-sm text-black hover:bg-neutral-100 disabled:opacity-50";
const CAPTION = "text-[0.65rem] text-neutral-500";

const ARROWS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

type Props = {
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
  const gameOver = settings.mistakeLimit && mistakes >= MAX_MISTAKES;

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

  // Timer: ticks once a second while the game is still being played.
  const [seconds, setSeconds] = useState(initialSeconds);
  const [paused, setPaused] = useState(false);
  const finished = solved || gameOver;
  const running = !paused && !finished;
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [running]);

  // Save after every move and timer tick; a solved or lost game has nothing left to resume.
  useEffect(() => {
    if (finished) clearSavedGame();
    else writeSavedGame({ difficulty, cells, noteMode, seconds, mistakes, hintsUsed });
  }, [finished, difficulty, cells, noteMode, seconds, mistakes, hintsUsed]);

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

  function retry() {
    updateStats((s) => recordStart(s, difficulty));
    dispatch({ type: "load", puzzle: gridToString(givens) });
    setSeconds(0);
    setMistakes(0);
    setHintsUsed(0);
    setHintIndex(null);
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
    const before = new Set(completedUnits(grid, solution).map((u) => u.key));
    const newUnits = completedUnits(nextGrid, solution).filter((u) => !before.has(u.key));
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
    if (gameOver) return;
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
      } else if (cell.value !== digit && solution && digit !== solution[i]) {
        // Wrong numbers still go in (and show red), but shake and cost a mistake.
        rejectFeedback(i, blockers);
        setMistakes((m) => m + 1);
        if (settings.mistakeLimit && mistakes + 1 >= MAX_MISTAKES) {
          updateStats((s) => recordLoss(s, difficulty));
        }
      }
      if (!noteMode && !asNote) {
        // The reducer is pure, so preview the move to see what it completes.
        const next = gameReducer(state, action);
        if (next !== state) celebrateCompletions(gridFromCells(next.cells), i);
        if (next !== state && isSolved(next.cells)) recordSolve();
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
      if (!paused && !finished) dispatch({ type: "undo" });
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if ((e.key === "p" || e.key === "P") && !finished) {
      setPaused((p) => !p);
      return;
    }
    // The board is covered while paused or after losing, so ignore everything else.
    if (paused || gameOver) return;
    // Match the physical key: with Shift held, e.key is "!" or "@" rather than "1" or "2".
    const digitKey = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
    if (e.key in ARROWS) {
      e.preventDefault();
      dispatch({ type: "move", direction: ARROWS[e.key] });
    } else if (digitKey) {
      e.preventDefault();
      enterDigit(Number(digitKey[1]), e.shiftKey);
    } else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
      dispatch({ type: "erase" });
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

  return (
    <div className="mt-8 flex w-full max-w-md flex-col gap-4 p-10">
      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
      <div className="flex items-center justify-between">
        <button
          onClick={onExit}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm text-black hover:bg-neutral-100"
        >
          ← Menu
        </button>
        <div className="flex flex-col items-center text-sm">
          <span className="font-medium text-zinc-400 capitalize">{difficulty}</span>
          <span className={mistakes > 0 ? "font-medium text-red-400" : "text-zinc-400"}>
            Mistakes {mistakes}
            {settings.mistakeLimit ? `/${MAX_MISTAKES}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg text-zinc-50 tabular-nums" aria-label="Elapsed time">
            {settings.showTimer ? formatTime(seconds) : ""}
          </span>
          <button
            onClick={() => setPaused((p) => !p)}
            disabled={finished}
            aria-label={paused ? "Resume" : "Pause"}
            title={paused ? "Resume (P)" : "Pause (P)"}
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm text-black hover:bg-neutral-100 disabled:opacity-50"
          >
            {paused ? "▶" : "❚❚"}
          </button>
          <button
            onClick={() => {
              if (!finished) setPaused(true);
              setSettingsOpen(true);
            }}
            aria-label="Settings"
            title="Settings"
            className="rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-black hover:bg-neutral-100"
          >
            ⚙
          </button>
        </div>
      </div>

      <div
        role="grid"
        aria-label="Sudoku board"
        className="relative grid aspect-square w-full grid-cols-9 border-2 border-neutral-800"
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
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/95">
            <p className="text-2xl font-semibold text-black" role="status">
              Game over
            </p>
            <p className="text-sm text-neutral-600">
              {MAX_MISTAKES} mistakes · {formatTime(seconds)}
            </p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={retry}
                className="rounded-md bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
              >
                Try again
              </button>
              <button
                onClick={onExit}
                className="rounded-md border border-neutral-300 bg-white px-5 py-2 text-black hover:bg-neutral-100"
              >
                Back to menu
              </button>
            </div>
          </div>
        )}
        {paused && !gameOver && (
          // Covers the board so the puzzle can't be studied while the clock is stopped.
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-white">
            <p className="text-2xl font-semibold text-black">Paused</p>
            <button
              onClick={() => setPaused(false)}
              className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
            >
              Resume
            </button>
          </div>
        )}
        {cells.map((cell, i) => (
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
        ))}
      </div>

      <div className="grid grid-cols-9 gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => {
          const isComplete = completed.has(digit);
          // Just completed: play the pop-out first, then settle into the hidden state.
          const isLeaving = celebration.digits.has(digit);
          // Clamp at 0: over-placing a digit (a mistake) shouldn't show a negative count.
          const remaining = Math.max(0, 9 - counts[digit]);
          return (
            <button
              key={digit}
              onClick={(e) => enterDigit(digit, e.shiftKey)}
              disabled={isComplete || paused || gameOver}
              aria-hidden={isComplete}
              aria-label={`${digit}, ${remaining} left`}
              // Stay in the grid while hidden so the other buttons keep their positions.
              className={`flex flex-col items-center rounded-md border border-neutral-300 bg-white py-1.5 text-black hover:bg-neutral-100 ${
                isLeaving
                  ? "motion-safe:animate-pad-pop motion-reduce:invisible"
                  : isComplete
                    ? "invisible"
                    : ""
              }`}
            >
              <span className="text-lg leading-tight">{digit}</span>
              <span className="text-[0.65rem] leading-tight text-neutral-600">{remaining}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-5 gap-2">
        <button
          onClick={() => dispatch({ type: "undo" })}
          // Mistakes already made stay counted; undo only restores the board.
          disabled={paused || finished || !canUndo(history)}
          title="Undo (Ctrl+Z)"
          className={CONTROL}
        >
          <span>Undo</span>
          <span className={CAPTION}>Ctrl+Z</span>
        </button>
        <button
          onClick={() => dispatch({ type: "erase" })}
          disabled={paused || gameOver}
          title="Erase (Backspace)"
          className={CONTROL}
        >
          <span>Erase</span>
          <span className={CAPTION}>Del</span>
        </button>
        <button
          onClick={() => dispatch({ type: "toggleNoteMode" })}
          disabled={paused || gameOver}
          aria-pressed={noteMode}
          title="Toggle notes (N), or hold Shift while entering a number"
          className={`${CONTROL} ${notesActive ? "border-blue-600! bg-blue-600! text-white!" : ""}`}
        >
          <span>Notes</span>
          <span className={notesActive ? "text-[0.65rem] text-blue-100" : CAPTION}>
            {shiftHeld && !noteMode ? "Shift" : notesActive ? "On" : "Off"}
          </span>
        </button>
        <button
          onClick={() => dispatch({ type: "autoNotes" })}
          disabled={paused || gameOver}
          title="Fill every empty cell with its possible numbers (A)"
          className={CONTROL}
        >
          <span>Auto</span>
          <span className={CAPTION}>notes</span>
        </button>
        <button
          onClick={giveHint}
          disabled={paused || finished || (hintsLeft === 0 && activeHint === null)}
          title="Show where a number goes (H)"
          aria-label={`Hint, ${hintsLeft} left`}
          className={CONTROL}
        >
          <span>Hint</span>
          <span className="rounded-full bg-blue-600 px-1.5 text-[0.65rem] font-semibold text-white">
            {hintsLeft}
          </span>
        </button>
      </div>
    </div>
  );
}
