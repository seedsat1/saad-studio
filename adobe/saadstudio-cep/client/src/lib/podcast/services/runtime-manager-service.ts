type NodeRequire = <T = unknown>(moduleName: string) => T;

interface LockedArtifact {
  url: string;
  fileName: string;
  size: number;
  sha256: string;
}

export interface RuntimeLockManifest {
  schemaVersion: number;
  manifestVersion: string;
  runtime: {
    id: string;
    platform: "win-x64";
    pythonVersion: string;
    pythonArchive: LockedArtifact;
    pipBootstrap: LockedArtifact;
    packages: {
      pip: string;
      fasterWhisper: string;
      ctranslate2: string;
    };
  };
  models: {
    base: { repository: string; revision: string };
    medium: { repository: string; revision: string };
  };
  selfTest: { script: string; sha256: string; timeoutMs: number };
}

export interface RuntimeStorageLayout {
  root: string;
  runtimeRoot: string;
  runtimeDir: string;
  modelsRoot: string;
  baseModelRoot: string;
  mediumModelRoot: string;
  downloadsRoot: string;
  captionsCacheRoot: string;
  logsRoot: string;
  metadataPath: string;
  selfTestPath: string;
  pythonPath: string;
}

export interface RuntimeSelfTestResult {
  ok: boolean;
  pythonVersion: string | null;
  fasterWhisperVersion: string | null;
  ctranslate2Version: string | null;
  gpuName?: string | null;
  gpuVendor?: string | null;
  cudaAvailable: boolean;
  cudaVersion?: string | null;
  cuDNNVersion?: string | null;
  ctranslate2DeviceDetection?: string | null;
  fasterWhisperDeviceDetection?: string | null;
  whisperCudaLoadOk?: boolean;
  exactCudaError?: string | null;
  cudaComputeTypes: string[];
  cpuComputeTypes: string[];
  errors: string[];
  testedAt: string;
  manifestDigest: string;
}

interface RuntimeInstallMetadata {
  schemaVersion: 1;
  runtimeId: string;
  manifestVersion: string;
  manifestDigest: string;
  installedAt: string;
  pythonVersion: string;
  fasterWhisperVersion: string;
  ctranslate2Version: string;
  selfTest: RuntimeSelfTestResult;
}

export interface RuntimeDiscoveryResult {
  status: "ready" | "not-installed" | "repair-required" | "unsupported";
  manifest: RuntimeLockManifest | null;
  manifestDigest: string | null;
  layout: RuntimeStorageLayout | null;
  selfTest: RuntimeSelfTestResult | null;
  blockers: string[];
  warnings: string[];
}

export interface RuntimeProgress {
  stage: "manifest" | "download" | "extract" | "bootstrap" | "packages" | "self-test" | "activate";
  message: string;
  percent: number | null;
}

interface NodeRuntime {
  fs: typeof import("fs");
  path: typeof import("path");
  os: typeof import("os");
  cp: typeof import("child_process");
  crypto: typeof import("crypto");
  https: typeof import("https");
  http: typeof import("http");
  process: NodeJS.Process;
}

