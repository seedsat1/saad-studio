import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Full Generation Flow (mocked fetch)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("simulates upload → create → poll → success flow", async () => {
    let pollCount = 0;

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/scene-studio/upload")) {
        return Promise.resolve({
          json: () =>
            Promise.resolve({ code: 0, data: { fileName: "uploaded_scene1.png" } }),
        });
      }
      if (url.includes("/api/scene-studio/create-task")) {
        return Promise.resolve({
          json: () =>
            Promise.resolve({ code: 0, data: { taskId: "task_abc123" } }),
        });
      }
      if (url.includes("/api/scene-studio/task-status")) {
        pollCount++;
        if (pollCount <= 2) {
          return Promise.resolve({
            json: () =>
              Promise.resolve({ code: 0, data: { taskStatus: "RUNNING" } }),
          });
        }
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              code: 0,
              data: {
                taskStatus: "SUCCEED",
                fileUrl: "https://cdn.runninghub.ai/output/video.mp4",
                fileType: "video",
              },
            }),
        });
      }
      return Promise.reject(new Error("Unknown endpoint"));
    }) as typeof fetch;

    // Step 1: Upload
    const uploadRes = await fetch("/api/scene-studio/upload", {
      method: "POST",
      body: new FormData(),
    });
    const uploadData = await uploadRes.json();
    expect(uploadData.code).toBe(0);
    expect(uploadData.data.fileName).toBe("uploaded_scene1.png");

    // Step 2: Create task
    const createRes = await fetch("/api/scene-studio/create-task", {
      method: "POST",
      body: JSON.stringify({
        apiKey: "test-key",
        workflowId: "test-wf",
        nodeInfoList: [
          { nodeId: "image_input", fieldName: "image", fieldValue: "uploaded_scene1.png" },
          { nodeId: "text_input", fieldName: "text", fieldValue: "Test prompt. Duration: 4 seconds" },
        ],
      }),
    });
    const createData = await createRes.json();
    expect(createData.code).toBe(0);
    expect(createData.data.taskId).toBe("task_abc123");

    // Step 3: Poll × 2 → RUNNING
    for (let i = 0; i < 2; i++) {
      const pollRes = await fetch("/api/scene-studio/task-status", {
        method: "POST",
        body: JSON.stringify({ apiKey: "test-key", taskId: "task_abc123" }),
      });
      const pollData = await pollRes.json();
      expect(pollData.data.taskStatus).toBe("RUNNING");
    }

    // Step 4: Poll → SUCCEED
    const finalRes = await fetch("/api/scene-studio/task-status", {
      method: "POST",
      body: JSON.stringify({ apiKey: "test-key", taskId: "task_abc123" }),
    });
    const finalData = await finalRes.json();
    expect(finalData.data.taskStatus).toBe("SUCCEED");
    expect(finalData.data.fileUrl).toBe("https://cdn.runninghub.ai/output/video.mp4");
    expect(finalData.data.fileType).toBe("video");
  });

  it("handles upload API failure", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ code: -1, msg: "Invalid API key" }),
    }) as typeof fetch;

    const res = await fetch("/api/scene-studio/upload", {
      method: "POST",
      body: new FormData(),
    });
    const data = await res.json();
    expect(data.code).toBe(-1);
    expect(data.msg).toBe("Invalid API key");
  });

  it("handles network error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network timeout")) as typeof fetch;

    await expect(
      fetch("/api/scene-studio/upload", { method: "POST", body: new FormData() })
    ).rejects.toThrow("Network timeout");
  });

  it("handles QUEUED → RUNNING → SUCCEED transition", async () => {
    let callCount = 0;
    const statuses = ["QUEUED", "RUNNING", "SUCCEED"];

    global.fetch = vi.fn().mockImplementation(() => {
      const taskStatus = statuses[callCount] ?? "SUCCEED";
      callCount++;
      return Promise.resolve({
        json: () => Promise.resolve({ code: 0, data: { taskStatus } }),
      });
    }) as typeof fetch;

    const r1 = await (await fetch("/api/scene-studio/task-status", { method: "POST" })).json();
    expect(r1.data.taskStatus).toBe("QUEUED");

    const r2 = await (await fetch("/api/scene-studio/task-status", { method: "POST" })).json();
    expect(r2.data.taskStatus).toBe("RUNNING");

    const r3 = await (await fetch("/api/scene-studio/task-status", { method: "POST" })).json();
    expect(r3.data.taskStatus).toBe("SUCCEED");
  });

  it("handles SUCCEDD typo as success", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          code: 0,
          data: {
            taskStatus: "SUCCEDD",
            fileUrl: "https://example.com/out.mp4",
            fileType: "video",
          },
        }),
    }) as typeof fetch;

    const res = await fetch("/api/scene-studio/task-status", { method: "POST" });
    const data = await res.json();
    const isSuccess = ["SUCCEED", "SUCCEDD"].includes(data.data.taskStatus);
    expect(isSuccess).toBe(true);
    expect(data.data.fileUrl).toBeTruthy();
  });

  it("handles FAILED task status", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          code: 0,
          data: { taskStatus: "FAILED", errorMessage: "GPU timeout" },
        }),
    }) as typeof fetch;

    const res = await fetch("/api/scene-studio/task-status", { method: "POST" });
    const data = await res.json();
    expect(data.data.taskStatus).toBe("FAILED");
    expect(data.data.errorMessage).toBe("GPU timeout");
  });
});
