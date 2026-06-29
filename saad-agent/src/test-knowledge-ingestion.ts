import assert from "assert";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { KnowledgeIngestionService } from "./platform/services/knowledge-ingestion.js";
import { ContextEngine } from "./platform/services/context-engine.js";

async function runTests() {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "saad-knowledge-"));
  await fs.mkdir(path.join(workspace, "docs"), { recursive: true });
  await fs.mkdir(path.join(workspace, ".saad-agent", "knowledge"), { recursive: true });

  await fs.writeFile(
    path.join(workspace, "docs", "rag-system.md"),
    "The Context Engine uses local semantic retrieval, architecture preservation, token budgeting, and engineering memory.",
    "utf8"
  );
  await fs.writeFile(path.join(workspace, ".env"), "API_KEY=should-not-index", "utf8");

  await KnowledgeIngestionService.rebuildIndex(workspace);
  const matches = await KnowledgeIngestionService.search(workspace, "semantic retrieval token budgeting", 3);
  assert.ok(matches.length >= 1);
  const topMatch = matches[0];
  assert.ok(topMatch);
  assert.ok(topMatch.sourcePath.includes("rag-system.md"));

  const context = await ContextEngine.retrieveContext("semantic retrieval token budgeting", workspace, 2000);
  assert.ok(context.items.some((item) => item.id.startsWith("knowledge:")));
  assert.ok(!context.items.some((item) => item.content.includes("should-not-index")));

  console.log("Knowledge ingestion tests passed.");
}

runTests().catch((err) => {
  console.error("Knowledge ingestion tests failed:", err);
  process.exit(1);
});
