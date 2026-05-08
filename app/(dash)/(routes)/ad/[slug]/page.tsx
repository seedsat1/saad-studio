"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Play, ScrollText, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type ExploreMedia = {
  type: "image" | "video";
  url: string;
  posterUrl?: string | null;
};

type ExploreModule = {
  _id: string;
  kicker: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  badges: string[];
  media: ExploreMedia[];
};

type ExploreCmsLayout = {
  modules?: ExploreModule[];
};

function MediaTile({ media, alt, className }: { media: ExploreMedia | null; alt: string; className: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]", className)}>
      {media?.type === "video" ? (
        <video
          src={media.url}
          poster={media.posterUrl ?? undefined}
          muted
          loop
          playsInline
          preload="metadata"
          controls
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : media?.url ? (
        <img src={media.url} alt={alt} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.22),transparent_35%),radial-gradient(circle_at_70%_10%,rgba(236,72,153,0.16),transparent_30%),linear-gradient(135deg,#050812,#070b18_45%,#111827)]" />
      )}
    </div>
  );
}

function AdSection({ module }: { module: ExploreModule }) {
  const primary = module.media[0] ?? null;
  const secondary = module.media[1] ?? null;
  const tertiary = module.media[2] ?? null;

  return (
    <section className="w-full px-5 pb-8 md:px-10 lg:px-14 xl:px-20">
      <div className="group relative mx-auto block max-w-[1440px] overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#07090c] shadow-2xl shadow-black/50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_50%,rgba(255,255,255,0.12),transparent_26%),linear-gradient(90deg,#070707_0%,#090b10_32%,#030405_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black via-black/75 to-transparent" />

        <div className="relative grid min-h-[520px] gap-0 lg:grid-cols-[24rem_1fr] xl:grid-cols-[30rem_1fr]">
          <div className="relative flex min-h-[430px] flex-col items-center justify-start overflow-hidden border-b border-white/10 px-6 py-9 text-center lg:border-b-0 lg:border-r">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_78%,rgba(255,255,255,0.14),transparent_23%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.48))]" />
            <div className="relative z-10">
              <div className="text-[11px] font-black uppercase tracking-[0.26em] text-white/45">{module.kicker || "AD"}</div>
              <div className="mx-auto mt-4 h-px w-16 bg-gradient-to-r from-transparent via-cyan-200/40 to-transparent" />
              <h1 className="mt-5 text-3xl font-black leading-tight text-white md:text-4xl">{module.title}</h1>
              <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">{module.subtitle}</p>
              {module.ctaHref && (
                <Link
                  href={module.ctaHref}
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:scale-[1.03]"
                >
                  <Sparkles className="h-4 w-4" />
                  {module.ctaLabel || "Open"}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              )}

              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {(module.badges?.length ? module.badges : ["Demos", "Tutorials", "Best settings"]).slice(0, 3).map((label, idx) => {
                  const Icon = idx === 0 ? Play : idx === 1 ? ScrollText : Zap;
                  return (
                    <span
                      key={`${module._id}-${label}`}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs font-bold text-white/75 backdrop-blur"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="relative min-h-[520px] overflow-hidden p-4">
            <div className="grid h-full min-h-[500px] grid-cols-12 gap-3">
              <MediaTile media={primary} alt={module.title} className="col-span-7 aspect-[3/4]" />
              <div className="col-span-5 flex flex-col gap-3">
                <MediaTile media={secondary} alt={module.title} className="aspect-[16/10]" />
                <MediaTile media={tertiary} alt={module.title} className="aspect-[4/5]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function AdPage({ params }: { params: { slug: string } }) {
  const [modules, setModules] = useState<ExploreModule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const pageName = `ad-${params.slug}`;
    fetch(`/api/layouts?page=${encodeURIComponent(pageName)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const raw = data?.layoutBlocks as ExploreCmsLayout | null;
        const next = Array.isArray(raw?.modules) ? raw.modules : [];
        setModules(next);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [params.slug]);

  const visible = useMemo(() => modules.filter((m) => m && m._id), [modules]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#050812] text-white">
      {loading && (
        <section className="w-full px-5 pt-10 md:px-10 lg:px-14 xl:px-20">
          <div className="mx-auto max-w-[1440px] rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-8 text-sm text-white/70">
            Loading…
          </div>
        </section>
      )}

      {!loading && visible.length === 0 && (
        <section className="w-full px-5 pt-10 md:px-10 lg:px-14 xl:px-20">
          <div className="mx-auto max-w-[1440px] rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-8 text-sm text-white/70">
            This ad page is empty. Edit it from the admin panel.
          </div>
        </section>
      )}

      {visible.map((m) => (
        <AdSection key={m._id} module={m} />
      ))}
    </main>
  );
}

