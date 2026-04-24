"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const LAST_OPENED_PROJECT_KEY = "videoEditor.lastOpenedProjectId";
const RELOAD_RESUME_PROJECT_KEY = "videoEditor.reloadResumeProjectId";

function getNavigationType(): string {
  if (typeof window === "undefined") return "";
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (nav?.type) return nav.type;
  return "";
}

type EditorProject = {
  id: string;
  name?: string;
  createdAt?: string;
  tracks?: Record<string, unknown[]>;
};

function pickFirstPreviewUrl(candidates: unknown[]): string {
  for (const c of candidates) {
    if (typeof c !== "string") continue;
    const value = c.trim();
    if (!value) continue;
    return value;
  }
  return "";
}

function extractFromClipArray(clips: unknown[]): string {
  for (const item of clips) {
    if (!item || typeof item !== "object") continue;
    const clip = item as Record<string, unknown>;
    const direct = pickFirstPreviewUrl([
      clip.thumbnail,
      clip.poster,
      clip.preview,
      clip.image,
      clip.url,
      clip.src,
      clip.cover,
    ]);
    if (direct) return direct;
  }
  return "";
}

function extractFromTimelineStorage(projectId: string): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem(`ff_timeline_state_v1:${projectId}`);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { clips?: unknown[] } | null;
    const clips = Array.isArray(parsed?.clips) ? parsed!.clips! : [];
    if (!clips.length) return "";

    // Prefer persistent URLs first; keep blob as last-resort fallback.
    const persistent = extractFromClipArray(
      clips.filter((c) => {
        if (!c || typeof c !== "object") return false;
        const src = (c as Record<string, unknown>).src;
        return typeof src === "string" && src.trim() && !src.startsWith("blob:");
      }),
    );
    if (persistent) return persistent;

    return extractFromClipArray(clips);
  } catch {
    return "";
  }
}

