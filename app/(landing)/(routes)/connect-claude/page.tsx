"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCopy,
  Film,
  ImageIcon,
  Layers,
  Plug,
  ScrollText,
  Sparkles,
  VideoIcon,
  Wallet,
  Workflow,
  Wand2,
  UploadCloud,
} from "lucide-react";

const WORKFLOW_STEPS = [
  {
    n: "1",
    title: "Describe your idea",
    body: "Tell Claude your scene, mood, and goal in plain language.",
    icon: ScrollText,
  },
  {
    n: "2",
    title: "Generate a storyboard",
    body: "Claude calls generate_storyboard and returns multiple concept variations.",
    icon: Layers,
  },
  {
    n: "3",
    title: "Pick your favorite concept",
    body: "Choose the image Claude should turn into the final shot.",
    icon: Sparkles,
  },
  {
    n: "4",
    title: "Let Saad Studio render the video",
    body: "Claude calls generate_video with your chosen concept as the first frame.",
    icon: Film,
  },
];

const TOOLS = [
  { name: "generate_image", desc: "Single image via Nano Banana Pro and friends.", icon: ImageIcon, color: "text-pink-300" },
  { name: "generate_storyboard", desc: "Multiple concept variations for one idea.", icon: Layers, color: "text-purple-300" },
  { name: "generate_video", desc: "Text-to-video or image-to-video with KIE / WaveSpeed / direct providers.", icon: VideoIcon, color: "text-orange-300" },
  { name: "balance", desc: "Read your current Saad Studio credit balance.", icon: Wallet, color: "text-emerald-300" },
  { name: "show_generations", desc: "List your most recent generated assets.", icon: ImageIcon, color: "text-sky-300" },
  { name: "job_status", desc: "Look up a generation by id when ready.", icon: Workflow, color: "text-cyan-300" },
  { name: "r2_upload_url", desc: "Get a Cloudflare R2 signed URL for a source video.", icon: UploadCloud, color: "text-blue-300" },
  { name: "reap_run", desc: "Run Reap post-production: captions, reframe, dubbing, audiogram, transcription, edit-videos.", icon: Wand2, color: "text-violet-300" },
  { name: "reap_status", desc: "Poll a Reap project until it finishes — final URL is R2-hosted.", icon: CheckCircle2, color: "text-fuchsia-300" },
];

const SAMPLE_PROMPTS = [
  "Show me my Saad Studio credit balance.",
  "I want a cozy coffee shop at sunset, soft warm light — generate 4 storyboard concepts in cinematic style.",
  "Take concept 2 and render it as a 5-second video.",
  "Add Arabic captions to https://example.com/clip.mp4",
  "Get me an R2 upload URL for my-clip.mp4 so I can run auto-reframe on it.",
];

function CopyBlock({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative rounded-2xl border border-white/10 bg-black/40 p-5 font-mono text-xs leading-6 text-slate-200">
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(children);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-[11px] font-semibold text-zinc-300 hover:bg-white/[0.12] hover:text-white transition-colors"
      >
        <ClipboardCopy className="h-3 w-3" />
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="whitespace-pre-wrap pr-20">{children}</pre>
    </div>
  );
}

function Section({ children, eyebrow, title, sub }: { children: ReactNode; eyebrow?: string; title: string; sub?: string }) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">{eyebrow}</p>}
      <h2 className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">{title}</h2>
      {sub && <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">{sub}</p>}
      <div className="mt-10">{children}</div>
    </section>
  );
}

const CLAUDE_DESKTOP_CONFIG = `{
  "mcpServers": {
    "saad-studio": {
      "url": "https://saadstudio.app/api/smart-cli/mcp",
      "headers": {
        "Authorization": "Bearer ssp_paste_your_token_here"
      }
    }
  }
}`;

const CLAUDE_CODE_CMD = `claude mcp add saad-studio https://saadstudio.app/api/smart-cli/mcp \\
  --header "Authorization: Bearer ssp_paste_your_token_here"`;

