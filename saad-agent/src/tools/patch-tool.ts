import * as diff from "diff";
import * as fs from "fs/promises";
import * as path from "path";
import chalk from "chalk";
import inquirer from "inquirer";
import { CONFIG } from "../config.js";

export async function proposePatch(filePath: string, newContent: string): Promise<boolean> {
  const fullPath = path.resolve(CONFIG.PROJECT_ROOT, filePath);
  
  let oldContent = "";
  try {
    oldContent = await fs.readFile(fullPath, "utf8");
  } catch {
    // File does not exist yet
  }

  const changes = diff.createPatch(filePath, oldContent, newContent);
  
  console.log(chalk.yellow("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
  console.log(chalk.yellow(`PROPOSED CHANGES FOR: ${filePath}`));
  console.log(chalk.yellow("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"));

  const lines = changes.split("\n");
  for (const line of lines) {
    if (line.startsWith("+")) {
      console.log(chalk.green(line));
    } else if (line.startsWith("-")) {
      console.log(chalk.red(line));
    } else if (line.startsWith("@")) {
      console.log(chalk.cyan(line));
    } else {
      console.log(line);
    }
  }

  console.log("\n");

  const { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: "Apply this patch?",
      default: false,
    },
  ]);

  if (confirm) {
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, newContent, "utf8");
    console.log(chalk.green("✅ Patch applied successfully"));
    return true;
  } else {
    console.log(chalk.yellow("❌ Patch rejected"));
    return false;
  }
}
