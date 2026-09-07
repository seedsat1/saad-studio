"use client";

import React from "react";
import { RailToolButton } from "@/components/RailToolButton";
import { REFERENCE_TOOL_TABS, type ReferenceToolTab } from "@/lib/reference-tool-tabs";

/**
 * A grid of Reference Studio tabs, each rendered as a rail button.
 *
 * Used on its own where there is room to show the tools outright (the video
 * workspace's 220px sidebar), and wrapped by RailToolsFlyout where there is not
 * (the image workspace's 80px rail).
 */
export function ReferenceToolGrid({
  onOpenStudio,
  isAr = true,
  tabs = REFERENCE_TOOL_TABS,
  columns = 4,
}: {
  onOpenStudio: (tab: string) => void;
  isAr?: boolean;
  tabs?: ReferenceToolTab[];
  columns?: 3 | 4;
}) {
  return (
    <div
      className="grid gap-1"
      // written as an inline style rather than grid-cols-N so the column count
      // stays a prop; Tailwind cannot see an interpolated class name.
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {tabs.map((tab) => (
        <RailToolButton
          key={tab.id}
          active={false}
          icon={tab.icon}
          iconClassName={tab.colorClass}
          label={isAr ? tab.nameAr : tab.nameEn}
          onClick={() => onOpenStudio(tab.id)}
        />
      ))}
    </div>
  );
}
