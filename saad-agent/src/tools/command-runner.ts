import { execSync } from "child_process";
import { CONFIG } from "../config.js";

export function runCommand(command: string): string {
  console.log(`$ ${command}`);
  try {
    const output = execSync(command, {
      cwd: CONFIG.PROJECT_ROOT,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    console.log(output);
    return output;
  } catch (error: any) {
    console.error(error.stdout?.toString() || error.stderr?.toString() || error.message);
    throw error;
  }
}

export function gitDiff(): string {
  try {
    return runCommand("git diff");
  } catch {
    return "No changes detected or not a git repository";
  }
}
