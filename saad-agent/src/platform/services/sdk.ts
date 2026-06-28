import { ExtensionRegistry } from "../../sdk/extension-registry.js";
import { PluginSDK } from "../../sdk/plugin-sdk.js";
import { MCPClient } from "../../sdk/mcp-client.js";

export class SDKService {
  static getExtensions(type?: any) {
    return ExtensionRegistry.getExtensions(type);
  }

  static toggleExtension(id: string, enabled: boolean) {
    return ExtensionRegistry.toggleExtension(id, enabled);
  }

  static getPlugins() {
    return PluginSDK.getPlugins();
  }

  static listMCPServers() {
    return MCPClient.getServers();
  }

  static discoverMCPServers() {
    return MCPClient.discoverAll();
  }

  static discoverMCPTools() {
    return MCPClient.getDiscoveredTools();
  }

  static upsertMCPServer(server: any) {
    return MCPClient.upsertServer(server);
  }

  static removeMCPServer(serverId: string) {
    return MCPClient.removeServer(serverId);
  }

  static testMCPServer(serverIdOrConfig: string | any) {
    return MCPClient.testServer(serverIdOrConfig);
  }

  static setMCPServerEnabled(serverId: string, enabled: boolean) {
    return MCPClient.setServerEnabled(serverId, enabled);
  }

  static restartMCPServer(serverId: string) {
    return MCPClient.restartServer(serverId);
  }

  static setMCPToolPermission(serverId: string, toolId: string, permission: "always" | "ask" | "never", enabled: boolean) {
    return MCPClient.setToolPermission(serverId, toolId, permission, enabled);
  }
}
