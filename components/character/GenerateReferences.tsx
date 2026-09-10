"use client";

import { useCallback, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

/**
 * Builds a character's reference set from a description, for a character nobody
 * has photos of — an invented host, a mascot, a spokesperson.
 *
 * The first portrait comes from the text; the other two are generated *from
 * that portrait*. Generating three times from the same text returns three
 * different people, so feeding the first back as the reference is the whole
 * trick.
 *
 * Shared by the Character Studio page and the Reference Studio's character tab,
 * which each store the results differently — the page keeps File objects, the
 * modal keeps data URLs — so the caller receives both and takes what it needs.
 */

export interface GeneratedReference {
  file: File;
  dataUrl: string;
  name: string;
}

const ANGLES = [
  "Same person, same face, same hair, same clothing. Turned three-quarters to their left.",
  "Same person, same face, same hair, same clothing. Full profile, side view.",
];

export function GenerateReferences({
  onGenerated,
  isAr = false,
  disabled = false,
}: {
  onGenerated: (reference: GeneratedReference) => void;
  isAr?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const t = (ar: string, en: string) => (isAr ? ar : en);

  const run = useCallback(async () => {
    const brief = prompt.trim();
    if (!brief || busy) return;
    setError(null);

    const shoot = async (text: string, referenceUrl?: string) => {
      const res = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          modelId: "nano-banana-2",
          aspectRatio: "1:1",
          ...(referenceUrl ? { imageUrls: [referenceUrl] } : {}),
        }),
      });
      const data = await res.json().catch(() => null);
      const url = data?.imageUrl || (Array.isArray(data?.imageUrls) ? data.imageUrls[0] : null);
      if (!res.ok || !url) {
        throw new Error(data?.publicError || data?.error || t("فشل التوليد.", "Generation failed."));
      }
      return String(url);
    };

    const attach = async (url: string, index: number) => {
      const blob = await fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`)
        .then((r) => (r.ok ? r.blob() : fetch(url).then((x) => x.blob())))
        .catch(() => fetch(url).then((x) => x.blob()));
      const name = `generated-${index}.png`;
      const file = new File([blob], name, { type: blob.type || "image/png" });
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      onGenerated({ file, dataUrl, name });
    };

    try {
      setBusy(t("بورتريه 1 من 3…", "Portrait 1 of 3…"));
      const base = await shoot(
        `Neutral head-and-shoulders reference portrait of ${brief}. Facing the camera directly, ` +
          `relaxed neutral expression, even soft studio light with no harsh shadows, plain mid-grey ` +
          `seamless background, sharp focus on the face, no props, no text, no watermark.`,
      );
      await attach(base, 1);

      for (let i = 0; i < ANGLES.length; i++) {
        setBusy(t(`بورتريه ${i + 2} من 3…`, `Portrait ${i + 2} of 3…`));
        const url = await shoot(
          `${ANGLES[i]} Keep the identity, facial features, skin tone and proportions identical to ` +
            `the attached reference. Same even studio light and plain mid-grey background.`,
          base,
        );
        await attach(url, i + 2);
      }
      setOpen(false);
      setPrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("تعذّر توليد الصور المرجعية.", "Could not generate reference photos."));
    } finally {
      setBusy(null);
    }
  }, [busy, onGenerated, prompt, t]);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled || Boolean(busy)}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-violet-500/25 bg-violet-500/[0.06] px-4 text-xs font-bold text-violet-300 transition hover:bg-violet-500/[0.12] disabled:opacity-50"
      >
        <Sparkles size={13} />
        {t("ولّد", "Generate")}
      </button>

      {open ? (
        <div className="space-y-3 rounded-2xl border border-violet-500/20 bg-violet-500/[0.03] p-4">
          <p className="text-[11px] leading-relaxed text-zinc-400">
            {t(
              "اوصف الوجه ونصوّر ثلاثة مراجع متطابقة — أمامي وثلاثة أرباع وجانبي — من بورتريه واحد مولّد، فيكون الثلاثة نفس الشخص. يكلّف ثلاث توليدات صور.",
              "Describe the face and we will shoot three matching references — front, three-quarter and profile — from one generated portrait, so all three are the same person. Costs three image generations.",
            )}
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            disabled={Boolean(busy)}
            placeholder={t(
              "مثال: امرأة عراقية في أواخر العشرينات، شعر أسود قصير مجعّد، عيون بنية، مكياج خفيف، بليزر فحمي",
              "e.g. an Iraqi woman in her late twenties, short dark curly hair, warm brown eyes, light makeup, charcoal blazer",
            )}
            className="w-full rounded-xl border border-white/5 bg-black/40 px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 transition focus:border-violet-500/60 focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={run}
            disabled={!prompt.trim() || Boolean(busy)}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-xs font-bold text-white transition hover:bg-violet-500 disabled:opacity-40 disabled:hover:bg-violet-600"
          >
            {busy ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                {busy}
              </>
            ) : (
              <>
                <Sparkles size={13} />
                {t("ولّد 3 مراجع", "Generate 3 references")}
              </>
            )}
          </button>
          {error ? <p className="text-[11px] text-rose-400">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

export default GenerateReferences;
