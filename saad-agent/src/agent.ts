import { LLMClient } from "./llm-client.js";
import { listFiles, readFile, searchText, writeFile } from "./tools/fs-tools.js";
import { proposePatch } from "./tools/patch-tool.js";
import { runCommand, gitDiff } from "./tools/command-runner.js";
import { ProjectMemoryStore } from "./memory/project-memory.js";
import { ProjectScanner } from "./scanner/project-scanner.js";
import chalk from "chalk";
import inquirer from "inquirer";

const SYSTEM_PROMPT = `
You are Saad Studio Maintenance Agent.
You are a senior software engineer maintaining this Next.js project.

RULES:
1. Always analyze the project structure first
2. Read files before making changes
3. Always show diffs before applying changes
4. Never modify .env files or secrets
5. Explain your reasoning clearly
6. Break large changes into small patches
7. Run build commands to verify changes
8. Use git diff to show what was changed

AVAILABLE TOOLS:
- listFiles: list all files in project
- readFile: read content of a file
- searchText: search for text pattern across files
- proposePatch: edit file with diff preview
- runCommand: execute shell commands
- gitDiff: show git changes

You will be given tasks. Think step by step, use tools, and complete the task.
`;

export class SaadAgent {
  private llm: LLMClient;
  private memory: ProjectMemoryStore;
  private scanner: ProjectScanner;

  constructor() {
    this.llm = new LLMClient();
    this.memory = new ProjectMemoryStore();
    this.scanner = new ProjectScanner();
  }

  async runTask(task: string): Promise<void> {
    console.log(chalk.blue(`\n�� Saad Agent starting task: ${task}\n`));

    await this.memory.load();

    const memory = this.memory.get();
    const isCorruptedOrMissing = 
      !memory.architecture?.children || 
      !memory.dependencies?.dependencies || 
      !memory.summary?.projectName || 
      memory.summary.projectName === "unknown";

    if (isCorruptedOrMissing) {
      console.log(chalk.gray("�� Building project knowledge base from scratch..."));
      const scanResult = await this.scanner.scan();
      this.memory.updateSummary(scanResult.summary);
      this.memory.updateArchitecture(scanResult.architecture);
      this.memory.updateDependencies(scanResult.dependencies);
      this.memory.get().fileHashes = scanResult.fileHashes;
      await this.memory.save();
      console.log(chalk.green("✅ Project knowledge base built"));
    } else {
      console.log(chalk.gray("�� Refreshing project knowledge base incrementally..."));
      await this.scanner.refresh(this.memory);
    }

    let context = `
Project Summary:
  Name: ${memory.summary.projectName}
  Version: ${memory.summary.version}
  Framework: ${memory.summary.framework}
  Package Manager: ${memory.summary.packageManager}
  Build System: ${memory.summary.buildSystem}
  Last Scanned: ${new Date(memory.summary.lastScanned).toLocaleString()}
`;

    const response = await this.llm.chat(SYSTEM_PROMPT, `
Task: ${task}

Project context:
${context}

Analyze this project and complete the task.
`);

    console.log(chalk.green("\n✅ Agent response:\n"));
    console.log(response);
    console.log("\n");

    // Interactive loop
    while (true) {
      const { action } = await inquirer.prompt([
        {
          type: "list",
          name: "action",
          message: "What would you like to do next?",
          choices: [
            "Read file",
            "Search text",
            "Run command",
            "Show git diff",
            "Exit",
          ],
        },
      ]);

      if (action === "Exit") break;

      if (action === "Read file") {
        const { filePath } = await inquirer.prompt([
          { type: "input", name: "filePath", message: "Enter file path:" },
        ]);
        const content = await readFile(filePath);
        console.log(`\n${content}\n`);
      }

      if (action === "Search text") {
        const { pattern } = await inquirer.prompt([
          { type: "input", name: "pattern", message: "Enter search pattern:" },
        ]);
        const matches = await searchText(pattern);
        console.log(`\nFound in ${matches.length} files:\n${matches.join("\n")}\n`);
      }

      if (action === "Run command") {
        const { command } = await inquirer.prompt([
          { type: "input", name: "command", message: "Enter command:" },
        ]);
        runCommand(command);
      }

      if (action === "Show git diff") {
        console.log(gitDiff());
      }
    }
  }
}
