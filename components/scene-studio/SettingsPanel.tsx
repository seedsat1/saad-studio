"use client";

import { useState } from "react";
import { useStudioStore } from "@/hooks/use-studio-store";

export default function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const apiKey = useStudioStore((s) => s.apiKey);
  const workflowId = useStudioStore((s) => s.workflowId);
  const imageNodeId = useStudioStore((s) => s.imageNodeId);
  const textNodeId = useStudioStore((s) => s.textNodeId);
  const setApiKey = useStudioStore((s) => s.setApiKey);
  const setWorkflowId = useStudioStore((s) => s.setWorkflowId);
  const setImageNodeId = useStudioStore((s) => s.setImageNodeId);
  const setTextNodeId = useStudioStore((s) => s.setTextNodeId);

  return (
    <div className="border-b border-gray-800 px-4 sm:px-6">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 py-2.5 text-sm text-gray-400 hover:text-gray-200 transition"
      >
        <span
          className="inline-block transition-transform"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          ▶
        </span>
        API Settings
        {!workflowId && (
          <span className="ml-2 rounded bg-amber-900/50 px-1.5 py-0.5 text-xs text-amber-400">
            Required
          </span>
        )}
      </button>

      {open && (
        <div className="grid gap-3 pb-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500">
              Workflow ID
            </label>
            <input
              type="text"
              value={workflowId}
              onChange={(e) => setWorkflowId(e.target.value)}
              placeholder="Workflow ID"
              className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">
              Image Node ID
            </label>
            <input
              type="text"
              value={imageNodeId}
              onChange={(e) => setImageNodeId(e.target.value)}
              placeholder="image_input"
              className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">
              Text Node ID
            </label>
            <input
              type="text"
              value={textNodeId}
              onChange={(e) => setTextNodeId(e.target.value)}
              placeholder="text_input"
              className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
