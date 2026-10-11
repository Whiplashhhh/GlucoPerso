"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { THEME_COOKIE, themeCookieOptions, themePreferenceOf } from "@/lib/theme";
import {
  momentRatioSchema,
  perMomentToggleSchema,
  profileSchema,
  ratioEditSchema,
  settingsUpdateSchema,
} from "@/lib/validation/settings";
import { type ActionState, fieldErrorsOf } from "@/server/action-state";
import { createRecoveryCodes } from "@/server/repos/recovery";
import {
  removeMomentRatios,
  setPerMomentRatios,
  setRatioManually,
  updateProfileName,
  updateSettings,
} from "@/server/repos/settings";
import { requireAppUser } from "@/server/session";

export async function updateSettingsAction(input: unknown): Promise<ActionState> {
  const { user } = await requireAppUser();
  const parsed = settingsUpdateSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const { theme, ...rest } = parsed.data;

  const error = await updateSettings(user.id, {
    ...rest,
    ...(theme && { theme: themePreferenceOf(theme) }),
  });
  if (error) return { error };

  if (theme) {
    // Signed-out pages (login…) read this cookie to put the class on <html>.
    (await cookies()).set(
      THEME_COOKIE,
      theme,
      themeCookieOptions(env.BETTER_AUTH_URL.startsWith("https://")),
    );
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateProfileAction(input: unknown): Promise<ActionState> {
  const { user } = await requireAppUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  await updateProfileName(user.id, parsed.data.name);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setRatioAction(input: unknown): Promise<ActionState> {
  const { user } = await requireAppUser();
  const parsed = ratioEditSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  await setRatioManually(user.id, parsed.data);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeMomentRatioAction(input: unknown): Promise<ActionState> {
  const { user } = await requireAppUser();
  const parsed = momentRatioSchema.safeParse(input);
  if (!parsed.success) return { error: "Moment inconnu." };
  await removeMomentRatios(user.id, [parsed.data.moment], false);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function togglePerMomentRatiosAction(input: unknown): Promise<ActionState> {
  const { user } = await requireAppUser();
  const parsed = perMomentToggleSchema.safeParse(input);
  if (!parsed.success) return { error: "Choix invalide." };
  await setPerMomentRatios(user.id, parsed.data.enabled);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** New recovery codes replace the old ones; plain codes are shown once. */
export async function regenerateRecoveryCodesAction(): Promise<ActionState<{ codes: string[] }>> {
  const { user } = await requireAppUser();
  const codes = await createRecoveryCodes(user.id);
  return { ok: true, data: { codes } };
}
