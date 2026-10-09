"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ratioMoment } from "@/lib/validation/common";
import type { ActionState } from "@/server/action-state";
import { decideSuggestion } from "@/server/repos/ratios";
import { requireAppUser } from "@/server/session";

const decisionSchema = z.object({
  key: ratioMoment,
  decision: z.enum(["ACCEPTED", "DISMISSED", "DOCTOR"]),
});

export async function decideSuggestionAction(input: unknown): Promise<ActionState> {
  const { user, settings } = await requireAppUser();
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) return { error: "Choix invalide." };
  const done = await decideSuggestion(user.id, settings, parsed.data.key, parsed.data.decision);
  if (!done) return { error: "Cette suggestion n'est plus d'actualité." };
  revalidatePath("/", "layout");
  return { ok: true };
}
