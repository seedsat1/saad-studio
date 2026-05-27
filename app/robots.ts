import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://saadstudio.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /cinema-studio-vso is an internal staging build — kept out of the
      // sitemap and explicitly disallowed so crawlers skip it.
      disallow: ["/admin", "/api", "/panel", "/cinema-studio-vso"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
