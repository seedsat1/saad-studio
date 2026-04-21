/**
 * RunningHub API utility
 * Handles image upload, task creation, and polling for both
 * Storyboard Studio and Multi-Angle Studio workflows.
 */

const RUNNINGHUB_API_BASE = "https://www.runninghub.ai/openapi/v2";
const RUNNINGHUB_UPLOAD_BASE = "https://www.runninghub.cn/openapi/v2";

export function getRunningHubApiKey(): string {
  const key = process.env.RUNNINGHUB_API_KEY;
  if (!key) throw new Error("RUNNINGHUB_API_KEY is not configured");
  return key;
}

export interface RunningHubNodeInput {
  nodeId: string;
  fieldName: string;
  fieldValue: string;
}

export interface RunningHubTaskResult {
  url?: string;
  nodeId?: string;
  outputType?: string;
  text?: string | null;
}

/** Upload a base64 data URL to RunningHub. Returns the remote fileName/URL. */
export async function uploadImageToRunningHub(imageDataUrl: string): Promise<string> {
  const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image data URL format");

  const [, mimeType, base64Data] = match;
  const ext = (mimeType.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
  const binary = Buffer.from(base64Data, "base64");
  const blob = new Blob([binary], { type: mimeType });

  const form = new FormData();
  form.append("file", blob, `upload.${ext}`);

  const res = await fetch(`${RUNNINGHUB_UPLOAD_BASE}/media/upload/binary`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getRunningHubApiKey()}` },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`RunningHub upload failed: HTTP ${res.status}`);
  }

  const data = (await res.json()) as {
    code?: number;
    data?: { download_url?: string; fileName?: string };
    msg?: string;
  };

  if (data.code !== 0 || !data.data) {
    throw new Error(`RunningHub upload error: ${data.msg ?? "Unknown"}`);
  }

  const fileName = data.data.download_url ?? data.data.fileName;
  if (!fileName) throw new Error("RunningHub upload returned no file identifier");
  return fileName;
}

/** Create a workflow task on RunningHub. Returns the taskId. */
export async function createRunningHubTask(
  workflowEndpoint: string,
  nodeInfoList: RunningHubNodeInput[],
  instanceType = "default",
): Promise<string> {
  const res = await fetch(`${RUNNINGHUB_API_BASE}${workflowEndpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getRunningHubApiKey()}`,
    },
    body: JSON.stringify({
      addMetadata: true,
      nodeInfoList,
      instanceType,
      usePersonalQueue: "false",
    }),
  });

  if (!res.ok) {
    throw new Error(`RunningHub task creation failed: HTTP ${res.status}`);
  }

  const raw = await res.text();
  console.log("[RUNNINGHUB_CREATE] Raw response:", raw.slice(0, 500));

  let data: Record<string, unknown>;
  try { data = JSON.parse(raw); } catch { throw new Error(`RunningHub task creation: invalid JSON`); }

  // taskId can be at top level or nested under data
  const taskId = (data.taskId as string) ?? ((data.data as Record<string, unknown>)?.taskId as string);

  if (!taskId) {
    throw new Error(`RunningHub task creation error: ${(data.msg as string) ?? "No taskId returned"} (code=${data.code})`);
  }

  return taskId;
}

export type RunningHubStatus = "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | string;

export interface RunningHubQueryResult {
  status: RunningHubStatus;
  outputs?: string[];
  errorMessage?: string;
}

export interface WorkflowNodeInfo {
  nodeId: string;
  /** inputs accepted by this node: fieldName → fieldType */
  inputs: Record<string, string>;
}

/**
 * Fetch the node list for a RunningHub AI-App workflow.
 * Returns an empty array when the endpoint is unavailable.
 */
export async function discoverWorkflowNodes(appId: string): Promise<WorkflowNodeInfo[]> {
  const apiKey = getRunningHubApiKey();
  // RunningHub exposes workflow info via /openapi/v2/workflow/nodeInfo
  // (confirmed reachable — returns TOKEN_INVALID without auth)
  const candidates = [
    { method: "POST", url: `${RUNNINGHUB_API_BASE}/workflow/nodeInfo`, body: JSON.stringify({ appId }) },
    { method: "GET",  url: `${RUNNINGHUB_API_BASE}/workflow/info?appId=${appId}`, body: undefined },
    { method: "POST", url: `${RUNNINGHUB_API_BASE}/workflow/info`, body: JSON.stringify({ appId }) },
  ];

  for (const { method, url, body } of candidates) {
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body,
      });
      if (!res.ok) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (await res.json()) as Record<string, any>;
      if (data.code !== 0) continue;

      // Possible shapes: data.data.nodes | data.data.nodeList | data.nodes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nodes: any[] = data.data?.nodes ?? data.data?.nodeList ?? data.nodes ?? [];
      if (!Array.isArray(nodes) || nodes.length === 0) continue;

      console.log(`[RUNNINGHUB_DISCOVER] Found ${nodes.length} nodes via ${url}`);
      return nodes.map((n: Record<string, unknown>) => ({
        nodeId: String(n.nodeId ?? n.id ?? ""),
        inputs: (n.inputs as Record<string, string>) ?? {},
      })).filter((n) => n.nodeId);
    } catch {
      // try next candidate
    }
  }
  return [];
}

/** Query the status of a RunningHub task. */
export async function queryRunningHubTask(taskId: string): Promise<RunningHubQueryResult> {
  const res = await fetch(`${RUNNINGHUB_API_BASE}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getRunningHubApiKey()}`,
    },
    body: JSON.stringify({ taskId }),
  });

  if (!res.ok) {
    throw new Error(`RunningHub query failed: HTTP ${res.status}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- needed for dynamic API response
  const data = (await res.json()) as Record<string, any>;

  // Debug: log raw query response (first few calls)
  console.log("[RUNNINGHUB_QUERY] Raw response:", JSON.stringify(data).slice(0, 500));

  // Normalise status across different RunningHub API response shapes
  const status: RunningHubStatus =
    data.status ?? data.taskStatus ?? data.taskStatusMsg ?? "UNKNOWN";

  const outputs: string[] = [];

  // Official shape: results = [ { url, nodeId, outputType, text } ]
  if (Array.isArray(data.results)) {
    for (const item of data.results as RunningHubTaskResult[]) {
      if (item.url && typeof item.url === "string") {
        outputs.push(item.url);
      }
    }
  }

  const errorMessage: string | undefined =
    data.errorMessage ?? data.error ?? data.msg ?? undefined;

  return { status, outputs, errorMessage };
}
