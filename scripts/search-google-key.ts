import fs from "fs";
import path from "path";
import readline from "readline";

async function searchFile(filePath: string, convId: string) {
  if (!fs.existsSync(filePath)) return;
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    if (
      (line.includes("GOOGLE_API_KEY") || line.includes("GEMINI_API_KEY")) &&
      !line.includes("replace_me") &&
      !line.includes("process.env")
    ) {
      console.log(`[CONV: ${convId}] Found match in ${path.basename(filePath)} L${lineNum}:`);
      console.log(`  ${line.substring(0, 300)}...`);
    }
  }
}

async function main() {
  const brainDir = "C:\\Users\\PC\\.gemini\\antigravity\\brain";
  if (!fs.existsSync(brainDir)) {
    console.error("Brain directory not found");
    return;
  }

  const dirs = fs.readdirSync(brainDir);
  for (const dir of dirs) {
    const fullPath = path.join(brainDir, dir);
    if (fs.statSync(fullPath).isDirectory()) {
      const logsDir = path.join(fullPath, ".system_generated", "logs");
      if (fs.existsSync(logsDir)) {
        await searchFile(path.join(logsDir, "transcript.jsonl"), dir);
        await searchFile(path.join(logsDir, "transcript_full.jsonl"), dir);
      }
    }
  }
}

main().catch(err => console.error(err));
