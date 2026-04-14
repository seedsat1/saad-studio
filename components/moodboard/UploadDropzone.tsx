"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Plus } from "lucide-react";

export interface Thumbnail {
  id: string;
  gradient: string;
}

const FAKE_GRADIENTS = [
  "from-amber-600 to-orange-800",
  "from-violet-600 to-purple-800",
  "from-cyan-600 to-blue-800",
  "from-rose-600 to-pink-800",
  "from-emerald-600 to-teal-800",
  "from-yellow-600 to-amber-800",
  "from-indigo-600 to-blue-800",
  "from-red-600 to-rose-800",
  "from-sky-500 to-cyan-800",
  "from-green-600 to-emerald-800",
];

interface UploadDropzoneProps {
  thumbnails: Thumbnail[];
  onAddThumbnails: (items: Thumbnail[]) => void;
  onRemoveThumbnail: (id: string) => void;
  maxImages?: number;
}

export function UploadDropzone({
  thumbnails,
  onAddThumbnails,
  onRemoveThumbnail,
  maxImages = 80,
}: UploadDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const addFakeThumbnails = useCallback(() => {
    const remaining = maxImages - thumbnails.length;
    if (remaining <= 0) return;
    const count = Math.min(Math.floor(Math.random() * 3) + 3, remaining);
    const newItems: Thumbnail[] = Array.from({ length: count }, (_, i) => ({
      id: `thumb-${Date.now()}-${i}`,
      gradient: FAKE_GRADIENTS[(thumbnails.length + i) % FAKE_GRADIENTS.length],
    }));
    onAddThumbnails(newItems);
  }, [thumbnails.length, maxImages, onAddThumbnails]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    addFakeThumbnails();
  };

  const progress = Math.round((thumbnails.length / maxImages) * 100);

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={addFakeThumbnails}
        animate={
          isDragOver
            ? {
                borderColor: "rgba(163,230,53,0.55)",
                backgroundColor: "rgba(163,230,53,0.03)",
                scale: 1.01,
              }
            : {
                borderColor: "rgba(6,182,212,0.2)",
                backgroundColor: "transparent",
                scale: 1,
              }
        }
        transition={{ duration: 0.2 }}
        className="relative rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-4 py-16 px-8 cursor-pointer"
        style={{ minHeight: 220 }}
      >
        {/* Pulse ring when empty */}
        {thumbnails.length === 0 && (
          <motion.div
            className="absolute inset-0 rounded-2xl border-2 border-dashed border-cyan-500/20 pointer-events-none"
            animate={{ opacity: [0.3, 0.9, 0.3] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        <motion.div
          animate={{ y: isDragOver ? -5 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: "rgba(6,182,212,0.1)" }}
        >
          <Upload className="w-6 h-6 text-cyan-400" />
        </motion.div>

        <div className="text-center pointer-events-none">
          <p className="text-slate-300 text-sm font-medium">
            {isDragOver
              ? "Release to upload"
              : "Drag & drop images here, or click to browse"}
          </p>
          <p className="text-slate-500 text-xs mt-1.5">
            PNG, JPG, WEBP · Max {maxImages} images · 10MB each
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={(e) => {
            e.stopPropagation();
            addFakeThumbnails();
          }}
          className="px-5 py-2 rounded-full border border-cyan-500/30 text-cyan-400 text-sm font-medium hover:bg-cyan-500/10 transition-colors"
        >
          Browse Files
        </motion.button>
      </motion.div>

      {/* Uploaded thumbnails */}
      {thumbnails.length > 0 && (
        <div className="space-y-3">
          {/* Counter + progress */}
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-semibold tracking-wider uppercase">
              Uploaded{" "}
              <span className="text-white font-bold">{thumbnails.length}</span>
              /{maxImages}
            </span>
            <span className="text-slate-500 text-xs">{progress}%</span>
          </div>
          <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, #06b6d4, #8b5cf6)",
              }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>

          {/* Grid */}
          <div className="flex flex-wrap gap-2">
            <AnimatePresence mode="popLayout">
              {thumbnails.map((thumb) => (
                <motion.div
                  key={thumb.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 26 }}
                  className="relative group/thumb flex-shrink-0"
                >
                  <div
                    className={`w-20 h-20 rounded-lg bg-gradient-to-br ${thumb.gradient}`}
                  />
                  <button
                    onClick={() => onRemoveThumbnail(thumb.id)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                    style={{
                      background: "#1e293b",
                      border: "1px solid rgba(148,163,184,0.2)",
                    }}
                  >
                    <X className="w-3 h-3 text-slate-300" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Add more */}
            {thumbnails.length < maxImages && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.95 }}
                onClick={addFakeThumbnails}
                className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-700 hover:border-cyan-500/50 flex items-center justify-center transition-colors flex-shrink-0"
              >
                <Plus className="w-5 h-5 text-slate-500" />
              </motion.button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
