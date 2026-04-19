"use client";

import { motion, type Variants } from "framer-motion";
import Link from "next/link";
import {
  LayoutDashboard,
  ImageIcon,
  VideoIcon,
  Music,
  Box,
  GalleryHorizontalEnd,
  Settings,
  LogOut,
  Zap,
  TrendingUp,
  FolderOpen,
  Sparkles,
  ChevronRight,
  Clock,
} from "lucide-react";

// ─── Static Data ─────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: "Dashboard",      href: "/dashboard",    icon: LayoutDashboard,      active: true  },
  { label: "Image Studio",   href: "/image",         icon: ImageIcon,            active: false },
  { label: "Video Studio",   href: "/video",         icon: VideoIcon,            active: false },
  { label: "Audio Studio",   href: "/audio",         icon: Music,                active: false },
  { label: "3D Studio",      href: "/3d",            icon: Box,                  active: false },
  { label: "Creative Vault", href: "/gallery",       icon: GalleryHorizontalEnd, active: false },
];

const STATS = [
  {
    label: "Total Generations",
    value: "142",
    icon: TrendingUp,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    glow: "shadow-violet-500/10",
  },
  {
    label: "Active Credits",
    value: "1,200",
    icon: Zap,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    glow: "shadow-amber-500/10",
  },
  {
    label: "Saved Projects",
    value: "24",
    icon: FolderOpen,
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/20",
    glow: "shadow-sky-500/10",
  },
];

const QUICK_START = [
  {
    title: "Generate Video",
    subtitle: "Sora 2",
    icon: VideoIcon,
    href: "/video",
    gradient: "from-blue-600/20 to-indigo-600/20",
    border: "border-blue-500/30",
    glow: "hover:shadow-blue-500/20",
    iconBg: "bg-blue-500/10 border-blue-500/20",
    iconColor: "text-blue-400",
    badge: "HOT",
  },
  {
    title: "Generate Image",
    subtitle: "Flux Pro",
    icon: ImageIcon,
    href: "/image",
    gradient: "from-violet-600/20 to-purple-600/20",
    border: "border-violet-500/30",
    glow: "hover:shadow-violet-500/20",
    iconBg: "bg-violet-500/10 border-violet-500/20",
    iconColor: "text-violet-400",
    badge: "TOP",
  },
  {
    title: "Create Music",
    subtitle: "Suno v4",
    icon: Music,
    href: "/audio",
    gradient: "from-emerald-600/20 to-teal-600/20",
    border: "border-emerald-500/30",
    glow: "hover:shadow-emerald-500/20",
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    iconColor: "text-emerald-400",
    badge: "NEW",
  },
  {
    title: "3D Generation",
    subtitle: "Tripo3D",
    icon: Box,
    href: "/3d",
    gradient: "from-orange-600/20 to-amber-600/20",
    border: "border-orange-500/30",
    glow: "hover:shadow-orange-500/20",
    iconBg: "bg-orange-500/10 border-orange-500/20",
    iconColor: "text-orange-400",
    badge: "PRO",
  },
  {
    title: "Next Scene",
    subtitle: "Runway Gen-3",
    icon: Sparkles,
    href: "/cinema-studio",
    gradient: "from-rose-600/20 to-pink-600/20",
    border: "border-rose-500/30",
    glow: "hover:shadow-rose-500/20",
    iconBg: "bg-rose-500/10 border-rose-500/20",
    iconColor: "text-rose-400",
    badge: "PRO",
  },
  {
    title: "Creative Vault",
    subtitle: "Your Gallery",
    icon: GalleryHorizontalEnd,
    href: "/gallery",
    gradient: "from-sky-600/20 to-cyan-600/20",
    border: "border-sky-500/30",
    glow: "hover:shadow-sky-500/20",
    iconBg: "bg-sky-500/10 border-sky-500/20",
    iconColor: "text-sky-400",
    badge: "",
  },
];

const RECENT_ACTIVITY = [
  { id: 1, label: "Neon cityscape at dusk",      type: "Image", time: "2 hrs ago",  gradient: "from-blue-900 via-indigo-800 to-violet-900",   tall: true  },
  { id: 2, label: "Electronic ambient track",     type: "Audio", time: "5 hrs ago",  gradient: "from-emerald-900 via-teal-800 to-cyan-900",    tall: false },
  { id: 3, label: "Product explainer video",      type: "Video", time: "1 day ago",  gradient: "from-rose-900 via-pink-800 to-fuchsia-900",    tall: false },
  { id: 4, label: "Warrior character model",      type: "3D",    time: "1 day ago",  gradient: "from-orange-900 via-amber-800 to-yellow-900",  tall: false },
  { id: 5, label: "Cinematic portrait series",    type: "Image", time: "2 days ago", gradient: "from-slate-800 via-gray-700 to-zinc-800",      tall: false },
  { id: 6, label: "Intro animation loop",         type: "Video", time: "3 days ago", gradient: "from-purple-900 via-violet-800 to-indigo-900", tall: false },
];

const BADGE_COLORS: Record<string, string> = {
  HOT: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  TOP: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  NEW: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  PRO: "bg-violet-500/20 text-violet-300 border-violet-500/30",
};

const TYPE_COLORS: Record<string, string> = {
  Image: "text-violet-400",
  Video: "text-blue-400",
  Audio: "text-emerald-400",
  "3D":  "text-orange-400",
};

// ─── Animation Variants ───────────────────────────────────────────────────────

