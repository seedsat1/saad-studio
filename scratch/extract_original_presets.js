const fs = require('fs');
const readline = require('readline');
const path = require('path');

async function main() {
  const logPath = 'C:/Users/PC/.gemini/antigravity/brain/d11411c8-315e-4519-b1f9-e88661ff8491/.system_generated/logs/transcript.jsonl';
  if (!fs.existsSync(logPath)) {
    console.error("Transcript file not found at: " + logPath);
    return;
  }
  const fileStream = fs.createReadStream(logPath);
  
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  console.log("Searching transcript for cinematic presets layout blocks...");
  for await (const line of rl) {
    if (line.includes('cms-cinematic-styles') && line.includes('presetMedia') && line.includes('supabase.co')) {
      const idx = line.indexOf('presetMedia');
      if (idx !== -1) {
        console.log("Found line mentioning presetMedia and supabase.co!");
        const start = Math.max(0, idx - 100);
        const end = Math.min(line.length, idx + 3000);
        console.log("Snippet:", line.substring(start, end));
        console.log("========================================\n");
      }
    }
  }
}

main().catch(console.error);
