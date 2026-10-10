/**
 * Placeholder meal "photos" for the demo account: soft gradients and blobs in
 * the app palette with a little food buddy on a plate. Pure SVG strings, the
 * seed renders them with sharp. Drawings adapted from
 * src/components/illustrations/buddies.tsx (no external images, no emoji font).
 */
import { createRng } from "./random";

export const ART_WIDTH = 1200;
export const ART_HEIGHT = 900;

export const ART_KINDS = [
  "peach",
  "croissant",
  "apple",
  "avocado",
  "toast",
  "strawberry",
  "bowl",
  "cupcake",
  "pizza",
  "banana",
] as const;
export type ArtKind = (typeof ART_KINDS)[number];

type Mood = "happy" | "joy" | "calm" | "wink";

const INK = "#3a2930";
const BLUSH = "#ff8e8e";

/** App palette: coral, peach, mint, lavender, amber. */
export const PALETTE = {
  coral: "#f08a6c",
  peach: "#fde1d6",
  mint: "#d7f2e2",
  lavender: "#e9e2fa",
  amber: "#fcebc9",
} as const;

/** Background pairs (light stop, deeper stop) and two blob colours. */
const BACKGROUNDS: readonly (readonly [string, string, string, string])[] = [
  [PALETTE.peach, "#f9c3ae", PALETTE.coral, PALETTE.amber],
  [PALETTE.mint, "#b9e6cc", PALETTE.lavender, PALETTE.amber],
  [PALETTE.lavender, "#d5c8f5", PALETTE.peach, PALETTE.mint],
  [PALETTE.amber, "#f8d99c", PALETTE.coral, PALETTE.peach],
];

export const ART_VARIANTS = BACKGROUNDS.length;

function face(x: number, y: number, s = 1, mood: Mood = "happy"): string {
  const eye = (cx: number) => {
    if (mood === "joy") {
      return `<path d="M${cx - 3} 1 q3 -4.5 6 0" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" fill="none"/>`;
    }
    if (mood === "calm") {
      return `<path d="M${cx - 3} -0.5 q3 3 6 0" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" fill="none"/>`;
    }
    return `<ellipse cx="${cx}" cy="0" rx="2.5" ry="3.1" fill="${INK}"/><circle cx="${cx + 0.8}" cy="-1.1" r="0.85" fill="#fff"/>`;
  };
  const eyes =
    mood === "wink"
      ? `${eye(-8)}<path d="M5 0.5 q3 -3 6 0" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" fill="none"/>`
      : `${eye(-8)}${eye(8)}`;
  const mouth =
    mood === "joy"
      ? `<path d="M-4.5 5 q4.5 6 9 0 z" stroke="${INK}" stroke-width="2" stroke-linejoin="round" fill="#c2524f"/>`
      : `<path d="M-4 5.2 q4 4 8 0" stroke="${INK}" stroke-width="2" stroke-linecap="round" fill="none"/>`;
  return `<g transform="translate(${x} ${y}) scale(${s})">${eyes}${mouth}<ellipse cx="-13.5" cy="5" rx="4.2" ry="2.6" fill="${BLUSH}" opacity="0.5"/><ellipse cx="13.5" cy="5" rx="4.2" ry="2.6" fill="${BLUSH}" opacity="0.5"/></g>`;
}

const shine = (cx: number, cy: number, rx: number, ry: number, angle: number, opacity = 0.35) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff" opacity="${opacity}" transform="rotate(${angle} ${cx} ${cy})"/>`;

