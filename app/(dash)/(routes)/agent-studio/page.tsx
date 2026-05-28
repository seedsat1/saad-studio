"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import {
  Plus,
  Search,
  Sparkles,
  Plug,
  FolderClosed,
  Brain,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowUp,
  X,
  Play,
  Check,
  Video,
  Settings,
  Database,
  Link as LinkIcon,
  Clock,
  Clapperboard,
  Terminal,
  Activity,
  HardDrive,
  Trash2,
  UploadCloud,
  CheckCircle2,
  PlusCircle,
  HelpCircle,
  Paperclip,
  Download,
  Filter,
  Eye,
  Sliders,
  MessageSquare,
  Lock,
  Unlock
} from "lucide-react";

// Types
interface TaskRun {
  id: string;
  prompt: string;
  category: string;
  skillId?: string;
  engine: string;
  renderMode: string;
  fileSize: string;
  timestamp: string;
  status: "completed" | "failed" | "processing";
  videoUrl?: string;
  logs: string[];
}

interface CustomSkill {
  id: string;
  title: string;
  desc: string;
  category: string;
  prompt: string;
  isCustom: boolean;
  isActive: boolean;
  icon: string;
}

interface Connector {
  id: string;
  title: string;
  desc: string;
  icon: string;
  isConnected: boolean;
  token?: string;
  features?: string[];
}

interface AssetFile {
  id: string;
  name: string;
  size: string;
  type: "image" | "video" | "document";
  date: string;
  url?: string;
}

interface MemoryNode {
  id: string;
  text: string;
}

// Complete 40+ Skills matching the user list & descriptions
const INITIAL_SKILLS: CustomSkill[] = [
  { id: "static-ads", title: "/static-ads", desc: "Takes an uploaded reference image, derives the layout structure and copy framework internally, generates on-brand copy variations, then renders static ads via GPT Image 2 using product images.", category: "Business & Finance", prompt: "Recreate ad layouts using GPT Image 2 and product references.", isCustom: false, isActive: true, icon: "📊" },
  { id: "b-roll-planner", title: "/b-roll-shot-planner", desc: "Cinematic B-roll shot planner. Analyzes an uploaded image or user text to produce exactly 5 cohesive, edit-ready B-roll shot outputs.", category: "Content Creation", prompt: "Analyze style anchor and output 5 detailed B-roll camera setups.", isCustom: false, isActive: true, icon: "🎥" },
  { id: "karpathy-skill", title: "/karpathy-skill", desc: "Developer assistant focused on code generation, software architecture design, and LLM optimization.", category: "Fun & Quirky", prompt: "Expert code synthesis, python scripting, and LLM orchestration.", isCustom: false, isActive: true, icon: "🤖" },
  { id: "cod-thumbnail", title: "/cod-ultimate-thumbnail", desc: "Transforms screenshots into 3D composite renders, and applies a heavy graphic layout stack focused on element sharpness and vibrant environments.", category: "Content Creation", prompt: "Perform 3D composite rendering and YouTube thumbnail enhancements.", isCustom: false, isActive: true, icon: "🎮" },
  { id: "pulp-cinema", title: "/pulp-cinema-director", desc: "Direct original pulp-cinema video clips: nonlinear scenes, standoffs, trunk-level shots, spaghetti-western energy, and dialogue-heavy prompts.", category: "Content Creation", prompt: "Apply grindhouse color filters, trunk angles, and retro camera dollying.", isCustom: false, isActive: true, icon: "🎬" },
  { id: "seedance-prompts", title: "/seedance-prompting-skills-for-cinematic-films", desc: "Generate grounded cinematic film prompts for Seedance 2.0 — shot direction, realistic body movement, camera movement, and stable photorealistic motion behavior.", category: "Content Creation", prompt: "Formulate Seedance 2.0 motion matrices and photorealistic frame scripting.", isCustom: false, isActive: true, icon: "🍿" },
  { id: "writing-beats", title: "/writing-beats", desc: "Shape an article as a journey of beats, choose-your-own-adventure style. The user picks a starting beat, you write only that beat, then offer options for where to pivot next.", category: "Writing", prompt: "Draft article segment sequences as interactive story beats.", isCustom: false, isActive: true, icon: "📝" },
  { id: "ip-carpetman", title: "/ip-carpetman", desc: "Handling rules and persistent media references for the custom character IP 'Carpetman'.", category: "Fun & Quirky", prompt: "Maintain visual attributes and background references for character IP Carpetman.", isCustom: false, isActive: true, icon: "🧎" },
  { id: "ugc-swap", title: "/ugc-model-swap", desc: "Recreate any short UGC video (reaction, challenge, review, try-on) with a replaced character/model using Seedance 2.0.", category: "Content Creation", prompt: "Swap character reference models on input video layouts via Seedance.", isCustom: false, isActive: true, icon: "👤" },
  { id: "flash-reel", title: "/flash-reel", desc: "Generates a 30s 9:16 cinematic reel. Renders 8 starting frames via GPT Image 2, animates via Kling 3.0, and stitches via FFmpeg using a 35mm flash-photography aesthetic.", category: "Content Creation", prompt: "Run Flash-Reel pipeline: GPT Image 2 + Kling 3.0 + FFmpeg assembly.", isCustom: false, isActive: true, icon: "⚡" },
  { id: "storyboard-cheatcode", title: "/storyboard-cheatcode", desc: "Turn a one-line concept into a multi-panel previs storyboard image, then a cheap-preview video and a hero video render.", category: "Content Creation", prompt: "Render previs storyboards and draft video passes using local tools.", isCustom: false, isActive: true, icon: "📓" },
  { id: "prompt-expert", title: "/prompt-engineering-expert", desc: "Expert prompt engineering, custom instruction, system prompt, and agent instruction design.", category: "Personal & Specialized", prompt: "Debug, evaluate, and optimize system instruction prompts.", isCustom: false, isActive: true, icon: "🧠" },
  { id: "onboarding", title: "/agent-studio-onboarding", desc: "Interactive onboarding tour for Agent Studio — explains latest features, what you can do, and how to start exploring.", category: "Communication & Collaboration", prompt: "Execute guided walk tour explaining Agent Studio tabs and runs.", isCustom: false, isActive: true, icon: "👋" },
  { id: "ugc-ad-prod", title: "/ugc-ad-production", desc: "Full UGC ad production pipeline: AI-generated creator face and multi-shot video. Uses image builders, video animators, and script orchestrators.", category: "Content Creation", prompt: "Execute full script-to-video UGC marketing production.", isCustom: false, isActive: true, icon: "🛍️" },
  { id: "storyboard-gen", title: "/storyboard-generation", desc: "Rules and prompts for generating structured presentation slides and multi-panel storyboards.", category: "Content Creation", prompt: "Synthesize storyboard frames and presentation layouts.", isCustom: false, isActive: true, icon: "📐" },
  { id: "gpt-image-dir", title: "/gpt-image-2-director", desc: "Production prompt director for GPT Image 2 — portraits, posters, character sheets, UI mockups, and images with on-screen text.", category: "Content Creation", prompt: "Generate precise prompt scripts optimized for GPT Image 2 rendering.", isCustom: false, isActive: true, icon: "🎨" },
  { id: "kling-director", title: "/kling-3-prompt-director", desc: "Production-ready Kling 3.0 video prompt director using the canonical 9-field formula.", category: "Content Creation", prompt: "Format video prompts matching Kling 3.0 motion latents.", isCustom: false, isActive: true, icon: "🎬" },
  { id: "seo-auditor", title: "/seo-auditor", desc: "Technical SEO audit and optimization workflow for crawlability, indexing, structured data, Core Web Vitals, and search visibility roadmaps.", category: "Data & Analytics", prompt: "Perform crawl audit and write structured optimization metrics.", isCustom: false, isActive: true, icon: "🔍" },
  { id: "theme-factory", title: "/theme-factory", desc: "Toolkit for styling artifacts with a theme. Apply colors and fonts to documents, reportings, and HTML landing pages.", category: "Productivity", prompt: "Generate stylesheet themes and apply CSS attributes.", isCustom: false, isActive: true, icon: "🎨" },
  { id: "cinematic-motion", title: "/cinematic-motion-language", desc: "Structured prompt vocabulary system for high-precision cinematic video generation: camera contracts, motion anchors, and lens sequences.", category: "Content Creation", prompt: "Translate scene specs into precise camera dolly, tilt, and pan cues.", isCustom: false, isActive: true, icon: "📹" },
  { id: "edit-article", title: "/edit-article", desc: "Edit and improve articles by restructuring sections, improving clarity, and tightening prose.", category: "Writing", prompt: "Refactor article text structure for maximum clarity.", isCustom: false, isActive: true, icon: "✍️" },
  { id: "grill-me", title: "/grill-me", desc: "Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree.", category: "Personal & Specialized", prompt: "Initiate diagnostic interview sequence questioning design decisions.", isCustom: false, isActive: true, icon: "🔥" },
  { id: "fragments", title: "/writing-fragments", desc: "Grilling session that mines the user for fragments — nuggets of writing — and appends them to a single document as raw material.", category: "Writing", prompt: "Collect writing snippets and organize them into unstructured logs.", isCustom: false, isActive: true, icon: "🧩" },
  { id: "content-strategy", title: "/content-strategy", desc: "Plan content strategy, decide what content to create, figure out topics, outline clusters, and build editorial calendars.", category: "Writing", prompt: "Synthesize content roadmaps and keyword pillar clusters.", isCustom: false, isActive: true, icon: "🗺️" },
  { id: "caveman", title: "/caveman", desc: "Ultra-compressed communication mode. Cuts token usage ~75% by dropping filler, articles, and pleasantries.", category: "Personal & Specialized", prompt: "Truncate system messages into brief technical outputs.", isCustom: false, isActive: true, icon: "🍖" },
  { id: "browser-test", title: "/browser-testing-with-devtools", desc: "Tests in real browsers. Inspect the DOM, capture console errors, analyze network requests, and verify visual output.", category: "Frontend Engineer", prompt: "Analyze devtools records, find console warnings, and output layout fixes.", isCustom: false, isActive: true, icon: "🌐" },
  { id: "social-content", title: "/social-content", desc: "Create, schedule, or optimize social media content: LinkedIn posts, Twitter threads, video scripts, hooks, and Reels.", category: "Writing", prompt: "Write hooks and format copy for social publishing queues.", isCustom: false, isActive: true, icon: "💬" },
  { id: "marketing-ideas", title: "/marketing-ideas", desc: "Brainstorm marketing ideas, inspiration, and growth strategies for software products.", category: "Creative & Marketing", prompt: "Generate creative distribution strategies and user acquisition ideas.", isCustom: false, isActive: true, icon: "💡" },
  { id: "copywriting", title: "/copywriting", desc: "Write, rewrite, or improve marketing copy for homepages, landing pages, pricing pages, and value propositions.", category: "Creative & Marketing", prompt: "Draft high-conversion landing page layouts and hero copy.", isCustom: false, isActive: true, icon: "✍️" },
  { id: "humanizer", title: "/humanizer", desc: "Remove signs of AI-generated writing from text by resolving inflated symbolism, rule of three, active voice, and em dash overuse.", category: "Writing", prompt: "Rewrite sentences into natural, human-written text structures.", isCustom: false, isActive: true, icon: "🍃" },
  { id: "writing-shape", title: "/writing-shape", desc: "Take raw material and shape it into a finished article, drafting opening options and growing the piece paragraph by paragraph.", category: "Writing", prompt: "Refine raw notes into publication-ready articles.", isCustom: false, isActive: true, icon: "✒️" },
  { id: "ab-test", title: "/ab-test-setup", desc: "Plan, design, or implement A/B tests or split experiments, including hypothesis scoring and statistical run timelines.", category: "Creative & Marketing", prompt: "Formulate experimental backlogs and define variant metrics.", isCustom: false, isActive: true, icon: "⚖️" },
  { id: "context-eng", title: "/context-engineering", desc: "Optimizes agent context setup. Configure rules files and system prompt context layout for projects.", category: "Productivity", prompt: "Restructure rules parameters for optimal LLM context loading.", isCustom: false, isActive: true, icon: "⚙️" },
  { id: "perf-opt", title: "/performance-optimization", desc: "Optimizes application performance: Core Web Vitals, load times, bundle size profiling, and database indexing.", category: "Productivity", prompt: "Identify bundle bottlenecks and outline performance corrections.", isCustom: false, isActive: true, icon: "⚡" },
  { id: "marketing-psych", title: "/marketing-psychology", desc: "Apply psychological principles and cognitive biases (anchoring, social proof, scarcity) to interface marketing layouts.", category: "Creative & Marketing", prompt: "Integrate behavioral nudges into layout wireframes.", isCustom: false, isActive: true, icon: "🧠" },
  { id: "brand-guide", title: "/brand-guidelines", desc: "Applies official brand colors, typography, formatting, and layout standards to generated documents and pages.", category: "UI Kit", prompt: "Apply typography tokens and brand colors to asset designs.", isCustom: false, isActive: true, icon: "📐" },
  { id: "frontend-ui", title: "/frontend-ui-engineering", desc: "Builds production-quality user interfaces, React components, state handlers, and animations.", category: "Frontend Engineer", prompt: "Write optimized React components, TypeScript models, and styled cards.", isCustom: false, isActive: true, icon: "💻" },
  { id: "comp-patterns", title: "/vercel-composition-patterns", desc: "React composition patterns: compound components, render props, and context providers scaled for performance.", category: "Frontend Engineer", prompt: "Refactor components with flexible API states.", isCustom: false, isActive: true, icon: "🧱" },
  { id: "paid-ads", title: "/paid-ads", desc: "Bidding, retargeting, budgeting, and optimization strategies for search and display ad networks.", category: "Marketing & Sales", prompt: "Structure PPC campaigns and ad group hierarchies.", isCustom: false, isActive: true, icon: "💰" },
  { id: "ad-creative", title: "/ad-creative", desc: "Generate, iterate, or scale ad copy variations, headlines, descriptions, and creatives for ad platforms.", category: "Marketing & Sales", prompt: "Draft bulk ad variations and copy layouts.", isCustom: false, isActive: true, icon: "🛍️" },
  { id: "email-sequence", title: "/email-sequence", desc: "Create onboarding email sequences, drip email funnels, welcome cadences, and lifecycle programs.", category: "Marketing & Sales", prompt: "Design transactional email sequences and drip funnels.", isCustom: false, isActive: true, icon: "✉️" }
];

