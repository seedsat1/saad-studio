"use client";

import { useState, useEffect } from "react";
import { X, ChevronRight } from "lucide-react";
import Link from "next/link";

type Config = {
  enabled: boolean;
  text: string;
  link: string;
  linkLabel: string;
  bgColor: string;
  textColor: string;
};

export default function AnnouncementBar() {
  const [config, setConfig] = useState<Config | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("announcement-dismissed");
    if (stored === "1") { setDismissed(true); return; }
    fetch("/api/announcement")
      .then((r) => r.json())
      .then((d) => { if (d.config) setConfig(d.config); })
      .catch(() => {});
  }, []);

  if (!config || dismissed) return null;

  return (
    <div
      className="relative flex items-center justify-center gap-3 px-4 py-2 text-sm font-medium"
      style={{ backgroundColor: config.bgColor, color: config.textColor }}
    >
      <span className="text-center text-[13px]">{config.text}</span>
      {config.link && (
        <Link
          href={config.link}
          className="inline-flex items-center gap-0.5 font-bold underline underline-offset-2 hover:opacity-80 transition-opacity text-[13px]"
          style={{ color: config.textColor }}
        >
          {config.linkLabel || "Learn more"}
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
      <button
        onClick={() => { setDismissed(true); sessionStorage.setItem("announcement-dismissed", "1"); }}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-black/10 transition-colors"
        style={{ color: config.textColor }}
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
