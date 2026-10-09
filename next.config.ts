import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image.
  output: "standalone",
  poweredByHeader: false,
  // Nonce-based CSP (see src/proxy.ts) needs every page rendered per request,
  // which is incompatible with Partial Prerendering. See DECISIONS.md.
  cacheComponents: false,
  // Native modules must stay out of the bundle.
  serverExternalPackages: ["sharp", "@node-rs/argon2", "pdfkit"],
  async headers() {
    const security = [
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      {
        key: "Permissions-Policy",
        value:
          "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
      },
    ];
    return [
      { source: "/:path*", headers: security },
      // API responses never render HTML: lock them down completely.
      {
        source: "/api/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "default-src 'none'; frame-ancestors 'none'" },
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
