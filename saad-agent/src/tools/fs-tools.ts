import * as fs from "fs/promises";
import * as path from "path";
import { CONFIG } from "../config.js";

export async function listFiles(dirPath: string = "."): Promise<string[]> {
  const fullPath = path.resolve(CONFIG.PROJECT_ROOT, dirPath);
  const entries = await fs.readdir(fullPath, { withFileTypes: true });
  
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name === ".next" || entry.name === ".saad-agent" || entry.name === "dist" || entry.name === "build") continue;
      const subFiles = await listFiles(path.join(dirPath, entry.name));
      files.push(...subFiles);
    } else {
      files.push(path.join(dirPath, entry.name));
    }
  }
  
  return files;
}

export async function readFile(filePath: string): Promise<string> {
  const fullPath = path.resolve(CONFIG.PROJECT_ROOT, filePath);
  return fs.readFile(fullPath, "utf8");
}

export async function searchText(pattern: string, dirPath: string = "."): Promise<string[]> {
  const files = await listFiles(dirPath);
  const matches: string[] = [];
  const regex = new RegExp(pattern, "i");

  for (const file of files) {
    try {
      const content = await readFile(file);
      if (regex.test(content)) {
        matches.push(file);
      }
    } catch {}
  }

  return matches;
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  const fullPath = path.resolve(CONFIG.PROJECT_ROOT, filePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, "utf8");
}