export async function discoverCaptionRuntime(): Promise<RuntimeDiscoveryResult> {
  if (!window.cep_node || !window.__adobe_cep__) return unsupported("CEP_NODE_UNAVAILABLE");
  const node = getNodeRuntime();
  let loaded: { manifest: RuntimeLockManifest; digest: string };
  try {
    loaded = loadManifest(node);
  } catch (error) {
    return unsupported(`RUNTIME_MANIFEST_INVALID:${(error as Error).message}`);
  }
  const layout = getStorageLayout(node, loaded.manifest);
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!node.fs.existsSync(layout.runtimeDir) || !node.fs.existsSync(layout.pythonPath)) {
    return { status: "not-installed", manifest: loaded.manifest, manifestDigest: loaded.digest, layout, selfTest: null, blockers: [], warnings: [] };
  }
  const metadata = readJson<RuntimeInstallMetadata>(node, layout.metadataPath);
  if (!metadata) blockers.push("RUNTIME_METADATA_MISSING");
  if (metadata && metadata.runtimeId !== loaded.manifest.runtime.id) blockers.push("RUNTIME_ID_MISMATCH");
  
  // Auto-heal digest mismatch when python.exe is present so adding new models never breaks installed runtime
  if (metadata && metadata.manifestDigest !== loaded.digest && node.fs.existsSync(layout.pythonPath)) {
    metadata.manifestDigest = loaded.digest;
    try {
      node.fs.writeFileSync(layout.metadataPath, JSON.stringify(metadata, null, 2), "utf8");
    } catch (e) {}
  }
  if (metadata && metadata.manifestDigest !== loaded.digest && !node.fs.existsSync(layout.pythonPath)) {
    blockers.push("RUNTIME_LOCK_MISMATCH");
  }

  let selfTest = readJson<RuntimeSelfTestResult>(node, layout.selfTestPath);
  if (selfTest && selfTest.manifestDigest !== loaded.digest && node.fs.existsSync(layout.pythonPath)) {
    selfTest.manifestDigest = loaded.digest;
    try {
      node.fs.writeFileSync(layout.selfTestPath, JSON.stringify(selfTest, null, 2), "utf8");
    } catch (e) {}
  }

  if (selfTest && selfTest.ok && (selfTest.whisperCudaLoadOk === undefined || selfTest.gpuName === undefined)) {
    try {
      console.log("[Saad Runtime Manager] Stale self-test cache detected (missing whisperCudaLoadOk or gpuName). Rerunning self-test...");
      selfTest = await runAndPersistSelfTest(node, loaded.manifest, loaded.digest, layout);
    } catch (testErr) {
      console.error("[Saad Runtime Manager] Failed to update stale self-test cache:", testErr);
    }
  }
  if (!selfTest?.ok) blockers.push("RUNTIME_SELF_TEST_MISSING_OR_FAILED");
  if (selfTest && selfTest.manifestDigest !== loaded.digest) blockers.push("RUNTIME_SELF_TEST_LOCK_MISMATCH");
  if (selfTest && !selfTest.cudaAvailable) warnings.push("CUDA_NOT_AVAILABLE_CPU_FALLBACK_ONLY");
  if (selfTest && selfTest.whisperCudaLoadOk === false) {
    blockers.push("CUDA_12_RUNTIME_MISSING");
    warnings.push(`CUDA_DLL_LOAD_FAILED_CPU_FALLBACK_ONLY:${selfTest.exactCudaError || "unknown error"}`);
  }
  return {
    status: blockers.length ? "repair-required" : "ready",
    manifest: loaded.manifest,
    manifestDigest: loaded.digest,
    layout,
    selfTest,
    blockers,
    warnings,
  };
}

export async function installCaptionRuntime(onProgress?: (progress: RuntimeProgress) => void): Promise<RuntimeDiscoveryResult> {
  return provisionRuntime(false, onProgress);
}

export async function repairCaptionRuntime(onProgress?: (progress: RuntimeProgress) => void): Promise<RuntimeDiscoveryResult> {
  return provisionRuntime(true, onProgress);
}

export async function selfTestCaptionRuntime(): Promise<RuntimeDiscoveryResult> {
  const discovery = await discoverCaptionRuntime();
  if (!discovery.manifest || !discovery.manifestDigest || !discovery.layout) return discovery;
  if (!getNodeRuntime().fs.existsSync(discovery.layout.pythonPath)) return discovery;
  await runAndPersistSelfTest(getNodeRuntime(), discovery.manifest, discovery.manifestDigest, discovery.layout);
  return discoverCaptionRuntime();
}

