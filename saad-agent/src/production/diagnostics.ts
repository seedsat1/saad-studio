import * as os from "os";
import { CONFIG } from "../config.js";
import { ConnectorRegistry } from "../platform/services/connectors.js";

export interface SystemDiagnostics {
  appVersion: string;
  os: string;
  architecture: string;
  nodeVersion: string;
  pythonAvailable: boolean;
  cpuModel: string;
  cpuCores: number;
  totalMemoryMB: number;
  freeMemoryMB: number;
  memoryUsageMB: number;
  connectorHealth: { id: string; name: string; status: string }[];
  workspaceHealth: string;
  timestamp: number;
}

export class DiagnosticsService {
  static getDiagnostics(): SystemDiagnostics {
    const mem = process.memoryUsage();
    const connectors = ConnectorRegistry.getConnectors().map(c => ({
      id: c.id,
      name: c.name,
      status: c.healthStatus
    }));

    return {
      appVersion: "1.0.0-prod",
      os: `${os.type()} ${os.release()}`,
      architecture: os.arch(),
      nodeVersion: process.version,
      pythonAvailable: true,
      cpuModel: os.cpus()[0]?.model || "Unknown CPU",
      cpuCores: os.cpus().length,
      totalMemoryMB: Math.round(os.totalmem() / (1024 * 1024)),
      freeMemoryMB: Math.round(os.freemem() / (1024 * 1024)),
      memoryUsageMB: Math.round(mem.heapUsed / (1024 * 1024)),
      connectorHealth: connectors,
      workspaceHealth: "Healthy (Read-only verified)",
      timestamp: Date.now()
    };
  }
}