export default function ConnectClaudePage() {
  return (
    <div className="text-slate-100">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_30%_-10%,rgba(124,58,237,0.25),transparent_60%),radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.18),transparent_55%)]" />
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-200">
            <Plug className="h-3 w-3" /> New • MCP Integration
          </div>
          <h1 className="mt-6 max-w-4xl text-4xl font-black tracking-tight text-white md:text-6xl">
            Connect Claude to <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-sky-300 bg-clip-text text-transparent">Saad Studio</span>.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Drive your entire creative pipeline from Claude. Describe an idea, pick a concept, and render the final video — all
            through a Model Context Protocol (MCP) endpoint that speaks directly to your Saad Studio credits.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/panel"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/20 hover:from-violet-500 hover:to-fuchsia-500 transition-all"
            >
              Generate your Panel Token <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#config"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-white/[0.08] transition-colors"
            >
              See the setup
            </a>
          </div>
        </div>
      </section>

      {/* Workflow */}
      <Section
        eyebrow="The 4-step flow"
        title="From idea to final render — without leaving Claude."
        sub="The MCP exposes the full Saad Studio pipeline as tools Claude can call on your behalf. The classic flow looks like this:"
      >
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WORKFLOW_STEPS.map(({ n, title, body, icon: Icon }) => (
            <li
              key={n}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-violet-400/30 hover:bg-white/[0.05] transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20 text-sm font-black text-violet-200">{n}</span>
                <Icon className="h-4 w-4 text-slate-400 group-hover:text-violet-300 transition-colors" />
              </div>
              <h3 className="mt-4 text-base font-bold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Tools grid */}
      <Section
        eyebrow="9 tools"
        title="Everything Claude can do for you."
        sub="Each tool maps to a real Saad Studio capability. Credits are debited from your account just like a normal generation."
      >
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map(({ name, desc, icon: Icon, color }) => (
            <div key={name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-white/20 transition-colors">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${color}`} />
                <code className="text-sm font-bold text-white">{name}</code>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-slate-500">
          Reap tools are <strong className="text-slate-300">post-production only</strong> — never used for generation. Source
          videos go to Cloudflare R2 via signed URLs and never stream through API routes.
        </p>
      </Section>

      {/* Setup */}
      <section id="config" className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">Setup</p>
        <h2 className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">Three steps. Two minutes.</h2>

        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          {/* Step 1 */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 text-sm font-black text-cyan-200">1</span>
            <h3 className="mt-4 text-lg font-bold text-white">Get your token</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Sign in to your Saad Studio account and generate a personal Panel Token. Treat it like a password.
            </p>
            <Link
              href="/panel"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300 hover:text-cyan-200 transition-colors"
            >
              Open the token page <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Step 2 */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20 text-sm font-black text-violet-200">2</span>
            <h3 className="mt-4 text-lg font-bold text-white">Add to Claude</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Drop the snippet into <code className="rounded bg-white/10 px-1.5 py-0.5 text-[11px]">claude_desktop_config.json</code> or
              run the Claude Code command — replace the placeholder with your token.
            </p>
          </div>

          {/* Step 3 */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-fuchsia-500/20 text-sm font-black text-fuchsia-200">3</span>
            <h3 className="mt-4 text-lg font-bold text-white">Talk to Claude</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Restart Claude, then describe your idea. Claude picks the right tool and runs it on your Saad Studio account.
            </p>
          </div>
        </div>

        {/* Config blocks */}
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div>
            <h4 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-300">
              <Plug className="h-3.5 w-3.5 text-violet-300" /> Claude Desktop
            </h4>
            <p className="mb-3 text-xs text-slate-500">
              File location:
              <code className="ml-1 rounded bg-white/[0.06] px-1.5 py-0.5 text-[11px] text-slate-300">
                %APPDATA%\Claude\claude_desktop_config.json
              </code>
            </p>
            <CopyBlock>{CLAUDE_DESKTOP_CONFIG}</CopyBlock>
          </div>
          <div>
            <h4 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-300">
              <Plug className="h-3.5 w-3.5 text-fuchsia-300" /> Claude Code (CLI)
            </h4>
            <p className="mb-3 text-xs text-slate-500">Run once in your terminal:</p>
            <CopyBlock>{CLAUDE_CODE_CMD}</CopyBlock>
          </div>
        </div>
      </section>

      {/* Sample prompts */}
      <Section
        eyebrow="Try these"
        title="Sample prompts to get started."
        sub="Once connected, just talk to Claude. The MCP figures out which tool to call."
      >
        <ul className="grid gap-3 md:grid-cols-2">
          {SAMPLE_PROMPTS.map((prompt) => (
            <li
              key={prompt}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-200"
            >
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
              <span>"{prompt}"</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 pb-24 pt-8">
        <div className="rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-600/10 via-fuchsia-600/10 to-sky-600/10 p-10 text-center">
          <h3 className="text-2xl font-black text-white md:text-3xl">Ready to give Claude the keys?</h3>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-300">
            Generate a token now. Your credits stay on your account, your generations stay in your gallery, and Claude just becomes
            the smartest creative assistant on your team.
          </p>
          <Link
            href="/panel"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-violet-700 shadow-lg shadow-violet-500/20 hover:bg-violet-50 transition-colors"
          >
            Generate my token <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
