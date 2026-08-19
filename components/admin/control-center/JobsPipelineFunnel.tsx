"use client";

import { AlertTriangle, ArrowRight, CheckCircle2, Clock, PlayCircle, RefreshCw, XCircle } from "lucide-react";

interface JobsPipelineFunnelProps {
  queued: number;
  processing: number;
  failed: number;
  stuck: number;
}

export function JobsPipelineFunnel({
  queued,
  processing,
  failed,
  stuck,
}: JobsPipelineFunnelProps) {
  const total = queued + processing + failed + stuck;

  return (
    <div className="flex flex-col justify-between h-full p-4 space-y-4">
      {/* Visual Connected Pipeline Steps */}
      <div className="grid grid-cols-3 gap-2 relative">
        
        {/* Step 1: Queued */}
        <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-center">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 mb-1">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            <span>Queued</span>
          </div>
          <span className="text-xl font-bold text-amber-300 tabular-nums">
            {queued}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5">Waiting in queue</span>
        </div>

        {/* Step 2: Processing */}
        <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-center">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 mb-1">
            <PlayCircle className="h-3.5 w-3.5 text-cyan-400" />
            <span>Processing</span>
          </div>
          <span className="text-xl font-bold text-cyan-300 tabular-nums">
            {processing}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5">Active worker</span>
        </div>

        {/* Step 3: Failed / Stuck */}
        <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-center">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 mb-1">
            <XCircle className="h-3.5 w-3.5 text-rose-500" />
            <span>Failed / Stuck</span>
          </div>
          <span className="text-xl font-bold text-rose-400 tabular-nums">
            {failed + stuck}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5">{stuck > 0 ? `${stuck} need review` : "Diagnostics"}</span>
        </div>

      </div>

      {/* Pipeline Status Summary Bar */}
      <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs">
        <span className="text-slate-400">Pipeline Flow Status:</span>
        <span className="font-semibold text-slate-200">
          {total === 0 ? "No active queue backlog" : `${total} jobs in runtime tracking`}
        </span>
      </div>
    </div>
  );
}
