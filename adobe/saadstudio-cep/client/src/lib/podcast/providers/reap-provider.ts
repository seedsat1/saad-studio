import type {
  ProviderCapabilityResult,
  ReapSpeakerProviderContract,
  SpeakerDetectionInput,
  SpeakerDetectionResult,
} from "../types/reap";

const SPEAKER_SEGMENT_DIAGNOSTIC =
  "Reap Automation API does not currently expose a documented speaker diarization contract in the existing integration.";

export class ReapPodcastProvider implements ReapSpeakerProviderContract {
  getStatus(): Promise<ProviderCapabilityResult> {
    return Promise.resolve({
      supported: false,
      diagnostic: SPEAKER_SEGMENT_DIAGNOSTIC,
    });
  }

  supportsSpeakerSegments(): Promise<ProviderCapabilityResult> {
    return Promise.resolve({
      supported: false,
      diagnostic: SPEAKER_SEGMENT_DIAGNOSTIC,
    });
  }

  extractSpeakerSegments(_input: SpeakerDetectionInput): Promise<SpeakerDetectionResult> {
    return Promise.resolve({
      supported: false,
      segments: [],
      diagnostic: SPEAKER_SEGMENT_DIAGNOSTIC,
    });
  }
}

export const reapPodcastProvider = new ReapPodcastProvider();
