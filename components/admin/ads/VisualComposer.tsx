"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  ArrowLeft,
  Monitor,
  Tablet,
  Smartphone,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sliders,
  Eye,
  Edit3,
  Save,
  Check,
  Sparkles,
  Layers,
  Magnet,
  Copy,
  RotateCcw,
  X,
  Plus,
  ExternalLink,
  ChevronDown,
  Info,
  Calendar,
  ShieldCheck,
  AlertCircle,
  Play,
} from "lucide-react";
import {
  AdCampaignConfig,
  AdPositionGeometry,
  AdBreakpoint,
  AdPlacementMode,
  AdPlacementFamily,
  AdAnimationPreset,
  AdAudienceTarget,
} from "@/lib/ads/types";
import {
  VERIFIED_SUBSCRIBER_ROUTES,
  getRouteName,
} from "@/lib/ads/verified-routes";
import {
  DEFAULT_THEME,
  getDefaultPlacement,
  sanitizeCtaUrl,
} from "@/lib/ads/ad-campaign-serializer";
import { RealPagePreviewAdapter } from "./preview/RealPagePreviewAdapter";
import { cn } from "@/lib/utils";

export interface VisualComposerProps {
  initialConfig: AdCampaignConfig;
  onSave: (config: AdCampaignConfig) => Promise<void>;
  onClose: () => void;
}

const VIEWPORT_SIZES: Record<AdBreakpoint, { width: number; height: number; label: string }> = {
  desktop: { width: 1440, height: 900, label: "Desktop (1440 × 900)" },
  tablet: { width: 768, height: 1024, label: "Tablet (768 × 1024)" },
  mobile: { width: 390, height: 844, label: "Mobile (390 × 844)" },
};

const ANIMATION_PRESETS: { value: AdAnimationPreset; label: string }[] = [
  { value: "none", label: "None (Static)" },
  { value: "fade", label: "Smooth Fade" },
  { value: "slide", label: "Slide In from Bottom" },
  { value: "scale", label: "Scale In" },
  { value: "float", label: "Gentle Float" },
  { value: "pulse", label: "Soft Glow Pulse" },
];

const AUDIENCE_OPTIONS: { value: AdAudienceTarget; label: string; desc: string }[] = [
  { value: "ALL", label: "All Users (Public)", desc: "Visible to guests and all subscribers" },
  { value: "GUESTS", label: "Unregistered Guests Only", desc: "Show conversion CTA to new visitors" },
  { value: "AUTHENTICATED", label: "Logged-In Users Only", desc: "Show announcements to active members" },
  { value: "FREE_TIER", label: "Free Plan Users", desc: "Target upgrade prompts to free tier" },
  { value: "PAID_SUBSCRIBERS", label: "Paid Subscribers", desc: "Pro, Max, and Starter members" },
  { value: "PRO_MAX_ONLY", label: "Pro & Max Members Only", desc: "Exclusive tier announcements" },
];

