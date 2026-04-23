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
  const [activeProject, setActiveProject] = useState<EditorProject | null>(null);
  const [error, setError] = useState("");

  const title = useMemo(() => activeProject?.name || "Cinema Workspace", [activeProject]);

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
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
              حول أفكارك إلى فيديوهات سينمائية بأدوات ذكية وسير عمل سريع
            </h1>
            <p className="mt-3 text-sm text-slate-300 sm:text-base">
              ابدأ بإنشاء مشروع جديد أو افتح أحد مشاريعك المحفوظة للمتابعة مباشرة.
            </p>

            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <label className="mb-2 block text-sm font-medium text-slate-200">Project name</label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !creating) void createProject();
                  }}
                  placeholder="Example: Ramadan Campaign"
                  className="h-11 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none ring-0 placeholder:text-slate-500 focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={() => void createProject()}
                  disabled={creating}
                  className="h-11 rounded-lg bg-sky-600 px-5 text-sm font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creating ? "Creating..." : "Create Project"}
                </button>
              </div>
              {error ? <p className="mt-2 text-xs text-rose-400">{error}</p> : null}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Saved Projects</h2>
              <button
                type="button"
                onClick={() => void loadProjects()}
                disabled={loading}
                className="text-xs text-slate-300 underline underline-offset-4 hover:text-white disabled:opacity-60"
              >
                Refresh
              </button>
            </div>

            {loading ? <p className="text-sm text-slate-400">Loading projects...</p> : null}

            {!loading && projects.length === 0 ? (
              <p className="text-sm text-slate-400">No projects yet. Create your first project above.</p>
            ) : null}

            {!loading && projects.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => openProject(project)}
                    className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-left hover:border-sky-600"
                  >
                    <p className="truncate text-sm font-semibold text-slate-100">{project.name || "Untitled Project"}</p>
                    <p className="mt-1 text-xs text-slate-400">ID: {project.id.slice(0, 10)}...</p>
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

