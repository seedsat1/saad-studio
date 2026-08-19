import fs from "fs";
import path from "path";

const REGISTRY_PATH = path.join(process.cwd(), ".data/voice_samples_registry.json");

export const GOOGLE_GEMINI_VOICE_NAMES = [
  "Zephyr", "Puck", "Charon", "Kore", "Fenrir", "Leda", "Orus", "Aoede", "Callirrhoe", "Autonoe",
  "Enceladus", "Iapetus", "Umbriel", "Algieba", "Despina", "Erinome", "Algenib", "Rasalgethi",
  "Laomedeia", "Achernar", "Alnilam", "Schedar", "Gacrux", "Pulcherrima", "Achird", "Zubenelgenubi",
  "Vindemiatrix", "Sadachbia", "Sadaltager", "Sulafat",
];

export function getRegistry(): Record<string, string> {
  const baseRegistry: Record<string, string> = {};

  // Seed default permanent media URLs for all Gemini voices so they are guaranteed to exist on any serverless deployment
  for (const v of GOOGLE_GEMINI_VOICE_NAMES) {
    const url = `/api/media/audio/sample_${v.toLowerCase()}.mp3`;
    baseRegistry[v] = url;
    baseRegistry[`${v}_ar`] = url;
    baseRegistry[`voice-preview:google:${v.toLowerCase()}:ar`] = url;
  }

  try {
    if (fs.existsSync(REGISTRY_PATH)) {
      const fileData = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
      return { ...baseRegistry, ...fileData };
    }
  } catch (e) {
    console.error("Error reading registry:", e);
  }
  return baseRegistry;
}

export function saveRegistry(registry: Record<string, string>) {
  try {
    const dir = path.dirname(REGISTRY_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf8");
  } catch (e) {
    console.error("Error writing registry:", e);
  }
}
