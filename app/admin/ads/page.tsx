"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Megaphone,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Edit2,
  Trash2,
  Eye,
  X,
  AlertTriangle,
  Image as ImageIcon,
  Film,
  Sparkles,
  Layers,
  Save,
  Check,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Info,
  ShieldCheck,
  LayoutTemplate,
  SlidersHorizontal,
  Compass,
  ArrowRight,
  Sliders,
  Target,
  BarChart3,
  MousePointer,
  Users,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { VisualComposer } from "@/components/admin/ads/VisualComposer";
import {
  AdCampaignConfig,
  AdCampaignStatus,
  AdPlacementFamily,
  AdAudienceTarget,
} from "@/lib/ads/types";
import {
  VERIFIED_SUBSCRIBER_ROUTES,
  getRouteName,
} from "@/lib/ads/verified-routes";
import {
  DEFAULT_THEME,
  getDefaultPlacement,
} from "@/lib/ads/ad-campaign-serializer";
import { cn } from "@/lib/utils";

const TYPE_CONFIG: Record<
  string,
  { label: string; description: string; color: string; border: string; bg: string }
> = {
  TOP_BANNER: {
    label: "Top Header Banner",
    description: "Wide announcement bar displayed across the top of subscriber workspace",
    color: "text-amber-300",
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
  },
  POPUP: {
    label: "Modal Dialog Popup",
    description: "Promotional interstitial modal shown upon subscriber login / dashboard entry",
    color: "text-purple-300",
    border: "border-purple-500/30",
    bg: "bg-purple-500/10",
  },
  SIDEBAR: {
    label: "Sidebar Feature Card",
    description: "Square/vertical promo card positioned in dashboard navigation footer",
    color: "text-cyan-300",
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/10",
  },
  CUSTOM: {
    label: "Visual Custom Placement",
    description: "Freely positioned interactive promotional card on subscriber pages",
    color: "text-violet-300",
    border: "border-violet-500/30",
    bg: "bg-violet-500/10",
  },
};

