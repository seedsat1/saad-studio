/** @type {import('next').NextConfig} */
const r2PublicBaseUrl =
  process.env.NEXT_PUBLIC_B2_PUBLIC_BASE_URL ||
  process.env.NEXT_PUBLIC_B2_PUBLIC_URL ||
  process.env.B2_PUBLIC_BASE_URL ||
  process.env.B2_PUBLIC_URL ||
  process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL ||
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
  process.env.R2_PUBLIC_BASE_URL ||
  process.env.R2_PUBLIC_URL ||
  "";
const r2RemotePatterns = (() => {
  if (!r2PublicBaseUrl) return [];
  try {
    const url = new URL(r2PublicBaseUrl);
    const basePath = url.pathname.replace(/\/+$/, "");
    return [{
      protocol: url.protocol.replace(":", ""),
      hostname: url.hostname,
      port: url.port,
      pathname: `${basePath || ""}/**`,
    }];
  } catch {
    return [];
  }
})();

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
];

const nextConfig = {
  output: process.env.NEXT_OUTPUT_MODE === "standalone" ? "standalone" : undefined,
  poweredByHeader: false,
  compress: true,
  typescript: {
    // vitest config imports @vitejs/plugin-react which has broken TS declarations
    // Tests still run via vitest — this only skips Next.js type-check pass
    ignoreBuildErrors: true,
  },
  experimental: {
    serverComponentsExternalPackages: ["fluent-ffmpeg", "@ffmpeg-installer/ffmpeg", "ffmpeg-static"],
    serverActions: {
      bodySizeLimit: "10mb",
    },
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
    ],
    outputFileTracingExcludes: {
      '*': [
        'public/img/beauty-tools/**/*',
        'public/landing/**/*',
        'public/uploads/**/*',
        'public/preset/**/*',
        'public/explore/**/*',
        'public/transitions/**/*',
        'adobe/**/*',
      ],
    },
    outputFileTracingIncludes: {
      '/api/video-extend/stitch': [
        'node_modules/@ffmpeg-installer/**/*',
        'node_modules/ffmpeg-static/**/*',
      ],
      '/api/video-extend/last-frame': [
        'node_modules/@ffmpeg-installer/**/*',
        'node_modules/ffmpeg-static/**/*',
      ],
      '/api/transitions/stitch': [
        'node_modules/@ffmpeg-installer/**/*',
        'node_modules/ffmpeg-static/**/*',
      ],
      '/api/studio/export': [
        'node_modules/fluent-ffmpeg/**/*',
        'node_modules/@ffmpeg-installer/**/*',
        'node_modules/ffmpeg-static/**/*',
      ],
    },
  },
  eslint: {
    // ESLint errors will not fail the production build — warnings only
    ignoreDuringBuilds: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    deviceSizes: [640, 960, 1280, 1920],
    imageSizes: [64, 128, 256, 384, 512],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "oaidalleapiprodscus.blob.core.windows.net",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "tempfile.aiquickdraw.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "tempfileb.aiquickdraw.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "static.aiquickdraw.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.clerk.dev",
        port: "",
        pathname: "/**",
      },
      ...r2RemotePatterns,
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: process.env.NODE_ENV === "production"
              ? "public, max-age=31536000, immutable"
              : "no-store, must-revalidate",
          },
        ],
      },
      {
        source: "/:path*.:ext(ico|png|jpg|jpeg|gif|webp|avif|svg|woff|woff2|ttf|otf|eot|mp4|webm|mp3|wav)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/dash",
        destination: "/explore",
        permanent: true,
      },
      {
        source: "/apps/tool/storyboard-studio",
        destination: "/storyboard",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
