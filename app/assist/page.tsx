"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  ChevronDown,
  Clock,
  Cpu,
  Paperclip,
  Plus,
  Send,
  Sparkles,
  User,
  Zap,
  PenLine,
  Code2,
} from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
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
  textColor: string;
  dotColor: string;
};

type PersonaItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const STORAGE_KEY = "saad_assist_sessions_v2";

const MODELS: ModelItem[] = [
  { id: "gpt-5.4", label: "GPT-5.4", badge: "Default", textColor: "text-emerald-300", dotColor: "bg-emerald-400" },
  { id: "claude-sonnet-4.6", label: "Claude Sonnet 4.6", badge: "Anthropic", textColor: "text-violet-300", dotColor: "bg-violet-400" },
  { id: "gemini-3-pro", label: "Gemini 3 Pro", badge: "Google", textColor: "text-cyan-300", dotColor: "bg-cyan-400" },
];

const PERSONAS: PersonaItem[] = [
  { id: "general", label: "General Assistant", icon: Sparkles },
  { id: "prompt", label: "Prompt Engineer", icon: Zap },
  { id: "script", label: "Scriptwriter", icon: PenLine },
  { id: "code", label: "Code Expert", icon: Code2 },
];

function createWelcomeMessage(): Message {
  return {
    id: `m-${Date.now()}-welcome`,
    role: "assistant",
    createdAt: Date.now(),
    content:
      "Hello Saad. I am ready to help with prompts, scripts, and technical tasks. Send your first message to start a real conversation.",
  };
}

function createSession(): Session {
  const now = Date.now();
  return {
    id: `s-${now}`,
    title: "New Chat",
    updatedAt: now,
    messages: [createWelcomeMessage()],
  };
}

