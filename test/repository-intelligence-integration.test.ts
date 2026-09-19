import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("local repository intelligence integration", () => {
  it("keeps generated Terrain and Litho state out of Git", () => {
    const ignore = read(".gitignore");
    expect(ignore).toContain("/.terrain/");
    expect(ignore).toContain("/.litho/");
    expect(ignore).toContain("/.repository-intelligence/");
  });

  it("locks Litho to the approved Gemini model without storing credentials", () => {
    const config = read("tools/repository-intelligence/litho.toml");
    const policy = JSON.parse(
      read("tools/repository-intelligence/provider-policy.json"),
    );
    expect(config).toContain("git_tracked_only = true");
    expect(config).not.toMatch(/^\s*provider\s*=/m);
    expect(config).not.toMatch(/^\s*api_key\s*=/m);
    expect(config).not.toMatch(/^\s*api_base_url\s*=/m);
    expect(config).not.toMatch(/sk-[A-Za-z0-9_-]{12,}/);
    expect(policy).toMatchObject({
      provider: "gemini",
      model_efficient: "gemini-3.5-flash-lite",
      model_powerful: "gemini-3.5-flash-lite",
      source_secret_env: "GOOGLE_API_KEY",
      process_secret_env: "LITHO_LLM_API_KEY",
      fallback_to_another_model: false,
    });
  });

  it("fails safely when local tools are absent and stays outside the app runtime", () => {
    const helper = read("tools/repository-intelligence/repo-intel.ps1");
    const packageJson = read("package.json");
    const nextConfig = read("next.config.mjs");

    expect(helper).toContain("Assert-Source");
    expect(helper).toContain("Assert-Binary");
    expect(helper).toContain('LithoExecution = "approved-gemini-development-only"');
    expect(helper).toContain('"terrain-litho-smoke"');
    expect(helper).toContain("$env:LITHO_LLM_API_KEY = $googleApiKey");
    expect(helper).not.toContain("--llm-api-key");
    expect(helper).toContain("The web application was not modified");
    expect(packageJson).not.toContain("repository-intelligence");
    expect(nextConfig).not.toContain("repository-intelligence");
  });

  it("builds Terrain from provider-free core dependencies only", () => {
    const manifest = read(
      "tools/repository-intelligence/terrain-core-cli/Cargo.toml",
    );

    expect(manifest).toContain("terrain-core");
    expect(manifest).not.toContain("terrain-agent");
    expect(manifest).not.toContain("adk-model");
  });

  it("does not add a local inference runtime to the website", () => {
    const packageJson = read("package.json");
    const middleware = read("middleware.ts");
    const vercel = read("vercel.json");
    const config = read("tools/repository-intelligence/litho.toml");
    const helper = read("tools/repository-intelligence/repo-intel.ps1");
    const combined = [packageJson, middleware, vercel, config, helper].join("\n");

    expect(combined.toLowerCase()).not.toContain("olla" + "ma");
    expect(combined).not.toContain("114" + "34");
  });

  it("excludes development intelligence tools from deployment contexts", () => {
    const vercelIgnore = read(".vercelignore");
    const dockerIgnore = read(".dockerignore");

    expect(vercelIgnore).toContain("/tools/repository-intelligence/");
    expect(vercelIgnore).toContain(".repository-intelligence/");
    expect(dockerIgnore).toContain("tools/repository-intelligence");
    expect(dockerIgnore).toContain(".repository-intelligence");
  });
});
