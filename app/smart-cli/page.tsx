"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Boxes,
  Check,
  Clipboard,
  Command,
  FileCode2,
  Globe2,
  Image as ImageIcon,
  Layers3,
  LockKeyhole,
  MessageSquareText,
  Palette,
  PlaySquare,
  ShieldCheck,
  Terminal,
  Wand2,
} from "lucide-react";

type SetupTab = "cli" | "mcp" | "skill";

const COLORS = {
  ink: "#07111f",
  blue: "#38bdf8",
  green: "#34d399",
  violet: "#a78bfa",
};

const SETUP: Record<SetupTab, Array<{ title: string; text: string; command: string }>> = {
  cli: [
    {
      title: "Install Smart CLI",
      text: "Use one local command layer for login, uploads, job tracking, and saving finished assets back to your workspace.",
      command: "npm install -g @saadstudio/smart-cli",
    },
    {
      title: "Sign in",
      text: "Approve your Saad Studio account once. After that, the CLI can submit approved creative jobs for the current workspace.",
      command: "smart-cli login",
    },
    {
      title: "Run a brief",
      text: "Send a product, URL, or campaign idea and let Smart CLI prepare the structured creative request.",
      command: "smart-cli run \"Create 3 Arabic posts and one 9:16 product video\"",
    },
  ],
  mcp: [
    {
      title: "Create an external endpoint",
      text: "Expose a controlled Saad Studio connection that compatible AI assistants can call without entering the personal assistant page.",
      command: "smart-cli mcp create --workspace saad-studio",
    },
    {
      title: "Choose permissions",
      text: "Allow only the actions you want: image briefs, video briefs, brand memory, asset folders, or campaign packs.",
      command: "smart-cli permissions set image,video,brand,campaign",
    },
    {
      title: "Connect your agent",
      text: "Paste the generated endpoint into Claude, Codex, Cursor, or any MCP client that supports external tools.",
      command: "smart-cli mcp url",
    },
  ],
  skill: [
    {
      title: "Add the workflow skill",
      text: "Give the agent Saad Studio format names, output rules, Arabic copy preferences, and review expectations.",
      command: "npx skills add saad-studio/smart-cli",
    },
    {
      title: "Load brand rules",
      text: "Attach your brand voice, preferred colors, product terms, and content style before the agent starts generating briefs.",
      command: "smart-cli brand init ./brand.json",
    },
    {
      title: "Generate with context",
      text: "The agent turns natural language into clean Saad Studio jobs while your site remains the creative backend.",
      command: "Generate a launch pack using my saved Saad Studio brand",
    },
  ],
};

const FORMATS = [
  ["product_studio", "Clean product visuals for catalog, ads, and landing pages"],
  ["arabic_social_post", "Square or vertical Arabic post with controlled copy length"],
  ["short_video_brief", "9:16 video request with scene, motion, duration, and platform"],
  ["hero_campaign", "Landing hero, social preview, and ad copy from one brief"],
  ["brand_memory", "Colors, language, tone, logo rules, and reusable prompt notes"],
  ["ad_variants", "Multiple hooks, audiences, and visual angles for paid campaigns"],
  ["creator_script", "UGC-style script with shot direction and caption ideas"],
  ["asset_folder", "Organized outputs that can be reviewed and reused later"],
];

const CAPABILITIES = [
  {
    icon: ImageIcon,
    title: "Image Briefs",
    text: "Prepare product shots, banners, social posts, and style edits before sending them to Saad Studio.",
  },
  {
    icon: PlaySquare,
    title: "Video Briefs",
    text: "Define ratio, motion, duration, first frame, platform, and copy direction for short video generation.",
  },
  {
    icon: Palette,
    title: "Brand Memory",
    text: "Reuse your brand language, Arabic writing style, visual rules, and saved campaign preferences.",
  },
  {
    icon: Layers3,
    title: "Campaign Packs",
    text: "Turn one request into a structured package: posts, video concepts, captions, and review notes.",
  },
];

const EXAMPLES = [
  {
    title: "Perfume Launch",
    prompt: "Create a GCC launch pack for a luxury perfume.",
    output: ["Brand tone loaded", "3 Arabic posts prepared", "1 vertical video brief", "Review checklist created"],
  },
  {
    title: "Product Listing",
    prompt: "Turn this product URL into marketplace visuals and a short promo video.",
    output: ["Product details collected", "Studio shot brief ready", "Video storyboard ready", "Output folder named"],
  },
  {
    title: "Daily Content",
    prompt: "Find three content angles for this niche and prepare matching visual briefs.",
    output: ["Angles selected", "Arabic captions drafted", "Visual prompts organized", "Campaign queue ready"],
  },
];

function CopyLine({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(command);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      }}
      className="mt-4 flex h-11 w-full min-w-0 items-center justify-between rounded-md border border-white/10 bg-slate-950/80 px-3 text-left font-mono text-[11px] text-slate-200 transition hover:border-sky-300/60"
    >
      <span className="truncate">{command}</span>
      {copied ? <Check className="ml-3 h-4 w-4 shrink-0 text-emerald-300" /> : <Clipboard className="ml-3 h-4 w-4 shrink-0 text-slate-500" />}
    </button>
  );
}

