import { ToolManager } from "./tool-manager.js";
import { SkillRegistry } from "../../skills/skill-registry.js";
import { ConnectorRegistry } from "./connectors.js";

export type CapabilityType = "system_tool" | "custom_skill" | "connector";

export interface CapabilityItem {
  id: string;
  name: string;
  type: CapabilityType;
  description: string;
  enabled: boolean;
}

export class CapabilityRegistry {
  static listAllCapabilities(): CapabilityItem[] {
    const list: CapabilityItem[] = [];

    // System Tools
    try {
      const tools = ToolManager.listTools();
      for (const t of tools) {
        list.push({
          id: `tool:${t.name}`,
          name: t.name,
          type: "system_tool",
          description: t.description,
          enabled: true
        });
      }
    } catch (err) {
      console.warn("Failed to retrieve tools for CapabilityRegistry:", err);
    }

    // Skills
    try {
      const skills = SkillRegistry.getSkills();
      for (const s of skills) {
        list.push({
          id: `skill:${s.id}`,
          name: s.name,
          type: "custom_skill",
          description: s.description,
          enabled: s.status === "enabled"
        });
      }
    } catch (err) {
      console.warn("Failed to retrieve skills for CapabilityRegistry:", err);
    }

    // Connectors
    try {
      const connectors = ConnectorRegistry.getConnectors();
      for (const c of connectors) {
        list.push({
          id: `connector:${c.id}`,
          name: c.name,
          type: "connector",
          description: c.capabilities.join(", "),
          enabled: c.connectionStatus === "connected"
        });
      }
    } catch (err) {
      console.warn("Failed to retrieve connectors for CapabilityRegistry:", err);
    }

    return list;
  }

  static getCapability(id: string): CapabilityItem | undefined {
    return this.listAllCapabilities().find((item) => item.id === id);
  }
}
