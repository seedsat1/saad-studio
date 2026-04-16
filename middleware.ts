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
  '/api/generate(.*)',
  '/api/cinema(.*)',
  '/api/editor/credits(.*)',
  '/api/webhook(.*)',
  '/api/webhooks(.*)',
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

export default clerkMiddleware((auth, req) => {
  if (req.method === "OPTIONS" && req.nextUrl.pathname.startsWith("/api")) {
    return applySecurityHeaders(new NextResponse(null, { status: 204 }), req);
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