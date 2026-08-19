"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  CreditCard,
  Database,
  DollarSign,
  HardDrive,
  History,
  LayoutDashboard,
  Layers,
  Route,
  Server,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
  TrendingUp,
  Receipt,
  Cpu,
  LayoutTemplate,
  Image as ImageIcon,
  Film,
  Compass,
  AppWindow,
  Tag,
  Camera,
  Mic,
  FileCode,
  Megaphone,
  FlaskConical,
  TerminalSquare,
  Bug,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Lock,
} from "lucide-react";

interface AdminSidebarProps {
  activeRoute?: string;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  matchPrefix?: boolean;
};

export type NavGroup = {
  id: string;
  title: string;
  items: NavItem[];
};

export const ADMIN_NAV_CONFIG: NavGroup[] = [
  {
    id: "overview",
    title: "OVERVIEW",
    items: [
      {
        label: "Control Center",
        href: "/admin/control-center",
        icon: ShieldCheck,
      },
    ],
  },
  {
    id: "operations",
    title: "OPERATIONS",
    items: [
      {
        label: "Generation Monitor",
        href: "/admin/history",
        icon: Sparkles,
      },
      {
        label: "Job Queues & Workers",
        href: "/admin/jobs",
        icon: Workflow,
      },
      {
        label: "Platform Performance",
        href: "/admin/analytics",
        icon: BarChart3,
      },
    ],
  },
  {
    id: "finance",
    title: "USERS & FINANCE",
    items: [
      {
        label: "Users & Accounts",
        href: "/admin/users",
        icon: Users,
      },
      {
        label: "Subscriber Economics",
        href: "/admin/subscriber-analytics",
        icon: TrendingUp,
      },
      {
        label: "Transactions & Billing",
        href: "/admin/transactions",
        icon: CreditCard,
      },
      {
        label: "Pricing Constitution",
        href: "/admin/pricing",
        icon: DollarSign,
      },
      {
        label: "Provider Costs",
        href: "/admin/provider-costs",
        icon: Cpu,
      },
    ],
  },
  {
    id: "ai_engine",
    title: "AI ENGINE",
    items: [
      {
        label: "Checkpoint Routing",
        href: "/admin/routing",
        icon: Route,
      },
      {
        label: "AI Models Registry",
        href: "/admin/models",
        icon: Layers,
      },
      {
        label: "Features Registry",
        href: "/admin/features",
        icon: Boxes,
      },
      {
        label: "Provider Fleet",
        href: "/admin/providers",
        icon: Server,
      },
      {
        label: "Storage Matrix",
        href: "/admin/storage",
        icon: HardDrive,
      },
      {
        label: "Knowledge Hub",
        href: "/admin/knowledge",
        icon: Database,
      },
    ],
  },
  {
    id: "content_cms",
    title: "CONTENT & CMS",
    items: [
      {
        label: "Content & CMS Hub",
        href: "/admin/cms",
        icon: LayoutTemplate,
      },
      {
        label: "Studio Image Curations",
        href: "/admin/cms/studio-img",
        icon: ImageIcon,
      },
      {
        label: "Showcase Gallery",
        href: "/admin/cms/explore",
        icon: Film,
      },
      {
        label: "Discovery Prompts",
        href: "/admin/cms/discover",
        icon: Compass,
      },
      {
        label: "Tools Directory",
        href: "/admin/cms/apps",
        icon: AppWindow,
      },
      {
        label: "Marketing Pricing Copy",
        href: "/admin/cms/pricing",
        icon: Tag,
      },
      {
        label: "Cinematic Presets",
        href: "/admin/cinematic-presets",
        icon: Camera,
      },
      {
        label: "Voice Samples",
        href: "/admin/voice-samples",
        icon: Mic,
      },
      {
        label: "Page Builder",
        href: "/admin/page-builder",
        icon: FileCode,
      },
    ],
  },
  {
    id: "ads",
    title: "ADS & CAMPAIGNS",
    items: [
      {
        label: "Ad Campaigns & Banners",
        href: "/admin/ads",
        icon: Megaphone,
      },
    ],
  },
  {
    id: "utilities",
    title: "ADVANCED / UTILITIES",
    items: [
      {
        label: "Adobe Plugin",
        href: "/admin/plugin",
        icon: AppWindow,
      },
      {
        label: "Storage Migration",
        href: "/admin/migrate-storage",
        icon: HardDrive,
      },
      {
        label: "Generation Lab",
        href: "/admin/generation-lab",
        icon: FlaskConical,
      },
      {
        label: "Model Diagnostics",
        href: "/admin/model-test",
        icon: TerminalSquare,
      },
      {
        label: "Smart CLI Debug",
        href: "/admin/smart-cli-debug",
        icon: Bug,
      },
    ],
  },
];

