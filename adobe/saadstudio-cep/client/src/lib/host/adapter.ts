import { getHostApp, isInsideAdobe } from "../cep";
import { getHostCapabilities } from "./capabilities";
import { AfterEffectsAdapter } from "./after-effects";
import { PremiereAdapter } from "./premiere";
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

class BrowserHostAdapter implements HostAdapter {
  readonly host = "browser" as const;
  readonly capabilities = getHostCapabilities("browser");

  private unsupported(reason: string): Promise<HostOperationResult> {
    return Promise.resolve({ ok: false, reason });
  }

  getContext(): Promise<HostContext | null> {
    return Promise.resolve(null);
  }

  getSelection(_kind?: HostSelectionKind): Promise<HostSelection | null> {
    return Promise.resolve(null);
  }

  importAsset(_path: string): Promise<HostOperationResult> {
    return this.unsupported("HostAdapter is running outside Adobe.");
  }

  importSrt(_path: string): Promise<HostOperationResult> {
    return this.unsupported("HostAdapter is running outside Adobe.");
  }

  placeCaption(_input: PlaceCaptionInput): Promise<HostOperationResult> {
    return this.unsupported("HostAdapter is running outside Adobe.");
  }

  placeMedia(_input: PlaceMediaInput): Promise<HostOperationResult> {
    return this.unsupported("HostAdapter is running outside Adobe.");
  }

  createSequence(_input: CreateSequenceInput): Promise<HostOperationResult> {
    return this.unsupported("HostAdapter is running outside Adobe.");
  }

  duplicateSequence(_input?: DuplicateSequenceInput): Promise<HostOperationResult> {
    return this.unsupported("HostAdapter is running outside Adobe.");
  }

  autoReframe(_input?: AutoReframeInput): Promise<HostOperationResult> {
    return this.unsupported("HostAdapter is running outside Adobe.");
  }

  createCuts(_input: CreateCutsInput): Promise<HostOperationResult> {
    return this.unsupported("HostAdapter is running outside Adobe.");
  }

  replaceClip(_input: ReplaceClipInput): Promise<HostOperationResult> {
    return this.unsupported("HostAdapter is running outside Adobe.");
  }

  addToTimeline(_input: AddToTimelineInput): Promise<HostOperationResult> {
    return this.unsupported("HostAdapter is running outside Adobe.");
  }
}

const browserAdapter = new BrowserHostAdapter();
const premiereAdapter = new PremiereAdapter();
const afterEffectsAdapter = new AfterEffectsAdapter();

export function getHostAdapter(): HostAdapter {
  if (!isInsideAdobe()) return browserAdapter;
  const host = getHostApp();
  if (host === "AEFT") return afterEffectsAdapter;
  if (host === "PPRO") return premiereAdapter;
  return browserAdapter;
}
