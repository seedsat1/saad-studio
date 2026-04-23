// ============================================================
// Hollywood AI Studio — Complete Type Definitions
// ============================================================

// ── Scene ──
export type SceneStatus = 'draft' | 'generating' | 'ready' | 'error' | 'locked';

export interface Scene {
  id: string;
  order: number;
  title: string;
  script: string;
  duration: number;
  status: SceneStatus;
  locked: boolean;
  tags: string[];
  characterIds: string[];
  storyboardFrames: StoryboardFrame[];
  version: number;
  versions: SceneVersion[];
}

export interface SceneVersion {
  version: number;
  script: string;
  storyboardFrames: StoryboardFrame[];
  createdAt: Date;
}

// ── Storyboard ──
export interface StoryboardFrame {
  id: string;
  sceneId: string;
  order: number;
  prompt: string;
  cameraAngle: string;
  notes: string;
  shotType: string;
  lens: string;
  lighting: string;
  transition: string;
  imageUrl?: string;
}

// ── Character ──
export type CharacterMood = 'neutral' | 'happy' | 'serious' | 'angry' | 'sad' | 'excited' | 'mysterious' | 'tense';

export interface Character {
  id: string;
  name: string;
  description: string;
  appearance: string;
  mood: CharacterMood;
  voiceProfileId?: string;
  avatarUrl?: string;
}

// ── Voice ──
export interface VoiceProfile {
  id: string;
  name: string;
  type: 'preset' | 'cloned';
  lang: string;
  model: string;
  sampleUrl?: string;
}

export interface VoiceConfig {
  voiceId: string;
  speed: number;
  pitch: number;
  model: string;
  cloneConsentGiven: boolean;
}

// ── Camera ──
export interface ShotType {
  id: string;
  name: string;
  desc: string;
  icon: string;
}

export interface LensPreset {
  id: string;
  name: string;
  fov: string;
  feel: string;
}

// ── Lighting ──
export interface LightingSetup {
  id: string;
  name: string;
  desc: string;
  mood: string;
  icon: string;
}

// ── Transitions ──
export interface TransitionType {
  id: string;
  name: string;
  desc: string;
  timing: string;
  icon: string;
}

// ── Motion ──
export interface MotionType {
  id: string;
  name: string;
  desc: string;
  icon: string;
}

// ── Presets ──
export type PresetId = 'cinematic' | 'news' | 'drama' | 'truecrime' | 'fantasy' | 'techpromo' | 'anime' | 'trailer';

export interface Preset {
  id: PresetId;
  name: string;
  icon: string;
  accent: string;
  visual: { ar: string; color: string; grain: number; bloom: number };
  camera: { default: string; lens: string; dof: string };
  lighting: { default: string; contrast: string };
  motion: { speed: number; drift: boolean; parallax: boolean };
  transition: { default: string; pace: string };
  audio: { music: string; sfx: boolean; ambience: string };
  voice: { model: string; style: string; speed: number };
  pacing: { beatsPerMin: number; holdTime: number; buildUp: boolean };
}

// ── Render ──
export type RenderStatus = 'queued' | 'processing' | 'encoding' | 'complete' | 'failed';

export interface RenderJob {
  id: string;
  status: RenderStatus;
  progress: number;
  resolution: string;
  format: string;
  estimatedTime?: number;
  outputUrl?: string;
  error?: string;
}

export interface RenderConfig {
  resolution: '720p' | '1080p' | '4k';
  format: 'mp4' | 'webm' | 'mov';
  videoModel: string;
  watermark: boolean;
}

// ── Job Console ──
export type JobType = 'image' | 'video' | 'audio' | 'transition' | 'render' | 'scene';
export type JobStatus = 'pending' | 'success' | 'error';

export interface JobLog {
  type: JobType;
  status: JobStatus;
  model: string;
  message: string;
  time: string;
}

// ── Toast ──
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

// ── UI State ──
export type InspectorTab =
  | 'script' | 'storyboard' | 'characters' | 'voice'
  | 'camera' | 'lighting' | 'motion' | 'transitions'
  | 'presets' | 'render';

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';
export type MobilePanel = 'timeline' | 'preview' | 'inspector' | null;

// ── Service Interfaces ──
// API_INTEGRATION_POINT: Implement these interfaces with real API calls

export interface IProjectService {
  getProject(id: string): Promise<any>;
  saveProject(project: any): Promise<any>;
}

export interface ISceneService {
  generateScene(script: string, preset: PresetId): Promise<Scene>;
  regenerateScene(sceneId: string): Promise<Scene>;
  updateScene(sceneId: string, data: Partial<Scene>): Promise<Scene>;
  deleteScene(sceneId: string): Promise<void>;
}

export interface IStoryboardService {
  generateFrames(sceneId: string, script: string, preset: PresetId): Promise<StoryboardFrame[]>;
  regenerateFrame(frameId: string): Promise<StoryboardFrame>;
}

export interface ICharacterService {
  createCharacter(data: Omit<Character, 'id'>): Promise<Character>;
  updateCharacter(id: string, data: Partial<Character>): Promise<Character>;
  deleteCharacter(id: string): Promise<void>;
  generateAvatar(description: string): Promise<string>;
}

export interface IVoiceService {
  listVoices(): Promise<VoiceProfile[]>;
  cloneVoice(audioBlob: Blob, name: string): Promise<VoiceProfile>;
  previewTTS(text: string, voiceId: string, model: string): Promise<string>;
}

export interface IVideoService {
  generateVideo(sceneId: string, model: string): Promise<string>;
  getVideoStatus(jobId: string): Promise<{ status: string; progress: number }>;
}

export interface IRenderService {
  startRender(config: RenderConfig): Promise<RenderJob>;
  getRenderStatus(jobId: string): Promise<RenderJob>;
  cancelRender(jobId: string): Promise<void>;
  downloadRender(jobId: string): Promise<string>;
}

export interface IAudioService {
  generateSFX(description: string): Promise<string>;
  generateMusic(mood: string, duration: number): Promise<string>;
  mixAudio(tracks: string[]): Promise<string>;
}
