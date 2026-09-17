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
  onSelect,
}: Props) {
  const row = rowOf(index);
  const col = colOf(index);

  const classes = [
    "flex items-center justify-center text-xl select-none cursor-pointer",
    "border border-neutral-300",
    col % 3 === 2 && col !== 8 ? "border-r-2 border-r-neutral-800" : "",
    row % 3 === 2 && row !== 8 ? "border-b-2 border-b-neutral-800" : "",
    isSelected
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
      aria-label={`Row ${row + 1}, column ${col + 1}, ${cell.value ?? "empty"}`}
      className={classes}
      onClick={() => onSelect(index)}
    >
      {cell.value ??
        (cell.notes.length > 0 && (
          <div className="grid size-full grid-cols-3 text-[0.6rem] leading-none text-black">
            {NOTE_DIGITS.map((d) => (
              <span key={d} className="flex items-center justify-center">
                {cell.notes.includes(d) ? d : ""}
              </span>
            ))}
          </div>
        ))}
    </div>
  );
}
