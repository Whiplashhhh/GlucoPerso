import type { NextConfig } from "next";

/**
 * Fallback policy for responses the proxy (src/proxy.ts) doesn't see: static
 * files, the service worker, and the 404 page they may render. No script can
 * run under it. Pages seen by the proxy get the nonce-based policy instead
 * (the proxy's header replaces this one).
 */
const LOCKED_DOWN_CSP = [
  "default-src 'self'",
  "script-src 'none'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image.
  output: "standalone",
  poweredByHeader: false,
  // Nonce-based CSP (see src/proxy.ts) needs every page rendered per request,
  // which is incompatible with Partial Prerendering. See DECISIONS.md.
  cacheComponents: false,
  // Native modules must stay out of the bundle.
  serverExternalPackages: ["sharp", "@node-rs/argon2", "pdfkit"],
  experimental: {
    // Server Actions only carry small forms (photos go to /api/photos, which
    // enforces its own 10 MB cap while streaming). Explicit defaults.
    serverActions: { bodySizeLimit: "1mb" },
    proxyClientMaxBodySize: "1mb",
  },
  async headers() {
    const security = [
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
      {
        key: "Permissions-Policy",
        value:
          "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
      },
      { key: "Content-Security-Policy", value: LOCKED_DOWN_CSP },
    ];
    // Later entries override earlier ones for the same header key.
    return [
      { source: "/:path*", headers: security },
      // Service worker: always revalidated so updates reach users quickly.
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'",
          },
        ],
      },
      // API responses never render HTML: lock them down completely.
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
          },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
