"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * A single button in the workspace's left rail.
 *
 * Lifted out of app/(dash)/(routes)/image/page.tsx so the rail's tool flyout can
 * render the exact same button instead of restyling a copy of it — the two must
 * stay visually identical.
 */
export function RailToolButton({
  active,
  icon: Icon,
  label,
  onClick,
  iconClassName,
  badge,
  variant = "tile",
}: {
  active: boolean;
  icon: any;
  label: string;
  onClick: () => void;
  /** Optional colour for the icon; falls back to the button's own text colour. */
  iconClassName?: string;
  /** Small count shown in the corner. */
  badge?: string | number;
  /**
   * "tile" is the narrow rail shape — icon above a tiny label.
   * "row" is a full-width line with the icon beside the label, for stacking one
   * per row in a sidebar that has the width for it.
   */
  variant?: "tile" | "row";
}) {
  const isRow = variant === "row";
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex rounded-xl border-l-2 transition-all",
        isRow
          ? "w-full flex-row items-center gap-2.5 px-3 py-2"
          : "w-14 flex-col items-center gap-1 py-3",
        active
          ? "border-pink-400 bg-gradient-to-b from-pink-500/25 to-pink-500/5 text-pink-300 shadow-[0_0_24px_rgba(236,72,153,0.3)]"
          : "border-transparent text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
      )}
      title={label}
    >
      <Icon className={cn("h-5 w-5 shrink-0", iconClassName)} />
      <span
        className={cn(
          "font-bold tracking-wider",
          isRow ? "text-xs" : "text-[9px]",
        )}
      >
        {label}
      </span>
      {badge !== undefined && (
        <span className="absolute left-1.5 top-1 rounded bg-sky-500/20 px-1 text-[8px] font-bold text-sky-300">
          {badge}
        </span>
      )}
    </button>
  );
}
