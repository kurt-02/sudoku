import type { Cell } from "@/types/game";

export function cellsFromString(puzzle: string): Cell[] {
    if (puzzle.length !== 81) throw new Error("Puzzle must be 81 chars");
    return puzzle.split("").map((ch) => ({
        value: ch === "0" || ch === "." ? null : Number(ch),
        isGiven: ch !== "0" && ch !== ".",
        notes: [],
    }));
}
