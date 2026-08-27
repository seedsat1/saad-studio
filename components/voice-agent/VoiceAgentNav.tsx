"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, History, Plug, Settings, Users } from "lucide-react";

import { cn } from "@/lib/utils";

const tabs = [
  { href: "/admin/voice-agent", label: "المهام", icon: History },
  { href: "/admin/voice-agent/agents", label: "الوكلاء", icon: Bot },
  { href: "/admin/voice-agent/integrations", label: "التكاملات", icon: Plug },
  { href: "/admin/voice-agent/settings", label: "الإعدادات", icon: Settings },
];

export function VoiceAgentNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4" dir="rtl">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-colors",
              active
                ? "bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-400/30"
                : "bg-white/[0.04] text-zinc-400 ring-1 ring-white/10 hover:bg-white/[0.08] hover:text-white",
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Link>
        );
      })}
      <div className="ms-auto hidden items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-200 ring-1 ring-amber-400/20 sm:flex">
        <Users className="h-3.5 w-3.5" />
        Mock providers only
      </div>
    </div>
  );
}
