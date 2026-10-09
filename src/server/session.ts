import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/** Current session, read once per request. */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

export type CurrentUser = { id: string; name: string; email: string };

/** Redirects to the login page when nobody is signed in. */
export async function requireUser(): Promise<CurrentUser> {
  const session = await getSession();
  if (!session) redirect("/connexion");
  const { id, name, email } = session.user;
  return { id, name, email };
}

export const getSettings = cache(async (userId: string) =>
  db.userSettings.findUnique({ where: { userId } }),
);

/** Signed-in user who finished onboarding, with their settings. */
export async function requireAppUser() {
  const user = await requireUser();
  const settings = await getSettings(user.id);
  if (!settings?.onboardedAt) redirect("/bienvenue");
  return { user, settings };
}
