"use client";

import React, { useEffect, useRef, useState } from "react";
import { Wrench } from "lucide-react";
import { RailToolButton } from "@/components/RailToolButton";
import { REFERENCE_TOOL_TABS, type ReferenceToolTab } from "@/lib/reference-tool-tabs";

/**
 * One rail button that opens a flyout holding every Reference Studio tab.
 *
 * The rail cannot fit these as their own entries — measured on a 1440x768
 * laptop, the rail has 704px of room, the six workspace modes already take 396px
 * of it, and a labelled single column of 16 tools needs 1051px. A flyout keeps
 * the rail and its modes untouched at full size while still surfacing all of
 * them, which listing them inline cannot do.
 */
export function RailToolsFlyout({
  onOpenStudio,
  isAr = true,
  tabs = REFERENCE_TOOL_TABS,
}: {
  onOpenStudio: (tab: string) => void;
  isAr?: boolean;
  /** Defaults to every tab; pass a subset to scope the flyout to one workspace. */
  tabs?: ReferenceToolTab[];
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <RailToolButton
        active={open}
        icon={Wrench}
        label={isAr ? "الأدوات" : "Tools"}
        badge={tabs.length}
        onClick={() => setOpen((v) => !v)}
      />

      {open && (
        <div
          // w-max: the panel is positioned against a 56px-wide rail button, so
          // without it the grid inherits that width and collapses to one column.
          className="absolute bottom-0 z-50 w-max rounded-2xl border border-white/12 bg-[#12151f] p-3 shadow-[0_18px_50px_rgba(0,0,0,0.6)]"
          style={{ insetInlineStart: "calc(100% + 8px)" }}
          role="menu"
        >
          <div className="mb-2 px-1 text-[9px] font-bold tracking-[0.16em] text-white/35">
            {isAr ? "الأدوات" : "TOOLS"}
          </div>
          <div className="grid grid-cols-4 gap-1">
            {tabs.map((tab) => (
              <RailToolButton
                key={tab.id}
                active={false}
                icon={tab.icon}
                iconClassName={tab.colorClass}
                label={isAr ? tab.nameAr : tab.nameEn}
                onClick={() => {
                  onOpenStudio(tab.id);
                  setOpen(false);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
