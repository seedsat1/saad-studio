"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu, ShieldCheck } from "lucide-react";
import { AdminSidebar } from "./AdminSidebar";

interface AdminShellProps {
  activeRoute?: string;
  children: React.ReactNode;
}

export function AdminShell({ activeRoute, children }: AdminShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#050812] text-slate-100">
      {/* Persistent Enterprise Sidebar */}
      <AdminSidebar
        activeRoute={activeRoute}
        isMobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      {/* Full-Width Workspace Container */}
      <div className="flex-1 w-full min-w-0 flex flex-col overflow-x-hidden">
        {/* Mobile Header Bar (lg:hidden) */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
              aria-label="Open Admin Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="flex items-center gap-1.5 text-xs font-black text-white tracking-wider">
              <img src="/icon-512.png" alt="Saad Studio Logo" className="w-5 h-5 rounded object-cover" />
              <span>SAAD STUDIO ADMIN</span>
            </span>
          </div>

          <Link
            href="/admin/control-center"
            className="flex items-center gap-1 text-xs font-bold text-cyan-400"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Control Center</span>
          </Link>
        </div>

        {/* Workspace Page Content */}
        {children}
      </div>
    </div>
  );
}
