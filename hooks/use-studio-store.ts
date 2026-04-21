"use client";

import { create } from "zustand";
import type {
  Scene,
  SceneStatus,
  CameraMoveId,
  LogEntry,
} from "@/lib/scene-studio-types";
import { CAMERA_MOVES } from "@/lib/scene-studio-constants";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function now(): string {
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
}

function createEmptyScene(): Scene {
  return {
    id: uid(),
    image: null,
    imageFile: null,
    prompt: "",
    cameraMove: "static",
    duration: 4,
    status: "idle",
    taskId: null,
    outputUrl: null,
    outputType: null,
    error: null,
    fileName: null,
  };
}

interface StudioState {
  scenes: Scene[];
  activeIdx: number;
  apiKey: string;
  workflowId: string;
  imageNodeId: string;
  textNodeId: string;
  logs: LogEntry[];
  generating: boolean;

  addScene: () => void;
  removeScene: (idx: number) => void;
  duplicateScene: (idx: number) => void;
  updateScene: (idx: number, patch: Partial<Scene>) => void;
  setActiveIdx: (idx: number) => void;
  setApiKey: (key: string) => void;
  setWorkflowId: (id: string) => void;
  setImageNodeId: (id: string) => void;
  setTextNodeId: (id: string) => void;
  addLog: (msg: string, type: LogEntry["type"]) => void;
  generateScene: (idx: number) => Promise<void>;
  generateAll: () => Promise<void>;
}

