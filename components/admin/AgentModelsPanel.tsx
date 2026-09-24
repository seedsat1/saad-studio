"use client";

import { useEffect, useState } from "react";
import { Bot, RefreshCw } from "lucide-react";
import { getAgentPricePeriod, type AgentModelDefinition } from "@/lib/agent-model-registry";

const dollars = (value: number) => `$${value.toFixed(2)}`;

export function AgentModelsPanel() {
  const [models, setModels] = useState<AgentModelDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch("/api/admin/agent-models", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Failed to load Agent models (HTTP ${response.status})`);
        const data = await response.json();
        setModels(data.models);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Failed to load Agent models");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);

  return (
    <section aria-label="Agent / LLM Models" className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Bot className="h-5 w-5 text-cyan-400" /> Agent / LLM Models
          </h2>
          <p className="mt-2 text-sm text-zinc-400" dir="auto">موديلات عقل الـAgent: المحادثة، الاستدلال واستدعاء الأدوات.</p>
          <p className="mt-1 text-sm text-amber-300" dir="auto">مسجّلة في كتالوج Agent المنفصل؛ التشغيل يعتمد على حالة runtime لكل موديل.</p>
        </div>
        <button type="button" disabled={loading} onClick={() => setRevision((value) => value + 1)}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh Agent Models
        </button>
      </div>
      {loading && <p role="status" className="text-sm text-zinc-400">Loading Agent models…</p>}
      {error && <p role="alert" className="rounded-lg border border-rose-800 bg-rose-950/40 p-4 text-rose-300">{error}</p>}
      {!loading && !error && (
        <>
          <p className="text-sm text-zinc-400">{models.length} registered · Google · USD / 1M tokens · Standard pricing</p>
          <div className="grid gap-4 xl:grid-cols-3">
            {models.map((model) => {
              const period = getAgentPricePeriod(model);
              const upcoming = model.pricing.periods.find((entry) => Date.parse(`${entry.effectiveFrom}T00:00:00Z`) > Date.now());
              return (
                <article key={model.id} className="min-w-0 space-y-5 rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
                  <div>
                    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full border border-cyan-900 bg-cyan-950/50 px-2 py-1 text-cyan-300">Google</span>
                      <span className="rounded-full border border-emerald-800 px-2 py-1 text-emerald-300">Stable / GA</span>
                      <span className="text-zinc-400">Registered</span>
                      <span className="text-zinc-400">{model.runtimeStatus}</span>
                    </div>
                    <h3 className="text-lg font-semibold">{model.displayName}</h3>
                    <code className="mt-1 block break-all text-xs text-zinc-400">{model.id}</code>
                    <p className="mt-3 text-sm text-cyan-300">{model.roleLabel}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-zinc-300">
                    {Object.entries({ Chat: model.capabilities.chat, Reasoning: model.capabilities.reasoning, "Tool calling": model.capabilities.functionCalling, "Structured output": model.capabilities.structuredOutput, Streaming: model.capabilities.streaming })
                      .filter(([, supported]) => supported)
                      .map(([label]) => <span key={label} className="rounded-md border border-zinc-700 px-2 py-1">{label}</span>)}
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div><dt className="text-zinc-400">Input limit</dt><dd>{model.inputTokenLimit.toLocaleString("en-US")}</dd></div>
                    <div><dt className="text-zinc-400">Output limit</dt><dd>{model.outputTokenLimit.toLocaleString("en-US")}</dd></div>
                  </dl>
                  {period ? (
                    <table className="w-full text-left text-sm">
                      <caption className="mb-2 text-left text-xs text-zinc-400">USD per million tokens</caption>
                      <thead className="text-xs text-zinc-400"><tr><th scope="col" className="pb-2">Prompt size</th><th scope="col" className="pb-2">Input</th><th scope="col" className="pb-2">Output</th></tr></thead>
                      <tbody>{period.tiers.map((tier, index) => (
                        <tr key={index} className="border-t border-zinc-800">
                          <td className="py-2">{tier.maxInputTokens !== null ? `≤ ${tier.maxInputTokens.toLocaleString("en-US")}` : index > 0 ? `> ${period.tiers[index - 1].maxInputTokens?.toLocaleString("en-US")}` : "All sizes"}</td>
                          <td className="text-amber-300">{dollars(tier.inputUsd)}</td><td className="text-amber-300">{dollars(tier.outputUsd)}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  ) : <p className="text-sm text-amber-300">No verified price for this date.</p>}
                  {upcoming && <p className="text-xs leading-relaxed text-zinc-400">From {upcoming.effectiveFrom}: {dollars(upcoming.tiers[0].inputUsd)} input / {dollars(upcoming.tiers[0].outputUsd)} output per 1M tokens.</p>}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800 pt-3 text-xs">
                    <a href={model.documentationUrl} target="_blank" rel="noreferrer" className="text-cyan-300 underline">Google documentation</a>
                    <span className="text-zinc-500">Verified {model.verifiedAt}</span>
                  </div>
                </article>
              );
            })}
          </div>
          <p className="text-xs leading-relaxed text-zinc-400" dir="auto">
            أسعار مزوّد Google للإدخال النصي؛ الإخراج يشمل tokens التفكير. التخزين المؤقت وأدوات Google المدفوعة تُحسب بشكل منفصل. هذه ليست أسعار كريديت المشتركين. {" "}
            <a href="https://ai.google.dev/gemini-api/docs/pricing" target="_blank" rel="noreferrer" className="text-cyan-300 underline">Google pricing</a>
          </p>
        </>
      )}
    </section>
  );
}
