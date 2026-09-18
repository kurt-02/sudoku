import type { ReactNode } from "react";

type Props = {
  title: string;
  children?: ReactNode;
  /** Buttons along the bottom. */
  actions: ReactNode;
  /** Solid covers hide the puzzle (pause); others let the finished board show faintly. */
  solid?: boolean;
  /** Animation class, e.g. a fade that waits for the final ripple. Empty to appear instantly. */
  animation?: string;
  role?: "dialog" | "status";
};

/** A panel laid over the board for pause, game over, win, and similar moments. */
export default function BoardOverlay({
  title,
  children,
  actions,
  solid = false,
  animation = "",
  role = "dialog",
}: Props) {
  return (
    <div
      role={role}
      aria-label={title}
      className={`absolute inset-0 z-10 flex flex-col items-center justify-center-safe gap-3 overflow-y-auto rounded-2xl px-5 py-4 text-center sm:gap-4 ${
        solid ? "bg-(--cell)" : "bg-(--overlay) backdrop-blur-sm"
      } ${animation}`}
    >
      <p className="text-2xl font-semibold tracking-tight text-(--overlay-fg)">{title}</p>
      {children}
      <div className="mt-1 flex flex-wrap justify-center gap-2">{actions}</div>
    </div>
  );
}
