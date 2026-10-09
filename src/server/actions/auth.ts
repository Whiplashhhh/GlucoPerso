"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { throttleKey } from "@/lib/security/codes";
import { recoverSchema, registerSchema } from "@/lib/validation/auth";
import { type ActionState, fieldErrorsOf } from "@/server/action-state";
import { claimInvite, releaseInvite } from "@/server/repos/invites";
import {
  consumeRecoveryCode,
  createRecoveryCodes,
  remainingRecoveryCodes,
} from "@/server/repos/recovery";
import { clientIp } from "@/server/request";
import {
  LockedError,
  assertNotLocked,
  consumeAttempt,
  registerFailure,
  registerSuccess,
} from "@/server/throttle";

const SIGN_UP_UNAVAILABLE = "Les inscriptions sont fermées pour le moment.";

export async function registerAction(
  _previous: ActionState<{ recoveryCodes: string[] }>,
  formData: FormData,
): Promise<ActionState<{ recoveryCodes: string[] }>> {
  if (env.REGISTRATION_MODE === "closed") return { error: SIGN_UP_UNAVAILABLE };

  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const { name, email, password, inviteCode } = parsed.data;

  try {
    await consumeAttempt(throttleKey("signup", await clientIp()));
  } catch (error) {
    if (error instanceof LockedError) return { error: error.message };
    throw error;
  }

  let inviteId: string | null = null;
  if (env.REGISTRATION_MODE === "invite") {
    inviteId = inviteCode ? await claimInvite(inviteCode) : null;
    if (!inviteId) {
      return { fieldErrors: { inviteCode: "Ce code d'invitation n'est pas (ou plus) valable." } };
    }
  }

  let userId: string;
  try {
    const result = await auth.api.signUpEmail({
      body: { name, email, password },
      headers: await headers(),
    });
    userId = result.user.id;
  } catch {
    if (inviteId) await releaseInvite(inviteId);
    // Same message whether the email exists or not (no account enumeration).
    return { error: "Impossible de créer ce compte. Vérifie l'email ou connecte-toi." };
  }

  const recoveryCodes = await createRecoveryCodes(userId);
  return { ok: true, data: { recoveryCodes } };
}

export async function recoverAction(
  _previous: ActionState<{ remaining: number }>,
  formData: FormData,
): Promise<ActionState<{ remaining: number }>> {
  const parsed = recoverSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const { email, code, password } = parsed.data;

  const emailKey = throttleKey("recover", email);
  try {
    await assertNotLocked(emailKey);
    await consumeAttempt(throttleKey("recover-ip", await clientIp()));
  } catch (error) {
    if (error instanceof LockedError) return { error: error.message };
    throw error;
  }

  const generic =
    "Ce code ne correspond pas. Vérifie l'email et le code (sans les tirets, c'est ok).";
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!user || !(await consumeRecoveryCode(user.id, code))) {
    await registerFailure(emailKey);
    return { error: generic };
  }

  const context = await auth.$context;
  const hashed = await context.password.hash(password);
  await db.$transaction([
    db.account.updateMany({
      where: { userId: user.id, providerId: "credential" },
      data: { password: hashed },
    }),
    // Every device has to sign in again with the new password.
    db.session.deleteMany({ where: { userId: user.id } }),
  ]);
  await registerSuccess(emailKey);

  return { ok: true, data: { remaining: await remainingRecoveryCodes(user.id) } };
}
