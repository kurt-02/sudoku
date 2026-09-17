import type { BoardState, Cell } from "@/types/game";
import { cellsFromString } from "./board";
import { colOf, peersOf, rowOf } from "./coords";
import { gridFromCells } from "./grid";
import { blockingPeers } from "./validate";

export type Direction = "up" | "down" | "left" | "right";

/** Wrong placements allowed before the game ends. */
export const MAX_MISTAKES = 3;

export type GameAction =
  | { type: "select"; index: number | null }
  | { type: "move"; direction: Direction }
  /** `asNote` writes a pencil note even when note mode is off (e.g. while Shift is held). */
  | { type: "input"; digit: number; asNote?: boolean }
  | { type: "erase" }
  | { type: "toggleNoteMode" }
  | { type: "load"; puzzle: string };

export function createBoardState(puzzle: string): BoardState {
  return { cells: cellsFromString(puzzle), selectedIndex: null, noteMode: false };
}

const DELTAS: Record<Direction, [number, number]> = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};

function updateCell(cells: Cell[], index: number, patch: Partial<Cell>): Cell[] {
  return cells.map((cell, i) => (i === index ? { ...cell, ...patch } : cell));
}

/** Sets a value and removes that digit from the pencil notes of every peer. */
function placeDigit(cells: Cell[], index: number, digit: number): Cell[] {
  const peers = new Set(peersOf(index));
  return cells.map((c, k) => {
    if (k === index) return { ...c, value: digit, notes: [] };
    if (peers.has(k) && c.notes.includes(digit)) {
      return { ...c, notes: c.notes.filter((n) => n !== digit) };
    }
    return c;
  });
}

/** Pure state transition for every player action. Returns the same state object on no-ops. */
export function gameReducer(state: BoardState, action: GameAction): BoardState {
  switch (action.type) {
    case "select":
      return { ...state, selectedIndex: action.index };

    case "move": {
      if (state.selectedIndex === null) return { ...state, selectedIndex: 0 };
      const [dr, dc] = DELTAS[action.direction];
      // Wrap around the edges so arrow keys never get stuck.
      const row = (rowOf(state.selectedIndex) + dr + 9) % 9;
      const col = (colOf(state.selectedIndex) + dc + 9) % 9;
      return { ...state, selectedIndex: row * 9 + col };
    }

    case "toggleNoteMode":
      return { ...state, noteMode: !state.noteMode };

    case "input": {
      const { digit } = action;
      const i = state.selectedIndex;
      if (i === null || !Number.isInteger(digit) || digit < 1 || digit > 9) return state;
      const cell = state.cells[i];
      if (cell.isGiven) return state;

      if (state.noteMode || action.asNote) {
        if (cell.value !== null) return state;
        if (cell.notes.includes(digit)) {
          const notes = cell.notes.filter((n) => n !== digit);
          return { ...state, cells: updateCell(state.cells, i, { notes }) };
        }
        // Only allow notes that don't clash with a digit already in the row, column, or box.
        if (blockingPeers(gridFromCells(state.cells), i, digit).length > 0) return state;
        const notes = [...cell.notes, digit].sort((a, b) => a - b);
        return { ...state, cells: updateCell(state.cells, i, { notes }) };
      }

      // Entering the digit a cell already holds clears it.
      if (cell.value === digit) {
        return { ...state, cells: updateCell(state.cells, i, { value: null }) };
      }

      return { ...state, cells: placeDigit(state.cells, i, digit) };
    }

    case "erase": {
      const i = state.selectedIndex;
      if (i === null) return state;
      const cell = state.cells[i];
      if (cell.isGiven || (cell.value === null && cell.notes.length === 0)) return state;
      return { ...state, cells: updateCell(state.cells, i, { value: null, notes: [] }) };
    }

    case "load":
      return createBoardState(action.puzzle);
  }
}