const SKILL_CATEGORIES = [
  "All",
  "Business & Finance",
  "Communication & Collaboration",
  "Content Creation",
  "Creative & Marketing",
  "Data & Analytics",
  "Document Processing",
  "Frontend Engineer",
  "Fun & Quirky",
  "Marketing & Sales",
  "Personal & Specialized",
  "Productivity",
  "UI Kit",
  "Writing"
];

// All 31 Connectors exactly matching the Higgsfield screenshot list & descriptions
const INITIAL_CONNECTORS: Connector[] = [
  { id: "instagram", title: "Instagram", desc: "Publish feed posts, reels, stories, and carousels, then manage media comments.", icon: "📸", isConnected: false, features: ["Publish feed posts and reels", "Publish stories and carousels", "Read & reply to comments", "Analyze profile performance metrics"] },
  { id: "threads", title: "Threads", desc: "Publish text, image, video, and carousel posts, and inspect connected profile limits.", icon: "🧵", isConnected: false, features: ["Publish text & media threads", "Inspect active API limit quotas", "Retrieve thread comments", "Track account engagement rates"] },
  { id: "telegram", title: "Telegram", desc: "Telegram is a cloud-based, cross-platform, encrypted instant messaging service.", icon: "✈️", isConnected: false, features: ["Broadcast clips to channels", "Read incoming channel queries", "Dispatch alerts to group chats", "Deploy interactive helper bots"] },
  { id: "docs", title: "Google Docs", desc: "Google Docs is a cloud-based word processor that allows you to create, read, and update documents programmatically.", icon: "📄", isConnected: false, features: ["Import script draft articles", "Write generated summaries", "Update structured doc outlines", "Collaborate on content sheets"] },
  { id: "notion", title: "Notion", desc: "Notion is a workspace for wiki, notes, databases, and project trackers.", icon: "📓", isConnected: false, features: ["Sync workspace databases", "Load script templates", "Export task transaction logs", "Read workflow reference pages"] },
  { id: "gmail", title: "Gmail", desc: "Gmail is a free email service by Google providing integrated communication tools.", icon: "✉️", isConnected: false, features: ["Send transactional emails", "Read incoming feedback mails", "Index system status logs", "Coordinate calendar invites"] },
  { id: "calendar", title: "Google Calendar", desc: "Google Calendar is a time-management and scheduling service.", icon: "📅", isConnected: false, features: ["Schedule pipeline runs", "Set project deadlines", "Coordinate calendar events", "Invite workspace members"] },
  { id: "github", title: "GitHub", desc: "GitHub is a platform for version control, collaboration, and software development.", icon: "🛠️", isConnected: false, features: ["Trigger tasks from git commits", "Sync script repositories", "Track bug reports and issues", "Deploy automated hooks"] },
  { id: "whisper", title: "OpenAI Whisper", desc: "Transcribe audio files to text using OpenAI Whisper models.", icon: "🎙️", isConnected: false, features: ["Transcribe video audio channels", "Generate subtitle SRT transcripts", "Detect media languages", "Synchronize timing anchors"] },
  { id: "linear", title: "Linear", desc: "Linear is a modern issue tracking and project management tool built for high-performance software teams.", icon: "📈", isConnected: false, features: ["Track rendering issues", "Sync pipeline roadmap tickets", "Assign tasks to developers", "Coordinate design approvals"] },
  { id: "twilio", title: "Twilio", desc: "Twilio is a cloud communications platform for building SMS, voice, and messaging applications.", icon: "☎️", isConnected: false, features: ["Send sms alert updates", "Voice notifications", "Trigger phone alerts", "Host dynamic messaging chatbeds"] },
  { id: "supabase", title: "Supabase", desc: "Supabase is an open-source Firebase alternative providing a PostgreSQL database.", icon: "⚡", isConnected: false, features: ["Read project table schemas", "Write transaction metrics", "Listen to database row changes", "Store secure metadata states"] },
  { id: "dropbox", title: "Dropbox", desc: "Dropbox is a cloud-based file hosting service for storing and syncing files.", icon: "📦", isConnected: false, features: ["Upload output movies", "Sync raw footage folders", "Generate shareable links", "Check storage quotas"] },
  { id: "yt-analytics", title: "YouTube Analytics", desc: "Provides access to YouTube reporting data including video metrics and channel performance.", icon: "📊", isConnected: false, features: ["Retrieve reel view counts", "Track audience retention stats", "Index channel subscribers", "Analyze watch-time metrics"] },
  { id: "yt-data", title: "YouTube Data", desc: "Integrate YouTube functionality into your applications including searching videos, managing playlists, etc.", icon: "🎥", isConnected: false, features: ["Upload final video clips", "Update titles & descriptions", "Manage playlists programmatically", "Set target privacy settings"] },
  { id: "salesforce", title: "Salesforce", desc: "Query, create, update, and delete Salesforce records.", icon: "☁️", isConnected: false, features: ["Sync customer profiles", "Update marketing logs", "Query business accounts", "Manage pipeline CRM details"] },
  { id: "linkedin", title: "LinkedIn", desc: "Publish text, image, multi-image, and video posts to the connected LinkedIn profile.", icon: "🔗", isConnected: false, features: ["Get connected profile details", "Upload public images to LinkedIn", "Publish single-image posts", "Publish organic multi-image layouts", "Upload and publish video streams"] },
  { id: "x", title: "X (Twitter)", desc: "Read timelines and mentions, publish posts with media, and manage authored posts.", icon: "🐦", isConnected: false, features: ["Publish micro-posts with video", "Write post threads", "Read timeline and mentions", "Analyze post impression counts"] },
  { id: "gdrive", title: "Google Drive", desc: "Google Drive is a file storage and synchronization service.", icon: "💾", isConnected: false, features: ["Save output MP4 segments", "Read raw asset folders", "Manage shared team drives", "Generate asset download links"] },
  { id: "onedrive", title: "Microsoft OneDrive", desc: "OneDrive lets you store your personal files in one place, share them, and get to them from any device.", icon: "☁️", isConnected: false, features: ["Sync footage folders", "Write rendered video segments", "Manage corporate storage drives", "Index asset metadata files"] },
  { id: "whatsapp", title: "WhatsApp Business", desc: "WhatsApp Business provides tools to communicate with customers at scale.", icon: "💬", isConnected: false, features: ["Send pipeline success texts", "Dispatch video download routes", "Manage automated chat scripts", "Index customer phone numbers"] },
  { id: "gsheets", title: "Google Sheets", desc: "Google Sheets is an online spreadsheet application.", icon: "📊", isConnected: false, features: ["Write render performance audits", "Sync credit balances tables", "Log custom script inputs", "Read metadata sheet configurations"] },
  { id: "slack", title: "Slack", desc: "Slack is the AI-powered platform for work bringing all of your conversations, apps, and tools together.", icon: "💬", isConnected: false, features: ["Notify team project channels", "Post compiled reels directly", "Listen to workflow instructions", "Manage approval trigger cards"] },
  { id: "discord", title: "Discord Bot", desc: "Discord is a communication platform for communities, gaming, and chats.", icon: "👾", isConnected: false, features: ["Broadcast renders to channels", "Manage bot query commands", "Dispatch credit alert messages", "Host community media libraries"] },
  { id: "hubspot", title: "HubSpot", desc: "HubSpot's CRM platform contains marketing, sales, service, and operations tools.", icon: "🎯", isConnected: false, features: ["Update sales opportunities", "Log task generation status", "Index customer segment queries", "Sync marketing email templates"] },
  { id: "jira", title: "Jira", desc: "Jira is a project tracking and issue management tool by Atlassian.", icon: "⚙️", isConnected: false, features: ["Track pipeline system tickets", "Assign bugs to engineer routes", "Log sprint rendering stats", "Update workflow status steps"] },
  { id: "sendgrid", title: "SendGrid", desc: "SendGrid is a cloud-based email delivery platform for transactional and marketing emails.", icon: "✉️", isConnected: false, features: ["Send transactional render updates", "Email video download links", "Dispatch newsletter copy drafts", "Track email delivery statuses"] },
  { id: "todoist", title: "Todoist", desc: "Todoist is a task management and to-do list application.", icon: "✅", isConnected: false, features: ["Log task checklist queues", "Schedule generation deadlines", "Coordinate workspace goals", "Notify personal task updates"] },
  { id: "outlook", title: "Microsoft Outlook", desc: "Microsoft Outlook is an email and calendar service.", icon: "📅", isConnected: false, features: ["Manage workflow calendars", "Send transaction invoice emails", "Schedule rendering triggers", "Coordinate client inbox logs"] },
  { id: "vimeo", title: "Vimeo", desc: "Vimeo is a video hosting, sharing, and streaming platform.", icon: "📹", isConnected: false, features: ["Host completed cinematic works", "Update video portfolio sheets", "Embed video layouts on pages", "Manage user video comments"] },
  { id: "frameio", title: "Frame.io", desc: "Search assets, create projects, and post comments on Frame.io video reviews.", icon: "🎬", isConnected: false, features: ["Post timeline feedback tags", "Index review video frames", "Export approval status logs", "Sync collaborative media assets"] }
];

const DEFAULT_FILES: AssetFile[] = [
  { id: "file-1", name: "raw_podcast_recording_01.mp4", size: "128.5 MB", type: "video", date: "2026-05-27" },
  { id: "file-2", name: "workspace_script_draft.docx", size: "12.4 KB", type: "document", date: "2026-05-26" },
  { id: "file-3", name: "cinematic_reference_shot.jpg", size: "1.2 MB", type: "image", date: "2026-05-25" }
];

const DEFAULT_MEMORIES: MemoryNode[] = [
  { id: "mem-1", text: "aspect_ratio: 9:16 vertical" },
  { id: "mem-2", text: "lighting: warm golden cinematic" },
  { id: "mem-3", text: "character_voice: confident male" },
  { id: "mem-4", text: "transitions: seamless match cut" },
  { id: "mem-5", text: "resolution: 4K Ultra HD" }
];

const SUGGESTION_CHIPS = [
  { id: "clipper", label: "Personal Clipper", badge: "New", icon: "🎬" },
  { id: "skills", label: "Build with skills", icon: "✦" },
  { id: "ugc", label: "Create UGC", icon: "🎭" },
  { id: "marketing", label: "Run marketing", icon: "📈" },
  { id: "cinema", label: "Shoot cinema", icon: "🎥" },
  { id: "animate", label: "Animate Portrait", icon: "✨" },
];

