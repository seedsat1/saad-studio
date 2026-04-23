"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type EditorProject = {
  id: string;
  name?: string;
  createdAt?: string;
};

export default function VideoEditorPage() {
  const searchParams = useSearchParams();
  const forcedProjectId = (searchParams.get("projectId") || "").trim();

  const [projects, setProjects] = useState<EditorProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [query, setQuery] = useState("");
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
      if (forcedProjectId) {
        const hit = list.find((p) => p.id === forcedProjectId);
        if (hit) setActiveProject(hit);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load projects.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      setActiveProject(created);
      setNewName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create project.");
    } finally {
      setCreating(false);
    }
  }

  function openProject(project: EditorProject) {
    setActiveProject(project);
  }

  if (!activeProject) {
    return (
      <div className="h-[calc(100vh-64px)] overflow-auto bg-slate-950 text-slate-100">
        <div className="w-full px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="rounded-3xl border border-slate-800/90 bg-[radial-gradient(circle_at_25%_45%,rgba(56,189,248,0.24),transparent_38%),radial-gradient(circle_at_45%_55%,rgba(16,185,129,0.2),transparent_40%),radial-gradient(circle_at_63%_58%,rgba(99,102,241,0.2),transparent_34%),#10141c] p-6 sm:p-8">
            <h1 className="max-w-6xl text-3xl font-extrabold leading-[1.08] tracking-[-0.02em] text-white sm:text-4xl lg:text-5xl">
              Turn your ideas into cinematic videos
              <span className="block text-slate-100">with smart tools and a fast workflow</span>
            </h1>
            <p className="mt-4 text-sm font-medium text-slate-200 sm:text-base">Start from scratch</p>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">Create a new space and start collaborating</p>

            <div className="mt-6 flex flex-col gap-3 sm:max-w-xl sm:flex-row">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !creating) void createProject();
                }}
                placeholder="Space name"
                className="h-10 flex-1 rounded-full border border-slate-700 bg-black/40 px-4 text-sm text-slate-100 outline-none placeholder:text-slate-400 focus:border-sky-500"
              />
              <button
                type="button"
                onClick={() => void createProject()}
                disabled={creating}
                className="h-10 rounded-full border border-slate-200/20 bg-white px-5 text-sm font-medium text-slate-900 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? "Creating..." : "New space"}
              </button>
            </div>
            {error ? <p className="mt-3 text-xs text-rose-400">{error}</p> : null}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-white">My spaces</span>
              <span className="rounded-md border border-slate-800 px-3 py-1.5 text-slate-400">Shared</span>
              <span className="rounded-md border border-slate-800 px-3 py-1.5 text-slate-400">Templates</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search spaces..."
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
            {loading ? <p className="text-sm text-slate-400">Loading spaces...</p> : null}

            {!loading && projects.length === 0 ? (
              <p className="text-sm text-slate-400">No spaces yet. Create your first space above.</p>
            ) : null}

            {!loading && projects.length > 0 && filteredProjects.length === 0 ? (
              <p className="text-sm text-slate-400">No results found for your search.</p>
            ) : null}

            {!loading && filteredProjects.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {filteredProjects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => openProject(project)}
                    className="group text-left"
                  >
                    <div className="h-44 rounded-lg border border-slate-800 bg-[radial-gradient(circle_at_30%_45%,rgba(56,189,248,0.24),transparent_36%),radial-gradient(circle_at_65%_58%,rgba(99,102,241,0.22),transparent_32%),#070b11] p-3 transition hover:border-sky-600">
                      <div className="flex h-full items-end justify-between">
                        <span className="rounded-md border border-slate-600 bg-black/30 px-2 py-1 text-[10px] text-slate-300">Space</span>
                        <span className="text-xs text-slate-400 opacity-0 transition group-hover:opacity-100">Open</span>
                      </div>
                    </div>
                    <p className="mt-2 truncate text-sm font-medium text-slate-100">{project.name || "Untitled Space"}</p>
                    <p className="text-[11px] text-slate-500">{project.id.slice(0, 12)}...</p>
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
          onClick={() => setActiveProject(null)}
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

