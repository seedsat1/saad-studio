"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DropdownOption {
  value: string;
  label: string;
  description?: string;
  extra?: string;
  disabled?: boolean;
  group?: string;
  visual?: React.ReactNode;
  badge?: string;
}

interface UpwardDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (val: string) => void;
  width?: number;
  panelWidth?: number;
  placeholder?: string;
  showDescription?: boolean;
}

export default function UpwardDropdown({
  options,
  value,
  onChange,
  width = 64,
  panelWidth = 220,
  placeholder = "Select",
  showDescription = false,
}: UpwardDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Group options
  const groups: { name: string | undefined; items: DropdownOption[] }[] = [];
  for (const opt of options) {
    const g = groups.find((x) => x.name === opt.group);
    if (g) g.items.push(opt);
    else groups.push({ name: opt.group, items: [opt] });
  }

  return (
    <div ref={containerRef} className="relative" style={{ width }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center justify-between gap-1 h-7 px-2.5 rounded-md text-xs font-medium transition-all duration-150",
          "bg-[#0b1225] border border-[rgba(148,163,184,0.05)] text-slate-300",
          "hover:border-[rgba(148,163,184,0.1)] hover:bg-[#0f1a35]",
          open && "border-[rgba(148,163,184,0.12)] bg-[#0f1a35]"
        )}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronUp
          className={cn(
            "h-3 w-3 text-slate-500 shrink-0 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute bottom-[calc(100%+8px)] left-0 z-50 rounded-xl overflow-hidden"
            style={{
              width: panelWidth,
              background: "#0d1529",
              border: "1px solid rgba(148,163,184,0.05)",
              boxShadow: "0 -20px 40px rgba(0,0,0,0.4)",
            }}
          >
            <div className="py-1.5 max-h-[340px] overflow-y-auto">
              {groups.map((grp, gi) => (
                <div key={gi}>
                  {grp.name && (
                    <p className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-slate-600">
                      {grp.name}
                    </p>
                  )}
                  {grp.items.map((opt) => (
                    <button
                      key={opt.value}
                      disabled={opt.disabled}
                      onClick={() => { if (!opt.disabled) { onChange(opt.value); setOpen(false); } }}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-left transition-colors",
                        opt.disabled
                          ? "opacity-30 cursor-not-allowed"
                          : "hover:bg-white/[0.05]",
                        opt.value === value && "bg-cyan-500/[0.06]"
                      )}
                    >
                      {opt.visual && <span className="shrink-0">{opt.visual}</span>}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            "text-xs font-medium leading-tight",
                            opt.value === value ? "text-cyan-300" : "text-slate-300"
                          )}>
                            {opt.label}
                          </span>
                          {opt.badge && (
                            <span className="text-[8px] font-bold uppercase tracking-wider bg-violet-500/15 text-violet-400 border border-violet-500/20 rounded-full px-1.5 py-0.5">
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        {showDescription && opt.description && (
                          <p className="text-[10px] text-slate-500 mt-0.5 truncate">{opt.description}</p>
                        )}
                      </div>
                      {opt.extra && (
                        <span className="shrink-0 text-[10px] text-slate-500">{opt.extra}</span>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