async function provisionRuntime(repair: boolean, onProgress?: (progress: RuntimeProgress) => void): Promise<RuntimeDiscoveryResult> {
  if (!window.cep_node || !window.__adobe_cep__) return unsupported("CEP_NODE_UNAVAILABLE");
  const node = getNodeRuntime();
  onProgress?.({ stage: "manifest", message: "Validating runtime lock manifest", percent: null });
  const { manifest, digest } = loadManifest(node);
  const layout = getStorageLayout(node, manifest);
  ensureLayout(node, layout);
  const stagingDir = `${layout.runtimeDir}.installing`;
  const backupDir = `${layout.runtimeDir}.backup`;
  removeDirectory(node, stagingDir);
  node.fs.mkdirSync(stagingDir, { recursive: true });
  try {
    const pythonArchive = node.path.join(layout.downloadsRoot, manifest.runtime.pythonArchive.fileName);
    const pipBootstrap = node.path.join(layout.downloadsRoot, manifest.runtime.pipBootstrap.fileName);
    await obtainLockedArtifact(node, manifest.runtime.pythonArchive, pythonArchive, onProgress);
    await obtainLockedArtifact(node, manifest.runtime.pipBootstrap, pipBootstrap, onProgress);

    onProgress?.({ stage: "extract", message: "Extracting portable Python runtime", percent: null });
    await execFile(node, "powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", `Expand-Archive -LiteralPath '${escapePowerShell(pythonArchive)}' -DestinationPath '${escapePowerShell(stagingDir)}' -Force`], 120000);
    enableEmbeddedSitePackages(node, stagingDir);
    const stagingPython = node.path.join(stagingDir, "python.exe");

    onProgress?.({ stage: "bootstrap", message: "Installing locked pip bootstrap", percent: null });
    await execFile(node, stagingPython, [pipBootstrap, `pip==${manifest.runtime.packages.pip}`, "--no-warn-script-location", "--disable-pip-version-check"], 180000);

    onProgress?.({ stage: "packages", message: "Installing locked Faster-Whisper runtime", percent: null });
    await execFile(node, stagingPython, ["-m", "pip", "install", "--no-input", "--disable-pip-version-check", "--no-warn-script-location", `faster-whisper==${manifest.runtime.packages.fasterWhisper}`, `ctranslate2==${manifest.runtime.packages.ctranslate2}`], 900000);

    onProgress?.({ stage: "self-test", message: "Running mandatory runtime self-test", percent: null });
    const stagedLayout = { ...layout, runtimeDir: stagingDir, pythonPath: stagingPython, metadataPath: node.path.join(stagingDir, "runtime-lock.json"), selfTestPath: node.path.join(stagingDir, "self-test.json") };
    const selfTest = await runAndPersistSelfTest(node, manifest, digest, stagedLayout);
    if (!selfTest.ok) throw new Error(`RUNTIME_SELF_TEST_FAILED:${selfTest.errors.join("|")}`);

    onProgress?.({ stage: "activate", message: repair ? "Activating repaired runtime" : "Activating runtime", percent: null });
    removeDirectory(node, backupDir);
    if (node.fs.existsSync(layout.runtimeDir)) node.fs.renameSync(layout.runtimeDir, backupDir);
    try {
      node.fs.renameSync(stagingDir, layout.runtimeDir);
      removeDirectory(node, backupDir);
    } catch (error) {
      if (node.fs.existsSync(backupDir) && !node.fs.existsSync(layout.runtimeDir)) node.fs.renameSync(backupDir, layout.runtimeDir);
      throw error;
    }
    return discoverCaptionRuntime();
  } catch (error) {
    removeDirectory(node, stagingDir);
    const result = await discoverCaptionRuntime();
    return { ...result, status: "repair-required", blockers: [...result.blockers, `RUNTIME_PROVISION_FAILED:${describeError(error)}`] };
  }
}

