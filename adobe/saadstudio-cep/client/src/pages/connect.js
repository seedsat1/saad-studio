/** Token connect screen.
 *
 * Shown when the user has no valid panel token. Walks them through the
 * three-step flow: open the website, generate a token, paste it back into
 * the plugin. The "open" button uses CEP's openURLInDefaultBrowser so the
 * user lands on saadstudio.app/panel in their normal browser session
 * (where they're already signed in via Clerk). */
import { el } from "../lib/dom";
import { icon } from "../lib/icons";
import { openExternal } from "../lib/cep";
import { API_BASE } from "../lib/api";
import { setToken, looksLikePanelToken } from "../lib/auth";
import { store } from "../lib/store";
import { navigate } from "../lib/router";
import { toast } from "../lib/toast";
export function ConnectPage() {
    const input = el("textarea", {
        rows: "3",
        placeholder: "Paste your panel token (ssp_…)",
        style: {
            width: "100%",
            padding: "10px 12px",
            borderRadius: "10px",
            background: "var(--bg-input)",
            border: "1px solid var(--line-medium)",
            color: "var(--text-primary)",
            resize: "vertical",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
        },
    });
    const connectBtn = el("button.btn-primary", {
        onClick: async () => {
            const value = input.value.trim();
            if (!looksLikePanelToken(value)) {
                toast("That doesn't look like a panel token.", "error");
                return;
            }
            setToken(value);
            try {
                await store.refreshUser();
                if (!store.get().user)
                    throw new Error(store.get().userError ?? "Token rejected");
                toast("Connected to Saad Studio", "success");
                navigate("/");
            }
            catch (err) {
                toast(`Could not verify token: ${err.message}`, "error");
            }
        },
    }, icon("check", 14), "Connect");
    const step = (n, label, child) => el("div.row.gap-3", { style: { alignItems: "flex-start", padding: "10px 0" } }, el("div", {
        style: {
            width: "22px", height: "22px",
            borderRadius: "11px",
            background: "var(--brand-primary-soft)",
            color: "var(--brand-primary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "11px", fontWeight: "700", flexShrink: "0",
        },
    }, String(n)), el("div.col.gap-2.grow", null, el("div", { style: { fontSize: "13px", color: "var(--text-primary)" } }, label), child));
    return el("div.col", { style: { height: "100%", justifyContent: "center", padding: "32px 24px" } }, el("div", {
        style: {
            margin: "0 auto",
            width: "100%",
            maxWidth: "420px",
            background: "var(--bg-card)",
            border: "1px solid var(--line-soft)",
            borderRadius: "20px",
            padding: "24px",
        },
    }, el("div.row.gap-3", { style: { marginBottom: "16px" } }, el("div.app-header__logo", null, "SA"), el("div.col", null, el("div", { style: { fontSize: "16px", fontWeight: "700" } }, "Connect to Saad Studio"), el("div.dim", { style: { fontSize: "12px" } }, "Sign in once to start generating."))), step(1, "Open your account page on saadstudio.app.", el("button.btn-secondary", { onClick: () => openExternal(`${API_BASE}/panel`) }, icon("arrow-up-right", 12), "Open saadstudio.app")), step(2, "Generate a panel token and copy it."), step(3, "Paste the token below and tap Connect.", input), el("div", { style: { marginTop: "16px" } }, connectBtn)));
}
