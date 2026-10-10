import { z } from "zod";
import { id as photoId } from "@/lib/validation/common";
import { readOwnedPhoto } from "@/server/photos";
import { getSession } from "@/server/session";

const size = z.enum(["full", "thumb"]).catch("full");

function empty(status: number) {
  return new Response(null, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request, { params }: RouteContext<"/api/photos/[id]">) {
  const session = await getSession();
  if (!session) return empty(401);
  const parsedId = photoId.safeParse((await params).id);
  if (!parsedId.success) return empty(404);
  const variant = size.parse(new URL(request.url).searchParams.get("size"));
  const data = await readOwnedPhoto(session.user.id, parsedId.data, variant);
  // Same answer for "missing" and "not yours".
  if (!data) return empty(404);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/webp",
      // Private to her browser (never a shared cache); photo ids are
      // immutable. The service worker never stores /api/* (public/sw.js).
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
