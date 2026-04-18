"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Shield,
  DollarSign,
  Paintbrush,
  Key,
  ScrollText,
  AlertTriangle,
  TrendingUp,
  Activity,
  ChevronRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Trash2,
  Flag,
  ShieldAlert,
  Plus,
  Save,
  Zap,
  Video,
  Image,
  Music,
  Code2,
  Globe,
  Bell,
  RefreshCw,
  Download,
  UserCheck,
  UserX,
  CreditCard,
  Sparkles,
  Lock,
  TerminalSquare,
  Cpu,
  Layers,
  ExternalLink,
  LayoutTemplate,
  ShieldCheck,
  Compass,
} from "lucide-react";

// ─── MOCK DATA ──────────────────────────────────────────────────────────────

const MOCK_USERS = [
  {
    id: "u1",
    email: "alex.smith@gmail.com",
    phone: "+1 (555) 012-3456",
    creditBalance: 250,
    role: "USER",
    isBanned: false,
    createdAt: "Jan 15, 2026",
  },
  {
    id: "u2",
    email: "maria.johnson@outlook.com",
    phone: "+44 7700 900456",
    creditBalance: 80,
    role: "USER",
    isBanned: false,
    createdAt: "Feb 20, 2026",
  },
  {
    id: "u3",
    email: "david.chen@yahoo.com",
    phone: "+86 138-0013-8000",
    creditBalance: 500,
    role: "PRO",
    isBanned: false,
    createdAt: "Mar 05, 2026",
  },
  {
    id: "u4",
    email: "spam.bot99@temp.com",
    phone: "+1 555-9999",
    creditBalance: 0,
    role: "USER",
    isBanned: true,
    createdAt: "Mar 22, 2026",
  },
  {
    id: "u5",
    email: "sarah.king@gmail.com",
    phone: "+1 (555) 045-6789",
    creditBalance: 120,
    role: "USER",
    isBanned: false,
    createdAt: "Apr 01, 2026",
  },
  {
    id: "u6",
    email: "james.wilson@proton.me",
    phone: "+1 (555) 067-8901",
    creditBalance: 900,
    role: "ENTERPRISE",
    isBanned: false,
    createdAt: "Apr 03, 2026",
  },
];

const MOCK_GENERATIONS = [
  {
    id: "g1",
    userEmail: "alex.smith@gmail.com",
    prompt:
      "Cinematic futuristic city at dusk, neon reflections on rain-soaked cobblestone streets, volumetric fog, 8K UHD",
    mediaUrl: "https://picsum.photos/seed/g1ai/400/260",
    assetType: "IMAGE",
    modelUsed: "Flux Pro 1.1",
    cost: 0.05,
    createdAt: "Apr 7, 2026 14:23",
    flagged: false,
  },
  {
    id: "g2",
    userEmail: "maria.johnson@outlook.com",
    prompt:
      "Medieval knight in enchanted glowing forest, epic fantasy, hyper-realistic, dramatic rim lighting",
    mediaUrl: "https://picsum.photos/seed/g2ai/400/260",
    assetType: "IMAGE",
    modelUsed: "Seedance v1",
    cost: 0.12,
    createdAt: "Apr 7, 2026 13:45",
    flagged: false,
  },
  {
    id: "g3",
    userEmail: "david.chen@yahoo.com",
    prompt:
      "Luxury watch brand advertisement, slow motion water droplets in 4K, product reveal cinematic video",
    mediaUrl: "https://picsum.photos/seed/g3ai/400/260",
    assetType: "VIDEO",
    modelUsed: "Kling 3.0",
    cost: 0.5,
    createdAt: "Apr 7, 2026 12:10",
    flagged: false,
  },
  {
    id: "g4",
    userEmail: "sarah.king@gmail.com",
    prompt:
      "Anime girl with silver hair on skyscraper rooftop at night, cyberpunk neon aesthetic, Makoto Shinkai style",
    mediaUrl: "https://picsum.photos/seed/g4ai/400/260",
    assetType: "IMAGE",
    modelUsed: "Flux Pro 1.1",
    cost: 0.05,
    createdAt: "Apr 7, 2026 11:55",
    flagged: true,
  },
  {
    id: "g5",
    userEmail: "alex.smith@gmail.com",
    prompt:
      "Deep ambient lo-fi music for late night study sessions, soft rain in background, melancholic piano",
    mediaUrl: "https://picsum.photos/seed/g5ai/400/260",
    assetType: "AUDIO",
    modelUsed: "ElevenLabs v3",
    cost: 0.08,
    createdAt: "Apr 7, 2026 10:30",
    flagged: false,
  },
  {
    id: "g6",
    userEmail: "james.wilson@proton.me",
    prompt:
      "Explain quantum computing in simple terms using Python code examples, include Hadamard gates demo",
    mediaUrl: null,
    assetType: "CODE",
    modelUsed: "GPT-4o",
    cost: 0.02,
    createdAt: "Apr 7, 2026 09:00",
    flagged: false,
  },
];

const MOCK_TRANSACTIONS = [
  {
    id: "t1",
    userEmail: "alex.smith@gmail.com",
    plan: "PRO",
    amount: 29.99,
    credits: 500,
    paymentStatus: "COMPLETED",
    createdAt: "Apr 01, 2026",
  },
  {
    id: "t2",
    userEmail: "james.wilson@proton.me",
    plan: "ENTERPRISE",
    amount: 99.99,
    credits: 2000,
    paymentStatus: "COMPLETED",
    createdAt: "Mar 28, 2026",
  },
  {
    id: "t3",
    userEmail: "sarah.king@gmail.com",
    plan: "BASIC",
    amount: 9.99,
    credits: 100,
    paymentStatus: "COMPLETED",
    createdAt: "Mar 25, 2026",
  },
  {
    id: "t4",
    userEmail: "maria.johnson@outlook.com",
    plan: "PRO",
    amount: 29.99,
    credits: 500,
    paymentStatus: "PENDING",
    createdAt: "Apr 06, 2026",
  },
  {
    id: "t5",
    userEmail: "unknown@burner.cc",
    plan: "ENTERPRISE",
    amount: 99.99,
    credits: 2000,
    paymentStatus: "FAILED",
    createdAt: "Apr 07, 2026",
  },
  {
    id: "t6",
    userEmail: "david.chen@yahoo.com",
    plan: "PRO",
    amount: 29.99,
    credits: 500,
    paymentStatus: "COMPLETED",
    createdAt: "Apr 05, 2026",
  },
];

