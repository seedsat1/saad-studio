import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AgentModelsPanel } from "@/components/admin/AgentModelsPanel";
import { getAgentModels } from "@/lib/agent-model-registry";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Agent model admin panel", () => {
  it("renders the registered catalog with Preview and connection state, not media controls", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ models: getAgentModels() }) }));
    render(<AgentModelsPanel />);
    expect(await screen.findByText("Gemini 3.1 Pro Preview")).toBeInTheDocument();
    expect(screen.getByText("Preview", { exact: true })).toBeInTheDocument();
    expect(screen.getByText(/الربط بعقل الـAgent لم يُفعّل بعد/)).toBeInTheDocument();
    expect(screen.getByText("gemini-2.5-flash-lite")).toBeInTheDocument();
    expect(screen.getByText("gemini-2.5-pro")).toBeInTheDocument();
    expect(screen.getByText("gemini-3.8-flash")).toBeInTheDocument();
    expect(screen.getAllByText("Tool calling")).toHaveLength(6);
    expect(screen.queryByRole("button", { name: /Add Model/ })).toBeNull();
    expect(screen.queryByText("ACTIVE", { exact: true })).toBeNull();
  });

  it("shows a failed fetch and lets an admin retry without any writes", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ models: getAgentModels() }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<AgentModelsPanel />);
    expect(await screen.findByRole("alert")).toHaveTextContent("401");
    expect(screen.queryByText("Gemini 3.1 Flash-Lite")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Refresh Agent Models" }));
    expect(await screen.findByText("Gemini 3.1 Flash-Lite")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.every(([url, options]) => url === "/api/admin/agent-models" && !options.method)).toBe(true);
  });
});
