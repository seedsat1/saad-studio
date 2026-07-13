import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import * as fsSync from "fs";
import * as path from "path";
import type { ProviderSettings } from "../../production/settings-manager.js";

interface RuntimeProcess {
  process: ChildProcessWithoutNullStreams;
  endpointUrl: string;
  startedAt: number;
}

export class LocalModelRuntime {
  private static processes = new Map<string, RuntimeProcess>();

  static isDirectLocalProvider(provider?: ProviderSettings): boolean {
    return provider?.id === "saad-local-direct";
  }

  static async ensureReady(provider: ProviderSettings): Promise<string> {
    if (!this.isDirectLocalProvider(provider)) return provider.endpointUrl;
    const runtime = provider.localRuntime;
    if (!runtime) throw new Error("Saad Local Direct runtime settings are missing.");
    if (!runtime.executablePath.trim()) throw new Error("Set Saad Local Direct executablePath to llama-server.exe.");
    if (!runtime.modelPath.trim()) throw new Error("Set Saad Local Direct modelPath to a local GGUF model file.");
    if (!fsSync.existsSync(runtime.executablePath)) throw new Error(`llama-server executable not found: ${runtime.executablePath}`);
    if (!fsSync.existsSync(runtime.modelPath)) throw new Error(`GGUF model file not found: ${runtime.modelPath}`);

    const port = runtime.port || 18765;
    const endpointUrl = `http://127.0.0.1:${port}/v1`;
    if (await this.isEndpointOnline(endpointUrl)) return endpointUrl;

    const existing = this.processes.get(provider.id);
    if (existing && !existing.process.killed) {
      await this.waitForEndpoint(endpointUrl, 45000);
      return endpointUrl;
    }

    const args = this.buildLlamaServerArgs(provider);
    const child = spawn(runtime.executablePath, args, {
      cwd: path.dirname(runtime.executablePath),
      windowsHide: true,
      stdio: "pipe",
    });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr = `${stderr}${String(chunk)}`.slice(-4000);
    });
    child.on("exit", () => {
      const current = this.processes.get(provider.id);
      if (current?.process === child) this.processes.delete(provider.id);
    });

    this.processes.set(provider.id, { process: child, endpointUrl, startedAt: Date.now() });
    try {
      await this.waitForEndpoint(endpointUrl, 90000);
    } catch (err: any) {
      child.kill();
      this.processes.delete(provider.id);
      throw new Error(`Saad Local Direct failed to start llama-server: ${err.message}${stderr ? ` | stderr: ${stderr}` : ""}`);
    }
    return endpointUrl;
  }

  static async checkHealth(provider: ProviderSettings): Promise<{ online: boolean; details: string }> {
    if (!this.isDirectLocalProvider(provider)) return { online: false, details: "Not a Saad Local Direct provider." };
    try {
      const endpoint = await this.ensureReady(provider);
      return { online: true, details: `Ready at ${endpoint}` };
    } catch (err: any) {
      return { online: false, details: String(err?.message || err) };
    }
  }

  private static buildLlamaServerArgs(provider: ProviderSettings): string[] {
    const runtime = provider.localRuntime!;
    const port = runtime.port || 18765;
    const args = [
      "-m", runtime.modelPath,
      "--host", "127.0.0.1",
      "--port", String(port),
      "-c", String(runtime.contextWindow || 8192),
    ];
    if (runtime.gpuLayers > 0) args.push("-ngl", String(runtime.gpuLayers));
    if (runtime.threads > 0) args.push("-t", String(runtime.threads));
    for (const extra of runtime.extraArgs || []) {
      const trimmed = String(extra).trim();
      if (trimmed) args.push(trimmed);
    }
    return args;
  }

  private static async isEndpointOnline(endpointUrl: string): Promise<boolean> {
    try {
      const response = await fetch(`${endpointUrl.replace(/\/+$/, "")}/models`, { method: "GET" });
      return response.ok;
    } catch {
      return false;
    }
  }

  private static async waitForEndpoint(endpointUrl: string, timeoutMs: number): Promise<void> {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if (await this.isEndpointOnline(endpointUrl)) return;
      await new Promise(resolve => setTimeout(resolve, 750));
    }
    throw new Error(`Timed out waiting for ${endpointUrl}/models`);
  }
}
