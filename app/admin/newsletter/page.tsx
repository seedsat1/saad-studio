"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Upload,
  Image as ImageIcon,
  ExternalLink,
  Edit3,
  Flame,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  Eye,
  Globe,
  Languages,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { NewsletterSubscriberItem } from "@/lib/newsletter";
import { NewsletterPayload } from "@/app/api/admin/newsletter/agent/route";

const DEFAULT_ARABIC_PAYLOAD: NewsletterPayload = {
  language: "ar",
  subject: "✨ أحدث إطلاقات سعد ستوديو: نموذج Grok Imagine 2.0 وميزة الـ Multi-Cam",
  heroTag: "إضاءة الأسبوع",
  heroTitle: "محركات التوليد السينمائي الفائق: دقة 4K ومعالجة لحظية للمشاهد",
  heroImage: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80",
  heroBody: `يسرنا أن نعلن عن إطلاق أحدث التحديثات الإبداعية في منصة سعد ستوديو لتسهيل صناعة المحتوى البصري والسينمائي باحترافية كاملة.\n\nمع ترقية خوارزميات التوليد، يمكنك الآن استخدام نموذج Grok Imagine 2.0 لإنشاء لقطات واقعية مع محاذاة تلقائية للإضاءة والألوان، بالإضافة إلى ميزة التقطيع الذكي للفيديو Multi-Cam.`,
  heroCtaText: "جرب الميزة الآن في سعد ستوديو ➜",
  heroCtaUrl: "https://www.saadstudio.app/image-studio",
  notableToolsTitle: "أبرز أدوات ونماذج سعد ستوديو",
  notableTools: [
    { icon: "🎨", name: "Grok Imagine 2.0", description: "توليد صور سينمائية فائقة الواقعية مع تحكم كامل بالدقة والإضاءة.", url: "https://www.saadstudio.app/image-studio" },
    { icon: "🎬", name: "Multi-Cam Auto Switcher", description: "اكتشاف تلقائي لحركة المتحدث وتركيب مشاهد الفيديو باحترافية.", url: "https://www.saadstudio.app/video-studio" },
    { icon: "⚡", name: "مكتبة الستايلات والبرومبت", description: "حقن فوري لأقوى البرومبتات الفنية الجاهزة بنقرة واحدة.", url: "https://www.saadstudio.app/image-presets" },
  ],
  sourceUpdatesTitle: "تحديثات وتطويرات المنصة",
  sourceUpdates: [
    { icon: "🔍", name: "التخزين السحابي فائق السرعة", description: "بث وسائط خالي من الأخطاء ودعم كامل لـ B2 و S3.", url: "https://www.saadstudio.app" },
    { icon: "🚀", name: "إضافة Premiere Pro 26.2.0", description: "تكامل مباشر وسلس داخل برنامج أدوبي بريمير.", url: "https://www.saadstudio.app" },
  ],
  promptOfDayTitle: "برومبت اليوم الإبداعي",
  promptOfDayName: "لوحة بورتريه سينمائية بإضاءة ثلاثية الأبعاد",
  promptOfDayText: "A breathtaking hyper-realistic cinematic portrait, dramatic volumetric studio lighting, anamorphic reflections, 8k resolution, photorealistic masterpiece --ar 16:9",
};

