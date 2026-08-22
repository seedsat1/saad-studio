"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

interface MobileTopBarProps {
  title: string;
  subtitle?: string;
  backHref?: string;
}

export default function MobileTopBar({ title, subtitle = "Saad Studio", backHref }: MobileTopBarProps) {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    let active = true;
    const fetchBalance = async () => {
      try {
        const res = await fetch("/api/editor/credits", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const bal = data.credits ?? data.balance;
          if (active && typeof bal === "number") {
            setCredits(bal);
          }
        }
      } catch {
        // ignore
      }
    };
    fetchBalance();

    const handleUpdate = (ev: Event) => {
      const customEv = ev as CustomEvent<{ credits?: number; balance?: number }>;
      const val = customEv.detail?.credits ?? customEv.detail?.balance;
      if (typeof val === "number") setCredits(val);
      else fetchBalance();
    };

    window.addEventListener("saad-credits-updated", handleUpdate);
    const timer = setInterval(fetchBalance, 15000);
    return () => {
      active = false;
      window.removeEventListener("saad-credits-updated", handleUpdate);
      clearInterval(timer);
    };
  }, [isSignedIn]);

  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 px-4 py-3 bg-[#070D1F]/90 backdrop-blur-xl border-b border-[#38C2F0]/15 select-none">
      <button
        onClick={() => {
          if (backHref) router.push(backHref);
          else if (window.history.length > 1) router.back();
          else router.push("/m/video");
        }}
        aria-label="رجوع"
        className="w-9 h-9 flex-none rounded-xl border border-[#38C2F0]/20 bg-[#16244C]/60 text-slate-100 flex items-center justify-center active:scale-95 transition-transform"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>

      <div className="flex-1 min-w-0">
        <h1 className="text-[15px] font-bold text-slate-100 truncate leading-tight">{title}</h1>
        <small className="block text-[11px] text-slate-400 font-normal truncate mt-0.5">{subtitle}</small>
      </div>

      <Link
        href="/pricing"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#C9A227]/10 border border-[#C9A227]/40 text-[#C9A227] text-xs font-bold font-mono active:scale-95 transition-transform"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v10M9.5 9.5h5M9.5 14.5h5" />
        </svg>
        <span>{credits !== null ? credits.toLocaleString() : "..."}</span>
      </Link>
    </header>
  );
}
