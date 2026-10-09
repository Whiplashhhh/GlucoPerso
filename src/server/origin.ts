import "server-only";

/**
 * CSRF guard for Route Handlers that change data (Server Actions get the same
 * check from Next.js): the Origin header must match the host serving the app.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
