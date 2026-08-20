"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  Mail,
  Users,
  Search,
  Plus,
  Trash2,
  Download,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Send,
  Loader2,
  UserCheck,
  Bot,
  Wand2,
  Layers,
  Image as ImageIcon,
  ExternalLink,
  Edit3,
  Flame,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  Eye,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { NewsletterSubscriberItem } from "@/lib/newsletter";
import { NewsletterPayload } from "@/app/api/admin/newsletter/agent/route";

const DEFAULT_PAYLOAD: NewsletterPayload = {
  subject: "✨ What's New in Saad Studio: Grok Imagine 2.0 & Multi-Cam AI",
  heroTag: "Interesting AI",
  heroTitle: "Next-Gen Generative Suite: Ultra-Fidelity 4K & Real-time AI Assembly",
  heroImage: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80",
  heroBody: `Smart generative tools never look back when creators push the boundaries. Today, we're launching the next leap in high-speed visual computing on Saad Studio.\n\nWith our newly optimized pipeline, models like Grok Imagine 2.0 and SDXL Turbo render in seconds with full lighting consistency and zero latency.`,
  heroCtaText: "Check it out here ➜",
  heroCtaUrl: "https://www.saadstudio.app",
  notableToolsTitle: "Notable AI Tools & Features",
  notableTools: [
    { icon: "🎨", name: "Grok Imagine 2.0", description: "Photorealistic generations with direct quality controls.", url: "https://www.saadstudio.app/image-studio" },
    { icon: "🎬", name: "Multi-Cam Auto Switcher", description: "Auto speaker tracking & seamless timeline assembly.", url: "https://www.saadstudio.app/video-studio" },
    { icon: "⚡", name: "Style Presets Library", description: "One-click cinematic prompt hydration catalogue.", url: "https://www.saadstudio.app/image-presets" },
  ],
  sourceUpdatesTitle: "From the Source",
  sourceUpdates: [
    { icon: "🔍", name: "Universal Media Storage", description: "Zero-loss B2 & S3 asset streaming.", url: "https://www.saadstudio.app" },
    { icon: "📡", name: "CEP Premiere 26.2.0 Extension", description: "Direct Premiere Pro plugin integration.", url: "https://www.saadstudio.app" },
  ],
  promptOfDayTitle: "Prompt of the Day",
  promptOfDayName: "Cinematic Volumetric Studio Masterpiece",
  promptOfDayText: "A breathtaking hyper-realistic cinematic portrait, dramatic volumetric lighting, anamorphic reflections, 8k resolution, photorealistic masterpiece --ar 16:9",
  sponsorNote: "Reach top creators and AI professionals worldwide with Saad Studio AI.",
};

