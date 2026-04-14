type KieOverrideMap = {
  imageModelMap: Record<string, string>;
  videoRouteMap: Record<string, string>;
  videoModelMap: Record<string, string>;
};

type KieModelSyncSnapshot = {
  sourceUrl: string;
  lastCheckAt: number;
  lastSuccessAt: number | null;
  expiresAt: number;
  detectedModelIds: string[];
  overrides: KieOverrideMap;
  error: string | null;
};

const SYNC_URL = "https://kie.ai/api-updates";
const SYNC_TTL_MS = 1000 * 60 * 30; // 30 min
const SYNC_TIMEOUT_MS = 12_000;

declare global {
  // eslint-disable-next-line no-var
  var __kieModelSyncSnapshot: KieModelSyncSnapshot | undefined;
  // eslint-disable-next-line no-var
  var __kieModelSyncInFlight: Promise<KieModelSyncSnapshot> | undefined;
}

function now() {
  return Date.now();
}

function emptyOverrides(): KieOverrideMap {
  return { imageModelMap: {}, videoRouteMap: {}, videoModelMap: {} };
}

function initialSnapshot(): KieModelSyncSnapshot {
  return {
    sourceUrl: SYNC_URL,
    lastCheckAt: 0,
    lastSuccessAt: null,
    expiresAt: 0,
    detectedModelIds: [],
    overrides: emptyOverrides(),
    error: null,
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(timer);
        reject(e);
      });
  });
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}

function extractModelCandidates(input: string): string[] {
  if (!input) return [];

  const raw = input.match(/[a-z0-9]+(?:[./-][a-z0-9]+){1,8}/gi) ?? [];
  const allow = /(kling|hailuo|sora|veo|bytedance|seedance|grok|nano|imagen|seedream|flux|gpt-image|runway|minimax|x-ai|openai|google)/i;

  const filtered = raw
    .map((item) => item.trim())
    .filter((item) => item.length >= 6 && item.length <= 120)
    .filter((item) => allow.test(item))
    .map((item) => item.replace(/^model\//i, "").replace(/\/+$/, ""));

  return uniqueStrings(filtered);
}

function mapDetectedModels(modelIds: string[]): KieOverrideMap {
  const overrides = emptyOverrides();

  for (const id of modelIds) {
    // If KIE announces exact keys, let them work immediately without code deploy.
    // We only map direct identity for IDs that look like model names.
    if (id.includes("/") && !id.includes("http")) {
      overrides.imageModelMap[id] = id;
      overrides.videoModelMap[id] = id;
      overrides.videoRouteMap[id] = id;
    }
  }

  return overrides;
}

async function fetchUpdatesPage(): Promise<string> {
  const res = await withTimeout(
    fetch(SYNC_URL, {
      method: "GET",
      headers: {
        "User-Agent": "SaadStudio-KieSync/1.0",
        Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
      },
      cache: "no-store",
    }),
    SYNC_TIMEOUT_MS,
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch KIE updates page: HTTP ${res.status}`);
  }

  return await res.text();
}

async function runSync(force = false): Promise<KieModelSyncSnapshot> {
  const prev = globalThis.__kieModelSyncSnapshot ?? initialSnapshot();
  const currentTs = now();

  if (!force && prev.expiresAt > currentTs && prev.lastSuccessAt) {
    return prev;
  }

  try {
    const page = await fetchUpdatesPage();
    const detectedModelIds = extractModelCandidates(page);
    const overrides = mapDetectedModels(detectedModelIds);

    const next: KieModelSyncSnapshot = {
      sourceUrl: SYNC_URL,
      lastCheckAt: currentTs,
      lastSuccessAt: currentTs,
      expiresAt: currentTs + SYNC_TTL_MS,
      detectedModelIds,
      overrides,
      error: null,
    };
    globalThis.__kieModelSyncSnapshot = next;
    return next;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown sync error";
    const fallback: KieModelSyncSnapshot = {
      ...prev,
      lastCheckAt: currentTs,
      expiresAt: currentTs + Math.min(SYNC_TTL_MS, 5 * 60 * 1000), // retry faster after failure
      error: msg,
    };
    globalThis.__kieModelSyncSnapshot = fallback;
    return fallback;
  }
}

export function getKieModelSyncSnapshot(): KieModelSyncSnapshot {
  return globalThis.__kieModelSyncSnapshot ?? initialSnapshot();
}

export async function syncKieModelCatalog(force = false): Promise<KieModelSyncSnapshot> {
  if (!force && globalThis.__kieModelSyncInFlight) {
    return globalThis.__kieModelSyncInFlight;
  }

  const runner = runSync(force).finally(() => {
    if (globalThis.__kieModelSyncInFlight === runner) {
      globalThis.__kieModelSyncInFlight = undefined;
    }
  });

  globalThis.__kieModelSyncInFlight = runner;
  return runner;
}

