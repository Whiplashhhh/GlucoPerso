/** Photo pipeline: real type, re-encoding, metadata stripping, file names. */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { detectImageKind } from "@/lib/photos/magic";
import { readOwnedPhoto, storePhoto } from "@/server/photos";
import { createUser } from "./fixtures";

let userId: string;

const XMP = `<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:creator>Léa Martin</dc:creator></rdf:Description></rdf:RDF></x:xmpmeta>`;

/** A 2400×1800 JPEG carrying GPS coordinates, the owner's name, XMP and an ICC profile. */
async function jpegWithMetadata() {
  return sharp({
    create: { width: 2400, height: 1800, channels: 3, background: { r: 230, g: 90, b: 60 } },
  })
    .withExif({
      IFD0: { Artist: "Léa Martin", Make: "PhoneMaker", Model: "Phone 15" },
      IFD3: {
        GPSLatitudeRef: "N",
        GPSLatitude: "48/1 51/1 2400/100",
        GPSLongitudeRef: "E",
        GPSLongitude: "2/1 21/1 300/100",
      },
    })
    .withXmp(XMP)
    .withIccProfile("p3")
    .withMetadata({ orientation: 6 })
    .jpeg()
    .toBuffer();
}

beforeAll(async () => {
  userId = (await createUser("Photo")).id;
});

describe("storePhoto", () => {
  it("the test fixture really carries GPS, XMP and ICC metadata", async () => {
    const input = await jpegWithMetadata();
    const meta = await sharp(input).metadata();
    expect(meta.exif).toBeDefined();
    expect(meta.exif?.includes(Buffer.from("Martin"))).toBe(true);
    // GPS IFD pointer (tag 0x8825) present in the EXIF block.
    expect(
      meta.exif?.includes(Buffer.from([0x88, 0x25])) ||
        meta.exif?.includes(Buffer.from([0x25, 0x88])),
    ).toBe(true);
    expect(meta.xmp).toBeDefined();
    expect(meta.icc).toBeDefined();
    expect(meta.orientation).toBe(6);
  });

  it("re-encodes to WebP, resizes, and strips every metadata block", async () => {
    const input = await jpegWithMetadata();
    const photo = await storePhoto(userId, input);
    const row = await db.photo.findUniqueOrThrow({ where: { id: photo.id } });

    for (const size of ["full", "thumb"] as const) {
      const data = await readOwnedPhoto(userId, photo.id, size);
      expect(data).toBeInstanceOf(Buffer);
      const buffer = data as Buffer;
      expect(detectImageKind(buffer)).toBe("webp");
      const meta = await sharp(buffer).metadata();
      expect(meta.format).toBe("webp");
      expect(meta.exif).toBeUndefined();
      expect(meta.xmp).toBeUndefined();
      expect(meta.icc).toBeUndefined();
      expect(meta.iptc).toBeUndefined();
      // Nothing personal left anywhere in the bytes.
      expect(buffer.includes(Buffer.from("Martin"))).toBe(false);
      expect(buffer.includes(Buffer.from("PhoneMaker"))).toBe(false);
      expect(buffer.includes(Buffer.from("EXIF"))).toBe(false);
      expect(buffer.includes(Buffer.from("XMP "))).toBe(false);
      expect(buffer.includes(Buffer.from("ICCP"))).toBe(false);
      expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(
        size === "full" ? 1600 : 480,
      );
    }
    // EXIF orientation 6 was applied before the metadata went away (portrait).
    expect(row.height).toBeGreaterThan(row.width);
  });

  it("uses random, path-safe file names in a per-user folder", async () => {
    const photo = await storePhoto(
      userId,
      await sharp({ create: { width: 10, height: 10, channels: 3, background: "#fff" } })
        .png()
        .toBuffer(),
    );
    const row = await db.photo.findUniqueOrThrow({ where: { id: photo.id } });
    expect(row.storageKey).toMatch(/^[A-Za-z0-9_-]{24}$/);
    const files = await readdir(path.join(process.env.PHOTOS_DIR as string, userId));
    for (const file of files) expect(file).toMatch(/^[A-Za-z0-9_-]{24}(_thumb)?\.webp$/);
    const keys = await db.photo.findMany({ where: { userId }, select: { storageKey: true } });
    expect(new Set(keys.map((key) => key.storageKey)).size).toBe(keys.length);
  });

  it("refuses data that is not a decodable image", async () => {
    await expect(storePhoto(userId, Buffer.from("<svg onload=alert(1)></svg>"))).rejects.toThrow();
    const truncated = (await jpegWithMetadata()).subarray(0, 200);
    await expect(storePhoto(userId, truncated)).rejects.toThrow();
  });
});

describe("readOwnedPhoto", () => {
  it("never follows a path given as an id", async () => {
    for (const id of ["../../etc/passwd", "..%2F..%2Fsecrets.env", "/etc/passwd", ""]) {
      expect(await readOwnedPhoto(userId, id, "full")).toBeNull();
    }
    // A forged user id cannot escape the photos folder either.
    expect(await readOwnedPhoto("../..", "x", "full")).toBeNull();
    await expect(readFile(path.join(process.env.PHOTOS_DIR as string, ".."))).rejects.toThrow();
  });
});

describe("magic bytes", () => {
  it("trusts the bytes, not the declared type", async () => {
    expect(detectImageKind(Buffer.from("<svg></svg>"))).toBeNull();
    expect(detectImageKind(Buffer.from("GIF89a……"))).toBe("gif");
    expect(detectImageKind(await jpegWithMetadata())).toBe("jpeg");
  });
});
