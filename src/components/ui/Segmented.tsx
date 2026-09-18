"use client";

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  /** Names the group for screen readers, e.g. "Difficulty". */
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "md" | "sm";
};

/** A row of equal-width tabs; the selected one is raised. */
export default function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  size = "md",
}: Props<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="grid gap-1 rounded-xl bg-ink/60 p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => (
        <button
          key={option.value}
          role="tab"
          aria-selected={option.value === value}
          onClick={() => onChange(option.value)}
          className={`rounded-lg font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
            size === "sm" ? "py-1 text-xs" : "py-1.5 text-sm"
          } ${option.value === value ? "bg-surface-hover text-fg" : "text-muted hover:text-fg"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
