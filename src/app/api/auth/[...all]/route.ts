import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

const handler = toNextJsHandler(auth);

export const GET = handler.GET;

/**
 * Signing out also drops the browser's HTTP cache (meal photos are cached
 * privately): nothing personal stays on a shared device.
 */
export async function POST(request: Request): Promise<Response> {
  const response = await handler.POST(request);
  if (!new URL(request.url).pathname.endsWith("/sign-out") || !response.ok) return response;
  const headers = new Headers(response.headers);
  headers.set("Clear-Site-Data", '"cache"');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
