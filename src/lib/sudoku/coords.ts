export const rowOf = (i: number) => Math.floor(i / 9);
export const colOf = (i: number) => i % 9;
export const boxOf = (i: number) =>
  Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

export const rowIndices = (r: number) =>
  Array.from({ length: 9 }, (_, c) => r * 9 + c);

export const colIndices = (c: number) =>
  Array.from({ length: 9 }, (_, r) => r * 9 + c);

export const boxIndices = (b: number) => {
  const startRow = Math.floor(b / 3) * 3;
  const startCol = (b % 3) * 3;
  return Array.from({ length: 9 }, (_, k) =>
    (startRow + Math.floor(k / 3)) * 9 + (startCol + (k % 3))
  );
};