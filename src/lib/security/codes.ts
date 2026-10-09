import { createHash, randomInt } from "node:crypto";

/** Crockford-style alphabet: no I, L, O, U to avoid reading mistakes. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Random human-friendly code like `K7QF-9XMB-2RTA` (60 bits of entropy). */
export function generateCode(groups = 3, groupLength = 4): string {
  const parts: string[] = [];
  for (let g = 0; g < groups; g += 1) {
    let part = "";
    for (let i = 0; i < groupLength; i += 1) part += ALPHABET[randomInt(ALPHABET.length)];
    parts.push(part);
  }
  return parts.join("-");
}

/** Normalises what a person typed: case, spaces, dashes, look-alike letters. */
export function normalizeCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1")
    .replace(/U/g, "V");
}

/** Codes are high-entropy, so a fast hash is enough to store them. */
export function hashCode(code: string): string {
  return createHash("sha256").update(normalizeCode(code)).digest("hex");
}

/** Stable, non-reversible key for throttling (never store raw emails). */
export function throttleKey(scope: string, value: string): string {
  return `${scope}:${createHash("sha256").update(value.trim().toLowerCase()).digest("hex")}`;
}
