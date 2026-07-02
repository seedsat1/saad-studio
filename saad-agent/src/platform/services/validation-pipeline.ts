import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { SmartSpellReviewService } from "./smart-spell-review.js";

export interface ValidationResult {
  passed: boolean;
  typeCheck: boolean;
  lintCheck: boolean;
  buildCheck: boolean;
  ruleCheck: boolean;
  diffReview: boolean;
  spellCheck: boolean;
  issues: string[];
  outputLogs: string;
}

export class ValidationPipelineService {
  static validateGeneratedCode(code: string, rules: string[] = [], workspacePath = process.cwd()): ValidationResult {
    const issues: string[] = [];
    let typeCheck = true;
    let lintCheck = true;
    let buildCheck = true;
    let ruleCheck = true;
    let diffReview = true;
    let spellCheck = true;
    let outputLogs = "";

    if (code.includes("<<<<<<<") || code.includes(">>>>>>>")) {
      diffReview = false;
      issues.push("Code contains unresolved git merge conflicts.");
    }

    if (/(?:api[_-]?key|secret|password|token)\s*[:=]\s*["'][a-zA-Z0-9_-]{16,}["']/i.test(code)) {
      ruleCheck = false;
      issues.push("Code contains hardcoded credentials or API keys.");
    }

    for (const rule of rules) {
      if (rule.includes("Brave") && code.includes("GoogleSearch")) {
        ruleCheck = false;
        issues.push(`Code violates stored rule: ${rule}`);
      }
    }

    // 1. TypeScript Verification
    try {
      const tscOut = execSync("npx tsc --noEmit", { cwd: workspacePath, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      outputLogs += `\n[tsc]: PASS\n${tscOut}`;
    } catch (err: any) {
      typeCheck = false;
      const msg = err.stdout || err.stderr || err.message;
      issues.push(`TypeScript typecheck failed: ${String(msg).substring(0, 200)}`);
      outputLogs += `\n[tsc]: FAIL\n${msg}`;
    }

    // Read package.json to check scripts
    let hasLint = false;
    let hasBuild = false;
    try {
      const pkgPath = path.join(workspacePath, "package.json");
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        hasLint = Boolean(pkg.scripts?.lint);
        hasBuild = Boolean(pkg.scripts?.build);
      }
    } catch {
      // ignore
    }

    // 2. Lint Verification (if script exists)
    if (hasLint) {
      try {
        const lintOut = execSync("npm run lint", { cwd: workspacePath, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
        outputLogs += `\n[lint]: PASS\n${lintOut}`;
      } catch (err: any) {
        lintCheck = false;
        const msg = err.stdout || err.stderr || err.message;
        issues.push(`Lint failed: ${String(msg).substring(0, 200)}`);
        outputLogs += `\n[lint]: FAIL\n${msg}`;
      }
    }

    // 3. Build Verification (if script exists)
    if (hasBuild) {
      try {
        const buildOut = execSync("npm run build", { cwd: workspacePath, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
        outputLogs += `\n[build]: PASS\n${buildOut}`;
      } catch (err: any) {
        buildCheck = false;
        const msg = err.stdout || err.stderr || err.message;
        issues.push(`Build failed: ${String(msg).substring(0, 200)}`);
        outputLogs += `\n[build]: FAIL\n${msg}`;
      }
    }

    // 4. Smart Naming & Spelling Review
    const spellReport = SmartSpellReviewService.reviewContent(code, "generated-code.ts");
    spellCheck = spellReport.passed;
    outputLogs += `\n\n${SmartSpellReviewService.formatReport(spellReport)}`;

    for (const issue of spellReport.issues) {
      issues.push(`Spelling/Naming: ${issue.reason} in "${issue.identifierText}" -> Suggestion: "${issue.suggestedFix}" (${issue.severity})`);
    }

    const passed = typeCheck && lintCheck && buildCheck && ruleCheck && diffReview;

    return {
      passed,
      typeCheck,
      lintCheck,
      buildCheck,
      ruleCheck,
      diffReview,
      spellCheck,
      issues,
      outputLogs: outputLogs.trim(),
    };
  }
}