const stagger: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const slideUp: Variants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-slate-950 text-slate-50">

      {/* ════════════════════════════════════════════════
          SIDEBAR
      ════════════════════════════════════════════════ */}
      <aside className="w-64 flex-shrink-0 flex flex-col bg-slate-900/80 border-r border-slate-800 backdrop-blur-xl">

        {/* Logo */}
        <div className="px-6 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">Saad Studio</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                link.active
                  ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent"
              }`}
            >
              <link.icon
                className={`w-4 h-4 flex-shrink-0 transition-colors ${
                  link.active ? "text-violet-400" : "text-slate-500 group-hover:text-slate-300"
                }`}
              />
              {link.label}
              {link.active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400 shadow-sm shadow-violet-400/60" />
              )}
            </Link>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="px-3 pt-3 pb-4 space-y-2 border-t border-slate-800">

          {/* Credit Balance */}
          <div className="px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-0.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-medium text-slate-400">Credit Balance</span>
            </div>
            <p className="text-xl font-bold text-amber-300">
              1,200{" "}
              <span className="text-xs font-normal text-slate-500">credits</span>
            </p>
          </div>

          {/* Settings */}
          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-all border border-transparent"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            Settings
          </Link>

          {/* Profile Card */}
          <div className="px-3 py-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0 shadow-md shadow-violet-500/20">
                S
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-100 truncate">Saad</p>
                <p className="text-xs text-slate-500 truncate">Pro Member</p>
              </div>
            </div>
            <button className="mt-2.5 w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-slate-700/50 hover:bg-red-500/15 hover:text-red-400 text-slate-400 text-xs font-medium transition-all duration-200 border border-transparent hover:border-red-500/30">
              <LogOut className="w-3 h-3" />
              Logout
            </button>
          </div>

        </div>
      </aside>

      {/* ════════════════════════════════════════════════
          MAIN CONTENT
      ════════════════════════════════════════════════ */}
      <main className="flex-1 overflow-y-auto">

        {/* Ambient background */}
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute top-0 left-1/3 h-[450px] w-[450px] rounded-full bg-violet-900/10 blur-[130px]" />
          <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-indigo-900/10 blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-10 space-y-12">

          {/* ── Page Header ───────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <p className="text-xs font-semibold tracking-widest text-violet-400 uppercase mb-2">
              Creative Workspace
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              Welcome back,{" "}
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                Saad!
              </span>
            </h1>
            <p className="text-slate-400 mt-1.5">
              Here is an overview of your creative workspace.
            </p>
          </motion.div>

          {/* ── Section 1: Stats Overview ─────────────────── */}
          <section>
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
              variants={stagger}
              initial="hidden"
              animate="visible"
            >
              {STATS.map((stat) => (
                <motion.div
                  key={stat.label}
                  variants={slideUp}
                  className={`${stat.bg} border ${stat.border} rounded-2xl p-6 backdrop-blur-sm shadow-lg ${stat.glow}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-slate-400">{stat.label}</span>
                    <div className={`p-2 rounded-xl ${stat.bg} border ${stat.border}`}>
                      <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    </div>
                  </div>
                  <p className={`text-4xl font-bold ${stat.color}`}>{stat.value}</p>
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* ── Section 2: Quick Start ────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-100">Quick Start</h2>
              <span className="text-xs text-slate-500 bg-slate-800/60 px-2.5 py-1 rounded-full border border-slate-700/50">
                6 tools available
              </span>
            </div>
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              variants={stagger}
              initial="hidden"
              animate="visible"
            >
              {QUICK_START.map((card) => (
                <motion.div key={card.title} variants={slideUp}>
                  <Link href={card.href}>
                    <div
                      className={`group relative bg-gradient-to-br ${card.gradient} border ${card.border} rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl ${card.glow}`}
                    >
                      {/* Icon + Badge row */}
                      <div className="flex items-start justify-between mb-5">
                        <div className={`p-3 rounded-xl border ${card.iconBg}`}>
                          <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                        </div>
                        {card.badge && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${BADGE_COLORS[card.badge]}`}>
                            {card.badge}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-semibold text-slate-100 group-hover:text-white transition-colors">
                        {card.title}
                      </h3>
                      <p className="text-sm text-slate-500 mt-0.5">{card.subtitle}</p>

                      <div className="mt-4 flex items-center gap-1 text-xs text-slate-500 group-hover:text-slate-300 transition-colors">
                        Start creating
                        <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* ── Section 3: Recent Activity ────────────────── */}
          <section className="pb-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-100">Recent Activity</h2>
              <Link
                href="/gallery"
                className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <motion.div
              className="grid grid-cols-2 md:grid-cols-3 gap-3"
              variants={stagger}
              initial="hidden"
              animate="visible"
            >
              {RECENT_ACTIVITY.map((item) => (
                <motion.div
                  key={item.id}
                  variants={slideUp}
                  className={`group relative rounded-2xl overflow-hidden border border-slate-800 cursor-pointer hover:border-slate-600 transition-all duration-300 hover:shadow-lg ${
                    item.tall ? "md:row-span-2" : ""
                  }`}
                >
                  {/* Gradient thumbnail placeholder */}
                  <div
                    className={`bg-gradient-to-br ${item.gradient} w-full ${
                      item.tall ? "h-56 md:h-full min-h-[220px]" : "h-36"
                    }`}
                  />

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/30 transition-all duration-300" />

                  {/* Info strip */}
                  <div className="absolute bottom-0 left-0 right-0 px-3 py-2.5 bg-gradient-to-t from-slate-950/95 to-transparent">
                    <p className="text-xs font-medium text-slate-200 truncate">{item.label}</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className={`text-xs font-semibold ${TYPE_COLORS[item.type] ?? "text-slate-400"}`}>
                        {item.type}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="w-2.5 h-2.5" />
                        {item.time}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </section>

        </div>
      </main>

    </div>
  );
}
