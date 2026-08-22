"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

interface MobileDesktopGuardProps {
  desktopFallbackHref: string;
  toolName: string;
}

export default function MobileDesktopGuard({ desktopFallbackHref, toolName }: MobileDesktopGuardProps) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkViewport = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  if (!isDesktop) return null;

  return (
    <div className="hidden lg:flex fixed inset-0 z-50 bg-[#05080F]/95 backdrop-blur-2xl items-center justify-center p-6 text-center text-slate-100 select-none">
      <div className="max-w-md w-full p-8 rounded-3xl bg-[#0F1B3D] border border-[#38C2F0]/30 shadow-2xl shadow-cyan-950/50 flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#38C2F0]/20 to-[#8A65F7]/20 border border-[#38C2F0]/30 flex items-center justify-center text-[#38C2F0] mb-5">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="5" y="2" width="14" height="20" rx="2" />
            <path d="M12 18h.01" />
          </svg>
        </div>
        <h2 className="text-xl font-bold mb-2">استوديو الهاتف والتابلت</h2>
        <p className="text-sm text-slate-400 leading-relaxed mb-6">
          هذه الصفحة مخصصة وحصرية للأجهزة المحمولة والهواتف المحمولة والتابلت. للعمل على شاشة الكمبيوتر، يرجى فتح واجهة الديسكتوب الرسمية.
        </p>
        <div className="flex flex-col gap-3 w-full">
          <Link
            href={desktopFallbackHref}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#38C2F0] to-[#8A65F7] text-[#04101F] font-black text-sm hover:opacity-90 transition-opacity"
          >
            فتح واجهة الكمبيوتر ({toolName})
          </Link>
          <Link
            href="/explore"
            className="w-full py-3 px-4 rounded-xl bg-white/[0.05] border border-white/10 text-slate-300 font-semibold text-xs hover:bg-white/10 transition-colors"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
