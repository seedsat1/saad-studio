"use client";

import Link from "next/link";
import { DollarSign, ArrowUpRight, AlertTriangle, ShieldAlert } from "lucide-react";

interface FinancialCoverageMeterProps {
  actualCostCoverage: number | null;
  estimatedCostCoverage: number | null;
  trustworthy: boolean;
}

export function FinancialCoverageMeter({
  actualCostCoverage,
  estimatedCostCoverage,
  trustworthy,
}: FinancialCoverageMeterProps) {
  const actualVal = actualCostCoverage !== null ? actualCostCoverage : 0;
  const estimatedVal = estimatedCostCoverage !== null ? estimatedCostCoverage : 0;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400">
            <DollarSign className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-white leading-none">Financial Data Coverage</h3>
            <p className="text-[11px] text-slate-400 mt-1">Direct provider cost traceability</p>
          </div>
        </div>
        <Link
          href="/admin/analytics"
          className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          Analytics
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="space-y-3.5 my-auto">
        {/* Actual Cost Coverage Meter */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Actual Provider Cost
            </span>
            <span className="font-bold text-cyan-400 tabular-nums">
              {actualCostCoverage !== null ? `${actualCostCoverage}%` : "-"}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800/80 overflow-hidden">
            <div
              style={{ width: `${Math.min(actualVal, 100)}%` }}
              className="h-full rounded-full bg-cyan-400 transition-all duration-700 ease-out"
            />
          </div>
        </div>

        {/* Estimated Cost Coverage Meter */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Estimated Cost Coverage
            </span>
            <span className="font-bold text-amber-400 tabular-nums">
              {estimatedCostCoverage !== null ? `${estimatedCostCoverage}%` : "-"}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800/80 overflow-hidden">
            <div
              style={{ width: `${Math.min(estimatedVal, 100)}%` }}
              className="h-full rounded-full bg-amber-400 transition-all duration-700 ease-out"
            />
          </div>
        </div>

        {/* Trustworthiness Guard Banner */}
        {!trustworthy && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-200 text-[11px] leading-relaxed">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 text-amber-400 mt-0.5" />
            <span>
              <strong>Financial Trust Guard Active:</strong> Low actual cost coverage ({actualVal}%). Profit and margin totals are not computed to prevent misleading accounting.
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between text-xs text-slate-400">
        <span>Accounting Status:</span>
        <span className="font-semibold text-amber-300">Separated / Untrustworthy</span>
      </div>
    </div>
  );
}
