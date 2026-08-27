"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, Hand, PhoneOff, RotateCcw, Star, StopCircle } from "lucide-react";

import type { VoiceAgentTaskSnapshot } from "@/lib/voice-agent/types";
import { VoiceAgentNav } from "./VoiceAgentNav";

type Approval = {
  id: string;
  actionType: string;
  summary: string;
  reason: string;
  status: string;
};

export function TaskDetailView({ taskId }: { taskId: string }) {
  const [task, setTask] = useState<VoiceAgentTaskSnapshot | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/voice-agent/tasks/${taskId}`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "تعذر تحميل المهمة.");
    setTask(json.task);
    setApprovals(json.approvals ?? []);
  }, [taskId]);

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "تعذر تحميل المهمة."));
  }, [load]);

  async function decide(approvalId: string, action: "approve" | "reject") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/voice-agent/tasks/${taskId}/approvals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId, action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "تعذر تحديث الموافقة.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحديث الموافقة.");
    } finally {
      setBusy(false);
    }
  }

  async function patch(status: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    try {
      await fetch(`/api/voice-agent/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...extra }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#08111F] px-4 py-6 text-zinc-100 md:px-8" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-6">
        <VoiceAgentNav />
        <Link href="/admin/voice-agent" className="text-xs font-bold text-cyan-300 hover:text-cyan-100">
          العودة إلى الوكيل الصوتي
        </Link>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {!task ? (
          <div className="h-96 animate-pulse rounded-lg bg-white/[0.04]" />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <main className="space-y-5">
              <section className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="rounded bg-cyan-500/15 px-2 py-1 text-[11px] font-black text-cyan-200">{task.status}</span>
                    <h1 className="mt-3 text-2xl font-black text-white">تفاصيل مهمة الوكيل الصوتي</h1>
                  </div>
                  <div className="text-left text-xs text-zinc-400">
                    <p>تقديري: <b className="text-amber-200">{task.estimatedCredits} cr</b></p>
                    <p>فعلي: <b className="text-emerald-200">{task.actualCredits ?? 0} cr</b></p>
                  </div>
                </div>
                <p className="rounded-lg bg-slate-950/70 p-4 text-sm leading-8 text-zinc-200 ring-1 ring-white/10">{task.goal}</p>
              </section>

              <section className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
                <h2 className="mb-3 text-sm font-black text-white">خطة الوكيل قبل التنفيذ</h2>
                <p className="mb-3 text-sm text-zinc-400">{task.plan.summary}</p>
                {task.plan.missingInformation.length > 0 && (
                  <div className="mb-4 rounded-lg border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100">
                    معلومات ناقصة: {task.plan.missingInformation.join("، ")}
                  </div>
                )}
                <div className="space-y-2">
                  {task.plan.steps.map((step, index) => (
                    <div key={step.id} className="flex items-start gap-3 rounded-lg bg-slate-950/60 p-3 ring-1 ring-white/10">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-xs font-black text-cyan-200">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-zinc-100">{step.title}</p>
                        <p className="mt-1 text-xs text-zinc-500">{step.toolId ?? "internal.plan"} • {step.riskLevel}</p>
                      </div>
                      {step.needsApproval && <span className="rounded bg-amber-500/15 px-2 py-1 text-[10px] font-bold text-amber-200">موافقة</span>}
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
                <h2 className="mb-3 text-sm font-black text-white">السجل الزمني</h2>
                <div className="space-y-3">
                  {task.timeline.map((event) => (
                    <div key={event.id} className="border-r border-cyan-400/25 pr-4">
                      <p className="text-sm font-bold text-zinc-100">{event.title}</p>
                      <p className="text-xs leading-6 text-zinc-500">{event.detail}</p>
                      <time className="text-[10px] text-zinc-600">{new Date(event.at).toLocaleString("ar-IQ")}</time>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
                <h2 className="mb-3 text-sm font-black text-white">تفريغ المكالمة</h2>
                {task.transcript.length === 0 ? (
                  <p className="text-sm text-zinc-500">لا يوجد تفريغ بعد.</p>
                ) : (
                  <div className="space-y-2">
                    {task.transcript.map((line, index) => (
                      <div key={`${line.at}-${index}`} className="rounded-lg bg-slate-950/60 p-3 ring-1 ring-white/10">
                        <div className="mb-1 flex items-center justify-between text-[11px] text-zinc-500">
                          <span>{line.speaker}</span>
                          <span>{new Date(line.at).toLocaleTimeString("ar-IQ")}</span>
                        </div>
                        <p className="text-sm leading-7 text-zinc-200">{line.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </main>

            <aside className="space-y-4">
              <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                <h2 className="mb-3 text-sm font-black text-white">موافقات مطلوبة</h2>
                <div className="space-y-2">
                  {approvals.length === 0 ? (
                    <p className="text-sm text-zinc-500">لا توجد موافقات.</p>
                  ) : (
                    approvals.map((approval) => (
                      <div key={approval.id} className="rounded-lg bg-slate-950/70 p-3 ring-1 ring-white/10">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <b className="text-xs text-zinc-200">{approval.actionType}</b>
                          <span className="text-[10px] text-amber-200">{approval.status}</span>
                        </div>
                        <p className="text-xs leading-6 text-zinc-500">{approval.summary}</p>
                        {approval.status === "pending" && (
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <button disabled={busy} onClick={() => decide(approval.id, "approve")} className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-black text-slate-950">
                              موافقة
                            </button>
                            <button disabled={busy} onClick={() => decide(approval.id, "reject")} className="rounded-lg bg-rose-500/15 px-3 py-2 text-xs font-black text-rose-200 ring-1 ring-rose-400/30">
                              رفض
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button disabled={busy} onClick={() => patch("cancelled")} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-xs font-bold text-zinc-300 ring-1 ring-white/10 hover:bg-white/[0.08]"><StopCircle className="h-4 w-4" />إيقاف</button>
                <button disabled={busy} onClick={() => patch(task.status, { humanIntervention: true })} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-xs font-bold text-zinc-300 ring-1 ring-white/10 hover:bg-white/[0.08]"><Hand className="h-4 w-4" />تدخل بشري</button>
                <button disabled={busy} onClick={() => patch("awaiting_approval")} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-xs font-bold text-zinc-300 ring-1 ring-white/10 hover:bg-white/[0.08]"><RotateCcw className="h-4 w-4" />إعادة</button>
                <button disabled={busy} onClick={() => patch(task.status, { rating: 5 })} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-xs font-bold text-zinc-300 ring-1 ring-white/10 hover:bg-white/[0.08]"><Star className="h-4 w-4" />تقييم</button>
              </div>

              <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm leading-7 text-emerald-100">
                <Check className="mb-2 h-4 w-4" />
                {task.finalSummary ?? "النتيجة النهائية ستظهر هنا بعد اكتمال المهمة."}
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4 text-xs leading-6 text-zinc-500">
                <PhoneOff className="mb-2 h-4 w-4 text-zinc-400" />
                وضع التطوير لا ينفذ مكالمات أو رسائل حقيقية. أي تسجيل مكالمة يحتاج سياسة حساب وتكامل مزود لاحقاً.
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
