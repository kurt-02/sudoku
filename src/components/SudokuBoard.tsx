"use client";

import { useState } from "react";
import { cellsFromString } from "@/lib/sudoku/board";
import { BoardState } from "@/types/game";

const PUZZLE =
  "530070000600195000098000060800060003400803001700020006060000280000419005000080079";

export default function SudokuBoard() {
  const [state, setState] = useState<BoardState>(() => ({
    cells: cellsFromString(PUZZLE),
    selectedIndex: null,
    noteMode: false,
  }));

  return (
    <div className="grid aspect-square w-md grid-cols-9 border-2 border-neutral-800">
      {state.cells.map((cell, i) => (
        <div
          key={i}
          className="flex items-center justify-center border border-neutral-300 text-xl"
        >
          {cell.value ?? ""}
        </div>
      ))}
    </div>
  );
}