"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { throttleKey } from "@/lib/security/codes";
import { deleteAccountSchema } from "@/lib/validation/settings";
import { type ActionState, fieldErrorsOf } from "@/server/action-state";
import { deleteAllPhotoFiles } from "@/server/photos";
import { requireUser } from "@/server/session";
import { LockedError, assertNotLocked, registerFailure, registerSuccess } from "@/server/throttle";

/**
 * Deletes her account and everything in it, after she typed her password
 * again. Photo files go first, then the user row (every table cascades).
 */
export async function deleteAccountAction(input: unknown): Promise<ActionState> {
  const user = await requireUser();
  const parsed = deleteAccountSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const key = throttleKey("delete-account", user.id);
  try {
    await assertNotLocked(key);
  } catch (error) {
    if (error instanceof LockedError) return { error: error.message };
    throw error;
  }

  const account = await db.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
    select: { password: true },
  });
  const context = await auth.$context;
  const valid =
    !!account?.password &&
    (await context.password.verify({ hash: account.password, password: parsed.data.password }));
  if (!valid) {
    await registerFailure(key);
    return { fieldErrors: { password: "Ce n'est pas le bon mot de passe." } };
  }
  await registerSuccess(key);

  await deleteAllPhotoFiles(user.id);
  // Clears the session cookie; the session row itself goes with the cascade.
  try {
    await auth.api.signOut({ headers: await headers() });
  } catch {
    // Already signed out: nothing left to clear.
  }
  await db.user.delete({ where: { id: user.id } });
  redirect("/connexion?au-revoir=1");
}
