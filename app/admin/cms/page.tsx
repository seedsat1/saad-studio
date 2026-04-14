"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Paintbrush,
  FileText,
  Megaphone,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Image as ImageIcon,
  Video,
  ExternalLink,
  CheckCircle2,
  Save,
  Eye,
  Pencil,
  Globe,
  LayoutTemplate,
  Zap,
  Radio,
  Layers,
  AlignLeft,
  Link2,
  Clock,
  ChevronRight,
  X,
  Sparkles,
  AlertTriangle,
  Play,
} from "lucide-react";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type AdType = "TOP_BANNER" | "POPUP" | "SIDEBAR";

interface AdCampaign {
  id: string;
  title: string;
  type: AdType;
  mediaUrl: string;
  targetLink: string;
  isActive: boolean;
  expiresAt: string;
  createdAt: string;
}

interface PageSection {
  pageSlug: string;
  pageLabel: string;
  sectionKey: string;
  sectionLabel: string;
  icon: React.ElementType;
}

interface ContentState {
  headline: string;
  subheadline: string;
  bodyText: string;
  mediaUrl: string;
  isVideo: boolean;
  ctaText: string;
  ctaLink: string;
}

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

const MOCK_ADS: AdCampaign[] = [
  {
    id: "ad1",
    title: "Black Friday Sale — 50% Off Pro",
    type: "TOP_BANNER",
    mediaUrl: "",
    targetLink: "/pricing",
    isActive: true,
    expiresAt: "2026-04-30",
    createdAt: "Apr 1, 2026",
  },
  {
    id: "ad2",
    title: "Try Kling 3.0 — Free Video",
    type: "POPUP",
    mediaUrl: "https://picsum.photos/seed/ad2/600/400",
    targetLink: "/video",
    isActive: true,
    expiresAt: "2026-05-15",
    createdAt: "Apr 3, 2026",
  },
  {
    id: "ad3",
    title: "Upgrade to Enterprise",
    type: "SIDEBAR",
    mediaUrl: "https://picsum.photos/seed/ad3/300/600",
    targetLink: "/pricing?plan=enterprise",
    isActive: false,
    expiresAt: "2026-04-20",
    createdAt: "Apr 5, 2026",
  },
];

const PAGE_SECTIONS: PageSection[] = [
  {
    pageSlug: "home",
    pageLabel: "Home Page",
    sectionKey: "hero",
    sectionLabel: "Hero Section",
    icon: Sparkles,
  },
  {
    pageSlug: "home",
    pageLabel: "Home Page",
    sectionKey: "features",
    sectionLabel: "Features Section",
    icon: Layers,
  },
  {
    pageSlug: "home",
    pageLabel: "Home Page",
    sectionKey: "cta",
    sectionLabel: "Call-To-Action Banner",
    icon: Megaphone,
  },
  {
    pageSlug: "pricing",
    pageLabel: "Pricing Page",
    sectionKey: "hero",
    sectionLabel: "Pricing Hero",
    icon: Sparkles,
  },
  {
    pageSlug: "pricing",
    pageLabel: "Pricing Page",
    sectionKey: "faq",
    sectionLabel: "FAQ Section",
    icon: AlignLeft,
  },
  {
    pageSlug: "about",
    pageLabel: "About Page",
    sectionKey: "hero",
    sectionLabel: "About Hero",
    icon: Globe,
  },
  {
    pageSlug: "about",
    pageLabel: "About Page",
    sectionKey: "team",
    sectionLabel: "Team & Mission",
    icon: LayoutTemplate,
  },
];