function formatDate(iso?: string | null): string {
  if (!iso) return "Indefinite";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminAdsPage() {
  const [campaigns, setCampaigns] = useState<AdCampaignConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Visual Composer Full-Page state
  const [composerCampaign, setComposerCampaign] = useState<AdCampaignConfig | null>(null);

  // Quick Edit Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<AdCampaignConfig | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formHeadline, setFormHeadline] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState<string>("TOP_BANNER");
  const [formMediaUrl, setFormMediaUrl] = useState("");
  const [formCtaLabel, setFormCtaLabel] = useState("Explore Now");
  const [formCtaUrl, setFormCtaUrl] = useState("");
  const [formAudience, setFormAudience] = useState<AdAudienceTarget>("ALL");
  const [formPriority, setFormPriority] = useState<number>(10);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formExpiresAt, setFormExpiresAt] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete Confirmation Modal
  const [deletingCampaign, setDeletingCampaign] = useState<AdCampaignConfig | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch campaigns from API
  const fetchCampaigns = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await fetch("/api/admin/ads", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load ad campaigns`);
      const data = await res.json();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campaigns");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Open Create in Composer
  const handleCreateInComposer = () => {
    const newConfig: AdCampaignConfig = {
      title: "New Campaign",
      headline: "Special Announcement",
      description: "Discover our latest feature releases and promotional offers.",
      mediaType: "none",
      mediaUrl: null,
      ctaLabel: "Explore Now",
      ctaUrl: "/dashboard",
      ctaTarget: "_self",
      type: "CUSTOM",
      theme: DEFAULT_THEME,
      animation: "fade",
      audience: "ALL",
      priority: 10,
      dismissible: true,
      dismissalModel: "session",
      targetPages: ["/dashboard"],
      placements: { "/dashboard": getDefaultPlacement("CUSTOM") },
      isActive: true,
    };
    setComposerCampaign(newConfig);
  };

  // Open Edit Drawer
  const openEditDrawer = (camp: AdCampaignConfig) => {
    setEditingCampaign(camp);
    setFormTitle(camp.title);
    setFormHeadline(camp.headline || camp.title);
    setFormDescription(camp.description || "");
    setFormType(camp.type);
    setFormMediaUrl(camp.mediaUrl || "");
    setFormCtaLabel(camp.ctaLabel || "Explore Now");
    setFormCtaUrl(camp.ctaUrl || "");
    setFormAudience(camp.audience || "ALL");
    setFormPriority(camp.priority || 10);
    setFormIsActive(camp.isActive);
    setFormExpiresAt(camp.expiresAt ? camp.expiresAt.slice(0, 16) : "");
    setFormStartDate(camp.startDate ? camp.startDate.slice(0, 16) : "");
    setDrawerOpen(true);
  };

  // Quick toggle active
  const handleToggleActive = async (camp: AdCampaignConfig) => {
    if (!camp.id) return;
    try {
      const nextActive = !camp.isActive;
      setCampaigns((prev) =>
        prev.map((c) => (c.id === camp.id ? { ...c, isActive: nextActive } : c))
      );

      const res = await fetch(`/api/admin/ads/${camp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });
      if (!res.ok) throw new Error("Failed to toggle status");
    } catch (err) {
      console.error(err);
      fetchCampaigns(true);
    }
  };

  // Save from Composer
  const handleSaveFromComposer = async (updatedConfig: AdCampaignConfig) => {
    try {
      if (updatedConfig.id) {
        // Update
        const res = await fetch(`/api/admin/ads/${updatedConfig.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedConfig),
        });
        if (!res.ok) throw new Error("Failed to update campaign");
      } else {
        // Create
        const res = await fetch("/api/admin/ads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedConfig),
        });
        if (!res.ok) throw new Error("Failed to create campaign");
      }
      await fetchCampaigns(true);
      setComposerCampaign(null);
    } catch (err) {
      console.error("Failed to save from composer", err);
      throw err;
    }
  };

  // Save from Quick Drawer
  const handleSaveDrawer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Partial<AdCampaignConfig> = {
        title: formTitle.trim(),
        headline: formHeadline.trim() || formTitle.trim(),
        description: formDescription.trim(),
        type: formType,
        mediaUrl: formMediaUrl.trim() || null,
        mediaType: formMediaUrl.endsWith(".mp4") ? "video" : formMediaUrl ? "image" : "none",
        ctaLabel: formCtaLabel.trim(),
        ctaUrl: formCtaUrl.trim() || null,
        audience: formAudience,
        priority: formPriority,
        isActive: formIsActive,
        expiresAt: formExpiresAt ? new Date(formExpiresAt).toISOString() : null,
        startDate: formStartDate ? new Date(formStartDate).toISOString() : null,
      };

      if (editingCampaign?.id) {
        await fetch(`/api/admin/ads/${editingCampaign.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/admin/ads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      setDrawerOpen(false);
      fetchCampaigns(true);
    } catch (err) {
      console.error("Save drawer error", err);
    } finally {
      setSaving(false);
    }
  };

  // Delete Campaign
  const handleDeleteConfirm = async () => {
    if (!deletingCampaign?.id) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/ads/${deletingCampaign.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete campaign");
      setDeletingCampaign(null);
      fetchCampaigns(true);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = campaigns.length;
    const live = campaigns.filter((c) => c.isActive && (c as any).status === "LIVE").length;
    const totalImpr = campaigns.reduce((acc, c) => acc + (c.impressionsCount || 0), 0);
    const totalClicks = campaigns.reduce((acc, c) => acc + (c.clicksCount || 0), 0);
    const ctr = totalImpr > 0 ? ((totalClicks / totalImpr) * 100).toFixed(1) : "0.0";

    return { total, live, totalImpr, totalClicks, ctr };
  }, [campaigns]);

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((camp) => {
      const matchesSearch =
        camp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (camp.headline && camp.headline.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (camp.description && camp.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = typeFilter === "ALL" || camp.type === typeFilter;

      const campStatus = (camp as any).status || (camp.isActive ? "LIVE" : "PAUSED");
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "LIVE" && campStatus === "LIVE") ||
        (statusFilter === "SCHEDULED" && campStatus === "SCHEDULED") ||
        (statusFilter === "PAUSED" && campStatus === "PAUSED") ||
        (statusFilter === "EXPIRED" && campStatus === "EXPIRED");

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [campaigns, searchQuery, typeFilter, statusFilter]);

  // If full-page visual composer is open, render dedicated workspace
  if (composerCampaign) {
    return (
      <VisualComposer
        initialConfig={composerCampaign}
        onSave={handleSaveFromComposer}
        onClose={() => setComposerCampaign(null)}
      />
    );
  }

  return (
    <AdminShell activeRoute="/admin/ads">
      <div className="space-y-6 p-6">
        {/* ── LEVEL 1: COMPACT HEADER WITH SYNC & ACTIONS ────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-white/10 bg-[#0d1424]/90 p-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 text-violet-300 border border-violet-500/30">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">Promotion & Campaign Manager</h2>
                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                  Authoritative
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Visual coordinate composer, audience filtering, responsive placements & real telemetry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchCampaigns(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleCreateInComposer}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-violet-600/30 hover:scale-105 active:scale-95 transition-all"
            >
              <Sparkles className="h-4 w-4" />
              <span>Open Visual Composer</span>
            </button>
          </div>
        </div>

        {/* ── LEVEL 2: INTEGRATED OPERATIONAL STATUS STRIP ────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="rounded-2xl border border-white/10 bg-[#0d1424]/80 p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Total Campaigns</span>
              <Layers className="h-4 w-4 text-violet-400" />
            </div>
            <p className="text-xl font-bold text-white">{stats.total}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d1424]/80 p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Live & Active</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-xl font-bold text-emerald-300">{stats.live}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d1424]/80 p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Real Impressions</span>
              <Eye className="h-4 w-4 text-blue-400" />
            </div>
            <p className="text-xl font-bold text-blue-300">{stats.totalImpr.toLocaleString()}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d1424]/80 p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Real Clicks</span>
              <MousePointer className="h-4 w-4 text-amber-400" />
            </div>
            <p className="text-xl font-bold text-amber-300">{stats.totalClicks.toLocaleString()}</p>
          </div>

          <div className="col-span-2 sm:col-span-1 rounded-2xl border border-white/10 bg-[#0d1424]/80 p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Average CTR</span>
              <BarChart3 className="h-4 w-4 text-pink-400" />
            </div>
            <p className="text-xl font-bold text-pink-300">{stats.ctr}%</p>
          </div>
        </div>

        {/* ── LEVEL 3: DATA-DRIVEN OPERATIONAL INFOGRAPHIC ────────────────── */}
        <div className="rounded-2xl border border-white/10 bg-[#0a1020] p-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-violet-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Ads & Internal Promotions Operational Pipeline
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Deterministic Schema-Driven Runtime
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-7 gap-2 text-center text-[11px]">
            <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
              <span className="block text-[10px] font-mono uppercase text-violet-400">1. Campaign</span>
              <span className="font-bold text-white">Owner Create</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
              <span className="block text-[10px] font-mono uppercase text-cyan-400">2. Content</span>
              <span className="font-bold text-white">Copy & Media</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
              <span className="block text-[10px] font-mono uppercase text-amber-400">3. Target Page</span>
              <span className="font-bold text-white">Verified Route</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
              <span className="block text-[10px] font-mono uppercase text-purple-400">4. Placement</span>
              <span className="font-bold text-white">Visual Drag/Snap</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
              <span className="block text-[10px] font-mono uppercase text-emerald-400">5. Audience</span>
              <span className="font-bold text-white">Plan & Auth Gate</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
              <span className="block text-[10px] font-mono uppercase text-pink-400">6. Resolver</span>
              <span className="font-bold text-white">Single DB Pass</span>
            </div>
            <div className="col-span-2 md:col-span-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5">
              <span className="block text-[10px] font-mono uppercase text-emerald-300">7. Subscriber</span>
              <span className="font-bold text-emerald-200">Safe Renderer</span>
            </div>
          </div>
        </div>

        {/* ── LEVEL 4: PRIMARY CAMPAIGN WORKSPACE & DATA TABLE ────────────── */}
        <div className="rounded-2xl border border-white/10 bg-[#0d1424] p-5 space-y-4 shadow-xl">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search campaigns, headlines..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/40 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-violet-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white outline-none"
              >
                <option value="ALL">All Placement Types</option>
                <option value="TOP_BANNER">Top Header Banner</option>
                <option value="POPUP">Modal Dialog Popup</option>
                <option value="SIDEBAR">Sidebar Promo</option>
                <option value="CUSTOM">Visual Placement</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="LIVE">Live Only</option>
                <option value="SCHEDULED">Scheduled Only</option>
                <option value="PAUSED">Paused Only</option>
                <option value="EXPIRED">Expired Only</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400 space-y-2">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-violet-400" />
              <p>Loading ad campaigns & promotions...</p>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-white/10 rounded-2xl p-8 space-y-3">
              <Megaphone className="h-8 w-8 mx-auto text-slate-500" />
              <h4 className="text-sm font-bold text-white">No ad campaigns found</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Create announcements for new AI models, platform features, discounts, or subscription promotions.
              </p>
              <button
                type="button"
                onClick={handleCreateInComposer}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-violet-500"
              >
                <Plus className="h-4 w-4" />
                <span>Create Campaign in Visual Composer</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="border-b border-white/10 text-[10px] font-mono uppercase text-slate-400">
                  <tr>
                    <th className="py-3 px-3">Campaign & Headline</th>
                    <th className="py-3 px-3">Placement Type</th>
                    <th className="py-3 px-3">Target Pages</th>
                    <th className="py-3 px-3">Audience</th>
                    <th className="py-3 px-3">Schedule</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredCampaigns.map((camp) => {
                    const typeInfo = TYPE_CONFIG[camp.type] || TYPE_CONFIG.CUSTOM;
                    const campStatus = (camp as any).status || (camp.isActive ? "LIVE" : "PAUSED");

                    return (
                      <tr key={camp.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            {camp.mediaUrl ? (
                              <img
                                src={camp.mediaUrl}
                                alt=""
                                className="h-10 w-14 rounded-lg object-cover border border-white/10 bg-black/40"
                              />
                            ) : (
                              <div className="flex h-10 w-14 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-500">
                                <Megaphone className="h-4 w-4" />
                              </div>
                            )}
                            <div>
                              <span className="font-bold text-white block">{camp.title}</span>
                              <span className="text-[11px] text-slate-400 line-clamp-1">
                                {camp.headline || "No headline"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={cn(
                              "inline-block rounded-lg px-2 py-0.5 text-[10px] font-bold border",
                              typeInfo.bg,
                              typeInfo.color,
                              typeInfo.border
                            )}
                          >
                            {typeInfo.label}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {camp.targetPages?.map((p) => (
                              <span
                                key={p}
                                className="rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-300 font-mono"
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="text-[11px] text-slate-300 font-semibold">
                            {camp.audience || "ALL"}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <div className="text-[11px] space-y-0.5">
                            <span className="text-slate-400 block">Exp: {formatDate(camp.expiresAt)}</span>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(camp)}
                            className="flex items-center gap-1.5"
                          >
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase",
                                campStatus === "LIVE" && "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
                                campStatus === "SCHEDULED" && "bg-blue-500/15 text-blue-300 border border-blue-500/30",
                                campStatus === "PAUSED" && "bg-zinc-500/15 text-zinc-400 border border-zinc-500/30",
                                campStatus === "EXPIRED" && "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                              )}
                            >
                              {campStatus}
                            </span>
                          </button>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setComposerCampaign(camp)}
                              className="flex items-center gap-1 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-xs font-bold text-violet-300 hover:bg-violet-500/20"
                              title="Open Visual Composer"
                            >
                              <Compass className="h-3.5 w-3.5" />
                              <span className="hidden lg:inline">Composer</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditDrawer(camp)}
                              className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                              title="Edit Settings"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeletingCampaign(camp)}
                              className="p-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500/20 hover:text-rose-200"
                              title="Delete Campaign"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── LEVEL 5: QUICK EDIT DRAWER ─────────────────────────────────── */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm">
            <aside className="w-full max-w-lg h-full bg-[#0c1324] border-l border-white/10 p-6 overflow-y-auto space-y-5 shadow-2xl flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-violet-400" />
                    <h3 className="text-sm font-bold text-white">
                      {editingCampaign ? "Edit Campaign Settings" : "Quick Campaign Creation"}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveDrawer} className="space-y-4 text-xs">
                  <div>
                    <label className="text-slate-300 font-semibold">Campaign Title</label>
                    <input
                      type="text"
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g. Black Friday 50% Off"
                      className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-white outline-none focus:border-violet-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold">Headline</label>
                    <input
                      type="text"
                      value={formHeadline}
                      onChange={(e) => setFormHeadline(e.target.value)}
                      placeholder="e.g. Save 50% on all annual creative plans"
                      className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-white outline-none focus:border-violet-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold">Description</label>
                    <textarea
                      rows={3}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Detailed campaign copy..."
                      className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-white outline-none focus:border-violet-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-300 font-semibold">Placement Type</label>
                      <select
                        value={formType}
                        onChange={(e) => setFormType(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-white outline-none"
                      >
                        <option value="TOP_BANNER">Top Header Banner</option>
                        <option value="POPUP">Modal Popup</option>
                        <option value="SIDEBAR">Sidebar Promo</option>
                        <option value="CUSTOM">Visual Placement</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold">Audience</label>
                      <select
                        value={formAudience}
                        onChange={(e) => setFormAudience(e.target.value as AdAudienceTarget)}
                        className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-white outline-none"
                      >
                        <option value="ALL">All Users</option>
                        <option value="GUESTS">Guests Only</option>
                        <option value="AUTHENTICATED">Authenticated Only</option>
                        <option value="FREE_TIER">Free Plan Only</option>
                        <option value="PAID_SUBSCRIBERS">Paid Subscribers</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold">Media URL</label>
                    <input
                      type="text"
                      value={formMediaUrl}
                      onChange={(e) => setFormMediaUrl(e.target.value)}
                      placeholder="https://... image or video URL"
                      className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-white outline-none font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-300 font-semibold">CTA Button Label</label>
                      <input
                        type="text"
                        value={formCtaLabel}
                        onChange={(e) => setFormCtaLabel(e.target.value)}
                        placeholder="Explore Now"
                        className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 font-semibold">CTA Target URL</label>
                      <input
                        type="text"
                        value={formCtaUrl}
                        onChange={(e) => setFormCtaUrl(e.target.value)}
                        placeholder="/pricing"
                        className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-white outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-300 font-semibold">Start Date (Optional)</label>
                      <input
                        type="datetime-local"
                        value={formStartDate}
                        onChange={(e) => setFormStartDate(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 font-semibold">Expiry Date (Optional)</label>
                      <input
                        type="datetime-local"
                        value={formExpiresAt}
                        onChange={(e) => setFormExpiresAt(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <label className="text-xs font-semibold text-slate-300">Set Campaign Active</label>
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="h-4 w-4 rounded accent-violet-600"
                    />
                  </div>

                  <div className="pt-4 border-t border-white/10 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setDrawerOpen(false)}
                      className="flex-1 rounded-xl border border-white/10 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 rounded-xl bg-violet-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-violet-500 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save Settings"}
                    </button>
                  </div>
                </form>
              </div>
            </aside>
          </div>
        )}

        {/* ── DELETE CONFIRMATION MODAL ────────────────────────────────────── */}
        {deletingCampaign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d1424] p-6 space-y-4 shadow-2xl">
              <div className="flex items-center gap-3 text-rose-400">
                <AlertTriangle className="h-6 w-6 shrink-0" />
                <h4 className="text-sm font-bold text-white">Delete Campaign?</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to delete <span className="font-bold text-white">"{deletingCampaign.title}"</span>? This action is permanent.
              </p>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingCampaign(null)}
                  className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-rose-500 disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
