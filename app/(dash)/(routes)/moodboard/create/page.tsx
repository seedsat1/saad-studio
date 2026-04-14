"use client";

import { Suspense, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, ChevronDown, Loader2, Zap } from "lucide-react";
import { presets, getPresetById } from "@/lib/moodboard-data";
import { PresetSelector } from "@/components/moodboard/PresetSelector";
import { StyleStrip } from "@/components/moodboard/StyleStrip";
import { getImageCredits } from "@/lib/credit-pricing";

// â”€â”€â”€ Result card gradients â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const RESULT_GRADIENTS = [
  "from-amber-700 via-orange-800 to-rose-900",
  "from-violet-700 via-purple-800 to-indigo-900",
  "from-cyan-700 via-blue-800 to-indigo-900",
  "from-emerald-700 via-teal-800 to-cyan-900",
];

// â”€â”€â”€ Dropdown options â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ASPECT_RATIOS = ["1:1", "4:3", "3:4", "16:9", "9:16"];
const QUALITIES = ["Standard", "HD", "Ultra HD"];

// â”€â”€â”€ Simple select component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SelectDropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-300 whitespace-nowrap transition-colors"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <span className="text-slate-500 text-xs hidden sm:inline">{label}</span>
        <span className="font-medium">{value}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.97 }}
            transition={{ duration: 0.13 }}
            onBlur={() => setOpen(false)}
            className="absolute top-full mt-1.5 left-0 z-40 min-w-[130px] rounded-xl py-1 shadow-xl"
            style={{ background: "#0b1225", border: "1px solid rgba(148,163,184,0.1)" }}
          >
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className="w-full text-left px-3.5 py-2 text-sm hover:bg-white/5 transition-colors"
                style={{ color: opt === value ? "#06b6d4" : "#94a3b8" }}
              >
                {opt}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// â”€â”€â”€ Toggle switch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      onClick={onChange}
      className="flex items-center gap-2 text-sm text-slate-300"
    >
      <div
        className="relative w-9 h-5 rounded-full transition-colors duration-200"
        style={{ background: checked ? "#06b6d4" : "rgba(255,255,255,0.12)" }}
      >
        <motion.div
          animate={{ x: checked ? 18 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
        />
      </div>
      <span className="hidden sm:inline text-slate-400 text-xs">{label}</span>
    </button>
  );
}

