import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import {
  ClerkProvider,
} from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";

import { Toaster } from "@/components/ui/toaster";
import { ModalProvider } from "@/components/modal-provider";
import { AvatarProvider } from "@/lib/avatar-context";
// import WhatsAppButton from "@/components/WhatsAppButton";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";


const nexaBold = localFont({
  src: "../public/fonts/Nexa-Bold.otf",
  variable: "--font-display",
  display: "swap",
});

const nexaLight = localFont({
  src: "../public/fonts/Nexa-Light.otf",
  variable: "--font-body",
  display: "swap",
});

const cairo = Cairo({
  subsets: ["arabic"],
  variable: "--font-cairo",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://saadstudio.app");

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: "Saad Studio | AI Creative Production Platform",
  description: "Saad Studio is a cloud-based AI creative production platform for generating, editing, and publishing images, video, audio, and cinematic scenes.",
  keywords: ["Saad Studio", "AI creative platform", "AI video generation", "AI image generation", "creative SaaS"],
  authors: [{ name: "Saad Studio" }],
  openGraph: {
    title: "Saad Studio | AI Creative Production Platform",
    description: "A cloud-based AI creative production platform for teams, creators, and businesses.",
    url: siteUrl,
    siteName: "Saad Studio",
    type: "website",
  },
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon-v2.ico?v=3",
    shortcut: "/favicon-v2.ico?v=3",
    apple: "/apple-touch-icon.png?v=3",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl.origin}/#organization`,
        name: "Saad Studio",
        url: siteUrl.origin,
        email: "support@saadstudio.app",
        description: "Saad Studio is a cloud-based AI creative production software company.",
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl.origin}/#website`,
        name: "Saad Studio",
        url: siteUrl.origin,
        publisher: { "@id": `${siteUrl.origin}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        name: "Saad Studio",
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Web",
        url: siteUrl.origin,
        description: "Cloud-based AI creative production platform for generating and editing images, videos, audio, characters, and cinematic scenes.",
        provider: { "@id": `${siteUrl.origin}/#organization` },
      },
    ],
  };

  return (
    <ClerkProvider
      appearance={{ baseTheme: dark }}
      signInUrl="/?auth=login"
      signUpUrl="/?auth=signup"
      signInForceRedirectUrl="/dash"
      signUpForceRedirectUrl="/dash"
      afterSignOutUrl="/"
    >
      <html lang="en" dir="ltr" suppressHydrationWarning>
        <head>
          <Script
            id="saad-structured-data"
            type="application/ld+json"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          />
          <meta name="referrer" content="strict-origin-when-cross-origin" />
          <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link rel="dns-prefetch" href="//fonts.googleapis.com" />
          <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        </head>
        <body className={`${nexaBold.variable} ${nexaLight.variable} ${cairo.variable} font-body bg-[#060c18] text-[#e2e8f0] antialiased`}>
          <Script id="saad-theme-init" strategy="beforeInteractive">
            {`
              try {
                var darkPref = localStorage.getItem('saad_dark_mode');
                var languagePref = localStorage.getItem('saad_language');
                if (darkPref === '0') {
                  document.documentElement.classList.add('saad-light');
                  document.documentElement.setAttribute('data-theme', 'light');
                } else {
                  document.documentElement.classList.remove('saad-light');
                  document.documentElement.setAttribute('data-theme', 'dark');
                }
                document.documentElement.setAttribute('dir', 'ltr'); // Always LTR
                if (languagePref === 'ar' || languagePref === 'en') {
                  document.documentElement.setAttribute('lang', languagePref);
                }
              } catch (_) {}
            `}
          </Script>
          <Script id="saad-perf-metrics" strategy="afterInteractive">
            {`
              const DEBUG_PERFORMANCE = ${process.env.NODE_ENV === "development"};
              if (DEBUG_PERFORMANCE) {
                window.addEventListener('load', () => {
                  const nav = performance.getEntriesByType('navigation')[0];
                  if (!nav) return;

                  console.log('SAAD STUDIO Performance');
                  console.log('DNS Lookup:', Math.round(nav.domainLookupEnd - nav.domainLookupStart), 'ms');
                  console.log('TCP Connect:', Math.round(nav.connectEnd - nav.connectStart), 'ms');
                  console.log('TTFB:', Math.round(nav.responseStart - nav.requestStart), 'ms');
                  console.log('DOM Load:', Math.round(nav.domContentLoadedEventEnd - nav.startTime), 'ms');
                  console.log('Full Load:', Math.round(nav.loadEventEnd - nav.startTime), 'ms');
                });

                try {
                  new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    if (lastEntry) {
                      console.log('LCP:', Math.round(lastEntry.startTime), 'ms');
                    }
                  }).observe({ type: 'largest-contentful-paint', buffered: true });

                  let clsSum = 0;
                  let clsTimeout = null;

                  new PerformanceObserver((list) => {
                    list.getEntries().forEach((entry) => {
                      if (!entry.hadRecentInput) clsSum += entry.value || 0;
                    });

                    if (clsTimeout) clearTimeout(clsTimeout);

                    clsTimeout = setTimeout(() => {
                      console.log('CLS:', clsSum.toFixed(3));
                    }, 1000);
                  }).observe({ type: 'layout-shift', buffered: true });
                } catch (_) {}
              }
            `}
          </Script>
          <Script id="saad-error-tracker" strategy="afterInteractive">
            {`
              try {
                var isBuilderPreview = window.location.search.indexOf('builderPreview=1') !== -1;
                if (!isBuilderPreview) {
                  var __saadReloadKey = 'saad_reload_recover_v1';
                  function __saadMaybeRecover(err) {
                    try {
                      var msg = '';
                      if (typeof err === 'string') msg = err;
                      else if (err && typeof err.message === 'string') msg = err.message;
                      else msg = String(err || '');

                      var shouldReload =
                        msg.indexOf("Cannot access 't5' before initialization") !== -1 ||
                        msg.indexOf('before initialization') !== -1 ||
                        msg.indexOf('ChunkLoadError') !== -1 ||
                        msg.indexOf('Loading chunk') !== -1;

                      if (!shouldReload) return;
                      if (sessionStorage.getItem(__saadReloadKey) === '1') return;
                      sessionStorage.setItem(__saadReloadKey, '1');
                      window.location.reload();
                    } catch (_) {}
                  }
                  window.onerror = (msg, url, line, col, error) => {
                    console.error('Client Error:', { msg, url, line, col, stack: error && error.stack });
                    __saadMaybeRecover(error || msg);
                  };
                  window.addEventListener('unhandledrejection', (event) => {
                    console.error('Unhandled Promise Rejection:', event.reason);
                    __saadMaybeRecover(event.reason);
                  });
                }
              } catch (_) {}
            `}
          </Script>
          <Script id="saad-media-fallback-tracker" strategy="afterInteractive">
            {`
              try {
                window.addEventListener('error', (event) => {
                  const target = event.target;
                  if (!target) return;
                  const isMedia = target instanceof HTMLImageElement || 
                                  target instanceof HTMLVideoElement || 
                                  target instanceof HTMLAudioElement;
                  if (!isMedia) return;

                  const srcAttr = target.getAttribute('src');
                  if (!srcAttr) return;

                  let mediaPath = '';
                  const apiMediaIndex = srcAttr.indexOf('/api/media/');
                  if (apiMediaIndex !== -1) {
                    mediaPath = srcAttr.slice(apiMediaIndex + '/api/media/'.length);
                  } else {
                    const patterns = [
                      /https:\\/\\/.*\\.supabase\\.co\\/storage\\/v1\\/object\\/public\\/(.+)/i,
                      /https:\\/\\/pub-[a-zA-Z0-9]+\\.r2\\.dev\\/(.+)/i,
                      /https:\\/\\/media\\.saadstudio\\.app\\/(.+)/i,
                      /https?:\\/\\/(?:www\\.)?saadstudio\\.app\\/api\\/media\\/(.+)/i,
                      /^\\/api\\/media\\/(.+)/i
                    ];
                    for (const regex of patterns) {
                      const match = srcAttr.match(regex) || (target.src && target.src.match(regex));
                      if (match && match[1]) {
                        mediaPath = match[1];
                        break;
                      }
                    }
                  }

                  if (!mediaPath) return;

                  const candidates = [
                    'https://f003.backblazeb2.com/file/saadstudio-storage/' + mediaPath,
                    'https://saadstudio-storage.s3.eu-central-003.backblazeb2.com/' + mediaPath,
                    '/api/media/' + mediaPath
                  ];

                  const currentUrl = target.src || srcAttr;
                  let activeIndex = -1;
                  for (let i = 0; i < candidates.length; i++) {
                    if (currentUrl.indexOf(candidates[i]) !== -1 || candidates[i].indexOf(currentUrl) !== -1) {
                      activeIndex = i;
                      break;
                    }
                  }

                  if (activeIndex === -1) {
                    if (currentUrl.indexOf('media.saadstudio.app') !== -1) {
                      activeIndex = 0;
                    } else if (currentUrl.indexOf('.r2.dev') !== -1) {
                      activeIndex = 1;
                    }
                  }

                  if (activeIndex !== -1 && activeIndex < candidates.length - 1) {
                    const nextUrl = candidates[activeIndex + 1];
                    console.log('[Media Fallback] Swapping from', currentUrl, 'to', nextUrl);
                    target.setAttribute('src', nextUrl);
                    if (target instanceof HTMLVideoElement || target instanceof HTMLAudioElement) {
                      target.load();
                      if (target.autoplay || target.paused === false) {
                        target.play().catch(function() {});
                      }
                    }
                  }
                }, true);
              } catch (_) {}
            `}
          </Script>


          <Toaster />
          <ModalProvider />
          <AvatarProvider>{children}</AvatarProvider>
          {/* <WhatsAppButton /> */}
          <CookieConsentBanner />
        </body>
      </html>
    </ClerkProvider>
  );
}