const EXAMPLE_PROMPTS: Record<string, string[]> = {
  clipper: [
    "Cut my hour-long recording into 5 vertical clips focusing on high-energy hooks",
    "Turn my stream footage into short video segments with centered captions",
    "Identify key moments in my narration and structure them into reels",
  ],
  skills: [
    "Chain script generation and vertical rendering into a single automated pipeline",
    "Combine high-resolution upscale with slow horizontal camera pan movements",
    "Create a character script that maintains visual styling across different scenes",
  ],
  ugc: [
    "Generate a virtual video presenter reviewing product specifications with subtitles",
    "Create a vertical camera layout showing a narrator explaining tech hacks",
    "Synthesize a natural presentation of corporate announcements",
  ],
  marketing: [
    "Create 5 vertical ad variations with a distinct hook and call-to-action",
    "Produce a 15-second visual promo with deep text overlays and fast cuts",
    "Generate high-fidelity layout graphics matching the creative brief",
  ],
  cinema: [
    "Synthesize a rainy futuristic street establishing shot with neon ambient lighting",
    "Create a low-angle camera dolly shot of a spacecraft landing",
    "Direct a scene with high visual contrast and camera focus pulling",
  ],
  animate: [
    "Animate the portrait with slow ambient breathing and head tilt movements",
    "Turn this environmental artwork into a moving 5-second video loop",
    "Apply smooth camera panning to bring the landscape scene to life",
  ],
};

