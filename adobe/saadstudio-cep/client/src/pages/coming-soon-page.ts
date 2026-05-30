/** Shared shell for tools that aren't wired to an upstream API yet
 *  (Audiogram, Noise removal, Eye correction). Renders a placeholder
 *  card with a "Notify me" CTA so the entry stays in the apps catalog
 *  and tells the user it's tracked. */

import { el } from "../lib/dom";
import { Header } from "../components/header";
import { PageHeader } from "../components/page-header";
import { icon, type IconName } from "../lib/icons";
import { openExternal } from "../lib/cep";
import { getApiBase } from "../lib/api";

export interface ComingSoonConfig {
  title: string;
  /** Big icon shown above the title. */
  icon: IconName;
  /** One-line description of what the tool will eventually do. */
  description: string;
  /** Optional URL the "Notify me" button opens; defaults to the
   *  saadstudio.app roadmap page. */
  notifyUrl?: string;
}

export function ComingSoonPage(cfg: ComingSoonConfig): HTMLElement {
  const url = cfg.notifyUrl ?? `${getApiBase()}/roadmap`;

  return el("div.col", { style: { height: "100%" } },
    Header(),
    PageHeader(cfg.title),
    el("div.app-main",
      null,
      el("div.state-card",
        {
          style: {
            margin: "32px auto",
            maxWidth: "360px",
            padding: "28px 24px",
            textAlign: "center",
          },
        },
        el("div.state-card__icon",
          {
            style: {
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "var(--brand-primary-soft)",
              color: "var(--brand-primary)",
            },
          },
          icon(cfg.icon, 26),
        ),
        el("div", {
          style: {
            display: "inline-block",
            fontSize: "10px",
            fontWeight: "700",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "3px 10px",
            borderRadius: "999px",
            background: "var(--brand-primary-soft)",
            color: "var(--brand-primary)",
            margin: "8px 0 12px",
          },
        }, "Coming soon"),
        el("div.state-card__title",
          { style: { fontSize: "17px" } },
          cfg.title),
        el("div.state-card__subtitle",
          { style: { marginTop: "8px", lineHeight: "1.5" } },
          cfg.description),
        el("div.state-card__actions",
          { style: { marginTop: "20px" } },
          el("button.btn-primary",
            { onClick: () => openExternal(url) },
            icon("arrow-up-right", 14), "Notify me when ready",
          ),
        ),
      ),
    ),
  );
}
