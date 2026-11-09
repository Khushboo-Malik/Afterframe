import type { NextConfig } from "next";

// Server-only. Locally Django on :8000; in prod http://<EC2 Elastic IP>.
// The fallback lets CI build without any secrets.
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Let /admin/ reach Django with its trailing slash instead of being redirected.
  skipTrailingSlashRedirect: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // The browser only ever talks to this site; these paths are proxied to Django.
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
      // `(.*)` keeps the trailing slash (`:path*` drops it, and Django's
      // APPEND_SLASH would then redirect /admin/ back to itself forever).
      { source: "/admin/:path(.*)", destination: `${backendUrl}/admin/:path` },
      {
        source: "/django-static/:path*",
        destination: `${backendUrl}/django-static/:path*`,
      },
      { source: "/mcp/:path*", destination: `${backendUrl}/mcp/:path*` },
    ];
  },
};

export default nextConfig;
