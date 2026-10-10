import "server-only";

/**
 * Reads a request body but gives up as soon as it grows past `limit` bytes
 * (returns null). `Content-Length` can be absent (chunked upload) or lie, so
 * the bytes are counted as they arrive instead of buffering everything.
 */
export async function readBodyWithLimit(
  request: Request,
  limit: number,
): Promise<Uint8Array<ArrayBuffer> | null> {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

/** Parses a multipart body already read with {@link readBodyWithLimit}. */
export async function parseFormData(
  request: Request,
  body: Uint8Array<ArrayBuffer>,
): Promise<FormData> {
  const contentType = request.headers.get("content-type") ?? "";
  return new Response(body, { headers: { "content-type": contentType } }).formData();
}
