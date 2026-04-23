"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const LAST_OPENED_PROJECT_KEY = "videoEditor.lastOpenedProjectId";

type EditorProject = {
  id: string;
  name?: string;
  createdAt?: string;
  tracks?: Record<string, unknown[]>;
};

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

  const title = useMemo(() => activeProject?.name || "Cinema Workspace", [activeProject]);
  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => (p.name || "untitled").toLowerCase().includes(q));
  }, [projects, query]);

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
      const savedProjectId =
        typeof window !== "undefined" ? localStorage.getItem(LAST_OPENED_PROJECT_KEY) || "" : "";
      const targetProjectId = forcedProjectId || savedProjectId;
      if (targetProjectId) {
        const hit = list.find((p) => p.id === targetProjectId);
        if (hit) setActiveProject(hit);
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
    } catch {}
    setActiveProject(project);
    router.replace(`/video-editor?projectId=${encodeURIComponent(project.id)}`);
  }

  function extractProjectPreview(project: EditorProject) {
    const buckets = Object.values(project.tracks || {});
    for (const bucket of buckets) {
      if (!Array.isArray(bucket)) continue;
      for (const item of bucket) {
        if (!item || typeof item !== "object") continue;
        const clip = item as Record<string, unknown>;
        const candidates = [clip.thumbnail, clip.poster, clip.preview, clip.image, clip.url, clip.src];
        for (const c of candidates) {
          if (typeof c === "string" && c.trim().length > 0) return c;
        }
      }
    }
    return "";
  }

  if (!activeProject) {
    return (
      <div className="h-[calc(100vh-64px)] overflow-auto bg-slate-950 text-slate-100">
        <div className="w-full px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="rounded-3xl border border-slate-800/90 bg-slate-950/70 p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-stretch">
              <div className="lg:col-span-6">
                <h1 className="text-3xl font-extrabold leading-[1.1] tracking-[-0.02em] text-white sm:text-4xl lg:text-4xl">
                  <span className="block">Turn your ideas into cinematic videos</span>
                  <span className="mt-1 block font-normal text-slate-200">with smart tools and a fast workflow</span>
                </h1>
                <p className="mt-4 text-sm font-medium text-slate-200 sm:text-base">Start a new project</p>
                <p className="mt-1 text-xs text-slate-400 sm:text-sm">Create a new project and continue editing instantly</p>

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
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => openProject(project)}
                    className="group max-w-[320px] text-left"
                  >
                    <div
                      className="aspect-[4/3] rounded-lg border border-slate-800 p-3 transition hover:border-sky-600"
                      style={{
                        backgroundImage: extractProjectPreview(project)
                          ? `linear-gradient(180deg, rgba(2,6,23,0.16) 0%, rgba(2,6,23,0.58) 100%), url('${extractProjectPreview(project)}')`
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
        <button
          type="button"
          onClick={() => {
            setActiveProject(null);
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

