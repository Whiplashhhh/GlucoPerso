import type { z } from "zod";

/** Serializable result shared by every form Server Action. */
export type ActionState<T = undefined> = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  data?: T;
};

export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!(key in result)) result[key] = issue.message;
  }
  return result;
}
