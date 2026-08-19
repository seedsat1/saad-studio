"use client";

import React from "react";
import {
  Sparkles,
  Video,
  Image as ImageIcon,
  Music,
  Compass,
  Zap,
  Sliders,
  FolderHeart,
  Crown,
  Check,
  Search,
  Layers,
  ArrowRight,
  Play,
  Share2,
  Download,
  Flame,
  Palette,
  Maximize2,
  Clock,
  User,
  CreditCard,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface RealPagePreviewAdapterProps {
  route: string;
  className?: string;
}

export function RealPagePreviewAdapter({ route, className }: RealPagePreviewAdapterProps) {
  return (
    <div className={cn("w-full min-h-full bg-[#060c18] text-slate-100 flex flex-col select-none", className)}>
      {/* ── REAL TOP NAVBAR ────────────────────────────────────────────── */}
      <header className="flex h-16 w-full shrink-0 items-center justify-between border-b border-white/10 bg-[#080e1e]/90 px-6 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 shadow-md shadow-violet-600/30">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-extrabold text-white text-base tracking-wider bg-gradient-to-r from-violet-400 via-indigo-300 to-white bg-clip-text text-transparent">
              SAAD STUDIO
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-semibold text-slate-400">
            <span className={cn("px-3 py-1.5 rounded-lg", route === "/dashboard" ? "bg-white/10 text-white" : "hover:text-slate-200")}>
              Dashboard
            </span>
            <span className={cn("px-3 py-1.5 rounded-lg", route === "/video" ? "bg-white/10 text-white" : "hover:text-slate-200")}>
              Video Studio
            </span>
            <span className={cn("px-3 py-1.5 rounded-lg", route === "/image" ? "bg-white/10 text-white" : "hover:text-slate-200")}>
              Image Studio
            </span>
            <span className={cn("px-3 py-1.5 rounded-lg", route === "/apps" ? "bg-white/10 text-white" : "hover:text-slate-200")}>
              Apps Catalog
            </span>
            <span className={cn("px-3 py-1.5 rounded-lg", route === "/gallery" ? "bg-white/10 text-white" : "hover:text-slate-200")}>
              Vault
            </span>
            <span className={cn("px-3 py-1.5 rounded-lg", route === "/pricing" ? "bg-white/10 text-white" : "hover:text-slate-200")}>
              Pricing
            </span>
          </nav>
        </div>

        {/* User Balance Strip */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-600/10 px-3 py-1.5">
            <Zap className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-xs font-bold text-violet-200">1,800 Credits</span>
          </div>
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 border border-white/20 flex items-center justify-center text-xs font-bold text-white shadow-sm">
            S
          </div>
        </div>
      </header>

      {/* ── REAL PAGE BODY PER ROUTE ───────────────────────────────────── */}
      <div className="flex-1 w-full p-6 md:p-8 space-y-8">
        {/* 1. DASHBOARD PREVIEW */}
        {route === "/dashboard" && (
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Level 1: Welcome Strip */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl border border-white/10 bg-gradient-to-r from-violet-950/40 via-slate-900/60 to-indigo-950/40 p-6 shadow-xl backdrop-blur-md">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 border border-emerald-500/30">
                    Pro Subscriber
                  </span>
                  <span className="text-xs text-slate-400">Monthly Renewal in 22 days</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mt-1">
                  Welcome to Saad Studio
                </h1>
                <p className="text-xs text-slate-300 mt-1 max-w-xl">
                  Unified creative AI workspace. Create cinematic videos, photorealistic imagery, audio synthesis, and custom workflows.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-center min-w-[120px]">
                  <span className="text-[10px] uppercase font-mono text-slate-400">Active Vault</span>
                  <p className="text-lg font-extrabold text-white">48 Assets</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-center min-w-[120px]">
                  <span className="text-[10px] uppercase font-mono text-slate-400">In-Flight Jobs</span>
                  <p className="text-lg font-extrabold text-emerald-400">0 Active</p>
                </div>
              </div>
            </div>

            {/* Level 2: Primary Generation Studios Grid */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Primary Creative Studios
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-white/10 bg-[#0c1324] p-5 space-y-3 shadow-lg hover:border-violet-500/40 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
                    <Video className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Video Studio</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Kling 2.6, Veo 3.1 & Wan 2.1</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0c1324] p-5 space-y-3 shadow-lg hover:border-indigo-500/40 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Image Studio</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Flux Pro, Midjourney & SDXL</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0c1324] p-5 space-y-3 shadow-lg hover:border-cyan-500/40 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
                    <Music className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Audio & Music</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Google Lyria & ElevenLabs TTS</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0c1324] p-5 space-y-3 shadow-lg hover:border-amber-500/40 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/30">
                    <Compass className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">App Catalog</h3>
                    <p className="text-xs text-slate-400 mt-0.5">15+ Direct Creative Tools</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Level 3: Recent Vault Generations */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Recent Generations
                </h2>
                <span className="text-xs text-violet-400 font-semibold">View All in Vault →</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="group relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-slate-900 shadow-md">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                    <div className="absolute bottom-3 left-3 right-3 z-20">
                      <span className="text-[10px] font-mono text-amber-300">Veo 3.1 4K</span>
                      <p className="text-xs font-bold text-white truncate">Cinematic mountain sunset drone shot</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. VIDEO STUDIO PREVIEW */}
        {route === "/video" && (
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Model & Parameters */}
            <div className="lg:col-span-2 space-y-6">
              {/* Model Bar */}
              <div className="rounded-2xl border border-white/10 bg-[#0c1324] p-4 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-violet-600/20 text-violet-300 border border-violet-500/30 flex items-center justify-center font-bold">
                    V
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Google Veo 3.1 (Official)</h3>
                    <p className="text-xs text-slate-400">4K Direct High-Fidelity Generation</p>
                  </div>
                </div>
                <span className="rounded-lg bg-white/5 border border-white/10 px-3 py-1 text-xs text-slate-300 font-mono">
                  96 Credits / 8s
                </span>
              </div>

              {/* Prompt Box */}
              <div className="rounded-2xl border border-white/10 bg-[#0c1324] p-5 space-y-3 shadow-lg">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Cinematic Prompt
                </label>
                <div className="h-28 w-full rounded-xl border border-white/15 bg-black/40 p-3 text-xs text-slate-300">
                  Slow motion cinematic shot of a futuristic cyberpunk city in rain, neon reflections, anamorphic lens flare...
                </div>

                {/* Aspect Ratio & Parameters Strip */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-violet-600/20 border border-violet-500/40 px-3 py-1 text-xs font-bold text-violet-200">
                      16:9 Landscape
                    </span>
                    <span className="rounded-lg bg-white/5 border border-white/10 px-3 py-1 text-xs font-semibold text-slate-400">
                      9:16 Portrait
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-white/5 border border-white/10 px-3 py-1 text-xs text-slate-300 font-mono">
                      8 Seconds
                    </span>
                    <span className="rounded-lg bg-white/5 border border-white/10 px-3 py-1 text-xs text-slate-300 font-mono">
                      1080p Full HD
                    </span>
                  </div>
                </div>

                {/* Submit Bar */}
                <div className="pt-3 flex justify-end">
                  <div className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg">
                    Generate Video (96 Credits)
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: History Feed */}
            <div className="rounded-2xl border border-white/10 bg-[#0c1324] p-5 space-y-4 shadow-lg h-fit">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Generation History</span>
                <span className="text-xs font-mono text-slate-500">12 items</span>
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="aspect-video rounded-xl border border-white/10 bg-slate-900 p-2 relative overflow-hidden">
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Play className="h-6 w-6 text-white/80" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. IMAGE STUDIO PREVIEW */}
        {route === "/image" && (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Tool Switcher */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {["Create Image", "Enhance", "Inpaint", "Relighting", "4K Upscale", "Face Swap"].map((t, idx) => (
                <span
                  key={t}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap",
                    idx === 0 ? "bg-violet-600 text-white shadow-md" : "bg-white/5 border border-white/10 text-slate-400"
                  )}
                >
                  {t}
                </span>
              ))}
            </div>

            {/* Prompt & Grid */}
            <div className="rounded-2xl border border-white/10 bg-[#0c1324] p-5 space-y-4 shadow-lg">
              <div className="h-20 w-full rounded-xl border border-white/15 bg-black/40 p-3 text-xs text-slate-300">
                Hyperrealistic 8k studio portrait of an astronaut with glowing helmet reflections, cinematic rim light...
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-slate-400">Flux Pro 1.1 • 4 Credits</span>
                <div className="rounded-xl bg-violet-600 px-5 py-2 text-xs font-bold text-white">
                  Generate 4 Images
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-square rounded-2xl border border-white/10 bg-slate-900 overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. PRICING PREVIEW */}
        {route === "/pricing" && (
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-black text-white">Simple, Transparent Pricing</h1>
              <p className="text-xs text-slate-400">Unlock official video and image generation models.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Starter */}
              <div className="rounded-3xl border border-white/10 bg-[#0c1324] p-6 space-y-4">
                <span className="text-xs font-bold text-slate-400 uppercase">Starter</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">$15</span>
                  <span className="text-xs text-slate-400">/mo</span>
                </div>
                <p className="text-xs text-slate-300">300 generation credits monthly.</p>
              </div>

              {/* Pro */}
              <div className="rounded-3xl border-2 border-violet-500 bg-gradient-to-b from-violet-950/40 to-[#0c1324] p-6 space-y-4 shadow-xl relative">
                <span className="absolute -top-3 right-6 rounded-full bg-violet-600 px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                  Most Popular
                </span>
                <span className="text-xs font-bold text-violet-300 uppercase">Pro Studio</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">$70</span>
                  <span className="text-xs text-slate-400">/mo</span>
                </div>
                <p className="text-xs text-slate-300">1,800 generation credits monthly + 4K Veo access.</p>
              </div>

              {/* Max */}
              <div className="rounded-3xl border border-white/10 bg-[#0c1324] p-6 space-y-4">
                <span className="text-xs font-bold text-slate-400 uppercase">Max Studio</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">$99</span>
                  <span className="text-xs text-slate-400">/mo</span>
                </div>
                <p className="text-xs text-slate-300">2,700 generation credits monthly + VIP queue.</p>
              </div>
            </div>
          </div>
        )}

        {/* 5. APPS PREVIEW */}
        {route === "/apps" && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-black text-white">AI Creative Apps Catalog</h1>
              <div className="h-9 w-64 rounded-xl border border-white/15 bg-black/40 p-2 text-xs text-slate-400 flex items-center gap-2">
                <Search className="h-4 w-4" />
                <span>Search tools and models...</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                "3D Asset Studio",
                "ClipCraft Video Editor",
                "Infinite AI Canvas",
                "Cinema Studio",
                "AI Lip Sync Studio",
                "Prompt Extractor",
              ].map((name) => (
                <div key={name} className="rounded-2xl border border-white/10 bg-[#0c1324] p-5 space-y-3">
                  <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center font-bold text-violet-300">
                    ★
                  </div>
                  <h3 className="font-bold text-white text-sm">{name}</h3>
                  <p className="text-xs text-slate-400">Dedicated creative workspace for professional workflows.</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. VAULT / GALLERY PREVIEW */}
        {route === "/gallery" && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-black text-white">Creative Vault</h1>
              <div className="flex gap-2">
                <span className="rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-bold text-white">All Assets</span>
                <span className="rounded-xl bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-slate-400">Videos</span>
                <span className="rounded-xl bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-slate-400">Images</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="aspect-square rounded-2xl border border-white/10 bg-slate-900 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