// Content seeds per section — pre-filled mock content
const CONTENT_SEEDS: Record<string, ContentState> = {
  "home-hero": {
    headline: "The Ultimate AI Creative Studio",
    subheadline: "Generate breathtaking videos, images, audio, and code — all in one platform.",
    bodyText:
      "Powered by the world's most advanced AI models including Kling 3.0, Flux Pro, ElevenLabs, and GPT-4o.",
    mediaUrl: "https://picsum.photos/seed/homehero/1280/720",
    isVideo: false,
    ctaText: "Start Creating Free",
    ctaLink: "/sign-up",
  },
  "home-features": {
    headline: "Everything You Need to Create",
    subheadline: "Six powerful AI tools, one seamless platform.",
    bodyText:
      "From AI Video to 3D generation — Saad Studio covers every creative format with professional-grade quality.",
    mediaUrl: "https://picsum.photos/seed/homefeatures/1280/600",
    isVideo: false,
    ctaText: "Explore Tools",
    ctaLink: "/tools",
  },
  "home-cta": {
    headline: "Ready to Go Pro?",
    subheadline: "Unlock unlimited credits and access every model.",
    bodyText: "Join over 3,000 creators who ship faster with AI.",
    mediaUrl: "https://picsum.photos/seed/homecta/1280/400",
    isVideo: false,
    ctaText: "Upgrade Now",
    ctaLink: "/pricing",
  },
  "pricing-hero": {
    headline: "Simple, Transparent Pricing",
    subheadline: "Choose the plan that fits your workflow.",
    bodyText: "Cancel anytime. No hidden fees. Credits never expire.",
    mediaUrl: "",
    isVideo: false,
    ctaText: "View Plans",
    ctaLink: "#plans",
  },
  "pricing-faq": {
    headline: "Frequently Asked Questions",
    subheadline: "Everything you need to know before subscribing.",
    bodyText: "",
    mediaUrl: "",
    isVideo: false,
    ctaText: "",
    ctaLink: "",
  },
  "about-hero": {
    headline: "Built for Creators, by Creators",
    subheadline: "Our mission is to democratize professional AI creation.",
    bodyText:
      "Saad Studio is an independent studio shipping the most innovative AI tools on the market.",
    mediaUrl: "https://picsum.photos/seed/abouthero/1280/600",
    isVideo: false,
    ctaText: "Our Story",
    ctaLink: "#story",
  },
  "about-team": {
    headline: "Meet the Team",
    subheadline: "A passionate group of designers, engineers and AI researchers.",
    bodyText: "",
    mediaUrl: "https://picsum.photos/seed/aboutteam/1280/500",
    isVideo: false,
    ctaText: "",
    ctaLink: "",
  },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const AD_TYPE_META: Record<AdType, { label: string; color: string; icon: React.ElementType }> = {
  TOP_BANNER: { label: "Top Banner", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: LayoutTemplate },
  POPUP: { label: "Popup", color: "bg-violet-500/20 text-violet-400 border-violet-500/30", icon: Layers },
  SIDEBAR: { label: "Sidebar", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: Radio },
};

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex items-center h-6 w-11 rounded-full transition-all duration-200 border flex-shrink-0 focus:outline-none ${
        value ? "bg-violet-600 border-violet-500" : "bg-slate-700 border-slate-600"
      }`}
      aria-pressed={value}
    >
      <span
        className={`inline-block w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
          value ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 mb-1.5">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-colors placeholder-slate-600 ${
          mono ? "font-mono" : ""
        }`}
      />
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function VisualCMSPage() {
  const [ads, setAds] = useState<AdCampaign[]>(MOCK_ADS);
  const [selectedSection, setSelectedSection] = useState<PageSection>(PAGE_SECTIONS[0]);
  const [contentMap, setContentMap] = useState<Record<string, ContentState>>(CONTENT_SEEDS);
  const [previewMode, setPreviewMode] = useState(false);
  const [published, setPublished] = useState<string | null>(null);
  const [showAdForm, setShowAdForm] = useState(false);

  // New ad form state
  const [newAd, setNewAd] = useState<Omit<AdCampaign, "id" | "createdAt">>({
    title: "",
    type: "TOP_BANNER",
    mediaUrl: "",
    targetLink: "",
    isActive: true,
    expiresAt: "",
  });

  const sectionKey = `${selectedSection.pageSlug}-${selectedSection.sectionKey}`;
  const content: ContentState = contentMap[sectionKey] ?? {
    headline: "",
    subheadline: "",
    bodyText: "",
    mediaUrl: "",
    isVideo: false,
    ctaText: "",
    ctaLink: "",
  };

  const updateContent = (patch: Partial<ContentState>) => {
    setContentMap((prev) => ({ ...prev, [sectionKey]: { ...content, ...patch } }));
    setPublished(null);
  };

  const handlePublish = () => {
    setPublished(sectionKey);
    setTimeout(() => setPublished(null), 3000);
  };

  const handleCreateAd = () => {
    if (!newAd.title.trim()) return;
    const ad: AdCampaign = {
      ...newAd,
      id: `ad${Date.now()}`,
      createdAt: "Apr 7, 2026",
    };
    setAds((prev) => [ad, ...prev]);
    setNewAd({ title: "", type: "TOP_BANNER", mediaUrl: "", targetLink: "", isActive: true, expiresAt: "" });
    setShowAdForm(false);
  };

  const toggleAdActive = (id: string) => {
    setAds((prev) => prev.map((a) => (a.id === id ? { ...a, isActive: !a.isActive } : a)));
  };

  const deleteAd = (id: string) => {
    setAds((prev) => prev.filter((a) => a.id !== id));
  };

  // Group page sections by page
  const groupedPages: Record<string, PageSection[]> = {};
  PAGE_SECTIONS.forEach((s) => {
    if (!groupedPages[s.pageLabel]) groupedPages[s.pageLabel] = [];
    groupedPages[s.pageLabel].push(s);
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* ── TOP HEADER BAR ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-sm px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-900/50">
            <Paintbrush className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-none">Visual CMS</h1>
            <p className="text-[10px] text-slate-500 mt-0.5">Page & Ad Manager</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreviewMode((p) => !p)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${
              previewMode
                ? "bg-blue-600/25 border-blue-500/40 text-blue-300"
                : "bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            {previewMode ? "Exit Preview" : "Live Preview"}
          </button>
          <a
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-300 border border-slate-800 transition-colors bg-slate-900/50"
          >
            ← Admin Home
          </a>
        </div>
      </header>

      <div className="flex gap-0">
        {/* ════════════════════════════════════════════════════════════════
            LEFT COLUMN — Ads Manager + Page Navigator
        ═══════════════════════════════════════════════════════════════ */}
        <aside className="w-72 flex-shrink-0 border-r border-slate-800/80 bg-slate-900/30 min-h-[calc(100vh-65px)] flex flex-col">

          {/* ── ADS MANAGER ────────────────────────────────────────────── */}
          <div className="border-b border-slate-800/80">
            <div className="px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wide">Ad Campaigns</span>
              </div>
              <button
                onClick={() => setShowAdForm((p) => !p)}
                className="flex items-center gap-1 text-[10px] font-bold text-violet-400 hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/25 px-2 py-1 rounded-md transition-colors"
              >
                {showAdForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                {showAdForm ? "Cancel" : "New Ad"}
              </button>
            </div>

            {/* Create New Ad Form */}
            <AnimatePresence>
              {showAdForm && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-3 border-t border-slate-800/60 pt-3">
                    <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Plus className="w-3 h-3" /> Create New Campaign
                    </p>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Campaign Title</label>
                      <input
                        value={newAd.title}
                        onChange={(e) => setNewAd((p) => ({ ...p, title: e.target.value }))}
                        placeholder="e.g. Spring Sale Banner"
                        className="w-full px-2.5 py-2 rounded-md bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition-colors placeholder-slate-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Ad Type</label>
                      <select
                        value={newAd.type}
                        onChange={(e) => setNewAd((p) => ({ ...p, type: e.target.value as AdType }))}
                        className="w-full px-2.5 py-2 rounded-md bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
                      >
                        <option value="TOP_BANNER">Top Banner</option>
                        <option value="POPUP">Popup</option>
                        <option value="SIDEBAR">Sidebar</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Media URL</label>
                      <input
                        value={newAd.mediaUrl}
                        onChange={(e) => setNewAd((p) => ({ ...p, mediaUrl: e.target.value }))}
                        placeholder="https://..."
                        className="w-full px-2.5 py-2 rounded-md bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition-colors placeholder-slate-600 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Target Link</label>
                      <input
                        value={newAd.targetLink}
                        onChange={(e) => setNewAd((p) => ({ ...p, targetLink: e.target.value }))}
                        placeholder="/pricing or https://..."
                        className="w-full px-2.5 py-2 rounded-md bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition-colors placeholder-slate-600 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Expires At</label>
                      <input
                        type="date"
                        value={newAd.expiresAt}
                        onChange={(e) => setNewAd((p) => ({ ...p, expiresAt: e.target.value }))}
                        className="w-full px-2.5 py-2 rounded-md bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-semibold">Active on Launch</span>
                      <Toggle value={newAd.isActive} onChange={() => setNewAd((p) => ({ ...p, isActive: !p.isActive }))} />
                    </div>
                    <button
                      onClick={handleCreateAd}
                      disabled={!newAd.title.trim()}
                      className="w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Zap className="w-3 h-3" /> Launch Campaign
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Active Ads List */}
            <div className="px-4 pb-4 space-y-2 max-h-64 overflow-y-auto">
              {ads.length === 0 && (
                <p className="text-xs text-slate-600 text-center py-4">No campaigns yet.</p>
              )}
              {ads.map((ad) => {
                const meta = AD_TYPE_META[ad.type];
                const Icon = meta.icon;
                return (
                  <div
                    key={ad.id}
                    className={`rounded-lg border p-3 transition-all ${
                      ad.isActive ? "border-slate-700 bg-slate-800/40" : "border-slate-800/40 bg-slate-900/20 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-200 truncate leading-tight">{ad.title}</p>
                        <span className={`inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${meta.color}`}>
                          <Icon className="w-2.5 h-2.5" /> {meta.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Toggle value={ad.isActive} onChange={() => toggleAdActive(ad.id)} />
                        <button
                          onClick={() => deleteAd(ad.id)}
                          className="p-1 rounded-md hover:bg-red-500/20 text-slate-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    {ad.targetLink && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-600 font-mono truncate">
                        <Link2 className="w-2.5 h-2.5 flex-shrink-0" />
                        <span className="truncate">{ad.targetLink}</span>
                      </div>
                    )}
                    {ad.expiresAt && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-700 mt-1">
                        <Clock className="w-2.5 h-2.5" /> Expires {ad.expiresAt}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── PAGE SECTION NAVIGATOR ──────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-3 flex items-center gap-2 border-b border-slate-800/60">
              <FileText className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wide">Page Sections</span>
            </div>
            <div className="py-2">
              {Object.entries(groupedPages).map(([pageLabel, sections]) => (
                <div key={pageLabel}>
                  <p className="px-4 py-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                    {pageLabel}
                  </p>
                  {sections.map((section) => {
                    const Icon = section.icon;
                    const isSelected =
                      selectedSection.pageSlug === section.pageSlug &&
                      selectedSection.sectionKey === section.sectionKey;
                    const secKey = `${section.pageSlug}-${section.sectionKey}`;
                    const hasContent = !!(contentMap[secKey]?.headline || contentMap[secKey]?.mediaUrl);
                    return (
                      <button
                        key={secKey}
                        onClick={() => {
                          setSelectedSection(section);
                          setPreviewMode(false);
                          setPublished(null);
                        }}
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-all group ${
                          isSelected
                            ? "bg-violet-600/15 border-r-2 border-violet-500 text-violet-200"
                            : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border-r-2 border-transparent"
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? "text-violet-400" : "text-slate-600 group-hover:text-slate-400"}`} />
                        <span className="text-xs font-medium truncate flex-1">{section.sectionLabel}</span>
                        {hasContent && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" title="Has content" />
                        )}
                        {isSelected && <ChevronRight className="w-3 h-3 text-violet-500 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ════════════════════════════════════════════════════════════════
            RIGHT COLUMN — Visual Editor
        ═══════════════════════════════════════════════════════════════ */}
        <main className="flex-1 min-w-0 px-6 py-6 space-y-6 overflow-y-auto">

          {/* Section Header */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                <Globe className="w-3 h-3" />
                <span>{selectedSection.pageLabel}</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-violet-400 font-semibold">{selectedSection.sectionLabel}</span>
              </div>
              <h2 className="text-xl font-bold text-white">
                Editing: {selectedSection.sectionLabel}
              </h2>
              <p className="text-slate-500 text-xs mt-1">
                Slug: <span className="font-mono text-slate-400">{selectedSection.pageSlug}</span> / Section:{" "}
                <span className="font-mono text-slate-400">{selectedSection.sectionKey}</span>
              </p>
            </div>
            <button
              onClick={() => setPreviewMode((p) => !p)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all border ${
                previewMode
                  ? "bg-blue-600/25 border-blue-500/40 text-blue-300"
                  : "bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              {previewMode ? "Back to Editor" : "Preview"}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {/* ════ EDITOR MODE ════════════════════════════════════════════ */}
            {!previewMode && (
              <motion.div
                key={`editor-${sectionKey}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
                className="space-y-5"
              >
                {/* Content Form */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-5">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-800/60">
                    <Pencil className="w-4 h-4 text-violet-400" />
                    <h3 className="text-sm font-bold text-white">Text Content</h3>
                  </div>

                  <InputField
                    label="Main Headline"
                    value={content.headline}
                    onChange={(v) => updateContent({ headline: v })}
                    placeholder="Enter the main headline..."
                  />
                  <InputField
                    label="Subheadline / Tagline"
                    value={content.subheadline}
                    onChange={(v) => updateContent({ subheadline: v })}
                    placeholder="Enter subheadline text..."
                  />

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Body / Description Text</label>
                    <textarea
                      value={content.bodyText}
                      onChange={(e) => updateContent({ bodyText: e.target.value })}
                      rows={3}
                      placeholder="Enter supporting body text..."
                      className="w-full px-3 py-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-colors resize-none placeholder-slate-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <InputField
                      label="CTA Button Text"
                      value={content.ctaText}
                      onChange={(v) => updateContent({ ctaText: v })}
                      placeholder="e.g. Get Started"
                    />
                    <InputField
                      label="CTA Button Link"
                      value={content.ctaLink}
                      onChange={(v) => updateContent({ ctaLink: v })}
                      placeholder="/sign-up"
                      mono
                    />
                  </div>
                </div>

                {/* Media Form */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-800/60">
                    <ImageIcon className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-bold text-white">Media Asset</h3>
                  </div>

                  {/* Media Type Toggle */}
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-400 font-semibold">Media Type:</span>
                    <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-800/80 border border-slate-700">
                      <button
                        onClick={() => updateContent({ isVideo: false })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                          !content.isVideo
                            ? "bg-violet-600 text-white shadow-sm"
                            : "text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        <ImageIcon className="w-3 h-3" /> Image
                      </button>
                      <button
                        onClick={() => updateContent({ isVideo: true })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                          content.isVideo
                            ? "bg-violet-600 text-white shadow-sm"
                            : "text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        <Video className="w-3 h-3" /> Video
                      </button>
                    </div>
                  </div>

                  <InputField
                    label={content.isVideo ? "Video URL (mp4 / embed)" : "Image URL"}
                    value={content.mediaUrl}
                    onChange={(v) => updateContent({ mediaUrl: v })}
                    placeholder={content.isVideo ? "https://example.com/video.mp4" : "https://example.com/image.jpg"}
                    mono
                  />

                  {/* Thumbnail preview in editor */}
                  {content.mediaUrl && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900"
                      style={{ maxHeight: 180 }}
                    >
                      {content.isVideo ? (
                        <div className="flex items-center justify-center h-40 bg-slate-800/60">
                          <div className="flex flex-col items-center gap-2 text-slate-500">
                            <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center">
                              <Play className="w-5 h-5 text-slate-400 ml-0.5" />
                            </div>
                            <p className="text-xs">Video preview — publishes as embedded player</p>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={content.mediaUrl}
                          alt="Media preview"
                          className="w-full h-40 object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                          }}
                        />
                      )}
                      <div className="absolute top-2 right-2">
                        {content.isVideo ? (
                          <span className="bg-blue-600/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Video className="w-2.5 h-2.5" /> VIDEO
                          </span>
                        ) : (
                          <span className="bg-emerald-600/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <ImageIcon className="w-2.5 h-2.5" /> IMAGE
                          </span>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Publish Button */}
                <motion.div className="flex items-center gap-4">
                  <motion.button
                    onClick={handlePublish}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative flex items-center gap-2.5 px-8 py-3.5 rounded-2xl text-sm font-bold text-white transition-all overflow-hidden"
                    style={{
                      background: "linear-gradient(135deg, #7c3aed 0%, #9333ea 50%, #7c3aed 100%)",
                      boxShadow: "0 0 32px rgba(124,58,237,0.45), 0 4px 16px rgba(124,58,237,0.30)",
                    }}
                  >
                    <span
                      className="absolute inset-0 opacity-0 hover:opacity-20 transition-opacity"
                      style={{ background: "radial-gradient(circle at center, white, transparent)" }}
                    />
                    <Save className="w-4 h-4" />
                    Publish Changes to {selectedSection.pageLabel}
                    <Sparkles className="w-4 h-4 opacity-70" />
                  </motion.button>

                  <AnimatePresence>
                    {published === sectionKey && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-1.5 text-emerald-400 text-sm font-semibold"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Published successfully!
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            )}

            {/* ════ LIVE PREVIEW MODE ══════════════════════════════════════ */}
            {previewMode && (
              <motion.div
                key={`preview-${sectionKey}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.28 }}
                className="space-y-4"
              >
                {/* Preview Notice */}
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500/10 border border-blue-500/25 text-blue-300 text-xs font-medium">
                  <Eye className="w-3.5 h-3.5 flex-shrink-0" />
                  Live preview — this is how the section will appear to visitors after publishing.
                </div>

                {/* Hero-like Preview Card */}
                <div className="rounded-2xl border border-slate-700 overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950 shadow-2xl">
                  {/* Media zone */}
                  {content.mediaUrl && (
                    <div className="relative overflow-hidden" style={{ maxHeight: 340 }}>
                      {content.isVideo ? (
                        <div
                          className="w-full flex items-center justify-center bg-slate-900"
                          style={{ height: 280 }}
                        >
                          <div className="flex flex-col items-center gap-3 text-slate-500">
                            <motion.div
                              animate={{ scale: [1, 1.06, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-xl shadow-violet-900/50"
                            >
                              <Play className="w-7 h-7 text-white ml-1" />
                            </motion.div>
                            <p className="text-sm text-slate-400">Video Asset — {content.mediaUrl.split("/").pop()}</p>
                          </div>
                        </div>
                      ) : (
                        <motion.img
                          key={content.mediaUrl}
                          initial={{ opacity: 0, scale: 1.04 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.5 }}
                          src={content.mediaUrl}
                          alt="Section media"
                          className="w-full object-cover"
                          style={{ maxHeight: 300 }}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
                    </div>
                  )}

                  {/* Text Content */}
                  <div className="px-8 py-8 space-y-4">
                    {content.headline && (
                      <motion.h2
                        key={content.headline}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="text-3xl font-bold text-white leading-tight"
                      >
                        {content.headline}
                      </motion.h2>
                    )}
                    {content.subheadline && (
                      <motion.p
                        key={content.subheadline}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.06 }}
                        className="text-lg text-slate-300 font-medium leading-relaxed"
                      >
                        {content.subheadline}
                      </motion.p>
                    )}
                    {content.bodyText && (
                      <motion.p
                        key={content.bodyText}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                        className="text-sm text-slate-400 leading-relaxed max-w-2xl"
                      >
                        {content.bodyText}
                      </motion.p>
                    )}
                    {content.ctaText && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.14 }}
                        className="pt-2"
                      >
                        <span
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white cursor-default select-none"
                          style={{
                            background: "linear-gradient(135deg, #7c3aed, #9333ea)",
                            boxShadow: "0 0 24px rgba(124,58,237,0.4)",
                          }}
                        >
                          {content.ctaText}
                          {content.ctaLink && <ExternalLink className="w-3.5 h-3.5 opacity-70" />}
                        </span>
                      </motion.div>
                    )}

                    {!content.headline && !content.subheadline && !content.bodyText && !content.ctaText && !content.mediaUrl && (
                      <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-700">
                        <AlertTriangle className="w-8 h-8" />
                        <p className="text-sm">No content yet — fill in the editor fields to see a preview.</p>
                      </div>
                    )}
                  </div>

                  {/* Preview Footer */}
                  <div className="px-8 py-3 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
                    <span className="text-[10px] text-slate-600 font-mono">
                      /{selectedSection.pageSlug} › {selectedSection.sectionKey}
                    </span>
                    <button
                      onClick={() => setPreviewMode(false)}
                      className="text-xs text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" /> Back to Editor
                    </button>
                  </div>
                </div>

                {/* Publish from preview */}
                <div className="flex items-center gap-4">
                  <motion.button
                    onClick={handlePublish}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2.5 px-8 py-3.5 rounded-2xl text-sm font-bold text-white"
                    style={{
                      background: "linear-gradient(135deg, #7c3aed 0%, #9333ea 50%, #7c3aed 100%)",
                      boxShadow: "0 0 32px rgba(124,58,237,0.45), 0 4px 16px rgba(124,58,237,0.30)",
                    }}
                  >
                    <Save className="w-4 h-4" />
                    Publish Changes
                    <Sparkles className="w-4 h-4 opacity-70" />
                  </motion.button>
                  <AnimatePresence>
                    {published === sectionKey && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-1.5 text-emerald-400 text-sm font-semibold"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Published!
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
