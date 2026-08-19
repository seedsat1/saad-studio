"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, ArrowRight, Sparkles } from "lucide-react";
import { ResolvedPromotion, AdBreakpoint } from "@/lib/ads/types";
import { cn } from "@/lib/utils";

const DISMISS_KEY_PREFIX = "saad_promo_dismissed_";

export function PromotionRenderer() {
  const pathname = usePathname();
  const router = useRouter();
  const [promotions, setPromotions] = useState<ResolvedPromotion[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [breakpoint, setBreakpoint] = useState<AdBreakpoint>("desktop");

  // Determine active viewport breakpoint
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 640) setBreakpoint("mobile");
      else if (w < 1024) setBreakpoint("tablet");
      else setBreakpoint("desktop");
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch resolved promotions for current pathname
  useEffect(() => {
    // Don't render subscriber promotions inside admin surfaces or auth callback
    if (pathname.startsWith("/admin") || pathname.startsWith("/api")) {
      setPromotions([]);
      return;
    }

    let isMounted = true;
    const fetchPromos = async () => {
      try {
        const res = await fetch(`/api/ads?page=${encodeURIComponent(pathname)}&breakpoint=${breakpoint}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data.ok && Array.isArray(data.promotions)) {
          setPromotions(data.promotions);
        }
      } catch {
        // Silent failure in subscriber view
      }
    };

    fetchPromos();
    return () => {
      isMounted = false;
    };
  }, [pathname, breakpoint]);

  // Check stored dismissals on client
  const isDismissed = useCallback((id: string, model: string): boolean => {
    if (dismissedIds.has(id)) return true;
    if (typeof window === "undefined") return false;

    if (model === "session") {
      return Boolean(sessionStorage.getItem(`${DISMISS_KEY_PREFIX}${id}`));
    }
    if (model === "local_30d" || model === "permanent") {
      const stored = localStorage.getItem(`${DISMISS_KEY_PREFIX}${id}`);
      if (!stored) return false;
      const ts = parseInt(stored, 10);
      if (model === "local_30d" && Date.now() - ts > 30 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(`${DISMISS_KEY_PREFIX}${id}`);
        return false;
      }
      return true;
    }
    return false;
  }, [dismissedIds]);

  const handleDismiss = useCallback((promo: ResolvedPromotion) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(promo.id);
      return next;
    });

    if (typeof window !== "undefined") {
      if (promo.dismissalModel === "session") {
        sessionStorage.setItem(`${DISMISS_KEY_PREFIX}${promo.id}`, "1");
      } else if (promo.dismissalModel === "local_30d" || promo.dismissalModel === "permanent") {
        localStorage.setItem(`${DISMISS_KEY_PREFIX}${promo.id}`, Date.now().toString());
      }
    }

    // Emit dismissal event
    fetch("/api/ads/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: promo.id, event: "dismissal" }),
    }).catch(() => {});
  }, []);

  // CTA Click handler
  const handleCtaClick = useCallback((promo: ResolvedPromotion, e: React.MouseEvent) => {
    e.stopPropagation();

    // Emit click telemetry
    fetch("/api/ads/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: promo.id, event: "click" }),
    }).catch(() => {});

    if (!promo.ctaUrl) return;

    if (promo.ctaUrl.startsWith("/") && promo.ctaTarget !== "_blank") {
      router.push(promo.ctaUrl);
    } else {
      window.open(promo.ctaUrl, promo.ctaTarget || "_blank", "noopener,noreferrer");
    }
  }, [router]);

  // Record real impressions
  useEffect(() => {
    promotions.forEach((promo) => {
      if (!isDismissed(promo.id, promo.dismissalModel)) {
        fetch("/api/ads/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId: promo.id, event: "impression" }),
        }).catch(() => {});
      }
    });
  }, [promotions, isDismissed]);

  const activePromotions = useMemo(() => {
    return promotions.filter((p) => !isDismissed(p.id, p.dismissalModel));
  }, [promotions, isDismissed]);

  if (activePromotions.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      <AnimatePresence>
        {activePromotions.map((promo) => {
          const { geometry, theme, animation, placementFamily } = promo;
          const isPopup = placementFamily === "POPUP";
          const isTopBanner = placementFamily === "TOP_BANNER";

          // Popup modal with dark backdrop
          if (isPopup) {
            return (
              <div
                key={promo.id}
                className="pointer-events-auto fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 15 }}
                  transition={{ duration: 0.25 }}
                  className="relative w-full max-w-lg overflow-hidden rounded-2xl border shadow-2xl"
                  style={{
                    backgroundColor: theme.backgroundColor || "#0d1424",
                    borderColor: theme.borderColor || "rgba(255,255,255,0.15)",
                    background: theme.gradient || theme.backgroundColor,
                  }}
                >
                  {promo.dismissible && (
                    <button
                      type="button"
                      onClick={() => handleDismiss(promo)}
                      className="absolute right-3.5 top-3.5 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-slate-300 transition-colors hover:bg-white/20 hover:text-white"
                      aria-label="Close promotion"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}

                  {promo.mediaUrl && promo.mediaType === "image" && (
                    <div className="relative aspect-video w-full overflow-hidden bg-black/50">
                      <img src={promo.mediaUrl} alt={promo.headline} className="h-full w-full object-cover" />
                    </div>
                  )}

                  {promo.mediaUrl && promo.mediaType === "video" && (
                    <div className="relative aspect-video w-full overflow-hidden bg-black/50">
                      <video src={promo.mediaUrl} autoPlay loop muted playsInline className="h-full w-full object-cover" />
                    </div>
                  )}

                  <div className="p-6">
                    <h3 className="text-lg font-bold text-white" style={{ color: theme.textColor }}>
                      {promo.headline}
                    </h3>
                    {promo.description && (
                      <p className="mt-2 text-xs leading-relaxed text-slate-300">
                        {promo.description}
                      </p>
                    )}
                    {promo.ctaUrl && (
                      <div className="mt-5 flex justify-end">
                        <button
                          type="button"
                          onClick={(e) => handleCtaClick(promo, e)}
                          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-600/30 transition-all hover:scale-105"
                        >
                          <span>{promo.ctaLabel || "Explore Now"}</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            );
          }

          // Top Header Banner
          if (isTopBanner) {
            return (
              <motion.aside
                key={promo.id}
                initial={{ opacity: 0, y: -40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -40 }}
                transition={{ duration: 0.3 }}
                className="pointer-events-auto fixed left-0 right-0 top-0 z-[70] flex items-center justify-between border-b px-4 py-2 text-xs backdrop-blur-md"
                style={{
                  backgroundColor: theme.backgroundColor || "rgba(13, 20, 36, 0.95)",
                  borderColor: theme.borderColor || "rgba(255, 255, 255, 0.12)",
                  background: theme.gradient || theme.backgroundColor,
                }}
              >
                <div className="flex flex-1 items-center justify-center gap-3 text-center">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/20 text-violet-300">
                    <Sparkles className="h-3 w-3" />
                  </span>
                  <span className="font-semibold text-white" style={{ color: theme.textColor }}>
                    {promo.headline}
                  </span>
                  {promo.ctaUrl && (
                    <button
                      type="button"
                      onClick={(e) => handleCtaClick(promo, e)}
                      className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-bold text-amber-300 transition-colors hover:bg-white/20"
                    >
                      <span>{promo.ctaLabel || "View"}</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {promo.dismissible && (
                  <button
                    type="button"
                    onClick={() => handleDismiss(promo)}
                    className="p-1 text-slate-400 hover:text-white"
                    aria-label="Dismiss banner"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </motion.aside>
            );
          }

          // Free / Floating Interactive Card (Positioned via normalized percentage coordinates)
          const leftPct = geometry.xPct;
          const topPct = geometry.yPct;
          const widthPct = geometry.widthPct;

          return (
            <motion.div
              key={promo.id}
              initial={{
                opacity: 0,
                scale: animation === "scale" ? 0.85 : 1,
                y: animation === "slide" ? 30 : 0,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "pointer-events-auto fixed overflow-hidden rounded-2xl border shadow-2xl transition-shadow hover:shadow-violet-500/10",
                animation === "pulse" && "animate-pulse"
              )}
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: `${widthPct}%`,
                transform: "translate(-50%, -50%)",
                backgroundColor: theme.backgroundColor || "#0d1424",
                borderColor: theme.borderColor || "rgba(255,255,255,0.15)",
                background: theme.gradient || theme.backgroundColor,
                zIndex: geometry.zIndex || 50,
              }}
            >
              {promo.dismissible && (
                <button
                  type="button"
                  onClick={() => handleDismiss(promo)}
                  className="absolute right-2.5 top-2.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-slate-400 hover:bg-white/20 hover:text-white"
                  aria-label="Dismiss promotion"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}

              {promo.mediaUrl && promo.mediaType === "image" && (
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/50">
                  <img src={promo.mediaUrl} alt={promo.headline} className="h-full w-full object-cover" />
                </div>
              )}

              {promo.mediaUrl && promo.mediaType === "video" && (
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/50">
                  <video src={promo.mediaUrl} autoPlay loop muted playsInline className="h-full w-full object-cover" />
                </div>
              )}

              <div className="p-4">
                <h4 className="text-sm font-bold text-white" style={{ color: theme.textColor }}>
                  {promo.headline}
                </h4>
                {promo.description && (
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-300 line-clamp-2">
                    {promo.description}
                  </p>
                )}
                {promo.ctaUrl && (
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={(e) => handleCtaClick(promo, e)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-amber-200"
                    >
                      <span>{promo.ctaLabel || "Learn more"}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
