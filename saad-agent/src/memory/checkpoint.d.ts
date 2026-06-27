export interface Checkpoint {
    id: string;
    timestamp: number;
    description: string;
    filesBackup: string[];
}
export declare class CheckpointManager {
    create(description: string, filesToBackup: string[]): Promise<Checkpoint>;
    restore(id: string): Promise<boolean>;
    list(): Promise<Checkpoint[]>;
}
//# sourceMappingURL=checkpoint.d.ts.map