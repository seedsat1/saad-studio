"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Camera, CheckCircle2, Copy, Loader2, Plus, Sparkles, Trash2, UploadCloud, UserRound, Wand2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageLayout } from "@/lib/use-page-layout";
import Image from "next/image";

type CharacterRecord = {
  id: string;
  name: string;
  description: string;
  referenceUrls: string[];
  coverUrl: string | null;
  status: string;
  provider: string;
  providerCharacterId?: string | null;
  createdAt: string;
  updatedAt: string;
};

type LocalRefImage = {
  id: string;
  file: File;
  dataUrl: string;
};

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export default function CharacterPage() {
  const { hero } = usePageLayout("character");
  const heroMedia = hero?.media;
  const [characters, setCharacters] = useState<CharacterRecord[]>([]);
  const [refs, setRefs] = useState<LocalRefImage[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [variationPrompt, setVariationPrompt] = useState("Create a polished campaign-ready portrait with a new outfit and cinematic studio lighting.");
  const [generatingCharacterId, setGeneratingCharacterId] = useState<string | null>(null);
  const [generatedUrls, setGeneratedUrls] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const canCreate = useMemo(() => name.trim().length > 0 && refs.length > 0 && !saving, [name, refs.length, saving]);

  const loadCharacters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/characters", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(data?.characters)) throw new Error(data?.error || "Failed to load characters");
      setCharacters(data.characters);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load characters");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCharacters();
  }, [loadCharacters]);

  const onPickImages = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/")).slice(0, 24 - refs.length);
    event.target.value = "";
    if (!files.length) return;
    const mapped = await Promise.all(files.map(async (file) => ({ id: uid("ref"), file, dataUrl: await fileToDataUrl(file) })));
    setRefs((prev) => [...prev, ...mapped].slice(0, 24));
  }, [refs.length]);

  const createCharacter = useCallback(async () => {
    if (!canCreate) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          images: refs.map((ref) => ({ name: ref.file.name, dataUrl: ref.dataUrl })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.character) throw new Error(data?.error || "Failed to create character");
      setCharacters((prev) => [data.character, ...prev]);
      setName("");
      setDescription("");
      setRefs([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create character");
    } finally {
      setSaving(false);
    }
  }, [canCreate, description, name, refs]);

  const deleteCharacter = useCallback(async (id: string) => {
    setCharacters((prev) => prev.filter((character) => character.id !== id));
    await fetch(`/api/characters/${id}`, { method: "DELETE" }).catch(() => null);
  }, []);

  const generateVariation = useCallback(async (character: CharacterRecord) => {
    setGeneratingCharacterId(character.id);
    setError(null);
    try {
      const res = await fetch(`/api/characters/${character.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: variationPrompt, size: "1024*1024" }),
      });
      const data = await res.json().catch(() => null);
      const urls = Array.isArray(data?.imageUrls)
        ? data.imageUrls.filter((url: unknown): url is string => typeof url === "string" && url.length > 0)
        : data?.imageUrl
          ? [String(data.imageUrl)]
          : [];
      if (!res.ok || !urls.length) throw new Error(data?.error || "Instant character did not return an image.");
      setGeneratedUrls((prev) => ({ ...prev, [character.id]: [...urls, ...(prev[character.id] ?? [])] }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Instant character generation failed");
    } finally {
      setGeneratingCharacterId(null);
    }
  }, [variationPrompt]);

  const copyReference = useCallback(async (character: CharacterRecord) => {
    const text = [
      `Character: ${character.name}`,
      character.description ? `Description: ${character.description}` : "",
      `Reference images: ${character.referenceUrls.join(", ")}`,
    ].filter(Boolean).join("\n");
    await navigator.clipboard.writeText(text).catch(() => null);
    setCopiedId(character.id);
    setTimeout(() => setCopiedId(null), 1400);
  }, []);

  return (
    <div className="min-h-screen bg-[#050914] text-white">
      {hero ? (
        <section className="relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0">
            {heroMedia?.type === "video" && heroMedia.url ? (
              <video
                src={heroMedia.url}
                poster={heroMedia.poster}
                autoPlay
                muted
                loop
                playsInline
                preload="none"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : heroMedia?.type === "image" && heroMedia.url ? (
              <Image
                src={heroMedia.url}
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-b from-[#050914]/30 via-[#050914]/70 to-[#050914]" />
            <div className="absolute inset-0 opacity-70 [background:radial-gradient(800px_circle_at_30%_20%,rgba(217,70,239,.22),transparent_55%),radial-gradient(700px_circle_at_70%_30%,rgba(59,130,246,.18),transparent_55%)]" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 py-10 md:px-6">
            <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-end">
              <div>
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold tracking-wide text-white/90">
                  {hero.badge || "Character Library"}
                </span>
                <h1 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl">
                  {hero.title || "Reusable AI Characters"}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  {hero.subtitle || "Create identity reference sets once, then reuse them across image and video tools."}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <a
                    href="#create"
                    className="inline-flex items-center gap-2 rounded-xl bg-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-fuchsia-500"
                  >
                    <Plus className="h-4 w-4" />
                    Create Character
                  </a>
                  <a
                    href="#library"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/90 hover:bg-white/10"
                  >
                    <UserRound className="h-4 w-4" />
                    View Library
                  </a>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-500/15 text-fuchsia-300">
                    <Camera className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Best results</div>
                    <div className="text-xs text-slate-400">Upload 5–12 clear images of the same person.</div>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-slate-300">
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                    <span className="text-slate-400">Angles</span>
                    <span>Front · 3/4 · Side</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                    <span className="text-slate-400">Lighting</span>
                    <span>Even · No filters</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                    <span className="text-slate-400">Avoid</span>
                    <span>Heavy blur · Group shots</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:px-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        <section id="create" className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-fuchsia-500/15 text-fuchsia-300">
              <UserRound className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Create Character</h2>
              <p className="text-xs text-slate-500">Upload clear views of the same person to reuse anywhere.</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Character name"
              className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm outline-none transition focus:border-fuchsia-400"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Identity notes, style, traits, recurring details..."
              rows={4}
              className="w-full resize-none rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm outline-none transition focus:border-fuchsia-400"
            />

            <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-slate-950/50 p-4 text-center transition hover:border-fuchsia-400/60">
              <UploadCloud className="mb-2 h-7 w-7 text-fuchsia-300" />
              <span className="text-sm font-semibold">Upload reference photos</span>
              <span className="mt-1 text-xs text-slate-500">Front, 3/4, side, full body. Up to 24 images.</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={onPickImages} />
            </label>

            {refs.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {refs.map((ref) => (
                  <div key={ref.id} className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-black">
                    <img src={ref.dataUrl} alt="" className="h-full w-full object-cover" />
                    <button
                      onClick={() => setRefs((prev) => prev.filter((item) => item.id !== ref.id))}
                      className="absolute right-1 top-1 hidden rounded-full bg-black/70 p-1 text-white group-hover:block"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                {error}
              </div>
            ) : null}

            <button
              onClick={createCharacter}
              disabled={!canCreate}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition",
                canCreate ? "bg-fuchsia-600 text-white hover:bg-fuchsia-500" : "cursor-not-allowed bg-white/10 text-slate-500",
              )}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Save Character
            </button>
          </div>
        </section>

        <section id="library" className="min-h-[560px] rounded-2xl border border-white/10 bg-white/[0.025] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Character Library</h2>
              <p className="text-xs text-slate-500">These characters are available as reusable references in the image page.</p>
            </div>
            <button onClick={() => void loadCharacters()} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5">
              Refresh
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/50 p-3">
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Instant Character Prompt</label>
            <textarea
              value={variationPrompt}
              onChange={(e) => setVariationPrompt(e.target.value)}
              rows={3}
              className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-fuchsia-400"
              placeholder="Describe the new look, outfit, lighting, pose, or scene..."
            />
            <p className="mt-2 text-xs text-slate-500">Uses WaveSpeed instant-character and saves the output to Gallery.</p>
          </div>

          {loading ? (
            <div className="flex h-72 items-center justify-center text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading characters
            </div>
          ) : characters.length === 0 ? (
            <div className="flex h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 text-center">
              <Camera className="mb-3 h-8 w-8 text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">No characters yet</p>
              <p className="mt-1 max-w-sm text-xs text-slate-500">Create one from reference photos, then use it as identity input in generation tools.</p>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {characters.map((character) => (
                <article key={character.id} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60">
                  <div className="relative aspect-[4/3] bg-slate-900">
                    {character.coverUrl ? (
                      <img src={character.coverUrl} alt={character.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-600"><UserRound className="h-10 w-10" /></div>
                    )}
                    <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-200">
                      <CheckCircle2 className="h-3 w-3" /> {character.status}
                    </div>
                  </div>
                  <div className="space-y-3 p-3">
                    <div>
                      <h3 className="line-clamp-1 text-sm font-semibold">{character.name}</h3>
                      <p className="mt-1 line-clamp-2 min-h-8 text-xs text-slate-500">{character.description || "Reusable reference identity."}</p>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{character.referenceUrls.length} reference image{character.referenceUrls.length === 1 ? "" : "s"}</span>
                      <span>{character.provider}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => void copyReference(character)} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/10 px-2 py-2 text-xs text-slate-200 hover:bg-white/5">
                        {copiedId === character.id ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedId === character.id ? "Copied" : "Copy refs"}
                      </button>
                      <a href={`/image?characterId=${encodeURIComponent(character.id)}`} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-fuchsia-600 px-2 py-2 text-xs font-semibold text-white hover:bg-fuchsia-500">
                        <Wand2 className="h-3.5 w-3.5" /> Use
                      </a>
                      <button
                        onClick={() => void generateVariation(character)}
                        disabled={generatingCharacterId === character.id}
                        className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-2 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/15 disabled:opacity-60"
                      >
                        {generatingCharacterId === character.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        Generate
                      </button>
                      <button onClick={() => void deleteCharacter(character.id)} className="rounded-lg border border-red-500/20 px-2 py-2 text-red-300 hover:bg-red-500/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {generatedUrls[character.id]?.length ? (
                      <div className="grid grid-cols-3 gap-2">
                        {generatedUrls[character.id].slice(0, 6).map((url) => (
                          <button key={url} onClick={() => window.open(url, "_blank", "noopener,noreferrer")} className="aspect-square overflow-hidden rounded-lg border border-white/10 bg-black">
                            <img src={url} alt="Generated character variation" className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
