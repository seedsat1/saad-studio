import { SkillRegistry } from "./skills/skill-registry.js";
import { ContextEngine } from "./platform/services/context-engine.js";
import { CONFIG, setProjectRoot } from "./config.js";
import * as fs from "fs/promises";
import * as path from "path";

async function runTests() {
  console.log("=== Saad Agent Phase 19 Skills System & Domain Expertise Layer Tests ===");

  const originalRoot = CONFIG.PROJECT_ROOT;
  const tempWorkspace = path.join(process.cwd(), "temp-test-skills-workspace");

  try {
    await fs.rm(tempWorkspace, { recursive: true, force: true });
    await fs.mkdir(tempWorkspace, { recursive: true });
    setProjectRoot(tempWorkspace);

    // 1. Skill Discovery & Registration
    console.log("\n--- Test 1: Skill Discovery & Registration ---");
    const skills = SkillRegistry.getSkills();
    console.log("Total registered skills count:", skills.length);
    console.log("12 initial built-in skills present:", skills.length >= 12);
    
    const tsSkill = SkillRegistry.getSkill("skill-typescript");
    const reactSkill = SkillRegistry.getSkill("skill-react");
    const premiereSkill = SkillRegistry.getSkill("skill-adobe-premiere-cep");
    console.log("Found TypeScript Skill:", tsSkill !== undefined);
    console.log("Found React Skill:", reactSkill !== undefined);
    console.log("Found Adobe Premiere CEP Skill:", premiereSkill !== undefined);

    // 2. Trigger & File Pattern Matching Precision
    console.log("\n--- Test 2: Trigger Matching Precision ---");
    // Match for React components task
    const reactMatches = SkillRegistry.matchSkillsForTask("Refactor App.tsx useState hooks rendering", ["App.tsx"]);
    console.log("React task matched skills count:", reactMatches.length);
    const topReactMatch = reactMatches[0];
    console.log("Top matched skill for React task:", topReactMatch?.skill.name);
    console.log("Activation confidence score:", topReactMatch?.confidence);
    console.log("Matched triggers list:", topReactMatch?.matchedTriggers);

    // Match for Premiere CEP timeline task
    const cepMatches = SkillRegistry.matchSkillsForTask("Synchronize Premiere CEP ExtendScript timeline clips", ["manifest.xml"]);
    console.log("\nPremiere CEP task matched skills count:", cepMatches.length);
    const topCepMatch = cepMatches[0];
    console.log("Top matched skill for CEP task:", topCepMatch?.skill.name);
    console.log("Activation confidence score:", topCepMatch?.confidence);

    // 3. ContextEngine RAG Integration
    console.log("\n--- Test 3: ContextEngine Skill Rules Retrieval ---");
    const contextResult = await ContextEngine.retrieveContext(
      "Optimize FFmpeg audio waveform extraction transcode script",
      tempWorkspace
    );
    const skillItem = contextResult.items.find(i => i.id.startsWith("skill-ref:"));
    console.log("Skill rules candidate included in context result:", skillItem !== undefined);
    if (skillItem) {
      console.log("Retrieved skill item title:", skillItem.title);
      console.log("Retrieved skill rules content preview:", skillItem.content.split("\n")[0]);
    }

    // 4. Secret Isolation Verification
    console.log("\n--- Test 4: Secret Isolation Verification ---");
    let containsSecrets = false;
    for (const sk of skills) {
      const str = JSON.stringify(sk).toLowerCase();
      if (str.includes("password") || str.includes("api_key") || str.includes("secret")) {
        containsSecrets = true;
      }
    }
    console.log("Skill definitions contain no secret footprints (should be false):", containsSecrets);

    // 5. Unregister & Dynamic Registration
    console.log("\n--- Test 5: Unregister & Dynamic Registration ---");
    const unregistered = SkillRegistry.unregisterSkill("skill-python");
    console.log("Successfully unregistered Python skill:", unregistered);
    console.log("Skills count after unregistration:", SkillRegistry.getSkills().length);

    console.log("\n✅ All Phase 19 Skills System tests completed successfully!");
  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    setProjectRoot(originalRoot);
    await fs.rm(tempWorkspace, { recursive: true, force: true });
  }
}

runTests();
