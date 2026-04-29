import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from "next/server";
import { getAllowedOrigins } from "@/lib/security";

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/pricing(.*)',
  '/privacy(.*)',
  '/terms(.*)',
  '/dash(.*)',
  '/dashboard(.*)',
  '/explore(.*)',
  '/video(.*)',
  '/image(.*)',
  '/audio(.*)',
  '/character(.*)',
  '/characters(.*)',
  '/music(.*)',
  '/code(.*)',
  '/conversation(.*)',
  '/assist(.*)',
  '/apps(.*)',
  '/gallery(.*)',
  '/edit(.*)',
  '/cinema-studio(.*)',
  '/moodboard(.*)',
  '/original-series(.*)',
  '/3d(.*)',
  '/payment(.*)',
  '/profile(.*)',
  '/settings(.*)',
  '/video-editor(.*)',
  '/video-project-editor(.*)',
  '/api/maintenance(.*)',
  '/api/content(.*)',
  '/api/generate(.*)',
  '/api/cinema(.*)',
  '/api/editor/credits(.*)',
  '/api/webhook(.*)',
  '/api/webhooks(.*)',
  '/api/models(.*)',
  '/api/cron(.*)',
  '/sso-callback(.*)',
])

function applySecurityHeaders(res: NextResponse, req: Request) {
  const origin = req.headers.get("origin");
  const allowedOrigins = getAllowedOrigins();
  const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // COOP must be relaxed on OAuth paths � same-origin breaks Google redirect popup
  const isOAuthPath =
    req.url.includes("/sso-callback") ||
    req.url.includes("/sign-in") ||
    req.url.includes("/sign-up");
  res.headers.set("Cross-Origin-Opener-Policy", isOAuthPath ? "unsafe-none" : "same-origin");
  res.headers.set("Cross-Origin-Resource-Policy", isOAuthPath ? "cross-origin" : "same-site");

  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.saadstudio.app https://*.clerk.accounts.dev https://accounts.saadstudio.app https://accounts.google.com https://challenges.cloudflare.com",
      "worker-src 'self' blob:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "media-src 'self' data: blob: https:",
      "font-src 'self' https://fonts.gstatic.com data:",
      "connect-src 'self' https: wss:",
      "frame-src 'self' https://challenges.cloudflare.com https://*.clerk.accounts.dev https://accounts.google.com https://clerk.saadstudio.app",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self' https://accounts.google.com https://*.clerk.accounts.dev https://clerk.saadstudio.app https://accounts.saadstudio.app",
    ].join("; ")
  );

  if (req.url.includes("/api/")) {
    res.headers.set("Access-Control-Allow-Origin", allowOrigin);
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    res.headers.append("Vary", "Origin");
  }

  return res;
}

function getCmsSlugFromPath(pathname: string) {
  const p = pathname || "/";
  if (p === "/") return "home";
  if (p === "/explore" || p.startsWith("/explore/")) return "explore";
  if (p === "/pricing" || p.startsWith("/pricing/")) return "pricing";
  if (p === "/image" || p.startsWith("/image/")) return "image";
  if (p === "/video" || p.startsWith("/video/")) return "video";
  if (p === "/audio" || p.startsWith("/audio/")) return "audio";
  if (p === "/apps" || p.startsWith("/apps/")) return "apps";
  if (p === "/cinema-studio" || p.startsWith("/cinema-studio/")) return "cinema-studio";
  if (p === "/shots" || p.startsWith("/shots/")) return "shots";
  if (p === "/variations" || p.startsWith("/variations/")) return "variations";
  return null;
}

export default clerkMiddleware(async (auth, req) => {
  if (req.method === "OPTIONS" && req.nextUrl.pathname.startsWith("/api")) {
    return applySecurityHeaders(new NextResponse(null, { status: 204 }), req);
  }

  const pathname = req.nextUrl.pathname;
  const slug = getCmsSlugFromPath(pathname);
  const adminId = process.env.ADMIN_USER_ID;
  const isAdmin = Boolean(adminId && auth().userId && auth().userId === adminId);

  if (slug && !isAdmin) {
    try {
      const url = new URL(req.url);
      url.pathname = "/api/maintenance";
      url.search = `slug=${encodeURIComponent(slug)}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (data && typeof data === "object" && data.enabled === false) {
        const msg =
          typeof data.message === "string" && data.message.trim()
            ? data.message.trim()
            : "This page is currently under maintenance. Please try again later.";

        const html = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Maintenance</title></head><body style="margin:0;background:#020617;color:#e2e8f0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial"><div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:32px"><div style="max-width:720px;width:100%;border:1px solid rgba(255,255,255,.08);border-radius:18px;background:rgba(255,255,255,.03);padding:28px"><div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:rgba(226,232,240,.6);font-weight:700">Maintenance</div><h1 style="margin:10px 0 0 0;font-size:24px;line-height:1.2">We'll be right back</h1><p style="margin:12px 0 0 0;font-size:14px;line-height:1.6;color:rgba(226,232,240,.85)">${msg.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</p></div></div></div></body></html>`;
        return applySecurityHeaders(
          new NextResponse(html, {
            status: 503,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          }),
          req
        );
      }
    } catch {}
  }

  if (!isPublicRoute(req)) {
    auth().protect()
  }
  return applySecurityHeaders(NextResponse.next(), req);
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
