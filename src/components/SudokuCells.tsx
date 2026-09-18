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
  /** The selected cell's number; a matching pencil note here is highlighted. */
  highlightNote: number | null;
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
  highlightNote,
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

  // Lines come from the gaps between cells (see SudokuBoard), so cells carry no borders.
  const classes = [
    "relative flex min-h-0 min-w-0 items-center justify-center cursor-pointer select-none",
    "text-[clamp(1.1rem,5.5vw,1.65rem)] leading-none",
    "transition-[background-color,opacity] duration-150 ease-out",
    isDimmed ? "opacity-25" : "",
    isBlocking
      ? "bg-(--cell-blocking)"
      : isSelected
        ? "bg-(--cell-selected)"
        : isSameValue
          ? "bg-(--cell-same)"
          : isPeer
            ? "bg-(--cell-peer)"
            : "bg-(--cell)",
    isConflict
      ? "font-medium text-(--digit-wrong)"
      : cell.isGiven
        ? "font-semibold text-(--digit-given)"
        : "font-medium text-(--digit-entry)",
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
          <span className="font-semibold text-(--hint) opacity-60">{hintDigit}</span>
        ) : (
          (cell.value ??
          (cell.notes.length > 0 && (
            <div className="grid size-full grid-cols-3 grid-rows-3 p-[8%] text-[clamp(0.5rem,2.2vw,0.7rem)] leading-none font-medium text-(--note)">
              {NOTE_DIGITS.map((d) => (
                <span
                  key={d}
                  // A highlighted note tints its whole slot in the 3x3 notes grid, so it scales
                  // with the board instead of a fixed-size badge that gets squeezed.
                  className={`flex items-center justify-center ${
                    cell.notes.includes(d) && d === highlightNote
                      ? "rounded-[4px] bg-(--digit-entry)/20 font-bold text-(--digit-entry)"
                      : ""
                  }`}
                >
                  {cell.notes.includes(d) ? d : ""}
                </span>
              ))}
            </div>
          )))
        )}
      </div>
      {hintDigit !== null && (
        <>
          <div className="pointer-events-none absolute inset-0 rounded-[3px] ring-2 ring-(--hint) ring-inset" />
          {/* On a wrong entry, show the answer small in the corner instead of hiding the mistake. */}
          {cell.value !== null && (
            <span className="absolute top-0.5 right-1 text-[0.6rem] font-semibold text-(--hint)">
              {hintDigit}
            </span>
          )}
        </>
      )}
    </div>
  );
}
