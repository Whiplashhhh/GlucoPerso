import "server-only";
import { getSession, getSettings } from "@/server/session";

/** Signed-in, onboarded owner of the data, or null (→ 401). */
export async function exportOwner() {
  const session = await getSession();
  if (!session) return null;
  const settings = await getSettings(session.user.id);
  if (!settings) return null;
  return { user: session.user, settings };
}

export function unauthorized(): Response {
  return new Response(null, { status: 401, headers: { "Cache-Control": "no-store" } });
}

export function badRequest(message: string): Response {
  return new Response(message, {
    status: 400,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/** Health data download: never cached, always saved as a file. */
export function attachment(body: BodyInit, contentType: string, fileName: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
