"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  PluginStatusSnapshot,
  PluginOperationalConfig,
  PluginAuditLogEntry,
  PluginMode,
} from "@/lib/admin/plugin-control-plane";
import {
  AppWindow,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HardDrive,
  Download,
  Key,
  Users,
  History,
  Activity,
  Save,
  RotateCcw,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Terminal,
  Lock,
  Ban,
  Layers,
  Settings,
} from "lucide-react";

function AdminCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900/60 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export default function AdminPluginPage() {
  const [snapshot, setSnapshot] = useState<PluginStatusSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "version" | "security" | "activity">("overview");

  // Editable Form State
  const [status, setStatus] = useState<PluginMode>("active");
  const [currentVersion, setCurrentVersion] = useState("3.0.0");
  const [minSupportedVersion, setMinSupportedVersion] = useState("3.0.0");
  const [releaseDate, setReleaseDate] = useState("2026-08-19");
  const [downloadUrl, setDownloadUrl] = useState("/downloads/SaadStudio-Setup.exe");
  const [zxpUrl, setZxpUrl] = useState("/downloads/SaadStudio.zxp");
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [disabledMessage, setDisabledMessage] = useState("");
  const [releaseNotesText, setReleaseNotesText] = useState("");

  // Revocation State
  const [revokeFingerprintInput, setRevokeFingerprintInput] = useState("");
  const [revokeUserInput, setRevokeUserInput] = useState("");
  const [revokeReason, setRevokeReason] = useState("");

  // Activity State
  const [recentGens, setRecentGens] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<PluginAuditLogEntry[]>([]);

  // Toast / feedback message
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [statusRes, actRes] = await Promise.all([
        fetch("/api/admin/plugin/status", { cache: "no-store" }),
        fetch("/api/admin/plugin/activity?limit=25", { cache: "no-store" }),
      ]);

      if (statusRes.ok) {
        const data = (await statusRes.json()) as PluginStatusSnapshot;
        setSnapshot(data);
        setStatus(data.config.status);
        setCurrentVersion(data.config.currentVersion);
        setMinSupportedVersion(data.config.minSupportedVersion);
        setReleaseDate(data.config.releaseDate);
        setDownloadUrl(data.config.downloadUrl);
        setZxpUrl(data.config.zxpUrl);
        setMaintenanceMessage(data.config.maintenanceMessage || "");
        setDisabledMessage(data.config.disabledMessage || "");
        setReleaseNotesText(data.config.releaseNotes.join("\n"));
      }

      if (actRes.ok) {
        const actData = await actRes.json();
        setRecentGens(actData.generations || []);
        setAuditLogs(actData.auditLogs || []);
      }
    } catch (err) {
      console.error("Error loading plugin status:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSaveConfig() {
    setSaving(true);
    setFeedback(null);
    try {
      const releaseNotes = releaseNotesText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/admin/plugin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          currentVersion,
          minSupportedVersion,
          releaseDate,
          downloadUrl,
          zxpUrl,
          maintenanceMessage,
          disabledMessage,
          releaseNotes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save configuration");
      }

      setFeedback({ type: "success", text: "تم حفظ إعدادات إضافة أدوبي وتحديث ملفات الإصدار بنجاح." });
      await loadData();
    } catch (err) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "حدث خطأ أثناء الحفظ" });
    } finally {
      setSaving(false);
    }
  }

  async function handleRevoke(action: "token" | "user" | "global", target?: string) {
    if (!confirm(`هل أنت متأكد من تنفيذ عملية الإلغاء (${action})؟`)) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/plugin/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          target,
          reason: revokeReason || "Admin action from control plane",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Revocation failed");
      }

      setFeedback({ type: "success", text: `تم إلغاء الجلسات بنجاح (${action}).` });
      setRevokeFingerprintInput("");
      setRevokeUserInput("");
      setRevokeReason("");
      await loadData();
    } catch (err) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "فشلت عملية الإلغاء" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell activeRoute="/admin/plugin">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400">
                <AppWindow className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Adobe CEP Plugin Operations</h1>
                <p className="text-xs text-slate-400">
                  لوحة التحكم والعمليات الحية لإضافة أدوبي بريمير وأفتر إفكتس
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              تحديث
            </button>
            <Link
              href="/admin/cms/cep"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 text-xs font-bold text-purple-300 hover:bg-purple-500/20 transition"
            >
              <Sparkles className="h-3.5 w-3.5" />
              إدارة محتوى الكاروسيل (CMS)
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Operational Status Strip */}
        {snapshot && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <AdminCard className="p-3">
              <div className="text-[11px] text-slate-400 font-medium">حالة الإضافة</div>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    snapshot.config.status === "active"
                      ? "bg-emerald-400 animate-pulse"
                      : snapshot.config.status === "maintenance"
                      ? "bg-amber-400"
                      : "bg-rose-500"
                  }`}
                />
                <span className="text-sm font-bold text-white uppercase">{snapshot.config.status}</span>
              </div>
            </AdminCard>

            <AdminCard className="p-3">
              <div className="text-[11px] text-slate-400 font-medium">الإصدار الحالي</div>
              <div className="mt-1 text-sm font-bold text-amber-400 font-mono">v{snapshot.config.currentVersion}</div>
            </AdminCard>

            <AdminCard className="p-3">
              <div className="text-[11px] text-slate-400 font-medium">الحد الأدنى المدعوم</div>
              <div className="mt-1 text-sm font-bold text-slate-200 font-mono">v{snapshot.config.minSupportedVersion}</div>
            </AdminCard>

            <AdminCard className="p-3">
              <div className="text-[11px] text-slate-400 font-medium">ملف التثبيت (Setup.exe)</div>
              <div className="mt-1 flex items-center gap-1.5 text-xs font-bold">
                {snapshot.installerHealth.setupExe.exists ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    جاهز ({snapshot.installerHealth.setupExe.sizeFormatted})
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5" />
                    غير موجود
                  </span>
                )}
              </div>
            </AdminCard>

            <AdminCard className="p-3">
              <div className="text-[11px] text-slate-400 font-medium">مصافحات الدخول (Handshakes)</div>
              <div className="mt-1 text-sm font-bold text-white font-mono">
                {snapshot.sessions.authHandshakesActiveWindow} جارية
              </div>
            </AdminCard>

            <AdminCard className="p-3">
              <div className="text-[11px] text-slate-400 font-medium">توليدات الإضافة (24 ساعة)</div>
              <div className="mt-1 text-sm font-bold text-cyan-400 font-mono">
                {snapshot.telemetry.recent24hCount} طلب
              </div>
            </AdminCard>
          </div>
        )}

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              feedback.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-semibold">
              {feedback.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {feedback.text}
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white text-xs">
              ✕
            </button>
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="flex border-b border-slate-800 text-xs font-bold gap-2">
          {[
            { id: "overview", label: "نظرة عامة والجاهزية", icon: Activity },
            { id: "version", label: "إدارة الإصدارات والتنزيلات", icon: Layers },
            { id: "security", label: "الأمان وإلغاء الجلسات", icon: Lock },
            { id: "activity", label: "النشاط وسجل العمليات", icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 pb-3 px-3 transition-colors border-b-2 ${
                  active
                    ? "border-amber-400 text-amber-300"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW & HEALTH */}
        {activeTab === "overview" && snapshot && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Mode Selector Card */}
            <AdminCard className="p-5 space-y-4 lg:col-span-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                <Settings className="h-4 w-4 text-amber-400" />
                حالة تشغيل الإضافة (Master Switch)
              </h3>

              <div className="space-y-2">
                {[
                  {
                    id: "active",
                    title: "نشط بالكامل (ACTIVE)",
                    desc: "الإضافة تعمل بكامل الوظائف والتوليد متاح.",
                    color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
                  },
                  {
                    id: "maintenance",
                    title: "وضع الصيانة (MAINTENANCE)",
                    desc: "يسمح بالاتصال فقط، ويمنع التوليد مع رسالة صيانة.",
                    color: "border-amber-500/40 bg-amber-500/10 text-amber-300",
                  },
                  {
                    id: "disabled",
                    title: "معطل بالكامل (DISABLED)",
                    desc: "حظر كافة طلبات الإضافة من الخادم فوراً.",
                    color: "border-rose-500/40 bg-rose-500/10 text-rose-300",
                  },
                ].map((m) => (
                  <label
                    key={m.id}
                    className={`block p-3 rounded-xl border cursor-pointer transition ${
                      status === m.id ? m.color : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="mode"
                        value={m.id}
                        checked={status === m.id}
                        onChange={(e) => setStatus(e.target.value as PluginMode)}
                        className="text-amber-500 focus:ring-amber-500"
                      />
                      <span className="font-bold text-xs">{m.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 mr-5">{m.desc}</p>
                  </label>
                ))}
              </div>

              {status === "maintenance" && (
                <div>
                  <label className="text-[11px] text-slate-400 font-semibold block mb-1">رسالة وضع الصيانة للمستخدم</label>
                  <textarea
                    rows={2}
                    value={maintenanceMessage}
                    onChange={(e) => setMaintenanceMessage(e.target.value)}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                  />
                </div>
              )}

              {status === "disabled" && (
                <div>
                  <label className="text-[11px] text-slate-400 font-semibold block mb-1">رسالة التعطيل للمستخدم</label>
                  <textarea
                    rows={2}
                    value={disabledMessage}
                    onChange={(e) => setDisabledMessage(e.target.value)}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                  />
                </div>
              )}

              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? "جاري الحفظ..." : "حفظ الحالة التشغيلية"}
              </button>
            </AdminCard>

            {/* Endpoints Health Grid */}
            <AdminCard className="p-5 space-y-4 lg:col-span-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                <Activity className="h-4 w-4 text-cyan-400" />
                حالة المسارات والخدمات الخلفية (Non-Billable Health Checks)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {snapshot.apiHealth.map((api) => (
                  <div
                    key={api.endpoint}
                    className="p-3 rounded-lg border border-slate-800/80 bg-slate-950/60 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{api.label}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{api.method} {api.endpoint}</div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        api.status === "HEALTHY"
                          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                          : api.status === "DEGRADED"
                          ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                          : "bg-rose-500/15 border-rose-500/30 text-rose-400"
                      }`}
                    >
                      {api.status}
                    </span>
                  </div>
                ))}
              </div>

              {/* Physical Installer Health */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-amber-400" />
                    فحص وجود ملفات الحزمة على الخادم (Disk Files)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                    <div className="text-[11px] text-slate-400">برنامج التنصيب (.exe)</div>
                    <div className="text-white font-mono mt-1 font-bold">SaadStudio-Setup.exe</div>
                    <div className="text-slate-500 text-[10px] mt-0.5">
                      الحجم: {snapshot.installerHealth.setupExe.sizeFormatted} | الحالة:{" "}
                      {snapshot.installerHealth.setupExe.exists ? "موجود" : "مفقود"}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                    <div className="text-[11px] text-slate-400">ملف الإضافة المباشر (.zxp)</div>
                    <div className="text-white font-mono mt-1 font-bold">SaadStudio.zxp</div>
                    <div className="text-slate-500 text-[10px] mt-0.5">
                      الحجم: {snapshot.installerHealth.zxp.sizeFormatted} | الحالة:{" "}
                      {snapshot.installerHealth.zxp.exists ? "موجود" : "مفقود"}
                    </div>
                  </div>
                </div>
              </div>
            </AdminCard>
          </div>
        )}

        {/* TAB 2: VERSION & RELEASES */}
        {activeTab === "version" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AdminCard className="p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                <Layers className="h-4 w-4 text-amber-400" />
                سياسة الإصدارات وتحديثات الإضافة
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-slate-400 font-semibold block mb-1">الإصدار الحالي المعتمد (Current)</label>
                  <input
                    type="text"
                    value={currentVersion}
                    onChange={(e) => setCurrentVersion(e.target.value)}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
                    placeholder="3.0.0"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 font-semibold block mb-1">الحد الأدنى المدعوم (Min Supported)</label>
                  <input
                    type="text"
                    value={minSupportedVersion}
                    onChange={(e) => setMinSupportedVersion(e.target.value)}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
                    placeholder="3.0.0"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold block mb-1">تاريخ الإصدار (Release Date)</label>
                <input
                  type="date"
                  value={releaseDate}
                  onChange={(e) => setReleaseDate(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold block mb-1">رابط تحميل برنامج التنصيب (.exe)</label>
                <input
                  type="text"
                  value={downloadUrl}
                  onChange={(e) => setDownloadUrl(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold block mb-1">رابط ملف ZXP</label>
                <input
                  type="text"
                  value={zxpUrl}
                  onChange={(e) => setZxpUrl(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                  سجل التغييرات وملاحظات الإصدار (سطر لكل ميزة)
                </label>
                <textarea
                  rows={5}
                  value={releaseNotesText}
                  onChange={(e) => setReleaseNotesText(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
                  placeholder="🚀 ترقية شاملة لمعمارية الإضافة v3.0.0"
                />
              </div>

              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? "جاري الحفظ ومزامنة version.json..." : "حفظ ومزامنة الإصدار"}
              </button>
            </AdminCard>

            {/* Version Synchronization Live Preview */}
            <AdminCard className="p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                <RefreshCw className="h-4 w-4 text-cyan-400" />
                سلسلة المزامنة الموحدة (Single Source of Truth)
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg border border-slate-800 bg-slate-950">
                  <div className="text-[11px] text-amber-400 font-bold">1. ملف البيانات العام (/public/saadstudio-version.json)</div>
                  <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                    يتم تحديثه تلقائياً عند النقر على الحفظ لتزويد فحص التحديثات التلقائي داخل الإضافة بأحدث البيانات.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-slate-800 bg-slate-950">
                  <div className="text-[11px] text-emerald-400 font-bold">2. بوابة التنزيل العامة (/download)</div>
                  <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                    تقرأ نفس بيانات الإصدار وحجم الملف المحدث.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-slate-800 bg-slate-950">
                  <div className="text-[11px] text-sky-400 font-bold">3. صفحة الهبوط والتسويق (/plugin)</div>
                  <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                    تعرض شارة الإصدار المعتمد وتحتوي على رابط التحميل المباشر.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-slate-800 bg-slate-950">
                  <div className="text-[11px] text-rose-400 font-bold">4. حظر الإصدارات القديمة (Min Supported Version)</div>
                  <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                    إذا كان إصدار إضافة المشترك أقل من <span className="text-white font-bold">{minSupportedVersion}</span>، سيقوم الخادم برفض طلبات التوليد مع رمز 426 وتوجيهه للتحديث.
                  </p>
                </div>
              </div>
            </AdminCard>
          </div>
        )}

        {/* TAB 3: SECURITY & REVOCATION */}
        {activeTab === "security" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <AdminCard className="p-5 space-y-4 lg:col-span-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                <Lock className="h-4 w-4 text-rose-400" />
                وحدة إلغاء الجلسات وحظر الرموز المسربة (Token Revocation Console)
              </h3>

              <p className="text-xs text-slate-400 leading-relaxed">
                تعتمد الإضافة على رموز HMAC المشفرة. تتيح لك هذه اللوحة إلغاء رمز معين أو حظر مستخدم أو إلغاء جميع الجلسات عالمياً لحالات الطوارئ مع الحفاظ على سرية مفتاح PANEL_TOKEN_SECRET.
              </p>

              {/* Revoke specific token fingerprint */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-3">
                <div className="text-xs font-bold text-white">إلغاء رمز جلسة محدد (Token Fingerprint / Hash)</div>
                <input
                  type="text"
                  value={revokeFingerprintInput}
                  onChange={(e) => setRevokeFingerprintInput(e.target.value)}
                  placeholder="أدخل بصمة الرمز أو التوقيع المراد إلغاؤه..."
                  className="w-full text-xs bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
                />
                <button
                  onClick={() => handleRevoke("token", revokeFingerprintInput)}
                  disabled={saving || !revokeFingerprintInput.trim()}
                  className="py-2 px-3.5 rounded-lg bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold text-xs transition flex items-center gap-1.5"
                >
                  <Ban className="h-3.5 w-3.5" />
                  إلغاء الرمز فوراً
                </button>
              </div>

              {/* Revoke User Sessions */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-3">
                <div className="text-xs font-bold text-white">إلغاء كافة جلسات مستخدم معين (User ID)</div>
                <input
                  type="text"
                  value={revokeUserInput}
                  onChange={(e) => setRevokeUserInput(e.target.value)}
                  placeholder="أدخل معرف المستخدم (userId e.g. user_...)"
                  className="w-full text-xs bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
                />
                <button
                  onClick={() => handleRevoke("user", revokeUserInput)}
                  disabled={saving || !revokeUserInput.trim()}
                  className="py-2 px-3.5 rounded-lg bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold text-xs transition flex items-center gap-1.5"
                >
                  <Users className="h-3.5 w-3.5" />
                  إلغاء جلسات المستخدم
                </button>
              </div>

              {/* Emergency Global Revocation */}
              <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 space-y-2">
                <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  إلغاء طارئ لجميع الرموز عالمياً (Global Emergency Revocation)
                </div>
                <p className="text-[11px] text-slate-300">
                  سيؤدي هذا الإجراء إلى إبطال مفعول كافة الرموز الصادرة قبل هذه اللحظة، وإلزام جميع المشتركين بإعادة تسجيل الدخول عبر الإضافة.
                </p>
                <button
                  onClick={() => handleRevoke("global")}
                  disabled={saving}
                  className="py-2 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition flex items-center gap-1.5 mt-2"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  تنفيذ الإلغاء الشامل الآن
                </button>
              </div>
            </AdminCard>

            {/* Revocation Stats Card */}
            <AdminCard className="p-5 space-y-4 lg:col-span-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                حالة القائمة السوداء (Denylist Stats)
              </h3>

              {snapshot && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-slate-400 text-[11px]">الرموز الملغاة بالبصمة</div>
                    <div className="text-lg font-bold text-white font-mono mt-0.5">
                      {snapshot.revocations.revokedTokenCount}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-slate-400 text-[11px]">المستخدمين المحظورة جلساتهم</div>
                    <div className="text-lg font-bold text-white font-mono mt-0.5">
                      {snapshot.revocations.revokedUserCount}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-slate-400 text-[11px]">آخر إلغاء شامل عالمي</div>
                    <div className="text-xs font-mono text-amber-300 mt-1">
                      {snapshot.revocations.globalRevokedBefore || "لا يوجد إلغاء شامل مسجل"}
                    </div>
                  </div>
                </div>
              )}
            </AdminCard>
          </div>
        )}

        {/* TAB 4: ACTIVITY & AUDIT */}
        {activeTab === "activity" && (
          <div className="space-y-6">
            {/* Recent Generations Card */}
            <AdminCard className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <History className="h-4 w-4 text-amber-400" />
                  أحدث طلبات التوليد عبر المنصة والإضافة
                </h3>
                <Link
                  href="/admin/history"
                  className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1"
                >
                  فتح شاشة مراقبة التوليد الكاملة (Generation Monitor) →
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold text-[11px]">
                      <th className="py-2.5 px-3">المستخدم</th>
                      <th className="py-2.5 px-3">النوع</th>
                      <th className="py-2.5 px-3">النموذج</th>
                      <th className="py-2.5 px-3">الوصف (Prompt)</th>
                      <th className="py-2.5 px-3 text-right">الرصيد المخصوم</th>
                      <th className="py-2.5 px-3 text-right">الوقت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {recentGens.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-500">
                          لا توجد عمليات توليد حديثة
                        </td>
                      </tr>
                    ) : (
                      recentGens.map((g) => (
                        <tr key={g.id} className="hover:bg-slate-800/30">
                          <td className="py-2 px-3 text-slate-300 truncate max-w-[140px]">
                            {g.userEmail}
                          </td>
                          <td className="py-2 px-3 text-slate-400 uppercase text-[10px] font-bold">
                            {g.assetType}
                          </td>
                          <td className="py-2 px-3 text-cyan-400 text-[11px] truncate max-w-[120px]">
                            {g.modelUsed}
                          </td>
                          <td className="py-2 px-3 text-slate-300 truncate max-w-[200px] font-sans">
                            {g.prompt}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-amber-400">
                            {g.chargedCredits} CR
                          </td>
                          <td className="py-2 px-3 text-right text-slate-500 text-[10px]">
                            {new Date(g.createdAt).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </AdminCard>

            {/* Audit Log Card */}
            <AdminCard className="p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                <Terminal className="h-4 w-4 text-purple-400" />
                سجل عمليات المشرفين على الإضافة (Admin Operational Audit Log)
              </h3>

              <div className="space-y-2">
                {auditLogs.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs font-mono">
                    لا توجد عمليات سابقة مسجلة في السجل
                  </div>
                ) : (
                  auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-lg border border-slate-800/80 bg-slate-950 flex items-center justify-between text-xs font-mono"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-purple-300">{log.action}</span>
                          <span className="text-slate-500 text-[11px]">بواسطة: {log.operator}</span>
                        </div>
                        {log.details && (
                          <div className="text-[11px] text-slate-400">
                            {JSON.stringify(log.details)}
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </AdminCard>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
