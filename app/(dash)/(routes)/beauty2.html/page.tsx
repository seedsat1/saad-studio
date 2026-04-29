"use client";

import { useMemo } from "react";
import { usePageLayout } from "@/lib/use-page-layout";

export default function BeautyStudioPage() {
  const { blocks, hero } = usePageLayout("beauty2");

  const featureBlocks = useMemo(
    () => blocks.filter((b) => b.type === "FEATURE_CARD" || b.type === "DISCOVER_GRID"),
    [blocks]
  );

  const heroMedia = hero?.media;

  return (
    <div className="min-h-screen" style={{ background: "#060c18" }}>
      {hero ? (
        <section
          className="relative overflow-hidden border-b border-white/10"
          style={{
            minHeight: 260,
            backgroundImage:
              heroMedia?.type === "image" && heroMedia.url ? `url(${heroMedia.url})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {heroMedia?.type === "video" && heroMedia.url ? (
            <video
              src={heroMedia.url}
              poster={heroMedia.poster}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-slate-950/60" />
          <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
            {hero.badge ? (
              <span className="inline-flex px-2 py-1 rounded-full text-[10px] font-bold bg-violet-600 text-white">
                {hero.badge}
              </span>
            ) : null}
            <h1 className="text-white text-3xl font-bold mt-3">{hero.title}</h1>
            <p className="text-slate-300 mt-2 max-w-2xl">{hero.subtitle}</p>
          </div>
        </section>
      ) : null}

      {featureBlocks.length > 0 ? (
        <section className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {featureBlocks.slice(0, 6).map((block) => (
            <article
              key={block.id}
              className="rounded-xl border border-white/10 bg-slate-900/55 overflow-hidden"
            >
              {block.media?.type === "video" && block.media.url ? (
                <video
                  src={block.media.url}
                  poster={block.media.poster}
                  muted
                  loop
                  autoPlay
                  playsInline
                  preload="metadata"
                  className="w-full h-40 object-cover"
                />
              ) : block.media?.type === "image" && block.media.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={block.media.url} alt={block.title} className="w-full h-40 object-cover" />
              ) : null}
              <div className="p-4">
                <h3 className="text-white font-semibold text-sm">{block.title}</h3>
                <p className="text-slate-400 text-xs mt-1">{block.subtitle}</p>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      <iframe
        src="/beauty2-static.html"
        className="w-full border-0"
        style={{ height: "calc(100vh - 64px)", minHeight: 900 }}
        title="Beauty Studio Static Content"
      />
    </div>
  );
}