function renderInline(text: string): React.ReactNode[] {
  // Process inline markdown: **bold**, *italic*, `code`, [link](url)
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|(\[(.+?)\]\((.+?)\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let idx = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    if (match[1]) {
      parts.push(<strong key={idx++} className="font-semibold text-white">{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={idx++} className="italic">{match[4]}</em>);
    } else if (match[5]) {
      parts.push(<code key={idx++} className="bg-slate-700 rounded px-1 py-0.5 text-xs font-mono text-emerald-300">{match[6]}</code>);
    } else if (match[7]) {
      parts.push(<a key={idx++} href={match[9]} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">{match[8]}</a>);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function renderSimpleMarkdown(content: string) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Fenced code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={i} className="bg-slate-800 rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono text-emerald-300 whitespace-pre-wrap">
          {lang && <span className="text-slate-500 text-xs block mb-1">{lang}</span>}
          {codeLines.join("\n")}
        </pre>
      );
    } else if (/^### (.+)/.test(line)) {
      elements.push(<h3 key={i} className="text-base font-semibold text-white mt-3 mb-1">{renderInline(line.slice(4))}</h3>);
    } else if (/^## (.+)/.test(line)) {
      elements.push(<h2 key={i} className="text-lg font-bold text-white mt-3 mb-1">{renderInline(line.slice(3))}</h2>);
    } else if (/^# (.+)/.test(line)) {
      elements.push(<h1 key={i} className="text-xl font-bold text-white mt-3 mb-1">{renderInline(line.slice(2))}</h1>);
    } else if (/^[-*] (.+)/.test(line)) {
      elements.push(
        <div key={i} className="flex gap-2 leading-relaxed text-sm text-slate-200">
          <span className="text-slate-400 mt-0.5">•</span>
          <span>{renderInline(line.slice(2))}</span>
        </div>
      );
    } else if (/^\d+\. (.+)/.test(line)) {
      const numMatch = line.match(/^(\d+)\. (.+)/);
      elements.push(
        <div key={i} className="flex gap-2 leading-relaxed text-sm text-slate-200">
          <span className="text-slate-400 shrink-0">{numMatch![1]}.</span>
          <span>{renderInline(numMatch![2])}</span>
        </div>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(
        <p key={i} className="leading-relaxed text-sm text-slate-200">
          {renderInline(line)}
        </p>
      );
    }
    i++;
  }
  return elements;
}

export default function AssistPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState("gpt-5.4");
  const [persona, setPersona] = useState("general");
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showPersonaDropdown, setShowPersonaDropdown] = useState(false);

  const modelRef = useRef<HTMLDivElement>(null);
  const personaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Session[];
        if (Array.isArray(parsed) && parsed.length) {
          setSessions(parsed);
          setActiveSessionId(parsed[0].id);
          return;
        }
      }
    } catch {
      // ignore corrupted local cache
    }

    const first = createSession();
    setSessions([first]);
    setActiveSessionId(first.id);
  }, []);

  useEffect(() => {
    if (!sessions.length) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) setShowModelDropdown(false);
      if (personaRef.current && !personaRef.current.contains(e.target as Node)) setShowPersonaDropdown(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.style.height = "auto";
    inputRef.current.style.height = `${Math.min(160, inputRef.current.scrollHeight)}px`;
  }, [text]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, activeSessionId, isLoading]);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? sessions[0],
    [sessions, activeSessionId],
  );

  const currentModel = MODELS.find((m) => m.id === model) ?? MODELS[0];
  const currentPersona = PERSONAS.find((p) => p.id === persona) ?? PERSONAS[0];
  const PersonaIcon = currentPersona.icon;

  const updateActiveSession = (updater: (session: Session) => Session) => {
    setSessions((prev) => prev.map((s) => (s.id === activeSession?.id ? updater(s) : s)).sort((a, b) => b.updatedAt - a.updatedAt));
  };

  const handleNewChat = () => {
    const s = createSession();
    setSessions((prev) => [s, ...prev]);
    setActiveSessionId(s.id);
    setText("");
  };

  const handleSend = async () => {
    if (!activeSession || !text.trim() || isLoading) return;

    const userText = text.trim();
    setText("");
    setIsLoading(true);

    const userMessage: Message = {
      id: `m-${Date.now()}-u`,
      role: "user",
      content: userText,
      createdAt: Date.now(),
    };

    const nextMessages = [...activeSession.messages, userMessage];

    updateActiveSession((session) => ({
      ...session,
      messages: nextMessages,
      title: session.title === "New Chat" ? userText.slice(0, 48) : session.title,
      updatedAt: Date.now(),
    }));

    try {
      const res = await fetch("/api/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          persona,
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload?.error || payload?.message || "Request failed");
      }

      const aiMessage: Message = {
        id: `m-${Date.now()}-a`,
        role: "assistant",
        content: String(payload?.content || "No response received."),
        createdAt: Date.now(),
      };

      updateActiveSession((session) => ({
        ...session,
        messages: [...session.messages, aiMessage],
        updatedAt: Date.now(),
      }));
    } catch (error) {
      const errorMessage: Message = {
        id: `m-${Date.now()}-e`,
        role: "assistant",
        content: `Error: ${error instanceof Error ? error.message : "Unexpected error"}`,
        createdAt: Date.now(),
      };

      updateActiveSession((session) => ({
        ...session,
        messages: [...session.messages, errorMessage],
        updatedAt: Date.now(),
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex min-h-0 h-full w-full overflow-hidden bg-[#030712]">
      <aside className="w-[260px] border-r border-slate-800/70 bg-slate-950/80 backdrop-blur-xl flex flex-col">
        <div className="px-4 pt-4 pb-3 flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shadow-[0_0_18px_rgba(59,130,246,0.35)]">
            <Cpu className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">Saad Copilot</p>
            <p className="text-[10px] text-slate-500">AI Creative Workspace</p>
          </div>
        </div>

        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={handleNewChat}
            className="w-full rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-300 px-3 py-2 text-sm font-semibold flex items-center gap-2 hover:bg-blue-500/20"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-2">
          {sessions.map((s) => {
            const active = s.id === activeSession?.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSessionId(s.id)}
                className={`w-full text-left rounded-xl border px-3 py-2 transition ${
                  active
                    ? "border-blue-500/40 bg-slate-800/70 text-white"
                    : "border-transparent bg-transparent text-slate-400 hover:bg-slate-800/50"
                }`}
              >
                <p className="text-xs font-semibold truncate">{s.title || "New Chat"}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{new Date(s.updatedAt).toLocaleDateString()}</p>
              </button>
            );
          })}
        </div>

        <div className="p-3 border-t border-slate-800/70 text-[10px] text-slate-500">Session data is saved locally in your browser.</div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="px-5 pt-4 pb-3">
          <div className="rounded-2xl border border-slate-700/70 bg-slate-900/80 backdrop-blur-xl px-4 py-2.5 flex items-center gap-3 relative z-20">
            <div className="relative" ref={modelRef}>
              <button
                type="button"
                onClick={() => {
                  setShowModelDropdown((v) => !v);
                  setShowPersonaDropdown(false);
                }}
                className="h-9 px-3 rounded-xl border border-slate-700 bg-slate-900 text-sm flex items-center gap-2"
              >
                <span className={`h-2 w-2 rounded-full ${currentModel.dotColor}`} />
                <span className={currentModel.textColor}>{currentModel.label}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition ${showModelDropdown ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {showModelDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="absolute left-0 top-[calc(100%+8px)] w-64 rounded-xl border border-slate-600 bg-slate-900 shadow-[0_20px_40px_rgba(0,0,0,0.55)] z-[100] overflow-hidden"
                  >
                    {MODELS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setModel(m.id);
                          setShowModelDropdown(false);
                        }}
                        className={`w-full px-3 py-2.5 text-left text-sm flex items-center justify-between hover:bg-slate-800/80 ${
                          model === m.id ? "bg-slate-800/80" : ""
                        }`}
                      >
                        <span className={`flex items-center gap-2 ${m.textColor}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${m.dotColor}`} />
                          <span className="truncate">{m.label}</span>
                        </span>
                        <span className="text-[10px] text-slate-400">{m.badge}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="h-5 w-px bg-slate-700" />

            <div className="relative" ref={personaRef}>
              <button
                type="button"
                onClick={() => {
                  setShowPersonaDropdown((v) => !v);
                  setShowModelDropdown(false);
                }}
                className="h-9 px-3 rounded-xl border border-slate-700 bg-slate-900 text-sm flex items-center gap-2"
              >
                <PersonaIcon className="h-3.5 w-3.5 text-violet-300" />
                <span className="text-slate-200">{currentPersona.label}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition ${showPersonaDropdown ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {showPersonaDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="absolute left-0 top-[calc(100%+8px)] w-56 rounded-xl border border-slate-600 bg-slate-900 shadow-[0_20px_40px_rgba(0,0,0,0.55)] z-[100] overflow-hidden"
                  >
                    {PERSONAS.map((p) => {
                      const Icon = p.icon;
                      const active = persona === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setPersona(p.id);
                            setShowPersonaDropdown(false);
                          }}
                          className={`w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-slate-800/80 ${
                            active ? "bg-slate-800/80 text-white" : "text-slate-300"
                          }`}
                        >
                          <Icon className={`h-3.5 w-3.5 ${active ? "text-violet-300" : "text-slate-500"}`} />
                          <span>{p.label}</span>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="ml-auto text-xs text-slate-400 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]" />
              Live
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4 space-y-5">
          {(activeSession?.messages ?? []).map((m) => {
            const user = m.role === "user";
            return (
              <div key={m.id} className={`flex gap-3 ${user ? "flex-row-reverse" : ""}`}>
                <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-1 bg-slate-800 border border-slate-700">
                  {user ? <User className="h-4 w-4 text-slate-300" /> : <Bot className="h-4 w-4 text-cyan-300" />}
                </div>
                <div className={`max-w-[75%] ${user ? "items-end" : "items-start"} flex flex-col`}>
                  <div
                    className={`rounded-2xl px-4 py-3 border ${
                      user
                        ? "bg-blue-600/90 border-blue-500/70 text-white rounded-tr-sm"
                        : "bg-slate-800/70 border-slate-700/80 text-slate-200 rounded-tl-sm"
                    }`}
                  >
                    {renderSimpleMarkdown(m.content)}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 px-1">{formatTime(m.createdAt)}</span>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-1 bg-slate-800 border border-slate-700">
                <Bot className="h-4 w-4 text-cyan-300" />
              </div>
              <div className="rounded-2xl rounded-tl-sm px-4 py-3 border border-slate-700/80 bg-slate-800/70 text-slate-300 text-sm flex items-center gap-1.5">
                <span>Thinking</span>
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 animate-pulse" />
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 animate-pulse [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 animate-pulse [animation-delay:240ms]" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="px-5 pb-5 pt-1">
          <div className="rounded-2xl border border-slate-700/80 bg-slate-900/85 backdrop-blur-xl">
            <div className="px-4 pt-3 pb-2 flex items-end gap-3">
              <button type="button" className="h-8 w-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-cyan-300">
                <Paperclip className="h-4 w-4" />
              </button>

              <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder={`Ask ${currentModel.label} anything...`}
                className="flex-1 resize-none bg-transparent text-slate-100 placeholder:text-slate-500 text-sm outline-none py-1"
                rows={1}
                style={{ minHeight: 34, maxHeight: 160 }}
              />

              <button
                type="button"
                onClick={handleSend}
                disabled={!text.trim() || isLoading || !activeSession}
                className={`h-9 w-9 rounded-xl flex items-center justify-center transition ${
                  !text.trim() || isLoading || !activeSession
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-gradient-to-br from-blue-500 to-violet-500 text-white shadow-[0_0_18px_rgba(59,130,246,0.45)]"
                }`}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <div className="px-4 pb-2.5 pt-1 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
              <span>Enter to send · Shift+Enter new line</span>
              <span>{currentPersona.label}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
