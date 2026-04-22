"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import { APP_CATEGORIES, TOTAL_TOOLS, type AppTool, type AppCategory } from "@/lib/apps-data";
import { FloatingParticles } from "@/components/FloatingParticles";
import { AppsSearchBar } from "@/components/AppsSearchBar";
import { AppsFilterTabs } from "@/components/AppsFilterTabs";
import { AppCategorySection } from "@/components/AppCategorySection";
import { AppToolCard } from "@/components/AppToolCard";
import { usePageLayout } from "@/lib/use-page-layout";
import { useCmsData } from "@/lib/use-cms-data";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

interface CmsAppsTool {
  _id?: string;
  id: string;
  title: string;
  description: string;
  href: string;
  badge: string;
  gradient: string;
}

interface CmsAppsCategory {
  _id?: string;
  id: string;
  title: string;
  description: string;
  tools: CmsAppsTool[];
}

interface AppsCmsData {
  hero: { badge: string; title: string; subtitle: string; mediaUrl: string; isVideo: boolean };
  categories: CmsAppsCategory[];
}

const isVideoUrl = (url?: string) => Boolean(url && /\.(mp4|webm|mov|ogg)([?#]|$)/i.test(url));

export default function AppsPage() {
  const { hero } = usePageLayout("apps");
  const { data: cms } = useCmsData<AppsCmsData>("apps");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
    if (tabId === "all") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.history.pushState(null, "", window.location.pathname);
    } else {
      const element = document.getElementById(`section-${tabId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.pushState(null, "", `#${tabId}`);
      }
    }
  }, []);

  const handleToggleExpand = useCallback((categoryId: string) => {
    setExpandedCategories((prev) => ({ ...prev, [categoryId]: !prev[categoryId] }));
  }, []);

  // Merge CMS categories with fallback to hardcoded data
  const liveCategories = useMemo<AppCategory[]>(() => {
    if (!cms?.categories?.length) return APP_CATEGORIES;
    return cms.categories.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      href: `#${c.id}`,
      tools: c.tools.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        href: t.href,
        badge: (t.badge || "") as AppTool["badge"],
        gradient: t.gradient,
      })),
    }));
  }, [cms]);

  const liveTotalTools = useMemo(() => liveCategories.reduce((s, c) => s + c.tools.length, 0), [liveCategories]);
  const heroMediaUrl = hero?.mediaUrl;
  const heroHasVideo = isVideoUrl(heroMediaUrl);

  const searchResults = useMemo<AppTool[]>(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    const results: AppTool[] = [];
    for (const cat of liveCategories) {
      for (const tool of cat.tools) {
        if (
          tool.title.toLowerCase().includes(q) ||
          tool.description.toLowerCase().includes(q)
        ) {
          results.push(tool);
        }
      }
    }
    return results;
  }, [searchQuery, liveCategories]);

  const isSearching = searchQuery.length > 0;

  return (
    <div
      className={`${outfit.variable} ${plusJakarta.variable} min-h-screen relative`}
      style={{ background: "#060c18", fontFamily: "var(--font-body, sans-serif)" }}
      lang="en"
      dir="ltr"
    >
      {/* Floating CSS particles (SAAD signature) */}
      <FloatingParticles />

      {/* Content layer */}
      <div className="relative z-10 max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-10 py-10 pb-24">

        {/* ── PAGE HEADER ── */}
        <motion.div
          className="text-center mb-10 relative overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={heroMediaUrl ? {
            backgroundImage: `linear-gradient(135deg, rgba(6,12,24,0.82), rgba(6,12,24,0.82)), url(${hero.mediaUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            border: "1px solid rgba(148,163,184,0.08)",
            borderRadius: 20,
            padding: "28px 18px",
          } : undefined}
        >
          {heroHasVideo && (
            <video
              src={heroMediaUrl}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(135deg, rgba(6,12,24,0.82), rgba(6,12,24,0.82))",
            }}
          />
          <div className="relative z-10">
          <p
            className="text-[13px] font-medium uppercase tracking-[0.2em] mb-3"
            style={{ color: "#06b6d4" }}
          >
            {hero?.badge || "Welcome to"}
          </p>
          <h1
            className="text-4xl sm:text-5xl lg:text-[3.75rem] font-bold leading-tight"
            style={{ fontFamily: "var(--font-display, inherit)", color: "#e2e8f0" }}
          >
            {hero?.title || "SAAD STUDIO Apps"}{" "}
            <span
              className="inline-block"
              style={{
                background: "linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              ✦
            </span>
          </h1>
          <p
            className="mt-4 text-[16px] leading-relaxed max-w-2xl mx-auto"
            style={{ color: "#64748b" }}
          >
            {hero?.subtitle || "One-click AI tools that transform any content into professional ads, viral trends, or artistic masterpieces"}
          </p>

          {/* Search bar */}
          <div className="mt-8 max-w-xl mx-auto">
            <AppsSearchBar totalCount={liveTotalTools} onSearch={handleSearch} />
          </div>
          </div>
        </motion.div>

        {/* ── FILTER TABS ── */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
        >
          <AppsFilterTabs
            categories={liveCategories}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            totalCount={liveTotalTools}
          />
        </motion.div>

        {/* ── CONTENT ── */}
        <AnimatePresence mode="wait">
          {isSearching ? (
            /* ── SEARCH RESULTS ── */
            <motion.div
              key="search-results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <p className="text-[14px] mb-6" style={{ color: "#475569" }}>
                <span style={{ color: "#94a3b8" }}>{searchResults.length}</span>{" "}
                {searchResults.length === 1 ? "result" : "results"} for{" "}
                <span
                  className="font-semibold"
                  style={{ color: "#22d3ee" }}
                >
                  &ldquo;{searchQuery}&rdquo;
                </span>
              </p>

              {searchResults.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                  {searchResults.map((tool, index) => (
                    <motion.div
                      key={tool.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: index * 0.04, ease: "easeOut" }}
                    >
                      <AppToolCard tool={tool} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <span className="text-4xl">🔍</span>
                  <p className="text-[15px]" style={{ color: "#475569" }}>
                    No tools found for &ldquo;{searchQuery}&rdquo;
                  </p>
                </div>
              )}
            </motion.div>
          ) : (
            /* ── CATEGORIZED VIEW ── */
            <motion.div
              key="categorized"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-16"
            >
              {liveCategories.map((category) => (
                <AppCategorySection
                  key={category.id}
                  category={category}
                  expanded={!!expandedCategories[category.id]}
                  onToggleExpand={handleToggleExpand}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
