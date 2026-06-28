import { ContextEngine } from "./platform/services/context-engine.js";
import { EngineeringMemory } from "./platform/services/engineering-memory.js";
import { EventBus } from "./platform/services/event-bus.js";
import { CONFIG, setProjectRoot } from "./config.js";
import * as fs from "fs/promises";
import * as path from "path";
import assert from "assert";

async function runTests() {
  console.log("=== Saad Agent Phase 17 Context Engine & RAG Tests ===");

  const originalRoot = CONFIG.PROJECT_ROOT;
  const tempWorkspace = path.join(process.cwd(), "temp-test-rag-workspace");
  const testFile = path.join(tempWorkspace, "index.css");
  const secretFile = path.join(tempWorkspace, ".env");
  const secretsLog = path.join(tempWorkspace, "secrets.log");

  try {
    // Setup clean sandbox workspace
    await fs.rm(tempWorkspace, { recursive: true, force: true });
    await fs.mkdir(tempWorkspace, { recursive: true });

    // Create knowledge directories
    const knowledgeDir = path.join(tempWorkspace, ".saad-agent", "knowledge");
    const memoryDir = path.join(tempWorkspace, ".saad-agent", "memory");
    const attachmentsDir = path.join(tempWorkspace, ".saad-agent", "attachments");
    await fs.mkdir(knowledgeDir, { recursive: true });
    await fs.mkdir(memoryDir, { recursive: true });
    await fs.mkdir(attachmentsDir, { recursive: true });

    // Write metadata JSONs
    await fs.writeFile(
      path.join(knowledgeDir, "architecture.json"),
      JSON.stringify({ path: "/", type: "directory", name: "root", children: [{ path: "index.css", type: "file", name: "index.css" }] }),
      "utf8"
    );
    await fs.writeFile(
      path.join(knowledgeDir, "dependency-graph.json"),
      JSON.stringify({ dependencies: { postcss: "8.1.0" }, devDependencies: {}, modules: { "index.css": [] } }),
      "utf8"
    );
    await fs.writeFile(
      path.join(knowledgeDir, "project-summary.json"),
      JSON.stringify({ framework: "Vite", projectName: "Saad RAG" }),
      "utf8"
    );

    // Write source file & secret file
    await fs.writeFile(testFile, "body { background: #000; } /* class css-flex-container definition */", "utf8");
    await fs.writeFile(secretFile, "PORT=3000\nDATABASE_URL=postgres://user:password123@host:5432/db", "utf8");
    await fs.writeFile(secretsLog, "API_KEY=saad-secret-token-12345", "utf8");

    // Write a dummy attachment
    await fs.writeFile(path.join(attachmentsDir, "screenshot-dashboard.png"), "mock data", "utf8");

    setProjectRoot(tempWorkspace);
    ContextEngine.initialize();

    // Log historical decision and success in EngineeringMemory
    await EngineeringMemory.logDecision({
      workspace: "temp-test-rag-workspace",
      taskSummary: "Configured stylesheets structures",
      reasoning: "Separated index.css from core theme layouts.",
      filesAffected: ["index.css"],
      riskLevel: "low",
      outcome: "Applied styles cleanly."
    });
    await EngineeringMemory.logFailure({
      cause: "Stylesheet regression caused layout overflow",
      resolution: "Recovered by ranking index.css before unrelated files.",
      relatedFiles: ["index.css"]
    });
    await EngineeringMemory.logSuccess({
      type: "Context retrieval",
      description: "Semantic stylesheet retrieval preserved architecture and memory references.",
      relatedFiles: ["index.css"]
    });

    // 1. Relevance Ranking Scoring Matrix
    console.log("\n--- Test 1: Relevance Ranking Scoring Matrix ---");
    ContextEngine.addRecentModification("index.css");

    // Retrieve context for query "Configure index.css stylesheets and css-flex-container layout theme"
    const contextResult = await ContextEngine.retrieveContext(
      "Configure index.css stylesheets and css-flex-container layout theme screenshot-dashboard.png regression recovered retrieval",
      tempWorkspace
    );

    console.log("Total context items retrieved:", contextResult.items.length);
    console.log("Token usage:", contextResult.tokenUsage);
    console.log("Token limit:", contextResult.limit);
    console.log("Compression summary:", contextResult.compressionSummary);

    // Validate ranking priorities
    const ids = contextResult.items.map(i => i.id);
    console.log("Retrieved item IDs:", ids);
    console.log("High score file 'index.css' is present in retrieved context:", ids.includes("file:index.css"));
    console.log("Matched attachment metadata is present:", ids.includes("attachment-metadata:screenshot-dashboard.png"));
    console.log("Architecture reference is present:", ids.includes("architecture-ref"));
    console.log("Dependency reference is present:", ids.includes("dependency-ref"));
    assert(ids.includes("file:index.css"), "Expected ranked source file retrieval");
    assert(ids.includes("attachment-metadata:screenshot-dashboard.png"), "Expected attachment metadata retrieval");
    assert(ids.includes("architecture-ref"), "Expected architecture retrieval");
    assert(ids.includes("dependency-ref"), "Expected dependency retrieval");
    assert(contextResult.categories.retrievedFiles >= 1, "Expected retrieved files category");
    assert(contextResult.categories.previousDecisions >= 1, "Expected previous decision retrieval");
    assert(contextResult.categories.failureMemories >= 1, "Expected failure memory retrieval");
    assert(contextResult.categories.successMemories >= 1, "Expected success memory retrieval");
    assert(contextResult.categories.attachmentReferences >= 1, "Expected attachment retrieval category");
    assert(contextResult.rankingSummary.some((line) => line.includes("filename similarity") || line.includes("semantic similarity")), "Expected ranking reason examples");
    assert(contextResult.semanticIndexSummary.files >= 1, "Expected semantic file indexing");
    assert(contextResult.semanticIndexSummary.symbols >= 1, "Expected semantic symbol indexing");
    assert(contextResult.semanticIndexSummary.dependencies >= 1, "Expected dependency indexing summary");
    assert(contextResult.workspaceStats.candidateFiles >= 1, "Expected workspace candidate statistics");

    // 2. Secret Filtering Safety Constraints
    console.log("\n--- Test 2: Secret Filtering Safety Constraints ---");
    console.log("Sensitive file .env classification is true:", ContextEngine.isSensitiveFile(".env"));
    console.log("Sensitive file .env.local classification is true:", ContextEngine.isSensitiveFile(".env.local"));
    console.log("Sensitive file secrets.log classification is true:", ContextEngine.isSensitiveFile("secrets.log"));

    const envPresent = ids.some(id => id.includes(".env"));
    console.log("Is .env file included in context items (should be false):", envPresent);
    assert(!envPresent, "Context must not include .env files");
    
    const secretsLogPresent = ids.some(id => id.includes("secrets.log"));
    console.log("Is secrets.log file included in context items (should be false):", secretsLogPresent);
    assert(!secretsLogPresent, "Context must not include secret log files");

    // Validate scrubbing inside memory content
    const decisionItem = contextResult.items.find(i => i.id.startsWith("memory:decision:"));
    if (decisionItem) {
      console.log("Logged decision contains no credentials:", !decisionItem.content.includes("saad-secret"));
      assert(!decisionItem.content.includes("saad-secret"), "Memory context must not expose secrets");
    }

    // 3. Token Budget Trimming Optimization
    console.log("\n--- Test 3: Token Budget Trimming Optimization ---");
    // Retrieve with a very small token limit (e.g. 50 tokens) to trigger trimming
    const trimmedResult = await ContextEngine.retrieveContext(
      "Configure index.css stylesheets",
      tempWorkspace,
      50
    );
    console.log("Trimmed items count (should be very small):", trimmedResult.items.length);
    console.log("Trimmed token usage stays within 50 tokens budget:", trimmedResult.tokenUsage <= 50);
    console.log("Trimmed compression summary reports pruned matches:", trimmedResult.compressionSummary.includes("Trimmed"));
    assert(trimmedResult.tokenUsage <= 50, "Token optimizer must not exceed the provided limit");
    assert(trimmedResult.compressionSummary.includes("Preserved architecture"), "Compression summary should describe preservation rules");

    console.log("\n✅ All Phase 17 Context Engine & RAG tests completed successfully!");
  } catch (err) {
    console.error("Test execution failed:", err);
    process.exitCode = 1;
  } finally {
    setProjectRoot(originalRoot);
    await fs.rm(tempWorkspace, { recursive: true, force: true });
  }
}

runTests();
