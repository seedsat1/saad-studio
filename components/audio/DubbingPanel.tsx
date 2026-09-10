"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Download, Languages, Loader2, UploadCloud, X } from "lucide-react";
import {
  DUBBING_SOURCE_LANGUAGES,
  DUBBING_TARGET_LANGUAGES,
  DUBBING_MAX_BILLED_SECONDS,
} from "@/lib/dubbing-languages";
import { cn } from "@/lib/utils";

/**
 * Dubbing through WaveSpeed's elevenlabs/dubbing.
 *
 * The route bills per second of source media, so the duration is measured here
 * from the file itself and sent with the request — the server has no other way
 * to know it before dispatching, and without it every job was quoted as if it
 * were thirty seconds.
 *
 * The provider preserves the original speaker's voice; there is no voice to
 * choose, which is why this panel does not offer one.
 */

const CREDITS_PER_SECOND = 0.33;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function DubbingPanel({ isAr = false }: { isAr?: boolean }) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dataUrl, setDataUrl] = useState<string>("");
  const [duration, setDuration] = useState<number | null>(null);
  const [targetLang, setTargetLang] = useState("ar");
  const [sourceLang, setSourceLang] = useState("auto");
  const [numSpeakers, setNumSpeakers] = useState(0);
  const [dropBackgroundAudio, setDropBackgroundAudio] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const t = (ar: string, en: string) => (isAr ? ar : en);

  /** Reads the real length out of the file, which is what the job is billed on. */
  const measure = useCallback((url: string, isVideo: boolean) => {
    return new Promise<number | null>((resolve) => {
      const el = document.createElement(isVideo ? "video" : "audio");
      el.preload = "metadata";
      el.onloadedmetadata = () => resolve(Number.isFinite(el.duration) ? el.duration : null);
      el.onerror = () => resolve(null);
      el.src = url;
    });
  }, []);

  const onPick = useCallback(
    async (picked: File | null | undefined) => {
      setError(null);
      setResultUrl(null);
      if (!picked) return;
      const isMedia = picked.type.startsWith("video/") || picked.type.startsWith("audio/");
      if (!isMedia) {
        setError(t("اختر ملف فيديو أو صوت.", "Pick a video or an audio file."));
        return;
      }
      setFile(picked);
      const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(picked);
      });
      setDataUrl(url);
      setDuration(await measure(url, picked.type.startsWith("video/")));
    },
    [measure, t],
  );

  const billedSeconds = useMemo(() => {
    if (!duration) return null;
    return Math.min(DUBBING_MAX_BILLED_SECONDS, Math.max(1, Math.ceil(duration)));
  }, [duration]);

  const credits = billedSeconds ? Math.round(billedSeconds * CREDITS_PER_SECOND * 10) / 10 : null;
  const trimmed = Boolean(duration && duration > DUBBING_MAX_BILLED_SECONDS);

  const run = useCallback(async () => {
    if (!dataUrl || busy) return;
    setBusy(true);
    setError(null);
    setResultUrl(null);
    try {
      const isVideo = Boolean(file?.type.startsWith("video/"));
      const res = await fetch("/api/generate/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "dubbing",
          ...(isVideo ? { videoUrl: dataUrl } : { audioUrl: dataUrl }),
          targetLang,
          sourceLang,
          numSpeakers,
          dropBackgroundAudio,
          // The quote is per second, so the server needs the measured length.
          duration: billedSeconds ?? undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.publicError || data?.error || `HTTP ${res.status}`);
      const url = data?.videoUrl || data?.audioUrl;
      if (!url) throw new Error(t("لم يرجع المزوّد ملفاً.", "The provider returned no file."));
      setResultUrl(String(url));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("فشلت الدبلجة.", "Dubbing failed."));
    } finally {
      setBusy(false);
    }
  }, [billedSeconds, busy, dataUrl, dropBackgroundAudio, file, numSpeakers, sourceLang, targetLang, t]);

  return (
    <div className="space-y-4" dir={isAr ? "rtl" : "ltr"}>
      <div>
        <h3 className="flex items-center gap-2 text-sm font-black text-white">
          <Languages className="h-4 w-4 text-cyan-400" />
          {t("الدبلجة", "Dubbing")}
        </h3>
        <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
          {t(
            "يترجم الكلام ويعيد نطقه بلغة أخرى مع الحفاظ على صوت المتحدث الأصلي ونبرته — فلا يوجد صوت تختاره.",
            "Translates the speech and re-voices it in another language while keeping the original speaker's voice, which is why there is no voice to pick.",
          )}
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="video/*,audio/*"
        className="hidden"
        onChange={(e) => {
          void onPick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {file ? (
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-xs text-zinc-200">{file.name}</span>
          <span className="shrink-0 text-[10px] font-semibold text-zinc-500">
            {duration ? formatDuration(duration) : "…"}
          </span>
          <button
            type="button"
            onClick={() => {
              setFile(null);
              setDataUrl("");
              setDuration(null);
              setResultUrl(null);
            }}
            className="shrink-0 rounded-lg p-1 text-zinc-500 transition hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-white/10 bg-black/20 px-4 py-6 transition hover:border-cyan-500/50 hover:bg-black/40"
        >
          <UploadCloud className="h-5 w-5 text-cyan-400" />
          <span className="text-xs font-bold text-zinc-200">
            {t("ارفع فيديو أو صوت", "Upload a video or audio file")}
          </span>
          <span className="text-[10px] text-zinc-500">
            {t("حتى 15 دقيقة تُحاسب", "Up to 15 minutes are billed")}
          </span>
        </button>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            {t(`إلى (${DUBBING_TARGET_LANGUAGES.length} لغة)`, `Into (${DUBBING_TARGET_LANGUAGES.length})`)}
          </label>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="h-10 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-zinc-200 focus:border-cyan-500/60 focus:outline-none"
          >
            {DUBBING_TARGET_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {isAr ? l.nameAr : l.nameEn}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            {t("من", "From")}
          </label>
          <select
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
            className="h-10 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-zinc-200 focus:border-cyan-500/60 focus:outline-none"
          >
            {DUBBING_SOURCE_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {isAr ? l.nameAr : l.nameEn}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            {t("عدد المتحدثين", "Speakers")}
          </label>
          <select
            value={numSpeakers}
            onChange={(e) => setNumSpeakers(Number(e.target.value))}
            className="h-10 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-zinc-200 focus:border-cyan-500/60 focus:outline-none"
          >
            <option value={0}>{t("كشف تلقائي", "Detect automatically")}</option>
            {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <label className="flex cursor-pointer items-center gap-2 self-end rounded-xl border border-white/10 bg-black/40 px-3 py-2.5">
          <input
            type="checkbox"
            checked={dropBackgroundAudio}
            onChange={(e) => setDropBackgroundAudio(e.target.checked)}
            className="h-3.5 w-3.5 accent-cyan-500"
          />
          <span className="text-[11px] text-zinc-300">
            {t("إزالة الصوت الخلفي", "Drop background audio")}
          </span>
        </label>
      </div>

      {trimmed ? (
        <p className="text-[11px] font-semibold text-amber-400">
          {t(
            "الملف أطول من 15 دقيقة — سيُدبلج أول 15 دقيقة فقط، وهذا ما تُحاسب عليه.",
            "Longer than 15 minutes — only the first 15 are dubbed, and that is what you are billed for.",
          )}
        </p>
      ) : null}

      <button
        type="button"
        onClick={run}
        disabled={!dataUrl || busy}
        className={cn(
          "flex h-11 w-full items-center justify-center gap-2 rounded-xl text-xs font-black transition",
          !dataUrl || busy
            ? "cursor-not-allowed bg-white/5 text-zinc-500"
            : "bg-cyan-500 text-slate-950 hover:bg-cyan-400",
        )}
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("جارٍ الدبلجة…", "Dubbing…")}
          </>
        ) : (
          <>
            <Languages className="h-4 w-4" />
            {credits !== null
              ? t(`دبلج — ${credits} نقطة`, `Dub — ${credits} credits`)
              : t("دبلج", "Dub")}
          </>
        )}
      </button>

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-300">
          {error}
        </p>
      ) : null}

      {resultUrl ? (
        <div className="space-y-2 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.05] p-3">
          {/\.(mp4|mov|webm)(\?|$)/i.test(resultUrl) ? (
            <video src={resultUrl} controls className="w-full rounded-lg" />
          ) : (
            <audio src={resultUrl} controls className="w-full" />
          )}
          <a
            href={resultUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-300 hover:text-emerald-200"
          >
            <Download className="h-3 w-3" />
            {t("تحميل", "Download")}
          </a>
        </div>
      ) : null}
    </div>
  );
}

export default DubbingPanel;
