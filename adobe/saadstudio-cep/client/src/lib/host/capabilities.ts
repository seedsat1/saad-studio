import type { HostCapabilityLayer, HostKind } from "./types";

const sharedCapabilities: HostCapabilityLayer = {
  readContext: true,
  readSelection: true,
  importAsset: true,
  importSrt: true,
  placeCaption: false,
  placeMedia: true,
  createSequence: false,
  duplicateSequence: false,
  autoReframe: false,
  createCuts: false,
  replaceClip: false,
  addToTimeline: true,
  createCaptionTrack: false,
};

export function getHostCapabilities(host: HostKind): HostCapabilityLayer {
  if (host === "premiere") {
    return {
      ...sharedCapabilities,
      placeCaption: true,
    };
  }

  if (host === "aftereffects") {
    return {
      ...sharedCapabilities,
      placeCaption: false,
      addToTimeline: false,
    };
  }

  return {
    readContext: false,
    readSelection: false,
    importAsset: false,
    importSrt: false,
    placeCaption: false,
    placeMedia: false,
    createSequence: false,
    duplicateSequence: false,
    autoReframe: false,
    createCuts: false,
    replaceClip: false,
    addToTimeline: false,
    createCaptionTrack: false,
  };
}
