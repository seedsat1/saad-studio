#!/usr/bin/env node

import { SaadAgent } from "./agent.js";
import chalk from "chalk";

async function main() {
  console.log(chalk.blue("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
  console.log(chalk.blue("                      SAAD STUDIO AGENT"));
  console.log(chalk.blue("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"));

  const task = process.argv.slice(2).join(" ") || "Analyze this project and summarize the framework, scripts, and build command from package.json";
  
  const agent = new SaadAgent();
  await agent.runTask(task);
}

main().catch(console.error);
