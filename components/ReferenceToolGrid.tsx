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
  /** 1 stacks them one per row; 3 and 4 tile them. */
  columns?: 1 | 3 | 4;
}) {
  // One per row reads as a list, so the buttons take the wider row shape rather
  // than a column of narrow tiles.
  const single = columns === 1;
  return (
    <div
      className={single ? "flex flex-col gap-0.5" : "grid gap-1"}
      // written as an inline style rather than grid-cols-N so the column count
      // stays a prop; Tailwind cannot see an interpolated class name.
      style={single ? undefined : { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {tabs.map((tab) => (
        <RailToolButton
          key={tab.id}
          active={false}
          icon={tab.icon}
          iconClassName={tab.colorClass}
          label={isAr ? tab.nameAr : tab.nameEn}
          variant={single ? "row" : "tile"}
          onClick={() => onOpenStudio(tab.id)}
        />
      ))}
    </div>
  );
}
