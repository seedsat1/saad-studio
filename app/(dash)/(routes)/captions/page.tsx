"use client";

import { FormEvent, useMemo, useState } from "react";
import { useGenerationGate } from "@/hooks/use-generation-gate";

type WhisperModel =
  | "wavespeed-ai/openai-whisper"
  | "wavespeed-ai/openai-whisper-turbo"
  | "wavespeed-ai/openai-whisper-with-video";

const MODEL_OPTIONS: Array<{ value: WhisperModel; label: string }> = [
  { value: "wavespeed-ai/openai-whisper", label: "OpenAI Whisper" },
  { value: "wavespeed-ai/openai-whisper-turbo", label: "OpenAI Whisper Turbo" },
  { value: "wavespeed-ai/openai-whisper-with-video", label: "OpenAI Whisper With Video" },
];

export default function CaptionsPage() {
  const { guardGeneration, getSafeErrorMessage } = useGenerationGate();
  const [model, setModel] = useState<WhisperModel>("wavespeed-ai/openai-whisper-with-video");
  const [mediaUrl, setMediaUrl] = useState("");
  const [language, setLanguage] = useState("auto");
  const [outputFormat, setOutputFormat] = useState("text");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");
  const [captionUrl, setCaptionUrl] = useState("");

  const canSubmit = useMemo(() => {
    return Boolean((mediaUrl || "").trim() || file);
  }, [mediaUrl, file]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit || loading) return;

    const gate = await guardGeneration({
      requiredCredits: 1,
      action: "captions:generate",
    });
    if (!gate.ok) {
      if (gate.reason === "error") {
        setError(gate.message ?? getSafeErrorMessage(gate.message));
      }
      return;
    }

    setLoading(true);
    setError("");
    setTranscript("");
    setCaptionUrl("");

    try {
      let res: Response;

      if (file) {
        const formData = new FormData();
        formData.append("model", model);
        formData.append("language", language.trim() || "auto");
        formData.append("outputFormat", outputFormat);
        formData.append("file", file);

        res = await fetch("/api/generate/captions", {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch("/api/generate/captions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            mediaUrl: mediaUrl.trim(),
            language: language.trim() || "auto",
            outputFormat,
          }),
        });
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Caption generation failed.");
      }

      setTranscript(typeof data?.text === "string" ? data.text : "");
      setCaptionUrl(typeof data?.captionUrl === "string" ? data.captionUrl : "");
    } catch (err) {
      setError(getSafeErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 md:p-6 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-xl border border-white/10 bg-zinc-900/80 p-5 md:p-6">
          <h1 className="text-2xl md:text-3xl font-semibold">Captions Studio</h1>
          <p className="mt-2 text-sm text-zinc-300">
            Generate captions with Saad Studio models without any localhost dependency.
          </p>
        </div>

        <form onSubmit={onSubmit} className="rounded-xl border border-white/10 bg-zinc-900/80 p-5 md:p-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-zinc-300">Model</span>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value as WhisperModel)}
                className="w-full rounded-lg bg-zinc-800 border border-white/10 px-3 py-2"
              >
                {MODEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm text-zinc-300">Language (auto or ISO code)</span>
              <input
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full rounded-lg bg-zinc-800 border border-white/10 px-3 py-2"
                placeholder="auto"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm text-zinc-300">Media URL (public)</span>
              <input
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                className="w-full rounded-lg bg-zinc-800 border border-white/10 px-3 py-2"
                placeholder="https://..."
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-zinc-300">Or upload file</span>
              <input
                type="file"
                accept="audio/*,video/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full rounded-lg bg-zinc-800 border border-white/10 px-3 py-2"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-zinc-300">Output format</span>
              <select
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value)}
                className="w-full rounded-lg bg-zinc-800 border border-white/10 px-3 py-2"
              >
                <option value="text">Text</option>
                <option value="srt">SRT</option>
                <option value="vtt">VTT</option>
                <option value="json">JSON</option>
              </select>
            </label>
          </div>

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 font-medium text-zinc-950"
          >
            {loading ? "Generating..." : "Generate Captions"}
          </button>

          {error ? <div className="text-sm text-red-400">{error}</div> : null}
        </form>

        <div className="rounded-xl border border-white/10 bg-zinc-900/80 p-5 md:p-6 space-y-3">
          <h2 className="text-lg font-medium">Result</h2>

          {captionUrl ? (
            <a href={captionUrl} target="_blank" rel="noreferrer" className="text-cyan-300 underline break-all">
              Open generated caption file
            </a>
          ) : null}

          <textarea
            value={transcript}
            readOnly
            placeholder="Transcript will appear here..."
            className="min-h-[280px] w-full rounded-lg bg-zinc-950 border border-white/10 px-3 py-2 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
