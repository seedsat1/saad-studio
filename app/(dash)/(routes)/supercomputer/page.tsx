"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Sparkles,
  Plug,
  FolderClosed,
  Brain,
  ChevronDown,
  ChevronsLeft,
  ArrowUp,
  Zap,
  Command,
  X,
  Gem,
} from "lucide-react";

const SUGGESTION_CHIPS = [
  { id: "clipper", label: "Personal Clipper", badge: "New", icon: "🎬" },
  { id: "skills", label: "Build with skills", icon: "✦" },
  { id: "ugc", label: "Create UGC", icon: "🎭" },
  { id: "marketing", label: "Run marketing", icon: "📈" },
  { id: "cinema", label: "Shoot cinema", icon: "🎥" },
  { id: "animate", label: "Animate", icon: "✨" },
];

const EXAMPLE_PROMPTS: Record<string, string[]> = {
  clipper: [
    "Cut my hour-long interview into 5 vertical clips with the most engaging moments",
    "Turn my stream recording into TikTok-ready clips with auto-captions and a hook in the first second",
    "Find the best moments in my podcast and make them into 9:16 Reels",
  ],
  skills: [
    "Build a workflow that combines image generation with motion control",
    "Create a custom skill that produces cinematic intros from a script",
    "Chain Flux + Kling + Suno into a single one-click music video pipeline",
  ],
  ugc: [
    "Generate a virtual influencer reviewing a skincare product",
    "Create a UGC-style unboxing video for a tech gadget",
    "Make an authentic-looking testimonial video for my brand",
  ],
  marketing: [
    "Produce 5 ad variations for my new shoe collection",
    "Design a 15-second TikTok ad with hook, value, and CTA",
    "Generate carousel images for an Instagram product launch",
  ],
  cinema: [
    "Shoot a noir-style scene of a detective in a rainy alley",
    "Create a cinematic establishing shot of a futuristic Tokyo",
    "Direct a 10-second action sequence with dynamic camera moves",
  ],
  animate: [
    "Animate this static portrait with subtle facial motion",
    "Turn this concept art into a 6-second cinematic shot",
    "Add fluid camera movement to bring this image to life",
  ],
};

const SIDEBAR_ITEMS = [
  { id: "new", label: "New task", icon: Plus, href: "#" },
  { id: "search", label: "Search", icon: Search, href: "#" },
  { id: "skills", label: "Skills", icon: Sparkles, href: "#" },
  { id: "connectors", label: "Connectors", icon: Plug, href: "#" },
  { id: "files", label: "Files", icon: FolderClosed, href: "#" },
  { id: "memory", label: "Memory", icon: Brain, href: "#" },
];

