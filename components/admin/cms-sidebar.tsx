"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Image as ImageIcon,
  Video,
  Music,
  LayoutTemplate,
  Film,
  Camera,
  Layers,
  DollarSign,
  Compass,
  ChevronRight,
  Paintbrush,
  PanelBottom
} from "lucide-react";
import { cn } from "@/lib/utils";

const CMS_PAGES = [
  { id: "home", label: "Home Page", icon: Home },
  { id: "explore", label: "Explore Page", icon: Compass },
  { id: "image", label: "Image Studio", icon: ImageIcon },
  { id: "video", label: "Video Studio", icon: Video },
  { id: "audio", label: "Audio & Music", icon: Music },
  { id: "apps", label: "AI Apps / Tools", icon: LayoutTemplate },
  { id: "cinema-studio", label: "Cinema Studio", icon: Film },
  { id: "shots", label: "Shots Manager", icon: Camera },
  { id: "variations", label: "Variations", icon: Layers },
  { id: "pricing", label: "Pricing Page", icon: DollarSign },
  { id: "discover", label: "Global Footer", icon: PanelBottom },
];

export function CmsSidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 border-r border-slate-800 bg-[#050911] flex flex-col h-screen sticky top-0 overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
            <Paintbrush className="w-4 h-4 text-violet-400" />
          </div>
          <span className="text-sm font-bold text-white tracking-tight uppercase">CMS Builder</span>
        </div>

        <nav className="space-y-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 ml-2">Pages</p>
          {CMS_PAGES.map((page) => {
            const isActive = pathname === `/admin/cms/${page.id}`;
            const Icon = page.icon;

            return (
              <Link
                key={page.id}
                href={`/admin/cms/${page.id}`}
                className={cn(
                  "flex items-center justify-between group px-3 py-2.5 rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-violet-600/10 border border-violet-500/20 text-violet-400"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("w-4 h-4", isActive ? "text-violet-400" : "text-slate-500 group-hover:text-slate-300")} />
                  <span className="text-sm font-medium">{page.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-slate-800/50">
        <Link
          href="/admin"
          className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ChevronRight className="w-3 h-3 rotate-180" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
