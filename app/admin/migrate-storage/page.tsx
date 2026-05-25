"use client";
import { useState } from "react";
import { Database, CheckCircle2, XCircle, Loader2, Play, BarChart3, AlertTriangle } from "lucide-react";

type StatsResult = { total: number; byTable: Record<string, number> };
type BatchResult = {
  totalRows: number; totalBatches: number;
  processed: number; migrated: number; failed: number;
  remainingBefore: number; remainingAfter: number;
  hasMore: boolean; nextBatch: number | null;
  details: {
    migrated: { table: string; id: string; field: string; oldUrl: string; newUrl: string }[];
    failed:   { table: string; id: string; field: string; url: string; error: string }[];
  };
};

export default function MigrateStoragePage() {
  const [stats, setStats] = useState<StatsResult | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [totals, setTotals] = useState({ migrated: 0, failed: 0, processed: 0 });
  const [done, setDone] = useState(false);

  async function fetchStats() {
    setLoadingStats(true);
    const r = await fetch("/api/admin/migrate-storage?dry=true");
    const d = await r.json() as StatsResult;
    setStats(d);
    setLoadingStats(false);
  }

  async function runMigration() {
    setRunning(true);
    setDone(false);
    setLog([]);
    setTotals({ migrated: 0, failed: 0, processed: 0 });

    const size = 15;
    let round = 0;
    let cumMigrated = 0;
    let cumFailed   = 0;
    let cumProcessed = 0;

    while (true) {
      round += 1;
      const r = await fetch(`/api/admin/migrate-storage?size=${size}`);
      if (!r.ok) {
        setLog(prev => [...prev, `❌ خطأ في الجولة ${round}: ${r.status}`]);
        break;
      }
      const d = await r.json() as BatchResult;
      cumMigrated  += d.migrated;
      cumFailed    += d.failed;
      cumProcessed += d.processed;
      setTotals({ migrated: cumMigrated, failed: cumFailed, processed: cumProcessed });

      const msg = `جولة ${round} — نُقل: ${d.migrated} | فشل: ${d.failed} | متبقي: ${d.remainingAfter}`;
      setLog(prev => [...prev, msg]);

      for (const f of d.details.failed) {
        setLog(prev => [...prev, `  ⚠ ${f.table}.${f.field} [${f.id.slice(0,8)}]: ${f.error}`]);
      }

      if (!d.hasMore || d.remainingAfter === 0) break;
      // small delay to not overwhelm the server
      await new Promise(r => setTimeout(r, 500));
    }

    const finalRes = await fetch("/api/admin/migrate-storage?dry=true");
    if (finalRes.ok) {
      const finalStats = await finalRes.json() as StatsResult;
      setStats(finalStats);
      if (finalStats.total > 0) {
        setLog(prev => [...prev, `⚠ متبقي ${finalStats.total} ملف، أعد التشغيل لإكمال الترحيل.`]);
      }
    }

    setRunning(false);
    setDone(true);
  }

  const progressPct = stats && totals.processed > 0
    ? Math.round((totals.processed / stats.total) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Database className="w-7 h-7 text-violet-400" />
          <div>
            <h1 className="text-2xl font-bold">ترحيل التخزين</h1>
            <p className="text-slate-400 text-sm">Supabase Storage → Cloudflare R2</p>
          </div>
        </div>

        {/* Step 1: Scan */}
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6 space-y-4">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            الخطوة 1 — فحص قاعدة البيانات
          </h2>
          <p className="text-slate-400 text-sm">اضغط لحساب عدد الملفات المرفوعة على Supabase في جميع الجداول.</p>
          <button
            onClick={fetchStats}
            disabled={loadingStats || running}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 font-semibold text-sm transition-all"
          >
            {loadingStats ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
            {loadingStats ? "جاري الفحص..." : "فحص الآن"}
          </button>

          {stats && (
            <div className="space-y-3">
              <div className="text-3xl font-bold text-cyan-300">{stats.total} <span className="text-base text-slate-400 font-normal">ملف بحاجة للترحيل</span></div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(stats.byTable).map(([table, count]) => (
                  <div key={table} className="flex justify-between bg-slate-800/60 rounded-lg px-3 py-2 text-sm">
                    <span className="text-slate-300">{table}</span>
                    <span className="font-bold text-violet-300">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Migrate */}
        {stats && stats.total > 0 && (
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6 space-y-4">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Play className="w-5 h-5 text-violet-400" />
              الخطوة 2 — بدء الترحيل
            </h2>
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-sm text-amber-300">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>ستُنقل الملفات من Supabase إلى R2 ويُحدّث رابطها في قاعدة البيانات. العملية غير قابلة للتراجع.</span>
            </div>
            <button
              onClick={runMigration}
              disabled={running || done}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 font-bold text-sm transition-all"
            >
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {running ? "الترحيل جارٍ..." : done ? "اكتمل الترحيل" : "ابدأ الترحيل"}
            </button>

            {/* Progress */}
            {(running || done) && (
              <div className="space-y-3">
                <div className="w-full bg-slate-800 rounded-full h-3">
                  <div
                    className="bg-violet-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-slate-800/60 rounded-xl p-3">
                    <div className="text-2xl font-bold text-white">{totals.processed}</div>
                    <div className="text-xs text-slate-400">مُعالَج</div>
                  </div>
                  <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20">
                    <div className="text-2xl font-bold text-emerald-400">{totals.migrated}</div>
                    <div className="text-xs text-slate-400">نُقل بنجاح</div>
                  </div>
                  <div className="bg-red-500/10 rounded-xl p-3 border border-red-500/20">
                    <div className="text-2xl font-bold text-red-400">{totals.failed}</div>
                    <div className="text-xs text-slate-400">فشل</div>
                  </div>
                </div>

                {done && totals.failed === 0 && stats?.total === 0 && (
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-5 h-5" /> اكتمل الترحيل بنجاح! جميع الملفات على R2 الآن.
                  </div>
                )}
                {done && (totals.failed > 0 || (stats?.total ?? 0) > 0) && (
                  <div className="flex items-center gap-2 text-amber-400 font-semibold">
                    <XCircle className="w-5 h-5" /> اكتمل جزئياً — متبقي {(stats?.total ?? 0)} أو فشل {totals.failed}. راجع السجل أدناه.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {stats && stats.total === 0 && (
          <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
            <CheckCircle2 className="w-5 h-5" />
            <span>لا توجد ملفات Supabase — قاعدة البيانات نظيفة بالكامل.</span>
          </div>
        )}

        {/* Log */}
        {log.length > 0 && (
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4">
            <h3 className="text-sm font-semibold text-slate-400 mb-3">سجل العمليات</h3>
            <div className="space-y-1 max-h-64 overflow-y-auto font-mono text-xs text-slate-300">
              {log.map((line, i) => <div key={i}>{line}</div>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
