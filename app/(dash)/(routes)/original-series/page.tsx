"use client";

import "@xyflow/react/dist/style.css";

import { useCallback, useRef, useState, useMemo, type ComponentType } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type OnConnect,
  type OnSelectionChangeParams,
  type NodeProps,
} from "@xyflow/react";

import { CanvasNode } from "@/components/canvas/CanvasNode";
import { NodeLibrary } from "@/components/canvas/NodeLibrary";
import { NodeSettingsPanel } from "@/components/canvas/NodeSettingsPanel";
import { CanvasToolbar } from "@/components/canvas/CanvasToolbar";
import { ActivityPanel } from "@/components/canvas/ActivityPanel";
import { CanvasContext, type CanvasContextValue } from "@/components/canvas/canvas-context";
import {
  NODE_CONFIGS,
  type CanvasNodeData,
  type CanvasNodeType,
  type CanvasNodeSettings,
  type ActivityEntry,
} from "@/components/canvas/canvas-types";

const nodeTypes = { canvasNode: CanvasNode as ComponentType<NodeProps> };

const defaultEdgeOptions = {
  type: "smoothstep",
  animated: false,
  style: { stroke: "rgba(99,102,241,0.35)", strokeWidth: 1.5 },
};

function makeNode(
  id: string,
  type: CanvasNodeType,
  position: { x: number; y: number },
  settingsOverride?: Partial<CanvasNodeSettings>,
): Node<CanvasNodeData> {
  const cfg = NODE_CONFIGS[type];
  return {
    id,
    type: "canvasNode",
    position,
    data: {
      nodeType: type,
      label: cfg.label,
      description: cfg.description,
      status: "idle",
      settings: { ...cfg.defaultSettings, ...settingsOverride },
      creditCost: cfg.creditCost,
    },
  };
}

const INITIAL_NODES: Node<CanvasNodeData>[] = [
  makeNode("n1", "text-prompt", { x: 80, y: 220 }, {
    prompt: "A cinematic shot of a futuristic cityscape at night, neon lights, rain, ultra realistic",
  }),
  makeNode("n2", "text-to-image", { x: 360, y: 170 }),
  makeNode("n3", "image-to-video", { x: 640, y: 140 }, {
    prompt: "Smooth cinematic pan, rain falling, dramatic lighting",
  }),
  makeNode("n4", "export", { x: 930, y: 160 }),
];

const INITIAL_EDGES: Edge[] = [
  {
    id: "e1-2", source: "n1", sourceHandle: "prompt",
    target: "n2", targetHandle: "prompt",
    type: "smoothstep", animated: true,
    style: { stroke: "rgba(139,92,246,0.45)", strokeWidth: 1.5 },
  },
  {
    id: "e2-3", source: "n2", sourceHandle: "image",
    target: "n3", targetHandle: "image",
    type: "smoothstep",
    style: { stroke: "rgba(59,130,246,0.45)", strokeWidth: 1.5 },
  },
  {
    id: "e3-4", source: "n3", sourceHandle: "video",
    target: "n4", targetHandle: "video",
    type: "smoothstep",
    style: { stroke: "rgba(16,185,129,0.45)", strokeWidth: 1.5 },
  },
];

async function pollVideoTask(taskId: string): Promise<string> {
  const MAX = 70;
  for (let i = 0; i < MAX; i++) {
    await new Promise(r => setTimeout(r, 4000));
    let res: Response;
    try {
      res = await fetch(`/api/video?taskId=${encodeURIComponent(taskId)}`);
    } catch {
      continue;
    }
    if (!res.ok) continue;
    const pd = (await res.json().catch(() => null)) as {
      status?: string; outputs?: string[]; error?: string;
    } | null;
    if (!pd) continue;
    if (pd.status === "completed" && Array.isArray(pd.outputs) && pd.outputs.length > 0) {
      return pd.outputs[0] as string;
    }
    if (pd.status === "failed") {
      throw new Error(pd.error || "Video generation failed.");
    }
  }
  throw new Error("Video generation timed out (4 min). Check the video page for results.");
}

function topoSort(nodes: Node<CanvasNodeData>[], edges: Edge[]): Node<CanvasNodeData>[] {
  const inDeg = new Map<string, number>(nodes.map(n => [n.id, 0]));
  const adj = new Map<string, string[]>(nodes.map(n => [n.id, []]));
  for (const e of edges) {
    inDeg.set(e.target, (inDeg.get(e.target) ?? 0) + 1);
    adj.get(e.source)?.push(e.target);
  }
  const queue = nodes.filter(n => (inDeg.get(n.id) ?? 0) === 0);
  const sorted: Node<CanvasNodeData>[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted.push(node);
    for (const nid of (adj.get(node.id) ?? [])) {
      const d = (inDeg.get(nid) ?? 0) - 1;
      inDeg.set(nid, d);
      if (d === 0) {
        const n = nodes.find(x => x.id === nid);
        if (n) queue.push(n);
      }
    }
  }
  return sorted;
}

function AICanvasInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<CanvasNodeData>>(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [activityOpen, setActivityOpen] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  const nodesRef = useRef<Node<CanvasNodeData>[]>(nodes);
  const edgesRef = useRef<Edge[]>(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  const patchNode = useCallback(
    (id: string, patch: Partial<CanvasNodeData>) => {
      setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n));
    },
    [setNodes],
  );

  const addActivity = useCallback(
    (entry: Omit<ActivityEntry, "id" | "timestamp">) => {
      setActivity(prev =>
        [{ ...entry, id: crypto.randomUUID(), timestamp: new Date() }, ...prev].slice(0, 200),
      );
    },
    [],
  );

  const executeNode = useCallback(
    async (nodeId: string): Promise<void> => {
      const allNodes = nodesRef.current;
      const allEdges = edgesRef.current;
      const node = allNodes.find(n => n.id === nodeId);
      if (!node) return;

      const cfg = NODE_CONFIGS[node.data.nodeType];
      const data = node.data;
      const s = data.settings;

      if (data.nodeType === "text-prompt" || data.nodeType === "upload-image") {
        addActivity({ nodeId, nodeLabel: data.label, level: "info", message: "Source node — no execution needed." });
        return;
      }

      patchNode(nodeId, { status: "running", errorMessage: undefined });
      addActivity({ nodeId, nodeLabel: data.label, level: "info", message: `Starting ${data.label}...` });

      try {
        const inEdges = allEdges.filter(e => e.target === nodeId);
        let inputImageUrl: string | undefined;
        let inputVideoUrl: string | undefined;
        let inputPrompt: string | undefined;

        for (const edge of inEdges) {
          const src = allNodes.find(n => n.id === edge.source);
          if (!src) continue;
          const sd = src.data;
          if (sd.nodeType === "text-prompt") inputPrompt = sd.settings.prompt;
          else if (sd.nodeType === "upload-image") inputImageUrl = sd.settings.imageUrl;
          else if (sd.outputImageUrl) inputImageUrl = sd.outputImageUrl;
          else if (sd.outputVideoUrl) inputVideoUrl = sd.outputVideoUrl;
        }

        const prompt = inputPrompt || s.prompt || "";
        const imageUrl = inputImageUrl || s.imageUrl;
        const videoUrl = inputVideoUrl || s.videoUrl;

        let outputImageUrl: string | undefined;
        let outputVideoUrl: string | undefined;

        switch (data.nodeType) {
          case "text-to-image": {
            if (!prompt) throw new Error("Prompt required. Connect a Text Prompt node or set prompt in settings.");
            const res = await fetch("/api/generate/image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt, modelId: s.modelId || "nano-banana-pro", aspectRatio: s.aspectRatio || "1:1", negativePrompt: s.negativePrompt }),
            });
            if (!res.ok) { const err = await res.json().catch(() => ({})) as Record<string, string>; throw new Error(err.message || err.error || `HTTP ${res.status}`); }
            const d = await res.json() as { imageUrl?: string; mediaUrl?: string; imageUrls?: string[] };
            outputImageUrl = d.imageUrl || d.mediaUrl || d.imageUrls?.[0];
            if (!outputImageUrl) throw new Error("No output URL returned from the image API.");
            break;
          }
          case "image-edit": {
            if (!imageUrl) throw new Error("Image input required. Connect an Upload Image or Text to Image node.");
            if (!prompt) throw new Error("Prompt required. Connect a Text Prompt node or set prompt in settings.");
            const res = await fetch("/api/generate/image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt, modelId: s.modelId || "nano-banana-pro", aspectRatio: s.aspectRatio || "1:1", imageUrl }),
            });
            if (!res.ok) { const err = await res.json().catch(() => ({})) as Record<string, string>; throw new Error(err.message || err.error || `HTTP ${res.status}`); }
            const d = await res.json() as { imageUrl?: string; mediaUrl?: string; imageUrls?: string[] };
            outputImageUrl = d.imageUrl || d.mediaUrl || d.imageUrls?.[0];
            if (!outputImageUrl) throw new Error("No output URL returned from the image API.");
            break;
          }
          case "upscale": {
            if (!imageUrl) throw new Error("Image input required. Connect an image node.");
            const res = await fetch("/api/generate/image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt: "enhance and upscale image to maximum quality", modelId: s.modelId || "image-upscale", imageUrl }),
            });
            if (!res.ok) { const err = await res.json().catch(() => ({})) as Record<string, string>; throw new Error(err.message || err.error || `HTTP ${res.status}`); }
            const d = await res.json() as { imageUrl?: string; mediaUrl?: string; imageUrls?: string[] };
            outputImageUrl = d.imageUrl || d.mediaUrl || d.imageUrls?.[0];
            if (!outputImageUrl) throw new Error("No output URL returned from the upscale API.");
            break;
          }
          case "image-to-video": {
            if (!imageUrl) throw new Error("Image input required. Connect an image node.");
            const createRes = await fetch("/api/video", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                modelRoute: s.modelId || "kwaivgi/kling-v3.0-pro/text-to-video",
                payload: { prompt, image_urls: [imageUrl], duration: s.duration || 5, aspect_ratio: s.aspectRatio || "16:9", mode: "std" },
              }),
            });
            if (!createRes.ok) { const err = await createRes.json().catch(() => ({})) as Record<string, string>; throw new Error(err.message || err.error || `HTTP ${createRes.status}`); }
            const createData = await createRes.json() as { taskId?: string };
            if (!createData.taskId) throw new Error("No taskId returned. Check KIE_API_KEY and model route.");
            addActivity({ nodeId, nodeLabel: data.label, level: "info", message: `Task ${createData.taskId} created. Polling (1-3 min)...` });
            outputVideoUrl = await pollVideoTask(createData.taskId);
            break;
          }
          case "video-to-video": {
            if (!videoUrl) throw new Error("Video input required. Connect a video node.");
            const createRes = await fetch("/api/video", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                modelRoute: s.modelId || "kwaivgi/kling-v3.0-pro/text-to-video",
                payload: { prompt, video: videoUrl, duration: s.duration || 5, mode: "std" },
              }),
            });
            if (!createRes.ok) { const err = await createRes.json().catch(() => ({})) as Record<string, string>; throw new Error(err.message || err.error || `HTTP ${createRes.status}`); }
            const createData = await createRes.json() as { taskId?: string };
            if (!createData.taskId) throw new Error("No taskId returned. Check KIE_API_KEY and model route.");
            addActivity({ nodeId, nodeLabel: data.label, level: "info", message: `Task ${createData.taskId} created. Polling...` });
            outputVideoUrl = await pollVideoTask(createData.taskId);
            break;
          }
          case "export": {
            outputImageUrl = imageUrl;
            outputVideoUrl = videoUrl;
            if (!outputImageUrl && !outputVideoUrl) throw new Error("No input connected. Connect an image or video node to export.");
            break;
          }
          default: {
            addActivity({ nodeId, nodeLabel: data.label, level: "warn", message: "Unknown node type — skipped." });
            patchNode(nodeId, { status: "idle" });
            return;
          }
        }

        patchNode(nodeId, { status: "done", outputImageUrl, outputVideoUrl, errorMessage: undefined });
        addActivity({ nodeId, nodeLabel: data.label, level: "success", message: `${data.label} completed.`, outputUrl: outputImageUrl || outputVideoUrl });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        patchNode(nodeId, { status: "error", errorMessage: msg });
        addActivity({ nodeId, nodeLabel: data.label, level: "error", message: msg });
        throw err;
      }
    },
    [patchNode, addActivity],
  );

  const runNode = useCallback(
    (id: string) => { setIsRunning(true); executeNode(id).finally(() => setIsRunning(false)); },
    [executeNode],
  );

  const runSelectedNode = useCallback(() => {
    if (!selectedNodeId) { addActivity({ nodeId: "", nodeLabel: "Canvas", level: "warn", message: "Select a node first, then click Run Node." }); return; }
    runNode(selectedNodeId);
  }, [selectedNodeId, runNode, addActivity]);

  const runFullPipeline = useCallback(async () => {
    const allNodes = nodesRef.current;
    const allEdges = edgesRef.current;
    if (allNodes.length === 0) { addActivity({ nodeId: "", nodeLabel: "Canvas", level: "warn", message: "Canvas is empty. Add nodes first." }); return; }
    setIsRunning(true);
    addActivity({ nodeId: "", nodeLabel: "Pipeline", level: "info", message: "Starting full pipeline..." });
    const sorted = topoSort(allNodes, allEdges);
    try {
      for (const node of sorted) {
        if (node.data.nodeType === "text-prompt" || node.data.nodeType === "upload-image") continue;
        await executeNode(node.id);
        await new Promise(r => setTimeout(r, 0));
      }
      addActivity({ nodeId: "", nodeLabel: "Pipeline", level: "success", message: "Full pipeline completed." });
    } catch {
      addActivity({ nodeId: "", nodeLabel: "Pipeline", level: "error", message: "Pipeline stopped due to a node error." });
    } finally {
      setIsRunning(false);
    }
  }, [executeNode, addActivity]);

  const deleteNode = useCallback(
    (id: string) => {
      setNodes(nds => nds.filter(n => n.id !== id));
      setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
      if (selectedNodeId === id) setSelectedNodeId(null);
    },
    [setNodes, setEdges, selectedNodeId],
  );

  const updateNodeSettings = useCallback(
    (id: string, patch: Partial<CanvasNodeSettings>) => {
      setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, settings: { ...n.data.settings, ...patch } } } : n));
    },
    [setNodes],
  );

  const addNode = useCallback(
    (type: CanvasNodeType) => {
      const cfg = NODE_CONFIGS[type];
      const count = nodesRef.current.length;
      const pos = { x: 120 + (count % 5) * 260, y: 100 + Math.floor(count / 5) * 200 };
      const id = `node-${Date.now()}`;
      const newNode: Node<CanvasNodeData> = {
        id, type: "canvasNode", position: pos,
        data: { nodeType: type, label: cfg.label, description: cfg.description, status: "idle", settings: { ...cfg.defaultSettings }, creditCost: cfg.creditCost },
      };
      setNodes(nds => [...nds, newNode]);
    },
    [setNodes],
  );

  const saveCanvasState = useCallback(() => {
    try {
      localStorage.setItem("ai-canvas-v1", JSON.stringify({ nodes: nodesRef.current, edges: edgesRef.current }));
      addActivity({ nodeId: "", nodeLabel: "Canvas", level: "success", message: "Canvas saved to local storage." });
    } catch {
      addActivity({ nodeId: "", nodeLabel: "Canvas", level: "error", message: "Failed to save canvas." });
    }
  }, [addActivity]);

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => setEdges(eds => addEdge(connection, eds)),
    [setEdges],
  );

  const onSelectionChange = useCallback(
    ({ nodes: sel }: OnSelectionChangeParams) => { setSelectedNodeId(sel.length === 1 ? sel[0].id : null); },
    [],
  );

  const canvasCtx = useMemo<CanvasContextValue>(
    () => ({ runNode, deleteNode, updateNodeSettings }),
    [runNode, deleteNode, updateNodeSettings],
  );

  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) ?? null : null;

  return (
    <CanvasContext.Provider value={canvasCtx}>
      <div style={{ height: "calc(100vh - 64px)", display: "flex", flexDirection: "column", overflow: "hidden", background: "#060c18" }}>
        <CanvasToolbar onSave={saveCanvasState} onRunNode={runSelectedNode} onRunPipeline={runFullPipeline} isRunning={isRunning} nodeCount={nodes.length} />
        <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
          <NodeLibrary onAddNode={addNode} />
          <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onSelectionChange={onSelectionChange}
              nodeTypes={nodeTypes}
              defaultEdgeOptions={defaultEdgeOptions}
              fitView
              fitViewOptions={{ padding: 0.25 }}
              minZoom={0.25}
              maxZoom={2}
              proOptions={{ hideAttribution: true }}
              style={{ background: "#060c18" }}
            >
              <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="rgba(255,255,255,0.06)" />
              <Controls style={{ background: "rgba(8,13,26,0.95)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, bottom: 16, left: 16 }} />
              <MiniMap
                style={{ background: "rgba(8,13,26,0.9)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, bottom: 16, right: 16 }}
                nodeColor={n => {
                  const d = n.data as CanvasNodeData;
                  if (d?.status === "done") return "rgba(16,185,129,0.6)";
                  if (d?.status === "running") return "rgba(245,158,11,0.6)";
                  if (d?.status === "error") return "rgba(239,68,68,0.6)";
                  return "rgba(99,102,241,0.35)";
                }}
                maskColor="rgba(6,12,24,0.6)"
              />
            </ReactFlow>
          </div>
          <NodeSettingsPanel nodeId={selectedNodeId} data={selectedNode?.data ?? null} onClose={() => setSelectedNodeId(null)} />
        </div>
        <ActivityPanel entries={activity} open={activityOpen} onToggle={() => setActivityOpen(v => !v)} onClear={() => setActivity([])} />
      </div>
    </CanvasContext.Provider>
  );
}

export default function AICanvasPage() {
  return (
    <ReactFlowProvider>
      <AICanvasInner />
    </ReactFlowProvider>
  );
}
