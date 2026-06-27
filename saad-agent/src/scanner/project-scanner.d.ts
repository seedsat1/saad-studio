import type { ArchitectureNode, DependencyGraph, ProjectSummary } from "../memory/project-memory.js";
import { ProjectMemoryStore } from "../memory/project-memory.js";
export declare class ProjectScanner {
    scan(): Promise<{
        summary: ProjectSummary;
        architecture: ArchitectureNode;
        dependencies: DependencyGraph;
        fileHashes: Record<string, string>;
    }>;
    private scanFileHashes;
    private computeFileHash;
    refresh(memoryStore: ProjectMemoryStore): Promise<boolean>;
    private updateArchitectureIncrementally;
    private removeFromArchitectureTree;
    private pruneEmptyDirectories;
    private updateArchitectureNode;
    private updateDependenciesIncrementally;
    private extractImports;
    private scanSummary;
    private detectFramework;
    private detectPackageManager;
    private detectBuildSystem;
    private scanArchitecture;
    private addToArchitectureTree;
    private getFileType;
    private scanDependencies;
}
//# sourceMappingURL=project-scanner.d.ts.map