export function AdminSidebar({ activeRoute, isMobileOpen, onCloseMobile }: AdminSidebarProps) {
  const pathname = usePathname();
  const currentRoute = activeRoute || pathname || "";

  // Find which group contains the current route
  const activeGroupId = useMemo(() => {
    for (const group of ADMIN_NAV_CONFIG) {
      for (const item of group.items) {
        if (
          currentRoute === item.href ||
          (item.href !== "/admin" && item.href !== "/admin/cms" && currentRoute.startsWith(item.href)) ||
          (item.href === "/admin/cms" && currentRoute === "/admin/cms")
        ) {
          return group.id;
        }
      }
    }
    return "overview";
  }, [currentRoute]);

  // Collapsed state map (default all expanded, or load from localStorage)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    utilities: true, // collapse rare utilities by default
  });

  // Ensure active group is always expanded
  useEffect(() => {
    if (activeGroupId) {
      setCollapsedGroups((prev) => ({
        ...prev,
        [activeGroupId]: false,
      }));
    }
  }, [activeGroupId]);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const isItemActive = (href: string) => {
    if (href === "/admin/cms") {
      return currentRoute === "/admin/cms";
    }
    if (href === "/admin") {
      return currentRoute === "/admin";
    }
    return currentRoute === href || currentRoute.startsWith(`${href}/`);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`w-64 flex-shrink-0 border-r border-slate-800/80 bg-slate-950 flex flex-col justify-between min-h-screen sticky top-0 h-screen z-50 select-none transition-transform duration-200 ${
          isMobileOpen ? "fixed inset-y-0 left-0 translate-x-0" : "hidden lg:flex"
        }`}
      >
        {/* Brand Header */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 font-black text-sm shadow-sm">
                S
              </div>
              <div>
                <span className="block text-xs font-bold text-white tracking-tight leading-none">
                  SAAD STUDIO
                </span>
                <span className="text-[10px] text-cyan-400/80 font-mono tracking-wider font-semibold uppercase mt-0.5 block">
                  Enterprise Control Plane
                </span>
              </div>
            </div>

            {/* Mobile close button */}
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-1 rounded-lg text-slate-400 hover:text-white lg:hidden"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Navigation Items with Collapsible Groups */}
          <nav className="p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-125px)] text-xs">
            {ADMIN_NAV_CONFIG.map((group) => {
              const isCollapsed = Boolean(collapsedGroups[group.id]);
              const containsActive = group.id === activeGroupId;

              return (
                <div key={group.id} className="space-y-1">
                  {/* Group Collapsible Header */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className="w-full flex items-center justify-between px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 hover:text-slate-300 transition"
                  >
                    <span className={containsActive ? "text-cyan-400/90" : ""}>
                      {group.title}
                    </span>
                    {isCollapsed ? (
                      <ChevronRight className="h-3 w-3 text-slate-600" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-slate-600" />
                    )}
                  </button>

                  {/* Group Items */}
                  {!isCollapsed && (
                    <div className="space-y-0.5 pt-0.5 animate-in fade-in duration-100">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const active = isItemActive(item.href);

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={onCloseMobile}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg font-semibold transition-all duration-150 ${
                              active
                                ? "border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 shadow-sm"
                                : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <Icon
                                className={`h-4 w-4 flex-shrink-0 ${
                                  active ? "text-cyan-400" : "text-slate-500"
                                }`}
                              />
                              <span className="truncate">{item.label}</span>
                            </div>
                            {item.badge && (
                              <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[9px] font-bold text-slate-400">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Footer Quick Return */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/90">
          <Link
            href="/admin/control-center"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-slate-800 bg-slate-900/60 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <ShieldCheck className="h-4 w-4 text-cyan-400 flex-shrink-0" />
            <span>Control Center</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
