"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import type { AppCategory } from "@/lib/apps-data";
import { AppToolCard } from "@/components/AppToolCard";

const VISIBLE_COUNT = 5;

interface AppCategorySectionProps {
  category: AppCategory;
  expanded?: boolean;
  onToggleExpand?: (categoryId: string) => void;
}

export function AppCategorySection({ category, expanded = false, onToggleExpand }: AppCategorySectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.05 });

  const visibleTools = expanded ? category.tools : category.tools.slice(0, VISIBLE_COUNT);
  const hasMore = category.tools.length > VISIBLE_COUNT;

  return (
    <motion.section
      id={`section-${category.id}`}
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="scroll-mt-24"
    >
      <div className="flex items-start gap-4 mb-5">
        <div
          className="flex-shrink-0 self-stretch"
          style={{
            width: "3px",
            minHeight: "42px",
            borderRadius: "2px",
            background: "#06b6d4",
            boxShadow: "0 0 12px rgba(6,182,212,0.4), 0 0 4px rgba(6,182,212,0.25)",
          }}
        />

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              className="text-[18px] sm:text-[20px] font-bold text-white"
              style={{ fontFamily: "var(--font-display, inherit)" }}
            >
              {category.title}
            </h2>

            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold tabular-nums"
              style={{
                background:
                  "linear-gradient(135deg, rgba(6,182,212,0.1) 0%, rgba(139,92,246,0.1) 100%)",
                border: "1px solid rgba(6,182,212,0.15)",
                color: "#94a3b8",
              }}
            >
              {category.tools.length} tools
            </span>

            <Link
              href={category.href}
              className="sm:ml-auto text-[12px] sm:text-sm font-medium transition-colors duration-200"
              style={{ color: "rgba(6,182,212,0.7)" }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.color = "#22d3ee")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.color =
                  "rgba(6,182,212,0.7)")
              }
            >
              Go to section {"\u2192"}
            </Link>
          </div>

          <p className="mt-1 text-[13px]" style={{ color: "#475569" }}>
            {category.description}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:hidden gap-3">
        {visibleTools.map((tool, index) => (
          <motion.div
            key={tool.id}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.45, delay: index * 0.06, ease: "easeOut" }}
          >
            <AppToolCard tool={tool} />
          </motion.div>
        ))}
        {hasMore && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.45, delay: visibleTools.length * 0.06, ease: "easeOut" }}
          >
            <GhostCard
              href={category.href}
              count={category.tools.length}
              expanded={expanded}
              onClick={() => onToggleExpand?.(category.id)}
            />
          </motion.div>
        )}
      </div>

      <div className="hidden sm:grid grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
        {visibleTools.map((tool, index) => (
          <motion.div
            key={tool.id}
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: 0.45, delay: index * 0.06, ease: "easeOut" }}
          >
            <AppToolCard tool={tool} />
          </motion.div>
        ))}
        {hasMore && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            transition={{
              duration: 0.45,
              delay: visibleTools.length * 0.06,
              ease: "easeOut",
            }}
          >
            <GhostCard
              href={category.href}
              count={category.tools.length}
              expanded={expanded}
              onClick={() => onToggleExpand?.(category.id)}
            />
          </motion.div>
        )}
      </div>
    </motion.section>
  );
}

interface GhostCardProps {
  href: string;
  count: number;
  expanded?: boolean;
  onClick?: () => void;
}

function GhostCard({ href, count, expanded = false, onClick }: GhostCardProps) {
  const label = expanded ? "Show less" : `See all ${count} tools`;
  const arrow = expanded ? "<-" : "->";

  if (onClick) {
    return (
      <button onClick={onClick} className="w-full text-left">
        <motion.div
          className="h-full rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer"
          style={{
            minHeight: "220px",
            border: "1px dashed rgba(6,182,212,0.15)",
            background: "rgba(6,182,212,0.02)",
          }}
          whileHover={{
            background: "rgba(6,182,212,0.05)",
            borderColor: "rgba(6,182,212,0.3)",
            scale: 1.02,
          }}
          transition={{ duration: 0.2 }}
        >
          <motion.span
            className="text-3xl"
            style={{ color: "#06b6d4" }}
            animate={{ x: [0, 4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            {arrow}
          </motion.span>
          <span className="text-[13px] font-medium text-center px-4" style={{ color: "#22d3ee" }}>
            {label}
          </span>
        </motion.div>
      </button>
    );
  }

  return (
    <Link href={href}>
      <motion.div
        className="h-full rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer"
        style={{
          minHeight: "220px",
          border: "1px dashed rgba(6,182,212,0.15)",
          background: "rgba(6,182,212,0.02)",
        }}
        whileHover={{
          background: "rgba(6,182,212,0.05)",
          borderColor: "rgba(6,182,212,0.3)",
          scale: 1.02,
        }}
        transition={{ duration: 0.2 }}
      >
        <motion.span
          className="text-3xl"
          style={{ color: "#06b6d4" }}
          animate={{ x: [0, 4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          {arrow}
        </motion.span>
        <span className="text-[13px] font-medium text-center px-4" style={{ color: "#22d3ee" }}>
          {label}
        </span>
      </motion.div>
    </Link>
  );
}
