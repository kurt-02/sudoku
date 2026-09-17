import { describe, expect, it } from "vitest";
import { GRID_SIZE } from "@/lib/sudoku";

describe("sudoku engine smoke test", () => {
  it("resolves the @/* alias and runs", () => {
    expect(GRID_SIZE).toBe(9);
  });
});
