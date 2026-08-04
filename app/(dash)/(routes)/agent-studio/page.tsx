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
  Unlock,
  BarChart3,
  Code2,
  Image as ImageIcon,
  Film,
  Compass,
  BookOpen,
  User,
  Users,
  Zap,
  Layout,
  BrainCircuit,
  Megaphone,
  Layers,
  Palette,
  Camera,
  SearchCode,
  PenTool,
  Flame,
  Binary,
  Map,
  Globe,
  Lightbulb,
  HeartHandshake,
  Workflow,
  Laptop,
  DollarSign,
  Mail,
  FileText,
  GripVertical
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

// 40+ Skills matching the user list & descriptions
const INITIAL_SKILLS: CustomSkill[] = [
  { id: "static-ads", title: "/static-ads", desc: "Takes an uploaded reference image, derives the layout structure and copy framework internally, generates on-brand copy variations, then renders static ads via GPT Image 2 using product images.", category: "Business & Finance", prompt: "Recreate ad layouts using GPT Image 2 and product references.", isCustom: false, isActive: false, icon: "📊" },
  { id: "b-roll-planner", title: "/b-roll-shot-planner", desc: "Cinematic B-roll shot planner. Analyzes an uploaded image or user text to produce exactly 5 cohesive, edit-ready B-roll shot outputs.", category: "Content Creation", prompt: "Analyze style anchor and output 5 detailed B-roll camera setups.", isCustom: false, isActive: false, icon: "🎥" },
  { id: "karpathy-skill", title: "/karpathy-skill", desc: "Developer assistant focused on code generation, software architecture design, and LLM optimization.", category: "Fun & Quirky", prompt: "Expert code synthesis, python scripting, and LLM orchestration.", isCustom: false, isActive: false, icon: "🤖" },
  { id: "cod-thumbnail", title: "/cod-ultimate-thumbnail", desc: "Transforms screenshots into 3D composite renders, and applies a heavy graphic layout stack focused on element sharpness and vibrant environments.", category: "Content Creation", prompt: "Perform 3D composite rendering and YouTube thumbnail enhancements.", isCustom: false, isActive: false, icon: "🎮" },
  { id: "pulp-cinema", title: "/pulp-cinema-director", desc: "Direct original pulp-cinema video clips: nonlinear scenes, standoffs, trunk-level shots, spaghetti-western energy, and dialogue-heavy prompts.", category: "Content Creation", prompt: "Apply grindhouse color filters, trunk angles, and retro camera dollying.", isCustom: false, isActive: false, icon: "🎬" },
  { id: "seedance-prompts", title: "/seedance-prompting-skills-for-cinematic-films", desc: "Generate grounded cinematic film prompts for Seedance 2.0 — shot direction, realistic body movement, camera movement, and stable photorealistic motion behavior.", category: "Content Creation", prompt: "Formulate Seedance 2.0 motion matrices and photorealistic frame scripting.", isCustom: false, isActive: false, icon: "🍿" },
  { id: "writing-beats", title: "/writing-beats", desc: "Shape an article as a journey of beats, choose-your-own-adventure style. The user picks a starting beat, you write only that beat, then offer options for where to pivot next.", category: "Writing", prompt: "Draft article segment sequences as interactive story beats.", isCustom: false, isActive: false, icon: "📝" },
  { id: "ip-carpetman", title: "/ip-carpetman", desc: "Handling rules and persistent media references for the custom character IP 'Carpetman'.", category: "Fun & Quirky", prompt: "Maintain visual attributes and background references for character IP Carpetman.", isCustom: false, isActive: false, icon: "🧎" },
  { id: "ugc-swap", title: "/ugc-model-swap", desc: "Recreate any short UGC video (reaction, challenge, review, try-on) with a replaced character/model using Seedance 2.0.", category: "Content Creation", prompt: "Swap character reference models on input video layouts via Seedance.", isCustom: false, isActive: false, icon: "👤" },
  { id: "flash-reel", title: "/flash-reel", desc: "Generates a 30s 9:16 cinematic reel. Renders 8 starting frames via GPT Image 2, animates via Kling 3.0, and stitches via FFmpeg using a 35mm flash-photography aesthetic.", category: "Content Creation", prompt: "Run Flash-Reel pipeline: GPT Image 2 + Kling 3.0 + FFmpeg assembly.", isCustom: false, isActive: false, icon: "⚡" },
  { id: "storyboard-cheatcode", title: "/storyboard-cheatcode", desc: "Turn a one-line concept into a multi-panel previs storyboard image, then a cheap-preview video and a hero video render.", category: "Content Creation", prompt: "Render previs storyboards and draft video passes using local tools.", isCustom: false, isActive: false, icon: "📓" },
  { id: "prompt-expert", title: "/prompt-engineering-expert", desc: "Expert prompt engineering, custom instruction, system prompt, and agent instruction design.", category: "Personal & Specialized", prompt: "Debug, evaluate, and optimize system instruction prompts.", isCustom: false, isActive: false, icon: "🧠" },
  { id: "onboarding", title: "/agent-studio-onboarding", desc: "Interactive onboarding tour for Agent Studio — explains latest features, what you can do, and how to start exploring.", category: "Communication & Collaboration", prompt: "Execute guided walk tour explaining Agent Studio tabs and runs.", isCustom: false, isActive: false, icon: "👋" },
  { id: "ugc-ad-prod", title: "/ugc-ad-production", desc: "Full UGC ad production pipeline: AI-generated creator face and multi-shot video. Uses image builders, video animators, and script orchestrators.", category: "Content Creation", prompt: "Execute full script-to-video UGC marketing production.", isCustom: false, isActive: false, icon: "🛍️" },
  { id: "storyboard-gen", title: "/storyboard-generation", desc: "Rules and prompts for generating structured presentation slides and multi-panel storyboards.", category: "Content Creation", prompt: "Synthesize storyboard frames and presentation layouts.", isCustom: false, isActive: false, icon: "📐" },
  { id: "gpt-image-dir", title: "/gpt-image-2-director", desc: "Production prompt director for GPT Image 2 — portraits, posters, character sheets, UI mockups, and images with on-screen text.", category: "Content Creation", prompt: "Generate precise prompt scripts optimized for GPT Image 2 rendering.", isCustom: false, isActive: false, icon: "🎨" },
  { id: "kling-director", title: "/kling-3-prompt-director", desc: "Production-ready Kling 3.0 video prompt director using the canonical 9-field formula.", category: "Content Creation", prompt: "Format video prompts matching Kling 3.0 motion latents.", isCustom: false, isActive: false, icon: "🎬" },
  { id: "seo-auditor", title: "/seo-auditor", desc: "Technical SEO audit and optimization workflow for crawlability, indexing, structured data, Core Web Vitals, and search visibility roadmaps.", category: "Data & Analytics", prompt: "Perform crawl audit and write structured optimization metrics.", isCustom: false, isActive: false, icon: "🔍" },
  { id: "theme-factory", title: "/theme-factory", desc: "Toolkit for styling artifacts with a theme. Apply colors and fonts to documents, reportings, and HTML landing pages.", category: "Productivity", prompt: "Generate stylesheet themes and apply CSS attributes.", isCustom: false, isActive: false, icon: "🎨" },
  { id: "cinematic-motion", title: "/cinematic-motion-language", desc: "Structured prompt vocabulary system for high-precision cinematic video generation: camera contracts, motion anchors, and lens sequences.", category: "Content Creation", prompt: "Translate scene specs into precise camera dolly, tilt, and pan cues.", isCustom: false, isActive: false, icon: "📹" },
  { id: "edit-article", title: "/edit-article", desc: "Edit and improve articles by restructuring sections, improving clarity, and tightening prose.", category: "Writing", prompt: "Refactor article text structure for maximum clarity.", isCustom: false, isActive: false, icon: "✍️" },
  { id: "grill-me", title: "/grill-me", desc: "Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree.", category: "Personal & Specialized", prompt: "Initiate diagnostic interview sequence questioning design decisions.", isCustom: false, isActive: false, icon: "🔥" },
  { id: "fragments", title: "/writing-fragments", desc: "Grilling session that mines the user for fragments — nuggets of writing — and appends them to a single document as raw material.", category: "Writing", prompt: "Collect writing snippets and organize them into unstructured logs.", isCustom: false, isActive: false, icon: "🧩" },
  { id: "content-strategy", title: "/content-strategy", desc: "Plan content strategy, decide what content to create, figure out topics, outline clusters, and build editorial calendars.", category: "Writing", prompt: "Synthesize content roadmaps and keyword pillar clusters.", isCustom: false, isActive: false, icon: "🗺️" },
  { id: "caveman", title: "/caveman", desc: "Ultra-compressed communication mode. Cuts token usage ~75% by dropping filler, articles, and pleasantries.", category: "Personal & Specialized", prompt: "Truncate system messages into brief technical outputs.", isCustom: false, isActive: false, icon: "🍖" },
  { id: "browser-test", title: "/browser-testing-with-devtools", desc: "Tests in real browsers. Inspect the DOM, capture console errors, analyze network requests, and verify visual output.", category: "Frontend Engineer", prompt: "Analyze devtools records, find console warnings, and output layout fixes.", isCustom: false, isActive: false, icon: "🌐" },
  { id: "social-content", title: "/social-content", desc: "Create, schedule, or optimize social media content: LinkedIn posts, Twitter threads, video scripts, hooks, and Reels.", category: "Writing", prompt: "Write hooks and format copy for social publishing queues.", isCustom: false, isActive: false, icon: "💬" },
  { id: "marketing-ideas", title: "/marketing-ideas", desc: "Brainstorm marketing ideas, inspiration, and growth strategies for software products.", category: "Creative & Marketing", prompt: "Generate creative distribution strategies and user acquisition ideas.", isCustom: false, isActive: false, icon: "💡" },
  { id: "copywriting", title: "/copywriting", desc: "Write, rewrite, or improve marketing copy for homepages, landing pages, pricing pages, and value propositions.", category: "Creative & Marketing", prompt: "Draft high-conversion landing page layouts and hero copy.", isCustom: false, isActive: false, icon: "✍️" },
  { id: "humanizer", title: "/humanizer", desc: "Remove signs of AI-generated writing from text by resolving inflated symbolism, rule of three, active voice, and em dash overuse.", category: "Writing", prompt: "Rewrite sentences into natural, human-written text structures.", isCustom: false, isActive: false, icon: "🍃" },
  { id: "writing-shape", title: "/writing-shape", desc: "Take raw material and shape it into a finished article, drafting opening options and growing the piece paragraph by paragraph.", category: "Writing", prompt: "Refine raw notes into publication-ready articles.", isCustom: false, isActive: false, icon: "✒️" },
  { id: "ab-test", title: "/ab-test-setup", desc: "Plan, design, or implement A/B tests or split experiments, including hypothesis scoring and statistical run timelines.", category: "Creative & Marketing", prompt: "Formulate experimental backlogs and define variant metrics.", isCustom: false, isActive: false, icon: "⚖️" },
  { id: "context-eng", title: "/context-engineering", desc: "Optimizes agent context setup. Configure rules files and system prompt context layout for projects.", category: "Productivity", prompt: "Restructure rules parameters for optimal LLM context loading.", isCustom: false, isActive: false, icon: "⚙️" },
  { id: "perf-opt", title: "/performance-optimization", desc: "Optimizes application performance: Core Web Vitals, load times, bundle size profiling, and database indexing.", category: "Productivity", prompt: "Identify bundle bottlenecks and outline performance corrections.", isCustom: false, isActive: false, icon: "⚡" },
  { id: "marketing-psych", title: "/marketing-psychology", desc: "Apply psychological principles and cognitive biases (anchoring, social proof, scarcity) to interface marketing layouts.", category: "Creative & Marketing", prompt: "Integrate behavioral nudges into layout wireframes.", isCustom: false, isActive: false, icon: "🧠" },
  { id: "brand-guide", title: "/brand-guidelines", desc: "Applies official brand colors, typography, formatting, and layout standards to generated documents and pages.", category: "UI Kit", prompt: "Apply typography tokens and brand colors to asset designs.", isCustom: false, isActive: false, icon: "📐" },
  { id: "frontend-ui", title: "/frontend-ui-engineering", desc: "Builds production-quality user interfaces, React components, state handlers, and animations.", category: "Frontend Engineer", prompt: "Write optimized React components, TypeScript models, and styled cards.", isCustom: false, isActive: false, icon: "💻" },
  { id: "comp-patterns", title: "/vercel-composition-patterns", desc: "React composition patterns: compound components, render props, and context providers scaled for performance.", category: "Frontend Engineer", prompt: "Refactor components with flexible API states.", isCustom: false, isActive: false, icon: "🧱" },
  { id: "paid-ads", title: "/paid-ads", desc: "Bidding, retargeting, budgeting, and optimization strategies for search and display ad networks.", category: "Marketing & Sales", prompt: "Structure PPC campaigns and ad group hierarchies.", isCustom: false, isActive: false, icon: "💰" },
  { id: "ad-creative", title: "/ad-creative", desc: "Generate, iterate, or scale ad copy variations, headlines, descriptions, and creatives for ad platforms.", category: "Marketing & Sales", prompt: "Draft bulk ad variations and copy layouts.", isCustom: false, isActive: false, icon: "🛍️" },
  { id: "email-sequence", title: "/email-sequence", desc: "Create onboarding email sequences, drip email funnels, welcome cadences, and lifecycle programs.", category: "Marketing & Sales", prompt: "Design transactional email sequences and drip funnels.", isCustom: false, isActive: false, icon: "✉️" }
];

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

// Custom Mission presets
interface MissionType {
  id: string;
  title: string;
  description: string;
  icon: any;
  defaultSteps: string[];
}

// Helpers to render icons dynamically
function getSkillIcon(skillId: string, fallbackEmoji: string) {
  switch (skillId) {
    case "static-ads": return <BarChart3 className="h-4 w-4 text-violet-400" />;
    case "b-roll-planner": return <Video className="h-4 w-4 text-cyan-400" />;
    case "karpathy-skill": return <Code2 className="h-4 w-4 text-emerald-400" />;
    case "cod-thumbnail": return <ImageIcon className="h-4 w-4 text-pink-400" />;
    case "pulp-cinema": return <Film className="h-4 w-4 text-orange-400" />;
    case "seedance-prompts": return <Compass className="h-4 w-4 text-violet-400" />;
    case "writing-beats": return <BookOpen className="h-4 w-4 text-emerald-400" />;
    case "ip-carpetman": return <User className="h-4 w-4 text-amber-400" />;
    case "ugc-swap": return <Users className="h-4 w-4 text-sky-400" />;
    case "flash-reel": return <Zap className="h-4 w-4 text-yellow-400" />;
    case "storyboard-cheatcode": return <Layout className="h-4 w-4 text-fuchsia-400" />;
    case "prompt-expert": return <BrainCircuit className="h-4 w-4 text-violet-400" />;
    case "onboarding": return <HelpCircle className="h-4 w-4 text-cyan-400" />;
    case "ugc-ad-prod": return <Megaphone className="h-4 w-4 text-orange-400" />;
    case "storyboard-gen": return <Layers className="h-4 w-4 text-rose-400" />;
    case "gpt-image-dir": return <Palette className="h-4 w-4 text-pink-400" />;
    case "kling-director": return <Camera className="h-4 w-4 text-sky-400" />;
    case "seo-auditor": return <SearchCode className="h-4 w-4 text-teal-400" />;
    case "theme-factory": return <PenTool className="h-4 w-4 text-emerald-400" />;
    case "cinematic-motion": return <Film className="h-4 w-4 text-violet-400" />;
    case "edit-article": return <FileText className="h-4 w-4 text-yellow-400" />;
    case "grill-me": return <Flame className="h-4 w-4 text-red-400" />;
    case "fragments": return <Binary className="h-4 w-4 text-indigo-400" />;
    case "content-strategy": return <Map className="h-4 w-4 text-emerald-400" />;
    case "caveman": return <Terminal className="h-4 w-4 text-zinc-400" />;
    case "browser-test": return <Globe className="h-4 w-4 text-cyan-400" />;
    case "social-content": return <MessageSquare className="h-4 w-4 text-purple-400" />;
    case "marketing-ideas": return <Lightbulb className="h-4 w-4 text-amber-400" />;
    case "copywriting": return <FileText className="h-4 w-4 text-violet-400" />;
    case "humanizer": return <HeartHandshake className="h-4 w-4 text-emerald-400" />;
    case "writing-shape": return <PenTool className="h-4 w-4 text-pink-400" />;
    case "ab-test": return <Sliders className="h-4 w-4 text-orange-400" />;
    case "context-eng": return <Workflow className="h-4 w-4 text-sky-400" />;
    case "perf-opt": return <Zap className="h-4 w-4 text-yellow-400" />;
    case "marketing-psych": return <BrainCircuit className="h-4 w-4 text-indigo-400" />;
    case "brand-guide": return <Palette className="h-4 w-4 text-rose-400" />;
    case "frontend-ui": return <Laptop className="h-4 w-4 text-cyan-400" />;
    case "comp-patterns": return <Layers className="h-4 w-4 text-indigo-400" />;
    case "paid-ads": return <DollarSign className="h-4 w-4 text-emerald-400" />;
    case "ad-creative": return <Megaphone className="h-4 w-4 text-orange-400" />;
    case "email-sequence": return <Mail className="h-4 w-4 text-sky-400" />;
    default: return <span className="text-sm shrink-0">{fallbackEmoji}</span>;
  }
}

