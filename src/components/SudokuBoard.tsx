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
    <div className="grid aspect-square w-md grid-cols-9 border-2 border-neutral-400">
    {state.cells.map((cell, i) => {
        const row = Math.floor(i / 9);
        const col = i % 9;

        return (
        <div
            key={i}
            className={`
            flex items-center justify-center
            border border-neutral-700
            text-xl

            ${col === 2 || col === 5 ? "!border-r-2 !border-r-neutral-400" : ""}
            ${row === 2 || row === 5 ? "!border-b-2 !border-b-neutral-400" : ""}

            ${col === 0 ? "!border-l-2 !border-l-neutral-400" : ""}
            ${row === 0 ? "!border-t-2 !border-t-neutral-400" : ""}
            ${col === 8 ? "!border-r-2 !border-r-neutral-400" : ""}
            ${row === 8 ? "!border-b-2 !border-b-neutral-400" : ""}
            `}
        >
            {cell.value ?? ""}
        </div>
        );
    })}
    </div>
  );
}