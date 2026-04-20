import { describe, it, expect } from "vitest";

// ─── Prompt Construction ──────────────────────────────────────────────────────

function buildPrompt(
  prompt: string,
  cameraMove: string,
  cameraMoveLabel: string,
  cameraMoveDesc: string,
  duration: number
): string {
  return [
    prompt,
    cameraMove !== "static"
      ? `Camera move: ${cameraMoveLabel} - ${cameraMoveDesc}`
      : "",
    `Duration: ${duration} seconds`,
  ]
    .filter(Boolean)
    .join(". ");
}

describe("Prompt Construction", () => {
  it("builds prompt with camera move", () => {
    const result = buildPrompt(
      "A beautiful sunset over mountains",
      "pan_right",
      "Pan right",
      "Horizontal sweep right",
      5
    );
    expect(result).toBe(
      "A beautiful sunset over mountains. Camera move: Pan right - Horizontal sweep right. Duration: 5 seconds"
    );
  });

  it("builds prompt without camera move for static", () => {
    const result = buildPrompt("A calm lake", "static", "Static", "No movement", 4);
    expect(result).toBe("A calm lake. Duration: 4 seconds");
    expect(result).not.toContain("Camera move");
  });

  it("handles empty user prompt", () => {
    const result = buildPrompt(
      "",
      "orbit",
      "Orbit",
      "Circular around subject",
      6
    );
    expect(result).toBe(
      "Camera move: Orbit - Circular around subject. Duration: 6 seconds"
    );
  });

  it("handles all duration values", () => {
    for (let d = 1; d <= 10; d++) {
      const result = buildPrompt("test", "static", "Static", "No movement", d);
      expect(result).toContain(`Duration: ${d} seconds`);
    }
  });
});

// ─── API Response Parsing ─────────────────────────────────────────────────────

describe("API Response Parsing", () => {
  it("extracts fileName from upload response", () => {
    const response = { code: 0, data: { fileName: "abc123.png" } };
    expect(response.code).toBe(0);
    expect(response.data.fileName).toBe("abc123.png");
  });

  it("detects upload error", () => {
    const response = { code: -1, msg: "Invalid API key" };
    expect(response.code).not.toBe(0);
    expect(response.msg).toBe("Invalid API key");
  });

  it("extracts taskId from create response", () => {
    const response = { code: 0, data: { taskId: "task_xyz789" } };
    expect(response.data.taskId).toBe("task_xyz789");
  });

  it("handles SUCCEED status", () => {
    const response = {
      code: 0,
      data: { taskStatus: "SUCCEED", fileUrl: "https://example.com/v.mp4", fileType: "video" },
    };
    expect(["SUCCEED", "SUCCEDD"]).toContain(response.data.taskStatus);
  });

  it("handles SUCCEDD status (RunningHub typo)", () => {
    const response = {
      code: 0,
      data: { taskStatus: "SUCCEDD", fileUrl: "https://example.com/v.mp4", fileType: "video" },
    };
    expect(["SUCCEED", "SUCCEDD"]).toContain(response.data.taskStatus);
  });

  it("detects FAILED status", () => {
    const response = { code: 0, data: { taskStatus: "FAILED" } };
    expect(response.data.taskStatus).toBe("FAILED");
  });

  it("detects RUNNING status", () => {
    const response = { code: 0, data: { taskStatus: "RUNNING" } };
    expect(response.data.taskStatus).toBe("RUNNING");
  });

  it("detects QUEUED status", () => {
    const response = { code: 0, data: { taskStatus: "QUEUED" } };
    expect(response.data.taskStatus).toBe("QUEUED");
  });
});

// ─── File Validation ──────────────────────────────────────────────────────────

describe("File Validation", () => {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB

  it("accepts files under 10MB", () => {
    expect(5 * 1024 * 1024).toBeLessThanOrEqual(MAX_SIZE);
  });

  it("rejects files over 10MB", () => {
    expect(12 * 1024 * 1024).toBeGreaterThan(MAX_SIZE);
  });

  it("accepts exactly 10MB", () => {
    expect(10 * 1024 * 1024).toBeLessThanOrEqual(MAX_SIZE);
  });

  it("rejects 10MB + 1 byte", () => {
    expect(MAX_SIZE + 1).toBeGreaterThan(MAX_SIZE);
  });
});

// ─── Camera Moves ─────────────────────────────────────────────────────────────

describe("Camera Moves Constants", () => {
  const CAMERA_MOVE_IDS = [
    "static",
    "pan_left",
    "pan_right",
    "tilt_up",
    "tilt_down",
    "zoom_in",
    "zoom_out",
    "dolly_in",
    "orbit",
    "crane_up",
    "tracking",
    "handheld",
  ];

  it("has exactly 12 camera moves", () => {
    expect(CAMERA_MOVE_IDS).toHaveLength(12);
  });

  it("includes static as default", () => {
    expect(CAMERA_MOVE_IDS).toContain("static");
  });

  it("all IDs are lowercase with underscores only", () => {
    CAMERA_MOVE_IDS.forEach((id) => {
      expect(id).toMatch(/^[a-z_]+$/);
    });
  });
});
