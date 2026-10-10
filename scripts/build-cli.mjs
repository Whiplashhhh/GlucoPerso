#!/usr/bin/env node
// Bundles the admin CLI scripts into self-contained ESM files (.next/cli/) so
// they run in the production Docker image, which has neither the sources, tsx
// nor the dev dependencies. Output lives in .next/ (a build artefact already
// ignored by Git, ESLint, Prettier and Docker).
//   npm run build:cli   →   node .next/cli/create-invite.mjs
import { build } from "esbuild";

await build({
  entryPoints: { "create-invite": "scripts/create-invite.ts" },
  outdir: ".next/cli",
  outExtension: { ".js": ".mjs" },
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  // Same resolution as `tsx --conditions=react-server`: `server-only` is a no-op.
  conditions: ["react-server"],
  external: ["pg-native"],
  // Bundled CommonJS dependencies (pg…) still call require() for Node builtins.
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  legalComments: "none",
  logLevel: "info",
});
