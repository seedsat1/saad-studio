"use client";

import { useState, type ComponentProps } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Ban,
  Boxes,
  Check,
  Clock3,
  Clipboard,
  Code2,
  Command,
  Eye,
  FileCode2,
  Globe2,
  Image as ImageIcon,
  Images,
  KeyRound,
  Link2,
  ListChecks,
  Megaphone,
  PlaySquare,
  ShieldCheck,
  Terminal,
  Upload,
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

const TOOL_GROUPS = [
  {
    title: "Interactive tools",
    tools: [
      { icon: ImageIcon, title: "generate_image", text: "Create an image request through Saad Studio." },
      { icon: PlaySquare, title: "generate_video", text: "Create a video request with scene, motion, and duration." },
      { icon: Eye, title: "job_display", text: "Display a running or completed generation job." },
      { icon: KeyRound, title: "show_characters", text: "Show saved characters and reusable identity assets." },
      { icon: Images, title: "show_generations", text: "Show generated media and recent outputs." },
      { icon: Megaphone, title: "show_marketing_studio", text: "Open campaign and marketing asset workflows." },
      { icon: Images, title: "show_medias", text: "Browse uploaded and generated media assets." },
      { icon: CreditIcon, title: "show_plans_and_credits", text: "Show plan limits, credits, and usage summary." },
      { icon: ListChecks, title: "virality_predictor", text: "Score a clip or concept for hook, retention, and engagement." },
    ],
  },
  {
    title: "Read-only tools",
    tools: [
      { icon: CreditIcon, title: "balance", text: "Read the available credit balance." },
      { icon: Globe2, title: "list_workspaces", text: "List workspaces available to the account." },
      { icon: Boxes, title: "models_explore", text: "Explore available image and video models." },
      { icon: ListChecks, title: "transactions", text: "Read credit transactions and usage history." },
    ],
  },
  {
    title: "Write/delete tools",
    tools: [
      { icon: Check, title: "media_confirm", text: "Confirm selected media for use in a workflow." },
      { icon: Upload, title: "media_upload", text: "Upload media references for generation." },
      { icon: Globe2, title: "select_workspace", text: "Select the workspace used by future actions." },
    ],
  },
  {
    title: "App-only tools",
    tools: [
      { icon: Clock3, title: "job_status", text: "Read internal job status for the app UI." },
    ],
  },
];

const TOOLS = TOOL_GROUPS.flatMap((group) => group.tools);

const PERMISSION_OPTIONS = [
  { label: "Always allow", icon: Check, color: "text-emerald-300" },
  { label: "Needs approval", icon: Clock3, color: "text-cyan-300" },
  { label: "Block", icon: Ban, color: "text-rose-300" },
];

function CreditIcon(props: ComponentProps<typeof KeyRound>) {
  return <KeyRound {...props} />;
}

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

        <section className="mx-auto max-w-7xl px-4 pb-10 md:px-8">
          <div className="rounded-lg border border-white/10 bg-[#0c111b]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div>
                <h2 className="text-xl font-black">Tool Permissions</h2>
                <p className="mt-1 text-sm text-slate-400">Choose when Claude is allowed to use each Smart CLI tool.</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-md border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100">
                <Clock3 className="h-4 w-4" />
                Needs approval
              </div>
            </div>

            <div className="divide-y divide-white/10">
              {TOOL_GROUPS.map((group) => (
                <div key={group.title}>
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-2 font-bold text-white">
                      <span>{group.title}</span>
                      <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs text-slate-300">{group.tools.length}</span>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.05] px-3 py-2 text-sm font-semibold text-slate-200">
                      <Clock3 className="h-4 w-4" />
                      Needs approval
                    </div>
                  </div>

                  <div className="divide-y divide-white/10">
                    {group.tools.map((tool) => (
                      <div key={tool.title} className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/[0.05] text-cyan-200">
                            <tool.icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-mono font-semibold text-white">{tool.title}</div>
                            <div className="truncate text-sm text-slate-500">{tool.text}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {PERMISSION_OPTIONS.map((option) => {
                            const Icon = option.icon;
                            const active = option.label === "Needs approval";
                            return (
                              <button
                                key={option.label}
                                type="button"
                                aria-label={`${tool.title}: ${option.label}`}
                                className={cn(
                                  "flex h-9 w-9 items-center justify-center rounded-md border transition",
                                  active ? "border-cyan-300/50 bg-cyan-300/15" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]",
                                )}
                                title={option.label}
                              >
                                <Icon className={cn("h-4 w-4", active ? "text-cyan-200" : option.color)} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
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
