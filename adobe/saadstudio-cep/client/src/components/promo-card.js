/** Feature promo card on the home page.
 *
 * Highlights one tool the user might not have discovered. Pulled from a
 * static slot for now; later this can be driven by a backend endpoint
 * (e.g. /api/panel/promo) so marketing can rotate it without redeploying
 * the plugin. */
import { el } from "../lib/dom";
import { icon } from "../lib/icons";
import { navigate } from "../lib/router";
export function PromoCard(slot) {
    return el("div.promo-card", null, el("div.promo-card__eyebrow", null, slot.eyebrow), el("h2.promo-card__title", null, slot.title), el("p.promo-card__subtitle", null, slot.subtitle), el("button.promo-card__cta", { onClick: () => navigate(slot.target.route) }, slot.ctaLabel, icon("arrow-up-right", 14)));
}
