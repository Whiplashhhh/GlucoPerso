import { describe, expect, it } from "vitest";
import { parseFormData, readBodyWithLimit } from "@/server/body";

/** A chunked request (no Content-Length) streaming `chunks` of `size` bytes. */
function chunkedRequest(chunks: number, size: number) {
  let sent = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (sent >= chunks) return controller.close();
      sent += 1;
      controller.enqueue(new Uint8Array(size).fill(65));
    },
  });
  const request = new Request("http://localhost/api/photos", {
    method: "POST",
    body,
    duplex: "half",
  } as RequestInit);
  return { request, sent: () => sent };
}

describe("readBodyWithLimit", () => {
  it("returns the whole body under the limit", async () => {
    const { request } = chunkedRequest(3, 1000);
    expect((await readBodyWithLimit(request, 5000))?.byteLength).toBe(3000);
  });

  it("stops reading as soon as the limit is passed", async () => {
    const { request, sent } = chunkedRequest(1000, 1024);
    expect(await readBodyWithLimit(request, 10 * 1024)).toBeNull();
    // Far from the 1000 chunks announced: the rest was never pulled.
    expect(sent()).toBeLessThan(20);
  });

  it("parses multipart data read that way", async () => {
    const form = new FormData();
    form.set("photo", new File([new Uint8Array([0xff, 0xd8, 0xff])], "a.jpg"));
    const request = new Request("http://localhost/api/photos", { method: "POST", body: form });
    const body = await readBodyWithLimit(request.clone(), 10_000);
    const parsed = await parseFormData(request, body as Uint8Array<ArrayBuffer>);
    expect((parsed.get("photo") as File).size).toBe(3);
  });
});
