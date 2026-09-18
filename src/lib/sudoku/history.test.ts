import { describe, expect, it } from "vitest";
import { canUndo, createBoardState, createHistory, historyReducer } from "@/lib/sudoku";

const PUZZLE = "530070000600195000098000060800060003400803001700020006060000280000419005000080079";
const EMPTY = 2; // row 0, col 2 is empty

describe("historyReducer", () => {
  const start = createHistory(createBoardState(PUZZLE));

  it("undoes placed numbers one step at a time and selects the changed cell", () => {
    let h = historyReducer(start, { type: "select", index: EMPTY });
    h = historyReducer(h, { type: "input", digit: 4 });
    h = historyReducer(h, { type: "select", index: 3 });
    h = historyReducer(h, { type: "input", digit: 6 });
    expect(h.past).toHaveLength(2);

    h = historyReducer(h, { type: "undo" });
    expect(h.present.cells[3].value).toBeNull();
    expect(h.present.cells[EMPTY].value).toBe(4);

    h = historyReducer(h, { type: "select", index: 40 });
    h = historyReducer(h, { type: "undo" });
    expect(h.present.cells[EMPTY].value).toBeNull();
    expect(h.present.selectedIndex).toBe(EMPTY);
    expect(canUndo(h)).toBe(false);
  });

  it("selects the placed cell, not a peer whose note was cleared", () => {
    let h = historyReducer(start, { type: "select", index: EMPTY });
    h = historyReducer(h, { type: "input", digit: 4, asNote: true });
    h = historyReducer(h, { type: "select", index: 3 }); // same row, after index 2
    h = historyReducer(h, { type: "input", digit: 4 }); // clears the note at index 2
    h = historyReducer(h, { type: "undo" });
    expect(h.present.selectedIndex).toBe(3);
    expect(h.present.cells[EMPTY].notes).toEqual([4]);
  });

  it("undoes notes and erasing too", () => {
    let h = historyReducer(start, { type: "select", index: EMPTY });
    h = historyReducer(h, { type: "input", digit: 4, asNote: true });
    h = historyReducer(h, { type: "erase" });
    expect(h.present.cells[EMPTY].notes).toEqual([]);
    h = historyReducer(h, { type: "undo" });
    expect(h.present.cells[EMPTY].notes).toEqual([4]);
  });

  it("does not record selection, note-mode toggles, or no-op moves", () => {
    let h = historyReducer(start, { type: "select", index: 0 });
    h = historyReducer(h, { type: "toggleNoteMode" });
    h = historyReducer(h, { type: "input", digit: 4 }); // index 0 is a given
    expect(canUndo(h)).toBe(false);
    expect(historyReducer(h, { type: "undo" })).toBe(h);
  });

  it("keeps locked numbers through undo, still undoing other changes", () => {
    let h = historyReducer(start, { type: "select", index: 3 });
    h = historyReducer(h, { type: "input", digit: 6 }); // correct number at index 3
    h = historyReducer(h, { type: "select", index: EMPTY });
    h = historyReducer(h, { type: "input", digit: 1, asNote: true }); // a note elsewhere

    h = historyReducer(h, { type: "undo", keep: [3] });
    expect(h.present.cells[EMPTY].notes).toEqual([]); // the note is undone
    expect(h.present.cells[3].value).toBe(6); // the locked number stays
  });

  it("skips undo steps that would only remove a locked number", () => {
    let h = historyReducer(start, { type: "select", index: EMPTY });
    h = historyReducer(h, { type: "input", digit: 1, asNote: true });
    h = historyReducer(h, { type: "select", index: 3 });
    h = historyReducer(h, { type: "input", digit: 6 }); // latest step: the locked number

    // One press goes past the locked placement straight to undoing the note.
    h = historyReducer(h, { type: "undo", keep: [3] });
    expect(h.present.cells[3].value).toBe(6);
    expect(h.present.cells[EMPTY].notes).toEqual([]);
    expect(canUndo(h)).toBe(false);
  });

  it("re-clears peer notes when a kept number is restored", () => {
    let h = historyReducer(start, { type: "select", index: EMPTY });
    h = historyReducer(h, { type: "input", digit: 6, asNote: true, allowImpossibleNotes: true });
    h = historyReducer(h, { type: "select", index: 3 });
    h = historyReducer(h, { type: "input", digit: 6 }); // clears the 6 note in the same row
    h = historyReducer(h, { type: "select", index: 40 });
    h = historyReducer(h, { type: "input", digit: 2, asNote: true });

    h = historyReducer(h, { type: "undo", keep: [3] });
    expect(h.present.cells[40].notes).toEqual([]);

    // Undoing further reaches the snapshot that still had the 6 note next to the placement.
    // The kept 6 is re-placed, so that note must not come back.
    h = historyReducer(h, { type: "undo", keep: [3] });
    expect(h.present.cells[3].value).toBe(6);
    expect(h.present.cells[EMPTY].notes).toEqual([]);
    expect(canUndo(h)).toBe(false);
  });

  it("clears history when a puzzle is loaded", () => {
    let h = historyReducer(start, { type: "select", index: EMPTY });
    h = historyReducer(h, { type: "input", digit: 4 });
    h = historyReducer(h, { type: "load", puzzle: PUZZLE });
    expect(canUndo(h)).toBe(false);
  });
});
