import fs from "fs";
import path from "path";

const REGISTRY_PATH = path.join(process.cwd(), ".data/voice_samples_registry.json");

export function getRegistry(): Record<string, string> {
  try {
    if (fs.existsSync(REGISTRY_PATH)) {
      return JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
    }
  } catch (e) {
    console.error("Error reading registry:", e);
  }
  return {};
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
