"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  /** `rtl` | `ltr` — aligns text and button order */
  dir: "rtl" | "ltr";
  /** Primary line (e.g. delete warning) */
  message: string;
  /** Optional heading above the message */
  title?: string;
  labelConfirm: string;
  labelCancel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Destructive primary action (e.g. delete) */
  danger?: boolean;
};

/**
 * Generic yes/no overlay — replaces `window.confirm` with app-styled UI.
 */
export function ConfirmModal({
  open,
  dir,
  message,
  title,
  labelConfirm,
  labelCancel,
  onConfirm,
  onCancel,
  danger = true,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open || !mounted) {
    return null;
  }

  const node = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
        aria-label={labelCancel}
        onClick={onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={title ? "confirm-modal-title" : undefined}
        aria-describedby="confirm-modal-desc"
        dir={dir}
        className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card-hover)] ring-1 ring-black/5"
      >
        {title ? (
          <h2
            id="confirm-modal-title"
            className="text-start text-2xl font-bold tracking-tight text-card-foreground md:text-[1.75rem] md:leading-snug"
          >
            {title}
          </h2>
        ) : null}
        <p
          id="confirm-modal-desc"
          className={`text-base leading-relaxed text-muted ${title ? "mt-4 text-start" : ""}`}
        >
          {message}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-border bg-muted-bg/80 px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted-bg"
          >
            {labelCancel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
            }}
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110 ${
              danger
                ? "bg-destructive hover:bg-destructive/95"
                : "bg-primary hover:brightness-110"
            }`}
          >
            {labelConfirm}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