export function VisualComposer({ initialConfig, onSave, onClose }: VisualComposerProps) {
  const [config, setConfig] = useState<AdCampaignConfig>(() => ({
    ...initialConfig,
    placements: initialConfig.placements || { ALL: getDefaultPlacement(initialConfig.type) },
  }));

  // Selected target page for visual composing
  const [selectedPage, setSelectedPage] = useState<string>(() => {
    if (initialConfig.targetPages && initialConfig.targetPages.length > 0 && initialConfig.targetPages[0] !== "ALL") {
      return initialConfig.targetPages[0];
    }
    return "/dashboard";
  });

  const [activeBreakpoint, setActiveBreakpoint] = useState<AdBreakpoint>("desktop");
  const [composerMode, setComposerMode] = useState<"edit" | "preview">("edit");
  const [zoomLevel, setZoomLevel] = useState<number>(0.85);
  const [snappingEnabled, setSnappingEnabled] = useState<boolean>(true);
  const [sideDrawerOpen, setSideDrawerOpen] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Undo history stack for coordinates
  const [history, setHistory] = useState<AdPositionGeometry[]>([]);

  // Get active geometry for current page & breakpoint
  const currentGeometry = useMemo((): AdPositionGeometry => {
    const pagePlacement = config.placements[selectedPage] || config.placements["ALL"] || getDefaultPlacement(config.type);
    return (
      pagePlacement[activeBreakpoint] ||
      pagePlacement.desktop || {
        xPct: 50,
        yPct: 50,
        widthPct: 40,
        anchor: "center",
        placementMode: "FLOATING",
      }
    );
  }, [config.placements, selectedPage, activeBreakpoint, config.type]);

  // Update geometry for current page & breakpoint
  const updateGeometry = useCallback(
    (nextGeo: Partial<AdPositionGeometry>) => {
      setHistory((prev) => [...prev.slice(-10), currentGeometry]);
      setConfig((prev) => {
        const pagePlacement = prev.placements[selectedPage] || prev.placements["ALL"] || getDefaultPlacement(prev.type);
        const updatedPagePlacement = {
          ...pagePlacement,
          [activeBreakpoint]: {
            ...currentGeometry,
            ...nextGeo,
          },
        };
        return {
          ...prev,
          placements: {
            ...prev.placements,
            [selectedPage]: updatedPagePlacement,
          },
        };
      });
    },
    [selectedPage, activeBreakpoint, currentGeometry]
  );

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    updateGeometry(last);
  }, [history, updateGeometry]);

  const handleResetPlacement = useCallback(() => {
    const defaultGeo = getDefaultPlacement(config.type)[activeBreakpoint] || getDefaultPlacement(config.type).desktop;
    updateGeometry(defaultGeo);
  }, [config.type, activeBreakpoint, updateGeometry]);

  // Copy placement from another page
  const [copySourcePage, setCopySourcePage] = useState<string>("/dashboard");
  const handleCopyPlacement = useCallback(() => {
    const source = config.placements[copySourcePage] || config.placements["ALL"];
    if (source) {
      setConfig((prev) => ({
        ...prev,
        placements: {
          ...prev.placements,
          [selectedPage]: { ...source },
        },
      }));
    }
  }, [copySourcePage, config.placements, selectedPage]);

  // Dragging state
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; initXPct: number; initYPct: number } | null>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; initWPct: number; initHPx?: number } | null>(null);
  const [snapLineX, setSnapLineX] = useState<number | null>(null);
  const [snapLineY, setSnapLineY] = useState<number | null>(null);

  // Mouse drag handlers
  const handleMouseDownDrag = (e: React.MouseEvent) => {
    if (composerMode !== "edit") return;
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      initXPct: currentGeometry.xPct,
      initYPct: currentGeometry.yPct,
    });
  };

  const handleMouseDownResize = (e: React.MouseEvent, handle: string) => {
    if (composerMode !== "edit") return;
    e.stopPropagation();
    setIsResizing(handle);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      initWPct: currentGeometry.widthPct,
      initHPx: currentGeometry.heightPx || 220,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const canvasW = rect.width;
      const canvasH = rect.height;

      if (isDragging && dragStart) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;

        const deltaXPct = (deltaX / canvasW) * 100;
        const deltaYPct = (deltaY / canvasH) * 100;

        let nextX = Math.max(5, Math.min(95, dragStart.initXPct + deltaXPct));
        let nextY = Math.max(5, Math.min(95, dragStart.initYPct + deltaYPct));

        // Snapping logic
        if (snappingEnabled) {
          // Snap X to center (50%)
          if (Math.abs(nextX - 50) < 2.5) {
            nextX = 50;
            setSnapLineX(50);
          } else {
            setSnapLineX(null);
          }
          // Snap Y to center (50%)
          if (Math.abs(nextY - 50) < 2.5) {
            nextY = 50;
            setSnapLineY(50);
          } else {
            setSnapLineY(null);
          }
        }

        updateGeometry({ xPct: Math.round(nextX * 10) / 10, yPct: Math.round(nextY * 10) / 10 });
      }

      if (isResizing && resizeStart) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaWPct = (deltaX / canvasW) * 100;
        let nextW = Math.max(15, Math.min(96, resizeStart.initWPct + deltaWPct * 2));
        updateGeometry({ widthPct: Math.round(nextW) });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(null);
      setDragStart(null);
      setResizeStart(null);
      setSnapLineX(null);
      setSnapLineY(null);
    };

    if (isDragging || isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, resizeStart, snappingEnabled, updateGeometry]);

  const handleSaveConfig = async (activate = false) => {
    setIsSaving(true);
    try {
      const payload: AdCampaignConfig = {
        ...config,
        isActive: activate ? true : config.isActive,
      };
      await onSave(payload);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error("Save error", err);
    } finally {
      setIsSaving(false);
    }
  };

  const viewportDims = VIEWPORT_SIZES[activeBreakpoint];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#070c18] text-slate-100 select-none overflow-hidden">
      {/* ── TOP WORKSPACE TOOLBAR ────────────────────────────────────────── */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[#0c1324] px-4 shadow-md z-30">
        {/* Left: Exit + Title + Page Selector */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Campaigns</span>
          </button>

          <div className="h-5 w-[1px] bg-white/10" />

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white max-w-[140px] sm:max-w-[200px] truncate">
              {config.title || "Untitled Campaign"}
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider",
                config.isActive ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-zinc-500/15 text-zinc-400 border border-zinc-500/30"
              )}
            >
              {config.isActive ? "Live" : "Draft"}
            </span>
          </div>

          <div className="h-5 w-[1px] bg-white/10 hidden md:block" />

          {/* Target Page Selector */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400">Target Page:</span>
            <select
              value={selectedPage}
              onChange={(e) => setSelectedPage(e.target.value)}
              className="rounded-lg border border-white/15 bg-black/50 px-2.5 py-1 text-xs font-semibold text-amber-300 outline-none hover:border-amber-400/50"
            >
              {VERIFIED_SUBSCRIBER_ROUTES.map((route) => (
                <option key={route.path} value={route.path} className="bg-slate-900 text-white">
                  {route.name} ({route.path})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center: Responsive Breakpoints + Mode Toggle */}
        <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => setActiveBreakpoint("desktop")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all",
              activeBreakpoint === "desktop" ? "bg-violet-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
            )}
            title="Desktop View (1440px)"
          >
            <Monitor className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Desktop</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveBreakpoint("tablet")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all",
              activeBreakpoint === "tablet" ? "bg-violet-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
            )}
            title="Tablet View (768px)"
          >
            <Tablet className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Tablet</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveBreakpoint("mobile")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all",
              activeBreakpoint === "mobile" ? "bg-violet-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
            )}
            title="Mobile View (390px)"
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Mobile</span>
          </button>
        </div>

        {/* Right: Mode + Zoom + Actions */}
        <div className="flex items-center gap-2">
          {/* Snap toggle */}
          <button
            type="button"
            onClick={() => setSnappingEnabled((s) => !s)}
            className={cn(
              "p-1.5 rounded-lg border text-xs font-semibold transition-colors hidden md:flex items-center gap-1",
              snappingEnabled ? "border-amber-400/40 bg-amber-500/10 text-amber-300" : "border-white/10 text-slate-500 hover:text-slate-300"
            )}
            title="Snapping Guides"
          >
            <Magnet className="h-3.5 w-3.5" />
            <span className="text-[10px]">Snap</span>
          </button>

          {/* Edit vs Preview Mode */}
          <div className="flex items-center rounded-lg border border-white/10 bg-black/40 p-0.5">
            <button
              type="button"
              onClick={() => setComposerMode("edit")}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors",
                composerMode === "edit" ? "bg-white/15 text-white" : "text-slate-400 hover:text-white"
              )}
            >
              <Edit3 className="h-3 w-3" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={() => setComposerMode("preview")}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors",
                composerMode === "preview" ? "bg-white/15 text-white" : "text-slate-400 hover:text-white"
              )}
            >
              <Eye className="h-3 w-3" />
              <span>Preview</span>
            </button>
          </div>

          {/* Toggle Properties Drawer */}
          <button
            type="button"
            onClick={() => setSideDrawerOpen((o) => !o)}
            className={cn(
              "flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors",
              sideDrawerOpen ? "border-violet-500/50 bg-violet-500/20 text-violet-200" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
            )}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </button>

          {/* Save Action */}
          <button
            type="button"
            onClick={() => handleSaveConfig(false)}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-violet-600/30 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all"
          >
            {saveSuccess ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Save className="h-3.5 w-3.5" />}
            <span>{isSaving ? "Saving..." : saveSuccess ? "Saved!" : "Save"}</span>
          </button>
        </div>
      </header>

      {/* ── WORKSPACE BODY: SIMULATED CANVAS + DRAWER ────────────────────── */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Main Canvas Scroll Area */}
        <div className="flex-1 overflow-auto bg-[#050811] p-6 flex flex-col items-center justify-start">
          {/* Zoom & Coordinate indicator pill */}
          <div className="sticky top-2 z-20 mb-3 flex items-center gap-3 rounded-full border border-white/10 bg-black/80 px-4 py-1.5 shadow-lg backdrop-blur-md">
            <span className="text-[11px] font-mono font-bold text-amber-300">
              {getRouteName(selectedPage)}
            </span>
            <div className="h-3 w-[1px] bg-white/20" />
            <span className="text-[10px] font-mono text-slate-400">
              {viewportDims.label}
            </span>
            <div className="h-3 w-[1px] bg-white/20" />
            <span className="text-[10px] font-mono text-emerald-300">
              X: {currentGeometry.xPct}% | Y: {currentGeometry.yPct}% | W: {currentGeometry.widthPct}%
            </span>
            <div className="h-3 w-[1px] bg-white/20" />
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.4, z - 0.1))}
                className="p-1 text-slate-400 hover:text-white"
                title="Zoom Out"
              >
                <ZoomOut className="h-3 w-3" />
              </button>
              <span className="text-[10px] font-mono text-slate-300">{Math.round(zoomLevel * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(1.2, z + 0.1))}
                className="p-1 text-slate-400 hover:text-white"
                title="Zoom In"
              >
                <ZoomIn className="h-3 w-3" />
              </button>
            </div>
            {history.length > 0 && (
              <button
                type="button"
                onClick={handleUndo}
                className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white ml-2"
                title="Undo last placement change"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Undo</span>
              </button>
            )}
          </div>

          {/* Viewport Frame with Zoom */}
          <div
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: "top center",
              transition: "transform 0.15s ease-out",
            }}
            className="relative"
          >
            {/* Viewport Container */}
            <div
              ref={canvasRef}
              style={{ width: `${viewportDims.width}px`, minHeight: `${viewportDims.height}px` }}
              className="relative overflow-hidden rounded-2xl border-2 border-white/20 bg-[#060c18] shadow-2xl"
            >
              {/* Snapping Guide Lines */}
              {snapLineX !== null && (
                <div
                  className="pointer-events-none absolute bottom-0 top-0 z-40 border-l border-dashed border-amber-400"
                  style={{ left: `${snapLineX}%` }}
                />
              )}
              {snapLineY !== null && (
                <div
                  className="pointer-events-none absolute left-0 right-0 z-40 border-t border-dashed border-amber-400"
                  style={{ top: `${snapLineY}%` }}
                />
              )}

              {/* ── REAL SUBSCRIBER PAGE PREVIEW (PRESENTATION ONLY + FIREWALL) ── */}
              <div className="pointer-events-none w-full h-full min-h-[900px] overflow-hidden">
                <RealPagePreviewAdapter route={selectedPage} />
              </div>

              {/* ── DRAGGABLE & RESIZABLE PROMOTION OVERLAY ── */}
              <div
                onMouseDown={handleMouseDownDrag}
                className={cn(
                  "absolute overflow-hidden rounded-2xl transition-shadow",
                  composerMode === "edit"
                    ? "cursor-move border-2 border-dashed border-amber-400 ring-4 ring-amber-400/20 shadow-2xl"
                    : "border shadow-xl cursor-default",
                  isDragging && "opacity-90 scale-[1.01]"
                )}
                style={{
                  left: `${currentGeometry.xPct}%`,
                  top: `${currentGeometry.yPct}%`,
                  width: `${currentGeometry.widthPct}%`,
                  transform: "translate(-50%, -50%)",
                  backgroundColor: config.theme.backgroundColor || "#0d1424",
                  borderColor: composerMode === "edit" ? "#f59e0b" : config.theme.borderColor,
                  background: config.theme.gradient || config.theme.backgroundColor,
                  zIndex: 50,
                }}
              >
                {/* 8 Resize Handles in Edit Mode */}
                {composerMode === "edit" && (
                  <>
                    <div
                      onMouseDown={(e) => handleMouseDownResize(e, "e")}
                      className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-amber-400/40 z-30"
                    />
                    <div
                      onMouseDown={(e) => handleMouseDownResize(e, "w")}
                      className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-amber-400/40 z-30"
                    />
                    <div
                      onMouseDown={(e) => handleMouseDownResize(e, "se")}
                      className="absolute right-1 bottom-1 h-3.5 w-3.5 cursor-nwse-resize bg-amber-400 rounded-sm shadow z-30"
                    />
                    {/* Visual Position Tag */}
                    <div className="absolute left-2 top-2 z-20 rounded bg-black/80 px-2 py-0.5 text-[9px] font-mono font-bold text-amber-300">
                      DRAG TO PLACE
                    </div>
                  </>
                )}

                {/* Media Preview */}
                {config.mediaUrl && config.mediaType === "image" && (
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/50">
                    <img src={config.mediaUrl} alt="Ad Preview" className="h-full w-full object-cover" />
                  </div>
                )}
                {config.mediaUrl && config.mediaType === "video" && (
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/50">
                    <video src={config.mediaUrl} autoPlay loop muted playsInline className="h-full w-full object-cover" />
                  </div>
                )}

                {/* Content Box */}
                <div className="p-4">
                  <h4 className="text-sm font-bold text-white" style={{ color: config.theme.textColor }}>
                    {config.headline || config.title || "Announcement Headline"}
                  </h4>
                  {config.description && (
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-300 line-clamp-2">
                      {config.description}
                    </p>
                  )}
                  {config.ctaUrl && (
                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/10">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-300">
                        {config.ctaLabel || "Explore Now"} →
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── SIDE SETTINGS & PROPERTIES DRAWER ────────────────────────────── */}
        {sideDrawerOpen && (
          <aside className="w-80 sm:w-96 shrink-0 border-l border-white/10 bg-[#0b1222] p-5 overflow-y-auto z-20 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-violet-400" />
                <h3 className="text-sm font-bold text-white">Campaign & Placement</h3>
              </div>
              <button
                type="button"
                onClick={() => setSideDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 1. Placement Copying / Reset */}
            <div className="space-y-2 rounded-xl border border-white/10 bg-black/40 p-3">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Copy Placement Across Pages
              </label>
              <div className="flex gap-2">
                <select
                  value={copySourcePage}
                  onChange={(e) => setCopySourcePage(e.target.value)}
                  className="flex-1 rounded-lg border border-white/15 bg-black/60 px-2.5 py-1.5 text-xs text-white outline-none"
                >
                  {VERIFIED_SUBSCRIBER_ROUTES.map((r) => (
                    <option key={r.path} value={r.path}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleCopyPlacement}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/15"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </button>
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleResetPlacement}
                  className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset {activeBreakpoint} Placement</span>
                </button>
              </div>
            </div>

            {/* 2. Content Configuration */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Promotional Content
              </h4>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">Campaign Title</label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) => setConfig((c) => ({ ...c, title: e.target.value }))}
                  placeholder="Internal campaign name"
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-violet-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">Display Headline</label>
                <input
                  type="text"
                  value={config.headline || ""}
                  onChange={(e) => setConfig((c) => ({ ...c, headline: e.target.value }))}
                  placeholder="e.g. Introducing Veo 3.1 4K Studio"
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-violet-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">Description</label>
                <textarea
                  rows={2}
                  value={config.description || ""}
                  onChange={(e) => setConfig((c) => ({ ...c, description: e.target.value }))}
                  placeholder="Short marketing copy explaining the new release..."
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-violet-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">Media URL (Image or Video)</label>
                <input
                  type="text"
                  value={config.mediaUrl || ""}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      mediaUrl: e.target.value || null,
                      mediaType: e.target.value.endsWith(".mp4") ? "video" : e.target.value ? "image" : "none",
                    }))
                  }
                  placeholder="https://... or /media/banner.jpg"
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-violet-500 outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300">CTA Button Text</label>
                  <input
                    type="text"
                    value={config.ctaLabel || ""}
                    onChange={(e) => setConfig((c) => ({ ...c, ctaLabel: e.target.value }))}
                    placeholder="Explore Now"
                    className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-violet-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300">CTA Target URL</label>
                  <input
                    type="text"
                    value={config.ctaUrl || ""}
                    onChange={(e) => setConfig((c) => ({ ...c, ctaUrl: sanitizeCtaUrl(e.target.value) }))}
                    placeholder="/video or https://..."
                    className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-violet-500 outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 3. Animation & Audience */}
            <div className="space-y-3 pt-3 border-t border-white/10">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Audience & Animation
              </h4>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">Audience Targeting</label>
                <select
                  value={config.audience}
                  onChange={(e) => setConfig((c) => ({ ...c, audience: e.target.value as AdAudienceTarget }))}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white outline-none"
                >
                  {AUDIENCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">Entrance Animation</label>
                <select
                  value={config.animation}
                  onChange={(e) => setConfig((c) => ({ ...c, animation: e.target.value as AdAnimationPreset }))}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white outline-none"
                >
                  {ANIMATION_PRESETS.map((p) => (
                    <option key={p.value} value={p.value} className="bg-slate-900 text-white">
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="text-xs font-semibold text-slate-300">Allow Subscriber Dismissal</label>
                <input
                  type="checkbox"
                  checked={config.dismissible}
                  onChange={(e) => setConfig((c) => ({ ...c, dismissible: e.target.checked }))}
                  className="h-4 w-4 rounded accent-violet-600"
                />
              </div>
            </div>

            {/* Save & Publish Buttons */}
            <div className="space-y-2 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => handleSaveConfig(true)}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Sparkles className="h-4 w-4" />
                <span>Save & Publish Live</span>
              </button>
              <button
                type="button"
                onClick={() => handleSaveConfig(false)}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-2 text-xs font-bold text-slate-200 hover:bg-white/10 transition-colors"
              >
                <Save className="h-4 w-4" />
                <span>Save as Draft</span>
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
