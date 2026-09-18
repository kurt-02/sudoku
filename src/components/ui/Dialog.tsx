"use client";

import { useEffect, useId, type ReactNode } from "react";
import { button } from "@/components/ui/button";
import { CloseIcon } from "@/components/ui/icons";

type Props = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/**
 * A modal panel: a bottom sheet on phones, centered on larger screens. Closes on Escape, the
 * close button, or a click outside.
 */
export default function Dialog({ title, onClose, children }: Props) {
  const titleId = useId();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-2xl bg-surface p-2 text-left text-fg shadow-[0_24px_60px_-20px_rgb(0_0_0/0.8)] motion-safe:animate-dialog-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between py-1 pr-1 pl-4">
          <h2 id={titleId} className="text-xl font-semibold tracking-tight">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label={`Close ${title.toLowerCase()}`}
            className={button.icon}
          >
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