const MOCK_API_KEYS = [
  {
    id: "k1",
    name: "OpenAI GPT-4o",
    key: "sk-proj-Xm9cQ2...HjL7pA",
    status: "ACTIVE",
    lastUsed: "Apr 7, 2026 14:50",
    calls: 12450,
  },
  {
    id: "k2",
    name: "WaveSpeedAI (Flux)",
    key: "ws-4bKzRt...NgW2xC",
    status: "ACTIVE",
    lastUsed: "Apr 7, 2026 14:30",
    calls: 8903,
  },
  {
    id: "k3",
    name: "ElevenLabs Audio",
    key: "el-7dPmVq...QrT5yB",
    status: "ACTIVE",
    lastUsed: "Apr 7, 2026 10:30",
    calls: 3201,
  },
  {
    id: "k4",
    name: "Kling AI (Video)",
    key: "kl-9eRsUv...FgH3wD",
    status: "ACTIVE",
    lastUsed: "Apr 7, 2026 12:10",
    calls: 654,
  },
  {
    id: "k5",
    name: "Replicate (Music / 3D)",
    key: "r8-2fJkLm...AbN6cE",
    status: "INACTIVE",
    lastUsed: "Apr 5, 2026 08:00",
    calls: 189,
  },
  {
    id: "k6",
    name: "Stripe Payments",
    key: "sk_live_Yz1aWx...TuV4sQ",
    status: "ACTIVE",
    lastUsed: "Apr 7, 2026 12:45",
    calls: 2847,
  },
];

const MOCK_LOGS = [
  {
    id: "l1",
    level: "ERROR",
    message:
      "OpenAI API rate limit exceeded for user alex.smith@gmail.com — 429 response received",
    timestamp: "2026-04-07 14:55:03",
  },
  {
    id: "l2",
    level: "WARN",
    message:
      "ElevenLabs credit balance below $150 threshold — current balance: $120.00",
    timestamp: "2026-04-07 14:30:12",
  },
  {
    id: "l3",
    level: "INFO",
    message:
      "User james.wilson@proton.me upgraded to ENTERPRISE plan via Stripe",
    timestamp: "2026-04-07 13:15:44",
  },
  {
    id: "l4",
    level: "INFO",
    message:
      "Stripe webhook received: payment_intent.succeeded — $99.99 USD processed",
    timestamp: "2026-04-07 12:45:22",
  },
  {
    id: "l5",
    level: "ERROR",
    message:
      "Video generation failed: Kling API timeout after 30000ms — retrying (1/3)",
    timestamp: "2026-04-07 11:22:09",
  },
  {
    id: "l6",
    level: "WARN",
    message:
      "Unusual generation volume detected from IP 185.192.xx.xx — possible abuse pattern",
    timestamp: "2026-04-07 10:50:33",
  },
  {
    id: "l7",
    level: "INFO",
    message: "Admin session authenticated — Super Admin — IP 127.0.0.1",
    timestamp: "2026-04-07 09:00:01",
  },
  {
    id: "l8",
    level: "DEBUG",
    message:
      "Prisma query cache hit — getGenerations — 2ms response time",
    timestamp: "2026-04-07 09:00:45",
  },
];

const MODEL_USAGE = [
  { name: "Kling 3.0", usage: 38, color: "from-violet-500 to-purple-600" },
  { name: "Seedance v1", usage: 27, color: "from-blue-500 to-cyan-600" },
  { name: "Flux Pro 1.1", usage: 22, color: "from-emerald-500 to-teal-600" },
  { name: "ElevenLabs v3", usage: 8, color: "from-orange-500 to-amber-600" },
  { name: "GPT-4o", usage: 5, color: "from-pink-500 to-rose-600" },
];

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "users", label: "User Management", icon: Users },
  { id: "security", label: "Security & Monitor", icon: Shield },
  { id: "financials", label: "Financials & Transactions", icon: DollarSign },
  { id: "cms", label: "Visual CMS (Site Builder)", icon: Paintbrush },
  { id: "apikeys", label: "API Keys Manager", icon: Key },
  { id: "logs", label: "System Logs", icon: ScrollText },
];

// ─── REUSABLE MINI COMPONENTS ────────────────────────────────────────────────

