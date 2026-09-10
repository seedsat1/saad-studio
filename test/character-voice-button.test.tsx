import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CharacterVoiceButton } from "@/components/voices/CharacterVoiceButton";

/**
 * A character stores a voiceId, but lipsync and dubbing have no character
 * concept, so the pairing had nowhere to land. This button is the bridge —
 * these tests hold it to the two properties that make it safe to mount
 * anywhere: it stays invisible until it has something to offer, and picking a
 * character hands back that character's voice id.
 */
const mockCharacters = (characters: unknown[]) => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ characters }),
  }) as unknown as typeof fetch;
};

describe("CharacterVoiceButton", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it("renders nothing when no character has a voice", async () => {
    mockCharacters([
      { id: "c1", name: "No voice yet", metadata: {} },
      { id: "c2", name: "Also none", metadata: { voiceId: "" } },
    ]);
    const { container } = render(<CharacterVoiceButton onPickVoice={() => {}} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the request fails, so an unauthenticated page stays clean", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("401")) as unknown as typeof fetch;
    const { container } = render(<CharacterVoiceButton onPickVoice={() => {}} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("lists only the characters that carry a voice", async () => {
    mockCharacters([
      { id: "c1", name: "Layla", metadata: { voiceId: "Sulafat" } },
      { id: "c2", name: "Unvoiced", metadata: {} },
    ]);
    render(<CharacterVoiceButton onPickVoice={() => {}} />);
    const trigger = await screen.findByRole("button", { name: /character's voice/i });
    await userEvent.click(trigger);
    expect(await screen.findByText("Layla")).toBeInTheDocument();
    expect(screen.queryByText("Unvoiced")).not.toBeInTheDocument();
  });

  it("hands the caller that character's voice id", async () => {
    mockCharacters([{ id: "c1", name: "Layla", metadata: { voiceId: "Sulafat" } }]);
    const onPickVoice = vi.fn();
    render(<CharacterVoiceButton onPickVoice={onPickVoice} />);
    await userEvent.click(await screen.findByRole("button", { name: /character's voice/i }));
    await userEvent.click(await screen.findByText("Layla"));
    expect(onPickVoice).toHaveBeenCalledWith("Sulafat", "Layla");
  });
});
