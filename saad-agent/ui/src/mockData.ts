import type { Attachment } from "./attachments.js";

export interface Message {
  id: string;
  sender: "user" | "agent";
  timestamp: string;
  content: string;
  attachments?: Attachment[] | undefined;
  cardType?:
    | "project-analysis"
    | "execution-plan"
    | "affected-files"
    | "diff-preview"
    | "approval-buttons"
    | "execution-logs"
    | "build-results"
    | "retry-status"
    | "final-report"
    | "checkpoint"
    | "memory-updated"
    | "vision-analysis"
    | "plan-approval"
    | "engineering-memory"
    | "creative-plan"
    | "generated-asset";
  cardData?: any;
}

export const MOCK_PROVIDERS = [
  { name: "LM Studio", model: "Qwen3-Coder-30B-Instruct-GGUF", active: true, ping: "12ms" },
  { name: "Ollama", model: "deepseek-coder:14b", active: false, ping: "Offline" },
  { name: "Gemini Local", model: "gemini-2.5-flash-local", active: false, ping: "Offline" },
];

export interface ModelRole {
  role: "Coding" | "Vision" | "Fast" | "Reviewer";
  model: string;
  active: boolean;
}

export const MOCK_MODEL_ROLES: ModelRole[] = [
  { role: "Coding", model: "Qwen3 Coder 30B", active: true },
  { role: "Vision", model: "Qwen2.5-VL 7B", active: true },
  { role: "Fast", model: "GPT-OSS 20B", active: false },
  { role: "Reviewer", model: "DeepSeek Coder 33B", active: false },
];

export const MOCK_CONNECTORS = [
  { name: "GitHub", account: "saad-studio-developer", status: "connected", permissions: "Read + Write" },
  { name: "Gmail", account: "saad.studio.agent@gmail.com", status: "connected", permissions: "Read Only" },
  { name: "Google Drive", account: "saad.studio.shared", status: "disconnected", permissions: "None" },
  { name: "Hugging Face", account: "saad-ai-dev", status: "connected", permissions: "Read + Download" },
];

export const MOCK_ARCHITECTURE = {
  name: "saad-studio",
  type: "directory",
  children: [
    {
      name: "saad-agent",
      type: "directory",
      children: [
        {
          name: "src",
          type: "directory",
          children: [
            { name: "agent.ts", type: "file", size: "4.4 KB" },
            { name: "config.ts", type: "file", size: "0.8 KB" },
            { name: "llm-client.ts", type: "file", size: "0.9 KB" },
            {
              name: "providers",
              type: "directory",
              children: [
                { name: "factory.ts", type: "file", size: "0.4 KB" },
                { name: "lm-studio.ts", type: "file", size: "1.1 KB" },
                { name: "ollama.ts", type: "file", size: "1.1 KB" },
                { name: "provider-interface.ts", type: "file", size: "0.5 KB" },
              ],
            },
            {
              name: "scanner",
              type: "directory",
              children: [{ name: "project-scanner.ts", type: "file", size: "12.4 KB" }],
            },
          ],
        },
        { name: "package.json", type: "file", size: "0.6 KB" },
      ],
    },
    { name: "package.json", type: "file", size: "1.4 KB" },
    { name: "PROJECT_CONTEXT.md", type: "file", size: "3.2 KB" },
  ],
};

export const MOCK_DEPENDENCY_GRAPH = {
  "src/agent.ts": ["src/config.ts", "src/memory/project-memory.ts", "src/scanner/project-scanner.ts", "src/llm-client.ts"],
  "src/scanner/project-scanner.ts": ["src/config.ts", "src/memory/project-memory.ts", "src/tools/fs-tools.ts"],
  "src/llm-client.ts": ["src/config.ts", "src/providers/factory.ts", "src/providers/provider-interface.ts"],
  "src/providers/factory.ts": ["src/providers/lm-studio.ts", "src/providers/ollama.ts", "src/providers/provider-interface.ts"],
};

export const MOCK_CHECKPOINTS = [
  { id: "cp-04a2d8", timestamp: "2026-06-27 18:04:12", description: "Completed hash-based change detection tests" },
  { id: "cp-ff7f22", timestamp: "2026-06-27 14:58:33", description: "Successfully implemented provider factory layer" },
  { id: "cp-a20d41", timestamp: "2026-06-27 14:12:05", description: "Pre-scan backup created" },
];

