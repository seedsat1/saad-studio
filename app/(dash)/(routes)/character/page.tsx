"use client";

import { usePageLayout } from "@/lib/use-page-layout";

export default function CharacterPage() {
  const { hero } = usePageLayout("character");

  return (
    <div className="min-h-screen" style={{ background: "#060c18" }}>
      {hero ? (
        <section
          className="relative overflow-hidden border-b border-white/10"
          style={{
            minHeight: 220,
            backgroundImage: hero.mediaUrl ? `url(${hero.mediaUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
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