export default function AgentStudioPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<string>("new"); // new | search | skills | connectors | files | memory
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [credits, setCredits] = useState(1480);

  // Lists loaded from localStorage or fallbacks
  const [taskHistory, setTaskHistory] = useState<TaskRun[]>([]);
  const [skillsList, setSkillsList] = useState<CustomSkill[]>([]);
  const [connectorsList, setConnectorsList] = useState<Connector[]>([]);
  const [filesList, setFilesList] = useState<AssetFile[]>([]);
  const [memoriesList, setMemoriesList] = useState<MemoryNode[]>([]);
  const [lockedMemories, setLockedMemories] = useState<string[]>([]);

  // Task execution states
  const [prompt, setPrompt] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [activeChip, setActiveChip] = useState("clipper");
  const [selectedOrchestrator, setSelectedOrchestrator] = useState<string>("orchestrator-gemini");
  const [executionMode, setExecutionMode] = useState<"confirm" | "autorun">("confirm");
  const [executionModeDropdownOpen, setExecutionModeDropdownOpen] = useState(false);
  const [isConfirmingRun, setIsConfirmingRun] = useState(false);
  const [orchestratorDropdownOpen, setOrchestratorDropdownOpen] = useState(false);

  // Sub-tabs
  const [skillsSubTab, setSkillsSubTab] = useState<"my" | "community">("my");
  const [connectorsSubTab, setConnectorsSubTab] = useState<"available" | "installed">("available");
  const [filesSubTab, setFilesSubTab] = useState<"all" | "video" | "image" | "document">("all");
  const [isDragging, setIsDragging] = useState(false);
  const [memorySubTab, setMemorySubTab] = useState<"os">("os");

  // Search filter
  const [skillsCategory, setSkillsCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [newSkillTitle, setNewSkillTitle] = useState("");
  const [newSkillDesc, setNewSkillDesc] = useState("");
  const [newSkillPrompt, setNewSkillPrompt] = useState("");
  const [newSkillCategory, setNewSkillCategory] = useState("Content Creation");

  // Connectors integration modal flow
  const [activeConnector, setActiveConnector] = useState<Connector | null>(null);
  const [connectorStep, setConnectorStep] = useState<number>(1); // 1: Connect Animation, 2: OIDC Details
  const [connectorToken, setConnectorToken] = useState("");
  const [connectorSaving, setConnectorSaving] = useState(false);

  // Custom MCP states
  const [isCustomMcpModalOpen, setIsCustomMcpModalOpen] = useState(false);
  const [mcpName, setMcpName] = useState("");
  const [mcpDesc, setMcpDesc] = useState("");
  const [mcpType, setMcpType] = useState<"sse" | "stdio">("sse");
  const [mcpUrl, setMcpUrl] = useState("");
  const [mcpCommand, setMcpCommand] = useState("");
  const [mcpArgs, setMcpArgs] = useState("");
  const [mcpEnv, setMcpEnv] = useState("");

  const [newMemoryText, setNewMemoryText] = useState("");

  // Running task execution states
  const [runningTaskName, setRunningTaskName] = useState<string | null>(null);
  const [progressVal, setProgressVal] = useState(0);
  const [activeStep, setActiveStep] = useState<"idle" | "claude" | "gpt2" | "kling" | "ffmpeg" | "done">("idle");
  const [activeLogs, setActiveLogs] = useState<string[]>([]);
  const [outputVideo, setOutputVideo] = useState<string | null>(null);
  const [activeWorkflowPrompt, setActiveWorkflowPrompt] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const hist = localStorage.getItem("saad_super_history_v5");
      setTaskHistory(hist ? JSON.parse(hist) : []);

      const skills = localStorage.getItem("saad_super_skills_v5");
      setSkillsList(skills ? JSON.parse(skills) : INITIAL_SKILLS);

      const conn = localStorage.getItem("saad_super_connectors_v5");
      setConnectorsList(conn ? JSON.parse(conn) : INITIAL_CONNECTORS);

      const files = localStorage.getItem("saad_super_files_v5");
      setFilesList(files ? JSON.parse(files) : DEFAULT_FILES);

      const mem = localStorage.getItem("saad_super_memories_v5");
      setMemoriesList(mem ? JSON.parse(mem) : DEFAULT_MEMORIES);

      const locked = localStorage.getItem("saad_super_locked_memories_v5");
      setLockedMemories(locked ? JSON.parse(locked) : ["mem-1", "mem-2", "mem-3", "mem-4", "mem-5"]);

      const creds = localStorage.getItem("saad_super_credits_v5");
      if (creds) setCredits(Number(creds));
    } catch (_) {
      setTaskHistory([]);
      setSkillsList(INITIAL_SKILLS);
      setConnectorsList(INITIAL_CONNECTORS);
      setFilesList(DEFAULT_FILES);
      setMemoriesList(DEFAULT_MEMORIES);
      setLockedMemories(["mem-1", "mem-2", "mem-3", "mem-4", "mem-5"]);
    }
  }, []);

  const saveToStorage = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (_) {}
  };

  // Listen for OAuth messages from popup window
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === "OAUTH_SUCCESS" && activeConnector) {
        setConnectorToken(event.data.email);
        setConnectorStep(2);
      }
    };
    window.addEventListener("message", handleOAuthMessage);
    return () => window.removeEventListener("message", handleOAuthMessage);
  }, [activeConnector]);

  // Open simulated popup OAuth window
  const handleOpenOAuthPopup = () => {
    if (!activeConnector) return;
    const width = 500;
    const height = 620;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    window.open(
      `/agent-studio/oauth-mock?provider=${activeConnector.id}`,
      "_blank",
      `width=${width},height=${height},top=${top},left=${left},scrollbars=no,resizable=no`
    );
  };

  // Run generation task
  const handleStartTask = () => {
    if (!prompt.trim() && !youtubeUrl.trim() && activeChip === "clipper") return;
    if (!prompt.trim() && activeChip !== "clipper") return;

    let matchedSkill = skillsList.find(s => prompt.trim().startsWith(s.title));
    const activeSkillTitle = matchedSkill ? matchedSkill.title : "Standard Multi-Model Route";
    const runPrompt = prompt.trim();

    // Map orchestrator to display name
    let orchestratorName = "Claude 4.6";
    if (selectedOrchestrator === "orchestrator-gemini") {
      orchestratorName = "Gemini Orchestrator";
    } else if (selectedOrchestrator === "claude-opus-analytical") {
      orchestratorName = "Claude 3.5 Opus (Analytical)";
    } else if (selectedOrchestrator === "claude-opus-creative") {
      orchestratorName = "Claude 3.5 Opus (Creative)";
    } else if (selectedOrchestrator === "claude-sonnet") {
      orchestratorName = "Claude 3.5 Sonnet";
    } else if (selectedOrchestrator === "gemini-flash") {
      orchestratorName = "Gemini 1.5 Flash";
    } else if (selectedOrchestrator === "gemini-pro") {
      orchestratorName = "Gemini 1.5 Pro";
    }

    setRunningTaskName(activeSkillTitle);
    setActiveWorkflowPrompt(runPrompt);
    setProgressVal(0);
    setActiveStep("claude");
    setActiveLogs([]);
    setOutputVideo(null);

    const steps = [
      { text: `[${orchestratorName}] Querying active skill guidelines for ${activeSkillTitle}...`, step: "claude" as const, delay: 0 },
      { text: `[${orchestratorName}] Scripting storyboard timeline beats. Formulated scene sequence logs.`, step: "claude" as const, delay: 600 },
      { text: `[GPT Image 2] Initializing keyframe latents. Prompt size: ${runPrompt.length} tokens.`, step: "gpt2" as const, delay: 1400 },
      { text: `[GPT Image 2] Rendered 8 high-fidelity storyboard assets. Stored in temporary buffer.`, step: "gpt2" as const, delay: 2400 },
      { text: `[Kling 3.0] Processing keyframes via photorealistic video motion models...`, step: "kling" as const, delay: 3400 },
      { text: `[Kling 3.0] Motion latents calculated. Video rendering complete (resolution: 1080p).`, step: "kling" as const, delay: 4800 },
      { text: `[FFmpeg Engine] Splicing animated clips together and mixing the ambient soundtrack.`, step: "ffmpeg" as const, delay: 5600 },
      { text: `[System DB Core] Saved output as reels_render_${Date.now().toString().slice(-4)}.mp4. Spent 5 credits.`, step: "done" as const, delay: 6400 }
    ];

    const interval = setInterval(() => {
      setProgressVal((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2.5;
      });
    }, 150);

    const timers: NodeJS.Timeout[] = [];
    steps.forEach((s) => {
      const timer = setTimeout(() => {
        setActiveLogs((prev) => [...prev, s.text]);
        setActiveStep(s.step);

        if (s.step === "done") {
          clearInterval(interval);
          setProgressVal(100);
          setRunningTaskName(null);

          const finalVideo = "https://assets.mixkit.co/videos/preview/mixkit-futuristic-subway-station-with-neon-lights-44101-large.mp4";
          setOutputVideo(finalVideo);

          const updatedCredits = credits - 5;
          setCredits(updatedCredits);
          saveToStorage("saad_super_credits_v5", updatedCredits);

          // Save to history
          const newTask: TaskRun = {
            id: `task-${Date.now()}`,
            prompt: runPrompt,
            category: matchedSkill ? matchedSkill.category : activeChip,
            skillId: matchedSkill?.id,
            engine: orchestratorName,
            renderMode: "Kling 3.0 + GPT Image 2",
            fileSize: "6.2 MB",
            timestamp: new Date().toISOString().split("T")[0],
            status: "completed",
            videoUrl: finalVideo,
            logs: steps.map((log) => log.text)
          };
          const updatedHist = [newTask, ...taskHistory];
          setTaskHistory(updatedHist);
          saveToStorage("saad_super_history_v5", updatedHist);

          // Save to files list
          const newFile: AssetFile = {
            id: `file-${Date.now()}`,
            name: `reels_render_${Math.floor(100 + Math.random() * 900)}.mp4`,
            size: "6.2 MB",
            type: "video",
            date: new Date().toISOString().split("T")[0],
            url: finalVideo
          };
          const updatedFiles = [newFile, ...filesList];
          setFilesList(updatedFiles);
          saveToStorage("saad_super_files_v5", updatedFiles);
        }
      }, s.delay);
      timers.push(timer);
    });
  };

  const onSubmitPrompt = () => {
    if (!prompt.trim() && !youtubeUrl.trim() && activeChip === "clipper") return;
    if (!prompt.trim() && activeChip !== "clipper") return;

    if (executionMode === "confirm") {
      setIsConfirmingRun(true);
    } else {
      handleStartTask();
    }
  };

  // Add Custom Skill Action
  const handleCreateSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillTitle.trim() || !newSkillDesc.trim() || !newSkillPrompt.trim()) return;

    const titlePrefix = newSkillTitle.startsWith("/") ? newSkillTitle : `/${newSkillTitle}`;

    const newSkill: CustomSkill = {
      id: `skill-${Date.now()}`,
      title: titlePrefix,
      desc: newSkillDesc,
      category: newSkillCategory,
      prompt: newSkillPrompt,
      isCustom: true,
      isActive: true,
      icon: "⚡"
    };

    const updated = [newSkill, ...skillsList];
    setSkillsList(updated);
    saveToStorage("saad_super_skills_v5", updated);

    // Reset Form
    setNewSkillTitle("");
    setNewSkillDesc("");
    setNewSkillPrompt("");
    setNewSkillCategory("Content Creation");
    setIsSkillModalOpen(false);
  };

  const toggleSkillActive = (id: string) => {
    const updated = skillsList.map((s) => {
      if (s.id === id) return { ...s, isActive: !s.isActive };
      return s;
    });
    setSkillsList(updated);
    saveToStorage("saad_super_skills_v5", updated);
  };

  const deleteSkill = (id: string) => {
    const updated = skillsList.filter((s) => s.id !== id);
    setSkillsList(updated);
    saveToStorage("saad_super_skills_v5", updated);
  };

  // Save Connector Connection
  const handleSaveConnector = () => {
    if (!activeConnector) return;
    setConnectorSaving(true);

    setTimeout(() => {
      const updated = connectorsList.map((c) => {
        if (c.id === activeConnector.id) {
          return { ...c, isConnected: true, token: connectorToken };
        }
        return c;
      });

      setConnectorsList(updated);
      saveToStorage("saad_super_connectors_v5", updated);
      setActiveConnector(null);
      setConnectorToken("");
      setConnectorSaving(false);
    }, 1000);
  };

  const handleDisconnectConnector = (id: string) => {
    const updated = connectorsList.map((c) => {
      if (c.id === id) {
        return { ...c, isConnected: false, token: undefined };
      }
      return c;
    });
    setConnectorsList(updated);
    saveToStorage("saad_super_connectors_v5", updated);
  };

  // Create Custom MCP connector
  const handleCreateCustomMcp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mcpName.trim()) return;

    const newMcp: Connector = {
      id: `mcp-${Date.now()}`,
      title: mcpName,
      desc: mcpDesc || `Custom MCP Server (${mcpType})`,
      icon: "🔌",
      isConnected: true,
      token: mcpType === "sse" ? mcpUrl : mcpCommand,
      features: [
        mcpType === "sse" ? `SSE URL: ${mcpUrl}` : `Command: ${mcpCommand} ${mcpArgs}`,
        mcpEnv ? `Environment variables configured` : `No env variables`
      ]
    };

    const updated = [newMcp, ...connectorsList];
    setConnectorsList(updated);
    saveToStorage("saad_super_connectors_v5", updated);
    setIsCustomMcpModalOpen(false);

    // Reset
    setMcpName("");
    setMcpDesc("");
    setMcpType("sse");
    setMcpUrl("");
    setMcpCommand("");
    setMcpArgs("");
    setMcpEnv("");
  };

  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryText.trim()) return;

    const newMem: MemoryNode = {
      id: `mem-${Date.now()}`,
      text: newMemoryText
    };

    const updated = [...memoriesList, newMem];
    setMemoriesList(updated);
    saveToStorage("saad_super_memories_v5", updated);
    setNewMemoryText("");
  };

  const handleDeleteMemory = (id: string) => {
    const updated = memoriesList.filter((m) => m.id !== id);
    setMemoriesList(updated);
    saveToStorage("saad_super_memories_v5", updated);
  };

  const processFiles = (files: FileList) => {
    const newFiles: AssetFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let type: "image" | "video" | "document" = "document";
      if (file.type.startsWith("image/")) type = "image";
      else if (file.type.startsWith("video/")) type = "video";

      const formattedSize =
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${(file.size / 1024).toFixed(1)} KB`;

      newFiles.push({
        id: `file-${Date.now()}-${i}`,
        name: file.name,
        size: formattedSize,
        type,
        date: new Date().toISOString().split("T")[0]
      });
    }

    const updated = [...newFiles, ...filesList];
    setFilesList(updated);
    saveToStorage("saad_super_files_v5", updated);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleDeleteFile = (id: string) => {
    const updated = filesList.filter((f) => f.id !== id);
    setFilesList(updated);
    saveToStorage("saad_super_files_v5", updated);
  };

  const clearHistory = () => {
    setTaskHistory([]);
    saveToStorage("saad_super_history_v5", []);
  };

  // Filters
  const filteredSkills = skillsList.filter((skill) => {
    const matchesSearch =
      skill.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.desc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      skillsCategory === "All" || skill.category === skillsCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredHistory = taskHistory.filter((t) =>
    t.prompt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFiles = filesList.filter((f) => {
    const matchesQuery = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType =
      filesSubTab === "all" || f.type === filesSubTab;
    return matchesQuery && matchesType;
  });

  return (
    <div className="relative flex h-[calc(100vh-4rem)] w-full overflow-hidden text-[#e2e8f0] bg-[#02040a]">
      {/* Glow Orbs in background */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute left-1/4 top-1/4 h-[500px] w-[500px] rounded-full bg-violet-600/5 blur-[120px] mix-blend-screen animate-pulse" />
        <div className="absolute right-1/4 bottom-1/4 h-[600px] w-[600px] rounded-full bg-cyan-500/5 blur-[140px] mix-blend-screen" />
      </div>

      {/* LEFT NAVIGATION SIDEBAR */}
      <aside
        className={`relative z-20 flex flex-col border-r border-white/5 bg-[#050914]/95 backdrop-blur-2xl transition-all duration-300 shrink-0 ${
          sidebarOpen ? "w-[260px]" : "w-0 overflow-hidden"
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="relative h-7 w-7 rounded-lg overflow-hidden border border-violet-500/30 shadow-[0_0_12px_rgba(139,92,246,0.2)] bg-slate-900/60 p-0.5 animate-pulse">
              <Image
                src="/logo-saad-transparent.png"
                alt="Saad Studio Logo"
                width={28}
                height={28}
                className="object-contain"
              />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-sans font-bold text-xs tracking-wide text-white">Saad Studio</span>
              <span className="text-[8.5px] text-zinc-500 font-bold tracking-widest uppercase">Agent Studio</span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white transition"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Sidebar Navigation Tabs */}
        <nav className="mt-4 flex flex-col gap-0.5 px-2">
          {[
            { id: "new", label: "+ New task", icon: Plus },
            { id: "search", label: "Search", icon: Search },
            { id: "skills", label: "Skills", icon: Sparkles },
            { id: "connectors", label: "Connectors", icon: Plug },
            { id: "files", label: "Files", icon: FolderClosed },
            { id: "memory", label: "Memory", icon: Brain }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchQuery("");
                }}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-left transition ${
                  isActive
                    ? "bg-gradient-to-r from-violet-600/20 to-cyan-500/10 border border-violet-500/20 text-white font-medium shadow-[0_4px_12px_rgba(139,92,246,0.1)]"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <tab.icon className={`h-[15px] w-[15px] ${isActive ? "text-violet-400" : "text-zinc-500 group-hover:text-zinc-300"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Tasks background panel */}
        <div className="mt-6 px-4 flex flex-col gap-2.5">
          <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 text-left px-0.5">
            Tasks
          </div>
          
          {runningTaskName ? (
            <div className="p-3 rounded-xl border border-violet-500/20 bg-violet-950/10 space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-white truncate max-w-[130px]">{runningTaskName}</span>
                <span className="text-[9px] text-cyan-400 font-bold animate-pulse">Running</span>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 animate-pulse" style={{ width: `${progressVal}%` }} />
              </div>
            </div>
          ) : (
            <div className="p-4 border border-dashed border-white/5 rounded-xl text-center">
              <span className="text-[10px] text-zinc-600">No tasks yet</span>
              <span className="text-[8px] text-zinc-700 block mt-0.5">Create one to get started</span>
            </div>
          )}
        </div>

        {/* Profile Card & Credits */}
        <div className="mt-auto p-3.5 border-t border-white/5 flex flex-col gap-2 bg-[#040710]/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-violet-500 bg-gradient-to-tr from-violet-600 to-cyan-400 text-[10px] font-bold text-[#0c1426] shadow-[0_0_12px_rgba(139,92,246,0.25)]">
                {user?.imageUrl ? (
                  <Image src={user.imageUrl} alt="User Avatar" fill className="rounded-full object-cover" />
                ) : (
                  <span className="uppercase text-white font-bold">SS</span>
                )}
              </div>
              <div className="flex flex-col min-w-0 text-left">
                <span className="text-[11.5px] font-bold text-white truncate leading-tight">
                  {user?.username || "pointillistpret..."}
                </span>
                <span className="text-[9.5px] text-zinc-500 truncate leading-tight">Credits: {credits}</span>
              </div>
            </div>
            <button className="text-zinc-500 hover:text-white transition p-1 hover:bg-white/5 rounded-md">
              <Settings className="h-3.5 w-3.5" />
            </button>
          </div>
          
          <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-white/5">
            <span className="text-[9px] bg-violet-600/25 border border-violet-500/25 text-violet-300 font-bold px-1.5 py-0.5 rounded">
              Pricing 50% OFF
            </span>
          </div>
        </div>
      </aside>

      {/* Sidebar Reopen Button */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="absolute left-3 top-3 z-30 rounded-lg border border-white/5 bg-[#050914]/90 p-2 text-zinc-400 backdrop-blur-xl hover:text-white hover:border-white/10 transition"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* MAIN CONTENT REGION */}
      <main className="relative flex flex-1 flex-col bg-[#02040a] z-10 min-w-0">
        
        {/* Top Header Panel */}
        <header className="flex items-center justify-between px-6 py-3.5 border-b border-white/5 bg-[#050914]/30 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2.5 text-zinc-400 text-xs font-semibold">
            <span>Neural Dashboard</span>
            <span className="text-zinc-700">/</span>
            <span className="text-white capitalize">{activeTab === "new" ? "New Task" : activeTab}</span>
          </div>

          {/* Center selectors */}
          <div className="flex items-center bg-white/[0.02] border border-white/5 rounded-xl p-0.5">
            {[
              { id: "skills", label: "Skills" },
              { id: "memory", label: "Memory" },
              { id: "connectors", label: "Connectors" }
            ].map((headerTab) => {
              const active = activeTab === headerTab.id;
              return (
                <button
                  key={headerTab.id}
                  onClick={() => setActiveTab(headerTab.id)}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
                    active
                      ? "bg-violet-600/20 text-violet-300 border border-violet-500/20 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {headerTab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button className="text-xs border border-white/5 bg-white/[0.02] px-3.5 py-1.5 rounded-lg text-zinc-300 hover:bg-white/[0.05] transition">
              Buy credits
            </button>
            <button className="text-xs border border-white/5 bg-white/[0.02] px-3 py-1.5 rounded-lg text-zinc-300 hover:bg-white/[0.05] transition">
              Shortcuts
            </button>
          </div>
        </header>

        {/* WORKSPACE CENTRAL SCREEN */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 hide-scrollbar">
          
          {/* ======================================================== */}
          {/* TAB 1: NEW TASK (CREATION / PROMPT WORKSPACE) */}
          {/* ======================================================== */}
          {activeTab === "new" && (
            <div className="max-w-[760px] mx-auto space-y-8 py-4">
              
              {!runningTaskName && !outputVideo ? (
                <>
                  {/* Neural logo icon container */}
                  <div className="flex flex-col items-center justify-center text-center space-y-3">
                    <div className="relative h-14 w-14 rounded-2xl overflow-hidden border border-violet-500/20 bg-slate-950/40 p-2.5 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.15)] animate-pulse">
                      <svg className="w-10 h-10 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                      </svg>
                    </div>

                    <h2 className="text-xl font-extrabold text-white tracking-wide mt-2">
                      seed, what are we creating today?
                      <span className="inline-block w-1.5 h-4 ml-1 bg-violet-500 animate-blink" />
                    </h2>
                  </div>

                  {/* Capsule Prompt Box */}
                  <div className="relative rounded-2xl border border-white/[0.08] bg-[#050914]/85 p-3.5 shadow-2xl backdrop-blur-xl transition hover:border-white/[0.12]">
                    
                    {activeChip === "clipper" && (
                      <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-xl bg-[#090f1d] border border-white/5">
                        <LinkIcon className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                        <input
                          type="url"
                          value={youtubeUrl}
                          onChange={(e) => setYoutubeUrl(e.target.value)}
                          placeholder="Paste source video link or stream URL..."
                          className="w-full bg-transparent border-none outline-none text-xs text-white placeholder-zinc-500"
                        />
                      </div>
                    )}

                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={
                        activeChip === "clipper"
                          ? "Enter prompt instructions (e.g. Cut high-contrast moments with dynamic subtitles)..."
                          : "Describe the rendering script or choose an active workspace skill below..."
                      }
                      className="w-full min-h-[90px] bg-transparent border-none outline-none resize-none px-3 text-xs text-white placeholder-zinc-500 leading-relaxed font-sans"
                    />

                    {/* Slash Command Autocomplete Popover */}
                    {prompt.startsWith("/") && !prompt.includes(" ") && (
                      <div className="absolute left-4 bottom-full mb-3 z-50 w-[360px] rounded-xl border border-white/10 bg-[#090f1d]/95 backdrop-blur-xl p-2.5 shadow-2xl flex flex-col gap-1.5 text-left">
                        <div className="flex items-center justify-between border-b border-white/5 pb-1.5 px-1.5 mb-1">
                          <span className="text-[9.5px] font-bold text-zinc-400 uppercase tracking-wider">Slash Commands</span>
                          <span className="text-[8.5px] text-zinc-600">Type command prefix to filter</span>
                        </div>
                        <div className="max-h-[180px] overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">
                          {skillsList
                            .filter(s => s.isActive && s.title.toLowerCase().includes(prompt.toLowerCase()))
                            .map(s => (
                              <button
                                key={s.id}
                                onClick={() => {
                                  setPrompt(`${s.title} `);
                                  setSelectedSkill(s.id);
                                }}
                                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-violet-600/10 transition border border-transparent hover:border-violet-500/10 flex items-center gap-2"
                              >
                                <span className="text-sm shrink-0">{s.icon}</span>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[11px] font-bold text-white font-mono">{s.title}</span>
                                  <span className="text-[9px] text-zinc-500 truncate leading-tight">{s.desc}</span>
                                </div>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Selector & Actions row */}
                    <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-white/5 px-2">
                      {/* Left: Attachment + Orchestrator Model Selector */}
                      <div className="flex items-center gap-2">
                        {/* Attachment + button */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-[#090f1d] hover:bg-white/[0.04] text-zinc-400 hover:text-white transition"
                        >
                          <Plus className="h-4 w-4" />
                        </button>

                        {/* Orchestrator Selector Dropdown */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOrchestratorDropdownOpen(!orchestratorDropdownOpen)}
                            className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-[#090f1d] px-2.5 py-1.5 text-[10.5px] hover:border-white/10 text-zinc-300 font-semibold transition"
                          >
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                            {selectedOrchestrator === "orchestrator-gemini" ? (
                              <>
                                <span className="text-white font-extrabold">Orchestrator New</span>
                                <span className="text-zinc-500 font-medium hidden sm:inline">Powered by Gemini</span>
                              </>
                            ) : selectedOrchestrator.startsWith("claude-") ? (
                              <>
                                <span className="text-orange-400 font-extrabold">Claude</span>
                                <span className="text-white font-bold">
                                  {selectedOrchestrator === "claude-opus-analytical" ? "Opus 3.5" : selectedOrchestrator === "claude-opus-creative" ? "Opus 3.5" : "Sonnet 3.5"}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="text-blue-400 font-extrabold">Google</span>
                                <span className="text-white font-bold">
                                  {selectedOrchestrator === "gemini-flash" ? "Gemini 1.5 Flash" : "Gemini 1.5 Pro"}
                                </span>
                              </>
                            )}
                            <ChevronDown className="h-3 w-3 text-zinc-500 ml-0.5" />
                          </button>

                          {orchestratorDropdownOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-40 bg-transparent"
                                onClick={() => setOrchestratorDropdownOpen(false)}
                              />
                              <div className="absolute left-0 bottom-full mb-2 z-50 w-[300px] rounded-xl border border-white/10 bg-[#090f1d]/95 p-2.5 shadow-2xl backdrop-blur-xl text-left">
                                <div className="max-h-[260px] overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
                                  
                                  {/* Orchestrator Option */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedOrchestrator("orchestrator-gemini");
                                      setOrchestratorDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-2.5 py-2 rounded-lg text-[10.5px] transition flex flex-col gap-0.5 ${
                                      selectedOrchestrator === "orchestrator-gemini"
                                        ? "bg-violet-600/15 text-white border border-violet-500/25"
                                        : "text-zinc-400 hover:bg-white/[0.03] hover:text-white border border-transparent"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                      <span className="font-extrabold text-white">Orchestrator New</span>
                                    </div>
                                    <span className="text-[8.5px] text-zinc-500 leading-tight">Powered by Gemini. Smart orchestration model.</span>
                                  </button>

                                  {/* Claude Group */}
                                  <div className="space-y-1">
                                    <div className="text-[8.5px] font-bold text-zinc-500 uppercase tracking-widest px-2.5">
                                      Claude
                                    </div>
                                    <div className="space-y-0.5">
                                      {[
                                        { id: "claude-opus-analytical", title: "Opus 3.5", subtitle: "Best for complex, analytical work" },
                                        { id: "claude-opus-creative", title: "Opus 3.5", subtitle: "Best for long-form creative work" },
                                        { id: "claude-sonnet", title: "Sonnet 3.5", subtitle: "Responsive everyday work" }
                                      ].map((m) => (
                                        <button
                                          key={m.id}
                                          type="button"
                                          onClick={() => {
                                            setSelectedOrchestrator(m.id);
                                            setOrchestratorDropdownOpen(false);
                                          }}
                                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10.5px] transition flex flex-col ${
                                            selectedOrchestrator === m.id
                                              ? "bg-violet-600/15 text-white border border-violet-500/25"
                                              : "text-zinc-400 hover:bg-white/[0.03] hover:text-white border border-transparent"
                                          }`}
                                        >
                                          <span className="font-bold text-white font-mono">{m.title}</span>
                                          <span className="text-[8.5px] text-zinc-500 leading-tight">{m.subtitle}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Google Group */}
                                  <div className="space-y-1">
                                    <div className="text-[8.5px] font-bold text-zinc-500 uppercase tracking-widest px-2.5">
                                      Google
                                    </div>
                                    <div className="space-y-0.5">
                                      {[
                                        { id: "gemini-flash", title: "Gemini 1.5 Flash", subtitle: "Fast, high-quality responses" },
                                        { id: "gemini-pro", title: "Gemini 1.5 Pro", subtitle: "Deep research, complex tasks" }
                                      ].map((m) => (
                                        <button
                                          key={m.id}
                                          type="button"
                                          onClick={() => {
                                            setSelectedOrchestrator(m.id);
                                            setOrchestratorDropdownOpen(false);
                                          }}
                                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10.5px] transition flex flex-col ${
                                            selectedOrchestrator === m.id
                                              ? "bg-violet-600/15 text-white border border-violet-500/25"
                                              : "text-zinc-400 hover:bg-white/[0.03] hover:text-white border border-transparent"
                                          }`}
                                        >
                                          <span className="font-bold text-white font-mono">{m.title}</span>
                                          <span className="text-[8.5px] text-zinc-500 leading-tight">{m.subtitle}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right: Confirmation Mode + Submit button */}
                      <div className="flex items-center gap-2">
                        {/* Ask before generation selector */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setExecutionModeDropdownOpen(!executionModeDropdownOpen)}
                            className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-[#090f1d] px-2.5 py-1.5 text-[10.5px] hover:border-white/10 text-zinc-300 font-semibold transition"
                          >
                            <span>
                              {executionMode === "confirm"
                                ? "Ask before generation"
                                : "Auto-run without asking"}
                            </span>
                            <ChevronDown className="h-3 w-3 text-zinc-500" />
                          </button>

                          {executionModeDropdownOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-40 bg-transparent"
                                onClick={() => setExecutionModeDropdownOpen(false)}
                              />
                              <div className="absolute right-0 bottom-full mb-2 z-50 w-[200px] rounded-xl border border-white/10 bg-[#090f1d]/95 p-1.5 shadow-2xl backdrop-blur-xl text-left">
                                <div className="space-y-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setExecutionMode("autorun");
                                      setExecutionModeDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-2.5 py-2 rounded-lg text-[10.5px] transition flex items-center justify-between ${
                                      executionMode === "autorun"
                                        ? "bg-violet-600/10 text-white font-bold"
                                        : "text-zinc-400 hover:bg-white/[0.03] hover:text-white"
                                    }`}
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <CheckCircle2 className="h-3.5 w-3.5 text-violet-400" />
                                      <span>Auto-run without asking</span>
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setExecutionMode("confirm");
                                      setExecutionModeDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-2.5 py-2 rounded-lg text-[10.5px] transition flex items-center justify-between ${
                                      executionMode === "confirm"
                                        ? "bg-violet-600/10 text-white font-bold"
                                        : "text-zinc-400 hover:bg-white/[0.03] hover:text-white"
                                    }`}
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <HelpCircle className="h-3.5 w-3.5 text-violet-400" />
                                      <span>Confirm before running</span>
                                    </span>
                                    {executionMode === "confirm" && (
                                      <Check className="h-3.5 w-3.5 text-violet-400" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Submit Send Button */}
                        <button
                          type="button"
                          onClick={onSubmitPrompt}
                          disabled={(!prompt.trim() && !youtubeUrl.trim() && activeChip === "clipper") || (!prompt.trim() && activeChip !== "clipper")}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-white shadow-[0_4px_12px_rgba(139,92,246,0.3)] transition hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Suggestion Badges */}
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {SUGGESTION_CHIPS.map((chip: { id: string; label: string; icon: string; badge?: string }) => {
                      const isActive = chip.id === activeChip;
                      return (
                        <button
                          key={chip.id}
                          onClick={() => {
                            setActiveChip(chip.id);
                            setPrompt("");
                            setYoutubeUrl("");
                          }}
                          className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs transition ${
                            isActive
                              ? "border-violet-500 bg-violet-500/10 text-white shadow-[0_0_12px_rgba(139,92,246,0.15)]"
                              : "border-white/5 bg-white/[0.02] text-zinc-400 hover:border-white/10"
                          }`}
                        >
                          <span>{chip.icon}</span>
                          <span>{chip.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Examples checklist */}
                  <div className="flex flex-col gap-2 bg-white/[0.01] border border-white/5 rounded-2xl p-4 text-left">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">
                      Quick Start Prompt Suggestions
                    </span>
                    <div className="flex flex-col gap-2">
                      {(EXAMPLE_PROMPTS[activeChip] || []).map((ex: string, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => {
                            if (activeChip === "clipper") {
                              setYoutubeUrl("https://www.youtube.com/watch?v=saad_studio_footage_921");
                            }
                            setPrompt(ex);
                          }}
                          className="flex items-center text-xs text-zinc-400 hover:text-white hover:bg-white/[0.02] p-2.5 rounded-lg border border-white/5 text-left transition truncate"
                        >
                          <span className="text-violet-400 mr-2">→</span>
                          <span className="truncate">{ex}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                /* Execution Progress Flow & Logs View */
                <div className="space-y-6">
                  
                  {/* Status header card */}
                  <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-[#050914]/80 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600/10 border border-violet-500/20 text-violet-400">
                        <Activity className="h-5 w-5 animate-pulse" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-bold text-white">Pipeline: {runningTaskName || "Multi-Model Route"}</span>
                        <span className="text-[10px] text-zinc-500 truncate max-w-[280px]">
                          Prompt: {activeWorkflowPrompt}
                        </span>
                      </div>
                    </div>
                    {runningTaskName ? (
                      <span className="text-xs font-bold text-cyan-400 animate-pulse">{Math.round(progressVal)}% Executing</span>
                    ) : (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" /> Render Complete
                      </span>
                    )}
                  </div>

                  {/* VISUAL MODEL FLOW CHART */}
                  <div className="p-5 rounded-2xl border border-white/5 bg-[#050914]/50 space-y-4">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-left block">
                      Active Model Execution Line
                    </span>
                    
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { id: "claude", name: "Claude 4.6", desc: "Plan & Script" },
                        { id: "gpt2", name: "GPT Image 2", desc: "Storyboard Render" },
                        { id: "kling", name: "Kling 3.0", desc: "Video Animation" },
                        { id: "ffmpeg", name: "FFmpeg Engine", desc: "Stitching & Audio" }
                      ].map((modelStep, idx) => {
                        const isCurrent = activeStep === modelStep.id;
                        const isDone = progressVal === 100 || (idx === 0 && (activeStep === "gpt2" || activeStep === "kling" || activeStep === "ffmpeg" || activeStep === "done")) ||
                                       (idx === 1 && (activeStep === "kling" || activeStep === "ffmpeg" || activeStep === "done")) ||
                                       (idx === 2 && (activeStep === "ffmpeg" || activeStep === "done")) ||
                                       (idx === 3 && activeStep === "done");
                        
                        return (
                          <div
                            key={modelStep.id}
                            className={`p-3 rounded-xl border text-left transition flex flex-col justify-between h-[82px] ${
                              isCurrent
                                ? "bg-violet-950/20 border-violet-500/60 ring-1 ring-violet-500/30 shadow-[0_0_12px_rgba(139,92,246,0.2)] animate-pulse"
                                : isDone
                                ? "bg-emerald-950/5 border-emerald-500/40 text-emerald-400"
                                : "bg-white/[0.01] border-white/5 text-zinc-500"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider">{modelStep.name}</span>
                              {isDone ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                              ) : isCurrent ? (
                                <Activity className="h-3.5 w-3.5 text-violet-400 animate-spin" />
                              ) : (
                                <HelpCircle className="h-3.5 w-3.5 text-zinc-600" />
                              )}
                            </div>
                            <span className="text-[9px] text-zinc-500 block leading-tight mt-1">{modelStep.desc}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Grid: Live logs terminal and cinematic player output */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                    
                    {/* Live logs console */}
                    <div className="md:col-span-7 flex flex-col h-[280px] rounded-2xl border border-white/5 bg-[#050914] p-4 text-left">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
                        <div className="flex items-center gap-2">
                          <Terminal className="h-4 w-4 text-violet-400" />
                          <span className="text-[11px] font-bold text-white font-mono">live_orchestration.log</span>
                        </div>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto font-mono text-[10px] text-cyan-300/80 space-y-2 hide-scrollbar pr-1">
                        {activeLogs.map((log, index) => (
                          <div key={index} className="leading-relaxed border-l border-violet-500/20 pl-2">
                            {log}
                          </div>
                        ))}
                        {runningTaskName && (
                          <div className="flex items-center gap-1 text-zinc-500 pl-2 font-bold animate-pulse">
                            <span>_</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Cinematic media preview player */}
                    <div className="md:col-span-5 flex flex-col items-center justify-center h-[280px] rounded-2xl border border-white/5 bg-[#050914] p-4 relative overflow-hidden text-center">
                      {outputVideo ? (
                        <div className="absolute inset-0 bg-black z-10 flex flex-col">
                          <video
                            src={outputVideo}
                            autoPlay
                            muted
                            loop
                            playsInline
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 left-2 z-20 rounded bg-black/60 border border-white/10 px-2 py-0.5 text-[8px] font-bold text-emerald-400 tracking-wider">
                            R2 Storage Stream
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className="relative h-12 w-12 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full border border-violet-500/20 border-t-violet-400 animate-spin" />
                            <HardDrive className="h-5 w-5 text-violet-400 animate-pulse" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white uppercase tracking-wider block">Monitor Loading</span>
                            <span className="text-[10px] text-zinc-500 mt-1 block">Compiling files to vault storage</span>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Actions post render */}
                  {!runningTaskName && (
                    <div className="flex items-center justify-between border-t border-white/5 pt-4">
                      <button
                        onClick={() => setActiveTab("files")}
                        className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition"
                      >
                        <FolderClosed className="h-4 w-4 text-violet-400" />
                        <span>View rendered file in Workspace Files</span>
                      </button>

                      <button
                        onClick={() => {
                          setPrompt("");
                          setYoutubeUrl("");
                          setOutputVideo(null);
                          setProgressVal(0);
                          setActiveLogs([]);
                          setActiveStep("idle");
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-xl shadow-[0_4px_12px_rgba(139,92,246,0.2)] transition"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>New Task prompt</span>
                      </button>
                    </div>
                  )}

                </div>
              )}

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: SEARCH (RUN HISTORY FILTER) */}
          {/* ======================================================== */}
          {activeTab === "search" && (
            <div className="max-w-[860px] mx-auto space-y-4 text-left">
              <div className="flex items-center justify-between mb-2">
                <div className="flex flex-col">
                  <h2 className="text-lg font-bold text-white">Task Run History</h2>
                  <p className="text-xs text-zinc-500">Query and filter completed pipeline tasks.</p>
                </div>
                {taskHistory.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear history</span>
                  </button>
                )}
              </div>

              {/* Filter search bar */}
              <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-[#050914]/80 px-3.5 py-2.5">
                <Search className="h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Type parameters or prompts to query runs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-xs text-white placeholder-zinc-500"
                />
              </div>

              {filteredHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 border border-white/5 rounded-2xl bg-white/[0.01] text-center space-y-2">
                  <Clock className="h-8 w-8 text-zinc-600 animate-pulse" />
                  <span className="text-xs font-semibold text-zinc-400">No matching history found</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredHistory.map((run) => (
                    <div key={run.id} className="p-4 rounded-xl border border-white/5 bg-[#050914]/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex flex-col text-left space-y-1 max-w-[520px]">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] bg-violet-500/20 text-violet-300 font-bold px-1.5 py-0.5 rounded capitalize">
                            {run.category}
                          </span>
                          <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-bold px-1.5 py-0.5 rounded font-mono">
                            {run.engine}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-medium">{run.timestamp}</span>
                        </div>
                        <span className="text-xs text-white font-medium line-clamp-2 leading-relaxed">{run.prompt}</span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[10px] text-zinc-500">{run.fileSize}</span>
                        <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[9px] px-2 py-0.5 rounded">
                          <Check className="h-3 w-3" />
                          <span>Completed</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: WORKFLOW SKILLS (THE CAPABILITY REGISTRY) */}
          {/* ======================================================== */}
          {activeTab === "skills" && (
            <div className="max-w-[960px] mx-auto space-y-6 text-left">
              
              {/* Header options */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div className="flex flex-col">
                  <h2 className="text-lg font-bold text-white">Install Skills to evolve Agent Studio</h2>
                  
                  {/* Sub-tabs */}
                  <div className="flex items-center gap-4 mt-2">
                    <button
                      onClick={() => setSkillsSubTab("my")}
                      className={`text-xs font-bold pb-1 transition border-b-2 ${
                        skillsSubTab === "my" ? "border-violet-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      My skills
                    </button>
                    <button
                      onClick={() => setSkillsSubTab("community")}
                      className={`text-xs font-bold pb-1 transition border-b-2 ${
                        skillsSubTab === "community" ? "border-violet-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      Community
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="px-3.5 py-2 border border-white/5 bg-white/[0.02] text-xs font-bold text-zinc-300 rounded-xl hover:bg-white/[0.05] transition">
                    Import
                  </button>
                  <button
                    onClick={() => setIsSkillModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-[0_4px_12px_rgba(139,92,246,0.2)] transition shrink-0"
                  >
                    Create Skill
                  </button>
                </div>
              </div>

              {/* Categories selector */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-white/5 hide-scrollbar">
                {SKILL_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSkillsCategory(category)}
                    className={`px-3 py-1.5 text-[10.5px] font-bold rounded-lg transition shrink-0 whitespace-nowrap ${
                      skillsCategory === category
                        ? "bg-violet-500/10 border border-violet-500/20 text-white"
                        : "border border-white/5 bg-white/[0.01] text-zinc-400 hover:border-white/10"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {/* Search bar */}
              <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-[#050914]/80 px-3.5 py-2.5">
                <Search className="h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search active skills or community workflows..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-xs text-white placeholder-zinc-500"
                />
              </div>

              {/* Grid of skills */}
              {filteredSkills.length === 0 ? (
                <div className="text-center p-8 border border-white/5 bg-white/[0.01] rounded-2xl">
                  <span className="text-xs text-zinc-500">No matching skills found in the workspace catalog.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSkills.map((skill) => (
                    <div
                      key={skill.id}
                      className={`p-4 rounded-xl border transition flex flex-col justify-between h-[190px] relative hover:shadow-[0_4px_20px_rgba(139,92,246,0.1)] group ${
                        skill.isActive
                          ? "border-violet-500/30 bg-violet-950/[0.08]"
                          : "border-white/5 bg-white/[0.01] hover:border-white/10"
                      }`}
                    >
                      <div className="space-y-1.5 text-left">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl shrink-0">{skill.icon}</span>
                            <span className="text-xs font-extrabold text-white group-hover:text-violet-300 transition font-mono">
                              {skill.title}
                            </span>
                          </div>
                          
                          <button
                            onClick={() => toggleSkillActive(skill.id)}
                            className={`h-5 w-5 flex items-center justify-center rounded-full border transition shrink-0 ${
                              skill.isActive
                                ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-400"
                                : "bg-white/[0.03] border-white/10 text-zinc-500 hover:text-white"
                            }`}
                          >
                            {skill.isActive ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                          </button>
                        </div>
                        <p className="text-[10px] text-zinc-400 line-clamp-4 leading-normal mt-1">{skill.desc}</p>
                      </div>

                      <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-auto">
                        <span className="text-[8.5px] text-zinc-600 uppercase font-bold font-mono truncate max-w-[130px]">
                          {skill.category}
                        </span>
                        {skill.isCustom && (
                          <button
                            onClick={() => deleteSkill(skill.id)}
                            className="text-zinc-600 hover:text-red-400 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Create Skill Form Modal */}
              {isSkillModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
                  <div className="relative w-full max-w-[420px] rounded-2xl border border-white/10 bg-[#050914] p-5 shadow-2xl space-y-4">
                    <button
                      onClick={() => setIsSkillModalOpen(false)}
                      className="absolute right-4 top-4 text-zinc-500 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    
                    <h3 className="text-sm font-bold text-white">Create Custom Workspace Skill</h3>
                    
                    <form onSubmit={handleCreateSkill} className="space-y-3.5 text-xs text-left">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-zinc-400 font-semibold">Skill Slash Command</label>
                        <input
                          type="text"
                          required
                          value={newSkillTitle}
                          onChange={(e) => setNewSkillTitle(e.target.value)}
                          placeholder="e.g. /my-custom-clipper"
                          className="w-full rounded-lg border border-white/5 bg-[#090f1d] px-3 py-2 text-white outline-none placeholder-zinc-600"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-zinc-400 font-semibold">Description</label>
                        <textarea
                          required
                          value={newSkillDesc}
                          onChange={(e) => setNewSkillDesc(e.target.value)}
                          placeholder="Summarize the capability process."
                          className="w-full rounded-lg border border-white/5 bg-[#090f1d] px-3 py-2 text-white outline-none placeholder-zinc-600"
                          rows={2}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-zinc-400 font-semibold">System Prompt Instructions</label>
                        <textarea
                          required
                          value={newSkillPrompt}
                          onChange={(e) => setNewSkillPrompt(e.target.value)}
                          placeholder="Define the workflow sequence details..."
                          className="w-full rounded-lg border border-white/5 bg-[#090f1d] px-3 py-2 text-white outline-none placeholder-zinc-600"
                          rows={3}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-zinc-400 font-semibold">Category</label>
                        <select
                          value={newSkillCategory}
                          onChange={(e) => setNewSkillCategory(e.target.value)}
                          className="w-full rounded-lg border border-white/5 bg-[#090f1d] px-3 py-2 text-white outline-none"
                        >
                          {SKILL_CATEGORIES.filter(c => c !== "All").map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="submit"
                        className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 py-2.5 font-bold text-white transition mt-2 shadow-[0_4px_12px_rgba(139,92,246,0.2)]"
                      >
                        Create Skill
                      </button>
                    </form>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: CONNECTORS (INTEGRATIONS CANVAS) */}
          {/* ======================================================== */}
          {activeTab === "connectors" && (
            <div className="max-w-[960px] mx-auto space-y-6 text-left">
              
              {/* Header */}
              <div className="flex flex-col border-b border-white/5 pb-4">
                <h2 className="text-lg font-bold text-white">Install Connectors for context in Agent Studio</h2>
                
                <div className="flex items-center justify-between mt-2.5">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setConnectorsSubTab("available")}
                      className={`text-xs font-bold pb-1 transition border-b-2 ${
                        connectorsSubTab === "available" ? "border-violet-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      Available
                    </button>
                    <button
                      onClick={() => setConnectorsSubTab("installed")}
                      className={`text-xs font-bold pb-1 transition border-b-2 ${
                        connectorsSubTab === "installed" ? "border-violet-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      Installed
                    </button>
                  </div>
                  <button
                    onClick={() => setIsCustomMcpModalOpen(true)}
                    className="px-3.5 py-1.5 border border-white/5 bg-white/[0.02] text-xs font-bold text-zinc-300 rounded-lg hover:bg-white/[0.05] transition shrink-0"
                  >
                    + Custom MCP
                  </button>
                </div>
              </div>

              {/* Search connectors */}
              <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-[#050914]/80 px-3.5 py-2.5">
                <Search className="h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search integrations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-xs text-white placeholder-zinc-500"
                />
              </div>

              {/* Grid of integrations matching Higgsfield style */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {connectorsList
                  .filter(c => connectorsSubTab === "available" || c.isConnected)
                  .filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.desc.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((conn) => (
                    <div
                      key={conn.id}
                      className={`p-4 rounded-xl border flex items-start justify-between gap-4 transition hover:shadow-lg hover:border-white/10 ${
                        conn.isConnected
                          ? "border-emerald-500/20 bg-emerald-950/[0.03]"
                          : "border-white/5 bg-white/[0.01]"
                      }`}
                    >
                      <div className="flex gap-3 min-w-0">
                        {/* Icon display */}
                        <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/[0.02] border border-white/5 text-xl shrink-0">
                          {conn.icon}
                        </div>
                        <div className="flex flex-col text-left space-y-1 min-w-0">
                          <span className="text-xs font-bold text-white truncate">{conn.title}</span>
                          <span className="text-[10px] text-zinc-400 leading-normal line-clamp-2">{conn.desc}</span>
                          {conn.isConnected && (
                            <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1 mt-1 shrink-0">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Connected ({conn.token})
                            </span>
                          )}
                        </div>
                      </div>

                      {conn.isConnected ? (
                        <button
                          onClick={() => handleDisconnectConnector(conn.id)}
                          className="text-[10px] text-red-400 hover:text-red-300 font-bold shrink-0 transition"
                        >
                          Disconnect
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setActiveConnector(conn);
                            setConnectorStep(1);
                            handleOpenOAuthPopup(); // Fire simulated popup immediately
                          }}
                          className="h-5 w-5 flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white transition shrink-0"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
              </div>

              {/* Connectors Popup Modal Flow - Exactly matching screens */}
              {activeConnector && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
                  <div className="relative w-full max-w-[420px] rounded-2xl border border-white/10 bg-[#050914] p-6 shadow-2xl text-center space-y-6">
                    <button
                      onClick={() => {
                        setActiveConnector(null);
                        setConnectorToken("");
                      }}
                      className="absolute right-4 top-4 text-zinc-500 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>

                    {/* Step 1: Connecting Animation */}
                    {connectorStep === 1 && (
                      <div className="flex flex-col items-center justify-center space-y-6 py-4">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{activeConnector.title}</span>
                        
                        <div className="flex items-center justify-center gap-8">
                          {/* Saad Studio Squiggly logo */}
                          <div className="relative h-14 w-14 rounded-2xl border border-violet-500/20 bg-slate-950/40 p-2.5 flex items-center justify-center shadow-[0_0_24px_rgba(139,92,246,0.2)]">
                            <Image
                              src="/logo-saad-transparent.png"
                              alt="Saad Studio Logo"
                              width={40}
                              height={40}
                              className="object-contain"
                            />
                          </div>

                          {/* Pulsing Connecting dots */}
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-violet-400 animate-ping" />
                            <span className="h-1 w-12 border-t-2 border-dashed border-white/20 animate-pulse" />
                            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                          </div>

                          {/* Selected Brand logo */}
                          <div className="h-14 w-14 rounded-2xl border border-white/10 bg-white/[0.02] text-3xl flex items-center justify-center shadow-lg">
                            {activeConnector.icon}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <h3 className="text-sm font-bold text-white">Finish connecting {activeConnector.title} in the new window</h3>
                          <button
                            onClick={handleOpenOAuthPopup}
                            className="text-xs text-zinc-500 hover:text-white underline block mx-auto transition"
                          >
                            Don't see the window? Reopen it
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 2: OIDC Details & Permissions - Screenshot 3 Style */}
                    {connectorStep === 2 && (
                      <div className="space-y-5 text-center py-2">
                        {/* Circular Brand Icon */}
                        <div className="mx-auto h-20 w-20 rounded-full border border-violet-500/30 bg-slate-900/60 p-3 flex items-center justify-center shadow-[0_0_24px_rgba(139,92,246,0.15)] relative">
                          <div className="absolute inset-0 rounded-full border border-dashed border-violet-400/40 animate-spin" />
                          <span className="text-4xl">{activeConnector.icon}</span>
                        </div>

                        <div>
                          <h3 className="text-base font-bold text-white">{activeConnector.title}</h3>
                          <p className="text-xs text-zinc-500 max-w-[320px] mx-auto mt-1 leading-normal">
                            Publish text, image, multi-image, and video posts to the connected {activeConnector.title} profile.
                          </p>
                        </div>

                        {/* OIDC pill info */}
                        <div className="mx-auto flex items-center justify-center gap-2 p-2.5 rounded-lg border border-violet-500/20 bg-violet-950/10 text-[10.5px] text-zinc-300 font-semibold cursor-pointer max-w-[340px]">
                          <span className="text-xs">{activeConnector.icon}</span>
                          <span>Get the connected {activeConnector.title} member profile from OIDC userinfo.</span>
                        </div>

                        {/* Dot indicator carousel */}
                        <div className="flex items-center justify-center gap-1.5 my-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                          <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
                          <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
                          <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
                          <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
                          <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
                        </div>

                        {/* Features Checklist */}
                        <div className="text-left space-y-2 bg-[#090f1d]/50 p-4 rounded-xl border border-white/5">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Features</span>
                          <ul className="space-y-2">
                            {(activeConnector.features || []).map((feat, idx) => (
                              <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-300">
                                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Success notification */}
                        <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 font-bold bg-emerald-950/10 border border-emerald-500/20 p-2.5 rounded-lg animate-pulse">
                          <span>👤 Authenticated as:</span>
                          <span className="underline">{connectorToken}</span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button
                            onClick={() => {
                              setActiveConnector(null);
                              setConnectorToken("");
                            }}
                            className="px-4 py-2 border border-white/5 bg-white/[0.02] text-xs font-bold text-zinc-400 rounded-xl hover:bg-white/[0.05] transition"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveConnector}
                            disabled={connectorSaving}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
                          >
                            {connectorSaving ? (
                              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            ) : (
                              <span>Save Connection</span>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )}

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: FILES (WORKSPACE MEDIA ARCHIVE) */}
          {/* ======================================================== */}
          {activeTab === "files" && (
            <div className="max-w-[860px] mx-auto space-y-6 text-left">
              
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex flex-col">
                  <h2 className="text-lg font-bold text-white">Files</h2>
                  
                  <div className="flex items-center gap-4 mt-2">
                    {[
                      { id: "all", label: "All" },
                      { id: "video", label: "Video" },
                      { id: "image", label: "Image" },
                      { id: "document", label: "Document" }
                    ].map((st) => (
                      <button
                        key={st.id}
                        onClick={() => setFilesSubTab(st.id as any)}
                        className={`text-xs font-bold pb-1 transition border-b-2 ${
                          filesSubTab === st.id ? "border-violet-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs transition shadow-[0_4px_12px_rgba(139,92,246,0.2)]"
                >
                  <UploadCloud className="h-4 w-4" />
                  <span>Upload Files</span>
                </button>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                multiple
                className="hidden"
              />

              {/* Drag and Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`border border-dashed p-8 rounded-2xl text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2 select-none ${
                  isDragging
                    ? "border-violet-500 bg-violet-950/20 shadow-[0_0_15px_rgba(139,92,246,0.15)] scale-[1.01]"
                    : "border-white/10 bg-[#050914]/40 hover:border-white/20"
                }`}
              >
                <FolderClosed className={`h-7 w-7 transition-colors ${isDragging ? "text-violet-400" : "text-zinc-500"}`} />
                <span className={`text-xs font-semibold transition-colors ${isDragging ? "text-violet-300" : "text-zinc-400"}`}>
                  {isDragging ? "Drop your files here!" : "Drag files here or click to browse"}
                </span>
                <span className="text-[9.5px] text-zinc-500">Supports images, vertical movies, or article documents.</span>
              </div>

              {/* Files Table List */}
              {filteredFiles.length === 0 ? (
                <div className="text-center p-8 border border-white/5 bg-white/[0.01] rounded-xl">
                  <span className="text-xs text-zinc-500">No files yet. Start a new task</span>
                  <button
                    onClick={() => setActiveTab("new")}
                    className="mt-2.5 block mx-auto text-xs bg-violet-600/10 border border-violet-500/20 text-violet-400 px-3 py-1.5 rounded-lg hover:bg-violet-500/10"
                  >
                    Start a new task
                  </button>
                </div>
              ) : (
                <div className="border border-white/5 rounded-2xl bg-[#050914]/40 overflow-hidden">
                  <table className="w-full border-collapse text-xs text-left">
                    <thead>
                      <tr className="border-b border-white/5 bg-[#050914]/80 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                        <th className="p-3.5">File Name</th>
                        <th className="p-3.5">Type</th>
                        <th className="p-3.5">File Size</th>
                        <th className="p-3.5">Date</th>
                        <th className="p-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-zinc-300">
                      {filteredFiles.map((file) => (
                        <tr key={file.id} className="hover:bg-white/[0.02] transition">
                          <td className="p-3.5 font-medium text-white truncate max-w-[240px]">
                            {file.name}
                          </td>
                          <td className="p-3.5 capitalize font-semibold text-zinc-400">
                            {file.type}
                          </td>
                          <td className="p-3.5 font-mono text-[10.5px]">
                            {file.size}
                          </td>
                          <td className="p-3.5 text-zinc-500">
                            {file.date}
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => handleDeleteFile(file.id)}
                              className="text-zinc-500 hover:text-red-400 transition"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Bottom Search input */}
              <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-[#050914]/90 px-3.5 py-2.5">
                <input
                  type="text"
                  placeholder="Ask anything about your files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-xs text-white placeholder-zinc-500"
                />
                <button className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600/20 text-violet-400 hover:bg-violet-600 hover:text-white transition shrink-0">
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 6: MEMORY (ALIGNMENT PREFERENCES CANVAS) */}
          {/* ======================================================== */}
          {activeTab === "memory" && (() => {
            // Group memories by category to distribute to sub-hubs representing actual keys
            const subHubs = [
              { id: "transitions", icon: "📁", title: "transitions", angle: -Math.PI / 2 },
              { id: "resolution", icon: "</>", title: "resolution", angle: -Math.PI / 10 },
              { id: "aspect_ratio", icon: "📷", title: "aspect_ratio", angle: (3 * Math.PI) / 10 },
              { id: "lighting", icon: "🤍", title: "lighting", angle: (7 * Math.PI) / 10 },
              { id: "character_voice", icon: "🤖", title: "character_voice", angle: (11 * Math.PI) / 10 }
            ];

            const groupedMemories: Record<string, MemoryNode[]> = {
              transitions: [],
              resolution: [],
              aspect_ratio: [],
              lighting: [],
              character_voice: []
            };

            memoriesList.forEach((mem, index) => {
              const text = mem.text.toLowerCase();
              if (text.includes("aspect_ratio")) {
                groupedMemories.aspect_ratio.push(mem);
              } else if (text.includes("lighting")) {
                groupedMemories.lighting.push(mem);
              } else if (text.includes("character_voice")) {
                groupedMemories.character_voice.push(mem);
              } else if (text.includes("transitions")) {
                groupedMemories.transitions.push(mem);
              } else if (text.includes("resolution")) {
                groupedMemories.resolution.push(mem);
              } else {
                // Distribute user additions evenly
                const hubId = subHubs[index % 5].id;
                groupedMemories[hubId].push(mem);
              }
            });

            const getDisplayVal = (txt: string) => {
              return txt.includes(":") ? txt.split(":")[1].trim() : txt;
            };

            return (
              <div className="max-w-[960px] mx-auto space-y-6 text-left">
                
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex flex-col">
                    <h2 className="text-lg font-bold text-white">Agent Studio memory</h2>
                    <p className="text-xs text-zinc-500">Learning from every chat to customize future models.</p>

                    <div className="flex items-center gap-4 mt-2">
                      <button
                        onClick={() => setMemorySubTab("os")}
                        className={`text-xs font-bold pb-1 transition border-b-2 ${
                          memorySubTab === "os" ? "border-violet-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        Your OS
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="px-3.5 py-1.5 border border-white/5 bg-white/[0.02] text-xs font-bold text-zinc-300 rounded-lg hover:bg-white/[0.05] transition">
                      Import
                    </button>
                    <button
                      onClick={() => {
                        const memVal = prompt("Enter new preference parameter to remember:");
                        if (memVal && memVal.trim()) {
                          const newMem = { id: `mem-${Date.now()}`, text: memVal.trim() };
                          const updated = [...memoriesList, newMem];
                          setMemoriesList(updated);
                          saveToStorage("saad_super_memories_v5", updated);
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-md transition"
                    >
                      + New memory
                    </button>
                  </div>
                </div>

                {/* Hub-and-Spoke Interactive Web - min-h-[520px] matching Higgsfield */}
                <div 
                  className="relative min-h-[520px] w-full rounded-2xl border border-white/5 bg-[#050914]/40 overflow-hidden shadow-2xl flex items-center justify-center"
                  style={{ 
                    backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)", 
                    backgroundSize: "16px 16px" 
                  }}
                >
                  
                  {/* SVG Web Connections */}
                  <div className="absolute inset-0 z-0">
                    <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                      {/* Lines from Central Orb to Sub-Hubs */}
                      {subHubs.map((hub) => {
                        const x2 = `${50 + 17 * Math.cos(hub.angle)}%`;
                        const y2 = `${50 + 17 * Math.sin(hub.angle)}%`;
                        return (
                          <line
                            key={hub.id}
                            x1="50%"
                            y1="50%"
                            x2={x2}
                            y2={y2}
                            stroke="#84cc16"
                            strokeWidth="2"
                            strokeOpacity="0.35"
                            className="animate-pulse"
                          />
                        );
                      })}

                      {/* Lines from Sub-Hubs to Child Memory Nodes */}
                      {subHubs.map((hub) => {
                        const hubX = `${50 + 17 * Math.cos(hub.angle)}%`;
                        const hubY = `${50 + 17 * Math.sin(hub.angle)}%`;
                        const children = groupedMemories[hub.id] || [];
                        const count = children.length;

                        return children.map((_, index) => {
                          const spread = 0.24; // spread angle between sibling nodes
                          const itemAngle = hub.angle + (index - (count - 1) / 2) * spread;
                          const nodeX = `${50 + 36 * Math.cos(itemAngle)}%`;
                          const nodeY = `${50 + 36 * Math.sin(itemAngle)}%`;

                          return (
                            <line
                              key={`${hub.id}-${index}`}
                              x1={hubX}
                              y1={hubY}
                              x2={nodeX}
                              y2={nodeY}
                              stroke="#6366f1"
                              strokeWidth="1.2"
                              strokeOpacity="0.4"
                              strokeDasharray="3 3"
                            />
                          );
                        });
                      })}
                    </svg>
                  </div>

                  {/* HTML overlay elements */}
                  <div className="absolute inset-0 z-10 w-full h-full pointer-events-none">
                    
                    {/* Central Glowing Yellow-Green Orb (no text, matches Higgsfield) */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-gradient-to-tr from-lime-400 via-yellow-300 to-emerald-400 shadow-[0_0_35px_rgba(163,230,53,0.65)] z-30 animate-pulse pointer-events-auto border border-[#02040a]" />

                    {/* Render Sub-Hubs (Key Node Pills with icon + label) */}
                    {subHubs.map((hub) => {
                      const x = `${50 + 17 * Math.cos(hub.angle)}%`;
                      const y = `${50 + 17 * Math.sin(hub.angle)}%`;

                      return (
                        <div
                          key={hub.id}
                          style={{ left: x, top: y }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 h-8 px-3 rounded-full border border-white/10 bg-[#090f1d]/90 hover:border-violet-500/40 flex items-center gap-1.5 text-[10.5px] font-bold text-white shadow-lg pointer-events-auto transition cursor-pointer hover:scale-105 z-20"
                        >
                          <span>{hub.icon}</span>
                          <span className="font-mono text-zinc-300">{hub.title}</span>
                        </div>
                      );
                    })}

                    {/* Render Memory Nodes (Glassmorphic Capsules showing only value parts) */}
                    {subHubs.map((hub) => {
                      const children = groupedMemories[hub.id] || [];
                      const count = children.length;

                      return children.map((mem, index) => {
                        const spread = 0.24;
                        const itemAngle = hub.angle + (index - (count - 1) / 2) * spread;
                        const x = `${50 + 36 * Math.cos(itemAngle)}%`;
                        const y = `${50 + 36 * Math.sin(itemAngle)}%`;

                        return (
                          <div
                            key={mem.id}
                            style={{ left: x, top: y }}
                            className="absolute -translate-x-1/2 -translate-y-1/2 group flex items-center gap-1.5 text-[9.5px] bg-[#050914]/90 border border-white/5 hover:border-violet-500/30 text-zinc-300 px-3 py-1.5 rounded-full backdrop-blur-2xl transition hover:scale-105 duration-150 shadow-lg pointer-events-auto whitespace-nowrap"
                          >
                            <span className="font-medium text-zinc-200">{getDisplayVal(mem.text)}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteMemory(mem.id)}
                              className="h-3 w-3 rounded-full flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-white/5 transition"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        );
                      });
                    })}

                  </div>

                  {/* Absolute Center overlay text matching Higgsfield */}
                  <div className="absolute top-10 left-1/2 -translate-x-1/2 text-center pointer-events-none z-10 space-y-1">
                    <h3 className="text-sm font-bold text-white tracking-wide">Agent Studio memory</h3>
                    <p className="text-[10px] text-zinc-500">Learning from every chat</p>
                  </div>

                </div>

                {/* Memory Cards Grid (Higgsfield-Style list of items with Lock/Unlock toggle) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 w-full max-w-[760px] mx-auto">
                  {memoriesList.map((mem) => {
                    const isLocked = lockedMemories.includes(mem.id);
                    return (
                      <div
                        key={mem.id}
                        className="group flex items-center justify-between gap-3 p-3.5 rounded-xl border border-white/5 bg-[#050914]/40 hover:border-white/10 hover:bg-[#090f1d]/40 transition duration-150 backdrop-blur-md"
                      >
                        <span className="text-[11.5px] font-bold text-zinc-300 select-none truncate">
                          {mem.text}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Delete Button (visible on hover) */}
                          <button
                            type="button"
                            onClick={() => handleDeleteMemory(mem.id)}
                            className="opacity-0 group-hover:opacity-100 flex h-7 w-7 items-center justify-center rounded-lg border border-white/5 bg-[#090f1d] hover:bg-white/[0.04] text-zinc-500 hover:text-red-400 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          
                          {/* Lock Toggle Button */}
                          <button
                            type="button"
                            onClick={() => {
                              const updated = lockedMemories.includes(mem.id)
                                ? lockedMemories.filter((mId) => mId !== mem.id)
                                : [...lockedMemories, mem.id];
                              setLockedMemories(updated);
                              saveToStorage("saad_super_locked_memories_v5", updated);
                            }}
                            className={`flex h-7 w-7 items-center justify-center rounded-lg border transition ${
                              isLocked
                                ? "border-violet-500/30 bg-violet-600/10 text-violet-400 hover:bg-violet-600/20"
                                : "border-white/5 bg-[#090f1d] text-zinc-500 hover:text-zinc-300 hover:border-white/10"
                            }`}
                            title={isLocked ? "Locked memory (Active)" : "Unlocked memory (Ignored)"}
                          >
                            {isLocked ? (
                              <Lock className="h-3.5 w-3.5" />
                            ) : (
                              <Unlock className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Add Memory Form (Higgsfield-Style Capsule Prompt Box) */}
                <form onSubmit={handleAddMemory} className="relative rounded-2xl border border-white/[0.08] bg-[#050914]/85 p-3.5 shadow-2xl backdrop-blur-xl transition hover:border-white/[0.12] w-full max-w-[760px] mx-auto mt-4">
                  <textarea
                    value={newMemoryText}
                    onChange={(e) => setNewMemoryText(e.target.value)}
                    required
                    placeholder="Remember that..."
                    className="w-full min-h-[60px] bg-transparent border-none outline-none resize-none px-3 text-xs text-white placeholder-zinc-500 leading-relaxed font-sans"
                  />
                  <div className="flex items-center justify-between border-t border-white/5 pt-3 px-2">
                    {/* Attachment + icon */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-[#090f1d] hover:bg-white/[0.04] text-zinc-400 hover:text-white transition"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    
                    {/* Send button */}
                    <button
                      type="submit"
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-white shadow-[0_4px_12px_rgba(139,92,246,0.3)] transition hover:bg-violet-500"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                  </div>
                </form>

              </div>
            );
          })()}

        </div>

      </main>

      {/* Confirmation Staging Modal */}
      {isConfirmingRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="relative w-full max-w-[400px] rounded-2xl border border-white/10 bg-[#050914] p-6 shadow-2xl space-y-4 text-left">
            <button
              type="button"
              onClick={() => setIsConfirmingRun(false)}
              className="absolute right-4 top-4 text-zinc-500 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-white/5 pb-3">
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400">
                <Brain className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Staged Pipeline Confirmation</h3>
                <span className="text-[10px] text-zinc-500">Review task parameters before execution</span>
              </div>
            </div>

            <div className="space-y-3 text-xs text-zinc-300">
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-semibold">Orchestrator:</span>
                  <span className="font-bold text-white capitalize">{selectedOrchestrator.replace("orchestrator-", "").replace("-", " ")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-semibold">Pipeline Route:</span>
                  <span className="font-bold text-white capitalize">{activeChip} workflow</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-semibold">Est. Cost:</span>
                  <span className="font-bold text-emerald-400">5 credits</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-zinc-500 font-bold">Prompt text:</span>
                <p className="p-2.5 rounded-lg bg-black/40 border border-white/5 text-[11px] font-medium leading-normal italic text-zinc-400 max-h-[80px] overflow-y-auto">
                  "{prompt}"
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmingRun(false)}
                className="px-4 py-2 border border-white/5 bg-white/[0.02] text-xs font-bold text-zinc-300 rounded-lg hover:bg-white/[0.05] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsConfirmingRun(false);
                  handleStartTask();
                }}
                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-md transition"
              >
                Confirm & Run
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom MCP Modal Setup */}
      {isCustomMcpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="relative w-full max-w-[440px] rounded-2xl border border-white/10 bg-[#050914] p-5 shadow-2xl space-y-4 text-left">
            <button
              type="button"
              onClick={() => setIsCustomMcpModalOpen(false)}
              className="absolute right-4 top-4 text-zinc-500 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-white/5 pb-3">
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400">
                <Plug className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Install Custom MCP Connector</h3>
                <span className="text-[10px] text-zinc-500 font-semibold">Integrate custom model context protocol services</span>
              </div>
            </div>

            <form onSubmit={handleCreateCustomMcp} className="space-y-3.5 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="text-zinc-400 font-bold">Server Name</label>
                <input
                  type="text"
                  required
                  value={mcpName}
                  onChange={(e) => setMcpName(e.target.value)}
                  placeholder="e.g. postgres-db-mcp"
                  className="w-full rounded-lg border border-white/5 bg-[#090f1d] px-3 py-2 text-white outline-none placeholder-zinc-600"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-zinc-400 font-bold">Description</label>
                <input
                  type="text"
                  value={mcpDesc}
                  onChange={(e) => setMcpDesc(e.target.value)}
                  placeholder="e.g. Read and query PostgreSQL db tables"
                  className="w-full rounded-lg border border-white/5 bg-[#090f1d] px-3 py-2 text-white outline-none placeholder-zinc-600"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-zinc-400 font-bold">Transport Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMcpType("sse")}
                    className={`flex-1 py-2 rounded-lg border text-center font-bold transition ${
                      mcpType === "sse"
                        ? "border-violet-500 bg-violet-600/10 text-white"
                        : "border-white/5 bg-[#090f1d] text-zinc-400 hover:border-white/10"
                    }`}
                  >
                    SSE (HTTP URL)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMcpType("stdio")}
                    className={`flex-1 py-2 rounded-lg border text-center font-bold transition ${
                      mcpType === "stdio"
                        ? "border-violet-500 bg-violet-600/10 text-white"
                        : "border-white/5 bg-[#090f1d] text-zinc-400 hover:border-white/10"
                    }`}
                  >
                    Stdio (Local Command)
                  </button>
                </div>
              </div>

              {mcpType === "sse" ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-zinc-400 font-bold">SSE Endpoint URL</label>
                  <input
                    type="url"
                    required
                    value={mcpUrl}
                    onChange={(e) => setMcpUrl(e.target.value)}
                    placeholder="e.g. http://localhost:3012/sse"
                    className="w-full rounded-lg border border-white/5 bg-[#090f1d] px-3 py-2 text-white outline-none placeholder-zinc-600"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-zinc-400 font-bold">Command / Executable</label>
                    <input
                      type="text"
                      required
                      value={mcpCommand}
                      onChange={(e) => setMcpCommand(e.target.value)}
                      placeholder="e.g. npx, uvx, docker"
                      className="w-full rounded-lg border border-white/5 bg-[#090f1d] px-3 py-2 text-white outline-none placeholder-zinc-600"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-zinc-400 font-bold">Arguments (Command flags)</label>
                    <input
                      type="text"
                      value={mcpArgs}
                      onChange={(e) => setMcpArgs(e.target.value)}
                      placeholder="e.g. -y @modelcontextprotocol/server-postgres --db-url ..."
                      className="w-full rounded-lg border border-white/5 bg-[#090f1d] px-3 py-2 text-white outline-none placeholder-zinc-600"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-zinc-400 font-bold">Environment Variables (KEY=VALUE, one per line)</label>
                <textarea
                  value={mcpEnv}
                  onChange={(e) => setMcpEnv(e.target.value)}
                  placeholder="e.g. API_KEY=sk_12345&#10;PORT=5432"
                  className="w-full rounded-lg border border-white/5 bg-[#090f1d] px-3 py-2 text-white outline-none placeholder-zinc-600 resize-none"
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCustomMcpModalOpen(false)}
                  className="px-4 py-2 border border-white/5 bg-white/[0.02] text-xs font-bold text-zinc-400 rounded-xl hover:bg-white/[0.05] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-md transition"
                >
                  Install Connector
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
