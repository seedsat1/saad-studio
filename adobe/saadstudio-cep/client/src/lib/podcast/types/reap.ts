import type { SpeakerSegment } from "./index";

export interface ProviderCapabilityResult {
  supported: boolean;
  diagnostic: string;
}

export interface SpeakerDetectionInput {
  projectId?: string;
  generationId?: string;
  sourceUrl?: string;
  uploadId?: string;
  rawProject?: unknown;
}

export interface SpeakerDetectionResult {
  supported: boolean;
  segments: SpeakerSegment[];
  raw?: unknown;
  diagnostic: string;
}

export interface ReapSpeakerProviderContract {
  getStatus(): Promise<ProviderCapabilityResult>;
  supportsSpeakerSegments(): Promise<ProviderCapabilityResult>;
  extractSpeakerSegments(input: SpeakerDetectionInput): Promise<SpeakerDetectionResult>;
}
