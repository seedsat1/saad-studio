"use client";

import { useEffect, useRef } from "react";
import { useStudioStore } from "@/hooks/use-studio-store";

export default function LogPanel() {
  const logs = useStudioStore((s) => s.logs);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs.length]);

  if (logs.length === 0) return null;

  return (
    <div
      ref={scrollRef}
      className="max-h-32 overflow-y-auto rounded-lg bg-gray-900 border border-gray-800 px-3 py-2 font-mono text-xs"
    >
      {logs.map((log, i) => (
        <div key={i} className="leading-5">
          <span className="text-gray-600">{log.time}</span>{" "}
          <span
            className={
              log.type === "success"
                ? "text-green-400"
                : log.type === "error"
                ? "text-red-400"
                : "text-gray-400"
            }
          >
            {log.type === "success" ? "✓ " : log.type === "error" ? "✗ " : ""}
            {log.msg}
          </span>
        </div>
      ))}
    </div>
  );
}
