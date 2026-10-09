"use server";

import { revalidatePath } from "next/cache";
import { onboardingSchema } from "@/lib/validation/settings";
import { type ActionState, fieldErrorsOf } from "@/server/action-state";
import { saveOnboarding } from "@/server/repos/settings";
import { requireUser } from "@/server/session";

export async function completeOnboardingAction(input: unknown): Promise<ActionState> {
  const user = await requireUser();
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  await saveOnboarding(user.id, parsed.data);
  revalidatePath("/", "layout");
  return { ok: true };
}
