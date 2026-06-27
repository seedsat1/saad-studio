import * as fs from "fs/promises";
import * as path from "path";
import { CONFIG } from "../config.js";
const MEMORY_DIR = path.join(CONFIG.PROJECT_ROOT, ".saad-agent");
const DEFAULT_MEMORY = {
    summary: {
        framework: "unknown",
        packageManager: "unknown",
        buildSystem: "unknown",
        language: "unknown",
        nodeVersion: "unknown",
        lastScanned: 0,
        projectName: "unknown",
        version: "0.0.0",
    },
    architecture: {
        path: "/",
        type: "directory",
        name: "root",
        children: [],
    },
    dependencies: {
        dependencies: {},
        devDependencies: {},
        modules: {},
    },
    taskHistory: [],
    lastUpdated: 0,
    fileHashes: {},
};
export class ProjectMemoryStore {
    memory = DEFAULT_MEMORY;
    async load() {
        const legacyDir = path.join(CONFIG.PROJECT_ROOT, ".saad-agent");
        const knowledgeDir = path.join(CONFIG.PROJECT_ROOT, ".saad-agent", "knowledge");
        // Check if files exist in knowledge/ directory
        let useLegacy = false;
        try {
            await fs.access(path.join(knowledgeDir, "memory.json"));
        }
        catch {
            useLegacy = true;
        }
        const currentDir = useLegacy ? legacyDir : knowledgeDir;
        const memoryPath = path.join(currentDir, "memory.json");
        const archPath = path.join(currentDir, "architecture.json");
        const depPath = path.join(currentDir, "dependency-graph.json");
        const sumPath = path.join(currentDir, "project-summary.json");
        try {
            const [memoryData, archData, depData, sumData] = await Promise.all([
                fs.readFile(memoryPath, "utf8"),
                fs.readFile(archPath, "utf8"),
                fs.readFile(depPath, "utf8"),
                fs.readFile(sumPath, "utf8"),
            ]);
            const memory = JSON.parse(memoryData);
            const architecture = JSON.parse(archData);
            const dependencies = JSON.parse(depData);
            const summary = JSON.parse(sumData);
            this.memory = {
                ...memory,
                architecture,
                dependencies,
                summary,
            };
            if (useLegacy) {
                console.log("🔄 Migrating legacy knowledge base directory to knowledge/ subfolder...");
                await this.save(); // writes to knowledgeDir
                const legacyFiles = ["memory.json", "architecture.json", "dependency-graph.json", "project-summary.json"];
                for (const file of legacyFiles) {
                    try {
                        await fs.unlink(path.join(legacyDir, file));
                    }
                    catch { }
                }
            }
        }
        catch {
            try {
                const memoryData = await fs.readFile(memoryPath, "utf8");
                this.memory = JSON.parse(memoryData);
            }
            catch {
                this.memory = DEFAULT_MEMORY;
            }
        }
    }
    async save() {
        const knowledgeDir = path.join(CONFIG.PROJECT_ROOT, ".saad-agent", "knowledge");
        await fs.mkdir(knowledgeDir, { recursive: true });
        this.memory.lastUpdated = Date.now();
        const memoryPath = path.join(knowledgeDir, "memory.json");
        const archPath = path.join(knowledgeDir, "architecture.json");
        const depPath = path.join(knowledgeDir, "dependency-graph.json");
        const sumPath = path.join(knowledgeDir, "project-summary.json");
        await Promise.all([
            fs.writeFile(memoryPath, JSON.stringify(this.memory, null, 2), "utf8"),
            fs.writeFile(archPath, JSON.stringify(this.memory.architecture, null, 2), "utf8"),
            fs.writeFile(depPath, JSON.stringify(this.memory.dependencies, null, 2), "utf8"),
            fs.writeFile(sumPath, JSON.stringify(this.memory.summary, null, 2), "utf8"),
        ]);
    }
    get() {
        return this.memory;
    }
    updateSummary(summary) {
        this.memory.summary = { ...this.memory.summary, ...summary };
    }
    updateArchitecture(architecture) {
        this.memory.architecture = architecture;
    }
    updateDependencies(dependencies) {
        this.memory.dependencies = { ...this.memory.dependencies, ...dependencies };
    }
    addTaskHistory(entry) {
        this.memory.taskHistory.unshift(entry);
        if (this.memory.taskHistory.length > 100) {
            this.memory.taskHistory = this.memory.taskHistory.slice(0, 100);
        }
    }
    isFresh() {
        const age = Date.now() - this.memory.lastUpdated;
        return age < 24 * 60 * 60 * 1000; // 24 hours
    }
}
//# sourceMappingURL=project-memory.js.map