import "server-only";
import { db } from "@/lib/db";
import { generateCode, hashCode } from "@/lib/security/codes";

/** Creates a single-use invite code. The plain code is returned once. */
export async function createInvite(options: { note?: string; expiresAt?: Date } = {}) {
  const code = generateCode();
  await db.inviteCode.create({
    data: { codeHash: hashCode(code), note: options.note, expiresAt: options.expiresAt },
  });
  return code;
}

/**
 * Atomically claims an unused, unexpired invite. Returns its id, or null.
 * Claiming before creating the account prevents two sign-ups with one code.
 */
export async function claimInvite(code: string, now = new Date()): Promise<string | null> {
  const invite = await db.inviteCode.findUnique({ where: { codeHash: hashCode(code) } });
  if (!invite || invite.usedAt || (invite.expiresAt && invite.expiresAt <= now)) return null;
  const claimed = await db.inviteCode.updateMany({
    where: { id: invite.id, usedAt: null },
    data: { usedAt: now },
  });
  return claimed.count === 1 ? invite.id : null;
}

/** Gives the invite back when the account could not be created. */
export async function releaseInvite(id: string): Promise<void> {
  await db.inviteCode.updateMany({ where: { id }, data: { usedAt: null } });
}
