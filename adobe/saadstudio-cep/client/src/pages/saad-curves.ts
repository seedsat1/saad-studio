import { Header } from "../components/header";
import { PageHeader } from "../components/page-header";
import { el } from "../lib/dom";
import { evalES, getHostApp, isInsideAdobe } from "../lib/cep";

type Bezier = [number, number, number, number];
type CurvePreset = { id: string; label: string; group: "basic" | "power" | "expressive"; bezier: Bezier };
type SvgProps = Record<string, string | number | boolean | null | undefined>;

interface EasingSelectionInfo {
  ok: boolean;
  host: string;
  propertyCount: number;
  selectedKeyCount: number;
  pairCount: number;
  message: string;
  clipCount?: number;
  componentCount?: number;
  scannedPropertyCount?: number;
  affectedProperties?: string[];
  properties?: EasingPropertyInfo[];
  diagnostics?: EasingDiagnosticProperty[];
}

interface EasingApplyResult extends EasingSelectionInfo {
  appliedPairs: number;
  errors: string[];
}

interface EasingPropertyInfo {
  id: string;
  name: string;
  keyCount: number;
  pairCount: number;
}

interface EasingDiagnosticProperty {
  clip: string;
  component: string;
  property: string;
  keyCount: number;
  canReadKeys: boolean;
  canWriteInterpolation: boolean;
  reason: string;
}

const PRESETS: CurvePreset[] = [
  { id: "ease", label: "ease", group: "basic", bezier: [0.25, 0.1, 0.25, 1] },
  { id: "easeIn", label: "easeIn", group: "basic", bezier: [0.42, 0, 1, 1] },
  { id: "easeOut", label: "easeOut", group: "basic", bezier: [0, 0, 0.58, 1] },
  { id: "cubic", label: "cubic", group: "basic", bezier: [0.66, 0, 0.34, 1] },
  { id: "linear", label: "linear", group: "basic", bezier: [0, 0, 1, 1] },
  { id: "quad", label: "quad", group: "power", bezier: [0.45, 0, 0.55, 1] },
  { id: "quadIn", label: "quadIn", group: "power", bezier: [0.55, 0.09, 0.68, 0.53] },
  { id: "quadOut", label: "quadOut", group: "power", bezier: [0.25, 0.46, 0.45, 0.94] },
  { id: "quart", label: "quart", group: "power", bezier: [0.77, 0, 0.18, 1] },
  { id: "quartIn", label: "quartIn", group: "power", bezier: [0.9, 0.03, 0.69, 0.22] },
  { id: "quartOut", label: "quartOut", group: "power", bezier: [0.17, 0.84, 0.44, 1] },
  { id: "quint", label: "quint", group: "power", bezier: [0.86, 0, 0.07, 1] },
  { id: "quintIn", label: "quintIn", group: "power", bezier: [0.76, 0.05, 0.86, 0.06] },
  { id: "quintOut", label: "quintOut", group: "power", bezier: [0.23, 1, 0.32, 1] },
  { id: "expo", label: "expo", group: "expressive", bezier: [1, 0, 0, 1] },
  { id: "expoIn", label: "expoIn", group: "expressive", bezier: [0.95, 0.05, 0.8, 0.04] },
  { id: "expoOut", label: "expoOut", group: "expressive", bezier: [0.19, 1, 0.22, 1] },
  { id: "circ", label: "circ", group: "expressive", bezier: [0.79, 0.14, 0.15, 0.86] },
  { id: "circIn", label: "circIn", group: "expressive", bezier: [0.6, 0.04, 0.98, 0.34] },
  { id: "circOut", label: "circOut", group: "expressive", bezier: [0.08, 0.82, 0.17, 1] },
  { id: "back", label: "back", group: "expressive", bezier: [0.68, -0.55, 0.27, 1.55] },
  { id: "backIn", label: "backIn", group: "expressive", bezier: [0.6, -0.28, 0.74, 0.05] },
  { id: "backOut", label: "backOut", group: "expressive", bezier: [0.18, 0.89, 0.32, 1.28] },
];

const CANVAS = 340;
const PAD = 50;
const AREA = CANVAS - PAD * 2;

type TabId = "easing" | "keys";

interface KeysInspectInfo {
  ok: boolean;
  host: string;
  propertyCount: number;
  keyCount: number;         // in AE this is SELECTED keys; in PPRO this is total keys on selected clips
  totalKeys?: number;
  layerCount: number;
  cti?: number;
  frameDur?: number;
  message: string;
}

interface KeysOpResult {
  ok: boolean;
  host: string;
  message: string;
  errors?: string[];
}

let current: Bezier = [...PRESETS.find((preset) => preset.id === "cubic")!.bezier] as Bezier;
let selectedPreset = "cubic";
let statusText = "Select 2+ consecutive keyframes, then apply.";
let selectionInfo: EasingSelectionInfo | null = null;
let selectedPropertyIds = new Set<string>();
let applying = false;

let activeTab: TabId = "easing";
let keysInfo: KeysInspectInfo | null = null;
let keysStatus = "Select keyed properties, then pick an action.";
let keysBusy = false;
let staggerFrames = 3;
let staggerUnit: "frames" | "seconds" = "frames";
let stretchValue = 75;
let stretchUnit: "percent" | "frames" | "seconds" = "percent";
let pasteAnchor: "inPoint" | "outPoint" | "CTI" | "selection" = "CTI";

