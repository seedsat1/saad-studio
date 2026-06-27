import { EventBus } from "./platform/services/event-bus.js";
import type { AppEvent } from "./platform/services/event-bus.js";
import { ToolManager } from "./platform/services/tool-manager.js";
import type { Tool } from "./platform/services/tool-manager.js";
import { ContextManager } from "./platform/services/context-manager.js";
import type { ContextItem, ContextPayload } from "./platform/services/context-manager.js";
import { TokenManager } from "./platform/services/token-manager.js";
import { ProviderHealthMonitor } from "./platform/services/health-monitor.js";
import { WorkflowEngine } from "./platform/services/workflow-engine.js";
import type { WorkflowDefinition } from "./platform/services/workflow-engine.js";
import { ResourceManager } from "./platform/services/resource-manager.js";
import { JobScheduler } from "./platform/services/job-scheduler.js";
import type { Job } from "./platform/services/job-scheduler.js";

async function runTests() {
  console.log("=== Saad Agent Phase 5 Platform Services Tests ===");

  try {
    // 1. Event Bus Test
    console.log("\n--- Test 1: Event Bus ---");
    let eventReceived: any = null;
    const unsubscribe = EventBus.subscribe("test-event", (evt) => {
      eventReceived = evt;
    });

    await EventBus.publish("test-event", { value: "hello-event-bus" });
    console.log("Event received:", !!eventReceived);
    console.log("Event payload:", eventReceived?.payload?.value);
    
    unsubscribe();
    eventReceived = null;
    await EventBus.publish("test-event", { value: "should-not-receive" });
    console.log("Event received after unsubscribe (should be null):", eventReceived);

    // 2. Tool Manager Test
    console.log("\n--- Test 2: Tool Manager ---");
    const mockTool: Tool = {
      definition: {
        name: "mock-calculator",
        description: "adds two numbers",
        parameters: {},
        permissions: ["read", "write"],
        approvalRequired: false,
      },
      execute: async (args: { a: number; b: number }) => args.a + args.b,
    };
    
    ToolManager.registerTool(mockTool);
    const tool = ToolManager.getTool("mock-calculator");
    console.log("Tool registered successfully:", !!tool);
    
    // Execute with valid permissions
    const resSuccess = await ToolManager.execute("mock-calculator", { a: 5, b: 10 }, { permissions: ["read", "write"] });
    console.log("Execution success result (5 + 10):", resSuccess);

    // Execute with missing permissions
    try {
      await ToolManager.execute("mock-calculator", { a: 5, b: 10 }, { permissions: ["read"] });
      console.log("Error: executed tool without required permissions (Test FAILED)");
    } catch (err: any) {
      console.log("Correctly caught permission rejection:", err.message.includes("Permission denied"));
    }

    // 3. Context Manager Test
    console.log("\n--- Test 3: Context Manager ---");
    const mockItems: ContextItem[] = [
      { id: "1", source: "file", title: "file.js", content: "const a = 1;", tokensEstimate: 4 },
      { id: "2", source: "memory", title: "memory-1", content: "Remember to build first", tokensEstimate: 6 },
    ];
    
    // Test basic assembly
    const payload = await ContextManager.assembleContext(mockItems);
    console.log("Assembled total tokens:", payload.totalTokens);
    console.log("Assembled items count:", payload.items.length);

    // Test compression hook
    ContextManager.registerCompressionHook(async (p: ContextPayload) => {
      return {
        items: p.items.map(item => ({ ...item, content: "[COMPRESSED]" })),
        totalTokens: p.totalTokens / 2,
      };
    });
    const compressed = await ContextManager.assembleContext(mockItems);
    console.log("Compressed items content:", compressed.items[0]?.content);
    console.log("Compressed tokens:", compressed.totalTokens);

    // 4. Token Manager Test
    console.log("\n--- Test 4: Token Manager ---");
    const sampleText = "This is a sample text for token estimation.";
    const estimated = TokenManager.estimateTokens(sampleText);
    console.log("Estimated tokens (43 chars):", estimated);

    const budget = TokenManager.getBudgetInfo(100, 150);
    console.log("Remaining tokens (150 limit, 100 estimated):", budget.remainingTokens);
    console.log("Is over budget (should be false):", budget.isOverBudget);

    const chunks = TokenManager.chunkText(sampleText, 5); // 5 tokens ~ 20 chars
    console.log("Chunked texts count:", chunks.length);
    console.log("First chunk:", chunks[0]);

    // 5. Provider Health Monitor Test
    console.log("\n--- Test 5: Provider Health Monitor ---");
    ProviderHealthMonitor.registerProvider("custom-service", async () => ({
      name: "Custom Service",
      status: "online",
      details: "Running fine locally",
    }));
    
    const health = await ProviderHealthMonitor.checkProviderHealth("custom-service");
    console.log("Custom provider status:", health.status);
    console.log("Custom provider details:", health.details);

    // 6. Workflow Engine Test
    console.log("\n--- Test 6: Workflow Engine ---");
    const mockWorkflow: WorkflowDefinition = {
      id: "test-pipeline",
      name: "Test Pipeline",
      steps: [
        { id: "step-1", name: "Build Project", action: "npm run build" },
        { id: "step-2", name: "Test Project", action: "npm test", dependsOn: ["step-1"] },
      ],
    };
    
    WorkflowEngine.registerWorkflow(mockWorkflow);
    const session = WorkflowEngine.createSession("test-pipeline", { branch: "main" });
    console.log("Session created:", !!session);
    
    const state = WorkflowEngine.getSessionState(session);
    console.log("Workflow status (should be idle):", state?.status);
    console.log("Workflow variable (branch):", state?.variables?.branch);

    WorkflowEngine.updateSessionState(session, { status: "running", currentStepIndex: 1 });
    const updatedState = WorkflowEngine.getSessionState(session);
    console.log("Updated workflow status:", updatedState?.status);
    console.log("Updated step index:", updatedState?.currentStepIndex);

    // 7. Resource Manager Test
    console.log("\n--- Test 7: Resource Manager ---");
    const resources = await ResourceManager.getResourceUsage();
    console.log("CPU Usage populated:", typeof resources.cpuUsagePercent === "number");
    console.log("Total Memory bytes populated:", typeof resources.totalMemoryBytes === "number");
    console.log("Mock GPU Usage percentage:", resources.gpuUsagePercent);
    console.log("Mock Disk Free bytes:", resources.diskFreeBytes);

    // 8. Job Scheduler Test
    console.log("\n--- Test 8: Job Scheduler ---");
    JobScheduler.addJob({ id: "job-1", name: "Low priority job", priority: "low", payload: {} });
    JobScheduler.addJob({ id: "job-2", name: "Critical priority job", priority: "critical", payload: {} });
    JobScheduler.addJob({ id: "job-3", name: "High priority job", priority: "high", payload: {} });

    const queue = JobScheduler.getQueue();
    console.log("Sorted queue jobs (should be sorted by critical -> high -> low):");
    console.log("1st Job:", queue[0]?.priority);
    console.log("2nd Job:", queue[1]?.priority);
    console.log("3rd Job:", queue[2]?.priority);

    JobScheduler.pause();
    console.log("Scheduler paused status:", JobScheduler.isQueuePaused());

    JobScheduler.cancelJob("job-1");
    console.log("Job status updated to cancelled:", JobScheduler.getJob("job-1")?.status === "cancelled");

    console.log("\n✅ All Phase 5 Platform Services tests completed successfully!");
  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    // Cleanup registries
    EventBus.clearAll();
    ToolManager.clearRegistry();
    ContextManager.clearCompressionHooks();
    ProviderHealthMonitor.clearRegisteredProviders();
    WorkflowEngine.clearRegistry();
    JobScheduler.clearQueue();
  }
}

runTests();
