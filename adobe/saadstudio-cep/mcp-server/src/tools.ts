/**
 * Tool catalog exposed by the Saad Studio MCP server.
 *
 * Each tool bridges to a JSX function under $.saadstudio.* in the CEP panel.
 * Argument shapes come straight from the panel's UI so LLM-authored calls
 * match hand-clicks 1:1.
 */

import { callPanel } from "./bridge.js";

export interface McpTool {
  name: string;
  description: string;
  inputSchema: unknown;
  handler: (args: Record<string, unknown>) => Promise<{ ok: boolean; message: string; details?: unknown }>;
}

function toResult(r: { ok?: boolean; result?: unknown; error?: string }) {
  if (!r.ok) return { ok: false, message: r.error || "Panel error", details: r };
  const res = (r.result ?? {}) as Record<string, unknown>;
  return {
    ok: (res.ok as boolean | undefined) ?? true,
    message: (res.message as string | undefined) ?? "OK",
    details: res,
  };
}

const num = { type: "number" } as const;
const str = { type: "string" } as const;

export const TOOLS: McpTool[] = [
  {
    name: "saad_ping",
    description: "Health check. Returns the Adobe host name and current timestamp. Call this first.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => toResult(await callPanel("ping")),
  },

  // ═══════════ SELECTION INSPECTION ═══════════
  {
    name: "saad_inspect_easing_selection",
    description: "Report the current easing/keyframe selection context: host app, selected properties, key count, ready-to-apply pair count. Use before applying any easing.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => toResult(await callPanel("inspectSaadEaseSelection")),
  },
  {
    name: "saad_inspect_keys",
    description: "Report the Keys-tab selection: property count, selected keyframe count, layer count, CTI, frame duration. Use before Keys operations.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => toResult(await callPanel("saadKeysInspect")),
  },

  // ═══════════ EASING ═══════════
  {
    name: "saad_apply_custom_bezier",
    description: "Apply a custom cubic-bezier to the selected consecutive keyframe pair(s). Provide x1,y1,x2,y2 in the standard CSS cubic-bezier convention.",
    inputSchema: {
      type: "object",
      properties: {
        x1: { ...num, minimum: 0, maximum: 1, description: "Control point 1 X (0..1)." },
        y1: { ...num, minimum: -1.5, maximum: 2.5, description: "Control point 1 Y (may overshoot)." },
        x2: { ...num, minimum: 0, maximum: 1, description: "Control point 2 X (0..1)." },
        y2: { ...num, minimum: -1.5, maximum: 2.5, description: "Control point 2 Y (may overshoot)." },
        premiere_property_ids: { type: "array", items: str, description: "Optional Premiere property IDs to target (from saad_inspect_easing_selection.properties[].id)." },
      },
      required: ["x1", "y1", "x2", "y2"],
    },
    handler: async (a) => {
      const bezierText = `${a.x1},${a.y1},${a.x2},${a.y2}`;
      const ids = (a.premiere_property_ids as string[] | undefined) ?? null;
      return toResult(await callPanel("applySaadEaseToSelectedKeyframes", [bezierText, ids]));
    },
  },
  {
    name: "saad_apply_easing_preset",
    description: "Apply a named cubic-bezier preset. Names: ease, easeIn, easeOut, cubic, linear, quad, quadIn, quadOut, quart, quartIn, quartOut, quint, quintIn, quintOut, expo, expoIn, expoOut, circ, circIn, circOut, back, backIn, backOut.",
    inputSchema: {
      type: "object",
      properties: {
        preset: { ...str, description: "Preset id, see the list in the description." },
        premiere_property_ids: { type: "array", items: str },
      },
      required: ["preset"],
    },
    handler: async (a) => {
      const preset = String(a.preset);
      const P: Record<string, [number, number, number, number]> = {
        ease: [0.25, 0.1, 0.25, 1], easeIn: [0.42, 0, 1, 1], easeOut: [0, 0, 0.58, 1],
        cubic: [0.66, 0, 0.34, 1], linear: [0, 0, 1, 1],
        quad: [0.45, 0, 0.55, 1], quadIn: [0.55, 0.09, 0.68, 0.53], quadOut: [0.25, 0.46, 0.45, 0.94],
        quart: [0.77, 0, 0.18, 1], quartIn: [0.9, 0.03, 0.69, 0.22], quartOut: [0.17, 0.84, 0.44, 1],
        quint: [0.86, 0, 0.07, 1], quintIn: [0.76, 0.05, 0.86, 0.06], quintOut: [0.23, 1, 0.32, 1],
        expo: [1, 0, 0, 1], expoIn: [0.95, 0.05, 0.8, 0.04], expoOut: [0.19, 1, 0.22, 1],
        circ: [0.79, 0.14, 0.15, 0.86], circIn: [0.6, 0.04, 0.98, 0.34], circOut: [0.08, 0.82, 0.17, 1],
        back: [0.68, -0.55, 0.27, 1.55], backIn: [0.6, -0.28, 0.74, 0.05], backOut: [0.18, 0.89, 0.32, 1.28],
      };
      const b = P[preset];
      if (!b) return { ok: false, message: `Unknown preset "${preset}". See tool description for the list.` };
      const ids = (a.premiere_property_ids as string[] | undefined) ?? null;
      return toResult(await callPanel("applySaadEaseToSelectedKeyframes", [b.join(","), ids]));
    },
  },

  // ═══════════ KEYS: SHIFT ═══════════
  {
    name: "saad_keys_shift",
    description: "Shift the selected keyframes by N frames (positive = forward, negative = backward). Works in AE (needs highlighted ◆) and Premiere (via property picker).",
    inputSchema: {
      type: "object",
      properties: {
        frames: { ...num, description: "Frame delta. Use ±1 for fine nudge, ±10 for coarse." },
        premiere_property_ids: { type: "array", items: str },
      },
      required: ["frames"],
    },
    handler: async (a) => {
      const ids = (a.premiere_property_ids as string[] | undefined) ?? null;
      return toResult(await callPanel("saadKeysShift", [Number(a.frames), ids]));
    },
  },

  // ═══════════ KEYS: ALIGN (AE only) ═══════════
  {
    name: "saad_keys_align",
    description: "Move the first or last selected key to the CTI (current time indicator) or to the layer's in/out point. AE only.",
    inputSchema: {
      type: "object",
      properties: {
        mode: { type: "string", enum: ["firstToCTI", "lastToCTI", "firstToInPoint", "lastToOutPoint"] },
      },
      required: ["mode"],
    },
    handler: async (a) => toResult(await callPanel("saadKeysAlign", [String(a.mode)])),
  },

  // ═══════════ KEYS: DUPLICATE / FLIP (AE only) ═══════════
  {
    name: "saad_keys_duplicate",
    description: "Append a copy of the selected keys immediately after the last selected key. AE only, needs 2+ selected keys.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => toResult(await callPanel("saadKeysDuplicate")),
  },
  {
    name: "saad_keys_duplicate_flip",
    description: "Duplicate then reverse the copy — creates a smooth ping-pong loop. AE only.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => toResult(await callPanel("saadKeysDuplicateFlip")),
  },
  {
    name: "saad_keys_flip",
    description: "Mirror the selected keys' values in place across their time span (last value ↔ first value). AE only.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => toResult(await callPanel("saadKeysFlip")),
  },

  // ═══════════ KEYS: STAGGER / DISTRIBUTE (AE only) ═══════════
  {
    name: "saad_keys_stagger",
    description: "Offset each selected property's keys by increasing multiples of `interval`. `direction` chooses ordering. AE only, needs 2+ properties with selected keys.",
    inputSchema: {
      type: "object",
      properties: {
        interval: { ...num, minimum: 0.001, description: "Offset step in frames or seconds (see unit)." },
        direction: { type: "string", enum: ["asc", "desc", "random"] },
        unit: { type: "string", enum: ["frames", "seconds"], default: "frames" },
      },
      required: ["interval", "direction"],
    },
    handler: async (a) => toResult(await callPanel("saadKeysStagger", [Number(a.interval), String(a.direction), String(a.unit || "frames")])),
  },
  {
    name: "saad_keys_distribute",
    description: "Evenly space the selected keys at `interval` apart, keeping the earliest key in place. AE only, needs 2+ selected keys per property.",
    inputSchema: {
      type: "object",
      properties: {
        interval: { ...num, minimum: 0.001 },
        unit: { type: "string", enum: ["frames", "seconds", "even"], default: "frames", description: "\"even\" auto-computes spacing = (last-first)/(n-1)." },
      },
      required: ["interval"],
    },
    handler: async (a) => toResult(await callPanel("saadKeysDistribute", [Number(a.interval), String(a.unit || "frames")])),
  },

  // ═══════════ KEYS: STRETCH (AE only) ═══════════
  {
    name: "saad_keys_stretch",
    description: "Scale the time distance between the selected first and last key. `mode` picks the fixed pivot. AE only, needs 2+ selected keys.",
    inputSchema: {
      type: "object",
      properties: {
        value: { ...num, minimum: 0.001, description: "Target — interpretation depends on unit." },
        unit: { type: "string", enum: ["percent", "frames", "seconds"], default: "percent" },
        mode: { type: "string", enum: ["firstKey", "lastKey", "CTI"], default: "firstKey" },
      },
      required: ["value"],
    },
    handler: async (a) => toResult(await callPanel("saadKeysStretch", [Number(a.value), String(a.unit || "percent"), String(a.mode || "firstKey")])),
  },

  // ═══════════ KEYS: COPY / PASTE (AE only) ═══════════
  {
    name: "saad_keys_copy",
    description: "Copy the selected keys into the panel's internal clipboard. AE only.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => toResult(await callPanel("saadKeysCopy")),
  },
  {
    name: "saad_keys_paste",
    description: "Paste the internal clipboard onto the currently selected property/properties. Anchor decides where each pasted key sits.",
    inputSchema: {
      type: "object",
      properties: {
        anchor: { type: "string", enum: ["inPoint", "outPoint", "CTI", "selection"], default: "CTI" },
        mode: { type: "string", enum: ["absolute", "relative"], default: "absolute" },
      },
    },
    handler: async (a) => toResult(await callPanel("saadKeysPaste", [String(a.anchor || "CTI"), String(a.mode || "absolute")])),
  },

  // ═══════════ KEYS: MISC (AE only) ═══════════
  {
    name: "saad_keys_constant_speed",
    description: "Set linear interpolation on every selected keyframe. AE only.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => toResult(await callPanel("saadKeysConstantSpeed")),
  },
  {
    name: "saad_keys_snap_frame",
    description: "Round every selected keyframe's time to the nearest whole frame. AE only.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => toResult(await callPanel("saadKeysSnapNearestFrame")),
  },
  {
    name: "saad_keys_overlap_clean",
    description: "Remove selected keys that sit within half a frame of a neighbor (dedup). AE only.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => toResult(await callPanel("saadKeysOverlapClean")),
  },
  {
    name: "saad_keys_label",
    description: "Assign an AE label color (0..16) to the selected layer(s). AE only.",
    inputSchema: {
      type: "object",
      properties: { color_index: { type: "integer", minimum: 0, maximum: 16 } },
      required: ["color_index"],
    },
    handler: async (a) => toResult(await callPanel("saadKeysLabel", [Number(a.color_index)])),
  },
];
