"use client";

import React, { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wand2,
  Maximize2,
  Crop,
  Palette,
  Download,
  X,
  Copy,
  Check,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Props ──────────────────────────────────────────────────────────────────
interface DynamicImageViewerProps {
  imageSrc: string;
  promptText: string;
  onClose: () => void;
}

// ─── Toolbar Actions ────────────────────────────────────────────────────────
const studioActions = [
  {
    id: "upscale",
    label: "Upscale",
    icon: Wand2,
    gradient: "from-violet-500 to-purple-600",
    glow: "shadow-violet-500/20",
    ring: "hover:ring-violet-500/30",
  },
  {
    id: "expand",
    label: "Expand",
    icon: Maximize2,
    gradient: "from-blue-500 to-cyan-500",
    glow: "shadow-blue-500/20",
    ring: "hover:ring-blue-500/30",
  },
  {
    id: "crop",
    label: "Crop",
    icon: Crop,
    gradient: "from-amber-500 to-orange-500",
    glow: "shadow-amber-500/20",
    ring: "hover:ring-amber-500/30",
  },
  {
    id: "variations",
    label: "Variations",
    icon: Palette,
    gradient: "from-fuchsia-500 to-pink-500",
    glow: "shadow-fuchsia-500/20",
    ring: "hover:ring-fuchsia-500/30",
  },
  {
    id: "download",
    label: "Download",
    icon: Download,
    gradient: "from-emerald-500 to-green-500",
    glow: "shadow-emerald-500/20",
    ring: "hover:ring-emerald-500/30",
  },
  {
    id: "close",
    label: "Close",
    icon: X,
    gradient: "from-red-500 to-rose-500",
    glow: "shadow-red-500/20",
    ring: "hover:ring-red-500/30",
  },
];

// ─── Overlay spring transition ──────────────────────────────────────────────
const springTransition = {
  type: "spring" as const,
  stiffness: 260,
  damping: 25,
};

// ═══════════════════════════════════════════════════════════════════════════
// ─── Main Component ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

const DynamicImageViewer: React.FC<DynamicImageViewerProps> = ({
  imageSrc,
  promptText,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  // ── Close on Escape key ────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // ── Prevent body scroll while open ─────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // ── Copy prompt handler ────────────────────────────────────────────────
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }, [promptText]);

  // ── Action dispatcher ─────────────────────────────────────────────────
  const handleAction = useCallback(
    (actionId: string) => {
      if (actionId === "close") {
        onClose();
        return;
      }
      // Placeholder for future actions
      console.log(`[Studio] ${actionId} triggered`);
    },
    [onClose]
  );

  return (
    <TooltipProvider delayDuration={150}>
      {/* ════════════════════════════════════════════════════════════════ */}
      {/* ── Fullscreen Overlay (Backdrop) ──────────────────────────── */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[100] flex items-center justify-center"
        onClick={onClose}
      >
        {/* Glass backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-lg" />

        {/* Ambient background orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute -top-32 -left-32 h-64 w-64 rounded-full bg-violet-600/15 blur-[100px]"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-fuchsia-600/10 blur-[120px]"
            animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ repeat: Infinity, duration: 8, ease: "easeInOut", delay: 1 }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-blue-600/8 blur-[140px]"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 10, ease: "easeInOut", delay: 2 }}
          />
        </div>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* ── Content Container ────────────────────────────────────── */}
        {/* ════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={springTransition}
          className="relative z-10 flex flex-col items-center gap-5 w-full max-w-4xl px-4 sm:px-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Floating Action Bar (Right Side / Top on mobile) ──── */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
            className="
              absolute -right-2 top-1/2 -translate-y-1/2 z-20
              hidden lg:flex flex-col gap-2
              rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl
              p-2 shadow-2xl shadow-black/30
            "
          >
            {studioActions.map((action, idx) => (
              <React.Fragment key={action.id}>
                {/* Divider before Close */}
                {idx === studioActions.length - 1 && (
                  <div className="mx-2 h-px bg-white/[0.08]" />
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleAction(action.id)}
                      className={cn(
                        "group relative flex h-11 w-11 items-center justify-center rounded-full",
                        "border border-white/[0.06] bg-white/[0.04] backdrop-blur-md",
                        "text-zinc-400 transition-all duration-200",
                        "hover:border-white/[0.15] hover:bg-white/[0.08] hover:text-white",
                        `hover:shadow-lg ${action.glow}`,
                        `hover:ring-1 ${action.ring}`
                      )}
                    >
                      {/* Hover gradient fill */}
                      <div
                        className={cn(
                          "absolute inset-0 rounded-full bg-gradient-to-br opacity-0 transition-opacity duration-200 group-hover:opacity-15",
                          action.gradient
                        )}
                      />
                      <action.icon className="relative h-[18px] w-[18px]" />
                    </motion.button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="left"
                    className="border-white/[0.08] bg-[#0d1321]/95 text-white text-xs backdrop-blur-md"
                  >
                    {action.label}
                  </TooltipContent>
                </Tooltip>
              </React.Fragment>
            ))}
          </motion.div>

          {/* ── Mobile Action Bar (Top, horizontal) ──────────────── */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.35 }}
            className="
              flex lg:hidden items-center gap-1.5 w-full justify-center
              rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl
              p-2 shadow-2xl shadow-black/30
            "
          >
            {studioActions.map((action, idx) => (
              <React.Fragment key={action.id}>
                {idx === studioActions.length - 1 && (
                  <div className="mx-1 h-6 w-px bg-white/[0.08]" />
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleAction(action.id)}
                      className={cn(
                        "group relative flex h-10 w-10 items-center justify-center rounded-full",
                        "border border-white/[0.06] bg-white/[0.04] backdrop-blur-md",
                        "text-zinc-400 transition-all duration-200",
                        "hover:border-white/[0.15] hover:bg-white/[0.08] hover:text-white",
                        `hover:shadow-lg ${action.glow}`
                      )}
                    >
                      <div
                        className={cn(
                          "absolute inset-0 rounded-full bg-gradient-to-br opacity-0 transition-opacity duration-200 group-hover:opacity-15",
                          action.gradient
                        )}
                      />
                      <action.icon className="relative h-4 w-4" />
                    </motion.button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    className="border-white/[0.08] bg-[#0d1321]/95 text-white text-xs backdrop-blur-md"
                  >
                    {action.label}
                  </TooltipContent>
                </Tooltip>
              </React.Fragment>
            ))}
          </motion.div>

          {/* ════════════════════════════════════════════════════════ */}
          {/* ── Main Image Canvas ─────────────────────────────────── */}
          {/* ════════════════════════════════════════════════════════ */}
          <div className="relative w-full lg:mr-14">
            {/* Outer glow ring */}
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-violet-500/20 via-transparent to-fuchsia-500/20 blur-sm opacity-60" />
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02]" />

            {/* Image container */}
            <div className="relative overflow-hidden rounded-2xl shadow-2xl shadow-black/50">
              {/* The image */}
              <div className="relative aspect-square w-full bg-[#0a0f1a]">
                {imageSrc.startsWith("http") || imageSrc.startsWith("/") ? (
                  <Image
                    src={imageSrc}
                    alt="Generated image"
                    fill
                    className="object-contain"
                    sizes="(max-width: 896px) 100vw, 896px"
                    priority
                  />
                ) : (
                  /* Fallback mock gradient for demo */
                  <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-900/60 via-purple-800/40 to-fuchsia-900/60" />
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBMNDAgMCIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IGZpbGw9InVybCgjZykiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiLz48L3N2Zz4=')] opacity-60" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/[0.05] border border-white/[0.08] backdrop-blur-sm">
                        <Wand2 className="h-9 w-9 text-white/30" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Prompt Overlay (Bottom) ─────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.4 }}
                className="absolute bottom-0 left-0 right-0 bg-white/[0.07] backdrop-blur-md border-t border-white/[0.12] rounded-b-2xl"
              >
                <div className="flex items-start gap-3 p-4 sm:p-5">
                  {/* Prompt text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5 font-medium">
                      Prompt
                    </p>
                    <p className="text-sm leading-relaxed text-white/90 line-clamp-3">
                      {promptText}
                    </p>
                  </div>

                  {/* Copy button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCopy}
                        className={cn(
                          "shrink-0 flex h-9 w-9 items-center justify-center rounded-xl",
                          "border border-white/[0.1] bg-white/[0.06] backdrop-blur-sm",
                          "text-zinc-400 transition-all hover:text-white hover:bg-white/[0.12] hover:border-white/[0.2]",
                          copied && "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                        )}
                      >
                        <AnimatePresence mode="wait">
                          {copied ? (
                            <motion.div
                              key="check"
                              initial={{ scale: 0, rotate: -90 }}
                              animate={{ scale: 1, rotate: 0 }}
                              exit={{ scale: 0 }}
                              transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            >
                              <Check className="h-4 w-4" />
                            </motion.div>
                          ) : (
                            <motion.div
                              key="copy"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                            >
                              <Copy className="h-4 w-4" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="border-white/[0.08] bg-[#0d1321]/95 text-white text-xs backdrop-blur-md"
                    >
                      {copied ? "Copied!" : "Copy Prompt"}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </motion.div>
            </div>
          </div>

          {/* ── Keyboard hint ─────────────────────────────────────── */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-[11px] text-zinc-600"
          >
            Press{" "}
            <kbd className="mx-0.5 rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
              Esc
            </kbd>{" "}
            to close
          </motion.p>
        </motion.div>
      </motion.div>
    </TooltipProvider>
  );
};

export default DynamicImageViewer;
