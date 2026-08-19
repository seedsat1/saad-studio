"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

export interface AspectRatioOption {
  value: string;
  label?: string;
  width?: number;
  height?: number;
}

export function sortAspectRatios(ratios: string[]): string[] {
  const rank: Record<string, number> = {
    "16:9": 1,
    "9:16": 2,
    "1:1": 3,
    "4:3": 4,
    "3:4": 5,
    "21:9": 6,
    "9:21": 7,
    "3:2": 8,
    "2:3": 9,
  };
  return [...ratios].sort((a, b) => (rank[a] ?? 99) - (rank[b] ?? 99));
}

export function ratioIconStyle(ratio: string): { width: number; height: number } {
  const [wStr, hStr] = ratio.split(":");
  const w = parseFloat(wStr) || 1;
  const h = parseFloat(hStr) || 1;
  const maxPx = 18;
  if (w >= h) {
    return { width: maxPx, height: Math.max(7, Math.round((h / w) * maxPx)) };
  }
  return { width: Math.max(7, Math.round((w / h) * maxPx)), height: maxPx };
}

export function AspectRatioPicker({
  selected,
  value,
  options,
  onChange,
  disabled = false,
  className,
  accent,
  id,
}: {
  selected?: string;
  value?: string | null;
  options: string[];
  onChange: (ratio: string) => void;
  disabled?: boolean;
  className?: string;
  accent?: string;
  id?: string;
}) {
  const sorted = useMemo(() => sortAspectRatios(options || []), [options]);
  const activeValue = value || selected || sorted[0] || "16:9";

  if (!options || options.length === 0) return null;

  return (
    <div id={id} className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {sorted.map((ratio) => {
        const isSelected = activeValue === ratio;
        const iconDims = ratioIconStyle(ratio);

        return (
          <button
            key={ratio}
            type="button"
            disabled={disabled}
            onClick={() => onChange(ratio)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 border",
              isSelected
                ? "bg-violet-600/20 text-violet-200 border-violet-500/50 shadow-sm shadow-violet-500/10"
                : "bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200",
              disabled && "opacity-40 cursor-not-allowed"
            )}
          >
            <span
              className={cn(
                "inline-block rounded-[2px] border transition-colors",
                isSelected
                  ? "border-violet-400 bg-violet-400/40"
                  : "border-zinc-500 bg-zinc-700/40"
              )}
              style={{ width: iconDims.width, height: iconDims.height }}
            />
            <span>{ratio}</span>
          </button>
        );
      })}
    </div>
  );
}