export const MOCK_LOGS = [
  "[18:02:11] [System] Initializing Saad Agent local session...",
  "[18:02:12] [Memory] Loaded database files from .saad-agent/",
  "[18:02:12] [Scanner] Scanning workspace files incrementally...",
  "[18:02:13] [Scanner] 🔄 Detecting project changes incrementally via hashing...",
  "[18:02:14] [Scanner] ✨ No changes detected. Knowledge base is up to date.",
  "[18:04:12] [TestRunner] npx tsc finished with exit code 0",
  "[18:04:18] [TestRunner] node src/test-incremental.js started",
  "[18:04:22] [TestRunner] Incremental tests passed successfully.",
];

export const MOCK_CONVERSATIONS = [
  { id: "conv-1", title: "Migrate Change Detection to Hash-Based", active: true },
  { id: "conv-2", title: "Refactor Model Provider Layer", active: false },
  { id: "conv-3", title: "Initial Workspace Scanning", active: false },
];

export const MOCK_MESSAGES: Message[] = [
  {
    id: "m1",
    sender: "user",
    timestamp: "18:02:30",
    content: "Transition the incremental scan change detection to content hashing instead of modification times, and make sure we ignore the dist and build folders.",
  },
  {
    id: "m2",
    sender: "agent",
    timestamp: "18:02:34",
    content: "I have loaded the workspace memory and analyzed the request. Here is the project scan details.",
    cardType: "project-analysis",
    cardData: {
      projectName: "saad-studio-premiere",
      framework: "Next.js 14",
      filesCount: 148,
      totalSize: "1.42 MB",
      ignoredFolders: ["node_modules", ".git", ".next", ".saad-agent", "dist", "build"],
    },
  },
  {
    id: "m3",
    sender: "agent",
    timestamp: "18:02:36",
    content: "Based on my analysis, here is the execution plan to swap modification times (`fileMtimes`) with content hashing (`fileHashes`):",
    cardType: "execution-plan",
    cardData: {
      steps: [
        { id: 1, text: "Modify `project-memory.ts` interface to swap `fileMtimes` with `fileHashes`", completed: true },
        { id: 2, text: "Update `fs-tools.ts` to exclude 'dist' and 'build' directories", completed: true },
        { id: 3, text: "Re-implement `project-scanner.ts` with SHA-256 computation using native crypto", completed: true },
        { id: 4, text: "Implement backward compatibility checking logic in `ProjectScanner.refresh()`", completed: true },
        { id: 5, text: "Update test scripts to use `fileHashes` and add legacy db simulation test step", completed: true },
      ],
    },
  },
  {
    id: "m4",
    sender: "agent",
    timestamp: "18:02:40",
    content: "These are the affected files and their transition risk metrics:",
    cardType: "affected-files",
    cardData: {
      files: [
        { path: "saad-agent/src/memory/project-memory.ts", action: "modify", risk: "Low" },
        { path: "saad-agent/src/tools/fs-tools.ts", action: "modify", risk: "Low" },
        { path: "saad-agent/src/scanner/project-scanner.ts", action: "modify", risk: "Medium" },
        { path: "saad-agent/src/test-incremental.ts", action: "modify", risk: "Low" },
      ],
    },
  },
  {
    id: "m5",
    sender: "agent",
    timestamp: "18:02:45",
    content: "Here is the code diff preview for the `ProjectScanner` change detection logic:",
    cardType: "diff-preview",
    cardData: {
      fileName: "saad-agent/src/scanner/project-scanner.ts",
      diff: `-    // If memory is not initialized or missing key structure, do a full scan
-    if (!memory.fileMtimes || !memory.architecture || !memory.dependencies || !memory.summary) {
+    const hasLegacyMtimes = "fileMtimes" in memory || "fileMtimes" in memoryStore.get();
+    
+    // If memory is not initialized, missing key structure, or contains legacy fileMtimes, do a full scan
+    if (!memory.fileHashes || hasLegacyMtimes || !memory.architecture || !memory.dependencies || !memory.summary) {
+      if (hasLegacyMtimes) {
+        console.log("🔄 Legacy fileMtimes schema detected. Upgrading database to fileHashes...");
+        delete (memory as any).fileMtimes;
+        delete (memoryStore.get() as any).fileMtimes;
+      }
       const scanResult = await this.scan();
       memoryStore.updateSummary(scanResult.summary);
       memoryStore.updateArchitecture(scanResult.architecture);
       memoryStore.updateDependencies(scanResult.dependencies);
-      memoryStore.get().fileMtimes = scanResult.fileMtimes;
+      
+      delete (memoryStore.get() as any).fileMtimes;
+      memoryStore.get().fileHashes = scanResult.fileHashes;
       await memoryStore.save();
       return true;
     }`,
    },
  },
  {
    id: "m6",
    sender: "agent",
    timestamp: "18:02:46",
    content: "Please review the execution plan and the code diff. Approve the execution to proceed with applying these changes.",
    cardType: "approval-buttons",
  },
  {
    id: "m7",
    sender: "user",
    timestamp: "18:03:00",
    content: "Approved. Proceed with the changes.",
  },
  {
    id: "m8",
    sender: "agent",
    timestamp: "18:03:15",
    content: "Applying patches and running local checks. Here are the execution logs of the build and test process:",
    cardType: "execution-logs",
    cardData: {
      logs: [
        "Applying patch to saad-agent/src/memory/project-memory.ts... OK",
        "Applying patch to saad-agent/src/tools/fs-tools.ts... OK",
        "Applying patch to saad-agent/src/scanner/project-scanner.ts... OK",
        "Running: npx tsc --noEmit",
        "Typecheck succeeded! (0 errors)",
        "Running: npx tsc",
        "Build succeeded!",
        "Running: node src/test-incremental.js",
      ],
    },
  },
  {
    id: "m9",
    sender: "agent",
    timestamp: "18:03:22",
    content: "Here are the results of the automated build and test runner:",
    cardType: "build-results",
    cardData: {
      status: "success",
      buildLogs: "tsc compiled successfully. 0 type errors. ESM modules resolved correctly.",
      testLogs: `--- Step 1: Performing full scan ---
✅ Project scan completed
--- Step 2: Refreshing with no changes ---
✨ No changes detected. Knowledge base is up to date.
--- Step 3: Adding a temporary file ---
📝 Changes detected: 1 added.
--- Step 4: Modifying the temporary file ---
📝 Changes detected: 1 modified.
--- Step 5: Deleting the temporary file ---
📝 Changes detected: 1 deleted.
--- Step 6: Testing legacy database compatibility ---
Loaded legacy memory (has fileMtimes): true
🔄 Legacy fileMtimes schema detected. Upgrading database to fileHashes...
✅ Database schema upgraded to fileHashes successfully`,
    },
  },
  {
    id: "m10",
    sender: "agent",
    timestamp: "18:03:23",
    content: "No compilation errors or test failures were encountered during execution. No retries were needed.",
    cardType: "retry-status",
    cardData: {
      attempts: 1,
      errors: [],
      succeeded: true,
    },
  },
  {
    id: "m11",
    sender: "agent",
    timestamp: "18:03:25",
    content: "The changes have been completed successfully. Here is the final report Walkthrough:",
    cardType: "final-report",
    cardData: {
      walkthrough: `- Replaced 'fileMtimes' with SHA-256 'fileHashes' to provide immune change scanning.
- Programmed automatic schema upgrades inside 'ProjectScanner' refresh process.
- Ignored build artifacts folders 'dist' and 'build' inside file tools.`,
    },
  },
  {
    id: "m12",
    sender: "agent",
    timestamp: "18:03:26",
    content: "Creating a local checkpoint for recovery if needed:",
    cardType: "checkpoint",
    cardData: {
      checkpointId: "cp-04a2d8",
      description: "Completed hash-based change detection tests",
    },
  },
  {
    id: "m13",
    sender: "agent",
    timestamp: "18:03:28",
    content: "Lastly, I've updated the engineering lessons and decision memory:",
    cardType: "memory-updated",
    cardData: {
      decision: "SHA-256 content hashing replaces timestamp comparisons to avoid local environment file date anomalies.",
      lessons: "Build directories must be ignored explicitly to avoid scanning compile outputs dynamically.",
    },
  },
  {
    id: "m14",
    sender: "user",
    timestamp: "18:04:00",
    content: "Analyze this layout screenshot of our dashboard. We are getting spacing issues on smaller screens.",
    attachments: [
      {
        id: "att-screenshot",
        type: "image",
        name: "dashboard-layout-bug.png",
        mimeType: "image/png",
        size: 245120,
        previewUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60",
        source: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60"
      }
    ]
  },
  {
    id: "m15",
    sender: "agent",
    timestamp: "18:04:15",
    content: "I have passed the layout screenshot to the Vision Provider (Qwen2.5-VL) for visual layout debugging. Here is the vision analysis report:",
    cardType: "vision-analysis",
    cardData: {
      imageName: "dashboard-layout-bug.png",
      dimensions: "1920 x 1080",
      findings: [
        { id: 1, element: "Flex wrap wrapper", issue: "The grid elements overflow because flex-basis does not resize dynamically.", severity: "High" },
        { id: 2, element: "Collapsible sidebar menu", issue: "On viewports < 768px, sidebar overlaps message threads instead of hiding.", severity: "Medium" },
        { id: 3, element: "Submit button text alignment", issue: "Padding cuts off the Arabic text on smaller screen sizes.", severity: "Low" }
      ],
      recommendations: "Replace hardcoded width dimensions with CSS custom variables, and use flex-wrap utilities combined with responsive media queries."
    }
  }
];
