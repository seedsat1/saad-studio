"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Coins,
  Mail,
  Mic2,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  UserRoundCog,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { VoiceAgentTaskSnapshot } from "@/lib/voice-agent/types";
import { VoiceAgentNav } from "./VoiceAgentNav";

type DashboardData = {
  tasks: VoiceAgentTaskSnapshot[];
  usage: {
    estimatedCredits: number;
    actualCredits: number;
    telephonyMinutes: number;
  };
};

const quickPrompts = [
  "اتصل بالعميل واسأله عن نوع الخدمة التي يريدها، ثم اعطني ملخصاً واضحاً.",
  "اتصل بالمطعم واحجز لي طاولة لشخصين اليوم مساءً.",
  "تابع شحنة من شركة النقل واسأل عن موعد الوصول المتوقع.",
];

const statusLabels: Record<string, string> = {
  draft: "مسودة",
  collecting_details: "يحتاج معلومات",
  planning: "قيد التخطيط",
  awaiting_approval: "بانتظار الموافقة",
  queued: "في الانتظار",
  running: "قيد التنفيذ",
  calling: "يتصل",
  in_conversation: "يتحدث",
  waiting_for_callback: "ينتظر رد",
  completed: "اكتملت",
  failed: "فشلت",
  cancelled: "ألغيت",
};

