"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Boxes,
  Braces,
  CheckCircle2,
  Clock3,
  Code2,
  Copy,
  Database,
  Download,
  ImageIcon,
  KeyRound,
  Layers3,
  LockKeyhole,
  Music,
  Play,
  ServerCog,
  Sparkles,
  TerminalSquare,
  Video,
  Wand2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Endpoint = {
  id: string;
  method: "GET" | "POST";
  path: string;
  title: string;
  description: string;
  latency: string;
  credits: string;
  icon: React.ElementType;
  body: Record<string, unknown>;
};

type SnippetLang = "curl" | "js" | "python";

const endpoints: Endpoint[] = [
  {
    id: "image",
    method: "POST",
    path: "/api/image/generate",
    title: "Image Generation",
    description: "Create product shots, ads, characters, and campaign visuals from prompt and reference images.",
    latency: "8-18s",
    credits: "4 cr",
    icon: ImageIcon,
    body: {
      prompt: "Luxury perfume bottle on reflective black marble, cinematic rim light",
      model: "nano-banana-pro",
      aspect_ratio: "1:1",
      references: ["https://cdn.example.com/reference.png"],
    },
  },
  {
    id: "video",
    method: "POST",
    path: "/api/video/generate",
    title: "Video Generation",
    description: "Generate motion clips with reference media, audio, duration, model, and aspect ratio controls.",
    latency: "90-180s",
    credits: "36 cr",
    icon: Video,
    body: {
      prompt: "A cinematic tracking shot of a model walking through neon rain",
      model: "seedance-2",
      duration: 10,
      aspect_ratio: "16:9",
      generate_audio: true,
      reference_image_urls: ["https://cdn.example.com/frame.png"],
    },
  },
  {
    id: "audio",
    method: "POST",
    path: "/api/audio/generate",
    title: "Voice and Music",
    description: "Create Arabic voiceovers, sound effects, and branded music beds with reusable presets.",
    latency: "6-22s",
    credits: "2 cr",
    icon: Music,
    body: {
      mode: "voice",
      text: "Welcome to Saad Studio, your AI creative engine.",
      voice_id: "arabic-news-voice",
      format: "mp3",
    },
  },
  {
    id: "assets",
    method: "POST",
    path: "/api/assets/persist",
    title: "Asset Library",
    description: "Persist generated media into the user's vault and reuse assets as references across tools.",
    latency: "300-900ms",
    credits: "0 cr",
    icon: Database,
    body: {
      type: "image",
      url: "https://cdn.example.com/output.png",
      prompt: "Campaign hero image",
      model: "nano-banana-pro",
    },
  },
];

const features = [
  { icon: KeyRound, label: "API keys", text: "Scoped keys for production, staging, and internal automation." },
  { icon: LockKeyhole, label: "Safe uploads", text: "Signed media URLs and validation before assets enter a workflow." },
  { icon: Activity, label: "Webhooks", text: "Receive job.completed and job.failed events without polling." },
  { icon: Download, label: "Direct files", text: "Download generated files through stable API download routes." },
];

const pipeline = [
  "Authenticate request",
  "Validate prompt and media",
  "Queue generation job",
  "Track progress or webhook",
  "Persist output to gallery",
];

const stats = [
  { value: "99.9%", label: "API uptime target" },
  { value: "< 1s", label: "Asset persist response" },
  { value: "9", label: "Reference inputs supported" },
  { value: "24/7", label: "Production monitoring" },
];

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function buildSnippet(endpoint: Endpoint, lang: SnippetLang) {
  const body = formatJson(endpoint.body);

  if (lang === "curl") {
    return `curl -X ${endpoint.method} https://www.saadstudio.app${endpoint.path} \\
  -H "Authorization: Bearer $SAAD_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${body}'`;
  }

  if (lang === "python") {
    return `import requests

response = requests.${endpoint.method.toLowerCase()}(
    "https://www.saadstudio.app${endpoint.path}",
    headers={
        "Authorization": "Bearer " + SAAD_API_KEY,
        "Content-Type": "application/json",
    },
    json=${body.replace(/\n/g, "\n    ")},
)

print(response.json())`;
  }

  return `const response = await fetch("https://www.saadstudio.app${endpoint.path}", {
  method: "${endpoint.method}",
  headers: {
    Authorization: \`Bearer \${process.env.SAAD_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(${body.replace(/\n/g, "\n  ")}),
});

const result = await response.json();`;
}

