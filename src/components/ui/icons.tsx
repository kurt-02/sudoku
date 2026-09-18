// Small stroke icons, drawn to one 24px grid so they sit evenly beside text.
import type { SVGProps } from "react";

function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-5"
      {...props}
    />
  );
}

export function ChevronLeftIcon() {
  return (
    <Icon>
      <path d="M15 5l-7 7 7 7" />
    </Icon>
  );
}

export function PauseIcon() {
  return (
    <Icon>
      <path d="M9 5v14M15 5v14" />
    </Icon>
  );
}

export function PlayIcon() {
  return (
    <Icon>
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
    </Icon>
  );
}

export function SettingsIcon() {
  return (
    <Icon>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </Icon>
  );
}

export function UndoIcon() {
  return (
    <Icon>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </Icon>
  );
}

export function EraseIcon() {
  return (
    <Icon>
      <path d="M20 20H9L3.7 14.7a1 1 0 0 1 0-1.4L13.3 3.7a1 1 0 0 1 1.4 0l5.6 5.6a1 1 0 0 1 0 1.4L11 20" />
      <path d="M8 9l7 7" />
    </Icon>
  );
}

export function PencilIcon() {
  return (
    <Icon>
      <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3" />
      <path d="M14.5 7.5l2 2" />
    </Icon>
  );
}

/** Auto notes: a cell filled with small candidate marks. */
export function AutoNotesIcon() {
  return (
    <Icon>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M8 16h.01" strokeWidth={2.6} />
    </Icon>
  );
}

export function HintIcon() {
  return (
    <Icon>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" />
    </Icon>
  );
}

export function CloseIcon() {
  return (
    <Icon>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  );
}
