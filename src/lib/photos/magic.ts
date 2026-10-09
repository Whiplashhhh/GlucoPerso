export type ImageKind = "jpeg" | "png" | "webp" | "gif" | "heic";

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

/**
 * Detects the real image type from its first bytes ("magic numbers"),
 * ignoring the file name and the declared MIME type.
 */
export function detectImageKind(bytes: Uint8Array): ImageKind | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "webp";
  if (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a") return "gif";
  if (ascii(bytes, 4, 4) === "ftyp" && /^(heic|heix|hevc|mif1|msf1)$/.test(ascii(bytes, 8, 4))) {
    return "heic";
  }
  return null;
}

/** Kinds sharp can decode in the Docker image. */
export function isSupportedKind(kind: ImageKind | null): kind is "jpeg" | "png" | "webp" | "gif" {
  return kind === "jpeg" || kind === "png" || kind === "webp" || kind === "gif";
}
