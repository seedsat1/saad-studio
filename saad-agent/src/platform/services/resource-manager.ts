import * as os from "os";

export interface ResourceUsageInfo {
  cpuUsagePercent: number;
  totalMemoryBytes: number;
  freeMemoryBytes: number;
  usedMemoryBytes: number;
  gpuUsagePercent?: number;
  totalVramBytes?: number;
  freeVramBytes?: number;
  diskTotalBytes: number;
  diskFreeBytes: number;
}

export class ResourceManager {
  static async getResourceUsage(): Promise<ResourceUsageInfo> {
    const cpus = os.cpus();
    // Standard system core workload calculation
    const loadAvg = os.loadavg();
    const primaryLoad = loadAvg[0] ?? 0;
    const cpuUsagePercent = Math.min(
      100,
      Math.max(0, Math.round((primaryLoad / cpus.length) * 100))
    );

    const totalMemoryBytes = os.totalmem();
    const freeMemoryBytes = os.freemem();
    const usedMemoryBytes = totalMemoryBytes - freeMemoryBytes;

    // GPU and VRAM properties mapped as standard baseline mocks
    const gpuUsagePercent = 8;
    const totalVramBytes = 8192 * 1024 * 1024; // 8 GB
    const freeVramBytes = 6144 * 1024 * 1024; // 6 GB

    // Disk space storage specs mapped as mock allocations
    const diskTotalBytes = 512000 * 1024 * 1024; // 512 GB
    const diskFreeBytes = 286000 * 1024 * 1024;

    return {
      cpuUsagePercent,
      totalMemoryBytes,
      freeMemoryBytes,
      usedMemoryBytes,
      gpuUsagePercent,
      totalVramBytes,
      freeVramBytes,
      diskTotalBytes,
      diskFreeBytes,
    };
  }
}