export function SaadCurvesPage(): HTMLElement {
  const root = el("div.col", { style: { height: "100%" } }, Header(), PageHeader("Saad Curves"));
  const main = el("div.app-main.saad-curves-page");
  root.appendChild(main);

  const refs: {
    path?: SVGPathElement;
    handle1?: SVGLineElement;
    handle2?: SVGLineElement;
    point1?: SVGCircleElement;
    point2?: SVGCircleElement;
    ball?: SVGCircleElement;
    timeMark?: SVGLineElement;
    valueMark?: SVGLineElement;
    inputs?: HTMLInputElement[];
    bezierInput?: HTMLInputElement;
    motionBlock?: HTMLElement;
    motionTrack?: HTMLElement;
    motionProgress?: HTMLElement;
  } = {};

  let dragging: 0 | 1 | 2 = 0;

  function render() {
    const status = activeTab === "easing" ? statusText : keysStatus;
    const kicker = activeTab === "easing" ? "SAAD CURVES" : "SAAD KEYS";
    const subtitle = activeTab === "easing" ? "Drag the handles or pick a preset." : "Keyframe operations for the selected properties.";
    const refreshFn = activeTab === "easing" ? refreshSelection : refreshKeys;

    main.replaceChildren(
      el("div.saad-curves-shell",
        null,
        el("div.saad-curves-tabs",
          null,
          el(`button.saad-curves-tab${activeTab === "easing" ? ".active" : ""}`, { onClick: () => { activeTab = "easing"; render(); } }, "Easing"),
          el(`button.saad-curves-tab${activeTab === "keys" ? ".active" : ""}`, { onClick: () => { activeTab = "keys"; render(); refreshKeys().catch(() => undefined); } }, "Keys"),
        ),
        el("div.saad-curves-topbar",
          null,
          el("div",
            null,
            el("div.saad-curves-kicker", null, kicker),
            el("h3.saad-curves-title", null, subtitle),
          ),
          el("button.btn-secondary", { onClick: refreshFn }, "Refresh"),
        ),
        el("div.saad-curves-status",
          null,
          el("span.saad-curves-dot"),
          el("span", null, status),
        ),
        activeTab === "easing" ? renderEasingTab() : renderKeysTab(),
      ),
    );
    if (activeTab === "easing") applyCurveVisuals();
  }

  function renderEasingTab(): HTMLElement {
    return el("div.saad-curves-grid",
      null,
      el("section.saad-curves-panel",
        null,
        renderCurve(),
        renderMotionPreview(),
        renderControls(),
        renderPremierePropertyPicker(),
        renderPremiereDiagnostics(),
        el("button.btn-primary.saad-curves-apply", { disabled: applying, onClick: applyEase }, applying ? "Applying..." : "Apply to selected keyframes"),
      ),
      el("section.saad-curves-panel.saad-curves-panel--side",
        null,
        el("h4", null, "Presets"),
        renderPresetGroup("Basic", "basic"),
        renderPresetGroup("Power", "power"),
        renderPresetGroup("Expressive", "expressive"),
        el("div.saad-curves-divider"),
        renderSelectionSummary(),
      ),
    );
  }

  function renderKeysTab(): HTMLElement {
    const host = getHostApp();
    const isAe = host === "AEFT";
    const isPpro = host === "PPRO";
    const disabled = keysBusy;
    const hostSupported = isAe || isPpro;

    const iconBtn = (iconName: string, tip: string, action: () => void, opts: { supported?: boolean; wide?: boolean } = {}) => {
      const supported = opts.supported ?? true;
      const enabled = !(disabled || !hostSupported || !supported);
      return el(`button.sk-btn${opts.wide ? ".wide" : ""}`, {
        disabled: !enabled,
        title: !hostSupported ? "Open inside AE or Premiere." : (!supported ? tip + " — AE only" : tip),
        onClick: action,
      }, keysIcon(iconName));
    };

    const sectionTitle = (a: string, b?: string, right?: string) =>
      el("div.sk-section-title",
        null,
        el("span", null, a),
        b ? el("span.sk-sep", null, "/") : null,
        b ? el("span", null, b) : null,
        right ? el("span.sk-badge", null, right) : null,
      );

    const keysLabel = isAe ? "sel. keys" : "keys";
    const hasSelection = isAe ? (keysInfo?.keyCount ?? 0) > 0 : (keysInfo?.keyCount ?? 0) > 0;

    return el("div.sk-shell",
      null,
      el(`div.sk-selection-strip${hasSelection ? "" : ".sk-warn"}`,
        null,
        el("span.sk-sel-host", null, isAe ? "AE" : isPpro ? "PR" : "—"),
        el("span.sk-sel-count", null, `${keysInfo?.propertyCount ?? 0}`), el("span.sk-sel-lbl", null, "prop"),
        el("span.sk-sel-count", null, `${keysInfo?.keyCount ?? 0}`), el("span.sk-sel-lbl", null, keysLabel),
        el("span.sk-sel-count", null, `${keysInfo?.layerCount ?? 0}`), el("span.sk-sel-lbl", null, isPpro ? "clips" : "layers"),
        el("button.sk-refresh", { onClick: refreshKeys, disabled: keysBusy, title: "Refresh selection" }, keysIcon("refresh")),
      ),

      // Compact hint line when selection isn't ready (matches keysStatus but always shown in Keys tab)
      !hostSupported ? el("div.sk-hint", null, "Open Saad Studio inside After Effects or Premiere Pro.") :
      isAe && (keysInfo?.propertyCount ?? 0) === 0 ? el("div.sk-hint", null, "Select a layer, press ", el("kbd", null, "U"), " to reveal animated properties, then click a property name.") :
      isAe && (keysInfo?.keyCount ?? 0) === 0 ? el("div.sk-hint", null, "Property selected. Now click the ◆ keyframes on the timeline to highlight them.") :
      isPpro && (keysInfo?.propertyCount ?? 0) === 0 ? el("div.sk-hint", null, "Select a clip with keyframes on Motion or an Effect (2+ keys), then Refresh.") :
      null,

      // Premiere property picker (reuses the Easing scanner's property list)
      isPpro && (selectionInfo?.properties?.length ?? 0) > 0
        ? el("div.sk-ppro-picker",
            null,
            el("div.sk-ppro-picker-head", null,
              el("span", null, "Apply to:"),
              el("button.sk-mini-btn", { onClick: () => { selectedPropertyIds = new Set(selectionInfo!.properties!.map(p => p.id)); render(); } }, "All"),
              el("button.sk-mini-btn", { onClick: () => { selectedPropertyIds = new Set(); render(); } }, "None"),
            ),
            el("div.sk-ppro-picker-list", null,
              ...selectionInfo!.properties!.map((p) => el("label.sk-ppro-row",
                null,
                el("input", {
                  type: "checkbox",
                  checked: selectedPropertyIds.has(p.id),
                  onChange: (e: Event) => {
                    const t = e.currentTarget as HTMLInputElement;
                    if (t.checked) selectedPropertyIds.add(p.id); else selectedPropertyIds.delete(p.id);
                    render();
                  },
                }),
                el("span.sk-ppro-name", null, p.name),
                el("span.sk-ppro-count", null, `${p.keyCount}k`),
              )),
            ),
          )
        : null,

      // Duplicate + Flip — two adjacent subtitles over their own buttons
      el("div.sk-block",
        null,
        el("div.sk-dual-title",
          null,
          el("span.sk-section-title", { style: { flex: "2" } }, el("span", null, "Duplicate")),
          el("span.sk-section-title", { style: { flex: "1" } }, el("span", null, "Flip")),
        ),
        el("div.sk-split-row",
          null,
          el("div.sk-btn-row", { style: { flex: "2" } },
            iconBtn("duplicate", "Duplicate", () => runKeys("saadKeysDuplicate"), { supported: isAe }),
            iconBtn("duplicateFlip", "Duplicate & flip", () => runKeys("saadKeysDuplicateFlip"), { supported: isAe }),
          ),
          el("div.sk-btn-row", { style: { flex: "1" } },
            iconBtn("flip", "Flip", () => runKeys("saadKeysFlip"), { supported: isAe }),
          ),
        ),
      ),

      // Align
      el("div.sk-block",
        null,
        sectionTitle("Align"),
        el("div.sk-btn-row",
          null,
          iconBtn("alignFirstCTI", "First key on CTI", () => runKeys("saadKeysAlign", "firstToCTI"), { supported: isAe }),
          iconBtn("alignLastCTI", "Last key on CTI", () => runKeys("saadKeysAlign", "lastToCTI"), { supported: isAe }),
          iconBtn("alignFirstIn", "First key on layer in-point", () => runKeys("saadKeysAlign", "firstToInPoint"), { supported: isAe }),
          iconBtn("alignLastOut", "Last key on layer out-point", () => runKeys("saadKeysAlign", "lastToOutPoint"), { supported: isAe }),
        ),
      ),

      // Stagger + Distribute
      el("div.sk-block",
        null,
        sectionTitle("Stagger", undefined, "AE"),
        el("div.sk-input-row",
          null,
          el("input.sk-num", {
            type: "number", min: "1", max: "240", step: "1",
            value: String(staggerFrames),
            onInput: (e: Event) => { staggerFrames = Math.max(1, Number((e.currentTarget as HTMLInputElement).value) || 1); },
          }),
          radioSeg("stagger-unit", ["frames", "seconds"], staggerUnit, (v) => { staggerUnit = v as typeof staggerUnit; render(); }),
        ),
        el("div.sk-btn-row",
          null,
          iconBtn("staggerDesc", "Descending stagger", () => runKeys("saadKeysStagger", staggerFrames, "desc", staggerUnit), { supported: isAe }),
          iconBtn("staggerAsc", "Ascending stagger", () => runKeys("saadKeysStagger", staggerFrames, "asc", staggerUnit), { supported: isAe }),
          iconBtn("staggerRandom", "Random stagger", () => runKeys("saadKeysStagger", staggerFrames, "random", staggerUnit), { supported: isAe }),
          iconBtn("distribute", "Distribute selected keys evenly at N " + staggerUnit, () => runKeys("saadKeysDistribute", staggerFrames, staggerUnit), { supported: isAe }),
        ),
      ),

      // Stretch
      el("div.sk-block",
        null,
        sectionTitle("Stretch", undefined, "AE"),
        el("div.sk-input-row",
          null,
          el("input.sk-num", {
            type: "number", min: "1", max: "9999", step: "1",
            value: String(stretchValue),
            onInput: (e: Event) => { stretchValue = Math.max(1, Number((e.currentTarget as HTMLInputElement).value) || 1); },
          }),
          radioSeg("stretch-unit", ["percent", "frames", "seconds"], stretchUnit, (v) => { stretchUnit = v as typeof stretchUnit; render(); }, { percent: "%" }),
        ),
        el("div.sk-btn-row",
          null,
          iconBtn("stretchFromFirst", "Stretch from first key", () => runKeys("saadKeysStretch", stretchValue, stretchUnit, "firstKey"), { supported: isAe }),
          iconBtn("stretchFromLast", "Stretch from last key", () => runKeys("saadKeysStretch", stretchValue, stretchUnit, "lastKey"), { supported: isAe }),
          iconBtn("stretchFromCTI", "Stretch from CTI", () => runKeys("saadKeysStretch", stretchValue, stretchUnit, "CTI"), { supported: isAe }),
        ),
      ),

      // Copy / Paste
      el("div.sk-block",
        null,
        sectionTitle("Copy", "Paste", "AE"),
        el("div.sk-input-row",
          null,
          radioSeg("paste-anchor",
            ["inPoint", "outPoint", "CTI", "selection"],
            pasteAnchor,
            (v) => { pasteAnchor = v as typeof pasteAnchor; render(); },
            { inPoint: "in pt", outPoint: "out pt", CTI: "CTI", selection: "sel." },
          ),
        ),
        el("div.sk-btn-row",
          null,
          iconBtn("copy", "Copy selected keys", () => runKeys("saadKeysCopy"), { supported: isAe }),
          iconBtn("pasteAbs", "Paste at anchor (absolute)", () => runKeys("saadKeysPaste", pasteAnchor, "absolute"), { supported: isAe }),
          iconBtn("pasteRel", "Paste relative to CTI", () => runKeys("saadKeysPaste", pasteAnchor, "relative"), { supported: isAe }),
        ),
      ),

      // Misc
      el("div.sk-block",
        null,
        sectionTitle("Misc"),
        el("div.sk-btn-row",
          null,
          iconBtn("nearestFrame", "Align to nearest frame", () => runKeys("saadKeysSnapNearestFrame"), { supported: isAe }),
          iconBtn("constantSpeed", "Constant speed (linear)", () => runKeys("saadKeysConstantSpeed"), { supported: isAe }),
          iconBtn("overlapClean", "Overlap cleaning (remove touching keys)", () => runKeys("saadKeysOverlapClean"), { supported: isAe }),
        ),
      ),

      // Shift
      el("div.sk-block",
        null,
        sectionTitle("Shift"),
        el("div.sk-btn-row.sk-btn-row--4",
          null,
          iconBtn("shift10Left", "−10 frames", () => runKeys("saadKeysShift", -10, pproSelectedIds())),
          iconBtn("shift1Left", "−1 frame", () => runKeys("saadKeysShift", -1, pproSelectedIds())),
          iconBtn("shift1Right", "+1 frame", () => runKeys("saadKeysShift", 1, pproSelectedIds())),
          iconBtn("shift10Right", "+10 frames", () => runKeys("saadKeysShift", 10, pproSelectedIds())),
        ),
      ),

      // Labels — 16 colors in 2 rows of 8 (Keystone-style). Label 0 = None (hidden).
      el("div.sk-block",
        null,
        sectionTitle("Labels", undefined, "AE"),
        el("div.sk-labels",
          null,
          ...Array.from({ length: 16 }, (_, k) => {
            const i = k + 1; // AE label index 1..16 (skip 0 = None)
            return el("button.sk-label", {
              disabled: disabled || !isAe,
              title: `Label ${i}`,
              style: { background: labelColor(i) },
              onClick: () => runKeys("saadKeysLabel", i),
            });
          }),
        ),
      ),
    );
  }

  function radioSeg(
    name: string,
    values: string[],
    current: string,
    onChange: (v: string) => void,
    labels: Record<string, string> = {},
  ): HTMLElement {
    return el("div.sk-radio-seg",
      null,
      ...values.map((v) => el(`button.sk-radio${current === v ? ".active" : ""}`, {
        title: v,
        "data-name": name,
        onClick: () => onChange(v),
      }, labels[v] ?? v)),
    );
  }

  function renderCurve(): HTMLElement {
    const svg = svgEl("svg", { viewBox: `0 0 ${CANVAS} ${CANVAS}`, role: "img", "aria-label": "Bezier curve preview" },
      svgEl("defs", null,
        svgEl("linearGradient", { id: "sc-stroke", x1: "0", y1: "1", x2: "1", y2: "0" },
          svgEl("stop", { offset: "0%", "stop-color": "#7dd3fc" }),
          svgEl("stop", { offset: "55%", "stop-color": "#22d3ee" }),
          svgEl("stop", { offset: "100%", "stop-color": "#a78bfa" }),
        ),
        svgEl("radialGradient", { id: "sc-ball", cx: "0.5", cy: "0.5", r: "0.5" },
          svgEl("stop", { offset: "0%", "stop-color": "#f0fdff" }),
          svgEl("stop", { offset: "70%", "stop-color": "#22d3ee" }),
          svgEl("stop", { offset: "100%", "stop-color": "rgba(34,211,238,0)" }),
        ),
      ),
      svgEl("rect", { x: PAD, y: PAD, width: AREA, height: AREA, rx: 4, class: "saad-curves-grid-rect" }),
      renderGridLines(),
      svgEl("path", { d: `M${PAD} ${PAD + AREA} L${PAD + AREA} ${PAD}`, class: "saad-curves-diagonal" }),
    );

    const timeMark = svgEl("line", { x1: PAD, y1: PAD + AREA, x2: PAD, y2: PAD, class: "saad-curves-time-mark" }) as SVGLineElement;
    const valueMark = svgEl("line", { x1: PAD, y1: PAD + AREA, x2: PAD + AREA, y2: PAD + AREA, class: "saad-curves-value-mark" }) as SVGLineElement;
    const handle1 = svgEl("line", { x1: PAD, y1: PAD + AREA, x2: PAD, y2: PAD + AREA, class: "saad-curves-handle" }) as SVGLineElement;
    const handle2 = svgEl("line", { x1: PAD + AREA, y1: PAD, x2: PAD + AREA, y2: PAD, class: "saad-curves-handle" }) as SVGLineElement;
    const path = svgEl("path", { d: "", class: "saad-curves-path" }) as SVGPathElement;
    const pathGlow = svgEl("path", { d: "", class: "saad-curves-path-glow" }) as SVGPathElement;
    const point1 = svgEl("circle", { r: 9, class: "saad-curves-point", "data-handle": "1" }) as SVGCircleElement;
    const point2 = svgEl("circle", { r: 9, class: "saad-curves-point", "data-handle": "2" }) as SVGCircleElement;
    const ball = svgEl("circle", { cx: PAD, cy: PAD + AREA, r: 8, class: "saad-curves-ball", fill: "url(#sc-ball)" }) as SVGCircleElement;

    svg.appendChild(timeMark);
    svg.appendChild(valueMark);
    svg.appendChild(handle1);
    svg.appendChild(handle2);
    svg.appendChild(pathGlow);
    svg.appendChild(path);
    svg.appendChild(svgEl("circle", { cx: PAD, cy: PAD + AREA, r: 5, class: "saad-curves-endpoint" }));
    svg.appendChild(svgEl("circle", { cx: PAD + AREA, cy: PAD, r: 5, class: "saad-curves-endpoint" }));
    svg.appendChild(point1);
    svg.appendChild(point2);
    svg.appendChild(ball);

    refs.path = path;
    refs.handle1 = handle1;
    refs.handle2 = handle2;
    refs.point1 = point1;
    refs.point2 = point2;
    refs.ball = ball;
    refs.timeMark = timeMark;
    refs.valueMark = valueMark;

    const attachDrag = (circle: SVGCircleElement, handleIndex: 1 | 2) => {
      circle.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        dragging = handleIndex;
        circle.setPointerCapture(event.pointerId);
        circle.classList.add("dragging");
        updateFromPointer(event, svg);
      });
      circle.addEventListener("pointermove", (event) => {
        if (dragging !== handleIndex) return;
        updateFromPointer(event, svg);
      });
      const end = (event: PointerEvent) => {
        if (dragging !== handleIndex) return;
        dragging = 0;
        try { circle.releasePointerCapture(event.pointerId); } catch (_) { /* noop */ }
        circle.classList.remove("dragging");
        selectedPreset = "custom";
        statusText = "Custom curve applied.";
        render();
      };
      circle.addEventListener("pointerup", end);
      circle.addEventListener("pointercancel", end);
    };
    attachDrag(point1, 1);
    attachDrag(point2, 2);

    // Also allow tapping the plot area to reposition the nearest handle
    svg.addEventListener("dblclick", (event) => {
      const point = clientToBezier(event as unknown as PointerEvent, svg);
      const d1 = Math.hypot(point.x - current[0], point.y - current[1]);
      const d2 = Math.hypot(point.x - current[2], point.y - current[3]);
      if (d1 <= d2) {
        current[0] = clamp01(point.x);
        current[1] = clampOvershoot(point.y);
      } else {
        current[2] = clamp01(point.x);
        current[3] = clampOvershoot(point.y);
      }
      selectedPreset = "custom";
      render();
    });

    return el("div.saad-curves-curve", null, svg);
  }

  function renderGridLines(): SVGElement {
    const g = svgEl("g", { class: "saad-curves-grid-lines" });
    for (let i = 1; i < 4; i++) {
      const offset = PAD + (AREA * i) / 4;
      g.appendChild(svgEl("line", { x1: offset, y1: PAD, x2: offset, y2: PAD + AREA }));
      g.appendChild(svgEl("line", { x1: PAD, y1: offset, x2: PAD + AREA, y2: offset }));
    }
    return g;
  }

  function updateFromPointer(event: PointerEvent, svg: SVGElement) {
    const point = clientToBezier(event, svg);
    const idx = dragging === 1 ? 0 : 2;
    current[idx] = clamp01(point.x);
    current[idx + 1] = clampOvershoot(point.y);
    applyCurveVisuals();
  }

  function clientToBezier(event: PointerEvent, svg: SVGElement): { x: number; y: number } {
    const rect = svg.getBoundingClientRect();
    const localX = ((event.clientX - rect.left) / rect.width) * CANVAS;
    const localY = ((event.clientY - rect.top) / rect.height) * CANVAS;
    return {
      x: (localX - PAD) / AREA,
      y: (PAD + AREA - localY) / AREA,
    };
  }

  function renderMotionPreview(): HTMLElement {
    const track = el("div.saad-curves-motion-track");
    const progress = el("div.saad-curves-motion-progress");
    const block = el("div.saad-curves-motion-block", null, el("span"));
    track.appendChild(progress);
    track.appendChild(block);
    refs.motionTrack = track;
    refs.motionBlock = block;
    refs.motionProgress = progress;
    return el("div.saad-curves-motion",
      null,
      el("div.saad-curves-motion-label", null, el("span", null, "Motion preview"), el("small", null, "loops")),
      track,
    );
  }

  function renderControls(): HTMLElement {
    const inputs: HTMLInputElement[] = [];
    const controls = el("div.saad-curves-controls",
      null,
      ...(["X1", "Y1", "X2", "Y2"] as const).map((label, index) => {
        const input = el("input", {
          type: "number",
          min: index === 0 || index === 2 ? "0" : "-1.5",
          max: index === 0 || index === 2 ? "1" : "2.5",
          step: "0.01",
          value: current[index].toFixed(2),
          onInput: (event: Event) => {
            const target = event.currentTarget as HTMLInputElement;
            current[index] = (index === 0 || index === 2 ? clamp01(Number(target.value)) : clampOvershoot(Number(target.value))) as never;
            selectedPreset = "custom";
            applyCurveVisuals();
          },
          onBlur: () => render(),
        }) as HTMLInputElement;
        inputs.push(input);
        return el("label.saad-curves-number", null, el("span", null, label), input);
      }),
    );
    refs.inputs = inputs;

    const bezierInput = el("input", {
      value: `cubic-bezier(${current.map((n) => n.toFixed(2)).join(", ")})`,
      placeholder: "paste cubic-bezier(x1,y1,x2,y2)",
      onChange: (event: Event) => {
        const parsed = parseBezier((event.currentTarget as HTMLInputElement).value);
        if (parsed) {
          current = parsed;
          selectedPreset = "custom";
          statusText = "Custom curve loaded.";
        } else {
          statusText = "Invalid bezier. Use cubic-bezier(x1,y1,x2,y2).";
        }
        render();
      },
    }) as HTMLInputElement;
    refs.bezierInput = bezierInput;

    return el("div.saad-curves-controls-shell",
      null,
      controls,
      el("div.saad-curves-bezier-row",
        null,
        bezierInput,
        el("button.btn-secondary", { onClick: () => copyBezier() }, "Copy"),
      ),
    );
  }

  function renderPresetGroup(label: string, group: CurvePreset["group"]): HTMLElement {
    return el("div.saad-curves-preset-group",
      null,
      el("div.saad-curves-preset-heading", null, label),
      el("div.saad-curves-presets", null, ...PRESETS.filter((preset) => preset.group === group).map(renderPresetButton)),
    );
  }

  function renderPresetButton(preset: CurvePreset): HTMLElement {
    return el(`button.saad-curves-preset${selectedPreset === preset.id ? ".active" : ""}`,
      {
        onClick: () => {
          current = [...preset.bezier] as Bezier;
          selectedPreset = preset.id;
          statusText = `${preset.label} preset selected.`;
          render();
        },
      },
      renderMiniCurve(preset.bezier),
      el("span", null, preset.label),
      el("small", null, preset.bezier.map((n) => n.toFixed(2)).join(", ")),
    );
  }

  function renderSelectionSummary(): HTMLElement {
    const host = getHostApp();
    const selectedPproCount = getSelectedPremierePropertyIds().length;
    return el("div.saad-curves-summary",
      null,
      el("h4", null, "Selection"),
      el("dl",
        null,
        el("dt", null, "Host"), el("dd", null, host === "AEFT" ? "After Effects" : host === "PPRO" ? "Premiere Pro" : host),
        host === "PPRO" ? el("dt", null, "Clips") : null,
        host === "PPRO" ? el("dd", null, String(selectionInfo?.clipCount ?? 0)) : null,
        host === "PPRO" ? el("dt", null, "Components") : null,
        host === "PPRO" ? el("dd", null, String(selectionInfo?.componentCount ?? 0)) : null,
        host === "PPRO" ? el("dt", null, "Scanned") : null,
        host === "PPRO" ? el("dd", null, String(selectionInfo?.scannedPropertyCount ?? 0)) : null,
        el("dt", null, "Properties"), el("dd", null, String(selectionInfo?.propertyCount ?? 0)),
        el("dt", null, "Keys"), el("dd", null, String(selectionInfo?.selectedKeyCount ?? 0)),
        el("dt", null, "Pairs"), el("dd", null, String(selectionInfo?.pairCount ?? 0)),
        host === "PPRO" ? el("dt", null, "Selected") : null,
        host === "PPRO" ? el("dd", null, String(selectedPproCount)) : null,
      ),
      selectionInfo?.affectedProperties?.length
        ? el("div.saad-curves-affected",
            null,
            ...selectionInfo.affectedProperties.slice(0, 6).map((name) => el("span", null, name)),
          )
        : null,
      el("p", null, host === "PPRO"
        ? "Premiere CEP does not expose highlighted Effect Controls keyframes directly. This scanner reads selected clips, Effect Controls components, and keyed ComponentParam data that Premiere exposes."
        : "Select two or more consecutive keys on one or more properties, then apply a preset."),
    );
  }

  function renderPremierePropertyPicker(): HTMLElement | null {
    if (getHostApp() !== "PPRO") return null;
    const properties = selectionInfo?.properties ?? [];
    if (!properties.length) {
      return el("div.saad-curves-property-picker.empty",
        null,
        el("div.saad-curves-property-picker-title", null, "Premiere keyed properties"),
        el("p", null, "Select a clip that has two or more keyframes on Motion or Effect properties, then refresh."),
      );
    }

    return el("div.saad-curves-property-picker",
      null,
      el("div.saad-curves-property-picker-head",
        null,
        el("div.saad-curves-property-picker-title", null, "Premiere keyed properties"),
        el("div.saad-curves-property-actions",
          null,
          el("button.btn-secondary", {
            onClick: () => {
              selectedPropertyIds = new Set(properties.map((property) => property.id));
              render();
            },
          }, "All"),
          el("button.btn-secondary", {
            onClick: () => {
              selectedPropertyIds = new Set();
              render();
            },
          }, "None"),
        ),
      ),
      el("div.saad-curves-property-list",
        null,
        ...properties.map((property) =>
          el("label.saad-curves-property-row",
            null,
            el("input", {
              type: "checkbox",
              checked: selectedPropertyIds.has(property.id),
              onChange: (event: Event) => {
                const input = event.currentTarget as HTMLInputElement;
                if (input.checked) selectedPropertyIds.add(property.id);
                else selectedPropertyIds.delete(property.id);
                render();
              },
            }),
            el("span.saad-curves-property-name", null, property.name),
            el("span.saad-curves-property-count", null, `${property.keyCount} keys / ${property.pairCount} pairs`),
          ),
        ),
      ),
    );
  }

  function renderPremiereDiagnostics(): HTMLElement | null {
    if (getHostApp() !== "PPRO") return null;
    const diagnostics = selectionInfo?.diagnostics ?? [];
    if (!diagnostics.length) return null;
    return el("details.saad-curves-diagnostics",
      null,
      el("summary", null, "Effect Controls scan"),
      el("div.saad-curves-diagnostics-list",
        null,
        ...diagnostics.slice(0, 24).map((item) =>
          el("div.saad-curves-diagnostic-row",
            null,
            el("span.saad-curves-diagnostic-name", null, `${item.component} > ${item.property}`),
            el("span.saad-curves-diagnostic-meta", null, `${item.keyCount} keys - ${item.reason}`),
          ),
        ),
      ),
    );
  }

  function applyCurveVisuals() {
    const [x1, y1, x2, y2] = current;
    const p1x = PAD + x1 * AREA;
    const p1y = PAD + AREA - y1 * AREA;
    const p2x = PAD + x2 * AREA;
    const p2y = PAD + AREA - y2 * AREA;
    const d = `M${PAD} ${PAD + AREA} C${p1x} ${p1y}, ${p2x} ${p2y}, ${PAD + AREA} ${PAD}`;
    refs.path?.setAttribute("d", d);
    (main.querySelector(".saad-curves-path-glow") as SVGPathElement | null)?.setAttribute("d", d);
    refs.handle1?.setAttribute("x2", String(p1x));
    refs.handle1?.setAttribute("y2", String(p1y));
    refs.handle2?.setAttribute("x2", String(p2x));
    refs.handle2?.setAttribute("y2", String(p2y));
    refs.point1?.setAttribute("cx", String(p1x));
    refs.point1?.setAttribute("cy", String(p1y));
    refs.point2?.setAttribute("cx", String(p2x));
    refs.point2?.setAttribute("cy", String(p2y));
    if (refs.inputs) {
      refs.inputs.forEach((input, i) => {
        if (document.activeElement !== input) input.value = current[i].toFixed(2);
      });
    }
    if (refs.bezierInput && document.activeElement !== refs.bezierInput) {
      refs.bezierInput.value = `cubic-bezier(${current.map((n) => n.toFixed(2)).join(", ")})`;
    }
  }

  const animStart = performance.now();
  let wasConnected = false;
  function tick(now: number) {
    if (root.isConnected) wasConnected = true;
    else if (wasConnected) return;
    const cycle = 2600;
    const raw = ((now - animStart) % cycle) / cycle;
    // ping-pong for the motion block; single-forward for the ball
    const pingPong = raw < 0.5 ? raw * 2 : 1 - (raw - 0.5) * 2;
    const u = (raw * 1.1) % 1;
    const [x1, y1, x2, y2] = current;
    const bx = 3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u;
    const by = 3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u;
    const px = PAD + bx * AREA;
    const py = PAD + AREA - by * AREA;
    refs.ball?.setAttribute("cx", String(px));
    refs.ball?.setAttribute("cy", String(py));
    refs.timeMark?.setAttribute("x1", String(px));
    refs.timeMark?.setAttribute("x2", String(px));
    refs.valueMark?.setAttribute("y1", String(py));
    refs.valueMark?.setAttribute("y2", String(py));
    if (refs.motionBlock) {
      const eased = solveEasing(pingPong, x1, y1, x2, y2);
      refs.motionBlock.style.transform = `translateX(${eased * 100}%)`;
      if (refs.motionProgress) refs.motionProgress.style.width = `${eased * 100}%`;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  function pproSelectedIds(): string[] | null {
    if (getHostApp() !== "PPRO") return null;
    const properties = selectionInfo?.properties ?? [];
    const valid = new Set(properties.map((p) => p.id));
    const arr = [...selectedPropertyIds].filter((id) => valid.has(id));
    return arr.length ? arr : properties.map((p) => p.id);
  }

  async function refreshKeys() {
    if (!isInsideAdobe()) {
      keysInfo = { ok: false, host: "BROWSER", propertyCount: 0, keyCount: 0, layerCount: 0, message: "Open inside After Effects or Premiere." };
      keysStatus = keysInfo.message;
      render();
      return;
    }
    try {
      keysInfo = await evalES<KeysInspectInfo>("saadKeysInspect");
      keysStatus = keysInfo.message;
      // For Premiere, also refresh the property scan so the picker has fresh data.
      if (getHostApp() === "PPRO") {
        try {
          selectionInfo = await evalES<EasingSelectionInfo>("inspectSaadEaseSelection");
          syncPremierePropertySelection(selectionInfo);
        } catch { /* keep previous */ }
      }
    } catch (error) {
      keysStatus = (error as Error).message;
    }
    render();
  }

  async function runKeys(fn: string, ...args: unknown[]) {
    if (!isInsideAdobe()) {
      keysStatus = "Open inside After Effects or Premiere.";
      render();
      return;
    }
    keysBusy = true;
    keysStatus = "Running...";
    render();
    let opMessage = "";
    let opOk = false;
    try {
      const result = await evalES<KeysOpResult>(fn, ...args);
      opOk = !!result?.ok;
      opMessage = result?.message ?? "Done.";
      if (result?.errors?.length) opMessage += ` — ${result.errors[0]}`;
    } catch (error) {
      opMessage = "ERR: " + (error as Error).message;
    }
    // Refresh counts silently — keep the operation's message on screen so the
    // user can see what happened rather than watching it get overwritten.
    try {
      keysInfo = await evalES<KeysInspectInfo>("saadKeysInspect");
    } catch { /* keep prior counts */ }
    keysBusy = false;
    keysStatus = (opOk ? "✓ " : "⚠ ") + opMessage;
    render();
  }

  async function refreshSelection() {
    if (!isInsideAdobe()) {
      selectionInfo = { ok: false, host: "BROWSER", propertyCount: 0, selectedKeyCount: 0, pairCount: 0, message: "Open inside After Effects or Premiere." };
      statusText = selectionInfo.message;
      render();
      return;
    }
    try {
      selectionInfo = await evalES<EasingSelectionInfo>("inspectSaadEaseSelection");
      syncPremierePropertySelection(selectionInfo);
      statusText = selectionInfo.message;
    } catch (error) {
      statusText = (error as Error).message;
    }
    render();
  }

  async function applyEase() {
    applying = true;
    statusText = "Applying easing...";
    render();
    try {
      const selectedIds = getHostApp() === "PPRO" ? getSelectedPremierePropertyIds() : null;
      if (getHostApp() === "PPRO" && (!selectedIds || selectedIds.length === 0)) {
        statusText = "Choose at least one Premiere keyed property before applying.";
        applying = false;
        render();
        return;
      }
      const result = await evalES<EasingApplyResult>("applySaadEaseToSelectedKeyframes", current.join(","), selectedIds);
      selectionInfo = result;
      syncPremierePropertySelection(selectionInfo);
      statusText = result.ok ? `Applied ${result.appliedPairs} keyframe pair(s).` : result.message;
      if (result.errors?.length) statusText += ` ${result.errors[0]}`;
    } catch (error) {
      statusText = (error as Error).message;
    } finally {
      applying = false;
      render();
    }
  }

  function getSelectedPremierePropertyIds(): string[] {
    const properties = selectionInfo?.properties ?? [];
    const valid = new Set(properties.map((property) => property.id));
    return [...selectedPropertyIds].filter((id) => valid.has(id));
  }

  function syncPremierePropertySelection(nextInfo: EasingSelectionInfo | null) {
    if (getHostApp() !== "PPRO") return;
    const properties = nextInfo?.properties ?? [];
    const valid = new Set(properties.map((property) => property.id));
    const retained = [...selectedPropertyIds].filter((id) => valid.has(id));
    selectedPropertyIds = new Set(retained.length ? retained : properties.map((property) => property.id));
  }

  function copyBezier() {
    const text = `cubic-bezier(${current.join(",")})`;
    navigator.clipboard?.writeText(text).catch(() => undefined);
    statusText = "Bezier copied.";
    render();
  }

  render();
  refreshSelection().catch(() => undefined);
  return root;
}

// Compact icon set for the Keys tab. Each icon uses a 28×20 viewBox and shows
// what the operation does visually (before-state dim, after-state bright).
// Diamonds represent keyframes to match the AE timeline aesthetic.
type IconRecipe = { children: SvgProps[] };

// Diamond helper with optional class for animation targeting
function dm(x: number, y: number, opts: { cls?: string; opacity?: number; r?: number } = {}): SvgProps {
  const r = opts.r ?? 2.6;
  return {
    tag: "path",
    d: `M${x} ${y - r} L${x + r} ${y} L${x} ${y + r} L${x - r} ${y} Z`,
    fill: "currentColor",
    ...(opts.cls ? { class: opts.cls } : {}),
    ...(opts.opacity != null ? { opacity: opts.opacity } : {}),
  };
}

const KEY_ICONS: Record<string, IconRecipe> = {
  refresh: { children: [
    { tag: "path", d: "M4 10 A6 6 0 1 1 10 16", fill: "none", stroke: "currentColor", "stroke-width": 1.6, "stroke-linecap": "round" },
    { tag: "path", d: "M4 6 L4 10 L8 10", fill: "none", stroke: "currentColor", "stroke-width": 1.6, "stroke-linecap": "round", "stroke-linejoin": "round" },
  ] },

  // ── Duplicate / Flip ────────────────────────────────────────────────
  // Two boxed clusters of 3 large diamonds side by side + explicit + separator
  duplicate: { children: [
    // Source cluster (left)
    { tag: "rect", x: 1, y: 5, width: 12, height: 10, rx: 1.5, fill: "none", stroke: "currentColor", "stroke-width": 0.8, opacity: 0.35 },
    dm(3.5, 10, { r: 2.2 }), dm(7, 10, { r: 2.2 }), dm(10.5, 10, { r: 2.2 }),
    // Plus/copy separator
    { tag: "path", d: "M15 7.5 L15 12.5 M12.5 10 L17.5 10", stroke: "currentColor", "stroke-width": 1.2, "stroke-linecap": "round", opacity: 0.65 },
    // Result cluster (right)
    { tag: "rect", x: 17, y: 5, width: 12, height: 10, rx: 1.5, fill: "rgba(34,211,238,0.14)", stroke: "#22d3ee", "stroke-width": 1, class: "sk-ic-fx" },
    dm(19.5, 10, { r: 2.2, cls: "sk-ic-fx" }), dm(23, 10, { r: 2.2, cls: "sk-ic-fx" }), dm(26.5, 10, { r: 2.2, cls: "sk-ic-fx" }),
  ] },
  duplicateFlip: { children: [
    // Source cluster (left) with tiny arrow →
    { tag: "rect", x: 1, y: 5, width: 12, height: 10, rx: 1.5, fill: "none", stroke: "currentColor", "stroke-width": 0.8, opacity: 0.35 },
    dm(3.5, 10, { r: 2.2 }), dm(7, 10, { r: 2.2 }), dm(10.5, 10, { r: 2.2 }),
    { tag: "path", d: "M4 3 L10 3 M9 2 L10 3 L9 4", stroke: "currentColor", "stroke-width": 0.8, fill: "none", "stroke-linecap": "round", opacity: 0.55 },
    // Center flip glyph
    { tag: "path", d: "M14 7 Q15 10 14 13 M16 7 Q15 10 16 13", fill: "none", stroke: "currentColor", "stroke-width": 1, "stroke-linecap": "round", opacity: 0.65 },
    // Result cluster (right) mirrored + tiny arrow ←
    { tag: "rect", x: 17, y: 5, width: 12, height: 10, rx: 1.5, fill: "rgba(34,211,238,0.14)", stroke: "#22d3ee", "stroke-width": 1, class: "sk-ic-fx" },
    dm(19.5, 10, { r: 2.2, cls: "sk-ic-fx" }), dm(23, 10, { r: 2.2, cls: "sk-ic-fx" }), dm(26.5, 10, { r: 2.2, cls: "sk-ic-fx" }),
    { tag: "path", d: "M26 3 L20 3 M21 2 L20 3 L21 4", stroke: "#22d3ee", "stroke-width": 0.8, fill: "none", "stroke-linecap": "round" },
  ] },
  flip: { children: [
    // Big horizontal double arrow — the classic flip symbol
    { tag: "path", d: "M6 6 L2 10 L6 14", fill: "none", stroke: "currentColor", "stroke-width": 1.8, "stroke-linecap": "round", "stroke-linejoin": "round" },
    { tag: "path", d: "M24 6 L28 10 L24 14", fill: "none", stroke: "currentColor", "stroke-width": 1.8, "stroke-linecap": "round", "stroke-linejoin": "round" },
    { tag: "line", x1: 3, y1: 10, x2: 27, y2: 10, stroke: "currentColor", "stroke-width": 1.6, "stroke-linecap": "round" },
    // Two keyframe hints on the mirror line
    dm(11, 10, { r: 2, cls: "sk-ic-swap-a" }), dm(19, 10, { r: 2, cls: "sk-ic-swap-b" }),
  ] },

  // ── Align ───────────────────────────────────────────────────────────
  alignFirstCTI: { children: [
    { tag: "line", x1: 4, y1: 2, x2: 4, y2: 18, stroke: "#22d3ee", "stroke-width": 1.8, class: "sk-ic-cti" },
    dm(4, 10, { cls: "sk-ic-anchor" }), dm(13, 10), dm(22, 10),
  ] },
  alignLastCTI: { children: [
    { tag: "line", x1: 24, y1: 2, x2: 24, y2: 18, stroke: "#22d3ee", "stroke-width": 1.8, class: "sk-ic-cti" },
    dm(6, 10), dm(15, 10), dm(24, 10, { cls: "sk-ic-anchor" }),
  ] },
  alignFirstIn: { children: [
    { tag: "path", d: "M2 3 L2 17 M2 3 L5 3 M2 17 L5 17", stroke: "currentColor", "stroke-width": 1.6, fill: "none" },
    dm(6, 10, { cls: "sk-ic-anchor" }), dm(15, 10), dm(24, 10),
  ] },
  alignLastOut: { children: [
    { tag: "path", d: "M26 3 L26 17 M26 3 L23 3 M26 17 L23 17", stroke: "currentColor", "stroke-width": 1.6, fill: "none" },
    dm(4, 10), dm(13, 10), dm(22, 10, { cls: "sk-ic-anchor" }),
  ] },

  // ── Stagger + Distribute ────────────────────────────────────────────
  staggerAsc: { children: [
    { tag: "line", x1: 2, y1: 18, x2: 26, y2: 18, stroke: "currentColor", "stroke-width": 0.6, opacity: 0.3 },
    dm(3, 16, { cls: "sk-ic-s1" }), dm(9, 12, { cls: "sk-ic-s2" }), dm(17, 8, { cls: "sk-ic-s3" }), dm(25, 4, { cls: "sk-ic-s4" }),
  ] },
  staggerDesc: { children: [
    { tag: "line", x1: 2, y1: 18, x2: 26, y2: 18, stroke: "currentColor", "stroke-width": 0.6, opacity: 0.3 },
    dm(3, 4, { cls: "sk-ic-s1" }), dm(9, 8, { cls: "sk-ic-s2" }), dm(17, 12, { cls: "sk-ic-s3" }), dm(25, 16, { cls: "sk-ic-s4" }),
  ] },
  staggerRandom: { children: [
    { tag: "line", x1: 2, y1: 18, x2: 26, y2: 18, stroke: "currentColor", "stroke-width": 0.6, opacity: 0.3 },
    dm(4, 11, { cls: "sk-ic-r1" }), dm(10, 5, { cls: "sk-ic-r2" }), dm(17, 13, { cls: "sk-ic-r3" }), dm(24, 7, { cls: "sk-ic-r4" }),
  ] },
  distribute: { children: [
    // Baseline
    { tag: "line", x1: 2, y1: 12, x2: 28, y2: 12, stroke: "currentColor", "stroke-width": 0.8, opacity: 0.35 },
    // 4 evenly spaced dots
    dm(3, 12, { r: 2.2 }), dm(11, 12, { r: 2.2 }), dm(19, 12, { r: 2.2 }), dm(27, 12, { r: 2.2 }),
    // Bidirectional arrows showing equal gaps
    { tag: "path", d: "M6 17 L8 17 M7 16 L8 17 L7 18", stroke: "currentColor", "stroke-width": 1, fill: "none", "stroke-linecap": "round" },
    { tag: "path", d: "M14 17 L16 17 M15 16 L16 17 L15 18", stroke: "currentColor", "stroke-width": 1, fill: "none", "stroke-linecap": "round" },
    { tag: "path", d: "M22 17 L24 17 M23 16 L24 17 L23 18", stroke: "currentColor", "stroke-width": 1, fill: "none", "stroke-linecap": "round" },
  ] },

  // ── Stretch ─────────────────────────────────────────────────────────
  stretchFromFirst: { children: [
    dm(3, 10, { cls: "sk-ic-anchor" }), dm(9, 10, { opacity: 0.45 }), dm(15, 10, { opacity: 0.45 }),
    dm(12, 10, { cls: "sk-ic-fx" }), dm(21, 10, { cls: "sk-ic-fx" }),
    // arrow right showing expansion
    { tag: "path", d: "M22 15 L26 15 M25 14 L26 15 L25 16", stroke: "currentColor", "stroke-width": 1.2, fill: "none", "stroke-linecap": "round" },
    { tag: "line", x1: 3, y1: 3, x2: 3, y2: 17, stroke: "#22d3ee", "stroke-width": 0.8, opacity: 0.5 },
  ] },
  stretchFromLast: { children: [
    dm(15, 10, { opacity: 0.45 }), dm(21, 10, { opacity: 0.45 }), dm(27, 10, { cls: "sk-ic-anchor" }),
    dm(9, 10, { cls: "sk-ic-fx" }), dm(18, 10, { cls: "sk-ic-fx" }),
    { tag: "path", d: "M8 15 L4 15 M5 14 L4 15 L5 16", stroke: "currentColor", "stroke-width": 1.2, fill: "none", "stroke-linecap": "round" },
    { tag: "line", x1: 27, y1: 3, x2: 27, y2: 17, stroke: "#22d3ee", "stroke-width": 0.8, opacity: 0.5 },
  ] },
  stretchFromCTI: { children: [
    { tag: "line", x1: 15, y1: 2, x2: 15, y2: 18, stroke: "#22d3ee", "stroke-width": 1.6 },
    dm(11, 10, { opacity: 0.45 }), dm(19, 10, { opacity: 0.45 }),
    dm(5, 10, { cls: "sk-ic-fx" }), dm(25, 10, { cls: "sk-ic-fx" }),
    { tag: "path", d: "M6 15 L3 15 M4 14 L3 15 L4 16 M24 15 L27 15 M26 14 L27 15 L26 16", stroke: "currentColor", "stroke-width": 1.2, fill: "none", "stroke-linecap": "round" },
  ] },

  // ── Copy / Paste ────────────────────────────────────────────────────
  // Classic "two overlapping papers" copy icon
  copy: { children: [
    { tag: "rect", x: 3, y: 2, width: 11, height: 13, rx: 1.5, fill: "rgba(34,211,238,0.1)", stroke: "currentColor", "stroke-width": 1.2 },
    dm(6, 8, { r: 1.5 }), dm(9, 8, { r: 1.5 }),
    { tag: "line", x1: 5, y1: 12, x2: 12, y2: 12, stroke: "currentColor", "stroke-width": 0.6, opacity: 0.5 },
    // second paper shifted (the copy)
    { tag: "rect", x: 8, y: 5, width: 11, height: 13, rx: 1.5, fill: "rgba(34,211,238,0.2)", stroke: "#22d3ee", "stroke-width": 1.2, class: "sk-ic-fx" },
    dm(11, 11, { r: 1.5, cls: "sk-ic-fx" }), dm(14, 11, { r: 1.5, cls: "sk-ic-fx" }),
    { tag: "line", x1: 10, y1: 15, x2: 17, y2: 15, stroke: "#22d3ee", "stroke-width": 0.6, opacity: 0.7, class: "sk-ic-fx" },
  ] },
  pasteAbs: { children: [
    // Clipboard body
    { tag: "rect", x: 4, y: 4, width: 22, height: 14, rx: 1.5, fill: "none", stroke: "currentColor", "stroke-width": 1.2 },
    { tag: "rect", x: 11, y: 2, width: 8, height: 3, rx: 0.8, fill: "currentColor" },
    // Diamonds "dropping in" from top vertically (absolute)
    { tag: "path", d: "M9 6 L9 10 M7 9 L9 10 L11 9", stroke: "#22d3ee", "stroke-width": 1.2, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round", class: "sk-ic-fx" },
    dm(9, 13, { r: 1.6, cls: "sk-ic-fx" }), dm(15, 13, { r: 1.6, cls: "sk-ic-fx" }), dm(21, 13, { r: 1.6, cls: "sk-ic-fx" }),
    { tag: "line", x1: 6, y1: 16, x2: 24, y2: 16, stroke: "currentColor", "stroke-width": 0.6, opacity: 0.4 },
  ] },
  pasteRel: { children: [
    { tag: "rect", x: 4, y: 4, width: 22, height: 14, rx: 1.5, fill: "none", stroke: "currentColor", "stroke-width": 1.2 },
    { tag: "rect", x: 11, y: 2, width: 8, height: 3, rx: 0.8, fill: "currentColor" },
    // Diagonal arrow (offset/relative)
    { tag: "path", d: "M23 7 L26 4 M23 4 L26 4 L26 7", stroke: "#22d3ee", "stroke-width": 1.2, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round", class: "sk-ic-fx" },
    dm(9, 13, { r: 1.6, cls: "sk-ic-fx" }), dm(15, 13, { r: 1.6, cls: "sk-ic-fx" }), dm(21, 13, { r: 1.6, cls: "sk-ic-fx" }),
    { tag: "line", x1: 6, y1: 16, x2: 24, y2: 16, stroke: "currentColor", "stroke-width": 0.6, opacity: 0.4 },
  ] },

  // ── Misc ────────────────────────────────────────────────────────────
  nearestFrame: { children: [
    // Grid
    { tag: "line", x1: 4, y1: 3, x2: 4, y2: 17, stroke: "currentColor", "stroke-width": 0.6, opacity: 0.3 },
    { tag: "line", x1: 11, y1: 3, x2: 11, y2: 17, stroke: "currentColor", "stroke-width": 0.6, opacity: 0.3 },
    { tag: "line", x1: 18, y1: 3, x2: 18, y2: 17, stroke: "currentColor", "stroke-width": 0.6, opacity: 0.3 },
    { tag: "line", x1: 25, y1: 3, x2: 25, y2: 17, stroke: "currentColor", "stroke-width": 0.6, opacity: 0.3 },
    // dot at off-grid position (dim) + snapped (bright)
    dm(13, 10, { opacity: 0.4 }), dm(11, 10, { cls: "sk-ic-fx" }),
    dm(21, 10, { opacity: 0.4 }), dm(18, 10, { cls: "sk-ic-fx" }),
  ] },
  constantSpeed: { children: [
    { tag: "line", x1: 3, y1: 16, x2: 25, y2: 4, stroke: "currentColor", "stroke-width": 1.6, "stroke-linecap": "round" },
    dm(3, 16), dm(14, 10), dm(25, 4),
  ] },
  overlapClean: { children: [
    // Two overlapping diamonds merging into one
    dm(10, 10, { opacity: 0.55, cls: "sk-ic-swap-a" }), dm(12, 10, { opacity: 0.55, cls: "sk-ic-swap-b" }),
    // Result: one clean diamond on the right
    dm(22, 10, { cls: "sk-ic-fx" }),
    // Arrow
    { tag: "path", d: "M15 10 L19 10 M18 9 L19 10 L18 11", stroke: "currentColor", "stroke-width": 1.2, fill: "none", "stroke-linecap": "round" },
  ] },

  // ── Shift ───────────────────────────────────────────────────────────
  shift10Left: { children: [
    { tag: "path", d: "M11 4 L4 10 L11 16 M19 4 L12 10 L19 16", fill: "none", stroke: "currentColor", "stroke-width": 1.8, "stroke-linecap": "round", "stroke-linejoin": "round" },
  ] },
  shift1Left: { children: [
    { tag: "path", d: "M15 4 L7 10 L15 16", fill: "none", stroke: "currentColor", "stroke-width": 1.8, "stroke-linecap": "round", "stroke-linejoin": "round" },
  ] },
  shift1Right: { children: [
    { tag: "path", d: "M9 4 L17 10 L9 16", fill: "none", stroke: "currentColor", "stroke-width": 1.8, "stroke-linecap": "round", "stroke-linejoin": "round" },
  ] },
  shift10Right: { children: [
    { tag: "path", d: "M5 4 L12 10 L5 16 M13 4 L20 10 L13 16", fill: "none", stroke: "currentColor", "stroke-width": 1.8, "stroke-linecap": "round", "stroke-linejoin": "round" },
  ] },
};

function keysIcon(name: string): SVGElement {
  const recipe = KEY_ICONS[name];
  const svg = svgEl("svg", { class: `sk-icon sk-icon--${name}`, viewBox: "0 0 30 20", width: 28, height: 18, "aria-hidden": "true" });
  if (!recipe) return svg;
  for (const child of recipe.children) {
    const tag = String(child.tag);
    const props: SvgProps = { ...child };
    delete (props as { tag?: unknown }).tag;
    svg.appendChild(svgEl(tag, props));
  }
  return svg;
}

// After Effects layer label colors (indices 0..16). Approximates AE's default swatches.
const LABEL_COLORS = [
  "#4a4a4a", "#c53939", "#cf9f00", "#c58a4a", "#c04a9a", "#8f4ac3", "#5b6cbf",
  "#4a9fcf", "#3f9c8b", "#4fb84a", "#a3c74a", "#c5c04a", "#c0794a", "#a58b7a",
  "#e0a5a5", "#5a5a5a", "#8a8a8a",
];
function labelColor(index: number): string {
  return LABEL_COLORS[index] ?? "#666";
}

function renderMiniCurve(bezier: Bezier): HTMLElement {
  const w = 64, h = 60, pad = 8;
  const [x1, y1, x2, y2] = bezier;
  const path = `M${pad} ${h - pad} C${pad + x1 * (w - 2 * pad)} ${h - pad - y1 * (h - 2 * pad)}, ${pad + x2 * (w - 2 * pad)} ${h - pad - y2 * (h - 2 * pad)}, ${w - pad} ${pad}`;
  const guide = `M${pad} ${h - pad} L${w - pad} ${pad}`;
  const svg = svgEl("svg", { class: "saad-curves-mini", viewBox: `0 0 ${w} ${h}`, "aria-hidden": "true" },
    svgEl("path", { d: guide, class: "saad-curves-mini-guide" }),
    svgEl("path", { d: path, class: "saad-curves-mini-path" }),
    svgEl("circle", { cx: pad, cy: h - pad, r: 2, class: "saad-curves-mini-dot" }),
    svgEl("circle", { cx: w - pad, cy: pad, r: 2, class: "saad-curves-mini-dot" }),
    svgEl("circle", { cx: pad, cy: h - pad, r: 3, class: "saad-curves-mini-ball" }),
  );
  return svg as unknown as HTMLElement;
}

function svgEl(tag: string, props: SvgProps | null = null, ...children: Node[]): SVGElement {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value == null || value === false) continue;
      node.setAttribute(key, String(value));
    }
  }
  for (const child of children) node.appendChild(child);
  return node;
}

