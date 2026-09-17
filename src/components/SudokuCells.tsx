"use client";

import { rowOf, colOf } from "@/lib/sudoku/coords";
import type { Cell } from "@/types/game";

type Props = {
  cell: Cell;
  index: number;
  isSelected: boolean;
  /** Shares a row, column, or box with the selected cell. */
  isPeer: boolean;
  /** Holds the same digit as the selected cell. */
  isSameValue: boolean;
  isConflict: boolean;
  /** Changes on every rejected note that involves this cell, restarting the shake; null when idle. */
  shakeKey: number | null;
  /** Holds the digit that blocked the rejected note. */
  isBlocking: boolean;
  /** Changes on each completion this cell is part of, replaying the pulse; null when idle. */
  celebrateKey: number | null;
  /** Milliseconds to wait before pulsing, so completions ripple outward. */
  celebrateDelay: number;
  /** Correct digit to show as a hint (not entered); null when this cell has no hint. */
  hintDigit: number | null;
  /** Faded back so a hinted cell stands out. */
  isDimmed: boolean;
  /** Whether shake and pulse animations play (the red flash shows either way). */
  animate: boolean;
  onSelect: (index: number) => void;
};

const NOTE_DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function SudokuCell({
  cell,
  index,
  isSelected,
  isPeer,
  isSameValue,
  isConflict,
  shakeKey,
  isBlocking,
  celebrateKey,
  celebrateDelay,
  hintDigit,
  isDimmed,
  animate,
  onSelect,
}: Props) {
  const row = rowOf(index);
  const col = colOf(index);

  const classes = [
    "flex items-center justify-center text-xl select-none cursor-pointer",
    "relative border border-neutral-300 transition-opacity duration-300",
    isDimmed ? "opacity-30" : "",
    col % 3 === 2 && col !== 8 ? "border-r-2 border-r-neutral-800" : "",
    row % 3 === 2 && row !== 8 ? "border-b-2 border-b-neutral-800" : "",
    isBlocking
      ? "bg-red-200"
      : isSelected
        ? "bg-blue-200"
        : isSameValue
          ? "bg-blue-100"
          : isPeer
            ? "bg-neutral-100"
            : "bg-white",
    isConflict ? "text-red-600" : cell.isGiven ? "font-semibold text-black" : "text-blue-600",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      role="gridcell"
      aria-selected={isSelected}
      aria-label={`Row ${row + 1}, column ${col + 1}, ${cell.value ?? "empty"}${
        hintDigit !== null ? `, hint: ${hintDigit}` : ""
      }`}
      className={classes}
      onClick={() => onSelect(index)}
    >
      {/* A new key remounts this wrapper, so repeated shakes or pulses replay the animation. */}
      <div
        key={`${shakeKey ?? "-"}:${celebrateKey ?? "-"}`}
        className={`flex size-full items-center justify-center ${
          !animate
            ? ""
            : shakeKey !== null
              ? "motion-safe:animate-shake"
              : celebrateKey !== null
                ? "motion-safe:animate-celebrate"
                : ""
        }`}
        style={celebrateKey !== null ? { animationDelay: `${celebrateDelay}ms` } : undefined}
      >
        {cell.value === null && hintDigit !== null ? (
          <span className="font-semibold text-blue-400">{hintDigit}</span>
        ) : (
          (cell.value ??
          (cell.notes.length > 0 && (
            <div className="grid size-full grid-cols-3 text-[0.6rem] leading-none text-black">
              {NOTE_DIGITS.map((d) => (
                <span key={d} className="flex items-center justify-center">
                  {cell.notes.includes(d) ? d : ""}
                </span>
              ))}
            </div>
          )))
        )}
      </div>
      {hintDigit !== null && (
        <>
          <div className="pointer-events-none absolute inset-0 ring-[3px] ring-blue-600 ring-inset" />
          {/* On a wrong entry, show the answer small in the corner instead of hiding the mistake. */}
          {cell.value !== null && (
            <span className="absolute top-0 right-0.5 text-[0.6rem] font-semibold text-blue-500">
              {hintDigit}
            </span>
          )}
        </>
      )}
    </div>
  );
}
