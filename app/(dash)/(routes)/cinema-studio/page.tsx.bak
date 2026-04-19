"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Clapperboard,
  CopyPlus,
  GripVertical,
  History,
  Layers,
  Loader2,
  LocateFixed,
  Palette,
  Plus,
  Save,
  Settings2,
  Trash2,
  UserCircle2,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CinemaTab = "concept" | "characters" | "locations" | "shots" | "style" | "audio" | "assets" | "history";
type StageMode = "builder" | "review";

type CinemaCharacter = { id: string; name: string; description: string; referenceUrl: string | null };
type CinemaLocation = { id: string; name: string; description: string; referenceUrl: string | null };

type CinemaShot = {
  id: string;
  orderIndex: number;
  title: string;
  prompt: string;
  negativePrompt: string;
  duration: number;
  ratio: string;
  characterIds: string[];
  locationId: string | null;
  cameraPreset: string;
  cameraSpeed: number;
  motionIntensity: number;
  smoothness: number;
  lighting: string;
  lens: string;
  colorGrade: string;
  audioPrompt: string;
  seed: number | null;
  consistencyLock: boolean;
  generationStatus: string;
  outputAssetId: string | null;
};

type CinemaAsset = { id: string; shotId: string | null; type: string; url: string };
type CinemaJob = { id: string; shotId: string; status: string; modelRoute: string; createdAt: string; error: string | null };

type CinemaProject = {
  id: string;
  name: string;
  conceptPrompt: string;
  negativePrompt: string;
  toneGenre: string;
  modelRoute: string;
  aspectRatio: string;
  defaultDuration: number;
  updatedAt?: string;
  shots: CinemaShot[];
  characters: CinemaCharacter[];
  locations: CinemaLocation[];
  assets: CinemaAsset[];
  jobs: CinemaJob[];
};

type DraftShot = {
  title: string;
  prompt: string;
  negativePrompt: string;
  duration: number;
  ratio: string;
  characterIds: string[];
  locationId: string | null;
  cameraPreset: string;
  cameraSpeed: number;
  motionIntensity: number;
  smoothness: number;
  lighting: string;
  lens: string;
  colorGrade: string;
  audioPrompt: string;
  seed: number | null;
  consistencyLock: boolean;
};

const PAGE_KEY = "saad_cinema_last_project";
const TAB_ITEMS: Array<{ id: CinemaTab; label: string; icon: any }> = [
  { id: "concept", label: "Concept", icon: Wand2 },
  { id: "characters", label: "Characters", icon: UserCircle2 },
  { id: "locations", label: "Locations", icon: LocateFixed },
  { id: "shots", label: "Shots", icon: Clapperboard },
  { id: "style", label: "Style", icon: Palette },
  { id: "audio", label: "Audio", icon: Settings2 },
  { id: "assets", label: "Assets", icon: Layers },
  { id: "history", label: "History", icon: History },
];

const CAMERA_PRESETS = ["static", "push in", "pull out", "dolly", "orbit", "crane", "tracking", "close-up", "wide shot"];
const MODEL_OPTIONS = [
  { label: "Kling 3.0 Pro", value: "kwaivgi/kling-v3.0-pro/text-to-video" },
  { label: "Kling 3.0 Motion", value: "kwaivgi/kling-v3.0-pro/motion-control" },
  { label: "Seedance 2.0", value: "bytedance/seedance-v2-t2v" },
  { label: "Sora 2", value: "openai/sora-2/text-to-video" },
  { label: "Hailuo 2.3", value: "minimax/hailuo-2.3/i2v-standard" },
];
const RATIO_OPTIONS = ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"];
const DURATION_OPTIONS = [3, 4, 5, 6, 7, 8, 10, 12, 15, 20];
const jsonHeaders = { "Content-Type": "application/json" };

function getDraftFromShot(shot: CinemaShot | null): DraftShot {
  return {
    title: shot?.title ?? "",
    prompt: shot?.prompt ?? "",
    negativePrompt: shot?.negativePrompt ?? "",
    duration: shot?.duration ?? 5,
    ratio: shot?.ratio ?? "16:9",
    characterIds: shot?.characterIds ?? [],
    locationId: shot?.locationId ?? null,
    cameraPreset: shot?.cameraPreset ?? "static",
    cameraSpeed: shot?.cameraSpeed ?? 50,
    motionIntensity: shot?.motionIntensity ?? 50,
    smoothness: shot?.smoothness ?? 50,
    lighting: shot?.lighting ?? "neutral",
    lens: shot?.lens ?? "35mm",
    colorGrade: shot?.colorGrade ?? "cinematic",
    audioPrompt: shot?.audioPrompt ?? "",
    seed: shot?.seed ?? null,
    consistencyLock: shot?.consistencyLock ?? true,
  };
}

function prettyDate(raw: string) {
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? raw : d.toLocaleString();
}

