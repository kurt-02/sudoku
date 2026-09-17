"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import SudokuCell from "@/components/SudokuCells";
import {
  completedDigits,
  createBoardState,
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
  const solved = useMemo(() => isSolved(cells), [cells]);
  const peers = useMemo(
    () => new Set(selectedIndex === null ? [] : peersOf(selectedIndex)),
    [selectedIndex],
  );
  const selectedValue = selectedIndex === null ? null : cells[selectedIndex].value;

  // Holding Shift writes notes temporarily, without flipping the Notes toggle.
  const [shiftHeld, setShiftHeld] = useState(false);
  const notesActive = noteMode || shiftHeld;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Shift") setShiftHeld(true);
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Match the physical key: with Shift held, e.key is "!" or "@" rather than "1" or "2".
      const digitKey = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
      if (e.key in ARROWS) {
        e.preventDefault();
        dispatch({ type: "move", direction: ARROWS[e.key] });
      } else if (digitKey) {
        e.preventDefault();
        dispatch({ type: "input", digit: Number(digitKey[1]), asNote: e.shiftKey });
      } else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
        dispatch({ type: "erase" });
      } else if (e.key === "n" || e.key === "N") {
        dispatch({ type: "toggleNoteMode" });
      } else if (e.key === "Escape") {
        dispatch({ type: "select", index: null });
      }
    }
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
          return (
            <button
              key={digit}
              onClick={(e) => dispatch({ type: "input", digit, asNote: e.shiftKey })}
              disabled={isComplete}
              aria-hidden={isComplete}
              // Stay in the grid while hidden so the other buttons keep their positions.
              className={`rounded-md border border-neutral-300 bg-white py-2 text-lg text-black hover:bg-neutral-100 ${
                isComplete ? "invisible" : ""
              }`}
            >
              {digit}
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
