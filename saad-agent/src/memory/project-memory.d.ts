export interface ProjectSummary {
    framework: string;
    packageManager: string;
    buildSystem: string;
    language: string;
    nodeVersion: string;
    lastScanned: number;
    projectName: string;
    version: string;
}
export interface ArchitectureNode {
    path: string;
    type: "file" | "directory" | "module" | "api" | "component" | "service";
    name: string;
    purpose?: string;
    dependencies?: string[];
    children?: ArchitectureNode[];
}
export interface DependencyGraph {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    modules: Record<string, string[]>;
}
export interface TaskHistoryEntry {
    id: string;
    timestamp: number;
    task: string;
    status: "completed" | "failed" | "pending";
    filesChanged: string[];
    summary: string;
}
export interface ProjectMemory {
    summary: ProjectSummary;
    architecture: ArchitectureNode;
    dependencies: DependencyGraph;
    taskHistory: TaskHistoryEntry[];
    lastUpdated: number;
    fileHashes?: Record<string, string>;
}
export declare class ProjectMemoryStore {
    private memory;
    load(): Promise<void>;
    save(): Promise<void>;
    get(): ProjectMemory;
    updateSummary(summary: Partial<ProjectSummary>): void;
    updateArchitecture(architecture: ArchitectureNode): void;
    updateDependencies(dependencies: Partial<DependencyGraph>): void;
    addTaskHistory(entry: TaskHistoryEntry): void;
    isFresh(): boolean;
}
//# sourceMappingURL=project-memory.d.ts.map