export default function SupercomputerPage() {
  const [prompt, setPrompt] = useState("");
  const [activeChip, setActiveChip] = useState<string>("clipper");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [creditNoticeVisible, setCreditNoticeVisible] = useState(true);
  const [orchestratorOpen, setOrchestratorOpen] = useState(false);
  const [askBeforeGen, setAskBeforeGen] = useState(true);
  const [orchestrator, setOrchestrator] = useState<{ label: string; color: string }>(
    { label: "Gemini", color: "#8ab4f8" }
  );

  useEffect(() => {
    const id = "supercomputer-pixel-font";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=VT323&family=Press+Start+2P&display=swap";
    document.head.appendChild(link);
  }, []);

  const handleSubmit = () => {
    if (!prompt.trim()) return;
    // TODO: route to clipper / planner depending on activeChip
    console.log("submit", { prompt, activeChip, orchestrator, askBeforeGen });
  };

  return (
    <div
      className="relative flex h-[calc(100vh-4rem)] w-full overflow-hidden text-white"
      style={{
        background:
          "radial-gradient(ellipse at center, #0a1326 0%, #060c18 70%, #03070f 100%)",
      }}
    >
      {/* Star field background */}
      <StarField />

      {/* Sidebar */}
      <aside
        className={`relative z-10 flex flex-col border-r border-white/5 bg-black/30 backdrop-blur-xl transition-all duration-300 ${
          sidebarOpen ? "w-[260px]" : "w-0 overflow-hidden"
        }`}
      >
        {/* Workspace selector */}
        <div className="flex items-center justify-between px-3 pt-3">
          <button className="group flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-sm hover:bg-white/[0.06] transition">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-cyan-400 to-blue-500 text-[10px] font-bold">
              ⚡
            </span>
            <span className="font-medium">Supercomputer</span>
            <ChevronDown className="h-3.5 w-3.5 text-white/40 group-hover:text-white/70" />
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1.5 text-white/40 hover:bg-white/5 hover:text-white/80"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="mt-5 flex flex-col gap-0.5 px-2">
          {SIDEBAR_ITEMS.map((item) => (
            <button
              key={item.id}
              className="group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13.5px] text-white/70 hover:bg-white/5 hover:text-white"
            >
              <item.icon className="h-[15px] w-[15px] text-white/50 group-hover:text-white/80" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Tasks section */}
        <div className="mt-6 px-3">
          <button className="flex w-full items-center justify-between text-[11px] uppercase tracking-wider text-white/35 hover:text-white/60">
            <span>Tasks</span>
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>

        {/* Empty state */}
        <div className="mt-6 flex flex-1 flex-col items-center justify-start px-4">
          <EmptyTaskGraphic />
          <p className="mt-3 text-[13px] font-medium text-white/80">No tasks yet</p>
          <p className="mt-0.5 text-[11.5px] text-white/40">Create one to get started</p>
        </div>

      </aside>

      {/* Sidebar reopen button (when closed) */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="absolute left-3 top-3 z-20 rounded-md border border-white/10 bg-white/5 p-1.5 text-white/60 backdrop-blur hover:text-white"
        >
          <ChevronsLeft className="h-4 w-4 rotate-180" />
        </button>
      )}

      {/* Main column */}
      <main className="relative z-10 flex flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 pt-3">
          <div className="flex-1" />
          {/* Center credit notice */}
          {creditNoticeVisible && (
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[12.5px] text-white/70 backdrop-blur">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400/40 to-blue-500/40">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
              </span>
              Claude, GPT, and Gemini consume credits
              <button
                onClick={() => setCreditNoticeVisible(false)}
                className="ml-1 rounded p-0.5 text-white/40 hover:bg-white/10 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <div className="flex flex-1 items-center justify-end gap-2">
            <button className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[12.5px] text-white/80 hover:bg-white/10">
              <Gem className="h-3.5 w-3.5 text-cyan-300" />
              Buy credits
            </button>
            <button className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[12.5px] text-white/80 hover:bg-white/10">
              <Command className="h-3.5 w-3.5" />
              Shortcuts
            </button>
          </div>
        </div>

        {/* Center hero + input */}
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <div className="w-full max-w-[720px]">
            {/* Input box */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] focus-within:border-white/20 focus-within:bg-white/[0.06] transition">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder=""
                rows={1}
                className="w-full resize-none bg-transparent px-5 pt-4 pb-2 text-[15px] text-white placeholder-white/30 outline-none"
                style={{ minHeight: "52px", maxHeight: "200px" }}
              />

              {/* Toolbar */}
              <div className="flex items-center justify-between gap-2 px-3 pb-3">
                <div className="flex items-center gap-1.5">
                  <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/10 hover:text-white">
                    <Plus className="h-4 w-4" />
                  </button>

                  {/* Orchestrator dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setOrchestratorOpen((o) => !o)}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[12.5px] text-white/80 hover:bg-white/10"
                    >
                      <span
                        className="inline-block h-2 w-2 rounded-sm"
                        style={{ background: orchestrator.color }}
                      />
                      <span className="text-white/50">Orchestrator</span>
                      <span className="font-medium">{orchestrator.label}</span>
                      <ChevronDown className="h-3 w-3 text-white/40" />
                    </button>
                    {orchestratorOpen && (
                      <div className="absolute bottom-full left-0 mb-2 w-44 overflow-hidden rounded-lg border border-white/10 bg-[#0c1426] shadow-2xl">
                        {[
                          { label: "Gemini", color: "#8ab4f8" },
                          { label: "Claude", color: "#d97757" },
                          { label: "GPT", color: "#19c37d" },
                        ].map((m) => (
                          <button
                            key={m.label}
                            onClick={() => {
                              setOrchestrator(m);
                              setOrchestratorOpen(false);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-white/80 hover:bg-white/5"
                          >
                            <span
                              className="inline-block h-2 w-2 rounded-sm"
                              style={{ background: m.color }}
                            />
                            {m.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAskBeforeGen((v) => !v)}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12.5px] text-white/60 hover:bg-white/5 hover:text-white/90"
                  >
                    <span
                      className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
                        askBeforeGen
                          ? "border-cyan-400/60 bg-cyan-400/20"
                          : "border-white/20"
                      }`}
                    >
                      {askBeforeGen && (
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                      )}
                    </span>
                    Ask before generation
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </button>

                  <button
                    onClick={handleSubmit}
                    disabled={!prompt.trim()}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-300/90 text-[#0b1320] shadow-[0_0_18px_rgba(103,232,249,0.45)] transition disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30 disabled:shadow-none enabled:hover:bg-cyan-200"
                  >
                    <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>

            {/* Suggestion chips */}
            <div className="mt-5 flex flex-wrap gap-2">
              {SUGGESTION_CHIPS.map((chip) => {
                const active = chip.id === activeChip;
                return (
                  <button
                    key={chip.id}
                    onClick={() => setActiveChip(chip.id)}
                    className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] transition ${
                      active
                        ? "border-white/25 bg-white/[0.08] text-white"
                        : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    <span className="text-[13px]">{chip.icon}</span>
                    <span>{chip.label}</span>
                    {chip.badge && (
                      <span className="rounded-md bg-cyan-400/20 px-1.5 py-[1px] text-[10px] font-semibold text-cyan-300">
                        {chip.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Example prompts */}
            <div className="mt-5 flex flex-col gap-2.5">
              {(EXAMPLE_PROMPTS[activeChip] ?? []).map((p, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(p)}
                  className="group flex items-start gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13.5px] text-white/55 transition hover:text-white"
                >
                  <span className="mt-0.5 text-white/30 group-hover:text-cyan-300">→</span>
                  <span>{p}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-unused-vars */
function _PixelIcon() {
  // Snake winding pattern: top-left → right → down → left → down → right
  // Drawn on a 14x14 grid with 5px cells = 70px icon
  const snake: Array<[number, number]> = [
    // top row (left to right)
    [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2],
    // down right side
    [9, 3], [9, 4],
    // back left (middle row)
    [8, 4], [7, 4], [6, 4], [5, 4], [4, 4], [3, 4],
    // down left
    [3, 5], [3, 6],
    // right again (bottom row)
    [4, 6], [5, 6], [6, 6], [7, 6], [8, 6], [9, 6], [10, 6], [11, 6],
    // down
    [11, 7], [11, 8],
    // left
    [10, 8], [9, 8], [8, 8], [7, 8], [6, 8], [5, 8], [4, 8], [3, 8], [2, 8],
    // down (tail)
    [2, 9], [2, 10],
    // right tail end
    [3, 10], [4, 10], [5, 10], [6, 10], [7, 10],
  ];
  return (
    <div
      className="relative flex h-[86px] w-[86px] shrink-0 items-center justify-center rounded-2xl bg-white shadow-[0_8px_24px_rgba(0,0,0,0.45),inset_0_-2px_0_rgba(15,30,60,0.07)]"
      style={{
        background:
          "linear-gradient(180deg, #ffffff 0%, #f3f6fb 100%)",
      }}
    >
      <svg
        viewBox="0 0 70 70"
        className="h-[70px] w-[70px]"
        shapeRendering="crispEdges"
      >
        {snake.map(([x, y], i) => (
          <rect
            key={i}
            x={x * 5}
            y={y * 5}
            width="5"
            height="5"
            fill="#1d3a8a"
          />
        ))}
        {/* Eye dot */}
        <rect x={9 * 5} y={3 * 5} width="3" height="3" fill="#ffffff" />
      </svg>
    </div>
  );
}

function _RetroPlay() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-[14px] w-[18px]"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {/* Green play triangle in pixel style */}
      <g fill="#22c55e">
        <rect x="4" y="3" width="2" height="2" />
        <rect x="4" y="5" width="2" height="2" />
        <rect x="4" y="7" width="2" height="2" />
        <rect x="4" y="9" width="2" height="2" />
        <rect x="4" y="11" width="2" height="2" />
        <rect x="6" y="5" width="2" height="2" />
        <rect x="6" y="7" width="2" height="2" />
        <rect x="6" y="9" width="2" height="2" />
        <rect x="8" y="7" width="2" height="2" />
      </g>
    </svg>
  );
}

function _RetroClose() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-[14px] w-[14px]"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {/* Red X in pixel style */}
      <g fill="#ef4444">
        <rect x="2" y="2" width="2" height="2" />
        <rect x="12" y="2" width="2" height="2" />
        <rect x="4" y="4" width="2" height="2" />
        <rect x="10" y="4" width="2" height="2" />
        <rect x="6" y="6" width="2" height="2" />
        <rect x="8" y="6" width="2" height="2" />
        <rect x="6" y="8" width="2" height="2" />
        <rect x="8" y="8" width="2" height="2" />
        <rect x="4" y="10" width="2" height="2" />
        <rect x="10" y="10" width="2" height="2" />
        <rect x="2" y="12" width="2" height="2" />
        <rect x="12" y="12" width="2" height="2" />
      </g>
    </svg>
  );
}

/* ============== Empty task placeholder ============== */
function EmptyTaskGraphic() {
  return (
    <div className="relative mt-4 h-20 w-20">
      <div className="absolute inset-0 rounded-2xl border border-dashed border-white/15" />
      <div className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-[#0c1426] text-white/60">
        <Plus className="h-4 w-4" />
      </div>
    </div>
  );
}

/* ============== Star field background ============== */
function StarField() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      <div
        className="absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 12% 18%, rgba(255,255,255,0.6), transparent 60%), radial-gradient(1px 1px at 28% 72%, rgba(255,255,255,0.4), transparent 60%), radial-gradient(1.5px 1.5px at 55% 35%, rgba(255,255,255,0.5), transparent 60%), radial-gradient(1px 1px at 78% 60%, rgba(255,255,255,0.45), transparent 60%), radial-gradient(1px 1px at 88% 22%, rgba(255,255,255,0.5), transparent 60%), radial-gradient(1.5px 1.5px at 40% 88%, rgba(255,255,255,0.35), transparent 60%), radial-gradient(1px 1px at 8% 50%, rgba(255,255,255,0.4), transparent 60%), radial-gradient(1px 1px at 65% 10%, rgba(255,255,255,0.5), transparent 60%), radial-gradient(1px 1px at 95% 75%, rgba(255,255,255,0.4), transparent 60%), radial-gradient(1px 1px at 35% 25%, rgba(255,255,255,0.3), transparent 60%)",
          backgroundSize: "100% 100%",
        }}
      />
      {/* subtle gradient orb */}
      <div
        className="absolute left-1/2 top-1/2 h-[680px] w-[680px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.18] blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(56,189,248,0.45) 0%, rgba(56,189,248,0) 70%)",
        }}
      />
    </div>
  );
}
