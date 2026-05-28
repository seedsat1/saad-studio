/** Home page — header, promo card, recent generations strip, apps grid. */

import { el } from "../lib/dom";
import { Header } from "../components/header";
import { PromoCard } from "../components/promo-card";
import { RecentStrip } from "../components/recent-strip";
import { AppsGrid } from "../components/apps-grid";
import { findApp } from "../lib/apps";

export function HomePage(): HTMLElement {
  const reframe = findApp("reframe")!;
  return el("div.col", { style: { height: "100%" } },
    Header(),
    el("div.app-main",
      null,
      PromoCard({
        eyebrow: "Featured",
        title: "Reframe in one tap",
        subtitle: "Shift any clip to a new aspect ratio while keeping the subject centered.",
        ctaLabel: "Try now",
        target: reframe,
      }),
      el("section.section",
        null,
        el("div.section__head",
          null,
          el("h3.section__title", null, "Recent generations"),
          el("span.section__hint", null, "From your account"),
        ),
        RecentStrip(),
      ),
      el("section.section",
        null,
        el("div.section__head",
          null,
          el("h3.section__title", null, "Apps"),
          el("span.section__hint", null, "Pick a tool"),
        ),
        AppsGrid(),
      ),
    ),
  );
}
