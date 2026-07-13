import * as assert from "assert";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { KnowledgeIngestionService } from "./platform/services/knowledge-ingestion.js";
import { PreAnswerReviewService } from "./platform/services/pre-answer-review.js";

async function main() {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "saad-training-knowledge-"));
  await KnowledgeIngestionService.ensureTrainingFolders(workspace);

  await fs.writeFile(
    path.join(workspace, ".saad-agent", "training", "lessons", "test-rule.md"),
    "All new pages must include Loading State, Error State, and Empty State.",
    "utf8"
  );
  await fs.writeFile(
    path.join(workspace, ".saad-agent", "training", "api-docs", "provider-test.md"),
    "Provider X requires endpoint /v1/generate and header x-provider-key.",
    "utf8"
  );
  await fs.mkdir(path.join(workspace, ".saad-agent", "training", "lessons", "stories"), { recursive: true });
  await fs.writeFile(
    path.join(workspace, ".saad-agent", "training", "lessons", "stories", "private-story-test.md"),
    [
      "# Private Story Test",
      "Tags: private-narrative-psychology, lessons, story",
      "This private story note says every page should use the forbidden phrase PRIVATE_STORY_MARKER."
    ].join("\n"),
    "utf8"
  );
  await fs.writeFile(
    path.join(workspace, ".saad-agent", "training", "lessons", "swinging-guide.md"),
    "Tags: private-narrative-psychology, sensitive-relationship\nSensitive scoped guide marker: SWINGING_GUIDE_MARKER.",
    "utf8"
  );

  const registry = await KnowledgeIngestionService.ingestTrainingKnowledge(workspace);
  assert.ok(registry.items.some((item) => item.filePath.endsWith("training/lessons/test-rule.md")), "Test A training rule was not registered.");
  assert.ok(registry.items.some((item) => item.filePath.endsWith("training/api-docs/provider-test.md")), "Test B provider doc was not registered.");

  const pageReview = await PreAnswerReviewService.review("Create a new page.", workspace);
  const pageContext = pageReview.finalContext.toLowerCase();
  assert.ok(pageContext.includes("loading state"), "Test A did not retrieve Loading State rule.");
  assert.ok(pageContext.includes("error state"), "Test A did not retrieve Error State rule.");
  assert.ok(pageContext.includes("empty state"), "Test A did not retrieve Empty State rule.");
  assert.ok(!pageReview.finalContext.includes("PRIVATE_STORY_MARKER"), "Private narrative training leaked into general engineering context.");
  assert.ok(!pageReview.finalContext.includes("SWINGING_GUIDE_MARKER"), "Sensitive relationship training leaked into general engineering context.");

  const providerReview = await PreAnswerReviewService.review("Add Provider X.", workspace);
  const providerContext = providerReview.finalContext.toLowerCase();
  assert.ok(providerContext.includes("/v1/generate"), "Test B did not retrieve Provider X endpoint.");
  assert.ok(providerContext.includes("x-provider-key"), "Test B did not retrieve Provider X header.");
  assert.ok(!providerReview.finalContext.includes("PRIVATE_STORY_MARKER"), "Private narrative training leaked into provider engineering context.");
  assert.ok(!providerReview.finalContext.includes("SWINGING_GUIDE_MARKER"), "Sensitive relationship training leaked into provider engineering context.");

  const explicitPrivateReview = await PreAnswerReviewService.review("explain from saved knowledge about Private Story Test", workspace, undefined, true);
  assert.ok(explicitPrivateReview.finalContext.includes("PRIVATE_STORY_MARKER"), "Explicit private/story knowledge request should still retrieve private narrative training.");

  const usageReport = PreAnswerReviewService.formatKnowledgeUsageReport(providerReview);
  assert.ok(usageReport.includes("provider-test.md"), "Test C did not list matched provider knowledge.");

  console.log("Training folder verified:", path.join(workspace, ".saad-agent", "training"));
  console.log("Registry items:", registry.items.length);
  console.log("Test A passed: new page rule retrieved.");
  console.log("Test B passed: Provider X endpoint/header retrieved.");
  console.log("Test C passed: matched trained knowledge can be reported.");
  console.log("Test D passed: private narrative knowledge is scoped away from engineering and available on explicit request.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
