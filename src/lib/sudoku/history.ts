import type { BoardState, Cell } from "@/types/game";
import { gameReducer, type GameAction } from "./game";

/** Current board plus earlier cell snapshots for undo (most recent last). */
export type GameHistory = {
  present: BoardState;
  past: Cell[][];
};

export type HistoryAction = GameAction | { type: "undo" };

/** Caps memory on very long games; older moves simply can't be undone. */
const MAX_UNDO = 200;

export function createHistory(board: BoardState): GameHistory {
  return { present: board, past: [] };
}

export function canUndo(history: GameHistory): boolean {
  return history.past.length > 0;
}

/**
 * Wraps `gameReducer` with undo. Only moves that change cells (values, notes, erasing) are
 * recorded; selection and note-mode changes aren't worth an undo step.
 */
export function historyReducer(history: GameHistory, action: HistoryAction): GameHistory {
  const { present, past } = history;

  if (action.type === "undo") {
    if (past.length === 0) return history;
    const cells = past[past.length - 1];
    // Select the cell that changed so the player can see what was undone. Placing a number also
    // strips peer notes, so prefer the cell whose value changed over those.
    const valueChanged = cells.findIndex((cell, i) => cell.value !== present.cells[i].value);
    const changed =
      valueChanged !== -1 ? valueChanged : cells.findIndex((cell, i) => cell !== present.cells[i]);
    return {
      present: {
        ...present,
        cells,
        selectedIndex: changed === -1 ? present.selectedIndex : changed,
      },
      past: past.slice(0, -1),
    };
  }

  const next = gameReducer(present, action);
  if (next === present) return history;
  if (action.type === "load") return createHistory(next);
  if (next.cells === present.cells) return { present: next, past };
  return { present: next, past: [...past, present.cells].slice(-MAX_UNDO) };
}
