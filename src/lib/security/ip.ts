import { BlockList, isIP } from "node:net";

/** Shared bucket used when no trustworthy client IP can be resolved. */
export const UNKNOWN_IP = "unknown";

function blockListOf(trustedProxies: readonly string[]): BlockList {
  const list = new BlockList();
  for (const entry of trustedProxies) {
    const [address, prefix] = entry.split("/");
    const family = isIP(address ?? "");
    if (!family || !address) continue;
    const type = family === 6 ? "ipv6" : "ipv4";
    if (prefix === undefined) list.addAddress(address, type);
    else if (/^\d+$/.test(prefix)) list.addSubnet(address, Number(prefix), type);
  }
  return list;
}

function isTrusted(list: BlockList, ip: string): boolean {
  const family = isIP(ip);
  return family !== 0 && list.check(ip, family === 6 ? "ipv6" : "ipv4");
}

/**
 * Client IP from an `X-Forwarded-For` value, resolved like Better Auth does:
 *   - with trusted proxies, the chain is read from the right and the first hop
 *     that is not a trusted proxy is the client (the left part is spoofable);
 *   - without, only a single-value header is believed (Caddy overwrites the
 *     header for untrusted peers, so it always sends exactly one value).
 * Anything else (several values, garbage) falls back to one shared bucket, so
 * forging the header never yields a fresh rate-limit budget.
 */
export function clientIpFromForwarded(
  forwardedFor: string | null | undefined,
  trustedProxies: readonly string[] = [],
): string {
  const hops = (forwardedFor ?? "")
    .split(",")
    .map((hop) => hop.trim())
    .filter(Boolean);
  if (hops.length === 0) return UNKNOWN_IP;

  if (trustedProxies.length > 0) {
    const trusted = blockListOf(trustedProxies);
    for (let index = hops.length - 1; index >= 0; index -= 1) {
      const hop = hops[index] as string;
      if (!isIP(hop)) return UNKNOWN_IP;
      if (!isTrusted(trusted, hop)) return hop.toLowerCase();
    }
    return UNKNOWN_IP;
  }

  const [only] = hops;
  return hops.length === 1 && only && isIP(only) ? only.toLowerCase() : UNKNOWN_IP;
}
