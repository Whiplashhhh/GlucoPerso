import { readOwnedPhoto } from "@/server/photos";
import { getSession } from "@/server/session";

export async function GET(request: Request, { params }: RouteContext<"/api/photos/[id]">) {
  const session = await getSession();
  if (!session) return new Response(null, { status: 401 });
  const { id } = await params;
  const size = new URL(request.url).searchParams.get("size") === "thumb" ? "thumb" : "full";
  const data = await readOwnedPhoto(session.user.id, id, size);
  // Same answer for "missing" and "not yours".
  if (!data) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
