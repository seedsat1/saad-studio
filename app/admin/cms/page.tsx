"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  LayoutTemplate,
  ExternalLink,
  Image as ImageIcon,
  Film,
  Compass,
  AppWindow,
  Tag,
  Camera,
  Mic,
  FileCode,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Eye,
  SlidersHorizontal,
  FolderOpen,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";

interface CmsSurfaceItem {
  id: string;
  name: string;
  category: "Visual Content" | "Tools & Presets" | "Marketing & Sales" | "Page Builder";
  description: string;
  adminRoute: string;
  subscriberDestination: string;
  subscriberLink?: string;
  connectionStatus: "LIVE_CONNECTED" | "DYNAMIC_ROUTE" | "STANDALONE";
  statusNote: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CMS_SURFACES: CmsSurfaceItem[] = [
  {
    id: "studio-img",
    name: "Studio Image Curations",
    category: "Visual Content",
    description: "Curated showcase images, banner art, and sample outputs displayed in the main creation studio.",
    adminRoute: "/admin/cms/studio-img",
    subscriberDestination: "/image-generation & Hero Gallery",
    subscriberLink: "/image-generation",
    connectionStatus: "LIVE_CONNECTED",
    statusNote: "Stores to PlatformConfig key; read by Studio Gallery components",
    icon: ImageIcon,
  },
  {
    id: "explore",
    name: "Showcase Community Gallery",
    category: "Visual Content",
    description: "Featured public generations, staff picks, and community spotlight video/image feed.",
    adminRoute: "/admin/cms/explore",
    subscriberDestination: "/explore",
    subscriberLink: "/explore",
    connectionStatus: "LIVE_CONNECTED",
    statusNote: "Synced directly to Explore feed and filter categories",
    icon: Film,
  },
  {
    id: "discover",
    name: "Discovery Prompts & Inspiration",
    category: "Visual Content",
    description: "Trending prompt library, sample recipes, and category tags for creative inspiration.",
    adminRoute: "/admin/cms/discover",
    subscriberDestination: "/discover",
    subscriberLink: "/discover",
    connectionStatus: "LIVE_CONNECTED",
    statusNote: "Feeds the interactive prompt assistant on the Discover page",
    icon: Compass,
  },
  {
    id: "apps",
    name: "Tools Directory & Catalog",
    category: "Tools & Presets",
    description: "Marketing copy, badges, and arrangement for creative AI apps and video tools.",
    adminRoute: "/admin/cms/apps",
    subscriberDestination: "/apps & Tool Hub",
    subscriberLink: "/apps",
    connectionStatus: "LIVE_CONNECTED",
    statusNote: "CMS metadata overlay on top of registered system features",
    icon: AppWindow,
  },
  {
    id: "cinematic-presets",
    name: "Cinematic Presets & Camera Motions",
    category: "Tools & Presets",
    description: "Preset camera movements (Pan, Tilt, Zoom, Orbit) and lighting styles for video generators.",
    adminRoute: "/admin/cinematic-presets",
    subscriberDestination: "Video Studio Control Panel",
    connectionStatus: "LIVE_CONNECTED",
    statusNote: "Direct JSON configuration loaded into Video Studio camera drawer",
    icon: Camera,
  },
  {
    id: "voice-samples",
    name: "Voice Library & Audio Samples",
    category: "Tools & Presets",
    description: "Pre-recorded speaker samples, accents, and voice preview clips for TTS and dubbing.",
    adminRoute: "/admin/voice-samples",
    subscriberDestination: "Audio & Dubbing Studio",
    connectionStatus: "LIVE_CONNECTED",
    statusNote: "Voice audio assets stored in R2 / audio bucket",
    icon: Mic,
  },
  {
    id: "cms-pricing",
    name: "Marketing Pricing Copy & FAQs",
    category: "Marketing & Sales",
    description: "Public plan marketing titles, feature comparison copy, and FAQ accordions for public visitors.",
    adminRoute: "/admin/cms/pricing",
    subscriberDestination: "Public /pricing Page",
    subscriberLink: "/pricing",
    connectionStatus: "LIVE_CONNECTED",
    statusNote: "Marketing text only; does not alter credit tariffs or backend limits",
    icon: Tag,
  },
  {
    id: "cep",
    name: "CEP Extension Marketing & Docs",
    category: "Marketing & Sales",
    description: "Banner copy, version change notes, and download links for the Adobe Premiere CEP plugin.",
    adminRoute: "/admin/cms/cep",
    subscriberDestination: "Premiere CEP Extension In-App Hub",
    connectionStatus: "LIVE_CONNECTED",
    statusNote: "Consumed by CEP extension sync endpoint",
    icon: Sparkles,
  },
  {
    id: "auth",
    name: "Auth Branding & Welcome Screen",
    category: "Marketing & Sales",
    description: "Sign-in hero artwork, testimonial quotes, and brand value statements on auth pages.",
    adminRoute: "/admin/cms/auth",
    subscriberDestination: "/auth/login & /auth/register",
    subscriberLink: "/auth/login",
    connectionStatus: "LIVE_CONNECTED",
    statusNote: "Rendered on user login and onboarding canvas",
    icon: FolderOpen,
  },
  {
    id: "page-builder",
    name: "Visual Page Builder",
    category: "Page Builder",
    description: "Drag-and-drop block builder for creating custom marketing landing pages and campaigns.",
    adminRoute: "/admin/page-builder",
    subscriberDestination: "Custom Landing Routes (/p/*)",
    connectionStatus: "DYNAMIC_ROUTE",
    statusNote: "Generates block JSON stored in CustomPage model",
    icon: FileCode,
  },
];

export default function AdminCmsHubPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const categories = ["ALL", "Visual Content", "Tools & Presets", "Marketing & Sales", "Page Builder"];

