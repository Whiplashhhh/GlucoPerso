import { NextResponse } from "next/server";
import { MAX_PHOTO_BYTES, detectImageKind, isSupportedKind } from "@/lib/photos/magic";
import { parseFormData, readBodyWithLimit } from "@/server/body";
import { isSameOrigin } from "@/server/origin";
import { cleanOrphanPhotos, storePhoto } from "@/server/photos";
import { getSession } from "@/server/session";

/** Room for the multipart boundaries and headers around the photo. */
const MULTIPART_OVERHEAD = 64 * 1024;
const TOO_BIG = "Photo trop lourde (10 Mo max).";

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail(403, "Requête refusée.");
  const session = await getSession();
  if (!session) return fail(401, "Connecte-toi pour ajouter une photo.");

  const limit = MAX_PHOTO_BYTES + MULTIPART_OVERHEAD;
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > limit) return fail(413, TOO_BIG);
  // Counted while streaming: a chunked or lying upload can't exhaust memory.
  const body = await readBodyWithLimit(request, limit);
  if (!body) return fail(413, TOO_BIG);

  let file: FormDataEntryValue | null;
  try {
    file = (await parseFormData(request, body)).get("photo");
  } catch {
    return fail(400, "Photo illisible.");
  }
  if (!(file instanceof File)) return fail(400, "Aucune photo reçue.");
  if (file.size > MAX_PHOTO_BYTES) return fail(413, TOO_BIG);

  const buffer = Buffer.from(await file.arrayBuffer());
  const kind = detectImageKind(buffer);
  if (kind === "heic") {
    return fail(415, "Ce format (HEIC) n'est pas pris en charge : choisis « Plus compatible ».");
  }
  if (!isSupportedKind(kind)) return fail(415, "Ce fichier n'est pas une image reconnue.");

  try {
    const photo = await storePhoto(session.user.id, buffer);
    await cleanOrphanPhotos(session.user.id);
    return NextResponse.json(photo, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return fail(422, "Impossible de lire cette image.");
  }
}
