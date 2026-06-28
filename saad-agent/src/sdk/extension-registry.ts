export type ExtensionType = "agent" | "skill" | "connector" | "creative_provider" | "tool" | "workflow";

export interface ExtensionItem {
  id: string;
  name: string;
  type: ExtensionType;
  version: string;
  description: string;
  enabled: boolean;
  author: string;
}

export class ExtensionRegistry {
  private static extensions: Map<string, ExtensionItem> = new Map();

  static registerExtension(ext: ExtensionItem): void {
    this.extensions.set(ext.id, ext);
  }

  static getExtensions(type?: ExtensionType): ExtensionItem[] {
    if (this.extensions.size === 0) {
      // Seed initial extensions registry
      this.registerExtension({
        id: "ext-agent-devops",
        name: "DevOps Automation Agent",
        type: "agent",
        version: "1.0.0",
        description: "Custom SDK Agent for CI/CD pipeline automation",
        enabled: true,
        author: "Community"
      });
      this.registerExtension({
        id: "ext-skill-docker",
        name: "Docker Containerization Skill",
        type: "skill",
        version: "1.2.0",
        description: "Domain expertise guidelines for container builds",
        enabled: true,
        author: "Saad Studio"
      });
    }

    const list = Array.from(this.extensions.values());
    if (type) {
      return list.filter(e => e.type === type);
    }
    return list;
  }

  static toggleExtension(id: string, enabled: boolean): boolean {
    const ext = this.extensions.get(id);
    if (!ext) return false;
    ext.enabled = enabled;
    return true;
  }
}
