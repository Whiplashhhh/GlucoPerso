import "server-only";
import { headers } from "next/headers";

/**
 * Best-effort client IP for throttling. Behind the documented Caddy setup the
 * first X-Forwarded-For entry is the real client (Caddy overwrites the header
 * for untrusted peers).
 */
export async function clientIp(): Promise<string> {
  const list = await headers();
  const forwarded = list.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || list.get("x-real-ip") || "local";
}
