"use client";

import React from "react";
import { Zap, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GenerateActionButtonProps {
  creditCost: number;
  userBalance?: number;
  isGenerating: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onClick: () => void;
  submitLabel?: string;
  generatingLabel?: string;
  className?: string;
}

export function GenerateActionButton({
  creditCost,
  userBalance,
  isGenerating,
  disabled = false,
  disabledReason,
  onClick,
  submitLabel = "Generate",
  generatingLabel = "Generating...",
  className,
}: GenerateActionButtonProps) {
  const isInsufficient = typeof userBalance === "number" && userBalance < creditCost;
  const isActionDisabled = disabled || isGenerating || isInsufficient;

  return (
    <div className={cn("flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 shadow-md", className)}>
      {/* Credit price readout */}
      <div className="flex items-center gap-2.5 px-2">
        <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
          <Zap className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-amber-300 font-mono">
              {creditCost > 0 ? `${creditCost.toFixed(creditCost % 1 === 0 ? 0 : 2)} credits` : "Free"}
            </span>
            {typeof userBalance === "number" && (
              <span className="text-[11px] text-zinc-500 font-mono">
                (Balance: {userBalance.toLocaleString()} cr)
              </span>
            )}
          </div>
          {isInsufficient && (
            <span className="text-[10px] text-rose-400 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3 h-3" /> Insufficient credits
            </span>
          )}
          {!isInsufficient && disabledReason && (
            <span className="text-[10px] text-zinc-500">{disabledReason}</span>
          )}
        </div>
      </div>

      {/* Generate button */}
      <button
        type="button"
        disabled={isActionDisabled}
        onClick={onClick}
        className={cn(
          "inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 shadow-lg min-w-[140px]",
          isActionDisabled
            ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/40"
            : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-violet-600/25 active:scale-[0.98]"
        )}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span>{generatingLabel}</span>
          </>
        ) : (
          <>
            <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
            <span>{submitLabel}</span>
          </>
        )}
      </button>
    </div>
  );
}
