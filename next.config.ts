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
