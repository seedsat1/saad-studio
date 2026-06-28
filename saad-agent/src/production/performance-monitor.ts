import * as os from "os";
import { CONFIG } from "../config.js";
import { SkillRegistry } from "../skills/skill-registry.js";

export interface PerformanceMetrics {
  cpuLoadPercentage: number;
  memoryUsedMB: number;
  memoryTotalMB: number;
  activeContextTokens: number;
  maxContextLimit: number;
  registeredSkillsCount: number;
  queuedTasksCount: number;
  timestamp: number;
}

export class PerformanceMonitor {
  static getMetrics(currentContextTokens: number = 150, queuedTasksCount: number = 0): PerformanceMetrics {
    const mem = process.memoryUsage();
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += (cpu.times as any)[type];
      }
      totalIdle += cpu.times.idle;
    }
    const idlePercentage = totalTick > 0 ? (totalIdle / totalTick) * 100 : 80;
    const cpuLoadPercentage = Math.round(Math.max(0, Math.min(100, 100 - idlePercentage)));

    return {
      cpuLoadPercentage,
      memoryUsedMB: Math.round(mem.heapUsed / (1024 * 1024)),
      memoryTotalMB: Math.round(os.totalmem() / (1024 * 1024)),
      activeContextTokens: currentContextTokens,
      maxContextLimit: CONFIG.MAX_CONTEXT_TOKENS || 8192,
      registeredSkillsCount: SkillRegistry.getSkills().length,
      queuedTasksCount,
      timestamp: Date.now()
    };
  }
}
