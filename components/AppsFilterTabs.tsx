"use client";

import { motion } from "framer-motion";
import type { AppCategory } from "@/lib/apps-data";

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface AppsFilterTabsProps {
  categories: AppCategory[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  totalCount: number;
}

export function AppsFilterTabs({
  categories,
  activeTab,
  onTabChange,
  totalCount,
}: AppsFilterTabsProps) {
  const tabs: Tab[] = [
    { id: "all", label: "All", count: totalCount },
    ...categories.map((c) => ({ id: c.id, label: c.title })),
  ];

  return (
    <div
      className="relative flex gap-1.5 overflow-x-auto pb-1"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      <style>{`.hide-tabs-scroll::-webkit-scrollbar { display: none; }`}</style>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="relative flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium transition-colors duration-200 outline-none"
            style={{
              color: isActive ? "#ffffff" : "#94a3b8",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            {/* Active background */}
            {isActive && (
              <motion.div
                layoutId="active-tab-bg"
                className="absolute inset-0 rounded-full"
                style={{
                  background: "#06b6d4",
                  boxShadow:
                    "0 0 16px rgba(6,182,212,0.4), 0 0 6px rgba(6,182,212,0.2)",
                  zIndex: 0,
                }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            {/* Inactive hover background (CSS only) */}
            {!isActive && (
              <div
                className="absolute inset-0 rounded-full opacity-0 hover:opacity-100 transition-opacity duration-150"
                style={{ background: "rgba(255,255,255,0.05)", zIndex: 0 }}
              />
            )}

            {/* Label */}
            <span className="relative z-10 whitespace-nowrap">{tab.label}</span>

            {/* Count superscript (only "All" tab) */}
            {tab.id === "all" && tab.count !== undefined && (
              <sup
                className="relative z-10 text-[10px] font-bold leading-none"
                style={{
                  color: isActive ? "rgba(255,255,255,0.85)" : "rgba(148,163,184,0.7)",
                  verticalAlign: "super",
                }}
              >
                {tab.count}
              </sup>
            )}
          </button>
        );
      })}
    </div>
  );
}
