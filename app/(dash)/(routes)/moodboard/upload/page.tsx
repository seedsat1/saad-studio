"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { UploadDropzone, Thumbnail } from "@/components/moodboard/UploadDropzone";

export default function MoodboardUploadPage() {
  const [thumbnails, setThumbnails] = useState<Thumbnail[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAddThumbnails = useCallback((items: Thumbnail[]) => {
    setThumbnails((prev) => [...prev, ...items]);
  }, []);

  const handleRemoveThumbnail = useCallback((id: string) => {
    setThumbnails((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const canCreate = thumbnails.length >= 10 && name.trim().length > 0;

  const handleCreate = async () => {
    if (!canCreate || loading) return;
    setLoading(true);
    // Simulate AI moodboard creation (3s)
    await new Promise((r) => setTimeout(r, 3000));
    router.push("/moodboard/create?preset=custom");
  };

  return (
    <div
      className="min-h-screen"
      lang="en"
      dir="ltr"
      style={{ background: "#060c18" }}
    >
      <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Page transition */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="space-y-8"
        >
          {/* Back link */}
          <Link
            href="/moodboard"
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Moodboard
          </Link>

          {/* Header */}
          <div>
            <h1
              className="text-3xl sm:text-4xl font-bold text-white mb-2"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Create Custom Moodboard
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Upload 10–80 reference images that share your desired style
            </p>
          </div>

          {/* Drop zone card */}
          <div
            className="rounded-2xl p-6 sm:p-8"
            style={{
              background: "#0b1225",
              border: "1px solid rgba(148,163,184,0.06)",
            }}
          >
            <UploadDropzone
              thumbnails={thumbnails}
              onAddThumbnails={handleAddThumbnails}
              onRemoveThumbnail={handleRemoveThumbnail}
              maxImages={80}
            />
          </div>

          {/* Moodboard name */}
          <div className="space-y-2">
            <label className="text-sm text-slate-400 font-medium uppercase tracking-wider">
              Moodboard Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My moodboard name..."
              maxLength={60}
              className="w-full rounded-xl px-4 py-3 text-slate-200 text-sm outline-none transition-all duration-200 placeholder:text-slate-600"
              style={{
                background: "#0b1225",
                border: "1px solid rgba(148,163,184,0.1)",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "rgba(6,182,212,0.5)";
                e.target.style.boxShadow = "0 0 0 3px rgba(6,182,212,0.08)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(148,163,184,0.1)";
                e.target.style.boxShadow = "none";
              }}
            />
            <p className="text-slate-600 text-xs text-right">
              {name.length}/60
            </p>
          </div>

          {/* Requirements hint */}
          <AnimatePresence>
            {thumbnails.length < 10 && thumbnails.length > 0 && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-amber-400/80 text-xs"
              >
                Add at least {10 - thumbnails.length} more image
                {10 - thumbnails.length !== 1 ? "s" : ""} to continue
              </motion.p>
            )}
          </AnimatePresence>

          {/* CTA button */}
          <motion.button
            onClick={handleCreate}
            disabled={!canCreate || loading}
            whileHover={canCreate && !loading ? { scale: 1.02, boxShadow: "0 0 28px rgba(163,230,53,0.35)", filter: "brightness(1.08)" } : {}}
            whileTap={canCreate && !loading ? { scale: 0.98 } : {}}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 rounded-full px-10 py-3.5 text-sm font-semibold transition-all duration-200"
            style={{
              background: canCreate && !loading ? "#a3e635" : "rgba(163,230,53,0.25)",
              color: canCreate && !loading ? "#060c18" : "rgba(163,230,53,0.45)",
              cursor: canCreate && !loading ? "pointer" : "not-allowed",
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing references...
              </>
            ) : (
              <>
                <span>✦</span>
                Create Moodboard
              </>
            )}
          </motion.button>

          {/* Loading overlay */}
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6"
                style={{ background: "rgba(6,12,24,0.92)", backdropFilter: "blur(12px)" }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
                  className="w-14 h-14 rounded-full border-2 border-transparent"
                  style={{
                    borderTopColor: "#a3e635",
                    borderRightColor: "rgba(163,230,53,0.3)",
                  }}
                />
                <div className="text-center space-y-1">
                  <p className="text-white font-semibold text-lg">Building your moodboard</p>
                  <p className="text-slate-400 text-sm">AI is learning your visual style...</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
