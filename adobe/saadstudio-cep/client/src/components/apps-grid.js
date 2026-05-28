/** Grid of AI tools rendered from the apps catalog. */
import { el } from "../lib/dom";
import { icon } from "../lib/icons";
import { navigate } from "../lib/router";
import { APPS } from "../lib/apps";
export function AppsGrid() {
    return el("div.apps-grid", null, ...APPS.map(AppTile));
}
function AppTile(app) {
    return el("button.app-tile", { onClick: () => navigate(app.route) }, app.badge ? el("span.app-tile__badge", null, app.badge) : null, el("div.app-tile__icon", null, icon(app.icon, 18)), el("div.col.gap-1", null, el("div.app-tile__name", null, app.name), el("div.app-tile__desc", null, app.description)));
}
