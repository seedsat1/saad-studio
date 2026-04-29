"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  ChevronDown,
  Code2,
  Copy,
  Cpu,
  MessageSquarePlus,
  PenLine,
  Plus,
  RefreshCcw,
  Send,
  Sparkles,
  Trash2,
  User,
  Zap,
} from "lucide-react";
import { useGenerationGate } from "@/hooks/use-generation-gate";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
type Role = "user" | "assistant";

type Message = {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
};

type Session = {
  id: string;
  title: string;
  updatedAt: number;
  messages: Message[];
};

type ModelItem = {
  id: string;
  label: string;
  badge: string;
  accent: string;
};

type PersonaItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hint: string;
};

// ─────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────
const STORAGE_KEY = "saad_assist_sessions_v3";

const MODELS: ModelItem[] = [
  { id: "gpt-5.4", label: "GPT-5.4", badge: "Default", accent: "#818cf8" },
  { id: "claude-sonnet-4.6", label: "Claude Sonnet 4.6", badge: "Anthropic", accent: "#a78bfa" },
  { id: "gemini-3-pro", label: "Gemini 3 Pro", badge: "Google", accent: "#22d3ee" },
];

const PERSONAS: PersonaItem[] = [
  { id: "general", label: "General Assistant", icon: Sparkles, hint: "Balanced helpful answers" },
  { id: "prompt", label: "Prompt Engineer", icon: Zap, hint: "Cinematic prompts for video/image" },
  { id: "script", label: "Scriptwriter", icon: PenLine, hint: "Scenes, dialogue, structure" },
  { id: "code", label: "Code Expert", icon: Code2, hint: "Code, debugging, architecture" },
];

