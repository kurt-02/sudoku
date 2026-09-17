export const rowOf = (i: number) => Math.floor(i / 9);
export const colOf = (i: number) => i % 9;
export const boxOf = (i: number) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

export const rowIndices = (r: number) => Array.from({ length: 9 }, (_, c) => r * 9 + c);

export const colIndices = (c: number) => Array.from({ length: 9 }, (_, r) => r * 9 + c);

export const boxIndices = (b: number) => {
  const startRow = Math.floor(b / 3) * 3;
  const startCol = (b % 3) * 3;
  return Array.from(
    { length: 9 },
    (_, k) => (startRow + Math.floor(k / 3)) * 9 + (startCol + (k % 3)),
  );
};

/** The 20 cells sharing a row, column, or box with each cell, precomputed. */
const PEERS: readonly (readonly number[])[] = Array.from({ length: 81 }, (_, i) => {
  const peers = new Set([
    ...rowIndices(rowOf(i)),
    ...colIndices(colOf(i)),
    ...boxIndices(boxOf(i)),
  ]);
  peers.delete(i);
  return [...peers];
});

export const peersOf = (i: number) => PEERS[i];
