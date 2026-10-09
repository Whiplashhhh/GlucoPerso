import { NextResponse } from "next/server";
import { MAX_PHOTO_BYTES, detectImageKind, isSupportedKind } from "@/lib/photos/magic";
import { isSameOrigin } from "@/server/origin";
import { cleanOrphanPhotos, storePhoto } from "@/server/photos";
import { getSession } from "@/server/session";

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail(403, "Requête refusée.");
  const session = await getSession();
  if (!session) return fail(401, "Connecte-toi pour ajouter une photo.");

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_PHOTO_BYTES + 64 * 1024) return fail(413, "Photo trop lourde (10 Mo max).");

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("photo");
  } catch {
    return fail(400, "Photo illisible.");
  }
  if (!(file instanceof File)) return fail(400, "Aucune photo reçue.");
  if (file.size > MAX_PHOTO_BYTES) return fail(413, "Photo trop lourde (10 Mo max).");

  const buffer = Buffer.from(await file.arrayBuffer());
  const kind = detectImageKind(buffer);
  if (kind === "heic") {
    return fail(415, "Ce format (HEIC) n'est pas pris en charge : choisis « Plus compatible ».");
  }
  if (!isSupportedKind(kind)) return fail(415, "Ce fichier n'est pas une image reconnue.");

  try {
    const photo = await storePhoto(session.user.id, buffer);
    await cleanOrphanPhotos(session.user.id);
    return NextResponse.json(photo, { status: 201 });
  } catch {
    return fail(422, "Impossible de lire cette image.");
  }
}
