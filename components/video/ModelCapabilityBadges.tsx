"use client";

import React, { useMemo } from "react";
import type { WaveSpeedVideoModel } from "@/lib/video-model-registry";
import { getGenerationCostSync, computeCreditsFromDynamicModel } from "@/lib/pricing";
import { getVideoCreditsByRoute } from "@/lib/credit-pricing";

export interface ModelCapabilityData {
  refs: boolean;
  multi: boolean;
  startEnd: string | null;
  seed: boolean;
  resolution: string | null;
  audio: boolean;
  duration: string | null;
  creditRange: string;
}

/**
 * Extracts exact capabilities for any video model without guesswork,
 * strictly derived from the model's capabilities and pricing registry.
 */
export function extractModelCapabilities(m: WaveSpeedVideoModel | any): ModelCapabilityData {
  const caps = m?.capabilities || {};

  // 1. References (Images, Videos, Audios)
  const refs = Boolean(
    (caps.max_reference_images && caps.max_reference_images > 0) ||
    (caps.max_reference_videos && caps.max_reference_videos > 0) ||
    (caps.max_reference_audios && caps.max_reference_audios > 0) ||
    m?.has_reference_images ||
    m?.requires_reference
  );

  // 2. Multi-prompt / Multi-shot / Element List
  const multi = Boolean(caps.has_multi_prompt || caps.has_shot_type || caps.has_element_list);

  // 3. Start/End Frames
  let startEnd: string | null = null;
  if (caps.has_end_frame) {
    startEnd = "Start/End";
  } else if (caps.requires_image || caps.optional_image) {
    startEnd = "Start";
  }

  // 4. Custom Seed
  const seed = Boolean(caps.has_seed);

  // 5. Resolution: Show highest standard resolution (e.g. 4K, 1080p, 720p)
  let resolution: string | null = null;
  const resolutions: string[] = Array.isArray(caps.resolutions) ? caps.resolutions : [];
  if (resolutions.some((r: string) => r.toLowerCase() === "4k")) {
    resolution = "4K";
  } else if (resolutions.some((r: string) => r.toLowerCase() === "1080p" || r.toLowerCase() === "pro")) {
    resolution = "1080p";
  } else if (resolutions.some((r: string) => r.toLowerCase() === "720p" || r.toLowerCase() === "std" || r.toLowerCase() === "standard")) {
    resolution = "720p";
  } else if (resolutions.length > 0) {
    resolution = resolutions[resolutions.length - 1];
  } else if (Array.isArray(caps.sizes) && caps.sizes.length > 0) {
    resolution = "1080p";
  }

  // 6. Audio Generation
  const audio = Boolean(caps.has_sound);

  // 7. Duration Range (e.g. 5 - 10" or 3 - 15" or 6")
  let duration: string | null = null;
  const durations: number[] = Array.isArray(caps.durations) ? caps.durations : [];
  if (durations.length > 0) {
    const minDur = Math.min(...durations);
    const maxDur = Math.max(...durations);
    if (minDur === maxDur) {
      duration = `${minDur}"`;
    } else {
      duration = `${minDur} - ${maxDur}"`;
    }
  }

  // 8. Credits Range
  const creditRange = computeModelCreditRange(m, durations, resolutions);

  return {
    refs,
    multi,
    startEnd,
    seed,
    resolution,
    audio,
    duration,
    creditRange,
  };
}

/**
 * Calculates the exact min - max credit range based on official tariff / formula.
 */
function computeModelCreditRange(m: any, durations: number[], resolutions: string[]): string {
  if (!m) return "";
  if (m.id === "lipsync" || m.family === "lipsync") return "17";

  const effDurations = durations.length > 0 ? durations : [5];
  const effResolutions = resolutions.length > 0 ? resolutions : ["720p"];

  const getCost = (sec: number, res: string): number => {
    if (m.pricingConfig) {
      try {
        const r = res.toLowerCase();
        const normRes = r === "4k" ? "4k" : r === "1080p" ? "1080p" : r === "480p" ? "480p" : "720p";
        return computeCreditsFromDynamicModel(m, {
          resolution: normRes,
          outputSec: sec,
          isTurbo: m.badge === "TURBO" || m.badge === "FAST",
        });
      } catch {}
    }

    if (m.api_route && m.api_route.startsWith("bytedance/seedance-2.5")) {
      try {
        return getVideoCreditsByRoute(m.api_route, {
          duration: sec,
          resolution: res,
          generate_audio: false,
        });
      } catch {}
    }

    return getGenerationCostSync(m.api_route ?? m.id, sec, 1, res);
  };

  const costs: number[] = [];
  for (const d of effDurations) {
    for (const r of effResolutions) {
      const c = getCost(d, r);
      if (typeof c === "number" && Number.isFinite(c) && c > 0) {
        costs.push(c);
      }
    }
  }

  if (costs.length === 0) {
    const base = getGenerationCostSync(m.api_route ?? m.id, 5, 1);
    return base ? `${Math.round(base)}` : "";
  }

  const minCost = Math.min(...costs);
  const maxCost = Math.max(...costs);

  const formatCr = (num: number) => {
    if (num >= 1000) {
      const kVal = num / 1000;
      return `${kVal % 1 === 0 ? kVal.toFixed(0) : kVal.toFixed(1)}k`;
    }
    return `${Math.round(num * 10) / 10}`;
  };

  if (Math.abs(minCost - maxCost) < 0.2) {
    return formatCr(minCost);
  }
  return `${formatCr(minCost)} - ${formatCr(maxCost)}`;
}

interface ModelCapabilityBadgesProps {
  model: WaveSpeedVideoModel | any;
  className?: string;
  showCredits?: boolean;
}

export const ModelCapabilityBadges: React.FC<ModelCapabilityBadgesProps> = ({
  model,
  className = "",
  showCredits = true,
}) => {
  const caps = useMemo(() => extractModelCapabilities(model), [model]);

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
      {caps.refs && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium tracking-tight bg-zinc-800/90 text-zinc-300 border border-zinc-700/50 select-none shadow-sm">
          Refs
        </span>
      )}

      {caps.multi && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium tracking-tight bg-zinc-800/90 text-zinc-300 border border-zinc-700/50 select-none shadow-sm">
          Multi
        </span>
      )}

      {caps.startEnd && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium tracking-tight bg-zinc-800/90 text-zinc-300 border border-zinc-700/50 select-none shadow-sm">
          {caps.startEnd}
        </span>
      )}

      {caps.seed && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium tracking-tight bg-zinc-800/90 text-zinc-300 border border-zinc-700/50 select-none shadow-sm">
          Custom seed
        </span>
      )}

      {caps.resolution && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium tracking-tight bg-zinc-800/90 text-zinc-300 border border-zinc-700/50 select-none shadow-sm font-mono">
          {caps.resolution}
        </span>
      )}

      {caps.audio && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium tracking-tight bg-zinc-800/90 text-zinc-300 border border-zinc-700/50 select-none shadow-sm">
          Audio
        </span>
      )}

      {caps.duration && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium tracking-tight bg-zinc-800/90 text-zinc-300 border border-zinc-700/50 select-none shadow-sm font-mono">
          {caps.duration}
        </span>
      )}

      {showCredits && caps.creditRange && (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold text-zinc-200 bg-zinc-800/90 border border-zinc-700/60 select-none shadow-sm font-mono ml-auto">
          {/* Double-loop token symbol matching the provided screenshot */}
          <svg
            className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="8.5" cy="12" r="5" />
            <circle cx="15.5" cy="12" r="5" />
          </svg>
          <span>{caps.creditRange}</span>
        </span>
      )}
    </div>
  );
};
