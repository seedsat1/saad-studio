/** Main panel entry point.
 *
 * Wires the router, runs the auth gate, and loads the ExtendScript bundle
 * on startup. Each route returns the page element to mount. */

import { configureRouter, navigate } from "./lib/router";
import { loadExtendScript, isInsideAdobe } from "./lib/cep";
import { getToken } from "./lib/auth";
import { store } from "./lib/store";

import { HomePage } from "./pages/home";
import { ConnectPage } from "./pages/connect";
import { ImageGenPage } from "./pages/image-gen";
import { VideoGenPage } from "./pages/video-gen";
import { TransitionsPage } from "./pages/transitions";
import { EditVideoPage } from "./pages/edit-video";
import { AvatarProPage } from "./pages/avatar-pro";
import { ReframePage } from "./pages/reframe";
import { RemoveBgPage } from "./pages/remove-bg";
import { UpscalePage } from "./pages/upscale";
import { DrawToVideoPage } from "./pages/draw-to-video";

async function bootstrap() {
  if (isInsideAdobe()) {
    await loadExtendScript();
  }

  const host = document.getElementById("app");
  if (!host) throw new Error("#app root missing");

  const requireAuth = (page: () => HTMLElement) => () => {
    if (!getToken()) return ConnectPage();
    return page();
  };

  configureRouter({
    host,
    routes: {
      "/": requireAuth(HomePage),
      "/connect": ConnectPage,
      "/image-gen": requireAuth(ImageGenPage),
      "/video-gen": requireAuth(VideoGenPage),
      "/transitions": requireAuth(TransitionsPage),
      "/edit-video": requireAuth(EditVideoPage),
      "/lip-sync": requireAuth(AvatarProPage),
      "/avatar-pro": requireAuth(AvatarProPage),
      "/reframe": requireAuth(ReframePage),
      "/expand": requireAuth(DrawToVideoPage),
      "/remove-bg": requireAuth(RemoveBgPage),
      "/upscale": requireAuth(UpscalePage),
      "/draw-to-video": requireAuth(DrawToVideoPage),
    },
    fallback: () => {
      navigate("/");
      return HomePage();
    },
  });

  if (getToken()) {
    store.refreshUser().catch(() => {
      // Token invalid — gate already shows ConnectPage after navigate("/").
    });
  }
}

bootstrap().catch((err) => {
  const host = document.getElementById("app");
  if (host) {
    host.innerHTML =
      `<div style="padding:24px;color:#f87171;font-family:sans-serif;">
         Failed to start: ${String((err as Error).message)}
       </div>`;
  }
  console.error(err);
});