export default function VideoEditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const forcedProjectId = (searchParams.get("projectId") || "").trim();

  const [projects, setProjects] = useState<EditorProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [query, setQuery] = useState("");
  const [lastOpenedProjectId, setLastOpenedProjectId] = useState("");
  const [activeProject, setActiveProject] = useState<EditorProject | null>(null);
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [warnOpen, setWarnOpen] = useState(false);

  const title = useMemo(() => activeProject?.name || "Cinema Workspace", [activeProject]);
  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => (p.name || "untitled").toLowerCase().includes(q));
  }, [projects, query]);

  const projectPreviewById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const project of projects) {
      const fromProject = extractProjectPreview(project);
      map[project.id] = fromProject || extractFromTimelineStorage(project.id);
    }
    return map;
  }, [projects]);

  async function loadProjects() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/editor/projects", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to load projects.");
      }
      const list = Array.isArray(data?.projects) ? (data.projects as EditorProject[]) : [];
      setProjects(list);
      let fallbackReloadProjectId = "";
      try {
        if (!forcedProjectId && getNavigationType() === "reload") {
          fallbackReloadProjectId = sessionStorage.getItem(RELOAD_RESUME_PROJECT_KEY) || "";
        }
      } catch {
        fallbackReloadProjectId = "";
      }

      const targetProjectId = forcedProjectId || fallbackReloadProjectId;
      if (targetProjectId) {
        const hit = list.find((p) => p.id === targetProjectId);
        if (hit) setActiveProject(hit);
        if (hit && !forcedProjectId) {
          router.replace(`/video-editor?projectId=${encodeURIComponent(hit.id)}`);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load projects.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LAST_OPENED_PROJECT_KEY) || "";
      setLastOpenedProjectId(saved);
    } catch {
      setLastOpenedProjectId("");
    }

    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forcedProjectId]);

  // ── Auto-save: listen for timeline state relayed from studio-shell iframe ──
  useEffect(() => {
    if (!activeProject) return;
    const projectId = activeProject.id;

    const handler = async (event: MessageEvent) => {
      const d = event.data;
      if (!d || d.type !== "ff:autosave-state" || !d.timelineState) return;

      setSaveStatus("saving");
      try {
        const state = d.timelineState as {
          clips?: unknown[];
          tracks?: unknown[];
          projectRatio?: string;
        };
        const body = {
          id: projectId,
          name: activeProject.name || "Untitled Project",
          tracks: {
            clips: state.clips ?? [],
            trackList: state.tracks ?? [],
            projectRatio: state.projectRatio ?? "16:9",
          },
          updatedAt: new Date().toISOString(),
        };
        const res = await fetch("/api/editor/projects", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          setSaveStatus("saved");
          setLastSavedAt(new Date());
          // Reset to idle after 3 s
          setTimeout(() => setSaveStatus("idle"), 3000);
        } else {
          setSaveStatus("error");
          setTimeout(() => setSaveStatus("idle"), 4000);
        }
      } catch {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 4000);
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [activeProject]);

  async function createProject() {
    const name = newName.trim() || "Untitled Project";
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/editor/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.id) {
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to create project.");
      }
      const created: EditorProject = { id: data.id, name: data.name || name };
      setProjects((prev) => [created, ...prev]);
      setLastOpenedProjectId(created.id);
      try {
        localStorage.setItem(LAST_OPENED_PROJECT_KEY, created.id);
        sessionStorage.setItem(RELOAD_RESUME_PROJECT_KEY, created.id);
      } catch {}
      setActiveProject(created);
      router.replace(`/video-editor?projectId=${encodeURIComponent(created.id)}`);
      setNewName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create project.");
    } finally {
      setCreating(false);
    }
  }

  function openProject(project: EditorProject) {
    setLastOpenedProjectId(project.id);
    try {
      localStorage.setItem(LAST_OPENED_PROJECT_KEY, project.id);
      sessionStorage.setItem(RELOAD_RESUME_PROJECT_KEY, project.id);
    } catch {}
    setActiveProject(project);
    router.replace(`/video-editor?projectId=${encodeURIComponent(project.id)}`);
  }

  function extractProjectPreview(project: EditorProject) {
    const root = project as Record<string, unknown>;
    const topLevel = pickFirstPreviewUrl([
      root.thumbnail,
      root.poster,
      root.preview,
      root.image,
      root.url,
      root.src,
      root.cover,
    ]);
    if (topLevel) return topLevel;

    const rootClips = Array.isArray(root.clips) ? (root.clips as unknown[]) : [];
    if (rootClips.length) {
      const fromClips = extractFromClipArray(rootClips);
      if (fromClips) return fromClips;
    }

    const buckets = Object.values(project.tracks || {});
    for (const bucket of buckets) {
      if (!Array.isArray(bucket)) continue;
      const fromBucket = extractFromClipArray(bucket);
      if (fromBucket) return fromBucket;
    }
    return "";
  }

  if (!activeProject) {
    return (
      <div className="relative h-[calc(100vh-64px)] overflow-auto bg-slate-950 text-slate-100">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(1200px 520px at 18% 22%, rgba(56,189,248,0.08), transparent 58%), radial-gradient(900px 460px at 42% 78%, rgba(59,130,246,0.06), transparent 62%), linear-gradient(180deg, rgba(2,6,23,0.14) 0%, rgba(2,6,23,0.42) 60%, rgba(2,6,23,0.58) 100%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 right-0 top-0 w-[58vw] min-w-[540px] max-w-[980px]"
          style={{
            backgroundImage: "url('/art.png')",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right center",
            backgroundSize: "cover",
            opacity: 0.22,
            filter: "saturate(0.86) brightness(0.9)",
            WebkitMaskImage:
              "linear-gradient(to left, rgba(0,0,0,1) 42%, rgba(0,0,0,0) 95%), linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 14%, rgba(0,0,0,1) 84%, rgba(0,0,0,0) 100%)",
            maskImage:
              "linear-gradient(to left, rgba(0,0,0,1) 42%, rgba(0,0,0,0) 95%), linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 14%, rgba(0,0,0,1) 84%, rgba(0,0,0,0) 100%)",
            WebkitMaskComposite: "source-in",
            maskComposite: "intersect",
          }}
        />
        <div className="relative z-10 w-full px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="rounded-3xl border border-slate-800/90 bg-slate-950/70 p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-stretch">
              <div className="lg:col-span-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300/80">Cinema Workspace</p>
                <h1 className="mt-3 max-w-[20ch] text-2xl font-extrabold leading-[1.12] tracking-[-0.015em] text-white sm:text-3xl lg:text-[2.6rem]">
                  <span className="block">Turn Ideas Into</span>
                  <span className="mt-2 block bg-gradient-to-r from-white via-cyan-100 to-sky-300 bg-clip-text text-transparent">
                    Cinematic Stories
                  </span>
                </h1>
                <p className="mt-4 max-w-[58ch] text-[15px] leading-8 text-slate-300 sm:text-base">
                  Build faster with smart tools, clean timelines, and a production-ready workflow.
                </p>

                {/* ── How Render Works — collapsed by default, triangle to expand ── */}
                <div className="relative mt-6">
                  <button
                    type="button"
                    onClick={() => setWarnOpen((v) => !v)}
                    title="How rendering works"
                    className="flex items-center gap-1.5 text-amber-400/60 transition hover:text-amber-300"
                  >
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                      <path d="M8 1.5L1 14.5h14L8 1.5zm0 2.1 5.6 9.9H2.4L8 3.6zM7.25 7v3.5h1.5V7h-1.5zm0 4.5v1.5h1.5v-1.5h-1.5z"/>
                    </svg>
                    <span className="text-[11px] text-slate-500">How rendering works</span>
                  </button>

                  {warnOpen && (
                    <div className="absolute left-0 top-8 z-20 w-[min(560px,90vw)] rounded-2xl border border-slate-700/80 bg-slate-900 p-4 shadow-2xl">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-400/80">How Rendering Works</p>
                        <button type="button" onClick={() => setWarnOpen(false)} className="text-slate-500 hover:text-slate-300 text-xs">✕</button>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {[
                          { icon: "🖥️", title: "Runs on Your Device", desc: "Your GPU & CPU do all the work — no server needed. The faster your machine, the faster the render." },
                          { icon: "⚡", title: "Hardware Accelerated", desc: "Uses WebCodecs API with H.264 hardware encoding (same tech as DaVinci Resolve & Premiere)." },
                          { icon: "📦", title: "Exports MP4", desc: "Applies all your edits — position, scale, crop, opacity, blend mode — and downloads an MP4 file." },
                        ].map((item) => (
                          <div key={item.title} className="rounded-xl border border-slate-700/60 bg-slate-800/50 p-3">
                            <div className="mb-1 text-xl">{item.icon}</div>
                            <p className="text-[12px] font-semibold text-slate-100">{item.title}</p>
                            <p className="mt-1 text-[11px] leading-[1.6] text-slate-400">{item.desc}</p>
                          </div>
                        ))}
                      </div>
                      <p className="mt-3 text-[11px] leading-[1.7] text-amber-300/70">
                        <strong className="text-amber-300">Note:</strong> Keep the browser tab open during export. Only clips with public URLs are included; locally-uploaded files (blob:) are skipped.
                      </p>
                    </div>
                  )}
                </div>

                <p className="mt-6 text-sm font-semibold text-slate-100 sm:text-base">Start a new project</p>
                <p className="mt-2 text-sm text-slate-400">Name your project and jump right into editing.</p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !creating) void createProject();
                    }}
                    placeholder="Project name"
                    className="h-10 flex-1 rounded-full border border-slate-700 bg-black/40 px-4 text-sm text-slate-100 outline-none placeholder:text-slate-400 focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => void createProject()}
                    disabled={creating}
                    className="h-10 rounded-full border border-slate-200/20 bg-white px-5 text-sm font-medium text-slate-900 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {creating ? "Creating..." : "New project"}
                  </button>
                </div>
                {error ? <p className="mt-3 text-xs text-rose-400">{error}</p> : null}
              </div>

              <div className="lg:col-span-6">
                <div
                  className="h-full min-h-[180px] rounded-2xl border border-slate-800 bg-slate-900"
                  style={{
                    backgroundImage:
                      "linear-gradient(180deg, rgba(2,6,23,0.22) 0%, rgba(2,6,23,0.42) 100%), url('/art.png')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-white">My Project</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects..."
                className="h-9 w-full rounded-full border border-slate-800 bg-transparent px-4 text-xs text-slate-100 outline-none placeholder:text-slate-500 sm:w-64"
              />
              <button
                type="button"
                onClick={() => void loadProjects()}
                disabled={loading}
                className="h-9 rounded-full border border-slate-700 px-4 text-xs text-slate-200 hover:border-sky-500 disabled:opacity-60"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="mt-4">
            {loading ? <p className="text-sm text-slate-400">Loading projects...</p> : null}

            {!loading && projects.length === 0 ? (
              <p className="text-sm text-slate-400">No projects yet. Create your first project above.</p>
            ) : null}

            {!loading && projects.length > 0 && filteredProjects.length === 0 ? (
              <p className="text-sm text-slate-400">No results found for your search.</p>
            ) : null}

            {!loading && filteredProjects.length > 0 ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,320px))] gap-4">
                {filteredProjects.map((project) => (
                  (() => {
                    const previewUrl = projectPreviewById[project.id] || "";
                    return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => openProject(project)}
                    className="group max-w-[320px] text-left"
                  >
                    <div
                      className="aspect-[4/3] rounded-lg border border-slate-800 p-3 transition hover:border-sky-600"
                      style={{
                        backgroundImage: previewUrl
                          ? `linear-gradient(180deg, rgba(2,6,23,0.16) 0%, rgba(2,6,23,0.58) 100%), url('${previewUrl}')`
                          : "radial-gradient(circle_at_30%_45%,rgba(56,189,248,0.24),transparent_36%),radial-gradient(circle_at_65%_58%,rgba(99,102,241,0.22),transparent_32%),#070b11",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      <div className="flex h-full items-end justify-between">
                        <span className="max-w-[80%] truncate rounded-md border border-slate-600 bg-black/30 px-2 py-1 text-[10px] text-slate-300">
                          Project: {project.name || "Untitled Project"}
                        </span>
                        {lastOpenedProjectId === project.id ? (
                          <span className="rounded-md border border-emerald-500/40 bg-emerald-900/30 px-2 py-1 text-[10px] text-emerald-300">
                            Last Opened
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300 opacity-0 transition group-hover:opacity-100">Open</span>
                        )}
                      </div>
                    </div>
                  </button>
                    );
                  })()
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)]">
      <div className="flex h-12 items-center justify-between border-b border-slate-800 bg-slate-950 px-4 text-slate-100">
        <div>
          <p className="text-sm font-semibold truncate max-w-[60vw]">{title}</p>
          <p className="text-[11px] text-slate-400">Project ID: {activeProject.id}</p>
        </div>
        {/* Auto-save indicator */}
        <div className="flex items-center gap-2">
          {saveStatus === "saving" && (
            <span className="text-[11px] text-sky-400 animate-pulse">⏳ Saving…</span>
          )}
          {saveStatus === "saved" && (
            <span className="text-[11px] text-emerald-400">✓ Saved</span>
          )}
          {saveStatus === "error" && (
            <span className="text-[11px] text-rose-400">⚠ Save failed</span>
          )}
          {saveStatus === "idle" && lastSavedAt && (
            <span className="text-[11px] text-slate-500">
              Saved {Math.round((Date.now() - lastSavedAt.getTime()) / 60000) < 1
                ? "just now"
                : `${Math.round((Date.now() - lastSavedAt.getTime()) / 60000)}m ago`}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setActiveProject(null);
            try {
              sessionStorage.removeItem(RELOAD_RESUME_PROJECT_KEY);
            } catch {}
            router.replace("/video-editor");
          }}
          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs hover:border-sky-500"
        >
          All Projects
        </button>
      </div>
      <iframe
        src={`/stude/studio-shell.html?projectId=${encodeURIComponent(activeProject.id)}`}
        className="w-full border-0"
        style={{ height: "calc(100vh - 64px - 48px)" }}
        title="Cinema Workspace"
      />
    </div>
  );
}

