import * as fs from "fs/promises";
import { existsSync } from "fs";
import * as path from "path";
import { createHash } from "crypto";
import { CONFIG } from "../config.js";
import { ProjectMemoryStore } from "../memory/project-memory.js";
import { listFiles, readFile } from "../tools/fs-tools.js";
export class ProjectScanner {
    async scan() {
        console.log("�� Scanning project structure...");
        const [summary, architecture, dependencies, fileHashes] = await Promise.all([
            this.scanSummary(),
            this.scanArchitecture(),
            this.scanDependencies(),
            this.scanFileHashes(),
        ]);
        console.log("✅ Project scan completed");
        return { summary, architecture, dependencies, fileHashes };
    }
    async scanFileHashes() {
        const files = await listFiles();
        const fileHashes = {};
        for (const file of files) {
            try {
                fileHashes[file] = await this.computeFileHash(file);
            }
            catch {
                fileHashes[file] = "";
            }
        }
        return fileHashes;
    }
    async computeFileHash(filePath) {
        const content = await readFile(filePath);
        return createHash("sha256").update(content).digest("hex");
    }
    async refresh(memoryStore) {
        const memory = memoryStore.get();
        const hasLegacyMtimes = "fileMtimes" in memory || "fileMtimes" in memoryStore.get();
        // If memory is not initialized, missing key structure, or contains legacy fileMtimes, do a full scan
        if (!memory.fileHashes || hasLegacyMtimes || !memory.architecture || !memory.dependencies || !memory.summary) {
            if (hasLegacyMtimes) {
                console.log("�� Legacy fileMtimes schema detected. Upgrading database to fileHashes...");
                delete memory.fileMtimes;
                delete memoryStore.get().fileMtimes;
            }
            else {
                console.log("⚠️ Memory metadata missing, performing full scan...");
            }
            const scanResult = await this.scan();
            memoryStore.updateSummary(scanResult.summary);
            memoryStore.updateArchitecture(scanResult.architecture);
            memoryStore.updateDependencies(scanResult.dependencies);
            delete memoryStore.get().fileMtimes;
            memoryStore.get().fileHashes = scanResult.fileHashes;
            await memoryStore.save();
            console.log("✅ Database schema upgraded to fileHashes successfully");
            return true;
        }
        console.log("�� Detecting project changes incrementally via hashing...");
        const currentFiles = await listFiles();
        const currentFileHashes = {};
        const addedFiles = [];
        const modifiedFiles = [];
        const deletedFiles = [];
        // Get current hashes and compare
        for (const file of currentFiles) {
            try {
                const hash = await this.computeFileHash(file);
                currentFileHashes[file] = hash;
                const oldHash = memory.fileHashes[file];
                if (oldHash === undefined) {
                    addedFiles.push(file);
                }
                else if (hash !== oldHash) {
                    modifiedFiles.push(file);
                }
            }
            catch {
                currentFileHashes[file] = "";
            }
        }
        // Check for deleted files
        for (const file of Object.keys(memory.fileHashes)) {
            if (!(file in currentFileHashes)) {
                deletedFiles.push(file);
            }
        }
        const hasChanges = addedFiles.length > 0 || modifiedFiles.length > 0 || deletedFiles.length > 0;
        if (!hasChanges) {
            console.log("✨ No changes detected. Knowledge base is up to date.");
            // Just update summary lastScanned time
            memoryStore.updateSummary({ lastScanned: Date.now() });
            await memoryStore.save();
            return false;
        }
        console.log(`�� Changes detected: ${addedFiles.length} added, ${modifiedFiles.length} modified, ${deletedFiles.length} deleted.`);
        // 1. Update Architecture
        const updatedArch = this.updateArchitectureIncrementally(memory.architecture, addedFiles, modifiedFiles, deletedFiles);
        memoryStore.updateArchitecture(updatedArch);
        // 2. Update Dependencies
        const updatedDeps = await this.updateDependenciesIncrementally(memory.dependencies, addedFiles, modifiedFiles, deletedFiles);
        memoryStore.updateDependencies(updatedDeps);
        // 3. Update Summary
        const packageJsonChanged = addedFiles.includes("package.json") || modifiedFiles.includes("package.json");
        if (packageJsonChanged) {
            const summaryUpdate = await this.scanSummary();
            memoryStore.updateSummary(summaryUpdate);
        }
        else {
            memoryStore.updateSummary({ lastScanned: Date.now() });
        }
        // 4. Update stored file hashes
        memoryStore.get().fileHashes = currentFileHashes;
        await memoryStore.save();
        console.log("✅ Incremental knowledge base update completed");
        return true;
    }
    updateArchitectureIncrementally(root, addedFiles, modifiedFiles, deletedFiles) {
        // For deleted files, prune them from the tree
        for (const file of deletedFiles) {
            this.removeFromArchitectureTree(root, file);
        }
        // For added files, graft them to the tree
        for (const file of addedFiles) {
            this.addToArchitectureTree(root, file);
        }
        // For modified files, update their type if needed
        for (const file of modifiedFiles) {
            this.updateArchitectureNode(root, file);
        }
        return root;
    }
    removeFromArchitectureTree(root, filePath) {
        const parts = filePath.split("/").filter(Boolean);
        let current = root;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (part === undefined)
                return;
            const isLast = i === parts.length - 1;
            if (!current.children)
                return;
            if (isLast) {
                current.children = current.children.filter((c) => c.name !== part);
            }
            else {
                const next = current.children.find((c) => c.name === part);
                if (!next)
                    return;
                current = next;
            }
        }
        this.pruneEmptyDirectories(root);
    }
    pruneEmptyDirectories(node) {
        if (node.type !== "directory" || !node.children) {
            return false;
        }
        node.children = node.children.filter((child) => {
            if (child.type === "directory") {
                const isEmpty = this.pruneEmptyDirectories(child);
                return !isEmpty;
            }
            return true;
        });
        return node.children.length === 0;
    }
    updateArchitectureNode(root, filePath) {
        const parts = filePath.split("/").filter(Boolean);
        let current = root;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (part === undefined)
                return;
            const isLast = i === parts.length - 1;
            if (!current.children)
                return;
            const next = current.children.find((c) => c.name === part);
            if (!next)
                return;
            if (isLast) {
                next.type = this.getFileType(part);
            }
            else {
                current = next;
            }
        }
    }
    async updateDependenciesIncrementally(existing, addedFiles, modifiedFiles, deletedFiles) {
        const packageJsonChanged = addedFiles.includes("package.json") || modifiedFiles.includes("package.json");
        let dependencies = existing.dependencies;
        let devDependencies = existing.devDependencies;
        if (packageJsonChanged) {
            try {
                const packageJson = JSON.parse(await readFile("package.json"));
                dependencies = packageJson.dependencies || {};
                devDependencies = packageJson.devDependencies || {};
            }
            catch (e) {
                console.error("Failed to parse package.json during incremental dependencies scan", e);
            }
        }
        const modules = { ...existing.modules };
        for (const file of deletedFiles) {
            delete modules[file];
        }
        const jsTsRegex = /\.(ts|tsx|js|jsx)$/;
        const filesToScan = [...addedFiles, ...modifiedFiles].filter(f => jsTsRegex.test(f));
        for (const file of filesToScan) {
            try {
                const content = await readFile(file);
                modules[file] = this.extractImports(content);
            }
            catch {
                // Skip files that cannot be read
            }
        }
        return {
            dependencies,
            devDependencies,
            modules,
        };
    }
    extractImports(content) {
        const imports = [];
        const importFromRegex = /(?:import|export)\s+[\s\S]*?\s+from\s+['"]([^'"]+)['"]/g;
        const importSimpleRegex = /import\s+['"]([^'"]+)['"]/g;
        const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
        let match;
        while ((match = importFromRegex.exec(content)) !== null) {
            if (match[1] && !imports.includes(match[1])) {
                imports.push(match[1]);
            }
        }
        while ((match = importSimpleRegex.exec(content)) !== null) {
            if (match[1] && !imports.includes(match[1])) {
                imports.push(match[1]);
            }
        }
        while ((match = requireRegex.exec(content)) !== null) {
            if (match[1] && !imports.includes(match[1])) {
                imports.push(match[1]);
            }
        }
        return imports;
    }
    async scanSummary() {
        const packageJson = JSON.parse(await readFile("package.json"));
        return {
            framework: this.detectFramework(packageJson),
            packageManager: this.detectPackageManager(),
            buildSystem: this.detectBuildSystem(packageJson),
            language: "TypeScript",
            nodeVersion: process.version,
            lastScanned: Date.now(),
            projectName: packageJson.name || "unknown",
            version: packageJson.version || "0.0.0",
        };
    }
    detectFramework(packageJson) {
        if (packageJson.dependencies?.next)
            return "Next.js";
        if (packageJson.dependencies?.react)
            return "React";
        if (packageJson.dependencies?.vue)
            return "Vue";
        if (packageJson.dependencies?.express)
            return "Express";
        return "unknown";
    }
    detectPackageManager() {
        try {
            if (existsSync(path.join(CONFIG.PROJECT_ROOT, "pnpm-lock.yaml")))
                return "pnpm";
            if (existsSync(path.join(CONFIG.PROJECT_ROOT, "yarn.lock")))
                return "yarn";
        }
        catch { }
        return "npm";
    }
    detectBuildSystem(packageJson) {
        if (packageJson.scripts?.build?.includes("next"))
            return "Next.js";
        if (packageJson.scripts?.build?.includes("vite"))
            return "Vite";
        if (packageJson.scripts?.build?.includes("tsc"))
            return "TypeScript";
        if (packageJson.scripts?.build?.includes("webpack"))
            return "Webpack";
        return "unknown";
    }
    async scanArchitecture() {
        const root = {
            path: "/",
            type: "directory",
            name: "root",
            children: [],
        };
        const files = await listFiles();
        for (const file of files) {
            this.addToArchitectureTree(root, file);
        }
        return root;
    }
    addToArchitectureTree(root, filePath) {
        const parts = filePath.split("/").filter(Boolean);
        let current = root;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (part === undefined)
                return;
            const isLast = i === parts.length - 1;
            let child = current.children?.find((c) => c.name === part);
            if (!child) {
                const newChild = {
                    path: parts.slice(0, i + 1).join("/"),
                    type: isLast ? this.getFileType(part) : "directory",
                    name: part,
                    ...(isLast ? {} : { children: [] }),
                };
                if (!current.children)
                    current.children = [];
                current.children.push(newChild);
                child = newChild;
            }
            current = child;
        }
    }
    getFileType(filename) {
        if (filename.endsWith(".ts") || filename.endsWith(".tsx"))
            return "module";
        if (filename.endsWith(".js") || filename.endsWith(".jsx"))
            return "module";
        if (filename.includes("api") || filename.includes("route"))
            return "api";
        if (filename.includes("component"))
            return "component";
        if (filename.includes("service"))
            return "service";
        return "file";
    }
    async scanDependencies() {
        const packageJson = JSON.parse(await readFile("package.json"));
        return {
            dependencies: packageJson.dependencies || {},
            devDependencies: packageJson.devDependencies || {},
            modules: {},
        };
    }
}
//# sourceMappingURL=project-scanner.js.map