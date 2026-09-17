"use client";

import { useEffect, useEffectEvent, useMemo, useReducer, useState } from "react";
import SudokuCell from "@/components/SudokuCells";
import {
  blockingPeers,
  completedDigits,
  createBoardState,
  digitCounts,
  findConflicts,
  gameReducer,
  generatePuzzle,
  gridFromCells,
  gridToString,
  isSolved,
  peersOf,
  type Difficulty,
  type Direction,
} from "@/lib/sudoku";

const ARROWS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

type Props = {
  /** Generated on the server per request, so the server HTML and client hydration match. */
  initialPuzzle: string;
};

export default function SudokuBoard({ initialPuzzle }: Props) {
  const [state, dispatch] = useReducer(gameReducer, initialPuzzle, createBoardState);
  const { cells, selectedIndex, noteMode } = state;

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

  function enterDigit(digit: number, asNote: boolean) {
    const i = selectedIndex;
    if (i !== null && (noteMode || asNote)) {
      const cell = cells[i];
      const blockers = blockingPeers(grid, i, digit);
      const isAddingNote = !cell.isGiven && cell.value === null && !cell.notes.includes(digit);
      if (isAddingNote && blockers.length > 0) {
        setShake((s) => ({ target: i, blockers: new Set(blockers), id: s.id + 1 }));
        // Haptic buzz on devices that support it (most Android phones; not iOS Safari).
        navigator.vibrate?.(80);
        return;
      }
    }
    dispatch({ type: "input", digit, asNote });
  }

  // Effect events always see the latest render's state, so the listener doesn't need re-binding.
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === "Shift") setShiftHeld(true);
    if (e.ctrlKey || e.metaKey || e.altKey) return;
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

  function newGame(difficulty: Difficulty) {
    dispatch({ type: "load", puzzle: gridToString(generatePuzzle(difficulty).puzzle) });
  }

  return (
    <div className="mt-8 flex w-full max-w-md flex-col gap-4">
      <div className="flex gap-2">
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            onClick={() => newGame(d)}
            className="flex-1 rounded-md border border-neutral-300 bg-white py-1.5 text-sm text-black capitalize hover:bg-neutral-100"
          >
            New {d}
          </button>
        ))}
      </div>

      <div
        role="grid"
        aria-label="Sudoku board"
        className="grid aspect-square w-full grid-cols-9 border-2 border-neutral-800"
      >
        {cells.map((cell, i) => (
          <SudokuCell
            key={i}
            cell={cell}
            index={i}
            isSelected={i === selectedIndex}
            isPeer={peers.has(i)}
            isSameValue={selectedValue !== null && cell.value === selectedValue}
            isConflict={conflicts.has(i)}
            shakeKey={i === shake.target || shake.blockers.has(i) ? shake.id : null}
            isBlocking={shake.blockers.has(i)}
            onSelect={(index) => dispatch({ type: "select", index })}
          />
        ))}
      </div>

      {solved && (
        <p className="text-lg font-semibold text-green-600" role="status">
          Solved! Nice work.
        </p>
      )}

      <div className="grid grid-cols-9 gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => {
          const isComplete = completed.has(digit);
          // Clamp at 0: over-placing a digit (a mistake) shouldn't show a negative count.
          const remaining = Math.max(0, 9 - counts[digit]);
          return (
            <button
              key={digit}
              onClick={(e) => enterDigit(digit, e.shiftKey)}
              disabled={isComplete}
              aria-hidden={isComplete}
              aria-label={`${digit}, ${remaining} left`}
              // Stay in the grid while hidden so the other buttons keep their positions.
              className={`flex flex-col items-center rounded-md border border-neutral-300 bg-white py-1.5 text-black hover:bg-neutral-100 ${
                isComplete ? "invisible" : ""
              }`}
            >
              <span className="text-lg leading-tight">{digit}</span>
              <span className="text-[0.65rem] leading-tight text-neutral-600">{remaining}</span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => dispatch({ type: "erase" })}
          className="flex-1 rounded-md border border-neutral-300 bg-white py-2 text-sm text-black hover:bg-neutral-100"
        >
          Erase
        </button>
        <button
          onClick={() => dispatch({ type: "toggleNoteMode" })}
          aria-pressed={noteMode}
          title="Toggle notes, or hold Shift while entering a number"
          className={`flex-1 rounded-md border py-2 text-sm ${
            notesActive
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-neutral-300 bg-white text-black hover:bg-neutral-100"
          }`}
        >
          Notes {notesActive ? "on" : "off"}
          {shiftHeld && !noteMode && <span className="ml-1 opacity-80">(Shift)</span>}
        </button>
      </div>
    </div>
  );
}
