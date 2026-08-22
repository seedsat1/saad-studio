"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/m/video",
      label: "فيديو",
      active: pathname === "/m/video" || pathname === "/m",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
          <rect x="3" y="6" width="12" height="12" rx="2" />
          <path d="M15 10l6-3v10l-6-3z" />
        </svg>
      ),
    },
    {
      href: "/m/image",
      label: "صور",
      active: pathname === "/m/image",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="8.5" cy="9.5" r="1.5" />
          <path d="M4 16l5-4.5 5 4.5 3-2.5 3 2.5" />
        </svg>
      ),
    },
    {
      href: "/m/audio",
      label: "صوت",
      active: pathname === "/m/audio",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
          <path d="M4 12h3l2-5 3 12 2.5-8 1.5 3h4" />
        </svg>
      ),
    },
    {
      href: "/m/gallery",
      label: "المكتبة",
      active: pathname === "/m/gallery",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      ),
    },
    {
      href: "/profile",
      label: "حسابي",
      active: pathname === "/profile",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="flex justify-around items-center pt-2.5 mt-2.5 border-t border-[#38C2F0]/15 select-none">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex flex-col items-center gap-1 text-[10.5px] font-semibold transition-colors py-1 px-2 rounded-lg active:scale-95 ${
            item.active ? "text-[#38C2F0]" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {item.icon}
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
