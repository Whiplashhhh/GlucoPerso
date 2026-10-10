import "server-only";
import { headers } from "next/headers";
import { env } from "@/lib/env";
import { clientIpFromForwarded } from "@/lib/security/ip";

/**
 * Client IP for throttling sign-up and recovery, resolved from
 * `X-Forwarded-For` with the same rules as Better Auth (see TRUSTED_PROXIES in
 * docs/deploiement.md). `X-Real-IP` is ignored: it is trivially forged.
 */
export async function clientIp(): Promise<string> {
  const list = await headers();
  return clientIpFromForwarded(list.get("x-forwarded-for"), env.TRUSTED_PROXIES);
}