function parseBezier(value: string): Bezier | null {
  const match = value.match(/(?:cubic-bezier\()?([\d.\-\s,]+)\)?/i);
  if (!match) return null;
  const parts = match[1].split(",").map((part) => Number(part.trim()));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return null;
  return [clamp01(parts[0]), clampOvershoot(parts[1]), clamp01(parts[2]), clampOvershoot(parts[3])] as Bezier;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clampOvershoot(value: number): number {
  return Math.max(-1.5, Math.min(2.5, value));
}

// Solve cubic bezier easing: given progress t in [0,1] along the x axis,
// return the eased y value. Uses Newton-Raphson with bisection fallback.
function solveEasing(t: number, x1: number, y1: number, x2: number, y2: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const bx = (u: number) => 3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u;
  const by = (u: number) => 3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u;
  const dbx = (u: number) => 3 * (1 - u) * (1 - u) * x1 + 6 * (1 - u) * u * (x2 - x1) + 3 * u * u * (1 - x2);
  let u = t;
  for (let i = 0; i < 6; i++) {
    const err = bx(u) - t;
    if (Math.abs(err) < 1e-4) return by(u);
    const slope = dbx(u);
    if (Math.abs(slope) < 1e-6) break;
    u -= err / slope;
  }
  let lo = 0, hi = 1;
  u = t;
  for (let i = 0; i < 24; i++) {
    const cx = bx(u);
    if (Math.abs(cx - t) < 1e-4) break;
    if (cx < t) lo = u; else hi = u;
    u = (lo + hi) / 2;
  }
  return by(u);
}