function getConnectorIcon(connectorId: string, fallbackEmoji?: string, customClassName?: string) {
  const className = customClassName || "h-5 w-5 shrink-0";
  switch (connectorId) {
    case "instagram":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" fill="url(#instagram-grad)" />
          <defs>
            <linearGradient id="instagram-grad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fdf497" />
              <stop offset="5%" stopColor="#fdf497" />
              <stop offset="45%" stopColor="#fd5949" />
              <stop offset="60%" stopColor="#d6249f" />
              <stop offset="100%" stopColor="#285AEB" />
            </linearGradient>
          </defs>
        </svg>
      );
    case "threads":
      return (
        <svg className={`${className} text-white`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.036 0C5.388 0 0 5.388 0 12.036c0 6.648 5.388 12.036 12.036 12.036 6.648 0 12.036-5.388 12.036-12.036C24.072 5.388 18.684 0 12.036 0zm4.512 16.032c-.372.588-.936 1.056-1.68 1.404-.744.348-1.584.528-2.52.528-.96 0-1.812-.192-2.556-.576-.744-.384-1.32-.936-1.728-1.656-.408-.72-.612-1.572-.612-2.556 0-.96.204-1.812.612-2.556.408-.744.984-1.32 1.728-1.728.744-.408 1.596-.612 2.556-.612.936 0 1.776.18 2.52.54.744.36 1.308.84 1.692 1.44.384.6.576 1.308.576 2.124 0 .9-.228 1.632-.684 2.196-.456.564-1.044.846-1.764.846-.408 0-.756-.12-1.044-.36-.288-.24-.432-.576-.432-1.008V11.28c0-.624-.168-1.08-.504-1.368-.336-.288-.792-.432-1.368-.432-.576 0-1.032.144-1.368.432-.336.288-.504.744-.504 1.368 0 .6.168 1.056.504 1.368.336.312.792.468 1.368.468.228 0 .444-.024.648-.072l.072.756c-.228.096-.492.144-.792.144-.912 0-1.62-.276-2.124-.828-.504-.552-.756-1.284-.756-2.196v-.072c0-.912.252-1.644.756-2.196.504-.552 1.212-.828 2.124-.828.912 0 1.776.18 2.52.54.744.36 1.308.84 1.692 1.44.384.6.576 1.308.576 2.124 0 .9-.228 1.632-.684 2.196-.456.564-1.044.846-1.764.846-.408 0-.756-.12-1.044-.36-.288-.24-.432-.576-.432-1.008V11.28c0-.624-.168-1.08-.504-1.368-.336-.288-.792-.432-1.368-.432-.576 0-1.032.144-1.368.432-.336.288-.504.744-.504 1.368 0 .6.168 1.056.504 1.368.336.312.792.468 1.368.468.228 0 .444-.024.648-.072l.072.756c-.228.096-.492.144-.792.144-.912 0-1.62-.276-2.124-.828-.504-.552-.756-1.284-.756-2.196v-.072c0-.912.252-1.644.756-2.196.504-.552 1.212-.828 2.124-.828.912 0 1.62.276 2.124.828.504.552.756 1.284.756 2.196.396-.108.792-.162 1.188-.162.624 0 1.128.18 1.512.54.384.36.576.876.576 1.548 0 .972-.252 1.74-.756 2.304z" />
        </svg>
      );
    case "telegram":
      return (
        <svg className={`${className} text-[#0088cc]`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.67-.52.36-1 .53-1.42.52-.47-.01-1.37-.27-2.03-.49-.82-.27-1.47-.41-1.42-.87.03-.24.36-.49.99-.74 3.89-1.69 6.48-2.8 7.77-3.32 3.7-1.49 4.46-1.75 4.96-1.76.11 0 .36.03.52.16.13.11.17.26.19.37z" />
        </svg>
      );
    case "docs":
      return (
        <svg className={`${className} text-[#4285F4]`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
        </svg>
      );
    case "notion":
      return (
        <svg className={`${className} text-white`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M4.223 2.143a.753.753 0 0 0-.585-.246H.8V3.53h.499c.307 0 .428.163.428.49v15.932c0 .327-.12.49-.428.49H.8V22h6.141v-1.558h-.5c-.307 0-.428-.163-.428-.49v-12.83l7.985 13.32a1.36 1.36 0 0 0 1.157.616h5.817V19.53h-.499c-.307 0-.429-.163-.429-.49V6.212c0-.327.122-.49.429-.49h.499V4.164h-5.062v1.558h.501c.307 0 .428.163.428.49v11.75L9.627 4.542a1.597 1.597 0 0 0-1.396-.706H4.223V2.143z" />
        </svg>
      );
    case "gmail":
      return (
        <svg className={`${className} text-[#ea4335]`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
        </svg>
      );
    case "calendar":
      return (
        <svg className={`${className} text-[#4285F4]`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM7 11h5v5H7z" />
        </svg>
      );
    case "github":
      return (
        <svg className={`${className} text-white`} viewBox="0 0 24 24" fill="currentColor">
          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.483 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
        </svg>
      );
    case "whisper":
      return (
        <svg className={`${className} text-[#10a37f]`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M21.73 11.77a4.26 4.26 0 0 0-.47-2.1l1.17-.67a.46.46 0 0 0 .17-.62l-.9-1.56a.46.46 0 0 0-.62-.17l-1.17.67a4.24 4.24 0 0 0-1.63 1.63l.67-1.17a.46.46 0 0 0-.17-.62l-1.56-.9a.46.46 0 0 0-.62.17l-.67 1.17a4.24 4.24 0 0 0-2.1-.47v-1.34a.46.46 0 0 0-.46-.46h-1.8a.46.46 0 0 0-.46.46v1.34a4.24 4.24 0 0 0-2.1.47l-.67-1.17a.46.46 0 0 0-.62-.17l-1.56.9a.46.46 0 0 0-.17.62l.67 1.17a4.24 4.24 0 0 0-1.63 1.63l-1.17-.67a.46.46 0 0 0-.62.17l-.9 1.56a.46.46 0 0 0 .17.62l1.17.67a4.26 4.26 0 0 0-.47 2.1H2.46a.46.46 0 0 0-.46.46v1.8a.46.46 0 0 0 .46.46h1.34a4.26 4.26 0 0 0 .47 2.1l-1.17.67a.46.46 0 0 0-.17.62l.9 1.56a.46.46 0 0 0 .62.17l1.17-.67a4.24 4.24 0 0 0 1.63 1.63l-.67 1.17a.46.46 0 0 0 .17.62l1.56.9a.46.46 0 0 0 .62-.17l.67-1.17a4.24 4.24 0 0 0 2.1.47v1.34a.46.46 0 0 0 .46.46h1.8a.46.46 0 0 0 .46-.46v-1.34a4.24 4.24 0 0 0 2.1-.47l.67 1.17a.46.46 0 0 0 .62.17l1.56-.9a.46.46 0 0 0 .17-.62l-.67-1.17a4.24 4.24 0 0 0 1.63-1.63l1.17.67a.46.46 0 0 0 .62-.17l.9-1.56a.46.46 0 0 0-.17-.62l-1.17-.67a4.26 4.26 0 0 0 .47-2.1h1.34a.46.46 0 0 0 .46-.46v-1.8a.46.46 0 0 0-.46-.46zm-9.73 4.03a3.8 3.8 0 1 1 3.8-3.8 3.8 3.8 0 0 1-3.8 3.8z" />
        </svg>
      );
    case "linear":
      return (
        <svg className={`${className} text-[#5e6ad2]`} viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 0a10 10 0 1010 10A10.011 10.011 0 0010 0zm0 15a5 5 0 115-5 5.006 5.006 0 01-5 5z" />
          <path d="M10 8a2 2 0 102 2 2.006 2.006 0 00-2-2z" />
        </svg>
      );
    case "twilio":
      return (
        <svg className={`${className} text-[#f22f46]`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-4.3 6.9c.7 0 1.2.5 1.2 1.2s-.5 1.2-1.2 1.2-1.2-.5-1.2-1.2.5-1.2 1.2-1.2zm0 6c.7 0 1.2.5 1.2 1.2s-.5 1.2-1.2 1.2-1.2-.5-1.2-1.2.5-1.2 1.2-1.2zm8.6-6c.7 0 1.2.5 1.2 1.2s-.5 1.2-1.2 1.2-1.2-.5-1.2-1.2.5-1.2 1.2-1.2zm0 6c.7 0 1.2.5 1.2 1.2s-.5 1.2-1.2 1.2-1.2-.5-1.2-1.2.5-1.2 1.2-1.2z" />
        </svg>
      );
    case "supabase":
      return (
        <svg className={`${className} text-[#3ecf8e]`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.13 11.23a1.51 1.51 0 0 0-1.07-.44H13.5V2.73a1.5 1.5 0 0 0-2.48-1.12L3.38 8.7a1.51 1.51 0 0 0-.25 1.9 1.5 1.5 0 0 0 1.25 6.7h4.63v8.06a1.5 1.5 0 0 0 2.48 1.12l7.64-7.09a1.5 1.5 0 0 0 0-2.13z" />
        </svg>
      );
    case "dropbox":
      return (
        <svg className={`${className} text-[#0061ff]`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 2l6 4-6 4-6-4 6-4zm12 0l6 4-6 4-6-4 6-4zM6 14.5l6-4 6 4-6 4-6-4zM0 10.5l6-4 6 4-6 4-6-4zm12 0l6-4 6 4-6 4-6-4zm0 9.8l-6-3.8v-2.2l6 3.8 6-3.8v2.2l-6 3.8z" />
        </svg>
      );
    case "yt-analytics":
    case "yt-data":
      return (
        <svg className={`${className} text-[#FF0000]`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.53 3.545 12 3.545 12 3.545s-7.53 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.017 0 12 0 12s0 3.983.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.858.508 9.388.508 9.388.508s7.53 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.983 24 12 24 12s0-3.983-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case "salesforce":
      return (
        <svg className={`${className} text-[#009EDB]`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.49 12.38c-.37-.77-.92-1.42-1.61-1.92a7.1 7.1 0 0 0-5.74-3.1 7.23 7.23 0 0 0-3.14.71 5.92 5.92 0 0 0-4.9-.76 5.88 5.88 0 0 0-3.6 3.65 6.07 6.07 0 0 0 1.25 5.56 4.3 4.3 0 0 0-2.31 3.54A4.31 4.31 0 0 0 7.75 24h13.5a4.31 4.31 0 0 0 4.31-4.31c0-1.89-1.21-3.49-2.07-4.31z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg className={`${className} text-[#0a66c2]`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.8v8.37h2.8v-4.67c0-.25.02-.5.1-.68a1.14 1.14 0 0 1 1-.77c.76 0 1 .58 1 1.42v4.7h2.8M6.5 8.37a1.37 1.37 0 1 0 0-2.75 1.37 1.37 0 0 0 0 2.75M8 18.5V10.13H5.2v8.37H8z" />
        </svg>
      );
    case "x":
      return (
        <svg className={`${className} text-white`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case "gdrive":
      return (
        <svg className={className} viewBox="0 0 24 24">
          <path d="M15.375 16.5H23.5L19.5 9.5H11.5l3.875 7z" fill="#006699" />
          <path d="M8.625 16.5L12.5 9.5H4.5L.5 16.5h8.125z" fill="#00A859" />
          <path d="M12.5 9.5l3.875-7h-7.75L4.75 9.5h7.75z" fill="#FFCC00" />
        </svg>
      );
    case "onedrive":
      return (
        <svg className={`${className} text-[#0078d4]`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.5 9.5a5 5 0 0 0-9.5-2 4 4 0 0 0-6.5 3 4.5 4.5 0 0 0 1 8.8h15a5 5 0 0 0 0-9.8z" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg className={`${className} text-[#25D366]`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.031 2c-5.502 0-9.96 4.458-9.96 9.961 0 1.761.459 3.477 1.332 4.992L2.013 22.03l5.201-1.365a9.92 9.92 0 0 0 4.817 1.25c5.502 0 9.96-4.458 9.96-9.961C21.991 6.458 17.533 2 12.031 2zm6.657 14.28c-.273.766-1.584 1.393-2.185 1.482-.54.08-1.248.145-2.002-.097a13.313 13.313 0 0 1-5.631-3.693 11.233 11.233 0 0 1-2.482-3.834c-.466-.798-.483-1.36-.08-1.801.193-.21.434-.492.652-.741.218-.25.29-.419.435-.7.145-.282.073-.524-.036-.749-.109-.226-.983-2.37-1.346-3.248-.354-.855-.717-.741-.983-.757l-.838-.008c-.29 0-.766.109-1.169.548-.403.44-1.54 1.508-1.54 3.676 0 2.169 1.58 4.265 1.8 4.57.222.307 3.109 4.747 7.532 6.66 1.052.455 1.874.726 2.513.93.642.203 1.226.174 1.688.105.513-.077 1.584-.648 1.808-1.272.224-.624.224-1.16.157-1.272-.068-.113-.25-.181-.524-.319z" />
        </svg>
      );
    case "slack":
      return (
        <svg className={className} viewBox="0 0 24 24">
          <rect x="2" y="2" width="20" height="20" rx="4" fill="#4a154b" />
          <path d="M8.5 13.5a1.5 1.5 0 1 1-1.5-1.5h1.5v1.5zm1 0a1.5 1.5 0 0 1 1.5-1.5h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3a1.5 1.5 0 0 1-1.5-1.5v-3zM10.5 8.5a1.5 1.5 0 1 1 1.5-1.5v1.5h-1.5zm0 1a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3a1.5 1.5 0 0 1-1.5-1.5v-3zM15.5 10.5a1.5 1.5 0 1 1 1.5 1.5h-1.5v-1.5zm-1 0a1.5 1.5 0 0 1-1.5 1.5h-3a1.5 1.5 0 0 1-1.5-1.5v-3A1.5 1.5 0 0 1 12 6h3a1.5 1.5 0 0 1 1.5 1.5v3zM13.5 15.5a1.5 1.5 0 1 1-1.5 1.5v-1.5h1.5zm0-1a1.5 1.5 0 0 1-1.5-1.5v-3a1.5 1.5 0 0 1 1.5-1.5h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3z" fill="#ffffff" />
        </svg>
      );
    case "discord":
      return (
        <svg className={`${className} text-[#5865F2]`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.094 13.094 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z" />
        </svg>
      );
    default:
      return <span>{fallbackEmoji || "🔌"}</span>;
  }
}

// Preset missions
const MISSION_TYPES: MissionType[] = [
  {
    id: "create-ad",
    title: "Create Advertisement",
    description: "Generate ad outlines, static product banners, or animated commercial segments.",
    icon: Megaphone,
    defaultSteps: ["Concept Draft", "Creative Brief", "Generate Ad Image", "Animate Clip", "Add Subtitles", "Compile Final Ad"]
  },
  {
    id: "produce-podcast",
    title: "Produce Podcast",
    description: "Plan outlines, transcribe channels, and sequence multi-mic active speaker switching.",
    icon: Video,
    defaultSteps: ["Script & Agenda", "Assign Speakers", "Generate Intro visual", "Generate Podcast audio", "Render Final Stream"]
  },
  {
    id: "generate-images",
    title: "Generate Images",
    description: "Render on-brand layouts, cinematic concept artwork, and visual product elements.",
    icon: ImageIcon,
    defaultSteps: ["Style Reference", "Concept Sketches", "High-Resolution Render", "Upscale & Polish"]
  },
  {
    id: "build-storyboard",
    title: "Build Storyboard",
    description: "Assemble multi-panel conceptual storyboards, camera directions, and scene layouts.",
    icon: Layout,
    defaultSteps: ["Concept Pitch", "Storyboard Grid", "Scene 1 Render", "Scene 2 Render", "Scene 3 Render", "Export Storyboard"]
  },
  {
    id: "create-campaign",
    title: "Create Marketing Campaign",
    description: "Design multi-channel content maps, copywriting variations, and ad campaign structures.",
    icon: BarChart3,
    defaultSteps: ["Campaign Objectives", "Audience Profiles", "Ad Copies Outline", "Render Banners", "Schedule Automations"]
  },
  {
    id: "edit-content",
    title: "Edit Existing Content",
    description: "Upload assets to crop, swap characters, apply transitions, and compile dynamic reels.",
    icon: Film,
    defaultSteps: ["Load Base Assets", "Analyze Footage", "Apply Transitions", "Audio Alignment", "Compile Edit"]
  },
  {
    id: "social-content",
    title: "Create Social Content",
    description: "Compose Twitter/X threads, LinkedIn posts, vertical Reels, and automated publishing setups.",
    icon: MessageSquare,
    defaultSteps: ["Identify Hooks", "Draft Copy & Scripts", "Generate Vertical Visuals", "Render Reel Clip", "Publish Queue Setup"]
  },
  {
    id: "custom",
    title: "Custom Mission",
    description: "Build an open-ended automation chain using specialized skills and model components.",
    icon: Sparkles,
    defaultSteps: ["Custom Concept", "Execute Custom Pipeline", "Final Assembly"]
  }
];

const getAspectRatiosForModel = (model: string) => {
  if (model.includes("Kling")) {
    return [
      { value: "16:9", label: "أفقي 16:9 Landscape" },
      { value: "9:16", label: "عمودي 9:16 Portrait" },
      { value: "1:1", label: "مربع 1:1 Square" }
    ];
  }
  // Seedance or others
  return [
    { value: "16:9", label: "أفقي 16:9 Landscape" },
    { value: "9:16", label: "عمودي 9:16 Portrait" },
    { value: "1:1", label: "مربع 1:1 Square" },
    { value: "4:3", label: "كلاسيكي 4:3 Classic" },
    { value: "3:4", label: "عمودي كلاسيكي 3:4 Vertical Classic" },
    { value: "21:9", label: "سينمائي عريض 21:9 Ultra-Wide" },
    { value: "adaptive", label: "تلقائي متكيف Adaptive" }
  ];
};

const getQualitiesForModel = (model: string) => {
  if (model.includes("Kling")) {
    return [
      { value: "pro", label: "احترافي Pro Mode" },
      { value: "std", label: "عادي Standard Mode" },
      { value: "4K", label: "فائق الدقة Cinematic 4K" }
    ];
  } else if (model.includes("Mini")) {
    return [
      { value: "720p", label: "عالي الدقة HD 720p" },
      { value: "480p", label: "مسودة Draft 480p" }
    ];
  } else if (model.includes("Seedance")) {
    return [
      { value: "720p", label: "عالي الدقة HD 720p" },
      { value: "1080p", label: "فائق الدقة FHD 1080p" },
      { value: "4k", label: "دقة سينمائية UHD 4K" },
      { value: "480p", label: "مسودة Draft 480p" }
    ];
  } else {
    return [
      { value: "standard", label: "افتراضي Standard" }
    ];
  }
};

const getReferenceSlotsCount = (model: string) => {
  if (model.includes("Kling")) return 3;
  if (model.includes("Seedance")) return 9;
  return 0;
};

export default function AgentStudioPage() {
  const { user } = useUser();
  
  // Navigation: sidebar tab
  // new-mission | projects | assets | tasks | templates | automation | settings
  const [activeTab, setActiveTab] = useState<string>("new-mission");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [credits, setCredits] = useState(1480);

  // Advanced settings sub-tab: skills | memory | connectors
  const [activeSettingsTab, setActiveSettingsTab] = useState<"skills" | "memory" | "connectors">("skills");

  // Core Data Lists
  const [taskHistory, setTaskHistory] = useState<TaskRun[]>([]);
  const [skillsList, setSkillsList] = useState<CustomSkill[]>([]);
  const [connectorsList, setConnectorsList] = useState<Connector[]>([]);
  const [filesList, setFilesList] = useState<AssetFile[]>([]);
  const [memoriesList, setMemoriesList] = useState<MemoryNode[]>([]);
  const [lockedMemories, setLockedMemories] = useState<string[]>([]);

  // Redesign Mission Selection & Execution States
  const [selectedMission, setSelectedMission] = useState<MissionType>(MISSION_TYPES[0]);
  const [objectiveText, setObjectiveText] = useState("");
  
  // Drag & drop file upload
  const [isDragging, setIsDragging] = useState(false);
  const [attachedImageUrl, setAttachedImageUrl] = useState<string | null>(null);

  // Planning phase states
  const [isPlanning, setIsPlanning] = useState(false);
  const [planningStep, setPlanningStep] = useState(0);
  const [planningTicks, setPlanningTicks] = useState<boolean[]>([false, false, false, false, false]);
  const [isPlanned, setIsPlanned] = useState(false);

  // Smart Routing states (overrides allowed)
  const [smartProvider, setSmartProvider] = useState("Kling AI");
  const [smartModel, setSmartModel] = useState("Kling 3.0 Pro");
  const [smartResolution, setSmartResolution] = useState("1080p");
  const [smartAspectRatio, setSmartAspectRatio] = useState("16:9");
  const [smartStyle, setSmartStyle] = useState("Cinematic");
  const [smartDuration, setSmartDuration] = useState("5s");
  const [smartQuality, setSmartQuality] = useState("High");
  const [smartCredits, setSmartCredits] = useState(6);

  // Start & End Frame inputs
  const [startFrameImage, setStartFrameImage] = useState<string | null>(null);
  const [endFrameImage, setEndFrameImage] = useState<string | null>(null);
  const [smartSound, setSmartSound] = useState(true);
  const [smartReferenceImages, setSmartReferenceImages] = useState<string[]>([]);



  // Workflow Preview editable steps
  const [workflowSteps, setWorkflowSteps] = useState<string[]>([]);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [editingStepValue, setEditingStepValue] = useState("");

  // Live Workspace panels active layout
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<string>("concept"); // concept | storyboard | timeline | assets | tasks
  const [scriptBrief, setScriptBrief] = useState("");
  const [storyboardFrames, setStoryboardFrames] = useState<{ id: number; img: string; desc: string }[]>([]);
  
  // Standard UI variables mapping onto original states
  const [skillsSubTab, setSkillsSubTab] = useState<"my" | "community">("my");
  const [connectorsSubTab, setConnectorsSubTab] = useState<"available" | "installed">("available");
  const [filesSubTab, setFilesSubTab] = useState<"all" | "video" | "image" | "document">("all");
  const [skillsCategory, setSkillsCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [newSkillTitle, setNewSkillTitle] = useState("");
  const [newSkillDesc, setNewSkillDesc] = useState("");
  const [newSkillPrompt, setNewSkillPrompt] = useState("");
  const [newSkillCategory, setNewSkillCategory] = useState("Content Creation");

  const [activeConnector, setActiveConnector] = useState<Connector | null>(null);
  const [connectorStep, setConnectorStep] = useState<number>(1);
  const [connectorToken, setConnectorToken] = useState("");
  const [connectorSaving, setConnectorSaving] = useState(false);

  const [isCustomMcpModalOpen, setIsCustomMcpModalOpen] = useState(false);
  const [mcpName, setMcpName] = useState("");
  const [mcpDesc, setMcpDesc] = useState("");
  const [mcpType, setMcpType] = useState<"sse" | "stdio">("sse");
  const [mcpUrl, setMcpUrl] = useState("");
  const [mcpCommand, setMcpCommand] = useState("");
  const [mcpArgs, setMcpArgs] = useState("");
  const [mcpEnv, setMcpEnv] = useState("");

  const [newMemoryText, setNewMemoryText] = useState("");

  // Execution states
  const [runningTaskName, setRunningTaskName] = useState<string | null>(null);
  const [progressVal, setProgressVal] = useState(0);
  const [activeStep, setActiveStep] = useState<"idle" | "claude" | "gpt2" | "kling" | "ffmpeg" | "done">("idle");
  const [activeLogs, setActiveLogs] = useState<string[]>([]);
  const [outputVideo, setOutputVideo] = useState<string | null>(null);
  const [outputMediaType, setOutputMediaType] = useState<"video" | "image" | "none">("none");
  const [realAiResponse, setRealAiResponse] = useState<string | null>(null);
  const [realAiError, setRealAiError] = useState<string | null>(null);

  // Onboarding Guided Tour & Tutorial States
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [showIntroBanner, setShowIntroBanner] = useState(true);
  const [isDemoPlaying, setIsDemoPlaying] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const startFileInputRef = useRef<HTMLInputElement>(null);
  const endFileInputRef = useRef<HTMLInputElement>(null);

  const handleStartFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setStartFrameImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEndFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setEndFrameImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReferenceImageUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setSmartReferenceImages((prev) => {
          const next = [...prev];
          next[index] = reader.result as string;
          return next;
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleModelChange = (modelName: string) => {
    setSmartModel(modelName);
    setSmartReferenceImages([]); // Clear reference images
    if (modelName.includes("Kling")) {
      setSmartProvider("Kling AI");
      setSmartQuality("pro");
    } else if (modelName.includes("Seedance")) {
      setSmartProvider("BytePlus AI");
      setSmartQuality("720p");
    } else if (modelName.includes("Flux")) {
      setSmartProvider("Flux / OpenAI");
      setSmartQuality("standard");
    } else {
      setSmartProvider("OpenAI");
      setSmartQuality("standard");
    }
  };



  // Simulated Auto-play Workspace Demo
  const runSimulatedDemo = () => {
    setIsDemoPlaying(true);
    setShowTour(false);
    setIsPlanned(false);
    setIsPlanning(false);
    setObjectiveText("");
    setOutputVideo(null);
    setRealAiResponse(null);
    setRealAiError(null);
    setActiveLogs([]);
    setProgressVal(0);
    setActiveStep("idle");

    // Step 1: Set mission type and simulate typing prompt (1.5s total)
    const targetMission = MISSION_TYPES.find(m => m.id === "create-ad") || MISSION_TYPES[0];
    setSelectedMission(targetMission);
    
    setTimeout(() => {
      setObjectiveText("Commercial advertisement for premium espresso machine, 35mm cinematic lens, warm morning sun steam");
    }, 400);

    // Step 2: Trigger AI Planning stage (after 1.5s)
    setTimeout(() => {
      setIsPlanning(true);
      setPlanningStep(0);
      setPlanningTicks([false, false, false, false, false]);
    }, 1500);

    // Ticks animation
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        setPlanningStep(i);
        setPlanningTicks(prev => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, 1500 + (i * 350));
    }

    // Step 3: Complete Planning & Setup Routing (after 3.5s)
    setTimeout(() => {
      setIsPlanning(false);
      setIsPlanned(true);
      setSmartProvider("BytePlus AI");
      setSmartModel("Seedance 2.0 (Stable)");
      setSmartAspectRatio("16:9");
      setSmartResolution("720p");
      setSmartStyle("Cinematic");
      setSmartCredits(6);
      
      // Load workflow steps
      setWorkflowSteps([
        "Concept Draft",
        "Creative Brief",
        "Generate Ad Image",
        "Animate Clip via Seedance 2.0",
        "Add Subtitles",
        "Compile Final Ad"
      ]);
    }, 3500);

    // Step 4: Simulate execution logs (after 4.2s)
    setTimeout(() => {
      setRunningTaskName("Create Advertisement Campaign");
      setActiveStep("claude");
      setProgressVal(15);
      setActiveLogs([
        "[Creative Director] Initializing Commercial Ad campaign...",
        "[Creative Director] Objective resolved: Coffee espresso machine ad"
      ]);
    }, 4200);

    setTimeout(() => {
      setActiveStep("gpt2");
      setProgressVal(35);
      setActiveLogs(prev => [
        ...prev,
        "[Creative Director] Planning storyboard sketch frames...",
        "[Model Router] Selecting BytePlus Seedance engine for high-fidelity motion latents..."
      ]);
    }, 5000);

    setTimeout(() => {
      setActiveStep("kling");
      setProgressVal(65);
      setActiveLogs(prev => [
        ...prev,
        "[Model Polling] Generating frames at provider side...",
        "[Model Polling] Video compilation rendering completed successfully."
      ]);
    }, 5800);

    setTimeout(() => {
      setActiveStep("ffmpeg");
      setProgressVal(90);
      setActiveLogs(prev => [
        ...prev,
        "[FFmpeg compiler] Stitching video tracks with golden music bed...",
        "[Output Gateway] Final asset generated successfully (6.2 MB)"
      ]);
    }, 6600);

    // Step 5: Complete run, load mock output & show timeline (after 7.4s)
    setTimeout(() => {
      setRunningTaskName(null);
      setActiveStep("done");
      setProgressVal(100);
      setOutputMediaType("video");
      setOutputVideo("/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4");
      
      const responseText = `Title: Premium Espresso Machine
Format: 16:9 Landscape
Concept script:
A professional close-up of dark espresso pouring into a ceramic cup. Delicate warm steam rises as golden sun rays filter through a window. The camera dollys slowly around the cup, highlighting the rich crema layers. A soft, soothing acoustic piano track plays in the background as the text appears: 'Pure Espresso. Pure Morning.'`;
      
      setScriptBrief(responseText);
      setRealAiResponse(responseText);

      setStoryboardFrames([
        { id: 1, img: "/preset/2 Studio Product Shot.webp", desc: "Scene 1: Close-up on coffee pouring into ceramic mug." },
        { id: 2, img: "/preset/Cinematic portrait.webp", desc: "Scene 2: Steam rises in warm backlit lighting." },
        { id: 3, img: "/preset/4 Octane 3D Render.webp", desc: "Scene 3: Elegant typography shows: 'Pure Espresso.'" }
      ]);

      setActiveWorkspaceTab("timeline");
      setIsDemoPlaying(false);

      // Add to logs database
      const demoLog = [
        "[Creative Director] Initializing Commercial Ad campaign...",
        "[Creative Director] Objective resolved: Coffee espresso machine ad",
        "[Creative Director] Planning storyboard sketch frames...",
        "[Model Router] Selecting BytePlus Seedance engine for high-fidelity motion latents...",
        "[Model Polling] Generating frames at provider side...",
        "[Model Polling] Video compilation rendering completed successfully.",
        "[FFmpeg compiler] Stitching video tracks with golden music bed...",
        "[Output Gateway] Final asset generated successfully (6.2 MB)"
      ];

      // Save to task history list
      const demoRunTask: TaskRun = {
        id: `demo-${Date.now()}`,
        prompt: "Commercial advertisement for premium espresso machine, 35mm cinematic lens, warm morning sun steam",
        category: "Create Advertisement",
        engine: "Seedance 2.0 (Stable)",
        renderMode: "BytePlus AI",
        fileSize: "6.2 MB",
        timestamp: new Date().toISOString().split("T")[0],
        status: "completed",
        videoUrl: "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
        logs: demoLog
      };

      setTaskHistory(prev => {
        const next = [demoRunTask, ...prev];
        saveToStorage("saad_super_history_v6", next);
        return next;
      });
      
      // Save file to list
      const demoFile: AssetFile = {
        id: `file-demo-${Date.now()}`,
        name: "espresso_cinematic_ad.mp4",
        size: "6.2 MB",
        type: "video",
        date: new Date().toISOString().split("T")[0],
        url: "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4"
      };

      setFilesList(prev => {
        const next = [demoFile, ...prev];
        saveToStorage("saad_super_files_v6", next);
        return next;
      });

    }, 7400);
  };

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const hist = localStorage.getItem("saad_super_history_v6");
      setTaskHistory(hist ? JSON.parse(hist) : []);

      const skills = localStorage.getItem("saad_super_skills_v6");
      setSkillsList(skills ? JSON.parse(skills) : INITIAL_SKILLS);

      const conn = localStorage.getItem("saad_super_connectors_v6");
      setConnectorsList(conn ? JSON.parse(conn) : INITIAL_CONNECTORS);

      const files = localStorage.getItem("saad_super_files_v6");
      setFilesList(files ? JSON.parse(files) : DEFAULT_FILES);

      const mem = localStorage.getItem("saad_super_memories_v6");
      setMemoriesList(mem ? JSON.parse(mem) : DEFAULT_MEMORIES);

      const locked = localStorage.getItem("saad_super_locked_memories_v6");
      setLockedMemories(locked ? JSON.parse(locked) : ["mem-1", "mem-2", "mem-3", "mem-4", "mem-5"]);

      const bannerPref = localStorage.getItem("saad_super_show_intro_banner");
      if (bannerPref !== null) {
        setShowIntroBanner(JSON.parse(bannerPref));
      }

      const creds = localStorage.getItem("saad_super_credits_v6");
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

  // Sync default workflow steps when mission changes
  useEffect(() => {
    if (selectedMission) {
      setWorkflowSteps([...selectedMission.defaultSteps]);
      // Update default smart routing parameters based on selected mission
      if (selectedMission.id === "create-ad" || selectedMission.id === "edit-content") {
        setSmartProvider("BytePlus AI");
        setSmartModel("Seedance 2.0 Stable");
        setSmartQuality("720p");
        setSmartResolution("720p");
      } else if (selectedMission.id === "produce-podcast" || selectedMission.id === "social-content") {
        setSmartProvider("Kling AI");
        setSmartModel("Kling 3.0 Pro");
        setSmartQuality("pro");
        setSmartResolution("1080p");
      } else if (selectedMission.id === "generate-images" || selectedMission.id === "build-storyboard") {
        setSmartProvider("Flux / OpenAI");
        setSmartModel("Flux.1 Dev");
        setSmartQuality("standard");
        setSmartResolution("1080p");
      } else {
        setSmartProvider("OpenAI");
        setSmartModel("GPT-4o");
        setSmartQuality("standard");
        setSmartResolution("N/A");
      }
    }
  }, [selectedMission]);

  // Dynamic credit cost calculator based on model, duration, and quality
  useEffect(() => {
    let durationSec = 5;
    if (smartDuration === "5s") durationSec = 5;
    else if (smartDuration === "10s") durationSec = 10;
    else if (smartDuration === "15s") durationSec = 15;
    else durationSec = parseInt(smartDuration, 10) || 5;

    let baseCredits = 5;
    if (smartModel.includes("Kling 3.0 Pro")) {
      baseCredits = durationSec * 1.5;
    } else if (smartModel.includes("Kling 3.0 Standard")) {
      baseCredits = durationSec * 1.0;
    } else if (smartModel.includes("Seedance 2.0 Stable") || smartModel.includes("Seedance 2.0 (Stable)")) {
      if (smartQuality === "1080p") {
        baseCredits = durationSec * 3;
      } else if (smartQuality === "4k") {
        baseCredits = durationSec * 5;
      } else if (smartQuality === "480p") {
        baseCredits = durationSec;
      } else {
        baseCredits = Math.max(0, (28 / 11) * durationSec - (2 / 11));
      }
    } else if (smartModel.includes("Seedance 2.0 Mini")) {
      if (smartQuality === "480p") {
        baseCredits = durationSec;
      } else {
        baseCredits = Math.max(0, (28 / 11) * durationSec - (2 / 11));
      }
    } else if (smartModel.includes("Flux.1 Dev")) {
      baseCredits = 2;
    } else if (smartModel.includes("GPT-4o")) {
      baseCredits = 1;
    }

    setSmartCredits(Math.max(1, Math.round(baseCredits)));
  }, [smartModel, smartDuration, smartQuality]);


  // Connectors popup messaging
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

  // 1. Mission Planning Stage simulation
  const handleStartPlanning = () => {
    if (!objectiveText.trim()) return;
    
    setIsPlanning(true);
    setPlanningStep(0);
    setPlanningTicks([false, false, false, false, false]);
    setIsPlanned(false);

    // Increment checkpoints with realistic delays
    const steps = [
      "Understanding creative objective request...",
      "Analyzing uploaded workspace assets...",
      "Selecting optimized model routes & providers...",
      "Calculating estimated credit costs...",
      "Compiling workflow pipeline execution roadmap..."
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      setPlanningTicks(prev => {
        const next = [...prev];
        next[currentStep] = true;
        return next;
      });
      currentStep++;
      setPlanningStep(currentStep);

      if (currentStep >= 5) {
        clearInterval(interval);
        setTimeout(() => {
          setIsPlanning(false);
          setIsPlanned(true);
          // Set script brief draft placeholder
          setScriptBrief(`Creative Brief:\nMission Category: ${selectedMission.title}\nObjective: ${objectiveText}\nAI Model Route: ${smartModel} via ${smartProvider}\nStatus: Plan Confirmed`);
          // Setup initial mock storyboard elements
          setStoryboardFrames([
            { id: 1, img: "/preset/cinematic-01.jpg", desc: "Scene 1 (Establishing): Slow zoom into target subject, cinematic backlight." },
            { id: 2, img: "/preset/cinematic-02.jpg", desc: "Scene 2 (Detail): Extreme close-up detailing texture, high dynamic contrast." },
            { id: 3, img: "/preset/cinematic-03.jpg", desc: "Scene 3 (Action): Camera pan tracking motion, dynamic background transition." }
          ]);
        }, 600);
      }
    }, 600);
  };

  // Workflow steps reordering & editing functions
  const deleteWorkflowStep = (idx: number) => {
    const next = [...workflowSteps];
    next.splice(idx, 1);
    setWorkflowSteps(next);
  };

  const moveWorkflowStep = (idx: number, direction: "up" | "down") => {
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === workflowSteps.length - 1) return;
    const next = [...workflowSteps];
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    const temp = next[idx];
    next[idx] = next[targetIdx];
    next[targetIdx] = temp;
    setWorkflowSteps(next);
  };

  const startEditStep = (idx: number) => {
    setEditingStepIndex(idx);
    setEditingStepValue(workflowSteps[idx]);
  };

  const saveEditStep = () => {
    if (editingStepIndex !== null && editingStepValue.trim()) {
      const next = [...workflowSteps];
      next[editingStepIndex] = editingStepValue.trim();
      setWorkflowSteps(next);
      setEditingStepIndex(null);
      setEditingStepValue("");
    }
  };

  // Run the full execution orchestration (calling Next.js endpoints)
  const handleExecuteWorkflow = async () => {
    if (!objectiveText.trim()) return;

    setRunningTaskName(selectedMission.title);
    setProgressVal(5);
    setActiveStep("claude");
    
    const initialLog = `[Creative Director] Starting workflow execution for mission: "${selectedMission.title}"`;
    setActiveLogs([initialLog]);
    setOutputVideo(null);
    setRealAiResponse(null);
    setRealAiError(null);
    setOutputMediaType("none");
    setActiveWorkspaceTab("tasks"); // Switch to tasks tab to monitor workflow execution progress

    const activeSkillsToSend = skillsList.filter(s => s.isActive);
    const lockedMemoriesToSend = memoriesList.filter(m => lockedMemories.includes(m.id));

    // Shared success logs handler
    const handleSuccess = (
      mediaUrl: string | null,
      mediaType: "video" | "image" | "none",
      textResponse: string,
      finalLogs: string[]
    ) => {
      setProgressVal(100);
      setActiveStep("done");
      setRunningTaskName(null);

      if (mediaUrl) {
        setOutputVideo(mediaUrl);
      }

      const cost = smartCredits;
      const updatedCredits = credits - cost;
      setCredits(updatedCredits);
      saveToStorage("saad_super_credits_v6", updatedCredits);

      const fileName = mediaType === "video"
        ? `video_render_${Math.floor(100 + Math.random() * 900)}.mp4`
        : `image_render_${Math.floor(100 + Math.random() * 900)}.png`;

      const dbLog = mediaUrl
        ? `[System Storage] Saved output payload as: ${fileName}. Spent ${cost} credits.`
        : `[System DB Core] Response compiled successfully. Spent ${cost} credits.`;

      const allLogs = [...finalLogs, dbLog];
      setActiveLogs(allLogs);

      // Save run payload to history list
      const newTask: TaskRun = {
        id: `run-${Date.now()}`,
        prompt: objectiveText,
        category: selectedMission.title,
        engine: smartModel,
        renderMode: smartProvider,
        fileSize: mediaType === "video" ? "6.2 MB" : mediaType === "image" ? "1.8 MB" : "0.1 MB",
        timestamp: new Date().toISOString().split("T")[0],
        status: "completed",
        ...(mediaUrl ? { videoUrl: mediaUrl } : {}),
        logs: allLogs
      };
      
      const updatedHist = [newTask, ...taskHistory];
      setTaskHistory(updatedHist);
      saveToStorage("saad_super_history_v6", updatedHist);

      // Add to files database
      if (mediaUrl) {
        const newFile: AssetFile = {
          id: `file-${Date.now()}`,
          name: fileName,
          size: mediaType === "video" ? "6.2 MB" : "1.8 MB",
          type: mediaType === "video" ? "video" : "image",
          date: new Date().toISOString().split("T")[0],
          url: mediaUrl
        };
        const updatedFiles = [newFile, ...filesList];
        setFilesList(updatedFiles);
        saveToStorage("saad_super_files_v6", updatedFiles);
      }

      // Switch to output visualization
      setActiveWorkspaceTab("timeline");
    };

    try {
      // Call Orchestrator api
      const agentRes = await fetch("/api/agent-studio/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: objectiveText,
          skills: activeSkillsToSend,
          memories: lockedMemoriesToSend
        })
      });

      if (!agentRes.ok) throw new Error("Orchestrator route failed");
      const agentData = await agentRes.json();

      setRealAiResponse(agentData.content);
      setScriptBrief(agentData.content);

      const logsAfterOrchestration = [
        initialLog,
        `[Creative Director] Plan generated. Suggested route: ${agentData.mediaType.toUpperCase()}`,
        agentData.mediaType !== "none" ? `[Model Router] Dispatching prompt to ${smartModel} Latents...` : `[Text Engine] Rendering response script.`
      ];
      setActiveLogs(logsAfterOrchestration);

      if (agentData.mediaType === "video") {
        setOutputMediaType("video");
        setActiveStep("kling");
        setProgressVal(35);

        // Map to correct API route
        let modelRoute = "kwaivgi/kling-v3.0-pro/text-to-video";
        let mode = "pro"; // default
        if (smartModel === "Kling 3.0 Standard") {
          mode = "std";
        } else if (smartModel === "Kling 3.0 Pro") {
          mode = "pro";
        } else if (smartModel === "Seedance 2.0 Stable" || smartModel === "Seedance 2.0 (Stable)") {
          modelRoute = "bytedance/seedance-v2/text-to-video";
        } else if (smartModel === "Seedance 2.0 Mini") {
          modelRoute = "bytedance/seedance-v2/text-to-video-mini";
        }

        // Parse duration: convert "5s", "10s", "15s" to integers 5, 10, 15
        const durationValue = parseInt(smartDuration, 10) || 5;

        // Build list of image URLs
        const imagesList: string[] = [];
        if (startFrameImage) {
          imagesList.push(startFrameImage);
        } else if (attachedImageUrl) {
          imagesList.push(attachedImageUrl);
        }
        if (endFrameImage) {
          imagesList.push(endFrameImage);
        }

        const videoPayload = {
          modelRoute,
          payload: {
            prompt: agentData.mediaPrompt || objectiveText,
            duration: durationValue,
            aspect_ratio: smartAspectRatio,
            resolution: smartQuality, // E.g. "std", "pro", "4K" or "720p", "1080p"
            quality: smartQuality,
            mode: mode, // std or pro for Kling 3.0
            style: smartStyle,
            sound: smartSound,
            generate_audio: smartSound,
            first_frame_url: startFrameImage || attachedImageUrl || undefined,
            last_frame_url: endFrameImage || undefined,
            image_urls: imagesList.length > 0 ? imagesList : undefined,
            reference_image_urls: smartReferenceImages.filter(Boolean).length > 0 ? smartReferenceImages.filter(Boolean) : undefined
          }
        };



        const genRes = await fetch("/api/video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(videoPayload)
        });

        if (!genRes.ok) {
          const errData = await genRes.json().catch(() => ({}));
          throw new Error(errData.error || `Video request failed (HTTP ${genRes.status})`);
        }

        const genJson = await genRes.json();

        if (genJson.videoUrl) {
          handleSuccess(genJson.videoUrl, "video", agentData.content, logsAfterOrchestration);
        } else if (genJson.taskId) {
          const polllog = `[Model Polling] Video generation started (Task: ${genJson.taskId})`;
          const currentLogs = [...logsAfterOrchestration, polllog];
          setActiveLogs(currentLogs);
          setActiveStep("ffmpeg");
          setProgressVal(60);

          let finished = false;
          let attempts = 0;
          let finalUrl = null;
          const pollingLogs = [...currentLogs];

          while (!finished && attempts < 90) {
            attempts++;
            await new Promise(r => setTimeout(r, 3000));

            const pollRes = await fetch(`/api/video?taskId=${encodeURIComponent(genJson.taskId)}`, { cache: "no-store" });
            if (!pollRes.ok) continue;

            const pollJson = await pollRes.json();
            if (pollJson.status === "completed" || pollJson.videoUrl) {
              finished = true;
              finalUrl = pollJson.videoUrl || pollJson.outputs?.[0];
            } else if (pollJson.status === "failed") {
              finished = true;
              throw new Error(pollJson.error || "Generation failed at provider side.");
            } else {
              setProgressVal(prev => Math.min(prev + 1.5, 98));
              if (attempts % 4 === 0) {
                pollingLogs.push(`[Model Polling] Rendering frames... (${attempts * 3}s elapsed)`);
                setActiveLogs([...pollingLogs]);
              }
            }
          }

          if (finalUrl) {
            handleSuccess(finalUrl, "video", agentData.content, pollingLogs);
          } else {
            throw new Error("Video generation timed out.");
          }
        } else {
          throw new Error("Invalid response keys from video API.");
        }

      } else if (agentData.mediaType === "image") {
        setOutputMediaType("image");
        setActiveStep("gpt2");
        setProgressVal(45);

        const imagePayload = {
          prompt: agentData.mediaPrompt || objectiveText,
          modelId: smartModel.toLowerCase().includes("flux") ? "flux-2" : "flux-1-dev",
          aspectRatio: smartAspectRatio,
          numImages: 1,
          quality: "standard",
          ...(attachedImageUrl ? { imageUrl: attachedImageUrl } : {})
        };

        const genRes = await fetch("/api/generate/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(imagePayload)
        });

        if (!genRes.ok) {
          const errData = await genRes.json().catch(() => ({}));
          throw new Error(errData.error || `Image request failed`);
        }

        const genJson = await genRes.json();
        const mediaUrl = genJson.imageUrl || genJson.mediaUrl || genJson.imageUrls?.[0];

        if (mediaUrl) {
          handleSuccess(mediaUrl, "image", agentData.content, logsAfterOrchestration);
        } else {
          throw new Error("No image output URL returned.");
        }

      } else {
        setOutputMediaType("none");
        handleSuccess(null, "none", agentData.content, logsAfterOrchestration);
      }

    } catch (e: any) {
      console.error(e);
      setRealAiError(e.message || "Pipeline execution failed.");
      setActiveLogs(prev => [...prev, `[Fatal Error] ${e.message || "Failed to execute pipeline."}`]);
      setActiveStep("idle");
      setRunningTaskName(null);
      setProgressVal(0);
    }
  };

  // Custom skills editing
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
    saveToStorage("saad_super_skills_v6", updated);

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
    saveToStorage("saad_super_skills_v6", updated);
  };

  const deleteSkill = (id: string) => {
    const updated = skillsList.filter((s) => s.id !== id);
    setSkillsList(updated);
    saveToStorage("saad_super_skills_v6", updated);
  };

  // Connectors save
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
      saveToStorage("saad_super_connectors_v6", updated);
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
    saveToStorage("saad_super_connectors_v6", updated);
  };

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
    saveToStorage("saad_super_connectors_v6", updated);
    setIsCustomMcpModalOpen(false);

    setMcpName("");
    setMcpDesc("");
    setMcpType("sse");
    setMcpUrl("");
    setMcpCommand("");
    setMcpArgs("");
    setMcpEnv("");
  };

  // Memory additions
  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryText.trim()) return;

    const newMem: MemoryNode = {
      id: `mem-${Date.now()}`,
      text: newMemoryText
    };

    const updated = [...memoriesList, newMem];
    setMemoriesList(updated);
    saveToStorage("saad_super_memories_v6", updated);
    setNewMemoryText("");
  };

  const handleDeleteMemory = (id: string) => {
    const updated = memoriesList.filter((m) => m.id !== id);
    setMemoriesList(updated);
    saveToStorage("saad_super_memories_v6", updated);
  };

  // Upload handlers
  const processFiles = (files: FileList) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let type: "image" | "video" | "document" = "document";
      if (file.type.startsWith("image/")) type = "image";
      else if (file.type.startsWith("video/")) type = "video";

      const formattedSize =
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${(file.size / 1024).toFixed(1)} KB`;

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Url = reader.result as string;
        const newAsset: AssetFile = {
          id: `file-${Date.now()}-${i}`,
          name: file.name,
          size: formattedSize,
          type,
          date: new Date().toISOString().split("T")[0],
          url: base64Url
        };

        setFilesList((prev) => {
          const updated = [newAsset, ...prev];
          saveToStorage("saad_super_files_v6", updated);
          return updated;
        });

        if (type === "image") {
          setAttachedImageUrl(base64Url);
        }
      };
      reader.readAsDataURL(file);
    }
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
    saveToStorage("saad_super_files_v6", updated);
  };

  // Filter skills and assets lists
  const filteredSkills = skillsList.filter((skill) => {
    const matchesSearch =
      skill.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.desc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      skillsCategory === "All" || skill.category === skillsCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredFiles = filesList.filter((f) => {
    const matchesQuery = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType =
      filesSubTab === "all" || f.type === filesSubTab;
    return matchesQuery && matchesType;
  });

  return (
    <div className="relative flex h-[calc(100vh-4rem)] w-full overflow-hidden text-[#e2e8f0] bg-[#02040a]">
      {/* Background visual graphics */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute left-1/4 top-1/4 h-[500px] w-[500px] rounded-full bg-violet-600/5 blur-[120px] mix-blend-screen animate-pulse" />
        <div className="absolute right-1/4 bottom-1/4 h-[600px] w-[600px] rounded-full bg-cyan-500/5 blur-[140px] mix-blend-screen" />
      </div>

      {/* LEFT NAVIGATION SIDEBAR (REDESIGNED FOR PRODUCTION FOCUS) */}
      <aside
        className={`relative z-20 flex flex-col border-r border-white/5 bg-[#050914]/95 backdrop-blur-2xl transition-all duration-300 shrink-0 ${
          sidebarOpen ? "w-[240px]" : "w-0 overflow-hidden"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="relative h-7 w-7 rounded-lg overflow-hidden border border-violet-500/30 shadow-[0_0_12px_rgba(139,92,246,0.2)] bg-slate-900/60 p-0.5 animate-pulse">
              <Image
                src="/logo-saad-transparent.png?v=3"
                alt="Saad Studio Logo"
                width={28}
                height={28}
                className="object-contain"
              />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-sans font-bold text-xs tracking-wide text-white">Saad Studio</span>
              <span className="text-[8.5px] text-zinc-500 font-bold tracking-widest uppercase">Agent OS</span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white transition"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Rebuilt Sidebar Navigation Items */}
        <nav className="mt-4 flex flex-col gap-0.5 px-2">
          {[
            { id: "new-mission", label: "New Mission", icon: Sparkles },
            { id: "projects", label: "Projects", icon: Layers },
            { id: "assets", label: "Assets Catalog", icon: FolderClosed },
            { id: "tasks", label: "Agent Tasks", icon: Activity },
            { id: "templates", label: "Workflow Presets", icon: Sliders },
            { id: "automation", label: "Automation Hub", icon: Workflow },
            { id: "team", label: "Studio Team", icon: Users, badge: "Soon" },
            { id: "settings", label: "System Config", icon: Settings }
          ].map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                disabled={item.id === "team"}
                onClick={() => {
                  setActiveTab(item.id);
                  setSearchQuery("");
                }}
                className={`group flex items-center justify-between rounded-lg px-3 py-2 text-[13px] text-left transition ${
                  item.id === "team" ? "opacity-40 cursor-not-allowed" : ""
                } ${
                  isActive
                    ? "bg-gradient-to-r from-violet-600/20 to-cyan-500/10 border border-violet-500/20 text-white font-medium shadow-[0_4px_12px_rgba(139,92,246,0.1)]"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`h-[15px] w-[15px] ${isActive ? "text-violet-400" : "text-zinc-500 group-hover:text-zinc-300"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[8px] bg-zinc-800 text-zinc-400 font-bold px-1 py-0.5 rounded uppercase">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Live Running Tasks display inside Sidebar */}
        <div className="mt-6 px-4 flex flex-col gap-2 text-left">
          <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 px-0.5">
            Active Runs
          </div>
          
          {runningTaskName ? (
            <div className="p-3 rounded-xl border border-violet-500/20 bg-violet-950/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-white truncate max-w-[120px]">{runningTaskName}</span>
                <span className="text-[9px] text-cyan-400 font-bold animate-pulse">Processing</span>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 animate-pulse transition-all duration-300" style={{ width: `${progressVal}%` }} />
              </div>
            </div>
          ) : (
            <div className="p-3 border border-dashed border-white/5 rounded-xl text-center">
              <span className="text-[10px] text-zinc-600 block">Idle</span>
            </div>
          )}
        </div>

        {/* Bottom Credits Console */}
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
          </div>
        </div>
      </aside>

      {/* Sidebar Trigger */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="absolute left-3 top-3 z-30 rounded-lg border border-white/5 bg-[#050914]/90 p-2 text-zinc-400 backdrop-blur-xl hover:text-white hover:border-white/10 transition"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* MAIN SYSTEM CONTROLLER */}
      <main className="relative flex flex-1 flex-col bg-[#02040a] z-10 min-w-0">
        
        {/* Navigation Indicator Header */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-[#050914]/30 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2.5 text-zinc-400 text-xs font-semibold">
            <span>Agent Studio OS</span>
            <span className="text-zinc-700">/</span>
            <span className="text-white capitalize">{activeTab.replace("-", " ")}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={runSimulatedDemo}
              disabled={isDemoPlaying}
              className="flex items-center gap-1.5 text-[10.5px] border border-emerald-500/30 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-300 px-3 py-1.5 rounded-lg font-bold transition shadow-[0_0_12px_rgba(16,185,129,0.15)] disabled:opacity-40"
            >
              <Play className="h-3.5 w-3.5" />
              <span>{isDemoPlaying ? "Demo Playing..." : "See It In Action 🎬"}</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("new-mission");
                setShowTour(true);
                setTourStep(0);
                setIsPlanned(false);
                setIsPlanning(false);
              }}
              className="flex items-center gap-1.5 text-[10.5px] border border-cyan-500/30 bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-300 px-3 py-1.5 rounded-lg font-bold transition shadow-[0_0_12px_rgba(6,182,212,0.15)]"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Workspace Guide Tour</span>
            </button>
            <span className="text-[10px] border border-violet-500/20 bg-violet-600/10 text-violet-300 px-2.5 py-1 rounded-lg font-bold">
              Creative Control Center
            </span>
          </div>
        </header>

        {/* CENTRAL DYNAMIC VIEWPORT */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 hide-scrollbar">
          
          {/* ======================================================== */}
          {/* TAB 1: NEW MISSION (MISSION-DRIVEN WORKSPACE) */}
          {/* ======================================================== */}
          {activeTab === "new-mission" && (
            <div className="space-y-6">
              
              {showIntroBanner && (
                <div className="relative max-w-[880px] mx-auto p-5 rounded-2xl border border-white/5 bg-[#050914]/65 backdrop-blur-xl shadow-2xl text-left space-y-4 overflow-hidden">
                  <div className="absolute right-3 top-3">
                    <button
                      onClick={() => {
                        setShowIntroBanner(false);
                        localStorage.setItem("saad_super_show_intro_banner", "false");
                      }}
                      className="text-zinc-500 hover:text-white p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-gradient-to-tr from-violet-600/20 to-cyan-500/10 border border-violet-500/20 text-violet-400 shrink-0">
                      <Sparkles className="h-6 w-6 animate-pulse" />
                    </div>
                    
                    <div className="space-y-1.5 min-w-0">
                      <h3 className="text-sm font-extrabold text-white">Welcome to the Creative AI Control Center</h3>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        This workspace acts as your <strong>Creative Director OS</strong>. Instead of typing random prompts, select a mission preset, describe your target output, and watch the AI formulate a production-ready NLE pipeline. 
                      </p>
                    </div>
                  </div>

                  {/* Flow Stages Visual Diagram */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 text-xs">
                    {[
                      { step: "1. Select Mission", desc: "Choose templates like Advertisement, Podcast, or Storyboards." },
                      { step: "2. AI Planning Stage", desc: "The agent analyzes assets, models, and resolves smart routing configs." },
                      { step: "3. Visual Pipeline Flow", desc: "Preview, reorder, edit, or append pipeline steps before generation." },
                      { step: "4. Live Workspace Tracks", desc: "View the script brief, storyboards, and final output in NLE timeline tracks." }
                    ].map((phase, idx) => (
                      <div key={idx} className="p-3 rounded-xl border border-white/5 bg-slate-950/20 space-y-1">
                        <span className="text-[10.5px] font-bold text-violet-300 block">{phase.step}</span>
                        <span className="text-[9.5px] text-zinc-500 leading-normal block">{phase.desc}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-3.5 mt-2">
                    <span className="text-[9.5px] text-zinc-500">Need help? Launch the step-by-step interactive workspace tour.</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowIntroBanner(false);
                          localStorage.setItem("saad_super_show_intro_banner", "false");
                        }}
                        className="px-3.5 py-1.5 rounded-lg border border-white/5 bg-white/[0.02] text-zinc-400 hover:text-white text-xs font-bold transition"
                      >
                        Dismiss Guide
                      </button>
                      <button
                        onClick={runSimulatedDemo}
                        disabled={isDemoPlaying}
                        className="px-4 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-300 text-xs font-extrabold shadow-md transition disabled:opacity-40"
                      >
                        See It In Action 🎬
                      </button>
                      <button
                        onClick={() => {
                          setShowTour(true);
                          setTourStep(0);
                        }}
                        className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-extrabold shadow-md transition"
                      >
                        Start Guided Tour
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!isPlanned && !isPlanning ? (
                /* SECTION A: Mission Selection Setup */
                <div className="max-w-[880px] mx-auto space-y-8 py-4">
                  <div className="text-center space-y-2">
                    <div className="mx-auto h-12 w-12 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shadow-[0_0_24px_rgba(139,92,246,0.15)] animate-pulse">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h2 className="text-lg font-extrabold text-white tracking-wide">
                      Define your creative production mission
                    </h2>
                    <p className="text-xs text-zinc-500">Select a workflow template below to initialize the agent.</p>
                  </div>

                  {/* Preset Mission Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {MISSION_TYPES.map((mission) => {
                      const isSelected = selectedMission.id === mission.id;
                      const IconComp = mission.icon;
                      return (
                        <button
                          key={mission.id}
                          onClick={() => {
                            setSelectedMission(mission);
                            setObjectiveText("");
                          }}
                          className={`p-4 rounded-xl border text-left transition duration-200 flex flex-col justify-between h-[120px] hover:shadow-lg ${
                            isSelected
                              ? "bg-violet-950/20 border-violet-500/60 shadow-[0_0_16px_rgba(139,92,246,0.15)]"
                              : "bg-[#050914]/50 border-white/5 hover:border-white/10"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className={`p-2 rounded-lg ${isSelected ? "bg-violet-600/20 text-violet-300" : "bg-white/5 text-zinc-400"}`}>
                              <IconComp className="h-4 w-4" />
                            </div>
                            {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[11.5px] font-bold text-white block">{mission.title}</span>
                            <span className="text-[9.5px] text-zinc-500 block leading-tight truncate">{mission.description}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Objective Input Area */}
                  <div className="rounded-2xl border border-white/[0.08] bg-[#050914]/80 p-4 space-y-4 shadow-2xl backdrop-blur-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Mission Description</span>
                    </div>

                    <textarea
                      value={objectiveText}
                      onChange={(e) => setObjectiveText(e.target.value)}
                      placeholder={`Enter objective specifications for "${selectedMission.title}" (e.g. Cinematic horizontal short showing coffee steam pouring)...`}
                      className="w-full min-h-[110px] bg-transparent border-none outline-none resize-none text-xs text-white placeholder-zinc-600 leading-relaxed font-sans"
                    />

                    {/* Drag and Drop Asset Attachment */}
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      className={`border border-dashed rounded-xl p-4 text-center transition flex flex-col items-center justify-center gap-2 ${
                        isDragging ? "border-violet-500 bg-violet-600/5" : "border-white/5 hover:border-white/10 bg-[#090f1d]/40"
                      }`}
                    >
                      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                      
                      {attachedImageUrl ? (
                        <div className="flex items-center gap-3 p-1.5 rounded-lg border border-violet-500/20 bg-violet-950/10">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={attachedImageUrl} className="h-9 w-9 object-cover rounded" alt="Asset preview" />
                          <div className="text-left">
                            <span className="text-[10.5px] font-bold text-white block">Style Reference Image</span>
                            <button onClick={() => setAttachedImageUrl(null)} className="text-[9px] text-red-400 hover:underline">Remove</button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2 text-zinc-500 hover:text-white transition text-xs"
                        >
                          <UploadCloud className="h-4 w-4" />
                          <span>Attach visual asset references or drag and drop</span>
                        </button>
                      )}
                    </div>

                    {/* Submit Actions */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-3">
                      <span className="text-[10px] text-zinc-500">Auto-routes to the best model configuration.</span>
                      <button
                        onClick={handleStartPlanning}
                        disabled={!objectiveText.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-bold text-xs shadow-[0_4px_12px_rgba(139,92,246,0.25)] transition shrink-0"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Analyze & Plan Mission</span>
                      </button>
                    </div>

                  </div>
                </div>
              ) : isPlanning ? (
                /* SECTION B: Animated AI Planning Stage */
                <div className="max-w-[540px] mx-auto py-12 space-y-6 text-left bg-[#050914]/50 border border-white/5 p-6 rounded-2xl">
                  <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                    <div className="h-9 w-9 items-center justify-center rounded-lg bg-violet-600/10 border border-violet-500/20 text-violet-400 flex">
                      <Activity className="h-5 w-5 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">AI Planning Stage</h3>
                      <span className="text-[10px] text-zinc-500">Creative Director calculating pipeline parameters...</span>
                    </div>
                  </div>

                  <div className="space-y-3.5 font-mono text-[11px]">
                    {[
                      "Understanding creative objective request",
                      "Analyzing uploaded workspace assets",
                      "Selecting optimized model routes & providers",
                      "Calculating estimated credit costs",
                      "Compiling workflow pipeline execution roadmap"
                    ].map((step, idx) => {
                      const isTicked = planningTicks[idx];
                      const isCurrent = planningStep === idx;
                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-2.5 rounded-lg border transition ${
                            isCurrent
                              ? "bg-violet-950/20 border-violet-500/40 text-violet-300"
                              : isTicked
                              ? "border-emerald-500/20 text-emerald-400 bg-emerald-950/5"
                              : "border-transparent text-zinc-600"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {isTicked ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            ) : isCurrent ? (
                              <div className="h-3 w-3 border border-t-transparent border-violet-400 rounded-full animate-spin" />
                            ) : (
                              <HelpCircle className="h-4 w-4" />
                            )}
                            <span>{step}</span>
                          </div>
                          {isTicked && <span className="text-[9.5px] uppercase font-bold text-emerald-400">Ready</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* SECTION C: Workflow Execution Dashboard */
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column: Smart Routing Panel, visual pipeline, and Activity Console */}
                  <div className="xl:col-span-5 space-y-6">
                    
                    {/* Smart AI Routing Panel */}
                    <div className="p-5 rounded-2xl border border-white/5 bg-[#050914]/80 text-left space-y-4 shadow-xl">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Smart AI Routing</span>
                        <span className="text-[9.5px] text-zinc-500">Calculated defaults (overrideable)</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-[11px]">
                        <div className="flex flex-col gap-1">
                          <label className="text-zinc-500 font-bold uppercase text-[9px]">AI Model / النموذج</label>
                          <select
                            value={smartModel}
                            onChange={(e) => handleModelChange(e.target.value)}
                            className="bg-[#090f1d] border border-white/5 rounded-lg px-2.5 py-1.5 outline-none text-white font-medium focus:border-violet-500/40"
                          >
                            <option value="Kling 3.0 Pro">Kling 3.0 Pro (كلينك 3 برو)</option>
                            <option value="Kling 3.0 Standard">Kling 3.0 Standard (كلينك 3 عادي)</option>
                            <option value="Seedance 2.0 Stable">Seedance 2.0 Stable (سيدسانس 2 مستقر)</option>
                            <option value="Seedance 2.0 Mini">Seedance 2.0 Mini (سيدانس ميني)</option>
                            <option value="Flux.1 Dev">Flux.1 Dev (صورة Flux)</option>
                            <option value="GPT-4o">GPT-4o (نصي فقط)</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-zinc-500 font-bold uppercase text-[9px]">Provider / المزود</label>
                          <select
                            value={smartProvider}
                            disabled
                            className="bg-[#090f1d]/50 border border-white/5 rounded-lg px-2.5 py-1.5 outline-none text-zinc-400 font-medium cursor-not-allowed"
                          >
                            <option value="Kling AI">Kling AI (كوايشو)</option>
                            <option value="BytePlus AI">BytePlus AI (بايت دانس)</option>
                            <option value="Flux / OpenAI">Flux / OpenAI (فلكس)</option>
                            <option value="OpenAI">OpenAI (أوبن إيه آي)</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-zinc-500 font-bold uppercase text-[9px]">Aspect Ratio / النسبة</label>
                          <select
                            value={smartAspectRatio}
                            onChange={(e) => setSmartAspectRatio(e.target.value)}
                            className="bg-[#090f1d] border border-white/5 rounded-lg px-2.5 py-1.5 outline-none text-white font-medium focus:border-violet-500/40"
                          >
                            {getAspectRatiosForModel(smartModel).map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-zinc-500 font-bold uppercase text-[9px]">Duration / الوقت</label>
                          <select
                            value={smartDuration}
                            onChange={(e) => setSmartDuration(e.target.value)}
                            className="bg-[#090f1d] border border-white/5 rounded-lg px-2.5 py-1.5 outline-none text-white font-medium focus:border-violet-500/40"
                          >
                            <option value="5s">5s (5 ثوانٍ)</option>
                            <option value="10s">10s (10 ثوانٍ)</option>
                            <option value="15s">15s (15 ثانية)</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-zinc-500 font-bold uppercase text-[9px]">Quality / الدقة والجودة</label>
                          <select
                            value={smartQuality}
                            onChange={(e) => setSmartQuality(e.target.value)}
                            className="bg-[#090f1d] border border-white/5 rounded-lg px-2.5 py-1.5 outline-none text-white font-medium focus:border-violet-500/40"
                          >
                            {getQualitiesForModel(smartModel).map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-zinc-500 font-bold uppercase text-[9px]">Style / الستايل الإبداعي</label>
                          <select
                            value={smartStyle}
                            onChange={(e) => setSmartStyle(e.target.value)}
                            className="bg-[#090f1d] border border-white/5 rounded-lg px-2.5 py-1.5 outline-none text-white font-medium focus:border-violet-500/40"
                          >
                            <option value="Cinematic">سينمائي Cinematic</option>
                            <option value="Photorealistic">واقعي فائق Photorealistic</option>
                            <option value="Anime">أنمي ياباني Anime</option>
                            <option value="3D Composite">ثلاثي الأبعاد 3D Render</option>
                            <option value="Cyberpunk">سايبربانك Cyberpunk</option>
                            <option value="Vintage 35mm">سينمائي عتيق Vintage 35mm</option>
                            <option value="Fantasy">فانتازيا خيالية Fantasy</option>
                          </select>
                        </div>

                        {/* Sound Toggle (توليد الصوت) */}
                        {(smartModel.includes("Kling") || smartModel.includes("Seedance")) && (
                          <div className="flex items-center justify-between col-span-2 p-2.5 rounded-xl bg-white/5 border border-white/5 mt-1.5 text-left">
                            <div className="flex flex-col">
                              <span className="text-[11px] font-bold text-white leading-none">Generate Audio / توليد الصوت</span>
                              <span className="text-[9px] text-zinc-500 mt-1">Include AI-generated background sound / تفعيل الموسيقى والصوت المرافق</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={smartSound}
                                onChange={(e) => setSmartSound(e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-8 h-4 bg-[#090f1d] border border-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-500 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-violet-600 peer-checked:after:bg-white"></div>
                            </label>
                          </div>
                        )}
                      </div>


                      {/* Start & End Frames Upload (ستار واند) */}
                      {(smartModel.includes("Kling") || smartModel.includes("Seedance")) && (
                        <div className="border-t border-white/5 pt-3.5 space-y-4 text-left">
                          <div className="space-y-2">
                            <span className="text-[9px] font-extrabold uppercase tracking-widest text-violet-400 block">
                              Start & End Frames / صورة البداية والنهاية (ستار واند)
                            </span>
                            
                            <div className="grid grid-cols-2 gap-3.5">
                              {/* Start Frame Upload */}
                              <div className="space-y-1">
                                <label className="text-zinc-500 font-bold uppercase text-[8.5px] block">
                                  Start Frame (البداية)
                                </label>
                                <div
                                  className="relative border border-dashed border-white/5 hover:border-white/10 rounded-xl bg-[#090f1d]/40 h-20 transition flex flex-col items-center justify-center p-2 text-center cursor-pointer overflow-hidden group"
                                  onClick={() => startFileInputRef.current?.click()}
                                >
                                  <input
                                    type="file"
                                    ref={startFileInputRef}
                                    onChange={handleStartFrameUpload}
                                    className="hidden"
                                    accept="image/*"
                                  />
                                  {startFrameImage ? (
                                    <>
                                      <img
                                        src={startFrameImage}
                                        className="absolute inset-0 w-full h-full object-cover rounded-xl"
                                        alt="Start Frame"
                                      />
                                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setStartFrameImage(null);
                                          }}
                                          className="p-1.5 rounded-full bg-red-600/85 hover:bg-red-600 text-white transition shadow"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="flex flex-col items-center gap-1 text-zinc-500 group-hover:text-zinc-300 transition">
                                      <Camera className="h-3.5 w-3.5 text-violet-400" />
                                      <span className="text-[9px] font-medium leading-none">تحميل البداية</span>
                                      <span className="text-[7.5px] text-zinc-600">Start Image</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* End Frame Upload */}
                              <div className="space-y-1">
                                <label className="text-zinc-500 font-bold uppercase text-[8.5px] block">
                                  End Frame (النهاية)
                                </label>
                                <div
                                  className="relative border border-dashed border-white/5 hover:border-white/10 rounded-xl bg-[#090f1d]/40 h-20 transition flex flex-col items-center justify-center p-2 text-center cursor-pointer overflow-hidden group"
                                  onClick={() => endFileInputRef.current?.click()}
                                >
                                  <input
                                    type="file"
                                    ref={endFileInputRef}
                                    onChange={handleEndFrameUpload}
                                    className="hidden"
                                    accept="image/*"
                                  />
                                  {endFrameImage ? (
                                    <>
                                      <img
                                        src={endFrameImage}
                                        className="absolute inset-0 w-full h-full object-cover rounded-xl"
                                        alt="End Frame"
                                      />
                                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEndFrameImage(null);
                                          }}
                                          className="p-1.5 rounded-full bg-red-600/85 hover:bg-red-600 text-white transition shadow"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="flex flex-col items-center gap-1 text-zinc-500 group-hover:text-zinc-300 transition">
                                      <Camera className="h-3.5 w-3.5 text-violet-400" />
                                      <span className="text-[9px] font-medium leading-none">تحميل النهاية</span>
                                      <span className="text-[7.5px] text-zinc-600">End Image</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Reference Images / صور مرجعية */}
                          {getReferenceSlotsCount(smartModel) > 0 && (
                            <div className="border-t border-white/5 pt-3.5 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-extrabold uppercase tracking-widest text-violet-400 block">
                                  Reference Images / صور مرجعية إضافية ({getReferenceSlotsCount(smartModel)} slots)
                                </span>
                                <span className="text-[8px] text-zinc-500">
                                  Max {getReferenceSlotsCount(smartModel)} images / الحد الأقصى {getReferenceSlotsCount(smartModel)} صور
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                {Array.from({ length: getReferenceSlotsCount(smartModel) }).map((_, idx) => {
                                  const img = smartReferenceImages[idx];
                                  return (
                                    <div key={idx} className="space-y-1">
                                      <div
                                        className="relative border border-dashed border-white/5 hover:border-white/10 rounded-xl bg-[#090f1d]/40 h-16 transition flex flex-col items-center justify-center p-1 text-center cursor-pointer overflow-hidden group"
                                        onClick={() => document.getElementById(`ref-image-input-${idx}`)?.click()}
                                      >
                                        <input
                                          type="file"
                                          id={`ref-image-input-${idx}`}
                                          onChange={(e) => handleReferenceImageUpload(e, idx)}
                                          className="hidden"
                                          accept="image/*"
                                        />
                                        {img ? (
                                          <>
                                            <img
                                              src={img}
                                              className="absolute inset-0 w-full h-full object-cover rounded-xl"
                                              alt={`Reference ${idx + 1}`}
                                            />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSmartReferenceImages((prev) => {
                                                    const next = [...prev];
                                                    next[idx] = "";
                                                    return next;
                                                  });
                                                }}
                                                className="p-1 rounded-full bg-red-600/85 hover:bg-red-600 text-white transition shadow"
                                              >
                                                <Trash2 className="h-2.5 w-2.5" />
                                              </button>
                                            </div>
                                          </>
                                        ) : (
                                          <div className="flex flex-col items-center gap-0.5 text-zinc-500 group-hover:text-zinc-300 transition">
                                            <ImageIcon className="h-3 w-3 text-violet-400" />
                                            <span className="text-[7.5px] font-medium leading-none">صورة {idx + 1}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between p-3 rounded-xl bg-violet-600/10 border border-violet-500/20 text-xs">
                        <span className="font-bold text-violet-300">Estimated cost:</span>
                        <span className="font-extrabold text-emerald-400">{smartCredits} Credits</span>
                      </div>
                    </div>

                    {/* Workflow pipeline steps visual list */}
                    <div className="p-5 rounded-2xl border border-white/5 bg-[#050914]/80 text-left space-y-4 shadow-xl">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Visual Workflow Editor</span>
                        <button
                          onClick={() => setWorkflowSteps([...workflowSteps, "New Workflow step"])}
                          className="text-[9.5px] text-violet-400 hover:underline flex items-center gap-0.5"
                        >
                          <Plus className="h-3 w-3" /> Add Step
                        </button>
                      </div>

                      <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                        {workflowSteps.map((step, idx) => (
                          <div
                            key={idx}
                            className="group flex items-center justify-between p-2 rounded-lg border border-white/5 bg-[#090f1d]/50 text-[11px]"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[9px] text-zinc-600 font-bold shrink-0">{idx + 1}.</span>
                              {editingStepIndex === idx ? (
                                <input
                                  type="text"
                                  value={editingStepValue}
                                  onChange={(e) => setEditingStepValue(e.target.value)}
                                  onBlur={saveEditStep}
                                  onKeyDown={(e) => e.key === "Enter" && saveEditStep()}
                                  className="bg-zinc-800 text-white px-2 py-0.5 rounded outline-none border border-violet-500/40 text-[11px]"
                                  autoFocus
                                />
                              ) : (
                                <span
                                  onClick={() => startEditStep(idx)}
                                  className="text-white hover:text-violet-400 cursor-pointer font-medium truncate"
                                >
                                  {step}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition shrink-0">
                              <button onClick={() => moveWorkflowStep(idx, "up")} className="text-zinc-500 hover:text-white transition">↑</button>
                              <button onClick={() => moveWorkflowStep(idx, "down")} className="text-zinc-500 hover:text-white transition">↓</button>
                              <button onClick={() => deleteWorkflowStep(idx)} className="text-zinc-500 hover:text-red-400 transition">×</button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={handleExecuteWorkflow}
                        disabled={runningTaskName !== null}
                        className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-extrabold text-xs shadow-md transition disabled:opacity-40"
                      >
                        {runningTaskName ? "Executing creative pipeline..." : "Execute Workflow"}
                      </button>
                    </div>

                    {/* Agent Activity Console Terminal */}
                    <div className="p-4 rounded-2xl border border-white/5 bg-[#050914] h-[190px] text-left flex flex-col shadow-xl">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <Terminal className="h-3.5 w-3.5 text-violet-400" />
                          <span className="text-[10.5px] font-bold text-white font-mono">Agent Console logs</span>
                        </div>
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      </div>

                      <div className="flex-1 overflow-y-auto font-mono text-[9.5px] text-cyan-300/80 space-y-1.5 hide-scrollbar">
                        {activeLogs.map((log, index) => (
                          <div key={index} className="border-l border-zinc-800 pl-2 leading-relaxed">
                            {log}
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Central Live Workspace panels */}
                  <div className="xl:col-span-7 space-y-6">
                    
                    <div className="border border-white/5 rounded-2xl bg-[#050914]/40 overflow-hidden shadow-xl">
                      
                      {/* Workspace top navigation tabs */}
                      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-black/40">
                        <div className="flex gap-2">
                          {[
                            { id: "concept", label: "Concept script" },
                            { id: "storyboard", label: "Storyboard frames" },
                            { id: "timeline", label: "Video Timeline" }
                          ].map((hubTab) => (
                            <button
                              key={hubTab.id}
                              onClick={() => setActiveWorkspaceTab(hubTab.id)}
                              className={`text-[10px] font-extrabold px-3 py-1.5 rounded transition ${
                                activeWorkspaceTab === hubTab.id
                                  ? "bg-violet-600/20 border border-violet-500/30 text-violet-300"
                                  : "text-zinc-500 hover:text-zinc-300"
                              }`}
                            >
                              {hubTab.label}
                            </button>
                          ))}
                        </div>
                        <span className="text-[8px] bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded font-extrabold text-emerald-400 tracking-wider">
                          LIVE WORKSPACE
                        </span>
                      </div>

                      {/* Workspace central preview canvas */}
                      <div className="p-5 min-h-[380px] flex flex-col justify-between">
                        
                        {activeWorkspaceTab === "concept" && (
                          <div className="flex-1 flex flex-col text-left space-y-3">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Creative Script Brief</span>
                            <textarea
                              value={scriptBrief}
                              onChange={(e) => setScriptBrief(e.target.value)}
                              className="w-full flex-1 bg-black/30 border border-white/5 rounded-xl p-4 font-mono text-[11px] text-zinc-300 leading-relaxed outline-none resize-none"
                            />
                          </div>
                        )}

                        {activeWorkspaceTab === "storyboard" && (
                          <div className="flex-1 text-left space-y-4">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Conceptual Storyboard</span>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              {storyboardFrames.map((frame) => (
                                <div key={frame.id} className="rounded-xl border border-white/5 bg-[#090f1d]/60 overflow-hidden flex flex-col">
                                  <div className="aspect-video relative bg-slate-900 flex items-center justify-center text-xs text-zinc-700">
                                    {outputVideo && frame.id === 1 ? (
                                      <video src={outputVideo} muted loop autoPlay playsInline className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="flex flex-col items-center justify-center gap-1.5 p-3">
                                        <Camera className="h-5 w-5 text-zinc-600" />
                                        <span className="text-[9px] uppercase font-bold text-zinc-500">Frame {frame.id}</span>
                                      </div>
                                    )}
                                  </div>
                                  <p className="p-3 text-[10px] text-zinc-400 leading-normal border-t border-white/5">{frame.desc}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {activeWorkspaceTab === "timeline" && (
                          <div className="flex-1 text-left space-y-6 flex flex-col justify-between">
                            
                            {/* Player / Viewport */}
                            <div className="aspect-video max-w-[480px] mx-auto rounded-xl border border-white/5 bg-black/60 overflow-hidden relative flex items-center justify-center text-zinc-700">
                              {outputVideo ? (
                                outputMediaType === "image" ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={outputVideo} alt="image render" className="w-full h-full object-contain" />
                                ) : (
                                  <video src={outputVideo} muted loop autoPlay playsInline className="w-full h-full object-cover" />
                                )
                              ) : (
                                <div className="flex flex-col items-center justify-center gap-2">
                                  <Play className="h-6 w-6 text-zinc-600 animate-pulse" />
                                  <span className="text-[10px] uppercase font-bold text-zinc-500">Active Viewport Player</span>
                                </div>
                              )}
                            </div>

                            {/* Timeline tracks (NLE editor mock representation) */}
                            <div className="p-4 rounded-xl border border-white/5 bg-black/40 space-y-3 font-mono text-[9px] text-zinc-500">
                              <div className="flex items-center gap-3">
                                <span className="w-6 font-bold text-white">V1</span>
                                <div className="flex-1 h-6 rounded bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300 font-bold relative overflow-hidden">
                                  <span>Cinematic Video Clip</span>
                                  <div className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 left-1/3 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse" />
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="w-6 font-bold text-white">A1</span>
                                <div className="flex-1 h-6 rounded bg-cyan-600/10 border border-cyan-500/20 flex items-center justify-center text-cyan-300 font-bold">
                                  <span>BG Audio track</span>
                                </div>
                              </div>
                            </div>

                          </div>
                        )}

                        {/* Bottom Output Actions block */}
                        {outputVideo && (
                          <div className="border-t border-white/5 pt-4 mt-4 flex items-center justify-between">
                            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                              <Check className="h-3.5 w-3.5" /> Output Ready
                            </span>
                            
                            <a
                              href={outputVideo}
                              download={`saad_output_${Math.floor(100+Math.random()*900)}.mp4`}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/5 bg-white/[0.03] text-zinc-300 hover:text-white transition text-xs font-bold"
                            >
                              <Download className="h-3.5 w-3.5" /> Download output
                            </a>
                          </div>
                        )}

                      </div>

                    </div>

                  </div>

                </div>
              )}

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: PROJECTS (RUN HISTORY LOG) */}
          {/* ======================================================== */}
          {activeTab === "projects" && (
            <div className="max-w-[860px] mx-auto space-y-4 text-left">
              <div className="flex items-center justify-between mb-2">
                <div className="flex flex-col">
                  <h2 className="text-lg font-bold text-white">Mission Logs Database</h2>
                  <p className="text-xs text-zinc-500">Query and review past creative mission runs.</p>
                </div>
              </div>

              {/* Filter runs */}
              <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-[#050914]/80 px-3.5 py-2.5">
                <Search className="h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter logs by mission parameters..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-xs text-white placeholder-zinc-500"
                />
              </div>

              {taskHistory.filter(t => t.prompt.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 border border-white/5 rounded-2xl bg-white/[0.01] text-center space-y-2">
                  <Clock className="h-8 w-8 text-zinc-600 animate-pulse" />
                  <span className="text-xs font-semibold text-zinc-500">No matching runs found</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {taskHistory
                    .filter(t => t.prompt.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((run) => (
                      <div key={run.id} className="p-4 rounded-xl border border-white/5 bg-[#050914]/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex flex-col text-left space-y-1 max-w-[520px]">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] bg-violet-500/20 text-violet-300 font-bold px-1.5 py-0.5 rounded capitalize">
                              {run.category}
                            </span>
                            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-bold px-1.5 py-0.5 rounded font-mono">
                              {run.engine}
                            </span>
                            <span className="text-[10px] text-zinc-500">{run.timestamp}</span>
                          </div>
                          <span className="text-xs text-white font-medium leading-relaxed italic text-left">"{run.prompt}"</span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[10px] text-zinc-500">{run.fileSize}</span>
                          <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[9px] px-2 py-0.5 rounded">
                            <Check className="h-3 w-3" />
                            <span>Executed</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: ASSETS CATALOG (ARCHIVE OF RENDERED OUTPUTS) */}
          {/* ======================================================== */}
          {activeTab === "assets" && (
            <div className="max-w-[860px] mx-auto space-y-6 text-left">
              
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex flex-col">
                  <h2 className="text-lg font-bold text-white">Assets Storage</h2>
                  
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

              <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple className="hidden" />

              {filteredFiles.length === 0 ? (
                <div className="text-center p-8 border border-white/5 bg-white/[0.01] rounded-2xl">
                  <span className="text-xs text-zinc-500">No assets stored in target vault</span>
                </div>
              ) : (
                <div className="border border-white/5 rounded-2xl bg-[#050914]/40 overflow-hidden">
                  <table className="w-full border-collapse text-xs text-left">
                    <thead>
                      <tr className="border-b border-white/5 bg-[#050914]/80 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                        <th className="p-3.5">Asset File Name</th>
                        <th className="p-3.5">Format</th>
                        <th className="p-3.5">Size</th>
                        <th className="p-3.5">Created Date</th>
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
                          <td className="p-3.5 text-right flex items-center justify-end gap-2">
                            {file.type === "image" && (
                              <button
                                onClick={() => {
                                  setAttachedImageUrl(file.url || null);
                                  setActiveTab("new-mission");
                                }}
                                className={`transition p-1 rounded hover:bg-white/5 ${
                                  attachedImageUrl === file.url ? "text-violet-400 font-extrabold" : "text-zinc-500 hover:text-violet-400"
                                }`}
                                title="Attach to objective"
                              >
                                <Paperclip className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteFile(file.id)}
                              className="text-zinc-500 hover:text-red-400 transition p-1 rounded hover:bg-white/5"
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
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: ACTIVE TASKS LOGS */}
          {/* ======================================================== */}
          {activeTab === "tasks" && (
            <div className="max-w-[760px] mx-auto space-y-6 text-left">
              <div className="flex flex-col">
                <h2 className="text-lg font-bold text-white">Tasks Tracker</h2>
                <p className="text-xs text-zinc-500">Real-time status of pipeline tasks running in backend.</p>
              </div>

              {runningTaskName ? (
                <div className="p-5 border border-violet-500/20 bg-violet-950/5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-xs font-bold text-white">Active Run: {runningTaskName}</span>
                    <span className="text-xs text-cyan-400 font-bold animate-pulse">{Math.round(progressVal)}% Executing</span>
                  </div>

                  {/* Execution line */}
                  <div className="grid grid-cols-4 gap-3 text-xs">
                    {[
                      { id: "claude", name: "Concept Draft", desc: "Plan Objective Script" },
                      { id: "gpt2", name: "Storyboard", desc: "Previs Visual Outlines" },
                      { id: "kling", name: "Animate Clip", desc: "Kling AI Video Latents" },
                      { id: "ffmpeg", name: "Final Compile", desc: "Stitching Outputs" }
                    ].map((modelStep, idx) => {
                      const isCurrent = activeStep === modelStep.id;
                      const isDone = progressVal === 100 || (idx === 0 && (activeStep === "gpt2" || activeStep === "kling" || activeStep === "ffmpeg" || activeStep === "done")) ||
                                     (idx === 1 && (activeStep === "kling" || activeStep === "ffmpeg" || activeStep === "done")) ||
                                     (idx === 2 && (activeStep === "ffmpeg" || activeStep === "done")) ||
                                     (idx === 3 && activeStep === "done");
                      
                      return (
                        <div
                          key={modelStep.id}
                          className={`p-3 rounded-xl border text-left flex flex-col justify-between h-[80px] ${
                            isCurrent
                              ? "bg-violet-950/20 border-violet-500/60 ring-1 ring-violet-500/30 animate-pulse text-violet-300"
                              : isDone
                              ? "bg-emerald-950/5 border-emerald-500/30 text-emerald-400"
                              : "bg-white/[0.01] border-white/5 text-zinc-500"
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-[10px] uppercase tracking-wider">{modelStep.name}</span>
                            {isDone && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                          </div>
                          <span className="text-[9px] text-zinc-500 block leading-tight">{modelStep.desc}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Log Viewport */}
                  <div className="bg-black/50 border border-white/5 p-4 rounded-xl font-mono text-[10px] text-cyan-300/80 space-y-1.5 h-[220px] overflow-y-auto">
                    {activeLogs.map((log, index) => (
                      <div key={index} className="border-l border-zinc-800 pl-2">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-8 border border-white/5 bg-white/[0.01] rounded-2xl text-center space-y-2">
                  <Activity className="h-8 w-8 text-zinc-600 mx-auto" />
                  <span className="text-xs text-zinc-500 block">No active runs currently processing.</span>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: TEMPLATES (WORKFLOW PRESETS) */}
          {/* ======================================================== */}
          {activeTab === "templates" && (
            <div className="max-w-[860px] mx-auto space-y-6 text-left">
              <div className="flex flex-col">
                <h2 className="text-lg font-bold text-white">Workflow Presets</h2>
                <p className="text-xs text-zinc-500">Pick predefined model chains for creative automation.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { title: "Vertical Short Cinematic", steps: ["Script outlines", "Storyboard sketch", "Kling Video Pro Animation", "Audio Dubbing"], cost: "8 credits" },
                  { title: "Interactive Article Beats", steps: ["Draft beats", "Offer path choices", "Rewrite loops"], cost: "1 credit" },
                  { title: "Social Banner Ad Pack", steps: ["Product structure scan", "Generative copy variation", "GPT Image render"], cost: "4 credits" },
                  { title: "Audio Sync Podcast", steps: ["Transcribe Whisper", "Active speaker switch", "ExtendScript timeline rebuild"], cost: "5 credits" }
                ].map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-white/5 bg-[#050914]/50 flex flex-col justify-between h-[160px]">
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-white block text-left">{item.title}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {item.steps.map((st, sIdx) => (
                          <span key={sIdx} className="text-[8.5px] bg-[#090f1d] border border-white/5 text-zinc-400 px-2 py-0.5 rounded font-mono">
                            {st}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-auto text-[10.5px]">
                      <span className="text-zinc-500">Cost: <strong className="text-emerald-400 font-bold">{item.cost}</strong></span>
                      <button
                        onClick={() => {
                          const mission = MISSION_TYPES.find(m => m.id === "create-ad") || MISSION_TYPES[0];
                          setSelectedMission(mission);
                          setWorkflowSteps(item.steps);
                          setActiveTab("new-mission");
                        }}
                        className="text-violet-400 hover:text-violet-300 font-bold"
                      >
                        Apply Preset
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 6: AUTOMATION HUBS */}
          {/* ======================================================== */}
          {activeTab === "automation" && (
            <div className="max-w-[760px] mx-auto space-y-6 text-left">
              <div className="flex flex-col">
                <h2 className="text-lg font-bold text-white">Automation Pipeline Webhooks</h2>
                <p className="text-xs text-zinc-500">Configure webhooks and scheduled triggers to fire workflows.</p>
              </div>

              <div className="p-4 rounded-xl border border-white/5 bg-[#050914]/50 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-xs font-bold text-white">Active webhook trigger</span>
                  <span className="text-[10px] text-emerald-400 font-bold">Active</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Endpoint:</span>
                    <span className="font-mono text-zinc-300">https://www.saadstudio.app/api/automation/trigger</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Method:</span>
                    <span className="font-mono text-zinc-300">POST</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 7: ADVANCED CONFIGURATION (SETTINGS VIEWPORT) */}
          {/* ======================================================== */}
          {activeTab === "settings" && (
            <div className="max-w-[960px] mx-auto space-y-6 text-left">
              
              {/* Secondary Navigation for Settings */}
              <div className="flex items-center bg-white/[0.02] border border-white/5 rounded-xl p-0.5 max-w-max mx-auto mb-6">
                {[
                  { id: "skills", label: "Skills Catalog" },
                  { id: "memory", label: "OS Memory Node" },
                  { id: "connectors", label: "Connectors Canvas" }
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setActiveSettingsTab(st.id as any)}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
                      activeSettingsTab === st.id
                        ? "bg-violet-600/20 text-violet-300 border border-violet-500/20"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {/* Skills View */}
              {activeSettingsTab === "skills" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div className="flex flex-col">
                      <h2 className="text-base font-bold text-white">Install Capability Skills</h2>
                      <p className="text-xs text-zinc-500">Configure command-triggers mapped to agent system instructions.</p>
                    </div>

                    <button
                      onClick={() => setIsSkillModalOpen(true)}
                      className="px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs transition"
                    >
                      + Create Skill
                    </button>
                  </div>

                  {/* Categories selector */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-white/5 hide-scrollbar">
                    {["All", "Content Creation", "Creative & Marketing", "Frontend Engineer", "Writing", "Marketing & Sales", "Personal & Specialized", "Productivity"].map((category) => (
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {filteredSkills.map((skill) => (
                      <div
                        key={skill.id}
                        className={`p-4 rounded-xl border transition flex flex-col justify-between h-[180px] hover:shadow-lg ${
                          skill.isActive
                            ? "border-violet-500/30 bg-violet-950/[0.08]"
                            : "border-white/5 bg-white/[0.01]"
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              {getSkillIcon(skill.id, skill.icon)}
                              <span className="text-xs font-bold text-white font-mono">{skill.title}</span>
                            </div>
                            
                            <button
                              onClick={() => toggleSkillActive(skill.id)}
                              className={`h-5 w-5 flex items-center justify-center rounded-full border transition ${
                                skill.isActive
                                  ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-400"
                                  : "bg-white/[0.03] border-white/10 text-zinc-500"
                              }`}
                            >
                              {skill.isActive ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                            </button>
                          </div>
                          <p className="text-[10px] text-zinc-400 line-clamp-4 leading-normal mt-1 text-left">{skill.desc}</p>
                        </div>

                        <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-auto text-[9px]">
                          <span className="text-zinc-600 font-bold uppercase">{skill.category}</span>
                          {skill.isCustom && (
                            <button onClick={() => deleteSkill(skill.id)} className="text-zinc-600 hover:text-red-400 transition">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Memory View */}
              {activeSettingsTab === "memory" && (
                <div className="space-y-6">
                  
                  {/* Central hub web connector */}
                  <div 
                    className="relative min-h-[440px] w-full rounded-2xl border border-white/5 bg-[#050914]/40 overflow-hidden shadow-2xl flex items-center justify-center"
                    style={{ 
                      backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)", 
                      backgroundSize: "16px 16px" 
                    }}
                  >
                    
                    {/* SVG Connections */}
                    <div className="absolute inset-0 z-0">
                      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                        {[
                          { id: "resolution", angle: -Math.PI / 2 },
                          { id: "aspect_ratio", angle: -Math.PI / 6 },
                          { id: "lighting", angle: (Math.PI / 3) },
                          { id: "character_voice", angle: (Math.PI * 1.1) }
                        ].map((hub, index) => {
                          const x2 = `${50 + 18 * Math.cos(hub.angle)}%`;
                          const y2 = `${50 + 18 * Math.sin(hub.angle)}%`;
                          return (
                            <line
                              key={index}
                              x1="50%"
                              y1="50%"
                              x2={x2}
                              y2={y2}
                              stroke="#84cc16"
                              strokeWidth="2"
                              strokeOpacity="0.3"
                              className="animate-pulse"
                            />
                          );
                        })}
                      </svg>
                    </div>

                    <div className="absolute inset-0 z-10 w-full h-full pointer-events-none">
                      {/* Central Orb */}
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-gradient-to-tr from-lime-400 via-yellow-300 to-emerald-400 shadow-[0_0_30px_rgba(163,230,53,0.5)] z-30 pointer-events-auto border border-[#02040a]" />

                      {/* Sub nodes */}
                      {[
                        { id: "resolution", title: "resolution", angle: -Math.PI / 2, icon: "</>" },
                        { id: "aspect_ratio", title: "aspect_ratio", angle: -Math.PI / 6, icon: "📷" },
                        { id: "lighting", title: "lighting", angle: (Math.PI / 3), icon: "🤍" },
                        { id: "character_voice", title: "character_voice", angle: (Math.PI * 1.1), icon: "🤖" }
                      ].map((hub, idx) => {
                        const x = `${50 + 18 * Math.cos(hub.angle)}%`;
                        const y = `${50 + 18 * Math.sin(hub.angle)}%`;
                        return (
                          <div
                            key={idx}
                            style={{ left: x, top: y }}
                            className="absolute -translate-x-1/2 -translate-y-1/2 h-7 px-3 rounded-full border border-white/10 bg-[#090f1d]/90 flex items-center gap-1.5 text-[10px] font-bold text-white shadow-lg pointer-events-auto cursor-pointer"
                          >
                            <span>{hub.icon}</span>
                            <span className="font-mono text-zinc-300">{hub.title}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center pointer-events-none z-10 space-y-1">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Agent Memory Map</h3>
                      <p className="text-[10px] text-zinc-500">Saved user configuration nodes</p>
                    </div>

                  </div>

                  {/* List View with locks */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-[720px] mx-auto">
                    {memoriesList.map((mem) => {
                      const isLocked = lockedMemories.includes(mem.id);
                      return (
                        <div key={mem.id} className="p-3.5 rounded-xl border border-white/5 bg-[#050914]/40 flex items-center justify-between text-xs font-semibold">
                          <span className="text-zinc-300">{mem.text}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => {
                                const next = lockedMemories.includes(mem.id)
                                  ? lockedMemories.filter(mId => mId !== mem.id)
                                  : [...lockedMemories, mem.id];
                                setLockedMemories(next);
                                saveToStorage("saad_super_locked_memories_v6", next);
                              }}
                              className={`h-7 w-7 rounded-lg border flex items-center justify-center transition ${
                                isLocked ? "border-violet-500/30 bg-violet-600/10 text-violet-400" : "border-white/5 bg-[#090f1d] text-zinc-500"
                              }`}
                            >
                              {isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                            </button>
                            <button onClick={() => handleDeleteMemory(mem.id)} className="text-zinc-600 hover:text-red-400">×</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add memory form */}
                  <form onSubmit={handleAddMemory} className="max-w-[720px] mx-auto relative rounded-2xl border border-white/[0.08] bg-[#050914]/85 p-3.5">
                    <textarea
                      value={newMemoryText}
                      onChange={(e) => setNewMemoryText(e.target.value)}
                      required
                      placeholder="Insert preference for agent memory node..."
                      className="w-full min-h-[50px] bg-transparent border-none outline-none resize-none px-3 text-xs text-white placeholder-zinc-500 font-sans"
                    />
                    <div className="flex justify-end border-t border-white/5 pt-2">
                      <button type="submit" className="h-7 w-7 flex items-center justify-center rounded-full bg-violet-600 text-white">
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </form>

                </div>
              )}

              {/* Connectors View */}
              {activeSettingsTab === "connectors" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div className="flex flex-col">
                      <h2 className="text-base font-bold text-white">Integrations</h2>
                      <p className="text-xs text-zinc-500">Connect output channels directly to publish final renders.</p>
                    </div>

                    <button
                      onClick={() => setIsCustomMcpModalOpen(true)}
                      className="px-3 py-1.5 border border-white/5 bg-white/[0.02] text-xs font-bold text-zinc-300 rounded-lg hover:bg-white/[0.05] transition"
                    >
                      + Custom MCP
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {connectorsList.map((conn) => (
                      <div
                        key={conn.id}
                        className={`p-4 rounded-xl border flex items-start justify-between gap-4 transition ${
                          conn.isConnected ? "border-emerald-500/20 bg-emerald-950/[0.03]" : "border-white/5 bg-white/[0.01]"
                        }`}
                      >
                        <div className="flex gap-3 min-w-0">
                          <div className="h-9 w-9 flex items-center justify-center rounded-lg bg-white/[0.02] border border-white/5 text-lg shrink-0">
                            {getConnectorIcon(conn.id, conn.icon)}
                          </div>
                          <div className="flex flex-col text-left min-w-0">
                            <span className="text-xs font-bold text-white truncate">{conn.title}</span>
                            <span className="text-[10px] text-zinc-400 leading-normal line-clamp-2">{conn.desc}</span>
                            {conn.isConnected && (
                              <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1 mt-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Connected
                              </span>
                            )}
                          </div>
                        </div>

                        {conn.isConnected ? (
                          <button
                            onClick={() => handleDisconnectConnector(conn.id)}
                            className="text-[10px] text-red-400 hover:text-red-300 font-bold shrink-0"
                          >
                            Disconnect
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setActiveConnector(conn);
                              setConnectorStep(1);
                              handleOpenOAuthPopup();
                            }}
                            className="h-6 w-6 flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-400"
                          >
                            +
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

      </main>

      {/* Settings Modal (Create Skill) */}
      {isSkillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="relative w-full max-w-[420px] rounded-2xl border border-white/10 bg-[#050914] p-5 shadow-2xl space-y-4">
            <button onClick={() => setIsSkillModalOpen(false)} className="absolute right-4 top-4 text-zinc-500 hover:text-white">
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
                  {["Content Creation", "Creative & Marketing", "Frontend Engineer", "Writing", "Marketing & Sales", "Personal & Specialized", "Productivity"].map(c => (
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

      {/* Settings Modal (Connector Oauth Simulator) */}
      {activeConnector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="relative w-full max-w-[420px] rounded-2xl border border-white/10 bg-[#050914] p-6 shadow-2xl text-center space-y-6">
            <button onClick={() => { setActiveConnector(null); setConnectorToken(""); }} className="absolute right-4 top-4 text-zinc-500 hover:text-white">
              <X className="h-4 w-4" />
            </button>

            {connectorStep === 1 ? (
              <div className="flex flex-col items-center justify-center space-y-6 py-4">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{activeConnector.title}</span>
                
                <div className="flex items-center justify-center gap-8">
                  <div className="relative h-14 w-14 rounded-2xl border border-violet-500/20 bg-slate-950/40 p-2.5 flex items-center justify-center shadow-[0_0_24px_rgba(139,92,246,0.2)]">
                    <Image src="/logo-saad-transparent.png?v=3" alt="Saad Studio Logo" width={40} height={40} className="object-contain" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-violet-400 animate-ping" />
                    <span className="h-1 w-12 border-t-2 border-dashed border-white/20 animate-pulse" />
                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                  </div>
                  <div className="h-14 w-14 rounded-2xl border border-white/10 bg-white/[0.02] text-3xl flex items-center justify-center shadow-lg">
                    {getConnectorIcon(activeConnector.id, activeConnector.icon, "h-8 w-8 shrink-0")}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-white">Finish connecting {activeConnector.title} in the new window</h3>
                  <button onClick={handleOpenOAuthPopup} className="text-xs text-zinc-500 hover:text-white underline block mx-auto transition">
                    Don't see the window? Reopen it
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5 text-center py-2">
                <div className="mx-auto h-20 w-20 rounded-full border border-violet-500/30 bg-slate-900/60 p-3 flex items-center justify-center shadow-[0_0_24px_rgba(139,92,246,0.15)] relative">
                  <div className="absolute inset-0 rounded-full border border-dashed border-violet-400/40 animate-spin" />
                  {getConnectorIcon(activeConnector.id, activeConnector.icon, "h-10 w-10 shrink-0")}
                </div>

                <div>
                  <h3 className="text-base font-bold text-white">{activeConnector.title}</h3>
                  <p className="text-xs text-zinc-500 max-w-[320px] mx-auto mt-1 leading-normal">
                    Publish text, image, multi-image, and video posts to the connected {activeConnector.title} profile.
                  </p>
                </div>

                <div className="text-left space-y-2 bg-[#090f1d]/50 p-4 rounded-xl border border-white/5">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block font-mono">Scope Features</span>
                  <ul className="space-y-1.5">
                    {(activeConnector.features || []).map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                        <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 font-bold bg-emerald-950/10 border border-emerald-500/20 p-2.5 rounded-lg animate-pulse">
                  <span>👤 Profile:</span>
                  <span className="underline">{connectorToken}</span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button onClick={() => { setActiveConnector(null); setConnectorToken(""); }} className="px-4 py-2 border border-white/5 bg-white/[0.02] text-xs font-bold text-zinc-400 rounded-xl">
                    Cancel
                  </button>
                  <button onClick={handleSaveConnector} disabled={connectorSaving} className="px-5 py-2.5 rounded-xl bg-violet-600 text-white font-bold text-xs shadow-md">
                    {connectorSaving ? "Saving..." : "Save Connection"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Modal (Custom MCP Setup) */}
      {isCustomMcpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="relative w-full max-w-[440px] rounded-2xl border border-white/10 bg-[#050914] p-5 shadow-2xl space-y-4 text-left">
            <button type="button" onClick={() => setIsCustomMcpModalOpen(false)} className="absolute right-4 top-4 text-zinc-500 hover:text-white">
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
                <button type="button" onClick={() => setIsCustomMcpModalOpen(false)} className="px-4 py-2 border border-white/5 bg-white/[0.02] text-xs font-bold text-zinc-400 rounded-xl">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-violet-600 text-white font-bold text-xs shadow-md">
                  Install Connector
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FLOATING GUIDED TOUR TOOLTIPS OVERLAY */}
      {showTour && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] pointer-events-auto" />
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[440px] rounded-2xl border border-cyan-500/30 bg-[#050914]/95 p-5 shadow-[0_0_30px_rgba(6,182,212,0.15)] pointer-events-auto space-y-4">
            
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <div className="flex items-center gap-1.5 text-cyan-400">
                <Sparkles className="h-4 w-4 animate-spin" />
                <span className="text-xs font-bold uppercase tracking-wider font-mono">Workspace Guided Tour ({tourStep + 1}/6)</span>
              </div>
              <button 
                type="button"
                onClick={() => setShowTour(false)} 
                className="text-zinc-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {tourStep === 0 && (
              <div className="space-y-2.5 text-left">
                <div className="p-2 border border-violet-500/20 bg-violet-600/10 rounded-lg text-xs font-bold text-violet-300">
                  🎯 Step 1: Select Your Creative Mission
                </div>
                <p className="text-[11.5px] text-zinc-300 leading-relaxed">
                  Start your creative work by selecting a <strong>Mission Preset</strong> from the grid (e.g. *Create Advertisement*, *Produce Podcast*, *Build Storyboard*). 
                </p>
                <p className="text-[10.5px] text-zinc-500 leading-normal">
                  Each mission maps directly onto specialized system prompts and schedules the target model pipeline.
                </p>
              </div>
            )}

            {tourStep === 1 && (
              <div className="space-y-2.5 text-left">
                <div className="p-2 border border-violet-500/20 bg-violet-600/10 rounded-lg text-xs font-bold text-violet-300">
                  📝 Step 2: Describe the Objective & Attach Assets
                </div>
                <p className="text-[11.5px] text-zinc-300 leading-relaxed">
                  Enter your exact creative requirements inside the <strong>Objective Textarea</strong>. Describe elements like scene lighting, style guidelines, and output dimensions.
                </p>
                <p className="text-[10.5px] text-zinc-500 leading-normal">
                  You can also drag & drop or upload visual reference images as style anchors to guide the AI generation.
                </p>
              </div>
            )}

            {tourStep === 2 && (
              <div className="space-y-2.5 text-left">
                <div className="p-2 border border-violet-500/20 bg-violet-600/10 rounded-lg text-xs font-bold text-violet-300">
                  ⚙️ Step 3: Settings & Advanced System Config
                </div>
                <p className="text-[11.5px] text-zinc-300 leading-relaxed">
                  To prevent cluttered chat sidebars, we moved all configuration panels under <strong>System Config</strong>.
                </p>
                <p className="text-[10.5px] text-zinc-500 leading-normal">
                  Here you can view the active **Skills Registry** (e.g., /static-ads), manage **Memory Nodes** (aspect ratios, styles), and connect external **Publishing channels** (YouTube, Notion, Linear).
                </p>
              </div>
            )}

            {tourStep === 3 && (
              <div className="space-y-2.5 text-left">
                <div className="p-2 border border-violet-500/20 bg-violet-600/10 rounded-lg text-xs font-bold text-violet-300">
                  🤖 Step 4: Smart AI Routing & Credits Estimation
                </div>
                <p className="text-[11.5px] text-zinc-300 leading-relaxed">
                  Once you trigger the planning stage, the AI analyzes your request and calculates optimal parameters:
                </p>
                <ul className="space-y-1 text-[10.5px] text-zinc-400 pl-3 list-disc">
                  <li>Best provider (Kling, BytePlus, Flux)</li>
                  <li>Suggested model and default aspect ratio</li>
                  <li>Estimated credits calculation</li>
                </ul>
              </div>
            )}

            {tourStep === 4 && (
              <div className="space-y-2.5 text-left">
                <div className="p-2 border border-violet-500/20 bg-violet-600/10 rounded-lg text-xs font-bold text-violet-300">
                  📐 Step 5: Visual Workflow Pipeline Editor
                </div>
                <p className="text-[11.5px] text-zinc-300 leading-relaxed">
                  The visual workflow displays the exact sequence (e.g. Concept brief &rarr; Storyboard sketch &rarr; Rendering latents).
                </p>
                <p className="text-[10.5px] text-zinc-500 leading-normal">
                  You can drag, reorder, rename, or add custom steps before executing the plan, keeping you in full artistic control.
                </p>
              </div>
            )}

            {tourStep === 5 && (
              <div className="space-y-2.5 text-left">
                <div className="p-2 border border-violet-500/20 bg-violet-600/10 rounded-lg text-xs font-bold text-violet-300">
                  🎬 Step 6: Live Workspace & Timeline Tracks
                </div>
                <p className="text-[11.5px] text-zinc-300 leading-relaxed">
                  Everything happens inside a single unified dashboard: edit the script brief, review storyboard frames, and play output clips over a simulated timeline.
                </p>
                <p className="text-[10.5px] text-zinc-500 leading-normal">
                  Real-time provider polling and compilation statuses stream directly into the terminal console at the bottom left!
                </p>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-white/5 pt-3">
              <button
                type="button"
                onClick={() => setTourStep(prev => Math.max(0, prev - 1))}
                disabled={tourStep === 0}
                className="px-3 py-1 rounded-lg border border-white/5 bg-white/[0.02] text-zinc-400 hover:text-white text-xs disabled:opacity-30 transition"
              >
                Prev
              </button>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowTour(false)}
                  className="px-3 py-1 rounded-lg text-zinc-500 hover:text-white text-xs transition"
                >
                  Exit Tour
                </button>
                {tourStep < 5 ? (
                  <button
                    type="button"
                    onClick={() => setTourStep(prev => prev + 1)}
                    className="px-4 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition"
                  >
                    Next Step
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowTour(false)}
                    className="px-4 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
                  >
                    Finish Guide
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
