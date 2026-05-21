"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Image as ImageIcon,
  Video as VideoIcon,
  Layers,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface PresetResult {
  id: string;
  posterUrl?: string;
  videoUrl?: string;
  error?: string;
}

interface SeedResponse {
  ok: boolean;
  mode: "posters" | "videos" | "both";
  succeeded: number;
  failed: number;
  results: PresetResult[];
}

export default function CinematicPresetsAdminPage() {
  const [busy, setBusy] = useState<"posters" | "videos" | "both" | null>(null);
  const [response, setResponse] = useState<SeedResponse | null>(null);
  const [error, setError] = useState<string>("");

  const trigger = async (mode: "posters" | "videos" | "both") => {
    setBusy(mode);
    setError("");
    setResponse(null);
    try {
      const res = await fetch("/api/admin/cinematic-presets/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = (await res.json().catch(() => null)) as SeedResponse | null;
      if (!res.ok || !data) {
        throw new Error("Generation failed");
      }
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to admin
        </Link>

        <h1 className="mt-4 text-3xl font-black tracking-tight text-white">
          Cinematic Presets — Preview Generator
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
          Generate poster images (Imagen 4 Fast) and short preview videos (Veo
          3.1 Lite, 4s silent) for the cinematic-video preset library. Uses
          your <code className="rounded bg-white/5 px-1.5 py-0.5 text-[11px]">GOOGLE_AI_API_KEY</code>{" "}
          directly — no third-party providers. Generated files are stored in
          Supabase Storage and become public.
        </p>

        {/* Action buttons */}
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <ActionCard
            icon={ImageIcon}
            title="Generate Posters"
            sub="Imagen 4 Fast · ~5 min · ~16 images"
            cost="Cheap"
            disabled={busy !== null}
            running={busy === "posters"}
            onClick={() => trigger("posters")}
          />
          <ActionCard
            icon={VideoIcon}
            title="Generate Preview Videos"
            sub="Veo 3.1 Lite · ~30–60 min · 4s clips"
            cost="Moderate"
            disabled={busy !== null}
            running={busy === "videos"}
            onClick={() => trigger("videos")}
          />
          <ActionCard
            icon={Layers}
            title="Generate Both"
            sub="Posters first, then videos"
            cost="Most expensive"
            disabled={busy !== null}
            running={busy === "both"}
            onClick={() => trigger("both")}
          />
        </div>

        {/* Status */}
        {busy && (
          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-200">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>
              Running <b>{busy}</b> — this can take a while. Keep this tab open.
            </span>
          </div>
        )}

        {error && (
          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-red-400/30 bg-red-500/5 p-4 text-sm text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Results */}
        {response && (
          <div className="mt-8 rounded-3xl border border-white/10 bg-slate-900/60 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Results</h3>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/30">
                  {response.succeeded} OK
                </span>
                {response.failed > 0 && (
                  <span className="rounded-full bg-red-400/15 px-2.5 py-1 text-xs font-bold text-red-300 ring-1 ring-red-400/30">
                    {response.failed} failed
                  </span>
                )}
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              {response.results.map((r, i) => (
                <div
                  key={`${r.id}-${i}`}
                  className="flex items-center gap-3 rounded-lg border border-white/5 bg-black/30 px-3 py-2 text-xs"
                >
                  {r.error ? (
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-red-400" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
                  )}
                  <span className="flex-1 font-mono text-slate-300">{r.id}</span>
                  {r.posterUrl && (
                    <a
                      href={r.posterUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-semibold text-cyan-300 hover:text-cyan-200"
                    >
                      poster ↗
                    </a>
                  )}
                  {r.videoUrl && (
                    <a
                      href={r.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-semibold text-cyan-300 hover:text-cyan-200"
                    >
                      video ↗
                    </a>
                  )}
                  {r.error && (
                    <span className="text-[11px] text-red-300">{r.error}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionCard({
  icon: Icon,
  title,
  sub,
  cost,
  disabled,
  running,
  onClick,
}: {
  icon: typeof ImageIcon;
  title: string;
  sub: string;
  cost: string;
  disabled: boolean;
  running: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 p-5 text-left transition-all hover:border-amber-400/30 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
        {running ? (
          <Loader2 className="h-5 w-5 animate-spin text-black" />
        ) : (
          <Icon className="h-5 w-5 text-black" />
        )}
      </div>
      <h3 className="mt-4 text-base font-bold text-white">{title}</h3>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-amber-300/70">
        {cost}
      </p>
    </button>
  );
}
