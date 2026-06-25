const fs = require('fs');
const readline = require('readline');

async function main() {
  const logPath = 'C:/Users/PC/.gemini/antigravity/brain/d11411c8-315e-4519-b1f9-e88661ff8491/.system_generated/logs/transcript_full.jsonl';
  if (!fs.existsSync(logPath)) {
    console.error("Transcript file not found at: " + logPath);
    return;
  }
  const fileStream = fs.createReadStream(logPath);
  
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  console.log("Searching full transcript for the original PageLayout blocks...");
  let found = false;
  for await (const line of rl) {
    // Look for where we query the DB or print the LayoutBlocks before the write operation
    if (line.includes('cms-cinematic-styles') && line.includes('presetMedia') && line.includes('supabase.co')) {
      // Find the specific step where LayoutBlocks was printed by check_cinematic_presets.js
      if (line.includes('Layout pageName: cms-cinematic-styles') && !line.includes('fix-cinematic-styles')) {
        console.log("Found original LayoutBlocks in transcript!");
        
        // Extract the JSON block
        const startIdx = line.indexOf('LayoutBlocks:');
        if (startIdx !== -1) {
          const content = line.substring(startIdx);
          console.log(content);
          found = true;
          break;
        }
      }
    }
  }
  
  if (!found) {
    console.log("Could not find the exact original check output. Scanning generally for first presetMedia instance...");
    fileStream.close();
    
    const fileStream2 = fs.createReadStream(logPath);
    const rl2 = readline.createInterface({
      input: fileStream2,
      crlfDelay: Infinity
    });
    
    for await (const line of rl2) {
      if (line.includes('presetMedia') && line.includes('supabase.co') && line.includes('noir') && line.includes('canvas')) {
        // Let's find index
        const idx = line.indexOf('presetMedia');
        console.log("Generic match found!");
        console.log(line.substring(idx - 100, idx + 5000));
        break;
      }
    }
  }
}

main().catch(console.error);