export default function ExplorePage() {
  const [selectedId, setSelectedId] = useState(endpoints[0].id);
  const [lang, setLang] = useState<SnippetLang>("curl");
  const [copied, setCopied] = useState(false);

  const selectedEndpoint = useMemo(
    () => endpoints.find((endpoint) => endpoint.id === selectedId) ?? endpoints[0],
    [selectedId],
  );

  const snippet = useMemo(() => buildSnippet(selectedEndpoint, lang), [lang, selectedEndpoint]);

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#050812] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.18),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.16),transparent_30%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#050812] to-transparent" />

        <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-10 px-5 py-12 md:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] md:px-8 lg:py-16">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="flex flex-col justify-center"
          >
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" />
              SAAD STUDIO API
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight tracking-normal md:text-6xl">
              Showcase API for creative automation.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
              Connect image, video, audio, and gallery workflows into your product with one production-ready creative API surface.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#api-console"
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
              >
                Open API Console
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              >
                View pricing
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="rounded-2xl border border-white/10 bg-slate-950/80 shadow-2xl shadow-cyan-950/30"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <TerminalSquare className="h-4 w-4 text-cyan-300" />
                Live request preview
              </div>
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </div>
            </div>
            <pre className="max-h-[420px] overflow-auto p-5 text-xs leading-6 text-cyan-50">
              <code>{snippet}</code>
            </pre>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8 md:px-8">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-2xl font-black text-cyan-300">{stat.value}</div>
              <div className="mt-1 text-xs text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="api-console" className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-5 pb-10 md:grid-cols-[320px_minmax(0,1fr)] md:px-8">
        <aside className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
            <ServerCog className="h-4 w-4 text-cyan-300" />
            Endpoints
          </div>
          {endpoints.map((endpoint) => {
            const Icon = endpoint.icon;
            const isActive = selectedEndpoint.id === endpoint.id;
            return (
              <button
                key={endpoint.id}
                onClick={() => setSelectedId(endpoint.id)}
                className={cn(
                  "w-full rounded-xl border p-4 text-left transition",
                  isActive
                    ? "border-cyan-400/50 bg-cyan-400/10 shadow-lg shadow-cyan-950/30"
                    : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                    <Icon className="h-5 w-5 text-cyan-200" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{endpoint.title}</div>
                    <div className="mt-1 text-[11px] text-slate-400">{endpoint.path}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </aside>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                  <span className="rounded-md bg-emerald-400/10 px-2 py-1">{selectedEndpoint.method}</span>
                  <span className="font-mono text-slate-300">{selectedEndpoint.path}</span>
                </div>
                <h2 className="mt-3 text-2xl font-black">{selectedEndpoint.title}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{selectedEndpoint.description}</p>
              </div>
              <div className="flex rounded-xl border border-white/10 bg-slate-950 p-1">
                {(["curl", "js", "python"] as SnippetLang[]).map((item) => (
                  <button
                    key={item}
                    onClick={() => setLang(item)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-bold uppercase transition",
                      lang === item ? "bg-cyan-400 text-slate-950" : "text-slate-400 hover:text-white",
                    )}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <Code2 className="h-4 w-4 text-cyan-300" />
                  Request code
                </div>
                <button
                  onClick={copySnippet}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/10"
                >
                  {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="max-h-[520px] overflow-auto rounded-xl border border-white/10 bg-[#020617] p-4 text-xs leading-6 text-slate-100">
                <code>{snippet}</code>
              </pre>
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Clock3 className="h-4 w-4 text-cyan-300" />
                Runtime profile
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
                  <div className="text-xs text-slate-500">Latency</div>
                  <div className="mt-1 text-lg font-black text-white">{selectedEndpoint.latency}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
                  <div className="text-xs text-slate-500">Credits</div>
                  <div className="mt-1 text-lg font-black text-white">{selectedEndpoint.credits}</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Braces className="h-4 w-4 text-cyan-300" />
                JSON payload
              </div>
              <pre className="mt-4 max-h-[300px] overflow-auto rounded-xl border border-white/10 bg-slate-950/70 p-3 text-[11px] leading-5 text-slate-200">
                <code>{formatJson(selectedEndpoint.body)}</code>
              </pre>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-5 pb-14 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:px-8">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1 text-xs font-bold text-violet-100">
            <Layers3 className="h-3.5 w-3.5" />
            Workflow
          </div>
          <h2 className="mt-4 text-2xl font-black">From prompt to reusable asset.</h2>
          <div className="mt-5 space-y-3">
            {pipeline.map((step, index) => (
              <div key={step} className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/60 p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/10 text-sm font-black text-cyan-200">
                  {index + 1}
                </div>
                <span className="text-sm text-slate-200">{step}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10">
                  <Icon className="h-5 w-5 text-cyan-200" />
                </div>
                <h3 className="mt-4 text-base font-black text-white">{feature.label}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{feature.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-t border-white/10 bg-slate-950/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 md:flex-row md:items-center md:justify-between md:px-8">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-cyan-200">
              <Boxes className="h-4 w-4" />
              Build with Saad Studio API
            </div>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Use the same creative engines behind the dashboard inside your app, automation, or client workflow.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href="/video" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">
              <Play className="h-4 w-4" />
              Try video tools
            </a>
            <a href="/image" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-950 hover:bg-slate-200">
              <Wand2 className="h-4 w-4" />
              Generate image
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