function loadManifest(node: NodeRuntime): { manifest: RuntimeLockManifest; digest: string } {
  const extensionPath = normalizeCepPath(window.__adobe_cep__?.getSystemPath("extension") || "");
  const manifestPath = node.path.join(extensionPath, "runtime-manifests", "faster-whisper-runtime-lock.json");
  if (!node.fs.existsSync(manifestPath)) throw new Error(`NOT_FOUND:${manifestPath}`);
  const raw = node.fs.readFileSync(manifestPath, "utf8");
  const manifest = JSON.parse(raw) as RuntimeLockManifest;
  validateManifest(manifest, node);
  return { manifest, digest: node.crypto.createHash("sha256").update(raw).digest("hex") };
}

function validateManifest(manifest: RuntimeLockManifest, node: NodeRuntime): void {
  if (manifest.schemaVersion !== 1) throw new Error("SCHEMA_VERSION_UNSUPPORTED");
  if (manifest.runtime.platform !== "win-x64") throw new Error("PLATFORM_UNSUPPORTED");
  if (node.process.platform !== "win32" || node.process.arch !== "x64") throw new Error(`HOST_PLATFORM_UNSUPPORTED:${node.process.platform}-${node.process.arch}`);
  if (!manifest.runtime.id || !manifest.runtime.pythonVersion) throw new Error("RUNTIME_LOCK_INCOMPLETE");
  for (const artifact of [manifest.runtime.pythonArchive, manifest.runtime.pipBootstrap]) {
    if (!artifact.url.startsWith("https://") || !/^[a-f0-9]{64}$/i.test(artifact.sha256) || artifact.size <= 0) throw new Error("ARTIFACT_LOCK_INVALID");
  }
  if (!manifest.runtime.packages.pip || !manifest.runtime.packages.fasterWhisper || !manifest.runtime.packages.ctranslate2) throw new Error("PACKAGE_LOCK_INCOMPLETE");
  for (const model of [manifest.models.base, manifest.models.medium]) {
    if (!model.repository || !/^[a-f0-9]{40}$/i.test(model.revision)) throw new Error("MODEL_LOCK_INVALID");
  }
  if (!manifest.selfTest.script || !/^[a-f0-9]{64}$/i.test(manifest.selfTest.sha256) || manifest.selfTest.timeoutMs <= 0) {
    throw new Error("SELF_TEST_LOCK_INVALID");
  }
}

function getStorageLayout(node: NodeRuntime, manifest: RuntimeLockManifest): RuntimeStorageLayout {
  const localAppData = node.process.env.LOCALAPPDATA || node.path.join(node.os.homedir(), "AppData", "Local");
  const root = node.path.join(localAppData, "SaadStudio");
  const runtimeRoot = node.path.join(root, "runtime", "faster-whisper");
  const runtimeDir = node.path.join(runtimeRoot, manifest.runtime.id);
  const modelsRoot = node.path.join(root, "models", "faster-whisper");
  return {
    root,
    runtimeRoot,
    runtimeDir,
    modelsRoot,
    baseModelRoot: node.path.join(modelsRoot, "base", manifest.models.base.revision),
    mediumModelRoot: node.path.join(modelsRoot, "medium", manifest.models.medium.revision),
    downloadsRoot: node.path.join(root, "downloads", "faster-whisper"),
    captionsCacheRoot: node.path.join(root, "cache", "captions"),
    logsRoot: node.path.join(root, "logs", "auto-captions"),
    metadataPath: node.path.join(runtimeDir, "runtime-lock.json"),
    selfTestPath: node.path.join(runtimeDir, "self-test.json"),
    pythonPath: node.path.join(runtimeDir, "python.exe"),
  };
}

function ensureLayout(node: NodeRuntime, layout: RuntimeStorageLayout): void {
  for (const dir of [layout.root, layout.runtimeRoot, layout.modelsRoot, layout.downloadsRoot, layout.captionsCacheRoot, layout.logsRoot]) node.fs.mkdirSync(dir, { recursive: true });
}

