import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export type PhotoSize = "full" | "thumb";

const FULL_EDGE = 1600;
const THUMB_EDGE = 480;
const ORPHAN_TTL_MS = 24 * 60 * 60 * 1000;

function userDir(userId: string) {
  // userId comes from the session (never from the client); keep it path-safe anyway.
  return path.resolve(env.PHOTOS_DIR, userId.replace(/[^a-zA-Z0-9_-]/g, ""));
}

function filePath(userId: string, storageKey: string, size: PhotoSize) {
  return path.join(userDir(userId), `${storageKey}${size === "thumb" ? "_thumb" : ""}.webp`);
}

/**
 * Re-encodes an uploaded image to WebP: applies the EXIF orientation, then
 * drops every metadata block (GPS included) since sharp keeps none by default.
 */
export async function storePhoto(userId: string, input: Buffer) {
  const base = sharp(input, { failOn: "error", limitInputPixels: 50_000_000 }).rotate();
  const full = await base
    .clone()
    .resize(FULL_EDGE, FULL_EDGE, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });
  const thumb = await base
    .clone()
    .resize(THUMB_EDGE, THUMB_EDGE, { fit: "cover", position: "attention" })
    .webp({ quality: 74 })
    .toBuffer();

  const storageKey = randomBytes(18).toString("base64url");
  await mkdir(userDir(userId), { recursive: true, mode: 0o700 });
  await writeFile(filePath(userId, storageKey, "full"), full.data, { mode: 0o600 });
  await writeFile(filePath(userId, storageKey, "thumb"), thumb, { mode: 0o600 });

  return db.photo.create({
    data: { userId, storageKey, width: full.info.width, height: full.info.height },
    select: { id: true, width: true, height: true },
  });
}

/** Reads a photo only if it belongs to `userId`; null otherwise. */
export async function readOwnedPhoto(userId: string, photoId: string, size: PhotoSize) {
  const photo = await db.photo.findFirst({ where: { id: photoId, userId } });
  if (!photo) return null;
  try {
    return await readFile(filePath(userId, photo.storageKey, size));
  } catch {
    return null;
  }
}

export async function deletePhotoFiles(userId: string, storageKey: string) {
  await Promise.all(
    (["full", "thumb"] as const).map((size) =>
      rm(filePath(userId, storageKey, size), { force: true }),
    ),
  );
}

/** Removes uploads that never got attached to a meal. */
export async function cleanOrphanPhotos(userId: string, now = new Date()) {
  const orphans = await db.photo.findMany({
    where: { userId, mealId: null, createdAt: { lt: new Date(now.getTime() - ORPHAN_TTL_MS) } },
  });
  for (const photo of orphans) await deletePhotoFiles(userId, photo.storageKey);
  if (orphans.length) {
    await db.photo.deleteMany({ where: { id: { in: orphans.map((photo) => photo.id) }, userId } });
  }
}

/** Removes every photo file of a user (account deletion). */
export async function deleteAllPhotoFiles(userId: string) {
  await rm(userDir(userId), { recursive: true, force: true });
}