function AssetIcon({ type }: { type: string }) {
  const cfg: Record<string, { icon: React.ReactNode; cls: string }> = {
    IMAGE: { icon: <Image className="w-3 h-3" />, cls: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
    VIDEO: { icon: <Video className="w-3 h-3" />, cls: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    AUDIO: { icon: <Music className="w-3 h-3" />, cls: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
    CODE: { icon: <Code2 className="w-3 h-3" />, cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  };
  const item = cfg[type] ?? { icon: null, cls: "bg-slate-700 text-slate-400 border-slate-600" };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${item.cls}`}>
      {item.icon} {type}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    COMPLETED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    PENDING: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    FAILED: "bg-red-500/15 text-red-400 border-red-500/30",
    ACTIVE: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    INACTIVE: "bg-slate-600/30 text-slate-500 border-slate-600/30",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${styles[status] ?? "bg-slate-700 text-slate-400 border-slate-600"}`}>
      {status}
    </span>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors border flex-shrink-0 ${
        value ? "bg-violet-600 border-violet-500" : "bg-slate-700 border-slate-600"
      }`}
    >
      <span
        className={`inline-block w-4 h-4 bg-white rounded-full shadow transition-transform ${
          value ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

// ─── ANIMATION VARIANTS ──────────────────────────────────────────────────────

const sectionVariants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.18 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3 },
  }),
};

type KieBalanceState = {
  amount: number | null;
  status: "HIGH" | "MEDIUM" | "LOW" | "UNAVAILABLE" | "LOADING";
  syncedAt: string | null;
};

type AdminTransactionRow = {
  id: string;
  userEmail: string;
  plan: string;
  method?: string | null;
  orderId?: string | null;
  proofFileName?: string | null;
  proofUrl?: string | null;
  amount: number;
  credits: number;
  paymentStatus: "PENDING" | "COMPLETED" | "FAILED" | string;
  createdAt: string;
};

type ProofPreviewState = {
  url: string;
  fileName?: string | null;
};

type GenerationPreviewState = {
  url: string;
  assetType: string;
  prompt: string;
  userEmail: string;
  modelUsed: string;
  createdAt: string;
};

function getBalanceIndicator(status: KieBalanceState["status"]) {
  switch (status) {
    case "HIGH":
      return {
        dotClass: "bg-emerald-400",
        valueClass: "text-emerald-200",
        badgeClass: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      };
    case "MEDIUM":
      return {
        dotClass: "bg-amber-400",
        valueClass: "text-amber-200",
        badgeClass: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      };
    case "LOW":
      return {
        dotClass: "bg-red-400",
        valueClass: "text-red-200",
        badgeClass: "bg-red-500/20 text-red-400 border-red-500/30",
      };
    case "LOADING":
      return {
        dotClass: "bg-slate-400",
        valueClass: "text-slate-200",
        badgeClass: "bg-slate-500/20 text-slate-300 border-slate-500/30",
      };
    default:
      return {
        dotClass: "bg-slate-500",
        valueClass: "text-slate-300",
        badgeClass: "bg-slate-500/20 text-slate-400 border-slate-600/40",
      };
  }
}

// ─── PAGE COMPONENT ──────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("overview");
  const [users, setUsers] = useState<typeof MOCK_USERS>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [generations, setGenerations] = useState<(typeof MOCK_GENERATIONS)[number][]>([]);
  const [transactions, setTransactions] = useState<AdminTransactionRow[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [transactionsRefreshing, setTransactionsRefreshing] = useState(false);
  const [updatingTxId, setUpdatingTxId] = useState<string | null>(null);
  const [proofPreview, setProofPreview] = useState<ProofPreviewState | null>(null);
  const [generationPreview, setGenerationPreview] = useState<GenerationPreviewState | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [creditInputs, setCreditInputs] = useState<Record<string, string>>({});
  const [cmsSettings, setCmsSettings] = useState({
    siteName: "Saad Studio",
    logoUrl: "/logo.png",
    primaryColor: "#7c3aed",
    bannerText: "🎉 New Feature: Kling 3.0 Video Generation is now live! Try it today.",
    bannerActive: true,
    adsEnabled: false,
  });
  const [cmsSaved, setCmsSaved] = useState(false);
  const [statsData, setStatsData] = useState({
    totalUsers: 3241,
    totalRevenue: 48920,
    pendingCredits: 17,
    apiCalls: 98430,
  });
  const [kieBalance, setKieBalance] = useState<KieBalanceState>({
    amount: null,
    status: "LOADING",
    syncedAt: null,
  });

  const refreshGenerations = useCallback(async () => {
    const res = await fetch("/api/admin/generations", { cache: "no-store" });
    const data = await res.json().catch(() => []);
    setGenerations(Array.isArray(data) ? data : []);
  }, []);

  // ── Fetch real data on mount ──────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { setUsers(Array.isArray(data) ? data : []); })
      .catch(() => setUsers([]))
      .finally(() => setUsersLoading(false));

    refreshGenerations().catch(() => setGenerations([]));

    fetch("/api/admin/transactions")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { setTransactions(Array.isArray(data) ? data : []); })
      .catch(() => setTransactions([]))
      .finally(() => setTransactionsLoading(false));

    fetch("/api/admin/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setCmsSettings({
          siteName: data.siteName ?? "Saad Studio",
          logoUrl: data.logoUrl ?? "/logo.png",
          primaryColor: data.primaryColor ?? "#7c3aed",
          bannerText: data.topBannerAdText ?? "",
          bannerActive: data.isBannerActive ?? false,
          adsEnabled: data.adsEnabled ?? false,
        });
      });

    fetch("/api/admin/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setStatsData({
          totalUsers: data.totalUsers ?? 3241,
          totalRevenue: data.totalRevenue ?? 48920,
          pendingCredits: data.pendingCredits ?? 17,
          apiCalls: data.apiCallsTotal ?? 98430,
        });
      });
  }, []);

  useEffect(() => {
    let active = true;

    const loadKieBalance = async () => {
      try {
        const res = await fetch("/api/admin/suppliers/kie-balance", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load KIE balance");
        const data = await res.json();
        if (!active) return;

        setKieBalance({
          amount: Number.isFinite(Number(data?.amount)) ? Number(data.amount) : null,
          status: data?.status ?? "UNAVAILABLE",
          syncedAt: typeof data?.syncedAt === "string" ? data.syncedAt : new Date().toISOString(),
        });
      } catch {
        if (!active) return;
        setKieBalance({
          amount: null,
          status: "UNAVAILABLE",
          syncedAt: new Date().toISOString(),
        });
      }
    };

    loadKieBalance();
    const timer = window.setInterval(loadKieBalance, 60_000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const balanceIndicator = getBalanceIndicator(kieBalance.status);
  const formattedKieAmount =
    kieBalance.amount !== null ? `$${kieBalance.amount.toFixed(2)}` : "Unavailable";
  const lastSyncText = kieBalance.syncedAt
    ? new Date(kieBalance.syncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "Never";

  const handleSaveCms = async () => {
    setCmsSaved(true);
    setTimeout(() => setCmsSaved(false), 2500);
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteName: cmsSettings.siteName,
        logoUrl: cmsSettings.logoUrl,
        primaryColor: cmsSettings.primaryColor,
        topBannerAdText: cmsSettings.bannerText,
        isBannerActive: cmsSettings.bannerActive,
        adsEnabled: cmsSettings.adsEnabled,
      }),
    });
  };

  const handleToggleBan = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isBanned: !u.isBanned } : u))
    );
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ban", isBanned: !user?.isBanned }),
    });
  };

  const handleDeleteUser = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    const confirmed = window.confirm(
      `⚠️ هل أنت متأكد من حذف المستخدم "${user?.email}" نهائياً؟\nلا يمكن التراجع عن هذا الإجراء.`
    );
    if (!confirmed) return;
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
  };

  const handleAddCredits = async (userId: string) => {
    const amount = parseInt(creditInputs[userId] ?? "0", 10);
    if (!amount || amount === 0) return;
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, creditBalance: Math.max(0, u.creditBalance + amount) } : u
      )
    );
    setCreditInputs((prev) => ({ ...prev, [userId]: "" }));
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "credits", amount }),
    });
    if (!res.ok) {
      // revert on failure
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, creditBalance: u.creditBalance - amount } : u
        )
      );
    }
  };

  const handleDeleteGeneration = async (genId: string) => {
    const previous = generations;
    setGenerations((prev) => prev.filter((g) => g.id !== genId));
    const res = await fetch(`/api/admin/generations/${genId}`, { method: "DELETE" });
    if (!res.ok) {
      setGenerations(previous);
      return;
    }
    await refreshGenerations();
  };

  const handleFlagGeneration = async (genId: string) => {
    const previous = generations;
    setGenerations((prev) =>
      prev.map((g) => (g.id === genId ? { ...g, flagged: !g.flagged } : g))
    );
    const res = await fetch(`/api/admin/generations/${genId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "flag" }),
    });
    if (!res.ok) {
      setGenerations(previous);
      return;
    }
    await refreshGenerations();
  };

  const refreshTransactions = useCallback(async (silent = false) => {
    if (!silent) setTransactionsRefreshing(true);
    try {
      const res = await fetch("/api/admin/transactions", { cache: "no-store" });
      const data = await res.json().catch(() => []);
      setTransactions(Array.isArray(data) ? data : []);
    } finally {
      if (!silent) setTransactionsRefreshing(false);
    }
  }, [refreshGenerations]);

  useEffect(() => {
    if (activeSection !== "financials") return;

    const intervalId = window.setInterval(() => {
      refreshTransactions(true);
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [activeSection, refreshTransactions]);

  const handleTransactionStatus = async (txId: string, status: "PENDING" | "COMPLETED" | "FAILED") => {
    setUpdatingTxId(txId);
    try {
      const res = await fetch(`/api/admin/transactions/${txId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        return;
      }

      await refreshTransactions();

      if (status === "COMPLETED") {
        fetch("/api/admin/users")
          .then((r) => (r.ok ? r.json() : []))
          .then((data) => { setUsers(Array.isArray(data) ? data : []); })
          .catch(() => {});
      }
    } finally {
      setUpdatingTxId(null);
    }
  };

  const toggleRevealKey = (keyId: string) => {
    setRevealedKeys((prev) => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const flaggedCount = generations.filter((g) => g.flagged).length;
  const getMonthKey = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 7);
  };
  const totalRevenueValue = transactions
    .filter((tx) => tx.paymentStatus === "COMPLETED")
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const monthKey = new Date().toISOString().slice(0, 7);
  const thisMonthRevenueValue = transactions
    .filter((tx) => tx.paymentStatus === "COMPLETED" && getMonthKey(tx.createdAt) === monthKey)
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const pendingTransactions = transactions.filter((tx) => tx.paymentStatus === "PENDING");
  const pendingAmountValue = pendingTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const proofExt = proofPreview?.url.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  const isPdfProof = proofExt === "pdf";
  const generationPreviewExt = generationPreview?.url.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  const isVideoGenerationPreview =
    generationPreview?.assetType === "VIDEO" || ["mp4", "webm", "mov", "mkv"].includes(generationPreviewExt);
  const isAudioGenerationPreview =
    generationPreview?.assetType === "AUDIO" || ["mp3", "wav", "m4a", "ogg"].includes(generationPreviewExt);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* ════════════════════════ SIDEBAR ════════════════════════════════════ */}
      <aside className="w-64 flex-shrink-0 flex flex-col border-r border-slate-800/80 bg-slate-900/70 backdrop-blur-sm">
        {/* Logo / Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800/80">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-900/60 flex-shrink-0">
            <Sparkles className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">Admin Panel</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Super Admin</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const hasBadge = item.id === "security" && flaggedCount > 0;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? "bg-violet-600/20 text-violet-200 border border-violet-500/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${
                    isActive ? "text-violet-400" : "text-slate-500 group-hover:text-slate-300"
                  }`}
                />
                <span className="truncate flex-1 text-left">{item.label}</span>
                {hasBadge && (
                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {flaggedCount}
                  </span>
                )}
                {isActive && !hasBadge && (
                  <ChevronRight className="w-3 h-3 flex-shrink-0 text-violet-500" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Quick Links */}
        <div className="px-3 pb-3 space-y-0.5 border-b border-slate-800/80">
          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-3 py-1.5">
            Advanced Tools
          </p>
          {[
            { label: "Pricing Constitution", href: "/admin/pricing", icon: CreditCard },
            { label: "CMS & Ad Manager", href: "/admin/cms", icon: Layers },
            { label: "Pricing & Payment CMS", href: "/admin/cms/pricing", icon: CreditCard },
            { label: "Beauty Studio CMS", href: "/admin/cms/beauty2", icon: Sparkles },
            { label: "Apps CMS", href: "/admin/cms/apps", icon: Globe },
            { label: "Auth Page CMS", href: "/admin/cms/auth", icon: ShieldCheck },
            { label: "Discover CMS", href: "/admin/cms/discover", icon: Compass },
            { label: "Page Builder", href: "/admin/page-builder", icon: LayoutTemplate },
            { label: "Model Test Lab", href: "/admin/model-test", icon: Zap },
          ].map(({ label, href, icon: Icon }) => (
            <button
              key={href}
              onClick={() => router.push(href)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            >
              <Icon className="w-4 h-4 flex-shrink-0 text-slate-500 group-hover:text-slate-300" />
              <span className="truncate flex-1 text-left">{label}</span>
              <ExternalLink className="w-3 h-3 flex-shrink-0 text-slate-700 group-hover:text-slate-500 transition-colors" />
            </button>
          ))}
        </div>

        {/* Admin profile */}
        <div className="px-4 py-4 border-t border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
              SA
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">Super Admin</p>
              <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                Online
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ════════════════════════ MAIN ═══════════════════════════════════════ */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* ── ALERT BAR: Supplier Balances ────────────────────────────────── */}
        <div
          className="flex-shrink-0 border-b border-amber-500/25 px-6 py-2.5 flex items-center justify-between gap-4 bg-gradient-to-r from-amber-950/70 via-orange-950/50 to-amber-950/70"
          style={{ boxShadow: "0 4px 24px rgba(245,158,11,0.12)" }}
        >
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5 animate-pulse flex-shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              API Supplier Balance Monitor
            </span>
          </div>

          <div className="flex items-center gap-5 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full animate-pulse ${balanceIndicator.dotClass}`} />
              <span className="text-xs text-slate-400">KIE.ai Billing Balance:</span>
              <span className={`text-sm font-bold ${balanceIndicator.valueClass}`}>{formattedKieAmount}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${balanceIndicator.badgeClass}`}
              >
                {kieBalance.status}
              </span>
            </div>
          </div>

          <span className="text-[10px] text-slate-600 flex-shrink-0">Last sync: {lastSyncText}</span>
        </div>

        {/* ── SCROLLABLE CONTENT ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <AnimatePresence mode="wait">

            {/* ════════ OVERVIEW ══════════════════════════════════════════════ */}
            {activeSection === "overview" && (
              <motion.div
                key="overview"
                variants={sectionVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-8"
              >
                <div>
                  <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
                  <p className="text-slate-400 text-sm mt-1">
                    Welcome back, Super Admin. Here is your platform snapshot.
                  </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                  {[
                    {
                      label: "Total Users",
                      value: statsData.totalUsers.toLocaleString(),
                      delta: "+24 today",
                      icon: Users,
                      gradient: "from-violet-500/20 to-purple-600/5",
                      border: "border-violet-500/20",
                      iconCls: "text-violet-400 bg-violet-500/10",
                    },
                    {
                      label: "Total Revenue",
                      value: `$${statsData.totalRevenue.toLocaleString()}`,
                      delta: "+$1,240 MTD",
                      icon: TrendingUp,
                      gradient: "from-emerald-500/20 to-teal-600/5",
                      border: "border-emerald-500/20",
                      iconCls: "text-emerald-400 bg-emerald-500/10",
                    },
                    {
                      label: "Pending Credit Requests",
                      value: statsData.pendingCredits.toString(),
                      delta: "Needs review",
                      icon: CreditCard,
                      gradient: "from-amber-500/20 to-orange-600/5",
                      border: "border-amber-500/20",
                      iconCls: "text-amber-400 bg-amber-500/10",
                    },
                    {
                      label: "API Calls Today",
                      value: statsData.apiCalls.toLocaleString(),
                      delta: "+12% vs yesterday",
                      icon: Activity,
                      gradient: "from-blue-500/20 to-cyan-600/5",
                      border: "border-blue-500/20",
                      iconCls: "text-blue-400 bg-blue-500/10",
                    },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      custom={i}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      className={`relative overflow-hidden rounded-xl p-5 bg-gradient-to-br ${stat.gradient} border ${stat.border}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-slate-400 font-medium truncate">{stat.label}</p>
                          <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                          <p className="text-xs text-slate-500 mt-1">{stat.delta}</p>
                        </div>
                        <div className={`p-2.5 rounded-lg flex-shrink-0 ${stat.iconCls}`}>
                          <stat.icon className="w-5 h-5" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Model Usage Chart */}
                <motion.div
                  custom={4}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  className="rounded-xl border border-slate-800 bg-slate-900/40 p-6"
                >
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-sm font-semibold text-white">Most Used AI Models</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Last 30 days — generation share
                      </p>
                    </div>
                    <Cpu className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="space-y-3.5">
                    {MODEL_USAGE.map((model) => (
                      <div key={model.name}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-slate-300 font-medium">{model.name}</span>
                          <span className="text-slate-500 font-semibold">{model.usage}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full bg-gradient-to-r ${model.color}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${model.usage}%` }}
                            transition={{ duration: 0.9, delay: 0.3, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Recent Logs */}
                <motion.div
                  custom={5}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  className="rounded-xl border border-slate-800 bg-slate-900/40 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-white">Recent System Events</h2>
                    <button
                      onClick={() => setActiveSection("logs")}
                      className="text-xs text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"
                    >
                      View all <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    {MOCK_LOGS.slice(0, 4).map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 py-2 border-b border-slate-800/50 last:border-0"
                      >
                        <span
                          className={`mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase flex-shrink-0 ${
                            log.level === "ERROR"
                              ? "bg-red-500/20 text-red-400"
                              : log.level === "WARN"
                              ? "bg-amber-500/20 text-amber-400"
                              : log.level === "DEBUG"
                              ? "bg-slate-700 text-slate-500"
                              : "bg-blue-500/20 text-blue-400"
                          }`}
                        >
                          {log.level}
                        </span>
                        <p className="text-xs text-slate-400 flex-1 leading-relaxed">{log.message}</p>
                        <span className="text-[10px] text-slate-600 flex-shrink-0">
                          {log.timestamp.split(" ")[1]}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* ════════ USER MANAGEMENT ═══════════════════════════════════════ */}
            {activeSection === "users" && (
              <motion.div
                key="users"
                variants={sectionVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-6"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-white">User Management</h1>
                    <p className="text-slate-400 text-sm mt-1">
                      {users.length} registered users —{" "}
                      <span className="text-red-400">{users.filter((u) => u.isBanned).length} banned</span>
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setUsersLoading(true);
                      fetch("/api/admin/users")
                        .then((r) => (r.ok ? r.json() : []))
                        .then((data) => setUsers(Array.isArray(data) ? data : []))
                        .catch(() => setUsers([]))
                        .finally(() => setUsersLoading(false));
                    }}
                    className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 hover:bg-slate-800 transition-colors">
                    <RefreshCw className={`w-3 h-3 ${usersLoading ? "animate-spin" : ""}`} /> Refresh
                  </button>
                </div>

                {usersLoading ? (
                  <div className="flex items-center justify-center py-20 text-slate-500 gap-3">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>جارٍ تحميل المستخدمين...</span>
                  </div>
                ) : users.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
                      <Users className="w-8 h-8 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-lg">لا يوجد مستخدمون مسجلون</p>
                      <p className="text-slate-400 text-sm mt-1">لم يسجّل أحد في تطبيقك بعد</p>
                    </div>
                    <a
                      href="https://dashboard.clerk.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-lg bg-violet-600/20 border border-violet-500/40 text-violet-400 text-sm hover:bg-violet-600/30 transition-colors"
                    >
                      افتح Clerk Dashboard لإضافة مستخدمين تجريبيين
                    </a>
                  </div>
                ) : (
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-x-auto">
                  <table className="w-full text-sm min-w-[860px]">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/80">
                        {["User", "Phone", "Credits", "Role", "Status", "Add Credits", "Action"].map(
                          (h) => (
                            <th
                              key={h}
                              className="text-left px-5 py-3.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user, i) => (
                        <motion.tr
                          key={user.id}
                          custom={i}
                          variants={cardVariants}
                          initial="hidden"
                          animate="visible"
                          className={`border-b border-slate-800/40 last:border-0 transition-colors hover:bg-slate-800/20 ${
                            user.isBanned ? "opacity-55" : ""
                          }`}
                        >
                          {/* User */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                                {user.email[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="text-slate-200 font-medium text-xs">{user.email}</p>
                                <p className="text-slate-600 text-[10px]">Joined {user.createdAt}</p>
                              </div>
                            </div>
                          </td>
                          {/* Phone */}
                          <td className="px-5 py-4 text-xs text-slate-400 whitespace-nowrap">{user.phone}</td>
                          {/* Credits */}
                          <td className="px-5 py-4">
                            <span className="text-sm font-bold text-violet-300">{user.creditBalance.toLocaleString()}</span>
                          </td>
                          {/* Role */}
                          <td className="px-5 py-4">
                            <select
                              value={user.role}
                              onChange={async (e) => {
                                const newRole = e.target.value;
                                setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role: newRole } : u));
                                await fetch(`/api/admin/users/${user.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ action: "role", role: newRole }),
                                });
                              }}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-violet-500/40 ${
                                user.role === "ENTERPRISE"
                                  ? "bg-amber-500/15 text-amber-400"
                                  : user.role === "PRO"
                                  ? "bg-violet-500/15 text-violet-400"
                                  : "bg-slate-700/60 text-slate-400"
                              }`}
                            >
                              <option value="USER" className="bg-slate-900">USER</option>
                              <option value="PRO" className="bg-slate-900">PRO</option>
                              <option value="ENTERPRISE" className="bg-slate-900">ENTERPRISE</option>
                            </select>
                          </td>
                          {/* Status */}
                          <td className="px-5 py-4">
                            {user.isBanned ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
                                BANNED
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                ACTIVE
                              </span>
                            )}
                          </td>
                          {/* Add/Remove Credits */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                placeholder="±100"
                                value={creditInputs[user.id] ?? ""}
                                onChange={(e) =>
                                  setCreditInputs((prev) => ({ ...prev, [user.id]: e.target.value }))
                                }
                                className="w-16 px-2 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-colors"
                              />
                              <button
                                onClick={() => handleAddCredits(user.id)}
                                className="px-2.5 py-1.5 rounded-md bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold hover:bg-emerald-600/30 transition-colors flex items-center gap-1 whitespace-nowrap"
                              >
                                <Plus className="w-3 h-3" /> Apply
                              </button>
                            </div>
                          </td>
                          {/* Action */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleToggleBan(user.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                  user.isBanned
                                    ? "bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30"
                                    : "bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30"
                                }`}
                              >
                                {user.isBanned ? (
                                  <>
                                    <UserCheck className="w-3 h-3" /> Unban
                                  </>
                                ) : (
                                  <>
                                    <UserX className="w-3 h-3" /> Ban User
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap bg-rose-900/30 border border-rose-700/40 text-rose-400 hover:bg-rose-800/50 hover:border-rose-600/60"
                                title="حذف المستخدم نهائياً"
                              >
                                <Trash2 className="w-3 h-3" /> Delete
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                )}
              </motion.div>
            )}

            {/* ════════ SECURITY & PRODUCTION MONITOR ═════════════════════════ */}
            {activeSection === "security" && (
              <motion.div
                key="security"
                variants={sectionVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-6"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                      <ShieldAlert className="w-6 h-6 text-violet-400" />
                      Security & Production Monitor
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                      {generations.length} generations logged —{" "}
                      <span className="text-red-400">{flaggedCount} flagged</span>
                    </p>
                  </div>
                </div>

                {flaggedCount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-lg border border-red-500/30 bg-red-500/8 px-4 py-3 flex items-center gap-3"
                  >
                    <Flag className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-300">
                      <span className="font-bold">{flaggedCount} generation(s) flagged</span> for policy
                      review. Inspect the highlighted cards below and take action.
                    </p>
                  </motion.div>
                )}

                {generations.length === 0 && (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-16 flex flex-col items-center justify-center gap-3 text-slate-600">
                    <Shield className="w-10 h-10" />
                    <p className="text-sm">No generations to display.</p>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {generations.map((gen, i) => (
                    <motion.div
                      key={gen.id}
                      custom={i}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      className={`rounded-xl border bg-slate-900/50 overflow-hidden flex flex-col transition-all duration-300 ${
                        gen.flagged
                          ? "border-red-500/40 shadow-lg shadow-red-900/20"
                          : "border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {/* Media Thumbnail */}
                      <div
                        className={`relative h-44 bg-slate-900 overflow-hidden flex-shrink-0 ${
                          gen.mediaUrl ? "cursor-zoom-in" : ""
                        }`}
                        onClick={() => {
                          if (!gen.mediaUrl) return;
                          setGenerationPreview({
                            url: gen.mediaUrl,
                            assetType: gen.assetType,
                            prompt: gen.prompt,
                            userEmail: gen.userEmail,
                            modelUsed: gen.modelUsed,
                            createdAt: gen.createdAt,
                          });
                        }}
                      >
                        {gen.mediaUrl ? (
                          <img
                            src={gen.mediaUrl}
                            alt="Generated media preview"
                            className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-800/60">
                            <Code2 className="w-10 h-10 text-slate-600" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2">
                          <AssetIcon type={gen.assetType} />
                        </div>
                        {gen.mediaUrl && (
                          <div className="absolute left-2 bottom-2 rounded-md border border-white/25 bg-black/45 px-2 py-0.5 text-[10px] font-semibold text-white">
                            Preview
                          </div>
                        )}
                        {gen.flagged && (
                          <div className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Flag className="w-2.5 h-2.5" /> FLAGGED
                          </div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-slate-900/90 to-transparent pointer-events-none" />
                      </div>

                      {/* Card Body */}
                      <div className="p-4 flex-1 flex flex-col gap-2.5">
                        {/* Prompt */}
                        <div>
                          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1">
                            Prompt
                          </p>
                          <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">{gen.prompt}</p>
                        </div>
                        {/* Meta row */}
                        <div className="flex items-center justify-between text-[11px]">
                          <div>
                            <p className="text-slate-600">User</p>
                            <p className="text-slate-300 font-medium truncate max-w-[120px]">{gen.userEmail}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-slate-600">Model</p>
                            <p className="text-violet-400 font-semibold">{gen.modelUsed}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <div>
                            <p className="text-slate-600">API Cost</p>
                            <p className="text-emerald-400 font-bold">${gen.cost.toFixed(3)}</p>
                          </div>
                          <p className="text-slate-600">{gen.createdAt}</p>
                        </div>
                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-1 mt-auto">
                          <button
                            onClick={() => handleFlagGeneration(gen.id)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border ${
                              gen.flagged
                                ? "bg-amber-600/20 border-amber-500/30 text-amber-400 hover:bg-amber-600/30"
                                : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                            }`}
                          >
                            <Flag className="w-3 h-3" /> {gen.flagged ? "Unflag" : "Flag"}
                          </button>
                          <button
                            onClick={() => handleDeleteGeneration(gen.id)}
                            className="flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ════════ FINANCIALS & TRANSACTIONS ═════════════════════════════ */}
            {activeSection === "financials" && (
              <motion.div
                key="financials"
                variants={sectionVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-6"
              >
                <div>
                  <h1 className="text-2xl font-bold text-white">Financials & Transactions</h1>
                  <p className="text-slate-400 text-sm mt-1">All payment records and subscription events</p>
                  <p className="text-[11px] text-slate-500 mt-1.5">Auto refresh every 10s</p>
                </div>

                {/* Revenue Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    {
                      label: "Total Revenue",
                      value: `$${totalRevenueValue.toFixed(2)}`,
                      sub: "All time",
                      color: "text-emerald-400",
                      border: "border-emerald-500/20",
                    },
                    {
                      label: "This Month",
                      value: `$${thisMonthRevenueValue.toFixed(2)}`,
                      sub: new Date().toLocaleString("en-US", { month: "long", year: "numeric" }),
                      color: "text-blue-400",
                      border: "border-blue-500/20",
                    },
                    {
                      label: "Pending Payments",
                      value: `$${pendingAmountValue.toFixed(2)}`,
                      sub: `${pendingTransactions.length} transaction${pendingTransactions.length === 1 ? "" : "s"}`,
                      color: "text-amber-400",
                      border: "border-amber-500/20",
                    },
                  ].map((item, i) => (
                    <motion.div
                      key={item.label}
                      custom={i}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      className={`rounded-xl border ${item.border} bg-slate-900/50 p-5`}
                    >
                      <p className="text-xs text-slate-500">{item.label}</p>
                      <p className={`text-2xl font-bold mt-1 ${item.color}`}>{item.value}</p>
                      <p className="text-xs text-slate-600 mt-1">{item.sub}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Transactions Table */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-x-auto">
                  <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-white">Transaction Ledger</h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => refreshTransactions()}
                        className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors border border-slate-700 hover:border-slate-500 rounded-md px-2.5 py-1.5"
                        title="Refresh transactions"
                      >
                        <RefreshCw className={`w-3 h-3 ${transactionsRefreshing ? "animate-spin" : ""}`} />
                        Refresh
                      </button>
                      <button className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors">
                        <Download className="w-3 h-3" /> Export CSV
                      </button>
                    </div>
                  </div>
                  <table className="w-full text-sm min-w-[720px]">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/60">
                        {["ID", "User", "Plan", "Amount", "Credits", "Status", "Proof", "Date", "Action"].map((h) => (
                          <th key={h} className="text-left px-5 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {!transactionsLoading && transactions.length === 0 && (
                        <tr>
                          <td className="px-5 py-6 text-sm text-slate-500" colSpan={9}>
                            No transactions yet.
                          </td>
                        </tr>
                      )}
                      {transactions.map((tx, i) => (
                        <motion.tr
                          key={tx.id}
                          custom={i}
                          variants={cardVariants}
                          initial="hidden"
                          animate="visible"
                          className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/20 transition-colors"
                        >
                          <td className="px-5 py-3.5 text-xs text-slate-600 font-mono">{tx.id}</td>
                          <td className="px-5 py-3.5 text-xs text-slate-300 max-w-[160px] truncate">{tx.userEmail}</td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                tx.plan === "ENTERPRISE"
                                  ? "bg-amber-500/15 text-amber-400"
                                  : tx.plan === "PRO"
                                  ? "bg-violet-500/15 text-violet-400"
                                  : "bg-slate-700/60 text-slate-400"
                              }`}
                            >
                              {tx.plan}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-sm font-bold text-emerald-400">${tx.amount.toFixed(2)}</td>
                          <td className="px-5 py-3.5 text-xs text-violet-300 font-semibold">{tx.credits.toLocaleString()}</td>
                          <td className="px-5 py-3.5">
                            <StatusBadge status={tx.paymentStatus} />
                          </td>
                          <td className="px-5 py-3.5">
                            {tx.proofUrl ? (
                              <button
                                onClick={() => setProofPreview({ url: tx.proofUrl!, fileName: tx.proofFileName })}
                                className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-cyan-600/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-600/25"
                              >
                                {tx.proofFileName ? "View Proof" : "Open Receipt"}
                              </button>
                            ) : tx.proofFileName ? (
                              <span
                                className="inline-flex max-w-[220px] truncate rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-300"
                                title={tx.proofFileName}
                              >
                                {tx.proofFileName}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-500">No proof</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">{tx.createdAt}</td>
                          <td className="px-5 py-3.5">
                            {tx.paymentStatus === "PENDING" ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleTransactionStatus(tx.id, "COMPLETED")}
                                  disabled={updatingTxId === tx.id}
                                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 disabled:opacity-50"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleTransactionStatus(tx.id, "FAILED")}
                                  disabled={updatingTxId === tx.id}
                                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30 disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-500">—</span>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* ════════ VISUAL CMS ═════════════════════════════════════════════ */}
            {activeSection === "cms" && (
              <motion.div
                key="cms"
                variants={sectionVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-6 max-w-3xl"
              >
                <div>
                  <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
                    <Paintbrush className="w-6 h-6 text-violet-400" />
                    Visual CMS — No-Code Site Builder
                  </h1>
                  <p className="text-slate-400 text-sm mt-1">
                    Edit platform appearance and content without touching code.
                  </p>
                </div>

                {/* ── Jump to Advanced CMS Tools ── */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => router.push("/admin/cms")}
                    className="rounded-xl border border-violet-500/30 bg-violet-600/10 hover:bg-violet-600/20 p-5 flex items-center gap-3 transition-all group text-left"
                  >
                    <div className="w-9 h-9 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-600/40 transition-colors">
                      <Layers className="w-4 h-4 text-violet-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-200">CMS & Ad Manager</p>
                      <p className="text-xs text-slate-500">Manage pages, ads & campaigns</p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-600 ml-auto flex-shrink-0 group-hover:text-violet-400 transition-colors" />
                  </button>
                  <button
                    onClick={() => router.push("/admin/page-builder")}
                    className="rounded-xl border border-blue-500/30 bg-blue-600/10 hover:bg-blue-600/20 p-5 flex items-center gap-3 transition-all group text-left"
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600/40 transition-colors">
                      <LayoutTemplate className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-200">Visual Page Builder</p>
                      <p className="text-xs text-slate-500">Drag-and-drop block editor</p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-600 ml-auto flex-shrink-0 group-hover:text-blue-400 transition-colors" />
                  </button>
                </div>

                {/* Branding */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-5">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-400" /> Branding & Identity
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Site Name</label>
                      <input
                        value={cmsSettings.siteName}
                        onChange={(e) => setCmsSettings((p) => ({ ...p, siteName: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/25 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Logo URL</label>
                      <input
                        value={cmsSettings.logoUrl}
                        onChange={(e) => setCmsSettings((p) => ({ ...p, logoUrl: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/25 transition-colors"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Primary Theme Color</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={cmsSettings.primaryColor}
                          onChange={(e) => setCmsSettings((p) => ({ ...p, primaryColor: e.target.value }))}
                          className="w-10 h-10 rounded-lg border border-slate-700 bg-slate-800 cursor-pointer p-0.5"
                        />
                        <input
                          value={cmsSettings.primaryColor}
                          onChange={(e) => setCmsSettings((p) => ({ ...p, primaryColor: e.target.value }))}
                          className="flex-1 px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 font-mono focus:outline-none focus:border-violet-500 transition-colors"
                        />
                        <div
                          className="w-10 h-10 rounded-lg border border-slate-600 flex-shrink-0 shadow-inner"
                          style={{ backgroundColor: cmsSettings.primaryColor }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Announcement Banner */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-400" /> Top Announcement Banner
                    </h2>
                    <Toggle
                      value={cmsSettings.bannerActive}
                      onChange={() => setCmsSettings((p) => ({ ...p, bannerActive: !p.bannerActive }))}
                    />
                  </div>
                  <textarea
                    value={cmsSettings.bannerText}
                    onChange={(e) => setCmsSettings((p) => ({ ...p, bannerText: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/25 transition-colors resize-none"
                  />
                  <p className="text-xs text-slate-500">
                    Banner is currently{" "}
                    <span className={cmsSettings.bannerActive ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
                      {cmsSettings.bannerActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </p>
                </div>

                {/* Ads Toggle */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-400" /> Enable Ads Across All Pages
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Toggles ad placement in the dashboard, landing page, and tool pages.
                      </p>
                    </div>
                    <Toggle
                      value={cmsSettings.adsEnabled}
                      onChange={() => setCmsSettings((p) => ({ ...p, adsEnabled: !p.adsEnabled }))}
                    />
                  </div>
                  {cmsSettings.adsEnabled && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-3 text-xs text-amber-400 flex items-center gap-1.5"
                    >
                      <AlertTriangle className="w-3 h-3" /> Ads are now visible to all users.
                    </motion.p>
                  )}
                </div>

                {/* Quick Action Buttons */}
                <div className="grid grid-cols-2 gap-4">
                  <button className="rounded-xl border border-slate-700 bg-slate-900/40 hover:bg-slate-800/60 p-5 flex items-center gap-3 transition-colors group text-left">
                    <div className="w-9 h-9 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-600/30 transition-colors">
                      <CreditCard className="w-4 h-4 text-violet-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-200">Edit Pricing Plans</p>
                      <p className="text-xs text-slate-500">Manage subscriptions & prices</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 ml-auto flex-shrink-0" />
                  </button>
                  <button className="rounded-xl border border-slate-700 bg-slate-900/40 hover:bg-slate-800/60 p-5 flex items-center gap-3 transition-colors group text-left">
                    <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600/30 transition-colors">
                      <ScrollText className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-200">Edit Terms of Service</p>
                      <p className="text-xs text-slate-500">Update legal & privacy policy</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 ml-auto flex-shrink-0" />
                  </button>
                </div>

                {/* Save */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={handleSaveCms}
                    className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-violet-900/40"
                  >
                    <Save className="w-4 h-4" />
                    {cmsSaved ? "Saved!" : "Save All Changes"}
                  </button>
                  <AnimatePresence>
                    {cmsSaved && (
                      <motion.div
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Settings saved successfully
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* ════════ API KEYS MANAGER ════════════════════════════════════════ */}
            {activeSection === "apikeys" && (
              <motion.div
                key="apikeys"
                variants={sectionVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-6"
              >
                <div>
                  <h1 className="text-2xl font-bold text-white">API Keys Manager</h1>
                  <p className="text-slate-400 text-sm mt-1">
                    Manage all third-party service integrations. Handle with care.
                  </p>
                </div>

                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-start gap-3">
                  <Lock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300/80">
                    API keys are masked by default for security. Click the eye icon to reveal. These
                    keys are stored server-side in your <span className="font-mono font-bold">.env</span> file and are never exposed to the client.
                  </p>
                </div>

                <div className="space-y-3">
                  {MOCK_API_KEYS.map((apiKey, i) => (
                    <motion.div
                      key={apiKey.id}
                      custom={i}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 flex items-center gap-4"
                    >
                      <div
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          apiKey.status === "ACTIVE"
                            ? "bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse"
                            : "bg-slate-600"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="text-sm font-semibold text-slate-200">{apiKey.name}</p>
                          <StatusBadge status={apiKey.status} />
                        </div>
                        <p className="text-xs font-mono text-slate-500 truncate">
                          {revealedKeys[apiKey.id] ? apiKey.key : "•".repeat(24)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 hidden sm:block">
                        <p className="text-[10px] text-slate-600">Last used</p>
                        <p className="text-xs text-slate-400">{apiKey.lastUsed}</p>
                        <p className="text-[10px] text-violet-500 mt-0.5">
                          {apiKey.calls.toLocaleString()} calls
                        </p>
                      </div>
                      <button
                        onClick={() => toggleRevealKey(apiKey.id)}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors border border-slate-700 flex-shrink-0"
                        aria-label={revealedKeys[apiKey.id] ? "Hide key" : "Reveal key"}
                      >
                        {revealedKeys[apiKey.id] ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ════════ SYSTEM LOGS ════════════════════════════════════════════ */}
            {activeSection === "logs" && (
              <motion.div
                key="logs"
                variants={sectionVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-6"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                      <TerminalSquare className="w-6 h-6 text-emerald-400" />
                      System Logs
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                      {MOCK_LOGS.length} entries — real-time event stream
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Live
                    </div>
                    <button className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 hover:bg-slate-800 transition-colors">
                      <Download className="w-3 h-3" /> Export
                    </button>
                  </div>
                </div>

                {/* Terminal Window */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/90 overflow-hidden font-mono">
                  {/* Title Bar */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-900/70">
                    <div className="flex gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-red-500/70" />
                      <span className="w-3 h-3 rounded-full bg-amber-500/70" />
                      <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
                    </div>
                    <span className="text-xs text-slate-500 ml-2">platform-logs — /var/log/saad-studio</span>
                  </div>

                  {/* Log Entries */}
                  <div className="p-5 space-y-2 max-h-[60vh] overflow-y-auto">
                    {MOCK_LOGS.map((log, i) => (
                      <motion.div
                        key={log.id}
                        custom={i}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        className="flex items-start gap-3 text-xs group"
                      >
                        <span className="text-slate-700 flex-shrink-0 select-none tabular-nums">
                          {log.timestamp}
                        </span>
                        <span
                          className={`flex-shrink-0 w-12 text-center py-0.5 rounded text-[9px] font-bold uppercase ${
                            log.level === "ERROR"
                              ? "bg-red-500/20 text-red-400"
                              : log.level === "WARN"
                              ? "bg-amber-500/20 text-amber-400"
                              : log.level === "DEBUG"
                              ? "bg-slate-800 text-slate-600"
                              : "bg-blue-500/15 text-blue-400"
                          }`}
                        >
                          {log.level}
                        </span>
                        <span
                          className={`flex-1 leading-relaxed ${
                            log.level === "ERROR"
                              ? "text-red-300"
                              : log.level === "WARN"
                              ? "text-amber-300/80"
                              : log.level === "DEBUG"
                              ? "text-slate-700"
                              : "text-slate-400"
                          }`}
                        >
                          {log.message}
                        </span>
                      </motion.div>
                    ))}
                    {/* Blinking cursor */}
                    <div className="flex items-center gap-2 pt-2 text-xs text-slate-700">
                      <span className="animate-pulse">▌</span>
                      <span>Waiting for new events...</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {generationPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[125] bg-black/80 backdrop-blur-sm p-4 md:p-8"
          >
            <div className="mx-auto h-full max-w-6xl rounded-2xl border border-slate-700 bg-slate-950/95 shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-800">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-200 truncate">Generation Preview</p>
                  <p className="text-xs text-slate-400 truncate">
                    {generationPreview.userEmail} • {generationPreview.modelUsed} • {generationPreview.createdAt}
                  </p>
                </div>
                <button
                  onClick={() => setGenerationPreview(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700"
                >
                  Close
                </button>
              </div>
              <div className="px-4 py-3 border-b border-slate-800">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Prompt</p>
                <p className="text-sm text-slate-300">{generationPreview.prompt}</p>
              </div>
              <div className="flex-1 min-h-0 bg-slate-900/40">
                {isVideoGenerationPreview ? (
                  <div className="w-full h-full flex items-center justify-center p-3">
                    <video src={generationPreview.url} controls className="max-h-full w-auto max-w-full rounded-lg border border-slate-700" />
                  </div>
                ) : isAudioGenerationPreview ? (
                  <div className="w-full h-full flex items-center justify-center p-6">
                    <audio src={generationPreview.url} controls className="w-full max-w-2xl" />
                  </div>
                ) : (
                  <div className="w-full h-full overflow-auto p-3 flex items-start justify-center">
                    <img
                      src={generationPreview.url}
                      alt="Generated content preview"
                      className="max-w-full h-auto rounded-lg border border-slate-700"
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {proofPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm p-4 md:p-8"
          >
            <div className="mx-auto h-full max-w-5xl rounded-2xl border border-slate-700 bg-slate-950/95 shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-800">
                <p className="text-sm font-semibold text-slate-200 truncate">
                  {proofPreview.fileName || "Payment Proof Preview"}
                </p>
                <div className="flex items-center gap-2">
                  <a
                    href={proofPreview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-600/30"
                  >
                    Open Tab
                  </a>
                  <button
                    onClick={() => setProofPreview(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 bg-slate-900/40">
                {isPdfProof ? (
                  <iframe
                    src={proofPreview.url}
                    title="Payment Proof PDF"
                    className="w-full h-full border-0"
                  />
                ) : (
                  <div className="w-full h-full overflow-auto p-3 flex items-start justify-center">
                    <img
                      src={proofPreview.url}
                      alt={proofPreview.fileName || "Payment proof"}
                      className="max-w-full h-auto rounded-lg border border-slate-700"
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
