/** Main panel entry point.
 *
 * Wires the router, runs the auth gate, and loads the ExtendScript bundle
 * on startup. Each route returns the page element to mount. */

import { configureRouter, navigate } from "./lib/router";
import { loadExtendScript, isInsideAdobe } from "./lib/cep";
import { getToken } from "./lib/auth";
import { store } from "./lib/store";
import { getFallbackUrls } from "./lib/api";

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

// ── Reap.video tools (More Tools section)
import { AddCaptionsPage } from "./pages/add-captions";
import { EditClipsPage } from "./pages/edit-clips";
import { AIDubbingPage } from "./pages/ai-dubbing";
import { AutoReframePage } from "./pages/auto-reframe";
import { TranscriptionPage } from "./pages/transcription";
import { AudiogramPage } from "./pages/audiogram";
import { MultiCamAutoSwitchPage } from "./pages/multi-cam-auto-switch";
import { NoiseRemovalPage } from "./pages/noise-removal";
import { EyeCorrectionPage } from "./pages/eye-correction";

async function bootstrap() {
  if (isInsideAdobe()) {
    await loadExtendScript();
  }

  const host = document.getElementById("app");
  if (!host) throw new Error("#app root missing");

  // Global capture listener to catch image/video/audio load errors and swap to backup domains
  window.addEventListener(
    "error",
    (event) => {
      const target = event.target as HTMLElement;
      if (!target) return;
      
      const isMedia = target.tagName === "IMG" || target.tagName === "VIDEO" || target.tagName === "AUDIO";
      if (!isMedia) return;

      const mediaEl = target as HTMLImageElement | HTMLVideoElement | HTMLAudioElement;
      const currentSrc = mediaEl.src;
      if (!currentSrc) return;

      // Avoid infinite loops by tagging elements we've already tried to swap
      const triedUrls = (mediaEl as any).__saad_tried_urls || [];
      if (triedUrls.includes(currentSrc)) return;
      triedUrls.push(currentSrc);
      (mediaEl as any).__saad_tried_urls = triedUrls;

      const fallbacks = getFallbackUrls(currentSrc);
      const currentIndex = fallbacks.indexOf(currentSrc);
      
      if (currentIndex !== -1 && currentIndex + 1 < fallbacks.length) {
        const nextSrc = fallbacks[currentIndex + 1];
        // eslint-disable-next-line no-console
        console.warn(`[saadstudio-cep] Media element failed to load from ${currentSrc}. Trying fallback: ${nextSrc}`);
        mediaEl.src = nextSrc;
        if (target.tagName === "VIDEO" || target.tagName === "AUDIO") {
          try {
            (mediaEl as HTMLVideoElement | HTMLAudioElement).load();
          } catch { /* noop */ }
        }
      }
    },
    true // Capture phase to intercept non-bubbling resource error events
  );

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

      // ── More Tools (Reap.video)
      "/add-captions":   requireAuth(AddCaptionsPage),
      "/edit-clips":     requireAuth(EditClipsPage),
      "/ai-dubbing":     requireAuth(AIDubbingPage),
      "/auto-reframe":   requireAuth(AutoReframePage),
      "/transcription":  requireAuth(TranscriptionPage),
      "/audiogram":      requireAuth(AudiogramPage),
      "/multi-cam-auto-switch": requireAuth(MultiCamAutoSwitchPage),
      "/noise-removal":  requireAuth(NoiseRemovalPage),
      "/eye-correction": requireAuth(EyeCorrectionPage),
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
