/** Player preferences kept in localStorage. New keys fall back to their defaults. */
export type Settings = {
  /** End the game after MAX_MISTAKES wrong numbers. */
  mistakeLimit: boolean;
  /** Color numbers that don't match the solution red, not just ones that clash. */
  highlightWrong: boolean;
  /** Refuse notes for numbers already in the row, column, or box. */
  blockImpossibleNotes: boolean;
  /** Shade the selected cell's row, column, box, and matching numbers. */
  highlightPeers: boolean;
  showTimer: boolean;
  animations: boolean;
  vibration: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  mistakeLimit: true,
  highlightWrong: true,
  blockImpossibleNotes: true,
  highlightPeers: true,
  showTimer: true,
  animations: true,
  vibration: true,
};

const STORAGE_KEY = "sudoku:settings";

/** Parses stored JSON, keeping only known boolean keys over the defaults. */
export function parseSettings(raw: string | null): Settings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null) return DEFAULT_SETTINGS;
    const settings = { ...DEFAULT_SETTINGS };
    for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
      const value = (data as Record<string, unknown>)[key];
      if (typeof value === "boolean") settings[key] = value;
    }
    return settings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// Same-tab listeners: the browser's "storage" event only fires in *other* tabs.
const listeners = new Set<() => void>();

export function readSettingsRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Best-effort: without storage (e.g. blocked site data) settings stay at their defaults.
  }
  listeners.forEach((notify) => notify());
}

export function subscribeSettings(onChange: () => void): () => void {
  listeners.add(onChange);
  function onStorage(e: StorageEvent) {
    if (e.key === STORAGE_KEY || e.key === null) onChange();
  }
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}
