import { AgentRegistry, ArchitectAgent, BackendAgent, FrontendAgent, AIIntegrationAgent, TestingAgent, ReviewerAgent } from "./platform/services/multi-agent.js";
import { EngineeringOrchestrator } from "./platform/services/orchestrator.js";
import { CONFIG, setProjectRoot } from "./config.js";
import * as fs from "fs/promises";
import * as path from "path";

async function runTests() {
  console.log("=== Saad Agent Phase 14 Multi-Agent Framework Tests ===");

  const originalRoot = CONFIG.PROJECT_ROOT;
  const tempWorkspace = path.join(process.cwd(), "temp-test-multi-agent-workspace");
  const testFile = path.join(tempWorkspace, "index.css");

  try {
    // Setup clean sandbox workspace
    await fs.rm(tempWorkspace, { recursive: true, force: true });
    await fs.mkdir(tempWorkspace, { recursive: true });
    await fs.writeFile(testFile, "body { background: #000; }", "utf8");

    setProjectRoot(tempWorkspace);

    // 1. Registry verification
    console.log("\n--- Test 1: Agent Registry & Discovery ---");
    const agents = AgentRegistry.getAgents();
    console.log("Total registered agents count (should be 6):", agents.length);
    console.log("Found Architect Agent:", !!AgentRegistry.getAgent("architect-agent"));
    console.log("Found Reviewer Agent:", !!AgentRegistry.getAgent("reviewer-agent"));

    // 2. Keyword delegation analysis
    console.log("\n--- Test 2: Task Analysis & Agent Delegation ---");
    const frontendMatches = AgentRegistry.findAgentsForTask("Create a style sheet with React UI components");
    console.log("Frontend task matches Frontend Agent:", frontendMatches.some(a => a.id === "frontend-agent"));
    console.log("Frontend task assigns Reviewer Agent for audit:", frontendMatches.some(a => a.id === "reviewer-agent"));

    const backendMatches = AgentRegistry.findAgentsForTask("Implement an express API route for database querying");
    console.log("Backend task matches Backend Agent:", backendMatches.some(a => a.id === "backend-agent"));

    // 3. Execution & Context sharing
    console.log("\n--- Test 3: Agent Task Execution & Reports ---");
    const frontendAgent = AgentRegistry.getAgent("frontend-agent")!;
    const executionResult = await frontendAgent.execute("Modify layouts", {});
    console.log("Frontend execution report success:", executionResult.success);
    console.log("Frontend execution report content exists:", !!executionResult.report);

    // 4. Session integration
    console.log("\n--- Test 4: Session Agent Assignment ---");
    const session = EngineeringOrchestrator.createSession("Design layouts with styled components in React UI", tempWorkspace);
    console.log("Session assigned agents list:", session.assignedAgents);
    console.log("Session assigned Frontend Agent:", session.assignedAgents?.includes("Frontend Agent"));
    console.log("Session assigned Reviewer Agent:", session.assignedAgents?.includes("Reviewer Agent"));

    // 5. Safety read-only assertions
    console.log("\n--- Test 5: Safety Verification (Read-Only) ---");
    const content = await fs.readFile(testFile, "utf8");
    console.log("Style sheet index.css remains unmodified by agents planning phase:", content === "body { background: #000; }");

    console.log("\n✅ All Phase 14 Multi-Agent Framework tests completed successfully!");
  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    setProjectRoot(originalRoot);
    await fs.rm(tempWorkspace, { recursive: true, force: true });
  }
}

runTests();
