"use client";

import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** When true, the sheet fills the viewport. */
  fullscreen?: boolean;
}

export function Sheet({ open, onClose, title, children, fullscreen }: Props) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (open) {
      document.documentElement.dataset.modalOpen = "1";
    } else {
      delete document.documentElement.dataset.modalOpen;
    }
    return () => {
      delete document.documentElement.dataset.modalOpen;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 anim-fade sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`anim-sheet flex w-full max-w-md flex-col gap-4 rounded-t-3xl bg-(--color-bg) px-5 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)] sm:rounded-3xl ${
          fullscreen ? "h-[92svh]" : "max-h-[92svh]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-1">
          <span className="block h-1 w-10 rounded-full bg-(--color-fg-soft)/30" />
        </div>
        {title && (
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="tap rounded-full bg-(--color-surface-2) px-3 py-1.5 text-sm text-(--color-fg-muted)"
            >
              Close
            </button>
          </div>
        )}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
