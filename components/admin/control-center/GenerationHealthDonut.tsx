"use client";

import { Activity, CheckCircle2, Cpu, XCircle } from "lucide-react";

interface GenerationHealthDonutProps {
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  processingRuns: number;
  successRatePct: number;
}

export function GenerationHealthDonut({
  totalRuns,
  completedRuns,
  failedRuns,
  processingRuns,
  successRatePct,
}: GenerationHealthDonutProps) {
  // SVG Donut geometry (Large impactful radius)
  const size = 160;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const safeTotal = Math.max(totalRuns, 1);
  const completedPct = (completedRuns / safeTotal) * 100;
  const failedPct = (failedRuns / safeTotal) * 100;
  const processingPct = (processingRuns / safeTotal) * 100;

  const completedStroke = (completedPct / 100) * circumference;
  const failedStroke = (failedPct / 100) * circumference;
  const processingStroke = (processingPct / 100) * circumference;

  const completedOffset = 0;
  const failedOffset = -completedStroke;
  const processingOffset = -(completedStroke + failedStroke);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-4">
      {/* Large SVG Donut Visualization */}
      <div className="relative flex items-center justify-center flex-shrink-0">
        <svg width={size} height={size} className="-rotate-90 transform">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-slate-800/70"
          />

          {/* Completed Segment (Emerald) */}
          {completedRuns > 0 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#34d399"
              strokeWidth={strokeWidth}
              strokeDasharray={`${completedStroke} ${circumference}`}
              strokeDashoffset={completedOffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-out"
            />
          )}

          {/* Failed Segment (Rose) */}
          {failedRuns > 0 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#f43f5e"
              strokeWidth={strokeWidth}
              strokeDasharray={`${failedStroke} ${circumference}`}
              strokeDashoffset={failedOffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-out"
            />
          )}

          {/* Processing Segment (Cyan/Sky) */}
          {processingRuns > 0 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#38bdf8"
              strokeWidth={strokeWidth}
              strokeDasharray={`${processingStroke} ${circumference}`}
              strokeDashoffset={processingOffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-out"
            />
          )}
        </svg>

        {/* Center Percentage Display */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-black text-white tracking-tight tabular-nums">
            {totalRuns > 0 ? `${successRatePct.toFixed(1)}%` : "0%"}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Success Rate
          </span>
        </div>
      </div>

      {/* Breakdown Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 w-full flex-1">
        
        {/* Completed */}
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Completed</span>
          </div>
          <span className="text-lg font-bold text-white tabular-nums mt-1">
            {completedRuns.toLocaleString()} <span className="text-xs text-slate-500 font-normal">({completedPct.toFixed(0)}%)</span>
          </span>
        </div>

        {/* Failed */}
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span>Failed</span>
          </div>
          <span className="text-lg font-bold text-rose-300 tabular-nums mt-1">
            {failedRuns.toLocaleString()} <span className="text-xs text-slate-500 font-normal">({failedPct.toFixed(0)}%)</span>
          </span>
        </div>

        {/* Processing */}
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="h-2 w-2 rounded-full bg-sky-400" />
            <span>In Flight</span>
          </div>
          <span className="text-lg font-bold text-sky-300 tabular-nums mt-1">
            {processingRuns.toLocaleString()} <span className="text-xs text-slate-500 font-normal">runs</span>
          </span>
        </div>

        {/* Total Runs */}
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Activity className="h-3.5 w-3.5 text-cyan-400" />
            <span>Total Lifecycle</span>
          </div>
          <span className="text-lg font-bold text-cyan-300 tabular-nums mt-1">
            {totalRuns.toLocaleString()}
          </span>
        </div>

      </div>
    </div>
  );
}