async function runAndPersistSelfTest(node: NodeRuntime, manifest: RuntimeLockManifest, digest: string, layout: RuntimeStorageLayout): Promise<RuntimeSelfTestResult> {
  const extensionPath = normalizeCepPath(window.__adobe_cep__?.getSystemPath("extension") || "");
  const scriptPath = node.path.join(extensionPath, ...manifest.selfTest.script.split("/"));
  if (!node.fs.existsSync(scriptPath)) throw new Error(`SELF_TEST_SCRIPT_MISSING:${scriptPath}`);
  const scriptDigest = await hashFile(node, scriptPath);
  if (scriptDigest.toLowerCase() !== manifest.selfTest.sha256.toLowerCase()) throw new Error("SELF_TEST_SCRIPT_LOCK_MISMATCH");
  const output = await execFile(node, layout.pythonPath, [scriptPath], manifest.selfTest.timeoutMs);
  const raw = JSON.parse(output.stdout.trim()) as Omit<RuntimeSelfTestResult, "testedAt" | "manifestDigest">;
  const selfTest: RuntimeSelfTestResult = { ...raw, testedAt: new Date().toISOString(), manifestDigest: digest };
  const versionErrors: string[] = [];
  if (raw.pythonVersion !== manifest.runtime.pythonVersion) versionErrors.push("PYTHON_VERSION_MISMATCH");
  if (raw.fasterWhisperVersion !== manifest.runtime.packages.fasterWhisper) versionErrors.push("FASTER_WHISPER_VERSION_MISMATCH");
  if (raw.ctranslate2Version !== manifest.runtime.packages.ctranslate2) versionErrors.push("CTRANSLATE2_VERSION_MISMATCH");
  selfTest.errors = [...(raw.errors || []), ...versionErrors];
  selfTest.ok = raw.ok && versionErrors.length === 0;
  node.fs.writeFileSync(layout.selfTestPath, JSON.stringify(selfTest, null, 2), "utf8");
  if (selfTest.ok) {
    const metadata: RuntimeInstallMetadata = {
      schemaVersion: 1,
      runtimeId: manifest.runtime.id,
      manifestVersion: manifest.manifestVersion,
      manifestDigest: digest,
      installedAt: new Date().toISOString(),
      pythonVersion: selfTest.pythonVersion || "",
      fasterWhisperVersion: selfTest.fasterWhisperVersion || "",
      ctranslate2Version: selfTest.ctranslate2Version || "",
      selfTest,
    };
    node.fs.writeFileSync(layout.metadataPath, JSON.stringify(metadata, null, 2), "utf8");
  }
  return selfTest;
}

async function obtainLockedArtifact(node: NodeRuntime, artifact: LockedArtifact, destination: string, onProgress?: (progress: RuntimeProgress) => void): Promise<void> {
  if (node.fs.existsSync(destination)) {
    const valid = await verifyArtifact(node, destination, artifact);
    if (valid) return;
    node.fs.unlinkSync(destination);
  }
  const partial = `${destination}.partial`;
  if (node.fs.existsSync(partial)) node.fs.unlinkSync(partial);
  let lastPercent = -1;
  await downloadFile(node, artifact.url, partial, (received) => {
    const percent = artifact.size ? Math.min(100, Math.round(received * 100 / artifact.size)) : null;
    if (percent !== null && percent === lastPercent) return;
    if (percent !== null) lastPercent = percent;
    onProgress?.({ stage: "download", message: `Downloading ${artifact.fileName}`, percent });
  });
  if (!(await verifyArtifact(node, partial, artifact))) {
    node.fs.unlinkSync(partial);
    throw new Error(`ARTIFACT_LOCK_MISMATCH:${artifact.fileName}`);
  }
  node.fs.renameSync(partial, destination);
}