  const filteredSurfaces = CMS_SURFACES.filter(
    (s) => selectedCategory === "ALL" || s.category === selectedCategory
  );

  return (
    <AdminShell activeRoute="/admin/cms">
      <div className="flex-1 w-full min-w-0 p-4 sm:p-6 lg:p-8 space-y-6 bg-slate-950 text-slate-100 min-h-screen">
        {/* Header */}
        <header className="flex flex-col gap-4 border-b border-slate-800/80 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">
              <LayoutTemplate className="h-4 w-4" />
              Content Management & Subscriber Experience
            </div>
            <h1 className="mt-1.5 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Content & CMS Hub
            </h1>
            <p className="mt-1 text-sm text-slate-400 max-w-3xl">
              دليل وتوجيه كافة واجهات المحتوى التسويقي والبصري الموجهة للمشتركين: معارض الأعمال، التلقينات الملهمة، نصوص التسويق، وقوالب الفيديو.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/ads"
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition shadow-sm"
            >
              Ad Campaigns & Banners
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </header>

        {/* Semantic Boundary Notice */}
        <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/20 flex items-start gap-3 text-xs">
          <Sparkles className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="text-cyan-200 block">Strict Separation of Concerns:</strong>
            <p className="text-slate-300 leading-relaxed">
              CMS surfaces manage subscriber-facing marketing texts, galleries, and presets.
              Operational parameters (e.g. customer credit billing in <Link href="/admin/pricing" className="text-cyan-400 underline font-semibold">Pricing Constitution</Link> and upstream costs in <Link href="/admin/provider-costs" className="text-cyan-400 underline font-semibold">Provider Costs</Link>) remain strictly decoupled and immutable from CMS editors.
            </p>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                selectedCategory === cat
                  ? "bg-cyan-500 text-slate-950 shadow-sm"
                  : "border border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              {cat === "ALL" ? "All CMS Surfaces (10)" : cat}
            </button>
          ))}
        </div>

        {/* Matrix of CMS Child Surfaces */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSurfaces.map((surface) => {
            const Icon = surface.icon;

            return (
              <div
                key={surface.id}
                className="rounded-xl border border-slate-800 bg-slate-900/80 hover:border-cyan-500/40 transition shadow-sm flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5 space-y-3">
                  {/* Category & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {surface.category}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/20 bg-emerald-500/10">
                      <CheckCircle2 className="h-3 w-3" /> Live Reader Verified
                    </span>
                  </div>

                  {/* Title & Icon */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white leading-tight">
                        {surface.name}
                      </h3>
                      <span className="text-[10px] font-mono text-cyan-400/80 block mt-0.5">
                        {surface.adminRoute}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {surface.description}
                  </p>

                  {/* Destination Strip */}
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-slate-500 text-[10px]">Subscriber Destination:</span>
                      <strong className="text-slate-200">{surface.subscriberDestination}</strong>
                    </div>
                    <p className="text-[10px] text-slate-500 italic">
                      {surface.statusNote}
                    </p>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="p-4 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between gap-2">
                  {surface.subscriberLink ? (
                    <a
                      href={surface.subscriberLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-white transition"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>View Live Page</span>
                    </a>
                  ) : (
                    <span className="text-[10px] text-slate-600">In-App Component</span>
                  )}

                  <Link
                    href={surface.adminRoute}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-sm"
                  >
                    <span>Open Editor</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </AdminShell>
  );
}
