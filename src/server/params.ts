import "server-only";
import { notFound } from "next/navigation";
import { id } from "@/lib/validation/common";

/** The `[id]` route segment, validated like every other input (404 otherwise). */
export async function idParam(params: Promise<{ id: string }>): Promise<string> {
  const parsed = id.safeParse((await params).id);
  if (!parsed.success) notFound();
  return parsed.data;
}