/** Food drawings on a 100 × 100 grid. */
const FOODS: Record<ArtKind, (mood: Mood) => string> = {
  peach: (mood) =>
    `<path d="M50 24C31 19 13 34 15 57c2 21 18 33 35 33s33-12 35-33c2-23-16-38-35-33Z" fill="#f9a283"/>
    <path d="M85 57c-2 21-18 33-35 33-12 0-23-6-29-17 9 7 19 9 29 9 17 0 30-9 35-25Z" fill="#ee8466"/>
    <path d="M50 26c-6 11-6 25-2 36" stroke="#e77a5c" stroke-width="2.4" stroke-linecap="round" fill="none"/>
    ${shine(31, 42, 6, 9.5, -24)}
    <path d="M50 25c0-5-1-9-3-12" stroke="#8a5a3c" stroke-width="3.2" stroke-linecap="round" fill="none"/>
    <path d="M51 23c5-11 18-14 26-10-4 10-15 14-26 10Z" fill="#7cc79a"/>
    ${face(56, 60, 1, mood)}`,
  croissant: (mood) =>
    `<ellipse cx="17" cy="66" rx="8" ry="11" fill="#e9a04a" transform="rotate(-58 17 66)"/>
    <ellipse cx="83" cy="66" rx="8" ry="11" fill="#e9a04a" transform="rotate(58 83 66)"/>
    <ellipse cx="31" cy="60" rx="12" ry="17" fill="#f2b45e" transform="rotate(-38 31 60)"/>
    <ellipse cx="69" cy="60" rx="12" ry="17" fill="#f2b45e" transform="rotate(38 69 60)"/>
    <ellipse cx="50" cy="56" rx="17" ry="22" fill="#f7c472"/>
    <path d="M36 48c9-5 19-5 28 0" stroke="#e59d47" stroke-width="2" stroke-linecap="round" fill="none"/>
    <path d="M24 58c3-3 8-4 12-3M76 58c-3-3-8-4-12-3" stroke="#e59d47" stroke-width="2" stroke-linecap="round" fill="none"/>
    ${shine(43, 42, 5, 3, -20, 0.4)}
    ${face(50, 61, 0.85, mood)}`,
  apple: (mood) =>
    `<path d="M50 33c-10-8-32-5-32 21 0 22 16 35 32 31 16 4 32-9 32-31 0-26-22-29-32-21Z" fill="#f47f6f"/>
    <path d="M82 54c0 22-16 35-32 31-11 3-22-3-28-14 8 6 18 8 28 6 14 2 27-7 32-23Z" fill="#e66b5c"/>
    <path d="M50 33c0-6 1-11 4-15" stroke="#8a5a3c" stroke-width="3.2" stroke-linecap="round" fill="none"/>
    <path d="M55 24c4-8 14-10 20-7-3 8-12 11-20 7Z" fill="#7cc79a"/>
    ${shine(32, 44, 5, 8, -25)}
    ${face(50, 58, 1, mood)}`,
  avocado: (mood) =>
    `<path d="M50 10C33 10 24 37 20 57c-4 22 12 35 30 35s34-13 30-35C76 37 67 10 50 10Z" fill="#5f9f6f"/>
    <path d="M50 17C37 17 30 39 27 57c-3 18 9 28 23 28s26-10 23-28C70 39 63 17 50 17Z" fill="#d9eeaa"/>
    <circle cx="50" cy="64" r="13" fill="#b9784a"/>
    ${shine(45, 59, 4, 2.5, -30)}
    ${face(50, 39, 0.7, mood)}`,
  toast: (mood) =>
    `<path d="M22 42c-9-17 9-28 28-25 19-3 37 8 28 25v38c0 6-3 9-9 9H31c-6 0-9-3-9-9V42Z" fill="#da9650"/>
    <path d="M29 44c-6-11 7-19 21-17 14-2 27 6 21 17v34c0 3-2 5-5 5H34c-3 0-5-2-5-5V44Z" fill="#f6d39a"/>
    <rect x="41" y="30" width="17" height="12" rx="4" fill="#fff1b8" transform="rotate(-8 49 36)"/>
    ${face(50, 62, 0.9, mood)}`,
  strawberry: (mood) => {
    const seeds = [
      [33, 50],
      [67, 50],
      [40, 70],
      [60, 70],
      [50, 80],
      [29, 62],
      [71, 62],
    ]
      .map(([cx, cy]) => `<ellipse cx="${cx}" cy="${cy}" rx="1.4" ry="2.1" fill="#ffe3a3"/>`)
      .join("");
    return `<path d="M50 89C30 81 17 59 21 43c4-12 18-12 29-8 11-4 25-4 29 8 4 16-9 38-29 46Z" fill="#f57d8b"/>
    ${seeds}
    <path d="M50 38l-8-10 8 3 0-9 3 9 8-4-6 9 10 1-10 4Z" fill="#6dbb86" stroke-linejoin="round"/>
    ${face(50, 56, 0.85, mood)}`;
  },
  bowl: (mood) =>
    `<path d="M34 30c-3-5 3-8 0-13M50 28c-3-5 3-8 0-13M66 30c-3-5 3-8 0-13" stroke="#b9a6ad" stroke-width="2.4" stroke-linecap="round" opacity="0.6" fill="none"/>
    <path d="M18 50c4-10 18-14 32-14s28 4 32 14H18Z" fill="#ffe0a1"/>
    <circle cx="36" cy="44" r="4" fill="#7cc79a"/>
    <circle cx="60" cy="42" r="5" fill="#f47f6f"/>
    <path d="M14 50h72c0 22-17 36-36 36S14 72 14 50Z" fill="#f08a6c"/>
    <path d="M86 50c0 22-17 36-36 36-11 0-21-5-28-13 7 4 15 6 23 6 20 0 37-12 41-29Z" fill="#e0694a"/>
    <rect x="12" y="47" width="76" height="6" rx="3" fill="#f6a088"/>
    ${face(50, 66, 0.85, mood)}`,
  cupcake: (mood) =>
    `<path d="M26 56h48l-6 30H32Z" fill="#a990e6"/>
    <path d="M38 56l2 30M50 56v30M62 56l-2 30" stroke="#8f74d6" stroke-width="2.4" fill="none"/>
    <path d="M22 58c-4-8 3-14 9-13 0-10 10-15 19-11 6-8 20-5 21 5 8-1 13 8 8 15 3 4 0 6-3 6H25c-3 0-5-1-3-2Z" fill="#ffd3e1"/>
    <circle cx="52" cy="24" r="6" fill="#f47f6f"/>
    <path d="M53 18c1-4 3-6 6-7" stroke="#8a5a3c" stroke-width="2" stroke-linecap="round" fill="none"/>
    ${face(50, 70, 0.75, mood)}`,
  pizza: (mood) =>
    `<path d="M50 90L16 26c20-10 48-10 68 0Z" fill="#ffd774" stroke="#ffd774" stroke-width="4" stroke-linejoin="round"/>
    <path d="M14 24c22-12 50-12 72 0l-3 7c-20-10-46-10-66 0Z" fill="#e9a04a"/>
    <circle cx="38" cy="42" r="5.5" fill="#f47f6f"/>
    <circle cx="62" cy="40" r="5" fill="#f47f6f"/>
    <circle cx="50" cy="73" r="4" fill="#f47f6f"/>
    <path d="M30 34c2 2 5 2 7 0M64 52c2 2 5 2 7 0" stroke="#7cc79a" stroke-width="2.4" stroke-linecap="round" fill="none"/>
    ${face(50, 55, 0.75, mood)}`,
  banana: (mood) =>
    `<path d="M18 40c4 28 26 46 56 40 8-2 12-8 10-12-22 8-46-2-56-28-3-6-11-6-10 0Z" fill="#ffd774"/>
    <path d="M84 68c-22 8-46-2-56-28 6 26 30 40 54 34 2-2 3-4 2-6Z" fill="#f7c04f"/>
    <path d="M20 36l-4-9" stroke="#8a5a3c" stroke-width="3.2" stroke-linecap="round" fill="none"/>
    ${shine(34, 52, 3, 7, -40, 0.4)}
    ${face(56, 62, 0.75, mood)}`,
};

