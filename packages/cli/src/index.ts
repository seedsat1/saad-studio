#!/usr/bin/env node
import { Command } from "commander";

import {
  balanceCommand,
  generateImageCommand,
  generateVideoCommand,
  generationsCommand,
  loginCommand,
  logoutCommand,
  modelsCommand,
  whoamiCommand,
} from "./commands.js";

const program = new Command();

program
  .name("saadstudio")
  .description("Saad Studio — generate images and videos from your terminal.")
  .version("0.1.1");

program
  .command("login")
  .description("Sign in through your browser and save a token to ~/.saadstudio/token.json.")
  .option("--no-browser", "Print the authorize URL instead of launching a browser")
  .action((opts: { browser?: boolean }) => run(loginCommand({ noBrowser: opts.browser === false })));

program
  .command("logout")
  .description("Delete the saved token.")
  .action(() => run(logoutCommand()));

program
  .command("whoami")
  .description("Show the current session info.")
  .action(() => run(whoamiCommand()));

program
  .command("balance")
  .description("Show your Saad Studio credit balance.")
  .option("--json", "Emit raw JSON")
  .action((opts: { json?: boolean }) => run(balanceCommand(opts)));

const generate = program
  .command("generate")
  .description("Generate an image or a video.");

generate
  .command("image <prompt>")
  .description("Generate an image and print the URL(s).")
  .option("-m, --model <id>", "Model id (see: saadstudio models --kind image)")
  .option("-a, --aspect <ratio>", "Aspect ratio (e.g. 16:9, 1:1)")
  .option("-r, --resolution <label>", "Resolution label (e.g. 1K, 2K, 4K)")
  .option("-n, --num <count>", "Number of images (1-4)")
  .option("--negative <prompt>", "Negative prompt")
  .option("--ref <url>", "Reference image URL")
  .option("-o, --out <path>", "Save first image to this file")
  .option("--json", "Emit raw JSON")
  .action((prompt: string, opts) => run(generateImageCommand(prompt, opts)));

generate
  .command("video <prompt>")
  .description("Generate a video and print the URL when ready.")
  .option("-m, --model <id>", "Model id (see: saadstudio models --kind video)")
  .option("-i, --image <url>", "First-frame image URL (for image-to-video)")
  .option("-d, --duration <sec>", "Duration in seconds")
  .option("-a, --aspect <ratio>", "Aspect ratio (e.g. 16:9, 9:16, 1:1)")
  .option("-r, --resolution <label>", "Resolution label (e.g. 720p, 1080p)")
  .option("-o, --out <path>", "Save video to this file")
  .option("--json", "Emit raw JSON")
  .action((prompt: string, opts) => run(generateVideoCommand(prompt, opts)));

program
  .command("generations")
  .alias("history")
  .description("List your recent generations.")
  .option("-l, --limit <count>", "How many to show (1-100)")
  .option("-k, --kind <kind>", "Filter by kind: image | video | audio")
  .option("--json", "Emit raw JSON")
  .action((opts) => run(generationsCommand(opts)));

program
  .command("models")
  .description("List available image and video models.")
  .option("-k, --kind <kind>", "Filter by kind: image | video")
  .option("--json", "Emit raw JSON")
  .action((opts) => run(modelsCommand(opts)));

program.parseAsync(process.argv).catch((err: Error) => {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
});

function run(p: Promise<unknown>): void {
  p.catch((err: Error) => {
    process.stderr.write(`Error: ${err.message}\n`);
    process.exit(1);
  });
}