export const useStudioStore = create<StudioState>((set, get) => ({
  scenes: [createEmptyScene()],
  activeIdx: 0,
  apiKey: typeof window !== "undefined"
    ? localStorage.getItem("nss_apiKey") ?? process.env.NEXT_PUBLIC_RUNNINGHUB_API_KEY ?? ""
    : "",
  workflowId: typeof window !== "undefined"
    ? localStorage.getItem("nss_workflowId") ?? process.env.NEXT_PUBLIC_RUNNINGHUB_WORKFLOW_ID ?? ""
    : "",
  imageNodeId: typeof window !== "undefined"
    ? localStorage.getItem("nss_imageNodeId") ?? "image_input"
    : "image_input",
  textNodeId: typeof window !== "undefined"
    ? localStorage.getItem("nss_textNodeId") ?? "text_input"
    : "text_input",
  logs: [],
  generating: false,

  addScene: () =>
    set((s) => {
      const scenes = [...s.scenes, createEmptyScene()];
      return { scenes, activeIdx: scenes.length - 1 };
    }),

  removeScene: (idx) =>
    set((s) => {
      if (s.scenes.length <= 1) return s;
      const scenes = s.scenes.filter((_, i) => i !== idx);
      const activeIdx = Math.min(s.activeIdx, scenes.length - 1);
      return { scenes, activeIdx };
    }),

  duplicateScene: (idx) =>
    set((s) => {
      const src = s.scenes[idx];
      if (!src) return s;
      const dup: Scene = {
        ...src,
        id: uid(),
        status: "idle",
        taskId: null,
        outputUrl: null,
        outputType: null,
        error: null,
        fileName: null,
      };
      const scenes = [...s.scenes];
      scenes.splice(idx + 1, 0, dup);
      return { scenes, activeIdx: idx + 1 };
    }),

  updateScene: (idx, patch) =>
    set((s) => {
      const scenes = [...s.scenes];
      const current = scenes[idx];
      if (!current) return s;
      scenes[idx] = { ...current, ...patch };
      return { scenes };
    }),

  setActiveIdx: (idx) => set({ activeIdx: idx }),

  setApiKey: (key) => {
    if (typeof window !== "undefined") localStorage.setItem("nss_apiKey", key);
    set({ apiKey: key });
  },
  setWorkflowId: (id) => {
    if (typeof window !== "undefined") localStorage.setItem("nss_workflowId", id);
    set({ workflowId: id });
  },
  setImageNodeId: (id) => {
    if (typeof window !== "undefined") localStorage.setItem("nss_imageNodeId", id);
    set({ imageNodeId: id });
  },
  setTextNodeId: (id) => {
    if (typeof window !== "undefined") localStorage.setItem("nss_textNodeId", id);
    set({ textNodeId: id });
  },

  addLog: (msg, type) =>
    set((s) => ({
      logs: [...s.logs, { time: now(), msg, type }],
    })),

  generateScene: async (idx) => {
    const state = get();
    const scene = state.scenes[idx];
    if (!scene || !scene.image) return;

    const { updateScene, addLog } = get();

    try {
      // 1. Upload
      updateScene(idx, { status: "uploading", error: null });
      addLog(`Uploading image for scene ${idx + 1}...`, "info");

      const uploadForm = new FormData();
      if (scene.imageFile) {
        uploadForm.append("file", scene.imageFile);
      } else if (scene.image) {
        const resp = await fetch(scene.image);
        const blob = await resp.blob();
        uploadForm.append("file", blob, "scene.png");
      }
      uploadForm.append("fileType", "image");

      const uploadRes = await fetch("/api/scene-studio/upload", {
        method: "POST",
        body: uploadForm,
      });
      const uploadData = await uploadRes.json();

      if (uploadData.code !== 0 || !uploadData.data?.fileName) {
        throw new Error(uploadData.msg ?? uploadData.message ?? "Upload failed");
      }

      const fileName = uploadData.data.fileName;
      updateScene(idx, { fileName });
      addLog(`Upload success: ${fileName}`, "success");

      // 2. Create task
      const cam = CAMERA_MOVES.find((c) => c.id === scene.cameraMove)!;
      const fullPrompt = [
        scene.prompt,
        cam.id !== "static" ? `Camera move: ${cam.label} - ${cam.desc}` : "",
        `Duration: ${scene.duration} seconds`,
      ]
        .filter(Boolean)
        .join(". ");

      updateScene(idx, { status: "queued" });
      addLog(`Creating task — prompt: "${fullPrompt.slice(0, 60)}..."`, "info");

      const createRes = await fetch("/api/scene-studio/create-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeInfoList: [
            { fieldName: "image", fieldValue: fileName },
            { fieldName: "text",  fieldValue: fullPrompt },
          ],
        }),
      });
      const createData = await createRes.json();

      // v2 API returns taskId at top level
      if (!createData.taskId) {
        throw new Error(createData.msg ?? createData.message ?? "Task creation failed");
      }
      const taskId = createData.taskId;
      updateScene(idx, { taskId });
      addLog(`Task created: ${taskId}`, "success");

      // 3. Poll
      updateScene(idx, { status: "running" });
      let attempts = 0;
      const maxAttempts = 120;

      while (attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 3000));
        attempts++;

        const pollRes = await fetch("/api/scene-studio/task-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId }),
        });
        const pollData = await pollRes.json();

        // v2 API: status at top level
        const taskStatus: string = pollData.status ?? "";

        if (taskStatus === "QUEUED") {
          updateScene(idx, { status: "queued" });
        } else if (taskStatus === "RUNNING") {
          updateScene(idx, { status: "running" });
        }

        if (attempts % 5 === 0) {
          addLog(
            `Scene ${idx + 1} still ${taskStatus.toLowerCase()}... (attempt ${attempts})`,
            "info"
          );
        }

        if (taskStatus === "SUCCESS") {
          const result = pollData.results?.[0];
          const fileUrl = result?.url ?? null;
          const outputType = result?.outputType === "mp4" ? "video" : "image";
          updateScene(idx, {
            status: "success",
            outputUrl: fileUrl,
            outputType,
          });
          addLog(`Scene ${idx + 1} completed!`, "success");
          return;
        }

        if (taskStatus === "FAILED") {
          throw new Error(
            pollData.errorMessage ?? "Generation failed"
          );
        }
      }

      throw new Error("Polling timed out after 6 minutes");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      updateScene(idx, { status: "failed", error: message });
      addLog(`Scene ${idx + 1} failed: ${message}`, "error");
    }
  },

  generateAll: async () => {
    const state = get();
    set({ generating: true });
    get().addLog("Starting batch generation...", "info");

    for (let i = 0; i < state.scenes.length; i++) {
      const scene = get().scenes[i];
      if (
        scene &&
        scene.image &&
        scene.status !== "success" &&
        scene.status !== "running" &&
        scene.status !== "uploading" &&
        scene.status !== "queued"
      ) {
        get().setActiveIdx(i);
        await get().generateScene(i);
      }
    }

    get().addLog("Batch generation complete.", "success");
    set({ generating: false });
  },
}));
