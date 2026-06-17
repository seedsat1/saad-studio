import { evalES } from "../../cep";
import type {
  PodcastSynchronizationSnapshot,
  PodcastTimelineClipInfo,
} from "../types/premiere";

export interface SynchronizationTrackReadiness {
  kind: "video" | "audio";
  trackIndex: number;
  label: string;
  clipCount: number;
  firstStartSec: number | null;
  mediaAvailableCount: number;
}

export interface SynchronizationPlan {
  ok: boolean;
  sequenceId?: string | null;
  sequenceName?: string | null;
  sequenceDurationSec?: number | null;
  referenceAudioTrackIndex: number | null;
  videoTrackCount: number;
  audioTrackCount: number;
  videoClipCount: number;
  audioClipCount: number;
  alignedStartTracks: number;
  offsetCandidateTracks: number;
  trackReadiness: SynchronizationTrackReadiness[];
  blockers: string[];
  warnings: string[];
  messages: string[];
  timelineMutation: "none";
  sequenceMutation: "none";
}

export async function analyzeSynchronizationPlan(): Promise<SynchronizationPlan> {
  const snapshot = await evalES<PodcastSynchronizationSnapshot>("getPodcastSynchronizationSnapshot");
  return buildSynchronizationPlan(snapshot);
}

export function buildSynchronizationPlan(snapshot: PodcastSynchronizationSnapshot): SynchronizationPlan {
  const blockers = [...(snapshot.blockers ?? [])];
  const warnings: string[] = [];

  if (snapshot.status !== "ready") {
    blockers.push("ACTIVE_SEQUENCE_REQUIRED");
  }

  const audioWithMedia = snapshot.audioClips.filter((clip) => clip.mediaAvailable);
  const videoWithMedia = snapshot.videoClips.filter((clip) => clip.mediaAvailable);
  if (audioWithMedia.length === 0) blockers.push("NO_AUDIO_CLIPS_FOR_SYNC");
  if (videoWithMedia.length === 0) blockers.push("NO_VIDEO_CLIPS_FOR_SYNC");

  const referenceAudioTrackIndex = firstTrackWithMedia(audioWithMedia);
  const referenceStart = referenceAudioTrackIndex === null
    ? null
    : firstClipStartForTrack(audioWithMedia, referenceAudioTrackIndex);

  const trackReadiness = [
    ...trackReadinessFor("video", snapshot.videoTrackCount, snapshot.videoClips),
    ...trackReadinessFor("audio", snapshot.audioTrackCount, snapshot.audioClips),
  ];

  let alignedStartTracks = 0;
  let offsetCandidateTracks = 0;
  if (referenceStart !== null) {
    for (const track of trackReadiness) {
      if (track.firstStartSec === null || track.clipCount === 0) continue;
      const delta = Math.abs(track.firstStartSec - referenceStart);
      if (delta <= 0.02) alignedStartTracks++;
      else offsetCandidateTracks++;
    }
  }

  if (offsetCandidateTracks > 0) {
    warnings.push("OFFSET_CANDIDATES_REQUIRE_WAVEFORM_PROOF");
  }
  if (snapshot.audioClips.length === 0 || snapshot.videoClips.length === 0) {
    warnings.push("TIMELINE_HAS_EMPTY_SYNC_SIDE");
  }

  return {
    ok: blockers.length === 0,
    sequenceId: snapshot.sequenceId ?? null,
    sequenceName: snapshot.sequenceName ?? null,
    sequenceDurationSec: snapshot.sequenceDurationSec ?? null,
    referenceAudioTrackIndex,
    videoTrackCount: snapshot.videoTrackCount,
    audioTrackCount: snapshot.audioTrackCount,
    videoClipCount: snapshot.videoClips.length,
    audioClipCount: snapshot.audioClips.length,
    alignedStartTracks,
    offsetCandidateTracks,
    trackReadiness,
    blockers,
    warnings,
    messages: snapshot.messages ?? [],
    timelineMutation: "none",
    sequenceMutation: "none",
  };
}

function firstTrackWithMedia(clips: PodcastTimelineClipInfo[]): number | null {
  const sorted = [...clips].sort((a, b) => a.trackIndex - b.trackIndex || a.clipIndex - b.clipIndex);
  return sorted[0]?.trackIndex ?? null;
}

function firstClipStartForTrack(clips: PodcastTimelineClipInfo[], trackIndex: number): number | null {
  const sorted = clips
    .filter((clip) => clip.trackIndex === trackIndex && typeof clip.timelineStartSec === "number")
    .sort((a, b) => (a.timelineStartSec ?? 0) - (b.timelineStartSec ?? 0));
  return sorted[0]?.timelineStartSec ?? null;
}

function trackReadinessFor(
  kind: "video" | "audio",
  count: number,
  clips: PodcastTimelineClipInfo[],
): SynchronizationTrackReadiness[] {
  return Array.from({ length: Math.max(0, count) }, (_, index) => {
    const trackClips = clips.filter((clip) => clip.trackIndex === index);
    const first = [...trackClips]
      .filter((clip) => typeof clip.timelineStartSec === "number")
      .sort((a, b) => (a.timelineStartSec ?? 0) - (b.timelineStartSec ?? 0))[0];
    return {
      kind,
      trackIndex: index,
      label: `${kind === "video" ? "V" : "A"}${index + 1}`,
      clipCount: trackClips.length,
      firstStartSec: first?.timelineStartSec ?? null,
      mediaAvailableCount: trackClips.filter((clip) => clip.mediaAvailable).length,
    };
  });
}
