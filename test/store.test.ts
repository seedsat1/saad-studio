import { describe, it, expect, beforeEach } from "vitest";
import { useStudioStore } from "../hooks/use-studio-store";

describe("Studio Store", () => {
  beforeEach(() => {
    useStudioStore.setState({
      scenes: [
        {
          id: "1",
          image: null,
          imageFile: null,
          prompt: "",
          cameraMove: "static",
          duration: 4,
          status: "idle",
          taskId: null,
          outputUrl: null,
          outputType: null,
          error: null,
          fileName: null,
        },
      ],
      activeIdx: 0,
      apiKey: "",
      workflowId: "",
      logs: [],
      generating: false,
    });
  });

  it("initializes with correct defaults", () => {
    const state = useStudioStore.getState();
    expect(state.scenes).toHaveLength(1);
    expect(state.activeIdx).toBe(0);
    expect(state.apiKey).toBe("");
    expect(state.generating).toBe(false);
  });

  it("adds a new scene", () => {
    useStudioStore.getState().addScene();
    const state = useStudioStore.getState();
    expect(state.scenes).toHaveLength(2);
    expect(state.scenes[1]!.status).toBe("idle");
    expect(state.scenes[1]!.cameraMove).toBe("static");
    expect(state.scenes[1]!.duration).toBe(4);
  });

  it("removes a scene", () => {
    const { addScene, removeScene } = useStudioStore.getState();
    addScene();
    addScene();
    expect(useStudioStore.getState().scenes).toHaveLength(3);
    removeScene(1);
    expect(useStudioStore.getState().scenes).toHaveLength(2);
  });

  it("does not remove the last scene", () => {
    useStudioStore.getState().removeScene(0);
    expect(useStudioStore.getState().scenes).toHaveLength(1);
  });

  it("duplicates a scene correctly", () => {
    const { updateScene, duplicateScene } = useStudioStore.getState();
    updateScene(0, { prompt: "test prompt", cameraMove: "orbit", duration: 7 });
    duplicateScene(0);
    const state = useStudioStore.getState();
    expect(state.scenes).toHaveLength(2);
    expect(state.scenes[1]!.prompt).toBe("test prompt");
    expect(state.scenes[1]!.cameraMove).toBe("orbit");
    expect(state.scenes[1]!.duration).toBe(7);
    expect(state.scenes[1]!.status).toBe("idle");
    expect(state.scenes[1]!.taskId).toBeNull();
  });

  it("updates a scene partially", () => {
    useStudioStore.getState().updateScene(0, { prompt: "hello", cameraMove: "pan_left" });
    const scene = useStudioStore.getState().scenes[0]!;
    expect(scene.prompt).toBe("hello");
    expect(scene.cameraMove).toBe("pan_left");
    expect(scene.duration).toBe(4); // unchanged
  });

  it("sets active index", () => {
    const { addScene, setActiveIdx } = useStudioStore.getState();
    addScene();
    addScene();
    setActiveIdx(2);
    expect(useStudioStore.getState().activeIdx).toBe(2);
  });

  it("adjusts activeIdx when removing active scene", () => {
    const { addScene, setActiveIdx, removeScene } = useStudioStore.getState();
    addScene();
    addScene();
    setActiveIdx(2);
    removeScene(2);
    expect(useStudioStore.getState().activeIdx).toBeLessThanOrEqual(1);
  });

  it("adds log entries", () => {
    const { addLog } = useStudioStore.getState();
    addLog("test message", "info");
    addLog("error message", "error");
    const logs = useStudioStore.getState().logs;
    expect(logs).toHaveLength(2);
    expect(logs[0]!.msg).toBe("test message");
    expect(logs[0]!.type).toBe("info");
    expect(logs[1]!.type).toBe("error");
  });

  it("stores apiKey and workflowId", () => {
    const { setApiKey, setWorkflowId } = useStudioStore.getState();
    setApiKey("my-key-123");
    setWorkflowId("wf-456");
    const state = useStudioStore.getState();
    expect(state.apiKey).toBe("my-key-123");
    expect(state.workflowId).toBe("wf-456");
  });

  it("calculates total duration correctly", () => {
    const { addScene, updateScene } = useStudioStore.getState();
    updateScene(0, { duration: 5 });
    addScene();
    updateScene(1, { duration: 8 });
    const scenes = useStudioStore.getState().scenes;
    const total = scenes.reduce((sum, s) => sum + s.duration, 0);
    expect(total).toBe(13);
  });

  it("activeIdx updates to last scene after adding", () => {
    useStudioStore.getState().addScene();
    useStudioStore.getState().addScene();
    expect(useStudioStore.getState().activeIdx).toBe(2);
  });

  it("duplicate scene gets a unique id", () => {
    useStudioStore.getState().duplicateScene(0);
    const scenes = useStudioStore.getState().scenes;
    expect(scenes[0]!.id).not.toBe(scenes[1]!.id);
  });

  it("duplicate scene resets output fields", () => {
    useStudioStore.getState().updateScene(0, {
      status: "success",
      outputUrl: "https://example.com/video.mp4",
      outputType: "video",
      taskId: "abc",
      fileName: "uploaded.png",
    });
    useStudioStore.getState().duplicateScene(0);
    const dup = useStudioStore.getState().scenes[1]!;
    expect(dup.status).toBe("idle");
    expect(dup.outputUrl).toBeNull();
    expect(dup.taskId).toBeNull();
    expect(dup.fileName).toBeNull();
  });
});
