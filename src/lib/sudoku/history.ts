import type { BoardState, Cell } from "@/types/game";
import { gameReducer, placeDigit, type GameAction } from "./game";

/** Current board plus earlier cell snapshots for undo (most recent last). */
export type GameHistory = {
  present: BoardState;
  past: Cell[][];
};

export type HistoryAction =
  | GameAction
  /** `keep`: cells whose current number must survive the undo (locked correct numbers). */
  | { type: "undo"; keep?: number[] };

/** Caps memory on very long games; older moves simply can't be undone. */
const MAX_UNDO = 200;

export function createHistory(board: BoardState): GameHistory {
  return { present: board, past: [] };
}

export function canUndo(history: GameHistory): boolean {
  return history.past.length > 0;
}

function sameCells(a: Cell[], b: Cell[]): boolean {
  return a.every(
    (cell, i) =>
      cell.value === b[i].value &&
      cell.notes.length === b[i].notes.length &&
      cell.notes.every((n, k) => n === b[i].notes[k]),
  );
}

/**
 * Wraps `gameReducer` with undo. Only moves that change cells (values, notes, erasing) are
 * recorded; selection and note-mode changes aren't worth an undo step.
 */
export function historyReducer(history: GameHistory, action: HistoryAction): GameHistory {
  const { present } = history;

  if (action.type === "undo") {
    const keep = action.keep ?? [];
    let past = history.past;
    // Pop snapshots until one actually changes the board: a step that only placed a kept
    // number has nothing left to undo, so it's skipped rather than wasting a press.
    while (past.length > 0) {
      let cells = past[past.length - 1];
      past = past.slice(0, -1);
      for (const i of keep) {
        const value = present.cells[i].value;
        // Re-placing also clears that number from peer notes the snapshot still had.
        if (value !== null && cells[i].value !== value) cells = placeDigit(cells, i, value);
      }
      if (sameCells(cells, present.cells)) continue;

      // Select the cell that changed so the player can see what was undone. Placing a number
      // also strips peer notes, so prefer the cell whose value changed over those.
      const valueChanged = cells.findIndex((cell, i) => cell.value !== present.cells[i].value);
      const changed =
        valueChanged !== -1
          ? valueChanged
          : cells.findIndex((cell, i) => !sameCells([cell], [present.cells[i]]));
      return {
        present: {
          ...present,
          cells,
          selectedIndex: changed === -1 ? present.selectedIndex : changed,
        },
        past,
      };
    }
    return past === history.past ? history : { present, past };
  }

  const next = gameReducer(present, action);
  if (next === present) return history;
  if (action.type === "load") return createHistory(next);
  if (next.cells === present.cells) return { present: next, past: history.past };
  return { present: next, past: [...history.past, present.cells].slice(-MAX_UNDO) };
}
