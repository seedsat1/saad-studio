/** Grid of AI tools rendered from the apps catalog.
 *
 * Each tile is a vertical launcher card:
 *   - circular dark container holding the brand-coloured icon glyph
 *   - centered tool name below
 *   - optional pill chip ("NEW" / "Coming soon") floating over the icon
 *
 * The per-tool colour comes from AppDef.color and is applied through a
 * CSS custom property so we don't have to inline every tile's styles. */

import { el } from "../lib/dom";
import { icon } from "../lib/icons";
import { navigate } from "../lib/router";
import { APPS, type AppDef } from "../lib/apps";

export function AppsGrid(): HTMLElement {
  return el("div.apps-grid", null, ...APPS.map(AppTile));
}

function AppTile(app: AppDef): HTMLElement {
  const tile = el("button.app-tile",
    {
      onClick: () => navigate(app.route),
      style: app.color ? { "--app-color": app.color } as Record<string, string> : undefined,
      "aria-label": app.name,
      title: app.description,
    },
    el("div.app-tile__icon-wrap",
      null,
      el("div.app-tile__icon-bubble", null, icon(app.icon, 28)),
      app.comingSoon
        ? el("span.app-tile__pill.app-tile__pill--soon", null, "Coming soon")
        : app.badge
          ? el("span.app-tile__pill.app-tile__pill--new", null, app.badge)
          : null,
    ),
    el("div.app-tile__name", null, app.name),
  );
  return tile;
}
