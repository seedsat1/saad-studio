"use client";

interface SystemHealthRingProps {
  readyCount: number;
  partialCount: number;
  degradedCount: number;
  totalSystems: number;
}

export function SystemHealthRing({
  readyCount,
  partialCount,
  degradedCount,
  totalSystems,
}: SystemHealthRingProps) {
  const safeTotal = Math.max(totalSystems, 1);
  const readyPct = (readyCount / safeTotal) * 100;
  const partialPct = (partialCount / safeTotal) * 100;
  const degradedPct = (degradedCount / safeTotal) * 100;

  const r = 36;
  const circumference = 2 * Math.PI * r;

  const readyStroke = (readyPct / 100) * circumference;
  const partialStroke = (partialPct / 100) * circumference;
  const degradedStroke = (degradedPct / 100) * circumference;

  const readyOffset = 0;
  const partialOffset = -readyStroke;
  const degradedOffset = -(readyStroke + partialStroke);

  return (
    <div className="relative flex items-center justify-center w-20 h-20 flex-shrink-0">
      <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 90 90">
        <circle
          cx="45"
          cy="45"
          r={r}
          className="stroke-slate-800/80"
          strokeWidth="8"
          fill="transparent"
        />
        {readyCount > 0 && (
          <circle
            cx="45"
            cy="45"
            r={r}
            className="stroke-emerald-400 transition-all duration-700 ease-out"
            strokeWidth="8"
            strokeDasharray={`${readyStroke} ${circumference}`}
            strokeDashoffset={readyOffset}
            fill="transparent"
            strokeLinecap="round"
          />
        )}
        {partialCount > 0 && (
          <circle
            cx="45"
            cy="45"
            r={r}
            className="stroke-amber-400 transition-all duration-700 ease-out"
            strokeWidth="8"
            strokeDasharray={`${partialStroke} ${circumference}`}
            strokeDashoffset={partialOffset}
            fill="transparent"
            strokeLinecap="round"
          />
        )}
        {degradedCount > 0 && (
          <circle
            cx="45"
            cy="45"
            r={r}
            className="stroke-rose-500 transition-all duration-700 ease-out"
            strokeWidth="8"
            strokeDasharray={`${degradedStroke} ${circumference}`}
            strokeDashoffset={degradedOffset}
            fill="transparent"
            strokeLinecap="round"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <span className="text-sm font-bold text-white leading-none">
          {readyCount}/{totalSystems}
        </span>
        <span className="text-[8px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5">
          Ready
        </span>
      </div>
    </div>
  );
}
