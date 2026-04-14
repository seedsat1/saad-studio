"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AppsSearchBarProps {
  totalCount: number;
  onSearch: (query: string) => void;
}

export function AppsSearchBar({ totalCount, onSearch }: AppsSearchBarProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(value.trim());
    }, 200);
    return () => clearTimeout(timer);
  }, [value, onSearch]);

  const handleClear = () => {
    setValue("");
    inputRef.current?.focus();
  };

  return (
    <div
      className="relative flex items-center w-full rounded-xl overflow-hidden"
      style={{
        height: "44px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(148,163,184,0.08)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Magnifier icon */}
      <div className="flex-shrink-0 pl-4 pr-3">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "#475569" }}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={`Search ${totalCount} tools...`}
        className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-slate-600"
        style={{ color: "#e2e8f0" }}
      />

      {/* Clear button */}
      <AnimatePresence>
        {value && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.15 }}
            onClick={handleClear}
            className="flex-shrink-0 pr-4 pl-2 flex items-center justify-center"
            aria-label="Clear search"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "#475569" }}
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