export default function AdminNewsletterPage() {
  const [activeTab, setActiveTab] = useState<"agent" | "subscribers">("agent");
  const [selectedLanguage, setSelectedLanguage] = useState<"ar" | "en">("ar");
  const [selectedImageModel, setSelectedImageModel] = useState<"nano-banana-pro" | "gpt-image-2">("nano-banana-pro");

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
  const [generatingImg, setGeneratingImg] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [customImgPrompt, setCustomImgPrompt] = useState("");
  const [newsletterData, setNewsletterData] = useState<NewsletterPayload>(DEFAULT_ARABIC_PAYLOAD);
  const [sending, setSending] = useState(false);
  const [targetAudience, setTargetAudience] = useState<"newsletter_subscribers" | "active_subscribers">("newsletter_subscribers");
  const [sendResult, setSendResult] = useState<{ total?: number; sent?: number; error?: string } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
        body: JSON.stringify({
          action: "generate",
          prompt: p.trim(),
          language: selectedLanguage,
          model: selectedImageModel,
        }),
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

  const handleGenerateImageOnly = async () => {
    const p = customImgPrompt.trim() || newsletterData.heroTitle || "Cinematic futuristic creative AI visual art masterpiece 8k";
    setGeneratingImg(true);
    try {
      const res = await fetch("/api/admin/newsletter/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_image",
          prompt: p,
          model: selectedImageModel,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.imageUrl) {
        setNewsletterData((prev) => ({ ...prev, heroImage: data.imageUrl }));
        setCustomImgPrompt("");
      } else {
        alert(data?.error || "Failed to generate image.");
      }
    } catch (e) {
      alert("Error generating image: " + String(e));
    } finally {
      setGeneratingImg(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImg(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("assetType", "image");

      const res = await fetch("/api/studio/upload-url", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const { publicUrl } = await res.json();
        if (publicUrl) {
          setNewsletterData((prev) => ({ ...prev, heroImage: publicUrl }));
        }
      } else {
        alert("Upload failed");
      }
    } catch (err) {
      alert("Upload error: " + String(err));
    } finally {
      setUploadingImg(false);
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
  const isAr = newsletterData.language === "ar";

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
              الوكيل الذكي لصياغة وترتيب وإرسال النشرات الإخبارية للمشتركين بهوية وتصميم سعد ستوديو الفاخر.
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
              <span>الوكيل الذكي (AI Agent)</span>
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
              <span>المشتركون ({subscribers.length})</span>
            </button>
          </div>
        </div>

        {/* TAB 1: AI NEWSLETTER AGENT */}
        {activeTab === "agent" && (
          <div className="space-y-6">
            {/* Agent Command Center Card */}
            <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-950 to-[#0b101d] p-6 md:p-8 shadow-2xl backdrop-blur-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  <Wand2 className="w-4 h-4" />
                  <span>توجيه الوكيل الذكي (AI Editorial Prompt)</span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Language Selector */}
                  <div className="flex items-center gap-1.5 bg-black/60 border border-white/10 rounded-xl p-1 text-xs">
                    <Languages className="w-3.5 h-3.5 text-cyan-400 ml-1.5" />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLanguage("ar");
                        setNewsletterData((prev) => ({ ...prev, language: "ar" }));
                      }}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                        selectedLanguage === "ar"
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      🇸🇦 العربية
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLanguage("en");
                        setNewsletterData((prev) => ({ ...prev, language: "en" }));
                      }}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                        selectedLanguage === "en"
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      🇬🇧 English
                    </button>
                  </div>

                  {/* Target Audience */}
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value as any)}
                    className="rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white outline-none"
                  >
                    <option value="newsletter_subscribers">مشتركو النشرة ({activeCount})</option>
                    <option value="active_subscribers">جميع المشتركين الفعّالين</option>
                  </select>
                </div>
              </div>

              {/* Textarea Input */}
              <div className="relative">
                <textarea
                  rows={3}
                  value={agentPrompt}
                  onChange={(e) => setAgentPrompt(e.target.value)}
                  placeholder="اكتب هنا ماذا تريد من الوكيل أن ينشر (مثال: أطلقنا تحديثاً ضخماً يشمل نموذج Grok Imagine 2.0 وميزة الـ Multi-Cam في استوديو الفيديو، اكتب نشرة تفاعلية مع نصائح وبرومبت اليوم)..."
                  className="w-full rounded-2xl border border-white/10 bg-black/50 p-4 text-xs md:text-sm text-white placeholder-zinc-500 outline-none focus:border-cyan-400/50 transition-colors leading-relaxed"
                />
              </div>

              {/* Quick Preset Ideas */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-zinc-400">أفكار جاهزة:</span>
                {[
                  "إطلاق نموذج Grok Imagine 2.0 وميزة Multi-Cam في سعد ستوديو",
                  "دليل البرومبت السينمائي وإضاءات الـ 8K ثلاثية الأبعاد",
                  "نشرة التحديثات الأسبوعية وتطويرات سرعة التوليد",
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
                      <span>جاري كتابة النشرة وتوليد الصورة الذكية...</span>
                    </>
                  ) : (
                    <>
                      <Bot className="w-4 h-4" />
                      <span>توليد النشرة بالذكاء الاصطناعي ✨</span>
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
                  <span>إرسال النشرة للمشتركين الآن 🚀</span>
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
                        تم إرسال النشرة بنجاح إلى {sendResult.sent} / {sendResult.total} من المشتركين! ✨
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Split Screen: Left Controls & Right Luxury Live Email Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Interactive Field Customizer & Direct Image Tools */}
              <div className="lg:col-span-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-cyan-400" />
                    <span>تخصيص محتوى وصور النشرة</span>
                  </h3>
                  <span className="text-[11px] text-zinc-500 font-mono">تعديل مباشر</span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5 backdrop-blur-xl space-y-4 text-xs">
                  {/* Subject Line */}
                  <div className="space-y-1.5">
                    <label className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                      عنوان الإيميل (Subject Line)
                    </label>
                    <input
                      type="text"
                      value={newsletterData.subject}
                      onChange={(e) => setNewsletterData({ ...newsletterData, subject: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-white outline-none focus:border-cyan-400/50"
                    />
                  </div>

                  {/* Hero Image Management Box: Direct Upload & AI Generator */}
                  <div className="space-y-2.5 p-4 rounded-2xl bg-[#090e1c] border border-white/10">
                    <div className="flex items-center justify-between">
                      <label className="text-zinc-300 font-bold text-xs flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-cyan-400" />
                        <span>صورة الغلاف البصرية (Cover Image)</span>
                      </label>
                      {newsletterData.heroImage && (
                        <button
                          type="button"
                          onClick={() => setNewsletterData({ ...newsletterData, heroImage: undefined })}
                          className="text-[10px] text-rose-400 hover:underline"
                        >
                          إزالة الصورة
                        </button>
                      )}
                    </div>

                    {/* Thumbnail Preview */}
                    {newsletterData.heroImage && (
                      <div className="rounded-xl overflow-hidden border border-white/15 aspect-video relative bg-black/40 shadow-inner">
                        <img
                          src={newsletterData.heroImage}
                          alt="Hero cover"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Model Choice for Image Generation */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-white/5 text-[11px]">
                      <span className="text-zinc-400 font-semibold">نموذج توليد الصورة:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedImageModel("nano-banana-pro")}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                            selectedImageModel === "nano-banana-pro"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : "text-zinc-400 hover:text-white bg-black/40 border border-white/5"
                          }`}
                        >
                          🍌 Nano Banana Pro (Google)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedImageModel("gpt-image-2")}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                            selectedImageModel === "gpt-image-2"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : "text-zinc-400 hover:text-white bg-black/40 border border-white/5"
                          }`}
                        >
                          🧠 GPT-Image-2 (OpenAI)
                        </button>
                      </div>
                    </div>

                    {/* Action Buttons: AI Generate or Upload from PC */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImg}
                        className="px-3 py-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                      >
                        {uploadingImg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-cyan-400" />}
                        <span>رفع صورة من الجهاز</span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />

                      <button
                        type="button"
                        onClick={handleGenerateImageOnly}
                        disabled={generatingImg}
                        className="px-3 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500/25 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                      >
                        {generatingImg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-cyan-400" />}
                        <span>توليد صورة بـ {selectedImageModel === "nano-banana-pro" ? "Nano Banana" : "GPT-Image"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Hero Tag & Hero Title */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                        الشارة (Badge Tag)
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
                        عنوان القصة الرئيسية
                      </label>
                      <input
                        type="text"
                        value={newsletterData.heroTitle}
                        onChange={(e) => setNewsletterData({ ...newsletterData, heroTitle: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-cyan-400/50"
                      />
                    </div>
                  </div>

                  {/* Hero Story Body */}
                  <div className="space-y-1.5">
                    <label className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                      نص القصة والخبر الرئيسي
                    </label>
                    <textarea
                      rows={4}
                      value={newsletterData.heroBody}
                      onChange={(e) => setNewsletterData({ ...newsletterData, heroBody: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white outline-none focus:border-cyan-400/50 leading-relaxed"
                    />
                  </div>

                  {/* CTA Text & URL */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                        نص الزر التفاعلي
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
                        رابط الزر (URL)
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
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <label className="text-zinc-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5 text-amber-400">
                      <Flame className="w-3.5 h-3.5" />
                      <span>برومبت اليوم الإبداعي (Prompt of the Day)</span>
                    </label>
                    <input
                      type="text"
                      value={newsletterData.promptOfDayName}
                      onChange={(e) => setNewsletterData({ ...newsletterData, promptOfDayName: e.target.value })}
                      placeholder="عنوان البرومبت"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white outline-none mb-1"
                    />
                    <textarea
                      rows={3}
                      value={newsletterData.promptOfDayText}
                      onChange={(e) => setNewsletterData({ ...newsletterData, promptOfDayText: e.target.value })}
                      placeholder="نص البرومبت الإنجليزي القابل للنسخ والتجربة..."
                      className="w-full rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-[11px] text-amber-300 outline-none leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Live Luxury Saad Studio Email Preview */}
              <div className="lg:col-span-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Eye className="w-4 h-4 text-cyan-400" />
                    <span>المعاينة الحية لبريد سعد ستوديو الفاخر</span>
                  </h3>
                  <span className="text-[10px] font-semibold text-cyan-300 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
                    Live Email Client
                  </span>
                </div>

                {/* Email Canvas Container */}
                <div className="rounded-3xl border border-white/10 bg-[#060913] p-4 md:p-6 shadow-2xl overflow-y-auto max-h-[850px]">
                  <div
                    className={`max-w-[560px] mx-auto space-y-5 text-slate-200 ${
                      isAr ? "font-sans text-right" : "font-sans text-left"
                    }`}
                    dir={isAr ? "rtl" : "ltr"}
                  >
                    {/* Header Card */}
                    <div className="bg-gradient-to-b from-[#131d33] to-[#0d1322] rounded-3xl p-6 text-center border border-white/10 shadow-lg">
                      <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/20 mx-auto mb-3 flex items-center justify-center overflow-hidden shadow-lg shadow-cyan-500/20">
                        <Image src="/logo-saad.png?v=5" alt="Logo" width={52} height={52} unoptimized />
                      </div>
                      <div className="text-base font-black text-white tracking-widest uppercase">SAAD STUDIO</div>
                      <div className="text-[10px] font-bold text-cyan-400 tracking-wider uppercase mt-1">
                        {isAr ? "النشرة الإخبارية الرسمية للذكاء الاصطناعي الإبداعي" : "OFFICIAL AI CREATIVE DISPATCH"}
                      </div>
                    </div>

                    {/* CARD 1: MAIN HERO STORY */}
                    <div className="bg-[#0d1322] rounded-3xl p-6 border border-white/10 shadow-xl space-y-4">
                      <div className="inline-block px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-[10px] font-bold text-cyan-300 tracking-wide">
                        {newsletterData.heroTag || (isAr ? "إضاءة الأسبوع" : "Spotlight")}
                      </div>

                      {newsletterData.heroImage && (
                        <div className="rounded-2xl overflow-hidden border border-white/10 aspect-video relative bg-black/40 shadow-inner">
                          <img
                            src={newsletterData.heroImage}
                            alt={newsletterData.heroTitle}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <h2 className="text-base md:text-lg font-extrabold text-white leading-snug tracking-tight">
                        {newsletterData.heroTitle}
                      </h2>

                      <div className="p-4 rounded-2xl bg-[#11192e] border border-white/5 text-xs leading-relaxed text-slate-300 space-y-2">
                        {newsletterData.heroBody.split(/\r?\n/).map((p, idx) =>
                          p.trim() ? <p key={idx}>{p}</p> : <div key={idx} className="h-1" />
                        )}
                      </div>

                      <div>
                        <span className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 uppercase tracking-wider">
                          {newsletterData.heroCtaText || (isAr ? "جرب الميزة الآن في سعد ستوديو ➜" : "Explore in Saad Studio ➜")}
                        </span>
                      </div>
                    </div>

                    {/* CARD 2: NOTABLE AI TOOLS */}
                    {newsletterData.notableTools && newsletterData.notableTools.length > 0 && (
                      <div className="bg-[#0d1322] rounded-3xl p-6 border border-white/10 shadow-xl space-y-3.5">
                        <div className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-wider">
                          {isAr ? "نماذج وأدوات المنصة" : "NOTABLE AI SUITE"}
                        </div>
                        <h3 className="text-sm font-extrabold text-white">
                          {newsletterData.notableToolsTitle || (isAr ? "أبرز أدوات وميزات سعد ستوديو" : "Notable AI Tools")}
                        </h3>
                        <div className="p-4 rounded-2xl bg-[#11192e] border border-white/5 space-y-2.5 text-xs text-slate-300">
                          {newsletterData.notableTools.map((tool, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <span className="shrink-0 text-sm">{tool.icon || "✨"}</span>
                              <div className="leading-relaxed">
                                <strong className="text-white">{tool.name}</strong>: {tool.description}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CARD 3: FROM THE SOURCE / UPDATES */}
                    {newsletterData.sourceUpdates && newsletterData.sourceUpdates.length > 0 && (
                      <div className="bg-[#0d1322] rounded-3xl p-6 border border-white/10 shadow-xl space-y-3.5">
                        <div className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-wider">
                          {isAr ? "تحديثات وتطويرات" : "FROM THE SOURCE"}
                        </div>
                        <h3 className="text-sm font-extrabold text-white">
                          {newsletterData.sourceUpdatesTitle || (isAr ? "أحدث التحديثات في المنصة" : "Platform Updates & Releases")}
                        </h3>
                        <div className="p-4 rounded-2xl bg-[#11192e] border border-white/5 space-y-2.5 text-xs text-slate-300">
                          {newsletterData.sourceUpdates.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <span className="shrink-0 text-sm">{item.icon || "⚡"}</span>
                              <div className="leading-relaxed">
                                <strong className="text-white">{item.name}</strong>: {item.description}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CARD 4: PROMPT OF THE DAY */}
                    {newsletterData.promptOfDayText && (
                      <div className="bg-[#0d1322] rounded-3xl p-6 border border-white/10 shadow-xl space-y-3.5">
                        <div className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          <span>{newsletterData.promptOfDayTitle || (isAr ? "برومبت اليوم الإبداعي" : "Prompt of the Day")}</span>
                        </div>
                        <h3 className="text-sm font-extrabold text-white">
                          {newsletterData.promptOfDayName || (isAr ? "برومبت سينمائي جاهز للتجربة" : "Featured Creative Prompt")}
                        </h3>

                        <div className="p-4 rounded-2xl bg-[#182238] border border-amber-500/30 text-xs text-slate-300 space-y-2">
                          <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                            {isAr ? "انسخ البرومبت وجربه في Image Studio:" : "Copy & Paste into Image Studio:"}
                          </div>
                          <div className="p-3 rounded-xl bg-[#0b1120] border border-white/10 font-mono text-[11px] text-amber-200 leading-relaxed break-words">
                            {newsletterData.promptOfDayText}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="bg-[#080c16] rounded-3xl p-5 border border-white/10 text-center text-xs text-slate-500 space-y-1">
                      <div className="font-bold text-slate-300">Saad Studio — The Creative AI Suite</div>
                      <div className="text-[10px] text-slate-600">© 2026 Saad Studio. All rights reserved.</div>
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
                  <span className="text-xs font-semibold text-zinc-400">إجمالي المشتركين</span>
                  <Users className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="mt-2 text-2xl font-black text-white">{subscribers.length}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400">المشتركون الفعّالون</span>
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="mt-2 text-2xl font-black text-white">
                  {activeCount} <span className="text-xs font-normal text-emerald-400 ml-2">جاهز للإرسال</span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400">مصدر الاشتراك</span>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>
                <div className="mt-2 text-sm font-bold text-zinc-200">فوتر الموقع (Stay in the loop)</div>
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
                    placeholder="البحث في الإيميلات..."
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
                    <span>{copied ? "تم النسخ!" : "نسخ الإيميلات"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportCSV}
                    disabled={!subscribers.length}
                    className="px-3.5 py-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] disabled:opacity-40 text-xs font-semibold text-zinc-200 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-zinc-400" />
                    <span>تصدير CSV</span>
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
                  placeholder="إضافة بريد يدوياً (user@domain.com)"
                  className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-cyan-400/50"
                />
                <button
                  type="submit"
                  disabled={addingSub || !newEmail.trim()}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-bold text-xs flex items-center gap-1.5 shrink-0"
                >
                  {addingSub ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>إضافة</span>
                </button>
              </form>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-white/10 bg-zinc-950/70 overflow-hidden shadow-2xl backdrop-blur-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.02] border-b border-white/10 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-5 py-3.5">البريد الإلكتروني</th>
                      <th className="px-5 py-3.5">المصدر</th>
                      <th className="px-5 py-3.5">الحالة</th>
                      <th className="px-5 py-3.5">التاريخ</th>
                      <th className="px-5 py-3.5 text-right">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-zinc-300 font-sans">
                    {loadingSubs ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-12 text-center text-zinc-500">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
                          <span>جاري تحميل المشتركين...</span>
                        </td>
                      </tr>
                    ) : filteredSubs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-12 text-center text-zinc-500">
                          <Mail className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                          <div className="text-sm font-semibold text-zinc-400">لا يوجد مشتركون حالياً</div>
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
                  <h3 className="text-base font-bold text-white">تأكيد إرسال النشرة البريدية</h3>
                  <p className="text-xs text-zinc-400">سيتم إرسال هذا الإصدار للمشتركين المستهدفين فوراً.</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900 border border-white/5 space-y-2 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>العنوان:</span>
                  <span className="text-white font-bold max-w-[200px] truncate">{newsletterData.subject}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>الجمهور المستهدف:</span>
                  <span className="text-cyan-300 font-bold uppercase">{targetAudience.replace("_", " ")}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>اللغة:</span>
                  <span className="text-emerald-400 font-bold">{isAr ? "🇸🇦 العربية" : "🇬🇧 English"}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={sending}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSendBroadcast}
                  disabled={sending}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/30"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>{sending ? "جاري الإرسال..." : "تأكيد وإرسال النشرة"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
