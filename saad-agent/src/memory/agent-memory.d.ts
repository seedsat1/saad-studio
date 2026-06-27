export interface MemoryEntry {
    id: string;
    type: "decision" | "task" | "implementation" | "failure" | "fix" | "convention" | "preference" | "provider" | "architecture" | "pattern" | "frequency";
    title: string;
    content: string;
    tags: string[];
    importance: number;
    timestamp: number;
    checkpointId?: string;
}
export declare class AgentMemoryStore {
    private entries;
    load(): Promise<void>;
    save(): Promise<void>;
    getEntries(): MemoryEntry[];
    addEntry(entry: Omit<MemoryEntry, "id" | "timestamp">): MemoryEntry;
    search(query: string, typeFilter?: string): MemoryEntry[];
    compress(): void;
}
//# sourceMappingURL=agent-memory.d.ts.map