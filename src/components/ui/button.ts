/**
 * Shared button styles. Every button is borderless and rounded, eases its color on hover, sinks a
 * little when pressed, and shows a clear focus ring for keyboard users.
 */
const BASE =
  "inline-flex items-center justify-center gap-2 font-medium select-none transition-[background-color,color,transform,opacity] duration-150 ease-out motion-safe:active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export const button = {
  /** The one main action in a view. */
  primary: `${BASE} rounded-xl bg-accent px-5 py-2.5 text-white hover:bg-accent-strong`,
  /** Secondary actions on the page background. */
  secondary: `${BASE} rounded-xl bg-surface px-5 py-2.5 text-fg hover:bg-surface-hover`,
  /** Low-emphasis text actions. */
  ghost: `${BASE} rounded-xl px-3 py-2 text-muted hover:bg-surface hover:text-fg`,
  /** Destructive low-emphasis actions (Reset stats). */
  danger: `${BASE} rounded-xl px-3 py-2 text-danger hover:bg-danger/10`,
  /** Square icon-only buttons in headers. */
  icon: `${BASE} size-10 rounded-xl text-muted hover:bg-surface hover:text-fg`,
  /** Secondary action shown on top of the board (win, pause, game over), themed with the board. */
  boardSecondary: `${BASE} rounded-xl bg-(--overlay-button) px-5 py-2.5 text-(--overlay-fg) hover:bg-(--overlay-button-hover)`,
};
