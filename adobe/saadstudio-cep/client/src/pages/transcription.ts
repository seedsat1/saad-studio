/** Transcription — Reap /create-transcription.
 *
 * Reap returns word-level timestamped JSON. We render it as pretty-
 * printed text with a Copy button instead of trying to embed a player. */

import { el } from "../lib/dom";
import { ReapToolPage } from "./reap-tool-page";
import { toast } from "../lib/toast";

export function TranscriptionPage(): HTMLElement {
  return ReapToolPage({
    title: "Transcription",
    tool: "transcription",
    hint: "Generate a word-level timestamped transcript from the source clip.",
    options: [],
    buildOptions: () => ({}),
    renderResult: (status) => {
      const transcript = pickTranscriptText(status.metadata);
      const json = status.metadata
        ? JSON.stringify(status.metadata, null, 2)
        : "";

      return el("div.col.gap-3", null,
        el("div.state-card",
          null,
          el("div.state-card__icon", null,
            // small inline icon — keep import surface tiny
            (() => {
              const wrap = document.createElement("span");
              wrap.textContent = "📝";
              return wrap;
            })(),
          ),
          el("div.state-card__title", null, "Transcript ready"),
          el("div.state-card__subtitle", null,
            "Copy the text or download the timestamped JSON below."),
        ),
        transcript
          ? el("div.col.gap-2",
              null,
              el("div.row.gap-2", null,
                el("button.btn-primary", {
                  onClick: () => navigator.clipboard.writeText(transcript)
                    .then(() => toast("Transcript copied", "success"))
                    .catch(() => toast("Copy failed", "error")),
                }, "Copy plain text"),
                el("button.btn-secondary", {
                  onClick: () => navigator.clipboard.writeText(json)
                    .then(() => toast("JSON copied", "success"))
                    .catch(() => toast("Copy failed", "error")),
                }, "Copy JSON"),
              ),
              el("pre.mono", {
                style: {
                  marginTop: "8px",
                  padding: "12px",
                  background: "var(--bg-input)",
                  border: "1px solid var(--line-soft)",
                  borderRadius: "10px",
                  fontSize: "11px",
                  lineHeight: "1.5",
                  maxHeight: "360px",
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  textAlign: "left",
                },
              }, transcript),
            )
          : el("pre.mono", {
              style: {
                padding: "12px",
                background: "var(--bg-input)",
                border: "1px solid var(--line-soft)",
                borderRadius: "10px",
                fontSize: "10px",
                lineHeight: "1.4",
                maxHeight: "360px",
                overflow: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                textAlign: "left",
              },
            }, json || "(Empty result.)"),
      );
    },
  });
}

function pickTranscriptText(meta: Record<string, unknown> | undefined): string {
  if (!meta) return "";
  const candidates: string[] = [];

  const direct = meta.transcript ?? meta.text ?? meta.fullText;
  if (typeof direct === "string") candidates.push(direct);

  const segments = meta.segments ?? meta.words;
  if (Array.isArray(segments)) {
    const joined = segments
      .map((s) => {
        if (typeof s === "string") return s;
        if (s && typeof s === "object") {
          const r = s as Record<string, unknown>;
          return typeof r.text === "string" ? r.text
            : typeof r.word === "string" ? r.word
            : "";
        }
        return "";
      })
      .filter(Boolean)
      .join(" ");
    if (joined) candidates.push(joined);
  }

  return candidates.find((s) => s.trim().length) ?? "";
}