const SUGGESTIONS = [
  "Write a cinematic prompt for a rainy rooftop chase",
  "Refactor this React component to use hooks",
  "Outline a 60-second product launch script",
  "Explain how WebCodecs encoding works",
];

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createSession(): Session {
  const now = Date.now();
  return {
    id: newId("s"),
    title: "New Chat",
    updatedAt: now,
    messages: [],
  };
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ─────────────────────────────────────────────────────────────────
// Markdown rendering (light)
// ─────────────────────────────────────────────────────────────────
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|(\[(.+?)\]\((.+?)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) parts.push(<strong key={i++} className="font-semibold text-white">{m[2]}</strong>);
    else if (m[3]) parts.push(<em key={i++} className="italic">{m[4]}</em>);
    else if (m[5]) parts.push(<code key={i++} className="bg-white/10 rounded px-1.5 py-0.5 text-[11px] font-mono text-emerald-300">{m[6]}</code>);
    else if (m[7]) parts.push(<a key={i++} href={m[9]} target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline">{m[8]}</a>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function renderMarkdown(content: string): React.ReactNode {
  const lines = content.split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      const code = codeLines.join("\n");
      out.push(
        <div key={`code-${i}`} className="my-2 rounded-lg border border-white/10 bg-black/40 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 text-[10px] uppercase tracking-wide text-slate-500 font-mono">
            <span>{lang || "code"}</span>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(code)}
              className="text-slate-400 hover:text-white"
              title="Copy"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
          <pre className="p-3 overflow-x-auto text-[12px] font-mono text-emerald-300 whitespace-pre">{code}</pre>
        </div>,
      );
    } else if (/^### (.+)/.test(line)) {
      out.push(<h3 key={i} className="text-sm font-bold text-white mt-3 mb-1">{renderInline(line.slice(4))}</h3>);
    } else if (/^## (.+)/.test(line)) {
      out.push(<h2 key={i} className="text-base font-bold text-white mt-3 mb-1">{renderInline(line.slice(3))}</h2>);
    } else if (/^# (.+)/.test(line)) {
      out.push(<h1 key={i} className="text-lg font-extrabold text-white mt-3 mb-1">{renderInline(line.slice(2))}</h1>);
    } else if (/^[-*] (.+)/.test(line)) {
      out.push(
        <div key={i} className="flex gap-2 leading-relaxed text-[13px] text-slate-200">
          <span className="text-indigo-400 mt-1">•</span>
          <span>{renderInline(line.slice(2))}</span>
        </div>,
      );
    } else if (/^\d+\.\s+(.+)/.test(line)) {
      const m = line.match(/^(\d+)\.\s+(.+)/)!;
      out.push(
        <div key={i} className="flex gap-2 leading-relaxed text-[13px] text-slate-200">
          <span className="text-indigo-400 shrink-0 font-mono">{m[1]}.</span>
          <span>{renderInline(m[2])}</span>
        </div>,
      );
    } else if (line.trim() === "") {
      out.push(<div key={i} className="h-2" />);
    } else {
      out.push(
        <p key={i} className="leading-relaxed text-[13px] text-slate-200">{renderInline(line)}</p>,
      );
    }
    i++;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────
export default function AssistPage() {
  const { guardGeneration, getSafeErrorMessage } = useGenerationGate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState("");
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState("gpt-5.4");
  const [persona, setPersona] = useState("general");
  const [showModel, setShowModel] = useState(false);
  const [showPersona, setShowPersona] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  const modelRef = useRef<HTMLDivElement>(null);
  const personaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Load sessions
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Session[];
        if (Array.isArray(parsed) && parsed.length) {
          setSessions(parsed);
          setActiveId(parsed[0].id);
          return;
        }
      }
    } catch {}
    const s = createSession();
    setSessions([s]);
    setActiveId(s.id);
  }, []);

  // Persist
  useEffect(() => {
    if (!sessions.length) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch {}
  }, [sessions]);

  // Outside click for dropdowns
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) setShowModel(false);
      if (personaRef.current && !personaRef.current.contains(e.target as Node)) setShowPersona(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Auto-grow input
  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.style.height = "auto";
    inputRef.current.style.height = `${Math.min(160, inputRef.current.scrollHeight)}px`;
  }, [text]);

  // Auto-scroll on new messages / loading
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, activeId, isLoading]);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeId) ?? sessions[0],
    [sessions, activeId],
  );

  const currentModel = MODELS.find((m) => m.id === model) ?? MODELS[0];
  const currentPersona = PERSONAS.find((p) => p.id === persona) ?? PERSONAS[0];
  const PersonaIcon = currentPersona.icon;

  const updateActive = (updater: (s: Session) => Session) => {
    setSessions((prev) =>
      prev
        .map((s) => (s.id === activeSession?.id ? updater(s) : s))
        .sort((a, b) => b.updatedAt - a.updatedAt),
    );
  };

  const handleNew = () => {
    const s = createSession();
    setSessions((prev) => [s, ...prev]);
    setActiveId(s.id);
    setText("");
  };

  const handleDelete = (id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (next.length === 0) {
        const s = createSession();
        setActiveId(s.id);
        return [s];
      }
      if (id === activeId) setActiveId(next[0].id);
      return next;
    });
  };

  const sendMessageWith = async (rawText: string) => {
    if (!activeSession || !rawText.trim() || isLoading) return;

    const gate = await guardGeneration({
      requiredCredits: 1,
      action: "assist:send",
    });
    if (!gate.ok) return;

    const userMsg: Message = {
      id: newId("m"),
      role: "user",
      content: rawText.trim(),
      createdAt: Date.now(),
    };
    const next = [...activeSession.messages, userMsg];

    updateActive((s) => ({
      ...s,
      messages: next,
      title: s.title === "New Chat" ? rawText.trim().slice(0, 48) : s.title,
      updatedAt: Date.now(),
    }));

    setIsLoading(true);
    try {
      const res = await fetch("/api/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          persona,
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || payload?.message || `Request failed (${res.status})`);
      }
      const aiMsg: Message = {
        id: newId("m"),
        role: "assistant",
        content: String(payload?.content || "(empty response)"),
        createdAt: Date.now(),
      };
      updateActive((s) => ({ ...s, messages: [...s.messages, aiMsg], updatedAt: Date.now() }));
    } catch (err) {
      const errMsg: Message = {
        id: newId("m"),
        role: "assistant",
        content: getSafeErrorMessage(err),
        createdAt: Date.now(),
      };
      updateActive((s) => ({ ...s, messages: [...s.messages, errMsg], updatedAt: Date.now() }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    sendMessageWith(t);
  };

  const handleRegenerate = async () => {
    if (!activeSession || isLoading) return;
    // Find last user message; remove any assistant after it; resend.
    const msgs = [...activeSession.messages];
    let lastUserIdx = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === "user") {
        lastUserIdx = i;
        break;
      }
    }
    if (lastUserIdx < 0) return;
    const trimmed = msgs.slice(0, lastUserIdx + 1);

    const gate = await guardGeneration({
      requiredCredits: 1,
      action: "assist:regenerate",
    });
    if (!gate.ok) return;

    updateActive((s) => ({ ...s, messages: trimmed, updatedAt: Date.now() }));

    setIsLoading(true);
    try {
      const res = await fetch("/api/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          persona,
          messages: trimmed.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || `Request failed (${res.status})`);
      const aiMsg: Message = {
        id: newId("m"),
        role: "assistant",
        content: String(payload?.content || "(empty response)"),
        createdAt: Date.now(),
      };
      updateActive((s) => ({ ...s, messages: [...s.messages, aiMsg], updatedAt: Date.now() }));
    } catch (err) {
      const errMsg: Message = {
        id: newId("m"),
        role: "assistant",
        content: getSafeErrorMessage(err),
        createdAt: Date.now(),
      };
      updateActive((s) => ({ ...s, messages: [...s.messages, errMsg], updatedAt: Date.now() }));
    } finally {
      setIsLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const messages = activeSession?.messages ?? [];
  const isEmpty = messages.length === 0;

  return (
    <div className="flex min-h-0 h-full w-full overflow-hidden" style={{ background: "linear-gradient(180deg,#080c1a,#05070f)" }}>
      {/* Sidebar */}
      {showSidebar && (
        <aside className="w-[260px] border-r border-white/5 bg-black/30 backdrop-blur-xl flex flex-col flex-shrink-0">
          <div className="px-4 pt-4 pb-3 flex items-center gap-2">
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#6366f1,#818cf8)", boxShadow: "0 6px 20px rgba(99,102,241,.35)" }}
            >
              <Cpu className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white">Saad Copilot</p>
              <p className="text-[10px] text-slate-500">AI Creative Workspace</p>
            </div>
          </div>

          <div className="px-3 pb-3">
            <button
              type="button"
              onClick={handleNew}
              className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 text-white transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#6366f1,#818cf8)", boxShadow: "0 4px 16px rgba(99,102,241,.25)" }}
            >
              <Plus className="h-4 w-4" />
              New Chat
            </button>
          </div>

          <div className="px-3 pb-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider">Recent</div>
          <div className="flex-1 overflow-y-auto px-2 space-y-1">
            {sessions.map((s) => {
              const active = s.id === activeSession?.id;
              return (
                <div
                  key={s.id}
                  className={`group rounded-lg border px-3 py-2 transition cursor-pointer flex items-start gap-2 ${
                    active
                      ? "border-indigo-500/30 bg-indigo-500/10 text-white"
                      : "border-transparent bg-transparent text-slate-400 hover:bg-white/5"
                  }`}
                  onClick={() => setActiveId(s.id)}
                >
                  <MessageSquarePlus className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${active ? "text-indigo-300" : "text-slate-500"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold truncate">{s.title || "New Chat"}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{new Date(s.updatedAt).toLocaleDateString()}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(s.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition"
                    title="Delete chat"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="p-3 border-t border-white/5 text-[10px] text-slate-500">
            Sessions are stored locally in your browser.
          </div>
        </aside>
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowSidebar((v) => !v)}
            className="h-9 w-9 rounded-lg border border-white/5 bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06] transition flex items-center justify-center"
            title="Toggle sidebar"
          >
            <span className="text-base leading-none">{showSidebar ? "←" : "→"}</span>
          </button>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase"
            style={{ background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.15)", color: "#818cf8" }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#818cf8", boxShadow: "0 0 6px #818cf8" }} />
            ASSIST
          </div>

          <h1 className="text-sm font-bold text-white truncate flex-1">
            {activeSession?.title || "New Chat"}
          </h1>

          {/* Model picker */}
          <div className="relative" ref={modelRef}>
            <button
              type="button"
              onClick={() => {
                setShowModel((v) => !v);
                setShowPersona(false);
              }}
              className="h-9 px-3 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] text-[11px] font-semibold flex items-center gap-2 transition"
              style={{ color: currentModel.accent }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: currentModel.accent }} />
              {currentModel.label}
              <ChevronDown className={`h-3 w-3 transition ${showModel ? "rotate-180" : ""}`} />
            </button>
            {showModel && (
              <div className="absolute right-0 top-[calc(100%+6px)] w-56 rounded-xl border border-white/10 bg-[#0d1128] shadow-2xl z-50 overflow-hidden">
                {MODELS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setModel(m.id);
                      setShowModel(false);
                    }}
                    className={`w-full px-3 py-2.5 text-left text-[12px] flex items-center justify-between transition ${
                      model === m.id ? "bg-white/5" : "hover:bg-white/5"
                    }`}
                  >
                    <span className="flex items-center gap-2 font-semibold" style={{ color: m.accent }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.accent }} />
                      {m.label}
                    </span>
                    <span className="text-[10px] text-slate-500">{m.badge}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Persona picker */}
          <div className="relative" ref={personaRef}>
            <button
              type="button"
              onClick={() => {
                setShowPersona((v) => !v);
                setShowModel(false);
              }}
              className="h-9 px-3 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] text-[11px] font-semibold flex items-center gap-2 text-slate-200 transition"
            >
              <PersonaIcon className="h-3.5 w-3.5 text-violet-300" />
              {currentPersona.label}
              <ChevronDown className={`h-3 w-3 text-slate-400 transition ${showPersona ? "rotate-180" : ""}`} />
            </button>
            {showPersona && (
              <div className="absolute right-0 top-[calc(100%+6px)] w-64 rounded-xl border border-white/10 bg-[#0d1128] shadow-2xl z-50 overflow-hidden">
                {PERSONAS.map((p) => {
                  const Icon = p.icon;
                  const active = persona === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPersona(p.id);
                        setShowPersona(false);
                      }}
                      className={`w-full px-3 py-2.5 text-left text-[12px] flex items-start gap-2 transition ${
                        active ? "bg-white/5 text-white" : "text-slate-300 hover:bg-white/5"
                      }`}
                    >
                      <Icon className={`h-3.5 w-3.5 mt-0.5 ${active ? "text-violet-300" : "text-slate-500"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold">{p.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{p.hint}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4">
          {isEmpty && !isLoading && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4 px-6">
              <div
                className="h-14 w-14 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(99,102,241,.08)" }}
              >
                <Sparkles className="h-7 w-7 text-indigo-300" />
              </div>
              <div>
                <h2
                  className="text-2xl font-extrabold tracking-tight"
                  style={{
                    background: "linear-gradient(135deg,#e8ecf8,#818cf8)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  How can I help today?
                </h2>
                <p className="text-[12px] text-slate-500 mt-2 max-w-md">
                  Chat with {currentModel.label} as a {currentPersona.label.toLowerCase()}. Send a message to begin.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-2xl mt-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => sendMessageWith(s)}
                    className="px-3.5 py-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/20 text-[12px] text-slate-300 hover:text-white transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="max-w-3xl mx-auto space-y-5">
            {messages.map((m, idx) => {
              const isUser = m.role === "user";
              const isLastAssistant = !isUser && idx === messages.length - 1;
              return (
                <div key={m.id} className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
                  <div
                    className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-1"
                    style={{
                      background: isUser ? "rgba(34,211,153,.12)" : "rgba(99,102,241,.12)",
                      color: isUser ? "#34d399" : "#818cf8",
                    }}
                  >
                    {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={`max-w-[80%] flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                    <div
                      className={`rounded-2xl px-4 py-3 border ${
                        isUser
                          ? "rounded-tr-sm"
                          : "rounded-tl-sm"
                      }`}
                      style={{
                        background: isUser ? "rgba(34,211,153,.06)" : "rgba(99,102,241,.06)",
                        borderColor: isUser ? "rgba(34,211,153,.15)" : "rgba(99,102,241,.15)",
                      }}
                    >
                      {isUser ? (
                        <p className="leading-relaxed text-[13px] text-slate-100 whitespace-pre-wrap">{m.content}</p>
                      ) : (
                        <div>{renderMarkdown(m.content)}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-slate-500">
                      <span>{formatTime(m.createdAt)}</span>
                      {!isUser && (
                        <>
                          <button
                            type="button"
                            onClick={() => navigator.clipboard?.writeText(m.content)}
                            className="hover:text-white transition flex items-center gap-1"
                            title="Copy"
                          >
                            <Copy className="h-3 w-3" />
                            Copy
                          </button>
                          {isLastAssistant && !isLoading && (
                            <button
                              type="button"
                              onClick={handleRegenerate}
                              className="hover:text-white transition flex items-center gap-1"
                              title="Regenerate"
                            >
                              <RefreshCcw className="h-3 w-3" />
                              Regenerate
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-1" style={{ background: "rgba(99,102,241,.12)", color: "#818cf8" }}>
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl px-4 py-3 border rounded-tl-sm" style={{ background: "rgba(99,102,241,.06)", borderColor: "rgba(99,102,241,.15)" }}>
                  <div className="flex gap-1.5 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0.15s" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0.3s" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        {/* Input */}
        <div className="px-5 pb-5 pt-2">
          <div className="max-w-3xl mx-auto">
            <div
              className="rounded-2xl border bg-white/[0.03] transition focus-within:border-indigo-500/30 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,.08)]"
              style={{ borderColor: "rgba(255,255,255,.08)" }}
            >
              <div className="flex items-end gap-2 px-4 py-3">
                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={onKeyDown}
                  rows={1}
                  placeholder={`Message ${currentModel.label}…`}
                  className="flex-1 bg-transparent border-0 outline-none resize-none text-[14px] leading-relaxed text-white placeholder-slate-500 max-h-[160px]"
                  style={{ minHeight: 24 }}
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!text.trim() || isLoading}
                  className="h-10 w-10 rounded-xl flex items-center justify-center text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: "linear-gradient(135deg,#6366f1,#818cf8)",
                    boxShadow: text.trim() && !isLoading ? "0 4px 16px rgba(99,102,241,.4)" : "none",
                  }}
                  title="Send (Enter)"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 border-t border-white/5 text-[10px] text-slate-500">
                <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[9px]">Enter</kbd>
                <span>send</span>
                <span className="text-slate-700">·</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[9px]">Shift+Enter</kbd>
                <span>new line</span>
                <span className="ml-auto flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px #34d399" }} />
                  Live · {currentModel.label}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