function ConsolePanel({ title, prompt, output }: { title: string; prompt: string; output: string[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-slate-950/70">
      <div className="flex h-10 items-center gap-2 border-b border-white/10 bg-white/[0.04] px-4">
        <span className="h-2.5 w-2.5 rounded-full bg-sky-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-violet-300" />
        <span className="ml-2 text-xs font-semibold text-slate-300">{title}</span>
      </div>
      <div className="space-y-4 p-5 font-mono text-xs leading-6">
        <div className="text-slate-300">
          <span className="text-sky-300">&gt;</span> {prompt}
        </div>
        <div className="text-slate-500">Smart CLI</div>
        <div>
          {output.map((line) => (
            <div key={line} className="text-emerald-300">
              <span className="text-emerald-400">✓</span> {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SmartCliPage() {
  const [activeTab, setActiveTab] = useState<SetupTab>("cli");
  const setupSteps = SETUP[activeTab];

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_15%_0%,rgba(56,189,248,0.18),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(52,211,153,0.14),transparent_30%),linear-gradient(180deg,#0a1728,#07111f)]">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
          <div className="flex items-center justify-between gap-4">
            <Link href="/apps" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Back to Apps
            </Link>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
              External Saad Studio connection
            </div>
          </div>

          <div className="grid items-center gap-8 py-14 lg:grid-cols-[1fr_430px] lg:py-20">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-sky-200">
                <Command className="h-3.5 w-3.5" />
                External CLI Layer
              </div>
              <h1 className="max-w-4xl text-balance text-4xl font-black leading-tight tracking-normal md:text-6xl">
                Smart CLI
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
                A standalone connection page for Saad Studio. It explains how an AI assistant can call your creative workflows through CLI, MCP, or skills without living inside the personal assistant area.
              </p>
              <div className="mt-7 flex flex-wrap gap-3 text-sm">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-slate-300">Outside /apps/tool</span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-slate-300">Saad Studio branded</span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-slate-300">CLI + MCP</span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-slate-300">Arabic campaigns</span>
              </div>
            </div>

            <ConsolePanel
              title="Saad Studio Workspace"
              prompt="smart-cli run campaign --brand perfume --lang ar"
              output={["Brand memory attached", "Arabic post briefs prepared", "Video brief prepared", "Assets ready for review"]}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">Connection Setup</h2>
            <p className="mt-1 text-sm text-slate-400">The page is external. The assistant connects to Saad Studio through controlled setup steps.</p>
          </div>
          <div className="inline-flex rounded-lg border border-white/10 bg-slate-950/50 p-1">
            {([
              ["cli", Terminal, "CLI"],
              ["mcp", Boxes, "MCP"],
              ["skill", FileCode2, "Skill"],
            ] as const).map(([id, Icon, label]) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold transition ${
                  activeTab === id ? "bg-white text-slate-950" : "text-slate-400 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid overflow-hidden rounded-lg border border-white/10 bg-[#0b1628] md:grid-cols-3">
          {setupSteps.map((step, index) => (
            <div key={step.title} className="border-b border-white/10 p-5 md:border-b-0 md:border-r md:last:border-r-0">
              <div
                className="mb-4 flex h-9 w-9 items-center justify-center rounded-md font-bold"
                style={{
                  background: index === 0 ? `${COLORS.blue}22` : index === 1 ? `${COLORS.green}22` : `${COLORS.violet}22`,
                  color: index === 0 ? COLORS.blue : index === 1 ? COLORS.green : COLORS.violet,
                }}
              >
                {index + 1}
              </div>
              <h3 className="font-bold">{step.title}</h3>
              <p className="mt-2 min-h-[72px] text-sm leading-6 text-slate-400">{step.text}</p>
              <CopyLine command={step.command} />
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-8 md:grid-cols-4 md:px-8">
        {CAPABILITIES.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="rounded-lg border border-white/10 bg-[#0b1628] p-5">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-white/[0.04]">
                <Icon className="h-5 w-5 text-sky-300" />
              </div>
              <h3 className="font-bold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{item.text}</p>
            </div>
          );
        })}
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 md:px-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-white/10 bg-[#0b1628] p-6">
          <div className="mb-4 inline-flex rounded-md bg-emerald-400/10 px-2 py-1 text-[11px] font-black uppercase text-emerald-200">
            Saad Vocabulary
          </div>
          <h2 className="text-3xl font-black">Your own workflow names, not a copied tool page.</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Smart CLI describes the bridge in your product language. It avoids using another platform&apos;s visual identity, colors, or tool naming as the page identity.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-slate-300">
            <span className="inline-flex items-center gap-2"><Wand2 className="h-4 w-4 text-sky-300" /> Creative briefs</span>
            <span className="inline-flex items-center gap-2"><MessageSquareText className="h-4 w-4 text-sky-300" /> Arabic copy</span>
            <span className="inline-flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-sky-300" /> Permissions</span>
            <span className="inline-flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-sky-300" /> Review states</span>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-[#0b1628] p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-300">
            <Globe2 className="h-4 w-4 text-emerald-300" />
            Supported format names
          </div>
          <div className="grid gap-3 font-mono text-sm">
            {FORMATS.map(([name, description]) => (
              <div key={name} className="grid gap-2 rounded-md border border-white/5 bg-white/[0.025] p-3 md:grid-cols-[210px_1fr]">
                <span className="text-sky-200">{name}</span>
                <span className="text-slate-500">{description}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="mb-5">
          <h2 className="text-3xl font-black">Example Agent Runs</h2>
          <p className="mt-1 text-sm text-slate-400">Examples for Smart CLI as an external Saad Studio connection page.</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {EXAMPLES.map((item) => (
            <ConsolePanel key={item.title} title={item.title} prompt={item.prompt} output={item.output} />
          ))}
        </div>
      </section>
    </main>
  );
}
