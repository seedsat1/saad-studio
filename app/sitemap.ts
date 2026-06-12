import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://saadstudio.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/about",
    "/contact",
    "/pricing",
    "/privacy",
    "/cookies",
    "/terms",
    "/image",
    "/video",
    "/apps",
    "/cinema-studio",
  ];

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/about" || route === "/contact" ? 0.9 : 0.7,
  }));
}
