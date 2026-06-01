import { evalES } from "../cep";
import { getHostCapabilities } from "./capabilities";
import type {
  AddToTimelineInput,
  AutoReframeInput,
  CreateCutsInput,
  CreateSequenceInput,
  DuplicateSequenceInput,
  HostAdapter,
  HostContext,
  HostOperationResult,
  HostSelection,
  HostSelectionKind,
  PlaceCaptionInput,
  PlaceMediaInput,
  ReplaceClipInput,
} from "./types";

function unsupported(message: string): Promise<HostOperationResult> {
  return Promise.resolve({ ok: false, reason: message });
}

export class AfterEffectsAdapter implements HostAdapter {
  readonly host = "aftereffects" as const;
  readonly capabilities = getHostCapabilities("aftereffects");

  getContext(): Promise<HostContext | null> {
    return evalES<HostContext | null>("getActiveSequenceContext");
  }

  getSelection(kind: HostSelectionKind = "any"): Promise<HostSelection | null> {
    if (kind === "audio") return evalES<HostSelection | null>("getSelectedAudio");
    return evalES<HostSelection | null>("getSelectedClip");
  }

  importAsset(path: string): Promise<HostOperationResult> {
    return evalES<HostOperationResult>("importAssetToProject", path);
  }

  importSrt(path: string): Promise<HostOperationResult> {
    return evalES<HostOperationResult>("importSrtToProject", path);
  }

  placeCaption(_input: PlaceCaptionInput): Promise<HostOperationResult> {
    return unsupported("After Effects does not expose caption tracks through the current HostAdapter.");
  }

  placeMedia(input: PlaceMediaInput): Promise<HostOperationResult> {
    return evalES<HostOperationResult>("placeMediaOnTimeline", input.assetPath, {
      afterSelected: input.afterSelected ?? true,
    });
  }

  createSequence(_input: CreateSequenceInput): Promise<HostOperationResult> {
    return unsupported("AfterEffectsAdapter.createSequence is reserved in phase 1 and not wired yet.");
  }

  duplicateSequence(_input?: DuplicateSequenceInput): Promise<HostOperationResult> {
    return unsupported("AfterEffectsAdapter.duplicateSequence is reserved in phase 1 and not wired yet.");
  }

  autoReframe(_input?: AutoReframeInput): Promise<HostOperationResult> {
    return unsupported("AfterEffectsAdapter.autoReframe is reserved in phase 1 and not wired yet.");
  }

  createCuts(_input: CreateCutsInput): Promise<HostOperationResult> {
    return unsupported("AfterEffectsAdapter.createCuts is reserved in phase 1 and not wired yet.");
  }

  replaceClip(_input: ReplaceClipInput): Promise<HostOperationResult> {
    return unsupported("AfterEffectsAdapter.replaceClip is reserved in phase 1 and not wired yet.");
  }

  addToTimeline(_input: AddToTimelineInput): Promise<HostOperationResult> {
    return unsupported("After Effects timeline placement will be handled per-comp, not via Premiere-style addToTimeline.");
  }
}
