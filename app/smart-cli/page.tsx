"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Boxes,
  Check,
  Clipboard,
  Code2,
  Command,
  FileCode2,
  Globe2,
  Image as ImageIcon,
  KeyRound,
  Link2,
  ListChecks,
  PlaySquare,
  ShieldCheck,
  Terminal,
} from "lucide-react";

import TopNavbar from "@/components/TopNavbar";
import { cn } from "@/lib/utils";

type SetupTab = "mcp" | "cli" | "skill";
type ClientTab = "claude" | "codex" | "cursor" | "hermes";

const MCP_URL = "https://saadstudio.app/api/smart-cli/mcp";

const CLIENTS: Array<{ id: ClientTab; label: string }> = [
  { id: "claude", label: "Claude" },
  { id: "codex", label: "Codex" },
  { id: "cursor", label: "Cursor" },
  { id: "hermes", label: "Hermes" },
];

const SETUP: Record<SetupTab, Array<{ title: string; text: string; value: string }>> = {
  mcp: [
    {
      title: "Open connector settings",
      text: "Open your agent app, then go to connectors or MCP servers.",
      value: "Settings -> Connectors -> Add custom connector",
    },
    {
      title: "Add Saad Studio",
      text: "Name the connector Saad Studio and paste this HTTPS URL. Do not paste a CLI command in the URL field.",
      value: MCP_URL,
    },
    {
      title: "Ask from chat",
      text: "After approval, the agent can request campaign briefs, image briefs, and video briefs through Saad Studio.",
      value: "Use Saad Studio to prepare a 9:16 product launch campaign",
    },
  ],
  cli: [
    {
      title: "Install Smart CLI",
      text: "Install the command layer used for local auth, uploads, and job polling.",
      value: "npm install -g @saadstudio/smart-cli",
    },
    {
      title: "Sign in",
      text: "Authenticate your Saad Studio account once from the terminal.",
      value: "smart-cli login",
    },
    {
      title: "Print the MCP URL",
      text: "Use this command locally when you need to copy the hosted connector URL.",
      value: "smart-cli mcp url",
    },
  ],
  skill: [
    {
      title: "Add the skill",
      text: "Install the workflow instructions so your agent understands Saad Studio formats and approval rules.",
      value: "npx skills add saad-studio/smart-cli",
    },
    {
      title: "Connect account",
      text: "Sign in so the skill can submit approved jobs through your workspace.",
      value: "smart-cli login",
    },
    {
      title: "Invoke from chat",
      text: "Use a direct instruction from the agent chat.",
      value: "/smart-cli:campaign",
    },
  ],
};

const TOOLS = [
  {
    icon: ImageIcon,
    title: "create_image_brief",
    text: "Turns a prompt into a structured Saad Studio image request with aspect ratio, language, and style notes.",
  },
  {
    icon: PlaySquare,
    title: "create_video_brief",
    text: "Builds a short video brief with platform, duration, movement, scene direction, and copy notes.",
  },
  {
    icon: ListChecks,
    title: "create_campaign_pack",
    text: "Creates a campaign plan with posts, video concepts, captions, and review checklist.",
  },
];

function CopyBox({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      }}
      className="mt-4 flex h-12 w-full min-w-0 items-center justify-between rounded-md border border-white/10 bg-black/45 px-4 text-left font-mono text-xs text-white transition hover:border-cyan-300/60"
    >
      <span className="truncate">{value}</span>
      {copied ? <Check className="ml-3 h-4 w-4 shrink-0 text-emerald-300" /> : <Clipboard className="ml-3 h-4 w-4 shrink-0 text-slate-500" />}
    </button>
  );
}

function StepCard({ step, index }: { step: { title: string; text: string; value: string }; index: number }) {
  return (
    <div className="border-b border-white/10 p-5 md:border-b-0 md:border-r md:last:border-r-0">
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">
        {index + 1}
      </div>
      <h3 className="text-base font-bold text-white">{step.title}</h3>
      <p className="mt-2 min-h-[60px] text-sm leading-6 text-slate-400">{step.text}</p>
      <CopyBox value={step.value} />
    </div>
  );
}