// â”€â”€â”€ Main content (needs useSearchParams â€” must be inside Suspense) â”€
function CreateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawPresetId = searchParams.get("preset") ?? "warm-ambient";

  const preset =
    rawPresetId === "custom"
      ? { ...presets[0], id: "custom", name: "Custom" }
      : getPresetById(rawPresetId) ?? presets[0];

  const [prompt, setPrompt] = useState("");
  const [aspect, setAspect] = useState("1:1");
  const [quality, setQuality] = useState("HD");
  const [enhance, setEnhance] = useState(true);
  const [soulId, setSoulId] = useState("None");
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [showToast, setShowToast] = useState(false);
  const moodboardImageCount = 4;
  const creditsPerGeneration = getImageCredits("nano-banana-pro", moodboardImageCount);

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    setResults([]);
    await new Promise((r) => setTimeout(r, 3000));
    setResults([...RESULT_GRADIENTS]);
    setGenerating(false);
    // Toast
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3500);
  };

  return (
    <div
      className="min-h-screen"
      lang="en"
      dir="ltr"
      style={{ background: "#060c18" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6"
      >
        {/* â”€â”€â”€ TOP BAR â”€â”€â”€ */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/moodboard"
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Moodboard</span>
          </Link>

          <PresetSelector currentPreset={preset} />

          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm"
            style={{
              background: "rgba(163,230,53,0.08)",
              border: "1px solid rgba(163,230,53,0.2)",
              color: "#a3e635",
            }}
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="font-semibold">1,250</span>
            <span className="text-slate-500 text-xs hidden sm:inline">credits</span>
          </div>
        </div>

        {/* â”€â”€â”€ ACTIVE STYLE STRIP â”€â”€â”€ */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: "#0b1225",
            border: "1px solid rgba(148,163,184,0.06)",
          }}
        >
          <StyleStrip
            preset={preset}
            onChangePreset={() => router.push("/moodboard")}
          />
        </div>

        {/* â”€â”€â”€ PROMPT AREA â”€â”€â”€ */}
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{
            background: "#0b1225",
            border: "1px solid rgba(148,163,184,0.06)",
          }}
        >
          {/* Textarea */}
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`Describe what you want to create with the ${preset.name} style...`}
              maxLength={600}
              rows={4}
              className="w-full rounded-xl px-4 py-3.5 text-slate-200 text-sm outline-none transition-all duration-200 placeholder:text-slate-600 resize-none"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(148,163,184,0.1)",
                minHeight: 100,
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "rgba(6,182,212,0.5)";
                e.target.style.boxShadow = "0 0 0 3px rgba(6,182,212,0.07)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(148,163,184,0.1)";
                e.target.style.boxShadow = "none";
              }}
            />
            <span className="absolute bottom-3 right-3.5 text-slate-600 text-xs pointer-events-none">
              {prompt.length}/600
            </span>
          </div>

          {/* Settings row */}
          <div className="flex flex-wrap items-center gap-2">
            <SelectDropdown
              label="Aspect "
              options={ASPECT_RATIOS}
              value={aspect}
              onChange={setAspect}
            />
            <SelectDropdown
              label="Quality "
              options={QUALITIES}
              value={quality}
              onChange={setQuality}
            />
            <Toggle
              checked={enhance}
              onChange={() => setEnhance((v) => !v)}
              label="Enhance"
            />
            <SelectDropdown
              label="Soul ID "
              options={["None", "+ Create Soul ID"]}
              value={soulId}
              onChange={setSoulId}
            />

            {/* Spacer */}
            <div className="flex-1 hidden sm:block" />

            {/* Generate button */}
            <motion.button
              onClick={handleGenerate}
              disabled={generating}
              whileHover={
                !generating
                  ? {
                      scale: 1.03,
                      boxShadow: "0 0 28px rgba(163,230,53,0.35)",
                      filter: "brightness(1.08)",
                    }
                  : {}
              }
              whileTap={!generating ? { scale: 0.97 } : {}}
              className="flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-200"
              style={{
                background: generating ? "rgba(163,230,53,0.3)" : "#a3e635",
                color: generating ? "rgba(163,230,53,0.5)" : "#060c18",
                cursor: generating ? "not-allowed" : "pointer",
                minWidth: 180,
                justifyContent: "center",
              }}
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <span>âœ¦</span>
                  Generate Â· {creditsPerGeneration} credits
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* â”€â”€â”€ RESULTS â”€â”€â”€ */}
        <div
          className="rounded-2xl p-6 min-h-[320px] flex flex-col"
          style={{
            background: "#0b1225",
            border: "1px solid rgba(148,163,184,0.06)",
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Generated Results
            </h2>
            {results.length > 0 && (
              <span className="text-xs text-slate-500">
                {results.length} images
              </span>
            )}
          </div>

          <AnimatePresence mode="wait">
            {generating && (
              <motion.div
                key="generating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center gap-4"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.3, repeat: Infinity, ease: "linear" }}
                  className="w-10 h-10 rounded-full border-2 border-transparent"
                  style={{
                    borderTopColor: "#a3e635",
                    borderRightColor: "rgba(163,230,53,0.25)",
                  }}
                />
                <p className="text-slate-400 text-sm">
                  Generating with{" "}
                  <span className="text-white font-medium">{preset.name}</span>{" "}
                  style...
                </p>
              </motion.div>
            )}

            {!generating && results.length === 0 && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex items-center justify-center"
              >
                <div
                  className="rounded-xl py-12 px-8 text-center w-full max-w-md"
                  style={{
                    border: "1.5px dashed rgba(148,163,184,0.1)",
                  }}
                >
                  <p className="text-slate-500 text-sm">
                    Generate images to see results here
                  </p>
                </div>
              </motion.div>
            )}

            {!generating && results.length > 0 && (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-2 lg:grid-cols-4 gap-4"
              >
                {results.map((gradient, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{
                      duration: 0.45,
                      delay: i * 0.1,
                      ease: "easeOut",
                    }}
                    whileHover={{ scale: 1.03, y: -3 }}
                    className="relative rounded-xl overflow-hidden group/result cursor-pointer"
                    style={{
                      aspectRatio: "1/1",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${gradient}`}
                    />
                    <div className="absolute inset-0 bg-white/5" />
                    {/* Hover download icon */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/result:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
                      >
                        <Download className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* â”€â”€â”€ TOAST â”€â”€â”€ */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 60, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 60, x: "-50%" }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed bottom-6 left-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-full text-sm font-medium shadow-2xl"
            style={{
              background: "#0b1225",
              border: "1px solid rgba(163,230,53,0.3)",
              color: "#a3e635",
            }}
          >
            <span>âœ¦</span>
            Generated {moodboardImageCount} images Â· {creditsPerGeneration} credits used
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// â”€â”€â”€ Page export with Suspense (required for useSearchParams in Next.js 14) â”€
export default function CreatePage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: "#060c18" }}
        >
          <div
            className="w-10 h-10 rounded-full border-2 border-transparent animate-spin"
            style={{
              borderTopColor: "#06b6d4",
              borderRightColor: "rgba(6,182,212,0.25)",
            }}
          />
        </div>
      }
    >
      <CreateContent />
    </Suspense>
  );
}


