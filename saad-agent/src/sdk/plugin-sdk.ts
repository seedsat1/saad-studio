export type PluginPermission =
  | "filesystem.read"
  | "filesystem.write"
  | "network.read"
  | "network.write"
  | "provider.use"
  | "connector.use"
  | "workspace.modify";

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  permissions: PluginPermission[];
  entryPoint: string;
  enabled: boolean;
}

export class PluginSDK {
  private static registeredPlugins: Map<string, PluginManifest> = new Map();

  static registerPlugin(manifest: PluginManifest): boolean {
    if (this.registeredPlugins.has(manifest.id)) return false;
    this.registeredPlugins.set(manifest.id, manifest);
    return true;
  }

  static getPlugins(): PluginManifest[] {
    return Array.from(this.registeredPlugins.values());
  }

  static togglePlugin(pluginId: string, enabled: boolean): boolean {
    const plugin = this.registeredPlugins.get(pluginId);
    if (!plugin) return false;
    plugin.enabled = enabled;
    return true;
  }

  static verifyPermission(pluginId: string, permission: PluginPermission): boolean {
    const plugin = this.registeredPlugins.get(pluginId);
    if (!plugin || !plugin.enabled) return false;
    return plugin.permissions.includes(permission);
  }
}