export default function SmartCliPage() {
  const [setupTab, setSetupTab] = useState<SetupTab>("mcp");
  const [clientTab, setClientTab] = useState<ClientTab>("claude");
  const steps = SETUP[setupTab];

  return (
    <>
      <TopNavbar />
      <main className="min-h-screen bg-[#05070b] pt-14 text-white">
        <section className="border-b border-white/10 bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.14),transparent_28%),linear-gradient(180deg,#07111f,#05070b)]">
          <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
            <div className="flex items-center justify-between gap-4">
              <Link href="/apps" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
                <ArrowLeft className="h-4 w-4" />
                Back to Apps
              </Link>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs text-cyan-100">
                <ShieldCheck className="h-3.5 w-3.5" />
                Hosted MCP endpoint
              </div>
            </div>

            <div className="mx-auto max-w-4xl py-12 text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-300">
                <Command className="h-3.5 w-3.5 text-cyan-300" />
                Smart CLI
              </div>
              <h1 className="text-balance text-4xl font-black leading-tight tracking-normal md:text-6xl">
                Connect Saad Studio to your AI agent
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-400">
                Use this page to connect Saad Studio through MCP, CLI, or agent skills. The important field is the hosted connector URL, not a terminal command.
              </p>
            </div>

            <div className="mx-auto max-w-5xl">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex rounded-full border border-white/10 bg-white/[0.06] p-1">
                  {([
                    ["mcp", Boxes, "MCP"],
                    ["cli", Terminal, "CLI"],
                    ["skill", FileCode2, "Skill"],
                  ] as const).map(([id, Icon, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSetupTab(id)}
                      className={cn(
                        "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition",
                        setupTab === id ? "bg-white text-black" : "text-slate-400 hover:text-white",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>

                {setupTab === "mcp" && (
                  <div className="inline-flex rounded-full border border-white/10 bg-white/[0.06] p-1">
                    {CLIENTS.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => setClientTab(client.id)}
                        className={cn(
                          "h-10 rounded-full px-4 text-sm font-semibold transition",
                          clientTab === client.id ? "bg-white text-black" : "text-slate-400 hover:text-white",
                        )}
                      >
                        {client.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid overflow-hidden rounded-xl border border-white/10 bg-[#101318] shadow-2xl shadow-black/30 md:grid-cols-3">
                {steps.map((step, index) => (
                  <StepCard key={step.title} step={step} index={index} />
                ))}
              </div>

              {setupTab === "mcp" && (
                <div className="mx-auto mt-4 flex max-w-max items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-sm text-emerald-100">
                  <Link2 className="h-4 w-4" />
                  Selected client: {CLIENTS.find((client) => client.id === clientTab)?.label}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 md:px-8">
          <div className="mb-5">
            <h2 className="text-2xl font-black">Connector Tools</h2>
            <p className="mt-1 text-sm text-slate-400">These are the actions exposed by the Smart CLI connector.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <div key={tool.title} className="rounded-lg border border-white/10 bg-[#0c111b] p-5">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-cyan-300/10 text-cyan-200">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-mono text-sm font-bold text-white">{tool.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{tool.text}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-14 md:px-8">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-lg border border-white/10 bg-[#0c111b] p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
                <Globe2 className="h-4 w-4 text-cyan-300" />
                Hosted endpoint
              </div>
              <p className="text-sm leading-6 text-slate-400">
                Paste this value into custom connector URL fields. It is a URL, so it belongs in the connector form. CLI commands belong only in terminal.
              </p>
              <CopyBox value={MCP_URL} />
            </div>

            <div className="rounded-lg border border-white/10 bg-[#0c111b] p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
                <KeyRound className="h-4 w-4 text-emerald-300" />
                Permission model
              </div>
              <p className="text-sm leading-6 text-slate-400">
                Keep generation behind Saad Studio review and account permissions. The connector prepares structured briefs first, then your backend can approve and execute them.
              </p>
              <div className="mt-4 grid gap-2 text-sm text-slate-300">
                <span className="inline-flex items-center gap-2"><Code2 className="h-4 w-4 text-emerald-300" /> structured requests</span>
                <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300" /> account controlled</span>
                <span className="inline-flex items-center gap-2"><Terminal className="h-4 w-4 text-emerald-300" /> CLI compatible</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