export default function CinemaStudioPage() {
  const [tab, setTab] = useState<CinemaTab>("concept");
  const [stageMode, setStageMode] = useState<StageMode>("builder");
  const [projects, setProjects] = useState<CinemaProject[]>([]);
  const [project, setProject] = useState<CinemaProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const [draftShot, setDraftShot] = useState<DraftShot>(getDraftFromShot(null));
  const [pollingJobId, setPollingJobId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const pollingRef = useRef<number | null>(null);

  const [newCharacterName, setNewCharacterName] = useState("");
  const [newCharacterDescription, setNewCharacterDescription] = useState("");
  const [newCharacterRef, setNewCharacterRef] = useState("");
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationDescription, setNewLocationDescription] = useState("");
  const [newLocationRef, setNewLocationRef] = useState("");

  const selectedShot = useMemo(() => project?.shots.find((s) => s.id === selectedShotId) ?? null, [project, selectedShotId]);
  const selectedAsset = useMemo(() => {
    if (!project || !selectedShot?.outputAssetId) return null;
    return project.assets.find((a) => a.id === selectedShot.outputAssetId) ?? null;
  }, [project, selectedShot]);

  const generationCost = useMemo(() => {
    const base = Math.max(1, Math.ceil((draftShot.duration || 5) / 2));
    return draftShot.consistencyLock ? base + 1 : base;
  }, [draftShot.duration, draftShot.consistencyLock]);

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/editor/credits", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && typeof data.balance === "number") setBalance(data.balance);
    } catch {}
  }, []);

  const loadProjectById = useCallback(async (projectId: string) => {
    const res = await fetch(`/api/cinema/project/${projectId}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to load project");
    const loaded = data.project as CinemaProject;
    setProject(loaded);
    if (loaded.shots.length) {
      const shot = loaded.shots[0];
      setSelectedShotId(shot.id);
      setDraftShot(getDraftFromShot(shot));
    } else {
      setSelectedShotId(null);
      setDraftShot(getDraftFromShot(null));
    }
    localStorage.setItem(PAGE_KEY, loaded.id);
  }, []);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cinema/project", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load projects");
      const list = (data.projects ?? []) as CinemaProject[];
      setProjects(list);
      const saved = localStorage.getItem(PAGE_KEY);
      const target = (saved && list.find((p) => p.id === saved)) || list[0];
      if (target) {
        await loadProjectById(target.id);
      } else {
        const createRes = await fetch("/api/cinema/project", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ name: "Untitled Cinema Project" }) });
        const createData = await createRes.json();
        if (!createRes.ok) throw new Error(createData?.error || "Failed to create project");
        await loadProjectById(createData.project.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [loadProjectById]);

  useEffect(() => {
    void loadProjects();
    void fetchBalance();
  }, [loadProjects, fetchBalance]);

  useEffect(() => {
    if (selectedShot) setDraftShot(getDraftFromShot(selectedShot));
  }, [selectedShot]);

  const patchProject = useCallback(async (payload: Record<string, unknown>) => {
    if (!project?.id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/cinema/project/${project.id}`, { method: "PATCH", headers: jsonHeaders, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save project failed");
      setProject((prev) => (prev ? { ...prev, ...data.project } : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save project failed");
    } finally {
      setSaving(false);
    }
  }, [project]);

  const patchShot = useCallback(async (shotId: string, payload: Record<string, unknown>, optimistic = true) => {
    if (!project?.id) return;
    if (optimistic) {
      setProject((prev) => {
        if (!prev) return prev;
        return { ...prev, shots: prev.shots.map((s) => (s.id === shotId ? { ...s, ...(payload as Partial<CinemaShot>) } : s)) };
      });
    }
    try {
      const res = await fetch(`/api/cinema/shot/${shotId}`, { method: "PATCH", headers: jsonHeaders, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save shot failed");
      const saved = data.shot as CinemaShot;
      setProject((prev) => prev ? ({ ...prev, shots: prev.shots.map((s) => (s.id === saved.id ? saved : s)).sort((a, b) => a.orderIndex - b.orderIndex) }) : prev);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save shot failed");
      await loadProjectById(project.id);
    }
  }, [project, loadProjectById]);
  useEffect(() => {
    if (!project?.id || !selectedShotId) return;
    const t = window.setTimeout(() => {
      void patchShot(selectedShotId, draftShot, false);
    }, 900);
    return () => window.clearTimeout(t);
  }, [project?.id, selectedShotId, draftShot, patchShot]);

  useEffect(() => {
    if (!project?.id) return;
    const id = window.setInterval(() => {
      void patchProject({
        name: project.name,
        conceptPrompt: project.conceptPrompt,
        negativePrompt: project.negativePrompt,
        toneGenre: project.toneGenre,
        modelRoute: project.modelRoute,
        aspectRatio: project.aspectRatio,
        defaultDuration: project.defaultDuration,
      });
    }, 7000);
    return () => window.clearInterval(id);
  }, [project?.id, project?.name, project?.conceptPrompt, project?.negativePrompt, project?.toneGenre, project?.modelRoute, project?.aspectRatio, project?.defaultDuration, patchProject]);

  const addShot = useCallback(async () => {
    if (!project?.id) return;
    try {
      const res = await fetch("/api/cinema/shot", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ projectId: project.id, title: `Shot ${project.shots.length + 1}`, duration: project.defaultDuration, ratio: project.aspectRatio }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Add shot failed");
      const shot = data.shot as CinemaShot;
      setProject((prev) => prev ? ({ ...prev, shots: [...prev.shots, shot].sort((a, b) => a.orderIndex - b.orderIndex) }) : prev);
      setSelectedShotId(shot.id);
      setDraftShot(getDraftFromShot(shot));
      setNotice("Shot added.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Add shot failed");
    }
  }, [project]);

  const duplicateShot = useCallback(async () => {
    if (!selectedShotId) return;
    try {
      const res = await fetch(`/api/cinema/shot/${selectedShotId}`, { method: "PATCH", headers: jsonHeaders, body: JSON.stringify({ action: "duplicate" }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Duplicate shot failed");
      const shot = data.shot as CinemaShot;
      setProject((prev) => prev ? ({ ...prev, shots: [...prev.shots, shot].sort((a, b) => a.orderIndex - b.orderIndex) }) : prev);
      setSelectedShotId(shot.id);
      setNotice("Shot duplicated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Duplicate shot failed");
    }
  }, [selectedShotId]);

  const deleteShot = useCallback(async () => {
    if (!selectedShotId || !project) return;
    try {
      const res = await fetch(`/api/cinema/shot/${selectedShotId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Delete shot failed");
      const nextShots = project.shots.filter((s) => s.id !== selectedShotId).sort((a, b) => a.orderIndex - b.orderIndex);
      setProject((prev) => prev ? ({ ...prev, shots: nextShots }) : prev);
      const next = nextShots[0] ?? null;
      setSelectedShotId(next?.id ?? null);
      setDraftShot(getDraftFromShot(next));
      setNotice("Shot deleted.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete shot failed");
    }
  }, [selectedShotId, project]);

  const reorderShot = useCallback(async (shotId: string, direction: "up" | "down") => {
    if (!project?.id) return;
    const ordered = [...project.shots].sort((a, b) => a.orderIndex - b.orderIndex);
    const idx = ordered.findIndex((s) => s.id === shotId);
    if (idx < 0) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= ordered.length) return;
    const current = ordered[idx];
    const target = ordered[targetIdx];
    setProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        shots: prev.shots.map((s) => {
          if (s.id === current.id) return { ...s, orderIndex: target.orderIndex };
          if (s.id === target.id) return { ...s, orderIndex: current.orderIndex };
          return s;
        }).sort((a, b) => a.orderIndex - b.orderIndex),
      };
    });
    await Promise.all([
      patchShot(current.id, { orderIndex: target.orderIndex }, false),
      patchShot(target.id, { orderIndex: current.orderIndex }, false),
    ]);
  }, [project, patchShot]);

  const addCharacter = useCallback(async () => {
    if (!project || !newCharacterName.trim()) return;
    try {
      const res = await fetch("/api/cinema/character", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ projectId: project.id, name: newCharacterName.trim(), description: newCharacterDescription, referenceUrl: newCharacterRef.trim() || null }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Add character failed");
      setProject((prev) => prev ? ({ ...prev, characters: [...prev.characters, data.character] }) : prev);
      setNewCharacterName("");
      setNewCharacterDescription("");
      setNewCharacterRef("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Add character failed");
    }
  }, [project, newCharacterName, newCharacterDescription, newCharacterRef]);

  const addLocation = useCallback(async () => {
    if (!project || !newLocationName.trim()) return;
    try {
      const res = await fetch("/api/cinema/location", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ projectId: project.id, name: newLocationName.trim(), description: newLocationDescription, referenceUrl: newLocationRef.trim() || null }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Add location failed");
      setProject((prev) => prev ? ({ ...prev, locations: [...prev.locations, data.location] }) : prev);
      setNewLocationName("");
      setNewLocationDescription("");
      setNewLocationRef("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Add location failed");
    }
  }, [project, newLocationName, newLocationDescription, newLocationRef]);

  const pollJob = useCallback(async (jobId: string) => {
    const res = await fetch(`/api/cinema/job/${jobId}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Poll failed");
    const status = String(data.pollStatus || data.job?.status || "processing").toLowerCase();
    if (status === "done" || status === "failed") {
      setIsGenerating(false);
      setPollingJobId(null);
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      await fetchBalance();
      if (project) await loadProjectById(project.id);
      if (status === "done") setNotice("Shot generated.");
      if (status === "failed") setError(data?.job?.error || "Generation failed");
    }
  }, [project, loadProjectById, fetchBalance]);

  const generateShot = useCallback(async () => {
    if (!project || !selectedShot) return;
    setError(null);
    setNotice(null);
    if (!draftShot.prompt.trim() && !project.conceptPrompt.trim()) {
      setError("Write shot prompt or concept first.");
      return;
    }
    if (balance < generationCost) {
      setError(`Insufficient credits. Required ${generationCost}, current ${balance}.`);
      return;
    }
    setIsGenerating(true);
    await patchShot(selectedShot.id, { ...draftShot, generationStatus: "queued" });
    try {
      const res = await fetch("/api/cinema/generate", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ projectId: project.id, shotId: selectedShot.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Generate failed");
      const jobId = String(data.jobId || "");
      if (!jobId) throw new Error("Missing job id");
      setPollingJobId(jobId);
      if (pollingRef.current) window.clearInterval(pollingRef.current);
      pollingRef.current = window.setInterval(() => { void pollJob(jobId); }, 3500);
      void pollJob(jobId);
    } catch (e) {
      setIsGenerating(false);
      setError(e instanceof Error ? e.message : "Generate failed");
    }
  }, [project, selectedShot, draftShot, balance, generationCost, patchShot, pollJob]);

  useEffect(() => () => {
    if (pollingRef.current) window.clearInterval(pollingRef.current);
  }, []);

  const orderedShots = useMemo(() => (project?.shots ?? []).slice().sort((a, b) => a.orderIndex - b.orderIndex), [project?.shots]);

  const createProject = useCallback(async () => {
    try {
      const res = await fetch("/api/cinema/project", {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          name: `Cinema Project ${new Date().toLocaleTimeString()}`,
          modelRoute: project?.modelRoute,
          aspectRatio: project?.aspectRatio,
          defaultDuration: project?.defaultDuration,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Create project failed");
      await loadProjects();
      await loadProjectById(data.project.id);
      setNotice("Project created.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create project failed");
    }
  }, [project?.modelRoute, project?.aspectRatio, project?.defaultDuration, loadProjects, loadProjectById]);

  const exportShotsJson = useCallback(() => {
    if (!project?.id) return;
    const payload = {
      project: {
        id: project.id,
        name: project.name,
        conceptPrompt: project.conceptPrompt,
        negativePrompt: project.negativePrompt,
        toneGenre: project.toneGenre,
        modelRoute: project.modelRoute,
        aspectRatio: project.aspectRatio,
        defaultDuration: project.defaultDuration,
      },
      shots: orderedShots,
      generatedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/[^a-z0-9-_]/gi, "_") || "cinema-project"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [project, orderedShots]);

  const sendToVideoEditor = useCallback(() => {
    if (!project?.id) return;
    const clips = orderedShots
      .map((s) => {
        const asset = project.assets.find((a) => a.id === s.outputAssetId);
        if (!asset) return null;
        return {
          shotId: s.id,
          title: s.title || `Shot ${s.orderIndex + 1}`,
          url: asset.url,
          duration: s.duration,
          ratio: s.ratio,
          type: asset.type,
        };
      })
      .filter(Boolean);

    localStorage.setItem(
      "saad_video_editor_handoff",
      JSON.stringify({
        source: "cinema-studio",
        projectId: project.id,
        projectName: project.name,
        clips,
        createdAt: new Date().toISOString(),
      }),
    );
    window.location.href = "/video-editor";
  }, [project, orderedShots]);

  const statusBadgeClass = (status: string) => {
    const lower = status.toLowerCase();
    if (lower === "done") return "bg-emerald-500/15 text-emerald-300 border-emerald-400/40";
    if (lower === "failed") return "bg-rose-500/15 text-rose-300 border-rose-400/40";
    if (lower === "processing") return "bg-cyan-500/15 text-cyan-300 border-cyan-400/40";
    return "bg-amber-500/15 text-amber-300 border-amber-400/40";
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-60px)] items-center justify-center bg-[#050d1d] text-cyan-200">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading Cinema Studio...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-[calc(100vh-60px)] items-center justify-center bg-[#050d1d] text-rose-300">
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm">
          {error || "Failed to load project. Please sign in and refresh this page."}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-60px)] bg-[#050d1d] text-slate-100">
      <div className="mx-auto flex h-[calc(100vh-60px)] w-full max-w-[1900px] flex-col gap-3 p-3">
        <div className="rounded-2xl border border-cyan-900/30 bg-[#071429]/90 p-3 shadow-[0_0_40px_rgba(6,182,212,0.08)]">
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-3 rounded-xl border border-cyan-900/30 bg-[#0a1a33] px-3 py-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Project Name</label>
              <input
                value={project.name}
                onChange={(e) => setProject((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                className="mt-1 w-full bg-transparent text-sm font-semibold outline-none"
              />
            </div>
            <div className="col-span-2 rounded-xl border border-cyan-900/30 bg-[#0a1a33] px-3 py-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Model</label>
              <select
                value={project.modelRoute}
                onChange={(e) => setProject((prev) => (prev ? { ...prev, modelRoute: e.target.value } : prev))}
                className="mt-1 w-full bg-transparent text-sm outline-none"
              >
                {MODEL_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value} className="bg-[#0b1730] text-slate-100">
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-1 rounded-xl border border-cyan-900/30 bg-[#0a1a33] px-3 py-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Ratio</label>
              <select
                value={project.aspectRatio}
                onChange={(e) => setProject((prev) => (prev ? { ...prev, aspectRatio: e.target.value } : prev))}
                className="mt-1 w-full bg-transparent text-sm outline-none"
              >
                {RATIO_OPTIONS.map((r) => (
                  <option key={r} value={r} className="bg-[#0b1730] text-slate-100">
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-1 rounded-xl border border-cyan-900/30 bg-[#0a1a33] px-3 py-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Duration</label>
              <select
                value={project.defaultDuration}
                onChange={(e) => setProject((prev) => (prev ? { ...prev, defaultDuration: Number(e.target.value) } : prev))}
                className="mt-1 w-full bg-transparent text-sm outline-none"
              >
                {DURATION_OPTIONS.map((d) => (
                  <option key={d} value={d} className="bg-[#0b1730] text-slate-100">
                    {d}s
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2 rounded-xl border border-cyan-900/30 bg-[#0a1a33] px-3 py-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Auto Save</label>
              <div className="mt-1 flex items-center gap-2 text-sm">
                {saving ? <Loader2 className="h-4 w-4 animate-spin text-cyan-300" /> : <Save className="h-4 w-4 text-emerald-300" />}
                <span className="text-slate-200">{saving ? "Saving..." : "Saved"}</span>
              </div>
            </div>
            <div className="col-span-1 rounded-xl border border-cyan-900/30 bg-[#0a1a33] px-3 py-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Credits</label>
              <div className="mt-1 text-lg font-bold text-cyan-300">{balance}</div>
            </div>
            <div className="col-span-2 flex items-end gap-2">
              <button
                onClick={() => void generateShot()}
                disabled={isGenerating || !selectedShotId}
                className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {isGenerating ? "Generating..." : `Generate (${generationCost} cr)`}
              </button>
              <button onClick={exportShotsJson} className="rounded-xl border border-cyan-700/50 px-3 py-2 text-sm hover:bg-cyan-600/10">
                Export
              </button>
              <button onClick={sendToVideoEditor} className="rounded-xl border border-violet-600/60 px-3 py-2 text-sm hover:bg-violet-600/15">
                To Editor
              </button>
            </div>
          </div>
          {(error || notice) && (
            <div className={cn("mt-2 rounded-lg border px-3 py-2 text-sm", error ? "border-rose-500/40 bg-rose-600/10 text-rose-200" : "border-emerald-500/40 bg-emerald-600/10 text-emerald-200")}>
              {error || notice}
            </div>
          )}
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-12 gap-3">
          <aside className="col-span-2 min-h-0 overflow-hidden rounded-2xl border border-cyan-900/30 bg-[#071429]/90 p-2">
            <div className="mb-2 flex items-center justify-between px-2">
              <h2 className="text-sm font-semibold">Controls</h2>
              <button onClick={() => void createProject()} className="rounded-md border border-cyan-700/50 p-1 hover:bg-cyan-500/10">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-2 space-y-1 px-1">
              {TAB_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm",
                      active ? "bg-cyan-500/15 text-cyan-200 border border-cyan-500/30" : "text-slate-300 hover:bg-cyan-500/10",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
            <div className="h-[calc(100%-230px)] overflow-y-auto px-2 pb-2">
              {tab === "concept" && (
                <div className="space-y-2">
                  <textarea value={project.conceptPrompt} onChange={(e) => setProject((prev) => (prev ? { ...prev, conceptPrompt: e.target.value } : prev))} placeholder="Core concept" className="h-28 w-full rounded-lg border border-cyan-900/30 bg-[#0a1a33] p-2 text-sm outline-none" />
                  <textarea value={project.negativePrompt} onChange={(e) => setProject((prev) => (prev ? { ...prev, negativePrompt: e.target.value } : prev))} placeholder="Negative prompt" className="h-20 w-full rounded-lg border border-cyan-900/30 bg-[#0a1a33] p-2 text-sm outline-none" />
                  <input value={project.toneGenre} onChange={(e) => setProject((prev) => (prev ? { ...prev, toneGenre: e.target.value } : prev))} placeholder="Tone / genre" className="w-full rounded-lg border border-cyan-900/30 bg-[#0a1a33] p-2 text-sm outline-none" />
                </div>
              )}

              {tab === "characters" && (
                <div className="space-y-2">
                  <input value={newCharacterName} onChange={(e) => setNewCharacterName(e.target.value)} placeholder="Character name" className="w-full rounded-lg border border-cyan-900/30 bg-[#0a1a33] p-2 text-sm outline-none" />
                  <textarea value={newCharacterDescription} onChange={(e) => setNewCharacterDescription(e.target.value)} placeholder="Attributes / identity" className="h-20 w-full rounded-lg border border-cyan-900/30 bg-[#0a1a33] p-2 text-sm outline-none" />
                  <input value={newCharacterRef} onChange={(e) => setNewCharacterRef(e.target.value)} placeholder="Reference image URL" className="w-full rounded-lg border border-cyan-900/30 bg-[#0a1a33] p-2 text-sm outline-none" />
                  <button onClick={() => void addCharacter()} className="w-full rounded-lg bg-cyan-600/20 py-2 text-sm text-cyan-200 hover:bg-cyan-600/30">Add Character</button>
                  <div className="space-y-2">
                    {project.characters.map((c) => (
                      <div key={c.id} className="rounded-lg border border-cyan-900/30 bg-[#0a1a33] p-2">
                        <div className="text-sm font-semibold">{c.name}</div>
                        <div className="line-clamp-2 text-xs text-slate-400">{c.description || "No description"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === "locations" && (
                <div className="space-y-2">
                  <input value={newLocationName} onChange={(e) => setNewLocationName(e.target.value)} placeholder="Location name" className="w-full rounded-lg border border-cyan-900/30 bg-[#0a1a33] p-2 text-sm outline-none" />
                  <textarea value={newLocationDescription} onChange={(e) => setNewLocationDescription(e.target.value)} placeholder="Location details" className="h-20 w-full rounded-lg border border-cyan-900/30 bg-[#0a1a33] p-2 text-sm outline-none" />
                  <input value={newLocationRef} onChange={(e) => setNewLocationRef(e.target.value)} placeholder="Reference URL" className="w-full rounded-lg border border-cyan-900/30 bg-[#0a1a33] p-2 text-sm outline-none" />
                  <button onClick={() => void addLocation()} className="w-full rounded-lg bg-cyan-600/20 py-2 text-sm text-cyan-200 hover:bg-cyan-600/30">Add Location</button>
                  <div className="space-y-2">
                    {project.locations.map((l) => (
                      <div key={l.id} className="rounded-lg border border-cyan-900/30 bg-[#0a1a33] p-2">
                        <div className="text-sm font-semibold">{l.name}</div>
                        <div className="line-clamp-2 text-xs text-slate-400">{l.description || "No description"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === "shots" && (
                <div className="space-y-2">
                  <button onClick={() => void addShot()} className="w-full rounded-lg bg-cyan-600/20 py-2 text-sm text-cyan-200 hover:bg-cyan-600/30">+ New Shot</button>
                  <button onClick={() => void duplicateShot()} disabled={!selectedShotId} className="w-full rounded-lg border border-cyan-700/40 py-2 text-sm disabled:opacity-40">Duplicate Selected</button>
                  <button onClick={() => void deleteShot()} disabled={!selectedShotId} className="w-full rounded-lg border border-rose-700/40 py-2 text-sm text-rose-300 disabled:opacity-40">Delete Selected</button>
                </div>
              )}

              {tab === "style" && (
                <div className="space-y-2 text-sm text-slate-300">
                  <p>Shot-level style controls are in the right inspector to keep cinematic direction per shot.</p>
                </div>
              )}

              {tab === "audio" && (
                <div className="space-y-2 text-sm text-slate-300">
                  <p>Use shot audio intent in the inspector. It is included in generation payload.</p>
                </div>
              )}

              {tab === "assets" && (
                <div className="space-y-2">
                  {project.assets.length === 0 ? <p className="text-sm text-slate-400">No assets yet.</p> : project.assets.map((a) => (
                    <div key={a.id} className="rounded-lg border border-cyan-900/30 bg-[#0a1a33] p-2 text-xs">
                      <div className="font-semibold">{a.type}</div>
                      <a href={a.url} target="_blank" rel="noreferrer" className="line-clamp-1 text-cyan-300 hover:underline">{a.url}</a>
                    </div>
                  ))}
                </div>
              )}

              {tab === "history" && (
                <div className="space-y-2">
                  {project.jobs.length === 0 ? <p className="text-sm text-slate-400">No job history yet.</p> : project.jobs.map((j) => (
                    <div key={j.id} className="rounded-lg border border-cyan-900/30 bg-[#0a1a33] p-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className={cn("rounded-full border px-2 py-0.5", statusBadgeClass(j.status))}>{j.status}</span>
                        <span className="text-slate-400">{prettyDate(j.createdAt)}</span>
                      </div>
                      {j.error ? <div className="mt-1 text-rose-300">{j.error}</div> : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>

          <main className="col-span-7 min-h-0 overflow-hidden rounded-2xl border border-cyan-900/30 bg-[#071429]/90">
            <div className="flex items-center justify-between border-b border-cyan-900/30 px-4 py-2">
              <div className="flex items-center gap-2">
                <button onClick={() => setStageMode("builder")} className={cn("rounded-lg px-3 py-1 text-sm", stageMode === "builder" ? "bg-cyan-600/20 text-cyan-200" : "text-slate-400")}>Frame Builder</button>
                <button onClick={() => setStageMode("review")} className={cn("rounded-lg px-3 py-1 text-sm", stageMode === "review" ? "bg-cyan-600/20 text-cyan-200" : "text-slate-400")}>Output Review</button>
              </div>
              {selectedShot ? <span className={cn("rounded-full border px-2 py-1 text-xs", statusBadgeClass(selectedShot.generationStatus))}>{selectedShot.generationStatus || "idle"}</span> : null}
            </div>

            <div className="h-[calc(100%-48px)] overflow-auto p-4">
              {stageMode === "builder" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-cyan-900/30 bg-[#0a1a33] p-4">
                    <h3 className="mb-2 text-sm font-semibold text-cyan-200">Composition Preview</h3>
                    <div className="aspect-video rounded-xl border border-dashed border-cyan-700/40 bg-[#061225] p-3">
                      <div className="text-xs text-slate-400">Active shot: {selectedShot?.title || "No shot selected"}</div>
                      <div className="mt-3 text-sm text-slate-300">{draftShot.prompt || project.conceptPrompt || "Write concept and prompt to build frame."}</div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-cyan-900/30 bg-[#0a1a33] p-4">
                    <h3 className="mb-2 text-sm font-semibold text-cyan-200">Attached Consistency</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Characters</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {draftShot.characterIds.length === 0 ? <span className="text-slate-400">None</span> : draftShot.characterIds.map((id) => {
                            const c = project.characters.find((x) => x.id === id);
                            return <span key={id} className="rounded-full border border-cyan-700/40 px-2 py-0.5 text-xs">{c?.name || id}</span>;
                          })}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Location</div>
                        <div className="mt-1 text-slate-300">{project.locations.find((l) => l.id === draftShot.locationId)?.name || "None"}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {stageMode === "review" && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-cyan-900/30 bg-[#0a1a33] p-3">
                    {selectedAsset ? (
                      selectedAsset.type === "video" ? (
                        <video src={selectedAsset.url} controls className="aspect-video w-full rounded-xl border border-cyan-700/30 bg-black" />
                      ) : (
                        <div className="relative max-h-[520px] w-full overflow-hidden rounded-xl border border-cyan-700/30"><Image src={selectedAsset.url} alt="Generated output" width={1920} height={1080} className="max-h-[520px] w-full object-contain" /></div>
                      )
                    ) : (
                      <div className="flex h-[380px] items-center justify-center rounded-xl border border-dashed border-cyan-700/40 text-slate-400">
                        No output yet. Generate this shot.
                      </div>
                    )}
                  </div>
                  <div className="rounded-xl border border-cyan-900/30 bg-[#0a1a33] p-3 text-xs text-slate-300">
                    <div>Model: {project.modelRoute}</div>
                    <div>Shot: {selectedShot?.title || "-"}</div>
                    <div>Duration: {draftShot.duration}s</div>
                    <div>Ratio: {draftShot.ratio}</div>
                    <div>Camera: {draftShot.cameraPreset}</div>
                  </div>
                </div>
              )}
            </div>
          </main>

          <aside className="col-span-3 min-h-0 overflow-hidden rounded-2xl border border-cyan-900/30 bg-[#071429]/90 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Shot Inspector</h2>
              {selectedShot ? <span className="text-xs text-slate-400">#{selectedShot.orderIndex + 1}</span> : null}
            </div>

            {!selectedShot ? (
              <div className="rounded-xl border border-dashed border-cyan-700/30 p-4 text-sm text-slate-400">Select or create a shot.</div>
            ) : (
              <div className="h-[calc(100%-28px)] overflow-y-auto pr-1">
                <div className="space-y-2">
                  <input value={draftShot.title} onChange={(e) => setDraftShot((p) => ({ ...p, title: e.target.value }))} placeholder="Shot title" className="w-full rounded-lg border border-cyan-900/30 bg-[#0a1a33] p-2 text-sm outline-none" />
                  <textarea value={draftShot.prompt} onChange={(e) => setDraftShot((p) => ({ ...p, prompt: e.target.value }))} placeholder="Shot prompt" className="h-24 w-full rounded-lg border border-cyan-900/30 bg-[#0a1a33] p-2 text-sm outline-none" />
                  <textarea value={draftShot.negativePrompt} onChange={(e) => setDraftShot((p) => ({ ...p, negativePrompt: e.target.value }))} placeholder="Negative prompt" className="h-20 w-full rounded-lg border border-cyan-900/30 bg-[#0a1a33] p-2 text-sm outline-none" />

                  <div className="grid grid-cols-2 gap-2">
                    <select value={draftShot.duration} onChange={(e) => setDraftShot((p) => ({ ...p, duration: Number(e.target.value) }))} className="rounded-lg border border-cyan-900/30 bg-[#0a1a33] p-2 text-sm outline-none">
                      {DURATION_OPTIONS.map((d) => <option key={d} value={d} className="bg-[#0b1730] text-slate-100">{d}s</option>)}
                    </select>
                    <select value={draftShot.ratio} onChange={(e) => setDraftShot((p) => ({ ...p, ratio: e.target.value }))} className="rounded-lg border border-cyan-900/30 bg-[#0a1a33] p-2 text-sm outline-none">
                      {RATIO_OPTIONS.map((r) => <option key={r} value={r} className="bg-[#0b1730] text-slate-100">{r}</option>)}
                    </select>
                  </div>

                  <select value={draftShot.cameraPreset} onChange={(e) => setDraftShot((p) => ({ ...p, cameraPreset: e.target.value }))} className="w-full rounded-lg border border-cyan-900/30 bg-[#0a1a33] p-2 text-sm outline-none">
                    {CAMERA_PRESETS.map((c) => <option key={c} value={c} className="bg-[#0b1730] text-slate-100">{c}</option>)}
                  </select>

                  <div className="rounded-lg border border-cyan-900/30 bg-[#0a1a33] p-2">
                    <label className="text-xs text-slate-400">Camera speed: {draftShot.cameraSpeed}</label>
                    <input type="range" min={1} max={100} value={draftShot.cameraSpeed} onChange={(e) => setDraftShot((p) => ({ ...p, cameraSpeed: Number(e.target.value) }))} className="w-full" />
                  </div>
                  <div className="rounded-lg border border-cyan-900/30 bg-[#0a1a33] p-2">
                    <label className="text-xs text-slate-400">Motion intensity: {draftShot.motionIntensity}</label>
                    <input type="range" min={1} max={100} value={draftShot.motionIntensity} onChange={(e) => setDraftShot((p) => ({ ...p, motionIntensity: Number(e.target.value) }))} className="w-full" />
                  </div>
                  <div className="rounded-lg border border-cyan-900/30 bg-[#0a1a33] p-2">
                    <label className="text-xs text-slate-400">Smoothness: {draftShot.smoothness}</label>
                    <input type="range" min={1} max={100} value={draftShot.smoothness} onChange={(e) => setDraftShot((p) => ({ ...p, smoothness: Number(e.target.value) }))} className="w-full" />
                  </div>

                  <input value={draftShot.lighting} onChange={(e) => setDraftShot((p) => ({ ...p, lighting: e.target.value }))} placeholder="Lighting style" className="w-full rounded-lg border border-cyan-900/30 bg-[#0a1a33] p-2 text-sm outline-none" />
                  <input value={draftShot.lens} onChange={(e) => setDraftShot((p) => ({ ...p, lens: e.target.value }))} placeholder="Lens style" className="w-full rounded-lg border border-cyan-900/30 bg-[#0a1a33] p-2 text-sm outline-none" />
                  <input value={draftShot.colorGrade} onChange={(e) => setDraftShot((p) => ({ ...p, colorGrade: e.target.value }))} placeholder="Color grade" className="w-full rounded-lg border border-cyan-900/30 bg-[#0a1a33] p-2 text-sm outline-none" />
                  <textarea value={draftShot.audioPrompt} onChange={(e) => setDraftShot((p) => ({ ...p, audioPrompt: e.target.value }))} placeholder="Audio intent" className="h-16 w-full rounded-lg border border-cyan-900/30 bg-[#0a1a33] p-2 text-sm outline-none" />

                  <div className="rounded-lg border border-cyan-900/30 bg-[#0a1a33] p-2">
                    <label className="mb-1 block text-xs text-slate-400">Characters</label>
                    <div className="max-h-28 space-y-1 overflow-y-auto">
                      {project.characters.map((c) => (
                        <label key={c.id} className="flex items-center gap-2 text-sm text-slate-300">
                          <input
                            type="checkbox"
                            checked={draftShot.characterIds.includes(c.id)}
                            onChange={(e) => {
                              setDraftShot((p) => ({
                                ...p,
                                characterIds: e.target.checked ? [...p.characterIds, c.id] : p.characterIds.filter((id) => id !== c.id),
                              }));
                            }}
                          />
                          {c.name}
                        </label>
                      ))}
                    </div>
                  </div>

                  <select value={draftShot.locationId || ""} onChange={(e) => setDraftShot((p) => ({ ...p, locationId: e.target.value || null }))} className="w-full rounded-lg border border-cyan-900/30 bg-[#0a1a33] p-2 text-sm outline-none">
                    <option value="" className="bg-[#0b1730] text-slate-100">No location</option>
                    {project.locations.map((l) => <option key={l.id} value={l.id} className="bg-[#0b1730] text-slate-100">{l.name}</option>)}
                  </select>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={draftShot.seed ?? ""}
                      onChange={(e) => setDraftShot((p) => ({ ...p, seed: e.target.value ? Number(e.target.value) : null }))}
                      placeholder="Seed"
                      className="rounded-lg border border-cyan-900/30 bg-[#0a1a33] p-2 text-sm outline-none"
                    />
                    <label className="flex items-center gap-2 rounded-lg border border-cyan-900/30 bg-[#0a1a33] px-2 text-sm">
                      <input type="checkbox" checked={draftShot.consistencyLock} onChange={(e) => setDraftShot((p) => ({ ...p, consistencyLock: e.target.checked }))} />
                      Consistency lock
                    </label>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>

        <div className="rounded-2xl border border-cyan-900/30 bg-[#071429]/90 p-2">
          <div className="mb-2 flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold">Sequence Strip</h3>
            <div className="text-xs text-slate-400">Drag-style quick ordering by arrows</div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {orderedShots.map((s) => {
              const active = s.id === selectedShotId;
              const out = project.assets.find((a) => a.id === s.outputAssetId);
              return (
                <div
                  key={s.id}
                  className={cn(
                    "min-w-[230px] rounded-xl border p-2",
                    active ? "border-cyan-400/60 bg-cyan-500/10" : "border-cyan-900/30 bg-[#0a1a33]",
                  )}
                >
                  <button onClick={() => setSelectedShotId(s.id)} className="w-full text-left">
                    <div className="mb-1 flex items-center justify-between">
                      <div className="line-clamp-1 text-sm font-semibold">{s.title || `Shot ${s.orderIndex + 1}`}</div>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", statusBadgeClass(s.generationStatus))}>{s.generationStatus || "idle"}</span>
                    </div>
                    <div className="text-xs text-slate-400">{s.duration}s • {s.ratio} • {s.cameraPreset}</div>
                  </button>
                  <div className="mt-2 flex items-center gap-2">
                    <button onClick={() => void reorderShot(s.id, "up")} className="rounded-md border border-cyan-800/50 p-1 text-xs">?</button>
                    <button onClick={() => void reorderShot(s.id, "down")} className="rounded-md border border-cyan-800/50 p-1 text-xs">?</button>
                    <GripVertical className="h-4 w-4 text-slate-500" />
                    <button onClick={() => setSelectedShotId(s.id)} className="rounded-md border border-cyan-800/50 p-1">
                      <Clapperboard className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => void patchShot(s.id, { action: "duplicate" }, false)} className="rounded-md border border-cyan-800/50 p-1">
                      <CopyPlus className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => void fetch(`/api/cinema/shot/${s.id}`, { method: "DELETE" }).then(() => loadProjectById(project.id))} className="rounded-md border border-rose-700/50 p-1 text-rose-300">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {out ? <a href={out.url} target="_blank" rel="noreferrer" className="mt-2 block line-clamp-1 text-xs text-cyan-300 hover:underline">Output ready</a> : <div className="mt-2 text-xs text-slate-500">No output yet</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}



