#!/usr/bin/env node
// Renders the GlucoPerso app icons and iOS splash screens from an original SVG
// (the Peach mascot of src/components/illustrations/buddies.tsx) with sharp.
//   npm run icons
// The generated PNG/ICO files are committed: re-run only when the art changes.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
// Portrait iPhone screens (CSS size + pixel ratio), shared with the root layout.
import SPLASH_SCREENS from "../src/lib/splash-screens.json" with { type: "json" };

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC = path.join(ROOT, "public");

const CREAM = "#fbf4ea";
const NIGHT = "#17122a";
const INK = "#3a2930";
const BLUSH = "#ff8e8e";

/** The peach mascot in its own 100×100 coordinate space (centre ≈ 50,52). */
const PEACH = `
  <path d="M50 24C31 19 13 34 15 57c2 21 18 33 35 33s33-12 35-33c2-23-16-38-35-33Z" fill="#f9a283"/>
  <path d="M85 57c-2 21-18 33-35 33-12 0-23-6-29-17 9 7 19 9 29 9 17 0 30-9 35-25Z" fill="#ee8466"/>
  <path d="M50 26c-6 11-6 25-2 36" stroke="#e77a5c" stroke-width="2.4" stroke-linecap="round" fill="none"/>
  <ellipse cx="31" cy="42" rx="6" ry="9.5" fill="#fff" opacity="0.35" transform="rotate(-24 31 42)"/>
  <path d="M50 25c0-5-1-9-3-12" stroke="#8a5a3c" stroke-width="3.2" stroke-linecap="round" fill="none"/>
  <path d="M51 23c5-11 18-14 26-10-4 10-15 14-26 10Z" fill="#7cc79a"/>
  <path d="M54 21c6-3 12-5 19-6" stroke="#5aa878" stroke-width="1.6" stroke-linecap="round" fill="none"/>
  <g transform="translate(56 60)">
    <ellipse cx="-8" cy="0" rx="2.5" ry="3.1" fill="${INK}"/>
    <circle cx="-7.2" cy="-1.1" r="0.85" fill="#fff"/>
    <ellipse cx="8" cy="0" rx="2.5" ry="3.1" fill="${INK}"/>
    <circle cx="8.8" cy="-1.1" r="0.85" fill="#fff"/>
    <path d="M-4 5.2 q4 4 8 0" stroke="${INK}" stroke-width="2" stroke-linecap="round" fill="none"/>
    <ellipse cx="-13.5" cy="5" rx="4.2" ry="2.6" fill="${BLUSH}" opacity="0.5"/>
    <ellipse cx="13.5" cy="5" rx="4.2" ry="2.6" fill="${BLUSH}" opacity="0.5"/>
  </g>`;

/** Places the mascot so that its 100-unit box spans `size` px centred on (cx, cy). */
function mascot(cx, cy, size) {
  const s = size / 100;
  return `<g transform="translate(${cx - 50 * s} ${cy - 52 * s}) scale(${s})">${PEACH}</g>`;
}

const DEFS = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff3e6"/>
      <stop offset="1" stop-color="#ffd5c2"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.85"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>`;

/**
 * App icon. `maskable` fills the whole square and keeps the mascot inside the
 * central 80 % safe zone; otherwise the background is a rounded square.
 */
function iconSvg(size, { maskable = false, rounded = true } = {}) {
  const radius = rounded && !maskable ? size * 0.22 : 0;
  const art = maskable ? size * 0.62 : size * 0.8;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${DEFS}
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#bg)"/>
  <circle cx="${size / 2}" cy="${size * 0.5}" r="${art * 0.48}" fill="url(#glow)"/>
  ${mascot(size / 2, size * 0.51, art)}
</svg>`;
}

/** Splash colours follow the app's light and dark `--bg` (src/app/globals.css). */
const SPLASH_THEMES = {
  light: { suffix: "", background: CREAM, halo: "#ffe1d3" },
  dark: { suffix: "-dark", background: NIGHT, halo: "#2f2860" },
};

function splashSvg(width, height, { background, halo }) {
  const art = Math.min(width, height) * 0.36;
  const cy = height * 0.46;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${DEFS}
  <rect width="${width}" height="${height}" fill="${background}"/>
  <circle cx="${width / 2}" cy="${cy}" r="${art * 0.62}" fill="${halo}"/>
  ${mascot(width / 2, cy, art)}
</svg>`;
}

async function png(svg, file, { palette = false } = {}) {
  const target = path.join(PUBLIC, file);
  await mkdir(path.dirname(target), { recursive: true });
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette, quality: 90 }).toFile(target);
  console.info(`  ${file}`);
}

/** Minimal ICO container holding PNG-encoded images (supported by all browsers). */
async function ico(sizes, target) {
  const images = await Promise.all(
    sizes.map((size) =>
      sharp(Buffer.from(iconSvg(size)))
        .png({ compressionLevel: 9 })
        .toBuffer(),
    ),
  );
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach((image, i) => {
    const entry = 6 + 16 * i;
    header.writeUInt8(sizes[i] >= 256 ? 0 : sizes[i], entry);
    header.writeUInt8(sizes[i] >= 256 ? 0 : sizes[i], entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(image.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += image.length;
  });
  await writeFile(target, Buffer.concat([header, ...images]));
  console.info(`  ${path.relative(ROOT, target)}`);
}

console.info("Generating icons…");
await png(iconSvg(192), "icons/icon-192.png");
await png(iconSvg(512), "icons/icon-512.png");
await png(iconSvg(192, { maskable: true }), "icons/maskable-192.png");
await png(iconSvg(512, { maskable: true }), "icons/maskable-512.png");
// iOS applies its own rounded mask and shows transparency as black.
await png(iconSvg(180, { rounded: false }), "apple-touch-icon.png");
await ico([16, 32, 48], path.join(ROOT, "src/app/favicon.ico"));

for (const { width, height, ratio } of SPLASH_SCREENS) {
  const w = width * ratio;
  const h = height * ratio;
  for (const theme of Object.values(SPLASH_THEMES)) {
    await png(splashSvg(w, h, theme), `splash/splash${theme.suffix}-${w}x${h}.png`, {
      palette: true,
    });
  }
}
console.info("Done.");
