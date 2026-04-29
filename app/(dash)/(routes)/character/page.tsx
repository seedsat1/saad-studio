"use client";

import { usePageLayout } from "@/lib/use-page-layout";

export default function CharacterPage() {
  const { hero } = usePageLayout("character");
  const heroMedia = hero?.media;

  return (
    <div className="min-h-screen" style={{ background: "#060c18" }}>
      {hero ? (
        <section
          className="relative overflow-hidden border-b border-white/10"
          style={{
            minHeight: 220,
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
          <div className="absolute inset-0 bg-slate-950/65" />
          <div className="relative z-10 max-w-6xl mx-auto px-6 py-10">
            {hero.badge ? (
              <span className="inline-flex px-2 py-1 rounded-full text-[10px] font-bold bg-violet-600 text-white">
                {hero.badge}
              </span>
            ) : null}
            <h1 className="text-white text-3xl font-bold mt-3">
              {hero.title}
            </h1>
            <p className="text-slate-300 mt-2 max-w-2xl">{hero.subtitle}</p>
          </div>
        </section>
      ) : null}

      <iframe
        src="/characters.html"
        className="w-full border-0"
        style={{ height: hero ? "calc(100vh - 284px)" : "calc(100vh - 64px)" }}
        title="Characters"
      />
    </div>
  );
}