const MOODS: readonly Mood[] = ["happy", "joy", "calm", "wink"];

function sparkle(x: number, y: number, size: number, color: string): string {
  const s = size / 76;
  return `<path transform="translate(${x} ${y}) scale(${s}) translate(-50 -50)" d="M50 12c3 22 13 33 38 38-25 5-35 16-38 38-3-22-13-33-38-38 25-5 35-16 38-38Z" fill="${color}" opacity="0.7"/>`;
}

/** A 1200 × 900 SVG placeholder for a meal of this kind, in one of ART_VARIANTS styles. */
export function demoArtSvg(kind: ArtKind, variant: number): string {
  const index = ((variant % ART_VARIANTS) + ART_VARIANTS) % ART_VARIANTS;
  const [light, deep, blobA, blobB] = BACKGROUNDS[index] ?? [
    PALETTE.peach,
    "#f9c3ae",
    PALETTE.coral,
    PALETTE.amber,
  ];
  const rng = createRng(ART_KINDS.indexOf(kind) * 97 + index * 13 + 1);
  const mood = MOODS[(ART_KINDS.indexOf(kind) + index) % MOODS.length] ?? "happy";

  const blobs = [
    `<circle cx="${rng.int(80, 340)}" cy="${rng.int(60, 300)}" r="${rng.int(160, 240)}" fill="${blobA}" opacity="0.55"/>`,
    `<circle cx="${rng.int(860, 1120)}" cy="${rng.int(560, 840)}" r="${rng.int(180, 260)}" fill="${blobB}" opacity="0.7"/>`,
    `<ellipse cx="${rng.int(900, 1100)}" cy="${rng.int(80, 240)}" rx="${rng.int(120, 180)}" ry="${rng.int(80, 130)}" fill="#ffffff" opacity="0.45"/>`,
    `<ellipse cx="${rng.int(120, 300)}" cy="${rng.int(640, 820)}" rx="${rng.int(130, 190)}" ry="${rng.int(90, 140)}" fill="${blobB}" opacity="0.5"/>`,
  ].join("");
  const sparkles = [
    sparkle(rng.int(180, 300), rng.int(380, 520), rng.int(70, 96), "#ffffff"),
    sparkle(rng.int(900, 1020), rng.int(330, 470), rng.int(54, 72), "#ffffff"),
    sparkle(rng.int(960, 1060), rng.int(120, 220), rng.int(40, 54), PALETTE.coral),
  ].join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ART_WIDTH}" height="${ART_HEIGHT}" viewBox="0 0 ${ART_WIDTH} ${ART_HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${light}"/>
      <stop offset="1" stop-color="${deep}"/>
    </linearGradient>
    <radialGradient id="plate" cx="0.45" cy="0.4" r="0.65">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.6"/>
    </radialGradient>
    <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="46"/></filter>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="22"/></filter>
  </defs>
  <rect width="${ART_WIDTH}" height="${ART_HEIGHT}" fill="url(#bg)"/>
  <g filter="url(#soft)">${blobs}</g>
  ${sparkles}
  <ellipse cx="600" cy="770" rx="300" ry="44" fill="${INK}" opacity="0.1" filter="url(#shadow)"/>
  <circle cx="600" cy="460" r="320" fill="url(#plate)"/>
  <circle cx="600" cy="460" r="262" fill="none" stroke="${deep}" stroke-width="6" opacity="0.35"/>
  <g transform="translate(600 470) scale(5.6) translate(-50 -54)">${FOODS[kind](mood)}</g>
</svg>`;
}
