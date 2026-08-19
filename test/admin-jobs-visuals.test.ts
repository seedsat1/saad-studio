import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Admin Jobs Visual Architecture & Operations Invariants", () => {
  const jobsPagePath = path.join(process.cwd(), "app", "admin", "jobs", "page.tsx");

  it("verifies jobs page exists and is wrapped in AdminShell with full-width root", () => {
    expect(fs.existsSync(jobsPagePath)).toBe(true);
    const content = fs.readFileSync(jobsPagePath, "utf-8");

    expect(content).toContain('<AdminShell activeRoute="/admin/jobs">');
    expect(content).toContain('<div className="flex-1 w-full min-w-0');
    expect(content).not.toContain("xl:grid-cols-[minmax(0,1fr)_440px]");
    expect(content).not.toContain("max-w-[1680px]");
    expect(content).not.toMatch(/<AdminShell[^>]*>[\s\S]{1,120}(mx-auto|max-w-)/);
  });

  it("verifies the 440px fixed permanent side panel is completely removed and replaced by a slide-over drawer", () => {
    const content = fs.readFileSync(jobsPagePath, "utf-8");

    // Must not have the old static aside in grid
    expect(content).not.toContain("xl:grid-cols-[minmax(0,1fr)_440px]");
    
    // Must contain slide-over drawer overlay container
    expect(content).toContain("fixed inset-0 z-50 overflow-hidden flex justify-end");
    expect(content).toContain("max-w-[500px]");
    expect(content).toContain("backdrop-blur-sm");
    expect(content).toContain("setDrawerOpen(false)");
  });

  it("verifies connected Queue Lifecycle Strip handles all 5 canonical statuses and diagnostics", () => {
    const content = fs.readFileSync(jobsPagePath, "utf-8");

    expect(content).toContain("All Workloads");
    expect(content).toContain("Queued");
    expect(content).toContain("In-Flight");
    expect(content).toContain("Completed");
    expect(content).toContain("Failed");
    expect(content).toContain("Diagnostics");
    expect(content).toContain("Source Split:");
  });

  it("enforces that no fake progress bars or mock metrics are fabricated", () => {
    const content = fs.readFileSync(jobsPagePath, "utf-8");

    // Progress is only rendered when actual numeric progress !== null
    expect(content).toContain("job.progress !== null");
    expect(content).not.toContain("Math.random()");
    expect(content).not.toContain("fakeProgress");
  });
});
