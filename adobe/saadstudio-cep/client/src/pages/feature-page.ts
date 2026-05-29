/** Generic feature-page shell used by every tool route.
 *
 * Renders the header + result area + a configured PromptDock at the bottom.
 * Each concrete tool (image-gen, video-gen, reframe, …) just wires options
 * and an onSubmit that calls the matching api method, then drops the
 * returned asset into the result strip. */

import { el } from "../lib/dom";
import { Header } from "../components/header";
import { PageHeader } from "../components/page-header";
import { PromptDock, type DockConfig } from "../components/prompt-dock";
import { RecentStrip } from "../components/recent-strip";
import { icon } from "../lib/icons";
import { evalES } from "../lib/cep";
import { api, type JobStatus } from "../lib/api";
import { toast } from "../lib/toast";
import { store } from "../lib/store";

export interface FeatureConfig {
  title: string;
  galleryKind?: "image" | "video";
  /** Dock placeholder, options + the request body the dock should produce. */
  dock: Omit<DockConfig, "onSubmit">;
  /** Build the request body and hit the API. Return the (queued) job. */
  submit: (input: { prompt: string; attachments: File[]; options: Record<string, string> }) =>
    Promise<JobStatus>;
}

export function FeaturePage(cfg: FeatureConfig): HTMLElement {
  const preview = el("div.col.gap-3", { style: { padding: "0 16px" } });
  const gallery = RecentStrip({
    fixedFilter: cfg.galleryKind,
    showToolbar: false,
    showNewTile: false,
  });
  const results = el("div.col.gap-4",
    null,
    preview,
    el("section.section",
      { style: { padding: "0 16px 16px" } },
      el("div.section__head",
        null,
        el("h3.section__title", null, cfg.galleryKind === "video" ? "Your videos" : "Your images"),
        el("span.section__hint", null, "From your account"),
      ),
      gallery,
    ),
  );

  const setBusy = (busy: boolean) => {
    if (busy) {
      preview.replaceChildren(busyCard());
    }
  };

  const dock = PromptDock({
    ...cfg.dock,
    onSubmit: async (input) => {
      try {
        setBusy(true);
        const job = await cfg.submit(input);
        let final: JobStatus = job;
        if (job.status !== "succeeded" && job.status !== "failed") {
          final = await api.pollJob(job.id);
        }
        if (final.status === "failed" || !final.result) {
          throw new Error(final.error ?? "Generation failed");
        }
        preview.replaceChildren(resultCard(final, preview));
        store.refreshCreditsOnly();
        store.refreshRecent();
      } catch (err) {
        preview.replaceChildren(errorCard((err as Error).message));
        toast((err as Error).message, "error");
      }
    },
  });

  return el("div.col", { style: { height: "100%" } },
    Header(),
    PageHeader(cfg.title),
    el("div.app-main", null, results),
    dock,
  );
}

function busyCard(): HTMLElement {
  return el("div.state-card",
    null,
    el("div.state-card__icon", null, icon("spark", 22)),
    el("div.state-card__title", null, "Working…"),
    el("div.state-card__subtitle", null, "Your generation is in the queue. This usually takes 30–90 seconds."),
  );
}

function errorCard(message: string): HTMLElement {
  return el("div.state-card", null,
    el("div.state-card__title", null, "Generation failed"),
    el("div.state-card__subtitle", null, message),
  );
}

function resultCard(job: JobStatus, _host: HTMLElement): HTMLElement {
  const r = job.result!;
  const preview = r.kind === "video"
    ? el("video", { src: r.url, controls: "true", playsinline: "true",
        style: { width: "100%", borderRadius: "12px", display: "block" } })
    : el("img", { src: r.url, alt: r.prompt ?? "",
        style: { width: "100%", borderRadius: "12px", display: "block" } });

  return el("div.col.gap-3", null,
    el("div", {
      style: { borderRadius: "14px", overflow: "hidden", background: "var(--bg-card)",
               border: "1px solid var(--line-soft)" },
    }, preview),
    el("div.row.gap-2", null,
      el("button.btn-primary", {
        onClick: async () => {
          try {
            const local = await api.downloadAsset(r.url, `${r.id}.${r.kind === "video" ? "mp4" : "png"}`);
            await evalES("importMediaFromPath", local);
            toast("Imported to project bin", "success");
          } catch (err) {
            toast(`Import failed: ${(err as Error).message}`, "error");
          }
        },
      }, icon("import", 14), "Import to project"),
      el("button.btn-secondary", {
        onClick: () => navigator.clipboard.writeText(r.url).then(() => toast("Link copied")),
      }, "Copy link"),
    ),
    r.prompt
      ? el("div.dim", { style: { fontSize: "12px", padding: "4px 4px 8px" } }, r.prompt)
      : null,
  );
}
