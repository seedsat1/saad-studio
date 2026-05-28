/** Entry for the dedicated "Draw to Edit" CEP panel (manifest extension id
 *  app.saadstudio.cep.draw). For now this just mounts the same DrawToVideo
 *  page used inside the main panel — the docked panel form factor gives
 *  more canvas room. */
import { loadExtendScript, isInsideAdobe } from "./lib/cep";
import { getToken } from "./lib/auth";
import { DrawToVideoPage } from "./pages/draw-to-video";
import { ConnectPage } from "./pages/connect";
async function bootstrap() {
    if (isInsideAdobe())
        await loadExtendScript();
    const host = document.getElementById("app");
    if (!host)
        return;
    host.replaceChildren(getToken() ? DrawToVideoPage() : ConnectPage());
}
bootstrap().catch((err) => console.error("[draw panel]", err));
