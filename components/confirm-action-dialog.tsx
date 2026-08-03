"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ConfirmActionDialogProps = {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmActionDialog({
  open,
  title = "Confirm action?",
  description = "This action cannot be undone.",
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  loading = false,
  destructive = true,
  onCancel,
  onConfirm,
}: ConfirmActionDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-[500px] rounded-[28px] border border-white/10 bg-[#202124] p-5 text-left shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-action-title"
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/8 text-slate-300 transition-colors hover:bg-white/12 hover:text-white disabled:cursor-wait disabled:opacity-60"
          aria-label={cancelLabel}
        >
          <X className="h-5 w-5" />
        </button>
        <h2 id="confirm-action-title" className="pr-12 text-xl font-extrabold text-white">
          {title}
        </h2>
        {description ? (
          <p className="mt-6 max-w-[410px] text-base font-medium leading-6 text-zinc-400">
            {description}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-white/12 bg-transparent px-6 py-3 text-base font-extrabold text-white transition-colors hover:bg-white/8 disabled:cursor-wait disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "rounded-xl px-6 py-3 text-base font-extrabold text-white transition-colors disabled:cursor-wait disabled:opacity-70",
              destructive ? "bg-[#ff3347] hover:bg-[#ff4658]" : "bg-cyan-600 hover:bg-cyan-500",
            )}
          >
            {loading ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}