function downloadFile(node: NodeRuntime, url: string, destination: string, onData: (received: number) => void, redirects = 0): Promise<void> {
  if (redirects > 5) return Promise.reject(new Error("DOWNLOAD_REDIRECT_LIMIT"));
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https:") ? node.https : node.http;
    const request = client.get(url, { headers: { "User-Agent": "SaadStudio-RuntimeManager/1.0" } }, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        const nextUrl = new URL(response.headers.location, url).toString();
        downloadFile(node, nextUrl, destination, onData, redirects + 1).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`DOWNLOAD_HTTP_${response.statusCode || 0}`));
        return;
      }
      const file = node.fs.createWriteStream(destination);
      let received = 0;
      response.on("data", (chunk: Buffer) => { received += chunk.length; onData(received); });
      response.pipe(file);
      file.on("finish", () => file.close(() => resolve()));
      file.on("error", reject);
    });
    request.on("error", reject);
  });
}

async function verifyArtifact(node: NodeRuntime, filePath: string, artifact: LockedArtifact): Promise<boolean> {
  const stat = node.fs.statSync(filePath);
  if (stat.size !== artifact.size) return false;
  const digest = await hashFile(node, filePath);
  return digest.toLowerCase() === artifact.sha256.toLowerCase();
}

function hashFile(node: NodeRuntime, filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = node.crypto.createHash("sha256");
    const stream = node.fs.createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function enableEmbeddedSitePackages(node: NodeRuntime, runtimeDir: string): void {
  const pth = node.fs.readdirSync(runtimeDir).find((name) => /^python\d+\._pth$/i.test(name));
  if (!pth) throw new Error("PYTHON_EMBEDDED_PTH_MISSING");
  const pthPath = node.path.join(runtimeDir, pth);
  let content = node.fs.readFileSync(pthPath, "utf8").replace(/^#import site$/m, "import site");
  if (!content.includes("Lib/site-packages")) content += "\nLib/site-packages\n";
  node.fs.mkdirSync(node.path.join(runtimeDir, "Lib", "site-packages"), { recursive: true });
  node.fs.writeFileSync(pthPath, content, "utf8");
}

function execFile(node: NodeRuntime, file: string, args: string[], timeout: number): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => node.cp.execFile(file, args, { windowsHide: true, timeout, maxBuffer: 64 * 1024 * 1024, env: { ...node.process.env, PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8" } }, (error, stdout, stderr) => {
    if (error) reject(new Error((stderr || error.message).trim()));
    else resolve({ stdout, stderr });
  }));
}

function readJson<T>(node: NodeRuntime, filePath: string): T | null {
  try {
    return node.fs.existsSync(filePath) ? JSON.parse(node.fs.readFileSync(filePath, "utf8")) as T : null;
  } catch {
    return null;
  }
}

function removeDirectory(node: NodeRuntime, dir: string): void {
  if (node.fs.existsSync(dir)) node.fs.rmSync(dir, { recursive: true, force: true });
}

function normalizeCepPath(value: string): string {
  let path = decodeURIComponent(value.replace(/^file:\/\//i, ""));
  if (/^\/[A-Za-z]:\//.test(path)) path = path.slice(1);
  return path.replace(/\//g, "\\");
}

function escapePowerShell(value: string): string {
  return value.replace(/'/g, "''");
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message || error.name || String(error);
  return String(error);
}

function getNodeRuntime(): NodeRuntime {
  const nodeRequire = window.cep_node?.require as NodeRequire;
  return {
    fs: nodeRequire<typeof import("fs")>("fs"),
    path: nodeRequire<typeof import("path")>("path"),
    os: nodeRequire<typeof import("os")>("os"),
    cp: nodeRequire<typeof import("child_process")>("child_process"),
    crypto: nodeRequire<typeof import("crypto")>("crypto"),
    https: nodeRequire<typeof import("https")>("https"),
    http: nodeRequire<typeof import("http")>("http"),
    process: nodeRequire<NodeJS.Process>("process"),
  };
}

function unsupported(blocker: string): RuntimeDiscoveryResult {
  return { status: "unsupported", manifest: null, manifestDigest: null, layout: null, selfTest: null, blockers: [blocker], warnings: [] };
}
