import { RuntimeManager } from "../runtime/runtime-manager.js";
import { CONFIG } from "../../config.js";
import * as http from "http";
import { SettingsManager } from "../../production/settings-manager.js";
import { LocalModelRuntime } from "./local-model-runtime.js";

export interface ProviderHealthStatus {
  name: string;
  status: "online" | "offline";
  details?: string;
}

export class ProviderHealthMonitor {
  private static registeredProviders: Record<
    string,
    () => Promise<ProviderHealthStatus>
  > = {};

  static registerProvider(
    name: string,
    checkFn: () => Promise<ProviderHealthStatus>
  ): void {
    this.registeredProviders[name] = checkFn;
  }

  static async checkProviderHealth(name: string): Promise<ProviderHealthStatus> {
    const customCheck = this.registeredProviders[name];
    if (customCheck) {
      return customCheck();
    }

    if (name === "lm-studio") {
      return this.pingUrl(CONFIG.LM_STUDIO_BASE_URL, "LM Studio");
    }
    if (name === "ollama") {
      return this.pingUrl(CONFIG.OLLAMA_BASE_URL, "Ollama");
    }
    if (name === "saad-local-direct") {
      const settings = await SettingsManager.getSettings();
      const provider = settings.providers.find((item) => item.id === "saad-local-direct");
      if (!provider) {
        return { name: "Saad Local Direct", status: "offline", details: "Provider settings are missing." };
      }
      const health = await LocalModelRuntime.checkHealth(provider);
      return {
        name: "Saad Local Direct",
        status: health.online ? "online" : "offline",
        details: health.details,
      };
    }
    if (name === "node") {
      const health = await RuntimeManager.checkHealth("node");
      const status: ProviderHealthStatus = {
        name: "Node Runtime",
        status: health.healthy ? "online" : "offline",
      };
      if (health.details !== undefined) {
        status.details = health.details;
      }
      return status;
    }
    if (name === "python") {
      const health = await RuntimeManager.checkHealth("python");
      const status: ProviderHealthStatus = {
        name: "Python Runtime",
        status: health.healthy ? "online" : "offline",
      };
      if (health.details !== undefined) {
        status.details = health.details;
      }
      return status;
    }

    return {
      name,
      status: "offline",
      details: "Unknown provider configuration status.",
    };
  }

  static async checkAll(): Promise<ProviderHealthStatus[]> {
    const standardProviders = ["lm-studio", "ollama", "node", "python"];
    const customKeys = Object.keys(this.registeredProviders);
    const allProviders = [...new Set([...standardProviders, ...customKeys])];
    return Promise.all(allProviders.map((p) => this.checkProviderHealth(p)));
  }

  private static pingUrl(
    urlString: string,
    name: string
  ): Promise<ProviderHealthStatus> {
    return new Promise((resolve) => {
      try {
        const url = new URL(urlString);
        const req = http.request(
          {
            hostname: url.hostname,
            port: url.port || (url.protocol === "https:" ? 443 : 80),
            path: url.pathname,
            method: "GET",
            timeout: 800,
          },
          (res) => {
            resolve({
              name,
              status: "online",
              details: `HTTP Status: ${res.statusCode}`,
            });
          }
        );

        req.on("error", (err) => {
          resolve({
            name,
            status: "offline",
            details: err.message,
          });
        });

        req.on("timeout", () => {
          req.destroy();
          resolve({
            name,
            status: "offline",
            details: "Connection timeout",
          });
        });

        req.end();
      } catch (err: any) {
        resolve({
          name,
          status: "offline",
          details: err.message,
        });
      }
    });
  }

  static clearRegisteredProviders(): void {
    this.registeredProviders = {};
  }
}
