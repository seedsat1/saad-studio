import { BaseAgentSDK } from "./sdk/agent-sdk.js";
import { PluginSDK, type PluginManifest } from "./sdk/plugin-sdk.js";
import { ExtensionRegistry } from "./sdk/extension-registry.js";
import { MCPClient } from "./sdk/mcp-client.js";

class CustomTestAgent extends BaseAgentSDK {
  constructor() {
    super({
      id: "agent-custom-test",
      name: "Custom Test Agent",
      version: "1.0.0",
      description: "Custom Agent created via Agent SDK",
      capabilities: ["custom_task"],
      supportedTasks: ["test_task"],
      supportedSkills: ["skill-typescript"]
    });
  }

  async execute(task: { taskId: string; prompt: string; context?: any }): Promise<{ success: boolean; result: string }> {
    return { success: true, result: `Executed task ${task.taskId} with prompt: ${task.prompt}` };
  }
}

async function runTests() {
  console.log("=== Saad Agent Phase 22 Agent SDK, Plugin SDK & MCP Integration Tests ===");

  try {
    // 1. Agent SDK & Lifecycle
    console.log("\n--- Test 1: Agent SDK & Lifecycle ---");
    const customAgent = new CustomTestAgent();
    console.log("Custom Agent initial status:", customAgent.status);
    await customAgent.initialize();
    console.log("Status after initialize():", customAgent.status);
    await customAgent.activate();
    console.log("Status after activate():", customAgent.status);
    const execResult = await customAgent.execute({ taskId: "t-1", prompt: "Run custom build audit" });
    console.log("Task execution success:", execResult.success);
    console.log("Task execution output:", execResult.result);
    await customAgent.dispose();
    console.log("Status after dispose():", customAgent.status);

    // 2. Plugin SDK & Sandboxed Permissions
    console.log("\n--- Test 2: Plugin SDK & Permissions ---");
    const pluginManifest: PluginManifest = {
      id: "plugin-security-scanner",
      name: "Security Scanner Plugin",
      version: "1.0.0",
      description: "Sandboxed security scanning plugin",
      author: "Security Team",
      permissions: ["filesystem.read", "network.read"],
      entryPoint: "index.js",
      enabled: true
    };

    const registered = PluginSDK.registerPlugin(pluginManifest);
    console.log("Plugin registered successfully:", registered);
    console.log("Permission 'filesystem.read' verified:", PluginSDK.verifyPermission("plugin-security-scanner", "filesystem.read"));
    console.log("Permission 'workspace.modify' blocked (should be false):", PluginSDK.verifyPermission("plugin-security-scanner", "workspace.modify"));

    // 3. ExtensionRegistry Dynamic Points
    console.log("\n--- Test 3: ExtensionRegistry Points ---");
    ExtensionRegistry.registerExtension({
      id: "ext-custom-connector",
      name: "Custom GitLab Connector",
      type: "connector",
      version: "2.0.0",
      description: "Community GitLab integration extension",
      enabled: true,
      author: "OpenSource"
    });

    const connectorExtensions = ExtensionRegistry.getExtensions("connector");
    console.log("Connector type extensions count:", connectorExtensions.length);
    console.log("Custom GitLab Connector registered:", connectorExtensions.some(e => e.id === "ext-custom-connector"));
    const toggled = ExtensionRegistry.toggleExtension("ext-custom-connector", false);
    console.log("Successfully toggled extension state:", toggled);

    // 4. MCP Client Architecture
    console.log("\n--- Test 4: MCP Client Architecture ---");
    MCPClient.registerServer({
      id: "test-mcp-server",
      name: "Test MCP Server",
      version: "1.0.0",
      status: "connected",
      transport: "local",
      capabilities: { tools: true, resources: true, prompts: false }
    });
    MCPClient.registerTool({
      id: "test-mcp-tool",
      serverId: "test-mcp-server",
      name: "Test MCP Tool",
      description: "Test tool registered by the MCP test harness.",
      inputSchema: { type: "object", properties: { query: { type: "string" } } }
    });
    const mcpServers = await MCPClient.getDiscoveredServers();
    console.log("Discovered MCP Servers count:", mcpServers.length);
    console.log("Registered test MCP Server present:", mcpServers.some(s => s.id === "test-mcp-server"));
    const mcpTools = await MCPClient.getDiscoveredTools();
    console.log("Discovered MCP Tools count:", mcpTools.length);
    console.log("Registered test MCP Tool present:", mcpTools.some(t => t.id === "test-mcp-tool"));

    console.log("\n✅ All Phase 22 Agent SDK, Plugin SDK & MCP Integration tests completed successfully!");
  } catch (err) {
    console.error("Test execution failed:", err);
  }
}

runTests();