export function VoiceAgentWorkspace() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [goal, setGoal] = useState("");
  const [language, setLanguage] = useState("ar-IQ");
  const [approvalPolicy, setApprovalPolicy] = useState("always_ask");
  const [resultChannel, setResultChannel] = useState("platform");
  const [requireApprovalBeforeCall, setRequireApprovalBeforeCall] = useState(true);
  const [companyName, setCompanyName] = useState("Saad Studio");
  const [agentName, setAgentName] = useState("Saad Voice Agent");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/voice-agent/tasks", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "تعذر تحميل مهام الوكيل الصوتي.");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل البيانات.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeTask = useMemo(() => data?.tasks?.[0] ?? null, [data]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!goal.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/voice-agent/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          language,
          dialect: language === "ar-IQ" ? "iraqi" : language === "ar" ? "msa" : "english",
          approvalPolicy,
          requireApprovalBeforeCall,
          resultChannel,
          identity: {
            name: agentName,
            companyName,
            tone: "calm",
            introScript: `مرحباً، معك مساعد صوتي بالذكاء الاصطناعي أتصل نيابةً عن ${companyName}.`,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "تعذر إنشاء المهمة.");
      setGoal("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إنشاء المهمة.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#08111F] px-4 py-6 text-zinc-100 md:px-8" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-6">
        <VoiceAgentNav />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="rounded-lg border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-black/20 md:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-3 py-1 text-[11px] font-bold text-cyan-200 ring-1 ring-cyan-400/20">
                  <Sparkles className="h-3.5 w-3.5" />
                  الوكيل الصوتي داخل الداشبورد
                </div>
                <h1 className="text-2xl font-black tracking-tight text-white md:text-3xl">
                  Saad Voice Agent
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-400">
                  اكتب أو أملي مهمة، راجع الخطة والموافقة، ثم تابع الاتصال والتفريغ والنتيجة من نفس مساحة Saad Studio.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-slate-950/70 p-3 ring-1 ring-white/10">
                  <Coins className="mx-auto mb-1 h-4 w-4 text-amber-300" />
                  <b className="block text-amber-200">{data?.usage.actualCredits ?? 0}</b>
                  <span className="text-zinc-500">فعلي</span>
                </div>
                <div className="rounded-lg bg-slate-950/70 p-3 ring-1 ring-white/10">
                  <Clock3 className="mx-auto mb-1 h-4 w-4 text-cyan-300" />
                  <b className="block text-cyan-200">{data?.usage.telephonyMinutes ?? 0}</b>
                  <span className="text-zinc-500">دقائق</span>
                </div>
                <div className="rounded-lg bg-slate-950/70 p-3 ring-1 ring-white/10">
                  <Phone className="mx-auto mb-1 h-4 w-4 text-emerald-300" />
                  <b className="block text-emerald-200">{data?.tasks?.length ?? 0}</b>
                  <span className="text-zinc-500">مهام</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="rounded-lg border border-white/10 bg-slate-950/70 p-3">
                <textarea
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  placeholder="مثال: اتصل بالعميل واسأله عن نوع الخدمة التي يريدها، ثم أرسل لي ملخصاً داخل المنصة."
                  className="min-h-36 w-full resize-none bg-transparent text-sm leading-7 text-white outline-none placeholder:text-zinc-600"
                />
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-xs font-semibold text-zinc-300 ring-1 ring-white/10"
                  >
                    <Mic2 className="h-4 w-4 text-cyan-300" />
                    المايكروفون قريباً
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !goal.trim()}
                    className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-black text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    {submitting ? "ينشئ المهمة..." : "ابدأ مهمة جديدة"}
                  </button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Control label="اللغة / اللهجة">
                  <select value={language} onChange={(e) => setLanguage(e.target.value)} className="h-10 w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 text-xs font-semibold text-zinc-100 outline-none">
                    <option value="ar-IQ">العربية العراقية</option>
                    <option value="ar">العربية الفصحى</option>
                    <option value="en">English</option>
                  </select>
                </Control>
                <Control label="سياسة الموافقة">
                  <select value={approvalPolicy} onChange={(e) => setApprovalPolicy(e.target.value)} className="h-10 w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 text-xs font-semibold text-zinc-100 outline-none">
                    <option value="always_ask">اسألني دائماً</option>
                    <option value="allow_calls_only">اسمح بالاتصال فقط</option>
                    <option value="allow_send_and_call">اسمح بالإرسال والاتصال</option>
                    <option value="allow_low_risk">نفذ منخفض المخاطر</option>
                  </select>
                </Control>
                <Control label="استلام النتيجة">
                  <select value={resultChannel} onChange={(e) => setResultChannel(e.target.value)} className="h-10 w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 text-xs font-semibold text-zinc-100 outline-none">
                    <option value="platform">داخل المنصة</option>
                    <option value="whatsapp">واتساب</option>
                    <option value="email">بريد</option>
                  </select>
                </Control>
                <Control label="الموافقة قبل الاتصال">
                  <button
                    type="button"
                    onClick={() => setRequireApprovalBeforeCall((v) => !v)}
                    className={cn(
                      "h-10 rounded-lg px-3 text-xs font-bold ring-1 transition",
                      requireApprovalBeforeCall
                        ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30"
                        : "bg-white/[0.04] text-zinc-300 ring-white/10",
                    )}
                  >
                    {requireApprovalBeforeCall ? "مطلوبة" : "غير مطلوبة"}
                  </button>
                </Control>
                <Control label="اسم الوكيل">
                  <input value={agentName} onChange={(e) => setAgentName(e.target.value)} className="h-10 w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 text-xs font-semibold text-zinc-100 outline-none" />
                </Control>
                <Control label="اسم الشركة">
                  <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="h-10 w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 text-xs font-semibold text-zinc-100 outline-none" />
                </Control>
              </div>
            </form>

            <div className="mt-5 flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setGoal(prompt)}
                  className="rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-zinc-300 ring-1 ring-white/10 hover:bg-white/[0.08] hover:text-white"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-white">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                حالة المهمة الحية
              </h2>
              {loading ? (
                <div className="h-40 animate-pulse rounded-lg bg-white/[0.04]" />
              ) : activeTask ? (
                <div className="space-y-4">
                  <div className="rounded-lg bg-slate-950/70 p-3 ring-1 ring-white/10">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="rounded bg-cyan-500/15 px-2 py-1 text-[11px] font-bold text-cyan-200">
                        {statusLabels[activeTask.status] ?? activeTask.status}
                      </span>
                      <span className="text-[11px] text-amber-200">{activeTask.estimatedCredits} كريدت تقديري</span>
                    </div>
                    <p className="line-clamp-3 text-sm leading-7 text-zinc-200">{activeTask.goal}</p>
                  </div>
                  <div className="space-y-2">
                    {activeTask.timeline.slice(-4).map((event) => (
                      <div key={event.id} className="flex gap-2 text-xs">
                        <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-cyan-300" />
                        <div>
                          <p className="font-bold text-zinc-200">{event.title}</p>
                          <p className="leading-6 text-zinc-500">{event.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link href={`/admin/voice-agent/tasks/${activeTask.id}`} className="block rounded-lg bg-white px-3 py-2 text-center text-xs font-black text-slate-950">
                    افتح تفاصيل المهمة
                  </Link>
                </div>
              ) : (
                <p className="text-sm leading-7 text-zinc-500">لا توجد مهمة بعد. اكتب أول مهمة ليبدأ الوكيل بالتخطيط.</p>
              )}
            </div>

            <div className="rounded-lg border border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-7 text-amber-100">
              <b className="mb-1 block text-amber-200">تعريف المكالمة إلزامي</b>
              يبدأ الوكيل أي مكالمة بعبارة واضحة بأنه مساعد صوتي بالذكاء الاصطناعي يتصل نيابة عن المستخدم أو الشركة.
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-white">
                <UserRoundCog className="h-4 w-4 text-cyan-300" />
                سجل المهام
              </h3>
              <div className="space-y-2">
                {(data?.tasks ?? []).slice(0, 6).map((task) => (
                  <Link key={task.id} href={`/admin/voice-agent/tasks/${task.id}`} className="block rounded-lg bg-slate-950/60 p-3 text-xs ring-1 ring-white/10 hover:ring-cyan-400/30">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="font-bold text-zinc-200">{statusLabels[task.status] ?? task.status}</span>
                      <span className="text-amber-200">{task.estimatedCredits} cr</span>
                    </div>
                    <p className="line-clamp-2 leading-6 text-zinc-500">{task.goal}</p>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="block text-[11px] font-bold text-zinc-400">{label}</span>
      {children}
    </label>
  );
}
