import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import {
  ClerkProvider,
} from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";

import { Toaster } from "@/components/ui/toaster";
import { ModalProvider } from "@/components/modal-provider";
import { AvatarProvider } from "@/lib/avatar-context";


const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Saad Studio | The Ultimate AI Super Studio",
  description: "Premium AI Video, Image, and Audio Generation Platform.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon-v2.ico",
    shortcut: "/favicon-v2.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{ baseTheme: dark }}
      signInUrl="/?auth=login"
      signUpUrl="/?auth=signup"
      signInForceRedirectUrl="/dash"
      signUpForceRedirectUrl="/dash"
      afterSignOutUrl="/"
    >
      <html lang="en" dir="ltr">
        <head>
          <meta name="referrer" content="strict-origin-when-cross-origin" />
          <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
          <meta httpEquiv="X-Frame-Options" content="DENY" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link rel="dns-prefetch" href="//fonts.googleapis.com" />
          <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        </head>
        <body className={`${outfit.variable} ${plusJakarta.variable} font-body bg-[#060c18] text-[#e2e8f0] antialiased`}>
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
                if (languagePref === 'ar' || languagePref === 'en') {
                  document.documentElement.setAttribute('lang', languagePref);
                  document.documentElement.setAttribute('dir', languagePref === 'ar' ? 'rtl' : 'ltr');
                }
              } catch (_) {}
            `}
          </Script>
          <Script id="saad-perf-metrics" strategy="afterInteractive">
            {`
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
                  list.getEntries().forEach((entry) => {
                    console.log('LCP:', Math.round(entry.startTime), 'ms');
                  });
                }).observe({ type: 'largest-contentful-paint', buffered: true });
                new PerformanceObserver((list) => {
                  let cls = 0;
                  list.getEntries().forEach((entry) => {
                    if (!entry.hadRecentInput) cls += entry.value || 0;
                  });
                  console.log('CLS:', cls.toFixed(3));
                }).observe({ type: 'layout-shift', buffered: true });
              } catch (_) {}
            `}
          </Script>
          <Script id="saad-error-tracker" strategy="afterInteractive">
            {`
              try {
                var isBuilderPreview = window.location.search.indexOf('builderPreview=1') !== -1;
                if (!isBuilderPreview) {
                  window.onerror = (msg, url, line, col, error) => {
                    console.error('Client Error:', { msg, url, line, col, stack: error && error.stack });
                  };
                  window.addEventListener('unhandledrejection', (event) => {
                    console.error('Unhandled Promise Rejection:', event.reason);
                  });
                }
              } catch (_) {}
            `}
          </Script>

          <Toaster />
          <ModalProvider />
          <AvatarProvider>{children}</AvatarProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}