"use server";

import { onboardingSchema } from "@/lib/validation/settings";
import { type ActionState, fieldErrorsOf } from "@/server/action-state";
import { saveOnboarding } from "@/server/repos/settings";
import { requireUser } from "@/server/session";

export async function completeOnboardingAction(input: unknown): Promise<ActionState> {
  const user = await requireUser();
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  await saveOnboarding(user.id, parsed.data);
  // No revalidatePath here: it would re-render /bienvenue, which redirects to
  // "/" at once and cuts the celebration short. App pages are dynamic anyway.
  return { ok: true };
}
