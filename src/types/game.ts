export type Cell = {
  value: number | null;
  isGiven: boolean;
  notes: number[];
};

export type BoardState = {
  cells: Cell[];
  selectedIndex: number | null;
  noteMode: boolean;
};