export default function AdminNewsletterPage() {
  const [activeTab, setActiveTab] = useState<"agent" | "subscribers">("agent");

  // Subscribers state
  const [subscribers, setSubscribers] = useState<NewsletterSubscriberItem[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [search, setSearch] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [addingSub, setAddingSub] = useState(false);
  const [copied, setCopied] = useState(false);

  // Agent State
  const [agentPrompt, setAgentPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [newsletterData, setNewsletterData] = useState<NewsletterPayload>(DEFAULT_PAYLOAD);
  const [sending, setSending] = useState(false);
  const [targetAudience, setTargetAudience] = useState<"newsletter_subscribers" | "active_subscribers">("newsletter_subscribers");
  const [sendResult, setSendResult] = useState<{ total?: number; sent?: number; error?: string } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fetchSubscribers = useCallback(async () => {
    setLoadingSubs(true);
    try {
      const res = await fetch("/api/admin/newsletter");
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data?.subscribers)) {
        setSubscribers(data.subscribers);
      } else {
        setSubscribers([]);
      }
    } catch {
      setSubscribers([]);
    } finally {
      setLoadingSubs(false);
    }
  }, []);

  useEffect(() => {
    void fetchSubscribers();
  }, [fetchSubscribers]);

  const handleGenerateWithAI = async (promptToUse?: string) => {
    const p = promptToUse || agentPrompt;
    if (!p.trim()) return;

    setGenerating(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/admin/newsletter/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", prompt: p.trim() }),
      });
      const data = await res.json();
      if (res.ok && data?.data) {
        setNewsletterData(data.data);
      } else {
        alert(data.error || "Failed to generate newsletter with AI");
      }
    } catch (err) {
      alert("Error generating newsletter: " + String(err));
    } finally {
      setGenerating(false);
    }
  };

  const handleSendBroadcast = async () => {
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/admin/newsletter/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_broadcast",
          data: newsletterData,
          targetAudience,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setSendResult({
          total: data.totalRecipients || 0,
          sent: data.sentCount || 0,
        });
        setShowConfirmModal(false);
      } else {
        setSendResult({ error: data.error || "Failed to send newsletter broadcast." });
      }
    } catch (err) {
      setSendResult({ error: "Network error sending newsletter: " + String(err) });
    } finally {
      setSending(false);
    }
  };

  const handleAddSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes("@")) return;

    setAddingSub(true);
    try {
      const res = await fetch("/api/admin/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail.trim(), source: "admin_manual" }),
      });
      if (res.ok) {
        setNewEmail("");
        await fetchSubscribers();
      }
    } finally {
      setAddingSub(false);
    }
  };

  const handleDeleteSubscriber = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to remove "${email}"?`)) return;

    try {
      const res = await fetch(`/api/admin/newsletter?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSubscribers((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {
      alert("Failed to delete subscriber");
    }
  };

  const handleCopyAll = () => {
    const activeEmails = subscribers
      .filter((s) => s.status === "active")
      .map((s) => s.email)
      .join(", ");

    if (!activeEmails) return;
    navigator.clipboard.writeText(activeEmails);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleExportCSV = () => {
    if (!subscribers.length) return;
    const headers = ["ID,Email,Source,Status,SubscribedAt"];
    const rows = subscribers.map(
      (s) => `"${s.id}","${s.email}","${s.source}","${s.status}","${s.createdAt}"`
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `saad-studio-newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredSubs = subscribers.filter(
    (s) =>
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.source.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = subscribers.filter((s) => s.status === "active").length;

  return (
    <AdminShell activeRoute="/admin/newsletter">
      <div className="p-6 md:p-8 space-y-6 max-w-7xl">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Bot className="w-6 h-6 text-cyan-400" />
              <span>Newsletter AI Agent & Hub</span>
            </h1>
            <p className="text-xs md:text-sm text-zinc-400">
              Generate curated multi-block AI newsletters with images, prompt guides, and drops — and broadcast directly to subscribers.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center p-1 rounded-2xl bg-zinc-950 border border-white/10 shrink-0">
            <button
              onClick={() => setActiveTab("agent")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === "agent"
                  ? "bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-500/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Newsletter Agent</span>
            </button>
            <button
              onClick={() => setActiveTab("subscribers")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === "subscribers"
                  ? "bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-500/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Subscribers ({subscribers.length})</span>
            </button>
          </div>
        </div>

        {/* TAB 1: AI NEWSLETTER AGENT */}
        {activeTab === "agent" && (
          <div className="space-y-6">
            {/* Top Agent Prompt & Generator Suite */}
            <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-950 to-[#0b101d] p-6 md:p-8 shadow-2xl backdrop-blur-xl space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  <Wand2 className="w-4 h-4" />
                  <span>Ask the Editorial AI Agent</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-400">Target Audience:</span>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value as any)}
                    className="rounded-lg border border-white/10 bg-black/60 px-2.5 py-1 text-xs text-white outline-none"
                  >
                    <option value="newsletter_subscribers">Newsletter Leads ({activeCount})</option>
                    <option value="active_subscribers">Paid Active Subscribers</option>
                  </select>
                </div>
              </div>

              {/* Textarea Input */}
              <div className="relative">
                <textarea
                  rows={3}
                  value={agentPrompt}
                  onChange={(e) => setAgentPrompt(e.target.value)}
                  placeholder="اكتب للوكيل ماذا تريد أن ينشر (مثال: أطلقنا نموذج Grok Imagine 2.0 الجديد لتوليد صور سينمائية فائقة الدقة، ورتب نشرة مع ميزة Multi-Cam وبرومبت اليوم وصورة بصرية جذابة)..."
                  className="w-full rounded-2xl border border-white/10 bg-black/50 p-4 text-xs md:text-sm text-white placeholder-zinc-500 outline-none focus:border-cyan-400/50 transition-colors"
                />
              </div>

              {/* Quick Preset Ideas */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-zinc-400">Quick Templates:</span>
                {[
                  "Weekly AI Models & Feature Drops on Saad Studio",
                  "Cinematic 8K Photorealistic Prompt & Lighting Guide",
                  "Grok Imagine 2.0 & Multi-Cam Studio Launch Edition",
                  "From the Source: Open Source Breakthroughs & Creative AI",
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAgentPrompt(preset);
                      void handleGenerateWithAI(preset);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-cyan-500/10 hover:border-cyan-500/30 text-[11px] text-zinc-300 transition-all flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>{preset}</span>
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => handleGenerateWithAI()}
                  disabled={generating || !agentPrompt.trim()}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-40 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Writing Newsletter & Generating Visuals...</span>
                    </>
                  ) : (
                    <>
                      <Bot className="w-4 h-4" />
                      <span>Generate Newsletter with AI ✨</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  disabled={sending || generating}
                  className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Broadcast to Subscribers 🚀</span>
                </button>
              </div>

              {sendResult && (
                <div
                  className={`p-4 rounded-2xl border text-xs flex items-center gap-3 ${
                    sendResult.error
                      ? "bg-rose-500/10 border-rose-500/20 text-rose-300"
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                  }`}
                >
                  {sendResult.error ? (
                    <>
                      <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                      <span>{sendResult.error}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <span>
                        Successfully broadcasted to {sendResult.sent} / {sendResult.total} subscribers! ✨
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Split Screen: Left Editor & Right Exact Multi-Card Email Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Interactive Field Customizer */}
              <div className="lg:col-span-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-cyan-400" />
                    <span>Customize Generated Sections</span>
                  </h3>
                  <span className="text-[11px] text-zinc-500 font-mono">Live Editable</span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5 backdrop-blur-xl space-y-4 text-xs">
                  {/* Subject Line */}
                  <div className="space-y-1.5">
                    <label className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                      Email Subject Line
                    </label>
                    <input
                      type="text"
                      value={newsletterData.subject}
                      onChange={(e) => setNewsletterData({ ...newsletterData, subject: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-white outline-none focus:border-cyan-400/50"
                    />
                  </div>

                  {/* Hero Tag & Hero Title */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                        Tag (e.g. Interesting AI)
                      </label>
                      <input
                        type="text"
                        value={newsletterData.heroTag}
                        onChange={(e) => setNewsletterData({ ...newsletterData, heroTag: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-cyan-400/50"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                        Hero Story Headline
                      </label>
                      <input
                        type="text"
                        value={newsletterData.heroTitle}
                        onChange={(e) => setNewsletterData({ ...newsletterData, heroTitle: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-cyan-400/50"
                      />
                    </div>
                  </div>

                  {/* Hero Image URL */}
                  <div className="space-y-1.5">
                    <label className="text-zinc-400 font-bold uppercase tracking-wider text-[10px] flex items-center justify-between">
                      <span>Hero Spotlight Image URL</span>
                      <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                    </label>
                    <input
                      type="text"
                      value={newsletterData.heroImage || ""}
                      onChange={(e) => setNewsletterData({ ...newsletterData, heroImage: e.target.value })}
                      placeholder="https://... image url"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-white outline-none focus:border-cyan-400/50"
                    />
                  </div>

                  {/* Hero Story Body */}
                  <div className="space-y-1.5">
                    <label className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                      Main Story Paragraphs
                    </label>
                    <textarea
                      rows={4}
                      value={newsletterData.heroBody}
                      onChange={(e) => setNewsletterData({ ...newsletterData, heroBody: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white outline-none focus:border-cyan-400/50"
                    />
                  </div>

                  {/* CTA Text & URL */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                        Hero Button Text
                      </label>
                      <input
                        type="text"
                        value={newsletterData.heroCtaText}
                        onChange={(e) => setNewsletterData({ ...newsletterData, heroCtaText: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                        Hero Button URL
                      </label>
                      <input
                        type="text"
                        value={newsletterData.heroCtaUrl}
                        onChange={(e) => setNewsletterData({ ...newsletterData, heroCtaUrl: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white outline-none"
                      />
                    </div>
                  </div>

                  {/* Prompt of the Day Editor */}
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <label className="text-zinc-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5 text-amber-400">
                      <Flame className="w-3.5 h-3.5" />
                      <span>Prompt of the Day</span>
                    </label>
                    <input
                      type="text"
                      value={newsletterData.promptOfDayName}
                      onChange={(e) => setNewsletterData({ ...newsletterData, promptOfDayName: e.target.value })}
                      placeholder="Prompt Title"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white outline-none mb-2"
                    />
                    <textarea
                      rows={3}
                      value={newsletterData.promptOfDayText}
                      onChange={(e) => setNewsletterData({ ...newsletterData, promptOfDayText: e.target.value })}
                      placeholder="Prompt Text..."
                      className="w-full rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-[11px] text-amber-300 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Live Multi-Card Email Layout Preview (Matches User's Reference Screenshot) */}
              <div className="lg:col-span-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Eye className="w-4 h-4 text-emerald-400" />
                    <span>Live Multi-Card Newsletter Preview</span>
                  </h3>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Exact Email Layout
                  </span>
                </div>

                {/* Email Canvas Container */}
                <div className="rounded-3xl border border-white/10 bg-[#e2e8f0] p-4 md:p-6 shadow-2xl overflow-y-auto max-h-[850px]">
                  <div className="max-w-[540px] mx-auto space-y-4 font-sans text-slate-800">
                    {/* Header */}
                    <div className="bg-[#0f172a] rounded-2xl p-5 text-center border-b-2 border-cyan-500 shadow-md">
                      <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-white/20 mx-auto mb-2 flex items-center justify-center overflow-hidden">
                        <Image src="/logo-saad.png?v=5" alt="Logo" width={38} height={38} unoptimized />
                      </div>
                      <div className="text-sm font-black text-white tracking-widest uppercase">SAAD STUDIO</div>
                      <div className="text-[10px] font-bold text-cyan-400 tracking-wider uppercase mt-0.5">
                        OFFICIAL AI DISPATCH • TODAY
                      </div>
                    </div>

                    {/* CARD 1: MAIN SPOTLIGHT (INTERESTING AI) */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3.5">
                      <div className="text-xs font-black text-orange-600 uppercase tracking-wide">
                        {newsletterData.heroTag || "Interesting AI"}
                      </div>

                      {newsletterData.heroImage && (
                        <div className="rounded-xl overflow-hidden border border-slate-200 aspect-video relative bg-slate-100">
                          <img
                            src={newsletterData.heroImage}
                            alt={newsletterData.heroTitle}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <h2 className="text-base md:text-lg font-extrabold text-slate-900 leading-snug">
                        {newsletterData.heroTitle}
                      </h2>

                      <div className="text-xs leading-relaxed text-slate-600 space-y-2">
                        {newsletterData.heroBody.split(/\r?\n/).map((p, idx) =>
                          p.trim() ? <p key={idx}>{p}</p> : <div key={idx} className="h-1" />
                        )}
                      </div>

                      <div>
                        <span className="inline-block px-4 py-2 rounded-lg bg-slate-900 text-white font-bold text-xs">
                          {newsletterData.heroCtaText || "Check it out here ➜"}
                        </span>
                      </div>
                    </div>

                    {/* CARD 2: NOTABLE AI TOOLS */}
                    {newsletterData.notableTools && newsletterData.notableTools.length > 0 && (
                      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
                        <div className="text-xs font-black text-orange-600 uppercase tracking-wide">
                          Notable AIs
                        </div>
                        <h3 className="text-sm font-extrabold text-slate-900">
                          {newsletterData.notableToolsTitle || "Notable AI Tools"}
                        </h3>
                        <div className="space-y-2 text-xs leading-relaxed text-slate-600">
                          {newsletterData.notableTools.map((tool, idx) => (
                            <div key={idx} className="flex items-start gap-1.5">
                              <span className="shrink-0">{tool.icon || "🔍"}</span>
                              <div>
                                <strong className="text-slate-900">{tool.name}</strong>: {tool.description}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CARD 3: SPONSOR / NOTE */}
                    {newsletterData.sponsorNote && (
                      <div className="bg-slate-100/90 rounded-xl p-3.5 border border-slate-200 text-center text-xs text-slate-500">
                        {newsletterData.sponsorNote}
                      </div>
                    )}

                    {/* CARD 4: FROM THE SOURCE / DROPS */}
                    {newsletterData.sourceUpdates && newsletterData.sourceUpdates.length > 0 && (
                      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
                        <div className="text-xs font-black text-orange-600 uppercase tracking-wide">
                          Open Source &amp; Drops
                        </div>
                        <h3 className="text-sm font-extrabold text-slate-900">
                          {newsletterData.sourceUpdatesTitle || "From the Source"}
                        </h3>
                        <div className="space-y-2 text-xs leading-relaxed text-slate-600">
                          {newsletterData.sourceUpdates.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-1.5">
                              <span className="shrink-0">{item.icon || "📡"}</span>
                              <div>
                                <strong className="text-slate-900">{item.name}</strong>: {item.description}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CARD 5: PROMPT OF THE DAY */}
                    {newsletterData.promptOfDayText && (
                      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
                        <div className="text-xs font-black text-orange-600 uppercase tracking-wide">
                          Prompt of the Day
                        </div>
                        <h3 className="text-sm font-extrabold text-slate-900">
                          {newsletterData.promptOfDayName || "Prompt of the Day"}
                        </h3>

                        <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-200 text-[11px] leading-relaxed text-orange-950 font-mono space-y-1">
                          <div className="font-bold text-orange-900 uppercase text-[10px]">
                            Copy &amp; Paste Prompt:
                          </div>
                          <p>{newsletterData.promptOfDayText}</p>
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="bg-[#0f172a] rounded-2xl p-5 text-center text-xs text-slate-400 space-y-1">
                      <div className="font-bold text-white">Saad Studio AI Suite</div>
                      <div className="text-[10px] text-slate-500">© 2026 Saad Studio. All rights reserved.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SUBSCRIBERS LIST */}
        {activeTab === "subscribers" && (
          <div className="space-y-6">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400">Total Captured Leads</span>
                  <Users className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="mt-2 text-2xl font-black text-white">{subscribers.length}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400">Active Audience</span>
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="mt-2 text-2xl font-black text-white">
                  {activeCount} <span className="text-xs font-normal text-emerald-400 ml-2">Deliverable</span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400">Capture Source</span>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>
                <div className="mt-2 text-sm font-bold text-zinc-200">Site Footer (Stay in the loop)</div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5 backdrop-blur-xl space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search subscribers by email or source..."
                    className="w-full rounded-xl border border-white/10 bg-black/40 pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-cyan-400/50"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyAll}
                    disabled={!subscribers.length}
                    className="px-3.5 py-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] disabled:opacity-40 text-xs font-semibold text-zinc-200 flex items-center gap-1.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                    <span>{copied ? "Copied All!" : "Copy Emails"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportCSV}
                    disabled={!subscribers.length}
                    className="px-3.5 py-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] disabled:opacity-40 text-xs font-semibold text-zinc-200 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Export CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={fetchSubscribers}
                    disabled={loadingSubs}
                    className="p-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-zinc-400 hover:text-white"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingSubs ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Add subscriber form */}
              <form onSubmit={handleAddSubscriber} className="pt-3 border-t border-white/5 flex items-center gap-2 max-w-lg">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Add subscriber manually (e.g. user@domain.com)"
                  className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-cyan-400/50"
                />
                <button
                  type="submit"
                  disabled={addingSub || !newEmail.trim()}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-bold text-xs flex items-center gap-1.5 shrink-0"
                >
                  {addingSub ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Add</span>
                </button>
              </form>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-white/10 bg-zinc-950/70 overflow-hidden shadow-2xl backdrop-blur-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.02] border-b border-white/10 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-5 py-3.5">Subscriber Email</th>
                      <th className="px-5 py-3.5">Source</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-zinc-300 font-sans">
                    {loadingSubs ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-12 text-center text-zinc-500">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
                          <span>Loading newsletter subscribers...</span>
                        </td>
                      </tr>
                    ) : filteredSubs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-12 text-center text-zinc-500">
                          <Mail className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                          <div className="text-sm font-semibold text-zinc-400">No subscribers found</div>
                        </td>
                      </tr>
                    ) : (
                      filteredSubs.map((item) => (
                        <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-3.5 font-semibold text-white flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{item.email}</span>
                          </td>
                          <td className="px-5 py-3.5 text-zinc-400 capitalize">
                            <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/5">
                              {item.source.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              {item.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-zinc-500 font-mono text-[11px]">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteSubscriber(item.id, item.email)}
                              className="p-1.5 rounded-lg border border-white/5 bg-white/[0.02] text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal for Broadcast */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl space-y-5">
              <div className="flex items-center gap-3 text-cyan-400">
                <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                  <Bot className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Broadcast AI Newsletter</h3>
                  <p className="text-xs text-zinc-400">Deliver this curated edition to all active subscribers.</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900 border border-white/5 space-y-2 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Subject:</span>
                  <span className="text-white font-bold max-w-[200px] truncate">{newsletterData.subject}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Target Audience:</span>
                  <span className="text-cyan-300 font-bold uppercase">{targetAudience.replace("_", " ")}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Sections Included:</span>
                  <span className="text-emerald-400 font-bold">Spotlight, Tools, Source, Prompt</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={sending}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendBroadcast}
                  disabled={sending}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/30"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>{sending ? "Broadcasting..." : "Confirm & Send"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
