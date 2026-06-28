import type { Skill } from "./skill-types.js";

export const BUILTIN_SKILLS: Skill[] = [
  {
    id: "skill-typescript",
    name: "TypeScript Skill",
    version: "1.0.0",
    domain: "Frontend/Backend Engineering",
    description: "Domain expertise for strict TypeScript type checking, interfaces, generics, and compiler options.",
    triggers: {
      keywords: ["typescript", "ts", "interface", "generic", "typecheck", "tsconfig"],
      filePatterns: ["*.ts", "*.tsx", "tsconfig.json"],
    },
    capabilities: ["strict-typechecking", "interface-design", "enum-refactoring"],
    promptTemplates: {
      systemRules: [
        "Enforce strict typing and explicit return types where applicable.",
        "Avoid using 'any' type; prefer 'unknown' or strong generic constraints."
      ]
    },
    recommendedTools: ["fs-tool", "build-tool"],
    supportedAgents: ["Frontend Agent", "Backend Agent", "Reviewer Agent"]
  },
  {
    id: "skill-react",
    name: "React Skill",
    version: "1.0.0",
    domain: "Frontend Web Engineering",
    description: "Expertise in React hooks, component lifecycles, state management, and JSX rendering.",
    triggers: {
      keywords: ["react", "useState", "useEffect", "jsx", "tsx", "component", "hooks"],
      filePatterns: ["*.jsx", "*.tsx", "App.tsx"],
    },
    capabilities: ["hook-optimization", "state-management", "ui-rendering"],
    promptTemplates: {
      systemRules: [
        "Ensure hook dependencies in useEffect and useCallback are accurate.",
        "Keep components focused and modular."
      ]
    },
    recommendedTools: ["fs-tool", "patch-tool"],
    supportedAgents: ["Frontend Agent", "UX Designer Agent"]
  },
  {
    id: "skill-nextjs",
    name: "Next.js Skill",
    version: "1.0.0",
    domain: "Fullstack Web Engineering",
    description: "Domain knowledge for Next.js App Router, Server Actions, API routes, and SSR/SSG rendering.",
    triggers: {
      keywords: ["nextjs", "next", "app router", "server action", "api route", "page.tsx"],
      filePatterns: ["next.config.js", "next.config.mjs", "app/**/page.tsx"],
    },
    capabilities: ["server-components", "api-routing", "middleware"],
    promptTemplates: {
      systemRules: [
        "Distinguish between Server Components and Client Components ('use client').",
        "Secure API endpoints and validate input payloads."
      ]
    },
    recommendedTools: ["fs-tool", "build-tool"],
    supportedAgents: ["Fullstack Agent", "Frontend Agent"]
  },
  {
    id: "skill-electron",
    name: "Electron Skill",
    version: "1.0.0",
    domain: "Desktop App Engineering",
    description: "Expertise in Electron main/renderer process separation, IPC bridges, and contextIsolation.",
    triggers: {
      keywords: ["electron", "ipcMain", "ipcRenderer", "contextBridge", "preload", "main.ts"],
      filePatterns: ["main.ts", "preload.ts", "electron-builder.yml"],
    },
    capabilities: ["ipc-communication", "preload-isolation", "desktop-packaging"],
    promptTemplates: {
      systemRules: [
        "Never expose Node modules directly to renderer; use contextBridge in preload.ts.",
        "Validate IPC payloads in main process handlers."
      ]
    },
    recommendedTools: ["fs-tool", "patch-tool"],
    supportedAgents: ["Backend Agent", "Architect Agent"]
  },
  {
    id: "skill-python",
    name: "Python Skill",
    version: "1.0.0",
    domain: "Data & Scripting Engineering",
    description: "Knowledge for Python environment management, virtualenv, FastAPI, and data processing.",
    triggers: {
      keywords: ["python", "py", "pip", "pytest", "fastapi", "virtualenv"],
      filePatterns: ["*.py", "requirements.txt", "Pipfile", "pyproject.toml"],
    },
    capabilities: ["scripting", "data-analysis", "backend-services"],
    promptTemplates: {
      systemRules: [
        "Follow PEP 8 styling guidelines and type hints.",
        "Handle exceptions gracefully with structured logging."
      ]
    },
    recommendedTools: ["fs-tool", "test-tool"],
    supportedAgents: ["Backend Agent", "Data Agent"]
  },
  {
    id: "skill-ffmpeg",
    name: "FFmpeg Skill",
    version: "1.0.0",
    domain: "Media Processing",
    description: "Expertise in audio/video demuxing, transcoding, waveform analysis, and stitching commands.",
    triggers: {
      keywords: ["ffmpeg", "transcode", "audio analysis", "waveform", "video stitch", "codec"],
      filePatterns: ["*.mp4", "*.wav", "*.mp3", "*.mov"],
    },
    capabilities: ["video-transcoding", "audio-extraction", "media-stitch"],
    promptTemplates: {
      systemRules: [
        "Verify codec compatibility before running FFmpeg CLI tasks.",
        "Ensure temp files are cleaned up post execution."
      ]
    },
    recommendedTools: ["fs-tool", "build-tool"],
    supportedAgents: ["Backend Agent", "Media Agent"]
  },
  {
    id: "skill-supabase",
    name: "Supabase Skill",
    version: "1.0.0",
    domain: "Cloud Database & Auth",
    description: "Domain knowledge for Supabase PostgreSQL, Row Level Security (RLS), and Auth policies.",
    triggers: {
      keywords: ["supabase", "postgres", "rls", "database", "sql", "table"],
      filePatterns: ["supabase/**/*.sql", "schema.sql"],
    },
    capabilities: ["database-schema", "rls-policies", "cloud-auth"],
    promptTemplates: {
      systemRules: [
        "Always enforce Row Level Security (RLS) on public tables.",
        "Use parameterized queries to prevent SQL injection."
      ]
    },
    recommendedTools: ["fs-tool", "patch-tool"],
    supportedAgents: ["Backend Agent", "Database Agent"]
  },
  {
    id: "skill-backblaze-b2",
    name: "Backblaze B2 Skill",
    version: "1.0.0",
    domain: "Cloud Storage Engineering",
    description: "Guidelines for object storage bucket policies, multipart uploads, and download caps.",
    triggers: {
      keywords: ["backblaze", "b2", "bucket", "s3 compatible", "storage cap", "cloud storage"],
      filePatterns: ["b2.config.json"],
    },
    capabilities: ["object-storage", "cap-monitoring", "file-upload"],
    promptTemplates: {
      systemRules: [
        "Monitor download caps and storage allocations explicitly.",
        "Never store raw S3/B2 credentials in source code."
      ]
    },
    recommendedTools: ["fs-tool"],
    supportedAgents: ["Backend Agent", "Infrastructure Agent"]
  },
  {
    id: "skill-vercel",
    name: "Vercel Skill",
    version: "1.0.0",
    domain: "Cloud Deployment & Hosting",
    description: "Expertise in Vercel edge functions, serverless deployment configs, and environment domains.",
    triggers: {
      keywords: ["vercel", "deployment", "edge function", "serverless", "preview deployment"],
      filePatterns: ["vercel.json"],
    },
    capabilities: ["cloud-deployment", "edge-configuration"],
    promptTemplates: {
      systemRules: [
        "Keep serverless function cold-starts minimal.",
        "Verify environment variables in Vercel dashboard."
      ]
    },
    recommendedTools: ["fs-tool"],
    supportedAgents: ["Infrastructure Agent", "DevOps Agent"]
  },
  {
    id: "skill-creative-design",
    name: "Creative Design Skill",
    version: "1.0.0",
    domain: "UI/UX & Visual Aesthetics",
    description: "Guidelines for rich modern UI aesthetics, glassmorphic themes, vibrant gradients, and micro-animations.",
    triggers: {
      keywords: ["creative", "design", "ui", "ux", "theme", "glassmorphism", "gradient", "aesthetics"],
      filePatterns: ["*.css", "*.scss", "theme.json"],
    },
    capabilities: ["color-palette-tailoring", "typography", "micro-animations"],
    promptTemplates: {
      systemRules: [
        "Avoid generic plain colors (plain blue, plain red). Use curated HSL dynamic dark modes.",
        "Implement sleek glassmorphic card borders and smooth micro-animations."
      ]
    },
    recommendedTools: ["fs-tool", "patch-tool"],
    supportedAgents: ["UX Designer Agent", "Frontend Agent"]
  },
  {
    id: "skill-prompt-engineering",
    name: "Prompt Engineering Skill",
    version: "1.0.0",
    domain: "LLM Orchestration & Prompting",
    description: "Guidelines for structured JSON schemas, zero preambles, and system prompt formatting.",
    triggers: {
      keywords: ["prompt", "systemPrompt", "userPrompt", "llm", "reasoning", "schema"],
      filePatterns: ["reasoning-engine.ts", "planner.ts"],
    },
    capabilities: ["json-schema-design", "prompt-optimization"],
    promptTemplates: {
      systemRules: [
        "Specify exact target JSON schemas and mandate no conversational preambles.",
        "Enforce strict output validation and fallback handling."
      ]
    },
    recommendedTools: ["fs-tool"],
    supportedAgents: ["Architect Agent", "Reviewer Agent"]
  },
  {
    id: "skill-adobe-premiere-cep",
    name: "Adobe Premiere CEP Skill",
    version: "1.0.0",
    domain: "Video Editing Extensions",
    description: "Domain knowledge for Premiere Pro CEP extension architecture, CSInterface, ExtendScript host execution, and timeline synchronization.",
    triggers: {
      keywords: ["premiere", "cep", "extendscript", "jsx", "csinterface", "timeline", "reap"],
      filePatterns: ["manifest.xml", "*.jsx"],
    },
    capabilities: ["extendscript-eval", "timeline-inspection", "cep-messaging"],
    promptTemplates: {
      systemRules: [
        "Target Premiere Pro host version 26.2.0 compatibility.",
        "Validate media paths before executing audio waveform analysis or timeline synchronization."
      ]
    },
    recommendedTools: ["fs-tool", "patch-tool"],
    supportedAgents: ["Backend Agent", "Media Agent"]
  }
];
